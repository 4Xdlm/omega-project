# L1-A — Validation du modèle de base HF (rapport)

**Date** : 2026-06-04 · **Parent** : [L0.5 Smoke](L0_5_SMOKE_REPORT.md) · GO Architecte « pousse au maximum ». **Aucun entraînement long, aucun dataset, aucun moteur.**

## Identification du modèle de base — RÉSOLU
Le générateur de prod `gemma4:31b` (Ollama, GGUF Q4_K_M) correspond au modèle HF officiel **`google/gemma-4-31b-it`** :
- **Gemma 4 31B existe bien** (sorti après le cutoff de connaissance) et est **NON gaté** sur HF (téléchargeable sans acceptation de licence). Variante base `google/gemma-4-31b` également dispo, non gatée.
- Architecture : **`Gemma4ForConditionalGeneration`**, `model_type: gemma4`, dtype bfloat16. **Multimodal** (tokens image + audio en plus du texte).
- Licence : **Apache-2.0** → fine-tuning autorisé.
- Taille : **62.6 Go** (2 shards safetensors, fp16/bf16). **Aucun mirror pré-quantifié 4-bit n'existe** (unsloth/gemma-4-31b[-it] = aussi 62.6 Go fp16).
- Support transformers 5.10.1 : OUI (config.json résolu, classe connue).

## Toolchain (rappel L0.5) — PASS
GPU RTX 5090 32 Go Blackwell ; torch cu128 + bnb 0.49.2 4-bit + peft : QLoRA 1-step prouvé sur petit modèle. Connectivité HF OK (config.json téléchargé instantanément).

## Blocage rencontré — acquisition du modèle
Le téléchargement **anonyme** des 62.6 Go **se bloque après un micro-burst (~0.25 Go) puis gèle à ~0 Mo/s**. Cause racine confirmée : **aucun token HF sur disque** → rate-limit anonyme (avertissement HF explicite : « set a HF_TOKEN to enable higher rate limits and faster downloads »). Ce n'est PAS un échec matériel/toolchain (ceux-ci passent), ni un blocage réseau total (les petits fichiers passent) — c'est un throttle anonyme sur gros fichiers.

## Mitigation autonome lancée
- **Resume-loop downloader** (`l1a_resume_dl.ps1`, détaché) : relance `snapshot_download` (qui REPREND) à chaque gel détecté par watchdog (kill si pas de progrès en 100 s, puis resume). Objectif : grignoter les 62 Go par bursts successifs pendant la nuit.
- **Waiter auto-trigger** (`_waiter.ps1`, détaché, max 10 h) : dès que le download atteint la complétion, stoppe Ollama (libère VRAM) et lance automatiquement le **load test v2** (`l1a_loadtest_v2.py`, multimodal-aware : chargement 4-bit + LoRA q/k/v/o + 1 step + save adapter + VRAM peak).
- Résultat écrit dans `_l1a_result.json` → sera reporté au prochain point.

**RÉSULTAT empirique du resume-loop (2026-06-04 20h)** : ÉCHEC. Le total oscille (5.65 → 4.96 → 0.03 Go) sans accumuler — chaque kill du watchdog **jette** le `.incomplete` et le serveur anonyme ne semble PAS honorer la reprise par Range → progrès net ≈ 0, re-téléchargement en boucle des mêmes ~5 Go. Boucles stoppées (gaspillage de bande passante). **Conclusion ferme : sans HF token, l'acquisition est bloquée.**

## Accélérateur propre (action Architecte — la seule chose non-autonome)
Fournir un **token HF** lève le throttle instantanément :
1. Compte huggingface.co → Settings → Access Tokens → créer un token (read).
2. Dans le terminal : `setx HF_TOKEN <token>` (ou `huggingface-cli login`).
3. Relancer le download : il reprend et descend en quelques dizaines de minutes au lieu de grinder par bursts.

## VERDICT
- Statut : **modèle IDENTIFIÉ + toolchain PASS ; acquisition BLOQUÉE par throttle anonyme → mitigation resume-loop en cours.** Load test 31B = **PENDING acquisition**. Confiance : Haute (diagnostic net).
- Forces : vrai base HF résolu (`google/gemma-4-31b-it`, Apache-2.0, non gaté) ; transformers le supporte ; chaîne autonome download→loadtest armée ; cause du blocage isolée (token).
- Faiblesses : (1) 62.6 Go sans mirror 4-bit → gros download obligatoire ; (2) throttle anonyme → resume-loop incertain (peut ne pas finir sans token) ; (3) **modèle multimodal** → LoRA texte devra cibler le language model (géré par target q/k/v/o, fallback all-linear) ; (4) load test VRAM 31B non encore mesuré.
- Action requise : **Architecte fournit un HF token** (lève le throttle) — sinon laisser le resume-loop tenter overnight. Load test s'exécutera automatiquement à l'acquisition ; verdict PASS_31B / FAIL au prochain point.
