# 02_CONCEPT_LEDGER — chaque idée a une ADRESSE. Si elle n'a pas d'adresse, elle est perdue ; si elle en a une, interdiction de l'oublier.
**Format : ID · Définition · Synonymes (pour le grep !) · Sources · Statut · Modules · Gaps · Prochaine action. Statuts : PROUVÉ_CODE/PROUVÉ_TEST/DÉCISION_SCELLÉE/SPEC_ACTIVE/MUSEUM/NON_RETROUVÉ.**

### CONCEPT-OMEGA-PLATFORM-001
Plateforme souveraine d'écriture : traduction émotionnelle → trajectoire → texte industriel. **Syn** : moteur narratif, usine à livres, réacteur narratif. **Src** : GOVERNANCE/VISION_FINALE_SCELLEE.md (FROZEN). **Statut** : DÉCISION_SCELLÉE. **Action** : aucune — c'est la constitution.

### CONCEPT-EMOTION-PHYSICS-V44-001
Physique émotionnelle 3 axes (X/Y/**Z persistance**), 6 lois, 9 paramètres, 16 émotions M/λ/κ/E₀/ζ/μ. **Syn** : loi émotionnelle, V4.4, axe Z, décroissance organique, masse émotionnelle, lambda. **Src** : VISION:76-203. **Statut** : DÉCISION_SCELLÉE ; Emotion14 PROUVÉ_CODE (genome INV-GEN-12) ; câblage R6 = gap. **Action** : décider quand V4.4 pilote le contrat de chapitre.

### CONCEPT-AUTONOMOUS-BOOK-001
Écrire un livre complet en autonomie (instructions simples OU Bible remplie). **Syn** : usine, book factory, mode AUTONOME. **Src** : VISION:287 ; ADR DEC-20260606-021-R2 ; runs/c8_book60k. **Statut** : PROUVÉ_TEST (50 chap/87 987 mots/50 admissions rejouables). **Gap** : entrée « Bible remplie » (IntentPack UI). **Action** : C10-router + BookIntent enrichi.

### CONCEPT-COAUTHOR-GPS-001
GPS narratif temps réel pendant que l'humain écrit : position/trajectoire/chemins/dangers ; **ne décide JAMAIS**. **Syn** : co-écriture, copilote, NARRATIVE_FLOW, trajectory-predictor, branches, relances, bourgeons. **Src** : VISION:269-282 ; DEC-20260121-001:48 ; ROADMAP/07:38-55. **Statut** : DÉCISION_SCELLÉE ; radar PROUVÉ_CODE (C4+C9+continuity-oracle) ; trajectoires+UI = 0 code. **Action** : C14 (après doctor/mycelium).

### CONCEPT-REWRITE-DOCTOR-001
Auditer un roman fourni, vérifier cohérence/qualité, réécrire SEULEMENT le nécessaire, intention préservée. **Syn** : réécriture, révision, expansion, Scalpel, REWRITE_ORACLE, repair pack, éditeur. **Src** : ADR_V2_3_M0:24,125 (**GO_B Architecte 2026-05-29**) ; src/chunking/rewritePrompt.ts ; nexus/proof/C9_EVIDENCE + C10 V1_REPAIR. **Statut** : DÉCISION_SCELLÉE + PROUVÉ_CODE partiel + doctrine prouvée sur 88k. **Action** : C11 assemblage (import manuscrit → C9 audit → chirurgie ciblée → re-audit).

### CONCEPT-MYCELIUM-DNA-001
ADN d'une œuvre : carte émotionnelle+narrative unique, reproductible à l'infini, signature comparable/monétisable. **Syn** : génome, fingerprint, empreinte, DNA, fragrances de l'âme, carte ADN. **Src** : VISION:235-265 (PILIER ACTÉ) ; packages/genome (SEALED 109t) ; packages/mycelium (FROZEN 97t) ; apps/omega-ui/src/core/dna.ts ; docs/phase29/*. **Statut** : DÉCISION_SCELLÉE + PROUVÉ_CODE (émotionnel) ; export narratif = gap. **Action** : C12 (projeter CharacterRegistry/Bible/admissions/ledger au format génome, déterminisme BF-13).

### CONCEPT-STYLE-CONTINUATION-001
Capturer un style, continuer une œuvre, écrire un tome intermédiaire SANS erreur de canon ; droits vérifiés machine-level. **Syn** : imitation, pastiche, interquel, suite, fidélité auteur, MIMESIS, voice. **Src** : VISION:298-318 (rights GRAVÉE) ; voice-genome.ts+voice-compiler.ts (PROUVÉ_CODE) ; GENIUS spec:449 (mode continuation — moteur Genius REJETÉ, spec=référence) ; SAGA_CONTRACT (museum spec). **Statut** : mixte. **Gap** : extracteur auto texte→VoiceGenome ; SAGA_CONTRACT ; RIGHTS_MODE enum. **Action** : C15.

### CONCEPT-MIXER-KNOBS-001
Potards (tension/romance/mystère/violence/espoir…) qui modifient la TRAJECTOIRE, pas le texte. **Syn** : table de mixage, curseurs, sliders, knobs, potards-engine, pilotable, C_MASTER, fonction de transfert. **Src** : VISION:282 ; ROADMAP/07:46 ; lois Rosetta (L10 f24e, PILOTABLE/ILLUSION) ; ADR-003 (sélection). **Statut** : DÉCISION_SCELLÉE + science PROUVÉ_TEST + engine 0 code. **Loi** : potard ⇒ SÉLECTION/plan, jamais coaching (BF-15 proposé). **Action** : C13.

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
Aucun travail OMEGA sans mode produit déclaré ; le routeur charge organes+lois du mode. **Src** : CODEX BF-09 PROPOSED (docs/governance/codex/CODEX_AMENDMENT_PROPOSAL_PRODUCT_MODES…md) ; ancêtre VISION §7. **Statut** : SPEC_ACTIVE (ratification pendante). **Action** : C10-router après ratification.

### CONCEPT-JUDGE-CALIBRATION-001
Aucun LLM juge sans profil calibré du COUPLE {modèle+provider+prompt_sha+temp+corpus+format} ; Self-Test au démarrage ; biais de position ⇒ disqualifié. **Syn** : EMP-19, étalonneur, PAIRWISE_APPROVED, persona-lecteur. **Src** : DEC-20260604-020 ; CALIBRATION_REGISTRY.json ; ollama-judge.ts. **Statut** : PROUVÉ_CODE+TEST (2 juges APPROVED signés). **Action** : campagne Gold-Set complète avant usage au-delà de l'advisory.

### CONCEPT-IDEA-PRESERVATION-001
Le système de sauvegarde des idées/concepts « pour ne rien perdre » (SESSION_SAVE_RITUAL + DEC-* + carte mémoire + CE LEDGER). **Syn** : anti-oubli, mémoire canonique, livre maître, save ritual. **Src** : DEC-20260121-001:151-165 ; 00_CARTE_MEMOIRE_OMEGA ; ce dossier. **Statut** : DÉCISION_SCELLÉE, INCARNÉ 2026-06-06 ici-même. **Action** : 10_REPRISE_PROTOCOL appliqué à CHAQUE session — c'est la réponse structurelle à la colère légitime de l'Architecte.

### Organes actés sans concept dédié ci-dessus (adresses rapides)
SENTINEL→DEC:23 (incarné gates+préséance+wrappers) · INTENT_LAYER→DEC:60 (partiel : BookIntent/genesis) · STYLE_DEVIATION_MANAGER→DEC:84 (non codé ; lié BF-12) · EXECUTION_MODE OFF/SEMI/BOOST→DEC:99 (non codé ; parenté llm-cost-guard) · TOKEN_METER→DEC:114 (non codé) · PLUGIN_CONTRACT/NEXUS_DEP→DEC:140 (packages/integration-nexus-dep existe) · SESSION_SAVE_RITUAL→DEC:151 (vivant : DEC-*, ce dossier).
**Règle de croissance** : nouvelle idée ⇒ NEW_CONCEPT ici AVANT toute conception. Idée retrouvée ⇒ FOUND_EXISTING + adresse.
