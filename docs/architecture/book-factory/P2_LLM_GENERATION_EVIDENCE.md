# Book-Factory — P2 : Génération LLM réelle (Ollama) — EVIDENCE & VERDICT

**Date** : 2026-06-05 · **Statut** : PASS (génération LLM bout-en-bout prouvée) · **Standard** : NASA-Grade L4 · **Régime** : socle CALC déterministe + génération LLM (gemma4:31b), additif, noyau intouché, commit gaté terminal.
**Mandat** : « GO P2 (brancher ChapterSpec sur la génération), autonomie totale, lance le LLM via Ollama si possible ».

## 1. Ce qui a été construit (additif, `packages/book-factory/src/`)
| Module | Rôle |
|---|---|
| `chapter-spec-to-intent.ts` | **bridge** ChapterSpec → `Intent` (forme genesis-planner) ; tension→émotion ; déterministe |
| `context-manager.ts` | **digest borné ≤600 mots** (état pertinent + graines à instiller/éclater) → le LLM ne voit jamais le livre entier (mur VRAM résolu) |
| `chapter-generator.ts` | interface `ChapterGenerator` + `DeterministicChapterGenerator` (stub testable) + **`OllamaChapterGenerator`** (POST `/api/chat`, gemma4:31b, `think:false`, `stream:false`) |
| `book-orchestrator.ts` | la **boucle livre** : plan → gate continuité → digest → ChapterSpec→Intent → prose → Bible ; callback `onChapter` (persistance incrémentale) |
| `generate-real-demo.ts` | démo de génération réelle, écriture incrémentale du manuscrit |

**Architecture** : la STRUCTURE (événements / Bible) est **pilotée par le plan** (déterministe, fiable) ; la PROSE vient du **générateur** (LLM). L'extraction d'événements *nouveaux* depuis la prose (étape NLP difficile) est **différée P3**, sous garde SKEPTIC + calibration EMP-19.

## 2. Preuves — boucle (hors-LLM, déterministe)
- **book-factory : 46/46 tests** (épistémique 13 + Bible 8 + planner 8 + oracle 8 + dry-run 5 + **orchestrator 4**), `tsc --noEmit` = **0**.
- Boucle complète 30 chapitres avec générateur déterministe : tous gate PASS, payoff bloomé, **déterministe** (state_hash stable).

## 3. Preuves — GÉNÉRATION LLM RÉELLE (Ollama, gemma4:31b)
- Ollama confirmé UP (gemma4:31b présent) ; warmup 11.7 s, réponse FR avec `think:false`.
- **3 chapitres réels générés** de « Le Silence du Phare » via la chaîne complète :
  - ch1 : 571 mots, gemma4:31b, 14.8 s, **gate=PASS**
  - ch2 : 536 mots, 14.8 s, **gate=PASS**
  - ch3 : 547 mots, 14.8 s, **gate=PASS**
  - tous gate PASS, manuscrit → `SAMPLE_GENERATED_CHAPTERS.md`.
- **Le plan guide réellement la prose** : la graine « lettre cachée dans le phare » (planifiée plantée au ch.2) **émerge dans la prose** — Léna découvre un carnet dissimulé derrière une plaque de maintenance du phare (ch.2-3). La **continuité locale** fonctionne (ch.2 reprend le cliffhanger du ch.1 ; ch.3 enchaîne sur le carnet).
- **Livre complet (30 chapitres)** : lancé en **tâche de fond détachée** (écriture incrémentale → `SAMPLE_GENERATED_CHAPTERS_FULL.md`), ~15 s/chapitre.

## 4. Limites honnêtes (→ P3)
1. **Fidélité d'intention** : le LLM prend des libertés (ex. rôle de Léna dérivé « secrétaire municipale » vs « enquêtrice ») — l'objectif de chapitre n'est pas durci. → renforcer le prompt + un **gate de fidélité** (P3).
2. **Extracteur prose→événement** non implémenté : la Bible est pilotée par le plan, pas relue depuis la prose. C'est le **vrai maillon faible** (un fait que le LLM invente n'est pas capté). → P3 avec SKEPTIC + EMP-19.
3. **Qualité non scorée** : pas encore branché sur la **S-Oracle** (scoring 5 axes) ni K2/DUEL/MicroSurgery. La prose est « bon genre », pas mesurée/optimisée. → P3.
4. **Génération directe Ollama** (1 passe) au lieu du pipeline K2 chunké + DUEL + Best-of-N. Choix assumé pour prouver le leg LLM ; l'intégration `creation-pipeline`/`sovereign-engine` complète = P3.
5. Gate épistémique mono-transaction (chaîne hash non exercée) — inchangé depuis P0.6.

## 5. Roadmap P3 (à cadrer avec l'Architecte)
- **P3.A** Scoring qualité : brancher chaque chapitre généré sur la **S-Oracle** (ECC/AAI/RCI/SII/IFI) + seuils.
- **P3.B** Génération qualité : remplacer la passe directe par **K2 chunké + DUEL + Best-of-N + MicroSurgery** (sovereign-engine) via `ChapterSpec→Intent→GenesisPlan`.
- **P3.C** Extracteur prose→événement (CALC-first + LLM calibré EMP-19) + **SKEPTIC** en filet → la Bible se met à jour depuis la prose réelle, pas seulement le plan.
- **P3.D** Gate de fidélité d'intention (le chapitre respecte objectif/rôles/POV).
- **P3.E** Run complet 60k + assemblage manuscrit + evidence pack par chapitre (réutilise F5-F8 creation-pipeline / ProofPack).

## VERDICT
- **Statut : PASS — GÉNÉRATION LLM BOUT-EN-BOUT PROUVÉE.** Confiance : Haute (3 chapitres réels gate PASS + 46 tests boucle + tsc 0 + seed/continuité observés dans la prose).
- **Forces** : (1) le socle CALC déterministe pilote une vraie génération LLM (gemma4:31b) ; (2) le digest borné résout le mur VRAM (le LLM ne voit jamais 60k) ; (3) la graine planifiée **émerge réellement** dans la prose — la cohérence longue-distance n'est pas qu'une promesse ; (4) générateur pluggable (stub testable / LLM) ; (5) additif, zéro mutation, 46 tests + non-régression.
- **Faiblesses** : (1) fidélité d'intention non durcie (dérive de rôle observée) ; (2) extracteur prose→événement absent (Bible plan-driven) ; (3) qualité non scorée (pas de S-Oracle/K2/DUEL) ; (4) génération directe 1-passe (pas le pipeline qualité complet).
- **Action** : **commit du socle + P2** (terminal). Le livre complet se génère en tâche de fond. **P3** (qualité + extracteur + pipeline complet) = à cadrer/valider avec l'Architecte. ZÉRO modif moteur.
