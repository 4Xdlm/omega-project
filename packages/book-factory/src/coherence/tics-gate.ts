/**
 * OMEGA Book-Factory — C9.4 G5-TICS DURCI (BF-08, SHADOW).
 *
 * Le run 60k a mesuré : « il y a » ×39, « le silence qui » ×32, « la pluie ne »
 * ×31 sur 50 chapitres — la répétition de SURFACE est sous contrôle (1 near-dup),
 * la répétition d'IMAGINAIRE ne l'est pas. Ce module compte les OCCURRENCES
 * TOTALES de n-grammes (2..4 mots, dont au moins un mot de contenu) et applique
 * des plafonds NORMALISÉS PAR CHAPITRE — comparables entre livres.
 *
 * SEUILS = EXPERIMENTAL_DEFAULTS dérivés de la proposition tribunal (warning >15,
 * fail-shadow >25 sur 50 chap ⇒ 0.3 et 0.5 par chapitre). NON SCELLÉS : EMP-16
 * exige 3 corpus — un seul livre mesuré. FAIL_SHADOW ne rejette RIEN : c'est un
 * niveau de rapport. Le scellement en gate dur = décision Architecte multi-livres.
 *
 * COOLDOWN LEDGER : le Scribe est aveugle (BF-07) — l'interdiction temporaire
 * d'un tic ne peut PAS être rétroactive ; elle se matérialise en liste d'interdits
 * à injecter dans les directives des chapitres FUTURS. computeCooldowns produit
 * cette liste par chapitre : tic vu ≥ burstThreshold fois dans une fenêtre ⇒
 * interdit pendant cooldownChapters chapitres.
 */

import type { CoherenceResult, TicLevel, TicRow, TicsReport } from './coherence-types.js';
import { err, ok, compareStrings } from '../identity/identity-types.js';

export interface TicsChapter { readonly chapter: number; readonly prose: string; }

