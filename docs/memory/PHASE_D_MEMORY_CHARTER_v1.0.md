# OMEGA — PHASE D (MEMORY) — CHARTER v1.0 (D0) — DRAFT

Status: DRAFT (Phase D)
Branch: phase/D0-memory-charter
Rule: Append-only for records. No retroactive edits. Corrections = new entries.

## 1) Purpose
Provide long-term memory that is:
- deterministic
- auditable
- append-only
- separated into FACTS (sealed) vs INTERPRETATIONS (mutable)

## 2) Memory Classes
### 2.1 FACT (SEALED)
- Immutable once sealed
- Must reference evidence (commit/tag/hash/path)
- Example: "phase-c-sealed -> commit 2ec9fba"

### 2.2 DECISION
- Append-only decisions with rationale + authority
- Can be superseded only by a new DECISION referencing the old one

### 2.3 EVIDENCE
- Files generated during audits/scans with hashes and provenance

### 2.4 METRIC
- Measured values with method and timestamp (no unsourced constants)

### 2.5 NOTE (NON-NORMATIVE)
- Non-binding; must never be treated as FACT

## 3) Invariants (non-negotiable)
- I1: Every entry has an ID, UTC timestamp, author, class, and scope.
- I2: FACT entries require evidence references (tag/commit/path/hash).
- I3: No overwrite: modifications are new entries that supersede prior ones.
- I4: Determinism: same inputs -> same computed hashes (when applicable).
- I5: Separation: FACT never contains speculation; NOTE never drives gates.

## 4) Storage Layout (canonical)
- docs/memory/
  - MEMORY_INDEX.md                (navigation + latest sealed refs)
  - schemas/                       (JSON schemas)
  - ledgers/                       (append-only ledgers)
- nexus/proof/phase-d/             (evidence packs for Phase D)

## 5) Governance
- Sentinel/Judge validates writes to FACT/DECISION.
- Any ambiguity -> FAIL gate (STOP, report).

## 6) Next Deliverables (D1)
- MEMORY_SCHEMA.json (entry schema)
- LEDGER_MEMORY_EVENTS.ndjson (append-only)
- MEMORY_INDEX.md (index + sealed refs)
- Gates D1 (validate schema, validate append-only, hash manifest)

