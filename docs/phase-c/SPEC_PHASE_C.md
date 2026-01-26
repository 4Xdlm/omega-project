# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#
#   OMEGA PHASE C — SPECIFICATION
#   SENTINEL_JUDGE — Architecture & Implementation Guide
#
#   Version: 1.0.0
#   Date: 2026-01-26
#   Status: DRAFT
#
#   Standard: NASA-Grade L4 / DO-178C Level A
#
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

# 📋 TABLE OF CONTENTS

1. Overview
2. Architecture
3. Module Structure
4. Pipeline Flow
5. Gates & Evaluators
6. Judgement Chain
7. Modes (STRICT / ADVERSARIAL)
8. Error Catalog
9. Test Strategy
10. Implementation Plan

---

# 1. OVERVIEW

## 1.1 Purpose

SENTINEL_JUDGE est le système de décision souverain d'OMEGA. Il garantit que toute donnée "signifiante" passe par un processus de validation explicite, traçable et déterministe.

## 1.2 Position in OMEGA

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                             OMEGA ECOSYSTEM                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌───────────────┐                                                             │
│   │  PHASE A      │ ← Certification Core (SEALED)                               │
│   │  INFRA        │                                                             │
│   └───────┬───────┘                                                             │
│           │                                                                      │
│           ▼                                                                      │
│   ┌───────────────┐                                                             │
│   │  PHASE B      │ ← Engine Determinism (SEALED)                               │
│   │  FORGE        │   Provides: EmotionBridge, J1_JUDGE                         │
│   └───────┬───────┘                                                             │
│           │                                                                      │
│           ▼                                                                      │
│   ┌───────────────┐                                                             │
│   │  PHASE C      │ ← Decision System (CURRENT)                                 │
│   │  SENTINEL     │   SENTINEL_JUDGE                                            │
│   │  _JUDGE       │                                                             │
│   └───────┬───────┘                                                             │
│           │                                                                      │
│           ▼                                                                      │
│   ┌───────────────┐     ┌───────────────┐                                       │
│   │  PHASE D      │     │  PHASE E      │                                       │
│   │  MEMORY       │     │  CANON        │ ← FUTURE                              │
│   └───────────────┘     └───────────────┘                                       │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 1.3 Key Properties

| Property | Description |
|----------|-------------|
| **Sovereign** | SENTINEL_JUDGE is the ONLY path for data promotion |
| **Explicit** | Every decision has explicit reasons and evidence |
| **Traceable** | Every decision is logged in append-only chain |
| **Deterministic** | Same inputs → Same verdict + Same hash |
| **Non-regressive** | ACCEPT cannot become implicitly false |

---

# 2. ARCHITECTURE

## 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          SENTINEL_JUDGE PIPELINE                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌───────────────┐                                                             │
│   │ DecisionRequest│ ← INPUT                                                    │
│   └───────┬───────┘                                                             │
│           │                                                                      │
│           ▼                                                                      │
│   ┌───────────────┐                                                             │
│   │ INPUT_GATES   │ ← GATE_C_01 → GATE_C_07                                     │
│   │ (Validation)  │   If ANY fail → BLOCKED                                     │
│   └───────┬───────┘                                                             │
│           │ PASS                                                                 │
│           ▼                                                                      │
│   ┌───────────────┐                                                             │
│   │ EVIDENCE      │ ← Normalize, sort, hash                                     │
│   │ ASSEMBLER     │   Build canonical EvidencePack                              │
│   └───────┬───────┘                                                             │
│           │                                                                      │
│           ▼                                                                      │
│   ┌───────────────┐                                                             │
│   │ GATE          │ ← PolicyAdapter, ForgeAdapter,                              │
│   │ EVALUATORS    │   TruthGateAdapter (future)                                 │
│   └───────┬───────┘                                                             │
│           │                                                                      │
│           ▼                                                                      │
│   ┌───────────────┐                                                             │
│   │ VERDICT       │ ← Apply determination algorithm                             │
│   │ ENGINE        │   Produce verdict + reasons                                 │
│   └───────┬───────┘                                                             │
│           │                                                                      │
│           ▼                                                                      │
│   ┌───────────────┐                                                             │
│   │ JUDGEMENT     │ ← Compute hash, chain to previous                           │
│   │ BUILDER       │   Produce Judgement artifact                                │
│   └───────┬───────┘                                                             │
│           │                                                                      │
│           ▼                                                                      │
│   ┌───────────────┐                                                             │
│   │ TRACE         │ ← Append to chain, write artifacts                          │
│   │ WRITER        │   Maintain C_JUDGEMENT_CHAIN.log                            │
│   └───────┬───────┘                                                             │
│           │                                                                      │
│           ▼                                                                      │
│   ┌───────────────┐                                                             │
│   │ Judgement     │ ← OUTPUT                                                    │
│   └───────────────┘                                                             │
│                                                                                  │
│   ┌───────────────┐                                                             │
│   │ APPEAL_LOOP   │ ← If verdict = APPEAL                                       │
│   │ (optional)    │   New request with new evidence                             │
│   └───────────────┘                                                             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Component Responsibilities

