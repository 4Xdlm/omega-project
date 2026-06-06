/**
 * OMEGA Book-Factory — C9.3 COHÉRENCE NIVEAU ARC (BF-08, ADVISORY).
 *
 * Trois contrôles TRANS-chapitres :
 *   - IDENTITY DRIFT : prénoms distincts associés au même RÔLE dans la prose
 *     (cas réel 60k : le gardien nommé tantôt « Thomas », tantôt « Henri ») —
 *     sans événement ALIAS/REVEAL enregistré, c'est une dérive, pas un twist ;
 *   - FONCTION DE CHAPITRE : classification proxy CALC (REVELATION/ACTION/
 *     CONFRONTATION/TRANSITION/REDITE) par densités lexicales mesurables —
 *     EXPERIMENTAL, sert à repérer les chapitres candidats à fusion/coupe ;
 *   - MYSTERY LEDGER : chaque seed du plan → chapitre planté, rappels, payoff
 *     (dernière occurrence portant un marqueur de révélation) — UNPAID est un
 *     résultat, jamais un silence.
 *
 * MÉCANISME : co-occurrence locale rôle↔prénom (fenêtre de caractères), comptages
 * normalisés, chevauchement de trigrammes de contenu pour la nouveauté. Tous tris
 * observables via compareStrings (doctrine C1 — jamais localeCompare).
 * LIMITES : la co-occurrence n'est pas la coréférence — un prénom proche du mot
 * « gardien » peut être un interlocuteur (faux positif possible, ADVISORY) ; la
 * classification de fonction est un PROXY de surface, pas un jugement littéraire.
 * CE QUI CASSERAIT : un roman où le rôle est porté par périphrase (« l'homme du
 * phare ») — lexique de rôles extensible par injection.
 */

import type {
  ArcCoherenceReport, ChapterFunction, ChapterFunctionRow, CoherenceResult,
  IdentityDriftSignal, SeedLedgerRow,
} from './coherence-types.js';
import { err, ok, compareStrings } from '../identity/identity-types.js';

export interface ArcChapter { readonly chapter: number; readonly prose: string; }

/** Rôles-clés par défaut (décor Phare) — injectables. */
export const DEFAULT_ROLE_LEXICON: readonly string[] = ['gardien', 'maire', 'curé', 'pharmacien', 'patron', 'capitaine'];

/** Marqueurs de révélation (fonction REVELATION + payoff du ledger). */
const REVELATION_RE = /\b(avou[ae]|avoua|révèle|révéla|comprend\s+que|comprit\s+que|la\s+vérité|découvre\s+que|découvrit\s+que|apprend\s+que|apprit\s+que|reconnaît|reconnut|c[''](?:était|est)\s+(?:lui|elle)\s+qui|enfin\s+su)\b/iu;

/** Verbes d'action forte (fonction ACTION). */
const ACTION_RE = /\b(court|courut|frappe|frappa|brise|brisa|saisit|fuit|fuyait|s[''](?:effondre|effondra)|arrache|arracha|bouscule|bousculé|empoigne|claqua|jaillit|bondit|se\s+jette|se\s+jeta|hurle|hurla|se\s+débat|lutte|luttait)\b/u;

/** Marqueurs de confrontation (fonction CONFRONTATION). */
const CONFRONT_RE = /\b(accuse|accusa|menace|menaça|exige|exigea|affronte|affronta|se\s+dresse|défie|défia|coupe\s+la\s+parole|hausse\s+le\s+ton|colère|rage|furieu[xs]e?)\b/u;

