/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — CALC PRE-SCORER (P3-01)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: duel/calc-pre-scorer.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * REJECTOR, not selector. Eliminates dead duel candidates BEFORE expensive
 * judgeAestheticV3 scoring (~7-8 LLM calls per candidate).
 *
 * Uses ONLY CALC axes (0 LLM, fully deterministic):
 *   - rhythm      (scoreRhythm)
 *   - anti_cliche  (scoreAntiCliche)
 *   - euphony_basic (scoreEuphonyBasic)
 *   - signature    (scoreSignature — TELEMETRY ONLY, not decisional in v1)
 *
 * RULES (validated by Francky 2026-04-04):
 *
 *   HARD REJECT:
 *     rhythm < 45 → REJECT
 *     anti_cliche < 50 → REJECT
 *
 *   RED FLAGS:
 *     rhythm < 55
 *     euphony < 45
 *     anti_cliche < 70
 *
 *   CUMUL RULE:
 *     2+ red flags → REJECT
 *
 *   GUARDRAIL:
 *     max 2 rejects per duel (always keep ≥2 candidates)
 *
 *   SIGNATURE:
 *     logged for telemetry, NOT decisional in v1
 *
 * INV-P3-PRESCORE-01: Pre-scorer is a rejector — never selects a winner.
 * INV-P3-PRESCORE-02: At least 2 candidates always survive.
 * INV-P3-PRESCORE-03: All CALC axes are deterministic, 0 LLM.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket, Draft } from '../types.js';
import { scoreRhythm } from '../oracle/axes/rhythm.js';
import { scoreAntiCliche } from '../oracle/axes/anti-cliche.js';
import { scoreEuphonyBasic } from '../oracle/axes/euphony-basic.js';
import { scoreSignature } from '../oracle/axes/signature.js';

// ── Thresholds (SSOT for P3-01) ─────────────────────────────────────────────

/** Hard reject: rhythm below this → immediate REJECT */
export const PRESCORE_RHYTHM_HARD_REJECT = 45;

/** Hard reject: anti_cliche below this → immediate REJECT */
export const PRESCORE_ANTICLICHE_HARD_REJECT = 50;

/** Red flag: rhythm below this → 1 flag */
export const PRESCORE_RHYTHM_RED_FLAG = 55;

/** Red flag: euphony below this → 1 flag */
export const PRESCORE_EUPHONY_RED_FLAG = 45;

/** Red flag: anti_cliche below this → 1 flag */
export const PRESCORE_ANTICLICHE_RED_FLAG = 70;

/** Cumul threshold: this many red flags → REJECT */
export const PRESCORE_RED_FLAG_CUMUL = 2;

/** Guardrail: never reject more than this many candidates per duel */
export const PRESCORE_MAX_REJECTS = 2;

// ── Types ────────────────────────────────────────────────────────────────────

export interface CalcPreScoreResult {
  readonly draft_id: string;
  readonly mode: string;
  readonly rhythm_score: number;
  readonly anti_cliche_score: number;
  readonly euphony_score: number;
  readonly signature_score: number;  // telemetry only
  readonly red_flags_count: number;
  readonly red_flags: readonly string[];
  readonly reject: boolean;
  readonly reject_reason: string | null;
}

export interface PreScorerOutput {
  readonly results: readonly CalcPreScoreResult[];
  readonly survivors: readonly Draft[];
  readonly rejected: readonly Draft[];
  readonly total_rejected: number;
  readonly guardrail_activated: boolean;
}

// ── Core function ────────────────────────────────────────────────────────────

/**
 * CALC-only pre-scorer: scores all duel candidates using deterministic axes
 * and rejects dead candidates before expensive V3 scoring.
 *
 * INV-P3-PRESCORE-01: Rejector only — never selects.
 * INV-P3-PRESCORE-02: At least 2 candidates always survive.
 * INV-P3-PRESCORE-03: 0 LLM calls.
 */
