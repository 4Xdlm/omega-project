/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — DELTA TENSION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: delta/delta-tension.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Measures tension structure compliance: slope, pic, faille, monotony.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { analyzeEmotionFromText, computeArousal } from '@omega/omega-forge';
import type { ForgePacket, TensionDelta } from '../types.js';
import { SOVEREIGN_CONFIG } from '../config.js';

export function computeTensionDelta(packet: ForgePacket, prose: string): TensionDelta {
  const paragraphs = prose.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const arousals = paragraphs.map((p) => {
    const state = analyzeEmotionFromText(p);
    return computeArousal(state);
  });

  const targetSlope = packet.emotion_contract.tension.slope_target;
  const actualSlope = detectSlope(arousals);
  const slope_match = targetSlope === actualSlope ? 1.0 : 0.5;

  const maxArousal = Math.max(...arousals);
  const maxIdx = arousals.indexOf(maxArousal);
  const actualPicPos = maxIdx / arousals.length;
  const targetPicPos = packet.emotion_contract.tension.pic_position_pct;
  const pic_present = maxArousal > 0.6;
  const pic_timing_error = Math.abs(actualPicPos - targetPicPos);

  let maxDrop = 0;
  let dropIdx = 0;
  for (let i = 0; i < arousals.length - 1; i++) {
    const drop = arousals[i] - arousals[i + 1];
    if (drop > maxDrop) {
      maxDrop = drop;
      dropIdx = i;
    }
  }
  const actualFaillePos = dropIdx / arousals.length;
  const targetFaillePos = packet.emotion_contract.tension.faille_position_pct;
  const faille_present = maxDrop > 0.1;
  const faille_timing_error = Math.abs(actualFaillePos - targetFaillePos);

  const consequence_present = detectConsequence(arousals, dropIdx);

  const std = standardDeviation(arousals);
  const monotony_score = std < SOVEREIGN_CONFIG.MONOTONY_THRESHOLD ? 0 : Math.min(1, std / 0.3);

  return {
    slope_match,
    pic_present,
    pic_timing_error,
    faille_present,
    faille_timing_error,
    consequence_present,
    monotony_score,
  };
}

function detectSlope(arousals: number[]): 'ascending' | 'descending' | 'arc' | 'reverse_arc' {
  if (arousals.length < 4) return 'ascending';

  const q1 = arousals.slice(0, Math.floor(arousals.length / 4));
  const q2 = arousals.slice(Math.floor(arousals.length / 4), Math.floor(arousals.length / 2));
  const q3 = arousals.slice(Math.floor(arousals.length / 2), Math.floor((3 * arousals.length) / 4));
  const q4 = arousals.slice(Math.floor((3 * arousals.length) / 4));

  const avg1 = q1.reduce((a, b) => a + b, 0) / q1.length;
  const avg2 = q2.reduce((a, b) => a + b, 0) / q2.length;
  const avg3 = q3.reduce((a, b) => a + b, 0) / q3.length;
  const avg4 = q4.reduce((a, b) => a + b, 0) / q4.length;

  if (avg2 > avg1 && avg3 > avg2 && avg4 > avg3) return 'ascending';
  if (avg2 < avg1 && avg3 < avg2 && avg4 < avg3) return 'descending';
  if (avg2 > avg1 && avg3 > avg2 && avg4 < avg3) return 'arc';
  return 'reverse_arc';
}

function detectConsequence(arousals: number[], dropIdx: number): boolean {
  if (dropIdx >= arousals.length - 2) return false;
  const beforeDrop = arousals[dropIdx];
  const afterDrop = arousals[dropIdx + 1];
  const twoAfterDrop = arousals[dropIdx + 2];
  return afterDrop < beforeDrop && twoAfterDrop < beforeDrop;
}

function standardDeviation(arr: number[]): number {
  const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((sum, x) => sum + (x - avg) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}
