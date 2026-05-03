# Sprint S9 Step 2 — Partial Closure Report

**Date** : 2026-05-03 (Sprint S9 Étape 2 partial closure)
**HEAD** : `16569592` (post C4 signal-registry fix)
**Tag intermédiaire** : `phase-s-s9-step2-3packages-esm-fixed-2026-05-02`
**Source** : Mini-Tribunal 3 IA (Gemini + ChatGPT + Cowork) + Architecte Francky
**Standard** : NASA-Grade L4 / DO-178C Level A
**Doctrine** : v3.156.0 (CLAUDE.md + SPRINT_S8_DOCTRINAL_AMENDMENTS)

---

## 1. Mission Sprint S9 Étape 2

Refonte ESM strict des packages runtime OMEGA pour Node natif.
Stratégie HYBRIDE : runtime NodeNext strict + tooling bundler toléré.

**Scope initial Phase 0** : 5 packages runtime
- canon-kernel (root cause primaire)
- sovereign-engine (cascade)
- omega-segment-engine (build FAIL)
- integration-nexus-dep (build FAIL)
- contracts-canon (déjà OK Phase 0 — exclu scope)

**Scope élargi Phase 0bis** : +1 package découvert via cascade
- orchestrator-core (root cause secondaire — cascade hardening)

**Scope final élargi Sprint S9.2-C** : +1 package découvert via cascade
- signal-registry (NG2 bypass documenté Mini-Tribunal)

---

## 2. Bilan empirique 3/5 packages fixés

### 2.1 Tableau synthèse

| Package | Status | Commit SHA | Cas | Probe Node native (post-patch) | Tests |
|---------|--------|------------|-----|-------------------------------|-------|
| **orchestrator-core** | ✅ FIXED | `c50974c5` | CAS B (config-only) | `OK keys=38` | 158/158 PASS |
| **canon-kernel** | ✅ FIXED | `372524b9` | CAS B3 (45 imports + tsconfig) | `OK keys=67` | 67/67 PASS |
| **signal-registry** | ✅ FIXED | `16569592` | CAS B (NG2 bypass) | `OK keys=6` | 22/22 PASS |
| **sovereign-engine** | ⏳ DEFERRED S10 | — | CAS C suspecté | FAIL JSON imports | non re-tested |
| **omega-segment-engine** | ⏳ DEFERRED S10 | — | 8 TS errors | FAIL build | non re-tested |
| **integration-nexus-dep** | ⏳ DEFERRED S10 | — | 7 TS errors | FAIL build | non re-tested |

**Total empirique** :
- 3/6 packages fixés (50%)
- 247/247 tests PASS (158 + 67 + 22 — aucune régression)
- 3 probes Node native OK (preuve ultime ESM compliant)
- 0 commit revert nécessaire

### 2.2 Détail per-fix package

#### S9.2-A — orchestrator-core (CAS B)

**Commit** : `c50974c5` "fix(orchestrator-core): ESM compliance for Node native runtime"

**Diagnostic** :
- Code source PARFAIT (38/38 imports `.js`, tsconfig NodeNext)
- Bug ISOLÉ package.json : `"type"` absent + `exports."."` → TS source

**Patch** (1 fichier, 5+/1-) :
- Ajout `"type": "module"`
- `exports."."` : `"./src/index.ts"` → `{ types, import }` pointing dist

**Probe** :
- BEFORE: FAIL "Cannot find module .../src/util/clock.js"
- AFTER (post-rebuild): **OK keys=38** ✅

**Tests** : 158/158 PASS (4.93s, 0 régression)

#### S9.2-B — canon-kernel (CAS B3 — root cause primaire)

**Commit** : `372524b9` "fix(canon-kernel): ESM compliance for Node native runtime + tsconfig NodeNext"

**Diagnostic** :
- 45 imports sans `.js` (vs 21 estimé Phase 0 — 2.1x scope réel multi-line)
- Top-level `src/index.ts` : 4 directory imports (`./types`, `./id`, `./hash`, `./schema`)
- 41 imports file-level dans 4 sub-dirs
- tsconfig : `bundler` (incohérent NodeNext production)

**Patch** (16 fichiers, 47+/47-) :
- 45 imports patchés `.js` (ou `/index.js` directories)
- tsconfig : `module: ES2022 → NodeNext`, `moduleResolution: bundler → NodeNext`

**Probe** :
- BEFORE: FAIL "Directory import './types' not supported"
- AFTER: **OK keys=67** ✅

**Tests** : 67/67 PASS (1.81s, 0 régression)

**Cascade impact** :
- canon-kernel **plus blocker** sovereign-engine
- Nouveau cascade root cause révélé : signal-registry (S9.2-C)

