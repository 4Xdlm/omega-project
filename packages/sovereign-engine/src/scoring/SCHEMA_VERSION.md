# OMEGA — SCORING SCHEMA VERSION
# Date : 2026-03-25
# Standard : NASA-Grade L4 / DO-178C Level A

## Version courante

```
SCORING_SCHEMA_VERSION: 4.0
Date dernière synchronisation : 2026-03-24
```

## Pipelines de features

| Pipeline | Fichier | Features | Usage |
|----------|---------|----------|-------|
| Python corpus | omega-autopsie/full_work_analyzer_v4.py | F1-F30 | Calibration sur 181 œuvres classiques |
| TS runtime | src/scoring/text-features.ts | F1-F38 + 3 interactions = 42 | Scoring production prose LLM |
| TS GB V1 | src/scoring/gb-scorer.ts | 42 features → forêt 50 arbres | Juge microbench (SCELLÉ) |
| TS MS V2 | src/scoring/multi-stage-scorer-v2.ts | 16 features (subset) + Ridge | Juge décision longue forme (SCELLÉ) |

## Correspondance features

| Plage | Python (v4.py) | TypeScript (text-features.ts) | Sync |
|-------|---------------|-------------------------------|------|
| F1-F19 | ✅ Présent | ✅ Présent — formules identiques | SYNCED |
| F20-F23 | ✅ Présent | ⚠️ Partiel (portage Phase R5) | CHECK |
| F24-F38 | ❌ Absent | ✅ Présent — TS-only (Phase R5) | N/A |

## Règle de synchronisation

Toute modification d'une feature F1-F19 dans Python OU TypeScript
DOIT être reportée dans l'autre pipeline ET ce fichier mis à jour.

Violation = FAIL de gouvernance.
