# Q3_DIFFERENTIAL — Differential Testing

## RUN_ID
```
19C10E1FE7800000
```

## APPROACH 1: Run vs Verify (Preferred)

### Hypothesis
If `run` produces artifacts and `verify` validates them, they must agree on correctness.

### Test

**Step 1**: Execute run
```
node dist/runner/main.js run --intent intents/intent_mvp.json
```
Exit code: 0 (SUCCESS)

**Step 2**: Execute verify on produced run
```
node dist/runner/main.js verify --run artefacts/runs/run_intent_mvp_1
```

**Result**:
```
Verifying run: C:\Users\elric\omega-project\artefacts\runs\run_intent_mvp_1
✅ Verification PASSED
   Files checked: 12
   Files valid:   12
```

**Evidence**: 
- `EVIDENCE/executions/run1/stdout.txt`
- `EVIDENCE/executions/verify_output.txt`

### Verdict
Run and Verify agree: ✅ PASS

---

## APPROACH 2: TRIPLE RUN Differential

### Hypothesis
Multiple executions with identical input must produce identical observable outputs.

### Test

| Comparison | Files | Result |
|------------|-------|--------|
| run1 vs run2 | stdout.txt | FC: aucune différence trouvée |
| run2 vs run3 | stdout.txt | FC: aucune différence trouvée |
| run1 vs run3 | stdout.txt | FC: aucune différence trouvée |

**Evidence**:
- `EVIDENCE/diffs/stdout_1v2.txt`
- `EVIDENCE/diffs/stdout_2v3.txt`
- `EVIDENCE/diffs/stdout_1v3.txt`

### Verdict
All runs identical: ✅ PASS

---

## APPROACH 3: Canonical Event Log Extraction (Radical Variant)

### Method
Extract stdout, normalize ordering to separate content from timing/ordering effects.

### Raw stdout (from run1):
```
✅ Run completed successfully
   Run ID:   run_intent_mvp_1
   Run Path: C:\Users\elric\omega-project\artefacts\runs\run_intent_mvp_1
   Run Hash: 461b18a2c72a79e44f197313bd1711de99506163b6025857c1b7e6a5d6da7f57
```

### Analysis
- No timestamps in stdout
- No ANSI escape codes
- Fixed structure (4 lines)
- Run hash is deterministic

### Sorted Line Comparison
```
   Run Hash: 461b18a2c72a79e44f197313bd1711de99506163b6025857c1b7e6a5d6da7f57
   Run ID:   run_intent_mvp_1
   Run Path: C:\Users\elric\omega-project\artefacts\runs\run_intent_mvp_1
✅ Run completed successfully
```

**Observation**: Even when sorted, content is deterministic across runs.

### Verdict
No nondeterminism detected even in radical analysis: ✅ PASS

---

## DIFFERENTIAL SUMMARY

| Approach | Method | Result |
|----------|--------|--------|
| 1 | Run vs Verify | ✅ PASS |
| 2 | TRIPLE RUN comparison | ✅ PASS |
| 3 | Canonical event log (radical) | ✅ PASS |

**Critical Finding**: stdout is fully deterministic. No ordering variance, no timing variance, no content variance.

PASS
