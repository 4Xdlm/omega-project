/**
 * OMEGA Book-Factory — SEAM SWEEP GLOBAL (BF-08) — NCR-SEAM-GLOBAL-002.
 *
 * Ordre Architecte : « les outils de contrôle doivent être INTRAITABLES et ne
 * pas être myopes ». Leçon : mes détecteurs précédents étaient des LISTES de
 * patterns connus — ils éteignaient des alarmes au cas par cas. Ce module pose
 * des DÉFINITIONS structurelles + un ARBRE de décision grammatical et balaie
 * TOUTES les coutures des chapitres.
 *
 * DÉTECTION (intraitable, zéro liste de cas) :
 *   - FRAGMENT PENDU : bloc dont le texte — après retrait des décorations de fin
 *     (markdown *_`, parenthèses, guillemets droits) — ne se termine PAS par une
 *     ponctuation de fin [.!?…»:] ; sous-classe DANGLING_FRAGMENT si le dernier
 *     token est tronqué (≤3 lettres minuscules hors liste légitime, ou amorce
 *     capitalisée d'un nom connu), sinon UNTERMINATED_BLOCK.
 *   - REPRISE DE COUTURE : dernière phrase d'un bloc ≈ PREMIÈRE phrase du bloc
 *     suivant (Jaccard mots ≥ seuil) — y compris reprise de BLOC ENTIER.
 *   - EXCEPTION : interruption stylisée reprise par « — … » au bloc suivant =
 *     effet VOULU, jamais signalée (sinon le résidu ne tomberait jamais à zéro
 *     sur un texte légitime).
 *
 * RÉPARATION (chaque action tracée, jamais silencieuse), arbre grammatical :
 *   - dernier mot = mot de CONTINUATION (préposition / article / conjonction /
 *     auxiliaire / possessif) ou amorce tronquée ⇒ c'est une TRONCATURE :
 *       · le bloc suivant le reprend  → REMOVE_FALSE_START
 *       · une virgule isole une proposition complète → CUT_AT_CLAUSE_COMMA
 *       · fragment court (≤ 8 mots), sans phrase complète → REMOVE_TRUNCATED_FRAGMENT
 *       · sinon (troncature longue substantielle) → NONE_MANUAL_REVIEW (préservé)
 *   - dernier mot TERMINAL-CAPABLE (nom / verbe / particule finale pas|plus|là…)
 *     ⇒ proposition complète sans ponctuation finale → ADD_TERMINAL_PERIOD
 *   - une phrase complète interne précède la troncature → CUT_TO_LAST_SENTENCE
 * Le critère PASS est un RE-SCAN à zéro résidu auto-réparable ; les rares
 * troncatures longues non complétables sans INVENTION (interdite) restent en
 * NONE_MANUAL_REVIEW, explicites et préservées (loi OMEGA : zéro suppression
 * silencieuse, zéro supposition).
 */

import { err, ok } from '../identity/identity-types.js';
import type { Result } from '../identity/identity-types.js';
import { isCompleteEnoughForPeriod, isCorpusTruncatedStem } from './semantic-gate.js';

export interface SeamFinding {
  readonly chapter: number;
  readonly paragraphIndex: number;
  readonly kind: 'DANGLING_FRAGMENT' | 'UNTERMINATED_BLOCK' | 'NEAR_DUP_RESUME';
  readonly excerpt: string;
}

export type SeamAction =
  | 'CUT_TO_LAST_SENTENCE'
  | 'REMOVE_ORPHAN_SENTENCE'
  | 'REMOVE_FALSE_START'
  | 'ADD_TERMINAL_PERIOD'
  | 'CUT_AT_CLAUSE_COMMA'
  | 'REMOVE_TRUNCATED_FRAGMENT'
  | 'STYLED_DIALOGUE_OK'
  | 'NONE_MANUAL_REVIEW';

export interface SeamRepair {
  readonly finding: SeamFinding;
  readonly action: SeamAction;
  readonly before: string;
  readonly after: string;
}

export interface SeamSweepResult {
  readonly findings: readonly SeamFinding[];
  readonly repairs: readonly SeamRepair[];
  readonly repairedText: string;
  /** RE-SCAN post-réparation — DOIT être 0 pour le PASS (vérifié par l'appelant). */
  readonly residualFindings: readonly SeamFinding[];
}

export type SeamError = { readonly code: 'EMPTY_TEXT'; readonly detail: string };

export interface SeamChapter { readonly chapter: number; readonly prose: string; }

