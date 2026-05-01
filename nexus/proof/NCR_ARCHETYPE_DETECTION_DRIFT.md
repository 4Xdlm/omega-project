# NCR-ARCHETYPE-DETECTION-DRIFT

**Opened**: 2026-04-18
**Severity**: MEDIUM (P2) — non-bloquant pour P1 (gating wiring) mais symptomatique pour bench B1-B4
**Status**: **STILL_OPEN** (Sprint S8 V3A 2026-05-01 — diagnostic OK, aucune décision Architecte appliquée 13 jours)
**Owner**: Francky (décision seuil) + Claude (autopsie)

## Issue

Le smoke test `smoke-p1-gating-propagation-v2.ts` (post-commit `7e89f95f`) révèle un
mismatch entre le **label a priori** `scene.archetype` utilisé dans
`bench-r-d-1-extended.ts` et la **classification algorithmique**
`detectArchetype(emotion_contract)`.

### Scène problématique : `fr_action_poursuite`

**Contrat** :
- `arousals = [0.6, 0.85, 0.9, 0.5]` → `a_mean = 0.7125`
- `silence_zones = [{0.85..1.0}]` → `silence_total = 0.15`
- Label bench : `'ACTION'`

**Classification `detectArchetype`** (src/generation/adaptive-chunker.ts L779-801) :
```
R1 ACTION    : a_mean >= 0.65 ∧ silence_total < 0.10   → 0.7125 ✓ ∧ 0.15 ✗  → FAIL
R2 INTERIOR  : a_mean <= 0.35 ∧ silence_total >= 0.30  → ✗                  → FAIL
R3 CATHEDRAL : a_mean ∈ (0.35, 0.60) ∧ silence >= 0.25 → ✗                  → FAIL
R4 SENSORY   : fallback                                                      → MATCH
```

**Résultat** : `fr_action_poursuite` est classée **SENSORY** par l'algorithme.

## Options

### Option A — Élargir le seuil `silence_total` de R1 ACTION
Passer de `silence_total < 0.10` à `silence_total < 0.20`.
- **Pour** : réaligne label et detection sur le corpus bench.
- **Contre** : dilue la sémantique ACTION (scènes à haute arousal avec
  ouverture/clôture calme).

### Option B — Conserver `detectArchetype` tel quel, recalibrer le corpus bench
Admettre que `fr_action_poursuite` est un **mix ACTION/SENSORY** (accélération
0.85→0.90 + retombée 0.5 + silence terminal) et garder la classification
actuelle. Revoir les labels corpus bench si nécessaire.
- **Pour** : pas de modification du code scellé P1.
- **Contre** : réinterprète les résultats bench R-D.1 cellule `ACTION`
  (1.140 / 1.641 — qui étaient en réalité SENSORY-detected dans le pipeline).

### Option C — Ajouter une règle R1-bis intermédiaire
`a_mean >= 0.65 ∧ silence_total ∈ [0.10, 0.20]` → `ACTION_WITH_CLOSURE`
nouvel archétype (ou ACTION simple).
- **Pour** : fine-grained.
- **Contre** : ouvre la voie à +N archétypes, explosion combinatoire gating.

## Impact sur P1 (R-D.1 ADOPT_A)

