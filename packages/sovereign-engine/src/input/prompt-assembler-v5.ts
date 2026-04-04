/**
 * prompt-assembler-v5.ts — V5 Bridge-Driven Prompt Assembler
 *
 * V5 = V4 + Rosetta Bridge dynamique.
 * Remplace les contraintes mecaniques hardcodees (V4 bloc 10)
 * par des directives calibrees du Rosetta Bridge.
 *
 * REGLES SCELLEES (convergence 3/3 IAs) :
 *   1. Ne JAMAIS injecter une feature ILLUSION
 *   2. Ne JAMAIS forcer une feature IRREDUCTIBLE
 *   3. Commencer par les 3 TOP PILOTABLE (phase 1)
 *   4. Mesurer le travail correctif, pas juste le score
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Date: 2026-04-03 (Bridge-02: +f29d, +f35c)
 */

import { buildSovereignPrompt_V4 } from './prompt-assembler-v4.js';
import { RosettaBridge } from '../coupling/rosetta-bridge.js';
import type { ForgePacket, SovereignPrompt } from '../types.js';
import type { SymbolMap } from '../symbol/symbol-map-types.js';
import { sha256, canonicalize } from '@omega/canon-kernel';

export const PROMPT_ASSEMBLER_V5_VERSION = '5.1.0';

/**
 * Phase 1 = 3 TOP PILOTABLE features (original V5).
 * Phase 2 = +f29d (anti-répétition bande) + f35c (hook début de chunk).
 * f36c_cliff_score EXCLU — token mort (bench V5, chunked-generator:148).
 *
 * Toggle: OMEGA_BRIDGE_PHASE=1 → Phase 1 (3 features)
 *         OMEGA_BRIDGE_PHASE=2 or unset → Phase 2 (5 features, default)
 */
const PHASE1_FEATURES = [
  'f24e_contrast_score',
  'f15b_redundancy_compression',
  'f16a_bigram_rarity',
] as const;

const PHASE2_FEATURES = [
  ...PHASE1_FEATURES,
  'f29d_ttr_score',
  'f35c_hook_score',
] as const;

function getActiveFeatures(): readonly string[] {
  return process.env.OMEGA_BRIDGE_PHASE === '1' ? PHASE1_FEATURES : PHASE2_FEATURES;
}

export function isV5Active(): boolean {
  return process.env.OMEGA_PROMPT_V5 === '1';
}

/**
 * Build V5 prompt = V4 base + Rosetta Bridge directives.
 *
 * Strategy:
 *   1. Get V4 prompt (all 11 blocs)
 *   2. Find the Rosetta constraints bloc (V4 bloc 10)
 *   3. Replace with bridge-generated directives (Phase 2: 5 PILOTABLE features)
 *   4. Keep everything else from V4 unchanged
 */
export function buildSovereignPrompt_V5(
  packet: ForgePacket,
  symbolMap: SymbolMap,
): SovereignPrompt {
  // 1. Get V4 base prompt
  const v4Prompt = buildSovereignPrompt_V4(packet, symbolMap);
  const v4Content = v4Prompt.sections[0]?.content ?? '';

  // 2. Get bridge directives for active features (Phase 1 or Phase 2)
  const bridge = new RosettaBridge();
  const activeFeatures = getActiveFeatures();
  const targetFeatures: Record<string, number> = {};
  for (const feat of activeFeatures) {
    targetFeatures[feat] = 1.0; // target = "maximize"
  }

  const bridgeResult = bridge.translate({
    target_features: targetFeatures,
    archetype: 'BALANCED',
    language: packet.language,
  });

  // 3. Build bridge constraint block
  const bridgeLines = [
    `Contraintes Rosetta Bridge (${bridgeResult.total_injectable} features pilotees, compliance attendue ${Math.round(bridgeResult.expected_compliance * 100)}%) :`,
  ];

  for (const directive of bridgeResult.prompt_directives) {
    if (directive.instruction) {
      bridgeLines.push(`- ${directive.name} : ${directive.instruction}`);
    }
  }

  // Add FR-specific L37 subordination if French
  if (packet.language === 'fr') {
    bridgeLines.push('');
    bridgeLines.push('Langue — FR natif :');
    bridgeLines.push("Ecris directement en francais natif. Pas de calques syntaxiques anglais.");
    bridgeLines.push("Subordination profonde : chaque paragraphe contient au moins une periode de 3+ subordonnees enchassees. C'est la marque de la prose francaise de maitre.");
  }

  const bridgeBlock = bridgeLines.join('\n');

  // 4. Replace V4 Rosetta constraints with bridge-generated constraints
  // V4 bloc 10 starts with "Contraintes mecaniques (calibrees sur 450 tests)"
  const v4RosettaMarker = 'Contraintes m\u00e9caniques (calibr\u00e9es sur 450 tests)';
  const markerIndex = v4Content.indexOf(v4RosettaMarker);

  let v5Content: string;
  if (markerIndex >= 0) {
    // Find the end of the block (next double newline or end of string)
    const blockEnd = v4Content.indexOf('\n\n', markerIndex);
    if (blockEnd >= 0) {
      v5Content = v4Content.slice(0, markerIndex) + bridgeBlock + v4Content.slice(blockEnd);
    } else {
      v5Content = v4Content.slice(0, markerIndex) + bridgeBlock;
    }
  } else {
    // Fallback: append bridge block
    console.warn('[V5] Could not find V4 Rosetta block — appending bridge directives');
    v5Content = v4Content + '\n\n' + bridgeBlock;
  }

  // 5. Rebuild prompt with V5 metadata
  const prompt_hash = sha256(canonicalize({ version: PROMPT_ASSEMBLER_V5_VERSION, content: v5Content }));

  return {
    sections: [{
      section_id: 'v5_bridge',
      title: 'PROMPT V5 (BRIDGE)',
      content: v5Content,
      priority: 'critical',
    }],
    total_length: v5Content.length,
    prompt_hash,
  };
}
