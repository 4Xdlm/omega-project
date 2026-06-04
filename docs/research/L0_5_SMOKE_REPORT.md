# L0.5 — Build env + Smoke QLoRA (résultat)

**Date** : 2026-06-04 · **Parent** : [L0 GO/NO-GO](L0_GO_NOGO_LORA.md) · GO Architecte « probe hardware d'abord » → env construit + smoke exécuté. **Aucun entraînement réel sur dataset.**

## Environnement construit
- Emplacement : `C:\Users\elric\omega-lora\.venv` (venv dédié, **hors repo**, Python 3.11.9 via `uv`). N'affecte pas le Python 3.14 système (scripts métrologie).
- Stack installée (uv, ~80 s) : **torch 2.11.0+cu128**, transformers 5.10.1, peft 0.19.1, trl 1.5.1, **bitsandbytes 0.49.2**, accelerate, datasets, safetensors, sentencepiece.
- Construction Windows **natif** (pas de WSL — finalement inutile).

## Vérifications critiques (Blackwell sm_120)
| Test | Résultat |
|---|---|
| `torch.cuda.is_available()` | **True** |
| GPU vu par torch | RTX 5090, capability **(12,0) = Blackwell sm_120** |
| `import bitsandbytes` | **OK 0.49.2** |
| `Linear4bit` forward CUDA | **OK** (kernel 4-bit tourne sur Blackwell) |

## Smoke QLoRA (pipeline complet)
Modèle de validation : `HuggingFaceTB/SmolLM2-135M` (petit, Apache-2.0 — valide la stack à moindre coût ; le risque Blackwell/bnb est indépendant de la taille).
| Étape | Résultat |
|---|---|
| Chargement 4-bit NF4 (double quant, compute fp16) | OK, 8.7 s (incl. download) |
| Adapter LoRA (r=8, α=16, q_proj/v_proj) | 460 800 params entraînables / 81.9 M |
| **1 step d'entraînement** (forward+loss+backward+optimizer) | **OK, 0.56 s, loss 5.41** |
| Sauvegarde adapter | `adapter_model.safetensors` écrit ✓ |
| VRAM pic | 224 Mo (modèle 135M) |

Ollama stoppé avant le smoke → VRAM libérée (30.5 Go dispo). À redémarrer si besoin pour la métrologie (auto-load on demand).

## Verdict — bascule
- **L0.5 = SMOKE_PASS.** La toolchain QLoRA est **fonctionnelle sur RTX 5090 Blackwell** : 4-bit + LoRA + step + save adapter, bout en bout. Le seul vrai risque du L0 (maturité Blackwell/bnb) est **levé empiriquement**.
- Donc le verdict L0 « GO conditionnel → L0.5 » devient **GO L1 dataset**.

## Réserve honnête (scale)
- Le smoke valide la **compatibilité** de la stack (le point dur), pas la **montée en charge** sur 31B. Un QLoRA 31B utilisera ~22-28 Go (estimé) ; 30.5 Go libres > estimation → dans l'enveloppe, mais **non encore prouvé sur ce matériel**. Un test de charge (charger le vrai base 31B en 4-bit) sera la 1ʳᵉ étape de L1.
- **Modèle de base HF du 31B = toujours à résoudre** : `gemma4:31b` (Apache-2.0, confirmé via `ollama show`) est un GGUF Q4_K_M ; il faut localiser/convertir les poids HF entraînables correspondants, OU choisir un base HF officiel proche (Gemma 3 12B/27B) pour L1 — recalibration EMP-19 dédiée si on change de générateur.

## VERDICT
- Statut : **PASS** (env + smoke verts sur Blackwell). Confiance : Haute sur la toolchain ; Moyenne sur le scale 31B (non testé).
- Forces : risque Blackwell levé ; stack reproductible (uv, venv isolé, Windows natif sans WSL) ; pipeline QLoRA complet prouvé (load 4-bit + LoRA + step + save).
- Faiblesses : (1) scale 31B non testé (test de charge = 1ʳᵉ tâche L1) ; (2) base HF du 31B non localisée ; (3) thermique 5090 non éprouvé en charge longue (smoke = 0.56 s).
- Action requise : **GO L1** — (a) test de charge base 31B 4-bit (VRAM réelle), (b) localiser/choisir le base HF, (c) constituer le mini-dataset 50 paires (cadrage B : OMEGA faible→corrigé, cf `L0_DATASET_STRATEGY.md`). Décision Architecte pour engager L1.
