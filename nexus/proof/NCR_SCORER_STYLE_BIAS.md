# NCR_SCORER_STYLE_BIAS — DRAFT / DIAGNOSTIC ONLY

**ID** : NCR_SCORER_STYLE_BIAS
**Title** : `f33b_commas_count` (count brut non normalisé) introduit un biais
de registre dans le scorer M0b_slim V3.4 — candidat migration vers
`f33b_per_word` (ratio normalisé).
**Status** : **DEFERRED** (Sprint S8 V3A 2026-05-01 — DRAFT discipline maintenue, 3 conditions de promotion empiriquement non remplies)
**Précédent** : DRAFT / DIAGNOSTIC ONLY (non officiellement ouvert) — discipline préservée
**Severity** : MEDIUM (diagnostic confirmé Phase 1 CATHEDRAL, mais hors chemin critique P1)
**Priority** : **P2** (chantier parallèle non bloquant — ne démarre PAS tant que NCR_M2 P0 ouvert)
**Opened** : 2026-04-19 matin (post-arbitrage 3-IA)
**Owner** : Claude (rédaction) + Gemini (momentum technique) + Francky (décisionnaire scellement)

---

## ⚠️ AVERTISSEMENT DISCIPLINAIRE

**Ce fichier est volontairement ouvert en DRAFT / DIAGNOSTIC ONLY**.

Raisons :
1. Le consensus 3-IA (ChatGPT + Gemini + Claude) du 2026-04-19 matin a
   hiérarchisé les chantiers post-bench v3. ChatGPT a demandé explicitement
   **HOLD sur toute modification scorer tant que NCR_M2 P0 ouvert**, pour
   éviter la dispersion. Gemini a poussé ce chantier P2. Arbitrage
   Claude : **DRAFT pour préserver le momentum Gemini sans scellement
   prématuré**.
2. Toute modification du scorer V3.4 **re-ouvre le plateau CALC** (cf.
   `CLAUDE.md` : "V3.4 = MODÈLE FINAL CALC PRODUCTION"). Cette décision
   ne peut pas être prise à la légère.
3. Le kill-switch historique +0.02 sur Δρ_dispatch (cf. rejet body_binding)
   reste le garde-fou contre les migrations spéculatives.

**Règle stricte** :
- Ce NCR n'autorise AUCUNE modification de `text-features.ts`.
- Ce NCR n'autorise AUCUN retraining V3.5.
- Ce NCR n'autorise AUCUN bench utilisant `f33b_per_word`.
- Ce NCR est un **plan d'attaque documenté**, pas une feuille de route
  d'implémentation.

**Promotion vers OPEN** : conditionnée à :
1. Fermeture NCR_M2_ADAPTIVE_DEADLOCK_INTERIOR P0.
2. Décision explicite Francky après lecture de ce draft.
3. Budget compute alloué pour bench holdout V2 avec feature migrée.

---

## 1. Issue (diagnostic)

Le scorer M0b_slim V3.4 (ρ_dispatch = 0.6138 sur holdout V2 n=264) utilise
5 features :

| Feature | Définition | Normalisation |
|---|---|---|
| f1a_rhythm_variance | variance des longueurs de phrases | **ratio** (σ/μ) |
| f12_tense_switches | bascules temps verbaux | **count brut** |
| f24c_contrast_delta | écart contraste lexical | **ratio** |
| f33b_commas_count | nombre de virgules + points-virgules | **count brut** ⚠️ |
| f33c_dot_comma_ratio | ratio points / virgules | **ratio** |

Dans `text-features.ts:420-430` :

```ts
function computeF33(text: string): Record<string, number> {
  const dots = (text.match(/[.!?]/g) || []).length;
  const commas = (text.match(/[,;]/g) || []).length;
  const ratio = round(dots / Math.max(commas, 1), 4);

  return {
    f33a_dots_count: dots,
    f33b_commas_count: commas,        // ⚠️ count brut non normalisé
    f33c_dot_comma_ratio: ratio,
  };
}
```

