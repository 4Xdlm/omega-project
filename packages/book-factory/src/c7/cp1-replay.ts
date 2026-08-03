/**
 * OMEGA — CP1 Étapes 2-3 : REJEU CONTREFACTUEL + SCORE DE CONTENU.
 * Protocole : runs/cp_pack/CP1_PROTOCOL_PREREGISTERED.md.
 *
 * Cinq sélecteurs rejouent le MÊME pack gelé — zéro génération. Tout écart
 * entre deux « livres » est attribuable au sélecteur, jamais au bruit du
 * modèle. Chaque sélecteur maintient SON registre de têtes (les répulsions
 * divergent dès que les choix divergent : c'est voulu, c'est le contrefactuel).
 *
 * SCORE DE CONTENU (100 % REUSE, préenregistré) :
 *   • récap en gradation : connecteurs par période (measurePlotRecap) ;
 *   • IA-smell : computeIASmellScore (sovereign-engine, 15 familles FR) —
 *     pont cross-package par import relatif (précédent : splitter omega-p0) ;
 *   • confort : scanComfortSentences (editorial-scanners).
 *   DÉVIATION DOCUMENTÉE (avant tout rejeu) : description-density est un
 *   SCRIPT sans exports, non importable sans refactor — exclu de CP1 ;
 *   OVER_ADJECTIVATION (ia-smell) couvre partiellement l'axe adjectival.
 *
 * PONDÉRATION selector_combined — PRÉENREGISTRÉE ICI, avant tout résultat :
 *   combiné = rang_forme + rang_contenu (somme des rangs, égalité 50/50,
 *   départage par index d'origine). Pas de coefficient appris.
 *
 *   cwd = packages/book-factory
 *   npx tsx src/c7/cp1-replay.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { checkEligibility, rankByShape, shapeShadow, PeriodHeadRegistry } from '../scribe/scribe-gate.js';
import { extractLongPeriods, measurePlotRecap } from '../variation/long-period-template.js';
import { normalizeFrenchTypography } from '../seal/french-typography.js';
import { scanComfortSentences } from '../polish/editorial-scanners.js';
import { computeIASmellScore } from '../../../sovereign-engine/src/authenticity/ia-smell-patterns.js';
import type { FrozenCandidate } from '../scribe/candidate-pack.js';

const DIR = 'runs/cp_pack';

/* ───────────────────────── score de contenu (diagnostic) ───────────────────── */

export interface ContentScore {
  /** Plus BAS = plus propre (c'est un score de défauts). */
  readonly total: number;
  readonly recapConnectors: number;
  readonly iaSmellPenalty: number; // 100 - computeIASmellScore.score
  readonly comfortRatio: number;
}

export function contentScore(prose: string): ContentScore {
  const recapConnectors = extractLongPeriods(prose).reduce(
    (a, p) => a + measurePlotRecap(p).connectors,
    0,
  );
  const smell = computeIASmellScore(prose);
  const iaSmellPenalty = 100 - smell.score;
  const comfort = scanComfortSentences(prose).comfortRatio;
  // Somme normalisée grossière — le score CLASSE des candidats du même pack,
  // il ne prétend à aucune échelle absolue.
  const total = recapConnectors * 2 + iaSmellPenalty / 10 + comfort * 5;
  return { total, recapConnectors, iaSmellPenalty, comfortRatio: comfort };
}

/* ────────────────────────────── les sélecteurs ─────────────────────────────── */

type SelectorName = 'words' | 'scribe_v2' | 'shape' | 'content' | 'combined';

interface Pick {
  readonly candidateIndex: number;
  readonly sha256: string;
  readonly words: number;
}

/** Étage commun à tous les sélecteurs SAUF words : vetos durs puis répulsion. */
function eligiblePool(
  cands: readonly FrozenCandidate[],
  registry: PeriodHeadRegistry,
): readonly FrozenCandidate[] {
  return cands.filter((c) => {
    const e = checkEligibility(c.prose);
    if (!e.eligible) return false;
    if (e.periodHead !== null && registry.has(e.periodHead)) return false;
    return true;
  });
}

function recordHead(c: FrozenCandidate, registry: PeriodHeadRegistry): void {
  const e = checkEligibility(c.prose);
  registry.record(e.periodHead);
}

const SELECTORS: Record<
  SelectorName,
  (cands: readonly FrozenCandidate[], registry: PeriodHeadRegistry) => FrozenCandidate | null
> = {
  // La production HISTORIQUE : le plus long, aucun gate (r6-core.ts:187).
  words: (cands) => [...cands].sort((a, b) => b.words - a.words || a.candidateIndex - b.candidateIndex)[0] ?? null,

  // Le gate actuel : premier éligible dans l'ordre de génération.
  scribe_v2: (cands, reg) => eligiblePool(cands, reg)[0] ?? null,

  // Gate PUIS forme la plus organique.
  shape: (cands, reg) => {
    const pool = eligiblePool(cands, reg);
    return rankByShape(pool, (c) => c.prose)[0]?.candidate ?? null;
  },

  // Gate PUIS score de contenu minimal.
  content: (cands, reg) => {
    const pool = eligiblePool(cands, reg);
    return (
      [...pool].sort(
        (a, b) => contentScore(a.prose).total - contentScore(b.prose).total || a.candidateIndex - b.candidateIndex,
      )[0] ?? null
    );
  },

  // Gate PUIS somme des rangs forme+contenu (pondération préenregistrée).
  combined: (cands, reg) => {
    const pool = eligiblePool(cands, reg);
    if (pool.length === 0) return null;
    const shapeRank = new Map(rankByShape(pool, (c) => c.prose).map((r, i) => [r.candidate.sha256, i]));
    const byContent = [...pool].sort((a, b) => contentScore(a.prose).total - contentScore(b.prose).total);
    const contentRank = new Map(byContent.map((c, i) => [c.sha256, i]));
    return (
      [...pool].sort((a, b) => {
        const ra = (shapeRank.get(a.sha256) ?? 99) + (contentRank.get(a.sha256) ?? 99);
        const rb = (shapeRank.get(b.sha256) ?? 99) + (contentRank.get(b.sha256) ?? 99);
        return ra - rb || a.candidateIndex - b.candidateIndex;
      })[0] ?? null
    );
  },
};

