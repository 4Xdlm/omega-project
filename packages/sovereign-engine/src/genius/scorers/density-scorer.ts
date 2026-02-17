/**
 * OMEGA GENIUS ENGINE — DENSITY SCORER (D)
 * Sprint: GENIUS-02 | NASA-Grade L4 / DO-178C Level A
 *
 * D = w1*compression_proxy + w2*sentence_utility + w3*(100 - verbiage_penalty)
 * All weights sum to 1.0 → D ∈ [0, 100].
 *
 * ANTI-DOUBLON: D does NOT use SII (LINT-G01). Raw lexical features only.
 */

export interface DensityResult {
  readonly D: number;
  readonly compression_proxy: number;
  readonly sentence_utility_ratio: number;
  readonly verbiage_penalty: number;
  readonly diagnostics: {
    readonly stopword_ratio: number;
    readonly content_word_count: number;
    readonly total_word_count: number;
    readonly sentence_count: number;
    readonly repeat_pattern_count: number;
  };
}

// Weights sum to 1.0 for proper [0,100] range.
const WEIGHTS = { compression: 0.40, utility: 0.40, verbiage: 0.20 } as const;

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?…])[\s\n]+/).map(s => s.trim()).filter(s => s.length > 0);
}

const FRENCH_STOPWORDS = new Set([
  'le','la','les','un','une','des','de','du','au','aux',
  'et','ou','mais','donc','car','ni','que','qui','quoi',
  'ce','cette','ces','mon','ma','mes','ton','ta','tes',
  'son','sa','ses','notre','nos','votre','vos','leur','leurs',
  'je','tu','il','elle','on','nous','vous','ils','elles',
  'me','te','se','en','y','ne','pas','plus','dans',
  'sur','sous','par','pour','avec','sans','entre',
  'est','sont','était','a','ont','été','avait','avaient',
  'qui','que','dont','où','si','comme','bien',
  'd','l','n','s','c','j','qu',
]);

