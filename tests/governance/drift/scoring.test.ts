/**
 * SCORING TESTS — Phase E Drift Detection
 * Tests for score computation, classification, and RUNBOOK mapping.
 */

import { describe, it, expect } from 'vitest';
import {
  computeDriftScore,
  classifyScore,
  getRecommendation,
  getEscalationTarget,
  requiresHumanJustification
} from '../../../governance/drift/scoring.js';

// ─────────────────────────────────────────────────────────────
// computeDriftScore
// ─────────────────────────────────────────────────────────────

describe('scoring/computeDriftScore', () => {
  it('computes score as impact × confidence × persistence', () => {
    expect(computeDriftScore(3, 0.82, 3)).toBeCloseTo(7.38, 2);
  });

  it('computes minimum valid score', () => {
    expect(computeDriftScore(1, 0.1, 1)).toBeCloseTo(0.1, 2);
  });

  it('computes maximum valid score', () => {
    expect(computeDriftScore(5, 1.0, 10)).toBe(50);
  });

  it('rejects impact below 1', () => {
    expect(() => computeDriftScore(0, 0.5, 1)).toThrow('Invalid impact');
  });

  it('rejects impact above 5', () => {
    expect(() => computeDriftScore(6, 0.5, 1)).toThrow('Invalid impact');
  });

  it('rejects non-integer impact', () => {
    expect(() => computeDriftScore(2.5, 0.5, 1)).toThrow('Invalid impact');
  });

  it('rejects confidence below 0.1', () => {
    expect(() => computeDriftScore(3, 0.05, 1)).toThrow('Invalid confidence');
  });

  it('rejects confidence above 1.0', () => {
    expect(() => computeDriftScore(3, 1.1, 1)).toThrow('Invalid confidence');
  });

  it('rejects persistence below 1', () => {
    expect(() => computeDriftScore(3, 0.5, 0)).toThrow('Invalid persistence');
  });

  it('rejects non-integer persistence', () => {
    expect(() => computeDriftScore(3, 0.5, 1.5)).toThrow('Invalid persistence');
  });

  it('rejects NaN confidence', () => {
    expect(() => computeDriftScore(3, NaN, 1)).toThrow('Invalid confidence');
  });

  it('rejects Infinity confidence', () => {
    expect(() => computeDriftScore(3, Infinity, 1)).toThrow('Invalid confidence');
  });
});

// ─────────────────────────────────────────────────────────────
// classifyScore
// ─────────────────────────────────────────────────────────────

describe('scoring/classifyScore', () => {
  it('classifies score 0 as STABLE', () => {
    expect(classifyScore(0)).toBe('STABLE');
  });

  it('classifies score 0.5 as INFO', () => {
    expect(classifyScore(0.5)).toBe('INFO');
  });

  it('classifies score 1.99 as INFO', () => {
    expect(classifyScore(1.99)).toBe('INFO');
  });

  it('classifies score 2 as WARNING', () => {
    expect(classifyScore(2)).toBe('WARNING');
  });

  it('classifies score 4.99 as WARNING', () => {
    expect(classifyScore(4.99)).toBe('WARNING');
  });

  it('classifies score 5 as CRITICAL', () => {
    expect(classifyScore(5)).toBe('CRITICAL');
  });

  it('classifies score 50 as CRITICAL', () => {
    expect(classifyScore(50)).toBe('CRITICAL');
  });

  it('never returns INCIDENT (INV-E-10)', () => {
    const scores = [0, 0.1, 1, 1.99, 2, 4.99, 5, 10, 50, 100];
    for (const score of scores) {
      const result = classifyScore(score);
      expect(result).not.toBe('INCIDENT');
    }
  });
});

// ─────────────────────────────────────────────────────────────
// getRecommendation (INV-E-09: Strict RUNBOOK mapping)
// ─────────────────────────────────────────────────────────────

describe('scoring/getRecommendation', () => {
  it('maps STABLE to NONE', () => {
    expect(getRecommendation('STABLE')).toBe('NONE');
  });

  it('maps INFO to LOG', () => {
    expect(getRecommendation('INFO')).toBe('LOG');
  });

  it('maps WARNING to SURVEILLANCE', () => {
    expect(getRecommendation('WARNING')).toBe('SURVEILLANCE');
  });

  it('maps CRITICAL to ESCALATE', () => {
    expect(getRecommendation('CRITICAL')).toBe('ESCALATE');
  });
});

// ─────────────────────────────────────────────────────────────
// getEscalationTarget (INV-E-05: Mandatory human escalation)
// ─────────────────────────────────────────────────────────────

describe('scoring/getEscalationTarget', () => {
  it('targets ARCHITECTE for CRITICAL', () => {
    expect(getEscalationTarget('CRITICAL')).toBe('ARCHITECTE');
  });

  it('targets ARCHITECTE for WARNING', () => {
    expect(getEscalationTarget('WARNING')).toBe('ARCHITECTE');
  });

  it('targets NONE for INFO', () => {
    expect(getEscalationTarget('INFO')).toBe('NONE');
  });

  it('targets NONE for STABLE', () => {
    expect(getEscalationTarget('STABLE')).toBe('NONE');
  });
});

// ─────────────────────────────────────────────────────────────
// requiresHumanJustification (INV-E-07)
// ─────────────────────────────────────────────────────────────

describe('scoring/requiresHumanJustification', () => {
  it('requires justification for score 2 (WARNING boundary)', () => {
    expect(requiresHumanJustification(2)).toBe(true);
  });

  it('requires justification for score 5 (CRITICAL)', () => {
    expect(requiresHumanJustification(5)).toBe(true);
  });

  it('does not require justification for score 1.99 (INFO)', () => {
    expect(requiresHumanJustification(1.99)).toBe(false);
  });

  it('does not require justification for score 0 (STABLE)', () => {
    expect(requiresHumanJustification(0)).toBe(false);
  });
});