| Component | Responsibility | State |
|-----------|----------------|-------|
| INPUT_GATES | Validate request structure and integrity | Stateless |
| EVIDENCE_ASSEMBLER | Normalize and hash evidence | Stateless |
| GATE_EVALUATORS | Evaluate policies and evidence | Stateless (adapters) |
| VERDICT_ENGINE | Determine verdict from evaluations | Stateless |
| JUDGEMENT_BUILDER | Build judgement with hash | Stateless |
| TRACE_WRITER | Write to append-only chain | Append-only |
| APPEAL_LOOP | Handle APPEAL verdicts | Stateless |

---

# 3. MODULE STRUCTURE

## 3.1 Package Location

```
packages/sentinel-judge/
├── src/
│   ├── index.ts                    ← Barrel export
│   ├── types.ts                    ← All TypeScript interfaces
│   ├── gates/
│   │   ├── input-gates.ts          ← GATE_C_01 → GATE_C_07
│   │   └── index.ts
│   ├── assembler/
│   │   ├── evidence-assembler.ts
│   │   └── index.ts
│   ├── evaluators/
│   │   ├── policy-adapter.ts
│   │   ├── forge-adapter.ts
│   │   └── index.ts
│   ├── engine/
│   │   ├── verdict-engine.ts
│   │   └── index.ts
│   ├── builder/
│   │   ├── judgement-builder.ts
│   │   └── index.ts
│   ├── trace/
│   │   ├── trace-writer.ts
│   │   ├── chain-verifier.ts
│   │   └── index.ts
│   ├── calibration/
│   │   ├── calibration-resolver.ts
│   │   └── index.ts
│   └── utils/
│       ├── canonical-json.ts
│       ├── sha256.ts
│       └── index.ts
├── tests/
│   ├── unit/
│   │   ├── gates.test.ts
│   │   ├── assembler.test.ts
│   │   ├── evaluators.test.ts
│   │   ├── engine.test.ts
│   │   ├── builder.test.ts
│   │   └── trace.test.ts
│   ├── integration/
│   │   ├── pipeline.test.ts
│   │   └── forge-adapter.test.ts
│   ├── adversarial/
│   │   ├── hostile-inputs.test.ts
│   │   └── edge-cases.test.ts
│   └── determinism/
│       ├── run1-run2.test.ts
│       └── golden-snapshot.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## 3.2 Dependencies

| Dependency | Type | Reason |
|------------|------|--------|
| `packages/sentinel/` | Internal | SENTINEL_CORE for foundation |
| `genesis-forge/` | Internal (READ-ONLY) | ForgeAdapter for emotion analysis |
| `node:crypto` | Built-in | SHA-256 hashing |

---

# 4. PIPELINE FLOW

## 4.1 Normal Flow (Happy Path)

```
1. DecisionRequest received
2. INPUT_GATES validation
   → All GATE_C_* pass
