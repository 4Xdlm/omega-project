/**
 * OMEGA — PE-3 : BON DE TRAVAIL AUTHOR_REVIEW (créatif → croisement 3-IA).
 * Lit CHAPTER_POLISH_LEDGER, extrait les items qui exigent une décision/réécriture
 * créative (jamais auto-réparés, loi PE-3). Sortie = ordre de travail priorisé
 * pour le contrôle 3-IA (Gemini+ChatGPT+Claude), avec spec de régen gatée.
 */

import { readFileSync, writeFileSync } from 'node:fs';

interface Row { chapter: number; fonction: string; personnagesMoteurs: string[]; dialogueConflictRatio: number; comfortRuns: number; ticMax: number; priorite: string; actions: string[] }

function main(): void {
  const led = JSON.parse(readFileSync('runs/CHAPTER_POLISH_LEDGER.json', 'utf8')) as { summary: Record<string, unknown>; rows: Row[] };
  const rows = led.rows;

  const noMover = rows.filter((r) => r.personnagesMoteurs.length === 0).map((r) => ({
    chapter: r.chapter, fonction: r.fonction, issue: 'AUCUN personnage moteur',
    regenSpec: 'régénérer avec directive : « un personnage NOMMÉ doit AGIR (verbe concret) ou DÉCIDER dans la scène »',
    guard: 'guardRegen defect=mover : ACCEPT seulement si moversAfter>moversBefore + casting intact + zéro mort ressuscité',
  }));
  const softTransitions = rows.filter((r) => r.actions.some((a) => a.includes('TRANSITION molle'))).map((r) => ({
    chapter: r.chapter, comfortRuns: r.comfortRuns, ticMax: r.ticMax,
    issue: 'transition molle (passages de confort)', option: 'COUPE/FUSION avec chapitre voisin OU renfort dramatique — décision 3-IA (structure de l\'arc)',
  }));
  const payoff = {
    issue: 'BACK-LOADING payoff sévère',
    measure: led.summary['payoffByAct'],
    plan3ia: 'ajouter 2-3 micro-payoffs avant l\'acte 3 (acte1 : vérité locale ; acte2 : preuve qui aggrave). Restructuration d\'arc = créatif, JAMAIS auto — proposition à valider 3-IA.',
  };

  const order = {
    workOrder: 'AUTHOR_REVIEW_WORK_ORDER', date: '2026-06-08', base: 'V3 gemma4',
    control: 'Croisement 3-IA (Gemini + ChatGPT + Claude) — pas de lecture Francky. Chaque item attend un verdict convergent avant exécution gatée.',
    law: 'PE-3 : aucun créatif auto-réparé. La régénération réelle = harnais guardRegen, lancé seulement après feu vert 3-IA.',
    priority1_noMover: noMover,
    priority2_softTransitions: softTransitions,
    priority3_payoffRedistribution: payoff,
    counts: { noMover: noMover.length, softTransitions: softTransitions.length, high: led.summary['high'], med: led.summary['med'] },
    note_dialogue: 'Dialogue conflit-ratio 0.879 = NON explicatif. L\'inquiétude « dialogue trop explicatif » des tribunaux N\'EST PAS confirmée par la mesure — pas d\'action.',
  };
  writeFileSync('runs/AUTHOR_REVIEW_WORK_ORDER.json', JSON.stringify(order, null, 2), 'utf8');
  console.log(JSON.stringify({ noMover: noMover.map((n) => n.chapter), softTransitions: softTransitions.length, payoff: payoff.measure, counts: order.counts }, null, 1));
}
main();
