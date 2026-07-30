/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA — DÉCOUPEUR DE PHRASES CANONIQUE (FRANÇAIS)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: phonetic/sentence-splitter-fr.ts
 * Invariant: INV-SPLIT-FR
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * RAISON D'ÊTRE (audit 2026-07-30) — deux implémentations divergentes coexistaient :
 *
 *   A. book-factory/src/v2/v2-conductor.ts:33   split /(?<=[.!?…»])\s+(?!»)/
 *   B. style-emergence/src/metrics/cadence-analyzer.ts:9   split /(?<=[.!?])\s+/
 *
 * Écart mesuré sur le corpus FR-thriller (20 romans, ~165 000 phrases) :
 *   n −5,1 % · médiane +1 · moyenne +1,12 · P90 +2 · max 247 vs 746.
 * Changer d'implémentation déplace la cible de genre d'un point entier de médiane.
 *
 * LES DEUX SONT FAUTIVES, différemment :
 *   A coupe sur « … » alors qu'en français les points de suspension sont le plus
 *     souvent INTRA-phrastiques (« Elle hésita… puis elle sortit. » = 1 phrase, pas 2),
 *     et elle éclate les incises dialoguées (« Attends ! » cria-t-elle).
 *   B compte « : » et « — » comme des mots, et rate des découpages
 *     (une « phrase » de 746 mots observée sur epub brut).
 *
 * Ce module ne choisit pas entre A et B : il implémente la règle correcte.
 *
 * RÈGLE DE DÉCOUPAGE — un terminateur ferme une phrase SI ET SEULEMENT SI il est
 * suivi d'une amorce de phrase (majuscule, chiffre, guillemet ouvrant, tiret cadratin).
 * Ce seul critère résout les trois cas ci-dessus sans liste de cas particuliers :
 *   « Elle hésita… puis »        → « puis » minuscule  → PAS de coupure ✓
 *   « Attends ! » cria-t-elle    → « cria » minuscule  → PAS de coupure ✓
 *   « Il partit. « Attends »     → « A » majuscule     → coupure ✓
 * Les abréviations françaises (M., Mme, etc., av. J.-C.) sont protégées séparément,
 * car « M. Dupont » présente bien une majuscule après le point.
 *
 * COMPTAGE DE MOTS — un mot est un token contenant au moins une lettre ou un chiffre.
 * La ponctuation isolée (« : », « — », « » ») n'est pas un mot.
 *
 * 100 % CALC — déterministe — zéro LLM — zéro dépendance.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

/** Terminateurs de phrase candidats. `…` inclus mais soumis à la règle d'amorce. */
const TERMINATORS = '.!?…';

/**
 * Abréviations françaises JAMAIS terminales : elles introduisent obligatoirement
 * ce qui suit, donc la majuscule suivante n'ouvre pas une phrase.
 * Sans cette protection, « M. Dupont entra » serait découpé en deux.
 *
 * DISTINCTION CRITIQUE (révélée par le test C2) — « etc. », « cit. », « suiv. »
 * sont FRÉQUEMMENT terminales (« des armes, des dossiers, etc. Puis le silence. »)
 * et ne doivent donc PAS figurer ici : les protéger produirait des phrases fusionnées.
 * Une abréviation n'est protégée que si elle ne peut pas clore une phrase.
 * Comparaison en minuscules, accents inclus.
 */
const ABBREVIATIONS: readonly string[] = [
  // titres et civilités — jamais terminaux (toujours suivis d'un nom)
  'm', 'mm', 'mme', 'mmes', 'mlle', 'mlles', 'dr', 'drs', 'pr', 'me', 'mes',
  'st', 'ste', 'sts', 'stes', 'mgr', 'cap', 'gén', 'col', 'lt', 'sgt',
  // références — toujours suivies de leur objet
  'cf', 'ibid', 'op', 'al', 'env', 'ex', 'p', 'pp', 'chap',
  'vol', 'éd', 'éds', 'art', 'fig', 'réf', 'trad', 'av', 'apr', 'j.-c',
  'n', 'no', 'nos', 'bis', 'ter',
];

