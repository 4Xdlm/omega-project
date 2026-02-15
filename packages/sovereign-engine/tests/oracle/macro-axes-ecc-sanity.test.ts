/**
 * Tests for ECC Weights Sanity — Sprint 7 Commit 7.3 (ChatGPT Audit)
 * Invariants: ECC-SAN-01 to ECC-SAN-04
 *
 * Verifies that physics_compliance integration doesn't break ECC calculation.
 */

import { describe, it, expect } from 'vitest';
import { computeECC } from '../../src/oracle/macro-axes.js';
import { MOCK_PACKET } from '../fixtures/mock-packet.js';
import { MockSovereignProvider } from '../fixtures/mock-provider.js';
import type { PhysicsAuditResult } from '../../src/oracle/physics-audit.js';

describe('ECC Weights Sanity (ChatGPT Audit)', () => {
  const mockProvider = new MockSovereignProvider();

  const PROSE = `La peur monte dans la pièce sombre. Les ombres dansent sur les murs.

Le souffle se coupe. Les mains tremblent, les doigts se crispent sur le bord de la table.

La terreur explose enfin. Le cœur bat à tout rompre, les yeux s'écarquillent dans le noir.

Le silence revient. Lourd, définitif, écrasant. Plus rien ne bouge.`;

  // Minimal valid PhysicsAuditResult for testing
  const createMockAudit = (physicsScore: number): PhysicsAuditResult => ({
    audit_id: 'test-audit',
    audit_hash: 'test-hash',
    trajectory_analysis: {
      cosine_similarity_avg: 0.9,
      euclidean_distance_avg: 0.1,
    },
    law_compliance: {
      law1_conservation: { compliant: true, score: 100 },
      law2_decay: { compliant: true, score: 100 },
      law3_transitions: { compliant: true, score: 100 },
      law4_blending: { compliant: true, score: 100 },
      law5_energy: { compliant: true, score: 100 },
      law6_coherence: { compliant: true, score: 100 },
    },
    dead_zones: [],
    forced_transitions: 0,
    feasibility_failures: 0,
    trajectory_deviations: [],
    physics_score: physicsScore,
  });

  it('ECC-SAN-01: ECC score is 0-100 range without physics', async () => {
    const result = await computeECC(MOCK_PACKET, PROSE, mockProvider);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('ECC-SAN-02: ECC score is 0-100 range WITH physics audit', async () => {
    const auditResult = createMockAudit(85);
    const result = await computeECC(MOCK_PACKET, PROSE, mockProvider, auditResult);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('ECC-SAN-03: ECC with physics_compliance weight=0 ignores physics score', async () => {
    // Default weight is 0, so physics audit should NOT affect ECC
    const withoutPhysics = await computeECC(MOCK_PACKET, PROSE, mockProvider);
    const withPerfectPhysics = await computeECC(MOCK_PACKET, PROSE, mockProvider, createMockAudit(100));
    const withBadPhysics = await computeECC(MOCK_PACKET, PROSE, mockProvider, createMockAudit(0));

    // With weight=0, scores should be identical regardless of physics_score
    expect(withoutPhysics.score).toBe(withPerfectPhysics.score);
    expect(withoutPhysics.score).toBe(withBadPhysics.score);
  });

  it('ECC-SAN-04: ECC sub_scores includes physics_compliance', async () => {
    const result = await computeECC(MOCK_PACKET, PROSE, mockProvider);
    const pcAxis = result.sub_scores.find(s => s.name === 'physics_compliance');
    expect(pcAxis).toBeDefined();
    expect(pcAxis!.weight).toBe(0); // Default weight
    expect(pcAxis!.score).toBeGreaterThanOrEqual(0);
    expect(pcAxis!.score).toBeLessThanOrEqual(100);
  });
});
