# SESSION SAVE — Grand Parallèle (Dual Scoring Pipeline)
**Date**: 2026-03-19
**Branch**: phase-w-mixer
**HEAD départ**: e4dcff39 (tag: phase-r6-complete)
**Standard**: NASA-Grade L4 / DO-178C Level A

---

## Résumé

Branchement du scorer multi-étages R6 dans le pipeline Phase W en mode dual.
Chaque scène du bench est évaluée par deux systèmes simultanément:
1. Legacy V3 (ECC/RCI/SII/IFI/AAI → composite)
2. R6 multi-étages (LOCAL + ARC → composite normalisé 0-100)

## Phases exécutées

### Phase A — Audit
- Point de branchement: `runSovereignForge()` → `SovereignForgeResult.final_prose`
- Interface legacy: `MacroSScore` (5 axes, composite, min_axis)
- Interface R6: `MultiStageScore` (local, arc, composite, passage_type, profile, seal_eligible)
- API R6: `MultiStageScorer.score(features, {wordCount, pRel, profile})`
- Coefficients: `src/scoring/data/OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json`
- Metrology: `omega-autopsie/results_r1/OMEGA_METROLOGIE_EMPIRIQUE_v1.json`

### Phase B — Implémentation
- `scripts/run-benchmark-dual.ts` — 8 scènes, MOCK + API modes
- 8 fragments MOCK ~600 mots (1 par scène/archétype)
- R6 scoring avec normalisation 0-100 active
- 6 profils R6 (STRATOSPHERIQUE → EXPERIMENTAL)
- Spearman rank correlation V3 vs R6
- ValidationPack: `sessions/DualBench_MOCK_<date>_<head>/`

### Phase C — Tests
- 18 nouveaux tests: `tests/art/dual-scoring.test.ts`
- Non-régression legacy: reference scores 9ea5c2fc vérifiés
- Déterminisme R6: score twice = identical
- 6 profils valides: all produce scores 0-100
- Spearman helper: perfect correlation, anti-correlation, ties

### Phase D — Bench MOCK
- 8 scènes scorées dual (V3 reference + R6 live)
- Median V3: 91.64 | Median R6: 22.08
- Spearman rho = 0.119 (attendu: MOCK mode = textes différents)
- Profile variation: ±0.2 (minimal avec 21 features actives)
- LOCAL < 30 → handshake ARC = LOCAL (attendu)

## Résultats tests

```
Tests: 1847 passed | 7 skipped (pre-existing)
Files: 203 passed | 1 skipped
Duration: 3.68s
0 regression
```

## Artefacts

| Artefact | Chemin |
|----------|--------|
| Script dual bench | packages/sovereign-engine/scripts/run-benchmark-dual.ts |
| Tests dual | packages/sovereign-engine/tests/art/dual-scoring.test.ts |
| ValidationPack MOCK | packages/sovereign-engine/sessions/DualBench_MOCK_2026-03-19T18-45-09_e4dcff39/ |
| Report | docs/OMEGA_GRAND_PARALLEL_REPORT.md |
| Session Save | docs/SESSION_SAVE_GRAND_PARALLEL.md |

## Commandes de reproduction

```powershell
# MOCK bench (sans API)
cd packages/sovereign-engine
npx tsx scripts/run-benchmark-dual.ts

# API bench (Francky lance)
$env:ANTHROPIC_API_KEY = "sk-ant-..."
npx tsx scripts/run-benchmark-dual.ts --api

# Tests
cd packages/sovereign-engine
npm test
```

## Limites connues

1. MOCK mode: V3 reference ≠ R6 prose → Spearman non significatif
2. 21 features actives → profils quasi-identiques (±0.2)
3. LOCAL < 30 sur MOCK prose → handshake ARC = LOCAL
4. Tous DIALOGUE (mock prose structure → f34b/f33a thresholds)
5. API mode non câblé (prêt pour Phase B.2)

## Prochaines étapes

1. Câbler API mode dans `run-benchmark-dual.ts` (import runSovereignForge)
2. Lancer bench API avec les 8 mêmes scènes → vrai Spearman V3 vs R6
3. Porter F8-F23 en TypeScript → différenciation profils complète
4. Corrélation cible API: rho ≥ 0.50 (cohérence minimale)

## Verdict

**PASS** — Pipeline dual fonctionnel, tests verts (1847), legacy non régressé, bench MOCK exécuté.

```
Architect: Francky          IA Principal: Claude Code
Standard:  NASA-Grade L4 / DO-178C Level A
```
