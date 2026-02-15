/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — PROMPT ASSEMBLER V2
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: input/prompt-assembler-v2.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Builds sovereign prompt from ForgePacket.
 * 12 fixed sections, hierarchical priority.
 *
 * PROMPT STRUCTURE:
 * 1. [CRITICAL] Mission statement + quality tier
 * 2. [CRITICAL] Emotion contract (14D trajectory, quartiles, rupture)
 * 3. [CRITICAL] Beats (narrative structure)
 * 4. [HIGH] Style genome (rhythm, lexicon, imagery)
 * 5. [HIGH] Kill lists (banned patterns)
 * 6. [HIGH] Sensory targets
 * 7. [MEDIUM] Canon constraints
 * 8. [MEDIUM] Subtext layers
 * 9. [MEDIUM] Continuity
 * 10. [LOW] Seeds (LLM + determinism)
 * 11. [LOW] Intent (scene goal, POV, tense)
 * 12. [LOW] Generation metadata
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { sha256, canonicalize } from '@omega/canon-kernel';
import type { ForgePacket, SovereignPrompt, PromptSection } from '../types.js';
import type { SymbolMap } from '../symbol/symbol-map-types.js';
import { compilePhysicsSection } from '../constraints/constraint-compiler.js';
import type { ForgeEmotionBrief } from '@omega/omega-forge';
import { SOVEREIGN_CONFIG } from '../config.js';

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ASSEMBLER
// ═══════════════════════════════════════════════════════════════════════════════

