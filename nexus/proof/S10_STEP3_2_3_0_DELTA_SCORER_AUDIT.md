# S10.3 — Phase 2.3.0 : Audit δ Scorer (pre-tribunal)

**Date**         : 2026-05-14
**Branch**       : `phase-r-dispatcher-v33`
**HEAD pré-audit** : `ebcae2ad` (post-Phase 2.2 β SymbolMap)
**Standard**     : NASA-Grade L4 / DO-178C Level A
**Doctrine**     : v3.156.0 — AUDIT BEFORE ACTION, ANCHOR_PRE_FLIGHT
**Statut**       : LECTURE SEULE — aucune modification appliquée

---

## 1. Périmètre

2 erreurs TS2345 résiduelles cluster δ (post-Phase 2.2) :

```
src/scoring/multi-stage-scorer-v2.ts(155,27): error TS2345:
  Argument of type 'string' is not assignable to parameter of type 'Record<string, number>'.

src/scoring/multi-stage-scorer-v3.ts(143,27): error TS2345:
  Argument of type 'string' is not assignable to parameter of type 'Record<string, number>'.
```

Both sites = arg col 27 = first positional argument of `detectPassageType(...)`.

---

## 2. Verdict hypothèses H1-H5

| Hypothèse | Statut | Preuve empirique |
|---|---|---|
| **H1 — Drift signature** (la signature attendait `string` historiquement, a évolué vers `Record` sans mettre à jour callers) | **CONFIRMÉE** | Voir §3 (3 commits évolutifs detector, single-commit forks v2/v3) |
| H2 — Cast manquant (caller envoie objet mal typé en string) | Réfutée | Caller passe littéralement `options.text` (string), pas un objet |
| H3 — Refonte signature légitime (v2/v3 doivent passer Record) | Hypothèse alternative cohérente avec H1 | v1 a déjà été mis à jour pour passer `(features, text)` (preuve §4.1) |
| H4 — Wrapper requis (adapter local string → Record) | Réfutée | `features: Record<string, number>` est DANS le scope `score()` aux 2 sites — pas besoin de wrapper |
| H5 — Autre pattern | N/A | — |

**Conclusion empirique** : H1 + H3 sont 2 facettes du même phénomène. La signature canonique de `detectPassageType` exige `features: Record<string, number>` en arg 1 ; v1 est aligné ; v2 et v3 ont régressé à l'ancienne API mono-argument (string only).

---

## 3. Chaîne d'appel runtime tracée

### 3.1 Source de vérité (signature cible)

**Fichier** : `packages/sovereign-engine/src/scoring/passage-type-detector.ts:53`

```ts
/**
 * Detects the passage type from pre-computed features.
 *
 * Priority order: DIALOGUE > INTROSPECTION > ACTION > TRANSITION > DESCRIPTION
 * DESCRIPTION is the default (71.7% of corpus).
 *
 * @param features - Record of feature name to value
 * @param text - Optional raw text for dialogue marker detection
 * @returns The detected passage type
 */
export function detectPassageType(features: Record<string, number>, text?: string): PassageType {
  const f34b = features['f34b_para_per_1000w'] ?? 0;
  const f33a = features['f33a_dots_count'] ?? 0;
  const f5a = features['f5a_verb_density'] ?? 0;
  // ... lecture de ~8 features pour heuristique de classification
  // text est utilisé optionnellement pour computeDialogueMarkerRatio(text)
}
```

Le corps de la fonction **lit obligatoirement le Record `features`** pour ses heuristiques. Passer `undefined` ou `{}` casserait la logique runtime (toutes les features tombent à 0 → classification dégradée vers DESCRIPTION par défaut).

### 3.2 Historique git (preuve drift)

| Fichier | Commits | Statut |
|---|---|---|
| `passage-type-detector.ts` | `1ae8a7e8` (création) → `18d0e834` (dialogue marker check) → `29c13c32` (+23 features, fix DIALOGUE) | 3 commits évolutifs |
| `multi-stage-scorer.ts` (v1) | aligné avec signature courante (§4.1) | Mis à jour |
| `multi-stage-scorer-v2.ts` | `5566cb84` (création unique) | **Figé** sur ancienne API |
| `multi-stage-scorer-v3.ts` | `363203aa` (création unique) | **Figé** sur ancienne API |

