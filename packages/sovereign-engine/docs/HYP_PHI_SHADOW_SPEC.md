# HYP-PHI-01 — HYPOTHÈSE NOMBRE D'OR (SHADOW MODE)
# ═══════════════════════════════════════════════════════════════════════════════
# Document: HYP_PHI_SHADOW_SPEC.md
# Date: 2026-02-22
# Status: SCELLÉ — observer-only, zéro impact scoring
# Standard: NASA-Grade L4 — R7 (zéro approximation)
# ═══════════════════════════════════════════════════════════════════════════════

## RÈGLE ABSOLUE

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  φ EST UNE HYPOTHÈSE À TESTER — JAMAIS UNE CONSTANTE DU SCORER               ║
║  CETTE MESURE NE MODIFIE AUCUN SCORE, VERDICT OU DÉCISION DU PIPELINE.       ║
║  observer_only: true — violation = CORRUPTION du système                     ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

## HYPOTHÈSE

**HYP-PHI-01** : Dans la prose littéraire française de référence (Flaubert, Proust,
Stendhal), le ratio d'expansion entre phrases adjacentes tend naturellement vers
φ ≈ 1.618. Cette distribution n'est pas observée dans la prose générée par IA.

## MESURE

| Paramètre | Valeur |
|-----------|--------|
| Unité | mots/phrase |
| Formule | `ratio_k = len(phrase[k+1]) / len(phrase[k])` |
| Segmentation | regex `[^.!?]+[.!?]+` — déterministe, zéro dépendance externe |
| Métriques | `ratio_mean`, `ratio_std`, `distance_to_phi_mean = |ratio_mean - φ|` |
| Output | `phi_XX.json` sidecar par run dans `nexus/proof/genius-dual-comparison/` |
| Influence | **ZÉRO** — jamais lu par `computeGeniusMetrics`, `engine.ts`, ni aucun scorer |

## CRITÈRE DE VALIDATION (condition intégration future)

Sur corpus golden ≥ 30 runs HUMAIN :
- Test statistique : distribution `ratio_mean` centrée sur φ ± 0.15 (Gauss)
- Séparation H/AI : corpus humain distance < 0.2, corpus AI distance > 0.4

**Si ces deux conditions sont réunies** → ticket d'intégration dans `voice-scorer.ts`.
**Sinon** → hypothèse détruite proprement, `phi_XX.json` archivés comme preuve négative.

## IMPLÉMENTATION

Fichier : `scripts/run-dual-benchmark.ts`, fonction `computePhiMetrics(text)`
Output schema : `genius.phi.shadow.v1`

```typescript
// INVARIANT observer_only = true — jamais modifiable
const phiRecord = { schema: 'genius.phi.shadow.v1', observer_only: true, ... }
```

## SHA-256 SCEAU

Ce document est committé avec `run-dual-benchmark.ts` et `BENCHMARK_PROTOCOL.md`.
Toute modification invalide le sceau de Phase 4f.
