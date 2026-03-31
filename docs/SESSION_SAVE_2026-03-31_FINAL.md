# SESSION_SAVE — 2026-03-31 FINAL
Branch : phase-r-metrology-rebuild
Commits : 529f2e6c · 8dc293fd · e50e37fe
Tests : 2011 GREEN

## PVI SCELLE
I_proxy FR v2 : delta 0.238->0.080 EXCELLENT
P5-A test-retest : Omega=0.006 I=0.004 U=0.001 EXCELLENT x3
P5 SCELLE 2026-03-31 — MODELE MINIMAL VALIDE METROLOGIQUEMENT

## BLOC 3 OLLAMA (0 euro)
cliff_quality>=0.50 : 75% (6/8) ATTEINT
branching_signal : 9.7 moyen (nativement FR)
CI_L37 Ollama : 68.7 (desature, signal utile vs 98.1 Claude)
Vitesse : 110 t/s · 65s/run · 5500 mots/run

## LOIS OLLAMA SCELLEES
L-OLLAMA-01 : CI_L37 redevient discriminant avec Ollama
L-OLLAMA-02 : Cliff 0.575 Ollama vs 0.450 Claude (post-processing moins necessaire)
L-OLLAMA-03 : Prose nativement FR (branching 9.7 vs 16.2 Claude)

## NEXT : BLOC 5 ou comparaison Claude vs Ollama 32 runs
