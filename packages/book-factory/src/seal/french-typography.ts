/**
 * OMEGA — A2 : NORMALISATION TYPOGRAPHIQUE FRANCAISE AU SCELLEMENT.
 * CONCEPT-FRENCH-TYPOGRAPHY-SEAL-001. Ratifie Architecte 2026-08-02.
 *
 * ==========================================================================
 * DEUX NORMALISATIONS DISTINCTES — NE JAMAIS LES CONFONDRE
 * ==========================================================================
 *   1. Normalisation de MESURE (existante, ailleurs) : replie U+2019 vers
 *      l'apostrophe ASCII AVANT de compter, pour que les regex voient le meme
 *      caractere quelle que soit la source. Cf. sensor-extractor.ts:246,
 *      trajectory-analyzer.ts:96. Elle ne reecrit JAMAIS un livre.
 *   2. Normalisation EDITORIALE (ce module) : produit la typographie francaise
 *      d'un texte imprime, au SCELLEMENT uniquement. Sens INVERSE de la n.1.
 *
 *   Les appliquer dans le meme pipeline serait une boucle. La n.1 s'applique aux
 *   corpus avant comparaison ; la n.2 a la sortie avant livraison.
 *
 * ==========================================================================
 * FAIT MESURE QUI MOTIVE CE MODULE
 * ==========================================================================
 *   Apostrophe typographique : 656,6/10k dans 19 romans publies, 6,1 chez OMEGA.
 *   Apostrophe droite : 0,9 vs 631,7. Inversion totale — texture "web".
 *   Confirme sur prose FRAICHE par le gel A0 (163 contre 1490 sur 21 generations) :
 *   c'est le generateur, pas un artefact de patch.
 *
 * ==========================================================================
 * GARANTIES (exigees avant commit, prouvees par les tests)
 * ==========================================================================
 *   INV-TYPO-01  IDEMPOTENCE : normalize(normalize(x)) === normalize(x)
 *   INV-TYPO-02  ZONES PROTEGEES : code, URL, chemins, identifiants intacts
 *   INV-TYPO-03  CONSERVATION : aucun mot ajoute, supprime ou reordonne
 *   INV-TYPO-04  REVERT : denormalize restitue les classes ASCII d'origine
 *   INV-TYPO-05  COMPTEURS : chaque regle rapporte son nombre d'applications
 *
 * NOTE D'IMPLEMENTATION : tout caractere non-ASCII est ecrit en echappement
 * \\uXXXX. Le fichier reste ASCII pur — un caractere invisible (insecable,
 * sentinelle) copie tel quel est indebuggable. Un NUL s'est deja glisse ici
 * par copie directe : d'ou cette regle.
 */

export type TypoRuleId =
  | 'APOSTROPHE'
  | 'QUOTES_PAIRED'
  | 'ELLIPSIS'
  | 'DIALOGUE_DASH'
  | 'THIN_NBSP_BEFORE'
  | 'NBSP_INSIDE_GUILLEMETS';

export interface TypoRuleCount {
  readonly rule: TypoRuleId;
  readonly applied: number;
}

export interface TypoResult {
  readonly text: string;
  readonly counts: readonly TypoRuleCount[];
  readonly totalApplied: number;
  /** Nombre de zones protegees (code/URL/chemins) laissees intactes. */
  readonly protectedSpans: number;
}

/** U+202F espace fine insecable — devant ; ! ? en typographie francaise soignee. */
const NNBSP = ' ';
/** U+00A0 espace insecable — devant : et a l'interieur des chevrons. */
const NBSP = ' ';
/** U+2019 apostrophe typographique. */
const APOS = '’';
/** U+00AB / U+00BB chevrons. */
const LAQUO = '«';
const RAQUO = '»';
/** U+2026 points de suspension. */
const ELL = '…';
/** U+2014 cadratin. */
const EMDASH = '—';
/** Toute espace horizontale susceptible de preceder une ponctuation. */
const SPACES = '[ \\u00a0\\u202f]';
/** Sentinelle de masquage : zone d'usage prive U+E000, absente de toute prose. */
const SENTINEL = '';

