# NCR-G1B-001: Hostile Intent Not Rejected

**Status**: OPEN
**Severity**: MEDIUM
**Phase**: G.1-B

## Issue

The OMEGA CLI accepts hostile intents without validation. The following attacks
were all processed through all 6 stages (exit code 0):

- SQL injection in title: `'; DROP TABLE omega;--`
- XSS in themes: `<script>alert('xss')</script>`
- Path traversal in core_emotion: `../../etc/passwd`
- Negative paragraphs: `-1`
- Extreme paragraphs: `999999`
- Empty intent: `{}`
- Unicode adversarial: zero-width + RTL characters

Only malformed JSON (parse error) was correctly rejected (exit code 1).

## Root Cause

The runner pipeline does not validate intent fields before processing.
Mock generators accept any input without bounds checking or sanitization.

## Impact

In the current mock-generator system, the impact is low — no real text
generation occurs, and the ProofPack integrity chain remains valid.
However, this would be critical if real LLM generators were integrated.

## Recommendation

1. Add intent validation in `genesis-planner` (field types, bounds, sanitization)
2. Reject `paragraphs < 1` or `paragraphs > 100`
3. Sanitize or reject special characters in title/themes/core_emotion
4. Return exit code 5 (INVARIANT_BREACH) for invalid intents

## Decision

Pending Francky approval.
