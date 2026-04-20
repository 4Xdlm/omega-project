/**
 * EXCLUSION_PATTERNS - Abstract/Metaphorical Sensory Word Filters
 * 
 * When a sensory word appears near these exclusion context words,
 * it is marked EXCLUDED (not a real sensory event).
 * 
 * Mechanism: if sensory word co-occurs within 3 tokens of any
 * exclusion word, the sensory match is filtered out.
 * 
 * Example (FR):
 *   "voir un problème" -> "voir" is EXCLUDED (abstract)
 *   "voir la porte" -> "voir" is VALID (concrete object: porte)
 */

// ============================================================================
// FRENCH: EXCLUSION CONTEXTS
// Maps sensory word -> abstract contexts that nullify it
// ============================================================================

export const EXCLUSION_CONTEXT_FR: Record<string, readonly string[]> = {
  // voir / visual verbs -> cognitive/abstract uses
  voir: [
    'problème', 'solution', 'idée', 'question', 'possibilité', 'avenir',
    'intérêt', 'danger', 'point', 'clair', 'bien', 'mal', 'tort',
    'raison', 'moyen', 'manière', 'façon', 'cas', 'exemple', 'preuve',
    'sens', 'signification', 'portée', 'conséquence', 'résultat',
  ],

  // entendre / auditory verbs -> cognitive/abstract uses
  entendre: [
    'problème', 'question', 'bruit', 'rumeur', 'nouvelle', 'rapport',
    'raison', 'sens', 'signification', 'allusion', 'suggestion',
    'intention', 'propos', 'discourse', 'avis', 'opinion', 'témoignage',
    'histoire', 'histoire', 'histoire', 'récit', 'conte', 'légende',
  ],

  // sentir / smell/taste/feel -> cognitive/abstract uses
  sentir: [
    'que', 'si', 'besoin', 'désir', 'envie', 'pressentiment',
    'intuition', 'impression', 'malaise', 'douleur', 'peur', 'honte',
    'regret', 'culpabilité', 'orgueil', 'jalousie', 'amour', 'haine',
    'colère', 'joie', 'tristesse', 'nostalgie', 'mélancolie',
  ],

  // clair / transparency -> cognitive clarity
  clair: [
    'explication', 'idée', 'réponse', 'position', 'intention', 'esprit',
    'conscience', 'mémoire', 'compréhension', 'logique', 'raisonnement',
    'pensée', 'jugement', 'discernement', 'perception', 'vue',
  ],

  // sourd / deaf -> cognitive imperviousness
  sourd: [
    'appel', 'demande', 'prière', 'requête', 'supplique', 'protestation',
    'avertissement', 'mise en garde', 'signal', 'cri', 'plainte',
    'voix', 'parole', 'discours', 'message', 'communication',
  ],

  // froid / cold -> emotional coldness
  froid: [
    'accueil', 'regard', 'ton', 'réponse', 'relation', 'amitié',
    'sentiment', 'attitude', 'indifférence', 'détachement', 'réserve',
    'distance', 'froideur', 'hostilité', 'impassibilité', 'distance',
  ],

  // lourd / heavy -> metaphorical weight
  lourd: [
    'silence', 'atmosphère', 'responsabilité', 'conséquence', 'fardeau',
    'charge', 'obligation', 'devoir', 'poids', 'gravité', 'sériosité',
    'importance', 'signification', 'implication', 'portée', 'impact',
  ],

  // brûler / burn -> emotional/metaphorical fire
  brûler: [
    'amour', 'passion', 'désir', 'feu', 'jalousie', 'colère', 'haine',
    'envie', 'convoitise', 'ardeur', 'zèle', 'empressement', 'impatience',
    'ferveur', 'élan', 'enthousiasme', 'fervor', 'intensité', 'ardent',
  ],

  // toucher / touch -> emotional impact
  toucher: [
    'sujet', 'question', 'problème', 'point', 'domaine', 'aspect',
    'cœur', 'âme', 'sentiment', 'émotion', 'sensibilité', 'compassion',
    'empathie', 'attendrissement', 'apitoiement', 'affection', 'tendresse',
  ],

  // sombre / dark -> emotional darkness
  sombre: [
    'pensée', 'idée', 'humeur', 'mood', 'sentiment', 'pressentiment',
    'presage', 'augure', 'destin', 'sort', 'malheur', 'catastrophe',
    'tragédie', 'drame', 'désastre', 'sinistre', 'funeste', 'morbide',
  ],

  // doux / soft -> emotional softness
  doux: [
    'parole', 'voix', 'ton', 'regard', 'manière', 'comportement',
    'gentillesse', 'bonté', 'tendresse', 'affection', 'amabilité',
    'douceur', 'manssuétude', 'clémence', 'indulgence', 'compassion',
  ],

  // brillant / bright -> intellectual brightness
  brillant: [
    'idée', 'esprit', 'intelligence', 'génie', 'talent', 'capacité',
    'succès', 'victoire', 'triomphe', 'gloire', 'honneur', 'prestige',
    'réputation', 'célébrité', 'renommée', 'lustre', 'splendeur',
  ],

  // aigre / sour -> emotional sourness
  aigre: [
    'sentiment', 'rancune', 'ressentiment', 'amertume', 'dépit',
    'malveillance', 'hostilité', 'méchanceté', 'cruauté', 'sarcasme',
    'critique', 'accusation', 'blâme', 'reproche', 'culpabilité',
  ],

  // mou / soft/weak -> weakness
  mou: [
    'caractère', 'volonté', 'résolution', 'fermeté', 'détermination',
    'courage', 'virilité', 'énergie', 'force', 'puissance', 'domination',
    'faiblesse', 'lâcheté', 'pusillanimité', 'indécision', 'vacillement',
  ],

  // serrer / squeeze -> emotional constriction
  serrer: [
    'cœur', 'gorge', 'poitrine', 'sentiment', 'émotion', 'angoisse',
    'peur', 'anxiété', 'détresse', 'souffrance', 'oppression', 'suffocation',
    'étreinte', 'compression', 'oppression', 'constriction', 'suffocation',
  ],

  // léger / light -> emotional/intellectual lightness
  léger: [
    'cœur', 'âme', 'esprit', 'humeur', 'disposition', 'tempérament',
    'frivolité', 'légèreté', 'insouciance', 'légèreté', 'superficialité',
    'légèreté', 'volubilité', 'inconsistance', 'inconstance', 'instabilité',
  ],

  // mouche / fly -> intrusive/annoying
  mouche: [
    'pensée', 'idée', 'obsession', 'préoccupation', 'tracasserie',
    'tracasserie', 'ennui', 'agacement', 'irritation', 'importunité',
    'insistance', 'présence', 'intrusion', 'importun', 'inopportun',
  ],
} as const;

