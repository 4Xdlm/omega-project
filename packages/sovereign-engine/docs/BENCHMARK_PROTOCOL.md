# OMEGA GENIUS — BENCHMARK PROTOCOL Phase 4f
# ═══════════════════════════════════════════════════════════════════════════════
# Document: BENCHMARK_PROTOCOL.md
# Date: 2026-02-22
# Status: SCELLÉ
# Standard: NASA-Grade L4 / DO-178C Level A
# ═══════════════════════════════════════════════════════════════════════════════

## OBJECTIF

Décider la migration de `scorerMode: 'legacy'` vers `'omegaP0'` (Sunset Contract
scellé dans `ADR-GENIUS-DUAL-MODE.md`).

## PARAMÈTRES

| Paramètre | Valeur | Règle |
|-----------|--------|-------|
| N_target | 50 runs | Sunset contract |
| N_min (décision) | 30 runs | Aucune décision avant N ≥ 30 |
| Mode scoring | `GENIUS_SCORER_MODE=dual` | Immuable pour ce benchmark |
| Provider | Paramétré (non hardcodé) | `--provider anthropic|openai` |
| Dataset | Voir §Dataset ci-dessous | |
| Phi shadow | Actif — observer-only | `computePhiMetrics()` sidecar |

## DATASET

**Option A (défaut)** : Scénarios golden SE existants via `loadGoldenRun()`.
→ `golden/e2e/run_001/runs/13535cccff86620f` (baseline certifié).

**Option B (complément)** : Nouveaux runs si N_A < 30 après erreurs provider.
→ Via `omnipotent-live-calibrate.ts` avec seeds 51..80.

Ordre de priorité : A d'abord, B en complément.

## STRUCTURE DE SORTIE

```
nexus/proof/genius-dual-comparison/
  <timestamp>/
    run_01.json     ← DualBenchmarkRun (schema: genius.dual.benchmark.v1)
    phi_01.json     ← PhiMetrics sidecar (schema: genius.phi.shadow.v1)
    ...
    run_50.json
    phi_50.json
    BENCHMARK_REPORT.md
    HASHES.txt      ← SHA-256 par fichier + ROOT_HASH
```

## CRITÈRES SUNSET (décision migration)

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  BASCULE omegaP0 SI :                                                         ║
║    1. N ≥ 30 runs réussis                                                     ║
║    2. median(G_new - G_old) ≥ 0                                               ║
║    3. regressions = 0                                                         ║
║       (regression = verdict_legacy ∈ {SEAL,PITCH} AND G_new < G_old - 2)    ║
║    4. determinism = PASS                                                      ║
║                                                                               ║
║  SINON : MAINTAIN_LEGACY                                                      ║
║                                                                               ║
║  TTL contractuel : 14 jours OU 50 runs (premier atteint)                     ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

## COMMANDE D'EXÉCUTION

```powershell
# Depuis packages/sovereign-engine
cd C:\Users\elric\omega-project\packages\sovereign-engine

# S'assurer que omega-p0/dist/ est à jour (TD-01 workaround)
cd ..\..\omega-p0; npm run build

# Lancer le benchmark
cd ..\packages\sovereign-engine
npx tsx scripts/run-dual-benchmark.ts `
  --provider anthropic `
  --model claude-sonnet-4-20250514 `
  --run ..\..\golden\e2e\run_001\runs\13535cccff86620f `
  --seeds 1..50 `
  --out nexus/proof/genius-dual-comparison
```

## APRÈS LE BENCHMARK

| Verdict | Action sprint suivant |
|---------|-----------------------|
| BASCULE | Flag default → `omegaP0`, purge code legacy, normaliser TD-01-SUBMODULE |
| MAINTAIN_LEGACY | Relancer avec dataset élargi (Option B) ou revoir calibration omega-p0 |

## DETTE TECHNIQUE

**TD-01-SUBMODULE** : omega-p0 importé via `file:../../omega-p0`.
→ Normaliser (git submodule ou npm workspace) avant release certifiée.
→ N'est pas un blocage pour ce benchmark (workaround : `npm run build` dans omega-p0).

## INTÉGRITÉ

Ce document est committé avec `run-dual-benchmark.ts` et `HYP_PHI_SHADOW_SPEC.md`.
Hash vérifié dans `HASHES.txt` après chaque session benchmark.
