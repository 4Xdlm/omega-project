/**
 * OMEGA — C9 AUDIT ÉDITORIAL (script BF-08, SHADOW) — les 4 instruments de
 * cohérence sur le manuscrit RÉEL : phrase (micro-physique), chapitre (lieu/
 * temps/présence), arc (identité/fonctions/ledger), tics (G5 durci) + cooldowns.
 * Entrée : runs/<RUN>/MANUSCRIT.md. Sortie : EDITORIAL_AUDIT.{json,md}. Ne
 * modifie RIEN du run — mesure pure.
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { scanSentencePhysics } from '../coherence/sentence-physics.js';
import { scanChapterCoherence } from '../coherence/chapter-coherence.js';
import { analyzeArcCoherence } from '../coherence/arc-coherence.js';
import { measureTics, computeCooldowns } from '../coherence/tics-gate.js';

const RUN = process.env['AUDIT_RUN'] ?? 'runs/c8_book60k';

function splitChapters(manuscript: string): readonly { chapter: number; prose: string }[] {
  const parts = manuscript.split(/^## Chapitre (\d+)/mu);
  const out: { chapter: number; prose: string }[] = [];
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const n = Number(parts[i]);
    const body = (parts[i + 1] ?? '').replace(/^[^\n]*\n/u, '').trim();
    if (Number.isFinite(n) && body.length > 0) out.push({ chapter: n, prose: body });
  }
  return out;
}

function main(): void {
  const manuscript = readFileSync(`${RUN}/MANUSCRIT.md`, 'utf8');
  const chapters = splitChapters(manuscript);

  /* ── PHRASE ── */
  const physics = chapters.flatMap((c) => {
    const r = scanSentencePhysics(c.prose, c.chapter);
    return r.ok ? [...r.value] : [];
  });

  /* ── CHAPITRE ── */
  const chapterSignals = chapters.flatMap((c) => {
    const r = scanChapterCoherence(c.prose, c.chapter);
    return r.ok ? [...r.value] : [];
  });

  /* ── ARC ── */
  // Protagonistes du plan : ils PARLENT des rôles en permanence — la
  // co-occurrence ne discrimine pas le porteur du rôle de l'interlocuteur.
  // On les exclut pour isoler les designations TIERCES (les vraies dérives).
  const protagonists = ['Léna', 'Marchetti', 'Garcia', 'Gaspard', 'Yvon', 'Squarcioni', 'Ker-Morvan'];
  const arcR = analyzeArcCoherence(chapters, {
    roles: ['gardien', 'maire', 'curé', 'capitaine', 'patron'],
    legitimateNames: new Map([
      ['gardien', protagonists],
      ['maire', protagonists], // le maire EST Yvon Squarcioni (plan)
      ['curé', protagonists], ['capitaine', protagonists], ['patron', protagonists],
    ]),
    seeds: ['naufrage', 'dette', 'lettre', 'carnet', 'registre'],
  });
  if (!arcR.ok) throw new Error(arcR.error.code);
  const arc = arcR.value;

  /* ── TICS + COOLDOWNS ── */
  const ticsR = measureTics(chapters);
  if (!ticsR.ok) throw new Error(ticsR.error.code);
  const tics = ticsR.value;
  const coolR = computeCooldowns(chapters, {
    watchlist: tics.rows.filter((r) => r.level !== 'OK').slice(0, 12).map((r) => r.gram),
  });
  const cooldowns = coolR.ok ? coolR.value : [];

  const fnCounts = new Map<string, number>();
  for (const f of arc.chapterFunctions) fnCounts.set(f.fn, (fnCounts.get(f.fn) ?? 0) + 1);

  const report = {
    run: RUN,
    chapters: chapters.length,
    sentencePhysics: {
      total: physics.length,
      byKind: {
        FOOTWEAR_CONTRADICTION: physics.filter((s) => s.kind === 'FOOTWEAR_CONTRADICTION').length,
        OBJECT_REDRAWN: physics.filter((s) => s.kind === 'OBJECT_REDRAWN').length,
        DOOR_REOPENED: physics.filter((s) => s.kind === 'DOOR_REOPENED').length,
      },
      signals: physics,
    },
    chapterCoherence: {
      total: chapterSignals.length,
      byKind: {
        LOCATION_JUMP: chapterSignals.filter((s) => s.kind === 'LOCATION_JUMP').length,
        TIME_REGRESSION: chapterSignals.filter((s) => s.kind === 'TIME_REGRESSION').length,
        GHOST_SPEAKER: chapterSignals.filter((s) => s.kind === 'GHOST_SPEAKER').length,
      },
      signals: chapterSignals,
    },
    arc: {
      identityDrifts: arc.identityDrifts,
      chapterFunctionHistogram: Object.fromEntries(fnCounts),
      reditChapters: arc.chapterFunctions.filter((f) => f.fn === 'REDITE').map((f) => f.chapter),
      chapterFunctions: arc.chapterFunctions,
      seedLedger: arc.seedLedger,
    },
    tics: { rows: tics.rows.slice(0, 25), thresholds: { warn: tics.warnThresholdPerChapter, failShadow: tics.failShadowThresholdPerChapter } },
    cooldownsProposed: cooldowns.slice(0, 30),
    date: new Date().toISOString(),
  };
  writeFileSync(`${RUN}/EDITORIAL_AUDIT.json`, JSON.stringify(report, null, 2), 'utf8');

  const md = [
    `# AUDIT ÉDITORIAL C9 — ${RUN} (SHADOW — mesure pure)`,
    `Chapitres: ${report.chapters}`,
    `## Niveau PHRASE — micro-physique : ${report.sentencePhysics.total} signaux (FOOTWEAR ${report.sentencePhysics.byKind.FOOTWEAR_CONTRADICTION}, OBJECT ${report.sentencePhysics.byKind.OBJECT_REDRAWN}, DOOR ${report.sentencePhysics.byKind.DOOR_REOPENED})`,
    physics.slice(0, 8).map((s) => `- ch.${s.locus.chapter} [${s.kind}] « ${s.locus.excerpt} »`).join('\n'),
    `## Niveau CHAPITRE : ${report.chapterCoherence.total} signaux (LOC ${report.chapterCoherence.byKind.LOCATION_JUMP}, TIME ${report.chapterCoherence.byKind.TIME_REGRESSION}, GHOST ${report.chapterCoherence.byKind.GHOST_SPEAKER})`,
    chapterSignals.slice(0, 8).map((s) => `- ch.${s.locus.chapter} [${s.kind}] ${s.detail}`).join('\n'),
    `## Niveau ARC — dérives d'identité : ${arc.identityDrifts.length}`,
    arc.identityDrifts.map((d) => `- rôle « ${d.role} » : ${d.names.map((n) => `${n.name} (1ʳᵉ ch.${n.firstChapter}, ×${n.occurrences})`).join(' / ')}`).join('\n'),
    `## Fonctions de chapitre (proxy CALC) : ${[...fnCounts.entries()].map(([k, v]) => `${k}=${v}`).join(' · ')}`,
    `REDITE: chapitres ${report.arc.reditChapters.join(', ') || 'aucun'}`,
    `## Mystery ledger`,
    arc.seedLedger.map((s) => `- « ${s.seed} » : planté ${String(s.plantedChapter)}, rappels ×${s.recallChapters.length}, payoff ${String(s.payoffChapter)}`).join('\n'),
    `## G5-TICS (seuils/chap : warn>${tics.warnThresholdPerChapter}, fail-shadow>${tics.failShadowThresholdPerChapter})`,
    tics.rows.slice(0, 12).map((r) => `- « ${r.gram} » ×${r.occurrences} (${r.perChapter}/chap) → ${r.level}`).join('\n'),
    `## Cooldowns proposés (chapitres futurs) : ${cooldowns.length}`,
  ].join('\n\n');
  writeFileSync(`${RUN}/EDITORIAL_AUDIT.md`, md, 'utf8');
  process.stdout.write(`${md.slice(0, 2400)}\n`);
}

main();
