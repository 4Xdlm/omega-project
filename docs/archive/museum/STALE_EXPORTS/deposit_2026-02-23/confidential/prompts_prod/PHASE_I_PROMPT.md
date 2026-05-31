# OMEGA — PHASE I (v1.2) — EXECUTION RUNNER / CLI + VERIFY + HERMETIC CAPSULES
NASA-Grade L4 • Deterministic • Audit-Hostile • Zero Approximation

## MISSION
Implement Phase I "Runner" providing a fully local, deterministic, audit-ready execution chain:

Intent (G) → ForgeAdapter (G, MOCK_ONLY) → Truth Gate (F) → Delivery (H) → Run Artifacts → Verify → Capsule (deterministic .zip)

Runner must be:
- No network
- No dynamic imports
- No writes outside artefacts/ and data/intent-ledger/
- Verify mode strictly read-only (no writes)
- File input only (NO stdin)

## REPO
Path: C:\Users\elric\omega-project
Baseline: all tests from H should PASS.

## SEALED ZONES (READ ONLY — DO NOT MODIFY)
- src/canon/
- src/gates/
- src/sentinel/
- src/memory/
- src/orchestrator/
- src/delivery/             # FROZEN after Phase H commit (tagged later)
- genesis-forge/

## WORK ZONES (CREATE ONLY)
- src/runner/
- tests/runner/
- tests/runner/integration/
- config/runner/
- artefacts/runs/            # runtime outputs only (never commit)
- manifests/
- bin/omega-run.mjs          # CLI entry