function computeCompression(text: string) {
  const words = text.toLowerCase().split(/[\s'']+/).filter(w => w.length > 0);
  const totalCount = words.length;
  if (totalCount === 0) return { score: 0, swRatio: 1, contentCount: 0, totalCount: 0 };
  let stopCount = 0;
  for (const w of words) {
    const cleaned = w.replace(/[.,;:!?…"""()«»\-]/g, '');
    if (FRENCH_STOPWORDS.has(cleaned) || cleaned.length <= 1) stopCount++;
  }
  const swRatio = stopCount / totalCount;
  const contentCount = totalCount - stopCount;
  const contentRatio = contentCount / totalCount;
  // Dense prose: 55%+ content words → high score
  const score = Math.min(100, contentRatio * 160);
  return { score, swRatio, contentCount, totalCount };
}

const UTILITY_MARKERS: RegExp[] = [
  // Sensory verbs
  /\b(vit|voyait|aperçut|regarda|fixait|observait|contemplait|distingua)\b/i,
  /\b(entendit|écouta|résonnait|grésillait|claquait|craquait|tintait|grondait)\b/i,
  /\b(sentit|sentait|flaira|puait|empestait|embaumait)\b/i,
  /\b(toucha|caressa|effleura|serra|saisit|agrippa|empoigna)\b/i,
  /\b(goûta|avala|mordit|mâcha|dévora|cracha)\b/i,
  // Physical actions
  /\b(courut|bondit|sauta|tomba|glissa|trébucha|recula|avança)\b/i,
  /\b(frappa|poussa|tira|lança|brisa|cassa|déchira|arracha)\b/i,
  /\b(ouvrit|ferma|claqua|verrouilla|enfonça)\b/i,
  /\b(leva|baissa|posa|déposa|laissa|jeta|ramassa)\b/i,
  /\b(détala|s'enfuit|s'élança|surgit|apparut|disparut)\b/i,
  /\b(grinçèrent|grinça|vibrait|tremblait|oscilla|vacilla)\b/i,
  /\b(suintait|filtrait|coulait|ruisselait|dégoulinait)\b/i,
  /\b(pendaient|s'écroulèrent|s'effondra|céda)\b/i,
  // Concrete nouns
  /\b(béton|pierre|métal|fer|acier|bois|verre|brique)\b/i,
  /\b(porte|mur|sol|plafond|fenêtre|couloir|escalier|cave)\b/i,
  /\b(couteau|lame|arme|barre|fusil|épée)\b/i,
  /\b(ampoule|lumière|lampe|bougie|flamme|lueur)\b/i,
  /\b(fil|fils|câble|tuyau|canalisation)\b/i,
  /\b(caisses?|carton|sac|boîte|coffre)\b/i,
  /\b(rat|souris|pigeon|insecte)\b/i,
  /\b(sang|sueur|larme|os|chair|peau|lèvre|doigts?|main|nuque)\b/i,
  /\b(eau|pluie|boue|poussière|cendre|fumée|brume)\b/i,
  /\b(ombres?|obscurité|ténèbres|pénombre)\b/i,
  /\b(froid|chaleur|souffle|vent|brise)\b/i,
  // Sensory qualities
  /\b(rouillée?|pourrie?s?|moisi|lépreux|dénudés?|percée?|sale)\b/i,
  /\b(visqueux|tranchant|brûlant|glacé|humide)\b/i,
  /\b(lourd|pesait|léger|épais|massif)\b/i,
  // Sound markers
  /\b(fracas|craquement|grincement|claquement|sifflement|murmure|écho)\b/i,
  /\b(silence|bruit|vacarme|grondement)\b/i,
  // Olfactory
  /\b(moisissure|rouille|cuivre|odeur|parfum|puanteur)\b/i,
  // Spatial
  /\b(entrebâillée?|interstice|fissure|joint|surface)\b/i,
  /\b(fond|coin|angle|recoin|seuil|encadrement)\b/i,
  // Motion
  /\b(lentement|brusquement|violemment|doucement)\b/i,
  /\b(d'un pas|plus fort|plus proche|jusqu'au)\b/i,
  // Nature/weather
  /\b(ciel|soleil|lune|nuage|orage|tonnerre|éclair)\b/i,
  /\b(arbre|herbe|feuille|fleur|terre|roche)\b/i,
  // Metaphor/literary concrete
  /\b(chape|plomb|spectre|silhouette|calligraphie|éclat)\b/i,
  /\b(projetant|rongeait|saignait|morcelé|fracturé)\b/i,
  // Additional sensory qualities
  /\b(rugueux|rêche|lisse|granuleux|velouté|spongieux|collant|gluant)\b/i,
  /\b(vivant|mort|inerte|vibrant|palpitant)\b/i,
  // Body parts
  /\b(bras|jambe|épaule|genou|poitrine|gorge|ventre|dos|front|tempe|cheville)\b/i,
  // Physical sensations
  /\b(frisson|vertige|nausée|spasme|crampe|brûlure|démangeaison|engourdissement)\b/i,
  // Breathing/physical
  /\b(inspira|expira|souffla|haleta|suffoqua|respira|soupira)\b/i,
  // Motion verbs extended
  /\b(remonta|descendit|gravit|escalada|enjamba|franchit|traversa|longea)\b/i,
  /\b(tendit|étendit|allongea|contracta|crispa|raidit)\b/i,
  // More verb conjugations (passé simple / imparfait)
  /\b(claquèrent|claquaient|grésilla|craqua|craquèrent|tinta|tintèrent)\b/i,
  /\b(pendait|pendaient|luisait|luisaient|suintait|filtrait)\b/i,
  // Concrete objects
  /\b(semelle|talon|chaussure|botte|gant|casque|sac)\b/i,
  /\b(poignée|serrure|verrou|chaîne|corde|nœud)\b/i,
  // Taste/texture
  /\b(sel|sucre|amertume|acidité|âcre|aigre|amer)\b/i,
  /\b(langue|palais|lèvres|salive|gorge)\b/i,
];

function sentenceHasUtility(s: string): boolean {
  return UTILITY_MARKERS.some(m => m.test(s));
}

function computeUtility(sentences: string[]): number {
  if (sentences.length === 0) return 0;
  let hits = 0;
  for (const s of sentences) { if (sentenceHasUtility(s)) hits++; }
  return (hits / sentences.length) * 100;
}

function computeVerbiagePenalty(_text: string, sentences: string[], swRatio: number) {
  let penalty = 0;
  let repeatCount = 0;
  if (swRatio > 0.60) penalty += (swRatio - 0.60) * 200;
  // Syntactic repeat: check both 1-word and 2-word openings
  if (sentences.length >= 3) {
    const openings1 = sentences.map(s => s.split(/\s+/)[0]?.toLowerCase() ?? '');
    const openings2 = sentences.map(s => s.split(/\s+/).slice(0, 2).join(' ').toLowerCase());
    const freq1 = new Map<string, number>();
    const freq2 = new Map<string, number>();
    for (const o of openings1) freq1.set(o, (freq1.get(o) ?? 0) + 1);
    for (const o of openings2) freq2.set(o, (freq2.get(o) ?? 0) + 1);
    // 1-word: threshold 4 (natural name/pronoun repetition is 3)
    for (const count of freq1.values()) {
      if (count >= 4) { repeatCount++; penalty += count * 5; }
    }
    // 2-word: threshold 3
    for (const count of freq2.values()) {
      if (count >= 3) { repeatCount++; penalty += count * 5; }
    }
  }
  // Abstract run: 4+ sentences without utility
  let abstractRun = 0;
  for (const s of sentences) {
    if (!sentenceHasUtility(s)) {
      abstractRun++;
      if (abstractRun >= 4) penalty += 10;
    } else { abstractRun = 0; }
  }
  return { penalty: Math.min(100, penalty), repeatCount };
}

/**
 * Compute Density score D ∈ [0, 100].
 * Does NOT use SII or any emotion layer (GENIUS-04 lint).
 */
export function computeDensity(text: string): DensityResult {
  if (!text || text.trim().length === 0) {
    return {
      D: 0, compression_proxy: 0, sentence_utility_ratio: 0, verbiage_penalty: 0,
      diagnostics: { stopword_ratio: 0, content_word_count: 0, total_word_count: 0,
        sentence_count: 0, repeat_pattern_count: 0 },
    };
  }
  const sentences = splitSentences(text);
  const compression = computeCompression(text);
  const utility = computeUtility(sentences);
  const verbiage = computeVerbiagePenalty(text, sentences, compression.swRatio);

  // All three terms [0,100]; weights sum to 1.0 → D ∈ [0,100].
  const raw = WEIGHTS.compression * compression.score
            + WEIGHTS.utility * utility
            + WEIGHTS.verbiage * (100 - verbiage.penalty);

  const D = Math.max(0, Math.min(100, raw));
  return {
    D, compression_proxy: compression.score, sentence_utility_ratio: utility,
    verbiage_penalty: verbiage.penalty,
    diagnostics: {
      stopword_ratio: compression.swRatio, content_word_count: compression.contentCount,
      total_word_count: compression.totalCount, sentence_count: sentences.length,
      repeat_pattern_count: verbiage.repeatCount,
    },
  };
}
