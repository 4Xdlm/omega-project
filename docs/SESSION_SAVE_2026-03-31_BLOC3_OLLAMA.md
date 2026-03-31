# Session 2026-03-31

## Livraisons

### P5 SCELLE
- P5-A test-retest : Omega=0.006, I=0.004, U=0.001 — EXCELLENT x3
- P5-B inter-annotateurs : Omega=0.047, I=0.118, U=0.049
- Les 3 variables du modele MINIMAL sont validees metrologiquement

### I_proxy FR v2 (commit 8dc293fd)
- Bug P5-B : I_proxy v1 sous-estime FR 3e personne distanciee (delta 0.238)
- v2 ajoute : focalisation_interne + ancrage_corporel + desir_narratif
- Delta corrige : 0.238 → 0.080 (critere < 0.10 ATTEINT)

### BLOC 3 shadow via Ollama qwen3.5:35b-a3b
- 8/8 runs OK, 0€ API
- cliff_quality (>=0.50) : 75% — ATTEINT
- branching_signal moyen : 9.7 (75% NEUTRAL)
- CI_L37 desature a 68.7 (vs 98.1 Claude) — revelation
- Prose ~5500 mots/run, ~110 t/s effectif

### BLOC 3 engine.ts
- cliff_quality logging ajoute au cliff gate
- branching_signal (EN_MAX - FR) ajoute aux shadow judges
- Import computeLanguageProfile reactive

## Resultats BLOC 3

| Metrique | Valeur | Statut |
|----------|--------|--------|
| cliff_quality >= 0.50 | 75% (6/8) | ATTEINT |
| branching_signal moyen | 9.7 | NEUTRAL dominant |
| CI_L37 (Ollama) | 68.7 | DESATURE (vs 98.1 Claude) |
| Cout total | 0€ | Local Ollama |
| Tests sovereign-engine | 2022 GREEN | 0 regression |

## Prochaine session
BLOC 4 Scribe (base sur decisions BLOC 3)
- Integrer cliff_quality au dashboard
- Re-evaluer CI_L37 si Ollama devient moteur principal
- Calibrer longueur Ollama (num_predict: 4096)
