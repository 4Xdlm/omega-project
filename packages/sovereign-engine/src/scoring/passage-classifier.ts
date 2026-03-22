/**
 * OMEGA Passage Classifier — R-LAB-TYPE-V2
 * Date: 2026-03-22
 *
 * SENTENCE-LEVEL tagging with contextual double-verification.
 * Each sentence is classified individually, then aggregated.
 *
 * Hierarchy: DIALOGUE > ACTION > INTROSPECTION > DESCRIPTION > NARRATION (default)
 *
 * Returns PassageClassification (normalized vector, sum=1.0) for backward compat.
 * Also exports classifyPassageDetailed() for full sentence-level analysis.
 *
 * Pure TypeScript — no dependencies.
 */

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type SentenceType = 'dialogue' | 'action' | 'introspection' | 'description' | 'narration';

export interface SentenceTag {
  type: SentenceType;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface PassageClassification {
  narration: number;
  description: number;
  dialogue: number;
  introspection: number;
  action: number;
  dominant_type: 'narration' | 'description' | 'dialogue' | 'introspection' | 'action';
}

export interface PassageAnalysis {
  classification: PassageClassification;
  sentences: SentenceTag[];
  sentence_count: number;
}

// ═══════════════════════════════════════════════════════════════════════
// MARKER SETS (closed lists — from prompt spec)
// ═══════════════════════════════════════════════════════════════════════

const SPEECH_VERBS = new Set([
  'dit', 'disait', 'repondit', 'respondait', 'murmura', 'murmurait',
  'cria', 'criait', 'demanda', 'demandait', 'ajouta', 'ajoutait',
  'reprit', 'reprenait', 'declara', 'chuchota', "s'ecria", "s'exclama",
  'souffla', 'gemit', 'hurla', 'susurra', 'articula', 'balbutia',
  'grommela', 'marmonna', 'lacha', 'coupa', 'interrompit', 'protesta',
  'implora', 'supplia', 'ordonna',
  'said', 'asked', 'replied', 'whispered', 'shouted', 'exclaimed',
  'answered', 'cried', 'muttered', 'stammered', 'yelled', 'murmured',
  'demanded', 'ordered', 'snapped', 'hissed', 'growled', 'sighed',
]);

const ACTION_VERBS = new Set([
  'frappa', 'bondit', 'courut', 'saisit', 'lanca', 'jeta', 'tira',
  'poussa', 'sauta', 'tomba', 'coupa', 'brisa', 'arracha', 'ouvrit',
  'ferma', 'marcha', "s'elanca", 'recula', 'avanca', 'escalada',
  'plongea', "s'enfuit", 'se jeta', 'se leva', 'se dressa', "s'empara",
  'se precipita', 'prit', 'donna', 'porta', 'leva', 'baissa', 'tourna',
  'retourna', 'monta', 'descendit', 'entra', 'sortit', 'passa',
  'traversa', 'franchit', 'atteignit', 'quitta', 'souleva', 'empoigna',
  'agrippa', 'trancha', 'perca', 'ecrasa', 'renversa', 'projeta',
  // Imparfaits
  'frappait', 'bondissait', 'courait', 'saisissait', 'lancait',
  'jetait', 'tirait', 'poussait', 'sautait', 'tombait', 'coupait',
  'brisait', 'arrachait', 'ouvrait', 'fermait', 'marchait',
  'reculait', 'avancait', 'montait', 'descendait', 'entrait',
  'sortait', 'passait', 'traversait',
  // English
  'walked', 'ran', 'jumped', 'grabbed', 'threw', 'hit', 'kicked',
  'pushed', 'pulled', 'struck', 'seized', 'caught', 'fired', 'rode',
  'charged', 'crashed', 'fell', 'rushed', 'leapt', 'climbed', 'swam',
  'fled', 'turned', 'rose', 'stood', 'sat', 'entered', 'left',
  'crossed', 'reached', 'opened', 'closed', 'broke', 'cut', 'lifted',
  'dropped', 'lunged', 'slashed', 'stabbed', 'smashed', 'hurled',
]);

const MENTAL_VERBS = new Set([
  'pensait', 'pensais', 'pensai', 'croyait', 'croyais', 'savait',
  'savais', 'comprenait', 'comprenais', 'se demandait', 'imaginait',
  'imaginais', 'revait', 'revais', 'se souvenait', 'se souvint',
  'reflechissait', 'hesitait', 'doutait', 'craignait', 'esperait',
  'regrettait', 'se rappelait', 'meditait', 'songeait',
  'thought', 'wondered', 'believed', 'knew', 'understood', 'imagined',
  'remembered', 'realized', 'reflected', 'hesitated', 'doubted',
  'feared', 'hoped', 'regretted', 'pondered', 'contemplated',
]);

const STATIC_VERBS = new Set([
  'etait', 'etaient', 'semblait', 'paraissait', "s'etendait",
  'se dressait', 'regnait', 'flottait', 'planait', 'baignait',
  'dominait', 'was', 'were', 'seemed', 'lay', 'stood', 'hung',
]);

const SENSORY_WORDS = new Set([
  'lumiere', 'ombre', 'couleur', 'brillant', 'sombre', 'clair',
  'lueur', 'reflet', 'silence', 'murmure', 'odeur', 'parfum',
  'froid', 'chaud', 'doux',
  'light', 'shadow', 'dark', 'bright', 'silence', 'smell', 'scent',
  'cold', 'warm',
]);

const ADJ_ENDINGS = ['eux', 'euse', 'ique', 'able', 'ible', 'ente',
  'ous', 'ful', 'less', 'ive', 'ated'];

const SUBORDINATORS = new Set(['qui', 'que', 'dont', 'which', 'that', 'who']);

// ═══════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?\u2026\u00bb])\s+/).map(s => s.trim()).filter(s => s.length > 5);
}

