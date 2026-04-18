# NCR_BENCH_METHOD_DRIFT

**ID** : NCR_BENCH_METHOD_DRIFT
**Title** : Divergence méthodologique entre bench R-D.1 (plan V1 static) et bench P1 robustness v1 (plan V2B2 adaptatif)
**Status** : OPEN_DIAGNOSED
**Severity** : HIGH (bloque validation empirique P1 wiring)
**Priority** : P2 (après validation autonome + décision Francky)
**Opened** : 2026-04-18
**Owner** : Claude (autonome) + Francky (décisionnaire)

---

## 1. Issue

Le bench `bench-p1-robustness-v1.ts` a produit verdict FAIL (4/5 gates) sur 24 runs. Autopsie (`outputs/BENCH_P1_AUTOPSY_v1.md`) a démontré que le FAIL est un artefact de divergence méthodologique avec le bench de référence R-D.1 ADOPT_A, et NON une réfutation du wiring P1 câblé au commit `7e89f95f`.

**Divergence identifiée** :

| Aspect               | R-D.1 (bench-r-d-1-extended.ts)       | P1 v1 (bench-p1-robustness-v1.ts)     |
|----------------------|----------------------------------------|----------------------------------------|
| Plan de chunking     | V1 static 4 × 750w fixes               | V2B2 adaptatif (word_targets variables)|
| Modes                | M1, M2_adaptive, M3_gated_A, M4_reform | M1_baseline, M_prod_p1 uniquement      |
| Seuil B1 (référence) | M3 − M2 = +5.379 ← CALIBRATION SEUIL   | M_prod_p1 − M1 = +0.525 ← RÉFÉRENCE RÉELLE |
| n seeds              | 3                                      | 3                                      |

**Conséquences** :
1. Les `word_targets` adaptatifs introduisent une variable d'environnement (taille de chunk dépend de pacing) qui **domine** l'effet directive isolé.
2. Sans M2_adaptive, le seuil B1 = +3.0 est comparé à un gain intra-P1 (M_prod_p1 − M1) qui correspond à M3 − M1 dans R-D.1, soit +0.525, pas +5.379.
3. La variance intra-cellule σ ≈ 1.2-2.6 avec n=3 rend tout Δ < 1.5 statistiquement indistinct.

---

## 2. Preuves

### 2.1 Code bench-r-d-1-extended.ts (R-D.1)

```typescript
// Ligne 392
// PROMPT BUILDER — plan V1 static 4×750w pour TOUS les modes
const LEGACY_CHUNK_WORDS = 750;  // fixed
```

### 2.2 Code bench-p1-robustness-v1.ts

```typescript
// Usage planAdaptiveChunkingV2B2 pour extraire word_targets
const plan = planAdaptiveChunkingV2B2({ contract, ... });
// Puis generation sur plan.chunks (tailles variables)
```

### 2.3 Matrices cell_mean

**R-D.1 (48 runs)** :

| Mode           | ACTION | INTERIOR | SENSORY | CATHEDRAL |
|----------------|--------|----------|---------|-----------|
| M1_baseline    | 2.329  | 6.559    | 6.290   | 1.137     |
| M2_adaptive    | 1.339  | 1.705    | 4.249   | −0.676    |
| M3_gated_A     | 1.140  | 7.084    | 4.696   | 0.498     |

ΔI(M3 − M2) = +5.379 ← **référence du seuil B1**
ΔI(M3 − M1) = +0.525 ← **gain réel vs baseline**

**P1 v1 (24 runs)** :

| Mode          | ACTION | INTERIOR | SENSORY | CATHEDRAL |
|---------------|--------|----------|---------|-----------|
| M1_baseline   | 1.812  | 6.589    | 5.704   | 2.822     |
| M_prod_p1     | 1.278  | 6.293    | 5.836   | 1.287     |

ΔI(M_prod_p1 − M1) = −0.295 ← **FAIL B1**, mais COMPARE À +0.525 PAS À +5.379

### 2.4 Variance n=3

CATHEDRAL M1_baseline (P1 bench) : [3.535, 3.464, 1.468] → σ = 1.173
CATHEDRAL dans R-D.1 : 1.137 (μ) → |écart| = 1.685, dans IC 95% ±1.33

---

## 3. Options

### Option A — Bench v2 strict R-D.1 reproduction

**Description** : Cloner `bench-r-d-1-extended.ts` (plan V1 static 4×750w), garder 3 modes (M1_baseline, M2_adaptive, M_prod_p1 où M_prod_p1 appelle `pickPacingDirective` 4-arg comme la production). Recalibrer seuils sur gain R-D.1 intra-bench.

**Seuils v2 proposés** :
- G1 : ΔI(M_prod_p1 − M2_adaptive) ≥ +3.0 (reproduction directe du +5.379 R-D.1)
- G2 : ΔI(M_prod_p1 − M1_baseline) ≥ −0.5 (non-régression vs baseline)
- G3 : ΔC(M_prod_p1 − M1_baseline) ≥ −0.5 (invariance CATHEDRAL)
- G4 : |μ(M1 CATHEDRAL) − 0.503| ≤ 2.0 (reproductibilité baseline)

