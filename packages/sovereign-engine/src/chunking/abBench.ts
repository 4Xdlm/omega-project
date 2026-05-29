/**
 * OMEGA V2.3-A P4 — Harness bench A/B réécriture (PUR, generate + score INJECTÉS).
 *
 * Compare la prose RÉÉCRITE de segments découpés NAÏVEMENT (aligné phrases) vs SCALPEL,
 * à K identique (frontière = seule variable). Métrique = Oracle composite (judgeAestheticV3,
 * injecté). Kill-switch FIGÉ. Verdict = GO_B_CANDIDATE / SHADOW / REJECT (jamais auto-promotion
 * GO_B définitif — correction Tribunal : le bench recommande, l'Architecte décide).
 *
 * Isolement (Tribunal 2/2 GO_CODE P4-A) : generate ET score INJECTÉS (mock en CI -> zéro qwen).
 * JSONL incrémental reprenable (resume-on-crash EPIPE). N'appelle PAS generateChunkedDraft.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A — Sprint V2.3-A P4 2026-05-29
 */

import { splitSentences } from './detector/sentences.js';
import { scalpelSegments } from './abRouting.js';
import { deriveEmotionContractFromSegment } from './deriveEmotionContract.js';
import { buildForgePacketFromSegment } from './deriveForgePacket.js';
import { forgePacketToSceneBrief } from '../generation/forge-to-brief.js';
import { buildRewritePrompt } from './rewritePrompt.js';

// ── Kill-switch FIGÉ (anti post-hoc, doctrine P3) ──
export const KILL_SWITCH_DELTA_GO = 2.0; // Δcomposite >= +2.0 (> bruit qwen σ≈2)
export const KILL_SWITCH_DELTA_REJECT = -1.0;
export const MIN_AXIS_REGRESS_TOLERANCE = -0.5; // Δmin_axis toléré
export const AXIS_REGRESS_REJECT = -2.0;
export const MIN_N_PAIRS = 6; // LAW-NCR-BENCH-N-001

export type ArmName = 'control_naive' | 'treatment_scalpel';

export interface ScoreResult {
  readonly composite: number;
  readonly min_axis: number;
  readonly macro_axes: Readonly<Record<string, number>>;
}
export type RewriteGenerateFn = (prompt: string, seed: string) => Promise<string> | string;
export type ScoreFn = (
  packet: ReturnType<typeof buildForgePacketFromSegment>['packet'],
  prose: string
) => Promise<ScoreResult> | ScoreResult;

export interface BenchRow {
  readonly source_index: number;
  readonly arm: ArmName;
  readonly segment_index: number;
  readonly seed: string;
  readonly segment_hash: string;
  readonly prompt_hash: string;
  readonly output_words: number;
  readonly composite: number;
  readonly min_axis: number;
}

/** Persistance JSONL injectable (testable in-memory). */
export interface BenchPersistence {
  loadDone(): readonly BenchRow[];
  append(row: BenchRow): void;
}

export interface BenchVerdict {
  readonly n_pairs: number;
  readonly mean_control: number;
  readonly mean_treatment: number;
  readonly delta_composite: number;
  readonly delta_ci95_low: number;
  readonly delta_ci95_high: number;
  readonly mean_min_axis_control: number;
  readonly mean_min_axis_treatment: number;
  readonly verdict: 'GO_B_CANDIDATE' | 'SHADOW' | 'REJECT' | 'INSUFFICIENT_N';
  readonly reason: string;
}

export interface ABBenchResult {
  readonly rows: readonly BenchRow[];
  readonly verdict: BenchVerdict;
}

/** Découpage naïf à K segments ~mots égaux, ALIGNÉ aux frontières de phrases (contrôle "fair"). */
export function naiveSentenceAlignedSegments(text: string, k: number): string[] {
  const sentences = splitSentences(text.replace(/\s+/g, ' ').trim());
  const sents = sentences.length > 0 ? sentences : [text.trim()];
  if (k <= 1) return [sents.join(' ')];
  const totalWords = sents.reduce((a, s) => a + s.split(' ').length, 0);
  const targetPerSeg = totalWords / k;
  const out: string[] = [];
  let buf: string[] = [];
  let bufWords = 0;
  for (let i = 0; i < sents.length; i++) {
    buf.push(sents[i]!);
    bufWords += sents[i]!.split(' ').length;
    const segsLeft = k - out.length;
    const sentsLeft = sents.length - i - 1;
    // ferme le segment si on a atteint la cible ET qu'il reste assez de phrases pour les segments restants
    if (out.length < k - 1 && bufWords >= targetPerSeg && sentsLeft >= segsLeft - 1) {
      out.push(buf.join(' '));
      buf = [];
      bufWords = 0;
    }
  }
  if (buf.length > 0) out.push(buf.join(' '));
  // garantit exactement k segments (fusion/complétion défensive)
  while (out.length > k) {
    const last = out.pop()!;
    out[out.length - 1] = `${out[out.length - 1]} ${last}`;
  }
  while (out.length < k && out.length > 0) out.push(out[out.length - 1]!);
  return out;
}

function mean(xs: readonly number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function std(xs: readonly number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.map((x) => (x - m) ** 2).reduce((a, b) => a + b, 0) / (xs.length - 1));
}

