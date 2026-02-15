/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — DRAFT MODES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: duel/draft-modes.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Prompt variants for 3 draft modes.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export const DRAFT_MODE_INSTRUCTIONS: Readonly<Record<string, string>> = {
  tranchant_minimaliste: `
MODE: TRANCHANT MINIMALISTE
- Compression maximale, every word earns its place
- Short sentences (avg 8-12 words), syncopes, brutal cuts
- Minimal description, maximum implication
- Precision over abundance
`,
  sensoriel_dense: `
MODE: SENSORIEL DENSE
- Sensory saturation: sight, sound, touch, smell, interoception
- Concrete specificity: "iodine", "gravel underfoot", "copper on tongue"
- Longer sentences (avg 15-20 words) with layered sensory details
- Metaphors grounded in physical experience
`,
  experimental_signature: `
MODE: EXPERIMENTAL SIGNATURE
- Push signature style to extremes
- Ruptures, compressions, respirations
- Unconventional rhythms, bold choices
- Risk-taking over safety
`,
} as const;

export function getDraftModeInstruction(mode: string): string {
  return DRAFT_MODE_INSTRUCTIONS[mode] ?? DRAFT_MODE_INSTRUCTIONS.tranchant_minimaliste;
}
