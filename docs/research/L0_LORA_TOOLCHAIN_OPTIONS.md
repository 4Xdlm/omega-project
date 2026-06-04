# L0 — Options de toolchain LoRA (doc-only)

**Date** : 2026-06-04 · **Parent** : [L0 Hardware Probe](L0_HARDWARE_PROBE_REPORT.md). Contexte : GPU RTX 5090 32 Go (Blackwell sm_120), mais torch CPU-only + Python 3.14 + zéro lib training. Il faut un environnement dédié.

## Contrainte transverse
- **Python 3.14 = trop récent** → créer un env séparé **Python 3.11 ou 3.12** (conda/mamba ou venv) pour la stack training. Ne PAS toucher le Python 3.14 système (utilisé par les scripts métrologie).
- **Blackwell sm_120** → torch **cu128** (≥ build supportant Blackwell) + bitsandbytes récent (≥ 0.45 avec support Blackwell). CUDA toolkit/driver 12.8+.
- Ollama doit **libérer la VRAM** pendant l'entraînement (stop service ou `keep_alive 0`).

## Options

### Option 1 — HF stack classique (transformers + peft + trl + bitsandbytes)
- `torch (cu128)` + `transformers` + `peft` + `trl` (SFTTrainer) + `bitsandbytes` (4-bit) + `accelerate` + `datasets`.
- **Avantages** : standard, le mieux documenté, contrôle fin (QLoRA NF4, paged optimizer, gradient checkpointing).
- **Inconvénients** : bitsandbytes sur Blackshell+Windows = point de friction (parfois nécessite WSL2 Linux). Plus de VRAM/temps qu'Unsloth.
- **Reco** : option de référence ; si bnb pose problème sous Windows natif → passer en **WSL2 Ubuntu** (souvent plus simple pour la stack CUDA).

### Option 2 — Unsloth (QLoRA optimisé)
- `unsloth` (kernels Triton optimisés) + peft + trl.
- **Avantages** : ~2× plus rapide, VRAM réduite (~30-50 %), idéal pour itérer sur petit dataset ; supporte Llama/Gemma/Mistral.
- **Inconvénients** : compat Python/CUDA/Blackwell à vérifier (wheels) ; support officiel surtout Linux/WSL2.
- **Reco** : excellent pour L1/L2 (micro-tests rapides) **si** compat Blackwell confirmée.

### Option 3 — LLaMA-Factory / Axolotl (wrappers config-driven)
- Frameworks haut-niveau (YAML config) au-dessus de HF/peft.
- **Avantages** : moins de code, recettes QLoRA prêtes, multi-modèles.
- **Inconvénients** : couche d'abstraction de plus ; mêmes dépendances bnb/torch sous-jacentes.
- **Reco** : pratique si on veut éviter d'écrire la boucle ; même risque Blackwell.

## Recommandation d'environnement (à valider en L0.5)
1. **WSL2 Ubuntu** (recommandé pour la stack CUDA/bnb — évite les galères Windows natif) **ou** venv Windows si on confirme bnb Blackwell-Windows.
2. Python 3.12, torch cu128, transformers + peft + trl + bitsandbytes + accelerate + datasets.
3. **Smoke test L0.5** (AVANT tout dataset) : charger le modèle de base en 4-bit + faire **1 step** sur 2-3 paires factices → confirme que GPU+quant+LoRA fonctionnent sur ce matériel. C'est le vrai gate de faisabilité.

## Modèle cible — item ouvert
`gemma4:31b` (tag Ollama, GGUF) ≠ poids HF entraînables. À identifier : le **vrai modèle de base** (Gemma 3 27B ? variante custom ?), sa **licence de fine-tuning**, et sa dispo HF. Option de repli pour itérer vite : un modèle 9-12B (Gemma 3 12B / Mistral) — recalibration EMP-19 dédiée si on change de générateur.

## VERDICT
- Statut : PASS (options cartographiées). Confiance : Moyenne (compat Blackwell/Windows non testée).
- Forces : 3 voies réalistes ; reco WSL2 + smoke L0.5 ; modèle de repli identifié.
- Faiblesses : (1) bnb Blackwell+Windows incertain → WSL2 probable ; (2) Unsloth compat à vérifier ; (3) modèle base HF + licence non confirmés.
- Action requise : décision Architecte d'engager L0.5 (build env + smoke 1-step). Aucun entraînement réel sans ce smoke vert.