**n** : 6 seeds par cellule (4 arch × 3 modes × 6 = 72 runs, ~3h à qwen3:32b)

**Pros** : Reproduit exactement la méthode qui a scellé ADOPT_A. Comparabilité directe. Résout les 4 gates FAIL par conception.

**Cons** : Ne teste pas le path prod avec word_targets adaptatifs (le code qui tourne réellement en prod V2 avec `planAdaptiveChunkingV2B2`). Question : est-ce que le gating compose bien avec le chunk sizing adaptatif ?

### Option B — Accepter v1, recalibrer seuils post-hoc

**Description** : Garder le bench v1 (plan V2B2 adaptatif), mais recalibrer les seuils sur une référence "V2B2-native" à construire (soit bench pilote M2_adaptive sur V2B2, soit seuils théoriques plus bas).

**Pros** : Teste le path production réel.

**Cons** : **Violation règle OMEGA** — "seuils scellés ex-ante NON NÉGOCIABLES post-bench". Ajustement post-hoc = perte de rigueur statistique.

**Rejet** : Incompatible avec `project_rd1_bench_ready_2026-04-18.md` → "Seuils scellés ex-ante (PAS NÉGOCIABLES post-bench)".

### Option C — Bench hybride : v1 + v2 exécutés en parallèle

**Description** : Conserver v1 comme "prod path" (information diagnostique), exécuter v2 comme "R-D.1 replay" (validation empirique P1). Verdict P1 basé sur v2 ; v1 devient référence pour un NCR futur sur la compatibilité V2B2 × gating.

**Pros** : Double information, traçabilité complète.

**Cons** : Coût double (~5h total). Complexité protocole.

---

## 4. Recommandation

**Option A** (bench v2 strict R-D.1 reproduction, n=6). Justifications :

1. **Rigueur OMEGA** : Respecte "seuils scellés ex-ante". Le bench v1 n'est pas "faux", il teste autre chose que ce que R-D.1 a scellé.
2. **Parcimonie** : Un seul bench bien calibré > deux benches à interprétation croisée.
3. **P1 wiring valide** : Smoke v2 + 2424 tests PASS + détection archétype 6/6 = 3 preuves indépendantes que le code est correct. v2 doit être une **confirmation**, pas une investigation.
4. **Si v2 PASS** → P1 empiriquement validé, ouvrir P2 NCR_SCORER_STYLE_BIAS.
5. **Si v2 FAIL G1** → alors vraie autopsie wiring + rollback possible.

**Option C** peut être ouverte en follow-up si Francky veut la double-validation V2B2.

---

## 5. Plan d'action proposé (pending Francky)

1. **Créer** `packages/sovereign-engine/scripts/bench-p1-robustness-v2.ts`
   - Clone de `bench-r-d-1-extended.ts` (plan V1 static 4×750w)
   - 3 modes : M1_baseline, M2_adaptive, M_prod_p1
   - M_prod_p1 appelle `pickPacingDirective(register, state, undefined, archetype)` (4-arg prod signature)
   - Gates G1-G4 recalibrés (voir §3 Option A)
   - n = 6 seeds par cellule → 72 runs
2. **Créer** launcher `outputs/run_bench_p1_robustness_v2.ps1`
3. **Créer** analyseur `outputs/analyze_bench_p1_v2_results.ps1` (reprise de v1 analyseur avec 3 modes)
4. **Commit** atomique : bench v2 + launcher + analyseur + ce NCR + autopsie
5. **Exécution** : ~3h Ollama qwen3:32b (Francky-side)
6. **Verdict** : post-bench, update log_quality.md + mémoire

---

## 6. Impact sur décisions précédentes

- **P1 commit 7e89f95f** : NE PAS ROLLBACK. Décision maintenue (Option A preuves indépendantes).
- **NCR_DIRECTIVE_BLOAT** : reste FIX_VALIDATED (smoke v2 = preuve suffisante).
- **NCR_CATHEDRAL_BASELINE** : reste OPEN_DIAGNOSED (orthogonal au bench method).
- **NCR_ARCHETYPE_DETECTION_DRIFT** : reste OPEN_DIAGNOSED (orthogonal).
- **R-D.1 ADOPT_A** : reste SCELLÉ (48 runs intra-bench intact).

---

## 7. Decision

**Pending Francky approval**. Recommandation Option A. Si GO → commit artefacts + launch bench v2.

Attendu : verdict GO/REJECT sur Option A.

---

**Références** :
- `outputs/BENCH_P1_AUTOPSY_v1.md` (autopsie complète)
- `packages/sovereign-engine/bench-r-d-1-extended-results.json` (R-D.1 source vérité)
- `packages/sovereign-engine/bench-p1-robustness-results.json` (P1 v1 FAIL artefact)
- `packages/sovereign-engine/scripts/bench-r-d-1-extended.ts` (protocole référence)
- `packages/sovereign-engine/scripts/bench-p1-robustness-v1.ts` (protocole divergent)
- `memory/project_rd1_bench_ready_2026-04-18.md`
