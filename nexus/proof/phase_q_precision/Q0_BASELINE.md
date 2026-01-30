# Q0_BASELINE — Establish Baseline Behavior

## RUN_ID
```
19C10E1FE7800000
```

## TARGET ARTEFACT
```
dist/runner/main.js
SHA256: 91E103ED77C1BF3139F6AF134E758B4CD8C833C06F5F8780D7E59067D94F4F96
```
Evidence: `EVIDENCE/artefact_sha256.txt`

## CLI DISCOVERY

Available commands discovered via `omega help`:
- `run` — Execute a single intent file
- `batch` — Execute all intents in a directory  
- `verify` — Verify a completed run
- `capsule` — Create hermetic capsule from a run
- `help` — Show help message

Evidence: `EVIDENCE/drivers.txt`

## INPUT DISCOVERY

Existing intent in repository:
- `intents/intent_mvp.json`

Evidence: `EVIDENCE/available_intents.txt`

## BASELINE EXECUTION

### Command
```
node dist/runner/main.js run --intent intents/intent_mvp.json
```

### Results (TRIPLE RUN)

| Run | Exit Code | stdout SHA256 |
|-----|-----------|---------------|
| 1   | 0         | a765887d7f8c45328eea8ca48129f7de7901fc8ff274aed4ece7a6f3c786bc40 |
| 2   | 0         | a765887d7f8c45328eea8ca48129f7de7901fc8ff274aed4ece7a6f3c786bc40 |
| 3   | 0         | a765887d7f8c45328eea8ca48129f7de7901fc8ff274aed4ece7a6f3c786bc40 |

Evidence:
- `EVIDENCE/executions/run1/stdout.txt`
- `EVIDENCE/executions/run2/stdout.txt`
- `EVIDENCE/executions/run3/stdout.txt`
- `EVIDENCE/hashes/run1_stdout_sha256.txt`
- `EVIDENCE/hashes/run2_stdout_sha256.txt`
- `EVIDENCE/hashes/run3_stdout_sha256.txt`

### stdout Content (identical across runs)
```
✅ Run completed successfully
   Run ID:   run_intent_mvp_1
   Run Path: C:\Users\elric\omega-project\artefacts\runs\run_intent_mvp_1
   Run Hash: 461b18a2c72a79e44f197313bd1711de99506163b6025857c1b7e6a5d6da7f57
```

## PRODUCED ARTIFACTS

Run directory: `artefacts/runs/run_intent_mvp_1/`

| File | SHA256 (from hashes.txt) |
|------|--------------------------|
| intent.json | 1e3925160681c0195733a0b81932b8b9c5944b25c8677422bd7befbd81e3e1d4 |
| contract.json | 4ae5437c608253e7e5b45ac0c7a09b0f9f4874ebc79a45bf5481116d54dee6cd |
| truthgate_verdict.json | d379edaeb1243c594ab4e799bbb2694d0291fef27a692c668834a934010f92b1 |
| truthgate_proof.json | f5390e1336febe5efe3363e33a091648ec2bc97a862457a97b6059428c30e740 |
| delivery_manifest.json | 965c501998f72ceb8010b18abd4f03a2aced3bb07665a50e36ad7b4a806a9f3c |
| artifacts/output.txt | 27c09dc70f10696e079a07a8dfe4aac5fc43c33b5f017ac5c291f521325073e1 |

Run Hash: `461b18a2c72a79e44f197313bd1711de99506163b6025857c1b7e6a5d6da7f57`

Evidence: `EVIDENCE/golden/latest_run/hashes.txt`

## VERIFY COMMAND TEST

```
node dist/runner/main.js verify --run artefacts/runs/run_intent_mvp_1
```

Output:
```
Verifying run: C:\Users\elric\omega-project\artefacts\runs\run_intent_mvp_1
✅ Verification PASSED
   Files checked: 12
   Files valid:   12
```

Evidence: `EVIDENCE/executions/verify_output.txt`

## BASELINE VERDICT

| Criterion | Status |
|-----------|--------|
| Artefact executable | ✅ YES |
| Stable exit code | ✅ YES (0 on all runs) |
| Stable stdout hash | ✅ YES (identical) |
| Produces artifacts | ✅ YES (6 files + run_hash) |
| Verify passes | ✅ YES |

PASS
