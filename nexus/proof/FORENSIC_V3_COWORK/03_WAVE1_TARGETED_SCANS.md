# FORENSIC V3 — COWORK — WAVE 1 : SCANS CIBLÉS (Bible Mesh / Marqueurs / Décisions multi-IA)

**Date** : 2026-06-06 · **Instrument** : IA Cowork (indépendant de Claude Code — ne pas fusionner avant comparaison) · **Mode** : READ-ONLY · **Statut** : WAVE 1 (phases 0-2 et 4-5 à suivre).
**Honnêteté** : synthèse de 3 fouilles agents + sondes directes ; chaque affirmation citée ; les claims non re-vérifiés ligne-à-ligne sont marqués `[À RE-VÉRIFIER]`. Une erreur d'agent déjà détectée (§E) — d'où l'importance du protocole de comparaison.

---

## A. BIBLIOTHÈQUES MULTIPLES + SOUS-AGENTS + AGENTS DORMANTS — VERDICT : **CODÉ (substrat) + DOCTRINE (BIB_)**

### A.1 Le substrat CODÉ des « agents dormants » = `gateway/src/memory/memory_layer_nasa/` (~34 fichiers, 139 tests, DO-178C)
| Geste de l'Architecte | Module codé | Preuve |
|---|---|---|
| agents dormants qui se réveillent quand trop d'info | **`memory_tiering.ts`** — CNC-054, auto-classement HOT/WARM/COLD par MetaEvents append-only, anti-boucle C05, rate-limit C11 | header lu (sonde directe) |
| délestage non destructif | **`memory_decay.ts`** — CNC-075, decay = MetaEvent append-only, jamais de suppression, projection déterministe | header lu (sonde directe) |
| compression quand ça déborde | **`memory_digest.ts` + `memory_digest_writer.ts`** — CNC-055/051, `DigestRule.apply()` PURE, même sources+règle → même résumé (`DIGEST_CHUNK`), sources triées déterministes | agent, fichiers cités |
| Bible jamais lourde / rapidité | **`memory_hybrid.ts`** — vue SHORT_TERM (HOT/WARM) vs LONG_TERM (COLD) = lazy loading ; **`memory_query.ts`** — réponses pures déterministes (`result_hash`) | agent |
| la bibliothèque autoritaire | **`memory_store.ts`** — append-only, index clé+version+hash, `verifyChain` | agent + lectures antérieures |

→ **Les « agents dormants » ne sont PAS des daemons séparés** : ce sont des machines à états DANS le memory_engine (tiering/decay/digest) — c'est la réalisation codée du concept. `NOT_FOUND` : daemon/worker/dispatcher autonomes (cherchés dans gateway/, packages/, docs/adr/).

### A.2 Les « bibliothèques » = l'essaim de paquets spécialisés (sous-agents répondeurs)
mycelium (validation), **mycelium-bio** (DNA + gematria + merkle, 62 fonctions), genome (fingerprint, FROZEN v1.2.0), **search** (BM25, 11 modules), signal-registry, omega-aggregate-dna, + ponts (bridge-ta-mycelium CERTIFIED). Chacun = API pure appelable (« répond aux appels »). Hiérarchie doctrinale : Sentinel → Genome → DNA/Mycelium (CLAUDE.md).

### A.3 La doctrine des 4 bibliothèques : **BIB_WORLD / BIB_CHARACTER / BIB_STYLE / BIB_PLOT**
`CODEX v1-3-3.md:1384` — statuts explicites PRÉSENTE/PARTIELLE/PRÉVUE/SIMULÉE. → le mapping BIB_↔modules réels reste à établir (wave 2).