/**
 * Caractères pouvant AMORCER une phrase, avant la première lettre :
 * guillemets ouvrants, tirets de dialogue, parenthèses, italiques markdown.
 */
const OPENERS = '«"“‘\'(\\[*_—–-';

// ═══════════════════════════════════════════════════════════════════════════════
// PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Vrai si le texte qui précède `index` (exclu) se termine par une abréviation connue.
 * `index` pointe sur le caractère suivant immédiatement le point.
 */
function endsWithAbbreviation(text: string, index: number): boolean {
  // Remonter le mot qui précède le point (le point est en index-1).
  let start = index - 1;
  while (start > 0 && /[\p{L}\p{N}.\-]/u.test(text[start - 1] ?? '')) start--;
  const token = text.slice(start, index - 1).toLowerCase();
  if (token.length === 0) return false;
  // Initiale isolée : « J. K. Rowling », « A. Dupont ».
  if (token.length === 1 && /\p{L}/u.test(token)) return true;
  return ABBREVIATIONS.includes(token);
}

/**
 * Vrai si une amorce de phrase commence à `index` (après avoir sauté les espaces).
 * Amorce = majuscule, chiffre, ou ouvrant suivi d'une majuscule/chiffre.
 */
function startsNewSentence(text: string, index: number): boolean {
  let i = index;
  while (i < text.length && /\s/u.test(text[i] ?? '')) i++;
  // Sauter les ouvrants (guillemets, tirets, parenthèses…), au plus quelques-uns.
  let guard = 0;
  while (i < text.length && OPENERS.includes(text[i] ?? '') && guard < 4) { i++; guard++; while (i < text.length && /\s/u.test(text[i] ?? '')) i++; }
  const ch = text[i];
  if (ch === undefined) return false;
  return /\p{Lu}/u.test(ch) || /\p{N}/u.test(ch);
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Découpe une prose française en phrases.
 * INV-SPLIT-FR-01 : toute phrase retournée est non vide après trim.
 * INV-SPLIT-FR-02 : la concaténation préserve tous les caractères non-espaces.
 */
export function splitSentencesFr(prose: string): readonly string[] {
  const out: string[] = [];
  let start = 0;
  let i = 0;
  while (i < prose.length) {
    const ch = prose[i] ?? '';
    if (!TERMINATORS.includes(ch)) { i++; continue; }
    // Absorber une série de terminateurs (« ?! », « ... », « ?… »).
    let end = i;
    while (end < prose.length && TERMINATORS.includes(prose[end] ?? '')) end++;
    // Absorber une éventuelle ponctuation fermante collée (« », ), ], " ).
    let close = end;
    while (close < prose.length && '»"”’)\\]*_'.includes(prose[close] ?? '')) close++;

    const isDotOnly = prose.slice(i, end) === '.';
    if (isDotOnly && endsWithAbbreviation(prose, i + 1)) { i = end; continue; }
    if (!startsNewSentence(prose, close)) { i = end; continue; }

    const piece = prose.slice(start, close).trim();
    if (piece.length > 0) out.push(piece);
    start = close;
    i = close;
  }
  const tail = prose.slice(start).trim();
  if (tail.length > 0) out.push(tail);
  return out;
}

/**
 * Compte les mots d'un segment : tokens contenant au moins une lettre ou un chiffre.
 * INV-SPLIT-FR-03 : la ponctuation isolée n'est jamais comptée comme un mot.
 */
export function countWordsFr(segment: string): number {
  return segment.split(/\s+/u).filter((t) => /[\p{L}\p{N}]/u.test(t)).length;
}

/**
 * Série des longueurs de phrase (en mots) — l'entrée canonique de toute mesure
 * rythmique : nPVI, Varco, Gini, autocorrélation, profil de queue.
 * INV-SPLIT-FR-04 : aucune longueur nulle dans la série retournée.
 */
export function sentenceLengthsFr(prose: string): readonly number[] {
  return splitSentencesFr(prose).map(countWordsFr).filter((n) => n > 0);
}
