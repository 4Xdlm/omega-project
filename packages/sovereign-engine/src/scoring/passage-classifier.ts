/**
 * OMEGA Passage Classifier — R-COMP v1.0
 * Date: 2026-03-22
 *
 * PROBABILISTIC sentence-level tagging.
 * Each sentence receives a score vector (not a hard label).
 * Each type has POSITIVE criteria (narration is NOT the default).
 * Unclassifiable sentences → RESIDUAL (explicit category).
 *
 * Pure TypeScript — no dependencies.
 */

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type SentenceType = 'dialogue' | 'action' | 'introspection' | 'description' | 'narration';

export interface SentenceProfile {
  scores: Record<SentenceType, number>;
  dominant: SentenceType;
  residual: number;
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
  sentences: SentenceProfile[];
  sentence_count: number;
  residual_pct: number;
}

// ═══════════════════════════════════════════════════════════════════════
// MARKER SETS
// ═══════════════════════════════════════════════════════════════════════

const SPEECH_VERBS = new Set([
  'dit', 'disait', 'repondit', 'murmura', 'murmurait', 'cria', 'criait',
  'demanda', 'demandait', 'ajouta', 'ajoutait', 'reprit', 'reprenait',
  'declara', 'chuchota', "s'ecria", "s'exclama", 'souffla', 'gemit',
  'hurla', 'susurra', 'articula', 'balbutia', 'grommela', 'marmonna',
  'lacha', 'coupa', 'interrompit', 'protesta', 'implora', 'supplia', 'ordonna',
  'said', 'asked', 'replied', 'whispered', 'shouted', 'exclaimed',
  'answered', 'cried', 'muttered', 'stammered', 'yelled', 'murmured',
  'demanded', 'ordered', 'snapped', 'hissed', 'growled', 'sighed',
]);

const ACTION_VERBS = new Set([
  'frappa', 'bondit', 'courut', 'saisit', 'lanca', 'jeta', 'tira',
  'poussa', 'sauta', 'tomba', 'coupa', 'brisa', 'arracha', 'ouvrit',
  'ferma', 'marcha', 'recula', 'avanca', 'escalada', 'plongea',
  'prit', 'donna', 'porta', 'leva', 'baissa', 'tourna', 'monta',
  'descendit', 'entra', 'sortit', 'passa', 'traversa', 'franchit',
  'atteignit', 'quitta', 'souleva', 'empoigna', 'trancha', 'ecrasa',
  'renversa', 'projeta',
  'frappait', 'bondissait', 'courait', 'saisissait', 'lancait',
  'jetait', 'tirait', 'poussait', 'sautait', 'tombait', 'marchait',
  'reculait', 'avancait', 'montait', 'descendait', 'entrait', 'sortait',
  'passait', 'traversait',
  'walked', 'ran', 'jumped', 'grabbed', 'threw', 'hit', 'kicked',
  'pushed', 'pulled', 'struck', 'seized', 'caught', 'fired', 'rode',
  'charged', 'crashed', 'fell', 'rushed', 'leapt', 'climbed', 'fled',
  'turned', 'rose', 'entered', 'left', 'crossed', 'reached', 'opened',
  'closed', 'broke', 'cut', 'lifted', 'dropped', 'lunged', 'slashed',
  'stabbed', 'smashed', 'hurled',
]);

const MENTAL_VERBS = new Set([
  'pensait', 'pensais', 'croyait', 'croyais', 'savait', 'savais',
  'comprenait', 'comprenais', 'imaginait', 'imaginais', 'revait',
  'reflechissait', 'hesitait', 'doutait', 'craignait', 'esperait',
  'regrettait', 'meditait', 'songeait',
  'thought', 'wondered', 'believed', 'knew', 'understood', 'imagined',
  'remembered', 'realized', 'reflected', 'hesitated', 'doubted',
  'feared', 'hoped', 'regretted', 'pondered', 'contemplated',
]);

const STATIC_VERBS = new Set([
  'etait', 'etaient', 'semblait', 'paraissait', 'regnait', 'flottait',
  'planait', 'baignait', 'dominait',
  'was', 'were', 'seemed', 'lay', 'hung', 'remained', 'appeared',
]);

const SENSORY_WORDS = new Set([
  'lumiere', 'ombre', 'couleur', 'brillant', 'sombre', 'clair', 'lueur',
  'reflet', 'silence', 'murmure', 'odeur', 'parfum', 'froid', 'chaud', 'doux',
  'light', 'shadow', 'dark', 'bright', 'silence', 'smell', 'scent',
  'cold', 'warm', 'rough', 'smooth',
]);

const ADJ_ENDINGS = ['eux', 'euse', 'ique', 'able', 'ible', 'ente', 'ous', 'ful', 'less', 'ive'];