#### S9.2-C — signal-registry (CAS B + NG2 bypass)

**Commit** : `16569592` "fix(signal-registry): align package exports with Node ESM runtime"

**Diagnostic** :
- Code source DÉJÀ conforme (4 .ts, 9/9 imports avec `.js`)
- Bug ISOLÉ package.json : `main: "src/index.ts"` + PAS de `exports`
- Mini-Tribunal : NG2 bypass autorisé (CAS B PUR)

**Patch** (1 fichier, 9+/2-) :
- `main: "src/index.ts"` → `"dist/index.js"`
- `types: "src/index.ts"` → `"dist/index.d.ts"`
- Ajout `exports` field complet pointing dist

**Probe** :
- BEFORE: FAIL "Cannot find module .../src/registry.js"
- AFTER: **OK keys=6** ✅

**Tests** : 22/22 PASS (1.03s, 0 régression)

**Cascade impact** :
- signal-registry **plus blocker** sovereign-engine
- Nouveau root cause révélé : JSON imports sans attribut (Sprint S10)

---

## 3. 3 packages différés Sprint S10

### 3.1 sovereign-engine — DEFERRED S10 (CAS C suspecté)

**Root causes empiriques** :

1. **JSON imports sans attribut** (NOUVEAU découvert S9.2-C cascade) :
   ```
   Module .../sovereign-engine/dist/data/sensory-lexicon.json needs
   an import attribute of "type: json"
   ```
   → ESM Node strict exige `import json with { type: 'json' }` (Node 22+)
   → Source code modifications nécessaires

2. **4 imports sans `.js`** (Phase 0 inventaire §3 ligne 4)
   → Mineur après JSON imports résolus

3. **tsconfig** : `bundler` (à migrer NodeNext pour cohérence)

**Severity** : P0_RUNTIME (sovereign-engine = pivot package, dépend canon-kernel + signal-registry maintenant fixés)

**Cas estimé** : **CAS C** (modifications source TypeScript requises)

**Ne peut pas être patché en CAS B** : JSON import attributes nécessitent modifications du code source (`.ts` files).

### 3.2 omega-segment-engine — DEFERRED S10 (8 TS errors)

**Root causes empiriques** (Sprint S9 Étape 1 investigation §10.4) :

1. `src/stream/index.ts` lignes 181-186 : 6 duplicate identifiers (GatewayConfig, GatewayPolicy, RecorderEntry, DispatchResult, GatewayError, ModuleHandler)
2. `src/stream/index.ts:187` : TS2834 ESM extension missing (relative path sans `.js`)
3. `src/stream/stream_segmenter.ts:288` : TS2345 SegmentMode type mismatch

**Severity** : P0_RUNTIME (per S9 Étape 1 verdict)

**Cas estimé** : **CAS C** (TypeScript code modifications)

### 3.3 integration-nexus-dep — DEFERRED S10 (7 TS errors)

**Root causes empiriques** (Sprint S9 Étape 1 investigation §10.4) :

1. `src/scheduler/scheduler.ts` lignes 16/25/29/30 : TS6133/TS6196 unused declarations (PipelineResult, Policy, DEFAULT_SCHEDULER_OPTIONS, PRIORITY_VALUES)
2. `src/translators/module.ts:49` : TS2741 missing 'envy' property in Emotion14 Record
3. `src/translators/module.ts:89` : TS2741 missing 'envy' property in number Record
4. `src/translators/module.ts:171` : TS6133 unused 'source'
5. `src/translators/output.ts:16` : TS6196 unused 'ExecutionTrace'

**Severity** : P0_RUNTIME

**Cas estimé** : **CAS C/D** (Emotion14 missing 'envy' property indique decision domain — Emotion13 vs Emotion14 model mismatch)

---

## 4. Risques restants post-S9.2 partial

### 4.1 Risques techniques

- **R1 — sovereign-engine cascade pivot** : sovereign-engine importe canon-kernel + signal-registry (les deux fixés). Mais sovereign-engine lui-même reste broken. Tout module en aval (omega-runner, omega-forge, etc.) ne peut pas charger sovereign-engine via Node natif jusqu'à S9.2-D fix.

- **R2 — Pattern Emotion13 vs Emotion14 (integration-nexus-dep)** : missing 'envy' property suggère un modèle Emotion modifié quelque part. Decision Architecte requise sur quel modèle est canonique.

- **R3 — JSON imports attributes (sovereign-engine)** : Node ≥ 22 require feature. Si runtime cible est Node < 22, alternative pattern (read file + JSON.parse) nécessaire.

- **R4 — Pas de gate CI Node natif** : NCR_GATE_IMPORTS_BUNDLER_BLINDNESS reste STILL_OPEN. Aucune protection CI contre régressions ESM Node natif. Sprint S10 doit aussi adresser le gate.

