/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — TRIPLE PITCH
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: pitch/triple-pitch.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Generates 3 correction pitches from DeltaReport.
 * Each pitch targets different strategy:
 * A = emotional_intensification (emotion axes)
 * B = structural_rupture (tension + structure)
 * C = compression_musicality (rhythm + necessity + style)
 *
 * Max 8 items per pitch.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { DeltaReport, CorrectionPitch, PitchItem, CorrectionOp } from '../types.js';
import type { Prescription } from '../prescriptions/types.js';
import { SOVEREIGN_CONFIG } from '../config.js';

export function generateTriplePitch(
  delta: DeltaReport,
  prescriptions?: readonly Prescription[],
): readonly [CorrectionPitch, CorrectionPitch, CorrectionPitch] {
  const pitchA = generateEmotionalPitch(delta);
  const pitchB = generateStructuralPitch(delta);
  const pitchC = generateMusicalPitch(delta);

  // Sprint 4.3: Inject physics prescriptions as surgical PitchItems
  if (prescriptions && prescriptions.length > 0) {
    injectPrescriptionsIntoPitches(pitchA, pitchB, prescriptions);
  }

  return [pitchA, pitchB, pitchC];
}

function generateEmotionalPitch(delta: DeltaReport): CorrectionPitch {
  const items: PitchItem[] = [];

  if (1 - delta.emotion_delta.curve_correlation > 0.3) {
    items.push({
      id: `pitch_A_item_1`,
      zone: 'Q2',
      op: 'shift_emotion_register',
      reason: `Low emotion curve correlation (${delta.emotion_delta.curve_correlation.toFixed(2)})`,
      instruction: 'Shift emotional register in Q2 to better align with target trajectory',
      expected_gain: { axe: 'tension_14d', delta: 7 },
    });
  }

  if (!delta.emotion_delta.rupture_detected && delta.emotion_delta.rupture_timing_error > 0.5) {
    items.push({
      id: `pitch_A_item_2`,
      zone: 'Q2_Q3_boundary',
      op: 'add_micro_rupture_event',
      reason: `Rupture not detected or mistimed (error: ${delta.emotion_delta.rupture_timing_error.toFixed(2)})`,
      instruction: 'Add micro rupture event at Q2-Q3 boundary',
      expected_gain: { axe: 'tension_14d', delta: 8 },
    });
  }

  items.push({
    id: `pitch_A_item_3`,
    zone: 'Q1',
    op: 'increase_interiority_signal',
    reason: 'Boost interiority to anchor emotional depth',
    instruction: 'Add interior thought layer in Q1',
    expected_gain: { axe: 'interiority', delta: 8 },
  });

  items.push({
    id: `pitch_A_item_4`,
    zone: 'Q4',
    op: 'deepen_closing',
    reason: 'Strengthen terminal emotional resonance',
    instruction: 'Deepen closing emotional impact',
    expected_gain: { axe: 'impact', delta: 8 },
  });

  const total_expected_gain = items.reduce((sum, item) => sum + item.expected_gain.delta, 0);

  return {
    pitch_id: `PITCH_A_${delta.scene_id}`,
    strategy: 'emotional_intensification',
    items,
    total_expected_gain,
  };
}

function generateStructuralPitch(delta: DeltaReport): CorrectionPitch {
  const items: PitchItem[] = [];

  if (delta.tension_delta.slope_match < 0.7) {
    items.push({
      id: `pitch_B_item_1`,
      zone: 'Q2',
      op: 'add_consequence_line',
      reason: `Slope mismatch (${delta.tension_delta.slope_match.toFixed(2)})`,
      instruction: 'Add consequence line after tension peak to improve slope',
      expected_gain: { axe: 'tension_14d', delta: 5 },
    });
  }

  if (!delta.tension_delta.pic_present || delta.tension_delta.pic_timing_error > 0.2) {
    items.push({
      id: `pitch_B_item_2`,
      zone: 'Q2_Q3',
      op: 'add_micro_rupture_event',
      reason: `Pic absent or mistimed (error: ${delta.tension_delta.pic_timing_error.toFixed(2)})`,
      instruction: 'Add rupture event to create clear tension peak',
      expected_gain: { axe: 'tension_14d', delta: 8 },
    });
  }

  if (!delta.tension_delta.consequence_present) {
    items.push({
      id: `pitch_B_item_3`,
      zone: 'Q3',
      op: 'add_consequence_line',
      reason: 'No consequence detected after tension drop',
      instruction: 'Add consequence line in Q3',
      expected_gain: { axe: 'tension_14d', delta: 5 },
    });
  }

  items.push({
    id: `pitch_B_item_4`,
    zone: 'Q1',
    op: 'compress_exposition',
    reason: 'Tighten structure',
    instruction: 'Remove redundant exposition in Q1',
    expected_gain: { axe: 'necessity', delta: 7 },
  });

  const total_expected_gain = items.reduce((sum, item) => sum + item.expected_gain.delta, 0);

  return {
    pitch_id: `PITCH_B_${delta.scene_id}`,
    strategy: 'structural_rupture',
    items,
    total_expected_gain,
  };
}

