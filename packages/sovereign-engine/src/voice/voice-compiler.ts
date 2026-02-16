/**
 * Voice Constraint Compiler — traduit VoiceGenome en instructions prompt FR
 * Invariant: ART-VOICE-02
 */

import type { VoiceGenome } from './voice-genome.js';

export interface VoiceInstruction {
  parameter: keyof VoiceGenome;
  target: number;
  instruction_fr: string;    // instruction concrète pour le LLM
  priority: 'critical' | 'high' | 'medium';
}

export function compileVoiceConstraints(
  genome: VoiceGenome,
  budget_tokens: number = 400
): {
  content: string;          // texte compilé pour injection dans le prompt
  token_count: number;
  instructions: VoiceInstruction[];
} {
  const instructions: VoiceInstruction[] = [];

  // Générer instructions pour chaque paramètre hors zone neutre [0.3, 0.7]
  generateInstruction(instructions, 'phrase_length_mean', genome.phrase_length_mean);
  generateInstruction(instructions, 'dialogue_ratio', genome.dialogue_ratio);
  generateInstruction(instructions, 'metaphor_density', genome.metaphor_density);
  generateInstruction(instructions, 'language_register', genome.language_register);
  generateInstruction(instructions, 'irony_level', genome.irony_level);
  generateInstruction(instructions, 'ellipsis_rate', genome.ellipsis_rate);
  generateInstruction(instructions, 'abstraction_ratio', genome.abstraction_ratio);
  generateInstruction(instructions, 'punctuation_style', genome.punctuation_style);
  generateInstruction(instructions, 'paragraph_rhythm', genome.paragraph_rhythm);
  generateInstruction(instructions, 'opening_variety', genome.opening_variety);

  // Trier par priorité (critical > high > medium)
  const priorityOrder = { critical: 0, high: 1, medium: 2 };
  instructions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Compiler le texte avec budget
  let content = '';
  let token_count = 0;
  const includedInstructions: VoiceInstruction[] = [];

  for (const instr of instructions) {
    const line = `- ${instr.instruction_fr}\n`;
    const estimatedTokens = estimateTokens(line);

    // Critical: toujours inclure (peuvent légèrement dépasser budget)
    if (instr.priority === 'critical') {
      content += line;
      token_count += estimatedTokens;
      includedInstructions.push(instr);
    }
    // High/Medium: inclure seulement si budget permet
    else if (token_count + estimatedTokens <= budget_tokens) {
      content += line;
      token_count += estimatedTokens;
      includedInstructions.push(instr);
    }
    // Sinon skip (high/medium + dépassement budget)
  }

  return {
    content: content.trim(),
    token_count,
    instructions: includedInstructions,
  };
}

function generateInstruction(
  instructions: VoiceInstruction[],
  parameter: keyof VoiceGenome,
  value: number
): void {
  if (value >= 0.3 && value <= 0.7) {
    // Zone neutre, pas d'instruction
    return;
  }

  const isLow = value < 0.3;
  const isHigh = value > 0.7;

  const instructionMap: Record<
    keyof VoiceGenome,
    { low?: string; high?: string; priority: 'critical' | 'high' | 'medium' }
  > = {
    phrase_length_mean: {
      low: 'Phrases courtes, max 10 mots. Rythme sec.',
      high: 'Phrases longues et sinueuses, 25+ mots, subordonnées.',
      priority: 'high',
    },
    dialogue_ratio: {
      low: 'Pas ou peu de dialogue. Narration pure.',
      high: 'Beaucoup de dialogue. Répliques fréquentes.',
      priority: 'medium',
    },
    metaphor_density: {
      low: 'Écriture littérale, pas de métaphores.',
      high: 'Métaphores riches et fréquentes, au moins 1 par paragraphe.',
      priority: 'high',
    },
    language_register: {
      low: 'Registre familier, vocabulaire simple.',
      high: 'Registre soutenu, vocabulaire recherché.',
      priority: 'critical',
    },
    irony_level: {
      low: 'Ton sincère, direct.',
      high: 'Ton ironique, distance, second degré.',
      priority: 'medium',
    },
    ellipsis_rate: {
      low: 'Phrases complètes, syntaxe classique.',
      high: 'Ellipses fréquentes. Phrases sans verbe. Fragments.',
      priority: 'high',
    },
    abstraction_ratio: {
      low: 'Concret uniquement. Objets, gestes, sensations.',
      high: 'Réflexions abstraites, pensées philosophiques.',
      priority: 'medium',
    },
    punctuation_style: {
      low: 'Ponctuation sobre : points, virgules.',
      high: 'Ponctuation expressive : exclamations, tirets, points de suspension.',
      priority: 'medium',
    },
    paragraph_rhythm: {
      low: 'Paragraphes de longueur régulière.',
      high: 'Alternance brutale : paragraphe long puis 1 phrase seule.',
      priority: 'high',
    },
    opening_variety: {
      low: 'Accepter quelques répétitions de structure.',
      high: 'Chaque phrase commence différemment. Jamais 2 débuts identiques.',
      priority: 'high',
    },
  };

  const config = instructionMap[parameter];
  if (!config) return;

  const instruction_fr = isLow ? config.low : config.high;
  if (!instruction_fr) return;

  instructions.push({
    parameter,
    target: value,
    instruction_fr,
    priority: config.priority,
  });
}

function estimateTokens(text: string): number {
  // Heuristique simple: ~4 caractères par token pour le français
  return Math.ceil(text.length / 4);
}
