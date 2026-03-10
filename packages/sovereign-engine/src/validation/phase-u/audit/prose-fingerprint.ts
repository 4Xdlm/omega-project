/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN ENGINE — PROSE FINGERPRINT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: validation/phase-u/audit/prose-fingerprint.ts
 * Version: 1.0.0 (U-ROSETTE-14 Phase 1A)
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Calcul pur TypeScript — zéro appel API.
 * Produit un fingerprint structurel d'un texte en prose française.
 * Utilisé pour l'audit de génération amont (H3, H4, H5).
 *
 * Invariants :
 *   INV-FP-01 : Déterministe — même prose → même fingerprint
 *   INV-FP-02 : Zéro état global — fonction pure
 *   INV-FP-03 : Résistance aux entrées vides ou malformées
 *   INV-FP-04 : avg_sentence_length en mots (pas en caractères)
 *   INV-FP-05 : sentence_length_variance = variance population (pas échantillon)
 *   INV-FP-06 : attack_types liste les 5 types reconnus uniquement
 *   INV-FP-07 : image_density = nb_images / nb_phrases (images = syntagmes métaphoriques détectés)
 *   INV-FP-08 : abstract_ratio = mots_abstraits / mots_total (liste de référence interne)
 *   INV-FP-09 : repetition_score ∈ [0, 1] — 0 = aucune répétition, 1 = tout répété
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Types d'attaque de phrase reconnus.
 * INV-FP-06 : 5 types exclusifs.
 */
export type AttackType =
  | 'nominal'      // "La nuit tombait..."
  | 'verbal'       // "Il ouvrit..."
  | 'participial'  // "Penché sur...", "Traversant..."
  | 'adverbial'    // "Lentement, il..."
  | 'other';       // tout le reste

export interface ProseFingerprintResult {
  /** Nombre de phrases dans la prose */
  readonly sentence_count: number;
  /** Longueur moyenne des phrases en mots (INV-FP-04) */
  readonly avg_sentence_length: number;
  /** Variance population de la longueur des phrases (INV-FP-05) */
  readonly sentence_length_variance: number;
  /** Distribution des types d'attaque (INV-FP-06) */
  readonly attack_distribution: Record<AttackType, number>;
  /** Densité d'images : nb_images_détectées / nb_phrases (INV-FP-07) */
  readonly image_density: number;
  /** Ratio de mots abstraits / mots total (INV-FP-08) */
  readonly abstract_ratio: number;
  /** Score de répétition locale [0,1] (INV-FP-09) */
  readonly repetition_score: number;
  /** Nombre de parenthétiques (incises, tirets, parenthèses) */
  readonly parenthetical_count: number;
  /** Nombre total de mots */
  readonly word_count: number;
}

// ── Constantes ────────────────────────────────────────────────────────────────

/**
 * Mots abstraits de référence en français littéraire.
 * Utilisés pour INV-FP-08 (abstract_ratio).
 * Liste calibrée sur le corpus OMEGA.
 */
const ABSTRACT_WORDS = new Set([
  'temps', 'silence', 'lumière', 'ombre', 'peur', 'douleur', 'joie', 'tristesse',
  'colère', 'amour', 'haine', 'espoir', 'désespoir', 'vie', 'mort', 'vérité',
  'mensonge', 'beauté', 'laideur', 'force', 'faiblesse', 'courage', 'lâcheté',
  'liberté', 'prison', 'destin', 'hasard', 'chance', 'malheur', 'bonheur',
  'souvenir', 'oubli', 'rêve', 'cauchemar', 'réalité', 'illusion', 'mystère',
  'secret', 'vide', 'néant', 'infini', 'éternité', 'instant', 'moment',
  'sentiment', 'émotion', 'pensée', 'idée', 'conscience', 'âme', 'esprit',
  'chair', 'sang', 'nuit', 'jour', 'aube', 'crépuscule', 'ténèbres', 'clarté',
  'chaleur', 'froid', 'douceur', 'brutalité', 'tendresse', 'violence',
  'solitude', 'présence', 'absence', 'attente', 'fuite', 'retour',
]);

/**
 * Indicateurs d'images / métaphores (syntagmes courants en prose littéraire française).
 * INV-FP-07 : détection heuristique, non exhaustive.
 */
