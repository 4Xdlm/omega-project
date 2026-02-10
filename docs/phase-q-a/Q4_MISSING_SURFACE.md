# Q4 — Missing Surface Analysis

**Phase**: Q-A (Architecture Audit)
**Date**: 2026-02-10
**HEAD**: 923df7c8

---

## Method

For each identified gap:
1. Compare documented promise (README, QUICKSTART, invariants) against actual implementation
2. Trace content generation path through source code
3. Classify impact per Q0 definitions (BLOCKING / DEGRADED / NON-BLOCKING)

---

## GAP-01 — Real Prose Generation Absent

**Description**: All three content-producing engines (genesis-planner, scribe-engine, style-emergence-engine) use template strings, static arrays, and variable interpolation instead of actual prose generation. No LLM provider, no external content API, no generative model is integrated anywhere in the codebase.

**Evidence**:
- `packages/genesis-planner/src/generators/beat-generator.ts`: 8-item hardcoded action array cycled via `actionIdx = i % actions.length`
- `packages/genesis-planner/src/generators/arc-generator.ts`: 3-item progression templates with string interpolation
- `packages/genesis-planner/src/generators/scene-generator.ts`: `EMPTY_SUBTEXT` with `'__pending__'` markers
- `packages/scribe-engine/src/segmenter.ts`: `[INTENT]`/`[PAYOFF]`/`[PIVOT]`/`[REVEAL]` tag prefixes, not prose
- `packages/scribe-engine/src/weaver.ts`: `buildCadence()` truncates or appends one hardcoded filler phrase; `applyRhythm()` is a no-op; `buildPovPrefix()` returns empty string for all 5 POVs
- `packages/scribe-engine/src/rewriter.ts`: `rewriteProse()` only removes 3 words ("thing", "stuff", "something")
- `packages/style-emergence-engine/src/tournament/variant-generator.ts`: 20-entry `SYNONYM_MAP`, cadence modification via sentence splitting only
- Zero results for `openai`, `anthropic`, `claude`, `gpt`, `fetch`, `axios` across all packages

**What "prose" actually looks like**: `"Escalate tension through interior confrontation."` — metadata rendered as a sentence, not narrative text.

**Impact**: **BLOCKING** — The system cannot produce human-publishable narrative prose. The entire pipeline from IntentPack to ProofPack operates on structural placeholders.

**Phase candidate**: Q-B (Provider Integration)

---

## GAP-02 — LLM Non-Determinism Unaddressed

**Description**: The pipeline guarantees determinism via seed propagation, frozen timestamps, and pure functions. However, this guarantee holds only because mock generators ignore the seed and return static content. When real LLM providers replace mocks, determinism depends on: temperature=0 support, provider-level seed parameters, and bitwise-identical sampling — none of which are standardized across LLM APIs.

**Evidence**:
- `docs/phase-q-a/Q0_DEFINITIONS.md`: "Reality-determinism" section explicitly acknowledges this gap
- Seed is propagated through all generators but unused for content variation
- Determinism tests pass because identical static templates produce identical hashes
- No retry/fallback/caching strategy for non-deterministic provider responses

**Impact**: **BLOCKING** — System-determinism (same seed → same output) is architecturally sound but empirically unproven with real providers. Hash chain integrity (Merkle trees, ProofPacks) collapses if any stage produces non-identical output across runs.

**Phase candidate**: Q-B (Provider Integration + Determinism Hardening)

---

## GAP-03 — Rhetorical Device Application Non-Functional

**Description**: Scribe-engine declares 7 rhetorical device types (anaphora, chiasmus, epistrophe, etc.) but `applyEmphasis()` only tags device names without modifying text. The device is recorded in metadata but never applied to prose.

**Evidence**:
- `packages/scribe-engine/src/weaver.ts`: `applyEmphasis()` pushes device name to array, strips tag prefix, returns text unchanged
- Gate STYLE checks device presence in metadata, not actual text transformation
- README claims "7 gates + 6 oracles" but gate STYLE validates metadata, not prose quality

**Impact**: **DEGRADED** — Pipeline completes successfully. Metadata correctly records which devices *should* apply. Actual prose transformation is absent. Downstream scoring (M6, M7) measures style properties of template text.

**Phase candidate**: Q-B (Content Quality)

---

## GAP-04 — POV (Point of View) Not Applied

**Description**: `buildPovPrefix()` in scribe-engine returns empty string for all 5 POV modes (first, third-limited, third-omniscient, second, mixed). The `Constraints.pov` field is propagated but has zero effect on output.

**Evidence**:
- `packages/scribe-engine/src/weaver.ts`: `buildPovPrefix()` — 5 switch cases, all return `''`

**Impact**: **DEGRADED** — POV constraint is accepted, validated, and propagated, but output is identical regardless of POV setting. No test distinguishes POV-varied outputs.

**Phase candidate**: Q-B (Content Quality)

---

## GAP-05 — Sensory Anchors Are Hash-Based IDs, Not Descriptions

**Description**: Sensory anchors in scribe-engine are hash-derived identifiers (e.g., `ambient-a7f3c4b9`) rather than actual sensory descriptions. They serve as tracking tokens, not narrative content.

**Evidence**:
- `packages/scribe-engine/src/sensory.ts`: `derivedAnchor = 'ambient-' + sha256(sceneId + '-sensory').slice(0, 8)`
- Scene-level sensory anchors from genesis-planner are already templates: `"Sensory anchor for betrayal scene 1"`

**Impact**: **DEGRADED** — Sensory tracking structure works. Anchors participate in evidence chains. Content is placeholder, not immersive sensory language.

**Phase candidate**: Q-B (Content Quality)

---

## GAP-06 — Rewriting Pipeline Is Word Filter Only

