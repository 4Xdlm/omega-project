# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA SOVEREIGN ENGINE — CLAUDE CODE AUTONOMOUS PROMPT
# MOVES A+B: RCI V2 + IFI BOOST + ENGINE WIRING FIXES
# ═══════════════════════════════════════════════════════════════════════════════
#
# Standard: NASA-Grade L4 / DO-178C Level A
# Objectif: Passer de composite 87.38 → ≥92 en corrigeant 5 bugs structurels
# Contrainte: ZÉRO modification aux types/interfaces existants
#            ZÉRO régression sur les 141 tests existants
#
# CONTEXT:
# - ECC=95.2 ✅, SII=89.9 ✅ — RÉSOLUS
# - RCI=57.9 🔴 (floor 85, gap -27.1) — BOSS FINAL
# - IFI=80.7 🔴 (floor 85, gap -4.3) — PROCHE
#
# ROOT CAUSES IDENTIFIED (5 bugs):
# 1. engine.ts: duel called WITHOUT existingProse and WITHOUT symbolMap
# 2. anti-cliche-sweep.ts: inserts literal "[CLICHE_REMOVED]" text in prose
# 3. rhythm.ts: scoring too mechanical for literary prose
# 4. macro-axes.ts: signature hooks from SymbolMap not checked in RCI
# 5. macro-axes.ts: IFI corporeal detection misses derivatives
# ═══════════════════════════════════════════════════════════════════════════════

## MISSION

You are working on `packages/sovereign-engine` in a TypeScript monorepo at `/Users/elric/omega-project`.

Execute these 5 SURGICAL fixes. Each fix is independent and testable.

## RECONNAISSANCE (MANDATORY FIRST STEP)

Before ANY code change, read these files completely:
```
packages/sovereign-engine/src/engine.ts
packages/sovereign-engine/src/duel/duel-engine.ts
packages/sovereign-engine/src/polish/anti-cliche-sweep.ts
packages/sovereign-engine/src/oracle/axes/rhythm.ts
packages/sovereign-engine/src/oracle/macro-axes.ts
packages/sovereign-engine/src/config.ts
packages/sovereign-engine/src/types.ts
packages/sovereign-engine/src/input/prompt-assembler-v2.ts
packages/sovereign-engine/src/oracle/aesthetic-oracle.ts
packages/sovereign-engine/src/oracle/s-score.ts
packages/sovereign-engine/tests/fixtures/mock-provider.ts
```

## FIX 1 — ENGINE WIRING (Critical)

### File: `src/engine.ts`

**Problem**: When V1 loop says SEAL but V3 says REJECT, the engine falls through to duel. But duel is called WITHOUT:
- `existingProse` (the loop-refined prose, 2 passes of work thrown away)
- `symbolMap` (so duel uses V1 scoring instead of V3)

**Fix**: Change the duel call to pass both:
```typescript
// BEFORE (broken):
const duel_result = await runDuel(packet, prompt.sections.map((s) => s.content).join('\n\n'), provider);

// AFTER (fixed):
const duel_result = await runDuel(
  packet,
  prompt.sections.map((s) => s.content).join('\n\n'),
  provider,
  loop_result.final_prose,  // Preserve loop refinement work
  symbolMap,                 // Enable V3 scoring in duel
);
```

**Invariant**: INV-ENGINE-DUEL-01: Duel MUST receive loop prose + symbolMap when available.

## FIX 2 — ANTI-CLICHÉ SWEEP (Critical)

### File: `src/polish/anti-cliche-sweep.ts`

**Problem**: `sweepCliches` replaces clichés with literal text `[CLICHE_REMOVED]`. This:
- Destroys prose quality
- Creates garbage text that tanks ALL scores
- Makes rhythm scoring meaningless (rhythm of garbage ≠ rhythm of prose)

**Fix**: Remove destructive replacement. Instead, use a SOFT approach:
- If clichés found, return prose AS-IS (the duel/pitch system handles quality)
- Log the cliché count for diagnostics but DO NOT mutilate the prose
- The anti_cliche SCORE (in axes/anti-cliche.ts) still correctly penalizes clichés — that's sufficient

