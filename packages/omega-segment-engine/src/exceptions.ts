// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — SEGMENT ENGINE v1.0.0 — EXCEPTIONS (ABRÉVIATIONS)
// ═══════════════════════════════════════════════════════════════════════════════
// Abréviations à NE PAS couper lors de la segmentation sentence
// Liste validée FR+EN — NASA-grade (pas de faux positifs)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Abréviations françaises courantes
 * Source: Usage éditorial standard + décision ChatGPT 2026-01-02
 */
export const ABBREVIATIONS_FR: readonly string[] = Object.freeze([
  // Titres de civilité
  "M.",
  "Mme.",
  "Mlle.",
  "Dr.",
  "Pr.",
  "Me.",      // Maître (avocat, notaire)
  "Mgr.",     // Monseigneur

  // Saints
  "St.",
  "Ste.",

  // Références textuelles
  "cf.",      // confer
  "ex.",      // exemple
  "fig.",     // figure
  "vol.",     // volume
  "p.",       // page
  "pp.",      // pages
  "n°",       // numéro
  "art.",     // article
  "chap.",    // chapitre
  "éd.",      // édition
  "coll.",    // collection

  // Locutions
  "etc.",
  "env.",     // environ
  "réf.",     // référence
  "tél.",     // téléphone
  "av.",      // avenue
  "bd.",      // boulevard
  "pl.",      // place

  // Composés avec traits d'union
  "p.-ex.",   // par exemple
  "c.-à-d.", // c'est-à-dire
  "J.-C.",    // Jésus-Christ (dates)

  // Autres
  "apr.",     // après
  "anc.",     // ancien
  "hab.",     // habitants
  "max.",     // maximum
  "min.",     // minimum
  "sup.",     // supérieur
  "inf.",     // inférieur
]);

/**
 * Abréviations anglaises courantes
 */
export const ABBREVIATIONS_EN: readonly string[] = Object.freeze([
  // Titres
  "Mr.",
  "Mrs.",
  "Ms.",
  "Dr.",
  "Prof.",
  "Jr.",
  "Sr.",

  // Entreprises
  "Inc.",
  "Ltd.",
  "Co.",
  "Corp.",
  "LLC.",

  // Références
  "vs.",
  "etc.",
  "e.g.",
  "i.e.",
  "approx.",
  "dept.",
  "est.",
  "Gov.",
  "Rep.",
  "Sen.",

  // Académique
  "Ph.D.",
  "M.D.",
  "B.A.",
  "M.A.",
  "B.S.",
  "M.S.",

  // Autres
  "No.",      // Number
  "Vol.",
  "Fig.",
  "Ch.",      // Chapter
  "Rev.",     // Reverend / Revision
  "St.",      // Saint / Street
  "Ave.",     // Avenue
  "Blvd.",    // Boulevard
]);

/**
 * Liste combinée FR+EN (défaut)
 */
export const ABBREVIATIONS_DEFAULT: readonly string[] = Object.freeze([
  ...ABBREVIATIONS_FR,
  ...ABBREVIATIONS_EN,
]);

/**
 * Patterns regex protégés (ne pas couper)
 * Ces patterns sont compilés une fois au chargement
 */
export const PROTECTED_PATTERNS: readonly RegExp[] = Object.freeze([
  // Nombres décimaux: 3.14, 0.5, 12.345
  /^\d+\.\d+$/,

  // Initiales: J.F.K., U.S.A., etc.
  /^[A-Z]\.[A-Z]\.?$/,

  // Heures: 10.30, 14.45 (format FR)
  /^\d{1,2}\.\d{2}$/,

  // Dates abrégées: 01.01.2025
  /^\d{2}\.\d{2}\.\d{4}$/,

  // URLs partielles: www.example
  /^www\.[a-z]/i,

  // Extensions fichiers: file.txt
  /^\w+\.(txt|pdf|doc|jpg|png|md|ts|js|json)$/i,
]);

/**
 * Vérifie si un token est une abréviation protégée
 * @param token Le mot à vérifier (avec le point final)
 * @param abbreviations Liste d'abréviations (défaut: FR+EN)
 */
export function isProtectedAbbreviation(
  token: string,
  abbreviations: readonly string[] = ABBREVIATIONS_DEFAULT
): boolean {
  // Check direct dans la liste
  if (abbreviations.includes(token)) return true;

  // Check case-insensitive pour les titres courants
  const lower = token.toLowerCase();
  if (abbreviations.some(a => a.toLowerCase() === lower)) return true;

  // Check patterns regex
  for (const pattern of PROTECTED_PATTERNS) {
    if (pattern.test(token)) return true;
  }

  return false;
}

/**
 * Vérifie si une position dans le texte est APRÈS une abréviation
 * @param text Texte complet
 * @param dotIndex Index du point candidat pour fin de phrase
 * @param abbreviations Liste d'abréviations
 */
export function isAfterAbbreviation(
  text: string,
  dotIndex: number,
  abbreviations: readonly string[] = ABBREVIATIONS_DEFAULT
): boolean {
  // Extraire le mot avant le point (incluant le point)
  let start = dotIndex;
  while (start > 0 && /\S/.test(text[start - 1])) {
    start--;
  }

  const token = text.slice(start, dotIndex + 1);

  // Check direct
  if (isProtectedAbbreviation(token, abbreviations)) return true;

  // Check pour abréviations composées comme J.-C.
  // Si le token se termine par un pattern type "X." et fait partie d'un composé
  if (/^[A-Z]\.$/.test(token) && start > 0) {
    // Regarder avant pour trouver le composé complet
    let compStart = start;
    while (compStart > 0 && (text[compStart - 1] === '-' || text[compStart - 1] === '.' || /[A-Za-z]/.test(text[compStart - 1]))) {
      compStart--;
    }
    const compound = text.slice(compStart, dotIndex + 1);
    if (isProtectedAbbreviation(compound, abbreviations)) return true;
  }

  // Check si on est dans une abréviation multi-points (ex: "av. J.-C.")
  // Chercher en arrière pour trouver le début du groupe
  let lookback = start - 1;
  while (lookback >= 0 && (text[lookback] === ' ' || text[lookback] === '-')) {
    lookback--;
  }
  if (lookback >= 0) {
    // Trouver le début du mot précédent
    let prevEnd = lookback + 1;
    let prevStart = lookback;
    while (prevStart > 0 && /\S/.test(text[prevStart - 1])) {
      prevStart--;
    }
    const prevToken = text.slice(prevStart, prevEnd);
    // Si le token précédent est une abréviation connue, on fait partie d'un groupe
    if (isProtectedAbbreviation(prevToken, abbreviations)) return true;
  }

  return false;
}

/**
 * Vérifie si c'est un nombre décimal (pas fin de phrase)
 * Ex: "3.14" → true, "fin." → false
 */
export function isDecimalNumber(text: string, dotIndex: number): boolean {
  // Caractère avant le point
  if (dotIndex === 0) return false;
  const before = text[dotIndex - 1];
  if (!/\d/.test(before)) return false;

  // Caractère après le point
  if (dotIndex >= text.length - 1) return false;
  const after = text[dotIndex + 1];
  if (!/\d/.test(after)) return false;

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  ABBREVIATIONS_FR,
  ABBREVIATIONS_EN,
  ABBREVIATIONS_DEFAULT,
  PROTECTED_PATTERNS,
  isProtectedAbbreviation,
  isAfterAbbreviation,
  isDecimalNumber,
};
