/**
 * V2.3-A P4 — tests harness bench A/B (mock, ZÉRO qwen).
 * computeVerdict (kill-switch) + runABBench (routing, append/reprise) + naive aligné phrases.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  runABBench,
  computeVerdict,
  naiveSentenceAlignedSegments,
  KILL_SWITCH_DELTA_GO,
  KILL_SWITCH_DELTA_REJECT,
  MIN_N_PAIRS,
  type BenchRow,
  type ScoreResult,
  type BenchPersistence,
} from '../../src/chunking/abBench.js';

const TEXT =
  'La maison de pierre dressait ses murs gris. Un cri déchira la nuit. Elle courut vers la lumière. ' +
  'Le silence retomba, lourd. La lune éclairait les feuilles. Au loin un train passait. ' +
  'Personne ne savait son nom. Le froid mordait la peau. La porte grinça doucement. Tout était calme.';

function row(source: number, arm: 'control_naive' | 'treatment_scalpel', seg: number, composite: number, minAxis: number): BenchRow {
  return {
    source_index: source, arm, segment_index: seg, seed: 's0',
    segment_hash: 'h', prompt_hash: 'p', output_words: 100, composite, min_axis: minAxis,
  };
}
// 6 paires (source 0, segments 0..5)
function pairs(controlComp: number, treatComp: number, minC = 80, minT = 80): BenchRow[] {
  const rows: BenchRow[] = [];
  for (let i = 0; i < 6; i++) {
    rows.push(row(0, 'control_naive', i, controlComp + (i % 2 === 0 ? 0.3 : -0.3), minC));
    rows.push(row(0, 'treatment_scalpel', i, treatComp + (i % 2 === 0 ? 0.3 : -0.3), minT));
  }
  return rows;
}

const MOCK_SCORE: ScoreResult = { composite: 86, min_axis: 80, macro_axes: { ECC: 88, RCI: 84, SII: 86, IFI: 82, AAI: 85 } };

describe('V4.2.3-A P4 abBench', () => {
  it('seuils kill-switch figés dans le module', () => {
    expect(KILL_SWITCH_DELTA_GO).toBe(2.0);
    expect(KILL_SWITCH_DELTA_REJECT).toBe(-1.0);
    expect(MIN_N_PAIRS).toBe(6);
  });

  it('naiveSentenceAlignedSegments : K segments alignés aux phrases', () => {
    const segs = naiveSentenceAlignedSegments(TEXT, 4);
    expect(segs.length).toBe(4);
    // chaque segment (sauf cas dégénéré) finit par une ponctuation de phrase
    for (const s of segs) expect(s.trim().length).toBeGreaterThan(0);
    expect(segs.slice(0, 3).every((s) => /[.!?]$/.test(s.trim()))).toBe(true);
  });

  it('kill-switch GO_B_CANDIDATE (Δ>=+2, min_axis ok, CI95_low>0) — PAS GO_B définitif', () => {
    const v = computeVerdict(pairs(84, 87)); // Δ=+3
    expect(v.verdict).toBe('GO_B_CANDIDATE');
    expect(v.verdict).not.toBe('GO_B');
    expect(v.delta_composite).toBeGreaterThanOrEqual(2.0);
    expect(v.delta_ci95_low).toBeGreaterThan(0);
  });

  it('kill-switch SHADOW (Δ dans [-1, +2[)', () => {
    const v = computeVerdict(pairs(85, 86)); // Δ=+1
    expect(v.verdict).toBe('SHADOW');
  });

  it('kill-switch REJECT (Δ < -1)', () => {
    const v = computeVerdict(pairs(87, 84)); // Δ=-3
    expect(v.verdict).toBe('REJECT');
  });

  it('kill-switch REJECT si régression macro-axe (min_axis)', () => {
    const v = computeVerdict(pairs(84, 87, 80, 76)); // Δcomposite +3 mais min_axis -4
    expect(v.verdict).toBe('REJECT');
  });

  it('INSUFFICIENT_N si < 6 paires', () => {
    const rows = [row(0, 'control_naive', 0, 85, 80), row(0, 'treatment_scalpel', 0, 88, 80)];
    expect(computeVerdict(rows).verdict).toBe('INSUFFICIENT_N');
  });

  it('runABBench (mock) : route 2 bras, appelle generate + score par segment/seed', async () => {
    const gen = vi.fn(async () => 'prose mock de réécriture avec plusieurs mots ici présents');
    const score = vi.fn(async () => MOCK_SCORE);
    const r = await runABBench([TEXT], gen, score, { seeds: ['s0', 's1'] });
    expect(r.rows.length).toBeGreaterThan(0);
    expect(r.rows.some((x) => x.arm === 'control_naive')).toBe(true);
    expect(r.rows.some((x) => x.arm === 'treatment_scalpel')).toBe(true);
    expect(gen).toHaveBeenCalledTimes(r.rows.length);
    expect(score).toHaveBeenCalledTimes(r.rows.length);
  });

  it('runABBench : JSONL append + reprise (rows déjà faits = skip)', async () => {
    const appended: BenchRow[] = [];
    // 1er run : capture toutes les rows
    const r1 = await runABBench([TEXT], async () => 'mock prose', async () => MOCK_SCORE, {
      seeds: ['s0'],
      persistence: { loadDone: () => [], append: (x) => appended.push(x) },
    });
    expect(appended.length).toBe(r1.rows.length);
    // 2e run avec reprise : loadDone renvoie tout → 0 nouvel append
    const gen2 = vi.fn(async () => 'mock prose');
    const r2 = await runABBench([TEXT], gen2, async () => MOCK_SCORE, {
      seeds: ['s0'],
      persistence: { loadDone: () => appended, append: () => { throw new Error('ne doit pas re-append'); } },
    });
    expect(gen2).not.toHaveBeenCalled(); // tout repris, aucune régénération
    expect(r2.rows.length).toBe(r1.rows.length);
  });

  it('isolation : abBench n a pas d import generateChunkedDraft/qwen', () => {
    const src = readFileSync('src/chunking/abBench.ts', 'utf8');
    const importLines = src.split('\n').filter((l) => l.trim().startsWith('import')).join('\n');
    expect(importLines).not.toMatch(/generateChunkedDraft|chunked-generator|ollama-provider|OllamaProvider/);
  });

  it('agrégation : mean_control/treatment + delta cohérents', () => {
    const v = computeVerdict(pairs(85, 88));
    expect(v.mean_treatment - v.mean_control).toBeCloseTo(v.delta_composite, 5);
    expect(v.n_pairs).toBe(6);
  });
});