### 4.2 Risques doctrinaux

- **R5 — NG2 bypass précédent** : signal-registry est le 6e package (au-delà du scope initial 5). Mini-Tribunal a documenté l'exception, mais si découverte 7e package (Phase S10 cascade peeling continue ?), HARD STOP par défaut.

- **R6 — Tests vitest baseline non testés cross-package** : chaque sous-phase a vérifié tests par package, mais aucun test cross-package globaux exécutés. Possible régression cross-package latente.

### 4.3 Risques opérationnels

- **R7 — Working tree dist/ rebuilds présents** : 3 packages rebuilds dist/ disponibles disque (gitignored). Si quelqu'un lance `tools/omega_cleanup_and_index.ps1` (qui supprime dist/), il faudrait rebuilder. Per RECOVERY_TEST_DOCTRINE (amendement 5 v3.156.0), ce script ne doit pas être lancé sans NCR + test reverse.

---

## 5. Cross-references

- **NCR_ESM_BUNDLER_VS_NODE_RUNTIME** (V2 C16, STILL_OPEN H1 confirmée) :
  → MAJ status `STILL_OPEN → FIX_VALIDATED_SCOPED` (3 packages fixés) + reste STILL_OPEN scope sous-graphe S10
- **NCR_BUILD_ARTIFACT_ABSENCE_POST_S6** (S8 V2 + V3 Étape 0 + S9 Étape 1) :
  → mention explicite avancement S9.2 partial
- **NCR_GATE_IMPORTS_BUNDLER_BLINDNESS** (V2 C15, STILL_OPEN) :
  → cross-référence S9.2 + S10 (gate dist/ Node natif requis)

---

## 6. Doctrine v3.156.0 honorée 100%

| Amendement | Application Sprint S9.2 partial |
|------------|--------------------------------|
| ANCHOR_PRE_FLIGHT | Tous anchors vérifiés runtime (3 commits, 3 SHA validés) |
| MULTI_IA_RUNTIME_ARBITER | Mini-Tribunal pour NG2 bypass (Cowork + Gemini + ChatGPT + Architecte) |
| NO_UNVERIFIED_EXTERNAL_ANCHORS | Aucune clôture sans probe + tests reverse runtime |
| STRUCTURED_MEMORY_PRIORITY | Phase 0 audit empirique guide Sprint S9.2 (mémoire structurée) |
| RECOVERY_TEST_DOCTRINE | Probe Node native + tests pre-commit chaque sous-phase |
| WORKSPACE_VS_REPO_DRIFT | dist/ artefacts vérifiés runtime, pas mémoire Cowork |

---

## 7. Recommandation suite

### 7.1 Sprint S10 — scope DEFERRED 3 packages

Voir `nexus/proof/S10_RUNTIME_ESM_PHASE2_PLAN.md` pour plan complet :
- sovereign-engine (CAS C suspecté, JSON imports + 4 imports + tsconfig)
- omega-segment-engine (8 TS errors, CAS C)
- integration-nexus-dep (7 TS errors, CAS C/D — decision Architecte Emotion model)

### 7.2 Sprint S10 — additions S8 NCRs

- NCR_GATE_IMPORTS_BUNDLER_BLINDNESS — Test 4 child_process spawn node (Sprint S6.2 reporté depuis S8)
- NCR_EVIDENCE_ARTIFACT_GAP_PATTERN audit (Sprint S8 F1 umbrella)
- NCR famille CALC bias (4 NCRs liés, refonte coordonnée)

---

## 8. Closure officielle Sprint S9.2 partial

```
CLOSURE PARTIELLE SPRINT S9.2 (3/6 packages ESM compliant)
============================================================
Date            : 2026-05-03
HEAD            : 16569592
Tag             : phase-s-s9-step2-3packages-esm-fixed-2026-05-02
Authority       : Mini-Tribunal 3 IA + Architecte Francky
Evidence anchor : 3 commits (c50974c5, 372524b9, 16569592) +
                  3 probes Node native OK (38, 67, 6 keys) +
                  247/247 tests PASS (0 regression)
Cascade impact  : canon-kernel + signal-registry no longer blockers
                  sovereign-engine. Cascade peeling reveals JSON
                  imports as new root cause (S10 dedicated).
Risks           : R1-R7 documented (sovereign cascade, Emotion13/14,
                  JSON attributes, gate CI, NG2 bypass, vitest cross-
                  package, dist/ rebuilds)
NEXT            : Sprint S10 — sovereign-engine + omega-segment +
                  integration-nexus-dep fixes (CAS C/D)
PAUSE           : Stricte avant Sprint S10 (NCR OVER HEROICS doctrine)
```
