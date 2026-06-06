# CARTE PRIOR ART — LES 5 UTILITÉS PRODUIT D'OMEGA + LES POTARDS
**Mission** : ordre Architecte 2026-06-06 — « toutes ces choses ont été abordées, discutées, architecturées pour certaines et même des interfaces proposées — retrouve-moi tout cela ».
**Méthode** : fouille double (agent Explore très-thorough + vérification manuelle de 4 citations clés 4/4 exactes). Chaque ligne = fichier+ligne réels du repo. Statuts : DÉCISION (acté Architecte) / SPEC_ONLY / CODÉ / MUSEUM (non-source-of-truth runtime, EMP-15) / PHANTOM (mentionné sans spec ni code).

## VERDICT D'ENSEMBLE
**Tu avais raison sur toute la ligne** : les 5 utilités + les potards existent dans les docs — deux sont ACTÉES par décision formelle, deux sont partiellement CODÉES, les interfaces sont actées en phases (16/17/18) mais sans mockup dessiné. Le document fondateur est `GOVERNANCE/VISION_FINALE_SCELLEE.md` (potards, GPS, 3 modes, extension d'univers, 16 émotions M/λ/κ — tout y est).

---

## MODE 1 — ÉCRITURE AUTONOME (l'usine à livres)
| Source | Contenu | Statut |
|---|---|---|
| `GOVERNANCE/VISION_FINALE_SCELLEE.md:287` | « LES 3 MODES : ASSISTÉ / SEMI-AUTONOME / AUTONOME » | DÉCISION |
| `packages/book-factory/*` (C0→C9, 2026-06-06) | BookIntent→plan→mint→R6 N=7→gates→88k mots prouvés | **CODÉ ET PROUVÉ** |
| `docs/architecture/DEC-20260606-021-R2-*.md` | ADR R2 signée A — la boucle souveraine entière | DÉCISION |
**État réel : c'est le mode le PLUS avancé — un roman 50 chap/88k mots existe avec preuve d'admission par chapitre.** Manque : l'entrée « Bible remplie par l'utilisateur » (le BookIntent actuel est minimal — le remplissage manuel de la Bible canonique = chantier d'interface, pas de moteur).

## MODE 2 — CO-ÉCRITURE / GPS NARRATIF
| Source | Contenu | Statut |
|---|---|---|
| `GOVERNANCE/VISION_FINALE_SCELLEE.md:271` | « Le GPS narratif guide l'écriture en temps réel » | DÉCISION |
| `GOVERNANCE/VISION_FINALE_SCELLEE.md:279` | « **Le GPS ne décide JAMAIS. Il montre des chemins.** » | DÉCISION (loi produit) |
| `GOVERNANCE/VISION_FINALE_SCELLEE.md:288` | « Mode ASSISTÉ : L'humain écrit, OMEGA guide » | SPEC_ONLY |
| `GOVERNANCE/DECISIONS/DEC-20260121-001:48` | Organe NARRATIVE_FLOW_CONTROLLER : « détecter branches mourantes/vivantes, suggérer des scènes de relance » | DÉCISION/ACTÉ |
| `GOVERNANCE/DECISIONS/DEC-20260121-001:193` | « PHASE 9 — GPS + QUANTUM_TRUTH » | DÉCISION |
| `ROADMAP/07_PHASES_6_TO_17_POST_V44.md:44-47` | Modules nommés : `gps-narratif-core`, `potards-engine`, `trajectory-predictor` ; « Gate 7 : GPS ne génère AUCUN texte » | SPEC_ONLY (❌ ABSENT) |
| `MASTER_PLAN v2 (museum):388` | « GPS Narratif — PHANTOM — no spec, no code » | MUSEUM |
**État réel : vision et lois actées, organes nommés, ZÉRO code.** MAIS la fondation 2026-06 a tout changé : l'extracteur C4 + diffBibles + continuity-oracle + les instruments C9 SONT le radar temps réel dont le GPS a besoin (auditer ce que l'humain tape = exactement editorial-audit par chapitre). Gap restant : le générateur de « 3 directions valides » (trajectory-predictor) et l'interface.

## MODE 3 — RÉÉCRITURE (le réviseur)
| Source | Contenu | Statut |
|---|---|---|
| `docs/adr/ADR_V2_3_M0_INSTRUCTION_DOSSIER.md:125` | « TRANCHÉ 2026-05-29 : GO_B — mode réécriture **semi-automatique** confirmé, human-in-the-loop » | **DÉCISION ARCHITECTE** |
| `docs/adr/ADR_V2_3_M0_INSTRUCTION_DOSSIER.md:24` | Pipeline : texte source → Scalpel (découpe) → régénère/étend chaque segment | SPEC |
| `docs/adr/ADR_V2_3_CHUNKING_GENERATION_COUPLING.md:104` | Livré V2.3-A : `deriveEmotionContractFromSegment`, `buildRewritePrompt`, bench `REWRITE_ORACLE` | **CODÉ partiel** |
| `src/chunking/rewritePrompt.ts` | `rewrite_mode: 'rewrite' \| 'expand'` | CODÉ |
| `MASTER_PLAN v2 (museum):836` | THE_SKEPTIC « devil's advocate » | SPEC_ONLY |
**État réel : le SEUL mode avec décision Architecte formelle ANTÉRIEURE (GO_B 2026-05-29) + code partiel.** Et la session C9 d'aujourd'hui a livré l'autre moitié : l'AUDIT (cohérence 3 niveaux + tics + ledger) qui dit OÙ réécrire. Réécriture = audit C9 (fait) + chirurgie V2.3 (partiel) + N2 factuel (fait). C'est le mode le plus PROCHE de l'assemblage final.

## MODE 4 — MYCELIUM (l'ADN du roman)
| Source | Contenu | Statut |
|---|---|---|
| `packages/genome/README.md:9,34` | « Narrative Genome — Fingerprint » ; `FINGERPRINT = SHA256(canonicalBytes(payload))` | **CODÉ/SEALED** (109 tests) |
| `packages/mycelium/README.md:1` | « Input validation guardian for DNA/Genome pipeline » (97 tests, 21 invariants) | **CODÉ/FROZEN** |
| `docs/phase29/BOUNDARY_MYCELIUM_GENOME.md:20` | Frontière formelle Mycelium (gardien) ↔ Genome (moteur certifié) | SPEC |
| `docs/architecture/GENOME_ROLE.md:22` | « GENOME = **descriptive DNA** of a narrative, not a generative system » | SPEC |
| `apps/omega-ui/src/core/dna.ts:15,190` | DNA 128 composants (8 features × 14 émotions + 16 style) + `generateDNA()` | CODÉ (UI isolée) |
| `GOVERNANCE/DECISIONS/DEC-20260121-001:200` | « PHASE 17 — UI MYCELIUM » | DÉCISION |
| `DEC-20260121-001:54` | Flux narratif « symbolisé sur Mycelium par les petits bourgeons champignon » | DÉCISION (langage d'interface !) |
**État réel : la MÉCANIQUE existe et est scellée (Genome SHA-256 déterministe = exactement « unique mais reproductible à l'infini »).** Gap : le génome actuel = empreinte ÉMOTIONNELLE/stylistique (Emotion14) ; la carte NARRATIVE complète (personnages/lieux/arcs/secrets/seed-payoff) n'y est pas — mais la session 2026-06 l'a construite SANS le savoir : CharacterRegistry journal + Bible + admissions hashées + mystery ledger = le contenu manquant du Mycelium. Assembler = exporter ces structures dans le format Genome.

## MODE 5 — IMITATION DE STYLE / CONTINUATION / INTERQUEL
| Source | Contenu | Statut |
|---|---|---|
| `packages/sovereign-engine/src/voice/voice-genome.ts:9` | VoiceGenome 10 paramètres [0,1] (phrase_length, dialogue_ratio, metaphor_density, irony…) calibré Camus/Proust/Simon | **CODÉ/ACTIF** |
| `packages/sovereign-engine/src/voice/voice-compiler.ts:1` | Compile VoiceGenome → instructions de prompt FR | **CODÉ** |
| `docs/GENIUS-00-SPEC/GENIUS_ENGINE_SPEC.md:449,455,665` | Mode « continuation (fidélité auteur) » : fingerprint auteur ±10%, V_floor 85 vs 70 | SPEC détaillée (⚠ Genius Engine = REJETÉ comme moteur, la SPEC du mode reste une référence) |
| `MASTER_PLAN v2 (museum):844` | MIMESIS+ « style cloning » | SPEC_ONLY (0% code) |
| `MASTER_PLAN v2 (museum):827` | SAGA_CONTRACT « cross-book promises, binding » = le contrat inter-tomes de l'interquel | SPEC_ONLY |
| `GOVERNANCE/VISION_FINALE_SCELLEE.md:300,311` | Extension d'univers actée + « génération BLOQUÉE machine-level sans droits » | **DÉCISION (rights-gate déjà actée !)** |
| `docs/concepts/CNC-101-STYLE_LIVING_SIGNATURE.md:35` | « MIMESIS+ (clone sans tuer) » | DESIGNED |
**État réel : VoiceGenome+compiler CODÉS, le rights-gate est DÉJÀ une décision gravée (la clause juridique que ChatGPT propose en BF-14 existe depuis VISION_FINALE).** Gap : l'extracteur automatique « roman de référence → VoiceGenome » (measureVoice existe, le flux complet non) + SAGA_CONTRACT pour l'interquel (le Story-State figé fin-de-tome-1 de la session 2026-06 en est la moitié).

## LES POTARDS — TABLE DE MIXAGE
| Source | Contenu | Statut |
|---|---|---|
| `GOVERNANCE/VISION_FINALE_SCELLEE.md:281` | « L'utilisateur peut ajuster des **potards** (tension, romance, mystère, violence, espoir) qui modifient la **trajectoire**, pas le texte directement » | **DÉCISION — ta formulation exacte est déjà scellée** |
| `GOVERNANCE/VISION_FINALE_SCELLEE.md:183` | Les 16 émotions canoniques avec physique M/λ/κ (AMOUR M=6.0 λ=0.10 κ=0.8 … DEUIL M=8.5 λ=0.03 κ=0.6) | DÉCISION |
| `ROADMAP/07_PHASES_6_TO_17_POST_V44.md:46` | `potards-engine` — « Sliders émotionnels » | SPEC_ONLY (❌ ABSENT) |
| `docs/irm/R4_ROSETTA_BRIDGE_REPORT.md:21` | Classification empirique : 7 features PILOTABLE par PROMPT_DIRECT | **CODÉ (Rosetta Bridge V5, compliance 100%)** |
| `docs/CLAUDE_OBSERVABLE_LAWS.md:114` | LOI L10 : f24e (CONTRASTE) = seule feature 100% pilotable | LOI OBSERVÉE |
| `docs/irm/09_LAW_REGISTRY_TOTAL.md:511` | C_MASTER : fonction de transfert Prose(consigne) avec attracteur A_Sonnet | SPEC (shadow) |
| `omega-autopsie/results_rosetta/s0/s02_bench_pilotables.json` | Bench réel des pilotables par style | DONNÉES |
| `apps/omega-ui/src/components/settings:12` | SliderSetting (composant settings générique) | CODÉ (pas un mixer) |
**État réel : la SCIENCE des potards est faite (Rosetta : ce qui est pilotable, ce qui est illusion — 38 lois) et la physique cible est scellée (16 émotions M/λ/κ). Le `potards-engine` lui-même = 0 code.** Vérité dure à respecter (acquis IRM) : seules ~7 features sont réellement pilotables par prompt — un potard honnête s'appuie sur Rosetta, pas sur du wishful prompting. Le sélecteur Best-of-N + gates C9 offrent le 2ᵉ levier (pousser « peur » = repondérer la sélection, pas coacher le Scribe — cohérent ADR-003 « CALC contrôle la SÉLECTION, pas la génération »).

## INTERFACES PROPOSÉES
| Source | Contenu | Statut |
|---|---|---|
| `GOVERNANCE/DECISIONS/DEC-20260121-001:200` | « PHASE 16 — UI COCKPIT + READER_MODEL / PHASE 17 — UI MYCELIUM / PHASE 18 — UI WRITING STUDIO » | **DÉCISION — 3 interfaces nommées et actées** |
| `apps/omega-ui/` | Frontend Tauri+React réel (DNA 128d, analyzer Emotion14, settings) — isolé du backend | CODÉ (non connecté) |
| `DEC-20260121-001:71,77` | READER_MODEL (profil lecteur cible) « avertit, ne décide pas » | DÉCISION |
| `SUPREME_ROADMAP v5.0 (museum):432` | « PHASE INTERFACE — UI AUTEUR », P2, prérequis Phase S SEALED | MUSEUM |
| Session save 2026-02-09 (museum):533 | « P2 Interface Auteur — UI qui remplit un IntentPack » | MUSEUM (= ton « remplissage de la bible » !) |
**État réel : 3 UI actées par décision + un frontend Tauri/React déjà codé mais orphelin. AUCUN mockup/wireframe dessiné trouvé** — les « interfaces proposées » sont des phases nommées avec rôles, pas des écrans.

---

## SYNTHÈSE STRATÉGIQUE (ce que la carte révèle)
1. **Rien n'est à inventer au niveau vision** : VISION_FINALE_SCELLEE + DEC-20260121-001 contiennent les 5 modes, les potards, les lois produit (« le GPS ne décide jamais », rights-gate machine-level) — il faut les RELIER à la fondation 2026-06, pas les re-concevoir.
2. **Ordre de proximité au réel** (effort restant croissant) : Mode 1 autonome (PROUVÉ) → Mode 3 réécriture (GO_B + C9 fait l'audit, V2.3 fait la chirurgie) → Mode 4 Mycelium (Genome scellé + structures Book-Factory à exporter) → Mode 5 style (VoiceGenome codé, extracteur à câbler) → Mode 2 GPS (radar fait via C9, trajectoires + UI à créer) → Potards (science faite, engine à créer sur le levier SÉLECTION).
3. **Les propositions BF-09..BF-15 de ChatGPT recoupent des décisions EXISTANTES** : BF-14 rights-mode ≈ VISION_FINALE:311 ; BF-11 souveraineté auteur ≈ « le GPS ne décide jamais » ; BF-10 traçabilité potards ≈ lois Rosetta. L'amendement CODEX doit CITER ces ancêtres (continuité, pas invention).
4. **Top 3 documents à relire avant tout chantier produit** : `GOVERNANCE/VISION_FINALE_SCELLEE.md`, `GOVERNANCE/DECISIONS/DEC-20260121-001_ARCHITECTURE_ORGANES.md`, `ROADMAP/07_PHASES_6_TO_17_POST_V44.md`.
