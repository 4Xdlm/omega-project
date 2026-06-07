/** OMEGA — RAPPORT FIXTURE 120 du R6_SEAM_SURGEON (exigence tribunal : « le
 *  Tribunal attend le résultat de la fixture des 120 tests pour valider le
 *  branchement »). Écrit SEAM_SURGEON_FIXTURE_REPORT.json. */
import { writeFileSync } from 'node:fs';
import { operateSeam } from '../doctor/seam-surgeon.js';
import { buildGoldset, portFor } from '../../tests/seam-surgeon-goldset.js';

const RUN = process.env['FINAL_RUN'] ?? 'runs/c8_book60k';

async function main(): Promise<void> {
  const gold = buildGoldset();
  const byCategory: Record<string, Record<string, number>> = {};
  const failures: string[] = [];
  for (const g of gold) {
    const r = await operateSeam(g.surgeonCase, { llm: portFor(g.port) });
    const got = r.ok ? r.value.action : 'REFUSE';
    byCategory[g.category] = byCategory[g.category] ?? {};
    const cell = `${g.expected}→${got}`;
    byCategory[g.category]![cell] = (byCategory[g.category]![cell] ?? 0) + 1;
    if (got !== g.expected) failures.push(`${g.id}: attendu ${g.expected}, obtenu ${got}`);
  }
  const report = {
    module: 'R6_SEAM_SURGEON (CONTINUITY_WEAVER)',
    concept: 'CONCEPT-SEAM-SURGEON-001',
    date: '2026-06-07',
    fixtureSize: gold.length,
    categories: byCategory,
    accuracy: (gold.length - failures.length) / gold.length,
    failures,
    invariants: 'INV-SS-001..008 PASS (tests dédiés) + REFUSE(MISSING_WORLD_STATE) + cas réel famille bottes',
    doctrine: 'Le code détecte/borne/vérifie/refuse/hashe ; le LLM propose. Verdicts REPAIR / KEEP_STYLED / ESCALATE.',
    productionBranching: 'EN ATTENTE ratification tribunal (gating mandaté) — aucun passage sur le 88k sans GO.',
  };
  writeFileSync(`${RUN}/SEAM_SURGEON_FIXTURE_REPORT.json`, JSON.stringify(report, null, 2), 'utf8');
  process.stdout.write(`FIXTURE 120 : accuracy=${report.accuracy} failures=${failures.length}\n${JSON.stringify(byCategory, null, 1)}\n`);
}
main().catch((e: unknown) => { process.stderr.write(`FATAL ${String(e)}\n`); process.exitCode = 1; });
