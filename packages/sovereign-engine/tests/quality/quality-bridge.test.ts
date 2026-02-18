/**
 * Tests for Quality M1-M12 Bridge — Sprint 6 Commit 6.1 (Roadmap 4.1)
 * Invariants: QM-01 to QM-06
 */

import { describe, it, expect } from 'vitest';
import { buildQualityReport } from '../../src/quality/quality-bridge.js';
import { MOCK_PACKET } from '../fixtures/mock-packet.js';

describe('Quality M1-M12 Bridge (Roadmap 4.1)', () => {
  const PROSE = `La peur monte dans la pièce sombre. Les ombres dansent.

Le souffle se coupe. Les mains tremblent sur le bord de la table.

La terreur explose. Le cœur bat à tout rompre, les yeux s'écarquillent.

Le silence revient. Lourd, définitif. Plus rien ne bouge.

Un souvenir refait surface. Une promesse oubliée depuis longtemps.

Les doigts cherchent quelque chose dans le noir. Ils trouvent le métal froid.`;

  it('QM-01: returns disabled report when enabled=false override', () => {
    const report = buildQualityReport(PROSE, MOCK_PACKET, { enabled: false });
    expect(report.enabled).toBe(false);
    expect(report.computed_count).toBe(0);
    expect(report.degraded_count).toBe(12);
    expect(report.degraded_signals).toContain('all_disabled');
  });

  it('QM-02: quality_score_partial is 0 when disabled', () => {
    const report = buildQualityReport(PROSE, MOCK_PACKET, { enabled: false });
    expect(report.quality_score_partial).toBe(0);
  });

  it('QM-03: report_hash is deterministic', () => {
    const r1 = buildQualityReport(PROSE, MOCK_PACKET);
    const r2 = buildQualityReport(PROSE, MOCK_PACKET);
    expect(r1.report_hash).toBe(r2.report_hash);
    expect(r1.report_hash).toMatch(/^[0-9a-f]{64}$/); // SHA-256 hash
  });

  it('QM-04: degraded metrics have reason when disabled', () => {
    const report = buildQualityReport(PROSE, MOCK_PACKET, { enabled: false });
    // When disabled, all are degraded with reason
    Object.values(report.metrics).forEach((m) => {
      expect(m.status).toBe('degraded');
      expect(m.reason).toBeDefined();
      expect(m.reason!.length).toBeGreaterThan(0);
    });
  });

  it('QM-05: computed_count + degraded_count = 12', () => {
    const report = buildQualityReport(PROSE, MOCK_PACKET);
    expect(report.computed_count + report.degraded_count).toBe(12);
  });

  it('QM-06: quality_score_partial >= 0 and finite', () => {
    const report = buildQualityReport(PROSE, MOCK_PACKET);
    expect(report.quality_score_partial).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(report.quality_score_partial)).toBe(true);
  });
});
