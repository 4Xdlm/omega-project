/**
 * OMEGA Passage Classifier — R-LAB-TYPE Rebuild
 * Date: 2026-03-22
 *
 * Returns a normalized vector of passage type probabilities:
 *   { narration, description, dialogue, introspection, action }
 * Sum = 1.0. Plus dominant_type string.
 *
 * REBUILT based on 64-passage gold set + 15 novels audit.
 * Key fixes:
 * - Dialogue: detect theatre format (SPEAKER NAMES), not just tirets/guillemets
 * - Introspection: detect 1st person + mental verbs + conditional
 * - Narration vs Description: temporal markers separate narration from static
 * - Action: short sentences + action verbs + passe simple
 *
 * Pure TypeScript — no dependencies.
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
// MARKER DETECTION
// ═══════════════════════════════════════════════════════════════════════

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?\u2026\u00bb])\s+/).map(s => s.trim()).filter(s => s.length > 5);
}

/**
 * Detect dialogue: tirets, guillemets, quotes, AND theatre format.
 * Theatre format: lines starting with UPPERCASE NAME followed by colon or period.
 * e.g., "SGANARELLE.--" or "DON JUAN:" or "HARPAGON,"
 */
function computeDialogueScore(text: string): number {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return 0;

  let dialogueLines = 0;
  for (const line of lines) {
    // Standard dialogue markers
    if (line.startsWith('\u2014') || line.startsWith('\u2013') ||
        line.startsWith('- ') || line.startsWith('\u00ab') ||
        line.includes('\u00ab ') || line.includes(' \u00bb') ||
        /^[""\u201c]/.test(line)) {
      dialogueLines++;
      continue;
    }
    // Theatre format: line starts with ALLCAPS word(s) followed by . -- : ,
    // e.g., "SGANARELLE.--Il faut...", "DON JUAN: ..."
    if (/^[A-Z\u00c0-\u00dc][A-Z\u00c0-\u00dc\s]{1,30}[.,:\-]/.test(line)) {
      dialogueLines++;
      continue;
    }
    // Speech verbs near start of line (dit-il, murmura-t-elle, etc.)
    if (/^.{0,5}(dit|murmura|cria|demanda|repondit|chuchota|s'exclama|said|asked|replied|whispered|shouted)\b/i.test(line)) {
      dialogueLines++;
    }
  }

  // Also count speech verb density in the full text
  const speechVerbs = /\b(?:dit|disait|repondit|murmura|cria|demanda|ajouta|reprit|declara|chuchota|s'ecria|s'exclama|said|asked|replied|whispered|shouted|exclaimed|answered|cried)\b/gi;
  const speechCount = (text.toLowerCase().match(speechVerbs) || []).length;
  const words = text.split(/\s+/).length;

  const lineRatio = dialogueLines / lines.length;
  const speechRate = speechCount / Math.max(words, 1);

  // Score: heavily weighted on line ratio (structural signal)
  return Math.min(1.0, lineRatio * 1.2 + speechRate * 8);
}

/**
 * Detect description: adjectives, sensory words, static verbs, low temporal markers.
 */
function computeDescriptionScore(text: string): number {
  const words = text.split(/\s+/);
  const nw = Math.max(words.length, 1);

  // Adjective endings
  const adjEndings = ['eux', 'euse', 'ique', 'able', 'ible', 'ent', 'ente',
    'al', 'el', 'ous', 'ful', 'less', 'ive', 'ose', 'ated'];
  let adjCount = 0;
  for (const w of words) {
    const lower = w.toLowerCase().replace(/[.,;:!?"'()]/g, '');
    if (lower.length > 4 && adjEndings.some(e => lower.endsWith(e))) adjCount++;
  }

  // Static verbs (descriptive state, not action)
  const staticVerbs = /\b(?:etait|etaient|fut|semblait|paraissait|demeurait|restait|regnait|flottait|planait|was|were|seemed|appeared|remained|lay|stood|hung)\b/gi;
  const staticCount = (text.toLowerCase().match(staticVerbs) || []).length;

  // Sensory words
  const sensoryRe = /\b(?:lumiere|ombre|couleur|brillant|sombre|clair|lueur|reflet|bruit|silence|murmure|odeur|parfum|froid|chaud|doux|light|shadow|dark|bright|noise|silence|smell|scent|cold|warm|smooth|rough)\b/gi;
  const sensoryCount = (text.toLowerCase().match(sensoryRe) || []).length;

  // Temporal markers (ABSENCE of temporal = more descriptive)
  const temporalRe = /\b(?:puis|ensuite|alors|soudain|enfin|aussitot|d'abord|then|suddenly|finally|next|meanwhile|first|immediately)\b/gi;
  const temporalCount = (text.toLowerCase().match(temporalRe) || []).length;

  const adjRate = adjCount / nw;
  const staticRate = staticCount / nw;
  const sensoryRate = sensoryCount / nw;
  const temporalPenalty = Math.min(1, temporalCount / 5) * 0.3;

  return Math.min(1.0,
    adjRate * 6 +
    staticRate * 8 +
    sensoryRate * 10 -
    temporalPenalty
  );
}

/**
 * Detect action: action verbs, passe simple, short sentences, physical movement.
 */
function computeActionScore(text: string): number {
  const sents = splitSentences(text);
  const words = text.split(/\s+/);
  const nw = Math.max(words.length, 1);

  // Action verbs (physical movement)
  const actionRe = /\b(?:frappa|bondit|courut|saisit|lanca|jeta|tira|poussa|sauta|tomba|coupa|brisa|arracha|ouvrit|ferma|marcha|s'elanca|walked|ran|jumped|grabbed|threw|hit|kicked|pushed|pulled|struck|seized|caught|fired|rode|charged|crashed|fell|rushed|leapt)\b/gi;
  const actionCount = (text.toLowerCase().match(actionRe) || []).length;

  // Passe simple endings (indicator of narrative action in French)
  const longWords = words.filter(w => w.length > 3).map(w => w.toLowerCase().replace(/[.,;:!?"']/g, ''));
  const psEndings = ['a', 'it', 'ut', 'int', 'urent', 'irent'];
  const psCount = longWords.filter(w => psEndings.some(e => w.endsWith(e))).length;

  // Short sentences (pace/urgency)
  const sentLens = sents.map(s => s.split(/\s+/).length);
  const shortRate = sentLens.filter(l => l < 10).length / Math.max(sentLens.length, 1);
  const meanLen = sentLens.length > 0 ? sentLens.reduce((a, b) => a + b, 0) / sentLens.length : 20;

  return Math.min(1.0,
    (actionCount / nw) * 15 +
    (psCount / Math.max(longWords.length, 1)) * 1.5 +
    shortRate * 0.3 +
    (meanLen < 12 ? 0.15 : 0)
  );
}

/**
 * Detect introspection: 1st person + mental verbs + conditional + modalisateurs.
 */
function computeIntrospectionScore(text: string): number {
  const words = text.split(/\s+/);
  const nw = Math.max(words.length, 1);
  const lower = text.toLowerCase();

  // 1st person pronouns
  const firstPersonRe = /\b(?:je|j'|me|m'|moi|mon|ma|mes|my|mine|myself)\b/gi;
  const fpCount = (lower.match(firstPersonRe) || []).length;

  // Mental/perception verbs
  const mentalRe = /\b(?:pensait|pensais|pensai|croyait|croyais|savait|savais|comprenait|comprenais|sentait|sentais|semblait|imaginait|imaginais|revait|revais|souviens|souvenait|wondered|thought|felt|believed|knew|understood|imagined|remembered|seemed|realized)\b/gi;
  const mentalCount = (lower.match(mentalRe) || []).length;

  // Conditional/subjunctive (hypothetical thinking)
  const condRe = /\b(?:aurait|serait|pourrait|devrait|voudrait|faudrait|would|could|should|might)\b/gi;
  const condCount = (lower.match(condRe) || []).length;

  // Modalisateurs (uncertainty, subjectivity)
  const modalRe = /\b(?:peut-etre|sans doute|probablement|apparemment|semble|semblait|perhaps|probably|apparently|maybe|possibly)\b/gi;
  const modalCount = (lower.match(modalRe) || []).length;

  return Math.min(1.0,
    (fpCount / nw) * 3 +
    (mentalCount / nw) * 12 +
    (condCount / nw) * 8 +
    (modalCount / nw) * 10
  );
}

/**
 * Detect narration: 3rd person + temporal markers + passe simple/imparfait + event sequence.
 */
function computeNarrationScore(text: string): number {
  const words = text.split(/\s+/);
  const nw = Math.max(words.length, 1);
  const lower = text.toLowerCase();

  // 3rd person pronouns
  const thirdPersonRe = /\b(?:il|elle|ils|elles|son|sa|ses|leur|he|she|they|his|her|their)\b/gi;
  const tpCount = (lower.match(thirdPersonRe) || []).length;

  // Temporal progression markers
  const temporalRe = /\b(?:puis|ensuite|alors|soudain|enfin|d'abord|aussitot|tout a coup|apres|pendant|des|lorsqu|quand|then|suddenly|finally|next|meanwhile|first|immediately|after|before|during|when|while|soon)\b/gi;
  const temporalCount = (lower.match(temporalRe) || []).length;

  // Imparfait (narrative background)
  const impEndings = ['ait', 'aient', 'ais'];
  const longWords = words.filter(w => w.length > 3).map(w => w.toLowerCase().replace(/[.,;:!?"']/g, ''));
  const impCount = longWords.filter(w => impEndings.some(e => w.endsWith(e))).length;

  // Event sequence markers (actions in sequence)
  const sequenceRe = /\b(?:il fit|elle fit|il alla|elle alla|il prit|elle prit|il dit|elle dit|he did|she did|he went|she went|he took|she took|he said|she said)\b/gi;
  const seqCount = (lower.match(sequenceRe) || []).length;

  return Math.min(1.0,
    (tpCount / nw) * 2.5 +
    (temporalCount / nw) * 6 +
    (impCount / Math.max(longWords.length, 1)) * 1.2 +
    (seqCount / nw) * 10
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CLASSIFIER
// ═══════════════════════════════════════════════════════════════════════

function r4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

/**
 * Classify a text passage into 5 types with normalized probabilities.
 */
export function classifyPassage(text: string): PassageClassification {
  const raw = {
    narration: computeNarrationScore(text),
    description: computeDescriptionScore(text),
    dialogue: computeDialogueScore(text),
    introspection: computeIntrospectionScore(text),
    action: computeActionScore(text),
  };

  const total = raw.narration + raw.description + raw.dialogue + raw.introspection + raw.action;

  if (total === 0) {
    return {
      narration: 0, description: 1, dialogue: 0, introspection: 0, action: 0,
      dominant_type: 'description',
    };
  }

  let maxVal = 0;
  let maxType: keyof typeof raw = 'description';
  for (const [k, v] of Object.entries(raw) as Array<[keyof typeof raw, number]>) {
    if (v > maxVal) { maxVal = v; maxType = k; }
  }

  return {
    narration: r4(raw.narration / total),
    description: r4(raw.description / total),
    dialogue: r4(raw.dialogue / total),
    introspection: r4(raw.introspection / total),
    action: r4(raw.action / total),
    dominant_type: maxType,
  };
}
