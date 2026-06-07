/**
 * OMEGA Book-Factory — SEMANTIC GATE (BF-08) — NCR-SEMANTIC-TRUNCATION-003.
 *
 * Refus tribunal (ChatGPT) du closeout SEAM-002 : « Un point final ne répare pas
 * une phrase amputée. Il la maquille. OMEGA doit détecter les trous de SENS, pas
 * seulement les trous de ponctuation. » Preuves confirmées sur le canonique
 * 7464c4bb : « Elle peut voir. », « Léna ouvrit. », « Le visage. », « «. »,
 * « — Tu parles de culp. », « « Qui l'a fait taire. », fin du livre sur citation
 * OUVERTE — et 756 « pour 737 » (19 guillemets orphelins systémiques).
 *
 * MÉCANISMES (zéro lexique externe — le corpus est sa propre autorité) :
 *
 * 1. STEM TRONQUÉ DATA-DRIVEN : un mot final qui (a) n'apparaît qu'une fois dans
 *    tout le livre ET (b) est le PRÉFIXE STRICT d'un mot du livre plus long de
 *    ≥3 lettres (« culp » → « culpabilité ») = troncature PROUVÉE par le corpus.
 *    Généralise « Gasp »→Gaspard sans liste et sans limite de longueur.
 *
 * 2. COMPLÉTUDE AVANT ADD_PERIOD : un point n'est ajouté QUE si le bloc a ≥ 4
 *    mots, ne finit pas sur un stem tronqué, et a ses guillemets équilibrés.
 *    Sinon ⇒ coupe / retrait tracé / revue — JAMAIS de maquillage.
 *
 * 3. GUILLEMETS : « orphelin = bloc déséquilibré. Si le contenu cité se termine
 *    par un terminateur ⇒ CLOSE_QUOTE (le DIALOGUE licencie l'ellipse : « Le
 *    navire de marchandises. » est une réplique elliptique légitime — la
 *    narration, elle, ne licencie rien). « dégénéré (« «. ») ⇒ retrait tracé.
 *
 * 4. FIN DE LIVRE : le dernier bloc doit être terminé + équilibré + ≥ 4 mots +
 *    non dégénéré — une « vraie scène », pas une citation ouverte.
 */

import { err, ok } from '../identity/identity-types.js';
import type { Result } from '../identity/identity-types.js';
import type { SeamChapter } from './seam-sweep.js';

export interface SemanticFinding {
  readonly chapter: number;
  readonly paragraphIndex: number;
  readonly kind: 'DEGENERATE_QUOTE' | 'UNBALANCED_QUOTE' | 'TRUNCATED_STEM';
  readonly excerpt: string;
}

export type SemanticAction = 'CLOSE_QUOTE' | 'REMOVE_DEGENERATE_QUOTE' | 'CUT_TO_LAST_SENTENCE' | 'REMOVE_TRUNCATED_FRAGMENT' | 'NONE_MANUAL_REVIEW';

export interface SemanticRepair {
  readonly finding: SemanticFinding;
  readonly action: SemanticAction;
  readonly before: string;
  readonly after: string;
}

export interface SemanticGateResult {
  readonly findings: readonly SemanticFinding[];
  readonly repairs: readonly SemanticRepair[];
  readonly repairedChapters: readonly SeamChapter[];
  readonly repairedText: string;
  /** RE-SCAN post-réparation — DOIT être 0 pour le PASS. */
  readonly residualFindings: readonly SemanticFinding[];
}

export type SemanticError = { readonly code: 'EMPTY_TEXT'; readonly detail: string };

