# p.sample.neutral — OMEGA Neutral Reference Plugin

Reference plugin proving the full Gateway→SDK→Plugin pipeline.

## Purpose

Receives a `TextPayload`, produces a `JSONPayload` with text analysis metrics.
Zero side-effects. Stateless. Deterministic. Data-only output.

## Capabilities

- `read_text` — reads text input
- `write_report` — produces JSON analysis report

## IO

**Input**: `TextPayload` (kind=text, content: non-empty string, encoding: utf-8)

**Output**: `JSONPayload` containing:
- `summary` — first 10 words of input
- `word_count` — integer
- `char_count` — integer
- `language_hint` — ISO 639-1 code (en, fr, zh, ru, ar, es, und)
- `tags` — array of content tags (short/medium/long, nature, emotional, etc.)
- `complexity_score` — 0.0 to 1.0

## Compliance Gate

10/10 PASS (CG-01 → CG-10).

## Tests

```bash
npm test
```

52 tests: 24 core + 11 adapter + 17 compliance.
