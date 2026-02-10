# Q0 — Operational Definitions

**Phase**: Q-A (Architecture Audit)
**Date**: 2026-02-10
**HEAD**: 923df7c8

---

## Necessity (evaluated in Q-A)

A module is **NECESSARY** (ESSENTIAL) if and only if:
- Its removal would cause at least 1 test FAIL in another package
- OR its removal would eliminate a unique capability not covered by any other module
- OR its removal would break a documented guarantee (invariant, exit code, proof chain)

A module is **REDUNDANT** if:
- Its functionality is entirely covered by another existing module
- AND its removal would cause zero test FAILs after import adaptation

A module is **UNJUSTIFIED** if:
- It fulfills no measurable role in the pipeline
- AND no test depends on it
- AND no invariant references it

A module is **INCONCLUSIVE** if:
- The evaluation cannot reach a verdict (e.g., mock masks real behavior)
- The module's necessity depends on a capability not yet implemented

**Test for necessity**: `npm uninstall <pkg> && npm test` in all dependents. If any test fails, the module is ESSENTIAL.

---

## Missing Surface (evaluated in Q-A)

A missing surface is an absent capability that:
- Prevents the system from fulfilling a documented promise
- OR creates a conceptual gap between user intent and system result
- OR leaves an attack vector open despite existing hardening

**Test for missing surface**: Compare documented guarantees (README, QUICKSTART, invariants) against actual implementation. Any promise without backing code is a missing surface.

**Impact levels**:
- **BLOCKING**: System cannot fulfill its stated purpose without this capability
- **DEGRADED**: System works but with known limitations documented as acceptable
- **NON-BLOCKING**: Nice-to-have, not required for stated purpose

---

## Correctness (NOT evaluated in Q-A — deferred to Q-B)

A module's output is **correct** if:
- Given a well-formed input, the output conforms to the module's stated contract
- The output satisfies all invariants declared by the module
- The output is usable by downstream consumers without error

**Why deferred**: Mock generators produce static content. Correctness of narrative output requires real LLM providers, which are absent. Structural correctness (types, hash chains) is verifiable; semantic correctness (story quality) is not.

---

## Precision (NOT evaluated in Q-A — deferred to Q-B)

A module has **precision** if:
- It can distinguish between meaningfully different inputs
- Different intents produce observably different outputs
- The scoring system (omega-forge M1-M12) produces non-trivial differentiation

**Why deferred**: Mock generators return identical content regardless of input variation. Precision measurement requires real content generation. Current mock-determinism masks the complete absence of precision.

---

## Determinism: Mock vs System vs Reality

### Mock-determinism (current state)
- Same input -> same output because mocks return **static content**
- The seed parameter is propagated but **ignored by generators**
- Hash chains are valid but prove only pipeline determinism, not content determinism
- **Proven**: Yes, by test `determinism.test.ts` and quickstart replay

### System-determinism (architectural guarantee)
- Same input + same seed -> same output because the pipeline is **pure** (no side effects, no external state)
- All randomness is derived from seed via deterministic functions
- All timestamps are injected (frozen at `2026-01-01T00:00:00.000Z`)
- **Proven**: Yes, for mock generators. Untested with real providers.

### Reality-determinism (future requirement)
- Same input + same seed + same LLM + same temperature -> same output
- Requires: temperature=0, deterministic sampling, provider-level seed support
- **Proven**: No. Cannot be proven until real LLM integration exists.
- **Risk**: Most LLM APIs do not guarantee bitwise-identical outputs even at temperature=0
