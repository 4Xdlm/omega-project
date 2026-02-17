/**
 * Tests: Foreshadowing Compiler (Sprint 16.3)
 * Invariant: ART-TEMP-03
 */

import { describe, it, expect } from 'vitest';
import { compileForeshadowing, detectForeshadowing } from '../../src/temporal/foreshadowing-compiler.js';
import type { TemporalContract } from '../../src/temporal/temporal-contract.js';

const CONTRACT_WITH_HOOKS: TemporalContract = {
  version: '1.0',
  total_word_target: 500,
  key_moments: [
    { moment_id: 'km1', label: 'climax', position_pct: 60, word_budget_pct: 25, emotion_peak: true, pacing: 'dilated' },
  ],
  compression_zones: [],
  foreshadowing_hooks: [
    {
      hook_id: 'fh-ombre',
      plant_position_pct: 15,
      resolve_position_pct: 80,
      emotion_planted: 'inquiétude',
      emotion_resolved: 'terreur',
      motif: 'ombre rampante',
    },
    {
      hook_id: 'fh-cloche',
      plant_position_pct: 10,
      resolve_position_pct: 90,
      emotion_planted: 'nostalgie',
      emotion_resolved: 'déchirement',
      motif: 'cloche lointaine',
    },
  ],
};

const CONTRACT_NO_HOOKS: TemporalContract = {
  version: '1.0',
  total_word_target: 500,
  key_moments: [
    { moment_id: 'km1', label: 'test', position_pct: 50, word_budget_pct: 20, emotion_peak: false, pacing: 'dilated' },
  ],
  compression_zones: [],
  foreshadowing_hooks: [],
};

describe('ForeshadowingCompiler (ART-TEMP-03)', () => {
  it('FSHAD-01: compile produces plant + resolve instructions per hook', () => {
    const plan = compileForeshadowing(CONTRACT_WITH_HOOKS);

    expect(plan.total_hooks).toBe(2);
    expect(plan.instructions.length).toBe(4); // 2 hooks × 2 (plant + resolve)

    const plants = plan.instructions.filter(i => i.type === 'plant');
    const resolves = plan.instructions.filter(i => i.type === 'resolve');
    expect(plants.length).toBe(2);
    expect(resolves.length).toBe(2);
  });

  it('FSHAD-02: instructions sorted by position', () => {
    const plan = compileForeshadowing(CONTRACT_WITH_HOOKS);

    for (let i = 1; i < plan.instructions.length; i++) {
      expect(plan.instructions[i].position_pct).toBeGreaterThanOrEqual(
        plan.instructions[i - 1].position_pct,
      );
    }
  });

  it('FSHAD-03: instructions contain French text', () => {
    const plan = compileForeshadowing(CONTRACT_WITH_HOOKS);

    for (const instr of plan.instructions) {
      expect(instr.instruction_fr.length).toBeGreaterThan(10);
      // Plant instructions mention the motif
      expect(instr.instruction_fr).toContain(instr.motif);
    }
  });

  it('FSHAD-04: no hooks → empty plan', () => {
    const plan = compileForeshadowing(CONTRACT_NO_HOOKS);

    expect(plan.total_hooks).toBe(0);
    expect(plan.instructions.length).toBe(0);
    expect(plan.token_budget).toBe(0);
  });
});

describe('ForeshadowingDetection (ART-TEMP-03)', () => {
  it('FDET-01: motif present in both halves → detected', () => {
    // "ombre" in first half, "ombre" in second half
    const prose = `L'ombre se glissa le long du mur. Elle frissonna sans savoir pourquoi. Le vent soufflait entre les arbres dénudés.

Bien plus tard dans la nuit, la même ombre rampante surgit devant elle. La terreur la saisit tout entière.`;

    const result = detectForeshadowing(prose, CONTRACT_WITH_HOOKS);

    expect(result.total_hooks).toBe(2);
    // "ombre" should be detected as planted and resolved
    expect(result.hooks_planted).toBeGreaterThanOrEqual(1);
    expect(result.hooks_resolved).toBeGreaterThanOrEqual(1);
  });

  it('FDET-02: no hooks → completion_rate 1.0', () => {
    const result = detectForeshadowing('Some prose.', CONTRACT_NO_HOOKS);

    expect(result.total_hooks).toBe(0);
    expect(result.completion_rate).toBe(1.0);
  });

  it('FDET-03: déterminisme', () => {
    const prose = `L'ombre apparut dans la première scène. Plus tard, l'ombre revint hanter ses pensées.`;

    const r1 = detectForeshadowing(prose, CONTRACT_WITH_HOOKS);
    const r2 = detectForeshadowing(prose, CONTRACT_WITH_HOOKS);

    expect(r1.hooks_planted).toBe(r2.hooks_planted);
    expect(r1.hooks_resolved).toBe(r2.hooks_resolved);
    expect(r1.completion_rate).toBe(r2.completion_rate);
  });
});
