/**
 * OMEGA Book-Factory — C11.1 IMPORT DE MANUSCRIT ARBITRAIRE (BF-08).
 *
 * Un manuscrit externe n'a PAS le format OMEGA. Quatre stratégies de découpage
 * essayées dans l'ordre (la première qui produit ≥2 chapitres plausibles gagne) :
 * OMEGA_HEADINGS → CHAPTER_WORDS → NUMERIC_HEADINGS → SIZE_FALLBACK.
 *
 * CASTING AUTO : un Doctor ne reçoit pas de Bible — il la DEVINE et la propose
 * (human-in-the-loop, GO_B). Détection des prénoms par le filtre
 * lowercase-presence PROUVÉ en C9 (un vrai prénom n'apparaît jamais en
 * minuscules dans le corpus), fréquences, variantes proches (Levenshtein ≤ 2 =
 * candidates typo/alias — ex. « Gaspar »/« Gaspard »).
 * LIMITES : titres honorifiques (« Monsieur Squarcioni ») comptés comme noms ;
 * prénoms à initiale accentuée gérés via classe Unicode explicite.
 */

import type { CastEntry, ChapterSlice, DoctorResult, ImportedManuscript, SplitStrategy } from './doctor-types.js';
import { err, ok, compareStrings } from '../identity/identity-types.js';

const OMEGA_RE = /^## Chapitre (\d+)/mu;
const CHAPTER_WORD_RE = /^(?:CHAPITRE|Chapitre|CHAPTER|Chapter)\s+([0-9IVXLC]+)\b.*$/mu;
const NUMERIC_RE = /^(?:[—–-]\s*)?(\d{1,3}|[IVXLC]{1,7})(?:\s*[—–.-])?\s*$/mu;

function roman(s: string): number {
  const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };
  let total = 0;
  let prev = 0;
  for (const ch of [...s.toUpperCase()].reverse()) {
    const v = map[ch] ?? 0;
    if (v === 0) return NaN;
    total += v < prev ? -v : v;
    prev = v;
  }
  return total;
}

function toNum(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : roman(s);
}

function countWords(s: string): number {
  const t = s.trim();
  return t.length === 0 ? 0 : t.split(/\s+/u).length;
}

function slicesFrom(parts: readonly { num: number; title: string; body: string }[]): ChapterSlice[] {
  return parts
    .filter((p) => Number.isFinite(p.num) && p.body.trim().length > 0)
    .map((p) => ({ chapter: p.num, title: p.title.trim(), prose: p.body.trim(), words: countWords(p.body) }));
}

function splitByRegex(text: string, re: RegExp): ChapterSlice[] {
  const global = new RegExp(re.source, 'gmu');
  const matches = [...text.matchAll(global)];
  if (matches.length < 2) return [];
  const parts: { num: number; title: string; body: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const next = matches[i + 1];
    if (m?.index === undefined) continue;
    const start = m.index + m[0].length;
    const end = next?.index ?? text.length;
    parts.push({ num: toNum(m[1] ?? ''), title: m[0].trim(), body: text.slice(start, end) });
  }
  return slicesFrom(parts);
}

function sizeFallback(text: string, targetWords: number): ChapterSlice[] {
  const paragraphs = text.split(/\r?\n\s*\r?\n/u).filter((p) => p.trim().length > 0);
  const out: ChapterSlice[] = [];
  let buf: string[] = [];
  let bufWords = 0;
  let n = 1;
  for (const p of paragraphs) {
    buf.push(p.trim());
    bufWords += countWords(p);
    if (bufWords >= targetWords) {
      out.push({ chapter: n, title: `Tranche ${n}`, prose: buf.join('\n\n'), words: bufWords });
      n += 1; buf = []; bufWords = 0;
    }
  }
  if (buf.length > 0) out.push({ chapter: n, title: `Tranche ${n}`, prose: buf.join('\n\n'), words: bufWords });
  return out;
}

/* ── Casting auto ────────────────────────────────────────────────────────── */