function generateMusicalPitch(delta: DeltaReport): CorrectionPitch {
  const items: PitchItem[] = [];

  if (delta.style_delta.gini_delta > 0.1) {
    items.push({
      id: `pitch_C_item_1`,
      zone: 'Q2',
      op: 'tighten_sentence_rhythm',
      reason: `Gini delta ${delta.style_delta.gini_delta.toFixed(2)} (target: ${delta.style_delta.gini_target.toFixed(2)})`,
      instruction: 'Vary sentence lengths in Q2',
      expected_gain: { axe: 'rhythm', delta: 6 },
    });
  }

  if (delta.style_delta.monotony_sequences > 0) {
    items.push({
      id: `pitch_C_item_2`,
      zone: 'Q3',
      op: 'tighten_sentence_rhythm',
      reason: `${delta.style_delta.monotony_sequences} monotone sequences detected`,
      instruction: 'Add syncopes/compressions in Q3',
      expected_gain: { axe: 'rhythm', delta: 6 },
    });
  }

  if (delta.style_delta.opening_repetition_rate > SOVEREIGN_CONFIG.OPENING_REPETITION_MAX) {
    items.push({
      id: `pitch_C_item_3`,
      zone: 'Q1',
      op: 'tighten_sentence_rhythm',
      reason: `High opening repetition (${(delta.style_delta.opening_repetition_rate * 100).toFixed(0)}%)`,
      instruction: 'Vary sentence openings in Q1',
      expected_gain: { axe: 'rhythm', delta: 6 },
    });
  }

  if (delta.cliche_delta.total_matches > 0) {
    items.push({
      id: `pitch_C_item_4`,
      zone: 'all',
      op: 'replace_cliche',
      reason: `${delta.cliche_delta.total_matches} cliché matches`,
      instruction: `Replace clichés: ${delta.cliche_delta.matches.slice(0, 3).map((m) => m.pattern).join(', ')}`,
      expected_gain: { axe: 'anti_cliche', delta: 10 },
    });
  }

  items.push({
    id: `pitch_C_item_5`,
    zone: 'Q1',
    op: 'sharpen_opening',
    reason: 'Boost opening impact',
    instruction: 'Sharpen opening hook',
    expected_gain: { axe: 'impact', delta: 8 },
  });

  const total_expected_gain = items.reduce((sum, item) => sum + item.expected_gain.delta, 0);

  return {
    pitch_id: `PITCH_C_${delta.scene_id}`,
    strategy: 'compression_musicality',
    items,
    total_expected_gain,
  };
}

/**
 * Inject physics prescriptions into existing pitches.
 * Mapping:
 *   dead_zone + trajectory → Pitch A (emotional)
 *   forced_transition + feasibility → Pitch B (structural)
 *
 * Respects MAX_PITCH_ITEMS limit.
 * Mutates pitchA/pitchB items arrays (they're readonly in interface,
 * but we're building them internally — cast needed).
 */
function injectPrescriptionsIntoPitches(
  pitchA: CorrectionPitch,
  pitchB: CorrectionPitch,
  prescriptions: readonly Prescription[],
): void {
  const maxItems = SOVEREIGN_CONFIG.MAX_PITCH_ITEMS;

  for (const presc of prescriptions) {
    const item: PitchItem = {
      id: `surgical_${presc.prescription_id}`,
      zone: `Seg${presc.segment_index}`,
      op: mapPrescriptionToOp(presc.type),
      reason: `[PHYSICS] ${presc.diagnosis}`,
      instruction: presc.action,
      expected_gain: { axe: mapPrescriptionToAxe(presc.type), delta: severityToDelta(presc.severity) },
    };

    if (presc.type === 'dead_zone' || presc.type === 'trajectory') {
      if ((pitchA.items as PitchItem[]).length < maxItems) {
        (pitchA.items as PitchItem[]).push(item);
      }
    } else {
      // forced_transition, feasibility
      if ((pitchB.items as PitchItem[]).length < maxItems) {
        (pitchB.items as PitchItem[]).push(item);
      }
    }
  }

  // Recalculate total_expected_gain
  (pitchA as any).total_expected_gain = pitchA.items.reduce((s, i) => s + i.expected_gain.delta, 0);
  (pitchB as any).total_expected_gain = pitchB.items.reduce((s, i) => s + i.expected_gain.delta, 0);
}

function mapPrescriptionToOp(kind: string): CorrectionOp {
  switch (kind) {
    case 'dead_zone': return 'increase_interiority_signal';
    case 'trajectory': return 'shift_emotion_register';
    case 'forced_transition': return 'add_micro_rupture_event';
    case 'feasibility': return 'add_consequence_line';
    default: return 'shift_emotion_register';
  }
}

function mapPrescriptionToAxe(kind: string): string {
  switch (kind) {
    case 'dead_zone': return 'emotion_coherence';
    case 'trajectory': return 'tension_14d';
    case 'forced_transition': return 'tension_14d';
    case 'feasibility': return 'tension_14d';
    default: return 'tension_14d';
  }
}

function severityToDelta(severity: string): number {
  switch (severity) {
    case 'critical': return 12;
    case 'high': return 8;
    case 'medium': return 5;
    default: return 5;
  }
}
