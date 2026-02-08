/**
 * OMEGA Scribe Engine -- Truth Gate
 * S-INV-03: Every factual assertion maps to canon or plan.
 */

import type { Canon, GenesisPlan } from '@omega/genesis-planner';
import type { ProseDoc, GateResult, GateViolation, SConfig } from '../types.js';

export function runTruthGate(
  prose: ProseDoc,
  canon: Canon,
  plan: GenesisPlan,
  config: SConfig,
  timestamp: string,
): GateResult {
  const violations: GateViolation[] = [];
  let unsupportedCount = 0;
  const maxUnsupported = config.TRUTH_MAX_UNSUPPORTED.value as number;

  // Build canon ID set
  const canonIds = new Set<string>();
  for (const entry of canon.entries) {
    canonIds.add(entry.id);
  }

  // Build plan reference sets
  const planSceneIds = new Set<string>();
  const planArcIds = new Set<string>();
  const planBeatIds = new Set<string>();
  for (const arc of plan.arcs) {
    planArcIds.add(arc.arc_id);
    for (const scene of arc.scenes) {
      planSceneIds.add(scene.scene_id);
      for (const beat of scene.beats) {
        planBeatIds.add(beat.beat_id);
      }
    }
  }

  for (const para of prose.paragraphs) {
    // Check that paragraph has either canon refs or is traced to plan segments
    const hasCanonSupport = para.canon_refs.length > 0;
    const hasSegmentSupport = para.segment_ids.length > 0;

    if (!hasCanonSupport && !hasSegmentSupport) {
      unsupportedCount++;
      violations.push({
        gate_id: 'TRUTH_GATE',
        invariant: 'S-INV-03',
        paragraph_id: para.paragraph_id,
        message: `Paragraph has no canon refs and no segment trace`,
        severity: 'FATAL',
        details: `text: "${para.text.slice(0, 80)}..."`,
      });
    }

    // Verify canon_refs point to valid canon entries
    for (const ref of para.canon_refs) {
      if (!canonIds.has(ref)) {
        unsupportedCount++;
        violations.push({
          gate_id: 'TRUTH_GATE',
          invariant: 'S-INV-03',
          paragraph_id: para.paragraph_id,
          message: `Canon ref ${ref} not found in canon`,
          severity: 'ERROR',
          details: `Referenced canon entry does not exist`,
        });
      }
    }
  }

  const verdict = unsupportedCount <= maxUnsupported ? 'PASS' : 'FAIL';

  return {
    gate_id: 'TRUTH_GATE',
    verdict,
    violations,
    metrics: {
      unsupported_count: unsupportedCount,
      total_paragraphs: prose.paragraphs.length,
      canon_entries: canon.entries.length,
    },
    timestamp_deterministic: timestamp,
  };
}
