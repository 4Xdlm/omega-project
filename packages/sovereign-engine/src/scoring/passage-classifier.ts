/**
 * OMEGA Passage Classifier — Phase R-7 Pre-Seal Audit 3
 *
 * Returns a normalized vector of passage type probabilities:
 *   { narration, description, dialogue, introspection, action }
 * Sum = 1.0. Plus dominant_type string.
 *
 * Pure TypeScript, no dependencies.
 */

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface PassageClassification {
  narration: number;
  description: number;
  dialogue: number;
  introspection: number;
  action: number;
  dominant_type: 'narration' | 'description' | 'dialogue' | 'introspection' | 'action';
}

// ═══════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?…»])\s+/).map(s => s.trim()).filter(s => s.length > 5);
}

function r4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

// ═══════════════════════════════════════════════════════════════════════
// MARKER SETS
// ═══════════════════════════════════════════════════════════════════════

const SENSORY_WORDS = new Set([
  'lumiere', 'ombre', 'couleur', 'brillant', 'sombre', 'clair', 'lueur', 'reflet',
  'bruit', 'son', 'silence', 'murmure', 'voix', 'echo', 'souffle',
  'froid', 'chaud', 'doux', 'rugeux', 'humide', 'sec', 'peau',
  'odeur', 'parfum', 'senteur', 'fumee',
  'gout', 'amer', 'sucre',
  'light', 'shadow', 'dark', 'bright', 'noise', 'sound', 'whisper',
  'cold', 'warm', 'smooth', 'rough', 'smell', 'scent',
]);

const ADJ_ENDINGS = ['eux', 'euse', 'ique', 'able', 'ible', 'ant', 'ent', 'al', 'el',
  'ous', 'ful', 'less', 'ive', 'oso', 'osa'];

const ACTION_VERBS = new Set([
  'marcha', 'marchait', 'courut', 'courait', 'bondit', 'bondissait',
  'saisit', 'saisissait', 'frappa', 'frappait', 'lanca', 'lancait',
  'jeta', 'jetait', 'tira', 'tirait', 'poussa', 'poussait',
  'sauta', 'sautait', 'attrapa', 'attrapait', 'tomba', 'tombait',
  'coupa', 'coupait', 'brisa', 'brisait', 'arracha', 'arrachait',
  'ouvrit', 'ouvrait', 'ferma', 'fermait', 'prit', 'prenait',
  'walked', 'ran', 'jumped', 'grabbed', 'threw', 'hit', 'kicked',
  'pushed', 'pulled', 'struck', 'seized', 'caught',
]);

const SPEECH_VERBS = new Set([
  'dit', 'disait', 'repondit', 'repondait', 'murmura', 'murmurait',
  'cria', 'criait', 'demanda', 'demandait', 'ajouta', 'ajoutait',
  'reprit', 'reprenait', 'declara', 'declarait', 'chuchota',
  'said', 'asked', 'replied', 'whispered', 'shouted', 'exclaimed',
]);

const MODAL_MARKERS = new Set([
  'semblait', 'paraissait', 'apparemment', 'peut-etre', 'probablement',
  'sans doute', 'comme si', 'dirait-on', 'il semblait',
  'seemed', 'appeared', 'perhaps', 'probably', 'possibly', 'as if',
]);

const PS_ENDINGS = ['a', 'it', 'ut', 'int', 'urent', 'irent', 'erent'];
const IMP_ENDINGS = ['ait', 'aient', 'ais'];

// ═══════════════════════════════════════════════════════════════════════
// CLASSIFIER
// ═══════════════════════════════════════════════════════════════════════

/**
 * Classify a text passage into 5 types with normalized probabilities.
 *
 * @param text - Raw text passage (typically 500-2000 words)
 * @returns Classification vector (sum = 1.0)
 */