3. EVIDENCE_ASSEMBLER
   → Canonical EvidencePack built
4. GATE_EVALUATORS
   → All policies evaluated
   → ForgeAdapter provides J1 results (if applicable)
5. VERDICT_ENGINE
   → No BLOCKER violations
   → No missing evidence
   → No conflicts
   → Verdict = ACCEPT
6. JUDGEMENT_BUILDER
   → Judgement created with hash
7. TRACE_WRITER
   → Appended to chain
8. Return Judgement
```

## 4.2 REJECT Flow

```
1-4. Same as Happy Path
5. VERDICT_ENGINE
   → BLOCKER violation detected
   → Verdict = REJECT
   → Reasons include violation code
6-8. Same as Happy Path (judgement still recorded)
```

## 4.3 DEFER Flow

```
1-4. Same as Happy Path
5. VERDICT_ENGINE
   → Missing evidence detected
   → OR uncalibrated threshold
   → Verdict = DEFER
   → requiredActions list what's needed
6-8. Same as Happy Path
```

## 4.4 APPEAL Flow

```
1-4. Same as Happy Path
5. VERDICT_ENGINE
   → Conflict detected (evidence OR prior judgement)
   → Verdict = APPEAL
6-8. Same as Happy Path
9. APPEAL_LOOP activated
   → New DecisionRequest required with resolution
```

---

# 5. GATES & EVALUATORS

## 5.1 Input Gates

| Gate | Check | Error Code |
|------|-------|------------|
| GATE_C_01 | traceId format valid | ERR-C-GATE-01 |
| GATE_C_02 | claim.payloadHash matches | ERR-C-GATE-02 |
| GATE_C_03 | contextRefs sha256 valid | ERR-C-GATE-03 |
| GATE_C_04 | evidencePack.inputsDigest valid | ERR-C-GATE-04 |
| GATE_C_05 | policyBundle non-empty | ERR-C-GATE-05 |
| GATE_C_06 | PolicyRef.sourceSha256 valid | ERR-C-GATE-06 |
| GATE_C_07 | No magic numbers | ERR-C-GATE-07 |

## 5.2 Policy Adapter

```typescript
interface PolicyEvaluationResult {
  policyRef: PolicyRef;
  status: "PASS" | "FAIL" | "SKIP";
  details?: string;
}

function evaluatePolicy(
  policy: PolicyRef, 
  request: DecisionRequest,
  calibration: CalibrationResolver
): PolicyEvaluationResult;
```

## 5.3 Forge Adapter

```typescript
interface ForgeEvaluationResult {
  source: "GENESIS_FORGE";
  analysisHash: string;          // SHA-256 of sanitized result
  j1Verdict?: "PASS" | "FAIL" | "WARN" | "SKIP";
  j1Score?: number;              // Only if calibrated
  emotionState?: EmotionState14D;
}

function evaluateWithForge(
  text: string,
  targetEmotion?: EmotionState14D,
  calibration: CalibrationResolver
): ForgeEvaluationResult;
```

---

# 6. JUDGEMENT CHAIN

## 6.1 Chain Structure

```
GENESIS → J-001 → J-002 → J-003 → ... → J-N (HEAD)
```

Each judgement links to the previous via `prevJudgementHash`.

## 6.2 Chain File Format (C_JUDGEMENT_CHAIN.log)

```
# OMEGA SENTINEL_JUDGE Chain Log
# Format: TIMESTAMP | JUDGEMENT_ID | VERDICT | TRACE_ID | JUDGEMENT_HASH
# Append-only - DO NOT EDIT

