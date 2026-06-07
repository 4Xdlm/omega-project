/**
 * OMEGA — NCR-EXPORT-V1-001 : REBUILD DE L'EXPORT CANONIQUE UNIQUE (BF-08).
 * « Une correction qui existe dans le rapport mais pas dans le manuscrit est une
 * réparation fantôme » (tribunal). Ce script produit MANUSCRIT_V1_FINAL.md :
 * V0 → Doctor mécanique (couture+dédup FIXÉES) + overrides éditoriaux C10 +
 * SURGICAL bottes APPLIQUÉ (pont réel) + réparation du tail ch.50 (continuation
 * bornée Ollama, sinon coupe propre) + dédoublonnage adjacent tracé → RE-AUDIT
 * → HASH → VÉRIFICATION DES 3 PREUVES du tribunal. Un seul artefact canonique.
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { sha256 } from '@omega/canon-kernel';

import { runDoctor } from '../doctor/doctor-orchestrator.js';
import { dedupAdjacentDuplicateSentences, isTailTruncated } from '../doctor/repair-executor.js';
import { ScribeGatedRepairPort } from '../doctor/scribe-bridge.js';
import { importManuscript } from '../doctor/manuscript-import.js';
import { scanSentencePhysics } from '../coherence/sentence-physics.js';

const RUN = process.env['FINAL_RUN'] ?? 'runs/c8_book60k';
const KNOWN = ['Léna', 'Garcia', 'Gaspard', 'Yvon', 'Henri', 'Ker-Morvan'];

async function repairTail(text: string, port: ScribeGatedRepairPort): Promise<{ text: string; method: string }> {
  const trimmed = text.trimEnd();
  if (!isTailTruncated(trimmed)) return { text, method: 'TAIL_ALREADY_COMPLETE' };
  // La dernière « phrase » est tronquée — tenter une CONTINUATION bornée qui CLÔT.
  const lastStop = Math.max(trimmed.lastIndexOf('. '), trimmed.lastIndexOf('? '), trimmed.lastIndexOf('! '), trimmed.lastIndexOf('» '));
  const completePart = trimmed.slice(0, lastStop + 1);
  const brokenTail = trimmed.slice(lastStop + 1).trim();
  const directive = `[FAIT] La phrase finale du roman est coupée en plein mot : « ${brokenTail.slice(-120)} ». [ORDRE] Termine UNIQUEMENT cette phrase et clos la scène en 1 à 3 phrases sobres, cohérentes avec l'aveu d'Yvon sur le naufrage. N'introduis aucun fait nouveau.`;
  const completed = await port.rewriteSegment(directive, brokenTail);
  if (completed !== brokenTail && completed.trim().length > brokenTail.length && /[.!?…»]$/u.test(completed.trim())) {
    return { text: `${completePart} ${completed.trim()}\n`, method: 'TAIL_COMPLETED_BY_SURGICAL' };
  }
  // Fallback no-op sûr : coupe à la dernière phrase complète (perte minimale tracée).
  return { text: `${completePart}\n`, method: `TAIL_CUT_AT_LAST_SENTENCE (perdu: « ${brokenTail.slice(0, 80)}… »)` };
}

async function main(): Promise<void> {
  const v0 = readFileSync(`${RUN}/MANUSCRIT.md`, 'utf8');
  const port = new ScribeGatedRepairPort({ knownEntities: KNOWN });

  /* 1. Doctor complet : mécanique (couture FIXÉE) + overrides + SURGICAL APPLIQUÉ. */
  const r = await runDoctor(v0, {
    overrides: {
      identityUnify: new Map([['gardien', { keep: 'Henri', replace: ['Thomas'] }]]),
      locationUnify: new Map([['Ker-Morvan', ['Saint-Marc']]]),
      literalReplacements: new Map([['la mer du Nord', "l'Atlantique"]]),
    },
    seeds: ['naufrage', 'dette', 'lettre', 'carnet', 'registre'],
    executor: { llm: port, allowSurgical: true }, // ← le SURGICAL est DANS l'export cette fois
  });
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  let text = r.value.repairedProse;

  /* 2. Dédoublonnage adjacent exact (tracé). */
  const dedup = dedupAdjacentDuplicateSentences(text);
  text = dedup.text;

  /* 3. Réparation du tail ch.50. */
  const tail = await repairTail(text, port);
  text = tail.text;

  writeFileSync(`${RUN}/MANUSCRIT_V1_FINAL.md`, text, 'utf8');
  const finalHash = String(sha256(text.normalize('NFC')));

  /* 4. LES 3 PREUVES DU TRIBUNAL — INSTRUMENTALES (sur l'export, pas un rapport).
   * proof2 v2 : le critère n'est pas la présence d'un fragment (le SURGICAL peut
   * corriger par EXPLICITATION en gardant le membre) mais l'absence de
   * CONTRADICTION mesurée par l'instrument FOOTWEAR sur l'export final. */
  const metalDoubled = /Le métal est froid, luisant\.\s*(?:\r?\n\s*)*Le métal est froid, luisant\./u.test(text);
  const imp = importManuscript(text);
  const lastChapter = imp.ok ? imp.value.chapters[imp.value.chapters.length - 1] : undefined;
  const tailTruncated = lastChapter !== undefined ? isTailTruncated(lastChapter.prose) : true;
  const surgicalApplied = r.value.applied.filter((a) => a.action.kind === 'SURGICAL_REWRITE' && a.applied).length;
  const footwearSignals = imp.ok
    ? imp.value.chapters.flatMap((c) => {
        const s = scanSentencePhysics(c.prose, c.chapter);
        return s.ok ? s.value.filter((x) => x.kind === 'FOOTWEAR_CONTRADICTION') : [];
      })
    : [];

  const proof = {
    exportFile: 'MANUSCRIT_V1_FINAL.md',
    finalHash,
    proof1_noDuplicatedMetalSentence: !metalDoubled,
    proof2_footwearContradictionsInExport: footwearSignals.length,
    proof2_pass: footwearSignals.length === 0,
    proof3_ch50Complete: !tailTruncated,
    tailMethod: tail.method,
    surgicalAppliedCount: surgicalApplied,
    adjacentDuplicatesRemoved: dedup.count,
    mechanicalApplied: r.value.applied.filter((a) => a.applied && a.action.kind !== 'SURGICAL_REWRITE').map((a) => `${a.action.kind}×${a.replacements}`),
    targetedProof: r.value.targetedProof,
    words: text.split(/\s+/u).filter((w) => w.length > 0).length,
  };
  writeFileSync(`${RUN}/NCR_EXPORT_V1_001_PROOF.json`, JSON.stringify(proof, null, 2), 'utf8');
  process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
}

main().catch((e: unknown) => { process.stderr.write(`FATAL ${String(e)}\n`); process.exitCode = 1; });