```typescript
export function sweepCliches(packet: ForgePacket, prose: string): string {
  const clicheDelta = computeClicheDelta(packet, prose);
  
  // NEVER mutilate prose. The anti_cliche scoring axis handles penalties.
  // Destructive replacement with "[CLICHE_REMOVED]" destroys rhythm, 
  // coherence, and all downstream scores.
  // Return prose unchanged — quality is enforced via scoring, not text surgery.
  return prose;
}
```

**Invariant**: INV-SWEEP-NOMOD-01: sweepCliches MUST return prose unchanged (no string replacement).

## FIX 3 — RHYTHM SCORING V2 (High Impact — RCI main component)

### File: `src/oracle/axes/rhythm.ts`

**Problem**: Rhythm scoring rewards mechanical patterns (exact syncopes, exact compressions) that literary prose doesn't naturally produce. A beautifully varied prose gets 54/100 because it doesn't have "≤8 word sentence after ≥18 word sentence".

**Fix**: Replace binary detection with continuous measurement of sentence length VARIANCE. Literary prose quality = rich variation, not specific patterns.

New scoring algorithm (100 pts total):

```
SENTENCE LENGTH VARIANCE (35 pts):
- Compute coefficient of variation (CV = stddev/mean) of sentence word counts
- CV in [0.40, 0.80] = optimal variety → 35 pts (peak at 0.60)
- CV < 0.40 = too uniform → linear falloff
- CV > 0.80 = too chaotic → linear falloff

PARAGRAPH LENGTH VARIANCE (15 pts):
- Same CV approach on paragraph word counts
- CV in [0.25, 0.65] = optimal → 15 pts

LENGTH RANGE (15 pts):
- Compute (max_sentence_length - min_sentence_length)
- Range ≥ 20 words → 15 pts
- Range 10-19 → proportional
- Range < 10 → 0

MONOTONY AVOIDANCE (15 pts):
- Keep existing monotony_sequences check from computeStyleDelta
- 0 sequences = 15 pts, graduated falloff

OPENING VARIETY (10 pts):
- Keep existing opening_repetition_rate check
- Graduated (not binary)

BREATHING (10 pts):
- At least 1 sentence ≥ 25 words AND at least 1 sentence ≤ 7 words = 10 pts
- Only long or only short = 5 pts
- Neither = 0 pts
```

Keep the `details` string for diagnostics: `CV_sent=X.XX, CV_para=X.XX, range=X, monotony=X, opening_rep=X%`

**Important**: Remove all references to SYNCOPE and COMPRESSION counts from rhythm scoring. These are mechanical metrics that punish literary prose. The CV-based approach rewards the RESULT (variation) not the MECHANISM (specific patterns).

You can still import `computeStyleDelta` for monotony_sequences and opening_repetition_rate. But DO NOT use gini_actual, syncopes, or compressions.

**Invariant**: INV-RHYTHM-CV-01: Rhythm score uses coefficient of variation, not pattern counting.

## FIX 4 — SIGNATURE HOOKS IN RCI (Medium Impact)

### File: `src/oracle/macro-axes.ts`

**Problem**: RCI = rhythm×0.55 + signature×0.45. Signature scoring (in axes/signature.ts) checks signature words + forbidden words + abstraction ratio. But Symbol Map provides `signature_hooks` per quartile that are NEVER verified. A prose that ignores all hooks still scores 60+ on signature.

**Fix**: Add a hook verification component to RCI computation. In `computeRCI`:

```typescript
// After computing rhythm and signature sub_scores:

// NEW: Symbol Map hook verification (if hooks are available in packet)
const hookScore = computeHookPresence(prose, packet);

// Blend: rhythm×0.45 + signature×0.35 + hooks×0.20
const rci_raw = rhythm.score * 0.45 + signature.score * 0.35 + hookScore * 0.20;
```

`computeHookPresence(prose, packet)`:
- Extract signature words/motifs from `packet.style_genome.imagery.recurrent_motifs`
- For each motif keyword, check if present in prose (case-insensitive substring match using `lowerProse.includes(motif.toLowerCase())`)
- Score = (motifs_found / total_motifs) × 100
- If no motifs defined or empty array, return 75 (neutral, no penalty)
- Add as a sub_score with name 'hook_presence', method 'CALC'

**Invariant**: INV-RCI-HOOKS-01: RCI includes hook verification weight ≥0.15.

## FIX 5 — IFI SENSORY DISTRIBUTION (Low Impact — +4.3 pts needed)

### File: `src/oracle/macro-axes.ts`