const STOP = new Set(['le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'à', 'au', 'aux', 'en', 'dans', 'sur', 'que', 'qui', 'ne', 'pas', 'se', 'sa', 'son', 'ses', 'il', 'elle', 'était', 'avait', 'y', 'a', 'l', 'd', 'n', 's', 'c', 'j', 'qu']);

/** Seuils par chapitre — EXPERIMENTAL_DEFAULTS (proposition tribunal /50 chap). */
export const TICS_EXPERIMENTAL_DEFAULTS = {
  warnPerChapter: 0.3, // ≈ >15 occurrences sur 50 chapitres
  failShadowPerChapter: 0.5, // ≈ >25 occurrences sur 50 chapitres
  minOccurrencesFloor: 8, // sous ce total absolu, jamais de WARN (petits livres)
} as const;

function tokenize(prose: string): readonly string[] {
  return prose
    .normalize('NFC')
    .toLowerCase()
    .replace(/[«»"…]/gu, ' ')
    .split(/[\s]+/u)
    .map((w) => w.replace(/^[''(-]+|[.,;:!?'')—-]+$/gu, ''))
    .filter((w) => w.length > 0);
}

function countNgrams(words: readonly string[], n: number, into: Map<string, number>): void {
  for (let i = 0; i + n - 1 < words.length; i++) {
    const gram = words.slice(i, i + n);
    // Au moins UN mot de contenu — sinon « de la les » polluerait tout.
    if (gram.every((w) => STOP.has(w))) continue;
    const key = gram.join(' ');
    into.set(key, (into.get(key) ?? 0) + 1);
  }
}

export interface TicsOptions {
  readonly warnPerChapter?: number;
  readonly failShadowPerChapter?: number;
  readonly minOccurrencesFloor?: number;
  readonly topK?: number;
}

/** Mesure les tics d'un livre entier. Pur, déterministe, tri compareStrings. */
export function measureTics(
  chapters: readonly TicsChapter[],
  opts: TicsOptions = {},
): CoherenceResult<TicsReport> {
  if (chapters.length === 0) return err({ code: 'EMPTY_INPUT', detail: 'aucun chapitre' });
  const warnThr = opts.warnPerChapter ?? TICS_EXPERIMENTAL_DEFAULTS.warnPerChapter;
  const failThr = opts.failShadowPerChapter ?? TICS_EXPERIMENTAL_DEFAULTS.failShadowPerChapter;
  const floor = opts.minOccurrencesFloor ?? TICS_EXPERIMENTAL_DEFAULTS.minOccurrencesFloor;
  const topK = opts.topK ?? 40;

  const counts = new Map<string, number>();
  for (const c of chapters) {
    const words = tokenize(c.prose);
    countNgrams(words, 2, counts);
    countNgrams(words, 3, counts);
    countNgrams(words, 4, counts);
  }

  const nCh = chapters.length;
  const rows: TicRow[] = [...counts.entries()]
    .filter(([, n]) => n >= floor)
    .map(([gram, occurrences]) => {
      const perChapter = occurrences / nCh;
      let level: TicLevel = 'OK';
      if (perChapter > failThr) level = 'FAIL_SHADOW';
      else if (perChapter > warnThr) level = 'WARN';
      return { gram, occurrences, perChapter: Number(perChapter.toFixed(3)), level };
    })
    .filter((r) => r.level !== 'OK')
    .sort((a, b) => b.occurrences - a.occurrences || compareStrings(a.gram, b.gram))
    .slice(0, topK);

  return ok({ rows, warnThresholdPerChapter: warnThr, failShadowThresholdPerChapter: failThr });
}

/* ── COOLDOWN LEDGER — interdits temporaires pour chapitres FUTURS ──────── */

export interface CooldownEntry {
  readonly gram: string;
  /** Premier chapitre où l'interdit s'applique. */
  readonly fromChapter: number;
  /** Dernier chapitre inclus de l'interdit. */
  readonly toChapter: number;
}

export interface CooldownOptions {
  /** Occurrences dans la fenêtre glissante qui déclenchent l'interdit. */
  readonly burstThreshold?: number;
  /** Largeur de la fenêtre glissante (chapitres). */
  readonly burstWindow?: number;
  /** Durée de l'interdit (chapitres). */
  readonly cooldownChapters?: number;
  /** N-grammes à surveiller (défaut : tics WARN+ d'une mesure préalable). */
  readonly watchlist: readonly string[];
}

/**
 * Calcule, chapitre par chapitre, les interdits temporaires : si un gram de la
 * watchlist apparaît ≥ burstThreshold fois sur les burstWindow derniers chapitres,
 * il est interdit pour les cooldownChapters suivants. Sortie EXPLOITABLE par le
 * runner : injecter `entries` actives du chapitre N dans la directive du chapitre N.
 */
export function computeCooldowns(
  chapters: readonly TicsChapter[],
  opts: CooldownOptions,
): CoherenceResult<readonly CooldownEntry[]> {
  if (chapters.length === 0) return err({ code: 'EMPTY_INPUT', detail: 'aucun chapitre' });
  const burst = opts.burstThreshold ?? 3; // EXPERIMENTAL_DEFAULT (proposition tribunal)
  const win = opts.burstWindow ?? 3;
  const cool = opts.cooldownChapters ?? 5;

  const sorted = [...chapters].sort((a, b) => a.chapter - b.chapter);
  const perChapterCounts = new Map<string, number[]>(); // gram → counts alignés sur sorted
  for (const gram of [...opts.watchlist].sort(compareStrings)) {
    const re = new RegExp(gram.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'giu');
    perChapterCounts.set(
      gram,
      sorted.map((c) => (c.prose.normalize('NFC').toLowerCase().match(re) ?? []).length),
    );
  }

  const entries: CooldownEntry[] = [];
  for (const [gram, series] of perChapterCounts) {
    let coolUntilIdx = -1; // index (dans sorted) jusqu'auquel l'interdit court
    for (let i = 0; i < series.length; i++) {
      if (i <= coolUntilIdx) continue; // déjà sous interdit — pas de re-déclenchement
      const lo = Math.max(0, i - win + 1);
      let sum = 0;
      for (let k = lo; k <= i; k++) sum += series[k] ?? 0;
      if (sum >= burst) {
        const fromIdx = i + 1;
        const toIdx = Math.min(sorted.length - 1, i + cool);
        if (fromIdx <= toIdx) {
          const fromCh = sorted[fromIdx]?.chapter;
          const toCh = sorted[toIdx]?.chapter;
          if (fromCh !== undefined && toCh !== undefined) {
            entries.push({ gram, fromChapter: fromCh, toChapter: toCh });
          }
        }
        coolUntilIdx = toIdx;
      }
    }
  }
  entries.sort((a, b) => a.fromChapter - b.fromChapter || compareStrings(a.gram, b.gram));
  return ok(entries);
}