const TERMINATORS = /[.!?…»:]$/u;
/** Décorations de FIN à ignorer pour le test de terminaison (markdown, guillemets
 *  droits, parenthèses fermantes) — JAMAIS le « » français (lui = terminateur). */
const TRAILING_DECOR = /[*_`"'”’)\]]+$/u;
/** Token final tronqué : 1-3 lettres minuscules isolées en fin de bloc. */
const TRUNCATED_TOKEN = /(?:^|[\s!?.…»])([a-zàâçéèêëîïôûùüÿ]{1,3})$/u;
/** Mots courts LÉGITIMES en fin de phrase française (jamais des troncatures). */
const LEGIT_SHORT_ENDINGS = new Set(['oui', 'non', 'si', 'ça', 'va', 'eu', 'su', 'vu', 'dû', 'pu', 'tôt', 'là', 'ici', 'or', 'car', 'mal', 'mer', 'feu', 'eau', 'air', 'pas', 'pin', 'sel', 'roc', 'cap', 'an', 'ans', 'as', 'os', 'nu', 'nus', 'fin', 'fil', 'vie', 'mot', 'toi', 'moi', 'lui', 'eux', 'nuit', 'jour', 'peu', 'bas', 'sud', 'est', 'nord']);
/** Mots de CONTINUATION : leur présence en fin de bloc PROUVE une troncature
 *  (la phrase grammaticale exige une suite). Universaux : prépositions, articles,
 *  conjonctions, auxiliaires, possessifs, formes élidées. */
const CONTINUATION_DEMAND = new Set([
  // prépositions
  'à', 'au', 'aux', 'de', 'du', 'des', 'en', 'dans', 'sur', 'sous', 'vers', 'chez', 'par', 'pour', 'avec', 'sans', 'entre', 'contre', 'selon', 'parmi', 'sauf', 'depuis', 'durant', 'pendant', 'jusque', 'jusqu', 'malgré', 'dès', 'devant', 'derrière',
  // articles / déterminants
  'le', 'la', 'les', 'un', 'une', 'ce', 'cet', 'cette', 'ces', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses', 'notre', 'votre', 'nos', 'vos', 'leur', 'leurs',
  // conjonctions / relatifs
  'et', 'ou', 'ni', 'mais', 'car', 'donc', 'or', 'que', 'qu', 'qui', 'dont', 'comme', 'si', 'quand', 'lorsque', 'puisque', 'parce', 'quoique',
  // auxiliaires (attendent un participe)
  'a', 'as', 'ai', 'ont', 'avons', 'avez', 'est', 'es', 'suis', 'sommes', 'êtes', 'sont', 'était', 'étaient', 'étais', 'sera', 'seront', 'avait', 'avaient', 'avais',
  // formes élidées tronquées
  'd', 'l', 'n', 'm', 't', 'j', 'c', 's',
]);
/** Particules / mots courts qui PEUVENT clore une phrase (négation, adverbes). */
const CLAUSE_FINAL_OK = new Set(['pas', 'plus', 'rien', 'jamais', 'là', 'ici', 'encore', 'trop', 'tout', 'tous', 'oui', 'non', 'peu', 'assez', 'ainsi', 'alors', 'enfin', 'déjà', 'aussi', 'mort', 'morte', 'vie', 'fin', 'tard', 'loin']);

const STYLED_RESUME_RE = /^\s*—?\s*(?:…|\.\.\.)/u;
const TERMINAL_TAG_RE = /,\s+(?:dit|répondit|répond|lança|murmura|souffla|reprit|ajouta|demanda|cria|chuchota|coupe|coupa|déclara)[ -](?:il|elle|ils|elles|[A-ZÀ-Ý][a-zà-ÿ]+)$/u;

const MAX_FRAGMENT_WORDS = 8;
const MIN_FALSESTART_CHARS = 12;

function stripDecor(t: string): string {
  return t.replace(TRAILING_DECOR, '').trimEnd();
}
function coreTerminated(block: string): boolean {
  return TERMINATORS.test(stripDecor(block.trimEnd()));
}
function wordsOf(s: string): readonly string[] {
  return s.trim().split(/\s+/u).filter((w) => w.length > 0);
}
/** Dernier mot alphabétique (sans apostrophe initiale élidée : « l'ombre »→« ombre »). */
function lastAlphaWord(core: string): string {
  const m = core.match(/([a-zàâçéèêëîïôûùüÿ]+)$/iu);
  return (m?.[1] ?? '').toLowerCase();
}
/** Token brut final (casse préservée) — pour détecter « Gasp », « G », « Y ». */
function lastRawToken(core: string): string {
  const m = core.match(/([\p{L}'’-]+)$/u);
  return m?.[1] ?? '';
}
function sentencesOf(block: string): readonly string[] {
  return block.split(/(?<=[.!?…»])\s+/u).map((s) => s.trim()).filter((s) => s.length > 0);
}
function jaccardWords(a: string, b: string): number {
  const norm = (s: string): Set<string> => new Set(s.toLowerCase().replace(/[«»".,;:!?…()—-]/gu, ' ').split(/\s+/u).filter((w) => w.length > 0));
  const A = norm(a);
  const B = norm(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter += 1;
  return inter / (A.size + B.size - inter);
}
function normWs(s: string): string {
  return s.normalize('NFC').replace(/\s+/gu, ' ').trim();
}

/** Amorce capitalisée tronquée d'un nom connu (« Gasp »←Gaspard, « Y »←Yvon). */
function isTruncatedNameStem(token: string, knownNames: readonly string[]): boolean {
  if (token.length === 1 && /^[A-ZÀ-Ý]$/u.test(token)) return true; // lettre isolée
  if (!/^[A-ZÀ-Ý][a-zà-ÿ]{0,3}$/u.test(token)) return false;
  const t = token.normalize('NFC');
  for (const name of knownNames) {
    const n = name.normalize('NFC');
    if (n.length > t.length && n.startsWith(t)) return true; // préfixe strict
  }
  return false;
}

function classifyKind(block: string, knownNames: readonly string[]): 'DANGLING_FRAGMENT' | 'UNTERMINATED_BLOCK' | null {
  const t = block.trimEnd();
  if (t.length === 0) return null;
  if (coreTerminated(t)) return null;
  const core = stripDecor(t);
  const m = TRUNCATED_TOKEN.exec(core);
  if (m?.[1] !== undefined && !LEGIT_SHORT_ENDINGS.has(m[1])) return 'DANGLING_FRAGMENT';
  if (isTruncatedNameStem(lastRawToken(core), knownNames)) return 'DANGLING_FRAGMENT';
  return 'UNTERMINATED_BLOCK';
}

/** Coupe à la DERNIÈRE ponctuation de fin de phrase ([.!?…»] suivie d'espace/fin). */
function cutToLastTerminator(block: string): string | null {
  const t = block.trimEnd();
  let best = -1;
  const re = /[.!?…»](?=\s|$)/gu;
  for (const m of t.matchAll(re)) best = m.index ?? best;
  if (best < 0) return null;
  const head = t.slice(0, best + 1).trimEnd();
  return head.length > 0 ? head : null;
}

interface DanglingDecision { action: SeamAction; text: string; }

/** Segment TERMINAL d'un bloc : ce qui suit la dernière ponctuation de fin de
 *  phrase — c'est LUI que l'ADD_PERIOD fermerait, c'est donc LUI qui doit
 *  prouver sa complétude (NCR-003 : « Elle s'arrête… du fauteuil. Elle peut
 *  voir » → le segment à juger est « Elle peut voir », pas le bloc entier). */
function trailingSegment(core: string): string {
  let best = -1;
  for (const m of core.matchAll(/[.!?…»](?=\s|$)/gu)) best = m.index ?? best;
  return best >= 0 ? core.slice(best + 1).trim() : core.trim();
}

/** Arbre de décision grammatical pour un bloc pendu `current`, suivant `next`. */
function repairDangling(current: string, next: string | undefined, knownNames: readonly string[], vocab: ReadonlyMap<string, number>): DanglingDecision {
  const core0 = stripDecor(current.trimEnd());

  // (0) interruption stylisée reprise par « — … » : effet voulu.
  if (next !== undefined && STYLED_RESUME_RE.test(next)) return { action: 'STYLED_DIALOGUE_OK', text: current };

  // (1) incise terminale « dit-il / coupe Garcia » : complète PAR CONSTRUCTION
  //     (inversion de tag de dialogue) — seul cas d'ADD_PERIOD non gaté.
  if (TERMINAL_TAG_RE.test(core0)) return { action: 'ADD_TERMINAL_PERIOD', text: `${core0}.` };

  // (2) virgule finale : « …de mentir, » → « …de mentir. » — UNIQUEMENT si le
  //     segment terminal PROUVE sa complétude (NCR-003 : jamais de maquillage).
  if (/,$/u.test(core0)) {
    const noComma = core0.replace(/,$/u, '').trimEnd();
    if (!CONTINUATION_DEMAND.has(lastAlphaWord(noComma)) && !isTruncatedNameStem(lastRawToken(noComma), knownNames)
      && isCompleteEnoughForPeriod(trailingSegment(noComma), vocab)) {
      return { action: 'ADD_TERMINAL_PERIOD', text: `${noComma}.` };
    }
  }

  const lw = lastAlphaWord(core0);
  const raw = lastRawToken(core0);
  const isContinuation = CONTINUATION_DEMAND.has(lw) || isTruncatedNameStem(raw, knownNames) ||
    isCorpusTruncatedStem(raw, vocab) ||
    (/^[a-zàâçéèêëîïôûùüÿ]{1,3}$/u.test(lw) && !LEGIT_SHORT_ENDINGS.has(lw) && !CLAUSE_FINAL_OK.has(lw));

  if (isContinuation) {
    // (3a) faux-départ : le bloc suivant reprend intégralement le fragment.
    if (next !== undefined && normWs(next).startsWith(normWs(current)) && normWs(current).length >= MIN_FALSESTART_CHARS) {
      return { action: 'REMOVE_FALSE_START', text: '' };
    }
    // (3b) une virgule isole une proposition COMPLÈTE avant la troncature.
    const lastComma = core0.lastIndexOf(',');
    if (lastComma > 0) {
      const head = core0.slice(0, lastComma).trimEnd();
      const hLw = lastAlphaWord(head);
      if (wordsOf(head).length >= 4 && !CONTINUATION_DEMAND.has(hLw) && !isTruncatedNameStem(lastRawToken(head), knownNames)) {
        return { action: 'CUT_AT_CLAUSE_COMMA', text: `${head}.` };
      }
    }
    // (3c) phrase complète interne avant la troncature.
    const cut = cutToLastTerminator(current);
    if (cut !== null && wordsOf(cut).length >= 3) return { action: 'CUT_TO_LAST_SENTENCE', text: cut };
    // (3d) fragment court sans rien à sauver → retiré, tracé.
    if (wordsOf(core0).length <= MAX_FRAGMENT_WORDS) return { action: 'REMOVE_TRUNCATED_FRAGMENT', text: '' };
    // (3e) troncature LONGUE substantielle → revue humaine (jamais d'invention).
    return { action: 'NONE_MANUAL_REVIEW', text: current };
  }

  // (4) dernier mot TERMINAL-CAPABLE : un point n'est ajouté QUE si le SEGMENT
  //     TERMINAL prouve sa complétude (≥4 mots, pas de stem corpus, guillemets
  //     équilibrés — NCR-003). « Un point final ne répare pas une phrase
  //     amputée. Il la maquille. » Sinon : coupe / retrait tracé / revue.
  const innerCut = cutToLastTerminator(current);
  if (isCompleteEnoughForPeriod(trailingSegment(core0), vocab)) {
    if (innerCut !== null && innerCut.length < core0.length * 0.5 && wordsOf(core0.slice(innerCut.length)).length <= 2) {
      return { action: 'CUT_TO_LAST_SENTENCE', text: innerCut };
    }
    return { action: 'ADD_TERMINAL_PERIOD', text: `${core0}.` };
  }
  // Segment terminal sémantiquement OUVERT — interdiction de maquiller :
  if (innerCut !== null && wordsOf(innerCut).length >= 3) {
    return { action: 'CUT_TO_LAST_SENTENCE', text: innerCut }; // on garde les phrases complètes
  }
  if (wordsOf(core0).length <= MAX_FRAGMENT_WORDS) {
    return { action: 'REMOVE_TRUNCATED_FRAGMENT', text: '' }; // fragment ouvert court : retiré, tracé
  }
  return { action: 'NONE_MANUAL_REVIEW', text: current };
}

/** Balaye et répare TOUTES les coutures d'un livre chapitré. Pur, déterministe. */
export function seamSweep(
  chapters: readonly SeamChapter[],
  nearDupThreshold = 0.6,
  knownNames: readonly string[] = [],
  /** Vocabulaire du livre (semantic-gate) : stems tronqués prouvés par corpus
   *  + gate de complétude avant ADD_PERIOD. Vide ⇒ seuls les contrôles
   *  structurels (≥4 mots, guillemets) s'appliquent. */
  vocab: ReadonlyMap<string, number> = new Map<string, number>(),
): Result<SeamSweepResult, SeamError> {
  if (chapters.length === 0) return err({ code: 'EMPTY_TEXT', detail: 'aucun chapitre' });

  const scan = (chs: readonly SeamChapter[]): SeamFinding[] => {
    const findings: SeamFinding[] = [];
    for (const ch of chs) {
      const blocks = ch.prose.split(/\r?\n\s*\r?\n/u).filter((b) => b.trim().length > 0);
      blocks.forEach((block, bi) => {
        const next = blocks[bi + 1];
        const styled = next !== undefined && STYLED_RESUME_RE.test(next);
        const kind = classifyKind(block, knownNames);
        if (kind !== null && !styled) {
          findings.push({ chapter: ch.chapter, paragraphIndex: bi, kind, excerpt: stripDecor(block.trimEnd()).slice(-90).replace(/\s+/gu, ' ') });
        }
        if (next !== undefined && !styled) {
          const last = sentencesOf(block).at(-1);
          const firstNext = sentencesOf(next)[0]; // PREMIÈRE phrase du suivant (= couture)
          if (last !== undefined && firstNext !== undefined && wordsOf(last).length >= 4 && jaccardWords(last, firstNext) >= nearDupThreshold) {
            findings.push({ chapter: ch.chapter, paragraphIndex: bi, kind: 'NEAR_DUP_RESUME', excerpt: `« ${last.slice(0, 55)} » ≈ « ${firstNext.slice(0, 55)} »` });
          }
        }
      });
    }
    return findings;
  };

  const initial = scan(chapters);
  const repairs: SeamRepair[] = [];

  const repairedChapters = chapters.map((ch) => {
    const blocks = ch.prose.split(/\r?\n\s*\r?\n/u).filter((b) => b.trim().length > 0);
    const out: string[] = [];
    blocks.forEach((block, bi) => {
      let current = block.trimEnd();
      const next = blocks[bi + 1];
      const finding = (kind: SeamFinding['kind']): SeamFinding => ({ chapter: ch.chapter, paragraphIndex: bi, kind, excerpt: stripDecor(current).slice(-90).replace(/\s+/gu, ' ') });

      // — phase A : fragment pendu —
      const kind = classifyKind(current, knownNames);
      if (kind !== null) {
        const d = repairDangling(current, next, knownNames, vocab);
        repairs.push({ finding: finding(kind), action: d.action, before: stripDecor(current).slice(-90), after: d.text === '' ? '(retiré — tracé)' : stripDecor(d.text).slice(-90) });
        current = d.text;
      }

      // — phase B : reprise de couture (bloc encore présent ; jamais sur reprise stylisée) —
      const styledNext = next !== undefined && STYLED_RESUME_RE.test(next);
      if (current.length > 0 && next !== undefined && !styledNext) {
        const curN = normWs(current);
        const nextN = normWs(next);
        if (nextN.startsWith(curN) && curN.length >= MIN_FALSESTART_CHARS) {
          repairs.push({ finding: finding('NEAR_DUP_RESUME'), action: 'REMOVE_FALSE_START', before: current.slice(-90), after: '(bloc entier repris au suivant — retiré)' });
          current = '';
        } else {
          const last = sentencesOf(current).at(-1);
          const firstNext = sentencesOf(next)[0];
          if (last !== undefined && firstNext !== undefined && wordsOf(last).length >= 4 && jaccardWords(last, firstNext) >= nearDupThreshold) {
            const headEnd = current.lastIndexOf(last);
            const head = headEnd > 0 ? current.slice(0, headEnd).trimEnd() : '';
            if (head.length > 0) {
              repairs.push({ finding: finding('NEAR_DUP_RESUME'), action: 'REMOVE_ORPHAN_SENTENCE', before: last.slice(0, 90), after: '(orpheline retirée — la version du bloc suivant porte la suite)' });
              current = head;
            } else {
              repairs.push({ finding: finding('NEAR_DUP_RESUME'), action: 'REMOVE_FALSE_START', before: current.slice(-90), after: '(bloc entier dupliqué au suivant — retiré)' });
              current = '';
            }
          }
        }
      }

      if (current.trim().length > 0) out.push(current);
    });
    return { chapter: ch.chapter, prose: out.join('\n\n') };
  });

  const repairedText = repairedChapters.map((c) => `## Chapitre ${c.chapter}\n\n${c.prose}`).join('\n\n');
  const residual = scan(repairedChapters);

  return ok({ findings: initial, repairs, repairedText, residualFindings: residual });
}
