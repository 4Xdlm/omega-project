/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — PROSE DIRECTIVE BUILDER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: validation/prose-directive-builder.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * CalibV4 — Transforms ForgePacket into structured prose directives.
 * Uses canonical Plutchik 14D mapping (FORGE_14) from emotion-adapter.ts.
 *
 * CORRECTION 1: DIM_LABELS = FORGE_14 canonical (not numbered indices).
 * Source: src/input/emotion-adapter.ts:40-44
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { sha256, canonicalize } from '@omega/canon-kernel';
import { FORGE_14 } from '../input/emotion-adapter.js';
import type { ForgePacket, EmotionQuartile } from '../types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type TensionLevel = 'NULLE' | 'LEGERE' | 'MODEREE' | 'FORTE' | 'INSOUTENABLE';

export interface QuartileDirective {
  readonly quartile: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  readonly label: string;
  readonly tension_level: TensionLevel;
  readonly dominant_emotion: string;
  readonly emotion_intensity: number;
  readonly instruction: string;
  readonly forbidden: readonly string[];
}

export interface ProseDirective {
  readonly scene_context: string;
  readonly structure: readonly [QuartileDirective, QuartileDirective, QuartileDirective, QuartileDirective];
  readonly necessity_rules: readonly string[];
  readonly vital_stakes: string | null;
  readonly style_constraints: readonly string[];
  readonly dominant_emotion: string;
  readonly prose_directive_hash: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION → INSTRUCTION MAPPING (Plutchik 14D canonical)
// ═══════════════════════════════════════════════════════════════════════════════

interface EmotionRule {
  readonly threshold: number;
  readonly instruction: string;
  readonly forbidden: readonly string[];
}

const EMOTION_INSTRUCTIONS: Readonly<Record<string, EmotionRule>> = {
  fear: {
    threshold: 0.7,
    instruction: "Insuffle une menace latente \u2014 le danger n'est pas nomm\u00e9 mais pr\u00e9sent dans chaque d\u00e9tail sensoriel. Le personnage per\u00e7oit avant de comprendre.",
    forbidden: ['expliquer la peur directement', 'adjectifs g\u00e9n\u00e9riques (terrible, horrible)'],
  },
  anticipation: {
    threshold: 0.7,
    instruction: "Chaque phrase doit rapprocher d'une cons\u00e9quence fatale. Phrases courtes. Le temps se contracte. L'irr\u00e9versible approche.",
    forbidden: ['descriptions de paysage sans enjeu', 'digressions int\u00e9rieures longues'],
  },
  sadness: {
    threshold: 0.6,
    instruction: "Ancre dans la perte irr\u00e9m\u00e9diable. Pas de larmes \u2014 des d\u00e9tails concrets qui r\u00e9v\u00e8lent ce qui manque. Le vide a une texture.",
    forbidden: ['pathos explicite', 'pleurer directement'],
  },
  anger: {
    threshold: 0.6,
    instruction: "Frustration retenue qui cherche \u00e0 \u00e9clater. Les verbes trahissent la tension. Les gestes sont brusques, les silences lourds.",
    forbidden: ['explosion directe avant Q3', 'calme inexplicqu\u00e9'],
  },
  love: {
    threshold: 0.6,
    instruction: "La tendresse transperce chaque geste. Montrer l'attachement par les actes, pas les mots.",
    forbidden: ['d\u00e9clarations directes', 'm\u00e9taphores us\u00e9es'],
  },
  disgust: {
    threshold: 0.6,
    instruction: "Le d\u00e9go\u00fbt se manifeste par les sensations physiques. Naus\u00e9e, recul, textures r\u00e9pulsives.",
    forbidden: ['jugements moraux explicites'],
  },
  trust: {
    threshold: 0.6,
    instruction: "La confiance se construit par les d\u00e9tails d'intimit\u00e9 partag\u00e9e, les gestes familiers.",
    forbidden: ['confiance aveugle sans raison'],
  },
  surprise: {
    threshold: 0.6,
    instruction: "L'inattendu frappe sans pr\u00e9venir. Rupture de rythme, r\u00e9v\u00e9lation soudaine.",
    forbidden: ['pr\u00e9parer la surprise trop t\u00f4t'],
  },
  contempt: {
    threshold: 0.5,
    instruction: "Le m\u00e9pris est froid, distant. Il s'exprime dans les omissions, les regards d\u00e9tourn\u00e9s.",
    forbidden: ['insultes directes'],
  },
  remorse: {
    threshold: 0.5,
    instruction: "Le regret ronge de l'int\u00e9rieur. Les souvenirs reviennent en boucle, d\u00e9form\u00e9s par la culpabilit\u00e9.",
    forbidden: ['pardon trop facile'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const QUARTILE_LABELS: Record<string, string> = {
  Q1: 'exposition',
  Q2: 'escalade',
  Q3: 'climax',
  Q4: 'r\u00e9solution',
};

const NECESSITY_RULES: readonly string[] = [
  "0 adverbe en -ment sauf si aucun autre mot ne convient",
  "0 information r\u00e9p\u00e9t\u00e9e \u2014 chaque phrase apporte du nouveau",
  "0 transition vide (\u00abIl se leva.\u00bb seul = interdit)",
  "Chaque phrase : fait avancer l'enjeu OU r\u00e9v\u00e8le le personnage",
  "Max 180 mots \u2014 chaque mot suppl\u00e9mentaire doit se justifier",
  "Verbes d'action pr\u00e9cis (pas \u00abfaire\u00bb, \u00aballer\u00bb, \u00ab\u00eatre\u00bb sans raison)",
];

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export function computeTensionLevel(intensity: number): TensionLevel {
  if (intensity >= 0.85) return 'INSOUTENABLE';
  if (intensity >= 0.7) return 'FORTE';
  if (intensity >= 0.5) return 'MODEREE';
  if (intensity >= 0.3) return 'LEGERE';
  return 'NULLE';
}

export function buildProseDirective(packet: ForgePacket): ProseDirective {
  const intent = packet.intent;
  const ec = packet.emotion_contract;

  // Scene context from intent
  const sceneContext = `${intent.story_goal}. ${intent.scene_goal}. Conflit: ${intent.conflict_type}. POV: ${intent.pov}. Temps: ${intent.tense}. Mots cibles: ${intent.target_word_count}.`;

  // Build 4 quartile directives
  const structure = ec.curve_quartiles.map((q) => buildQuartileDirective(q, packet)) as unknown as readonly [QuartileDirective, QuartileDirective, QuartileDirective, QuartileDirective];

  // Vital stakes: check Q3 (index 2)
  const q3 = ec.curve_quartiles[2];
  const q3Fear = q3.target_14d['fear'] ?? 0;
  const q3Anticipation = q3.target_14d['anticipation'] ?? 0;
  const vitalStakes = (q3Fear > 0.7 || q3Anticipation > 0.7)
    ? "ENJEU VITAL en Q3 : le personnage fait face \u00e0 une cons\u00e9quence irr\u00e9versible. L'issue ne doit pas \u00eatre \u00e9vidente avant Q4. Le lecteur doit retenir son souffle."
    : null;

  // Style constraints from style_genome + kill_lists
  const styleConstraints: string[] = [];
  if (packet.style_genome.universe) {
    styleConstraints.push(`Univers: ${packet.style_genome.universe}`);
  }
  if (packet.style_genome.lexicon.signature_words.length > 0) {
    styleConstraints.push(`Mots-signature: ${packet.style_genome.lexicon.signature_words.join(', ')}`);
  }
  if (packet.kill_lists.banned_cliches.length > 0) {
    styleConstraints.push(`Clich\u00e9s interdits: ${packet.kill_lists.banned_cliches.join(', ')}`);
  }
  if (packet.kill_lists.banned_filter_words.length > 0) {
    styleConstraints.push(`Mots-filtres interdits: ${packet.kill_lists.banned_filter_words.join(', ')}`);
  }

  // Overall dominant emotion (from Q3 — climax)
  const dominantEmotion = q3.dominant;

  // Build directive without hash
  const directiveWithoutHash = {
    scene_context: sceneContext,
    structure,
    necessity_rules: NECESSITY_RULES,
    vital_stakes: vitalStakes,
    style_constraints: styleConstraints,
    dominant_emotion: dominantEmotion,
  };

  const proseDirectiveHash = sha256(canonicalize(directiveWithoutHash));

  return {
    ...directiveWithoutHash,
    prose_directive_hash: proseDirectiveHash,
  };
}

export function buildFinalPrompt(directive: ProseDirective): string {
  const lines: string[] = [];

  lines.push(
    "Tu es un auteur litt\u00e9raire d'excellence. Tu \u00e9cris de la prose fran\u00e7aise",
    "qui d\u00e9passe les standards humains \u2014 sobre, pr\u00e9cise, \u00e9motionnellement",
    "juste. Ton travail est jug\u00e9 par des experts litt\u00e9raires exigeants.",
  );

  lines.push('', '\u2550\u2550\u2550 SC\u00c8NE \u2550\u2550\u2550');
  lines.push(directive.scene_context);

  lines.push('', '\u2550\u2550\u2550 CONTRAT NARRATIF (OBLIGATOIRE \u2014 chaque section est \u00e9valu\u00e9e) \u2550\u2550\u2550');

  for (const q of directive.structure) {
    lines.push('');
    lines.push(`[${q.quartile} \u2014 ${q.label} | Tension: ${q.tension_level}]`);
    lines.push(`\u00c9motion dominante: ${q.dominant_emotion} (${q.emotion_intensity.toFixed(2)})`);
    lines.push(`\u2192 ${q.instruction}`);
    if (q.forbidden.length > 0) {
      lines.push(`\u2717 INTERDIT: ${q.forbidden.join(' / ')}`);
    }
  }

  if (directive.vital_stakes) {
    lines.push('', '\u2550\u2550\u2550 ENJEU VITAL \u2550\u2550\u2550');
    lines.push(directive.vital_stakes);
  }

  lines.push('', "\u2550\u2550\u2550 R\u00c8GLES D'\u00c9CONOMIE NARRATIVE (non n\u00e9gociables) \u2550\u2550\u2550");
  for (const rule of directive.necessity_rules) {
    lines.push(`\u2022 ${rule}`);
  }

  if (directive.style_constraints.length > 0) {
    lines.push('', '\u2550\u2550\u2550 CONTRAINTES DE STYLE \u2550\u2550\u2550');
    for (const c of directive.style_constraints) {
      lines.push(c);
    }
  }

  lines.push('', '\u2550\u2550\u2550 INSTRUCTION FINALE \u2550\u2550\u2550');
  lines.push(
    "\u00c9cris la sc\u00e8ne maintenant. Commence directement par l'action ou",
    "la sensation \u2014 jamais par une description de cadre neutre.",
    "Ton texte sera \u00e9valu\u00e9 sur: tension, int\u00e9riorit\u00e9, densit\u00e9 sensorielle,",
    "n\u00e9cessit\u00e9 de chaque mot, impact \u00e9motionnel.",
  );

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL
// ═══════════════════════════════════════════════════════════════════════════════

function buildQuartileDirective(quartile: EmotionQuartile, packet: ForgePacket): QuartileDirective {
  const target14d = quartile.target_14d;

  // Find dominant emotion and its intensity
  let dominantEmotion = quartile.dominant;
  let emotionIntensity = target14d[dominantEmotion] ?? 0;

  // Fallback: if dominant not in target_14d or is 0, find highest
  if (emotionIntensity === 0) {
    let maxVal = 0;
    for (const key of FORGE_14) {
      const val = target14d[key] ?? 0;
      if (val > maxVal) {
        maxVal = val;
        dominantEmotion = key;
        emotionIntensity = val;
      }
    }
  }

  // Get instruction from mapping
  const rule = EMOTION_INSTRUCTIONS[dominantEmotion];
  let instruction: string;
  let forbidden: string[];

  if (rule && emotionIntensity >= rule.threshold) {
    instruction = rule.instruction;
    forbidden = [...rule.forbidden];
  } else if (rule) {
    // Below threshold — use lighter version
    instruction = `\u00c9motion ${dominantEmotion} (intensit\u00e9 ${emotionIntensity.toFixed(2)}) : ${quartile.narrative_instruction}`;
    forbidden = [];
  } else {
    // No specific rule — use narrative_instruction from packet
    instruction = `\u00c9motion ${dominantEmotion} (intensit\u00e9 ${emotionIntensity.toFixed(2)}) : ${quartile.narrative_instruction}`;
    forbidden = [];
  }

  return {
    quartile: quartile.quartile,
    label: QUARTILE_LABELS[quartile.quartile] ?? quartile.quartile,
    tension_level: computeTensionLevel(emotionIntensity),
    dominant_emotion: dominantEmotion,
    emotion_intensity: emotionIntensity,
    instruction,
    forbidden,
  };
}
