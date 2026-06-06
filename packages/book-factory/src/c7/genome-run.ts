/**
 * OMEGA — C12 E2E GÉNOME (script BF-08) — l'ADN narratif du 88k RÉEL :
 * V0 + DOCTOR_V1 + chaîne des 50 admissions. Preuves BF-13 : double build ⇒
 * même hash ; V0 vs V1 ⇒ hashes différents (œuvres distinctes).
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';

import { buildNarrativeGenome, sameWork } from '../mycelium-export/narrative-genome.js';
import { importManuscript } from '../doctor/manuscript-import.js';
import { runDoctorAudit } from '../doctor/doctor-orchestrator.js';

const RUN = process.env['GENOME_RUN'] ?? 'runs/c8_book60k';
const SEEDS = ['naufrage', 'dette', 'lettre', 'carnet', 'registre'];

function genomeOf(path: string, title: string, admissionHashes: readonly string[]) {
  const text = readFileSync(path, 'utf8');
  const imp = importManuscript(text);
  if (!imp.ok) throw new Error(imp.error.code);
  const protagonists = imp.value.castProposal.slice(0, 4).map((c) => c.name);
  const audit = runDoctorAudit(imp.value.chapters, protagonists, SEEDS);
  if (!audit.ok) throw new Error(audit.error.code);
  const g = buildNarrativeGenome({
    title,
    chapters: imp.value.chapters.map((c) => ({ chapter: c.chapter, prose: c.prose })),
    cast: imp.value.castProposal,
    seedLedger: audit.value.arc.seedLedger,
    chapterFunctions: audit.value.arc.chapterFunctions,
    tics: audit.value.tics.rows,
    admissionHashes,
  });
  if (!g.ok) throw new Error(g.error.code);
  return g.value;
}

function main(): void {
  // Chaîne de preuve : les 50 admissions hashées du run.
  const admissionHashes: string[] = [];
  for (const dir of readdirSync(RUN).filter((d) => d.startsWith('chap_'))) {
    const p = `${RUN}/${dir}/admission.json`;
    if (existsSync(p)) {
      const adm = JSON.parse(readFileSync(p, 'utf8')) as { admissionHash?: string };
      if (typeof adm.admissionHash === 'string') admissionHashes.push(adm.admissionHash);
    }
  }

  const v0a = genomeOf(`${RUN}/MANUSCRIT.md`, 'Le Silence du Phare (V0)', admissionHashes);
  const v0b = genomeOf(`${RUN}/MANUSCRIT.md`, 'Le Silence du Phare (V0)', admissionHashes);
  const v1 = genomeOf(`${RUN}/DOCTOR_V1.md`, 'Le Silence du Phare (V0)', admissionHashes); // MÊME titre : seule la prose diffère

  writeFileSync(`${RUN}/MYCELIUM_EXPORT_V0.json`, JSON.stringify(v0a, null, 2), 'utf8');
  writeFileSync(`${RUN}/MYCELIUM_EXPORT_DOCTOR_V1.json`, JSON.stringify(v1, null, 2), 'utf8');

  const proof = {
    reproducible_v0: sameWork(v0a, v0b), // attendu TRUE (BF-13)
    distinct_v0_v1: !sameWork(v0a, v1), // attendu TRUE (œuvre modifiée = ADN différent)
    v0Hash: v0a.genomeHash,
    v1Hash: v1.genomeHash,
    admissionChainLength: admissionHashes.length,
    chapters: v0a.book.chapters,
    words: v0a.book.words,
    castSize: v0a.cast.length,
    ticsTop3: v0a.ticsSignature.slice(0, 3),
  };
  writeFileSync(`${RUN}/MYCELIUM_PROOF.json`, JSON.stringify(proof, null, 2), 'utf8');
  process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
}

main();
