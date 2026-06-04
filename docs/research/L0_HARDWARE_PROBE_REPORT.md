# L0 — Hardware Probe Report (LoRA/QLoRA faisabilité matérielle)

**Date** : 2026-06-04 · **Type** : probe technique read-only (aucun entraînement, aucun install) · **Parent** : [L0 Preflight](L0_LORA_FEASIBILITY_PREFLIGHT.md).

## Mesures (machine Architecte, Windows)

### Matériel — EXCELLENT
| Composant | Mesure | Verdict |
|---|---|---|
| GPU | **NVIDIA GeForce RTX 5090, 32607 MiB (~32 Go VRAM)**, driver 596.36 | Largement suffisant pour QLoRA d'un modèle ~31B en 4-bit |
| VRAM libre à l'instant | 312 MiB libre / 31879 MiB utilisés | **Saturée par Ollama** (gemma4:31b résident, keep_alive 24h) — **libérable** en stoppant Ollama avant un train |
| RAM système | 63.7 Go total / 36.6 Go libre | Suffisant (offload optimizer/CPU possible) |
| Disque C: | 1233 Go libre / 1862 Go | Ample (poids base + checkpoints + adapters) |
| CPU | Intel Core Ultra 7 265KF | OK (dataloading, offload) |

### Logiciel — NON PRÊT (blocant pour l'entraînement)
| Élément | État | Problème |
|---|---|---|
| Python | **3.14.0** | **Trop récent** : bitsandbytes / unsloth / flash-attn n'ont pas (encore) de wheels py3.14 → stack training inutilisable telle quelle |
| torch | **2.11.0+cpu** | **Build CPU-only — ne voit PAS le GPU**. Besoin d'un build CUDA cu128 (Blackwell sm_120) |
| transformers | ABSENT | à installer |
| peft | ABSENT | à installer (LoRA/QLoRA) |
| bitsandbytes | ABSENT | à installer (quant 4-bit ; Blackwell exige bnb récent) |
| accelerate / datasets / trl | ABSENT | à installer (boucle d'entraînement) |
| unsloth | ABSENT | optionnel (accélère, réduit VRAM) |

## Interprétation
- **Le mur n'est PAS le matériel.** Une RTX 5090 32 Go entraîne sans problème un QLoRA 4-bit d'un modèle ~31B (réf. QLoRA : un 33B tient en 24 Go avec paged optimizer + gradient checkpointing ; 32 Go = confortable). Modèles plus petits (gemma 9-12B) = itération très rapide.
- **Le mur est la toolchain** : torch CPU-only + Python 3.14 (bleeding-edge) + zéro lib d'entraînement. Il faut **construire un environnement dédié** (Python 3.11/3.12 + torch cu128 + bnb/peft/trl) avant tout L1.
- **Risque Blackwell (sm_120)** : le RTX 5090 est Blackwell ; exige CUDA 12.8+ et des versions très récentes de torch/bitsandbytes. Maturité de l'écosystème = risque réel de friction d'install (à valider par un smoke « charger en 4-bit + 1 step dummy » AVANT d'investir dans le dataset).
- **Modèle cible** : `gemma4:31b` est un tag Ollama (GGUF) — **inutilisable tel quel pour l'entraînement** (besoin des poids HF + licence de fine-tuning). Identifier le vrai modèle de base + sa licence = item ouvert.

## Estimations (si toolchain construite)
- **VRAM QLoRA 31B 4-bit** : ~22-28 Go (batch=1, grad_accum 8-16, seq 1024-2048, gradient checkpointing, paged_adamw_8bit) → tient dans 32 Go.
- **Batch minimal** : 1 (+ accumulation). Avec un 9-12B : marge confortable, batch plus grand.
- **Temps** : L1 pilote 50 paires = minutes à <1 h (quelques epochs). Quelques centaines de paires = 1-4 h. Très faisable.
- **Stockage** : poids base HF ~17 Go (4-bit) à ~60 Go (fp16) ; adapters LoRA ~0.1-0.5 Go ; checkpoints. 1.2 To libre = large.
- **Risques** : thermique/alim (5090 ~575 W — vérifier PSU/refroidissement) ; Ollama doit libérer la VRAM pendant le train ; py3.14 → env séparé obligatoire.

## VERDICT
- Statut : **matériel PASS, toolchain NON INSTALLÉE** (setup requis). Confiance : Haute (mesures directes).
- Forces : GPU 32 Go + 64 Go RAM + 1.2 To = capable QLoRA 31B ; estimations dans l'enveloppe.
- Faiblesses : (1) torch CPU-only ; (2) Python 3.14 incompatible stack training ; (3) Blackwell = écosystème jeune (risque install) ; (4) modèle de base HF + licence à identifier.
- Action requise : voir `L0_GO_NOGO_LORA.md`. Avant L1 dataset, insérer un **L0.5 = construire env py3.11/3.12 cu128 + smoke 4-bit 1-step** pour lever le risque toolchain. Aucun entraînement réel à ce stade.
