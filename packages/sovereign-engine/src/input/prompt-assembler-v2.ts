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

/** U-ROSETTE-01: version bump — VOICE COMPLIANCE recalibré Camus-adjacent (0.15,0.12) + F31/F33 instructions */
export const PROMPT_ASSEMBLER_VERSION = '2.5.0';
import type { SymbolMap } from '../symbol/symbol-map-types.js';
import { compilePhysicsSection } from '../constraints/constraint-compiler.js';
import type { ForgeEmotionBrief } from '@omega/omega-forge';
import { SOVEREIGN_CONFIG } from '../config.js';
import { getLot1AsPromptBlock } from '../prose-directive/lot1-instructions.js';
import { getLot2AsPromptBlock } from '../prose-directive/lot2-instructions.js';
import { getLot3AsPromptBlock } from '../prose-directive/lot3-instructions.js';

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ASSEMBLER
// ═══════════════════════════════════════════════════════════════════════════════

export function buildSovereignPrompt(
  packet: ForgePacket,
  symbolMap?: SymbolMap,
  emotionBrief?: ForgeEmotionBrief,
): SovereignPrompt {
  const sections: PromptSection[] = [
    buildNarrativeHookSection(packet),  // U-HOOK-01: CRITIQUE — première section, primeé sur tout
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

  // LOT 1 — PDB instructions (W1)
  sections.push(buildLot1InstructionsSection());

  // LOT 2 — PDB instructions (W2)
  sections.push(buildLot2InstructionsSection());

  // LOT 3 — PDB instructions (W3a — Genesis v2)
  sections.push(buildLot3InstructionsSection());

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

  // U-META-03: METAPHOR_PREGENERATION — avant FINAL_CHECKLIST
  // Force le LLM à pré-générer des métaphores AVANT la prose (paradigme Gemini sans appel supplémentaire)
  sections.push(buildMetaphorPregenerationSection(packet));

  // U-VOICE-06: VOICE COMPLIANCE — règles métriques mesurables (ellipsis_rate + opening_variety)
  // Positionnée avant FINAL_CHECKLIST pour recency effect maximum
  sections.push(buildVoiceComplianceSection());

  // U-HOOK-04: FINAL_CHECKLIST — DERNIÈRE section (recency effect maximisé)
  // Positionnée après tout le reste pour que le LLM la lise en dernier avant génération
  sections.push(buildFinalChecklistSection(packet));

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

// ── U-HOOK-01: NARRATIVE HOOK ────────────────────────────────────────────────

function buildNarrativeHookSection(packet: ForgePacket): PromptSection {
  const conflict    = packet.intent.conflict_type;       // ex: 'external', 'internal', 'relational'
  const sceneGoal   = packet.intent.scene_goal;          // ex: 'Claire découvre que la maison est surveillée'
  const tensionType = packet.subtext.tension_type;       // ex: 'suspense', 'attente', 'révélation'
  const firstLayer  = packet.subtext.layers[0];          // premier subtext layer
  const implied     = firstLayer?.statement ?? sceneGoal;

  const content =
`# NARRATIVE HOOK — OUVERTURE OBLIGATOIRE (CRITIQUE)

## Loi d'ouverture (IN MEDIA RES)
La **première phrase** doit ancrer immédiatement une tension IMPLICITE liée au conflit : "${sceneGoal}".

## Conflit source
- Type : ${conflict}
- Tension narrative : ${tensionType}
- Enjeu implicite : ${implied}

## Règles ABSOLUES d'ouverture
❌ **INTERDIT** : Début descriptif neutre, météo, atmosphère sans friction, résumé de situation.
✅ **REQUIS** : Action en cours, détail physique saillant, ou rupture de ton qui happe le lecteur.
✅ **REQUIS** : La tension doit être RESSENTIE, jamais expliquée. Montre, n'annonce pas.

## Exemples de structure valide
- Commencer par un geste concret sous tension : [personnage fait X pendant que X est vrai]
- Commencer par une sensation physique qui porte le conflit : [corps révèle ce que l'esprit cache]
- Commencer par une rupture de registre : [phrase courte, saccadée, étonnante]

## Exemples de structure INVALIDE
- "La nuit tombait sur..." → REJET
- "C'était un soir de..." → REJET  
- "Il faisait [temps]..." → REJET
- "Elle se souvint que..." (explication) → REJET

VIOLATION DE CETTE SECTION = HOOK_PRESENCE ≤ 40 = REJET DU TEXTE ENTIER.
`;

  return {
    section_id: 'narrative_hook',
    title: 'NARRATIVE HOOK (IN MEDIA RES)',
    content,
    priority: 'critical',
  };
}

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

  let content = `# STYLE GENOME

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

## Mots-clés OBLIGATOIRES (hook_presence)

Tu DOIS utiliser ces mots dans le texte — minimum 10 sur 13 présents dans le texte final.
Le scorer vérifiera leur présence littérale. Chaque mot absent = pénalité directe sur RCI.

Mots-clés obligatoires: ${[...sg.lexicon.signature_words, ...sg.imagery.recurrent_motifs].join(', ')}

Adapte leur usage naturellement au registre de la scène. Mais ils DOIVENT apparaître.

## Métaphores ORIGINALES (metaphor_novelty)

❌ INTERDIT : Métaphores connues, clichés visuels, comparaisons attendues.
✅ Règle cardinale : **zéro métaphore vaut mieux qu’une métaphore clichée**.
✅ Si tu utilises une métaphore : 1–2 maximum par scène, jamais en ouverture, jamais dans les marqueurs corporels.
✅ Test : demande-toi « ai-je lu cette image dans un roman grand public ?» — si oui, supprime-la.

Exemples de métaphores ORIGINALES (niveau cible) :
- "ses mots avaient la texture du papier de verre sur bois vert"
- "le silence était une dette qu'aucun des deux ne voulait rembourser"
- "il rangea sa colère comme on plie un manteau mouillé"

Exemples de métaphores INTERDITES (clichés) :
- "son cœur s'emballa", "un frisson la parcourut", "le temps s'arrêta"
- Tout ce qui figure dans la Kill List ci-dessus

## Imagerie

Motifs récurrents: ${sg.imagery.recurrent_motifs.join(', ')}
Densité cible: ${sg.imagery.density_target_per_100_words} marqueurs sensoriels par 100 mots
Métaphores interdites: ${sg.imagery.banned_metaphors.join(', ')}
`;

  // ═══ VOICE GENOME TARGET (10 parametres) ═══
  if (sg.voice) {
    const vg = sg.voice;
    content += `\n## Voice Genome Target (10 paramètres — PRIORITÉ HIGH)

Ces 10 paramètres QUANTITATIFS définissent la voix narrative cible.
Chaque paramètre est normalisé [0, 1]. Le scorer mesurera le drift entre votre prose et ces cibles.
Tolérance : ±10% par paramètre. Au-delà = pénalité RCI directe.

| Paramètre | Cible | Instruction |
|-----------|-------|-------------|
| Longueur phrase | ${vg.phrase_length_mean.toFixed(2)} | ${describePhraseLength(vg.phrase_length_mean)} |
| Ratio dialogue | ${vg.dialogue_ratio.toFixed(2)} | ${describeDialogueRatio(vg.dialogue_ratio)} |
| Densité métaphore | ${vg.metaphor_density.toFixed(2)} | ${describeMetaphorDensity(vg.metaphor_density)} |
| Registre langue | ${vg.language_register.toFixed(2)} | ${describeRegister(vg.language_register)} |
| Niveau ironie | ${vg.irony_level.toFixed(2)} | ${describeIrony(vg.irony_level)} |
| Taux ellipse | ${vg.ellipsis_rate.toFixed(2)} | ${describeEllipsis(vg.ellipsis_rate)} |
| Ratio abstraction | ${vg.abstraction_ratio.toFixed(2)} | ${describeAbstraction(vg.abstraction_ratio)} |
| Style ponctuation | ${vg.punctuation_style.toFixed(2)} | ${describePunctuation(vg.punctuation_style)} |
| Rythme paragraphe | ${vg.paragraph_rhythm.toFixed(2)} | ${describeParagraphRhythm(vg.paragraph_rhythm)} |
| Variété ouverture | ${vg.opening_variety.toFixed(2)} | ${describeOpeningVariety(vg.opening_variety)} |

RÈGLE : Ces valeurs sont des CIBLES MESURABLES. Le scorer calculera le drift euclidien.
Un drift global > 0.10 = voice_conformity < 85 = RCI plafonne.
`;
  }

  return {
    section_id: 'style_genome',
    title: 'Style Genome',
    content,
    priority: 'high',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE GENOME DESCRIPTORS — Numeric → Actionable instruction
// ═══════════════════════════════════════════════════════════════════════════════

function describePhraseLength(v: number): string {
  if (v < 0.25) return 'Phrases très courtes (~5-12 mots). Style haché, percutant.';
  if (v < 0.50) return 'Phrases courtes à moyennes (~12-20 mots). Fluide mais concis.';
  if (v < 0.75) return 'Phrases moyennes à longues (~20-30 mots). Développées, respiration ample.';
  return 'Phrases longues (~30-40+ mots). Proustien, cascades syntaxiques.';
}

function describeDialogueRatio(v: number): string {
  if (v < 0.15) return 'Quasi aucun dialogue. Narration pure, intériorité.';
  if (v < 0.35) return 'Peu de dialogue (~20-30%). La narration domine.';
  if (v < 0.55) return 'Dialogue équilibré (~35-50%). Alternance narration/échange.';
  return 'Dialogue dominant (>50%). Théâtralité, échanges vifs.';
}

function describeMetaphorDensity(v: number): string {
  if (v < 0.25) return 'Peu de métaphores. Style sobre, factuel.';
  if (v < 0.50) return 'Métaphores modérées. Comme/tel sporadiques, images précises.';
  if (v < 0.75) return 'Métaphores fréquentes. Imagerie riche, comparaisons développées.';
  return 'Métaphores denses. Presque chaque phrase porte une image.';
}

function describeRegister(v: number): string {
  if (v < 0.25) return 'Registre familier/parlé. Oralité, expressions courantes.';
  if (v < 0.50) return 'Registre courant. Accessible, fluide, standard.';
  if (v < 0.75) return 'Registre soutenu. Vocabulaire riche, tournures élégantes.';
  return 'Registre littéraire. Lexique rare, syntaxe complexe, Goncourt.';
}

function describeIrony(v: number): string {
  if (v < 0.15) return 'Aucune ironie. Ton sincère, direct.';
  if (v < 0.35) return 'Ironie discrète. Sous-entendu occasionnel.';
  if (v < 0.60) return 'Ironie modérée. Décalage régulier, second degré.';
  return 'Ironie marquée. Distance constante, ton caustique.';
}

function describeEllipsis(v: number): string {
  if (v < 0.20) return 'Phrases complètes. Syntaxe grammaticalement pleine.';
  if (v < 0.45) return 'Ellipses modérées. Quelques fragments stylistiques.';
  return 'Ellipses fréquentes. Fragments, phrases nominales, non-dits.';
}

function describeAbstraction(v: number): string {
  if (v < 0.25) return 'Très concret. Objets, corps, sensations.';
  if (v < 0.50) return 'Équilibré concret/abstrait. Ancrage sensoriel + réflexion.';
  if (v < 0.75) return 'Tendance abstraite. Concepts, états intérieurs, généralisation.';
  return 'Très abstrait. Philosophique, conceptuel, désincarné.';
}

function describePunctuation(v: number): string {
  if (v < 0.25) return 'Ponctuation minimale. Points et virgules principalement.';
  if (v < 0.50) return 'Ponctuation standard. Variée mais sobre.';
  if (v < 0.75) return 'Ponctuation expressive. Points-virgules, tirets, points de suspension.';
  return 'Ponctuation très expressive. Tirets longs, suspensions, exclamations.';
}

function describeParagraphRhythm(v: number): string {
  if (v < 0.30) return 'Paragraphes uniformes. Longueur constante, régulier.';
  if (v < 0.60) return 'Rythme modéré. Alternance courts/longs occasionnelle.';
  return 'Rythme très varié. Courts percutants + longs contemplatifs.';
}

function describeOpeningVariety(v: number): string {
  if (v < 0.30) return 'Ouvertures répétitives tolérées. Même structure autorisée.';
  if (v < 0.60) return 'Variété modérée. Alterner sujet/verbe/complément/subordonnée.';
  return 'Haute variété. CHAQUE phrase doit commencer différemment.';
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

## Distribution des longueurs de phrase (CV cible ≥ 0.75)
Ton texte sera NOTÉ sur le coefficient de variation (CV) des longueurs de phrases.
CV optimal = 0.75. En dessous de 0.55 = score rythme < 80.

Règle de distribution OBLIGATOIRE :
- **25% des phrases ≤ 5 mots** : fragments, coups de poing narratifs, éclairs de conscience.
- **25% des phrases ≥ 28 mots** : développements lents, descriptions distillées, respirations.
- **50% des phrases** : longueur médiane 14-20 mots (fluence narrative).

Pour une scène de ~30 phrases : ~8 très courtes + ~8 très longues + ~14 moyennes.

Exemple de bonne alternance :
"Elle s'arrêta. [3 mots] — L'air avait changé, quelque chose de différent dans la densité des ombres qui pesaient sous les poutres du couloir. [28 mots] — Du sang. [2 mots] — Ou peut-être rien, juste l'odeur du bois mouillé et la façon dont la lumière refusait d'entrer. [23 mots]"

## Ruptures rythmiques (syncopes)
- Après chaque longue phrase (≥25 mots) : enchaîne au moins une fois avec une phrase de ≤4 mots.
- Minimum 3 syncopes par scène.

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
Utilise au moins 5 de ces ancrages corporels. **ATTENTION : la MANIÈRE d'exprimer ces ancrages doit être originale — pas le raccourci cliché.**

- Souffle / respiration (saccadée, rauque, lente) — ❌ JAMAIS "elle retint son souffle" / "souffle court" (kill list)
- Mains / doigts / prise / paumes
- Gorge / qualité de la voix — ❌ JAMAIS "il déglutit" / "gorge nouée" (kill list)
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

// ═══════════════════════════════════════════════════════════════════════════════
// LOT 1 — PDB INSTRUCTIONS (W1)
// ═══════════════════════════════════════════════════════════════════════════════

function buildLot1InstructionsSection(): PromptSection {
  const block = getLot1AsPromptBlock();
  const content = `# PROSE DIRECTIVE — LOT 1 (PDB INSTRUCTIONS)\n\n${block}\n\nCOMPLIANCE IS MANDATORY. NONCOMPLIANCE = REJECTION.\n`;

  return {
    section_id: 'lot1_pdb_instructions',
    title: 'LOT 1 — PDB Instructions',
    content,
    priority: 'high',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOT 2 — PDB INSTRUCTIONS (W2)
// ═══════════════════════════════════════════════════════════════════════════════

function buildLot2InstructionsSection(): PromptSection {
  const block = getLot2AsPromptBlock();
  const content = `# PROSE DIRECTIVE — LOT 2 (PDB INSTRUCTIONS)\n\n${block}\n\nCOMPLIANCE IS MANDATORY. NONCOMPLIANCE = REJECTION.\n`;

  return {
    section_id: 'lot2_pdb_instructions',
    title: 'LOT 2 — PDB Instructions',
    content,
    priority: 'high',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOT 3 — PDB INSTRUCTIONS (W3a — Genesis v2)
// ═══════════════════════════════════════════════════════════════════════════════

function buildLot3InstructionsSection(): PromptSection {
  const block = getLot3AsPromptBlock();
  const content = `# PROSE DIRECTIVE — LOT 3 (PDB INSTRUCTIONS — GENESIS V2)\n\n${block}\n\nCOMPLIANCE IS MANDATORY. NONCOMPLIANCE = REJECTION.\n`;

  return {
    section_id: 'lot3_pdb_instructions',
    title: 'LOT 3 — PDB Instructions (Genesis v2)',
    content,
    priority: 'high',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// U-ROSETTE-01 — VOICE COMPLIANCE recalibré Camus-adjacent (0.15, 0.12)
// Injecte 3 règles métriques mesurables directement liées aux paramètres voix scorés :
//   ellipsis_rate  : % phrases ≤1 mots dans la prose générée (cible 0.50, LLM bench ≈0.20)
//   opening_variety: % premiers mots uniques par phrase (cible 0.80, LLM bench ≈0.50)
//   paragraph_rhythm: CV longueurs paragraphes (cible 0.90, saturé à 1.0 = OK)
// Impact simulé : voice_conformity 74.6 → 91.3, RCI ≥85 : 12/30 → 26/30
// ═══════════════════════════════════════════════════════════════════════════════

function buildVoiceComplianceSection(): PromptSection {
  const content =
`# ⚠️ VOICE COMPLIANCE — CALIBRATION CAMUS-ADJACENT (U-ROSETTE-01)

Ces règles sont MESURÉES AUTOMATIQUEMENT par le scorer après génération.
Violation = voice_conformity < 80 = RCI < 85 = REJET DU TEXTE.

## POSITION CIBLE — ESPACE LATENT 2D

Ton texte doit se positionner dans la zone CAMUS-ADJACENT :
  AXE 1 (Expansion)   : cible <= 0.15 — phrases courtes (18-22 mots de moyenne)
  AXE 2 (Imbrication) : cible <= 0.12 — peu de subordonnées fracturées
  Camus  (0.1, 0.1) — REFERENCE ABSOLUE
  Proust (0.5, 0.9) — réservé aux injections ponctuelles (1 bloc/5)
  Simon  (1.0, 1.0) — INTERDIT comme style de base

══════════════════════════════════════════════════════════════

## RÈGLE 1 — SYNCOPES MÉTRIQUES [ellipsis_rate cible: 0.50]

Définition du scorer : phrase "courte" = STRICTEMENT MOINS DE 4 MOTS (1, 2 ou 3 mots).
Formule : syncopes / total_phrases. Le scorer mesure exactement ceci.

**MINIMUM IMPOSÉ : 40% de tes phrases doivent avoir 3 mots ou moins.**

Règle pratique selon longueur du texte :
- Texte de 20 phrases → minimum 8 syncopes
- Texte de 30 phrases → minimum 12 syncopes
- Texte de 40 phrases → minimum 16 syncopes

✅ Syncopes valides (comptent) :
- "Du sang." → 2 mots ✓
- "Elle savait." → 2 mots ✓
- "Rien à dire." → 3 mots ✓
- "Trop tard." → 2 mots ✓
- "Ses mains tremblaient." → 3 mots ✓
- "Silence." → 1 mot ✓
- "Il attendit." → 2 mots ✓

❌ Ne compte PAS comme syncope :
- "Elle ne bougea pas." → 4 mots ✗
- "Le froid s'installa." → 4 mots ✗  
- Toute phrase de 4 mots ou plus

Contrôle AVANT de soumettre : parcours ta prose, compte les phrases de ≤3 mots.
Si total < 40% → insère des syncopes aux moments d'intensité émotionnelle.

══════════════════════════════════════════════════════════════

## RÈGLE 2 — VARIÉTÉ DES OUVERTURES [opening_variety cible: 0.80]

Définition du scorer : premier mot de chaque phrase (minuscule, sans ponctuation).
Formule : mots_uniques_ouverture / total_phrases. Le scorer mesure exactement ceci.

**MINIMUM IMPOSÉ : 70% des premières phrases commencent par un mot unique (non répété).**

Pour un texte de 30 phrases : au plus 9 phrases peuvent partager un même premier mot.

❌ Interdiction absolue :
- 2 phrases CONSÉCUTIVES qui commencent par le même mot → REFORMULE L'UNE DES DEUX.
- "Elle", "Il", "Le", "La", "Les" apparaissant en ouverture plus de 4 fois dans 20 phrases.

✅ Techniques de diversification :
- Commencer par un verbe conjugué : "Surgit alors...", "Restait...", "Pesait..."
- Commencer par un compliment de lieu : "Au fond du couloir...", "Dans la pièce..."
- Commencer par un moment : "Quelques secondes...", "Très lentement..."
- Commencer par une syncope sans sujet : "Rien.", "Du sang.", "Silence."
- Commencer par un nom propre ou objet : "La porte...", "Ses mains...", "Le bruit..."
- Commencer par une proposition subordonnée : "Quand elle...", "Si le...", "Avant que..."

Contrôle AVANT de soumettre : liste les 10 premiers mots de tes premières phrases.
Si tu vois "Elle" 4+ fois → reformule au moins 2 occurrences.

══════════════════════════════════════════════════════════════

## RÈGLE 3 — RYTHME PARAGRAPHE [paragraph_rhythm cible: 0.90]

Définition du scorer : coefficient de variation (CV) des longueurs de paragraphes en mots.
Formule : écart-type(longueurs) / moyenne(longueurs). Le scorer mesure exactement ceci.

**MINIMUM IMPOSÉ : inclure OBLIGATOIREMENT au moins 1 paragraphe ultra-court et 1 long.**

✅ Structure de paragraphes valide (CV ≥0.90) :
- Paragraphe A : 8-12 mots (un coup de poing)
- Paragraphe B : 70-100 mots (développement long)
- Paragraphe C : 1-3 mots (syncope paragraphe — max impact)
- Paragraphe D : 50-80 mots (narratif normal)
- Paragraphe E : 10-20 mots (transition briève)

❌ Structure de paragraphes invalide (CV < 0.50) :
- 5 paragraphes de 35, 40, 38, 42, 36 mots → REJET (trop uniforme)

Règle minimale : au moins 1 paragraphe d'UNE SEULE PHRASE COURTE (≤4 mots).
Ex : Un paragraphe qui ne contient que "Elle savait." ou "Rien d'autre." → CV explosé.

══════════════════════════════════════════════════════════════

══════════════════════════════════════════════════════════════

## RÈGLE 4 — IMBRICATION FRACTALE (F32) — CIBLE CAMUS BAS [shadow mesuré]

Definition : % de tes phrases avec 2+ marqueurs subordonnants (qui, que, dont, ou, quand,
si, comme, parce que, bien que, puisque, lorsque, avant que, apres que...).

**CIBLE CAMUS : max 18% de tes phrases avec 2+ subordonnants.**

A eviter (Simon/Proust) : "Il savait que ce qu'elle voyait n'etait pas ce qu'elle
cherchait quand elle regardait." -> 4 marqueurs = imbrication extreme
A privilegier (Camus) : phrases simples + une seule subordonnante par phrase.
Regle pratique : quand une phrase devient longue, coupe-la en 2.

══════════════════════════════════════════════════════════════

## RÈGLE 5 — PARTICIPES PRÉSENTS (F31) — CIBLE CAMUS [0.8-1.6/100m]

**CIBLE CAMUS : 0.8 a 1.6 participes presents (-ant) pour 100 mots.**
Simon depasse 4.8 — flux continu. Camus reste sobre.
Max 2 participes presents consecutifs dans une meme phrase.

══════════════════════════════════════════════════════════════

## RÈGLE 6 — PARENTHÉTIQUES (F33) — CIBLE CAMUS [0.15-0.35/phrase]

**CIBLE CAMUS : 0.15 a 0.35 incises/parentheses par phrase.**
Proust atteint 2.5-4.0 — une insertion par phrase. Camus reste rare.
Max 1 incise par phrase.

══════════════════════════════════════════════════════════════

INJECTION PONCTUELLE AUTORISEE (1 bloc/5 blocs maximum) :
- Expansion Simon : 1 phrase-fleuve 80+ mots avec imbrication elevee
- Saturation Proust : 1 bloc dense 60+ mots avec images synesthesiques
Ces injections doivent etre suivies d'un retour Camus immediat (syncope + phrase courte).

⚠️ AUTO-VÉRIFICATION AVANT SOUMISSION :
1. Compte les phrases <= 3 mots -> minimum 40% du total
2. Pas 2 premiers mots identiques consecutifs
3. 1 paragraphe ultra-court (1-3 mots seuls) obligatoire
4. Moins de 20% de phrases avec 2+ subordonnants
5. Max 2 participes presents consecutifs dans une meme phrase

SCORER REJETTERA AUTOMATIQUEMENT si les 3 premieres metriques ne sont pas atteintes.
`;

  return {
    section_id: 'voice_compliance',
    title: 'VOICE COMPLIANCE (U-ROSETTE-01)',
    content,
    priority: 'critical',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// U-META-03 — METAPHOR PREGENERATION (avant FINAL_CHECKLIST)
// Force le LLM à pré-générer mentalement 3 métaphores candidates AVANT d'écrire la prose.
// Principe : découpage cognitif (paradigme Gemini) sans appel API supplémentaire.
// Impact visé : metaphor_novelty_score 71-79 → 85+ (juge LLM note +13 si l'image est transcendante)
// ═══════════════════════════════════════════════════════════════════════════════

function buildMetaphorPregenerationSection(packet: ForgePacket): PromptSection {
  const sceneGoal = packet.intent.scene_goal;
  const dominant = packet.emotion_contract.terminal_state.dominant;

  const content =
`# 🔬 METAPHOR PREGENERATION — ÉTAPE 0 AVANT D'ÉCRIRE (U-META-03)

Avant d'écrire le premier mot de la prose, effectue cette étape mentale.
Objectif : ton juge interne va noter tes métaphores 0-100. Tu vises 85+.

## PROCÉDURE (dans ta tête, pas dans la prose)

1. Génère mentalement **3 images candidates** pour cet objet narratif :
   - Objet : « ${sceneGoal} »
   - Émotion dominante à incarner : ${dominant}

2. Pour chaque candidate, applique le **test de l'arbre des domaines** :
   - Quelle **domaine source** (concret, scientifique, mécanique, nature, commerce, géométrie...) ?
   - Quel **domaine cible** (émotion, silence, temps, corps, relation...) ?
   - Les deux domaines sont-ils **inattendus** l'un par rapport à l'autre ?
   - As-tu déjà lu cette association dans un roman grand public ? Si oui → élimine.

3. **Garde uniquement** l'image qui passe le test. Si aucune ne passe → tu n'utilises PAS de métaphore.

## NIVEAU CIBLE (novelty_score ≥85)

Images qui atteignent 85+ :
- « sa colère avait le grain du papier de verre sur bois encore vert »
  (domaines : texture artisanale ↔ émotion brute inachevée)
- « le silence entre eux s'était déposé comme un limon après la crue »
  (domaines : sédimentation fluviale ↔ résidu de conflit)
- « elle rangea sa peur comme on replie un plan qu'on n'a plus l'usage de lire »
  (domaines : cartographie obsolète ↔ abandon d'un espoir)
- « ses mots avaient la texture d'une promesse déjà compteuse de son propre échec »
  (domaines : comptabilité fatale ↔ parole crevée en vol)

Images qui échouent (≤50) :
- « son cœur s'emballa », « la lumière mourait », « le poids de la culpabilité »
- Tout ce qui combine un organe + un verbe d'émotion directe
- Tout ce qui combine une lumière + un état

## LIMITE ABSOLUE
- **0 ou 1 métaphore** dans la prose finale (2 maximum si les deux passent le test).
- Une métaphore qui rate le test à 75+ de novelty = SII penalisé directement.
- Zéro métaphore vaut toujours mieux qu'une métaphore à 60.

⚠️ RAPPEL : Le juge est un LLM qui lit 10 000 romans. Il voit les clichés immédiatement.
`;

  return {
    section_id: 'metaphor_pregeneration',
    title: 'METAPHOR PREGENERATION (U-META-03)',
    content,
    priority: 'high',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// U-HOOK-04 — FINAL CHECKLIST (dernière section, recency effect)
// Compact, actionnable, lu JUSTE AVANT la génération — rappel des règles hautes-impact
// ═══════════════════════════════════════════════════════════════════════════════

function buildFinalChecklistSection(packet: ForgePacket): PromptSection {
  const keywords = [
    ...packet.style_genome.lexicon.signature_words.slice(0, 8),
    ...packet.style_genome.imagery.recurrent_motifs.slice(0, 5),
  ].join(', ');

  const sceneGoal = packet.intent.scene_goal;

  const content =
`# ⚠️ FINAL CHECKLIST — LIS CECI EN DERNIER AVANT D'ÉCRIRE

Tu t'apprêtes à générer la prose. La section METAPHOR PREGENERATION ci-dessus a été exécutée (tu as ta métaphore candidate ou décidé de ne pas en utiliser). Vérifie ces 6 points :

## 1. PREMIÈRE PHRASE (hook_presence = jusqu'à 40% du RCI)
❌ Si ta première phrase est descriptive, neutre, ou explicative → RECOMMENCE.
✅ Elle doit être : action en cours, sensation physique tendue, ou rupture de ton.
Objet : « ${sceneGoal} »

## 2. MOTS-CLÉS OBLIGATOIRES (hook_presence score direct)
Ces mots DOIVENT apparaître dans le texte — minimum 10 sur les 13 fournis :
${keywords}
Contrôle avant de terminer : parcours ta prose et coche chaque mot présent.

## 3. RYTHME (25% ≤5 mots / 25% ≥28 mots / 50% médian)
Après écriture : compte-tu bien des phrases ultra-courtes (2-4 mots) ET des longues (28-40 mots) ?
Exemple OBLIGATOIRE de syncope : [phrase longue de 28+ mots]. [2 mots]. [Reprise narrative.]

## 4. ZÉRO CLÉCHÉ CORPOREL (kill list active)
❌ JAMAIS : « elle retint son souffle » / « il déglutit » / « gorge nouée » / « souffle court »
✅ Ancre les émotions dans le corps avec des formulations ORIGINALES.

## 5. MÉTAPHORES : LA TUA DÉJÀ PRÉ-GÉNÉRÉE (section METAPHOR PREGENERATION)
❌ Si tu n'as pas appliqué l'étape 0 (test arbre des domaines) → RECOMMENCE.
❌ Plus de 2 métaphores dans la prose → supprime les plus faibles.
✅ L'image pré-générée : elle connecte deux domaines inattendus, elle ne figure dans aucun roman populaire.
✅ Si aucune image n'a passé le test → zéro métaphore, score SII reste haut.

## 6. DERNIÈRE PHRASE
Doit laisser le lecteur dans un état émotionnel, pas refermer la scène.
Ouverte, tendue, ou résonnante. Jamais conclusive.

---
⚠️ GÉNÈRE MAINTENANT. Le scoreur jugera. Aucune approximation tolérée.
`;

  return {
    section_id: 'final_checklist',
    title: 'FINAL CHECKLIST (pre-flight)',
    content,
    priority: 'critical',
  };
}