// ============================================================================
// ENGLISH: EXCLUSION CONTEXTS
// Maps sensory word -> abstract contexts that nullify it
// ============================================================================

export const EXCLUSION_CONTEXT_EN: Record<string, readonly string[]> = {
  // see / visual verbs -> cognitive/abstract uses
  see: [
    'problem', 'solution', 'issue', 'point', 'reason', 'way', 'need',
    'idea', 'thought', 'concept', 'meaning', 'sense', 'significance',
    'difference', 'similarity', 'connection', 'parallel', 'analogy',
    'consequence', 'result', 'outcome', 'implication', 'impact',
    'danger', 'risk', 'opportunity', 'possibility', 'potential',
  ],

  // hear / auditory verbs -> cognitive/abstract uses
  hear: [
    'story', 'tale', 'rumor', 'news', 'report', 'testimony',
    'argument', 'claim', 'assertion', 'statement', 'declaration',
    'reason', 'explanation', 'account', 'narrative', 'version',
    'message', 'word', 'news', 'gossip', 'hearsay',
  ],

  // feel / tactile/emotional verbs -> cognitive/emotional uses
  feel: [
    'that', 'like', 'as if', 'need', 'desire', 'want', 'urge',
    'compulsion', 'impulse', 'instinct', 'intuition', 'presentiment',
    'obligation', 'responsibility', 'guilt', 'shame', 'regret',
    'anger', 'joy', 'sadness', 'love', 'hate', 'fear',
  ],

  // touch / tactile verbs -> abstract/emotional uses
  touch: [
    'subject', 'topic', 'issue', 'matter', 'concern', 'aspect',
    'heart', 'soul', 'spirit', 'emotion', 'feeling', 'sentiment',
    'compassion', 'sympathy', 'empathy', 'tenderness', 'affection',
  ],

  // taste / gustatory verbs -> cognitive/emotional uses
  taste: [
    'success', 'victory', 'defeat', 'freedom', 'power', 'defeat',
    'experience', 'life', 'existence', 'journey', 'adventure',
    'knowledge', 'wisdom', 'understanding', 'comprehension', 'learning',
  ],

  // clear / transparency -> cognitive clarity
  clear: [
    'idea', 'explanation', 'answer', 'mind', 'thinking', 'thought',
    'consciousness', 'awareness', 'understanding', 'comprehension',
    'logic', 'reasoning', 'judgment', 'discernment', 'perception',
  ],

  // dark / darkness -> emotional/metaphorical darkness
  dark: [
    'thought', 'mood', 'feeling', 'sentiment', 'emotion', 'atmosphere',
    'past', 'history', 'secret', 'mystery', 'obscurity', 'obscurity',
    'danger', 'evil', 'malice', 'sinister', 'ominous', 'portentous',
  ],

  // warm / warmth -> emotional warmth
  warm: [
    'welcome', 'reception', 'greeting', 'embrace', 'affection',
    'love', 'affection', 'kindness', 'compassion', 'empathy',
    'feeling', 'sentiment', 'emotion', 'heart', 'soul', 'spirit',
  ],

  // cold / coldness -> emotional coldness
  cold: [
    'reception', 'welcome', 'greeting', 'response', 'reaction',
    'attitude', 'demeanor', 'behavior', 'manner', 'tone', 'voice',
    'indifference', 'detachment', 'distance', 'reserve', 'aloofness',
  ],

  // heavy / weight -> metaphorical weight
  heavy: [
    'silence', 'atmosphere', 'air', 'responsibility', 'burden',
    'load', 'obligation', 'duty', 'weight', 'gravity', 'seriousness',
    'importance', 'significance', 'consequence', 'impact', 'meaning',
  ],

  // light / lightness -> emotional/intellectual lightness
  light: [
    'heart', 'spirit', 'mood', 'disposition', 'temperament', 'nature',
    'levity', 'frivolity', 'carelessness', 'thoughtlessness', 'gaiety',
    'happiness', 'joy', 'cheerfulness', 'buoyancy', 'airiness',
  ],

  // bright / brightness -> intellectual brightness
  bright: [
    'idea', 'mind', 'intelligence', 'genius', 'talent', 'ability',
    'success', 'victory', 'triumph', 'glory', 'honor', 'prestige',
    'reputation', 'fame', 'renown', 'luster', 'splendor',
  ],

  // sharp / sharpness -> cognitive/emotional sharpness
  sharp: [
    'mind', 'intellect', 'wit', 'intelligence', 'acuity', 'keenness',
    'criticism', 'remark', 'comment', 'observation', 'insight',
    'pain', 'sting', 'hurt', 'wound', 'injury', 'insult',
  ],

  // bitter / bitterness -> emotional bitterness
  bitter: [
    'feeling', 'emotion', 'sentiment', 'resentment', 'rancor',
    'regret', 'disappointment', 'disillusionment', 'heartbreak',
    'cruelty', 'harshness', 'coldness', 'malice', 'hostility',
  ],

  // sweet / sweetness -> emotional sweetness
  sweet: [
    'voice', 'tone', 'manner', 'nature', 'temperament', 'disposition',
    'kindness', 'gentleness', 'tenderness', 'affection', 'love',
    'innocence', 'charm', 'appeal', 'attractiveness', 'beauty',
  ],

  // sour / sourness -> emotional sourness
  sour: [
    'feeling', 'mood', 'disposition', 'attitude', 'expression',
    'remark', 'comment', 'criticism', 'complaint', 'grievance',
    'resentment', 'bitterness', 'acrimony', 'spite', 'malice',
  ],

  // smooth / smoothness -> cognitive/emotional smoothness
  smooth: [
    'manner', 'behavior', 'speech', 'voice', 'tone', 'delivery',
    'talker', 'operator', 'persuader', 'charmer', 'con', 'schemer',
    'operating', 'running', 'functioning', 'working', 'operation',
  ],

  // rough / roughness -> emotional/cognitive roughness
  rough: [
    'manner', 'behavior', 'speech', 'voice', 'tone', 'delivery',
    'character', 'personality', 'temperament', 'disposition', 'nature',
    'treatment', 'handling', 'usage', 'experience', 'passage',
  ],
} as const;

