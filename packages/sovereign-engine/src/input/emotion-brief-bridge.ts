/**
 * OMEGA Sovereign — Emotion Brief Bridge
 *
 * Converts ForgePacket.emotion_contract to ForgeEmotionBrief via omega-forge SSOT.
 * FAIL-CLOSED: throws if emotion_contract has no curve_quartiles.
 */

import { computeForgeEmotionBrief, DEFAULT_CANONICAL_TABLE, type ForgeEmotionBrief } from '@omega/omega-forge';
import type { ForgePacket } from '../types.js';
import { SOVEREIGN_CONFIG } from '../config.js';
import { sha256 } from '@omega/canon-kernel';

/**
 * Build ForgeEmotionBrief from ForgePacket's emotion_contract.
 *
 * Conversion logic:
 *   EmotionQuartile.quartile Q1/Q2/Q3/Q4 → position 0.0/0.25/0.5/0.75 + terminal at 1.0
 *   EmotionQuartile.dominant → emotion
 *   EmotionQuartile.arousal → intensity
 *
 * @throws Error if emotion_contract or curve_quartiles missing/invalid
 */
export function buildEmotionBriefFromPacket(packet: ForgePacket): ForgeEmotionBrief {
  const quartiles = packet.emotion_contract?.curve_quartiles;
  if (!quartiles || quartiles.length !== 4) {
    throw new Error('FAIL-CLOSED: ForgePacket.emotion_contract.curve_quartiles must have exactly 4 entries');
  }

  // Map quartile positions
  const QUARTILE_POSITIONS: Record<string, number> = {
    Q1: 0.0,
    Q2: 0.25,
    Q3: 0.5,
    Q4: 0.75,
  };

  const waypoints = quartiles.map(q => ({
    position: QUARTILE_POSITIONS[q.quartile] ?? 0,
    emotion: q.dominant,
    intensity: q.arousal,
  }));

  // Add terminal waypoint at 1.0 from Q4
  waypoints.push({
    position: 1.0,
    emotion: quartiles[3].dominant,
    intensity: quartiles[3].arousal * 0.8, // natural decay toward end
  });

  // Estimate totalParagraphs from target_word_count (avg ~100 words/paragraph)
  const estimatedParagraphs = Math.max(4, Math.round(packet.intent.target_word_count / 100));

  return computeForgeEmotionBrief({
    waypoints,
    sceneStartPct: 0.0,
    sceneEndPct: 1.0,
    totalParagraphs: estimatedParagraphs,
    canonicalTable: DEFAULT_CANONICAL_TABLE,
    persistenceCeiling: SOVEREIGN_CONFIG.PERSISTENCE_CEILING,
    language: packet.language,
    producerBuildHash: sha256(packet.packet_hash),
  });
}
