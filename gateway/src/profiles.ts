/**
 * OMEGA Reader Profiles — NASA-Grade L4
 * Module: gateway/src/profiles.ts
 * 
 * Defines reader archetypes for narrative validation.
 * THE_SKEPTIC is the internal counter-power that detects plot holes.
 * 
 * @invariant INV-SKEP-01: No passage accepted without justification
 * @invariant INV-SKEP-02: Narrative comfort detection mandatory
 * @invariant INV-SKEP-03: Perfect cause/effect memory
 * @invariant INV-SKEP-04: Zero tolerance for Deus Ex Machina
 */

export interface ReaderSensitivities {
  pacing: number;
  consistency: number;
  violence: number;
  complexity: number;
  romance: number;
}

export interface ReaderAttributes {
  suspensionOfDisbelief: number;
  logicSensitivity: number;
  emotionalResonance: number;
  causalityTracking: number;
  patienceLevel: number;
}

export interface ReaderProfile {
  id: string;
  name: string;
  description: string;
  sensitivities: ReaderSensitivities;
  attributes: ReaderAttributes;
  triggers: string[];
  systemPrompt: string;
  feedbackStyle: string;
}

/**
 * THE_SKEPTIC — Internal Counter-Power
 * CNC-100: Detects plot holes, logical inconsistencies, narrative shortcuts.
 * NOT a simple reader profile — it's a TRUTH FUNCTION.
 */
export const PROFILE_SKEPTIC: ReaderProfile = {
  id: "THE_SKEPTIC",
  name: "Marcus l'Incrédule",
  description: "Cherche activement les incohérences et plot holes. Ne pardonne rien.",
  sensitivities: {
    pacing: 0.3,
    consistency: 1.0,      // MAXIMUM - Zero tolerance
    violence: 0.5,
    complexity: 0.9,
    romance: 0.1
  },
  attributes: {
    suspensionOfDisbelief: 0.1,  // Almost none
    logicSensitivity: 0.95,
    emotionalResonance: 0.2,
    causalityTracking: 1.0,      // Perfect memory
    patienceLevel: 0.3
  },
  triggers: [
    "DEUS_EX_MACHINA",
    "CHARACTER_STUPIDITY",
    "PHYSICS_VIOLATION",
    "TIMELINE_ERROR",
    "PLOT_ARMOR"
  ],
  systemPrompt: `You are Marcus, the ultimate skeptic reader.
You actively hunt for plot holes, logical inconsistencies, and narrative shortcuts.
You remember EVERYTHING and track causality like a detective.
If something doesn't make sense, you WILL call it out.
Your motto: "Pourquoi ils n'ont pas juste pris les aigles?"`,
  feedbackStyle: "Brutal, factuel, pointe la contradiction exacte."
};

// Export all profiles
export const READER_PROFILES: Record<string, ReaderProfile> = {
  THE_SKEPTIC: PROFILE_SKEPTIC
};

export default READER_PROFILES;