### A.4 DÉCOUVERTE MAJEURE (sonde directe, vérifiée) : **`GOVERNANCE/DECISIONS/DEC-20260121-001_ARCHITECTURE_ORGANES.md` — 🔒 ACTÉ, 2026-01-21, participants Francky + Claude + ChatGPT.**
**10 organes actés**, dont :
- **`SENTINEL`** : « disposer de **sous-juges spécialisés** … formuler des **requêtes vers : snapshots, bibliothèque, lois V4.4, moteur émotion, mémoire** » → **les sous-agents répondant aux appels, ACTÉS**.
- **`QUANTUM_TRUTH_MANAGER` — Multi-Vérités** : « gérer plusieurs hypothèses/vérités compatibles simultanément … résoudre/fusionner » → **le module « quantum » de l'Architecte, ACTÉ** (corrige mon verdict antérieur « non trouvé » : il était hors de mes périmètres docs/ et *.ts).
- `NARRATIVE_FLOW_CONTROLLER` (branches mourantes/vivantes, bourgeons Mycelium), `INTENT_LAYER`, **`READER_MODEL`**, `STYLE_DEVIATION_MANAGER`, `EXECUTION_MODE`, `TOKEN_METER`, `PLUGIN_CONTRACT+NEXUS_DEP`, `SESSION_SAVE_RITUAL`. + OPTIONS REJETÉES + impacts roadmap.
**GOVERNANCE/ contient aussi** : RULES_OF_EXECUTION.md, VISION_FINALE_SCELLEE.md, sous-dossiers drift/incident/misuse/operations/override/regression/runtime/versioning → **corpus entier à intégrer au forensic (wave 2)**.

---

## B. MARQUEURS PERSONNAGE (identité unique + rappel automatique) — VERDICT : **IDENTITÉ partielle CODÉE ; AUTO-RECALL-sur-mention NON CODÉ**

### B.1 Identité stable existante (codée)
- `gateway/src/gates/canon_engine.ts` : `CanonFact.subject` + IDs uniques + `FactType CHARACTER` ; `gateway/src/gates/types.ts:80-99`.
- `canon-kernel` : `EntityId = ent_<sha256>` déterministe (`createDeterministicId`).
- **`mycelium-bio`** : `gematria.ts` (nom → empreinte numérique A=1..Z=26), `merkle.ts:96-161` (`computeNodeHash`, `computeMerkleRoot`) → **empreintes d'identité par nœud, CODÉES**.
- book-factory `story-state.ts` : Character{id,...} + state_hash.

### B.2 Le CHAÎNON MANQUANT (confirmé NOT_FOUND, deux fouilles indépendantes)
**Aucun mécanisme « mention → rappel automatique »** : pas d'EntityScanner/mention-detector, pas de résolveur d'alias/épithètes/pronoms, pas d'injection auto de l'état du perso quand son nom apparaît. (Cherché : `mention|alias|coreferen|auto.?recall|remontée|EntityScanner` dans packages/, gateway/, src/, search/.) `continuity-oracle` vérifie POST-hoc (DEAD_ACTS/LEAK) mais n'injecte pas.
→ Le **marqueur-déclencheur** (« derrière son nom un marqueur unique qui appelle automatiquement tout ») = **conçu (discussions) mais pas codé** — c'est LE vrai neuf, à inscrire dans l'ADR R2 (≈ Recall Bus + RecallPack + invariant « entité mentionnée sans rappel ⇒ candidat INVALID »).
Note : « lore-coding L3 » (sondé) = consignes comportementales sans chiffres dans les prompts (Loi L3) — PAS des marqueurs d'entité.

---

## C. DÉCISIONS MULTI-IA — REGISTRE (52+ décisions, extrait des plus pertinentes Book-Factory) `[détail complet → wave 2, fichier dédié]`
- **A1** BIB_ 4 bibliothèques (CODEX:1384) — DESIGNED. **A2** canon-kernel = SSOT (scellé, 284 tests). **A4** `SAGA_CONTRACT` inter-livres (MASTER_PLAN v2 §8.3) — DESIGNED `[À RE-VÉRIFIER ligne]`.
- **B5** routage ORACLE → THE_SKEPTIC / MUSE (CNC-100) — sous-agents juges.
- **F2/F3/F4** `CONTEXT_RESOLUTION` (désambiguïsation déterministe), **`ACTIVE_INVENTORY` (anti-cécité : objets/persos/fils en scène)**, `GARBAGE_COLLECTOR` (refs mortes, audit-safe) — MASTER_PLAN v2 §8.3, DESIGNED `[À RE-VÉRIFIER lignes]` → **très proches du besoin marqueurs/rappel**.
- **G1-G3** Contrat SCRIBE AVEUGLE (aucun état narratif dans le prompt Scribe ; OMEGA juge après), personas Flaubert+Proust+Duras, scoring dual GB V1 + Multi-Stage V2 + retry ≤3 (OMEGA_BLUEPRINT_JUGE_SCRIBE_v1 §B) — APPLIED.
- **E1-E3** SKEPTIC/TRUTH_GATE/CANON_ENGINE (CNC-100/200/201) — APPLIED (gateway, dormant).
- + gouvernance : 1000%, MUSEUM (EMP-15), statuts SEALED/PROPOSED, provenance des scores (DEC-014), Rosetta model-aware (DEC-20260604-021).

