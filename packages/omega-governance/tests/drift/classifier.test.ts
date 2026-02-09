import { describe, it, expect } from 'vitest';
import { classifyOverallDrift } from '../../src/drift/classifier.js';
import type { DriftDetail } from '../../src/drift/types.js';

function makeDetail(type: 'FUNCTIONAL' | 'QUALITATIVE' | 'STRUCTURAL', rule: string): DriftDetail {
  return {
    type,
    path: 'test.path',
    baseline_value: 'a',
    candidate_value: 'b',
    rule,
  };
}

describe('Drift Classifier', () => {
  it('classifies empty details as NO_DRIFT', () => {
    const result = classifyOverallDrift([]);
    expect(result.level).toBe('NO_DRIFT');
    expect(result.types).toHaveLength(0);
  });

  it('classifies SOFT_DRIFT rule', () => {
    const result = classifyOverallDrift([makeDetail('QUALITATIVE', '|delta|=0.0600 >= DRIFT_SOFT_THRESHOLD=0.05')]);
    expect(result.level).toBe('SOFT_DRIFT');
  });

  it('classifies HARD_DRIFT from functional drift', () => {
    const result = classifyOverallDrift([makeDetail('FUNCTIONAL', 'hashes differ (functional drift)')]);
    expect(result.level).toBe('HARD_DRIFT');
  });

  it('classifies CRITICAL_DRIFT rule', () => {
    const result = classifyOverallDrift([makeDetail('QUALITATIVE', '|delta|=0.3500 >= DRIFT_CRITICAL_THRESHOLD=0.30')]);
    expect(result.level).toBe('CRITICAL_DRIFT');
  });

  it('takes highest drift level from multiple details', () => {
    const details = [
      makeDetail('QUALITATIVE', '|delta|=0.0600 >= DRIFT_SOFT_THRESHOLD=0.05'),
      makeDetail('FUNCTIONAL', 'hashes differ (functional drift)'),
    ];
    const result = classifyOverallDrift(details);
    expect(result.level).toBe('HARD_DRIFT');
  });

  it('includes all drift types present', () => {
    const details = [
      makeDetail('QUALITATIVE', 'SOFT rule'),
      makeDetail('FUNCTIONAL', 'HARD rule'),
    ];
    const result = classifyOverallDrift(details);
    expect(result.types).toContain('FUNCTIONAL');
    expect(result.types).toContain('QUALITATIVE');
  });

  it('types are sorted', () => {
    const details = [
      makeDetail('QUALITATIVE', 'SOFT rule'),
      makeDetail('FUNCTIONAL', 'HARD rule'),
    ];
    const result = classifyOverallDrift(details);
    const sorted = [...result.types].sort();
    expect(result.types).toEqual(sorted);
  });

  it('verdict contains drift level name', () => {
    const result = classifyOverallDrift([makeDetail('FUNCTIONAL', 'hashes differ (functional drift)')]);
    expect(result.verdict.toLowerCase()).toContain('hard');
  });

  it('verdict for NO_DRIFT mentions identical', () => {
    const result = classifyOverallDrift([]);
    expect(result.verdict.toLowerCase()).toContain('identical');
  });

  it('structural drift classified as HARD_DRIFT', () => {
    const result = classifyOverallDrift([makeDetail('STRUCTURAL', 'merkle root differs (structural drift)')]);
    expect(result.level).toBe('HARD_DRIFT');
  });

  it('stage count mismatch classified as CRITICAL', () => {
    const result = classifyOverallDrift([makeDetail('STRUCTURAL', 'stage count mismatch: baseline=6, candidate=5')]);
    expect(result.level).toBe('CRITICAL_DRIFT');
  });

  it('verdict includes detail count', () => {
    const details = [makeDetail('FUNCTIONAL', 'hashes differ (functional drift)'), makeDetail('FUNCTIONAL', 'hashes differ (functional drift)')];
    const result = classifyOverallDrift(details);
    expect(result.verdict).toContain('2');
  });
});
