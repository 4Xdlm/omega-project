# L0 — GO / NO-GO LoRA (verdict de faisabilité)

**Date** : 2026-06-04 · **Sources** : [Hardware Probe](L0_HARDWARE_PROBE_REPORT.md), [Toolchain Options](L0_LORA_TOOLCHAIN_OPTIONS.md), [Dataset Strategy](L0_DATASET_STRATEGY.md), [Eval Protocol](L0_EVALUATION_PROTOCOL.md). · **Décision finale d'entraîner = Architecte.**

## Synthèse en une ligne
**Matériel = GO décisif. Toolchain = NON PRÊTE (chantier d'installation requis).** Donc : **pas de saut direct vers L1 dataset** ; insérer un gate **L0.5 (build env + smoke 1-step)** d'abord.

## Tableau de décision
| Dimension | État | Verdict |
|---|---|---|
| GPU | RTX 5090, 32 Go VRAM, Blackwell | **GO** — entraîne QLoRA 31B 4-bit sans peine |
| Driver / CUDA | 596.36 / CUDA 13.2 | **GO** — Blackwell supporté côté driver |
| RAM / Disque | 64 Go / 1.2 To libre | **GO** |
| torch | 2.11.0 **+cpu** | **BLOQUANT** — ne voit pas le GPU, build CUDA cu128 requis |
| Python | 3.14.0 | **BLOQUANT** — trop récent pour bnb/unsloth ; env py3.11/3.12 séparé requis |
| transformers/peft/bnb/trl | tous ABSENTS | **À INSTALLER** |
| WSL2 | absent | à installer si on choisit la voie Linux (recommandée pour bnb) |
| Modèle base HF + licence | non identifié (`gemma4:31b` = tag Ollama GGUF) | **ITEM OUVERT** — à résoudre avant L1 |

## Verdict
- **HARDWARE : PASS** (sans réserve).
- **TOOLCHAIN : GATE** — un chantier d'install est nécessaire ; il porte un **risque Blackwell/Windows** réel (bitsandbytes natif Windows incertain → WSL2 probable). Ce risque doit être levé par un **smoke test** avant d'investir dans le dataset.
- **Donc : NI PASS-direct-L1, NI FAIL-commercial.** → **GO conditionnel vers L0.5**, pas vers L1.

## Recommandation : insérer L0.5 avant L1
**L0.5 — Build env + smoke (aucun dataset, aucun train réel)** :
1. Installer WSL2 Ubuntu (ou venv Windows py3.12 si on tente le natif).
2. Env Python 3.12 : torch cu128 + transformers + peft + trl + bitsandbytes + accelerate.
3. Identifier + télécharger le **vrai modèle de base HF** (licence fine-tuning OK) — ou un 9-12B de repli pour le smoke.
4. **Smoke** : charger le modèle en 4-bit (NF4) + appliquer un adapter LoRA + faire **1 step** sur 2-3 paires factices + sauver l'adapter. Stopper Ollama avant (libérer la VRAM).
5. **Critère L0.5** : si le smoke passe (modèle chargé 4-bit, 1 step OK, adapter sauvé, VRAM < 32 Go) → **GO L1 dataset**. Si le smoke échoue (incompat Blackwell irréductible après effort raisonnable) → **FAIL → bascule axe commercial book-pipeline V1**.

## Pourquoi ne pas trancher PASS/FAIL maintenant
Le seul inconnu réel est la **maturité de la stack sur Blackwell** (sm_120 + bnb). On ne peut pas l'affirmer sur doc — il faut le smoke. Déclarer PASS serait optimiste (risque install non levé) ; déclarer FAIL serait défaitiste (le GPU est largement capable, l'install est routinière hors Blackwell). Le smoke L0.5 est le juge de paix, peu coûteux (heures, pas de dataset).

## VERDICT
- Statut : **GO conditionnel → L0.5** (matériel PASS, toolchain à construire+smoker). Confiance : Haute sur le matériel ; Moyenne sur la toolchain Blackwell.
- Forces : GPU surdimensionné pour la tâche ; chemin clair et peu risqué (smoke avant dataset) ; fallback commercial explicite si smoke FAIL.
- Faiblesses : (1) bnb Blackwell+Windows incertain (WSL2 probable) ; (2) Python 3.14 → env séparé obligatoire ; (3) modèle base HF + licence non résolus ; (4) thermique 5090 (~575 W) à surveiller en charge.
- Action requise : **décision Architecte** — engager L0.5 (build env + smoke, doc + install, toujours zéro train réel sur dataset) OU surseoir. La bascule PASS-L1 / FAIL-commercial se fait **au résultat du smoke L0.5**, pas avant.
