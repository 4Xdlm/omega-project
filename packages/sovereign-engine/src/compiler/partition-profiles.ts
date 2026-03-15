/**
 * compiler/partition-profiles.ts — Partition Profiles v3.1.0
 * Sprint S1 — SCRIBE ORCHESTRÉ
 *
 * Wraps compilePartition() with profile-specific configs:
 *   DRAMATURGE — emotion focus (ECC + IFI axes)
 *   MUSICIEN   — craft focus (RCI + SII axes)
 *
 * Invariants:
 *   INV-PROF-01 : compilePartition() is NEVER modified — only wrapped
 *   INV-PROF-02 : N1 (laws) identical across all profiles
 *   INV-PROF-03 : N3 (decor) identical across all profiles
 *   INV-PROF-04 : Each profile filters PDB instructions by target_axes overlap
 *   INV-PROF-05 : Custom attention contract per profile (overrides generic)
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import type { ForgePacket } from '../types.js';
import type { CDEInput } from '../cde/types.js';
import type { PDBInstruction } from '../prose-directive/lot1-instructions.js';
import type { CompiledPartition, CompilerConfig } from './types.js';
import { DEFAULT_COMPILER_CONFIG } from './types.js';
import { compilePartition } from './prompt-compiler.js';
import { countTokens } from '../constraints/token-counter.js';

// ── Profile Types ─────────────────────────────────────────────────────────────

export type ProfileName = 'DRAMATURGE' | 'MUSICIEN';

export interface PartitionProfile {
  readonly name: ProfileName;
  readonly axes: readonly string[];
  readonly budget_l2: number;
  readonly contract_label: string;
}

// ── Axes Sets ─────────────────────────────────────────────────────────────────

/** DRAMATURGE: ECC + IFI — emotion, tension, interiority, sensory */
export const DRAMATURGE_AXES: readonly string[] = [
  'tension_14d',
  'interiorite',
  'coherence_emotionnelle',
  'impact_ouverture_cloture',
  'densite_sensorielle',
] as const;

/** MUSICIEN: RCI + SII — rhythm, anti-cliché, necessity, signature */
export const MUSICIEN_AXES: readonly string[] = [
  'rythme_musical',
  'anti_cliche',
  'necessite_m8',
  'signature',
  'voice_conformity',
] as const;

// ── Profile Definitions ───────────────────────────────────────────────────────

export const PROFILE_DRAMATURGE: PartitionProfile = {
  name: 'DRAMATURGE',
  axes: DRAMATURGE_AXES,
  budget_l2: 250,
  contract_label: 'FOCUS ÉMOTION',
};

export const PROFILE_MUSICIEN: PartitionProfile = {
  name: 'MUSICIEN',
  axes: MUSICIEN_AXES,
  budget_l2: 250,
  contract_label: 'FOCUS CRAFT',
};

// ── Instruction Filter ────────────────────────────────────────────────────────

/**
 * Filter PDB instructions for a profile.
 * Keep instruction if ANY of its target_axes overlaps with the profile's axes set.
 * INV-PROF-04.
 */
export function filterInstructionsForProfile(
  instructions: readonly PDBInstruction[],
  profile: PartitionProfile,
): PDBInstruction[] {
  const axesSet = new Set(profile.axes);
  return instructions.filter(inst =>
    inst.target_axes.some(axis => axesSet.has(axis)),
  );
}

// ── Custom Attention Contract ─────────────────────────────────────────────────

function buildProfileContract(profile: PartitionProfile): string {
  return `CONTRAT D'EXÉCUTION — ${profile.contract_label} — 3 NIVEAUX

NIVEAU 1 (LOIS) : INVIOLABLE. Violation = REJET.
NIVEAU 2 (TRAJECTOIRE) : OBLIGATOIRE. ${profile.contract_label}. Compressible.
NIVEAU 3 (DÉCOR) : SOUHAITABLE. Sacrifiable pour N1/N2.

Conflit → N1 bat N2 bat N3. Toujours.`;
}

// ── Main Entry Point ──────────────────────────────────────────────────────────

/**
 * compileWithProfile() — Wrap compilePartition() with profile-specific config.
 *
 * INV-PROF-01 : compilePartition() is called unmodified.
 * INV-PROF-02 : N1 content is identical (same packet/CDE → same N1 laws).
 * INV-PROF-03 : N3 content is identical (same budget_l3).
 * INV-PROF-05 : Attention contract is overridden post-compilation.
 *
 * @throws Error if N1 exceeds budget (propagated from compilePartition)
 */
export function compileWithProfile(
  profile: PartitionProfile,
  packet: ForgePacket,
  cdeInput: CDEInput | null,
  allInstructions: readonly PDBInstruction[],
  shape?: string,
): CompiledPartition {
  // 1. Filter instructions for this profile
  const filtered = filterInstructionsForProfile(allInstructions, profile);

  // 2. Build profile-specific config
  const config: CompilerConfig = {
    ...DEFAULT_COMPILER_CONFIG,
    budget_l2: profile.budget_l2,
    shape: shape ?? packet.intent?.conflict_type ?? 'Confrontation',
  };

  // 3. Call compilePartition() unmodified (INV-PROF-01)
  const partition = compilePartition(packet, cdeInput, config, filtered);

  // 4. Override attention contract (INV-PROF-05)
  const profileContract = buildProfileContract(profile);
  const contractTokens = countTokens(profileContract, config.tokenizer_id);

  // Recompute total_tokens with new contract
  const totalTokens = partition.total_tokens
    - partition.instrumentation.tokens_by_level.contract
    + contractTokens;

  return {
    ...partition,
    attention_contract: profileContract,
    total_tokens: totalTokens,
    instrumentation: {
      ...partition.instrumentation,
      tokens_by_level: {
        ...partition.instrumentation.tokens_by_level,
        contract: contractTokens,
      },
    },
  };
}