## ABSOLUTE PROHIBITIONS
❌ Modify anything in SEALED/FROZEN zones
❌ Network calls (fetch/http/https/net)
❌ Dynamic imports (import(), dynamic require)
❌ ENV overrides for critical paths (policies/delivery/runner paths)
❌ stdin input (file only for audit traceability)
❌ Writing outside:
   - artefacts/runs/**
   - data/intent-ledger/**   (Phase G ledger only)
❌ Verify mode writing ANYTHING (zero write)

## FIXED PATHS (HARDCODED)
- Policies path (Phase G): config/policies/policies.v1.json
- Policies lock path:       config/policies/policies.lock
- Delivery profiles path:   config/delivery/profiles.v1.json
- Delivery lock path:       config/delivery/profiles.lock
- Runs root:                artefacts/runs/

No CLI flag and no ENV var can change these.

## CLI CONTRACT (MVP v1.2)
### Single run (file only, no stdin)
omega run --intent <file.json> [--profile OMEGA_STD]
(Default profile: OMEGA_STD if not specified)

### Batch run (sorted alphabetically by filename, stable)
omega batch --dir intents/ [--profile OMEGA_STD]

### Verify (read-only)
omega verify --run artefacts/runs/<run_id>/

### Capsule (deterministic zip from an existing run)
omega capsule --run artefacts/runs/<run_id>/ --output artefacts/runs/<run_id>.zip

### Help
omega --help
omega run --help
omega verify --help

## EXIT CODES (STRICT)
0  PASS
10 INTENT_INVALID
20 POLICY_LOCK_FAIL
30 GENERATION_FAIL
40 TRUTHGATE_FAIL
50 DELIVERY_FAIL
60 VERIFY_FAIL
70 CAPSULE_FAIL

Exit code mapping MUST be deterministic and stage-specific.

## TYPES TO IMPLEMENT

```typescript
// Exit codes enum
export enum ExitCode {
  PASS = 0,
  INTENT_INVALID = 10,
  POLICY_LOCK_FAIL = 20,
  GENERATION_FAIL = 30,
  TRUTHGATE_FAIL = 40,
  DELIVERY_FAIL = 50,
  VERIFY_FAIL = 60,
  CAPSULE_FAIL = 70,
}

// CLI Commands
export type CliCommand = 'run' | 'batch' | 'verify' | 'capsule' | 'help';

// Parsed args
export interface ParsedArgs {
  command: CliCommand;
  intentPath?: string;
  dirPath?: string;
  runPath?: string;
  outputPath?: string;
  profile: string; // default OMEGA_STD
}

// Run result
export interface RunResult {
  success: boolean;
  exitCode: ExitCode;
  runId: string;
  runPath: string;
  runHash: string;
  error?: string;
}

// Verify result
export interface VerifyResult {
  success: boolean;
  exitCode: ExitCode;
  mismatches: Array<{ file: string; expected: string; actual: string }>;
}

// Capsule result
export interface CapsuleResult {
  success: boolean;
  exitCode: ExitCode;
  capsulePath: string;
  capsuleHash: string;
}
```

## RUN DIRECTORY LAYOUT
artefacts/runs/run_<intentId>_<seq>/
- intent.json                     # normalized intent (from G)
- contract.json                   # generation contract (from G)
- truthgate_verdict.json          # from F
- truthgate_proof.json            # from F
- delivery_manifest.json          # from H
- artifacts/                      # from H (files)
- hashes.txt                      # ordered hashes (LF only)
- run_report.md                   # append-only log, timestamp allowed (excluded from run hash)
- run_hash.txt                    # final chain hash

Rules:
- seq is for filesystem collision avoidance only; excluded from hash identity.
- filename safety: NO traversal, NO absolute paths.

## HERMETIC CAPSULES (DETERMINISTIC ZIP) — INCLUDED IN MVP
Capsule zip must be deterministic:
- File list sorted lexicographically by relative path (ASCII byte order)
- Timestamps fixed to epoch 0 (1970-01-01 00:00:00)
- Compression level fixed (6)
- No OS metadata
- LF-only text files
- Zip hash can serve as capsuleId
- Same run directory => same zip bytes => same zip sha256

Use archiver or yazl library with explicit options for determinism.

## VERIFY MODE (READ-ONLY)
omega verify must:
- Read run directory
- Recompute sha256 for every file in scope
- Recompute chain hashes as specified
- Compare to recorded hashes
- If mismatch => exit 60
- Must NOT write any file. Any attempted write => exit 60.

## INVARIANTS (I-INV-01..I-INV-10)
I-INV-01 E2E determinism: same intent file content => same run_hash (across 50 runs)
I-INV-02 No network usage in src/runner/**
I-INV-03 No dynamic imports in src/runner/**
I-INV-04 No ENV override for critical paths
I-INV-05 Verify does not call Forge/TruthGate/Delivery (read-only replay)
I-INV-06 Exit codes deterministic and stage-mapped
I-INV-07 Logs append-only; timestamps excluded from run_hash
I-INV-08 Runner writes only to artefacts/runs/** (and G ledger path)
I-INV-09 Batch order deterministic (sorted by filename)
I-INV-10 Verify mode zero writes (must be provable)

## FILES TO CREATE (ORDER) — Phase I (20)
1.  src/runner/types.ts
2.  tests/runner/types.test.ts
3.  src/runner/cli-parser.ts
4.  tests/runner/cli-parser.test.ts
5.  src/runner/pipeline.ts
6.  tests/runner/pipeline.test.ts
7.  src/runner/run-directory.ts
8.  tests/runner/run-directory.test.ts
9.  src/runner/verifier.ts
10. tests/runner/verifier.test.ts
11. src/runner/capsule.ts
12. tests/runner/capsule.test.ts
13. src/runner/report.ts
14. tests/runner/report.test.ts
15. src/runner/index.ts
16. bin/omega-run.mjs (UPDATE the stub created earlier)
17. tests/runner/integration/e2e.test.ts
18. tests/runner/integration/verify.test.ts
19. tests/runner/integration/capsule.test.ts
20. tests/runner/integration/hostile-audit.test.ts

## HOSTILE TESTS (I-T01..I-T15) — MUST PASS
I-T01 Intent tampering detection
I-T02 Manifest tampering detection
I-T03 Artifact tampering detection
I-T04 Path traversal attempt in intent filename/output name
I-T05 ENV var injection attempt
I-T06 Policy path override attempt
I-T07 Delivery path override attempt
I-T08 Network call attempt
I-T09 Dynamic import attempt
I-T10 Write attempt into SEALED/FROZEN zone
I-T11 Verify with modified artifact must FAIL
I-T12 Capsule timestamp leak attempt (zip bytes must remain stable)
I-T13 Batch order manipulation attack
I-T14 Verify write attempt must FAIL
I-T15 Exit code spoofing attempt

## IMPLEMENTATION NOTES (STRICT)
- Hashing: Node crypto sha256, bytes exact.
- Newlines: LF only for generated text files.
- Encoding: UTF-8 BOM-less.
- File path safety: reject absolute paths, reject '..', reject separators tricks.
- Batch: enumerate directory, filter *.json, sort by filename, process sequentially (no concurrency).
- Pipeline: import orchestrator + truth gate + delivery via static imports only.
- Runner should default to local mock-only generation via Phase G orchestrator behavior (no Claude/Gemini).
- Any failure: write minimal failure report into run dir (except verify mode) + return exit code.
- For ZIP: use yazl or archiver with { zlib: { level: 6 } } and fixed dates.
- NO STDIN support (file input only for audit traceability).

## RUN AFTER EACH FILE
- npm test
- git diff --stat src/canon src/gates src/memory src/sentinel src/orchestrator src/delivery genesis-forge  (MUST BE EMPTY)

## EXIT CRITERIA (PHASE I)
- Add >=200 tests for Phase I
- All tests PASS
- SEALED/FROZEN zones unchanged
- Determinism: 50 runs same intent => same run_hash
- Verify mode PASS on a valid run and FAIL on tampered run
- Capsule zip determinism proven (same run => same zip sha256)
- Ready for commit and final tagging

## AFTER PHASE I COMPLETE — COMMIT I + FINAL TAGS
1. Generate manifest:
   Get-FileHash -Algorithm SHA256 -Path src\runner\*.ts | Out-File manifests\PHASE_I_SHA256_MANIFEST.txt

2. Commit Phase I only:
   git add src/runner tests/runner bin/omega-run.mjs config/runner manifests/PHASE_I_SHA256_MANIFEST.txt
   git commit -m "feat(runner): implement Phase I Runner/Verify/Capsule [INV-I-*] - 200+ tests"

3. Final tags for both phases:
   git tag -a OMEGA_DELIVERY_PHASE_H_SEALED -m "Phase H Delivery Engine sealed - deterministic packaging"
   git tag -a OMEGA_RUNNER_PHASE_I_SEALED -m "Phase I Runner/Verify/Capsule sealed - E2E deterministic"
   git push origin master --tags