/** Zones jamais touchees : blocs de code, code inline, URLs, chemins, fichiers,
 *  identifiants techniques (snake_case). */
const PROTECTED_RE = new RegExp(
  [
    '```[\\s\\S]*?```',
    '`[^`\\n]*`',
    'https?://\\S+',
    '(?:[A-Za-z]:)?[\\\\/][\\w.\\-\\\\/]+',
    '\\b\\w+\\.(?:ts|js|json|md|py|ps1|csv|html|txt)\\b',
    '\\b\\w*_\\w+\\b',
  ].join('|'),
  'gu',
);

function mask(text: string): { masked: string; spans: readonly string[] } {
  const spans: string[] = [];
  const masked = text.replace(PROTECTED_RE, (m) => {
    spans.push(m);
    return `${SENTINEL}${spans.length - 1}${SENTINEL}`;
  });
  return { masked, spans };
}

function unmask(masked: string, spans: readonly string[]): string {
  return masked.replace(
    new RegExp(`${SENTINEL}(\\d+)${SENTINEL}`, 'gu'),
    (_m, i: string) => spans[Number(i)] ?? '',
  );
}

function countOf(text: string, re: RegExp): number {
  return (text.match(re) ?? []).length;
}

/**
 * Normalisation editoriale francaise. Idempotente. Ne touche jamais les zones protegees.
 *
 * Ordre des regles (il compte : l'ellipse avant l'espacement, les guillemets avant
 * leur espace interieur) :
 *   1. APOSTROPHE              apostrophe ASCII lexicale -> U+2019
 *   2. ELLIPSIS                trois points EXACTEMENT -> U+2026
 *   3. QUOTES_PAIRED           paire de guillemets droits -> chevrons
 *   4. DIALOGUE_DASH           tiret ASCII en tete de ligne -> cadratin
 *   5. THIN_NBSP_BEFORE        espace avant ; ! ? -> fine ; avant : -> insecable
 *   6. NBSP_INSIDE_GUILLEMETS  insecable a l'interieur des chevrons
 */
export function normalizeFrenchTypography(input: string): TypoResult {
  const { masked, spans } = mask(input);
  let t = masked;
  const counts: TypoRuleCount[] = [];

  // 1. APOSTROPHE — uniquement entre lettres (lexicale). Un guillemet simple
  //    isole (citation, dialogue anglais) n'est pas une apostrophe francaise.
  const aposRe = /(\p{L})'(?=\p{L})/gu;
  const nApos = countOf(t, aposRe);
  t = t.replace(aposRe, `$1${APOS}`);
  counts.push({ rule: 'APOSTROPHE', applied: nApos });

  // 2. ELLIPSIS — groupe de TROIS points exactement. `\.{3,}` serait faux :
  //    "puis...." (ellipse + point final) perdrait son point. Bug observe.
  const ellRe = /\.{3}/gu;
  const nEll = countOf(t, ellRe);
  t = t.replace(ellRe, ELL);
  counts.push({ rule: 'ELLIPSIS', applied: nEll });

  // 3. QUOTES_PAIRED — appariement strict : un guillemet orphelin n'est jamais
  //    transforme (on ne devine pas l'intention de l'auteur).
  const quoteRe = /"([^"\n]*)"/gu;
  const nQuote = countOf(t, quoteRe);
  t = t.replace(quoteRe, `${LAQUO}$1${RAQUO}`);
  counts.push({ rule: 'QUOTES_PAIRED', applied: nQuote });

  // 4. DIALOGUE_DASH — tiret ASCII en tete de ligne uniquement.
  const dashRe = /^([ \t]*)-{1,2}([ \t]+)/gmu;
  const nDash = countOf(t, dashRe);
  t = t.replace(dashRe, `$1${EMDASH}$2`);
  counts.push({ rule: 'DIALOGUE_DASH', applied: nDash });

  // 5. THIN_NBSP_BEFORE — la ponctuation est CAPTUREE, jamais mise en lookahead :
  //    un quantificateur `*` suivi d'un lookahead produit un SECOND match VIDE a
  //    la position de la ponctuation, donc une double insertion. Bug observe.
  let nBefore = 0;
  t = t.replace(new RegExp(`${SPACES}*([;!?])`, 'gu'), (m: string, p: string) => {
    const target = `${NNBSP}${p}`;
    if (m === target) return m;
    nBefore += 1;
    return target;
  });
  //    `:` — seulement s'il y avait deja une espace, sinon `12:30` serait touche.
  t = t.replace(new RegExp(`${SPACES}+(:)`, 'gu'), (m: string, p: string) => {
    const target = `${NBSP}${p}`;
    if (m === target) return m;
    nBefore += 1;
    return target;
  });
  counts.push({ rule: 'THIN_NBSP_BEFORE', applied: nBefore });

  // 6. NBSP_INSIDE_GUILLEMETS
  let nInside = 0;
  t = t.replace(new RegExp(`${LAQUO}${SPACES}*`, 'gu'), (m: string) => {
    const target = `${LAQUO}${NBSP}`;
    if (m === target) return m;
    nInside += 1;
    return target;
  });
  t = t.replace(new RegExp(`${SPACES}*${RAQUO}`, 'gu'), (m: string) => {
    const target = `${NBSP}${RAQUO}`;
    if (m === target) return m;
    nInside += 1;
    return target;
  });
  counts.push({ rule: 'NBSP_INSIDE_GUILLEMETS', applied: nInside });

  return {
    text: unmask(t, spans),
    counts,
    totalApplied: counts.reduce((a, c) => a + c.applied, 0),
    protectedSpans: spans.length,
  };
}

