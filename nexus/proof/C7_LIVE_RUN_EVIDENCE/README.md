# C7 — RUNS RÉELS : BENCH 3 CHAPITRES + CALIBRATION JUGE CANDIDAT + LIVRE COMPLET (BF-08)

**Date** : 2026-06-06 · **GO** : Architecte (« C7. Enchaîne tout en autonomie ») · **Générateur** : `qwen3.5:35b-a3b` (Ollama local) · **Runner** : `packages/book-factory/src/c7/` (tsc 0 ; suite 118/118 intacte après ajout additif `runCoreChapterFull`).

## VERDICT : **PASS (bench mécanique + calibration) · LIVRE EN COURS (détaché, crash-safe)**

## 0. PRÉ-VOL — CONSTAT CRITIQUE (gate anti-fallback)
Daemon Ollama DOWN → relancé détaché (`ollama serve`). Parc réel : `qwen3:32b, mistral:latest, qwen3.5:35b-a3b, mistral-small:24b`. **`gemma4:31b` — le SEUL juge LLM calibré — DÉSINSTALLÉ** → `nexus/proof/NCR_GEMMA4_ABSENT_JUDGE_GAP.md` (OPEN ; profils gemma du registre = EXPIRED de fait ; options : réinstaller / promouvoir candidat / les deux — décision Architecte). Conséquence assumée sans triche : le volet « gagnant ≥ direct via juge calibré » du bench = **BLOQUÉ**, remplacé par comparaison **MÉCANIQUE** (100 % CALC, valide) + archivage des textes pour revue humaine (partie intégrante du critère ADR de toute façon). La génération, elle, ne requiert AUCUNE calibration (admission = gates CALC, modèle-agnostique ; zéro couplage Rosetta utilisé).

## 1. BENCH RÉEL — 3 chapitres « Le Silence du Phare » (90 secondes, 12 générations)
| Chap | Direct (mots) | R6-Lite N=3 | Gagnant | Gagnant (mots) | Violations |
|---|---|---|---|---|---|
| 1 | 572 | 3/3 éligibles | sensoriel | 603 | 0 |
| 2 | 554 | 3/3 éligibles | sensoriel | 551 | 0 |
| 3 | 566 | 3/3 éligibles | sensoriel | 573 | 0 |
**Lecture mécanique** : la boucle R6 réelle fonctionne de bout en bout sur LLM vivant (packs C2 construits, INV-RECALL appliqué, G1/G2 durs, G5 observé, sélection, persistance FORBID-007 : `runs/c7_bench/lite/` + `chap_N_direct.txt`). Gagnant ≥ direct en matière utile sur 2/3 ; **le verdict LITTÉRAIRE appartient au juge calibré (bloqué, NCR) + à ta revue** — textes archivés côte à côte.
**Constat BB-02 confirmé sur qwen3.5** : ~550-600 mots/chapitre malgré cible 900 — le plancher/plafond de sous-production est TRANS-MODÈLE (cohérent avec P2 gemma ≈551 et la loi BB-02 Sonnet) ; le plan absorbe (volume pilote 18k).

## 2. CALIBRATION DU COUPLE JUGE CANDIDAT (EMP-19 — mini-protocole)
**Couple** : `{qwen3.5:35b-a3b + persona-lecteur-éditeur (prompt figé, sha256 au profil) + temp 0 + sortie A|B}`. **Protocole** : 6 paires maître (Balzac/Maupassant) vs populaire (N. Roberts), fenêtres 400 mots, source-blind, **chaque paire dans LES DEUX ORDRES** (12 appels).
| Mesure | Valeur | Seuil disqualification (EXPERIMENTAL, hérité S1D) |
|---|---|---|
| accuracy vs vérité-terrain | **0.833** (10/12) | — |
| **position_bias** | **0.000** | >0.15 ⇒ DISQUALIFIED |
| invalid_rate | **0.000** | >0.15 ⇒ DISQUALIFIED |
**Verdict : `CANDIDATE_OK_PENDING_FULL_PROTOCOL`** — profil **PROPOSED** : `packages/book-factory/runs/c7_calibration_profile_PROPOSED.json` (+ log appel-par-appel `c7_calibration_log.jsonl`). Zéro biais de position — le défaut qui avait disqualifié qwen3/mistral en S1D. P06 échouée dans LES DEUX ordres (préférence cohérente, pas du bruit — archivée). **Approbation = Architecte/Tribunal après protocole COMPLET (Gold-Set)** ; ce script ne peut PAS approuver (statut forcé PROPOSED).

## 3. LIVRE COMPLET — 30 chapitres × N=7 (R6-Core, BOOST) — **EN COURS (détaché)**
Lancé 11:56 ; rythme observé ≈ 1,3 min/chapitre (qwen3.5-a3b MoE rapide) ; état au moment du scellement de ce pack : ch.1 (tension-interne 7/7), ch.2 (voix-sèche 7/7), ch.3 (voix-sèche 7/7) — **21/21 candidats éligibles**, manuscrit incrémental 1 796 mots.
**Sorties** (FORBID-007 + INV-REPLAY) : `runs/c7_book/MANUSCRIT.md` (incrémental) · `chap_NNN/admission.json` (record rejouable, hashé) · `chap_NNN/candidate_<profil>.txt` (×7, y compris rejetés) · `progress.log`.
**Suivi** : `Get-Content packages/book-factory/runs/c7_book/progress.log -Tail 10` · **Crash-safe** : Bible plan-driven rejouable + sorties par chapitre (relance = C7_MAX_CH ajusté).

## LIMITES DÉCLARÉES
1. Critère littéraire du bench incomplet (juge calibré absent — NCR) : comparaison mécanique + revue humaine. 2. Mini-protocole calibration N=6 paires (le COMPLET Gold-Set reste requis avant APPROVED). 3. Sous-production ≈600 w/chap (BB-02 trans-modèle) : 30 chap ≈ 17-18k mots — volume PILOTE ; le 60k = multiplier les chapitres (plan le permet), décision V2. 4. Extracteur G3/G6 = passes CALC (rappel partiel assumé). 5. qwen3.5:35b-a3b = générateur DÉCLARÉ non calibré-métrologie (sans impact sur l'admission CALC).
