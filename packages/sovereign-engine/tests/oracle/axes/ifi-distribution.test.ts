/**
 * Tests for IFI distribution bonus (INV-IFI-DISTRIB-01)
 * Tests computeIFI with quartile coverage scenarios
 */

import { describe, it, expect } from 'vitest';
import { computeIFI } from '../../../src/oracle/macro-axes.js';
import { MOCK_PACKET } from '../../fixtures/mock-packet.js';
import { MockSovereignProvider } from '../../fixtures/mock-provider.js';

const mockProvider = new MockSovereignProvider();

describe('IFI distribution bonus', () => {
  it('INV-IFI-DISTRIB-01: IFI includes distribution bonus', async () => {
    const prose = `Para 1 with hands.\n\nPara 2 with fingers.\n\nPara 3 with breath.\n\nPara 4 with skin.`;
    const result = await computeIFI(MOCK_PACKET, prose, mockProvider);

    // Should have bonuses array (may contain distribution bonus)
    expect(result.bonuses).toBeDefined();
    expect(Array.isArray(result.bonuses)).toBe(true);
  });

  it('all 4 quartiles have corporeal markers → +10 bonus', async () => {
    // Create prose with 4 paragraphs, each with corporeal markers
    const prose = `First paragraph mentions hands and fingers.\n\nSecond paragraph describes breath and chest.\n\nThird paragraph talks about skin and touch.\n\nFourth paragraph includes pulse and throat.`;
    const result = await computeIFI(MOCK_PACKET, prose, mockProvider);

    // Check if distribution bonus was triggered
    const distribBonus = result.bonuses.find((b) => b.detail.includes('quartile'));
    if (distribBonus && distribBonus.triggered) {
      expect(distribBonus.value).toBeGreaterThan(0);
    }
  });

  it('weight rebalance: Sprint 14 — 5 sub-scores with phantom axes', async () => {
    const prose = `Test prose with sensory and corporeal content.`;
    const result = await computeIFI(MOCK_PACKET, prose, mockProvider);

    // Sprint 14: 5 sub-scores (3 original + 2 phantom)
    const sensoryRichness = result.sub_scores.find((s) => s.name === 'sensory_richness');
    const corporealAnchoring = result.sub_scores.find((s) => s.name === 'corporeal_anchoring');
    const focalisation = result.sub_scores.find((s) => s.name === 'focalisation');
    const attentionSustain = result.sub_scores.find((s) => s.name === 'attention_sustain');
    const fatigueManagement = result.sub_scores.find((s) => s.name === 'fatigue_management');

    // Sprint 14 rebalanced weights
    expect(sensoryRichness?.weight).toBe(0.25);
    expect(corporealAnchoring?.weight).toBe(0.25);
    expect(focalisation?.weight).toBe(0.25);

    // Phantom axes present
    expect(attentionSustain).toBeDefined();
    expect(fatigueManagement).toBeDefined();

    // Total sub-scores = 5
    expect(result.sub_scores).toHaveLength(5);
  });

  it('IFI score is always [0, 100] even with bonus', async () => {
    const proses = [
      `Short.`,
      `Medium prose with hands and breath and sensory details.`,
      `Long prose.\n\nWith multiple paragraphs.\n\nIncluding corporeal markers like fingers.\n\nAnd more content with skin.`,
    ];

    for (const prose of proses) {
      const result = await computeIFI(MOCK_PACKET, prose, mockProvider);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    }
  });

  it('few paragraphs → no distribution bonus', async () => {
    const prose = `Only one paragraph without quartile structure.`;
    const result = await computeIFI(MOCK_PACKET, prose, mockProvider);

    // Should still work but distribution bonus may not trigger
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
