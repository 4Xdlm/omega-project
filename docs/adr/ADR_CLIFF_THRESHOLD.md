# ADR: CLIFF_THRESHOLD = 0.30
Date: 2026-04-02
Statut: EMPIRIQUE — provenance partielle

## Contexte
engine.ts:455 utilise CLIFF_THRESHOLD = 0.30 pour la guillotine déterministe (BB-01).
cliff_score = tension * 0.5 + ellipsis * 0.3 + incomplete * 0.2

## Provenance
Lié indirectement à BB-01 (cliff_score attracteur = 0.50, confidence 0.96).
Le seuil 0.30 est plus strict que 0.50 : il coupe plus tôt.
Provenance exacte : non documentée lors de l'implémentation.
Convergence 3/3 (Gemini "bourreau" + ChatGPT "structural offloading").

## Impact si modifié
Augmenter → moins de coupes → plus de closure (contredit BB-01)
Diminuer → plus de coupes → prose tronquée

## Décision
Conserver 0.30 comme valeur opérationnelle.
Documenter comme EMPIRIQUE jusqu'à calibration formelle.