**ZÉRO.** Le P1 wiring est intègre :
- INTERIOR détecté correctement → gated 1/1 ✓
- CATHEDRAL détecté correctement → 0 leak ✓ (vigilance ChatGPT validée — c'était le cas critique)
- SENSORY détecté correctement → 0 leak ✓
- ACTION mis-classé SENSORY → 0 leak quand même (SENSORY n'est pas gaté)

Le smoke v2 confirme : **le pipeline ne fuite PAS**, il applique les directives
adaptives correctes pour chaque archétype **détecté**. Le gain R-D.1 INTERIOR
(+5.379) mesuré dans le bench reste valide car les scènes INTERIOR du corpus
bench (`fr_interior_maison_enfance`) sont correctement classées INTERIOR par
l'algorithme.

## Impact sur bench B1-B4 (post-P1)

**Significatif.** Le bench de robustesse ChatGPT doit :
1. Documenter explicitement la correspondance `label` ↔ `detected` pour chaque
   scène du pack B1-B4.
2. Ne pas interpréter la cellule "ACTION" du bench B1-B4 comme un test pur de
   l'archétype ACTION si la scène est `detected=SENSORY`.
3. Ajouter au moins une scène ACTION "pure" (silence_total < 0.10) pour
   exercer réellement la branche ACTION de `detectArchetype`.

## Decision

**EN ATTENTE Francky.** Recommandation Claude :

→ **Option B** (court terme) : conserver le code P1 scellé, accepter que le
corpus bench R-D.1 a une scène mis-labellée. Ajouter dans le pack B1-B4 au moins
1 scène ACTION pure (silence < 0.10) pour couvrir la branche R1.

→ **Option A** (moyen terme) : si empiriquement une majorité de scènes ACTION
réalistes (corpus fiction française) ont silence_total ∈ [0.10, 0.20],
relaxer le seuil. Nécessite audit corpus — pas pré-bench B1-B4.

## Evidence

- Smoke v2 JSON : inline (run_id `smoke-p1-v2-1776519086379`)
- Script : `packages/sovereign-engine/scripts/smoke-p1-gating-propagation-v2.ts`
- Code source : `packages/sovereign-engine/src/generation/adaptive-chunker.ts` L779-801

## Refs

- NCR_DIRECTIVE_BLOAT (CLOSED_CONFIRMED 2026-04-17) — directive adaptive toxique INTERIOR
- NCR_CATHEDRAL_BASELINE (OPEN 2026-04-18) — biais f33b_commas_count registre-aveugle
- memory/project_rd1_bench_ready_2026-04-18.md — bench R-D.1 ADOPT_A + P1 scellé `7e89f95f`

---

## S8 V3A CLASSIFICATION — 2026-05-01

### Evidence checked

- ✅ `packages/sovereign-engine/scripts/smoke-p1-gating-propagation-v2.ts` présent
- ✅ `detectArchetype` toujours à L779 dans `adaptive-chunker.ts` (référence §Issue intacte, pas de drift L)
- ✅ Commit P1 wiring `7e89f95f` (2026-04-18 15:18) confirmé "feat(adaptive-chunker): P1 archetype gating wiring (R-D.1 ADOPT_A)"
- ❌ Aucun commit post-NCR portant sur archetype detection / Option A/B/C
- ⚠️ "EN ATTENTE Francky" depuis 2026-04-18 → **13 jours sans décision** au 2026-05-01

### Decision rationale

Le NCR est diagnostiqué (mismatch label vs detection identifié) et l'impact
sur P1 wiring est ZERO (cf. §"Impact sur P1"). Mais :

- Aucune Option A/B/C n'a été appliquée en code
- Aucune décision Architecte n'a été tracée formellement
- Le pack B1-B4 (mentionné §"Impact sur bench B1-B4") n'a pas été
  empiriquement augmenté avec une scène ACTION pure

→ **STILL_OPEN** plutôt que DEFERRED : pas de décision formelle de
différement, le NCR est en attente passive depuis 13 jours. Honnête
reflet empirique.

→ Pas RESOLVED : issue persiste en code (`fr_action_poursuite` reste
classée SENSORY par l'algorithme).

→ Pas CLOSED_CONFIRMED : aucune confirmation/closure formelle.

### Final status

**STILL_OPEN** (severity P2 MEDIUM maintenue)

### Scope

- **Persistant** : mismatch `fr_action_poursuite` label=ACTION vs detection=SENSORY
- **Mitigation acquise** : ZERO impact P1 wiring (smoke v2 confirme pipeline correct)
- **Non traité** : Options A/B/C, augmentation pack B1-B4 avec ACTION pure

### Remaining risks

- **R1** — Bench B1-B4 interprétation biaisée : si un futur bench évalue
  cellule "ACTION", il mesure de facto SENSORY pour `fr_action_poursuite`.
  Risque de fausse conclusion sur la branche ACTION du gating.
- **R2** — Décision Architecte 13 jours en attente : risque de bit-rot
  contextuel (Francky pourrait perdre le contexte fin pour décider Option A/B/C
  si re-réveil du NCR trop tardif).
- **R3** — Pack corpus bench non-augmenté : aucune scène ACTION pure
  (silence_total < 0.10) n'a été ajoutée. La branche R1 ACTION de
  `detectArchetype` reste empiriquement non-exercée par le bench actuel.

### Next sprint if not addressed

**Sprint S9+ recommandé** :
- Décision Architecte explicite Option A (relax seuil silence) / B (recalibrer
  corpus) / C (ajouter R1-bis ACTION_WITH_CLOSURE)
- Si Option B retenue : ajouter ≥1 scène ACTION pure au pack bench
- Mise à jour `detectArchetype` si Option A ou C

### Anchor empirique runtime arbitrage

```
S8 V3A CLASSIFICATION — NCR_ARCHETYPE_DETECTION_DRIFT
======================================================
Date            : 2026-05-01 (Sprint S8 V3A)
Status          : OPEN_DIAGNOSED → STILL_OPEN (pas de décision formelle)
Severity        : MEDIUM P2 (inchangée)
Authority       : Claude Code (runtime arbiter S8 V3A)
                  + Francky décisionnaire pour Options A/B/C S9+
Evidence anchor : detectArchetype L779 intact, smoke v2 script présent,
                  commit 7e89f95f wiring confirmé, 0 commit post-NCR
Scope           : mismatch persiste, P1 ZERO impact, pack B1-B4 non patché
Risks           : R1 bench interprétation biaisée, R2 bit-rot 13 jours,
                  R3 R1 ACTION branche non-exercée
```