// ============================================================================
// DEAD METAPHORS - Full phrases always excluded (no anchor validation)
// These are fully lexicalized and never count as sensory events
// ============================================================================

export const DEAD_METAPHORS_FR: readonly string[] = [
  // Positional dead metaphors
  'au pied de', 'à l\'ombre de', 'sous le feu de', 'dans le noir',
  'dans la brume', 'en arrière plan', 'au fond', 'en avant',
  'à l\'horizon', 'en surface', 'en profondeur', 'au cœur',

  // Light/dark dead metaphors
  'lumière du jour', 'obscurité mentale', 'clarté d\'esprit',
  'obscurcir la question', 'éclaircir le problème', 'noircir le tableau',
  'voir clair', 'perte de lucidité', 'illumination soudaine',

  // Temperature dead metaphors
  'accueil froid', 'relation glaciale', 'ambiance chaleureuse',
  'réception tiède', 'atmosphère brûlante', 'discussions enflammées',

  // Taste dead metaphors
  'goût du succès', 'saveur de la victoire', 'amertume de la défaite',
  'douceur de la vie', 'acidité du temps', 'relevé de l\'expérience',

  // Texture dead metaphors
  'peau sensible', 'touche personnelle', 'friction sociale',
  'érosion du temps', 'polissage des mœurs', 'rugosité de l\'existence',

  // Pressure dead metaphors
  'poids de la responsabilité', 'lourdeur de l\'histoire',
  'légèreté de l\'être', 'tension relationnelle', 'compresison émotionnelle',
  'étreinte du temps', 'serrement de cœur', 'relâchement de tension',

  // Smell dead metaphors
  'odeur de scandale', 'parfum de victoire', 'puanteur d\'échec',
  'senteur de nostalgie', 'effluve de la mort', 'arome du passé',

  // Sound dead metaphors
  'silence éloquent', 'bruit ambiant', 'échos du passé', 'harmonie sociale',
  'discorde relationnelle', 'cacophonie mentale', 'mélodie émotionnelle',
] as const;

