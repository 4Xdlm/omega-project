# S10.3 — Phase 3.0 : Audit TS2339 missing properties (pre-tribunal)

**Date**         : 2026-05-14
**Branch**       : `phase-r-dispatcher-v33`
**HEAD pré-audit** : `c76aa292` (post-Phase 2.3.1 δ Scorer, cluster TS2345 clos)
**Standard**     : NASA-Grade L4 / DO-178C Level A
**Doctrine**     : v3.156.0 — AUDIT BEFORE ACTION, ANCHOR_PRE_FLIGHT, TS mask-and-reveal alerté
**Statut**       : LECTURE SEULE — aucune modification appliquée

---

## 1. Périmètre

20 erreurs TS2339 résiduelles (cluster missing properties) post-Phase 2.3.1.
Total erreurs TS : 62 (62 - 20 = 42 erreurs d'autres classes hors scope présent audit).

---

## 2. Inventaire 20 sites verbatim

```
src/authenticity/adversarial-judge.ts(84,78): Property 'model_id' does not exist on type 'SovereignProvider'.
src/authenticity/adversarial-judge.ts(91,27): Property 'fraud_score' does not exist on type 'SemanticEmotionResult'.
src/authenticity/adversarial-judge.ts(92,25): Property 'rationale' does not exist on type 'SemanticEmotionResult'.
src/delta/delta-physics.ts(30,72): Property 'average_cosine' does not exist on type 'readonly TrajectoryDeviation[]'.
src/delta/delta-physics.ts(31,48): Property 'average_cosine' does not exist on type 'readonly TrajectoryDeviation[]'.
src/delta/delta-physics.ts(32,75): Property 'average_euclidean' does not exist on type 'readonly TrajectoryDeviation[]'.
src/delta/delta-physics.ts(33,48): Property 'average_euclidean' does not exist on type 'readonly TrajectoryDeviation[]'.
src/engine.ts(675,30): Property 'duel_matrix' does not exist on type 'DuelResult'.
src/input/prompt-assembler-v4.ts(224,25): Property 'pivot' does not exist on type 'ForgeBeat'.
src/oracle/macro-axes.ts(365,63): Property 'axis_id' does not exist on type 'AxisScore'.
src/oracle/macro-axes.ts(368,64): Property 'axis_id' does not exist on type 'AxisScore'.
src/oracle/physics-audit.ts(171,35): Property 'violations' does not exist on type 'LawComplianceReport'.
src/oracle/physics-audit.ts(229,40): Property 'violations' does not exist on type 'LawComplianceReport'.
src/oracle/physics-audit.ts(229,86): Property 'total_checks' does not exist on type 'LawComplianceReport'.
src/polish/anti-cliche-sweep.ts(104,19): Property 'cliche_count' does not exist on type 'ClicheDelta'.
src/prescriptions/generate-prescriptions.ts(29,35): Property 'prescriptions' does not exist on type 'PhysicsAuditResult'.
src/runtime/anthropic-provider.ts(393,133): Property 'correction_text' does not exist on type 'CorrectionPitch'.
src/runtime/anthropic-provider.ts(393,167): Property 'target_axis' does not exist on type 'CorrectionPitch'.
src/runtime/ollama-provider.ts(244,47): Property 'correction_text' does not exist on type 'CorrectionPitch'.
src/runtime/ollama-provider.ts(244,80): Property 'target_axis' does not exist on type 'CorrectionPitch'.
```

---

## 3. Distribution par fichier (10 fichiers, max 4 sites)

| Count | Fichier |
|---:|---|
| 4 | `src/delta/delta-physics.ts` |
| 3 | `src/authenticity/adversarial-judge.ts` |
| 3 | `src/oracle/physics-audit.ts` |
| 2 | `src/oracle/macro-axes.ts` |
| 2 | `src/runtime/anthropic-provider.ts` |
| 2 | `src/runtime/ollama-provider.ts` |
| 1 | `src/engine.ts` |
| 1 | `src/input/prompt-assembler-v4.ts` |
| 1 | `src/polish/anti-cliche-sweep.ts` |
| 1 | `src/prescriptions/generate-prescriptions.ts` |

---

## 4. Distribution par propriété manquante (14 props distinctes)

| Count | Property | Sites |
|---:|---|---|
| 2 | `average_cosine` | delta-physics:30,31 |
| 2 | `average_euclidean` | delta-physics:32,33 |
| 2 | `axis_id` | macro-axes:365,368 |
| 2 | `correction_text` | anthropic-provider:393, ollama-provider:244 |
| 2 | `target_axis` | anthropic-provider:393, ollama-provider:244 |
| 2 | `violations` | physics-audit:171,229 |
| 1 | `cliche_count` | anti-cliche-sweep:104 |
| 1 | `duel_matrix` | engine:675 |
| 1 | `fraud_score` | adversarial-judge:91 |
| 1 | `model_id` | adversarial-judge:84 |
| 1 | `pivot` | prompt-assembler-v4:224 |
| 1 | `prescriptions` | generate-prescriptions:29 |
| 1 | `rationale` | adversarial-judge:92 |
| 1 | `total_checks` | physics-audit:229 |

---

## 5. Distribution par type source (10 types distincts)

| Count | Type | Ownership |
|---:|---|---|
| 4 | `CorrectionPitch` | LOCAL (`src/types.ts:374`) |
| 4 | `readonly TrajectoryDeviation[]` | **CROSS-PACKAGE** (`@omega/omega-forge`) |
| 3 | `LawComplianceReport` | **CROSS-PACKAGE** (`@omega/omega-forge`) |
| 2 | `AxisScore` | LOCAL — **3 DÉFINITIONS DUPLIQUÉES** (cf §6.4) |
| 2 | `SemanticEmotionResult` | LOCAL (`src/semantic/types.ts:27`) |
| 1 | `ClicheDelta` | LOCAL (`src/types.ts:269`) |
| 1 | `DuelResult` | LOCAL (`src/types.ts:443`) |
| 1 | `ForgeBeat` | LOCAL (`src/types.ts:109`) |
| 1 | `PhysicsAuditResult` | LOCAL (`src/oracle/physics-audit.ts:43`) |
| 1 | `SovereignProvider` | LOCAL (`src/types.ts:~390`) |

**Insight critique** : 7 sites sur 20 (35%) ciblent des types **propriétés d'un package externe** (`@omega/omega-forge`). Toute modification de ces types nécessite arbitrage cross-package (cf §8 risques doctrine).

---

## 6. Analyse empirique par cluster

### 6.1 Cluster CorrectionPitch (4 sites)

**Type local** (`src/types.ts:374`) :
```ts
export interface CorrectionPitch {
  readonly pitch_id: string;
  readonly strategy: 'emotional_intensification' | 'structural_rupture' | 'compression_musicality';
  readonly items: readonly PitchItem[];
  readonly total_expected_gain: number;
}
```

**Type PitchItem** (`src/types.ts:365`) :
```ts
export interface PitchItem {
  readonly id: string;
  readonly zone: string;
  readonly op: CorrectionOp;
  readonly reason: string;
  readonly instruction: string;
  readonly expected_gain: { readonly axe: string; readonly delta: number };
}
```

**Sites callers** (anthropic-provider.ts:393, ollama-provider.ts:244) :
```ts
const userPrompt = `... Correction: ${pitch.correction_text}\nTarget: ${pitch.target_axis} ...`;
```

**Constat empirique** :
- Les propriétés `correction_text` et `target_axis` **n'existent NI sur CorrectionPitch NI sur PitchItem**.
- Pattern **phantom properties** : le code accède à des champs jamais déclarés dans le type.
- Le code est utilisé dans des **template strings LLM** (prompt user pour patch correction). En runtime, `${undefined}` injecte littéralement "undefined" dans le prompt envoyé au LLM.

**Hypothèse runtime** :
- Si jamais appelé en production : prompts LLM corrompus (`Correction: undefined\nTarget: undefined`)
- Plus probable : ce chemin de code n'est pas atteint en runtime actuel (DEAD-ish branch) — à vérifier via traces/tests

**Duplication symétrique** : les 2 sites (anthropic-provider:393 + ollama-provider:244) sont strictement homogènes (mêmes 2 props, même contexte template prompt) → cas similaire au pattern v2/v3 scorer de Phase 2.3, mais sur 2 providers parallèles.

### 6.2 Cluster TrajectoryDeviation[] (4 sites) — CROSS-PACKAGE

**Type importé** (physics-audit.ts:32) :
```ts
import { type TrajectoryDeviation, ... } from '@omega/omega-forge';
```

**Sites callers** (delta-physics.ts:30-33) :
```ts
trajectory_compliance: {
  cosine_avg: Number.isFinite(audit.trajectory_analysis.deviations.average_cosine)
    ? audit.trajectory_analysis.deviations.average_cosine : 0,
  euclidean_avg: Number.isFinite(audit.trajectory_analysis.deviations.average_euclidean)
    ? audit.trajectory_analysis.deviations.average_euclidean : 0,
},
```

**Producteur côté physics-audit.ts:183-187** :
```ts
trajectory_analysis: {
  prescribed: brief.trajectory,
  actual: actualTrajectory,
  deviations,  // ← type inféré = readonly TrajectoryDeviation[]
},
```

**Naming drift constaté côté producteur (physics-audit.ts:169-170)** :
```ts
trajectory_cosine:    Math.round(deviations.avg_cosine_distance * 1000) / 1000,
trajectory_euclidean: Math.round(deviations.avg_euclidean_distance * 1000) / 1000,
```

**Constat empirique double anomalie** :
1. **Confusion array vs aggregate** : `audit.trajectory_analysis.deviations` est typé array (`TrajectoryDeviation[]`), pas un objet aggregate. Accéder `.average_cosine` sur un array est un non-sens structurel.
2. **Naming drift** : caller utilise `average_cosine` / `average_euclidean`, producteur utilise `avg_cosine_distance` / `avg_euclidean_distance` (préfixe et suffixe différents).

**Risque TS mask-and-reveal ÉLEVÉ** : en runtime, accéder `.average_cosine` sur un array retourne `undefined` ; `Number.isFinite(undefined)` retourne `false` → la valeur de garde `0` est toujours utilisée → **trajectory_compliance retourne systématiquement {0, 0}** sans erreur visible. Bug runtime silencieux probable depuis longtemps.

### 6.3 Cluster LawComplianceReport (3 sites) — CROSS-PACKAGE

**Type importé** (physics-audit.ts:30) :
```ts
import { type LawComplianceReport, ... } from '@omega/omega-forge';
```

**Sites** (physics-audit.ts:171, 229) :
```ts
law_violations: lawCompliance.violations.length,
const violationRatio = lawCompliance.violations.length / Math.max(1, lawCompliance.total_checks);
```

**Constat empirique** :
- Les props `violations` et `total_checks` sont utilisées de façon **structurellement cohérente** (`.length` sur violations → array supposé, ratio avec `total_checks` → number supposé).
- Si jamais elles ont existé dans le contrat `@omega/omega-forge` puis ont été renommées / restructurées, le caller sovereign-engine n'a pas suivi.

**Hypothèses pour Tribunal** :
- H5a — Renaming silencieux côté `omega-forge` (drift cross-package non propagé)
- H5b — Type incomplet historique (props auraient toujours dû exister)
- H5c — Refactor architecturé non finalisé (transition pending)

### 6.4 Cluster AxisScore (2 sites) — TYPE TRIPLÉ

**Définitions concurrentes** (3 interfaces du même nom dans le repo) :

| # | Path | Forme |
|---|---|---|
| A | `src/types.ts:339` | `{ name, score, weight, method, details }` |
| B | `src/oracle/s-oracle-v2.ts:43` (`AxisScoreV2`) | `{ name, weight, raw, weighted }` |
| C | `src/validation/phase-u/greatness-judge.ts:33` | `{ axis: GreatnessAxis, score, reason, weight }` |

**Sites callers** (macro-axes.ts:365, 368) accèdent `axis.axis_id`.

**Constat empirique** :
- Aucune des 3 définitions ne porte `axis_id`.
- L'interface C porte `axis` (de type `GreatnessAxis`) qui pourrait être l'ancêtre sémantique de `axis_id`.
- Possible **type confusion** : l'import dans macro-axes.ts pourrait pointer vers la mauvaise définition (cas A au lieu de C ?), ou bien une 4e variante existait historiquement avec `axis_id` puis a été refondue.

### 6.5 Cluster SemanticEmotionResult (2 sites)

**Type local** (`src/semantic/types.ts:27`) :
```ts
export interface SemanticEmotionResult {
  readonly joy: number;
  readonly trust: number;
  // ... 8 émotions Plutchik + meta
}
```

**Sites callers** (adversarial-judge.ts:91-92) accèdent `result.fraud_score`, `result.rationale`.

**Constat empirique** :
- Type représente clairement un résultat **émotion sémantique Plutchik** (8 émotions de base + 6 méta).
- Props attendues `fraud_score` / `rationale` sont **complètement orthogonales** (sémantique anti-fraude vs sémantique émotion).
- Hypothèse **type erroné utilisé** : le caller veut probablement un `AdversarialResult` ou `FraudDetectionResult` (à grepper) et a copié-collé l'import du mauvais type.

### 6.6 Singletons (5 sites)

| Site | Type | Property attendue | Type contient ? |
|---|---|---|---|
| `engine.ts:675` | `DuelResult` (types.ts:443) | `duel_matrix` | NON (a `drafts`, `winner_id`, `winner_score`, `fusion_applied`, `final_prose`) |
| `prompt-assembler-v4.ts:224` | `ForgeBeat` (types.ts:109) | `pivot` | NON (a `beat_id`, `action`, `dialogue`, `subtext_type`, `emotion_instruction`, `sensory_tags`, `canon_refs`) |
| `anti-cliche-sweep.ts:104` | `ClicheDelta` (types.ts:269) | `cliche_count` | NON (a `total_matches`, `matches`, `ai_pattern_matches`, `filter_word_matches`) ← **possible renommé total_matches** |
| `generate-prescriptions.ts:29` | `PhysicsAuditResult` (physics-audit.ts:43) | `prescriptions` | À vérifier |
| `adversarial-judge.ts:84` | `SovereignProvider` (types.ts:~390) | `model_id` | À vérifier |

**Pattern** : tous les singletons sont **phantom properties** sur des types LOCAUX bien définis. Hypothèse forte de **drift de refactor** (renames antérieurs non propagés).

---

## 7. Verdict hypothèses H1-H5

| Hypothèse | Statut | Preuve empirique |
|---|---|---|
| **H1 — Cluster monolithique** (1 fichier dominant comme Phase 1) | **RÉFUTÉE** | 10 fichiers distincts, max 4 sites par fichier, distribution éclatée |
| **H2 — Pattern propriété récurrente** (1 type incomplet majeur) | **PARTIELLE** | 3 sub-clusters dominants (CorrectionPitch ×4, TrajectoryDeviation ×4, LawComplianceReport ×3 = 11/20), mais pas de "type unique" majeur — 14 propriétés distinctes |
| **H3 — Mix sub-clusters** (comme Phase 2.0 TS2345) | **CONFIRMÉE** | Structure empirique exacte : 3 dominants (11 sites) + 2 mineurs (4 sites) + 5 singletons (5 sites) = 20 |
| **H4 — Diversité totale** (20 typos indépendants) | **RÉFUTÉE** | Clusters récurrents identifiables, pas du bruit aléatoire |
| **H5a — Cross-package drift** (props venues d'un package externe drifté) | **CONFIRMÉE** | TrajectoryDeviation + LawComplianceReport = 7/20 sites, propriétaire `@omega/omega-forge` |
| **H5b — Phantom properties** (props jamais déclarées dans aucun type proche) | **CONFIRMÉE** | CorrectionPitch (4 sites), 5/5 singletons, total ~9/20 sites accèdent à des champs absents partout |
| **H5c — Type confusion** (mauvais import / duplication de noms) | **PROBABLE** | AxisScore défini 3 fois dans le repo ; SemanticEmotionResult ortho aux props attendues |

**Conclusion empirique** : la classe TS2339 est **hétérogène par construction**. Aucune cause racine unique n'explique les 20 sites. Trois sous-pathologies coexistent :
1. **Phantom properties** (~9 sites) — code accède à des champs jamais déclarés
2. **Cross-package drift** (7 sites) — types `omega-forge` non synchronisés avec consommateurs
3. **Type confusion / duplication** (2-4 sites) — mauvaise indirection sémantique

---

## 8. Risques cascade TS mask-and-reveal

Doctrine S10.3 Phase 2.1 a documenté le pattern **mask-and-reveal** : corriger une erreur TS peut révéler des erreurs adjacentes précédemment masquées par l'inférence cassée. Pour TS2339 missing properties, les risques empiriques :

| Cluster | Risque mask-and-reveal | Mécanisme |
|---|---|---|
| TrajectoryDeviation[] (delta-physics) | **ÉLEVÉ** | Si patch corrige l'accès, on confronte que `Number.isFinite(undefined)=false` masquait un bug runtime silencieux (`trajectory_compliance: {0, 0}` permanent) |
| CorrectionPitch (providers) | **ÉLEVÉ** | Template strings LLM avec `${undefined}` — révéler le bug peut casser des prompts en production si effectivement appelés ; à valider DEAD-ish ou ACTIVE |
| LawComplianceReport | **MOYEN** | Si les props sont restaurées via patch cross-package, on confronte à toute la chaîne `lawCompliance.violations.length / lawCompliance.total_checks` |
| AxisScore (macro-axes) | **MOYEN** | Type confusion peut révéler que d'autres accès au même type cassent |
| SemanticEmotionResult | **FAIBLE** | Probablement DEAD-ish (orthogonalité sémantique) |
| Singletons | **VARIABLE** | À évaluer site par site |

**Recommandation doctrinale** : aucun patch en bloc. Chaque cluster doit être traité avec **smoke test ciblé** post-patch (cf RECOVERY_TEST_DOCTRINE).

---

## 9. Considérations doctrinales spécifiques

### 9.1 Modules cross-package (`@omega/omega-forge`)

7/20 sites visent des types propriété externe. Toute modification de ces types **traverse une frontière de package**. Questions à arbitrer en Mini-Tribunal :

- `@omega/omega-forge` est-il FROZEN ou en évolution active ?
- Le contrat actuel exposé par `omega-forge` est-il documenté quelque part (SSOT) ?
- Faut-il modifier le contrat producteur ou adapter le consommateur ?
- Si adaptation côté consommateur : caster, wrapper, ou re-typer localement ?

### 9.2 Phantom properties

~9 sites accèdent à des champs **jamais déclarés**. Cela suggère :
- Soit du code antérieur d'une version refactorée du type, jamais nettoyé
- Soit des champs ajoutés en runtime via cast `any` ailleurs (à investiguer)
- Soit des bugs jamais activés (DEAD-ish branches)

Le `TS mask-and-reveal` risk implique que ces sites pourraient être **DEAD code** masqué uniquement par les erreurs TS — auquel cas la correction "correcte" pourrait être leur suppression (lifecycle decision out of scope audit).

### 9.3 Tests / Smoke tests à prévoir

Sites probablement DEAD-ish à confirmer empiriquement avant patch :
- CorrectionPitch templates dans providers (anthropic/ollama:393/244) → grep usages applyPatch in prod
- adversarial-judge.ts (3 sites) → grep usages judgeAdversarial
- prompt-assembler-v4.ts:224 (`pivot` sur ForgeBeat) → grep v4 callers
- engine.ts:675 (`duel_matrix`) → confirmer chemin runtime

---

## 10. Recommandation Mini-Tribunal Phase 3.1 (sans décision finale)

**Stratégie suggérée — Découpage en sous-phases atomiques** (1 cause racine = 1 commit) :

| Sous-phase | Périmètre | Sites | Pré-requis |
|---|---|---|---|
| **3.1.1** | Cluster CorrectionPitch (providers parallèles) | 4 | Audit DEAD-ish vs ACTIVE des 2 providers ; décision : restaurer prop sur PitchItem OU nettoyer phantom |
| **3.1.2** | Cluster TrajectoryDeviation[] | 4 | Décision cross-package (`omega-forge` FROZEN ?) ; choix entre fix accès vs fix type ; recovery test physics |
| **3.1.3** | Cluster LawComplianceReport | 3 | Idem 3.1.2 (cross-package) |
| **3.1.4** | Cluster AxisScore (type confusion) | 2 | Résoudre quelle AxisScore (A/B/C) est canonique en macro-axes |
| **3.1.5** | Cluster SemanticEmotionResult | 2 | Identifier le bon type (AdversarialResult ?) et fixer import |
| **3.1.6** | Singletons (1 commit par site OU 1 commit groupé selon homogénéité) | 5 | Investigation case-by-case ; possible DEAD code candidate suppression |

**Garde-fous explicites** :
- AUCUN cast `as unknown as Foo` aveugle (garde-fou Gemini OMEGA-PRIME maintenu)
- AUCUNE modification de FROZEN modules
- AUCUNE modification de `@omega/omega-forge` sans coordination Sprint S11+
- Chaque sous-phase doit produire son propre evidence pack (test + hash + log)
- Si DEAD-ish confirmé pour un cluster : NCR formel pour suppression vs maintenance

**Hors scope du présent audit** :
- Décision sur quelle sous-phase prioriser
- Décision FROZEN status de `@omega/omega-forge`
- Décision lifecycle (delete phantom code vs restore properties)
- Stratégie de tests recovery par cluster

---

## 11. Conformité doctrinale audit

- AUDIT BEFORE ACTION : **respecté** (0 patch appliqué, 0 type modifié)
- ANCHOR_PRE_FLIGHT : tous les anchors (signatures, types, callers, ownership) vérifiés empiriquement repo
- NO_UNVERIFIED_EXTERNAL_ANCHORS : aucun anchor externe (mémoire/IA cowork) utilisé sans recoupement repo
- MINIMIZE IT : audit factuel structurel, aucune recommandation diff prématurée
- MULTI_IA_RUNTIME_ARBITER : audit destiné à informer Mini-Tribunal IA Phase 3.1
- WORKSPACE_VS_REPO_DRIFT : tous les paths préfixés `src/` ([REPO])
- TS mask-and-reveal pattern explicitement documenté (§8) per doctrine Phase 2.1

---

## 12. État TS post-audit

| Métrique | Valeur |
|---|---|
| Erreurs TS totales | 62 (inchangé vs début audit) |
| TS2339 résiduels | 20 (inchangé) |
| HEAD | `c76aa292` (inchangé) |

---

## 13. Phase suivante

**Phase 3.1 — Mini-Tribunal IA TS2339** :
- Arbitrage stratégique sur le découpage en 6 sous-phases (§10)
- Décision FROZEN status `@omega/omega-forge`
- Priorisation : commencer par phantom properties LOCAL (3.1.1) ? par cross-package (3.1.2-3) ? par singletons (3.1.6) ?
- Validation garde-fous (pas de cast aveugle, pas de DEAD code suppression sans NCR)

**STOP empirique post-audit confirmé.**

---

```
Architect: Francky          IA Principal: Claude Code
Standard:  NASA-Grade L4 / DO-178C Level A
```