const IMAGE_INDICATORS = [
  /\bcomme\b/i,                        // comparaison explicite
  /\btel(?:le?)?\b/i,                  // comparaison tel/telle
  /\bsemblait?\b/i,                    // comparaison implicite
  /\bressemblait?\b/i,
  /\bd['']un(?:e)?\b.{0,30}\b(?:gris|blanc|noir|lourd|léger|dur|mou|chaud|froid)\b/i,
  /\bavait\b.{0,30}\b(?:grain|poids|texture|odeur|saveur|couleur)\b/i, // métaphore sensorielle
  /\bportait\b.{0,30}\b(?:marque|trace|empreinte|signe)\b/i,
];

/**
 * Marqueurs de participiales en début de phrase.
 */
const PARTICIPIAL_STARTERS = /^(?:penché|traversant|regardant|tenant|portant|appuyé|assis|debout|levant|baissant|souriant|frissonnant|tremblant|marchant|courant|fuyant|cherchant|trouvant|voyant|entendant|sentant|sachant|voulant|pouvant|devant|ayant|étant|s['']étant|se\s+\w+ant)\b/i;

/**
 * Marqueurs d'attaque adverbiale.
 */
const ADVERBIAL_STARTERS = /^(?:lentement|rapidement|soudain|soudainement|brusquement|doucement|silencieusement|brutalement|tendrement|délicatement|prudemment|finalement|pourtant|cependant|néanmoins|ainsi|alors|ensuite|puis|enfin|déjà|encore|toujours|jamais|parfois|souvent|rarement)\b/i;

// ── Segmentation ──────────────────────────────────────────────────────────────

/**
 * Segmente la prose en phrases.
 * Séparateurs : ., !, ?, … (et leurs combinaisons avec guillemets/parenthèses).
 * INV-FP-01 : déterministe.
 */