export function classifyPassage(text: string): PassageClassification {
  const sents = splitSentences(text);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const nWords = Math.max(words.length, 1);
  const nSents = Math.max(sents.length, 1);
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const nLines = Math.max(lines.length, 1);

  // ─── DIALOGUE SIGNALS ───
  let dialogueLines = 0;
  for (const line of lines) {
    if (
      line.startsWith('—') || line.startsWith('–') || line.startsWith('- ') ||
      line.startsWith('«') || line.includes('« ') || line.includes(' »') ||
      /^[""\u201C]/.test(line) || /^\s*[""\u201C]/.test(line)
    ) {
      dialogueLines++;
    }
  }
  const dialogueRatio = dialogueLines / nLines;

  // Speech verbs count
  let speechVerbCount = 0;
  for (const w of words) {
    if (SPEECH_VERBS.has(w.toLowerCase().replace(/[.,;:!?"'()]/g, ''))) {
      speechVerbCount++;
    }
  }
  const speechVerbRate = speechVerbCount / nWords;

  // Dialogue raw score
  const dialogueScore = Math.min(1.0,
    dialogueRatio * 1.5 +
    speechVerbRate * 10
  );

  // ─── DESCRIPTION SIGNALS ───
  let adjCount = 0;
  let sensoryCount = 0;
  for (const w of words) {
    const lower = w.toLowerCase().replace(/[.,;:!?"'()]/g, '');
    if (ADJ_ENDINGS.some(e => lower.endsWith(e)) && lower.length > 4) adjCount++;
    if (SENSORY_WORDS.has(lower)) sensoryCount++;
  }
  const adjRate = adjCount / nWords;
  const sensoryRate = sensoryCount / nWords;

  // Static verbs (etre/avoir forms)
  let staticVerbCount = 0;
  const staticVerbs = new Set(['etait', 'etaient', 'fut', 'semblait', 'paraissait',
    'demeurait', 'restait', 'was', 'were', 'seemed', 'appeared', 'remained']);
  for (const w of words) {
    if (staticVerbs.has(w.toLowerCase().replace(/[.,;:!?"'()]/g, ''))) staticVerbCount++;
  }
  const staticRate = staticVerbCount / nWords;

  const descriptionScore = Math.min(1.0,
    adjRate * 8 +
    sensoryRate * 15 +
    staticRate * 10
  );

  // ─── ACTION SIGNALS ───
  let actionVerbCount = 0;
  for (const w of words) {
    if (ACTION_VERBS.has(w.toLowerCase().replace(/[.,;:!?"'()]/g, ''))) actionVerbCount++;
  }
  const actionVerbRate = actionVerbCount / nWords;

  // Passe simple detection
  const longWords = words.filter(w => w.length > 3).map(w => w.toLowerCase().replace(/[.,;:!?"']/g, ''));
  const psCount = longWords.filter(w => PS_ENDINGS.some(e => w.endsWith(e))).length;
  const psRate = psCount / Math.max(longWords.length, 1);

  // Short sentences (speed)
  const sentLens = sents.map(s => s.split(/\s+/).length);
  const meanSentLen = sentLens.reduce((a, b) => a + b, 0) / nSents;
  const shortSentRate = sentLens.filter(l => l < 10).length / nSents;

  const actionScore = Math.min(1.0,
    actionVerbRate * 20 +
    psRate * 2 +
    shortSentRate * 0.5 +
    (meanSentLen < 12 ? 0.2 : 0)
  );

  // ─── INTROSPECTION SIGNALS ───
  let modalCount = 0;
  const txtLower = text.toLowerCase();
  for (const marker of MODAL_MARKERS) {
    let pos = 0;
    while ((pos = txtLower.indexOf(marker, pos)) !== -1) {
      modalCount++;
      pos += marker.length;
    }
  }
  const modalRate = modalCount / nWords;

  // Conditional forms
  const condForms = ['aurait', 'serait', 'pourrait', 'devrait', 'voudrait',
    'would', 'could', 'should', 'might'];
  let condCount = 0;
  for (const w of words) {
    if (condForms.includes(w.toLowerCase().replace(/[.,;:!?"'()]/g, ''))) condCount++;
  }
  const condRate = condCount / nWords;

  // First person (introspective narration)
  const firstPersonCount = (txtLower.match(/\b(?:je|j'|me|m'|moi|i\b|my\b|me\b)\b/g) || []).length;
  const firstPersonRate = firstPersonCount / nWords;

  const introspectionScore = Math.min(1.0,
    modalRate * 15 +
    condRate * 12 +
    firstPersonRate * 3
  );

  // ─── NARRATION SIGNALS ───
  // 3rd person + imparfait/PS + temporal markers
  const thirdPersonCount = (txtLower.match(/\b(?:il|elle|ils|elles|son|sa|ses|he\b|she\b|his\b|her\b)\b/g) || []).length;
  const thirdPersonRate = thirdPersonCount / nWords;

  const impCount = longWords.filter(w => IMP_ENDINGS.some(e => w.endsWith(e))).length;
  const impRate = impCount / Math.max(longWords.length, 1);

  const temporalMarkers = ['puis', 'ensuite', 'alors', 'soudain', 'enfin',
    'aussitot', 'then', 'suddenly', 'finally', 'next'];
  let temporalCount = 0;
  for (const w of words) {
    if (temporalMarkers.includes(w.toLowerCase().replace(/[.,;:!?"'()]/g, ''))) temporalCount++;
  }
  const temporalRate = temporalCount / nWords;

  const narrationScore = Math.min(1.0,
    thirdPersonRate * 4 +
    impRate * 2 +
    psRate * 2 +
    temporalRate * 8
  );

  // ─── NORMALIZE ───
  const raw = {
    narration: narrationScore,
    description: descriptionScore,
    dialogue: dialogueScore,
    introspection: introspectionScore,
    action: actionScore,
  };

  const total = raw.narration + raw.description + raw.dialogue + raw.introspection + raw.action;

  if (total === 0) {
    // Default: description
    return {
      narration: 0, description: 1, dialogue: 0, introspection: 0, action: 0,
      dominant_type: 'description',
    };
  }

  const normalized: Record<string, number> = {};
  let maxVal = 0;
  let maxType: string = 'description';
  for (const [k, v] of Object.entries(raw)) {
    normalized[k] = r4(v / total);
    if (v > maxVal) {
      maxVal = v;
      maxType = k;
    }
  }

  return {
    narration: normalized['narration'],
    description: normalized['description'],
    dialogue: normalized['dialogue'],
    introspection: normalized['introspection'],
    action: normalized['action'],
    dominant_type: maxType as PassageClassification['dominant_type'],
  };
}