2026-01-26T10:00:00.000Z | J-20260126-0001 | ACCEPT | C-20260126-0001 | abc123...
2026-01-26T10:01:00.000Z | J-20260126-0002 | REJECT | C-20260126-0002 | def456...
2026-01-26T10:02:00.000Z | J-20260126-0003 | DEFER  | C-20260126-0003 | ghi789...
```

## 6.3 Chain Verification

```typescript
function verifyChain(): ChainVerificationResult {
  // 1. Read all judgements
  // 2. Verify each judgementHash by recomputation
  // 3. Verify prevJudgementHash links correctly
  // 4. Detect gaps or inconsistencies
  return {
    valid: boolean;
    headHash: string;
    length: number;
    errors: ChainError[];
  };
}
```

---

# 7. MODES (STRICT / ADVERSARIAL)

## 7.1 Mode Definition

| Mode | Description | Use Case |
|------|-------------|----------|
| **STRICT** | Standard evaluation, all gates | Production |
| **ADVERSARIAL** | Enhanced checks, hostile input simulation | Audit, Testing |

## 7.2 Mode Differences

| Aspect | STRICT | ADVERSARIAL |
|--------|--------|-------------|
| Input validation | Standard | + fuzzing detection |
| Policy evaluation | Standard | + worst-case scenarios |
| Conflict detection | Standard | + historical pattern analysis |
| Performance | Optimized | Thorough (slower) |

## 7.3 Mode Selection

```typescript
interface JudgeOptions {
  mode: "STRICT" | "ADVERSARIAL";
}