/**
 * Revert des classes transformees (INV-TYPO-04). Sert au diff et au rollback.
 * Les espaces insecables introduits redeviennent ordinaires ; ceux qui n'existaient
 * pas ne peuvent pas etre devines — c'est pourquoi le DIFF, pas le revert seul,
 * fait foi comme preuve de reversibilite.
 */
export function denormalizeFrenchTypography(input: string): string {
  return input
    .replace(new RegExp(APOS, 'gu'), "'")
    .replace(new RegExp(ELL, 'gu'), '...')
    .replace(new RegExp(`${LAQUO}${SPACES}?`, 'gu'), '"')
    .replace(new RegExp(`${SPACES}?${RAQUO}`, 'gu'), '"')
    .replace(new RegExp(`^([ \\t]*)${EMDASH}([ \\t]+)`, 'gmu'), '$1-$2')
    .replace(/[  ]/gu, ' ');
}

export interface TypoDiffEntry {
  readonly index: number;
  readonly before: string;
  readonly after: string;
  readonly context: string;
}

/** Diff caractere par caractere, borne, pour l'evidence pack. */
export function typoDiff(before: string, after: string, maxEntries = 200): readonly TypoDiffEntry[] {
  const out: TypoDiffEntry[] = [];
  let i = 0;
  let j = 0;
  while (i < before.length && j < after.length && out.length < maxEntries) {
    if (before[i] === after[j]) {
      i += 1;
      j += 1;
      continue;
    }
    out.push({
      index: i,
      before: before.slice(i, i + 3),
      after: after.slice(j, j + 3),
      context: after.slice(Math.max(0, j - 24), j + 24).replace(/\n/gu, '⏎'),
    });
    let k = 1;
    while (k < 6 && i + k < before.length && j + k < after.length) {
      if (before[i + k] === after[j + k]) break;
      k += 1;
    }
    i += k;
    j += k;
  }
  return out;
}

/** Conservation lexicale (INV-TYPO-03) : la suite des mots doit etre inchangee. */
export function wordsPreserved(before: string, after: string): boolean {
  const w = (s: string): readonly string[] =>
    denormalizeFrenchTypography(s)
      .replace(/[^\p{L}\p{N}']/gu, ' ')
      .split(/\s+/u)
      .filter((x) => x.length > 0);
  const a = w(before);
  const b = w(after);
  return a.length === b.length && a.every((x, idx) => x === b[idx]);
}
