# SSX A6 Canonical Form — DORMANT SPEC

## Status: DORMANT

SSX (Symbolic Sentence eXtract) canonical format for A.6 processing.

## Format

```
SSX := {
  id: sha256(content),
  content: string,
  emotion: EmotionV2,
  source: corpus_ref,
  timestamp_unsigned: ISO8601  // unsigned = not part of hash
}
```

## Canonicalization Rules

1. Content normalized (trim, lowercase for hash)
2. Emotion values from calibrated analysis
3. ID = SHA256 of normalized content
4. Timestamps in `_unsigned` fields only (not hashed)

## Determinism

Same input corpus + same calibration => same SSX outputs => same hashes.
