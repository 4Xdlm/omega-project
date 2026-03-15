# SESSION_SAVE — 2026-03-13 (V-BENCH)
## OMEGA Phase V — CDE-BENCH Premier Run

**Commit** : `f2a801ae` | **Tests** : 1564 / 1564 — 0 régressions

## RÉSULTATS CDE-BENCH (2026-03-13T21-40-20)

| Métrique | Scène 1 | Scène 2 |
|----------|---------|---------|
| Composite | 88.96 | 87.85 |
| ECC | 83.0 | 81.6 |
| RCI | 86.7 | 80.9 |
| SII | 88.0 | 90.7 |
| IFI | 97.4 | 96.8 |
| AAI | 95.6 | 95.6 |
| min_axis | 83.0 | 80.9 |
| SAGA_READY | ❌ | ❌ |
| Brief tokens | 143 | 143 |
| Brief hash | e224570b... | 73173e51... (différent ✅) |

## CE QUI FONCTIONNE

- Chaîne CDE opérationnelle de bout en bout
- `propagateDelta()` fonctionnel : hashes différents scène 0 vs 1 (INV-CHAIN-02 ✅)
- Arc movements détectés : Pierre `confrontation→resolution`, Marie `setup→resolution`
- Brief compressé à 143 tokens (INV-CDE-01 ✅)
- Déterminisme : même scène 0 hash à chaque run (INV-CDE-02 ✅)

## DIAGNOSTIC ROOT CAUSE

ECC insuffisant (83.0 / 81.6) — goulot d'étranglement :
- Bench utilise 3 waypoints grossiers (0.0 / 0.5 / 1.0)
- trajectoire prescrite pauvre → tension_14d = 59.2 (sous-score ECC ×3)
- Scène 2 : RCI chute 86.7 → 80.9 — brief propagé alourdit prompt

Composites (89.0 / 87.9) < one-shots Phase U (~91-92). Le CDE fonctionne
structurellement. Le bench est trop minimal pour mesurer l'impact réel.

## PROCHAINE ÉTAPE — V-CALIBRATE

Option A : Enrichir bench (7-10 waypoints précis, scènes distinctes)
Option B : Revoir injection brief (section dédiée vs append description)

## COMMITS SESSION 2026-03-13

| Commit | Sprint | Tests |
|--------|--------|-------|
| `bbd448d2` | U-ROSETTE-18 | 1520 |
| `bd7a4a9f` | V-INIT | 1543 |
| `d4be8c03` | V-PROTO | 1564 |
| `f2a801ae` | V-BENCH fix | 1564 |
