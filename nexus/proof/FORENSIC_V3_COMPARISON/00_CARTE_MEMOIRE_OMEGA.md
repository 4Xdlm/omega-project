# 🗺 CARTE MÉMOIRE OMEGA — POINT D'ENTRÉE DE REPRISE (2026-06-06)

**But** : reprendre le projet en 10 minutes au lieu de 3 heures, dans 15 jours comme dans 6 mois. **Ce fichier dit OÙ est chaque vérité et QUOI faire ensuite.** Mis à jour à chaque jalon (dernier : closeout Forensic V3).

---

## 1. ÉTAT EN UNE PHRASE
Le moteur V1 métrologie est scellé ; le socle Book-Factory (CALC + génération gemma4 réelle) est prouvé (46 tests + 30 chapitres) ; le **Forensic V3 est CLOS** (2 instruments indépendants convergents) ; **D1-D5 sont SIGNÉS** ; l'**ADR R2 EST RÉDIGÉE** (`docs/architecture/DEC-20260606-021-R2-SCRIBE-R6-WRITER-LOOP-ON-EXISTING-OMEGA-FOUNDATION.md`, 2026-06-06) avec son compagnon **MEGA-ROADMAP C0→C7** (`docs/architecture/book-factory/MEGA_ROADMAP_C0_C7_R6_SOUVERAIN_v1.md`, code exemplaire BF-08 par phase, ~51h estimées C1-C6) — **SIGNÉE A le 2026-06-06** (C0_ARCHITECT_SIGNATURE_AND_SCOPE_LOCK.md ; réserve : N2 → ratification 3-IA, dossier N2_RATIFICATION_DOSSIER_3IA.md OPEN). **C0 SCELLÉ** (scope-lock + MUSEUM_MARKING_REGISTER doc-only + dossier N2). **C1 CharacterRegistry : PASS SCELLÉ 2026-06-06** — `packages/book-factory/src/identity/` (4 fichiers BF-08 : mint par NONCE, journal append-only, Resolution 5 cas, compareStrings cross-machine) + 28 tests (9 INV 1:1, 7 adversariaux ADR, property ×50 + **P5 anti-contamination inter-livres**) ; 74/74 ×2, tsc 0, non-régression 358 verts ; revue adverse hostile → **P0 localeCompare attrapé AVANT commit et corrigé** ; evidence `nexus/proof/C1_CHARACTER_REGISTRY_EVIDENCE/`. **CHAÎNE C2→C6 : PASS SCELLÉE 2026-06-06** (GO autonomie) — Recall Bus (BF-02 double filet), MemoryLayerACL (read-only par absence ; **découverte : gateway pré-ESM = cause mécanique du zéro-importeur** ; câblage direct=C3-W1 gaté), Double-Bible (catalogue de fautes 100% attrapé, FORBID-011), R6-Lite (N=3, FORBID-007), R6-Core (N=7, préséance, **INV-REPLAY-BOOK-001 + détection de falsification**, FORBID-006 audité, N2 absent — ratification pendante). **Preuves : tsc 0 · 118/118 ×2 · 402 verts zéro régression** · evidence `nexus/proof/C2_C6_R6_CHAIN_EVIDENCE/`. 2 revues adverses SOUND (5 correctifs appliqués dont localeCompare historique de story-state). **C7 EXÉCUTÉ (GO 2026-06-06)** : ⚠ gemma4 DÉSINSTALLÉ (NCR_GEMMA4_ABSENT_JUDGE_GAP) ; bench réel 3 chap PASS-mécanique (12 générations qwen3.5, 3/3 éligibles ×3, zéro violation) ; calibration couple candidat {qwen3.5+persona} : acc 0.833, bias 0.000 → PROPOSED ; **livre 30 chap N=7 détaché** (`packages/book-factory/runs/c7_book/` — MANUSCRIT.md incrémental, admissions rejouables, 7 candidats/chap). Evidence : `nexus/proof/C7_LIVE_RUN_EVIDENCE/`. **SUITE : commits Architecte (C0→C7) → décision NCR gemma → ratif N2 → revue bench/manuscrit → C8/V2.**