const TERMINATORS = /[.!?…»:]$/u;
const WORD_RE = /[a-zàâçéèêëîïôûùüÿA-ZÀÂÇÉÈÊËÎÏÔÛÙÜŸ][\w'’àâçéèêëîïôûùüÿÀ-Ü-]*/gu;

/** Vocabulaire du livre : mot (minuscule) → fréquence. Le corpus = l'autorité. */
export function buildBookVocabulary(fullText: string): ReadonlyMap<string, number> {
  const vocab = new Map<string, number>();
  for (const m of fullText.normalize('NFC').matchAll(WORD_RE)) {
    const w = m[0].toLowerCase();
    vocab.set(w, (vocab.get(w) ?? 0) + 1);
  }
  return vocab;
}

/** Mot final = troncature PROUVÉE par le corpus : hapax (freq ≤ 1) ET préfixe
 *  strict d'un mot du livre plus long de ≥ 3 lettres (« culp »→« culpabilité »). */
export function isCorpusTruncatedStem(word: string, vocab: ReadonlyMap<string, number>): boolean {
  const w = word.normalize('NFC').toLowerCase();
  if (w.length < 3) return false; // les 1-2 lettres sont déjà couverts par le seam-sweep
  if (!/^[a-zàâçéèêëîïôûùüÿ]+$/u.test(w)) return false;
  if ((vocab.get(w) ?? 0) > 1) return false; // mot établi du livre — pas un stem
  for (const candidate of vocab.keys()) {
    // La complétion d'une troncature est un MOT SIMPLE (« culpabilité ») —
    // jamais un composé hyphéné/élidé. Sans ce filtre, « dite » (participe
    // légitime, hapax) serait flagué via « dites-moi » (faux positif RÉEL
    // attrapé ch.37 : il amputait une phrase correcte du manuscrit).
    if (!/^[a-zàâçéèêëîïôûùüÿ]+$/u.test(candidate)) continue;
    if (candidate.length >= w.length + 3 && candidate.startsWith(w) && (vocab.get(candidate) ?? 0) >= 2) {
      return true;
    }
  }
  return false;
}

function lastWordOf(s: string): string {
  const m = s.match(/([\p{L}'’-]+)[^\p{L}]*$/u);
  return m?.[1] ?? '';
}
function wordCount(s: string): number {
  return s.trim().split(/\s+/u).filter((w) => /\p{L}/u.test(w)).length;
}
function quoteDelta(s: string): number {
  let open = 0;
  let close = 0;
  for (const ch of s) {
    if (ch === '«') open += 1;
    else if (ch === '»') close += 1;
  }
  return open - close;
}
const DEGENERATE_QUOTE_RE = /^«\s*[.!?…]?\s*$/u;

/** COMPLÉTUDE pour autoriser un ADD_PERIOD (NCR-003, critère ChatGPT n°3) :
 *  ≥ 4 mots, pas de stem tronqué final, guillemets équilibrés, non dégénéré. */
export function isCompleteEnoughForPeriod(core: string, vocab: ReadonlyMap<string, number>): boolean {
  const t = core.trim();
  if (DEGENERATE_QUOTE_RE.test(t)) return false;
  if (wordCount(t) < 4) return false;
  if (quoteDelta(t) !== 0) return false;
  if (isCorpusTruncatedStem(lastWordOf(t), vocab)) return false;
  return true;
}

/** FIN DE LIVRE complète : terminée + équilibrée + ≥ 4 mots + non dégénérée. */
export function isBookEndComplete(lastBlock: string): boolean {
  const t = lastBlock.trimEnd();
  return TERMINATORS.test(t) && quoteDelta(t) === 0 && wordCount(t) >= 4 && !DEGENERATE_QUOTE_RE.test(t.trim());
}

function sentencesOf(block: string): readonly string[] {
  return block.split(/(?<=[.!?…»])\s+/u).map((s) => s.trim()).filter((s) => s.length > 0);
}

/** Balaye et répare les trous de SENS d'un livre chapitré. Pur, déterministe. */
export function semanticGate(chapters: readonly SeamChapter[], fullTextForVocab?: string): Result<SemanticGateResult, SemanticError> {
  if (chapters.length === 0) return err({ code: 'EMPTY_TEXT', detail: 'aucun chapitre' });
  const vocab = buildBookVocabulary(fullTextForVocab ?? chapters.map((c) => c.prose).join('\n\n'));

  const scan = (chs: readonly SeamChapter[]): SemanticFinding[] => {
    const findings: SemanticFinding[] = [];
    for (const ch of chs) {
      const blocks = ch.prose.split(/\r?\n\s*\r?\n/u).filter((b) => b.trim().length > 0);
      blocks.forEach((block, bi) => {
        const t = block.trim();
        const push = (kind: SemanticFinding['kind']): void => {
          findings.push({ chapter: ch.chapter, paragraphIndex: bi, kind, excerpt: t.slice(-90).replace(/\s+/gu, ' ') });
        };
        if (DEGENERATE_QUOTE_RE.test(t)) { push('DEGENERATE_QUOTE'); return; }
        if (quoteDelta(t) !== 0) push('UNBALANCED_QUOTE');
        if (isCorpusTruncatedStem(lastWordOf(t.replace(TERMINATORS, '')), vocab)) push('TRUNCATED_STEM');
      });
    }
    return findings;
  };

  const initial = scan(chapters);
  const repairs: SemanticRepair[] = [];

  const repairedChapters: SeamChapter[] = chapters.map((ch) => {
    const blocks = ch.prose.split(/\r?\n\s*\r?\n/u).filter((b) => b.trim().length > 0);
    const out: string[] = [];
    blocks.forEach((block, bi) => {
      let current = block.trimEnd();
      const t = current.trim();
      const finding = (kind: SemanticFinding['kind']): SemanticFinding => ({ chapter: ch.chapter, paragraphIndex: bi, kind, excerpt: t.slice(-90).replace(/\s+/gu, ' ') });

      /* — « dégénéré (« «. ») : aucun contenu, retrait tracé — */
      if (DEGENERATE_QUOTE_RE.test(t)) {
        repairs.push({ finding: finding('DEGENERATE_QUOTE'), action: 'REMOVE_DEGENERATE_QUOTE', before: t, after: '(guillemet dégénéré retiré — tracé)' });
        return;
      }

      /* — stem tronqué prouvé corpus (« culp. ») : couper la phrase amputée — */
      const lw = lastWordOf(t.replace(TERMINATORS, ''));
      if (isCorpusTruncatedStem(lw, vocab)) {
        const sentences = sentencesOf(current);
        const keep = sentences.slice(0, -1).join(' ').trimEnd();
        if (keep.length > 0 && TERMINATORS.test(keep)) {
          repairs.push({ finding: finding('TRUNCATED_STEM'), action: 'CUT_TO_LAST_SENTENCE', before: t.slice(-90), after: keep.slice(-90) });
          current = keep;
        } else if (wordCount(t) <= 8) {
          repairs.push({ finding: finding('TRUNCATED_STEM'), action: 'REMOVE_TRUNCATED_FRAGMENT', before: t.slice(-90), after: '(fragment au mot amputé retiré — tracé)' });
          return;
        } else {
          repairs.push({ finding: finding('TRUNCATED_STEM'), action: 'NONE_MANUAL_REVIEW', before: t.slice(-90), after: t.slice(-90) });
        }
      }

      /* — guillemets déséquilibrés — */
      const delta = quoteDelta(current);
      if (delta > 0) {
        // « ouvert jamais fermé. Le DIALOGUE licencie l'ellipse : si le contenu
        // cité se termine par un terminateur ⇒ fermeture « … » (zéro mot inventé).
        if (TERMINATORS.test(current.trimEnd()) && wordCount(current.slice(current.lastIndexOf('«') + 1)) >= 2) {
          const after = `${current.trimEnd()} »`;
          repairs.push({ finding: finding('UNBALANCED_QUOTE'), action: 'CLOSE_QUOTE', before: current.slice(-90), after: after.slice(-90) });
          current = after;
        } else {
          // Contenu cité lui-même tronqué : couper à la dernière phrase ÉQUILIBRÉE.
          const sentences = sentencesOf(current);
          let acc = '';
          for (const s of sentences) {
            const tryAcc = acc.length > 0 ? `${acc} ${s}` : s;
            if (quoteDelta(tryAcc) === 0) acc = tryAcc;
            else break;
          }
          if (acc.length > 0 && TERMINATORS.test(acc)) {
            repairs.push({ finding: finding('UNBALANCED_QUOTE'), action: 'CUT_TO_LAST_SENTENCE', before: current.slice(-90), after: acc.slice(-90) });
            current = acc;
          } else if (wordCount(current) <= 8) {
            repairs.push({ finding: finding('UNBALANCED_QUOTE'), action: 'REMOVE_TRUNCATED_FRAGMENT', before: current.slice(-90), after: '(citation tronquée retirée — tracé)' });
            return;
          } else {
            repairs.push({ finding: finding('UNBALANCED_QUOTE'), action: 'NONE_MANUAL_REVIEW', before: current.slice(-90), after: current.slice(-90) });
          }
        }
      } else if (delta < 0) {
        // » sans « : retirer le fermant orphelin (zéro contenu perdu).
        const after = current.replace(/\s*»/u, '');
        repairs.push({ finding: finding('UNBALANCED_QUOTE'), action: 'CLOSE_QUOTE', before: current.slice(-90), after: after.slice(-90) });
        current = after;
      }

      if (current.trim().length > 0) out.push(current);
    });
    return { chapter: ch.chapter, prose: out.join('\n\n') };
  });

  const repairedText = repairedChapters.map((c) => `## Chapitre ${c.chapter}\n\n${c.prose}`).join('\n\n');
  const residual = scan(repairedChapters);

  return ok({ findings: initial, repairs, repairedChapters, repairedText, residualFindings: residual });
}
