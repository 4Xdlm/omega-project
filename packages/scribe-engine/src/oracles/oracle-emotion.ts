/**
 * OMEGA Scribe Engine -- Oracle Emotion
 * Scores emotional alignment with target
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type { EmotionTarget } from '@omega/genesis-planner';
import type { ProseDoc, OracleResult } from '../types.js';

export function runOracleEmotion(
  prose: ProseDoc,
  emotionTarget: EmotionTarget,
): OracleResult {
  const findings: string[] = [];

  if (prose.paragraphs.length === 0) {
    return {
      oracle_id: 'ORACLE_EMOTION',
      verdict: 'FAIL',
      score: 0,
      findings: ['No paragraphs to evaluate'],
      evidence_hash: sha256(canonicalize({ oracle: 'emotion', result: 'empty' })),
    };
  }

  const totalParas = prose.paragraphs.length;
  let alignedWaypoints = 0;
  let totalDrift = 0;

  for (const waypoint of emotionTarget.waypoints) {
    const paraIndex = Math.min(Math.floor(waypoint.position * totalParas), totalParas - 1);
    const para = prose.paragraphs[paraIndex];

    const intensityDiff = Math.abs(para.intensity - waypoint.intensity);
    totalDrift += intensityDiff;

    if (intensityDiff <= 0.3) {
      alignedWaypoints++;
    } else {
      findings.push(`Waypoint ${waypoint.position}: expected intensity ${waypoint.intensity}, got ${para.intensity}`);
    }
  }

  const waypointScore = emotionTarget.waypoints.length > 0
    ? alignedWaypoints / emotionTarget.waypoints.length
    : 0;

  const avgDrift = emotionTarget.waypoints.length > 0
    ? totalDrift / emotionTarget.waypoints.length
    : 0;

  const driftScore = 1 - Math.min(1, avgDrift);
  const score = (waypointScore + driftScore) / 2;

  // Check climax
  const climaxIndex = Math.min(
    Math.floor(emotionTarget.climax_position * totalParas),
    totalParas - 1,
  );
  const climaxPara = prose.paragraphs[climaxIndex];
  if (climaxPara.intensity < 0.5) {
    findings.push(`Climax at position ${emotionTarget.climax_position} has low intensity: ${climaxPara.intensity}`);
  }

  const verdict = score >= 0.6 ? 'PASS' : 'FAIL';

  const evidenceHash = sha256(canonicalize({
    oracle: 'ORACLE_EMOTION',
    aligned: alignedWaypoints,
    total: emotionTarget.waypoints.length,
    score,
  }));

  return {
    oracle_id: 'ORACLE_EMOTION',
    verdict,
    score,
    findings,
    evidence_hash: evidenceHash,
  };
}