**Problem**: IFI = sensory_richness×0.3 + corporeal_anchoring×0.3 + focalisation×0.4. The focalisation component (LLM via scoreSensoryDensity) is noisy. IFI needs +4.3 pts.

**Fix 1**: In `computeIFI`, add a CALC-based distribution bonus:
- Split prose into 4 quartiles by paragraphs
- Check each quartile has at least 1 corporeal marker (using CORPOREAL_MARKERS from config, substring match)
- If all 4 quartiles covered → +10 bonus (capped at 100 total)
- If 3/4 → +5
- If ≤2 → 0

**Fix 2**: Increase corporeal_anchoring weight from 0.3 to 0.35, reduce focalisation from 0.4 to 0.35.
Rationale: focalisation is LLM-judged and noisy. Corporeal is CALC and deterministic.

New blend: sensory_richness×0.30 + corporeal_anchoring×0.35 + focalisation×0.35 + distribution_bonus

**Invariant**: INV-IFI-DISTRIB-01: IFI includes quartile distribution bonus.

## EXECUTION ORDER

1. Fix 2 (sweepCliches — 30 seconds, highest ROI)
2. Fix 1 (engine wiring — 2 minutes)
3. Fix 3 (rhythm V2 — 15 minutes, most complex)
4. Fix 4 (RCI hooks — 10 minutes)
5. Fix 5 (IFI distribution — 5 minutes)

## TEST REQUIREMENTS

### Existing tests: ALL 141 must pass (zero regressions)

### New tests required:

**rhythm-v2.test.ts** (≥8 tests):
- CV computation is deterministic
- Uniform prose (all same length) → CV near 0 → low score
- Varied prose → CV in optimal range → high score
- Very chaotic prose → CV too high → penalty
- Breathing: prose with both long and short sentences → bonus
- Length range: prose with wide range → high score
- Score is always [0, 100]
- Monotone prose penalty

**engine-wiring.test.ts** (≥4 tests):
- Duel receives existingProse when loop verdict was SEAL but V3 REJECT
- Duel receives symbolMap when available
- V3 REJECT after V1 SEAL → falls through to duel with prose + symbolMap
- V3 SEAL after V1 SEAL → returns immediately

**sweep-noop.test.ts** (≥3 tests):
- sweepCliches returns prose unchanged always
- sweepCliches with no clichés returns same
- sweepCliches with clichés STILL returns same (no mutation)

**rci-hooks.test.ts** (≥4 tests):
- Hook presence computed from motifs
- All hooks present → 100
- No hooks present → 0
- No hooks defined → 75 (neutral)
- Partial hooks → proportional

**ifi-distribution.test.ts** (≥4 tests):
- All quartiles have markers → +10 bonus
- 3/4 quartiles → +5
- ≤2 quartiles → 0
- New weight blend: 0.30 + 0.35 + 0.35

### TOTAL: ≥23 new tests + 141 existing = ≥164 tests all PASS

## VALIDATION

After all changes:
```bash
cd packages/sovereign-engine
npx vitest run
```

Expected: ≥164 tests, 0 failures, 0 errors.

## CONSTRAINTS

- TypeScript strict mode, zero `any` types
- Zero TODO/FIXME/HACK
- All functions must have JSDoc comment
- Zero modifications to existing type interfaces (SovereignForgeResult, SScore, MacroSScore etc.)
- All new functions must be exported and documented
- Config constants for all magic numbers (add to SOVEREIGN_CONFIG if needed)

## WHAT NOT TO DO

- Do NOT modify types.ts interfaces
- Do NOT modify s-score.ts computation logic
- Do NOT modify aesthetic-oracle.ts
- Do NOT modify prompt-assembler-v2.ts (already has rhythm/corporeal sections)
- Do NOT touch golden-loader.ts, anthropic-provider.ts, or any runtime/ files
- Do NOT add new dependencies
- Do NOT change the CLI (sovereign-live.ts)

## SUCCESS CRITERIA

After these fixes, the next LIVE1 run should show:
- RCI: 57.9 → ≥75 (rhythm CV + hooks + no [CLICHE_REMOVED])
- IFI: 80.7 → ≥85 (distribution bonus + weight rebalance)
- ECC: ≥95 (unchanged)
- SII: ≥85 (no [CLICHE_REMOVED] garbage)
- Composite: ≥87 → approaching 92