function levenshteinLe2(a: string, b: string): boolean {
  // Borne ≤2 suffisante (candidates typo/alias) — early-exit par différence de taille.
  if (Math.abs(a.length - b.length) > 2) return false;
  const dp: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0] ?? 0;
    dp[0] = i;
    let rowMin = dp[0] ?? 0;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j] ?? 0;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min((dp[j] ?? 0) + 1, (dp[j - 1] ?? 0) + 1, prev + cost);
      prev = tmp;
      rowMin = Math.min(rowMin, dp[j] ?? 0);
    }
    if (rowMin > 2) return false;
  }
  return (dp[b.length] ?? 99) <= 2;
}

export function detectCast(chapters: readonly ChapterSlice[], minOccurrences = 3): readonly CastEntry[] {
  const NAME_RE = /(?<!\p{L})([A-ZÀÂÉÈÊËÎÏÔÛÙÜ][a-zàâçéèêëîïôûùüÿ]{2,}(?:-[A-ZÀÂÉÈÊËÎÏÔÛÙÜ][a-zàâçéèêëîïôûùüÿ]{2,})?)(?!['’\p{L}])/gu;
  const lowercaseVocab = new Set<string>();
  for (const c of chapters) {
    for (const w of c.prose.normalize('NFC').split(/[\s,;:!?.…«»"()—]+/u)) {
      if (w.length >= 3 && /^[a-zàâçéèêëîïôûùüÿ-]+$/u.test(w)) lowercaseVocab.add(w);
    }
  }
  const counts = new Map<string, { occurrences: number; firstChapter: number }>();
  for (const c of chapters) {
    const prose = c.prose.normalize('NFC');
    let m: RegExpExecArray | null;
    NAME_RE.lastIndex = 0;
    while ((m = NAME_RE.exec(prose)) !== null) {
      const name = m[1];
      if (name === undefined || lowercaseVocab.has(name.toLowerCase())) continue;
      const cur = counts.get(name);
      if (cur === undefined) counts.set(name, { occurrences: 1, firstChapter: c.chapter });
      else cur.occurrences += 1;
    }
  }
  const names = [...counts.entries()]
    .filter(([, v]) => v.occurrences >= minOccurrences)
    .sort((a, b) => b[1].occurrences - a[1].occurrences || compareStrings(a[0], b[0]));
  return names.map(([name, v]) => ({
    name,
    occurrences: v.occurrences,
    firstChapter: v.firstChapter,
    nearVariants: names
      .filter(([other]) => other !== name && levenshteinLe2(name.toLowerCase(), other.toLowerCase()))
      .map(([other]) => other),
  }));
}

/* ── Import ──────────────────────────────────────────────────────────────── */

export interface ImportOptions { readonly fallbackTargetWords?: number; readonly castMinOccurrences?: number; }

export function importManuscript(text: string, opts: ImportOptions = {}): DoctorResult<ImportedManuscript> {
  if (text.trim().length === 0) return err({ code: 'EMPTY_MANUSCRIPT', detail: 'texte vide' });
  const target = opts.fallbackTargetWords ?? 1800;

  const attempts: readonly { strategy: SplitStrategy; slices: ChapterSlice[] }[] = [
    { strategy: 'OMEGA_HEADINGS', slices: splitByRegex(text, OMEGA_RE) },
    { strategy: 'CHAPTER_WORDS', slices: splitByRegex(text, CHAPTER_WORD_RE) },
    { strategy: 'NUMERIC_HEADINGS', slices: splitByRegex(text, NUMERIC_RE) },
  ];
  let chosen = attempts.find((a) => a.slices.length >= 2);
  if (chosen === undefined) {
    chosen = { strategy: 'SIZE_FALLBACK', slices: sizeFallback(text, target) };
  }
  if (chosen.slices.length === 0) return err({ code: 'IMPORT_FAILED', detail: 'aucun découpage possible' });

  const totalWords = chosen.slices.reduce((s, c) => s + c.words, 0);
  return ok({
    strategy: chosen.strategy,
    chapters: chosen.slices,
    totalWords,
    castProposal: detectCast(chosen.slices, opts.castMinOccurrences ?? 3),
  });
}