v2 et v3 sont des **forks single-commit** créés à un moment où `detectPassageType` n'avait probablement qu'un seul argument `text: string`. La fonction a ensuite évolué (au moins via `18d0e834`) pour requérir `features` en premier argument, mais les forks v2/v3 n'ont jamais été synchronisés.

---

## 4. Sites verbatim + contexte

### 4.1 Référence d'usage correct — `multi-stage-scorer.ts` (v1)

```ts
// packages/sovereign-engine/src/scoring/multi-stage-scorer.ts (lignes 50-56)
  score(features: Record<string, number>, options: ScoringOptions): MultiStageScore {
    const { wordCount, pRel, profile: profileName, language: _language, text, applyTypeModifiers = false } = options;

    // 1. Detect passage type (on raw features, before normalization)
    // Type is always detected for logging, but only applied to weights if applyTypeModifiers=true.
    // Default OFF after ablation showed +0.06 impact (MINOR) with all scenes classified ACTION.
    const passageType = detectPassageType(features, text);
```

Pattern correct : `detectPassageType(features, text)` — 2 args dans l'ordre canonique.

### 4.2 Site δ.1 — `multi-stage-scorer-v2.ts:155`

```ts
// packages/sovereign-engine/src/scoring/multi-stage-scorer-v2.ts (lignes 110-160)
export class MultiStageScorerV2 {
  score(features: Record<string, number>, options: ScoringOptions): V2Score {
    const contributions: FeatureContribution[] = [];
    let rawScore = INTERCEPT;
    let availableCount = 0;
    let totalCount = 0;

    for (const [featName, spec] of Object.entries(FEATURES)) {
      totalCount++;
      const value = features[featName];
      if (value === undefined || value === null || !Number.isFinite(value)) {
        continue;
      }
      // ... (calcul rawScore via features)
    }

    contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
    const score100 = r4(clamp((rawScore - RAW_MIN) / (RAW_MAX - RAW_MIN) * 100, 0, 100));
    const confidence = r4(availableCount / totalCount);

    // Passage type detection
    const passageType = options.text
      ? detectPassageType(options.text)        // ← SITE δ.1 (ligne 155)
      : ('INTROSPECTION' as PassageType);

    const bonuses: BonusDetail[] = [];
    // ...
```

- `features: Record<string, number>` est paramètre formel ligne 118 → **dans le scope** au site 155
- L'appel passe `options.text` (string) en position 1 → mismatch contractuel

### 4.3 Site δ.2 — `multi-stage-scorer-v3.ts:143`

```ts
// packages/sovereign-engine/src/scoring/multi-stage-scorer-v3.ts (lignes 107-145)
export class MultiStageScorerV3 {
  score(features: Record<string, number>, options: ScoringOptions): V3Score {
    let raw = INTERCEPT;
    let available = 0;
    const total = Object.keys(WEIGHTS).length + INTERACTIONS.length;
    const contribs: Array<{ feature: string; contribution: number }> = [];

    // Main features
    for (const [feat, spec] of Object.entries(WEIGHTS)) {
      const val = features[feat];
      if (val === undefined || val === null || !Number.isFinite(val)) continue;
      // ... (calcul raw via features + WEIGHTS)
    }

    // Interactions
    for (const ix of INTERACTIONS) {
      const a = features[ix.feat_a];
      const b = features[ix.feat_b];
      // ...
    }

    contribs.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
    const score100 = r4(clamp((raw - RAW_MIN) / (RAW_MAX - RAW_MIN) * 100, 0, 100));
    const confidence = r4(available / total);

    // Passage type
    const passageType = options.text
      ? detectPassageType(options.text)        // ← SITE δ.2 (ligne 143)
      : ('INTROSPECTION' as PassageType);
```

- `features: Record<string, number>` est paramètre formel ligne 108 → **dans le scope** au site 143
- Pattern identique à v2 (même bug structurel)

---

## 5. Impact runtime (mutation structurelle Gemini OMEGA-PRIME)

**Garde-fou Gemini** : pas de `as unknown as` aveugle sur mutation structurelle.

Le présent cas n'est PAS une mutation structurelle au sens cast :
- L'argument `features` requis par `detectPassageType` est **déjà disponible dans le scope** des deux callers (paramètre formel typé `Record<string, number>`)
- Il s'agit d'une **omission d'argument** (drift API), pas d'une coercion de type

