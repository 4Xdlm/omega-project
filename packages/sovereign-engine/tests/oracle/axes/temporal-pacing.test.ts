/**
 * Tests: Temporal Pacing Axis (Sprint 16.3)
 * Invariant: ART-TEMP-03
 */

import { describe, it, expect } from 'vitest';
import { scoreTemporalPacingAxis } from '../../../src/oracle/axes/temporal-pacing.js';
import { MOCK_PACKET } from '../../fixtures/mock-packet.js';

describe('TemporalPacing Axis (ART-TEMP-03)', () => {
  it('TPAX-01: no temporal_contract → neutral score 75', () => {
    const result = scoreTemporalPacingAxis(MOCK_PACKET, 'Some prose text here.');

    expect(result.name).toBe('temporal_pacing');
    expect(result.score).toBe(75);
    expect(result.weight).toBe(1.0);
    expect(result.method).toBe('CALC');
    expect(result.details).toContain('neutral');
  });

  it('TPAX-02: déterminisme — même input = même output', () => {
    const prose = 'Prose with some structure and content for testing purposes.';

    const r1 = scoreTemporalPacingAxis(MOCK_PACKET, prose);
    const r2 = scoreTemporalPacingAxis(MOCK_PACKET, prose);

    expect(r1.score).toBe(r2.score);
    expect(r1.details).toBe(r2.details);
  });
});
