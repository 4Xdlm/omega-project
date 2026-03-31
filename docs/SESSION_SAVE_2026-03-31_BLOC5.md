# SESSION_SAVE — 2026-03-31 BLOC5

Branch : phase-r-metrology-rebuild
HEAD   : c6b150b9
Tests  : 2011 GREEN

## DÉCISION D-BLOC5 SCELLÉE : ARCHITECTURE HYBRIDE
Ollama = Draft Engine (0€, 110 t/s, cliff 0.54, CI_L37 76.3, FR natif)
Claude = Judge Engine (~.003/call, stabilité, V3 composite)
Coût final : .02/chapitre (-87% vs tout-Claude)

## PROCHAINE SESSION : BLOC 6
Implémenter l'architecture hybride dans le pipeline souverain.
Ollama génère, Claude juge. 0€ draft + precision Claude.
