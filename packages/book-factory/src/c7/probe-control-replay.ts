/**
 * OMEGA — C17 REPLAY : rejoue le run EMP-16 dans le CONTROL_PLANE.
 * Plan = PLAN_LOCK (50 fn planifiées) ; réalisé = classifieur Doctor sur le
 * canonique (GS-calibré). Shadow = télémétrie ; simulation soft = combien de
 * regens R1/R2 auraient été demandées. + entropie du sélecteur (progress.log).
 * Sortie : C17_CONTROL_REPLAY.json — preuve 1/3 du futur durcissement.
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { ControlPlane, selectorEntropy } from '../control/control-plane.js';
import type { DramaticFn } from '../control/control-plane.js';
import { importManuscript } from '../doctor/manuscript-import.js';
import { runDoctorAudit } from '../doctor/doctor-orchestrator.js';

const SEEDS = ['naufrage', 'dette', 'lettre', 'carnet', 'registre'];

function main(): void {
  const plan = (JSON.parse(readFileSync('runs/next_book/PLAN_LOCK.json', 'utf8')) as { plan: ReadonlyArray<{ chapter: number; act: number; fn: DramaticFn }> }).plan;
  const imp = importManuscript(readFileSync('runs/next_book_emp16/MANUSCRIT_CANONICAL.md', 'utf8'));
  if (!imp.ok) throw new Error('import');
  const audit = runDoctorAudit(imp.value.chapters, imp.value.castProposal.slice(0, 4).map((c) => c.name), SEEDS);
  if (!audit.ok) throw new Error('audit');
  const realized = new Map(audit.value.arc.chapterFunctions.map((f) => [f.chapter, f.fn as DramaticFn]));

  const run = (mode: 'shadow' | 'soft'): ReturnType<ControlPlane['report']> => {
    const cp = new ControlPlane(mode);
    const acts = [...new Set(plan.map((p) => p.act))].sort((a, b) => a - b);
    for (const act of acts) {
      for (const p of plan.filter((x) => x.act === act)) {
        const real = realized.get(p.chapter);
        if (real === undefined) continue;
        const v = cp.record({ chapter: p.chapter, act: p.act, plannedFn: p.fn, realizedFn: real });
        /* Simulation : la regen aurait relancé — le livre étant figé, on
         * re-soumet le MÊME réalisé (borne basse honnête du gain). */
        if (v.status === 'DRIFT_REGEN_REQUESTED') {
          cp.record({ chapter: p.chapter, act: p.act, plannedFn: p.fn, realizedFn: real, isRegenRound: true });
        }
      }
      cp.closeAct(act);
    }
    return cp.report();
  };

  const winners = [...readFileSync('runs/next_book_emp16/progress.log', 'utf8').matchAll(/winner=([a-z-]+)/gu)].map((m) => m[1] ?? '');
  const out = {
    date: '2026-06-08', book: 'emp16', planHash: 'df8d650f',
    shadow: run('shadow'), softSimulation: run('soft'),
    selectorEntropy: selectorEntropy(winners),
    note: 'softSimulation = borne basse (le livre est figé : la regen re-soumet le même réalisé). En run réel, chaque regen est une vraie 2e chance.',
  };
  writeFileSync('runs/next_book_emp16/C17_CONTROL_REPLAY.json', JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify({ shadow: { drifts: out.shadow.drifts, driftRate: out.shadow.driftRate, breaches: out.shadow.actBreaches.length }, soft: { regens: out.softSimulation.regensRequested, flagged: out.softSimulation.acceptedFlagged }, entropy: out.selectorEntropy.ratio, actsTransitionRatio: out.shadow.acts.map((a) => `${a.act}:${a.transitionRatio}`) }, null, 1));
}

main();