const STOP = new Set(['le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'à', 'au', 'aux', 'en', 'dans', 'sur', 'que', 'qui', 'ne', 'pas', 'se', 'sa', 'son', 'ses', 'il', 'elle', 'était', 'avait']);

function contentTrigrams(prose: string): ReadonlySet<string> {
  const words = prose.normalize('NFC').toLowerCase().split(/\s+/u).filter((w) => w.length > 0);
  const grams = new Set<string>();
  for (let i = 0; i + 2 < words.length; i++) {
    const tri = [words[i], words[i + 1], words[i + 2]];
    if (tri.every((w) => w !== undefined && STOP.has(w))) continue;
    grams.add(tri.join(' '));
  }
  return grams;
}

export interface ArcCoherenceOptions {
  readonly roles?: readonly string[];
  /** Prénoms LÉGITIMES par rôle (depuis le plan/registry) — exclus de la dérive. */
  readonly legitimateNames?: ReadonlyMap<string, readonly string[]>;
  /** Seeds du plan à suivre dans le ledger (surfaces minuscules). */
  readonly seeds?: readonly string[];
  /** Fenêtre de co-occurrence rôle↔prénom (caractères). EXPERIMENTAL_DEFAULT. */
  readonly cooccurWindow?: number;
  /** Nouveauté sous ce seuil ⇒ candidat REDITE. EXPERIMENTAL_DEFAULT. */
  readonly reditNoveltyThreshold?: number;
}

/** Analyse trans-chapitres complète. Pur, déterministe. */
export function analyzeArcCoherence(
  chapters: readonly ArcChapter[],
  opts: ArcCoherenceOptions = {},
): CoherenceResult<ArcCoherenceReport> {
  if (chapters.length === 0) return err({ code: 'EMPTY_INPUT', detail: 'aucun chapitre' });
  for (const c of chapters) {
    if (!Number.isInteger(c.chapter) || c.chapter < 1) {
      return err({ code: 'INVALID_CHAPTER_NUMBER', detail: `chapter=${c.chapter}` });
    }
  }
  const roles = opts.roles ?? DEFAULT_ROLE_LEXICON;
  const legit = opts.legitimateNames ?? new Map<string, readonly string[]>();
  const seeds = opts.seeds ?? [];
  const winChars = opts.cooccurWindow ?? 80;
  const reditThr = opts.reditNoveltyThreshold ?? 0.55; // EXPERIMENTAL_DEFAULT

  /* ── 1. IDENTITY DRIFT — prénoms par rôle, co-occurrence locale ──────── */
  // Noms composés capturés entiers (« Ker-Morvan ») ; (?!['']) exclut les
  // élisions (« Quelqu'un » ne doit pas produire « Quelqu »).
  const NAME_RE = /\b([A-ZÀÂÉÈÊËÎÏÔÛÙÜ][a-zàâçéèêëîïôûùüÿ]{2,}(?:-[A-ZÀÂÉÈÊËÎÏÔÛÙÜ][a-zàâçéèêëîïôûùüÿ]{2,})?)(?![''])\b/gu;
  // Test lowercase-presence : un VRAI prénom n'apparaît jamais en minuscules
  // dans le corpus ; un mot de début de phrase (« Pas », « Pourquoi ») si.
  // Déterministe, zéro lexique à maintenir.
  const lowercaseVocab = new Set<string>();
  for (const c of chapters) {
    for (const w of c.prose.normalize('NFC').split(/[\s,;:!?.…«»"()—]+/u)) {
      if (w.length >= 3 && /^[a-zàâçéèêëîïôûùüÿ-]+$/u.test(w)) lowercaseVocab.add(w);
    }
  }
  const roleNames = new Map<string, Map<string, { firstChapter: number; occurrences: number }>>();
  for (const role of roles) {
    const roleRe = new RegExp(`\\b${role}\\b`, 'giu');
    for (const c of chapters) {
      const prose = c.prose.normalize('NFC');
      let m: RegExpExecArray | null;
      roleRe.lastIndex = 0;
      while ((m = roleRe.exec(prose)) !== null) {
        const lo = Math.max(0, m.index - winChars);
        const hi = Math.min(prose.length, m.index + role.length + winChars);
        const windowText = prose.slice(lo, hi);
        let nm: RegExpExecArray | null;
        NAME_RE.lastIndex = 0;
        while ((nm = NAME_RE.exec(windowText)) !== null) {
          const name = nm[1];
          if (name === undefined) continue;
          // Exclusion par lowercase-presence : si le mot existe en minuscules
          // ailleurs dans le livre, ce n'est pas un prénom (déterministe).
          if (lowercaseVocab.has(name.toLowerCase())) continue;
          const allowed = legit.get(role);
          if (allowed !== undefined && allowed.includes(name)) continue;
          let byName = roleNames.get(role);
          if (byName === undefined) { byName = new Map(); roleNames.set(role, byName); }
          const cur = byName.get(name);
          if (cur === undefined) byName.set(name, { firstChapter: c.chapter, occurrences: 1 });
          else cur.occurrences += 1;
        }
      }
    }
  }
  const identityDrifts: IdentityDriftSignal[] = [];
  for (const [role, byName] of roleNames) {
    // ≥2 occurrences pour qu'un prénom compte (réduit le bruit d'interlocuteurs).
    const names = [...byName.entries()]
      .filter(([, v]) => v.occurrences >= 2)
      .sort((a, b) => a[1].firstChapter - b[1].firstChapter || compareStrings(a[0], b[0]))
      .map(([name, v]) => ({ name, firstChapter: v.firstChapter, occurrences: v.occurrences }));
    if (names.length >= 2) {
      identityDrifts.push({ role, names, severity: 'WARN' });
    }
  }
  identityDrifts.sort((a, b) => compareStrings(a.role, b.role));

  /* ── 2. FONCTION DE CHAPITRE — proxy CALC, classification RELATIVE ───── */
  // Deux passes : (1) mesures brutes ; (2) classes par QUANTILES du livre
  // lui-même — des seuils absolus ne tiennent pas d'un style à l'autre (mesuré
  // sur le 60k : tous les chapitres tombaient en TRANSITION). REDITE reste
  // absolue : la quasi-duplication n'est pas relative.
  interface Meas {
    readonly chapter: number; readonly dialogueRatio: number; readonly actionDensity: number;
    readonly revelationHits: number; readonly confrontHits: number; readonly noveltyVsPrev: number;
  }
  const meas: Meas[] = [];
  const seenGrams = new Set<string>();
  for (const c of chapters) {
    const sentences = c.prose.split(/(?<=[.!?…])\s+/u).filter((s) => s.trim().length > 0);
    const dialogueLines = sentences.filter((s) => /^[«"—-]|»\s*$/u.test(s.trim())).length;
    const dialogueRatio = sentences.length > 0 ? dialogueLines / sentences.length : 0;
    const words = c.prose.split(/\s+/u).filter((w) => w.length > 0).length;
    const actionHits = (c.prose.match(new RegExp(ACTION_RE.source, 'gu')) ?? []).length;
    const actionDensity = words > 0 ? (actionHits / words) * 1000 : 0;
    const revelationHits = (c.prose.match(new RegExp(REVELATION_RE.source, 'giu')) ?? []).length;
    const confrontHits = (c.prose.match(new RegExp(CONFRONT_RE.source, 'gu')) ?? []).length;
    const grams = contentTrigrams(c.prose);
    let novel = 0;
    for (const g of grams) if (!seenGrams.has(g)) novel += 1;
    const noveltyVsPrev = grams.size > 0 ? novel / grams.size : 1;
    for (const g of grams) seenGrams.add(g);
    meas.push({ chapter: c.chapter, dialogueRatio, actionDensity, revelationHits, confrontHits, noveltyVsPrev });
  }
  const quantile = (values: readonly number[], q: number): number => {
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
    return sorted[idx] ?? 0;
  };
  const revQ = quantile(meas.map((m) => m.revelationHits), 0.8);
  const confQ = quantile(meas.map((m) => m.confrontHits), 0.8);
  const actQ = quantile(meas.map((m) => m.actionDensity), 0.8);
  const diaMed = quantile(meas.map((m) => m.dialogueRatio), 0.5);
  const chapterFunctions: ChapterFunctionRow[] = meas.map((m) => {
    let fn: ChapterFunction;
    if (m.noveltyVsPrev < reditThr) fn = 'REDITE';
    else if (m.revelationHits >= Math.max(2, revQ)) fn = 'REVELATION';
    else if (m.confrontHits >= Math.max(2, confQ) && m.dialogueRatio >= diaMed) fn = 'CONFRONTATION';
    else if (m.actionDensity >= actQ && m.actionDensity > 0) fn = 'ACTION';
    else fn = 'TRANSITION';
    return {
      chapter: m.chapter, fn,
      dialogueRatio: Number(m.dialogueRatio.toFixed(3)),
      actionDensity: Number(m.actionDensity.toFixed(2)),
      revelationHits: m.revelationHits,
      noveltyVsPrev: Number(m.noveltyVsPrev.toFixed(3)),
    };
  });

  /* ── 3. MYSTERY LEDGER — seed → planted / recalls / payoff ───────────── */
  const seedLedger: SeedLedgerRow[] = [];
  for (const seed of [...seeds].sort(compareStrings)) {
    const seedRe = new RegExp(`\\b${seed.toLowerCase()}\\b`, 'u');
    const present: number[] = [];
    const revealAt: number[] = [];
    for (const c of chapters) {
      const lower = c.prose.normalize('NFC').toLowerCase();
      if (seedRe.test(lower)) {
        present.push(c.chapter);
        if (REVELATION_RE.test(c.prose)) revealAt.push(c.chapter);
      }
    }
    const planted = present.length > 0 ? (present[0] as number) : ('ABSENT' as const);
    const lastReveal = revealAt.length > 0 ? (revealAt[revealAt.length - 1] as number) : undefined;
    seedLedger.push({
      seed,
      plantedChapter: planted,
      recallChapters: present.slice(1),
      payoffChapter: lastReveal !== undefined && planted !== 'ABSENT' && lastReveal > planted ? lastReveal : 'UNPAID',
    });
  }

  return ok({ identityDrifts, chapterFunctions, seedLedger });
}
