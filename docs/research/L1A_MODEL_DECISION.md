# L1-A — Décision modèle de base (pour LoRA V2)

**Date** : 2026-06-04 · **Parent** : [L1A Base Model Validation](L1A_BASE_MODEL_VALIDATION_REPORT.md).

## Décision
**Modèle cible = `google/gemma-4-31b-it`** (le vrai base HF du générateur de prod Ollama `gemma4:31b`).

### Justification
- **Fidélité au générateur de prod** : c'est exactement le modèle derrière `gemma4:31b` (architecture gemma4, 31.3B). Adapter celui-ci = pas de changement de générateur, calibrations Rosetta/juge existantes restent pertinentes (recalibration EMP-19 quand même requise post-LoRA car nouveaux poids).
- **Licence Apache-2.0** + **non gaté** → fine-tuning autorisé, téléchargement sans barrière de licence.
- **`-it` (instruction-tuned)** retenu plutôt que la base `-pt` : le pipeline OMEGA (forge, K2, prompts d'instruction) et le cadrage B du dataset (instruction « réécris mieux ») sont instruction-style → `-it` est le socle fidèle. La base `-pt` reste une alternative pour une adaptation stylistique plus profonde (à arbitrer si `-it` sur-contraint le style).

## Alternatives / fallback
| Choix | Quand | Coût |
|---|---|---|
| **A — google/gemma-4-31b-it** (retenu) | défaut | 62.6 Go dl, VRAM ~22-28 Go (à confirmer load test) |
| B — google/gemma-4-31b (base -pt) | si `-it` trop contraint pour le style | idem taille |
| C — modèle 9-13B (ex. Gemma plus petit) | si load test 31B = OOM, OU si itération rapide souhaitée pour L1 | dl + VRAM réduits, MAIS change le générateur → recalibration EMP-19 dédiée, prose potentiellement inférieure |

## Spécificité technique notée
`google/gemma-4-31b-it` est **multimodal** (`Gemma4ForConditionalGeneration`, tokens image + audio). Pour un LoRA **texte** :
- charger via `AutoModelForImageTextToText` (ou classe Gemma4), cibler les projections d'attention du **language model** (`q/k/v/o_proj`) — pas les tours vision/audio.
- le dataset reste 100 % texte (cadrage B) ; les capacités multimodales sont ignorées (non entraînées).

## Format dataset (pour L1, après load test PASS)
- Format **chat Gemma** (`<start_of_turn>user … <end_of_turn>\n<start_of_turn>model … <end_of_turn>`) — compatible TRL `SFTTrainer`.
- Cadrage B : `user` = « Réécris en prose plus dense/juste : <prose OMEGA faible> » ; `model` = version corrigée validée (œil Architecte + règle des deux clés).

## VERDICT
- Statut : décision prise (cible = gemma-4-31b-it). Confiance : Haute sur le choix ; Moyenne tant que le load test 31B (VRAM) n'est pas exécuté.
- Forces : fidélité au générateur prod ; Apache-2.0 ; non gaté ; format dataset défini.
- Faiblesses : (1) multimodal → cibler le language model ; (2) 62.6 Go sans mirror 4-bit ; (3) load test VRAM pending acquisition ; (4) `-it` vs `-pt` à re-arbitrer si le style est bridé.
- Action requise : confirmer par le load test (auto-déclenché à l'acquisition) ; puis GO L1 dataset 50 paires. HF token recommandé pour débloquer le download.