export function calcPreScore(
  drafts: readonly Draft[],
  packet: ForgePacket,
): PreScorerOutput {
  // Score all candidates with CALC axes
  const results: CalcPreScoreResult[] = drafts.map((draft) => {
    const rhythm = scoreRhythm(packet, draft.prose);
    const antiCliche = scoreAntiCliche(packet, draft.prose);
    const euphony = scoreEuphonyBasic(packet, draft.prose);
    const signature = scoreSignature(packet, draft.prose);

    // ── Hard reject checks ───────────────────────────────────────────────
    if (rhythm.score < PRESCORE_RHYTHM_HARD_REJECT) {
      return buildResult(draft, rhythm.score, antiCliche.score, euphony.score, signature.score, [], true, `HARD_REJECT: rhythm=${rhythm.score.toFixed(1)} < ${PRESCORE_RHYTHM_HARD_REJECT}`);
    }

    if (antiCliche.score < PRESCORE_ANTICLICHE_HARD_REJECT) {
      return buildResult(draft, rhythm.score, antiCliche.score, euphony.score, signature.score, [], true, `HARD_REJECT: anti_cliche=${antiCliche.score.toFixed(1)} < ${PRESCORE_ANTICLICHE_HARD_REJECT}`);
    }

    // ── Red flag accumulation ────────────────────────────────────────────
    const redFlags: string[] = [];

    if (rhythm.score < PRESCORE_RHYTHM_RED_FLAG) {
      redFlags.push(`rhythm=${rhythm.score.toFixed(1)} < ${PRESCORE_RHYTHM_RED_FLAG}`);
    }
    if (euphony.score < PRESCORE_EUPHONY_RED_FLAG) {
      redFlags.push(`euphony=${euphony.score.toFixed(1)} < ${PRESCORE_EUPHONY_RED_FLAG}`);
    }
    if (antiCliche.score < PRESCORE_ANTICLICHE_RED_FLAG) {
      redFlags.push(`anti_cliche=${antiCliche.score.toFixed(1)} < ${PRESCORE_ANTICLICHE_RED_FLAG}`);
    }

    if (redFlags.length >= PRESCORE_RED_FLAG_CUMUL) {
      return buildResult(draft, rhythm.score, antiCliche.score, euphony.score, signature.score, redFlags, true, `RED_FLAG_CUMUL: ${redFlags.length} flags >= ${PRESCORE_RED_FLAG_CUMUL}`);
    }

    // ── PASS ─────────────────────────────────────────────────────────────
    return buildResult(draft, rhythm.score, antiCliche.score, euphony.score, signature.score, redFlags, false, null);
  });

  // ── Guardrail: max 2 rejects (always keep ≥2 candidates) ──────────────
  const rejectedIndices: number[] = [];
  const survivorIndices: number[] = [];

  for (let i = 0; i < results.length; i++) {
    if (results[i].reject && rejectedIndices.length < PRESCORE_MAX_REJECTS) {
      rejectedIndices.push(i);
    } else {
      survivorIndices.push(i);
    }
  }

  // INV-P3-PRESCORE-02: Ensure at least 2 survivors
  const guardrailActivated = survivorIndices.length < 2;
  if (guardrailActivated) {
    // Rescue candidates from rejected pool (best rhythm score first)
    while (survivorIndices.length < 2 && rejectedIndices.length > 0) {
      // Pick the rejected candidate with the best rhythm (most promising)
      let bestIdx = 0;
      for (let i = 1; i < rejectedIndices.length; i++) {
        if (results[rejectedIndices[i]].rhythm_score > results[rejectedIndices[bestIdx]].rhythm_score) {
          bestIdx = i;
        }
      }
      const rescued = rejectedIndices.splice(bestIdx, 1)[0];
      survivorIndices.push(rescued);
    }
  }

  // Build final output
  const finalResults = results.map((r, i) => {
    // If originally rejected but rescued by guardrail → mark as not rejected
    if (r.reject && survivorIndices.includes(i)) {
      return { ...r, reject: false, reject_reason: `RESCUED_BY_GUARDRAIL (original: ${r.reject_reason})` };
    }
    // If originally passed but now in rejected due to reordering — shouldn't happen
    return r;
  });

  // ── Logging ────────────────────────────────────────────────────────────
  console.log(`[CALC-PRE-SCORER] ${drafts.length} candidates scored:`);
  for (const r of finalResults) {
    const status = r.reject ? 'REJECT' : 'PASS';
    console.log(`  [${r.draft_id}] ${r.mode} | rhythm=${r.rhythm_score.toFixed(1)} anti_cliche=${r.anti_cliche_score.toFixed(1)} euphony=${r.euphony_score.toFixed(1)} sig=${r.signature_score.toFixed(1)} | flags=${r.red_flags_count} | ${status}${r.reject_reason ? ` (${r.reject_reason})` : ''}`);
  }
  if (guardrailActivated) {
    console.log(`  [GUARDRAIL] Activated — rescued candidates to maintain ≥2 survivors.`);
  }
  console.log(`[CALC-PRE-SCORER] Result: ${survivorIndices.length} survivors, ${rejectedIndices.length} rejected. Saved ~${rejectedIndices.length * 8} LLM calls.`);

  const survivors = survivorIndices.sort((a, b) => a - b).map((i) => drafts[i]);
  const rejected = rejectedIndices.sort((a, b) => a - b).map((i) => drafts[i]);

  // Telemetry
  try {
    // Dynamic import to keep telemetry optional
    import('../telemetry/pipeline-telemetry.js').then(({ telemetry }) => {
      telemetry.recordFromProse('CALC_PRESCORER', '', undefined, {
        total_candidates: drafts.length,
        total_rejected: rejectedIndices.length,
        total_survivors: survivorIndices.length,
        guardrail_activated: guardrailActivated,
        llm_calls_saved: rejectedIndices.length * 8,
        results: finalResults.map((r) => ({
          draft_id: r.draft_id,
          mode: r.mode,
          rhythm: r.rhythm_score,
          anti_cliche: r.anti_cliche_score,
          euphony: r.euphony_score,
          signature: r.signature_score,
          red_flags: r.red_flags_count,
          reject: r.reject,
          reason: r.reject_reason,
        })),
      });
    }).catch(() => { /* telemetry is optional */ });
  } catch { /* telemetry is optional */ }

  return {
    results: finalResults,
    survivors,
    rejected,
    total_rejected: rejectedIndices.length,
    guardrail_activated: guardrailActivated,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildResult(
  draft: Draft,
  rhythmScore: number,
  antiClicheScore: number,
  euphonyScore: number,
  signatureScore: number,
  redFlags: readonly string[],
  reject: boolean,
  rejectReason: string | null,
): CalcPreScoreResult {
  return {
    draft_id: draft.draft_id,
    mode: draft.mode,
    rhythm_score: rhythmScore,
    anti_cliche_score: antiClicheScore,
    euphony_score: euphonyScore,
    signature_score: signatureScore,
    red_flags_count: redFlags.length,
    red_flags: redFlags,
    reject,
    reject_reason: rejectReason,
  };
}