---

## D. CE QUE ÇA CHANGE POUR L'ADR R6 (R2, après forensic complet)
1. Le « Bible Mesh » des tribunaux **existe en substrat** : memory_layer_nasa (tiering/decay/digest/hybrid/query) + l'essaim de paquets = à ADAPTER, pas à créer.
2. Les organes ACTÉS (DEC-20260121-001) doivent être réintégrés : SENTINEL sous-juges, QUANTUM_TRUTH_MANAGER (multi-vérités ↔ nos rails truth/interpretation + branches), READER_MODEL (↔ readerState P0.6b), NARRATIVE_FLOW_CONTROLLER.
3. Le seul VRAI neuf confirmé deux fois : **mention→RecallPack automatique** (+ alias/pronoms) et le **diff Double-Bible** (extraction).
4. ACTIVE_INVENTORY/CONTEXT_RESOLUTION/GARBAGE_COLLECTOR/SAGA_CONTRACT (designs MASTER_PLAN) à mapper dans l'architecture R2.

## E. DISCORDANCES / À RE-VÉRIFIER (rigueur sur mes propres agents)
1. Agent-marqueurs a déclaré `CHARACTER_KNOWLEDGE_GRAPH_SPEC.md` NOT_FOUND **alors qu'il existe** (docs/architecture/book-factory/) et qu'il le cite ailleurs — erreur interne d'agent. → toute conclusion d'agent = piste, pas preuve (re-vérification ligne-à-ligne en wave 2).
2. Citations MASTER_PLAN v2 §8.3 (SAGA_CONTRACT/ACTIVE_INVENTORY/CONTEXT_RESOLUTION/GARBAGE_COLLECTOR) : doc MUSEUM (EMP-15 : non-source-of-truth-runtime) — à confirmer lignes + statut.
3. Mon propre périmètre antérieur avait un TROU : `GOVERNANCE/` (racine) non couvert par mes greps docs/+*.ts → cause du faux « quantum non trouvé ». Leçon intégrée au prompt Claude Code (périmètre TOTAL).

## F. SUITE (waves) + PROTOCOLE DE COMPARAISON
- Wave 2 : phases 0-2 (Authority Register, inventaire total incl. GOVERNANCE/, DNA modules) + re-vérification ligne-à-ligne des claims agents + registre décisions complet en fichier dédié + 03_MEMORY_RECALL_SCAN + 03_CANON_TRUTH_LINEAGE.
- Claude Code exécute la MÊME mission → `nexus/proof/FORENSIC_V3_CLAUDECODE/` (prompt : workspace OMEGA/outputs/PROMPT_CLAUDE_CODE_FORENSIC_V3.md). **Interdiction de lire les sorties de l'autre avant la fin.** Comparaison = diff des registres (convergences = solides ; divergences = à arbitrer source en main).

## VERDICT WAVE 1
- **Statut : PASS partiel (wave 1).** Confiance : Haute sur A.1/A.4/B (sondes directes) ; Moyenne sur C (claims agents non tous re-vérifiés, marqués).
- **Forces** : le substrat « agents dormants + bibliothèques » localisé CODÉ ; QUANTUM_TRUTH_MANAGER + 10 organes ACTÉS retrouvés à la source ; le vrai manquant (mention→recall) isolé et confirmé deux fois ; mes propres erreurs documentées (E).
- **Faiblesses** : périmètre wave 1 partiel (phases 0-2/4-5 restantes) ; claims agents à re-vérifier ; mapping BIB_↔modules non établi.
- **Action** : Architecte lance le prompt Claude Code ; je poursuis wave 2 ; comparaison ensuite. ZÉRO code.
