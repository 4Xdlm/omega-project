/**
 * Tests for anti-cliche-sweep.ts — INV-SWEEP-NOMOD-01
 * Verifies sweepCliches returns prose unchanged (no destructive replacement)
 */

import { describe, it, expect } from 'vitest';
import { sweepCliches } from '../../src/polish/anti-cliche-sweep.js';
import { MOCK_PACKET } from '../fixtures/mock-packet.js';

describe('sweepCliches (no-op)', () => {
  it('INV-SWEEP-NOMOD-01: returns prose unchanged always', () => {
    const prose = 'This is test prose with potential clichés.';
    const result = sweepCliches(MOCK_PACKET, prose);

    expect(result).toBe(prose);
    expect(result).not.toContain('[CLICHE_REMOVED]');
  });

  it('sweepCliches with no clichés returns same', () => {
    const prose = 'Clean prose without any problematic patterns.';
    const result = sweepCliches(MOCK_PACKET, prose);

    expect(result).toBe(prose);
  });

  it('sweepCliches with clichés STILL returns same (no mutation)', () => {
    // Even with clichés, prose should be unchanged
    const prose = 'His heart was beating fast. The silence was deafening.';
    const result = sweepCliches(MOCK_PACKET, prose);

    expect(result).toBe(prose);
    expect(result).not.toContain('[CLICHE_REMOVED]');
  });

  it('sweepCliches never mutates prose structure', () => {
    const proses = [
      'Simple sentence.',
      'Multiple sentences here. And another one. Final sentence.',
      'Paragraph one.\n\nParagraph two with more content.\n\nParagraph three.',
    ];

    for (const prose of proses) {
      const result = sweepCliches(MOCK_PACKET, prose);
      expect(result).toBe(prose);
      expect(result.length).toBe(prose.length);
    }
  });
});
