# S1E — DESIGN VERROUILLÉ v2 (tribunal intégré + jury multi-LLM)

**Date** : 2026-06-02 · **Auteur** : Claude Code · **Intègre** : réponses Gemini+ChatGPT aux Q1-Q5 + idée Architecte « jury multi-LLM complémentaire »
**Principe (ChatGPT)** : « Le but de S1E n'est pas de confirmer notre juge. C'est de l'accuser de tricher et voir s'il survit. »

---

## A. RÉPONSES AUX 5 QUESTIONS (consensus tribunal, adopté)
- **Q1 STYLE_TRANSPLANT** : NE PAS faire générer par LLM (caricature → circularité). → **diagnostic adversarial seulement, jamais preuve principale.** Idéal = pastiche humain réel ; sinon **reporté**.
- **Q2 SAME_GENRE/SAME_ERA (n<10)** : lancer en **`EXPLORATORY_ONLY`** (n<10) / `SIGNAL` (≥15) / `SCELLABLE` (≥30 auteurs). C'est le test le plus dur — un échec même à petit n = très mauvais signe ; un succès → élargir.
- **Q3 CANON_RECOGNITION** : pas d'API notoriété par passage → **proxy « INCIPIT vs MILIEU »** (Gemini) : la notoriété d'un classique vit dans ses 1ʳᵉˢ pages ; comparer extraits début-de-livre vs milieu. + demander séparément au juge « peux-tu identifier l'auteur/l'époque ? » (si oui → jugement contaminé).
- **Q4 gemma 0.75 mais embeddings 0.5** : pas de pivot géométrique ; gemma = juge advisory **sous scope**. Ne PAS conclure « la qualité n'est pas géométrique » mais « **nomic** ne la capture pas » → tester challenger (bge-m3/e5).
- **Q5 bge-m3/e5** : garder **nomic** pour le crash-test initial (enjeu conceptuel : survit-il à l'aveuglement ?) ; challenger en **S1E-B**, ne bloque pas S1E-A.

## B. EXÉCUTION PHASÉE (ChatGPT)
- **S1E-A — minimum vital** : MODERN_vs_MODERN + **SOURCE_BLIND (pré-requis)** + NEGATIVE_CONTROLS + CONFOUND_MATRIX. Instruments : **gemma4 + nomic**. Si effondrement → stop (détecteur d'époque/source).
- **S1E-B — robustesse** : SAME_ERA/SAME_GENRE (exploratory) + OLD_vs_OLD (sinon `EVIDENCE_GAP_OLD_LOW_CORPUS`) + CANON_RECOGNITION (incipit/milieu) + challenger **bge-m3/e5**.
- **S1E-C — adversarial** : STYLE_TRANSPLANT (diagnostic uniquement).

## C. TROIS VERDICTS SÉPARÉS (ChatGPT) — pas un seul score
1. **DISCRIMINATION** : choisit-il le bon texte ? (win_rate/AUC)
2. **CALIBRATION** : sait-il dire « je ne suis pas sûr » ? (tie_rate, confidence sur negative controls)
3. **ROBUSTESSE** : résiste-t-il aux confonds/pièges ? (source-blind, confound-regression, canon, transplant)

## D. RÉGRESSION DE CONFOND (le test décisif, ChatGPT)
`choix_correct ~ quality_label + era_distance + genre_distance + source_distance + canon_fame_distance` (corrélations + régression logistique). **Question clé : le label qualité explique-t-il encore le choix quand les confonds sont contrôlés ?** Si non → détecteur de confond. Si oui → candidat juge.

## E. BANDES DE VERDICT (pas de seuil magique)
FAIL ≈0.50-0.60 · WEAK 0.60-0.70 (IC large) · **ADVISORY 0.70-0.80** (bias<0.10, source-blind stable, erreurs explicables) · STRONG 0.80-0.90 · **SUSPECT >0.95** (sauf corpus parfaitement contrôlé). Le score seul ne tranche jamais — IC + bias + source-blind + negative controls + confound-regression.

## F. JURY MULTI-LLM (idée Architecte) — analyse précise
**Promesse** : un ensemble de juges aux erreurs **complémentaires et INDÉPENDANTES** bat un juge seul (théorie de l'ensemble). Pertinent pour la justesse.
**Conditions strictes** (sinon l'ensemble n'apporte rien) :
1. **Indépendance des erreurs OBLIGATOIRE** : si gemma et qwen gagnent par le MÊME confond (époque), les moyenner ne corrige PAS le confond — ça lisse juste du bruit. → **mesurer d'abord la corrélation d'erreurs inter-juges** (la matrice de désaccord de S1E-A le fait). Ensemble utile SEULEMENT si erreurs décorrélées.
2. **qwen3 disqualifié tel quel** (biais position 0.71) → n'entre dans un jury QUE bias-corrigé (double-ordre forcé + symétrisation), et reste un membre faible.
3. **Diversité réelle = besoin d'un 3ᵉ modèle** : local actuel = qwen3 + gemma4 + nomic seulement. Un vrai jury nécessite de **puller un modèle distinct** (ex. mistral-small, llama3.x, command-r) — à faire en **S1E-B** si l'indépendance d'erreurs est confirmée.
4. **L'ensemble doit AUSSI passer l'anti-confound** : un jury d'époque-détecteurs reste un détecteur d'époque. Le jury ne dispense pas de S1E-A.
**Verdict ensemble** : track légitime, **gaté** sur (a) S1E-A passé par ≥1 juge, (b) erreurs inter-juges décorrélées, (c) ajout d'un 3ᵉ modèle. Sinon prématuré.

## G. SOURCE-BLINDING (spec, pré-requis absolu)
Retirer du texte envoyé : titre, auteur, dates, n° chapitre, front-matter, notes, en-tête/pied Gutenberg. Normaliser guillemets/espaces/paragraphes. Idéalement masquer noms de personnages très célèbres. But : le juge lit le TEXTE, pas l'emballage ni la réputation Wikipédia.

## H. CRITÈRE DE VALIDATION gemma (advisory qualité)
modern-vs-modern ≥~0.75 ∧ same-genre ≥0.70 (si n suffisant) ∧ position_bias<0.10 ∧ pas d'effondrement source-blind ∧ negative controls sains ∧ **confound-regression : quality_label significatif à confonds contrôlés** ∧ cohérence avec ≥1 instrument non-circulaire. Sinon → détecteur d'époque/canon, scope restreint ou rejet.

## INTERDITS
Aucun pivot/gate/SEAL/conclusion-qualité avant S1E ; jamais fusionner prestige/commercial ; avis publics ≠ vérité ; aucun scoring sans source-blind ; pas d'extension n/full-corpus avant anti-confound ; qwen non bias-corrigé hors jury.

## ACTION
GO **S1E-A** (modern-vs-modern + source-blind + negative-controls + confound-matrix, gemma+nomic). Jury multi-LLM = track S1E-B gaté sur indépendance d'erreurs (mesurée en S1E-A) + pull 3ᵉ modèle.