export function buildSovereignPrompt(
  packet: ForgePacket,
  symbolMap?: SymbolMap,
  emotionBrief?: ForgeEmotionBrief,
): SovereignPrompt {
  const sections: PromptSection[] = [
    buildMissionSection(packet),
    buildEmotionContractSection(packet),
    buildBeatsSection(packet),
    buildStyleGenomeSection(packet),
    buildKillListsSection(packet),
    buildSensorySection(packet),
    buildCanonSection(packet),
    buildSubtextSection(packet),
    buildContinuitySection(packet),
    buildSeedsSection(packet),
    buildIntentSection(packet),
    buildGenerationSection(packet),
  ];

  // Add prescriptive sections for RCI + IFI floors
  sections.push(buildRhythmPrescriptionSection(packet));
  sections.push(buildCorporealAnchoringSection(packet));

  // PHYSICS (COMPILED) — inject if ForgeEmotionBrief provided
  if (emotionBrief) {
    const physicsConfig = {
      physics_prompt_budget_tokens: SOVEREIGN_CONFIG.PHYSICS_PROMPT_BUDGET_TOKENS,
      physics_prompt_tokenizer_id: SOVEREIGN_CONFIG.PHYSICS_PROMPT_TOKENIZER_ID,
      top_k_emotions: SOVEREIGN_CONFIG.PHYSICS_TOP_K_EMOTIONS,
      top_k_transitions: SOVEREIGN_CONFIG.PHYSICS_TOP_K_TRANSITIONS,
      top_k_prescriptions: SOVEREIGN_CONFIG.PHYSICS_TOP_K_PRESCRIPTIONS,
    };

    const compiled = compilePhysicsSection(emotionBrief, physicsConfig);

    sections.push({
      section_id: 'physics_compiled',
      title: 'PHYSICS (COMPILED)',
      content: compiled.text,
      priority: 'critical',
    });
  }

  // Add Symbol Map sections if provided
  if (symbolMap) {
    sections.push(buildSymbolMapSection(symbolMap));
    sections.push(buildForbiddenMovesSection(symbolMap));
  }

  const total_length = sections.reduce((sum, s) => sum + s.content.length, 0);
  const prompt_hash = sha256(canonicalize(sections));

  return {
    sections,
    total_length,
    prompt_hash,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

function buildMissionSection(packet: ForgePacket): PromptSection {
  const content = `# OMEGA SOVEREIGN FORGE — MISSION

Quality Tier: ${packet.quality_tier.toUpperCase()}
Scene ID: ${packet.scene_id}
Run ID: ${packet.run_id}

YOU ARE THE SOVEREIGN STYLE ENGINE.
Your mission: Generate literary prose that meets 92/100 composite aesthetic score.

## LANGUE — ABSOLUE
**Écris EXCLUSIVEMENT en français littéraire premium.**
- Zéro mot anglais (sauf noms propres).
- Français précis, dense, addictif, sans clichés.
- Niveau : prix Goncourt / série Netflix premium.

## EXIGENCES
- 14D emotion trajectory MUST be followed with surgical precision
- All kill lists MUST be respected (zero tolerance for clichés)
- Style genome MUST be enforced (rhythm, lexicon, imagery)
- Sensory density MUST meet targets
- Canon constraints MUST be preserved

If you cannot meet these requirements, output WILL BE REJECTED.
Threshold: 92/100. No compromises. No excuses.
`;

  return {
    section_id: 'mission',
    title: 'Mission Statement',
    content,
    priority: 'critical',
  };
}

function buildEmotionContractSection(packet: ForgePacket): PromptSection {
  const ec = packet.emotion_contract;

  let content = `# EMOTION CONTRACT — 14D TRAJECTORY

This is your PRIMARY constraint. The prose MUST follow this emotional trajectory.

## Quartile Targets

`;

  for (const q of ec.curve_quartiles) {
    content += `### ${q.quartile} (${q.quartile === 'Q1' ? '0-25%' : q.quartile === 'Q2' ? '25-50%' : q.quartile === 'Q3' ? '50-75%' : '75-100%'})
Dominant Emotion: ${q.dominant}
Valence: ${q.valence.toFixed(3)} (${q.valence > 0 ? 'positive' : q.valence < 0 ? 'negative' : 'neutral'})
Arousal: ${q.arousal.toFixed(3)} (${q.arousal > 0.7 ? 'high' : q.arousal < 0.3 ? 'low' : 'medium'} intensity)
Instruction: ${q.narrative_instruction}

`;
  }

  content += `## Tension Structure

Slope: ${ec.tension.slope_target}
Pic (peak): ${(ec.tension.pic_position_pct * 100).toFixed(0)}% through scene
Faille (drop): ${(ec.tension.faille_position_pct * 100).toFixed(0)}% through scene
`;

  if (ec.tension.silence_zones.length > 0) {
    content += `\nSilence Zones (flat tension):\n`;
    for (const zone of ec.tension.silence_zones) {
      content += `- ${(zone.start_pct * 100).toFixed(0)}% to ${(zone.end_pct * 100).toFixed(0)}%\n`;
    }
  }

  if (ec.rupture.exists) {
    content += `\n## Rupture Event

Position: ${(ec.rupture.position_pct * 100).toFixed(0)}% through scene
Before: ${ec.rupture.before_dominant} (valence shift Δ${ec.rupture.delta_valence.toFixed(2)})
After: ${ec.rupture.after_dominant}
This is a MAJOR emotional pivot. Execute with precision.
`;
  }

  content += `\n## Terminal State

Final Emotion: ${ec.terminal_state.dominant}
Final Valence: ${ec.terminal_state.valence.toFixed(3)}
Final Arousal: ${ec.terminal_state.arousal.toFixed(3)}
Reader State: ${ec.terminal_state.reader_state}

## Valence Arc

Direction: ${ec.valence_arc.direction}
Start: ${ec.valence_arc.start.toFixed(3)} → End: ${ec.valence_arc.end.toFixed(3)}
`;

  return {
    section_id: 'emotion_contract',
    title: 'Emotion Contract',
    content,
    priority: 'critical',
  };
}

function buildBeatsSection(packet: ForgePacket): PromptSection {
  let content = `# NARRATIVE BEATS

These are the structural beats you MUST include. Do not skip. Do not reorder.

`;

  for (const beat of packet.beats) {
    content += `## Beat ${beat.beat_order + 1}: ${beat.beat_id}

Action: ${beat.action}
Subtext Type: ${beat.subtext_type}
`;

    if (beat.canon_refs.length > 0) {
      content += `Canon Refs: ${beat.canon_refs.join(', ')}\n`;
    }

    if (beat.sensory_tags.length > 0) {
      content += `Sensory Tags: ${beat.sensory_tags.join(', ')}\n`;
    }

    content += '\n';
  }

  return {
    section_id: 'beats',
    title: 'Narrative Beats',
    content,
    priority: 'critical',
  };
}

function buildStyleGenomeSection(packet: ForgePacket): PromptSection {
  const sg = packet.style_genome;

  const content = `# STYLE GENOME

## Lexicon

Signature Words (MUST use): ${sg.lexicon.signature_words.slice(0, 20).join(', ')}${sg.lexicon.signature_words.length > 20 ? '...' : ''}
Forbidden Words (NEVER use): ${sg.lexicon.forbidden_words.slice(0, 20).join(', ')}${sg.lexicon.forbidden_words.length > 20 ? '...' : ''}
Max Abstraction Ratio: ${(sg.lexicon.abstraction_max_ratio * 100).toFixed(0)}%
Min Concrete Ratio: ${(sg.lexicon.concrete_min_ratio * 100).toFixed(0)}%

## Rhythm

Target Sentence Length: ${sg.rhythm.avg_sentence_length_target} words
Target Gini: ${sg.rhythm.gini_target} (variety coefficient)
Max Consecutive Similar: ${sg.rhythm.max_consecutive_similar}
Min Syncopes per Scene: ${sg.rhythm.min_syncopes_per_scene}
Min Compressions per Scene: ${sg.rhythm.min_compressions_per_scene}

## Tone

Dominant Register: ${sg.tone.dominant_register}
Intensity Range: [${sg.tone.intensity_range[0]}, ${sg.tone.intensity_range[1]}]

## Imagery

Recurrent Motifs: ${sg.imagery.recurrent_motifs.join(', ')}
Density Target: ${sg.imagery.density_target_per_100_words} sensory markers per 100 words
Banned Metaphors: ${sg.imagery.banned_metaphors.join(', ')}
`;

  return {
    section_id: 'style_genome',
    title: 'Style Genome',
    content,
    priority: 'high',
  };
}

function buildKillListsSection(packet: ForgePacket): PromptSection {
  const kl = packet.kill_lists;

  const content = `# KILL LISTS — ZERO TOLERANCE

## Banned Clichés (${kl.banned_cliches.length} patterns)

${kl.banned_cliches.slice(0, 30).join('\n')}
${kl.banned_cliches.length > 30 ? `... and ${kl.banned_cliches.length - 30} more` : ''}

## Banned AI Patterns (${kl.banned_ai_patterns.length} patterns)

${kl.banned_ai_patterns.slice(0, 20).join('\n')}
${kl.banned_ai_patterns.length > 20 ? `... and ${kl.banned_ai_patterns.length - 20} more` : ''}

## Banned Filter Words (${kl.banned_filter_words.length} patterns)

${kl.banned_filter_words.slice(0, 20).join('\n')}
${kl.banned_filter_words.length > 20 ? `... and ${kl.banned_filter_words.length - 20} more` : ''}

ANY MATCH = INSTANT REJECTION. Show, don't tell. No meta-narrative. No hedging.
`;

  return {
    section_id: 'kill_lists',
    title: 'Kill Lists',
    content,
    priority: 'high',
  };
}

function buildSensorySection(packet: ForgePacket): PromptSection {
  const sensory = packet.sensory;

  let content = `# SENSORY TARGETS

Density Target: ${sensory.density_target} markers per 100 words

## Category Minimums

`;

  for (const cat of sensory.categories) {
    content += `- ${cat.category}: min ${cat.min_count} per scene\n`;
  }

  if (sensory.recurrent_motifs.length > 0) {
    content += `\nRecurrent Motifs: ${sensory.recurrent_motifs.join(', ')}\n`;
  }

  content += `
## CONTRAT SENSORIEL — OBLIGATOIRE

1. Chaque paragraphe doit contenir au moins un détail sensoriel concret (son, odeur, texture, température, lumière) sans l'expliquer.
2. Respecte la distribution du quartile courant : suis le sensory_quota prescrit dans le SYMBOL MAP (dominants / secondaires).
3. Pas de liste de sensations : le détail sensoriel doit être attaché à une action ou une perception du personnage, jamais décoratif.
`;

  return {
    section_id: 'sensory',
    title: 'Sensory Targets',
    content,
    priority: 'high',
  };
}

function buildCanonSection(packet: ForgePacket): PromptSection {
  let content = `# CANON CONSTRAINTS

These are immutable facts about the story world. DO NOT VIOLATE.

`;

  for (const entry of packet.canon) {
    content += `- [${entry.id}] ${entry.statement}\n`;
  }

  if (packet.canon.length === 0) {
    content += '(No canon constraints for this scene)\n';
  }

  return {
    section_id: 'canon',
    title: 'Canon Constraints',
    content,
    priority: 'medium',
  };
}

function buildSubtextSection(packet: ForgePacket): PromptSection {
  const subtext = packet.subtext;

  let content = `# SUBTEXT LAYERS

Tension Type: ${subtext.tension_type}
Tension Intensity: ${subtext.tension_intensity}

`;

  for (const layer of subtext.layers) {
    content += `## Layer ${layer.layer_id}

Type: ${layer.type}
Statement: ${layer.statement}
Visibility: ${layer.visibility}

`;
  }

  return {
    section_id: 'subtext',
    title: 'Subtext Layers',
    content,
    priority: 'medium',
  };
}

function buildContinuitySection(packet: ForgePacket): PromptSection {
  const cont = packet.continuity;

  let content = `# CONTINUITY

Previous Scene: ${cont.previous_scene_summary}

## Character States

`;

  for (const char of cont.character_states) {
    content += `### ${char.character_name}
- Emotional: ${char.emotional_state}
- Physical: ${char.physical_state}
- Location: ${char.location}

`;
  }

  if (cont.open_threads.length > 0) {
    content += `## Open Threads\n\n`;
    for (const thread of cont.open_threads) {
      content += `- ${thread}\n`;
    }
  }

  return {
    section_id: 'continuity',
    title: 'Continuity',
    content,
    priority: 'medium',
  };
}

function buildSeedsSection(packet: ForgePacket): PromptSection {
  const seeds = packet.seeds;

  const content = `# SEEDS

LLM Seed: ${seeds.llm_seed}
Determinism Level: ${seeds.determinism_level}
`;

  return {
    section_id: 'seeds',
    title: 'Seeds',
    content,
    priority: 'low',
  };
}

function buildIntentSection(packet: ForgePacket): PromptSection {
  const intent = packet.intent;

  const content = `# INTENT

Story Goal: ${intent.story_goal}
Scene Goal: ${intent.scene_goal}
Conflict Type: ${intent.conflict_type}
POV: ${intent.pov}
Tense: ${intent.tense}
Target Word Count: ${intent.target_word_count}
`;

  return {
    section_id: 'intent',
    title: 'Intent',
    content,
    priority: 'low',
  };
}

function buildGenerationSection(packet: ForgePacket): PromptSection {
  const gen = packet.generation;

  const content = `# GENERATION METADATA

Timestamp: ${gen.timestamp}
Generator Version: ${gen.generator_version}
Constraints Hash: ${gen.constraints_hash}
`;

  return {
    section_id: 'generation',
    title: 'Generation Metadata',
    content,
    priority: 'low',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESCRIPTIVE SECTIONS — RCI + IFI BOOST
// ═══════════════════════════════════════════════════════════════════════════════

function buildRhythmPrescriptionSection(packet: ForgePacket): PromptSection {
  const sg = packet.style_genome;
  const targetLen = sg.rhythm.avg_sentence_length_target;
  const shortMax = Math.max(5, Math.floor(targetLen * 0.35));
  const longMin = Math.max(20, Math.ceil(targetLen * 1.4));

  const content = `# RHYTHM PRESCRIPTION — MANDATORY

Your prose WILL BE SCORED on rhythmic quality. Follow these rules:

## Sentence Length Variation
- VARY sentence lengths dramatically. This is NOT optional.
- Include at least 3 SHORT sentences (${shortMax} words or fewer) per scene.
- Include at least 2 LONG flowing sentences (${longMin}+ words) per scene.
- NEVER write 3 consecutive sentences of similar length (within 5 words of each other).

## Rhythm Breaks (Syncopes)
- At least 2 times in the scene: follow a long sentence (20+ words) with a very short one (5 words or fewer).
- Exemple : "Les ombres s'étiraient sur les pierres anciennes tandis que le vent portait les murmures de prières oubliées à travers la nef déserte de la cathédrale. Elle s'arrêta. L'air changea."

## Sentence Openings
- NEVER start more than 2 sentences with the same word in any paragraph.
- Vary grammatical structures: start some sentences with a verb, some with a noun, some with a prepositional phrase, some with a subordinate clause.

## Compression Moments
- Include at least 1 ultra-short sentence (3 words or fewer) at a moment of emotional intensity.
- Elles créent l'impact par la brièveté : "Du sang. Rien d'autre." ou "Elle savait."

## Breathing Spaces
- Include at least 1 long, flowing sentence (30+ words) that creates a "breathing space" — a moment of contemplation or description that slows the pace.

FAILURE TO FOLLOW THESE RULES = REJECTION.
`;

  return {
    section_id: 'rhythm_prescription',
    title: 'Rhythm Prescription',
    content,
    priority: 'high',
  };
}

function buildCorporealAnchoringSection(_packet: ForgePacket): PromptSection {
  const content = `# CORPOREAL ANCHORING — MANDATORY

Your prose WILL BE SCORED on physical/sensory incarnation. Follow these rules:

## Body in Every Emotion
- Every emotional moment MUST be grounded in the body.
- N'écris PAS "elle avait peur." Écris "sa gorge se serra, ses doigts se refermèrent sur ses paumes."
- N'écris PAS "il était triste." Écris "le poids s'installa dans sa poitrine, pesant sur ses côtes."

## Marqueurs physiques obligatoires (minimum 5 par scène)
Utilise au moins 5 de ces ancrages corporels :
- Souffle / respiration (saccadée, retenue, rauque, lente)
- Mains / doigts / prise / paumes
- Gorge / déglutition / qualité de la voix
- Poitrine / côtes / battement de cœur / pouls
- Peau / température / sueur / frisson / chair de poule
- Ventre / estomac / nausée / faim
- Mâchoire / dents / crispation
- Épaules / nuque / colonne / posture
- Tension musculaire / tremblement / immobilité
- Yeux / regard / larmes / clignement

## Densité sensorielle
- Engage au moins 3 sens différents par scène (vue + son + toucher minimum).
- L'odorat et la température sont puissants — utilise au moins un de chaque quand c'est pertinent.
- Sois précis : pas "un bruit" mais "le raclement du métal sur la pierre."

## Distribution
- Répartis les marqueurs corporels dans toute la scène, pas regroupés dans un seul paragraphe.
- Chaque quartile du texte doit contenir au moins 1 sensation physique.

FAILURE TO INCARNATE = REJECTION.
`;

  return {
    section_id: 'corporeal_anchoring',
    title: 'Corporeal Anchoring',
    content,
    priority: 'high',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYMBOL MAP SECTIONS (v3)
// ═══════════════════════════════════════════════════════════════════════════════

function buildSymbolMapSection(symbolMap: SymbolMap): PromptSection {
  let content = '# SYMBOL MAP — CARTOGRAPHIE SYMBOLIQUE\n\n';
  content += `Commandement: ${symbolMap.global.one_line_commandment}\n\n`;

  for (const q of symbolMap.quartiles) {
    content += `## ${q.quartile}\n`;
    content += `Champs lexicaux: ${q.lexical_fields.join(', ')}\n`;
    content += `Imagery: ${q.imagery_modes.join(', ')}\n`;
    content += `Sensory quota: vue=${q.sensory_quota.vue}, son=${q.sensory_quota.son}, `;
    content += `toucher=${q.sensory_quota.toucher}, odeur=${q.sensory_quota.odeur}, `;
    content += `température=${q.sensory_quota.temperature}\n`;
    content += `Syntax: short_ratio=${q.syntax_profile.short_ratio}, `;
    content += `avg_len=${q.syntax_profile.avg_len_target}, `;
    content += `style=${q.syntax_profile.punctuation_style}\n`;
    content += `Intérieurité: ${q.interiority_ratio}\n`;
    if (q.signature_hooks.length > 0) content += `Hooks signature: ${q.signature_hooks.join(', ')}\n`;
    if (q.taboos.length > 0) content += `Tabous: ${q.taboos.join(', ')}\n`;
    content += '\n';
  }

  return { section_id: 'symbol_map', title: 'SYMBOL MAP', content, priority: 'critical' };
}

function buildForbiddenMovesSection(symbolMap: SymbolMap): PromptSection {
  let content = '# FORBIDDEN MOVES — MOUVEMENTS INTERDITS\n\n';
  content += symbolMap.global.forbidden_moves.map((m) => `- ${m}`).join('\n');
  content += '\n\n# ANTI-CLICHÉ REPLACEMENTS\n\n';
  content += symbolMap.global.anti_cliche_replacements.map((r) => `- "${r.cliche}" → "${r.replacement}"`).join('\n');

  return { section_id: 'forbidden_moves', title: 'FORBIDDEN MOVES', content, priority: 'high' };
}