export const DEAD_METAPHORS_EN: readonly string[] = [
  // Positional dead metaphors
  'at the foot of', 'in the shadow of', 'under fire', 'in the dark',
  'in the fog', 'in the background', 'at the bottom', 'at the front',
  'on the horizon', 'on the surface', 'in depth', 'at heart',

  // Light/dark dead metaphors
  'light of day', 'mental darkness', 'clarity of mind', 'fog the issue',
  'shed light', 'darken the picture', 'see clearly', 'loss of clarity',
  'sudden illumination', 'light bulb moment', 'darkness of ignorance',

  // Temperature dead metaphors
  'cold reception', 'icy relations', 'warm atmosphere', 'cool response',
  'heated discussion', 'burning passion', 'lukewarm welcome',

  // Taste dead metaphors
  'taste of success', 'flavor of victory', 'bitter defeat', 'sweet life',
  'sour grapes', 'spice of life', 'bland existence', 'seasoning of experience',

  // Texture dead metaphors
  'sensitive skin', 'personal touch', 'social friction', 'erosion of time',
  'polishing manners', 'rough patch', 'smooth sailing', 'rough waters',

  // Pressure dead metaphors
  'weight of responsibility', 'heavy history', 'light being', 'tense relations',
  'emotional pressure', 'grip of fear', 'squeeze play', 'tension headache',

  // Smell dead metaphors
  'smell of scandal', 'scent of victory', 'stench of failure', 'whiff of nostalgia',
  'fragrance of love', 'odor of time', 'aroma of history',

  // Sound dead metaphors
  'deafening silence', 'ambient noise', 'echoes of the past', 'social harmony',
  'relational discord', 'cacophony of mind', 'emotional melody', 'tone deaf',
] as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ExclusionMatch {
  word: string;
  contextWord: string;
  distance: number;
  category: 'context' | 'dead_metaphor';
}

// ============================================================================
// QUICK VALIDATORS
// ============================================================================

/**
 * Check if a sensory word is excluded by context
 * Returns true if excluded, false if valid
 */
export function isExcludedByContext(
  sensoryWord: string,
  contextWords: string[],
  lang: 'fr' | 'en'
): boolean {
  const normalized = sensoryWord.toLowerCase().trim();
  const contextMap = lang === 'fr' ? EXCLUSION_CONTEXT_FR : EXCLUSION_CONTEXT_EN;
  const exclusions = contextMap[normalized];

  if (!exclusions) return false;

  const contextSet = new Set(contextWords.map((w) => w.toLowerCase().trim()));
  return exclusions.some((ex) => contextSet.has(ex));
}

/**
 * Check if a phrase is a dead metaphor
 */
export function isDeadMetaphor(phrase: string, lang: 'fr' | 'en'): boolean {
  const normalized = phrase.toLowerCase().trim();
  const deadMetaphors = lang === 'fr' ? DEAD_METAPHORS_FR : DEAD_METAPHORS_EN;
  return deadMetaphors.includes(normalized as any);
}
