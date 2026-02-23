/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — DELTA COMPUTER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: delta/delta-computer.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Orchestration layer over generateDeltaReport.
 * Computes delta and determines if correction is needed.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket, DeltaReport } from '../types.js';
import type { PhysicsAuditResult } from '../oracle/physics-audit.js';
import { generateDeltaReport } from './delta-report.js';
import { SOVEREIGN_CONFIG } from '../config.js';

export interface DeltaComputerInput {
  readonly packet: ForgePacket;
  readonly prose: string;
  readonly physicsAudit?: PhysicsAuditResult;
}

export interface DeltaComputerOutput {
  readonly report: DeltaReport;
  readonly report_hash: string;
  readonly global_distance: number;
  readonly needs_correction: boolean;
}

export function computeDelta(input: DeltaComputerInput): DeltaComputerOutput {
  const report = generateDeltaReport(input.packet, input.prose, input.physicsAudit);

  return {
    report,
    report_hash: report.report_hash,
    global_distance: report.global_distance,
    needs_correction: report.global_distance > SOVEREIGN_CONFIG.DELTA_THRESHOLD,
  };
}
