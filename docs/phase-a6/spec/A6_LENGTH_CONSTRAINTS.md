# A6 Length Constraints — DORMANT SPEC

## Status: DORMANT

Length constraints for corpus processing.
All values MUST come from calibration file at runtime.

## Constraints (Symbolic)

| Parameter | Source | Default |
|-----------|--------|---------|
| MIN_SENTENCE_LENGTH | calibration | REQUIRED |
| MAX_SENTENCE_LENGTH | calibration | REQUIRED |
| MIN_CORPUS_SIZE | calibration | REQUIRED |
| MAX_BATCH_SIZE | calibration | REQUIRED |

## Rule

NO hardcoded values. All constraints read from:
`tools/calibration/B123_calibration.json`