function splitSentences(prose: string): string[] {
  // Normalise les ellipses et les points de suspension unicode
  const normalized = prose
    .replace(/\u2026/g, '...')
    .replace(/\r\n/g, '\n');

  // Split sur les fins de phrases (., !, ?, ...) suivies d'un espace ou fin de chaîne
  const raw = normalized
    .split(/(?<=[.!?…]+(?:[»"'\)\]]*)?)\s+/)
    .map(s => s.trim())
    .filter(s => s.length >= 3);  // Éliminer les fragments trop courts

  return raw;
}

/**
 * Tokenise une phrase en mots (ne compte pas la ponctuation).
 */
function countWords(text: string): number {
  return text
    .replace(/[.,;:!?…«»"'""''()\[\]{}\-–—]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0)
    .length;
}

// ── Classifieur d'attaque ─────────────────────────────────────────────────────

/**
 * Détermine le type d'attaque d'une phrase.
 * INV-FP-06.
 */
function classifyAttack(sentence: string): AttackType {
  const trimmed = sentence.trim();

  // Participiale : commence par un participe présent ou passé
  if (PARTICIPIAL_STARTERS.test(trimmed)) return 'participial';

  // Adverbiale : commence par un adverbe ou connecteur
  if (ADVERBIAL_STARTERS.test(trimmed)) return 'adverbial';

  // Nominale : commence par un déterminant ou nom (article/démonstratif/possessif)
  if (/^(?:le|la|les|un|une|des|du|au|aux|ce|cette|ces|mon|ma|mes|son|sa|ses|leur|leurs|l[''])\b/i.test(trimmed)) {
    return 'nominal';
  }

  // Verbale : commence par un pronom sujet ou un verbe directement
  if (/^(?:il|elle|ils|elles|je|tu|nous|vous|on|ça|cela|ceci)\b/i.test(trimmed)) {
    return 'verbal';
  }

  return 'other';
}

// ── Image density ─────────────────────────────────────────────────────────────

/**
 * Détecte si une phrase contient une image / métaphore.
 * Heuristique basée sur IMAGE_INDICATORS.
 * INV-FP-07.
 */
function hasImage(sentence: string): boolean {
  return IMAGE_INDICATORS.some(pattern => pattern.test(sentence));
}

// ── Abstract ratio ────────────────────────────────────────────────────────────

/**
 * Calcule le ratio de mots abstraits dans la prose.
 * INV-FP-08.
 */
function computeAbstractRatio(prose: string): number {
  const words = prose
    .toLowerCase()
    .replace(/[.,;:!?…«»"'""''()\[\]{}\-–—]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);

  if (words.length === 0) return 0;

  const abstractCount = words.filter(w => ABSTRACT_WORDS.has(w)).length;
  return Math.round((abstractCount / words.length) * 1000) / 1000;
}

// ── Repetition score ──────────────────────────────────────────────────────────

/**
 * Calcule un score de répétition locale [0,1].
 * Méthode : fenêtre glissante de 5 phrases — compte les bigrammes qui réapparaissent.
 * INV-FP-09.
 */
function computeRepetitionScore(sentences: string[]): number {
  if (sentences.length < 2) return 0;

  // Extraire les bigrammes de chaque phrase
  const getBigrams = (s: string): Set<string> => {
    const words = s.toLowerCase()
      .replace(/[.,;:!?…«»"'""''()\[\]{}\-–—]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
    const bigrams = new Set<string>();
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.add(`${words[i]}|${words[i + 1]}`);
    }
    return bigrams;
  };

  const sentenceBigrams = sentences.map(getBigrams);

  let totalRepeated = 0;
  let totalPairs = 0;
  const windowSize = 5;

  for (let i = 0; i < sentenceBigrams.length; i++) {
    const windowEnd = Math.min(i + windowSize, sentenceBigrams.length);
    for (let j = i + 1; j < windowEnd; j++) {
      totalPairs++;
      const intersection = [...sentenceBigrams[i]].filter(b => sentenceBigrams[j].has(b));
      if (intersection.length > 0) totalRepeated++;
    }
  }

  if (totalPairs === 0) return 0;
  return Math.round((totalRepeated / totalPairs) * 1000) / 1000;
}

// ── Parenthetical count ───────────────────────────────────────────────────────

/**
 * Compte les incises, parenthèses et tirets d'incise.
 */
function countParentheticals(prose: string): number {
  const parens = (prose.match(/\([^)]+\)/g) ?? []).length;
  const dashes  = (prose.match(/—[^—]+—/g)  ?? []).length;
  const commaIncises = (prose.match(/,\s*[^,]+,\s*(?=[a-z])/g) ?? []).length;
  return parens + dashes + commaIncises;
}

// ── Point d'entrée principal ──────────────────────────────────────────────────

/**
 * Calcule le fingerprint structurel d'une prose.
 * INV-FP-01..09.
 *
 * @param prose - Texte en prose française (brut, sans balises HTML)
 * @returns ProseFingerprintResult — objet immuable
 */
export function computeProseFingerprint(prose: string): ProseFingerprintResult {
  // INV-FP-03 : résistance aux entrées vides
  if (!prose || prose.trim().length === 0) {
    return {
      sentence_count: 0,
      avg_sentence_length: 0,
      sentence_length_variance: 0,
      attack_distribution: { nominal: 0, verbal: 0, participial: 0, adverbial: 0, other: 0 },
      image_density: 0,
      abstract_ratio: 0,
      repetition_score: 0,
      parenthetical_count: 0,
      word_count: 0,
    };
  }

  const sentences = splitSentences(prose);
  const n = sentences.length;

  // Longueurs en mots
  const lengths = sentences.map(countWords);
  const wordCount = lengths.reduce((a, b) => a + b, 0);

  // INV-FP-04 : longueur moyenne
  const avgLen = n > 0 ? wordCount / n : 0;

  // INV-FP-05 : variance population
  const variance = n > 0
    ? lengths.reduce((acc, l) => acc + (l - avgLen) ** 2, 0) / n
    : 0;

  // INV-FP-06 : distribution des attaques
  const attackDist: Record<AttackType, number> = {
    nominal: 0, verbal: 0, participial: 0, adverbial: 0, other: 0,
  };
  for (const s of sentences) {
    attackDist[classifyAttack(s)]++;
  }

  // INV-FP-07 : image density
  const imageCount = sentences.filter(hasImage).length;
  const imageDensity = n > 0 ? imageCount / n : 0;

  // INV-FP-08 : abstract ratio
  const abstractRatio = computeAbstractRatio(prose);

  // INV-FP-09 : repetition score
  const repetitionScore = computeRepetitionScore(sentences);

  // Parenthétiques
  const parentheticalCount = countParentheticals(prose);

  return {
    sentence_count:            n,
    avg_sentence_length:       Math.round(avgLen * 100) / 100,
    sentence_length_variance:  Math.round(variance * 100) / 100,
    attack_distribution:       attackDist,
    image_density:             Math.round(imageDensity * 1000) / 1000,
    abstract_ratio:            abstractRatio,
    repetition_score:          repetitionScore,
    parenthetical_count:       parentheticalCount,
    word_count:                wordCount,
  };
}