/* ─────────────────────────────────── main ──────────────────────────────────── */

function main(): void {
  const lines = readFileSync(`${DIR}/CP1.jsonl`, 'utf8').split('\n').filter((l) => l.trim().length > 0);
  const all = lines.map((l) => JSON.parse(l) as FrozenCandidate);
  const chapters = [...new Set(all.map((c) => c.chapterIndex))].sort((a, b) => a - b);
  process.stdout.write(`CP1 rejeu — ${String(all.length)} candidats, ${String(chapters.length)} chapitres\n`);

  const names = Object.keys(SELECTORS) as readonly SelectorName[];
  const picks: Record<SelectorName, Pick[]> = { words: [], scribe_v2: [], shape: [], content: [], combined: [] };
  const registries = new Map<SelectorName, PeriodHeadRegistry>(names.map((n) => [n, new PeriodHeadRegistry()]));

  mkdirSync(`${DIR}/replay`, { recursive: true });
  for (const ch of chapters) {
    const cands = all.filter((c) => c.chapterIndex === ch).sort((a, b) => a.candidateIndex - b.candidateIndex);
    for (const name of names) {
      const reg = registries.get(name) as PeriodHeadRegistry;
      const chosen = SELECTORS[name](cands, reg) ?? SELECTORS.words(cands, reg); // fallback A : meilleur dispo
      if (chosen === null) continue;
      if (name !== 'words') recordHead(chosen, reg);
      picks[name].push({ candidateIndex: chosen.candidateIndex, sha256: chosen.sha256, words: chosen.words });
      const sealed = normalizeFrenchTypography(chosen.prose).text;
      writeFileSync(`${DIR}/replay/${name}_ch${String(ch).padStart(2, '0')}.md`, sealed, 'utf8');
    }
  }

  // Divergence entre sélecteurs + diagnostics par livre.
  const divergence: Record<string, number> = {};
  for (const a of names) {
    for (const b of names) {
      if (a >= b) continue;
      const same = chapters.filter((_, i) => picks[a][i]?.sha256 === picks[b][i]?.sha256).length;
      divergence[`${a}|${b}`] = chapters.length - same;
    }
  }
  const perBook = Object.fromEntries(
    names.map((n) => {
      const proses = picks[n].map((p, i) => {
        const c = all.find((x) => x.chapterIndex === chapters[i] && x.sha256 === p.sha256);
        return c?.prose ?? '';
      });
      const joined = proses.join(' ');
      return [
        n,
        {
          picks: picks[n],
          totalWords: picks[n].reduce((a, p) => a + p.words, 0),
          content: contentScore(joined),
          shape: shapeShadow(joined),
        },
      ];
    }),
  );

  const results = {
    spec: 'CP1_REPLAY',
    date: new Date().toISOString(),
    packSha256: createHash('sha256').update(readFileSync(`${DIR}/CP1.jsonl`, 'utf8'), 'utf8').digest('hex'),
    preregisteredCombined: 'somme des rangs forme+contenu, egalite 50/50, departage index',
    chapters: chapters.length,
    divergence,
    perBook,
  };
  writeFileSync(`${DIR}/CP1_REPLAY_RESULTS.json`, JSON.stringify(results, null, 1), 'utf8');
  process.stdout.write(`OK — divergences: ${JSON.stringify(divergence)}\n`);

  // Étape 4 : appariements aveugles randomisés par hash (journalisés AVANT lecture).
  const pairs: { pair: string; left: string; right: string }[] = [];
  const contrasts: readonly [SelectorName, SelectorName][] = [
    ['shape', 'scribe_v2'],
    ['content', 'words'],
    ['combined', 'scribe_v2'],
  ];
  for (const [a, b] of contrasts) {
    for (const [i, ch] of chapters.entries()) {
      const pa = picks[a][i];
      const pb = picks[b][i];
      if (pa === undefined || pb === undefined || pa.sha256 === pb.sha256) continue; // identiques : rien à juger
      const flip = parseInt(createHash('sha256').update(`${a}|${b}|${String(ch)}`).digest('hex').slice(0, 2), 16) % 2 === 0;
      pairs.push({
        pair: `${a}_vs_${b}_ch${String(ch).padStart(2, '0')}`,
        left: flip ? `${a}_ch${String(ch).padStart(2, '0')}.md` : `${b}_ch${String(ch).padStart(2, '0')}.md`,
        right: flip ? `${b}_ch${String(ch).padStart(2, '0')}.md` : `${a}_ch${String(ch).padStart(2, '0')}.md`,
      });
    }
  }
  writeFileSync(`${DIR}/CP1_BLIND_PAIRS.json`, JSON.stringify(pairs, null, 1), 'utf8');
  process.stdout.write(`${String(pairs.length)} paires aveugles journalisees\n`);
}

main();
