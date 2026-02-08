import { describe, it, expect } from 'vitest';
import { createGenesisPlan } from '../src/planner.js';
import { createDefaultConfig } from '../src/config.js';
import { canonicalize, sha256 } from '@omega/canon-kernel';
import {
  TIMESTAMP,
  SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS, SCENARIO_A_GENOME, SCENARIO_A_EMOTION,
  SCENARIO_B_INTENT, SCENARIO_B_CANON, SCENARIO_B_CONSTRAINTS, SCENARIO_B_GENOME, SCENARIO_B_EMOTION,
} from './fixtures.js';

const config = createDefaultConfig();

describe('Determinism — G-INV-07', () => {
  it('should produce same plan_hash for scenario A across 2 runs', () => {
    const { plan: p1 } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    const { plan: p2 } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    expect(p1.plan_hash).toBe(p2.plan_hash);
  });

  it('should produce same report_hash for scenario A across 2 runs', () => {
    const { report: r1 } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    const { report: r2 } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    expect(sha256(canonicalize(r1))).toBe(sha256(canonicalize(r2)));
  });

  it('should produce same evidence_hash for scenario A across 2 runs', () => {
    const { report: r1 } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    const { report: r2 } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    expect(r1.evidence.chain_hash).toBe(r2.evidence.chain_hash);
  });

  it('should produce same plan_hash for scenario B across 2 runs', () => {
    const { plan: p1 } = createGenesisPlan(
      SCENARIO_B_INTENT, SCENARIO_B_CANON, SCENARIO_B_CONSTRAINTS,
      SCENARIO_B_GENOME, SCENARIO_B_EMOTION, config, TIMESTAMP,
    );
    const { plan: p2 } = createGenesisPlan(
      SCENARIO_B_INTENT, SCENARIO_B_CANON, SCENARIO_B_CONSTRAINTS,
      SCENARIO_B_GENOME, SCENARIO_B_EMOTION, config, TIMESTAMP,
    );
    expect(p1.plan_hash).toBe(p2.plan_hash);
  });

  it('should produce same config_hash across 2 runs', () => {
    const { report: r1 } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    const { report: r2 } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    expect(r1.config_hash).toBe(r2.config_hash);
  });
});