**Hypothèse de biais** : `f33b_commas_count` étant un count brut, il
**corrèle mécaniquement avec la longueur du texte**. Un texte de 750 mots
aura en moyenne ~2-3× plus de virgules qu'un texte de 250 mots, sans que le
"style" de ponctuation diffère. Sur des corpora aux longueurs hétérogènes,
cette feature capture de la longueur plutôt que du style.

---

## 2. Preuves (Phase 1 CATHEDRAL audit, 2026-04-18)

Source : `NCR_CATHEDRAL_BASELINE.md` Phase 1, commit `7e89f95f`, audit 6 runs
variant A reproduit Ollama qwen3:32b.

### 2.1 Décomposition du gap CATHEDRAL vs INTERIOR

CATHEDRAL μ = 0.503, INTERIOR μ = 6.093, Δ = −5.590 pts.

| Feature | Δ contrib (CATHEDRAL − INTERIOR) | % du gap |
|---|---|---|
| **f33b_commas_count** | **−4.532** | **81.1 %** |
| f12_tense_switches | −0.846 | 15.1 % |
| f24c_contrast_delta | −0.218 | 3.9 % |
| f1a_rhythm_variance | −0.052 | 0.9 % |

**Constat** : `f33b_commas_count` porte à lui seul **81.1 %** de l'écart de
score entre les deux archétypes. Seuil ex-ante H1 = 50 % **largement dépassé**.

### 2.2 Mécanisme causal proposé

Les scènes CATHEDRAL (`fr_cathedral_funeral_rites`, `fr_cathedral_mass`) ont
un registre **sacré / hiératique** caractérisé par :
- phrases courtes incantatoires
- densité ponctuationnelle basse (rituel vs narration)
- ~250-350 virgules pour 3000 mots

Les scènes INTERIOR (`fr_interior_maison_enfance`, `fr_interior_dialogue`)
ont un registre **introspectif / proustien** caractérisé par :
- phrases longues sub-cataphoriques
- densité ponctuationnelle haute (flux de conscience)
- ~500-700 virgules pour 3000 mots

**Après normalisation par longueur** (ratio `commas / n_words`), les deux
registres pourraient se rapprocher ou se séparer différemment — hypothèse à
tester.

---

## 3. Plan d'attaque (spec DRAFT)

### 3.1 Feature candidate : `f33b_per_word`

```ts
function computeF33(text: string): Record<string, number> {
  const dots = (text.match(/[.!?]/g) || []).length;
  const commas = (text.match(/[,;]/g) || []).length;
  const nWords = Math.max(text.split(/\s+/).length, 1);
  const ratio = round(dots / Math.max(commas, 1), 4);

  return {
    f33a_dots_count: dots,
    f33b_commas_count: commas,              // conservé pour backward compat
    f33b_per_word: round(commas / nWords * 1000, 3),  // NOUVEAU (pour mille mots)
    f33c_dot_comma_ratio: ratio,
  };
}
```

**Rationale** :
- Normalisation par 1000 mots = cohérente avec `f34_paragraph_density`.
- `f33b_commas_count` conservé = pas de breakage backward, juste ajout feature
  candidate.
- Bench comparative possible sans casser V3.4.

### 3.2 Protocole de validation (DRAFT — pas à exécuter)

**Phase A — smoke diagnostic (0 impact prod)** :
1. Calculer `f33b_per_word` sur corpus 1334 (FEATURE_MATRIX_V3.csv).
2. Corrélation bivariée `f33b_per_word` vs tier (Spearman, par langue).
3. VIF avec les 4 autres features V3.4.
4. Critère diagnostic : ρ_FR et ρ_EN significatifs + VIF < 3.0.

