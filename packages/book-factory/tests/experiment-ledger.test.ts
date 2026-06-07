/** OMEGA — C19 EXPERIMENT_LEDGER (BF-08) : append-only, runId unique, supersedes. */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { appendExperiment, currentRows, loadLedger } from '../src/ledger/experiment-ledger.js';
import type { ExperimentRow } from '../src/ledger/experiment-ledger.js';

const row = (runId: string, extra: Partial<ExperimentRow> = {}): ExperimentRow => ({
  runId, date: '2026-06-08', model: 'gemma4:31b', planHash: 'df8d650f', outputHash: 'ab4683a0',
  words: 84343, chapters: 50,
  cleanliness: { SYNTAX: true, SEAM: true, SEMANTIC: true, NARRATIVE: false },
  maxTicPer1000w: 1.24, incipitUnique: 37, incipitClones: 11, incipitWeather: 0,
  transitionRatioRealized: 0.58, revelationsRealized: 2, pacingCvMean: 0.556,
  selectorEntropyRatio: 0.9618, genomeHash: '05b23ef1', failures: [], decisions: [], ...extra,
});

describe('C19 — EXPERIMENT_LEDGER', () => {
  const dir = mkdtempSync(join(tmpdir(), 'omega-ledger-'));
  const path = join(dir, 'EXPERIMENT_LEDGER.json');

  it('XL-001 — append + relecture : la ligne est consignée intègre', () => {
    const r = appendExperiment(path, row('run_a'));
    expect(r.ok).toBe(true);
    expect(loadLedger(path).rows.length).toBe(1);
    expect(loadLedger(path).rows[0]?.outputHash).toBe('ab4683a0');
  });

  it('XL-002 — runId dupliqué REFUSÉ (jamais de réécriture de l\'histoire)', () => {
    const r = appendExperiment(path, row('run_a'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('DUPLICATE_RUN_ID');
  });

  it('XL-003 — ligne invalide REFUSÉE (champs obligatoires, bornes)', () => {
    const bad = appendExperiment(path, row('run_b', { words: 0 }));
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe('BAD_ROW');
  });

  it('XL-004 — supersedes : la v2 masque la v1 dans currentRows, sans l\'effacer', () => {
    expect(appendExperiment(path, row('run_a_v2', { supersedes: 'run_a', maxTicPer1000w: 1.25 })).ok).toBe(true);
    const ledger = loadLedger(path);
    expect(ledger.rows.length).toBe(2); // l'histoire complète demeure
    const current = currentRows(ledger);
    expect(current.length).toBe(1);
    expect(current[0]?.runId).toBe('run_a_v2');
  });
});
