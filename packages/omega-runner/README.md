# @omega/runner — X4 Runner Global

Phase D.1 — Unified CLI for the OMEGA narrative analysis pipeline.

## Commands

```bash
omega run create  --intent <path.json> --out <dir> [--seed <string>]
omega run forge   --input <path.json> --out <dir> [--seed <string>]
omega run full    --intent <path.json> --out <dir> [--seed <string>]
omega run report  --dir <runDir> --out <file.{md|json}>
omega verify      --dir <runDir> [--strict]
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | SUCCESS |
| 1 | GENERIC ERROR |
| 2 | USAGE ERROR |
| 3 | DETERMINISM VIOLATION |
| 4 | IO ERROR |
| 5 | INVARIANT BREACH |
| 6 | VERIFY FAIL |

## Invariants (12)

| ID | Name |
|----|------|
| INV-RUN-01 | RUN_ID_STABLE |
| INV-RUN-02 | MANIFEST_HASH |
| INV-RUN-03 | NO_PHANTOM_FILES |
| INV-RUN-04 | ARTIFACT_HASHED |
| INV-RUN-05 | ORDER_INDEPENDENT |
| INV-RUN-06 | REPORT_DERIVED |
| INV-RUN-07 | STAGE_COMPLETE |
| INV-RUN-08 | SEED_DEFAULT |
| INV-RUN-09 | CRLF_IMMUNE |
| INV-RUN-10 | NO_UNDECLARED_DEPS |
| INV-RUN-11 | MERKLE_VALID |
| INV-RUN-12 | VERIFY_IDEMPOTENT |

## ProofPack Structure

```
runs/<RUN_ID>/
  00-intent/intent.json + .sha256
  10-genesis/genesis-plan.json + .sha256
  20-scribe/scribe-output.json + .sha256
  30-style/styled-output.json + .sha256
  40-creation/creation-result.json + .sha256
  50-forge/forge-report.json + .sha256
  manifest.json + .sha256
  merkle-tree.json
  report.json + report.md
  runner.log
```

## Standard

NASA-Grade L4 / DO-178C Level A