**Phase B — retraining V3.5 (SCELLÉ ADR requis)** :
1. Ridge α=1.0 sur train 1070 avec features {f1a, f24c, f33b_per_word, f33c, f12}.
2. Holdout V2 stratifié (264, seed=42) → ρ_dispatch mesuré.
3. Kill-switch : Δρ_dispatch ≥ +0.02 vs V3.4 (sinon REJECT).
4. VIF max < 3.0, zéro sign flip FR/EN.
5. CV 5-fold : σ < 0.05.

**Phase C — bench downstream** :
1. Relancer bench 24 runs (6 scènes × 4 archétypes) pour vérifier que le gap
   CATHEDRAL−INTERIOR diminue (si hypothèse causale correcte).
2. **NE PAS interpréter le gap comme un bug du scorer** : si le nouveau gap
   reste important, c'est que CATHEDRAL est intrinsèquement moins "littéraire"
   au sens M0b, pas que le scorer est cassé.

### 3.3 Critères d'échec (kill-switch)

Rejeter la migration si :
- ρ_dispatch V3.5 < V3.4 + 0.02 (plateau confirmé).
- VIF `f33b_per_word` > 3.0 (collinéarité excessive).
- Sign flip FR/EN (incohérence par langue).
- Le gap CATHEDRAL−INTERIOR ne diminue PAS significativement après migration
  (invaliderait l'hypothèse de biais).

---

## 4. Interdictions explicites (DRAFT-SCOPE)

Pendant que ce NCR reste en DRAFT :

| Action | Statut |
|---|---|
| Modifier `text-features.ts:computeF33` | **INTERDIT** |
| Ajouter feature à coefficients-v3-4.ts | **INTERDIT** |
| Lancer retraining V3.5 | **INTERDIT** |
| Bench utilisant f33b_per_word | **INTERDIT** |
| Mentionner dans `OMEGA_V1_SEAL_CERTIFICATE.md` | **INTERDIT** |
| Claim "bug scorer" dans commit message | **INTERDIT** |
| Scellement quelconque | **INTERDIT** |

**Seules actions autorisées en DRAFT** :
- Lecture / relecture de ce fichier.
- Ajout d'annexes (preuves supplémentaires, raffinements spec).
- Discussion Gemini pour raffiner plan d'attaque.
- Consultation par ChatGPT / Claude / autres IA pour revue.

---

## 5. Dépendances

**Bloqué par** :
- `NCR_M2_ADAPTIVE_DEADLOCK_INTERIOR` (P0) — tant que non fermé, pas de bench
  downstream valide.
- Décision Francky sur scellement V1-R-D.1-PROD (Option F) — scellement doit
  être acté avant toute re-exploration CALC.

**Peut bloquer** :
- Si migration validée : V3.5 devient candidate finale, V3.4 reste en
  production jusqu'au retrait officiel.
- Si migration rejetée : V3.4 reste scellé comme plateau CALC permanent.

---

## 6. Historique des décisions

| Date | Décision | Acteur | Justification |
|---|---|---|---|
| 2026-04-18 | Phase 1 CATHEDRAL audit : H1 CONFIRMÉE | Claude | f33b_commas_count = 81.1 % du gap |
| 2026-04-18 | 3 options D1/D2/D3 proposées | Claude | En attente Francky |
| 2026-04-19 | ChatGPT : HOLD P2 scorer jusqu'à fix M2 | ChatGPT | Dispersion risk |
| 2026-04-19 | Gemini : pousser chantier P2 Oracle | Gemini | Momentum cohérent avec diagnostic |
| 2026-04-19 | Arbitrage : DRAFT / DIAGNOSTIC ONLY | Claude | Momentum préservé sans scellement prématuré |

---

## 7. Références

- `nexus/proof/NCR_CATHEDRAL_BASELINE.md` §Phase 1 (décomposition 81.1 %)
- `packages/sovereign-engine/src/scoring/text-features.ts:420-430` (code source)
- `packages/sovereign-engine/src/scoring/dispatcher/coefficients-v3-4.ts`
- `C:\Users\elric\Claude-Workspace\OMEGA\CLAUDE.md` (plateau CALC SCELLÉ)
- `outputs/log_quality.md` (2026-04-19 matin — Arbitrage 3-IA)
- `outputs/BENCH_P1_V3_AUTOPSY.md` (contexte bench v3)

---

## 8. Verdict (DRAFT)

**Statut** : **DRAFT — diagnostic crédible, plan d'attaque préparé, exécution
suspendue**.

**Confiance dans le diagnostic** : Haute (Phase 1 CATHEDRAL audit reproductible
3 décimales, 81.1 % du gap, seuil ex-ante 50 % dépassé).

**Confiance dans le plan d'attaque** : Moyenne (hypothèse causale pas encore
testée, possible que la normalisation ne réduise pas le gap).

