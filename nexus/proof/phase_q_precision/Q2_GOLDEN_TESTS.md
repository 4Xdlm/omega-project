# Q2_GOLDEN_TESTS — Ferrari Golden Correctness Tests

## RUN_ID
```
19C10E1FE7800000
```

## GOLDEN FIXTURE SET

Due to READ-ONLY constraints, only existing repository fixtures are used.

### Fixture 1: intent_mvp.json

**Source**: `intents/intent_mvp.json`

**Content**:
```json
{
  "intentId": "intent_mvp",
  "actorId": "local_user",
  "content": "Ecris un paragraphe neutre de 5 lignes sur la Résidence Riviera, sans inventer de faits.",
  "goal": "Ecris un paragraphe neutre de 5 lignes sur la Résidence Riviera, sans inventer de faits.",
  "toneId": "NEUTRAL",
  "forbiddenSetId": "OMEGA_DEFAULT",
  "domain": "fiction"
}
```

## GOLDEN MANIFEST

Frozen golden outputs from baseline run:

| File | SHA256 |
|------|--------|
| intent.json | 1e3925160681c0195733a0b81932b8b9c5944b25c8677422bd7befbd81e3e1d4 |
| contract.json | 4ae5437c608253e7e5b45ac0c7a09b0f9f4874ebc79a45bf5481116d54dee6cd |
| truthgate_verdict.json | d379edaeb1243c594ab4e799bbb2694d0291fef27a692c668834a934010f92b1 |
| truthgate_proof.json | f5390e1336febe5efe3363e33a091648ec2bc97a862457a97b6059428c30e740 |
| delivery_manifest.json | 965c501998f72ceb8010b18abd4f03a2aced3bb07665a50e36ad7b4a806a9f3c |
| artifacts/output.txt | 27c09dc70f10696e079a07a8dfe4aac5fc43c33b5f017ac5c291f521325073e1 |

**Run Hash**: `461b18a2c72a79e44f197313bd1711de99506163b6025857c1b7e6a5d6da7f57`

**Evidence**: `EVIDENCE/golden/latest_run/hashes.txt`

## TRIPLE RUN COMPARISON

### Method
Execute same fixture 3 times, compare each run against golden manifest.

### Results

| Run | stdout Hash | Match to Golden |
|-----|-------------|-----------------|
| 1 | a765887d7f8c45328eea8ca48129f7de7901fc8ff274aed4ece7a6f3c786bc40 | ✅ |
| 2 | a765887d7f8c45328eea8ca48129f7de7901fc8ff274aed4ece7a6f3c786bc40 | ✅ |
| 3 | a765887d7f8c45328eea8ca48129f7de7901fc8ff274aed4ece7a6f3c786bc40 | ✅ |

**Note**: stdout contains deterministic run hash `461b18a2c72a79e44f197313bd1711de99506163b6025857c1b7e6a5d6da7f57`.

### Evidence
- `EVIDENCE/diffs/stdout_1v2.txt` — "FC: aucune différence trouvée"
- `EVIDENCE/diffs/stdout_2v3.txt` — "FC: aucune différence trouvée"
- `EVIDENCE/diffs/stdout_1v3.txt` — "FC: aucune différence trouvée"

## GOLDEN ARTIFACTS INSPECTION

### contract.json
```json
{
  "intentId": "intent_mvp",
  "generatedText": "Ecris un paragraphe neutre de 5 lignes sur la Résidence Riviera, sans inventer de faits.",
  "timestamp": "2026-01-28T00:00:00.000Z"
}
```

**Observation**: `timestamp` is fixed at epoch-like value, ensuring determinism.

### truthgate_verdict.json
```json
{
  "passed": true,
  "validatedText": "Ecris un paragraphe neutre de 5 lignes sur la Résidence Riviera, sans inventer de faits.",
  "violations": []
}
```

**Observation**: TruthGate passed, no violations detected.

## FIXTURE COVERAGE ASSESSMENT

| Aspect | Covered | Gap |
|--------|---------|-----|
| Basic intent execution | ✅ | — |
| Intent with constraints | ❌ | No constraint test fixture |
| Batch execution | ❌ | Not tested (would need multiple intents) |
| Capsule creation | ❌ | Not tested (requires additional run) |
| Error path (invalid intent) | ❌ | Not tested |

**Limitation**: Only 1 fixture available in repo. Additional fixtures would require code changes (blocked by READ-ONLY).

## VERDICT

| Criterion | Status |
|-----------|--------|
| Golden manifest created | ✅ PASS |
| TRIPLE RUN matches golden | ✅ PASS |
| Byte-identical outputs | ✅ PASS |
| Coverage complete | ⚠️ PARTIAL (1 fixture only) |

PASS
