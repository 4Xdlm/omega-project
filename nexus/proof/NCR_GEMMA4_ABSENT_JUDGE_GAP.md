# NCR-GEMMA4-ABSENT : le seul juge LLM calibré a été désinstallé
**Statut** : OPEN · **Sévérité** : HIGH (métrologie) / LOW (génération) · **Date** : 2026-06-06 · **Détection** : pré-vol C7 (gate anti-fallback).

## Constat (preuve)
`GET /api/tags` (après réveil du daemon — il était DOWN, relancé via `ollama serve` détaché) : parc = `qwen3:32b, mistral:latest, qwen3.5:35b-a3b, mistral-small:24b`. **`gemma4:31b` ABSENT** (ainsi que bge-m3, nomic, phi4, command-r7b, llama3.1). Nouveau venu : `qwen3.5:35b-a3b`.

## Impact
1. **Jugement LLM** : gemma4:31b était le SEUL couple juge calibré (S1D/N1-N6, EMP-19). Son absence ⇒ **aucun jugement LLM calibré possible** sur cette machine. Le volet « gagnant ≥ direct via juge calibré » du bench C7 = BLOQUÉ ; remplacé par comparaison MÉCANIQUE (gates/violations/repeat, 100% CALC valide) + textes archivés pour revue Architecte.
2. **Génération** : impact FAIBLE — l'admission R6 est 100% CALC (modèle-agnostique) ; C7 a généré avec qwen3.5:35b-a3b (déclaré, aucun couplage Rosetta utilisé).
3. **Profils métrologie** : tout profil CALIBRATION_REGISTRY pointant gemma4 = **EXPIRED de fait** (Power-On Self-Test échouerait).

## Options (décision Architecte)
A. Réinstaller gemma4:31b (si le tag était un import custom `gemma-4-31b-it`, restaurer l'import) → les profils S1D redeviennent valides. B. Promouvoir un nouveau couple : le mini-protocole C7 a calibré **{qwen3.5:35b-a3b + persona-lecteur-éditeur + temp 0}** : accuracy 0.833 (10/12), **position_bias 0.000**, invalid 0 → `CANDIDATE_OK_PENDING_FULL_PROTOCOL` (profil PROPOSED : `packages/book-factory/runs/c7_calibration_profile_PROPOSED.json`) ; protocole COMPLET (Gold-Set) requis avant APPROVED. C. Les deux.

## Décision
**Architecte 2026-06-06 : OPTION C — LES DEUX.** ① Réinstaller `gemma4:31b` (tentative `ollama pull` lancée ; si tag custom introuvable au registre → restauration de l'import d'origine requise côté Architecte). ② Promouvoir le couple candidat `{qwen3.5:35b-a3b + persona-lecteur}` via PROTOCOLE COMPLET (campagne élargie lancée 2026-06-06 ; profil reste PROPOSED jusqu'à validation Architecte/Tribunal des mesures complètes). **On garde les deux juges.** Statut NCR : OPEN→IN_PROGRESS.
