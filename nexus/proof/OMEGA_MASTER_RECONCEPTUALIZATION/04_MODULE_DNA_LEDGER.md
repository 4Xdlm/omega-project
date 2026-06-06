# 04_MODULE_DNA_LEDGER — statut RÉEL de chaque module (jamais confondre spec/codé/branché)
**Statuts : ACTIVE_RUNTIME (branché, tourne) · CODED_NOT_WIRED · BENCH_ONLY · DORMANT/ORPHAN · FROZEN/SEALED (intouchable) · SPEC_ONLY · MUSEUM · PHANTOM. Consommateurs = qui l'importe RÉELLEMENT.**

| Module | Chemin | Rôle | Statut | Tests | Concepts |
|---|---|---|---|---|---|
| canon-kernel | packages/canon-kernel | Épine canonique : rails, tx, PROMOTE, ids déterministes, sha256 | **ACTIVE_RUNTIME** (consommé par book-factory) | 67 | BIBLE-MESH, QUANTUM(rails) |
| truth-gate | packages/truth-gate | Gate de vérité | ACTIVE_RUNTIME | 217 | R6 |
| book-factory | packages/book-factory | TOUT le pipeline livre : identity/recall/acl/extraction/loop/coherence/c7 | **ACTIVE_RUNTIME** (le chantier vivant) | 167 | AUTONOMOUS-BOOK, R6, DOUBLE-BIBLE, SKEPTIC(C9) |
| · identity/ | …/src/identity | CharacterRegistry mint-once, alias, P5 | ACTIVE_RUNTIME | 28 | CHARACTER-REGISTRY |
| · recall/ | …/src/recall | Scanner, RecallPack borné, INV-RECALL-001 | ACTIVE_RUNTIME | ✓ | RECALL-BUS |
| · acl/ | …/src/acl | Port read-only memory_layer (D1) | ACTIVE_RUNTIME | ✓ | WORLD-MODEL |
| · extraction/ | …/src/extraction | Passes CALC + diffBibles + MapProjection | ACTIVE_RUNTIME | ✓ | DOUBLE-BIBLE |
| · loop/ | …/src/loop | r6-core N=7, préséance, n2-retry, judge-port, extender, repeat | ACTIVE_RUNTIME | ✓ | R6, JUDGE-CALIBRATION |
| · coherence/ | …/src/coherence | C9 : phrase/chapitre/arc + tics (ADVISORY) | ACTIVE_RUNTIME | 22 | SKEPTIC incarné |
| · c7/ | …/src/c7 | Runners : livre, calibration, audits, reselect | BENCH_ONLY (scripts) | — | — |
| scribe-engine | packages/scribe-engine | runScribe weave DÉTERMINISTE ; weaveLLM NON câblé (NCR-M0B OPEN) | CODED_NOT_WIRED (LLM path) | ✓ | SCRIBE |
| sovereign-engine | packages/sovereign-engine | Moteur V1 scellé : oracle 5 axes, K2, duel, gates, voice | ACTIVE (hors chemin book-factory ; V1 SEALED) | 2245+ | ORACLE, VOICE-GENOME |
| · voice/ | …/src/voice | VoiceGenome 10p + compiler | CODED_NOT_WIRED (pas dans R6 actuel) | ✓ | STYLE-CONTINUATION |
| genome | packages/genome | Fingerprint narratif SHA-256, Emotion14 | **SEALED** (client) | 109 | MYCELIUM-DNA |
| mycelium | packages/mycelium | Gardien validation entrée DNA | **FROZEN** | 97 | MYCELIUM-DNA |
| gateway/sentinel | gateway/ | World Model NASA (tiering/decay/digest) | **FROZEN + ORPHAN** (pré-ESM, zéro importeur — servi via ACL) | certifiés | WORLD-MODEL |
| memory_layer_nasa | (dans gateway) | cf. ci-dessus | ORPHAN→ACL | — | WORLD-MODEL, MEMORY-LAYER |
| creation-pipeline | packages/creation-pipeline | Pipeline génération hérité | DORMANT (sondé P2.B) | — | — |
| story-state (bf) | book-factory/src/story-state.ts | Bible=PROJECTION (folds), payoff_graph | ACTIVE_RUNTIME | 8 | BIBLE, NARRATIVE-FLOW(capteur) |
| continuity-oracle | book-factory/src | Gate inter-chapitres | ACTIVE_RUNTIME | 8 | GPS(radar) |
| context-manager | packages/context-manager | Contexte hérité | DORMANT | — | — |
| rosetta (scripts) | scripts/metrology + docs/irm | Lois littéraires, bridge pilotables | BENCH_ONLY (lois scellées) | — | ROSETTA, MIXER |
| rewritePrompt V2.3 | src/chunking/rewritePrompt.ts | rewrite\|expand + EmotionContract | CODED_NOT_WIRED (pas d'orchestrateur doctor) | bench | REWRITE-DOCTOR |
| omega-ui | apps/omega-ui | Tauri+React : DNA 128d, analyzer, sliders | CODED **ISOLÉ** (zéro lien backend) | ✓ | UI, MYCELIUM-DNA |
| omega-segment-engine | packages/omega-segment-engine | Canonical & segmentation | ACTIVE (hérité) | ✓ | — |
| integration-nexus-dep | packages/integration-nexus-dep | Bus/normalisation IO | DORMANT (existe) | — | PLUGIN_CONTRACT |
| decision-engine | (muséé) | — | **MUSEUM-RÉFÉRENCE** (D2 signé) | — | — |
| Genius Engine / CI_L37 / Language Profiles / Polish | — | — | **REJETÉS** (ne pas utiliser) | — | — |
| potards-engine / gps-narratif-core / trajectory-predictor | nommés ROADMAP ph.7 | — | **PHANTOM (0 code)** | — | MIXER, GPS |
| MIMESIS+ / SAGA_CONTRACT / THE_SKEPTIC(spec) / READER_MODEL / QUANTUM_TRUTH / TOKEN_METER / INTENT_LOCK / ACTIVE_INVENTORY / COST_LEDGER / GARBAGE_COLLECTOR / CONTEXT_RESOLUTION | MASTER_PLAN v2 §8.3 + DEC-20260121 | organes OMEGA 2.0 | **SPEC_ONLY/DÉCISION** (THE_SKEPTIC incarné par C9 ; READER_MODEL premier pas via persona-juge) | — | divers |
| MUSE | src/oracle/muse | Créativité (déblocage) | PARTIELLEMENT CODÉ (forensic) | — | GPS(relances) |

**Doublons/conflits connus** : extraction épistémique ↔ adapter JTB (séparés volontairement) ; persona-lecteur (juge) ≠ READER_MODEL complet (ne pas confondre) ; dna.ts (UI) ≠ genome (backend) — 2 implémentations à réconcilier en C12.
