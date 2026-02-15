/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — CORRECTION CATALOG
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: pitch/correction-catalog.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Closed catalog of 12 correction operations.
 * Each op is typed, documented, and has expected impact on axes.
 *
 * CATALOG:
 * 1. inject_sensory_detail → sensory_density +
 * 2. convert_dialogue_to_indirect → interiority +
 * 3. add_micro_rupture_event → tension_14d +, emotion_coherence -
 * 4. tighten_sentence_rhythm → rhythm +
 * 5. replace_cliche → anti_cliche +
 * 6. increase_interiority_signal → interiority +
 * 7. compress_exposition → necessity +
 * 8. add_consequence_line → tension_14d +
 * 9. shift_emotion_register → tension_14d +
 * 10. inject_silence_zone → tension_14d +
 * 11. sharpen_opening → impact +
 * 12. deepen_closing → impact +
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { CorrectionOp } from '../types.js';

export interface OperationDescriptor {
  readonly op: CorrectionOp;
  readonly description: string;
  readonly primary_axis: string;
  readonly expected_delta: number;
  readonly secondary_effects: readonly { readonly axis: string; readonly delta: number }[];
  readonly instruction_template: string;
}

export const CORRECTION_CATALOG: readonly OperationDescriptor[] = [
  {
    op: 'inject_sensory_detail',
    description: 'Add specific sensory markers (sight, sound, touch, smell, taste, proprioception, interoception)',
    primary_axis: 'sensory_density',
    expected_delta: 5,
    secondary_effects: [{ axis: 'interiority', delta: 2 }],
    instruction_template: 'In {zone}, add 1-2 specific sensory details that ground the scene. Use concrete markers (e.g., "iodine", "copper", "gravel underfoot"). Avoid abstract sensory language.',
  },
  {
    op: 'convert_dialogue_to_indirect',
    description: 'Convert direct dialogue to indirect discourse or interior thought',
    primary_axis: 'interiority',
    expected_delta: 7,
    secondary_effects: [{ axis: 'necessity', delta: 3 }],
    instruction_template: 'In {zone}, convert 1-2 lines of direct dialogue to indirect discourse or interior reflection. Preserve subtext.',
  },
  {
    op: 'add_micro_rupture_event',
    description: 'Inject a small external event that shifts emotional register',
    primary_axis: 'tension_14d',
    expected_delta: 8,
    secondary_effects: [{ axis: 'emotion_coherence', delta: -3 }],
    instruction_template: 'In {zone}, add a brief external event (1-2 sentences) that triggers an emotional pivot. Keep it small but decisive.',
  },
  {
    op: 'tighten_sentence_rhythm',
    description: 'Vary sentence length, add syncopes or compressions',
    primary_axis: 'rhythm',
    expected_delta: 6,
    secondary_effects: [],
    instruction_template: 'In {zone}, vary sentence lengths. Add 1 syncope (short sentence after long one) or 1 compression (≤3 words).',
  },
  {
    op: 'replace_cliche',
    description: 'Replace identified cliché with specific, concrete language',
    primary_axis: 'anti_cliche',
    expected_delta: 10,
    secondary_effects: [{ axis: 'signature', delta: 2 }],
    instruction_template: 'In {zone}, replace the cliché "{cliche_pattern}" with a specific, sensory, non-clichéd alternative.',
  },
  {
    op: 'increase_interiority_signal',
    description: 'Add internal monologue or subtext layer',
    primary_axis: 'interiority',
    expected_delta: 8,
    secondary_effects: [],
    instruction_template: 'In {zone}, add 1-2 sentences of interior thought/feeling. Show internal conflict or subtext beneath surface action.',
  },
  {
    op: 'compress_exposition',
    description: 'Remove redundant or unnecessary exposition',
    primary_axis: 'necessity',
    expected_delta: 7,
    secondary_effects: [{ axis: 'rhythm', delta: 2 }],
    instruction_template: 'In {zone}, cut 1-2 sentences of redundant exposition. Keep only what advances beat or reveals character.',
  },
  {
    op: 'add_consequence_line',
    description: 'Add a line showing consequence of previous tension peak',
    primary_axis: 'tension_14d',
    expected_delta: 5,
    secondary_effects: [{ axis: 'emotion_coherence', delta: 3 }],
    instruction_template: 'In {zone} (after tension peak), add 1 sentence showing the consequence/aftermath of the peak.',
  },
  {
    op: 'shift_emotion_register',
    description: 'Adjust emotional intensity/valence to match target',
    primary_axis: 'tension_14d',
    expected_delta: 7,
    secondary_effects: [{ axis: 'emotion_coherence', delta: -2 }],
    instruction_template: 'In {zone}, shift the emotional register toward {target_emotion} with intensity {target_intensity}. Adjust word choice and sentence rhythm.',
  },
  {
    op: 'inject_silence_zone',
    description: 'Create a moment of pause, low arousal, stillness',
    primary_axis: 'tension_14d',
    expected_delta: 4,
    secondary_effects: [{ axis: 'rhythm', delta: 3 }],
    instruction_template: 'In {zone}, create a 1-2 sentence moment of stillness/pause. Low arousal, no action, breath.',
  },
  {
    op: 'sharpen_opening',
    description: 'Strengthen first 1-2 sentences with hook or specificity',
    primary_axis: 'impact',
    expected_delta: 8,
    secondary_effects: [],
    instruction_template: 'Sharpen the opening 1-2 sentences. Make them more specific, sensory, or intriguing. Avoid generic scene-setting.',
  },
  {
    op: 'deepen_closing',
    description: 'Strengthen final 1-2 sentences with resonance or implication',
    primary_axis: 'impact',
    expected_delta: 8,
    secondary_effects: [{ axis: 'emotion_coherence', delta: 2 }],
    instruction_template: 'Deepen the closing 1-2 sentences. Add implication, echo, or terminal emotional resonance. Avoid summary.',
  },
] as const;

export function getOperationDescriptor(op: CorrectionOp): OperationDescriptor | undefined {
  return CORRECTION_CATALOG.find((desc) => desc.op === op);
}

export function getOperationsByPrimaryAxis(axis: string): readonly OperationDescriptor[] {
  return CORRECTION_CATALOG.filter((desc) => desc.primary_axis === axis);
}
