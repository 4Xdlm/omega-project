/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA GENIUS ENGINE — PROMPT CONTRACT COMPILER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: genius/genius-contract-compiler.ts
 * Sprint: GENIUS-01
 * Spec:   GENIUS_ENGINE_SPEC v1.2.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Compiles a ForgePacket + mode into an 8-section prompt with:
 * - [0] ANTI-PATTERN blacklist (versioned)
 * - [1] STRUCTURE (quartiles + NarrativeShape budgets)
 * - [2] DISCIPLINE LEXICALE (repetition/field constraints)
 * - [3] RYTHME (universal or author fingerprint ±10%)
 * - [4] CONTRAT ÉMOTIONNEL (14D curve per quartile)
 * - [5] VOICE TARGET (genome per mode)
 * - [6] OBJECTIFS SOFT (sensory density, show don't tell)
 * - [7] LIBERTÉ CRÉATIVE (exemplars, symbols, images)
 * + Priority hierarchy: Authenticité > Émotion > Structure > Rythme > Lexique
 * + Escape hatch NONCOMPLIANCE
 *
 * ANTI-DOUBLON: This module does NOT consume any score from M (ECI, RCI, SII, AAI).
 * It produces PROMPT instructions only — scoring is done by GENIUS-02 scorers.
 *
 * Invariants: GENIUS-13 (priority order in output)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { sha256 } from '@omega/canon-kernel';
import type { ForgePacket, KillLists, PromptSection } from '../types.js';
import type { VoiceGenome } from '../voice/voice-genome.js';
import antiPatternData from './anti-pattern-blacklist.json';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — GENIUS CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Narrative shape determines quartile budgets and structural expectations.
 * Each shape defines a different tension/pacing profile.
 */
export type NarrativeShape =
  | 'ThreatReveal'
  | 'SlowBurn'
  | 'Spiral'
  | 'StaticPressure'
  | 'Contemplative';

/**
 * Generation mode determines which constraints are applied.
 * - original: generic OMEGA voice, universal rhythm
 * - continuation: author fingerprint required, rhythm ±10% of author
 * - enhancement: author fingerprint as guide, relaxed voice floor
 */
export type GeniusMode = 'original' | 'continuation' | 'enhancement';

/**
 * Author fingerprint for continuation/enhancement modes.
 * Measured from existing author corpus.
 */
export interface AuthorFingerprint {
  readonly author_id: string;
  readonly rhythm_distribution: {
    readonly bucket_lt5: number;   // % phrases < 5 mots
    readonly bucket_5_10: number;  // % phrases 5-10 mots
    readonly bucket_10_15: number; // % phrases 10-15 mots
    readonly bucket_15_20: number; // % phrases 15-20 mots
    readonly bucket_20_25: number; // % phrases 20-25 mots
    readonly bucket_gt25: number;  // % phrases > 25 mots
  };
  readonly signature_words: readonly string[];
  readonly register: 'familier' | 'courant' | 'soutenu' | 'littéraire';
  readonly dialogue_silence_ratio: number; // 0-1
  readonly avg_sentence_length: number;
}

/**
 * Scored exemplar passage for section [7] injection.
 */
export interface Exemplar {
  readonly text: string;
  readonly score: number; // must be >= 90
  readonly source: string;
}

/**
 * Input contract for the GENIUS prompt compiler.
 */
export interface GeniusContractInput {
  readonly forgePacket: ForgePacket;
  readonly mode: GeniusMode;
  readonly narrativeShape?: NarrativeShape;
  readonly voiceGenome?: VoiceGenome;
  readonly authorFingerprint?: AuthorFingerprint;
  readonly exemplars?: readonly Exemplar[];
  readonly antiPatternVersion: string;
}

/**
 * Output of the GENIUS prompt compiler.
 */
export interface GeniusContractOutput {
  readonly prompt: string;
  readonly sections: readonly PromptSection[];
  readonly mode: GeniusMode;
  readonly antiPatternVersion: string;
  readonly priorityOrder: readonly string[];
  readonly constraintsInjected: number;
  readonly promptHash: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NARRATIVE SHAPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

interface ShapeQuartileProfile {
  readonly label: string;
  readonly budget: string;
}

interface ShapeDefinition {
  readonly Q1: ShapeQuartileProfile;
  readonly Q2: ShapeQuartileProfile;
  readonly Q3: ShapeQuartileProfile;
  readonly Q4: ShapeQuartileProfile;
}

const SHAPE_PROFILES: Record<NarrativeShape, ShapeDefinition> = {
  ThreatReveal: {
    Q1: { label: 'Installation + fausse sécurité', budget: '1 micro-événement + 1 ancrage sensoriel + tension latente' },
    Q2: { label: 'Indices convergents', budget: '1 variation rythmique + montée pression + détail révélateur' },
    Q3: { label: 'Révélation + bascule', budget: '1 pivot majeur + rupture émotionnelle + accélération' },
    Q4: { label: 'Conséquences immédiates', budget: 'résolution partielle + nouveau danger + état terminal' },
  },
  SlowBurn: {
    Q1: { label: 'Atmosphère + routine', budget: '1 ancrage sensoriel dense + normalité apparente' },
    Q2: { label: 'Fissures subtiles', budget: '1 variation rythmique + malaise croissant + détail dissonant' },
    Q3: { label: 'Accumulation critique', budget: '1 pivot lent + pression interne maximale' },
    Q4: { label: 'Débordement contrôlé', budget: 'résolution + transformation irréversible + silence final' },
  },
  Spiral: {
    Q1: { label: 'Premier tour', budget: '1 micro-événement + pattern initial + ancrage' },
    Q2: { label: 'Amplification', budget: 'même pattern intensifié + 1 variation + montée' },
    Q3: { label: 'Vertige', budget: '1 pivot + pattern saturé + perte de contrôle' },
    Q4: { label: 'Sortie ou effondrement', budget: 'résolution par rupture du pattern + état terminal' },
  },
  StaticPressure: {
    Q1: { label: 'Huis clos installé', budget: '1 ancrage spatial dense + tension immédiate + contrainte' },
    Q2: { label: 'Pression constante', budget: '1 variation micro + tentatives échouées + claustrophobie' },
    Q3: { label: 'Point de rupture', budget: '1 pivot interne + fissure psychologique + micro-événement' },
    Q4: { label: 'Libération ou écrasement', budget: 'résolution + transformation sous pression + état terminal' },
  },
  Contemplative: {
    Q1: { label: 'Immersion sensorielle', budget: '1 ancrage multi-sensoriel + lenteur délibérée + intériorité' },
    Q2: { label: 'Réflexion active', budget: '1 variation rythmique douce + mémoire/association + motif' },
    Q3: { label: 'Prise de conscience', budget: '1 pivot intérieur subtil + basculement perception' },
    Q4: { label: 'Nouvelle clarté', budget: 'résolution contemplative + transformation silencieuse + état terminal' },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PRIORITY HIERARCHY — FROZEN (GENIUS-13)
// ═══════════════════════════════════════════════════════════════════════════════

const PRIORITY_ORDER: readonly string[] = [
  'Authenticité',
  'Émotion',
  'Structure',
  'Rythme',
  'Lexique',
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPILER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compile a ForgePacket + mode into an 8-section GENIUS prompt.
 *
 * @throws Error if mode=continuation and no authorFingerprint
 * @throws Error if mode=continuation and no voiceGenome
 * @throws Error if antiPatternVersion doesn't match loaded blacklist
 */
export function compileGeniusContract(input: GeniusContractInput): GeniusContractOutput {
  // ── Validation ──
  validateInput(input);

  // ── Build 8 sections ──
  const sections: PromptSection[] = [
    buildAntiPatternSection(input),       // [0]
    buildStructureSection(input),          // [1]
    buildLexicalDisciplineSection(),       // [2]
    buildRhythmSection(input),             // [3]
    buildEmotionContractSection(input),    // [4]
    buildVoiceTargetSection(input),        // [5]
    buildSoftObjectivesSection(),          // [6]
    buildCreativeFreedomSection(input),    // [7]
  ];

  // ── Priority hierarchy (after section [7]) ──
  sections.push(buildPriorityHierarchySection());

  // ── Escape hatch NONCOMPLIANCE ──
  sections.push(buildNoncomplianceSection());

  // ── Assemble full prompt ──
  const prompt = sections.map(s => s.content).join('\n\n');
  const promptHash = sha256(prompt);

  // ── Count measurable constraints ──
  const constraintsInjected = countConstraints(sections);

  return {
    prompt,
    sections,
    mode: input.mode,
    antiPatternVersion: input.antiPatternVersion,
    priorityOrder: PRIORITY_ORDER,
    constraintsInjected,
    promptHash,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateInput(input: GeniusContractInput): void {
  if (input.mode === 'continuation' && !input.authorFingerprint) {
    throw new Error('GENIUS-CONTRACT: mode=continuation requires authorFingerprint');
  }
  if (input.mode === 'continuation' && !input.voiceGenome) {
    throw new Error('GENIUS-CONTRACT: mode=continuation requires voiceGenome');
  }
  if (input.antiPatternVersion !== antiPatternData.version) {
    throw new Error(
      `GENIUS-CONTRACT: antiPatternVersion mismatch. Expected "${antiPatternData.version}", got "${input.antiPatternVersion}"`
    );
  }
  if (input.exemplars) {
    for (const ex of input.exemplars) {
      if (ex.score < 90) {
        throw new Error(`GENIUS-CONTRACT: exemplar score must be >= 90, got ${ex.score} from "${ex.source}"`);
      }
    }
    if (input.exemplars.length > 3) {
      throw new Error(`GENIUS-CONTRACT: max 3 exemplars allowed, got ${input.exemplars.length}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION BUILDERS — [0] to [7] + HIERARCHY + NONCOMPLIANCE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * [0] ANTI-PATTERN — Versioned blacklist injection.
 * Merges GENIUS blacklist with existing ForgePacket kill_lists.
 */
function buildAntiPatternSection(input: GeniusContractInput): PromptSection {
  const kl: KillLists = input.forgePacket.kill_lists;
  const allPatterns = [
    ...antiPatternData.patterns,
    ...kl.banned_ai_patterns,
    ...kl.banned_cliches,
  ];

  // Deduplicate
  const unique = [...new Set(allPatterns)];

  let content = `# [0] ANTI-PATTERN — BLACKLIST VERSIONNÉE (${antiPatternData.version})\n\n`;
  content += `Les formulations suivantes sont INTERDITES. Toute occurrence = REJECT immédiat.\n\n`;
  content += `## Patterns littéraux (${antiPatternData.patterns.length} GENIUS + ${kl.banned_ai_patterns.length + kl.banned_cliches.length} ForgePacket = ${unique.length} uniques)\n\n`;

  for (const p of unique) {
    content += `- "${p}"\n`;
  }

  content += `\n## Patterns regex (${antiPatternData.regex_patterns.length})\n\n`;
  for (const r of antiPatternData.regex_patterns) {
    content += `- /${r}/\n`;
  }

  content += `\n## Mots filtre interdits (${kl.banned_filter_words.length})\n\n`;
  for (const w of kl.banned_filter_words.slice(0, 30)) {
    content += `- ${w}\n`;
  }
  if (kl.banned_filter_words.length > 30) {
    content += `- ... et ${kl.banned_filter_words.length - 30} autres\n`;
  }

  content += `\nTOLÉRANCE : ZÉRO. AUCUNE EXCEPTION.\n`;

  return {
    section_id: 'genius_anti_pattern',
    title: '[0] ANTI-PATTERN',
    content,
    priority: 'critical',
  };
}

/**
 * [1] STRUCTURE — NarrativeShape quartiles + budgets.
 * If no shape specified, falls back to "aligné sur courbe 14D".
 */
function buildStructureSection(input: GeniusContractInput): PromptSection {
  const shape = input.narrativeShape;
  let content = `# [1] STRUCTURE NARRATIVE\n\n`;

  if (shape) {
    const profile = SHAPE_PROFILES[shape];
    content += `## Shape: ${shape}\n\n`;
    content += `### Q1 (0-25%) — ${profile.Q1.label}\n`;
    content += `Budget: ${profile.Q1.budget}\n\n`;
    content += `### Q2 (25-50%) — ${profile.Q2.label}\n`;
    content += `Budget: ${profile.Q2.budget}\n\n`;
    content += `### Q3 (50-75%) — ${profile.Q3.label}\n`;
    content += `Budget: ${profile.Q3.budget}\n\n`;
    content += `### Q4 (75-100%) — ${profile.Q4.label}\n`;
    content += `Budget: ${profile.Q4.budget}\n\n`;
  } else {
    content += `## Shape: AUTO (aligné sur courbe 14D)\n\n`;
    content += `La structure suit la courbe émotionnelle 14D du ForgePacket.\n`;
    content += `Chaque quartile respecte la trajectoire émotionnelle définie dans le CONTRAT ÉMOTIONNEL.\n`;
    content += `La courbe 14D est le SSOT. Si conflit entre shape et 14D → 14D gagne.\n\n`;

    // Inject quartile instructions from emotion contract
    const ec = input.forgePacket.emotion_contract;
    for (const q of ec.curve_quartiles) {
      const range = q.quartile === 'Q1' ? '0-25%' : q.quartile === 'Q2' ? '25-50%' : q.quartile === 'Q3' ? '50-75%' : '75-100%';
      content += `### ${q.quartile} (${range}) — ${q.dominant}\n`;
      content += `Instruction: ${q.narrative_instruction}\n`;
      content += `Budget: 1 micro-événement + ancrage sensoriel adapté\n\n`;
    }
  }

  content += `RÈGLE : La courbe 14D est le SSOT. Si conflit entre structure et émotion → émotion gagne.\n`;

  return {
    section_id: 'genius_structure',
    title: '[1] STRUCTURE',
    content,
    priority: 'critical',
  };
}

/**
 * [2] DISCIPLINE LEXICALE — Repetition and field constraints.
 */
function buildLexicalDisciplineSection(): PromptSection {
  const content = `# [2] DISCIPLINE LEXICALE

## Règles impératives

1. **Champ sémantique** : Maximum 3 mots du même champ sémantique par tranche de 200 mots.
   - Exemple interdit : "sombre", "obscur", "ténébreux", "noir" dans le même paragraphe.
   - Chercher la précision plutôt que la redondance.

2. **Répétition mot fort** : Zéro répétition d'un mot fort (substantif, verbe d'action, adjectif qualificatif) sur une fenêtre de 100 mots.
   - Les mots outils (articles, prépositions, conjonctions) sont exclus de cette règle.
   - Les pronoms sont exclus.

3. **Verbes faibles** : Limiter "être", "avoir", "faire", "aller", "dire" à maximum 20% des verbes totaux.
   - Préférer des verbes précis, incarnés, sensoriels.

4. **Adverbes en -ment** : Maximum 2 par tranche de 200 mots.
   - Préférer une reformulation qui montre plutôt qu'elle qualifie.

VIOLATION = pénalité directe sur le score D (Densité).
`;

  return {
    section_id: 'genius_lexical',
    title: '[2] DISCIPLINE LEXICALE',
    content,
    priority: 'high',
  };
}

/**
 * [3] RYTHME — Universal constraints or author fingerprint ±10%.
 * Mode-dependent: original uses universal, continuation uses author.
 */
function buildRhythmSection(input: GeniusContractInput): PromptSection {
  let content = `# [3] RYTHME\n\n`;

  if (input.mode === 'continuation' && input.authorFingerprint) {
    const fp = input.authorFingerprint;
    const tolerance = 10; // ±10%
    content += `## Mode CONTINUATION — Rythme calqué sur l'auteur (±${tolerance}%)\n\n`;
    content += `Distribution cible (auteur: ${fp.author_id}) :\n`;
    content += `- Phrases < 5 mots : ${fp.rhythm_distribution.bucket_lt5}% (tolérance: ${Math.max(0, fp.rhythm_distribution.bucket_lt5 - tolerance)}-${fp.rhythm_distribution.bucket_lt5 + tolerance}%)\n`;
    content += `- Phrases 5-10 mots : ${fp.rhythm_distribution.bucket_5_10}% (tolérance: ${Math.max(0, fp.rhythm_distribution.bucket_5_10 - tolerance)}-${fp.rhythm_distribution.bucket_5_10 + tolerance}%)\n`;
    content += `- Phrases 10-15 mots : ${fp.rhythm_distribution.bucket_10_15}% (tolérance: ${Math.max(0, fp.rhythm_distribution.bucket_10_15 - tolerance)}-${fp.rhythm_distribution.bucket_10_15 + tolerance}%)\n`;
    content += `- Phrases 15-20 mots : ${fp.rhythm_distribution.bucket_15_20}% (tolérance: ${Math.max(0, fp.rhythm_distribution.bucket_15_20 - tolerance)}-${fp.rhythm_distribution.bucket_15_20 + tolerance}%)\n`;
    content += `- Phrases 20-25 mots : ${fp.rhythm_distribution.bucket_20_25}% (tolérance: ${Math.max(0, fp.rhythm_distribution.bucket_20_25 - tolerance)}-${fp.rhythm_distribution.bucket_20_25 + tolerance}%)\n`;
    content += `- Phrases > 25 mots : ${fp.rhythm_distribution.bucket_gt25}% (tolérance: ${Math.max(0, fp.rhythm_distribution.bucket_gt25 - tolerance)}-${fp.rhythm_distribution.bucket_gt25 + tolerance}%)\n`;
    content += `- Longueur moyenne cible : ${fp.avg_sentence_length} mots\n`;
    content += `- Registre : ${fp.register}\n`;
    content += `- Ratio dialogue/silence : ${fp.dialogue_silence_ratio}\n\n`;
    content += `RÈGLE : La distribution de l'auteur est le SSOT pour le rythme. Les valeurs universelles ne s'appliquent PAS.\n`;
  } else {
    content += `## Mode ${input.mode.toUpperCase()} — Contraintes rythme universelles\n\n`;
    content += `Distribution cible :\n`;
    content += `- 25-35% phrases < 10 mots\n`;
    content += `- 15-25% phrases > 20 mots\n`;
    content += `- Maximum 2 phrases consécutives de même pattern syntaxique\n\n`;
    content += `## Syncopes obligatoires\n`;
    content += `- Au moins 2 syncopes par scène : phrase longue (20+ mots) suivie d'une très courte (5 mots ou moins)\n\n`;
    content += `## Compressions\n`;
    content += `- Au moins 1 phrase ultra-courte (3 mots ou moins) à un moment d'intensité émotionnelle\n\n`;
    content += `## Respirations\n`;
    content += `- Au moins 1 phrase longue (30+ mots) créant un espace contemplatif\n`;
  }

  content += `\nMax 2 phrases consécutives débutant par le même mot.\n`;
  content += `Varier les ouvertures : verbe, nom, préposition, subordonnée.\n`;

  return {
    section_id: 'genius_rhythm',
    title: '[3] RYTHME',
    content,
    priority: 'high',
  };
}

/**
 * [4] CONTRAT ÉMOTIONNEL — 14D curve per quartile from ForgePacket.
 * 14D is SSOT. If conflict with any other constraint → 14D wins.
 */
function buildEmotionContractSection(input: GeniusContractInput): PromptSection {
  const ec = input.forgePacket.emotion_contract;

  let content = `# [4] CONTRAT ÉMOTIONNEL — COURBE 14D\n\n`;
  content += `La courbe 14D est le SSOT ABSOLU. Si conflit avec toute autre contrainte → 14D GAGNE.\n\n`;

  for (const q of ec.curve_quartiles) {
    const range = q.quartile === 'Q1' ? '0-25%' : q.quartile === 'Q2' ? '25-50%' : q.quartile === 'Q3' ? '50-75%' : '75-100%';
    content += `## ${q.quartile} (${range})\n`;
    content += `- Émotion dominante : ${q.dominant}\n`;
    content += `- Valence : ${q.valence.toFixed(3)} (${q.valence > 0 ? 'positive' : q.valence < 0 ? 'négative' : 'neutre'})\n`;
    content += `- Arousal : ${q.arousal.toFixed(3)} (${q.arousal > 0.7 ? 'haute' : q.arousal < 0.3 ? 'basse' : 'moyenne'} intensité)\n`;
    content += `- Instruction : ${q.narrative_instruction}\n\n`;
  }

  // Tension
  content += `## Tension\n`;
  content += `- Pente : ${ec.tension.slope_target}\n`;
  content += `- Pic : ${(ec.tension.pic_position_pct * 100).toFixed(0)}% de la scène\n`;
  content += `- Faille : ${(ec.tension.faille_position_pct * 100).toFixed(0)}% de la scène\n`;

  if (ec.tension.silence_zones.length > 0) {
    content += `- Zones de silence :\n`;
    for (const zone of ec.tension.silence_zones) {
      content += `  - ${(zone.start_pct * 100).toFixed(0)}% à ${(zone.end_pct * 100).toFixed(0)}%\n`;
    }
  }

  // Rupture
  if (ec.rupture.exists) {
    content += `\n## Rupture\n`;
    content += `- Position : ${(ec.rupture.position_pct * 100).toFixed(0)}%\n`;
    content += `- Avant : ${ec.rupture.before_dominant} → Après : ${ec.rupture.after_dominant}\n`;
    content += `- Delta valence : ${ec.rupture.delta_valence.toFixed(2)}\n`;
    content += `- EXÉCUTER AVEC PRÉCISION. C'est un pivot émotionnel majeur.\n`;
  }

  // Terminal
  content += `\n## État terminal\n`;
  content += `- Émotion finale : ${ec.terminal_state.dominant}\n`;
  content += `- Valence finale : ${ec.terminal_state.valence.toFixed(3)}\n`;
  content += `- État lecteur : ${ec.terminal_state.reader_state}\n`;

  // Valence arc
  content += `\n## Arc de valence\n`;
  content += `- Direction : ${ec.valence_arc.direction}\n`;
  content += `- ${ec.valence_arc.start.toFixed(3)} → ${ec.valence_arc.end.toFixed(3)}\n`;

  return {
    section_id: 'genius_emotion',
    title: '[4] CONTRAT ÉMOTIONNEL',
    content,
    priority: 'critical',
  };
}

/**
 * [5] VOICE TARGET — Genome per mode.
 * ANTI-DOUBLON: Does NOT consume RCI voice_conformity. Only injects target.
 */
function buildVoiceTargetSection(input: GeniusContractInput): PromptSection {
  let content = `# [5] VOICE TARGET\n\n`;
  // SSOT boundary comment for anti-doublon lint
  // GENIUS-20: V does NOT correlate with RCI.voice_conformity

  if (input.mode === 'original') {
    content += `## Mode ORIGINAL — Voice genome générique OMEGA\n\n`;
    content += `Voix cible : littéraire contemporaine française, registre soutenu.\n`;
    content += `- Registre dominant : soutenu/littéraire\n`;
    content += `- Densité métaphorique : modérée (0.3-0.5 métaphores/phrase)\n`;
    content += `- Ratio dialogue/narration : libre\n`;
    content += `- Ponctuation : expressive mais contrôlée\n`;
    content += `- Variété d'ouverture : haute (chaque phrase commence différemment)\n`;
  } else if (input.mode === 'continuation' && input.voiceGenome && input.authorFingerprint) {
    const vg = input.voiceGenome;
    const fp = input.authorFingerprint;
    content += `## Mode CONTINUATION — Fingerprint auteur complet\n\n`;
    content += `Auteur : ${fp.author_id}\n`;
    content += `Registre : ${fp.register}\n`;
    content += `Mots-signature : ${fp.signature_words.slice(0, 15).join(', ')}\n`;
    content += `Ratio dialogue/silence : ${fp.dialogue_silence_ratio}\n\n`;
    content += `### Voice Genome (10 paramètres)\n`;
    content += `- Longueur phrase moyenne : ${vg.phrase_length_mean.toFixed(2)}\n`;
    content += `- Ratio dialogue : ${vg.dialogue_ratio.toFixed(2)}\n`;
    content += `- Densité métaphore : ${vg.metaphor_density.toFixed(2)}\n`;
    content += `- Registre langue : ${vg.language_register.toFixed(2)}\n`;
    content += `- Niveau ironie : ${vg.irony_level.toFixed(2)}\n`;
    content += `- Taux ellipse : ${vg.ellipsis_rate.toFixed(2)}\n`;
    content += `- Ratio abstraction : ${vg.abstraction_ratio.toFixed(2)}\n`;
    content += `- Style ponctuation : ${vg.punctuation_style.toFixed(2)}\n`;
    content += `- Rythme paragraphe : ${vg.paragraph_rhythm.toFixed(2)}\n`;
    content += `- Variété ouverture : ${vg.opening_variety.toFixed(2)}\n\n`;
    content += `RÈGLE : Reproduire la voix de l'auteur. V_floor = 85 pour SEAL en mode continuation.\n`;
  } else if (input.mode === 'enhancement') {
    content += `## Mode ENHANCEMENT — Voice genome comme guide\n\n`;
    if (input.voiceGenome) {
      const vg = input.voiceGenome;
      content += `Le voice genome suivant sert de GUIDE, pas de contrainte absolue :\n`;
      content += `- Longueur phrase moyenne : ${vg.phrase_length_mean.toFixed(2)}\n`;
      content += `- Ratio dialogue : ${vg.dialogue_ratio.toFixed(2)}\n`;
      content += `- Registre langue : ${vg.language_register.toFixed(2)}\n\n`;
    }
    content += `Améliorer le texte tout en respectant l'intention stylistique originale.\n`;
    content += `V_floor = 75 pour SEAL en mode enhancement.\n`;
  }

  return {
    section_id: 'genius_voice',
    title: '[5] VOICE TARGET',
    content,
    priority: 'high',
  };
}

/**
 * [6] OBJECTIFS SOFT — Sensory density, show don't tell, motifs.
 */
function buildSoftObjectivesSection(): PromptSection {
  const content = `# [6] OBJECTIFS SOFT

## Densité sensorielle
- Minimum 2 sens engagés par paragraphe (vue + un autre minimum).
- L'odorat et la température sont des leviers puissants — utiliser quand pertinent.
- Précision : pas "un bruit" mais "le raclement du métal sur la pierre".

## Show don't tell
- Incarner, jamais décrire. Pas "elle avait peur" mais "ses doigts se refermèrent sur ses paumes".
- Chaque émotion DOIT être ancrée dans le corps.
- Marqueurs physiques obligatoires : souffle, mains, gorge, poitrine, peau, ventre.

## Motifs
- Établir un motif sensoriel ou symbolique en Q1.
- Le faire résonner en Q2-Q3 (répétition transformée).
- Le résoudre ou le subvertir en Q4.

## Intériorité
- Alterner narration externe et flux de conscience.
- L'intériorité révèle ce que l'action cache.

Ces objectifs sont SOFT : ils guident mais ne REJETTENT pas seuls.
Leur violation chronique impacte les scores D (Densité) et R (Résonance).
`;

  return {
    section_id: 'genius_soft',
    title: '[6] OBJECTIFS SOFT',
    content,
    priority: 'medium',
  };
}

/**
 * [7] LIBERTÉ CRÉATIVE — Exemplars, symbols, images.
 * Bounded freedom: only images, symbols, sensory details, micro-rhythms.
 */
function buildCreativeFreedomSection(input: GeniusContractInput): PromptSection {
  let content = `# [7] LIBERTÉ CRÉATIVE

## Carte blanche UNIQUEMENT sur :
- Images et comparaisons originales
- Symboles et motifs récurrents
- Détails sensoriels (choix, placement, intensité)
- Micro-rythmes (variations à l'intérieur des contraintes)

## TOUT LE RESTE EST CONTRAINT.
Les sections [0] à [6] définissent le cadre. La liberté s'exerce DANS ce cadre.
`;

  if (input.exemplars && input.exemplars.length > 0) {
    content += `\n## Exemplars de référence (${input.exemplars.length})\n\n`;
    content += `Les passages suivants ont obtenu un score ≥ 90. Ils illustrent le niveau attendu.\n\n`;
    for (let i = 0; i < input.exemplars.length; i++) {
      const ex = input.exemplars[i];
      content += `### Exemplar ${i + 1} (score: ${ex.score}, source: ${ex.source})\n`;
      content += `${ex.text}\n\n`;
    }
    content += `S'en inspirer pour le niveau de qualité, PAS pour le contenu.\n`;
  }

  // Inject recurrent motifs from ForgePacket
  const motifs = input.forgePacket.style_genome.imagery.recurrent_motifs;
  if (motifs.length > 0) {
    content += `\n## Motifs récurrents à tisser\n`;
    for (const m of motifs) {
      content += `- ${m}\n`;
    }
  }

  return {
    section_id: 'genius_freedom',
    title: '[7] LIBERTÉ CRÉATIVE',
    content,
    priority: 'medium',
  };
}

/**
 * Priority hierarchy section — injected AFTER section [7].
 * Invariant GENIUS-13: priority order must be present in output.
 */
function buildPriorityHierarchySection(): PromptSection {
  const content = `# HIÉRARCHIE DE RÉSOLUTION DES CONFLITS

Si conflit entre contraintes, résoudre dans cet ordre STRICT :

1. **Authenticité** — Aucun pattern IA détecté. Gate binaire.
2. **Émotion** — La courbe 14D est le SSOT absolu.
3. **Structure** — Les quartiles et budgets narratifs.
4. **Rythme** — La distribution cible (universelle ou auteur).
5. **Lexique** — Les contraintes de répétition et champ sémantique.

Une contrainte de rang inférieur ne peut JAMAIS violer une contrainte de rang supérieur.
Un sacrifice lexical pour préserver l'émotion est VALIDE.
Un sacrifice émotionnel pour préserver le lexique est INTERDIT.
`;

  return {
    section_id: 'genius_priority_hierarchy',
    title: 'HIÉRARCHIE DE RÉSOLUTION',
    content,
    priority: 'critical',
  };
}

/**
 * Escape hatch NONCOMPLIANCE — injected after hierarchy.
 */
function buildNoncomplianceSection(): PromptSection {
  const content = `# ESCAPE HATCH — NONCOMPLIANCE

Si tu ne peux pas satisfaire une contrainte sans violer une contrainte de rang supérieur dans la hiérarchie, déclare :

NONCOMPLIANCE: [section] | [raison]

Exemple :
NONCOMPLIANCE: RYTHME | phrase longue nécessaire pour courbe émotionnelle Q3

Règles :
- Maximum 1 déclaration NONCOMPLIANCE par run (GENIUS-29).
- Si count > 2 → violation systémique, review obligatoire.
- Les déclarations sont parsées et archivées dans l'output JSON.
- NONCOMPLIANCE n'est PAS une excuse pour la paresse. C'est une valve de sécurité pour les conflits RÉELS.
`;

  return {
    section_id: 'genius_noncompliance',
    title: 'NONCOMPLIANCE ESCAPE HATCH',
    content,
    priority: 'critical',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Count measurable constraints injected across all sections.
 * A constraint is any line containing imperative language + measurable criterion.
 */
function countConstraints(sections: readonly PromptSection[]): number {
  let count = 0;
  const constraintMarkers = [
    /\bmaximum\b/i,
    /\bminimum\b/i,
    /\bau moins\b/i,
    /\bau maximum\b/i,
    /\bzéro\b/i,
    /\binterdit/i,
    /\bobligatoire/i,
    /\b\d+[-%]/,
    /\b[≥≤><]\s*\d+/,
    /±\d+/,
  ];

  for (const section of sections) {
    const lines = section.content.split('\n');
    for (const line of lines) {
      if (constraintMarkers.some(marker => marker.test(line))) {
        count++;
      }
    }
  }

  return count;
}

/**
 * Get the loaded anti-pattern blacklist version.
 */
export function getAntiPatternVersion(): string {
  return antiPatternData.version;
}

/**
 * Get the priority order (for external validation / GENIUS-13).
 */
export function getPriorityOrder(): readonly string[] {
  return PRIORITY_ORDER;
}