function judge(
  request: DecisionRequest, 
  options: JudgeOptions = { mode: "STRICT" }
): Promise<Judgement>;
```

---

# 8. ERROR CATALOG

## 8.1 Gate Errors

| Code | Message | Resolution |
|------|---------|------------|
| ERR-C-GATE-01 | Invalid traceId format | Use format "C-{timestamp}-{uuid4}" |
| ERR-C-GATE-02 | Payload hash mismatch | Recompute payloadHash |
| ERR-C-GATE-03 | Invalid contextRef sha256 | Verify file hasn't changed |
| ERR-C-GATE-04 | Invalid inputsDigest | Recompute evidence digest |
| ERR-C-GATE-05 | Empty policyBundle | Add at least one policy |
| ERR-C-GATE-06 | Invalid policy sourceSha256 | Update policy source hash |
| ERR-C-GATE-07 | Magic number detected | Use calibration symbol |

## 8.2 Evaluation Errors

| Code | Message | Resolution |
|------|---------|------------|
| ERR-C-EVAL-01 | Uncalibrated threshold | Provide calibration |
| ERR-C-EVAL-02 | ForgeAdapter unavailable | Check genesis-forge path |
| ERR-C-EVAL-03 | Policy source not found | Verify sourcePath exists |

## 8.3 Chain Errors

| Code | Message | Resolution |
|------|---------|------------|
| ERR-C-CHAIN-01 | Broken chain link | Investigate missing judgement |
| ERR-C-CHAIN-02 | Hash mismatch | Chain may be corrupted |
| ERR-C-CHAIN-03 | Duplicate judgementId | Bug in ID generation |

---

# 9. TEST STRATEGY

## 9.1 Test Categories

| Category | Description | Location |
|----------|-------------|----------|
| **Unit** | Individual component tests | `tests/unit/` |
| **Integration** | Pipeline tests | `tests/integration/` |
| **Adversarial** | Hostile input tests | `tests/adversarial/` |
| **Determinism** | RUN1 == RUN2 tests | `tests/determinism/` |

## 9.2 Test Invariants (INV-C-TEST-*)

| ID | Description | Test Type |
|----|-------------|-----------|
| **INV-C-TEST-01** | All gates reject invalid input | Unit |
| **INV-C-TEST-02** | Pipeline produces valid Judgement | Integration |
| **INV-C-TEST-03** | Hostile inputs handled gracefully | Adversarial |
| **INV-C-TEST-04** | RUN1 and RUN2 produce identical hashes | Determinism |
| **INV-C-TEST-05** | Chain verification detects corruption | Unit |
| **INV-C-TEST-06** | ForgeAdapter respects read-only constraint | Integration |
| **INV-C-TEST-07** | Uncalibrated threshold → DEFER | Unit |
| **INV-C-TEST-08** | BLOCKER violation → REJECT | Unit |
| **INV-C-TEST-09** | Conflict detection → APPEAL | Unit |
| **INV-C-TEST-10** | Golden snapshots match expected output | Determinism |

## 9.3 Test Datasets

| Dataset | Location | Purpose |
|---------|----------|---------|
| `c1_valid_requests.json` | `tests/datasets/` | Happy path tests |
| `c2_invalid_requests.json` | `tests/datasets/` | Gate rejection tests |
| `c3_adversarial.json` | `tests/datasets/` | Hostile input tests |
| `c4_golden_snapshots/` | `tests/datasets/` | Determinism verification |

## 9.4 Test Execution Order

```
1. Unit tests (gates, assembler, evaluators, engine, builder, trace)
2. Integration tests (pipeline, forge-adapter)
3. Adversarial tests (hostile inputs, edge cases)
4. Determinism tests (RUN1 vs RUN2, golden snapshots)
```

## 9.5 Coverage Requirements

| Metric | Target | Rationale |
|--------|--------|-----------|
| Line coverage | ≥ 90% | NASA-Grade requirement |
| Branch coverage | ≥ 85% | DO-178C Level A |
| Invariant coverage | 100% | All INV-C-* must have ≥1 test |

---

# 10. IMPLEMENTATION PLAN

## 10.1 Phase C.1 Milestones

| Milestone | Description | Deliverables |
|-----------|-------------|--------------|
| **C.1.0** | Contract & Spec | This document, C_CONTRACT.md |
| **C.1.1** | Types & Schemas | types.ts, JSON schemas |
| **C.1.2** | Input Gates | gates/, unit tests |
| **C.1.3** | Evidence Assembler | assembler/, unit tests |
| **C.1.4** | Verdict Engine | engine/, unit tests |
| **C.1.5** | Judgement Builder | builder/, unit tests |
| **C.1.6** | Trace Writer | trace/, unit tests |
| **C.1.7** | ForgeAdapter | evaluators/forge-adapter.ts, tests |
| **C.1.8** | Integration | Pipeline tests, determinism tests |
| **C.1.9** | Adversarial | Hostile input tests |
| **C.1.10** | Certification | Seal, manifest, SESSION_SAVE |

## 10.2 Order of Execution (Test-First)

```
1. Define types.ts (all interfaces)
2. Write gate tests (INV-C-GATE-*)
3. Implement gates to pass tests
4. Write assembler tests
5. Implement assembler to pass tests
6. ... repeat for each component
7. Write integration tests
8. Wire pipeline
9. Write determinism tests
10. Verify RUN1 == RUN2
11. Write adversarial tests
12. Harden against hostile inputs
13. Generate certification artifacts
```

## 10.3 Definition of Done (Phase C.1)

```
□ All INV-C-* invariants have passing tests
□ All INV-C-TEST-* test invariants verified
□ RUN1 == RUN2 (determinism proven)
□ Adversarial corpus handled (no crash, proper REJECT/DEFER)
□ Chain integrity verifiable
□ ForgeAdapter respects read-only (INV-C-FA-*)
□ No magic numbers (all τ_* symbols)
□ Documentation complete (C_CONTRACT, SPEC)
□ Artifacts: C_MANIFEST.sha256, C_CERTIFICATION_SEAL.md
□ SESSION_SAVE_PHASE_C.md generated
□ Architect validation
```

---

# 📜 REVISION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-26 | Initial specification (DRAFT) |

---

# 📜 SEAL

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗
║  SPEC_PHASE_C v1.0.0                                                                                  ║
║  Date: 2026-01-26                                                                                     ║
║  Status: DRAFT                                                                                        ║
║                                                                                                       ║
║  Phase C = DECISION / SENTINEL_JUDGE                                                                  ║
║  Standard: NASA-Grade L4 / DO-178C Level A                                                            ║
║                                                                                                       ║
║  Implementation follows TEST-FIRST methodology.                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝
```
