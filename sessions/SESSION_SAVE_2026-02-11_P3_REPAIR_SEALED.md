# SESSION SAVE — P.3 AUTO-REPAIR SEALED

## Metadata

| Field | Value |
|-------|-------|
| Date | 2026-02-11 |
| Phase | P.3 Auto-Repair Loop |
| Branch | master |
| Commit | 2d1898d9 |

## What P.3 Adds

Automatic self-healing of HARD FAIL scenes — 1 cycle max, fail-closed.

## Architecture

```
ProsePack (FAIL) → identify HARD scenes → repair prompt (word count enforced
                    + adjacent scene continuity) → regen via provider → validate
                    → if PASS: replace scene → if FAIL: keep original + NCR
```

### Invariants
- Max 1 regen per scene (no infinite loop)
- Non-FAIL scenes NEVER touched
- Continuity preserved (previous/next scene context)
- Repair cached for deterministic replay
- Full evidence trail (repair-report.json)

## Results

### Before Repair (P.2-B baseline)

| Run | Satisfaction | Hard | Composite |
|-----|-------------|------|-----------|
| 001 Le Gardien | 0.917 | 3 | 0.960 |
| 002 Le Choix | 1.000 | 0 | 1.000 |

### After Repair (P.3)

| Run | Satisfaction | Hard | Composite | Repaired |
|-----|-------------|------|-----------|----------|
| 001 Le Gardien | **1.000** | **0** | **0.962** | 3/3 ✅ |
| 002 Le Choix | 1.000 | 0 | 1.000 | 0/0 (clean) |

### Scene-level Repair Detail (Run 001)

| Scene | Before | After | Status |
|-------|--------|-------|--------|
| SCN-ARC-001-002 | 538 words | 603 words | ✅ |
| SCN-ARC-002-002 | 515 words | 736 words | ✅ |
| SCN-ARC-003-003 | 438 words | 820 words | ✅ |

## System Maturity

| Capability | Phase | Status |
|------------|-------|--------|
| Deterministic planning | C.1-C.5 | ✅ |
| LLM prose generation | P.2-A | ✅ |
| Contractual validation | P.2-B | ✅ |
| Auto-repair | **P.3** | **✅** |
| Cache replay | P.2-A | ✅ |
| Prose metrics | P.2-B | ✅ |
| 17 structural metrics | R-METRICS | ✅ |

## Files

| File | Purpose |
|------|---------|
| packages/scribe-engine/src/prosepack/repair.ts | Repair loop engine |
| metrics/h2/scribe_p3_001/repair-report.json | Evidence trail |
| metrics/h2/scribe_p3_001/ProsePack.json | Post-repair ProsePack |
| metrics/h2/scribe_p3_001/scribe-prose-repaired.txt | Repaired prose text |
