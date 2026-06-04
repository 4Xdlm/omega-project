# OMEGA — RÉCAP MAÎTRE + PLAN DE BATAILLE (bootstrap nouvelle conversation)

**Date** : 2026-06-05 · **Branche** : `phase-r-dispatcher-v33` · **But** : document unique, exhaustif, pour **redémarrer une conversation neuve sans rien perdre**. Tout ce qui suit est sourcé sur des commits/docs réels. Standard OMEGA : NASA-Grade L4, EMP-16/17/18/19, verdicts, balisage VÉRIFIÉ/HYPOTHÈSE.

---

## A. IDENTITÉ & DOCTRINE (ne pas redécouvrir)
- **Architecte** : Francky. Ton direct, rigueur absolue, zéro flatterie. Décisions = lui (autorité finale).
- **OMEGA** : moteur de génération littéraire FR piloté par contrat émotionnel + scoring multi-axes ; monorepo ~40 packages ; TypeScript strict. Repo `C:\Users\elric\omega-project\`, workspace `C:\Users\elric\Claude-Workspace\OMEGA\`.
- **Lois permanentes clés** :
  - **EMP-16** : aucune modif de code MOTEUR sans **3 preuves indépendantes convergentes** sur corpus distincts (1 diverge → STOP).
  - **EMP-17** : toujours consulter les mesures historiques (preuves, jamais déprécier).
  - **EMP-18** : toute métrique à centroïde évaluée en **LOAO/LOFO** (fuite full-data = score nul).
  - **EMP-19** : tout LLM juge/embedder/générateur calibré sur le **couple {modèle+provider+prompt+température+corpus}** ; changement = EXPIRED = recalibration ; Power-On Self-Test.
- **Règle des Deux Clés** (découverte cette session, doctrine) : une amélioration n'est validée que si **juge gemma calibré ET radar bge-m3 concordent** (juge gagne ∧ radar non dégradé).
- **Garde-fous** : advisory/shadow only ; aucun gate/SEAL/intégration moteur sans décision Architecte ; copyright strict (domaine public = train, modernes achetés = analyse/holdout) ; commits `git ... --no-verify` avec `git fetch` d'abord ; métrologie Ollama-only, Anthropic API = validation finale.
- **Gotcha infra** : Ollama doit être lancé avec `OLLAMA_MODELS=C:\ollama-models` (sinon mauvais registre qwen/mistral, gemma4/bge-m3 absents) ; hf_transfer GÈLE sur cette machine (off) ; HF token requis pour gros download (user `4Xdlm`, persisté).

---

## B. ÉTAT MOTEUR AVANT LA SESSION (acquis, ne pas refaire)
- **V1 SCELLÉ** (2026-04-13, commit `0c3cbc48`) : K2 Chunked + DUEL + R6 Gate + R7 Best-of-N (DUEL_RUNS=2, N=7), S-Oracle V2. Plafonds : SDT=100, auth≈80, rhythm≈82, SII≈86 ; bench avg≈90.
- **M0b_slim V3.4** câblé (ρ_dispatch=0.6138, 1334 œuvres) — métrologie CALC scellée. NCR SHA-drift ρ=0.6138 diagnostiqué (inputs absents).
- **bge-m3 radar shadow** câblé dans IntrinsicQuality (commit `90261736`), centroïdes maître/pulp LOAO, flag OMEGA_BGEM3_RADAR.
- **Gold-Set v4** scellé (maîtres vs pulp, FR+EN, split auteur). **gemma4:31b = seul juge calibré** non biaisé (prompt `ecfb32d6`, biais 0.55) ; qwen3/mistral/phi4/command-r7b/llama3.1 DISQUALIFIÉS (biais position).
- **EMP-19 + étalonneur** : registre calibration `docs/metrology/CALIBRATION_REGISTRY.json`, `calibration_check.py`, DEC-020. **Rosetta S0 gemma4** calibré (370 tests, commit `7f090d5d`) → bridge model-aware `ROSETTA_BRIDGE_MATRIX_GEMMA4.json` (DEC-021, commit `a401e697`), 4 leviers actifs (contraste/compression/rareté/TTR), f17 illusion interdit.

---

## C. CE QUE CETTE SESSION A PROUVÉ (chronologie + commits)

### C.1 La forge par prompt est MORTE (DEC-022)
| Run | Quoi | Verdict | Commit |
|---|---|---|---|
| Forge Chirurgicale | 4 leviers LEXICAUX (TTR/compression/contraste/rareté), 12 cellules, thermostat masse | **FAIL** 0/12 victoire juge, Δradar sous-seuil sign-instable | `996de446` |
| N7 sémantique | 6 leviers de SCÈNE + few-shot mimétique, 18 cellules | PASS conditionnel : 6/18, voice 2/3 ; **dissociation juge⊥radar** ; mimétique déçoit | `bcd86865` |
| N8 confirmation | voice/internal_tension/subtext, 6 chap × 3, Règle des Deux Clés | **FAIL** : aucun levier ≥4/6 + 0 SUSPECT. voice 2/6. Variance = chapitre, pas levier. mixed dégénéré | `77e67cbf` |
| Clôture | DEC-20260604-022-PROMPT-FORGE-EXHAUSTED + V1_RELEASE_CANDIDATE + L0 LoRA preflight (3 docs) | scellé | `2e57cf95` |

**Découverte majeure** : **juge gemma ⊥ radar bge-m3** (engagement narratif vs conformité géométrique = axes orthogonaux). → Règle des Deux Clés.
**Conclusion** : à longueur constante, AUCUNE directive de surface (lexicale/sémantique/mimétique) ne hisse OMEGA au niveau maître de façon stable+convergente. V1 = plafond du paradigme prompt.

### C.2 La voie LoRA V2 est techniquement PROUVÉE
| Phase | Résultat | Commit |
|---|---|---|
| L0 hardware probe | RTX 5090 32 Go Blackwell sm_120, CUDA 13.2, 64 Go RAM, 1.2 To. Toolchain absente au départ | `e346e6b4` |
| L0.5 build env + smoke | env `C:\Users\elric\omega-lora\.venv` (uv, py3.11, torch cu128, bnb 0.49.2, peft 0.19, trl 1.5) ; **smoke QLoRA PASS** (Blackwell+bnb 4-bit OK) | `6949004e` |
| L1-A validation modèle | base = `google/gemma-4-31b-it` (multimodal Gemma4ForConditionalGeneration, Apache-2.0, non gaté, 62.6 Go). Download débloqué par HF token | `27d03777`/`fedbdaa7` |
| **L1-A-bis load test** | **PASS_31B** : 4-bit 64s/17.45 Go, LoRA all-linear 133.6M, 1 step OK loss 11.88, **VRAM pic 22.9/32 Go (9 Go marge)**, adapter sauvé | `3dd7af6a` |

### C.3 Le mur des données
| Quoi | Résultat | Commit |
|---|---|---|
| Mining cadrage B (OMEGA→amélioré, two-key STRONG) | **6.7% rendement** (1 paire/15) → SFT cadrage B NON viable | `4c39ad83` |
| DPO-1 self-preference | dataset 14 paires (chosen=OMEGA haut-radar / rejected bas-radar), 100% OMEGA copyright-clean, prêt | `4c39ad83` |
| Design DPO | `L1_DPO_DESIGN.md` (DPO-1 self-pref reco / DPO-3 hybride / cadrage B rejeté) | `807e1484` |

**Constat stratégique** : approches self-référentielles (forge, cadrage B, DPO-1, self-SFT) **plafonnent au meilleur OMEGA**. Importer la qualité maître = **mur copyright**. Le mur Tier-S est un **mur de données**, pas (plus) technique.

### C.4 Le pivot recherche : physique de l'évolution de la prose
| Doc | Contenu | Commit |
|---|---|---|
| `OMEGA_SITUATION_REFERENCE_2026-06-04.md` | état complet + décisions parkées D1-D5 + listes acquisition + cadre juridique | `2866a5e0` |
| `PROSE_EVOLUTION_PHYSICS_ATTACK_PLAN.md` (OMEGA-CHRONOS) | moteur de mesure décennie×style×réception×influence×événements, vecteurs indépendants, réacteur corrélation, équations gradient/diffusion/Markov, phasage R0-R7 | `2866a5e0` |
| `LEGION_THERMODYNAMIQUE_TEMPORELLE_PROSE.md` | 10 lois empiriques VÉRIFIÉES + modèle thermo + 2 corrections aux IA + sources | `fa5559ef` |
| `ARCHIVE_STYLE_EVOLUTION_THREAD.md` | archive du fil style-évolution | (ce commit) |

---

## D. LE PLAN DE BATAILLE LEGION (conception idéale + protocoles)

### D.0 Principe cardinal — anti-noyade
Tout mesurer (couverture monstrueuse) MAIS sortir **peu d'axes indépendants** (familles orthogonalisées par PCA → réduction inter-familles → ~10-20 axes décorrélés, VIF bas, LOAO). La monstruosité est dans la couverture, pas dans le nombre de colonnes finales.

### D.1 Les 10 lois mondiales (à reproduire en interne avant d'entraîner)
L1 concrétisation (Heuser&Le-Khac), L2 dialogisme↑ (Muzny), L3 phrases↓, **L4 cohort-succession 54.7% / année de naissance (Underwood)**, **L5 style-of-time + décroissance influence (Hughes PNAS)**, L6 prestige stable (Underwood&Sellers), L7 genre flou (Sobchuk&Šeļa), L8 littérarité 76% (VanCranenburgh&Bod), L9 6 arcs (Reagan), L10 bestseller-code contesté (Archer&Jockers). Sources complètes dans `LEGION_THERMODYNAMIQUE_TEMPORELLE_PROSE.md`.

### D.2 Modèle thermodynamique (hypothèses à tester, pas lois)
Vecteur d'état V(œuvre,t) ; entropie/bord-du-chaos (pulp bas H / salade max H / maître bande structurée) ; gradient par **chocs de cohortes** (réindexé année de naissance) ; noyau d'influence à demi-vie décroissante ; invariants conservés vs formes d'époque ; vérification par change-points alignés aux guerres.

### D.3 ORDRE D'EXÉCUTION LEGION (arbitré 3 IA)
1. **LEGION-E0 — Test « bord du chaos »** (PROCHAIN, quasi-gratuit, falsifiable) :
   - Corpus : MASTER / C_FORMULAIC / D_PULP_REAL / OMEGA_BOOK_FULL (+ rewrites N6/N7/N8 option).
   - Features : entropie unigram/bigram/trigram, surprisal proxy, répétition n-gram, variance longueur phrase, variance syntaxique, dispersion lexicale, compression, distance bge-m3 maître/pulp, Gemma advisory.
   - Question : les MAÎTRES occupent-ils une **zone intermédiaire stable** entre prévisibilité pulp et chaos lexical ?
   - PASS : MASTER séparé de PULP ; OMEGA entre les deux ; effet robuste en **bootstrap par auteur (LOAO)** ; PAS expliqué uniquement par longueur/époque/auteur.
   - Livrables : `LEGION_E0_EDGE_OF_CHAOS_REPORT.md`, `LEGION_E0_ENTROPY_RESULTS.csv`.
2. **LEGION-1 — Diachronie domaine public** :
   - Corpus domaine public uniquement (Hugo, Zola, Flaubert, Balzac, Maupassant, Dumas, Proust…).
   - Features par œuvre/auteur/époque : sentence_length, dialogue_density, concreteness/abstractness, lexical_richness (TTR), compression, rhythm_variance, description/action ratio, syntax_complexity.
   - **Indexer DEUX dates** : publication_year ET author_birth_year (L4).
   - Comparer aux lois externes (L1/L2/L3/L4). Re-mesurer chez nous = première preuve interne reproductible.
   - Livrables : `LEGION_1_DIACHRONY_REPORT.md`, `LEGION_1_FEATURE_TIMELINES.csv`, `LEGION_EXTERNAL_LAWS_VERIFICATION.md`.
3. **LEGION-2 — Graphe d'influence / mycélium** : auteur→prédécesseurs (similarité stylistique cross-temps + influences déclarées), distances style/thème/temps, canon.
4. **LEGION-3 — Construction narrative** : character networks, relational arcs, conflict/sentiment curves, focalisation.
5. **LEGION-4 — Réception** : 3 axes orthogonaux (prestige/prix + public/ventes-proxy + institutionnel/canon), part de marché = T3 proxy honnête (jamais inventer).
6. **LEGION-5 — Réacteur corrélation** : matrice Spearman + corrélations partielles (contrôle décennie/genre) + VIF + analyse factorielle/PCA (axes latents) + graphe réseau (FDR) + lead-lag/Granger temporel. Bootstrap clusterisé par auteur (EMP-18).
7. **LEGION-6 — Équations d'évolution** : gradient cohorte / influence-pull / diffusion / Markov. **Validation = prédire décennie holdout > persistance naïve, sur 3 fenêtres (EMP-16).**
8. **LEGION-7 — LoRA/DPO** SEULEMENT APRÈS : DPO-1 OMEGA, DPO-3 domaine public/pastiches, SFT public-domain. Jamais contemporain copyright en raw train.

### D.4 Couches juridiques du corpus (non négociable)
`PUBLIC_DOMAIN_TRAIN` (entraînement) / `OMEGA_TRAIN` (self) / `COPYRIGHT_HOLDOUT` (modernes achetés = analyse/holdout/features SEULEMENT) / `COMMERCIAL_ANALYSIS_ONLY`. Chaque texte tagué : source, droits, époque, langue, genre, prestige, commercial, usage autorisé.

### D.5 Listes d'acquisition (analyse/holdout, copyright)
Modernes FR : Mauvignier, Michon, Quignard, Ernaux, Modiano, NDiaye, Carrère, Kerangal, Énard, Mbougar Sarr. Internationaux : McCarthy, Morrison, Ishiguro, Fosse, Han Kang, Krasznahorkai. Commercial : Musso, Bussi, Thilliez, Chattam, Dicker, Lemaitre, Damasio. Anciens domaine public (train) : Flaubert, Hugo, Balzac, Zola, Maupassant, Proust, Céline, Dostoïevski, Tolstoï… (⚠️ traductions récentes potentiellement protégées).

### D.6 Décisions PARKÉES (tour de table)
- **D1** : pilote DPO-1 maintenant ? (GO 2 IA — preuve-de-concept réversible que la boucle LoRA bouge l'aiguille).
- **D2** : après DPO-1, geler Tier-S + pivot commercial book-factory ? (Gemini : oui ; ChatGPT : HOLD entraînement).
- **D3** : voie data Tier-S (DPO-1 / DPO-3 hybride / couches A+B+C).
- **D4** : achats modernes = analyse only.
- **D5** : lancer LEGION (E0+1) — **consensus 3 IA : OUI, c'est le prochain pas** (falsifiable, quasi-gratuit, copyright-safe).

---

## E. EXIGENCE (niveau attendu)
- NASA-Grade L4 : PROVE IT (commande+output+artefact), TEST IT, TRACE IT, MINIMIZE IT.
- Vérité avant flatterie : auditer les claims (y compris des Tribunaux IA) ; corriger les erreurs (ex. attribution Moretti, chiffres synthétiques).
- Séparer VÉRIFIÉ / RAPPORTÉ / HYPOTHÈSE / MÉTAPHORE. Jamais d'équation affirmée sans validation holdout (EMP-16).
- Anti-noyade (vecteurs indépendants), copyright strict, LOAO obligatoire.
- Verdict PASS/FAIL + log_quality.md à chaque livrable. STOP + Architecte sur tout fork d'architecture.

## VERDICT
- Statut : RÉCAP MAÎTRE + PLAN DE BATAILLE COMPLET, prêt à bootstrapper une conversation neuve. Confiance : Haute.
- Forces : tout l'arc tracé (commits, docs, lois, walls, plan, exigence) ; ordre LEGION arbitré ; protocoles E0/1 prêts ; décisions parkées explicites.
- Faiblesses : part de marché historique faible (T3) ; thermo = hypothèses ; modèle cohorte exige métadonnée naissance.
- Action : lancer LEGION-E0 au GO (voir message de reprise `LEGION_RESUME_PROMPT.md`).