## 2. OÙ EST QUOI (tout est dans `C:\Users\elric\omega-project\`)
| Vérité | Emplacement |
|---|---|
| **Closeout + arbitrages signés** | `nexus/proof/FORENSIC_V3_COMPARISON/` : `D1-D5_FINAL_ARBITRATION.md` (✍ signés 2026-06-06) · `REUSE_ADAPT_EXTEND_CREATE_FINAL_TABLE.md` · `BIB_TO_MODULE_MAPPING_FINAL.md` · **`ADR_R6_R2_INPUTS_LOCK.md`** (intrants verrouillés + critère de complétude) · `01_COMPARISON_COWORK_VS_CLAUDECODE.md` |
| Forensic brut | `nexus/proof/FORENSIC_V3_COWORK/` (wave1+wave2) · `nexus/proof/FORENSIC_V3_CLAUDECODE/` (23 livrables ; commencer par `00_VERIFICATION_LOG.md` et `05_REUSE_ADAPT_CREATE_DECISION_TABLE.md`) |
| Code Book-Factory (socle prouvé) | `packages/book-factory/src/` — adapter épistémique (JTB/isLie), story-state (fold), book-planner, continuity-oracle, context-manager (≤600 mots), book-orchestrator, chapter-generator (Ollama gemma4) ; 46 tests + non-régression canon-kernel 67 + truth-gate 217 |
| Specs Book-Factory | `docs/architecture/book-factory/` (CKG_SPEC, ADAPTER_STRATEGY, CONSOLIDATION_DECISION, P0/P1/P2 evidence) |
| ADR R6 v1 (brouillon conceptuel, HOLD) | `docs/architecture/DEC-20260606-021-SCRIBE-R6-WRITER-LOOP.md` → réécrire en R2 |
| Organes actés (janv. 2026) | `GOVERNANCE/DECISIONS/DEC-20260121-001_ARCHITECTURE_ORGANES.md` (10 organes : QUANTUM_TRUTH_MANAGER, SENTINEL sous-juges, READER_MODEL…) + `GOVERNANCE/VISION_FINALE_SCELLEE.md` |
| Rosette concepts↔code | MASTER_PLAN v2 §8.3 (museum, l.822-828) : MEMORY_*→gateway codé ; spec-only 0 .ts : INTENT_LOCK, ACTIVE_INVENTORY, CONTEXT_RESOLUTION, COST_LEDGER, SAGA_CONTRACT, GARBAGE_COLLECTOR, MIMESIS+ (**MUSE = partiellement codé `src/oracle/muse/`**) |
| World Model dormant | `gateway/src/memory/memory_layer_nasa/` (18 fichiers SEALED, ~273 tests ; **ORPHAN, tiering/decay/digest NON exportés d'index.ts** → accès via ACL D1) |
| Décisions multi-IA traçées | `FORENSIC_V3_CLAUDECODE/03_DECISIONS_6IA_ARCHEOLOGY.md` (8 thèmes) + `FORENSIC_V3_COWORK/02_WAVE2` §C ; max panel attesté 4/4 (`DEC-20260325-001`) |
| Index sessions historiques | `sessions/SESSION_INDEX.md` (107 entrées) |
| Journal qualité | workspace `OMEGA/outputs/log_quality.md` (chaque jalon avec verdict) |

## 3. VÉRITÉS DURES (ne jamais redémontrer)
1. **Vrai neuf = 3 composants seulement** : CharacterRegistry mint-once+alias → Recall Bus (mention→RecallPack ; invariant : entité sans RecallPack ⇒ candidat INVALID) → Double-Bible (extracteur par passes + diff MISSING/EXTRA/MUTATED/TEMPORAL/EPISTEMIC/UNCERTAIN + MapProjection). Tout le reste = REUSE/ADAPT/EXTEND (table finale).
2. **AUCUN ID existant ne survit au renommage** (gematria=f(nom) ; ent_=f(payload.name) ; FACT-id=timestamp+random ; zéro alias dans le repo).
3. canon-kernel = épine canonique UNIQUE ; interdiction d'un 5ᵉ canon / 6ᵉ truth-gate ; rivaux → MUSEUM (marquage gâté GO).
4. Moteur réel (juin 2026) = Python `scripts/metrology/*.py` (gemma4+bge-m3) ; sovereign-engine buildable OFF-path ; `src/runner` = mock.
5. gemma4:31b = SEUL juge LLM calibré (EMP-19) ; tout nouveau couple modèle+prompt = recalibration.
6. N3 (coaching esthétique sur score) = INTERDIT (Goodhart) ; Scribe AVEUGLE (contrat R1-R7) ; gates POST-génération.
7. BIB_WORLD/CHARACTER/STYLE/PLOT = nomenclature de VUES, pas de nouveaux modules.

## 4. PROCHAINES ACTIONS (ordre signé)
① Rédiger **ADR R2** (intrants = INPUTS_LOCK ; intégrer les 10 points ChatGPT 2026-06-06 ; seuils=EXPERIMENTAL_DEFAULTS) → validation Architecte. ② **C1 CharacterRegistry** → ③ **C2 Recall Bus** → ④ **C3 ACL memory_layer** → ⑤ **C4 Double-Bible** → ⑥ **C5 R6-Lite (N=3)** → ⑦ **C6 R6-Core (N=7)**. Chaque C-phase : barre qualité MAXIMUM (mémoire `feedback_max_code_quality` : branded types, Result<T,E>, invariants INV-* testés, déterminisme seed/clock injectés, property-based + adversarial, evidence + verdict). Commits = terminal Architecte.

## 5. QUESTIONS OUVERTES NON BLOQUANTES
Q-A : repo `genesis-forge` séparé sur le PC ? (cité « source de vérité » KNOWLEDGE_BASE, absent des disques montés). Q-B : archives privées multi-IA à verser. NCR existantes pertinentes : NCR-M0B (scribe sans LLM), NCR_EMOTION14_CANON_DRIFT, NCR ρ=0.6138 SHA-drift.
