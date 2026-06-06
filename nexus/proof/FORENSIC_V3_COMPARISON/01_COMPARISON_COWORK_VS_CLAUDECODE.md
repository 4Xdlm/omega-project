# FORENSIC V3 — COMPARAISON DES DEUX INSTRUMENTS (Cowork vs Claude Code)

**Date** : 2026-06-06 · **Méthode** : fouilles indépendantes (aucun instrument n'a lu l'autre avant la fin) ; cette comparaison est rédigée par Cowork APRÈS clôture de ses registres (02_WAVE2 écrit avant lecture de FORENSIC_V3_CLAUDECODE/). Claims porteurs de Claude Code re-vérifiés par greps Cowork (marqués ✓✓ = vérifié par les DEUX instruments).
**Sources** : FORENSIC_V3_COWORK/ (03_WAVE1, 02_WAVE2) vs FORENSIC_V3_CLAUDECODE/ (23 livrables ; lus : 00_VERIFICATION_LOG, 05_REUSE_ADAPT_CREATE_DECISION_TABLE + résumé de mission).

---

## 1. CONVERGENCES (les deux instruments, indépendamment → SOLIDE, base de l'ADR R2)
| # | Vérité convergente | Preuve CC | Preuve Cowork |
|---|---|---|---|
| C1 | **Auto-recall sur mention = NON CODÉ** → seul vrai CREATE (avec Double-Bible) | V3, V6 (0 hit auto-recall ; orchestrator sans adapter) | B.2 wave1 (2 fouilles : zéro EntityScanner/alias/injection) |
| C2 | **Double-Bible + extracteur par passes = NON CODÉ** → CREATE | table #13/#14 (DEC-021 PROPOSED, zéro code) | wave1 D.3 |
| C3 | **memory_layer_nasa = codé, certifié, ORPHELIN** ; le délestage (tiering/decay/digest/hybrid) **n'est même pas exporté de index.ts** | V1, V2 | ✓✓ greps Cowork 2026-06-06 : index.ts sans tiering/decay/digest ; zéro import gateway depuis packages/** |
| C4 | **BIB_WORLD/CHARACTER/STYLE/PLOT = doctrine pure** (unique occurrence Codex:1384), substrats éclatés existants | V4 | A.3 wave1 + mapping F wave2 |
| C5 | **canon-kernel = seule épine canon vivante consommée** (via book-factory) ; canon_engine gateway = ORPHAN→MUSEUM | table #1, #20 + V5 (NCR_CANON_ENGINE_JUNCTION_ORPHAN existante) | CANON_TRUTH_CONSOLIDATION_DECISION + registre wave2 |
| C6 | **SKEPTIC + gates sovereign (microsurgery/oracle/temporal/silence) = dormants → ADAPT** | table #8, #9 | blueprint+IRM registers (profiles.ts impl., lifecycle LIVE-mais-OFF-path) |
| C7 | **Aucun panel littéral « 6 IA » documenté** — max scellé = 4/4 (tribunaux 2-3-4 IA tracés) | 03_DECISIONS (8 thèmes) | registre 52+ décisions (3-IA/4-IA) — la mémoire « 6 IA + moi » de l'Architecte compte probablement les rôles cumulés sur plusieurs sessions ; à confirmer par lui |
| C8 | **N3 coaching esthétique sur score = INTERDIT** (Goodhart, Mode C, DEC-007 D4) | table #26 | ADR-003 + DEC-021 §7 |
| C9 | book-orchestrator (mon propre code) n'instancie pas l'adaptateur épistémique en boucle réelle | V3 | limite documentée P1.C (LEAK/REQUIREMENT skip si adapter absent) — convergent |

