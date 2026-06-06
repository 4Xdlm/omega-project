/**
 * OMEGA — C8+ — AUDIT DE MANUSCRIT (script BF-08) — première sortie RÉELLE des
 * instruments shadow C8 sur un livre complet : repeat inter-chapitres (tics,
 * near-dup, divergence d'incipits) + signaux d'implication de rôle + stats.
 * Entrée : runs/<RUN>/MANUSCRIT.md (env AUDIT_RUN). Sortie : AUDIT.{json,md} dans le run.
 * SHADOW : ce script MESURE, il ne modifie rien et ne rejette rien.
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { crossChapterRepeat } from '../loop/cross-chapter-repeat.js';
import type { ChapterText } from '../loop/cross-chapter-repeat.js';
import { scanRoleImplications } from '../loop/implication-gate.js';
import { CharacterRegistry, buildMintEvents } from '../identity/character-registry.js';
import type { IdentityDeterminism, Seed } from '../identity/identity-types.js';
import { asAliasSurface, asChapterRef, asConfidence01 } from '../identity/identity-types.js';
import type { DriftRule } from '../recall/recall-types.js';

const RUN = process.env['AUDIT_RUN'] ?? 'runs/c8_book60k';
const DET: IdentityDeterminism = { mintSeed: 'C7-PHARE-2026-06-06' as Seed }; // MÊME seed que le runner

function surf(s: string) {
  const r = asAliasSurface(s);
  if (!r.ok) throw new Error('surf');
  return r.value;
}
function conf(n: number) {
  const r = asConfidence01(n);
  if (!r.ok) throw new Error('conf');
  return r.value;
}

function buildWorld() {
  const briefs = [
    { id: 'lena', name: 'Léna Marchetti' },
    { id: 'gaspard', name: 'Gaspard' },
    { id: 'le_maire', name: 'Yvon Squarcioni' },
    { id: 'garcia', name: 'Garcia' },
  ];
  let reg = CharacterRegistry.empty(DET);
  briefs.forEach((b, i) => {
    for (const e of buildMintEvents(DET, { nonce: b.id as never, displayName: b.name, introducedAt: asChapterRef(1), createdBy: 'planner', evidence: `E-${b.id}` as never }, surf(b.name), conf(1), i * 2)) {
      const r = reg.apply(e);
      if (!r.ok) throw new Error(r.error.code);
      reg = r.value;
    }
  });
  return { reg, surfaces: new Set(briefs.map((b) => b.name.normalize('NFC').toLowerCase())) };
}

function splitChapters(manuscript: string): readonly ChapterText[] {
  const parts = manuscript.split(/^## Chapitre (\d+)/mu);
  const out: ChapterText[] = [];
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const n = Number(parts[i]);
    const body = (parts[i + 1] ?? '').replace(/^[^\n]*\n/u, '').trim(); // retire la fin du titre
    if (Number.isFinite(n) && body.length > 0) out.push({ chapter: n, prose: body });
  }
  return out;
}

function main(): void {
  const manuscript = readFileSync(`${RUN}/MANUSCRIT.md`, 'utf8');
  const chapters = splitChapters(manuscript);
  const words = manuscript.split(/\s+/u).filter((w) => w.length > 0).length;

  const repeat = crossChapterRepeat(chapters, { minChaptersForTic: 5, nearDupThreshold: 0.7, topK: 20 });

  const { reg, surfaces } = buildWorld();
  const locks = new Map<string, readonly DriftRule[]>([['lena', [{ field: 'role', expected: 'enquêtrice' }]]]);
  const implications = chapters.flatMap((c) =>
    scanRoleImplications(c.prose, reg, surfaces, { chapter: asChapterRef(c.chapter) }, 3, locks, () => 'lena')
      .map((s) => ({ chapter: c.chapter, trade: s.impliedTrade, hits: s.hits })),
  );

  const divLow = repeat.incipitDivergenceAdjacent.filter((d) => d.divergenceVsPrev < 0.5);
  const report = {
    run: RUN,
    chapters: chapters.length,
    words,
    wordsPerChapter: Math.round(words / Math.max(1, chapters.length)),
    incipit: {
      adjacentBelow05: divLow.length,
      worst: [...repeat.incipitDivergenceAdjacent].sort((a, b) => a.divergenceVsPrev - b.divergenceVsPrev).slice(0, 5),
    },
    ticsTransChapitres: repeat.topCrossTrigrams,
    nearDupPairs: repeat.nearDupSentencePairs.slice(0, 10),
    roleImplicationSignals: implications,
    date: new Date().toISOString(),
  };
  writeFileSync(`${RUN}/AUDIT.json`, JSON.stringify(report, null, 2), 'utf8');
  const md = [
    `# AUDIT SHADOW — ${RUN}`,
    `Chapitres: ${report.chapters} · Mots: ${report.words} (~${report.wordsPerChapter}/chap)`,
    `Incipits adjacents divergence<0.5 : ${report.incipit.adjacentBelow05}/${repeat.incipitDivergenceAdjacent.length}`,
    `Tics trans-chapitres (top): ${repeat.topCrossTrigrams.slice(0, 5).map((t) => `« ${t.gram} » ×${t.chapters}`).join(' · ') || 'aucun ≥ seuil'}`,
    `Near-dup phrases (≥0.7): ${repeat.nearDupSentencePairs.length}`,
    `Signaux implication de rôle: ${implications.length}`,
  ].join('\n\n');
  writeFileSync(`${RUN}/AUDIT.md`, md, 'utf8');
  process.stdout.write(`${md}\n`);
}

main();
