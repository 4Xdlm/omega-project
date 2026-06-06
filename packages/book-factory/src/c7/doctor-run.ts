/**
 * OMEGA — C11.4 PREUVE E2E DU DOCTOR (script BF-08) — le mode REWRITE_DOCTOR
 * sur le manuscrit RÉEL 88k V0, vérité terrain connue (réparations manuelles C10).
 * Attendu : retrouver SEUL la dérive gardien (Thomas/Henri), le lieu double
 * (Saint-Marc/Ker-Morvan via rôle géo), les 2 coutures, la contradiction bottes.
 * Sortie : DOCTOR_REPORT.{json,md} + V1 du Doctor — la V0 reste INTACTE.
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { runDoctor } from '../doctor/doctor-orchestrator.js';

const RUN = process.env['DOCTOR_RUN'] ?? 'runs/c8_book60k';

async function main(): Promise<void> {
  const v0 = readFileSync(`${RUN}/MANUSCRIT.md`, 'utf8');

  const r = await runDoctor(v0, {
    overrides: {
      // La dérive « gardien » du 88k est CONFUSE (bruit massif) ⇒ le Doctor la
      // SIGNALE et exige une décision. La voici (décision éditoriale C10,
      // tribunaux convergents) : unification IMPOSÉE Thomas → Henri.
      identityUnify: new Map([['gardien', { keep: 'Henri', replace: ['Thomas'] }]]),
      // Lieu-double : Saint-Marc ×2 est SOUS le seuil de co-occurrence (limite
      // V1 documentée — primitif rare du ch.1) ⇒ décision humaine imposée (C10).
      locationUnify: new Map([['Ker-Morvan', ['Saint-Marc']]]),
      // Connaissance EXTERNE au texte (géographie bretonne) — override littéral.
      literalReplacements: new Map([['la mer du Nord', "l'Atlantique"]]),
    },
    seeds: ['naufrage', 'dette', 'lettre', 'carnet', 'registre'],
  });
  if (!r.ok) throw new Error(`${r.error.code}: ${r.error.detail}`);
  const rep = r.value;

  writeFileSync(`${RUN}/DOCTOR_V1.md`, rep.repairedProse, 'utf8');
  const slim = {
    import: rep.import,
    auditBefore: rep.auditBefore,
    auditAfter: rep.auditAfter,
    plan: {
      mechanical: rep.plan.mechanicalCount, surgical: rep.plan.surgicalCount, signal: rep.plan.signalCount,
      actions: rep.plan.actions.map((a) => a.kind === 'SIGNAL'
        ? { kind: a.kind, topic: a.topic, count: a.count, detail: a.detail.slice(0, 110) }
        : a.kind === 'SURGICAL_REWRITE'
          ? { kind: a.kind, chapter: a.chapter, reason: a.reason }
          : a.kind === 'FIX_BROKEN_STITCH'
            ? { kind: a.kind, chapter: a.chapter, fragment: a.danglingFragment, excerpt: a.excerpt.slice(0, 100) }
            : { kind: a.kind, keep: a.keep, replace: a.replace, evidence: a.evidence.slice(0, 160) }),
    },
    applied: rep.applied.filter((x) => x.applied).map((x) => ({ kind: x.action.kind, replacements: x.replacements })),
  };
  writeFileSync(`${RUN}/DOCTOR_REPORT.json`, JSON.stringify(slim, null, 2), 'utf8');

  const md = [
    `# DOCTOR E2E — ${RUN} (V0 intacte → DOCTOR_V1.md)`,
    `Import: ${rep.import.strategy} · ${rep.import.chapters} chapitres · ${rep.import.words} mots`,
    `Plan: ${rep.plan.mechanicalCount} MECHANICAL_SAFE · ${rep.plan.surgicalCount} SURGICAL_LLM (préparés, non exécutés — GO_B) · ${rep.plan.signalCount} SIGNAL_ONLY`,
    `Avant: drifts=${rep.auditBefore.identityDrifts} physics=${rep.auditBefore.physicsSignals} chap=${rep.auditBefore.chapterSignals} ticsFS=${rep.auditBefore.ticsFailShadow} unpaid=${rep.auditBefore.seedsUnpaid}`,
    `Après: drifts=${rep.auditAfter.identityDrifts} physics=${rep.auditAfter.physicsSignals} chap=${rep.auditAfter.chapterSignals} ticsFS=${rep.auditAfter.ticsFailShadow} unpaid=${rep.auditAfter.seedsUnpaid}`,
    `Actions appliquées:`,
    ...slim.applied.map((a) => `- ${a.kind} ×${a.replacements}`),
    `Actions mécaniques planifiées:`,
    ...slim.plan.actions.filter((a) => a.kind !== 'SIGNAL').map((a) => `- ${JSON.stringify(a)}`),
  ].join('\n\n');
  writeFileSync(`${RUN}/DOCTOR_REPORT.md`, md, 'utf8');
  process.stdout.write(`${md.slice(0, 2600)}\n`);
}

main().catch((e: unknown) => {
  process.stderr.write(`FATAL ${String(e)}\n`);
  process.exitCode = 1;
});