## 2. CE QUE CHAQUE INSTRUMENT A TROUVÉ SEUL (complémentarité = la valeur de ta méthode)
### Trouvé par CLAUDE CODE seul (à intégrer chez moi) :
- **CC-1** : le délestage **non exporté de l'API publique** (V2) — nuance que ma wave 1 avait ratée ; re-vérifiée ✓✓.
- **CC-2** : **le moteur qui tourne réellement en juin 2026 = Python** (scripts/metrology sur gemma4+bge-m3) ; sovereign-engine = buildable OFF-path ; **src/runner = mock** (PASS systématique — corroboré par mon grep). ⚠ Corrige la lecture de mon registre IRM : le « pipeline LIVE 16 étapes » était LIVE à l'ère IRM (avril), il est OFF-path AUJOURD'HUI.
- **CC-3** : **≥8 stores de faits** (dont canon-stores PHASE18/20 que je n'avais pas) ; NCR_CANON_ENGINE_JUNCTION_ORPHAN déjà existante.
- **CC-4** : decision-engine = ORPHAN total (0 importeur) → leur MUSEUM/IGNORE l'emporte sur ma fiche blueprint (le blueprint 2026-02 décrit le design, pas le câblage actuel).
### Trouvé par COWORK seul (à intégrer chez eux) :
- **CW-1** : **GOVERNANCE/ intégral** — `DEC-20260121-001_ARCHITECTURE_ORGANES` 🔒 ACTÉ (10 organes : **QUANTUM_TRUTH_MANAGER multi-vérités**, SENTINEL à sous-juges interrogeant « bibliothèque/mémoire/snapshots », READER_MODEL, INTENT_LAYER, NARRATIVE_FLOW_CONTROLLER, EXECUTION_MODE OFF/SEMI/BOOST, TOKEN_METER, PLUGIN_CONTRACT, SESSION_SAVE_RITUAL) + **VISION_FINALE_SCELLEE v1.0** (physique émotionnelle V4.4 : X/Y/Z, 6 lois gravées, 16 émotions M+λ, Mycelium=ADN émotionnel, sceau SHA-256) + phases gouvernance D-J codées (drift 8 détecteurs, incident, override, regression, versioning). *(À croiser avec leur 03_DECISIONS — non lu en détail ; si absent chez eux, c'est ma contribution majeure.)*
- **CW-2** : **la pierre de Rosette MASTER_PLAN v2 §8.3** (lignes vérifiées 822-828) : Level 2 MEMORY spec → **implémenté** dans gateway (MEMORY_HYBRID→memory_hybrid.ts, TIERING→memory_tiering.ts, DIGEST→memory_digest.ts, CANON→canon_engine) ; **restés spec-only : INTENT_LOCK, CONTEXT_RESOLUTION, ACTIVE_INVENTORY (anti-cécité), COST_LEDGER, SAGA_CONTRACT, GARBAGE_COLLECTOR, MUSE, MIMESIS+** → vocabulaire conceptuel de l'Architecte ↔ code, et liste exacte de ce qui manque.
- **CW-3** : **verdict identité formel** : AUCUN mécanisme ne survit au renommage (gematria=f(nom) ; nodeHash=f(gematria+contenu) ; `ent_`=f(payload incluant name) ; FACT-id gateway = **timestamp+random, même pas déterministe** (canon_engine.ts:176-179) ; zéro machinerie d'alias dans tout le repo). → **Raffine leur ligne #11** : « EXTEND base entityId » est INSUFFISANT tel quel — l'extension DOIT être un **registre mint-once** (ID frappé une fois, jamais dérivé du nom) + **projection d'alias** (id→{nom_courant, aliases[], renamed_at[]}), sinon tout renommage de personnage casse l'identité. Réponse ferme à la question Gemini : mycelium-bio NE PEUT PAS servir tel quel.
- **CW-4** : corpus intégraux blueprint pack (33 module_cards, layering, FROZEN genome+sentinel-judge) + IRM 43 fichiers (38 lois, lifecycle complet, DUP-01 SAGA_READY, gateway scan) + 8 CNC seulement dans docs/concepts (les CNC-05x des headers memory = sans fiches).

## 3. DIVERGENCES À ARBITRER (Architecte)
| # | Sujet | Position CC | Position Cowork | Enjeu |
|---|---|---|---|---|
| D1 | Tiering/decay/digest (délestage) | #17 « EXTEND-si-scale, sinon IGNORE-pour-l'instant » | substrat DIRECT de ta doctrine « Bible jamais lourde » → ADAPT dès la conception (même si 60k mots ne saturent pas, la vitesse de recall en dépend) | dimensionnement : réactiver le World Model via ACL maintenant ou plus tard |
| D2 | decision-engine | MUSEUM/IGNORE (0 importeur) | design de valeur (Sentinel/escalade/trace) — d'accord pour ne pas câbler, mais à garder comme RÉFÉRENCE de conception des verdicts | statut MUSEUM vs RÉFÉRENCE |
| D3 | Ligne #11 identité | EXTEND base entityId | EXTEND **uniquement** en mint-once+alias (l'entityId actuel = f(nom) = piège) | spec exacte du CharacterRegistry |
| D4 | Organes ACTÉS (QUANTUM, READER_MODEL, INTENT_LAYER…) | (à confirmer dans leur 03) | doivent figurer comme INTRANTS NOMMÉS de l'ADR R2 (QUANTUM↔rails+branches ; READER_MODEL↔readerState P0.6b ; INTENT_LAYER↔BookIntent ; SENTINEL sous-juges↔jury de gates) | continuité conceptuelle 4000h |
| D5 | « 6 IA » | non attesté littéralement | idem — max 4/4 documenté | l'Architecte confirme s'il manque des archives de sessions externes (ChatGPT/Gemini privées) |

## 4. CONSOLIDATION PROPOSÉE (pour l'ADR R6 R2 — décision Architecte)
- **REUSE** : canon-kernel, story-state, context-manager, continuity-oracle, forge Python (N1), repeat-forensic.
- **ADAPT** : book-canon-adapter (CÂBLER dans la boucle — V3), SKEPTIC via ACL, gates sovereign (G1/G2/G7/G8), memory_layer_nasa via ACL (D1 à arbitrer : Cowork recommande dès maintenant pour le Recall Bus), integration-nexus-dep router si dispatch requis.
- **EXTEND** : CharacterRegistry **mint-once + alias** (D3 — spec CKG + EntityId comme base, PAS comme mécanisme), CKG sur rails, R6 loop sur book-orchestrator, jury mono-juge gemma4 (EMP-19).
- **CREATE** (le seul vrai neuf, confirmé 2 instruments) : **(a) Recall Bus mention→RecallPack** (avec invariant « entité mentionnée sans RecallPack ⇒ candidat INVALID »), **(b) Double-Bible + extracteur par passes + diff** (+ carte). 
- **MUSEUM** (jamais muter, GO Architecte requis) : canon_engine gateway, canon-stores PHASE18/20, decision-engine (D2), runner mock.
- **INTRANTS doctrine R2** : organes DEC-20260121-001 (D4), specs §8.3 jamais codées (INTENT_LOCK, ACTIVE_INVENTORY, CONTEXT_RESOLUTION, SAGA_CONTRACT, GARBAGE_COLLECTOR, COST_LEDGER), contrat SCRIBE R1-R7 (Scribe aveugle), VISION V4.4 (tension Emotion14/Plutchik à traiter via NCR existante).

## VERDICT COMPARAISON
- **Statut : PASS.** Confiance : Haute sur les convergences (C1-C9, dont 3 re-vérifiées ✓✓) ; Moyenne sur CW-1-vs-leur-03 (croisement à finir).
- **Forces** : zéro contradiction frontale entre instruments ; complémentarité forte (CC = runtime/câblage ; Cowork = doctrine/lignage/GOVERNANCE) ; le périmètre du « vrai neuf » est maintenant prouvé deux fois et il est PETIT (2 capacités).
- **Faiblesses** : (1) je n'ai pas lu les 23 livrables CC en intégralité (lus : verification log + decision table + résumé) — le croisement fin de 03_DECISIONS_6IA des deux côtés reste à faire ; (2) D1-D5 ouverts.
- **Action requise** : arbitrages Architecte D1-D5, puis réécriture ADR R6 **R2** sur cette base consolidée. ZÉRO code d'ici là.
