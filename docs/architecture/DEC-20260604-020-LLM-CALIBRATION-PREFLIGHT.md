# DEC-20260604-020 — LLM Calibration Preflight (étalonneur par-LLM)

**Statut** : ACCEPTÉ (infra) + **EMP-19 PROPOSÉ** (ratification Architecte) · 2026-06-04 · Tribunal 2/2 (Gemini + ChatGPT) FAVORABLE
**Origine** : observation Architecte — *« si on change de LLM/version/API, il faut un étalonneur AVANT pour avoir des mesures justes ; vérifier à chaque début si la config de ce LLM existe ou s'il faut recalibrer. »*
**Précédent crédité** : **Rosetta** (calibration par-LLM côté génération, 2026-03-20) — ce DEC en est le bras côté MESURE.

---

## Principe (à sceller, EMP-19)
> **Un LLM juge / embedder / générateur n'est pas portable sans étalonnage. La calibration porte sur le COUPLE {modèle + provider + prompt + température + corpus}, pas sur le modèle seul. Tout changement de l'un de ces éléments = profil EXPIRÉ = recalibration obligatoire AVANT toute mesure. Au démarrage de toute tâche métrologie/génération, un Power-On Self-Test (`calibration_check.py`) vérifie le registre ; si un rôle requis n'est pas approuvé → `RECALIBRATION_REQUIRED` = STOP.**

Mécanisme causal : un juge LLM est un **instrument**. Le biais de position, le tie_rate, le suivi de format, la géométrie d'embedding sont **propres au couple modèle+prompt**. Une mise à jour de poids (même nom de modèle) peut déplacer ces propriétés → les mesures deviennent incomparables **silencieusement**. La faille ρ SHA-drift (N4) en est la preuve : un coefficient a dérivé sans alerte. EMP-19 transforme cette dérive silencieuse en STOP explicite.

## Architecture livrée
1. **Registre** : `docs/metrology/CALIBRATION_REGISTRY.json` (schema v2). Rôles : `judge_pairwise` (gemma4), `embedding_radar` (bge-m3), `embedding_legacy` (nomic), `generation_roles` (→ Rosetta), `disqualified_judges` (5 modèles), `scorer_models` (M0b). Chaque entrée : modèle + provider + ollama_id (digest) + prompt_sha256 + température + artefacts+SHA + calibration + **status** + **validity_scope** + **forbidden_uses** + recalibrate_if.
2. **Power-On Self-Test** : `scripts/metrology/calibration_check.py` — lit `ollama list` (digests réels) + vérifie SHA artefacts → verdict `GO_MEASURE` / `RECALIBRATION_REQUIRED` (exit 1). Testé : GO_MEASURE actuel (gemma+bge-m3 ADVISORY_APPROVED), signale `generation:prose=GAP` + `M0b=DRIFT_DIAGNOSED`.
3. **Protocole mini-calibration** (modèle inconnu) : `scripts/metrology/n2_judge_hunt.py` = la routine canonique. Sur un nouveau juge : negative-controls (master-master + pulp-pulp, double ordre A/B) + cross master-vs-pulp → `position_bias` (cible 0.50), `tie_rate` (non nul sur cas proches), `master_win_rate`, format compliance. Verdict ADMIS si max|bias−0.5|≤0.15, sinon DISQUALIFIED.

## Modes de statut
`CALIBRATED` · `ADVISORY_APPROVED` · `PAIRWISE_APPROVED` · `CALIBRATION_REQUIRED` · `EXPIRED_PROFILE` · `DISQUALIFIED` · `DRIFT_DIAGNOSED`.

## Déclencheurs d'expiration
model_name · digest/ollama_id · provider (ollama↔api) · prompt_sha256 · température · goldset_sha · output_format. **Règle : `gemma4 + prompt A` ≠ `gemma4 + prompt B`** — on calibre le couple modèle+prompt.

## État courant (vérité-terrain)
| Rôle | Modèle | Digest | Statut |
|---|---|---|---|
| judge_pairwise | gemma4:31b | 6316f0629137 | ADVISORY_APPROVED (bias 0.50) |
| embedding_radar | bge-m3 | 790764642607 | ADVISORY_APPROVED (AUC 0.94) |
| embedding_legacy | nomic | 0a109f422b47 | CALIBRATED (comparateur) |
| generation/prose | gemma4:31b (prod) | — | **GENERATION_CALIBRATION_GAP** (Rosetta calibré claude-sonnet, pas gemma4) |
| scorer M0b V3.4 | — | — | **DRIFT_DIAGNOSED** (ρ SHA-drift, N4) |
| qwen3 / mistral / phi4 / command-r7b / llama3.1 | — | — | DISQUALIFIED (biais/abstention) |

## Décision de stockage (Gemini Q : JSON vs SQLite)
**JSON versionné avec le code** (SSOT doctrine : auditable, git-tracké, diffable, scellable par SHA). SQLite = **différé** (couche future d'historique de dérive si besoin de séries temporelles). Décision finale = Architecte.

## Deux gaps réels révélés (action Architecte)
1. **GENERATION_CALIBRATION_GAP** : le générateur de prod (gemma4:31b) n'a PAS de profil Rosetta (seul claude-sonnet-4 en a un). Les directives bridge sont calibrées sur claude-sonnet → potentiellement stale pour gemma4. → lancer `rosetta-s0-calibration.ts` pour le générateur réel.
2. **M0b DRIFT_DIAGNOSED** : déjà ouvert (N4).

## VERDICT
- Statut : PASS (infra) · EMP-19 PROPOSÉ (attente ratification, comme EMP-18 l'a été).
- Forces : Power-On Self-Test fonctionnel ; couple modèle+prompt+provider+temp ; crédite/intègre Rosetta ; révèle 2 gaps réels ; généralise la leçon ρ SHA-drift.
- Faiblesses : (1) mini-calibration auto-déclenchée non encore câblée dans un runtime (script manuel) ; (2) prompt_sha256 du juge runtime à synchroniser avec le prompt réel du module IntrinsicQuality (actuellement = prompt S1E-B) ; (3) pas de couche historique de dérive (SQLite différé).
- Action requise : (a) ratifier EMP-19 ; (b) décider stockage JSON/SQLite ; (c) calibrer Rosetta S0 pour le générateur de prod ; (d) trancher M0b (re-sceller/re-générer).
- Interdits maintenus : aucun gate prod, aucun SEAL, aucun juge non calibré, aucun jury multi-LLM sans indépendance d'erreurs prouvée.

**Artefacts** : `CALIBRATION_REGISTRY.json`, `calibration_check.py`, `n2_judge_hunt.py` (mini-cal), `rosetta-*` (génération).
