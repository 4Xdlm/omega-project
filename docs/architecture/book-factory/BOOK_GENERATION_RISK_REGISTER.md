# BOOK-FACTORY — Registre des risques (génération 60k)

**Date** : 2026-06-05 · **Statut** : CONCEPTION (doc-only) · Standard OMEGA : pour chaque risque — mécanisme, condition de défaillance, mitigation. Sévérité S1 (bloquant) → S3 (mineur).

| # | Risque | S | Mécanisme / condition de défaillance | Mitigation (conçue) |
|---|---|---|---|---|
| R1 | **Mur du contexte / VRAM** | **S1** | gemma4:31b ≈ 22.9 Go résident (9 Go marge sur RTX 5090 32 Go). 60k mots ≫ fenêtre de travail. Mettre tout le livre en contexte = OOM ou hallucination. | `context-manager` : le LLM ne voit JAMAIS le livre entier — seulement digest ≤600 mots (rolling_summary + état pertinent + graines à récolter). État externe (`story-state`), pas contexte géant. Budget : 1 chapitre (~2.5k) + digest ≤ ~4k tokens de contexte → tient large. |
| R2 | **Sélecteur aveugle à la répétition** | **S1** | Forensic BESTOFN : l'Oracle couronne un chapitre « la fissure ×615 » (composite max). À l'échelle 60k = bégaiement industriel relié cuir. | **repeat-shadow appliqué (terminal) AVANT toute prod.** Précondition dure. Sinon STOP. |
| R3 | **Dérive de continuité inter-chapitres** | **S1** | Le digest perd un fait ; le chapitre N contredit le ch. 3 (perso mort qui parle, indice oublié). | `continuity-oracle` (gate inter-chapitres) + `payoff_graph` (graines `OVERDUE` → RETRY) + `entering_state_requirements` vérifiés. Extraction de deltas CALC-first, LLM calibré EMP-19 en renfort. |
| R4 | **Plafond qualité V1 (≈0.52)** | S2 | V1 = supra-populaire, sous-maître. Les livres seront du **bon genre**, pas des chefs-d'œuvre. Risque = attente irréaliste. | Honnêteté : cible = **cohérence + lisibilité longue** (polar/thriller/SF commercial), pas Goncourt. Mesuré par échantillons Deux Clés, pas promis « maître ». |
| R5 | **Goodhart du rythme** | S2 | La master-analyse montre rythme = signal de grandeur ; tenter de **cibler `sent_len` dur** → prose sèche/maniérée (re-Goodhart, déjà vu N6/forge). | Rythme **advisory** dans `StyleGenomeInput.target_avg_sentence_length` (registre par genre), **jamais gate dur**. EMP-16. |
| R6 | **Coût / temps** | S2 | 30 chapitres × (K2 + DUEL N=7 + Oracle + retries) = lourd. Ex. mesure : ~1 chapitre BOOK_FULL ≈ minutes ; 30 → heures par livre. | Génération **détachée crash-safe** (snapshot/chapitre, reprise — pattern omega-book-gen) ; DUEL_RUNS paramétrable (N=7 prod / N=4 brouillon) ; lancer la nuit (comme les benchs). |
| R7 | **Crash / interruption mid-livre** | S2 | Process tué au chapitre 18/30 → perte. | `story-state` snapshot après CHAQUE chapitre + prose persistée → reprise au chapitre N+1 (idempotent). |
| R8 | **Asymétrie d'information incohérente** | S2 | Un personnage « sait » une info qu'il n'a pas pu apprendre (le narrateur fuit). | `Character.knows[]` dans story-state + `continuity-oracle` vérifie qu'une révélation par un perso est justifiée par ce qu'il connaît. |
| R9 | **Monotonie de tension** | S3 | Tous les chapitres au même niveau dramatique → ennui. | `pacing_curve` (book-planner) + mesure de tension par chapitre (capteurs existants) en advisory. |
| R10 | **Extracteur d'état LLM non calibré** | S2 | gemma4 rate l'extraction de deltas (EMP-19 : instrument non calibré = mesure fausse). | P1 = `story-state` **CALC-only** (NER léger, règles) ; LLM seulement après profil de calibration EMP-19 (think:false, prompt figé). |
| R11 | **Modif accidentelle d'un module FROZEN** | **S1** | Toucher genome/sentinel = violation V-01. | Architecture **100% additive** : nouveaux packages, zéro modif des existants. Revue avant tout commit (terminal, `commit-with-tests`). |
| R12 | **Déterminisme perdu (non-repro)** | S2 | Seeds non fixés → livres non reproductibles, pas d'evidence. | Seeds figés par chapitre, `plan_hash`/`state_hash`, evidence pack par chapitre (réutilise F5-F8 creation-pipeline). |
| R13 | **Copyright (si entraînement futur)** | **S1** (si train) | Le corpus « livre ajout » = analyse-only ; l'utiliser en raw-train = bombe juridique. | Aucun entraînement (gelé). Book-Factory = génération OMEGA pure, pas d'imitation de texte sous droits. |

## Points de rupture à surveiller (instrumentation)
- VRAM pic par chapitre (doit rester < 30 Go) ; longueur de contexte effective (alerter si digest > budget) ; taux de `OVERDUE` graines ; taux de RETRY continuité ; near-dup density par chapitre (repeat-shadow) ; dérive de profil de style inter-chapitres (≈ test P4).

## VERDICT
- Statut : **REGISTRE DE RISQUES LIVRÉ** (13 risques, mitigations conçues). Confiance : Haute sur l'identification ; les mitigations restent à implémenter+valider.
- Forces : couvre VRAM/continuité/coût/qualité/doctrine ; relie chaque risque à un module de mitigation ; intègre repeat-shadow comme S1 ; honnêteté plafond V1 ; anti-Goodhart rythme.
- Faiblesses : (1) `continuity-oracle` fiable = le risque résiduel majeur (R3) ; (2) coûts réels non chiffrés précisément (R6) ; (3) qualité 60k jamais testée — inconnue empirique.
- Action : valider que **R1, R2, R3, R11 (les S1)** sont couverts avant tout run 60k ; P2 smoke 3 chapitres pour éprouver R3/R6 en réel.
