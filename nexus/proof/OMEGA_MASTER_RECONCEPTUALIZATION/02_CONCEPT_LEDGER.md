# 02_CONCEPT_LEDGER — chaque idée a une ADRESSE. Si elle n'a pas d'adresse, elle est perdue ; si elle en a une, interdiction de l'oublier.
**Format : ID · Définition · Synonymes (pour le grep !) · Sources · Statut · Modules · Gaps · Prochaine action. Statuts : PROUVÉ_CODE/PROUVÉ_TEST/DÉCISION_SCELLÉE/SPEC_ACTIVE/MUSEUM/NON_RETROUVÉ.**

### CONCEPT-OMEGA-PLATFORM-001
Plateforme souveraine d'écriture : traduction émotionnelle → trajectoire → texte industriel. **Syn** : moteur narratif, usine à livres, réacteur narratif. **Src** : GOVERNANCE/VISION_FINALE_SCELLEE.md (FROZEN). **Statut** : DÉCISION_SCELLÉE. **Action** : aucune — c'est la constitution.

### CONCEPT-EMOTION-PHYSICS-V44-001
Physique émotionnelle 3 axes (X/Y/**Z persistance**), 6 lois, 9 paramètres, 16 émotions M/λ/κ/E₀/ζ/μ. **Syn** : loi émotionnelle, V4.4, axe Z, décroissance organique, masse émotionnelle, lambda. **Src** : VISION:76-203. **Statut** : DÉCISION_SCELLÉE ; Emotion14 PROUVÉ_CODE (genome INV-GEN-12) ; câblage R6 = gap. **Action** : décider quand V4.4 pilote le contrat de chapitre.

### CONCEPT-AUTONOMOUS-BOOK-001
Écrire un livre complet en autonomie (instructions simples OU Bible remplie). **Syn** : usine, book factory, mode AUTONOME. **Src** : VISION:287 ; ADR DEC-20260606-021-R2 ; runs/c8_book60k. **Statut** : PROUVÉ_TEST (50 chap/87 987 mots/50 admissions rejouables). **Gap** : entrée « Bible remplie » (IntentPack UI). **Action** : C10-router + BookIntent enrichi.

### CONCEPT-COAUTHOR-GPS-001
GPS narratif temps réel pendant que l'humain écrit : position/trajectoire/chemins/dangers ; **ne décide JAMAIS**. **Syn** : co-écriture, copilote, NARRATIVE_FLOW, trajectory-predictor, branches, relances, bourgeons. **Src** : VISION:269-282 ; DEC-20260121-001:48 ; ROADMAP/07:38-55. **Statut** : DÉCISION_SCELLÉE + **PROUVÉ_CODE+TEST+E2E (C14, 2026-06-06)** — `src/gps/` : radar (position : qui est en scène+locuteur, météo émotionnelle=5 axes potards, dangers C9, **graines vieillissantes=NARRATIVE_FLOW incarné**) + trajectory-predictor (3-5 routes TYPÉES sur gabarits figés paramétrés par les entités RÉELLES, tri alphabétique=zéro préférence, risques jamais cachés, refus si <2 routes). **BF-11 PAR CONSTRUCTION ×2** : le router refuse GENERATE_PROSE au mode GPS (typé) ET le predictor n'ordonne jamais. Démo réelle ch.5 88k : 5 routes sur Yvon/Léna+« naufrage ». **Action V2** : prémisses littéraires LLM gated ; UI WRITING STUDIO (ph.18) ; incrémental temps réel.

### CONCEPT-REWRITE-DOCTOR-001
Auditer un roman fourni, vérifier cohérence/qualité, réécrire SEULEMENT le nécessaire, intention préservée. **Syn** : réécriture, révision, expansion, Scalpel, REWRITE_ORACLE, repair pack, éditeur, doctor. **Src** : ADR_V2_3_M0:24,125 (**GO_B Architecte 2026-05-29**) ; **`src/doctor/` (C11, 2026-06-06)** ; src/chunking/rewritePrompt.ts ; C9/C10/C11_EVIDENCE. **Statut** : **PROUVÉ_CODE+TEST+E2E** — orchestrateur assemblé (import multi-formats + casting auto + audit C9 + plan 3 classes MECHANICAL_SAFE/SURGICAL_LLM-gated/SIGNAL_ONLY + executor diffé + re-audit). E2E 88k : égale le V1 manuel et le DÉPASSE (3ᵉ couture ch.47 trouvée que l'humain avait ratée). Garde-fous prouvés : dérive confuse (>3 noms) ⇒ jamais d'auto, décision humaine via identityUnify (GO_B incarné). **Limites** : lieu-double sous seuil de co-occurrence = chemin humain ; SURGICAL jamais exécuté sans port LLM+flag. **Action** : V2 — exécution SURGICAL gated réelle, import UI, heuristique « primitif rare en début de livre ».

### CONCEPT-MYCELIUM-DNA-001
ADN d'une œuvre : carte émotionnelle+narrative unique, reproductible à l'infini, signature comparable/monétisable. **Syn** : génome, fingerprint, empreinte, DNA, fragrances de l'âme, carte ADN. **Src** : VISION:235-265 (PILIER ACTÉ) ; packages/genome (SEALED 109t) ; packages/mycelium (FROZEN 97t) ; apps/omega-ui/src/core/dna.ts ; docs/phase29/*. **Statut** : DÉCISION_SCELLÉE + PROUVÉ_CODE (émotionnel : genome SEALED) + **PROUVÉ_CODE+TEST+E2E (narratif : `src/mycelium-export/narrative-genome.ts`, C12 2026-06-06)** — NARRATIVE_GENOME_V1 : cast+seedLedger+fonctions+tics+contentHash/chapitre+chaîne de 50 admissions, hash sha256(canonicalize) canon-kernel. **BF-13 prouvé sur le 88k : même livre⇒même hash (451188a0…) ; V0 vs DOCTOR_V1⇒hashes distincts.** Tris compareStrings, ordre d'entrée indifférent, blancs non significatifs. **FUSION RÉELLE FAITE (GO2)** : emotionalHash réel = sha256(canonicalize(DNA 128 composants)) via `analyzeText`+`generateDNA` (apps/omega-ui/src/core RÉUTILISÉS — zéro doublon, zéro dep UI) → **FUSED_GENOME_V1 COMPLETE déterministe sur le 88k** (d8447a5f…). UI phase 17 V0-viz : MYCELIUM_VIEW_60K.html (ADN complet affiché) + phase 16 : COCKPIT_60K.html (5 courbes émotionnelles réelles ×50 chap) — data-driven, zéro logique moteur dupliquée. **Action V2** : jonction backend propre (construire OmegaDNA pour genome.analyze SEALED) ; UI interactive (Studio ph.18 = design doc).

### CONCEPT-STYLE-CONTINUATION-001
Capturer un style, continuer une œuvre, écrire un tome intermédiaire SANS erreur de canon ; droits vérifiés machine-level. **Syn** : imitation, pastiche, interquel, suite, fidélité auteur, MIMESIS, voice. **Src** : VISION:298-318 (rights GRAVÉE) ; voice-genome.ts+voice-compiler.ts (PROUVÉ_CODE) ; GENIUS spec:449 (mode continuation — moteur Genius REJETÉ, spec=référence) ; SAGA_CONTRACT (museum spec). **Statut** : mixte → **rights-gate + extracteur PROUVÉS_CODE+TEST+E2E (C15, 2026-06-06)** — `src/style/` : RIGHTS_MODE 6 états avec **RightsTicket brandé** (infalsifiable par le type système — VISION:311 machine-level littéral, génération bloquée prouvée en E2E) + extracteur 10 paramètres [0,1] **structure-compatible VoiceGenome** (jonction sans friction, sovereign-engine intouché), fingerprint 88k reproductible. **SAGA_CONTRACT PROUVÉ_CODE+TEST+E2E (GO2)** : `src/saga/` — promesses SEED_CARRYOVER/CHARACTER_STATE/FACT_BINDING, contrat HASHÉ binding (sceau anti-tampering vérifié avant tout usage), checkContract CALC (Henri-mort-qui-parle détecté sur faux tome 2 réel). P5+contrat = le SEUL canal légal inter-tomes. **C15-gen PROUVÉ+RÉEL** : `style-generation.ts` — compileStyleDirectives (FORME only, audité FORBID-006), generateInStyle (ticket GENERATE re-vérifié runtime, conformityScore L1 post-extraction, flag below_style_floor honnête) — **génération Ollama RÉELLE : conformité 0.776**. **Gap V2** : calibration proxys ironie/registre ; STYLE_FLOOR multi-textes.

### CONCEPT-MIXER-KNOBS-001
Potards (tension/romance/mystère/violence/espoir…) qui modifient la TRAJECTOIRE, pas le texte. **Syn** : table de mixage, curseurs, sliders, knobs, potards-engine, pilotable, C_MASTER, fonction de transfert. **Src** : VISION:282 ; ROADMAP/07:46 ; lois Rosetta (L10 f24e, PILOTABLE/ILLUSION) ; ADR-003 (sélection). **Statut** : DÉCISION_SCELLÉE + science PROUVÉ_TEST + **ENGINE PROUVÉ_CODE+TEST+BENCH (C13, 2026-06-06)** — `src/mixer/` : les 5 potards EXACTS de VISION:282, bindings BF-10 tracés (mécanisme+limites+Goodhart par potard), mixedSelect étage-A-inviolable (z-scores intra-scène × poids, identité à 0). **Bench 450 sélections réelles (candidats persistés 88k) : identité 0% à potard nul ; 52-72% gagnants changés à ±1 ; MONOTONIE 3/3 (TENSION 0.067→3.247, MYSTERE 4.36→15.51, ESPOIR 0.74→5.21) ; ADN distinct à périmètre constant.** Lois BF-09/10/15 RATIFIÉES. **Action V2** : KNOB_WEIGHT calibration multi-livres (EMP-16), ROMANCE/VIOLENCE benchés (lexiques posés), UI COCKPIT.

### CONCEPT-BIBLE-MESH-001
La Bible comme MAILLAGE de vues spécialisées (librarians) au-dessus d'un canon unique — jamais de stores parallèles. **Syn** : bibliothèques, sous-agents, BIB_WORLD, BIB_CHARACTER, librarian, vues. **Src** : Codex:1384 (doctrine BIB_*) ; forensic V3 D-mapping (BIB_TO_MODULE_MAPPING_FINAL). **Statut** : DÉCISION + PROUVÉ_CODE (recall librarians C2). **Action** : étendre les vues au fil des besoins (BF-06).

### CONCEPT-RECALL-BUS-001
Toute mention d'entité canonique DOIT être servie par un RecallPack borné ; sinon candidat INVALID. **Syn** : recall, packs, mention scanner, filet BF-02, G_RECALL, agents de rappel. **Src** : ADR R2 ; src/recall/* ; INV-RECALL-001. **Statut** : PROUVÉ_CODE+TEST. **Action** : —.

### CONCEPT-CHARACTER-MARKER-001
Marqueurs/identité stable des personnages à travers renommages, alias, révélations, titres. **Syn** : marqueurs personnage, rename-stable ID, alias, REVEAL, TITLE_TRANSFER. **Src** : forensic V3 (AUCUN ID rename-stable avant) ; D3 signé ; src/identity/*. **Statut** : PROUVÉ_CODE+TEST (CharacterRegistry C1, 28 tests). **Leçon 88k** : non-minté ⇒ dérive (Thomas/Henri). **Action** : casting TOTAL au plan (loi 09).

### CONCEPT-CHARACTER-REGISTRY-001
Journal append-only d'événements d'identité, mint par NONCE, Resolution 5 cas, anti-contamination inter-livres (P5). **Src** : src/identity/character-registry.ts ; C1_EVIDENCE. **Statut** : PROUVÉ_CODE+TEST. **Action** : —.

### CONCEPT-WORLD-MODEL-001
Modèle du monde tieré (HOT/WARM/COLD digest) servi en lecture seule via ACL ; gateway FROZEN jamais muté. **Syn** : memory_layer_nasa, tiering, decay, digest, ACL, miroir. **Src** : D1 signé ; src/acl/* ; découverte ère pré-ESM. **Statut** : PROUVÉ_CODE (ACL) ; module source ORPHAN certifié. **Action** : C3-W1 (build ESM d'un FROZEN) = décision Architecte, gaté.

### CONCEPT-MEMORY-LAYER-001
Les 10 modules MEMORY d'OMEGA 2.0 (MEMORY_HYBRID/TIERING/DIGEST, CONTEXT_RESOLUTION, ACTIVE_INVENTORY, COST_LEDGER, GARBAGE_COLLECTOR…). **Src** : MASTER_PLAN v2 §8.3 (museum:819). **Statut** : MUSEUM/SPEC_ONLY — tiering/digest INCARNÉS par memory_layer_nasa+ACL ; le reste non codé. **Action** : ne pas re-spécifier ; piocher à la demande en citant ce ledger.

### CONCEPT-QUANTUM-TRUTH-001
Coexistence de plusieurs vérités/hypothèses narratives, fusion/résolution contrôlée. **Syn** : multi-vérités, branches incertaines, superposition. **Src** : DEC-20260121-001:37. **Statut** : DÉCISION_SCELLÉE ; approximé par rails truth/interpretation (canon-kernel) ; fusion non câblée. **Action** : V2 (rêves/hallucinations CKG V2 le mobilisera).

### CONCEPT-READER-MODEL-001
Profil du lecteur cible projeté ; POIDS FAIBLE, « avertit, ne décide pas ». **Src** : DEC-20260121-001:71-78. **Statut** : DÉCISION_SCELLÉE ; premier pas réel = persona-lecteur calibré des juges (EMP-19). **Action** : phase 16 (UI COCKPIT).

### CONCEPT-NARRATIVE-FLOW-001
Flux narratif comme flux sanguin : branches mourantes/vivantes, scènes de relance (greffes), bourgeons sur le Mycelium. **Src** : DEC-20260121-001:48-56. **Statut** : DÉCISION_SCELLÉE ; payoff_graph OVERDUE + seedLedger C9 = premiers capteurs. **Action** : C14 (GPS).

### CONCEPT-SCRIBE-001
Générateur AVEUGLE (ne voit jamais la Bible brute), profils multiples, amorces variées, continuations bornées. **Syn** : blind scribe, R1-R7, K2. **Src** : ADR R2 BF-07 ; chapter-generator ; SCRIBE P.2-A hérité. **Statut** : PROUVÉ_CODE+TEST. **Action** : —.

### CONCEPT-R6-WRITER-LOOP-001
Boucle souveraine : N candidats → gates durs → préséance → sélection 2 étages → admission rejouable. **Syn** : rejection sampling, douanier, sovereign loop. **Src** : ADR-003 scellée ; ADR R2 ; src/loop/*. **Statut** : PROUVÉ_CODE+TEST à l'échelle (88k). **Action** : —.

### CONCEPT-DOUBLE-BIBLE-001
Deux bibles : déclarée (journal) vs EXTRAITE (relecture indépendante de la prose) ; le diff est un GATE. **Syn** : extracteur par passes, diffBibles, G3. **Src** : forensic V3 (vrai-neuf ✓✓) ; src/extraction/*. **Statut** : PROUVÉ_CODE+TEST. **Action** : passes V2 (météo TemporalClaim, épistémique fin).

### CONCEPT-SKEPTIC-001
Contrôleur adverse de cohérence/qualité. **Syn** : devil's advocate, sentinelle, contrôleur de cohérence. **Src** : MASTER_PLAN v2:836 (spec) ; **INCARNÉ 2026-06-06 par src/coherence/ (C9 : phrase/chapitre/arc + tics, ADVISORY)**. **Statut** : PROUVÉ_CODE+TEST (l'organe vit sous un autre nom). **Action** : durcissement EMP-16 (3 livres) avant tout gate dur.

### CONCEPT-ROSETTA-001
Physique littéraire mesurée : lois observables, pilotabilité réelle des features, ponts prompt→features. **Syn** : lois L*, IRM, pilotables, bridge. **Src** : docs/irm/*, CODEX v1.3:599, omega-autopsie/results_rosetta. **Statut** : PROUVÉ_TEST (lois scellées). **Action** : alimente C13 potards.

### CONCEPT-VOICE-GENOME-001
Style quantifié 10 paramètres + compilateur vers consignes. **Syn** : voix, signature stylistique, fingerprint auteur. **Src** : sovereign-engine/src/voice/*. **Statut** : PROUVÉ_CODE. **Gap** : extraction auto depuis texte de référence (flux complet). **Action** : C15.

### CONCEPT-PRODUCT-MODE-ROUTER-001
Aucun travail OMEGA sans mode produit déclaré ; le routeur charge organes+lois du mode. **Src** : CODEX BF-09 **RATIFIÉ 2026-06-06** ; ancêtre VISION §7 ; **`src/router/product-mode-router.ts` (C10, 2026-06-06)**. **Statut** : PROUVÉ_CODE+TEST — 6 modes avec lois IMPOSÉES PAR LE CODE (le GPS ne peut PAS générer : capacité refusée typée ; le mixer est OFF/CALC pur ; doctor=SEMI human-in-the-loop), setMode unique porte d'entrée, assertCapability refus typé. **Action** : brancher les orchestrateurs existants sur assertCapability (adoption progressive).

### CONCEPT-JUDGE-CALIBRATION-001
Aucun LLM juge sans profil calibré du COUPLE {modèle+provider+prompt_sha+temp+corpus+format} ; Self-Test au démarrage ; biais de position ⇒ disqualifié. **Syn** : EMP-19, étalonneur, PAIRWISE_APPROVED, persona-lecteur. **Src** : DEC-20260604-020 ; CALIBRATION_REGISTRY.json ; ollama-judge.ts. **Statut** : PROUVÉ_CODE+TEST (2 juges APPROVED signés). **Action** : campagne Gold-Set complète avant usage au-delà de l'advisory.

### CONCEPT-IDEA-PRESERVATION-001
Le système de sauvegarde des idées/concepts « pour ne rien perdre » (SESSION_SAVE_RITUAL + DEC-* + carte mémoire + CE LEDGER). **Syn** : anti-oubli, mémoire canonique, livre maître, save ritual. **Src** : DEC-20260121-001:151-165 ; 00_CARTE_MEMOIRE_OMEGA ; ce dossier. **Statut** : DÉCISION_SCELLÉE, INCARNÉ 2026-06-06 ici-même. **Action** : 10_REPRISE_PROTOCOL appliqué à CHAQUE session — c'est la réponse structurelle à la colère légitime de l'Architecte.

### CONCEPT-SEAM-SWEEP-001
Contrôle d'intégrité des COUTURES (frontières de blocs/chapitres) par DÉFINITIONS structurelles, pas listes de patterns. **Syn** : couture, fragment pendu, reprise dupliquée, dangling, stitch, NCR-SEAM-GLOBAL-002. **Src** : `src/doctor/seam-sweep.ts` (2026-06-07) ; ancêtre fixBrokenStitch (EXP-1). **Statut** : PROUVÉ_CODE+TEST — 12 INV (cas réels tribunal en fixtures), arbre de décision grammatical 8 actions tracées, critère PASS = re-scan à zéro. Sur le 60k : 206 findings → résidu **0**. **Gap** : généraliser hors c8 (livre arbitraire) ; brancher comme gate du pont V2. **Action** : intégré au pipeline canonique rebuild-final.

### CONCEPT-SCAFFOLD-GUARD-001
Contrôle anti-fuite des DIRECTIVES DE GÉNÉRATION laissées en prose (« — Acte N : … [synthese] »). **Syn** : scaffold, beat directive, markup tag, fuite de squelette, bruit Acte×46. **Src** : `src/doctor/scaffold-guard.ts` (2026-06-07) ; parenté nettoyage génome NCR-MYC-001. **Statut** : PROUVÉ_CODE+TEST — 7 INV, invariant = crochet fermé `[token-minuscule]` (les 50 crochets du V0 sont TOUS des tags, zéro crochet de prose), 50/50 retirés résidu 0. **Gap** : généraliser le vocabulaire markup hors c8. **Action** : intégré au pipeline AVANT la couture (sinon cascade : la couture mange le `]`).

### CONCEPT-SEMANTIC-GATE-001
Contrôle des trous de SENS (vs trous de ponctuation) : stem tronqué prouvé par corpus (hapax+préfixe strict, mots simples seuls), gate de complétude avant tout point ajouté (segment terminal ≥4 mots+guillemets équilibrés), équilibre « » (le dialogue licencie l'ellipse, la narration non), fin de livre = scène fermée. **Syn** : troncature sémantique, NCR-003, légalisation du cadavre, fermeture narrative, trous de sens. **Src** : `src/doctor/semantic-gate.ts` (2026-06-07) ; refus ChatGPT validé empiriquement. **Statut** : PROUVÉ_CODE+TEST (9 INV, preuves réelles en fixtures). **Gap** : NARRATIVE_CLEAN (niveau 3) sans instrument export ; complétude = seuil structurel, pas analyse verbale. **Action** : intégré pipeline canonique (étape post-couture).

### CONCEPT-TYPED-MARKER-001
Pointeur chiffrable ÉTENDU aux lieux/événements/objets (ordre Architecte 2026-06-07) : EntityKind, casse stricte noms / insensible reste, PRESENCE_MAP par chapitre = nourriture du Radar GPS et du Casting Total. **Syn** : marqueur typé, presence map, pointeur lieu, pointeur événement, seed tracking. **Src** : `src/identity/mention-annotator.ts` étendu. **Statut** : PROUVÉ_CODE+TEST (4 INV) + E2E réel (3691 mentions typées). **Gap** : 14,3 % non résolu (pronoms/périphrases → coref SHADOW P2) ; registre unique A3 pas encore la source. **Action** : P0 autoaudit = registre d'entités typé unique.

### CONCEPT-SEAM-SURGEON-001
Le COUTURIER : sous-agent spécialisé du Rewrite Doctor dédié aux SEULS raccords/jonctions/continuité locale — « le Scribe écrit, le Weaver raccorde, le Doctor contrôle, le Canon juge ». **Syn** : CONTINUITY_WEAVER (produit), R6_SEAM_SURGEON (technique), couturier, chirurgien du raccord, technicien raccord, micro-soudure. **Src** : `src/doctor/seam-surgeon.ts` (2026-06-07) ; mandat Francky + tribunal 2/2 (correctif ChatGPT : jamais « remplacer le code par l'intelligence »). **Statut** : PROUVÉ_CODE+TEST — 12 entrées obligatoires (REFUSE MISSING_WORLD_STATE sans Bible/RecallPack), 3 verdicts (REPAIR/KEEP_STYLED/ESCALATE), 8 INV (fenêtre seule, zéro fait nouveau, RecallPack requis, POV/lieu/temps inchangés, zéro répétition, re-scan+hash), mécaniques sans LLM (faux-départ/dédup), complétion LLM bornée ≤3 phrases ≤150 mots sous tribunal mécanique. **Fixture 120 : accuracy 1.0** (20 saines, 20 mécaniques, 20 troncatures, 20 dialogues, 20 transitions légitimes, 20 fausses alertes ; ports adverses tous rejetés). **Gap** : branchement production 88k GATÉ par ratification tribunal ; câblage Recall Bus réel (V1 = world state injecté). **Action** : NCR-FOOTWEAR-CH1-004 = premier passage supervisé après GO.

### Organes actés sans concept dédié ci-dessus (adresses rapides)
SENTINEL→DEC:23 (incarné gates+préséance+wrappers) · INTENT_LAYER→DEC:60 (partiel : BookIntent/genesis) · STYLE_DEVIATION_MANAGER→DEC:84 (non codé ; lié BF-12) · EXECUTION_MODE OFF/SEMI/BOOST→DEC:99 (non codé ; parenté llm-cost-guard) · TOKEN_METER→DEC:114 (non codé) · PLUGIN_CONTRACT/NEXUS_DEP→DEC:140 (packages/integration-nexus-dep existe) · SESSION_SAVE_RITUAL→DEC:151 (vivant : DEC-*, ce dossier).
**Règle de croissance** : nouvelle idée ⇒ NEW_CONCEPT ici AVANT toute conception. Idée retrouvée ⇒ FOUND_EXISTING + adresse.

## SESSION_SAVE 2026-06-08 — PAROXYSME (organes du systeme nerveux)

| Concept-ID | Statut | Adresse | Note |
|---|---|---|---|
| CONCEPT-MOTIF-REPULSION-FIELD-001 | NEW_CONCEPT — LIVRE V1 (SHADOW, mode '1' pret) | book-factory/src/variation/motif-repulsion.ts | PID (cooldown=cas Ki=Kd=0) + loi dure 3e occurrence + quota meteo ; retro-preuve 3 livres C18_RETRO_PROOF.json |
| CONCEPT-R6-DRAMATIC-FUNCTION-GATE-001 | NEW_CONCEPT — LIVRE V1 (SHADOW+SOFT, 'hard' inexistant par loi EMP-16) | book-factory/src/control/control-plane.ts | regles causales R1/R2, fallback A ; replay EMP-16 driftRate 0.74 ; PREFIX_STABLE 0.94+ |
| CONCEPT-OMEGA-EXPERIMENT-LEDGER-001 | NEW_CONCEPT — LIVRE V1 | book-factory/src/ledger/experiment-ledger.ts + nexus/proof/EXPERIMENT_LEDGER.json | append-only, supersedes ; backfill 18k/88k/EMP-16 ; toute promotion citera ses lignes |
| CONCEPT-NARRATIVE-LYAPUNOV-CONTROLLER-001 | NEW_CONCEPT — SPEC only | docs/governance/OMEGA_ULTRA_VISION_2026-06-08.md section 3 | V(n) lisible sur instruments existants ; gains calibres par C19 ; SHADOW au prochain run |
| CONCEPT-PARETO-CANDIDATE-SELECTOR-001 | NEW_CONCEPT — SPEC only | OMEGA_ULTRA_VISION section 4 | admissibilite avant score ; ancetre = selection hostile R7 min_axis |
| CONCEPT-EMERGENCE-TRACKER-001 | NEW_CONCEPT — SPEC only (extension EntityRegistry, pas un module neuf) | OMEGA_ULTRA_VISION section 6 | masse narrative -> AUTHOR_REVIEW ; cas fondateur Vallet (scelle) |
| NCR-PX2-001 | FERMEE | semantic-gate.ts M1/M2 + build-canonical.ts M3 + px2-ncr.test.ts | faux positif flexionnel (disparais/disparaissent) ; 3 preuves convergentes ; hash EMP-16 inchange |

## SESSION_SAVE 2026-06-08-bis — S0 ROSETTA DRAMATIQUE

| Concept-ID | Statut | Adresse | Note |
|---|---|---|---|
| CONCEPT-ROSETTA-DRAMATIC-FUNCTION-CALIBRATION-001 | LIVRE — levier few-shot PROUVE, reinjecte SHADOW/SOFT | book-factory/src/rosetta/ + s0-*.ts + v2-conductor escalationDirective | reformulation refutee (0% A-D) ; few-shot REVELATION 0->100% CONFRONTATION 0->67% ; gemma4 sous-produit 37x ; DECISION/REVERSAL UNMEASURABLE consignees |