// ═══════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?\u2026\u00bb])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 5 && s.split(/\s+/).length >= 3); // Min 3 words to avoid fragments
}

function cleanWord(w: string): string {
  return w.toLowerCase().replace(/[.,;:!?"'()\u00ab\u00bb\u2014\u2013\u2026\u201c\u201d]/g, '');
}

function r4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

// ═══════════════════════════════════════════════════════════════════════
// SCORE FUNCTIONS (each returns 0.0-1.0, based on POSITIVE criteria only)
// ═══════════════════════════════════════════════════════════════════════

function scoreDialogue(sentence: string): number {
  let score = 0;
  const s = sentence.trim();
  const lower = s.toLowerCase();
  const words = s.split(/\s+/).map(cleanWord);

  // Guillemets FR
  if (s.includes('\u00ab') || s.includes('\u00bb')) score += 0.4;
  // Guillemets EN
  if (/[""\u201c\u201d]/.test(s)) score += 0.3;
  // Tiret cadratin/demi
  if (s.startsWith('\u2014') || s.startsWith('\u2013') || s.startsWith('- ')) score += 0.4;
  // Theatre format
  if (/^[A-Z\u00c0-\u00dc][A-Z\u00c0-\u00dc\s]{1,25}[.,:\-]/.test(s)) score += 0.5;
  // Speech verb
  const hasSpeech = words.some(w => SPEECH_VERBS.has(w));
  if (hasSpeech) score += 0.25;
  // Incise (dit-il, murmura-t-elle)
  if (/(?:dit|murmura|cria|demanda|repondit|s'ecria|chuchota|reprit|ajouta)-(?:il|elle|on|t-il|t-elle)/i.test(lower)) score += 0.3;
  // Interjection directe
  if (/^(?:Eh bien|Mon Dieu|H[eé]las|Oh|Ah|H[eé]|Allons|Tiens|Voyons|Diable|Parbleu|Morbleu|Peste|Pardieu)/i.test(s)) score += 0.25;
  // Short exclamation addressed to someone
  if (s.endsWith('!') && words.length < 10 && /\b(?:tu|vous|toi|monsieur|madame|you)\b/i.test(s)) score += 0.2;

  // Penalty: indirect speech
  if (hasSpeech && /\b(?:dit|repondit|declara|demanda|said|asked|replied)\s+(?:que|qu'|that)\b/i.test(lower)) score -= 0.3;

  return Math.max(0, Math.min(1, score));
}

function scoreAction(sentence: string): number {
  let score = 0;
  const words = sentence.split(/\s+/).map(cleanWord);
  const nw = words.length;

  const actionCount = words.filter(w => ACTION_VERBS.has(w)).length;
  const earlyAction = words.slice(0, 10).some(w => ACTION_VERBS.has(w));

  // Action verb in subordinate clause = weak
  const subordinators = new Set(['qui', 'que', 'dont', 'which', 'that', 'who']);
  let inSubordinate = false;
  for (let i = 0; i < words.length; i++) {
    if (subordinators.has(words[i])) {
      for (let j = i + 1; j < Math.min(i + 5, words.length); j++) {
        if (ACTION_VERBS.has(words[j])) { inSubordinate = true; break; }
      }
    }
  }

  if (actionCount >= 2) score += 0.5;
  else if (actionCount >= 1) score += 0.25;

  if (earlyAction) score += 0.15;
  if (nw < 15 && actionCount >= 1) score += 0.1; // short + action = urgency

  // Sequence markers (tight temporal chain)
  const lower = sentence.toLowerCase();
  if (/\b(?:aussitot|d'un bond|d'un coup|en un instant|instantly|at once|in a flash)\b/i.test(lower)) score += 0.15;

  // Penalty for descriptive context
  const adjCount = words.filter(w => w.length > 4 && ADJ_ENDINGS.some(e => w.endsWith(e))).length;
  if (adjCount >= 3 && nw > 30) score -= 0.2;
  if (inSubordinate && actionCount <= 1) score -= 0.15;

  return Math.max(0, Math.min(1, score));
}

function scoreIntrospection(sentence: string): number {
  let score = 0;
  const lower = sentence.toLowerCase();
  const words = sentence.split(/\s+/).map(cleanWord);
  const s = sentence.trim();

  // A. Mental verbs
  const mentalCount = words.filter(w => MENTAL_VERBS.has(w)).length;
  if (mentalCount >= 1) score += 0.3;
  if (mentalCount >= 2) score += 0.15;

  // B. Emotion verb + abstract complement
  if (/\b(?:sentait|sentais|eprouvait|ressentait|felt|experienced)\b/i.test(lower) &&
      /\b(?:peur|joie|tristesse|angoisse|culpabilite|honte|colere|remords|doute|desespoir|solitude|fear|joy|sadness|guilt|shame|anger|regret|doubt|despair|loneliness|anxiety|sorrow)\b/i.test(lower)) {
    score += 0.35;
  }

  // C. Conditional WITHOUT "si" and WITHOUT quotes (= reported thought)
  const hasConditional = /\b(?:aurait|serait|pourrait|devrait|voudrait|faudrait|saurait|would|could|should|might)\b/i.test(lower);
  const hasQuotes = /[\u00ab\u00bb""\u201c\u201d\u2014\u2013]/.test(s);
  if (hasConditional && !hasQuotes && !/\bsi\b/i.test(lower)) score += 0.2;

  // D. Modalisateurs
  const modals = ['peut-etre', 'sans doute', 'probablement', 'apparemment',
    'comme si', 'on eut dit', 'on aurait dit', 'il semblait que', 'il lui semblait',
    'pour ainsi dire', 'perhaps', 'probably', 'apparently', 'as if', 'as though',
    'it seemed', 'one might say', 'somehow'];
  if (modals.some(m => lower.includes(m))) score += 0.25;

  // E. Rhetorical question WITHOUT quotes (= inner thought)
  if (s.endsWith('?') && !hasQuotes) score += 0.2;

  // F. Inner exclamation WITHOUT quotes
  if (s.endsWith('!') && !hasQuotes && words.length < 15) score += 0.15;

  // G. Memory markers
  if (/\b(?:se souvenait|se souvint|se rappelait|se rappela|autrefois|jadis|naguere|remembered|recalled|once upon|in those days|long ago)\b/i.test(lower)) score += 0.3;

  // H. Hesitation
  if (/\b(?:ou bien|a moins que|ou peut-etre|ou plutot|or perhaps|or maybe|unless|or rather)\b/i.test(lower)) score += 0.15;

  // I. Filtered perception
  if (/\b(?:croyait voir|croyait entendre|semblait voir|semblait entendre|cru voir|thought he saw|thought she heard|seemed to see|seemed to hear)\b/i.test(lower)) score += 0.3;

  // J. First person dominance
  const fpWords = new Set(['je', "j'", 'me', "m'", 'moi', 'mon', 'ma', 'mes', 'i', 'my', 'myself']);
  const fpCount = words.filter(w => fpWords.has(w)).length;
  if (fpCount >= 3) score += 0.15;
  if (fpCount >= 1 && hasConditional) score += 0.1;

  return Math.max(0, Math.min(1, score));
}

function scoreDescription(sentence: string): number {
  let score = 0;
  const words = sentence.split(/\s+/).map(cleanWord);
  const lower = sentence.toLowerCase();

  // Static verbs as MAIN verb
  const staticCount = words.filter(w => STATIC_VERBS.has(w)).length;
  if (staticCount >= 1) score += 0.2;

  // Adjectives
  const adjCount = words.filter(w => w.length > 4 && ADJ_ENDINGS.some(e => w.endsWith(e))).length;
  if (adjCount >= 2) score += 0.25;
  else if (adjCount >= 1) score += 0.1;

  // Sensory words
  const sensoryCount = words.filter(w => SENSORY_WORDS.has(w)).length;
  if (sensoryCount >= 1) score += 0.2;

  // Spatial structure
  if (/\b(?:a gauche|a droite|au fond|devant|derriere|au-dessus|au-dela|plus loin|en bas|en haut|on the left|on the right|ahead|behind|above|beyond|below)\b/i.test(lower)) score += 0.15;

  // No human agent (sentences about objects/places)
  const humanPronouns = /\b(?:il|elle|je|tu|nous|vous|he|she|i|we|you|they)\b/i;
  if (!humanPronouns.test(lower) && staticCount >= 1) score += 0.15;

  // Penalty: temporal progression = narration, not description
  if (/\b(?:puis|ensuite|alors|soudain|aussitot|then|suddenly|next)\b/i.test(lower)) score -= 0.15;

  return Math.max(0, Math.min(1, score));
}

function scoreNarration(sentence: string): number {
  let score = 0;
  const lower = sentence.toLowerCase();
  const words = sentence.split(/\s+/).map(cleanWord);

  // Temporal progression markers
  if (/\b(?:puis|ensuite|le lendemain|trois jours|le soir|le matin|un an|quelques|aussitot|tout a coup|soudain|enfin|d'abord|meanwhile|then|next|afterwards|the next day|soon|finally|first|immediately|later|eventually)\b/i.test(lower)) score += 0.3;

  // Third person + past tense = basic narrative signal (MOST literary prose)
  const hasThirdPerson = /\b(?:il|elle|ils|elles|on|he|she|they)\b/i.test(lower);
  const hasPast = words.some(w => w.length > 3 && /(?:ait|aient|ut|int|it|ed)$/.test(w));
  if (hasThirdPerson && hasPast) score += 0.25;
  // Third person alone is still a narrative signal
  if (hasThirdPerson && !hasPast) score += 0.1;

  // Causal narrative connectors
  if (/\b(?:car|donc|c'est pourquoi|si bien que|de sorte que|because|therefore|consequently|as a result|thus)\b/i.test(lower)) score += 0.15;

  // Temporal transition
  if (/\b(?:le temps pass|les jours|les semaines|les mois|time passed|days went|weeks later|months passed)\b/i.test(lower)) score += 0.25;

  // Accomplishment verbs (event summary)
  if (/\b(?:obtint|quitta|epousa|mourut|naquit|devint|perdit|gagna|trouva|apprit|achieved|left|married|died|became|lost|won|found|learned)\b/i.test(lower)) score += 0.2;

  // Generic prose markers — il y avait, c'etait, on voyait (transition/exposition)
  if (/\b(?:il y avait|c'etait|on voyait|on entendait|il faisait|there was|there were|it was|one could)\b/i.test(lower)) score += 0.2;

  // Past tense markers alone (imparfait/passe simple common in narration)
  const pastCount = words.filter(w => w.length > 3 && /(?:ait|aient|ais)$/.test(w)).length;
  if (pastCount >= 2) score += 0.1;

  return Math.max(0, Math.min(1, score));
}

// ═══════════════════════════════════════════════════════════════════════
// SENTENCE PROFILER
// ═══════════════════════════════════════════════════════════════════════

function scoreSentence(sentence: string): SentenceProfile {
  const scores: Record<SentenceType, number> = {
    dialogue: scoreDialogue(sentence),
    action: scoreAction(sentence),
    introspection: scoreIntrospection(sentence),
    description: scoreDescription(sentence),
    narration: scoreNarration(sentence),
  };

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const residual = total < 0.05 ? 1.0 : 0; // Lowered from 0.1 to reduce residual

  let maxType: SentenceType = 'narration';
  let maxVal = 0;
  for (const [type, val] of Object.entries(scores) as Array<[SentenceType, number]>) {
    if (val > maxVal) { maxVal = val; maxType = type; }
  }

  // If nothing scored at all, dominant stays narration but residual = 1
  const confidence: 'HIGH' | 'MEDIUM' | 'LOW' = maxVal >= 0.4 ? 'HIGH' : maxVal >= 0.2 ? 'MEDIUM' : 'LOW';

  return { scores, dominant: maxType, residual, confidence };
}

// ═══════════════════════════════════════════════════════════════════════
// PASSAGE-LEVEL AGGREGATION
// ═══════════════════════════════════════════════════════════════════════

export function classifyPassage(text: string): PassageClassification {
  return classifyPassageDetailed(text).classification;
}

export function classifyPassageDetailed(text: string): PassageAnalysis {
  const sents = splitSentences(text);
  const profiles = sents.map(s => scoreSentence(s));

  // Average the SCORE VECTORS (not hard labels)
  const avg: Record<SentenceType, number> = { dialogue: 0, action: 0, description: 0, introspection: 0, narration: 0 };
  let totalResidual = 0;
  const n = Math.max(profiles.length, 1);

  for (const p of profiles) {
    for (const type of Object.keys(avg) as SentenceType[]) {
      avg[type] += p.scores[type];
    }
    totalResidual += p.residual;
  }

  for (const type of Object.keys(avg) as SentenceType[]) {
    avg[type] /= n;
  }

  // Normalize to sum = 1.0
  const total = Object.values(avg).reduce((a, b) => a + b, 0);
  if (total > 0) {
    for (const type of Object.keys(avg) as SentenceType[]) {
      avg[type] = r4(avg[type] / total);
    }
  } else {
    // All residual — distribute equally
    for (const type of Object.keys(avg) as SentenceType[]) {
      avg[type] = 0.2;
    }
  }

  let maxType: SentenceType = 'narration';
  let maxVal = 0;
  for (const [type, val] of Object.entries(avg) as Array<[SentenceType, number]>) {
    if (val > maxVal) { maxVal = val; maxType = type; }
  }

  return {
    classification: {
      narration: avg.narration,
      description: avg.description,
      dialogue: avg.dialogue,
      introspection: avg.introspection,
      action: avg.action,
      dominant_type: maxType,
    },
    sentences: profiles,
    sentence_count: sents.length,
    residual_pct: r4(totalResidual / n),
  };
}