**Forces** :
- Diagnostic chiffré et reproductible.
- Spec DRAFT claire et non-destructive (feature ajoutée, pas remplacée).
- Kill-switch explicite (Δρ +0.02) cohérent avec discipline CALC existante.

**Faiblesses (min. 2)** :
- L'hypothèse de biais n'est pas prouvée causalement. Le 81.1 % est peut-être
  une corrélation reflétant une différence **intrinsèque** de registre, pas
  un bug.
- Aucun bench comparatif n'a encore été exécuté ; le kill-switch +0.02 pourrait
  être activé et rejeter la migration (comme body_binding).
- Re-ouvrir le plateau CALC est coûteux : retraining + 264 holdout + bench
  downstream = plusieurs heures compute.

**Risques restants** :
- Risque de dispersion si le chantier démarre avant fermeture NCR_M2 P0.
- Risque de scellement prématuré si la migration est validée sans bench
  downstream complet.
- Risque de "feature creep" sur le scorer si d'autres features bruts (f12,
  f33a) sont promus sans audit comparable.

**Action requise (DRAFT)** :
- **Aucune action technique** tant que NCR_M2 P0 ouvert.
- Consultation optionnelle Gemini pour raffiner spec.
- Relecture Francky quand bande passante disponible.

**Action requise (promotion vers OPEN)** :
1. NCR_M2_ADAPTIVE_DEADLOCK_INTERIOR fermé.
2. Décision Francky : GO chantier V3.5 / KEEP V3.4 / ABANDON.
3. Si GO : ouvrir ADR formel pour V3.5 et exécuter Phase A smoke diagnostic.

---

## 9. S8 V3A CLASSIFICATION — 2026-05-01

### Evidence checked

- ✅ `packages/sovereign-engine/src/scoring/text-features.ts:420` `computeF33` intact (pas de drift L vs §1)
- ✅ L427 contient seulement `f33b_commas_count: commas` — **aucun `f33b_per_word` ajouté** : DRAFT discipline empiriquement maintenue
- ✅ `coefficients-v3-4.ts` présent
- ❌ NCR_M2_ADAPTIVE_DEADLOCK_INTERIOR : status **FIX_VALIDATED_SCOPED** (Vague 1 C9 commit `7d4bff66`) — **PAS fermé** (transition vers RESOLVED rejetée empiriquement § 11.4)
- ❌ Aucun commit V3.5 / retrain / `f33b_per_word` post-NCR (3 jours sans avancée)

### Mapping DRAFT → status doctrinal

L'instruction Vague 2 doctrine impose les statuts autorisés :
RESOLVED / CLOSED_CONFIRMED / FIX_VALIDATED_SCOPED / ACCEPTED_DIAGNOSED_UNKNOWN /
DEFERRED / STILL_OPEN / SUPERSEDED.

"DRAFT / DIAGNOSTIC ONLY" n'est pas dans la liste. Mapping doctrinal :