**Description**: `rewriteProse()` in scribe-engine performs multi-pass "rewriting" but each pass only filters 3 words ("thing", "stuff", "something"). No sentence restructuring, no clarity improvement, no voice refinement occurs.

**Evidence**:
- `packages/scribe-engine/src/rewriter.ts`: `rewriteProse()` — `words.filter(w => lower !== 'thing' && lower !== 'stuff' && lower !== 'something')`
- Multi-pass architecture exists (pass 1, 2, 3) but all passes apply the same 3-word filter

**Impact**: **DEGRADED** — Rewrite infrastructure is sound (pass tracking, gate evaluation between passes). Content transformation is minimal.

**Phase candidate**: Q-B (Content Quality)

---

## GAP-07 — Variant Generation Limited to 20-Word Synonym Map

**Description**: Style-emergence-engine's tournament self-play generates "variants" by swapping words from a 20-entry synonym dictionary and splitting/merging sentences. Vocabulary coverage is negligible. Variants are structurally different but semantically near-identical.

**Evidence**:
- `packages/style-emergence-engine/src/tournament/variant-generator.ts`: `SYNONYM_MAP` with 20 entries (big→large, small→tiny, good→fine, etc.)
- `modifyCadence()`: splits long sentences, swaps order
- `modifyLexicon()`: max substitutions = `floor(words.length / 15)`

**Impact**: **DEGRADED** — Tournament architecture functions. Self-play produces differentiated variants. Differentiation is mechanical (synonym swap) rather than meaningful (style variation).

**Phase candidate**: Q-B (Content Quality)

---

## GAP-08 — M1-M12 Metrics Score Placeholder Content

**Description**: Omega-forge's 12 quality metrics (M1-M12) contain real calculations — contradiction detection, coherence span, lexical diversity, canon coverage, etc. However, they score template text that was never meant to be final prose. Metric values are structurally valid but semantically meaningless.

**Evidence**:
- `packages/omega-forge/src/quality/canon-compliance.ts`: M1 contradiction detection via keyword negation search on template strings
- `packages/omega-forge/src/quality/necessity-metrics.ts`: M8 sentence uniqueness via word overlap on templates that share identical vocabulary
- `packages/omega-forge/src/benchmark/composite-scorer.ts`: M12 weighted composite of M1-M11
- All metrics pass thresholds because template text is repetitive and inoffensive

**Impact**: **DEGRADED** — Metric infrastructure is production-ready. Calibration against real prose is required. Current thresholds may need adjustment when scoring actual narrative content.

**Phase candidate**: Q-B (Metric Calibration)

---

## GAP-09 — Input Validation Boundary (Post-H1 State)

**Description**: Sprint H1 added intent validation with 10 rules (V-01→V-05 structural, S-01→S-05 security) to omega-runner CLI. Post-hardening: 9/10 attack scenarios rejected. Remaining gap: ATK-10 (seed mismatch) passes because mock generators ignore seed entirely.

**Evidence**:
- `EVIDENCE_HARDENING.md`: 9/10 PASS, ATK-10 FAIL (mock limitation)
- `packages/omega-runner/src/validation/intent-validator.ts`: 10 validation rules
- Validation covers CLI entry points only (run-create, run-full). Programmatic API consumers (creation-pipeline direct usage) bypass validation.

**Impact**: **NON-BLOCKING** — CLI boundary is hardened. Programmatic API boundary is unhardened but is an internal interface (no external user access). ATK-10 resolves naturally when real providers consume seeds.

**Phase candidate**: Q-B (Provider Integration resolves ATK-10), future hardening sprint for API boundary

---

## GAP-10 — Phantom Dependency: omega-governance → canon-kernel

**Description**: omega-governance declares `@omega/canon-kernel` as a dependency in package.json but has zero imports from it in source code.

**Evidence**:
- `packages/omega-governance/package.json`: `"@omega/canon-kernel": "file:../canon-kernel"`
- Grep for `canon-kernel` or `@omega/canon-kernel` in `packages/omega-governance/src/`: zero results
- Q3 necessity audit confirmed this finding

**Impact**: **NON-BLOCKING** — Phantom dependency adds no weight (file: protocol, workspace link). No runtime effect. Build graph is marginally inflated.

**Phase candidate**: Housekeeping (can be removed at any time)

---

## Summary Table

| GAP | Title | Impact | Phase |
|-----|-------|--------|-------|
| GAP-01 | Real prose generation absent | BLOCKING | Q-B |
| GAP-02 | LLM non-determinism unaddressed | BLOCKING | Q-B |
| GAP-03 | Rhetorical devices non-functional | DEGRADED | Q-B |
| GAP-04 | POV not applied | DEGRADED | Q-B |
| GAP-05 | Sensory anchors are hash IDs | DEGRADED | Q-B |
| GAP-06 | Rewriting is word filter only | DEGRADED | Q-B |
| GAP-07 | Variant generation limited | DEGRADED | Q-B |
| GAP-08 | M1-M12 score placeholder content | DEGRADED | Q-B |
| GAP-09 | Input validation boundary (post-H1) | NON-BLOCKING | Q-B / future |
| GAP-10 | Phantom dependency governance→kernel | NON-BLOCKING | Housekeeping |

**BLOCKING**: 2 | **DEGRADED**: 6 | **NON-BLOCKING**: 2

---

## Architectural Verdict

The system is a **deterministic narrative scaffolding framework** with production-grade structural guarantees (hash chains, Merkle trees, invariant checks, gate-based validation). Content generation is entirely template-based. The transition from scaffolding to production requires replacing 12 mock generators across 3 packages with real LLM-backed providers, then recalibrating M1-M12 thresholds against actual prose.

The scaffolding is sound. The content layer is absent.
