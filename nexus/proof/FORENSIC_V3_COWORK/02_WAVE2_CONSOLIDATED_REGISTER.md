# FORENSIC V3 — COWORK — WAVE 2 : REGISTRE CONSOLIDÉ (corpus intégraux : Blueprint Pack + IRM + GOVERNANCE + identité + masse docs)

**Date** : 2026-06-06 · **Instrument** : IA Cowork · **Écrit AVANT lecture de FORENSIC_V3_CLAUDECODE/** (indépendance). Sources : 5 fouilles agents corpus-complets + vérifications directes (greps marqués ✓DIRECT).

---

## A. BLUEPRINT PACK (nexus/blueprint/OMEGA_BLUEPRINT_PACK — généré 2026-02-05, commit 6595bc99) — LU INTÉGRALEMENT
- 33 modules (26 BUILD, 5 NEXUS, 2 TOOL), 292 fichiers source, DAG 4 couches, 0 violation. Roots : orchestrator-core (12 dépendants), canon-kernel, mycelium, shared. **FROZEN : genome, sentinel-judge** (RULE-FROZEN-MODULES).
- **Modules-clés pour la Bible Mesh** (rôles cités des module_cards) :
  - **atlas** (NEXUS) : « gestion de vues et requêtes » — AtlasStore/IndexManager/SubscriptionManager, non-actuating → **bibliothèque interrogeable**.
  - **ledger** (NEXUS) : « ledger d'événements » — append + **project(entityId) → état d'entité** → **registre d'état narratif par entité**.
  - **raw** (NEXUS) : stockage chiffré+compressé, FileBackend/MemoryBackend → **persistance d'état**.
  - **decision-engine** : classifier + **Sentinel** + escalation queue + decision trace (22 fichiers tests) → moteur de verdicts.
  - **oracle** (package) : cache + streaming + prompts d'analyse. **search** : BM25 complet. **mycelium-bio** : DNA + **detectMarkers** + gematria + merkle + BioEngine (L-Systems).
  - **truth-gate** : 7 validateurs (CanonSchema, EmotionSSoT, HashChain, NarrativeDriftToxicity, NoMagicNumbers, PolicyLock, RailSeparation).
- Fichiers annexes : BLUEPRINT_INDEX.json, layering_report.json, invariants_map.json, types/functions/tests_map.json, 36 api_surface.json, 33 metrics.json, 16 graphes mermaid.

## B. IRM (docs/irm — 43 fichiers) — LU INTÉGRALEMENT
- **07_MODULE_LIFECYCLE_REGISTRY.json** : table complète. DEAD (C0) : src assembly/, exemplar/, filter/, gates/, orchestrator/, genius/ (île 13 fichiers). ZOMBIE : polish/ (désactivé, delta 0.0), oracle/s-score.ts (@deprecated). **mod-narrative = PHANTOM C0** (pas de tests/tsconfig) ⚠ diverge du blueprint 2026-02 (INVENTORIED) — le blueprint est un SNAPSHOT de février, l'IRM est plus récent → IRM fait foi.
- **inv/P1_GATEWAY_FULL_SCAN.md** : gateway = **SEALED FOUNDATION, couplage sovereign-engine = ZÉRO, consommateurs externes = ZÉRO** ; « Safe for Phase V governance + **world model** when needed ». 3 couches : **memory_layer_nasa** (18 fichiers, ~273 tests, SEALED Phases 8→10D : engine/store/tiering/decay/query/hash/index/snapshot/hybrid/digest/digest_writer/canonical_encode/canonical_key/digest_rules) ; **creation_layer_nasa** (8 fichiers SEALED Phase 9 : creation_engine **retourne PROPOSAL, n'écrit jamais**, template_registry, artifact_builder, snapshot_context read-only deep-freeze) ; **gates** (canon_engine 7B, truth_gate 7A, emotion_gate 7C Plutchik, ripple_engine 7D, ~97 tests).
- **11_PIPELINE_ATLAS_TOTAL.md** : pipeline LIVE 16 étapes + 7 gates d'échec (CV_GATE 1.05/2.50, CLIFF>0.30 guillotine, Damage, P5 patch) ; ~30-35 appels LLM/run (1:5 productif:compensatoire). Pipelines B OFFLINE, C genesis-v2 env-gated, D CDE.
- **09_LAW_REGISTRY_TOTAL.md** : 38 lois (30 SEALED) — L37/L35/L35b (sub→f26b→Tier), BB-01 (semicolons 13% non pilotables), BB-02 (plancher 35w), M1 (cliff naturel 0.50), L06 (composite stable/features instables), C_MASTER (fonction de transfert).
- **13_DUPLICATION_AND_CANCER** : DUP-01 SAGA_READY 92.0 dupliqué engine.ts:198/549 vs SSOT thresholds.ts:34 (HIGH) ; magic 1.5 floorPenalty duel-engine.ts:137 ; TM-01/02 tokens morts (cibles <35w).

## C. GOVERNANCE/ — LU INTÉGRALEMENT
- **VISION_FINALE_SCELLEE.md v1.0** (SHA-256 6ee3eb0a…) : OMEGA = « système bio-informatique de traduction émotionnelle » ; 60% émotion/25% logique/15% style ; axes X (valence), Y (intensité), **Z (persistance) = cœur nucléaire** Z(t)=Y₀·e^(−λt) ; **6 lois gravées** (inertie, dissipation, faisabilité, décroissance organique = LOI CENTRALE, conservation du flux, synthèse affective) ; **16 émotions canoniques** avec masse M et λ (DEUIL M=8.5 λ=0.03 → SURPRISE M=1.5 λ=0.80) ; **Mycelium = ADN émotionnel d'une œuvre** ; clause légale (génération bloquée machine-level sans droits) ; **liste des morts : Plutchik-8, 4-émotions, vecteurs statiques** ⚠ tension connue avec emotion_gate (Plutchik, Phase 7C) et Emotion14 (Plutchik8+OMEGA6) → recoupe NCR_EMOTION14_CANON_DRIFT (2026-05-05). INALTÉRABLE, évolution = v2.0+.
- **RULES_OF_EXECUTION.md** : toute décision = fichier repo ; statuts ❌ABSENT/📦PRÉSENT/🧪COUVERT/🔒PROUVÉ ; interdits permanents (pas de refactor non demandé, pas de résurrection Plutchik…) ; autorité Francky→Claude→consultants.
- **DEC-20260121-001** (🔒 ACTÉ, Francky+Claude+ChatGPT) : 10 organes (détaillés wave 1) + options rejetées (Reader Model autoritaire ; OMEGA interdit le mauvais style ; modules non-plug-in) + **roadmap phases 0-19** : SENTINEL Ph.6, INTENT Ph.7, MYCELIUM+FLOW Ph.8, GPS+**QUANTUM_TRUTH** Ph.9, **MEMORY & CANON Ph.10**, GENESIS Ph.11, SCRIBE Ph.12, POLISH+STYLE_DEV Ph.13, READER_MODEL Ph.16.
- **Phases D-J implémentées** (non-actuating) : runtime (RUNTIME_EVENT, GOVERNANCE_LOG append-only, baseline figée 22b96d37), drift (8 détecteurs D-S/O/F/T/P/V/TL/C purs), incident (10 INV, post-mortem no-blame), override (5 conditions, 3 types 7/30/90j, no-cascade), regression (waivers signés), versioning (VER-001..005). Escalade : PRODUCT_DRIFT <15min, INCIDENT immédiat.
- **Cross-ref organes** : SESSION_SAVE_RITUAL = implémenté (DECISIONS/ existe) ; Phases D-J = codées ; les 8 autres organes = DESIGNED-only (phases 6+ jamais atteintes sous cette forme — le projet a pivoté vers la métrologie/sovereign).

## D. IDENTITÉ STABLE (question Tribunal : l'ID survit-il au renommage ?) — VERDICT : **NON, AUCUN MÉCANISME**
| Mécanisme | ID = f(quoi) | Rename-stable ? |
|---|---|---|
| gematria (mycelium-bio gematria.ts:28-45) | lettres du NOM (A=1..Z=26) | **NON** |
| MyceliumNode.nodeHash (merkle.ts:96-100) | gematriaSum + contenu | **NON** |
| canon-kernel `ent_` (id/factory.ts:41-61) | sha256(seed:namespace:**payload**) — payload contient name | **NON** (si name dans payload) |
| gateway FACT-id (canon_engine.ts:176-179) | `FACT-${Date.now()}-${Math.random()}` | **NON-DÉTERMINISTE** (⚠ surprise : pas content-based du tout) |
| genesis CanonEntry.id (types.ts:31) | string libre, dérivation NON SPÉCIFIÉE (validator : unicité seulement) | INDÉTERMINÉ |
| ledger project(entityId) (entityStore.ts:9-40) | event.payload['id'] | hérite de l'amont |
| atlas/search | clés opaques externes | hérite de l'amont |
- **Zéro machinerie d'alias/rename/aka/épithète** dans tout le repo (cherché packages/, gateway/, docs/).
- **Pièce manquante exacte** (pour les marqueurs Francky) : un **CharacterRegistry mint-once** (ID immuable frappé une fois, jamais dérivé du nom) + **projection d'alias** (id → {nom_courant, aliases[], renamed_at[]}) + pivot de tous les canons sur l'ID, pas le nom. La réponse à Gemini : **mycelium-bio ne peut PAS servir tel quel** (gematria = f(nom)).

## E. MASSE DOCS + MUSEUM — LU
- **docs/concepts/ = 8 CNC seulement** : CNC-100..103 (SKEPTIC impl., STYLE_LIVING_SIGNATURE design, OMEGA_PRAXIS, BRIDGE_SYSTEM design), CNC-200..203 (TRUTH_GATE, CANON_ENGINE, EMOTION_GATE, RIPPLE_ENGINE — implémentés gateway). ⚠ **Les CNC-051/054/055/075/300 cités dans les headers de memory_layer_nasa n'ont PAS de fiche dans docs/concepts** — numéros de concepts vivant uniquement dans le code (déclaré explicitement).
- **OMEGA_MASTER_PLAN_v2.md §8 (MUSEUM) — lignes VÉRIFIÉES ✓DIRECT (greps 822-828)** : **Level 2 MEMORY** : CANON, INTENT_LOCK (marqueurs d'intention immuables !), MEMORY_HYBRID, MEMORY_TIERING:822, MEMORY_DIGEST:823, CONTEXT_RESOLUTION:824, ACTIVE_INVENTORY:825 (anti-cécité), COST_LEDGER:826, SAGA_CONTRACT:827, GARBAGE_COLLECTOR:828 — tous 📋 SPÉCIFIÉ. **Level 3 DECISION** : ORACLE/MUSE/THE_SKEPTIC. **Level 4 CREATION** : GENESIS/SCRIBE/MIMESIS+/POLISH.
- **🔑 LIGNAGE ROSETTA (découverte de synthèse)** : le §8.3 Level 2 MEMORY du MASTER_PLAN (spec) **A ÉTÉ IMPLÉMENTÉ** dans gateway : MEMORY_HYBRID→memory_hybrid.ts, MEMORY_TIERING→memory_tiering.ts, MEMORY_DIGEST→memory_digest.ts (SEALED Phase 8), CANON→canon_engine (Phase 7B) ; le Level 3 DECISION partiellement (THE_SKEPTIC→profiles.ts) ; le Level 4 vit aujourd'hui dans genesis-planner/scribe-engine. **Restés spec-only : INTENT_LOCK, CONTEXT_RESOLUTION, ACTIVE_INVENTORY, COST_LEDGER, SAGA_CONTRACT, GARBAGE_COLLECTOR, MUSE, MIMESIS+.** → Le MASTER_PLAN v2 §8 est la pierre de Rosette entre les concepts de l'Architecte et le code.
- **OMEGA_MASTER_KNOWLEDGE_BASE.md** : 3 lignes produit (OMEGA V4.4 GOLD MASTER scellé / Core v3.17.0 / GENESIS FORGE v1.2.1).
- **CONTRAT_OMEGA_SCRIBE_v1.md R1-R7** : Scribe aveugle (jamais le Canon brut dans le prompt, dettes narratives jamais exposées, vérif = gate POST-génération, R7 : la plume jamais sacrifiée à la cohérence dans le prompt).
- **MUSEUM_CATALOG.md** : vague 1 movée (deposit 178 docs, master plans, codex legacy) ; vague 2 registered-not-moved (src_code 174 .ts, omega-autopsie 3.6GB, genius-integration PATCH_STAGED).
- **OMEGA_CARTE_REPO_v1.md:~112 ✓** : `gateway/src/memory/ [ACTIF — World Model]` — claim doc à confronter au code (importeurs) en comparaison.

## F. SYNTHÈSE BIB_ ↔ RÉEL (mapping demandé par le Tribunal)
| BIB_ (Codex C4:1384) | Substrat le plus proche | Statut |
|---|---|---|
| BIB_WORLD | memory_layer_nasa (store+query) + ledger/atlas + ripple | CODÉ dormant, jamais câblé génération |
| BIB_CHARACTER | CanonFact CHARACTER + CKG spec (book-factory) + ledger.project(entityId) | PARTIEL (identité non rename-stable, pas d'auto-recall) |
| BIB_STYLE | voice/voice-genome.ts (V1 frozen, V2), personas, style-emergence-engine | CODÉ côté sovereign |
| BIB_PLOT | genesis-planner (beats/arcs) + story-state (book-factory) | CODÉ récent/partiel |

## VERDICT WAVE 2 (instrument Cowork)
- **Statut : PASS.** Confiance : Haute (corpus intégraux lus, claims porteurs re-vérifiés ✓DIRECT, erreurs d'agents wave 1 corrigées).
- **Forces** : lignage MASTER_PLAN §8 → gateway établi (la Rosette) ; verdict identité tranché avec mécanisme exact manquant ; GOVERNANCE intégral ; 38 lois + lifecycle complet.
- **Faiblesses** : (1) call-graph runtime exhaustif non re-déduit par moi (je m'appuie sur IRM P1_GATEWAY « zéro couplage » — recoupé mais pas re-calculé) ; (2) CNC-05x sans fiches = trou documentaire à signaler, pas comblé.
- **Suite** : comparaison avec FORENSIC_V3_CLAUDECODE/ (fichier séparé), puis ADR R6 R2 par l'Architecte+IA.