| Critère | Vérif | Match status |
|---------|-------|-------------|
| Issue persistante | ✅ f33b_commas_count brut intact | OPEN-family |
| Décision corrective non prise | ✅ §"Action requise (DRAFT)" — aucune | OPEN-family |
| Plan d'attaque documenté | ✅ §3 spec complète | DOCUMENTED |
| Promotion vers exécution **conditionnée et non démarrable** | ✅ 3/3 conditions promotion non remplies | DEFERRED |
| Discipline auto-imposée maintenue | ✅ DRAFT respect total empirique | DEFERRED (volontaire, pas STILL_OPEN passive) |

→ **DEFERRED** est le mapping correct : la discipline DRAFT est elle-même
une forme de différement volontaire et tracé.

### Decision rationale

3 conditions de promotion vers OPEN (§"Promotion vers OPEN") :

1. **NCR_M2 P0 fermé** : ❌ NCR_M2 = FIX_VALIDATED_SCOPED (Vague 1 C9), explicitement
   non transformable en RESOLVED. PRIO 1-3 §10.13 PENDING.
2. **Décision explicite Francky GO/KEEP/ABANDON** : ❌ aucune décision tracée
3. **Budget compute alloué** : ❌ aucun budget tracé

→ Aucune des 3 conditions empiriquement remplie. NCR reste en discipline
DRAFT, mappé doctrinalement vers DEFERRED.

### Final status

**DEFERRED** (severity MEDIUM P2 maintenue — chantier parallèle non bloquant)

### Scope

- **Diagnostic acquis** : Phase 1 CATHEDRAL audit confirme 81.1% du gap
- **DRAFT discipline maintenue** : aucune modification code (text-features.ts intact, coefficients-v3-4.ts intact)
- **Plan d'attaque préservé** : §3 spec V3.5 candidate complète
- **Interdictions §4 respectées** : aucune action interdite empiriquement engagée

### Remaining risks

- **R1** — Bias f33b structural persiste : couplage avec NCR_CATHEDRAL_BASELINE (DEFERRED en C22) — toute scène CATHEDRAL/registre minimaliste reste artificiellement basse en bench
- **R2** — Discipline DRAFT impose dépendance NCR_M2 : tant que M2 ne sort pas de FIX_VALIDATED_SCOPED, V3.5 chantier ne peut démarrer
- **R3** — Risque de feature creep parallèle : autres features brutes (f12_tense_switches count, f33a_dots_count) pourraient bénéficier d'un audit similaire — non planifié

### Next sprint if deferred

**Sprint S9+ — déclenchement conditionnel** :
- Si NCR_M2 promu RESOLVED (replay A.1 PRIO 1 exécuté + drift résolu) :
  débloquer condition 1
- Décision Architecte explicite GO/KEEP/ABANDON V3.5 chantier (condition 2)
- Allocation budget compute (~3-4h pour Phase A smoke + Phase B retrain + Phase C bench downstream)
- Coordination avec NCR_CATHEDRAL_BASELINE (Pistes A/B/C cohérentes — C22)

### Anchor empirique runtime arbitrage

```
S8 V3A CLASSIFICATION — NCR_SCORER_STYLE_BIAS
==============================================
Date            : 2026-05-01 (Sprint S8 V3A)
Status          : DRAFT/DIAGNOSTIC ONLY → DEFERRED
                  (discipline DRAFT maintenue empiriquement)
Severity        : MEDIUM P2 (inchangée)
Authority       : Claude Code (runtime arbiter S8 V3A)
                  + Tribunal 3 IA convergence 2026-04-19 (HOLD)
Evidence anchor : text-features.ts L420 computeF33 intact, L427 sans
                  f33b_per_word (discipline empiriquement maintenue),
                  NCR_M2 status FIX_VALIDATED_SCOPED (cond 1 non remplie)
Scope           : diagnostic acquis 81.1%, discipline DRAFT maintenue,
                  plan d'attaque §3 préservé pour activation conditionnelle
Risks           : R1 bias structural persiste (couplage CATHEDRAL),
                  R2 dépendance NCR_M2 closure, R3 feature creep parallèle
```