function cleanWord(w: string): string {
  return w.toLowerCase().replace(/[.,;:!?"'()\u00ab\u00bb\u2014\u2013\u2026\u201c\u201d]/g, '');
}

function getWords(sentence: string): string[] {
  return sentence.split(/\s+/).filter(w => w.length > 0);
}

function r4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

// ═══════════════════════════════════════════════════════════════════════
// SENTENCE-LEVEL CLASSIFIER
// ═══════════════════════════════════════════════════════════════════════

function classifySentence(sentence: string, prevType?: SentenceType): SentenceTag {
  const words = getWords(sentence);
  const cleaned = words.map(cleanWord);
  const trimmed = sentence.trim();

  // ── DIALOGUE CHECK (highest priority) ─────────────────────────────
  // 1. Quote markers enclosing the sentence
  const hasQuotes = /[\u00ab\u201c"]/.test(trimmed) && /[\u00bb\u201d"]/.test(trimmed);
  // 2. Tiret cadratin at start
  const hasTiret = trimmed.startsWith('\u2014') || trimmed.startsWith('\u2013') || trimmed.startsWith('- ');
  // 3. Theatre format: ALLCAPS word(s) at start followed by punct
  const hasTheatre = /^[A-Z\u00c0-\u00dc][A-Z\u00c0-\u00dc\s]{1,25}[.,:\-]/.test(trimmed);
  // 4. Speech verb present
  const hasSpeechVerb = cleaned.some(w => SPEECH_VERBS.has(w));

  // Double verification for dialogue
  if (hasQuotes || hasTiret || hasTheatre) {
    // Primary marker present — check it's not indirect discourse
    const hasQue = cleaned.indexOf('que') > 0 || cleaned.indexOf("qu'") > 0;
    const speechIdx = cleaned.findIndex(w => SPEECH_VERBS.has(w));
    const isIndirect = hasSpeechVerb && speechIdx >= 0 &&
      (cleaned[speechIdx + 1] === 'que' || cleaned[speechIdx + 1] === "qu'");

    if (!isIndirect) {
      return { type: 'dialogue', confidence: 'HIGH' };
    }
  }
  if (hasSpeechVerb && (hasQuotes || hasTiret)) {
    return { type: 'dialogue', confidence: 'HIGH' };
  }
  // Inline dialogue: "..." he said
  if (/[""\u201c\u201d]/.test(sentence) && hasSpeechVerb) {
    return { type: 'dialogue', confidence: 'MEDIUM' };
  }

  // ── ACTION CHECK ──────────────────────────────────────────────────
  const actionVerbCount = cleaned.filter(w => ACTION_VERBS.has(w)).length;
  // Position check: action verb in first 8 words → strong signal
  const earlyAction = cleaned.slice(0, 8).some(w => ACTION_VERBS.has(w));
  // Subordinator check: action verb after subordinator → weaker
  let actionInSubordinate = false;
  for (let i = 0; i < cleaned.length; i++) {
    if (SUBORDINATORS.has(cleaned[i])) {
      for (let j = i + 1; j < Math.min(i + 5, cleaned.length); j++) {
        if (ACTION_VERBS.has(cleaned[j])) { actionInSubordinate = true; break; }
      }
    }
  }

  if (actionVerbCount >= 2 && !actionInSubordinate) {
    return { type: 'action', confidence: 'HIGH' };
  }
  if (actionVerbCount >= 1 && earlyAction && !actionInSubordinate) {
    return { type: 'action', confidence: 'MEDIUM' };
  }
  // Short sentence with action verb = likely action
  if (actionVerbCount >= 1 && words.length < 15 && !actionInSubordinate) {
    return { type: 'action', confidence: 'LOW' };
  }

  // ── INTROSPECTION CHECK ───────────────────────────────────────────
  const mentalVerbCount = cleaned.filter(w => MENTAL_VERBS.has(w)).length;
  // Check for "sentait/felt" + abstract complement
  const abstractComplements = ['peur', 'joie', 'tristesse', 'angoisse', 'culpabilite',
    'honte', 'colere', 'remords', 'doute', 'fear', 'joy', 'sadness', 'guilt',
    'shame', 'anger', 'regret', 'doubt', 'anxiety', 'sorrow', 'despair'];
  const hasSentaitAbstract = (cleaned.includes('sentait') || cleaned.includes('felt')) &&
    cleaned.some(w => abstractComplements.includes(w));

  // Conditional/subjunctive
  const condWords = ['aurait', 'serait', 'pourrait', 'devrait', 'voudrait',
    'faudrait', 'would', 'could', 'should', 'might'];
  const condCount = cleaned.filter(w => condWords.includes(w)).length;

  // Modalisateurs
  const modalWords = ['peut-etre', 'sans doute', 'probablement', 'apparemment',
    'perhaps', 'probably', 'apparently', 'maybe'];
  const hasModal = modalWords.some(m => sentence.toLowerCase().includes(m));

  // First-person pronouns (strong introspection signal)
  const fp1 = ['je', "j'", 'me', "m'", 'moi', 'my', 'mine', 'myself'];
  const fpCount = cleaned.filter(w => fp1.includes(w)).length;

  if (mentalVerbCount >= 1 && (condCount >= 1 || hasModal || hasSentaitAbstract || fpCount >= 2)) {
    return { type: 'introspection', confidence: 'HIGH' };
  }
  if (mentalVerbCount >= 1 && fpCount >= 1) {
    return { type: 'introspection', confidence: 'MEDIUM' };
  }
  if (mentalVerbCount >= 1) {
    return { type: 'introspection', confidence: 'LOW' };
  }
  // First person dominant with conditional or modal = introspection even without mental verb
  if (fpCount >= 3 && (condCount >= 1 || hasModal)) {
    return { type: 'introspection', confidence: 'LOW' };
  }

  // ── DESCRIPTION CHECK ─────────────────────────────────────────────
  let adjCount = 0;
  for (const w of cleaned) {
    if (w.length > 4 && ADJ_ENDINGS.some(e => w.endsWith(e))) adjCount++;
  }
  const staticVerbCount = cleaned.filter(w => STATIC_VERBS.has(w)).length;
  const sensoryCount = cleaned.filter(w => SENSORY_WORDS.has(w)).length;

  // Description: static verbs + adj/sensory
  if (staticVerbCount >= 1 && (adjCount >= 1 || sensoryCount >= 1)) {
    return { type: 'description', confidence: 'HIGH' };
  }
  if (adjCount >= 2 && sensoryCount >= 1) {
    return { type: 'description', confidence: 'HIGH' };
  }
  if (adjCount >= 2) {
    return { type: 'description', confidence: 'MEDIUM' };
  }
  if (sensoryCount >= 1) {
    return { type: 'description', confidence: 'LOW' };
  }
  // Long sentence with 1+ adjective = likely descriptive
  if (adjCount >= 1 && words.length > 20) {
    return { type: 'description', confidence: 'LOW' };
  }

  // ── NARRATION (default) ───────────────────────────────────────────
  return { type: 'narration', confidence: 'LOW' };
}

// ═══════════════════════════════════════════════════════════════════════
// PASSAGE-LEVEL AGGREGATION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Classify a text passage — backward compatible interface.
 * Tags each sentence individually, then aggregates.
 */
export function classifyPassage(text: string): PassageClassification {
  const analysis = classifyPassageDetailed(text);
  return analysis.classification;
}

/**
 * Detailed passage analysis with sentence-level tags.
 */
export function classifyPassageDetailed(text: string): PassageAnalysis {
  const sents = splitSentences(text);
  const tags: SentenceTag[] = [];

  let prevType: SentenceType | undefined;
  for (const s of sents) {
    const tag = classifySentence(s, prevType);
    tags.push(tag);
    prevType = tag.type;
  }

  const counts: Record<SentenceType, number> = {
    dialogue: 0, action: 0, description: 0, introspection: 0, narration: 0,
  };
  for (const t of tags) counts[t.type]++;

  const total = Math.max(tags.length, 1);
  const pcts: Record<string, number> = {};
  let maxPct = 0;
  let dominant: SentenceType = 'narration';
  for (const type of ['dialogue', 'action', 'description', 'introspection', 'narration'] as SentenceType[]) {
    const pct = counts[type] / total;
    pcts[type] = r4(pct);
    if (pct > maxPct) { maxPct = pct; dominant = type; }
  }

  return {
    classification: {
      narration: pcts['narration'],
      description: pcts['description'],
      dialogue: pcts['dialogue'],
      introspection: pcts['introspection'],
      action: pcts['action'],
      dominant_type: dominant,
    },
    sentences: tags,
    sentence_count: sents.length,
  };
}
