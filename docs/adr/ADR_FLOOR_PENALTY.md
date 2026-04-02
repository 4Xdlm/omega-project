# ADR: floorPenalty multiplier = 1.5
Date: 2026-04-02
Statut: EMPIRIQUE — magic number documenté

## Contexte
duel-engine.ts utilise 1.5 dans la sélection hostile :
  selectionScore = composite - 1.5 * max(0, SEAL_FLOOR_MIN - min_axis)

## Provenance
Apparu avec la sélection hostile (Sprint V4.3 Sprint 1).
Convergence 3/3 : Claude + ChatGPT + Gemini.
Pas de calibration formelle documentée.
Le multiplier pénalise les candidats avec des axes faibles.

## Impact si modifié
Augmenter → pénalité plus forte sur les axes faibles → favorise l'équilibre
Diminuer → tolérance plus grande aux déséquilibres → favorise le composite brut

## Décision
Conserver 1.5. Marquer comme ADR-FLOOR-01 dans le code.
Calibrer formellement si Phase R4 modifie les poids macro-axes.
