# OMEGA

**Deterministic narrative creation engine with cryptographic audit trail.**

Version 1.0.0 | 2328 tests | 94 invariants | 8 sealed packages | NASA-Grade L4

---

## What is OMEGA

OMEGA is a deterministic engine that transforms a narrative intent into a scored,
style-applied, cryptographically verifiable text artifact.

Given the same input and seed, OMEGA produces byte-identical output with a complete
SHA-256 proof chain.

---

## What OMEGA Guarantees

| Guarantee | Mechanism |
|-----------|-----------|
| **Determinism** | Same input + same seed = same output = same hash |
| **Auditability** | Every artifact has a SHA-256 hash in a Merkle tree |
| **Traceability** | Full pipeline: Intent -> Blueprint -> Draft -> Styled -> Scored -> ProofPack |
| **Invariant coverage** | 94 invariants verified across 8 packages |
| **Non-regression** | 6-level CI gate system with baseline replay |

---

## What OMEGA Does NOT Do

- OMEGA is NOT a chatbot or copilot
- OMEGA is NOT a LLM wrapper or prompt tool
- OMEGA is NOT a creative writing assistant for general public
- OMEGA does NOT hallucinate — it fails deterministically
- OMEGA does NOT modify sealed packages at runtime

---

## Architecture

```
IntentPack (JSON)
    |
    v
+------------------------+
|  genesis-planner       |  C.1 — Narrative planning
|  (IntentPack -> Blueprint)
+----------+-------------+
           v
+------------------------+
|  scribe-engine         |  C.2 — Text generation
|  (Blueprint -> Draft)  |
+----------+-------------+
           v
+------------------------+
|  style-emergence       |  C.3 — Style application
|  (Draft -> Styled)     |
+----------+-------------+
           v
+------------------------+
|  creation-pipeline     |  C.4 — End-to-end orchestration
+----------+-------------+
           v
+------------------------+
|  omega-forge           |  C.5 — Emotional trajectory scoring (M1-M12)
|  (Styled -> Scored)    |
+----------+-------------+
           v
       ProofPack
    (SHA-256 chain)
```

---

## CLI Reference

```bash
# CREATION
npx tsx packages/omega-runner/src/cli/main.ts run create  --intent <path.json> --out <dir> [--seed <string>]
npx tsx packages/omega-runner/src/cli/main.ts run forge   --input <path.json> --out <dir> [--seed <string>]
npx tsx packages/omega-runner/src/cli/main.ts run full    --intent <path.json> --out <dir> [--seed <string>]
npx tsx packages/omega-runner/src/cli/main.ts run report  --dir <runDir> --out <file.{md|json}>
npx tsx packages/omega-runner/src/cli/main.ts verify      --dir <runDir> [--strict]
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | SUCCESS |
| 1 | GENERIC ERROR |
| 2 | USAGE ERROR |
| 3 | DETERMINISM VIOLATION |
| 4 | IO ERROR |
| 5 | INVARIANT BREACH |
| 6 | VERIFY FAIL |

---

## Quickstart

Full pipeline in under 15 minutes: **[docs/QUICKSTART.md](docs/QUICKSTART.md)**

Quick preview:
```bash
npx tsx packages/omega-runner/src/cli/main.ts run full \
  --intent examples/intents/intent_quickstart.json \
  --out my-run \
  --seed omega-quickstart-v1
```

---

## Trust & Verification

Every OMEGA run produces a **ProofPack** — a directory containing:

```
runs/<run-id>/
  00-intent/intent.json          + intent.sha256
  10-genesis/genesis-plan.json   + genesis-plan.sha256
  20-scribe/scribe-output.json   + scribe-output.sha256
  30-style/styled-output.json    + styled-output.sha256
  40-creation/creation-result.json + creation-result.sha256
  50-forge/forge-report.json     + forge-report.sha256
  manifest.json                  (all hashes + final_hash)
  merkle-tree.json               (Merkle tree of artifacts)
```

Verify any run:
```bash
npx tsx packages/omega-runner/src/cli/main.ts verify --dir <run_directory> --strict
```

This checks:
- Every artifact hash matches its declared SHA-256
- Merkle tree is valid
- No phantom files exist
- No files are missing

---

## How to Try to Break OMEGA

We document attacks against OMEGA and their results.
See **[examples/ATTACK_CATALOG.md](examples/ATTACK_CATALOG.md)** for the full catalog.

Summary:

| Attack | Target | Verdict |
|--------|--------|---------|
| SQL injection via intent title | Validation | FAIL |
| XSS via themes | Validation | FAIL |
| Path traversal via emotion | Validation | FAIL |
| Negative paragraphs | Bounds check | FAIL |
| Extreme paragraphs (999999) | Bounds check | FAIL |
| Empty intent | Required fields | FAIL |
| Malformed JSON | Parse | PASS |
| ProofPack hash tampered | omega verify | PASS |
| Unicode adversarial | Normalization | FAIL |
| Seed mismatch replay | Determinism | FAIL |

**2/10 PASS, 8/10 FAIL.** All FAILs stem from absent intent validation (NCR-G1B-001).
JSON parsing and ProofPack integrity verification work correctly.

OMEGA either rejects bad input at parse level or processes it through
a deterministic pipeline with valid integrity chains. It never silently corrupts.

---

## Known Limitations

| Limitation | Status |
|------------|--------|
| No real LLM integration (mock-only generators) | By design — determinism first |
| No intent validation (hostile inputs accepted) | NCR-G1B-001 — planned |
| Forge verdict always FAIL (mock scores = 0) | Expected with mock generators |
| Seed does not affect content (mock generators ignore seed) | Known mock limitation |
| No UI | CLI-only |
| English-focused intent schema | French in roadmap |
| No multi-user concurrency | Single-operator system |
| No streaming output | Batch processing only |
| MC/DC coverage not measured | Planned |
| Built dist has ESM directory import issue | Use `npx tsx` on source instead |

---

## Project Metrics

| Metric | Value |
|--------|-------|
| Total tests | 2328 |
| Total invariants | 94 |
| Sealed packages | 8 |
| Sealed phases | 9 (A through G.0) |
| CI gates | 6 (G0 through G5) |
| Version | 1.0.0 |
| HEAD | fcd8a32a |

---

## Roadmap

OMEGA follows a dual-roadmap architecture:
- **BUILD roadmap** (A through G.0): Sealed, immutable
- **GOVERNANCE roadmap** (D through J): Active, observation-only

Current: G.1-B (Distribution & Adoption)

---

## License & Credits

All rights reserved.

| Role | Entity |
|------|--------|
| Supreme Architect | Francky |
| Primary AI | Claude (Anthropic) |
| Audit AI | ChatGPT (OpenAI) |

Standard: NASA-Grade L4 / DO-178C / MIL-STD / AS9100D