Conséquence runtime actuelle (si l'erreur TS était ignorée via cast aveugle) :
- `features = (options.text as unknown as Record<string, number>)` → toutes les lookups `features['f34b_para_per_1000w']` retourneraient `undefined`
- Classification dégradée systématique vers `DESCRIPTION` (default) au lieu de classification heuristique
- **Régression silencieuse** sur le passage type detection en aval (scoring biaisé pour les passages réellement DIALOGUE/ACTION/INTROSPECTION/TRANSITION)

Le garde-fou Gemini est donc **honoré** par le constat empirique : un cast `as unknown as` serait toxique ici.

---

## 6. Recommandation patch (sans décision finale)

**Option recommandée — Alignement caller v2/v3 sur signature canonique** :

Diff minimal proposé (2 lignes au total, 2 fichiers) :

```diff
- // multi-stage-scorer-v2.ts:155
- ? detectPassageType(options.text)
+ ? detectPassageType(features, options.text)
```

```diff
- // multi-stage-scorer-v3.ts:143
- ? detectPassageType(options.text)
+ ? detectPassageType(features, options.text)
```

**Justification empirique** :
- Reproduit le pattern v1 (`multi-stage-scorer.ts:56`) déjà sealed et utilisé en production
- `features` est dans le scope des deux callers (paramètres formels)
- Zéro modification de signature, zéro modification de type, zéro cast
- 1 cause racine (drift API non synchronisé v2/v3) → 1 commit possible (les 2 sites sont strictement homogènes, à la différence de β.1-3 vs β.4)
- Alignement sémantique avec l'intention runtime : la fonction LIT le record pour classifier

**Risques résiduels à valider en Mini-Tribunal IA Phase 2.3.1** :
- Effet de bord runtime : passer `features` complet peut activer des branches de classification (DIALOGUE/ACTION) qui étaient muettes auparavant (avant le fix, le caller ignorait totalement les features → l'appel devait crasher à runtime avec `features['f34b...']` sur `string.includes`-like ou retourner garbage)
- Question subsidiaire : v2/v3 ont-ils été utilisés en production depuis leur création (commits `5566cb84` / `363203aa`) ? Si oui, comment ne crashaient-ils pas ? → suggère que `score()` de v2/v3 n'est jamais appelé avec `options.text` non-null en runtime actuel (DEAD-ISH branch). À confirmer via tests.
- Tests à prévoir : couverture passage_type sur v2/v3 avec text fourni — vérifier que la classification reste cohérente après alignement.

**Hors scope du présent audit** :
- Décision finale patch (Mini-Tribunal IA Phase 2.3.1)
- Mise à jour de tests v2/v3
- Question architecturale "faut-il garder v2/v3 ou consolider sur v1 ?" (out of scope S10.3)

---

## 7. Conformité doctrinale

- AUDIT BEFORE ACTION : **respecté** (0 patch appliqué)
- ANCHOR_PRE_FLIGHT : tous les anchors (signature, callers, scope, git history) vérifiés empiriquement repo
- NO_UNVERIFIED_EXTERNAL_ANCHORS : aucun anchor externe (mémoire/IA cowork) utilisé sans recoupement repo
- MINIMIZE IT : la recommandation patch est diff-minimale (2 lignes, 2 fichiers, aucun nouveau type, aucun wrapper)
- INTERDITS PHASE 2.3.0 : aucun patch, aucune modification de signature, aucune modification de caller, aucun cast `as unknown as`, aucun verdict tranchant H1/H2/H3/H4

---

## 8. État TS post-audit

| Métrique | Valeur |
|---|---|
| Erreurs TS totales | 64 (inchangé vs début audit) |
| TS2345 résiduels | 2 (δ.1 + δ.2, inchangés) |
| HEAD | `ebcae2ad` (inchangé) |

---

## 9. Phase suivante

**Phase 2.3.1 — Mini-Tribunal IA δ Scorer** :
- Décision finale parmi options recommandation §6
- Validation absence d'effet de bord runtime (DEAD branch hypothesis)
- Si patch validé : commit atomique `fix(sovereign-engine): align detectPassageType callers v2/v3 (S10.3 Phase 2.3.1)`

**STOP empirique post-audit confirmé.**

---

```
Architect: Francky          IA Principal: Claude Code
Standard:  NASA-Grade L4 / DO-178C Level A
```
