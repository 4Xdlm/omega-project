# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#
#   OMEGA — EXEC_ALL_JKLM (ORCHESTRATEUR AUTONOME)
#   NASA-Grade L4 • STOP-ON-FAIL • Zero Approximation
#
#   Date: 2026-01-28
#   Standard: NASA-Grade L4 / DO-178C Level A
#   Mode: SÉQUENTIEL STRICT — ARRÊT IMMÉDIAT SI ÉCHEC
#
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

## 🎯 PURPOSE

Execute Phases J → K → L → M sequentially using the 4 phase specs below.

**HARD STOP CONDITIONS:**
- `npm test` failure
- SEALED zones diff detected
- Missing required outputs (dist artifacts, locks, manifests)
- Any invariant violation

## 📋 PHASE ORDER (STRICT — NO SKIP)

| Order | Phase | Spec File | Objective |
|-------|-------|-----------|-----------|
| 1 | J | PHASE_J_BUILD_DIST.md | CLI runnable from dist/ (compiled JS) |
| 2 | K | PHASE_K_PROVIDERS_LOCKED.md | Real providers gated by lock |
| 3 | L | PHASE_L_REPLAY_ENGINE.md | Read-only verification engine |
| 4 | M | PHASE_M_CAPSULE_PORTABLE.md | Verify capsule without repo |

## 🔒 SEALED ZONES (READ ONLY — NEVER MODIFY)

```
src/canon/           # Phase E
src/gates/           # Phase F
src/sentinel/        # Phase C+CD
src/memory/          # Phase D
src/memory-write-runtime/
src/orchestrator/    # Phase G
src/delivery/        # Phase H
src/runner/          # Phase I ⚠️ NOW SEALED
genesis-forge/       # Phase B
config/policies/     # Phase G locks
config/delivery/     # Phase H locks
```

## 🚫 GLOBAL HARD RULES

| Rule | Description |
|------|-------------|
| NO NETWORK | Unless explicitly in K (providers) AND gated by lock |
| NO DYNAMIC IMPORTS | `import()` or `require()` with variables |
| NO ENV OVERRIDES | For critical paths (locks/config) |
| DETERMINISM | Stable sorting, LF-only, UTF-8 no-BOM |
| ZERO REGRESSION | All 4398+ tests must pass throughout |

## ✅ PRECHECK (MANDATORY BEFORE STARTING)

```powershell
cd C:\Users\elric\omega-project

# 1. Clean git state
git status --porcelain=v1
# MUST be empty (no uncommitted changes)

# 2. All tests pass
npm test
# MUST show 4398+ tests passing

# 3. SEALED zones intact
git diff --stat src/canon src/gates src/sentinel src/memory src/orchestrator src/delivery src/runner genesis-forge config/policies config/delivery
# MUST be empty
```

## 🚀 EXECUTION SEQUENCE

For each phase (J, K, L, M):

```
1. READ the phase spec doc
2. IMPLEMENT per spec (create files, no SEALED mods)
3. RUN npm test → MUST PASS
4. VERIFY SEALED diff → MUST be empty
5. GENERATE SHA256 manifest for phase scope
6. COMMIT with message: feat(scope): Phase X description [INV-X-*]
7. TAG: OMEGA_<SCOPE>_PHASE_<X>_SEALED
8. PROCEED to next phase ONLY if all above pass
```

## 🏁 POSTCHECK (AFTER PHASE M COMPLETE)

```powershell
cd C:\Users\elric\omega-project

# 1. All tests pass
npm test
# Expected: 4500+ tests (J/K/L/M add ~100+ tests)

# 2. CLI works from dist
npm run build
node bin/omega-run.mjs --help
# Expected: exit 0, help displayed

# 3. Full pipeline works
node bin/omega-run.mjs run --intent intents/test_intent_mvp.json
# Expected: exit 0, run created

# 4. Capsule verification works
node bin/omega-run.mjs capsule --run artefacts/runs/run_test_intent_mvp_1 --output test_capsule.zip
node bin/omega-run.mjs verify-capsule test_capsule.zip
# Expected: exit 0, PASS

# 5. Clean git state
git status --porcelain=v1
# MUST be empty
```

## 📊 EXPECTED PROGRESSION

| Phase | Tests Added | Total Expected | Tag |
|-------|-------------|----------------|-----|
| Pre-J | 0 | 4398 | (baseline) |
| J | ~15 | ~4413 | OMEGA_BUILD_PHASE_J_SEALED |
| K | ~40 | ~4453 | OMEGA_PROVIDERS_PHASE_K_SEALED |
| L | ~30 | ~4483 | OMEGA_REPLAY_PHASE_L_SEALED |
| M | ~25 | ~4508 | OMEGA_AUDITPACK_PHASE_M_SEALED |

## ⚠️ ABORT CONDITIONS

**STOP IMMEDIATELY IF:**

1. `npm test` shows ANY failure
2. `git diff --stat <SEALED>` shows ANY modification
3. A required output is missing after phase completion
4. An invariant cannot be satisfied
5. Network call detected outside K provider scope

**ON ABORT:**
1. `git stash` or `git checkout .` to restore clean state
2. Document failure reason
3. Report to Architecte before any retry

---

**FIN DU DOCUMENT EXEC_ALL_JKLM**
