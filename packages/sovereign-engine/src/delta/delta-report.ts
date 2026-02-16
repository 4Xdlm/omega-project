/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — DELTA REPORT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: delta/delta-report.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Orchestrates delta computation across all dimensions.
 * Produces single DeltaReport with global distance metric.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { sha256, canonicalize } from '@omega/canon-kernel';
import type {
  ForgePacket,
  DeltaReport,
  EmotionDelta,
  TensionDelta,
  StyleDelta,
  ClicheDelta,
} from '../types.js';
import { computeEmotionDelta } from './delta-emotion.js';
import { computeTensionDelta } from './delta-tension.js';
import { computeStyleDelta } from './delta-style.js';
import { computeClicheDelta } from './delta-cliche.js';
import { buildPhysicsDelta } from './delta-physics.js';
import type { PhysicsAuditResult } from '../oracle/physics-audit.js';
import { generatePrescriptions, buildPrescriptionsDelta } from '../prescriptions/index.js';
import { SOVEREIGN_CONFIG } from '../config.js';

export function generateDeltaReport(
  packet: ForgePacket,
  prose: string,
  physicsAudit?: PhysicsAuditResult,
): DeltaReport {
  const emotion_delta = computeEmotionDelta(packet, prose);
  const tension_delta = computeTensionDelta(packet, prose);
  const style_delta = computeStyleDelta(packet, prose);
  const cliche_delta = computeClicheDelta(packet, prose);

  const global_distance = computeGlobalDistance(
    emotion_delta,
    tension_delta,
    style_delta,
    cliche_delta,
  );

  const physics_delta = buildPhysicsDelta(physicsAudit);

  // Sprint 3.3: Prescriptions chirurgicales top-K
  const prescriptions = SOVEREIGN_CONFIG.PRESCRIPTIONS_ENABLED
    ? generatePrescriptions(physicsAudit, SOVEREIGN_CONFIG.PRESCRIPTIONS_TOP_K)
    : [];
  const prescriptions_delta = buildPrescriptionsDelta(prescriptions);

  const report_data = {
    scene_id: packet.scene_id,
    timestamp: new Date().toISOString(),
    emotion_delta,
    tension_delta,
    style_delta,
    cliche_delta,
    global_distance,
    physics_delta,
    prescriptions_delta,
  };

  const report_hash = sha256(canonicalize(report_data));

  return {
    report_id: `DELTA_${packet.scene_id}_${Date.now()}`,
    report_hash,
    ...report_data,
  };
}

function computeGlobalDistance(
  emotion: EmotionDelta,
  tension: TensionDelta,
  style: StyleDelta,
  cliche: ClicheDelta,
): number {
  const emotionWeight = 0.4;
  const tensionWeight = 0.3;
  const styleWeight = 0.2;
  const clicheWeight = 0.1;

  const emotionDist = 1 - emotion.curve_correlation;
  const tensionDist = 1 - tension.slope_match * tension.monotony_score;
  const styleDist = style.gini_delta + (1 - style.signature_hit_rate);
  const clicheDist = Math.min(1, cliche.total_matches / 10);

  return (
    emotionWeight * emotionDist +
    tensionWeight * tensionDist +
    styleWeight * styleDist +
    clicheWeight * clicheDist
  );
}
