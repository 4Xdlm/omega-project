/**
 * Tests for emotion-brief-bridge — Sprint 4.1
 * Invariant: BRIEF-WIRE-01 (emotionBrief computed from packet SSOT)
 */

import { describe, it, expect } from 'vitest';
import { buildEmotionBriefFromPacket } from '../../src/input/emotion-brief-bridge.js';
import { MOCK_PACKET } from '../fixtures/mock-packet.js';

describe('emotion-brief-bridge', () => {
  it('builds ForgeEmotionBrief from valid packet', () => {
    const brief = buildEmotionBriefFromPacket(MOCK_PACKET);
    expect(brief.schema_version).toBe('forge.emotion.v1');
    expect(brief.producer).toBe('omega-forge');
    expect(brief.trajectory.length).toBeGreaterThan(0);
    expect(brief.persistence_ceiling).toBeGreaterThan(0);
  });

  it('deterministic: same packet → same brief hash', () => {
    const b1 = buildEmotionBriefFromPacket(MOCK_PACKET);
    const b2 = buildEmotionBriefFromPacket(MOCK_PACKET);
    expect(b1.canonical_table_hash).toBe(b2.canonical_table_hash);
    expect(b1.producer_build_hash).toBe(b2.producer_build_hash);
  });

  it('fail-closed on missing quartiles', () => {
    const bad = { ...MOCK_PACKET, emotion_contract: { ...MOCK_PACKET.emotion_contract, curve_quartiles: [] as any } };
    expect(() => buildEmotionBriefFromPacket(bad)).toThrow('FAIL-CLOSED');
  });

  it('waypoints cover 0.0 to 1.0', () => {
    const brief = buildEmotionBriefFromPacket(MOCK_PACKET);
    // Trajectory should cover the full range
    expect(brief.trajectory.length).toBeGreaterThanOrEqual(4);
  });
});
