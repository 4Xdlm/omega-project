/**
 * OMEGA — LANG_PURITY : détecte les résidus ANGLAIS / franglais dans la prose FR.
 *
 * Trou de gate fermé (relecture 3-IA 2026-06-09) : la certification machine du V3
 * a déclaré « clean » un texte contenant `carefully`, `during`, `blending`,
 * `bothering`, `weighted`, `conjugates` — qu'un lecteur humain voit immédiatement.
 * SYNTAX/SEAM/SEMANTIC/NARRATIVE ne couvrent PAS la contamination lexicale anglaise.
 *
 * MÉCANISME : denylist de mots ANGLAIS qui n'ont AUCUN homographe français — on
 * n'inclut JAMAIS but/or/car/son/part/pour/pain/fin/mine/page/sale/lit… (vrais mots
 * FR). Les mots accentués français ne matchent pas (regex ASCII + \b). Faux-positif
 * ≈ 0 par construction ; extensible.
 * LIMITE : un emprunt assumé (« parking », « week-end ») n'est pas visé ; un mot
 * anglais hors denylist passe (denylist, pas modèle de langue). CE QUI CASSERAIT :
 * un personnage anglophone citant volontairement de l'anglais (→ exception SPAN_LOCK).
 */

/** Mots ANGLAIS sans homographe français (sûrs à flagger dans une prose FR). */
export const EN_DENYLIST: ReadonlySet<string> = new Set([
  // connecteurs / fonction
  'the', 'and', 'with', 'from', 'that', 'this', 'they', 'them', 'their', 'there', 'then', 'than',
  'where', 'when', 'what', 'which', 'while', 'during', 'through', 'though', 'although', 'because',
  'however', 'therefore', 'instead', 'whether', 'toward', 'towards', 'behind', 'beyond', 'beneath',
  'without', 'within', 'against', 'between', 'around', 'about', 'into', 'onto', 'upon', 'among',
  // quantifieurs / adverbes
  'something', 'nothing', 'everything', 'anything', 'someone', 'anyone', 'everyone',
  'suddenly', 'slowly', 'carefully', 'quietly', 'gently', 'slightly', 'barely', 'merely', 'simply',
  'actually', 'finally', 'really', 'very', 'enough', 'already', 'maybe', 'perhaps', 'almost', 'quite',
  // verbes / gérondifs / participes
  // NB : 'standing' EXCLU = emprunt français (« un certain standing ») — faux-positif
  // capturé sur le V3 réel avant gate dure. Idem 'parking/planning/camping/smoking'…
  'blending', 'bothering', 'weighted', 'breathing', 'watching', 'looking', 'holding',
  'walking', 'running', 'smiling', 'nodding', 'whispering', 'whispered', 'feeling', 'staring',
  'thinking', 'knowing', 'trying', 'turning', 'reaching', 'waiting', 'speaking', 'conjugates',
  'would', 'could', 'should', 'might', 'must', 'will', 'shall', 'doing', 'going', 'being', 'having',
]);

export interface LangResidual { readonly word: string; readonly index: number; readonly context: string }

/** Liste les résidus anglais (mots de la denylist) dans la prose. Déterministe. */
export function scanEnglishResiduals(prose: string): readonly LangResidual[] {
  const out: LangResidual[] = [];
  const re = /\b[A-Za-z]{2,}\b/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(prose)) !== null) {
    const w = m[0].toLowerCase();
    if (EN_DENYLIST.has(w)) {
      out.push({ word: m[0], index: m.index, context: prose.slice(Math.max(0, m.index - 35), m.index + m[0].length + 35).replace(/\s+/gu, ' ').trim() });
    }
  }
  return out;
}

export const isLangClean = (prose: string): boolean => scanEnglishResiduals(prose).length === 0;