/** Verdict apparié : diff par (source, segment_index) = mean_seeds(treatment) - mean_seeds(control). */
export function computeVerdict(rows: readonly BenchRow[]): BenchVerdict {
  const key = (r: BenchRow): string => `${r.source_index}|${r.segment_index}`;
  const groups = new Map<string, { c: number[]; t: number[]; cMin: number[]; tMin: number[] }>();
  for (const r of rows) {
    const g = groups.get(key(r)) ?? { c: [], t: [], cMin: [], tMin: [] };
    if (r.arm === 'control_naive') { g.c.push(r.composite); g.cMin.push(r.min_axis); }
    else { g.t.push(r.composite); g.tMin.push(r.min_axis); }
    groups.set(key(r), g);
  }
  const diffs: number[] = [];
  const cMeans: number[] = [];
  const tMeans: number[] = [];
  const cMinMeans: number[] = [];
  const tMinMeans: number[] = [];
  for (const g of groups.values()) {
    if (g.c.length === 0 || g.t.length === 0) continue; // paire incomplète
    const cm = mean(g.c);
    const tm = mean(g.t);
    diffs.push(tm - cm);
    cMeans.push(cm);
    tMeans.push(tm);
    cMinMeans.push(mean(g.cMin));
    tMinMeans.push(mean(g.tMin));
  }
  const n = diffs.length;
  const delta = mean(diffs);
  const se = n >= 2 ? std(diffs) / Math.sqrt(n) : 0;
  const ciLow = delta - 1.96 * se;
  const ciHigh = delta + 1.96 * se;
  const meanMinC = mean(cMinMeans);
  const meanMinT = mean(tMinMeans);
  const deltaMinAxis = meanMinT - meanMinC;

  let verdict: BenchVerdict['verdict'];
  let reason: string;
  if (n < MIN_N_PAIRS) {
    verdict = 'INSUFFICIENT_N';
    reason = `n_pairs=${n} < ${MIN_N_PAIRS} (LAW-NCR-BENCH-N-001)`;
  } else if (delta < KILL_SWITCH_DELTA_REJECT || deltaMinAxis < AXIS_REGRESS_REJECT) {
    verdict = 'REJECT';
    reason = `delta=${delta.toFixed(2)} < ${KILL_SWITCH_DELTA_REJECT} ou regression min_axis ${deltaMinAxis.toFixed(2)}`;
  } else if (delta >= KILL_SWITCH_DELTA_GO && deltaMinAxis >= MIN_AXIS_REGRESS_TOLERANCE && ciLow > 0) {
    verdict = 'GO_B_CANDIDATE';
    reason = `delta=${delta.toFixed(2)} >= ${KILL_SWITCH_DELTA_GO}, min_axis ok, CI95_low=${ciLow.toFixed(2)}>0 (recommandation, decision Architecte)`;
  } else {
    verdict = 'SHADOW';
    reason = `delta=${delta.toFixed(2)} dans [${KILL_SWITCH_DELTA_REJECT}, ${KILL_SWITCH_DELTA_GO}[ ou CI95_low<=0 (sous le bruit)`;
  }

  return {
    n_pairs: n,
    mean_control: mean(cMeans),
    mean_treatment: mean(tMeans),
    delta_composite: delta,
    delta_ci95_low: ciLow,
    delta_ci95_high: ciHigh,
    mean_min_axis_control: meanMinC,
    mean_min_axis_treatment: meanMinT,
    verdict,
    reason,
  };
}

async function processSegment(
  arm: ArmName,
  sourceIndex: number,
  seg: string,
  segIndex: number,
  seed: string,
  generate: RewriteGenerateFn,
  score: ScoreFn
): Promise<BenchRow> {
  const candidate = deriveEmotionContractFromSegment(seg);
  const fp = buildForgePacketFromSegment(seg, candidate);
  const brief = forgePacketToSceneBrief(fp.packet);
  const rp = buildRewritePrompt({
    scene_brief: brief,
    source_segment: seg,
    source_segment_hash: candidate.segment_hash,
    emotion_contract: candidate.contract,
    rewrite_mode: 'rewrite',
  });
  const prose = await generate(rp.prompt, seed);
  const s = await score(fp.packet, prose);
  return {
    source_index: sourceIndex,
    arm,
    segment_index: segIndex,
    seed,
    segment_hash: candidate.segment_hash,
    prompt_hash: rp.prompt_hash,
    output_words: prose.trim().length ? prose.trim().split(/\s+/).length : 0,
    composite: s.composite,
    min_axis: s.min_axis,
  };
}

export interface RunABBenchOptions {
  readonly seeds: readonly string[];
  readonly persistence?: BenchPersistence;
}

/** Orchestration A/B avec reprise JSONL. generate + score injectés (mock en CI). */
export async function runABBench(
  sources: readonly string[],
  generate: RewriteGenerateFn,
  score: ScoreFn,
  opts: RunABBenchOptions
): Promise<ABBenchResult> {
  const seeds = opts.seeds.length > 0 ? opts.seeds : ['seed0'];
  const done = opts.persistence?.loadDone() ?? [];
  const rows: BenchRow[] = [...done];
  const doneKeys = new Set(done.map((r) => `${r.source_index}|${r.arm}|${r.segment_index}|${r.seed}`));

  for (let si = 0; si < sources.length; si++) {
    const text = sources[si]!;
    const scalpel = scalpelSegments(text);
    const k = Math.max(1, scalpel.length);
    const naive = naiveSentenceAlignedSegments(text, k);
    const arms: { name: ArmName; segs: string[] }[] = [
      { name: 'control_naive', segs: naive },
      { name: 'treatment_scalpel', segs: scalpel },
    ];
    for (const { name, segs } of arms) {
      for (let gi = 0; gi < segs.length; gi++) {
        for (const seed of seeds) {
          const k2 = `${si}|${name}|${gi}|${seed}`;
          if (doneKeys.has(k2)) continue;
          const row = await processSegment(name, si, segs[gi]!, gi, seed, generate, score);
          rows.push(row);
          opts.persistence?.append(row);
          doneKeys.add(k2);
        }
      }
    }
  }

  return { rows, verdict: computeVerdict(rows) };
}
