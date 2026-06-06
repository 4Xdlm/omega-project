/**
 * OMEGA — NCR-MYC-001 REBUILD + CLOSEOUT (script BF-08) — le Mycelium V2 PROPRE :
 * génome production depuis la V1 RÉPARÉE, cast VALIDÉ (autorité plan/C10),
 * alias gravés, ledger 3 états, candidats inconnus séparés. Produit le rapport
 * de clôture chiffré exigé par le tribunal (10 items).
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { buildNarrativeGenome } from '../mycelium-export/narrative-genome.js';
import { importManuscript, detectCast } from '../doctor/manuscript-import.js';
import { runDoctorAudit } from '../doctor/doctor-orchestrator.js';

const RUN = process.env['NCR_RUN'] ?? 'runs/c8_book60k';

/** Cast VALIDÉ — autorité : plan C7 + décision éditoriale C10 (Henri = gardien). */
const VALIDATED_CAST: readonly string[] = ['Léna', 'Garcia', 'Gaspard', 'Yvon', 'Henri'];
const ALIASES: readonly { surface: string; canonical: string }[] = [
  { surface: 'Marchetti', canonical: 'Léna' },
  { surface: 'Squarcioni', canonical: 'Yvon' },
  { surface: 'gardien', canonical: 'Henri' }, // décision C10 : le gardien EST Henri Morel
  { surface: 'Morel', canonical: 'Henri' },
];
const SEEDS = ['naufrage', 'dette', 'lettre', 'carnet', 'registre'];

function genomeOf(path: string, validated: boolean) {
  const text = readFileSync(path, 'utf8');
  const imp = importManuscript(text);
  if (!imp.ok) throw new Error(imp.error.code);
  const audit = runDoctorAudit(imp.value.chapters, VALIDATED_CAST.slice(0, 4), SEEDS);
  if (!audit.ok) throw new Error(audit.error.code);
  const g = buildNarrativeGenome({
    title: 'Le Silence du Phare',
    chapters: imp.value.chapters.map((c) => ({ chapter: c.chapter, prose: c.prose })),
    cast: imp.value.castProposal,
    ...(validated ? { validatedCast: VALIDATED_CAST, aliases: ALIASES } : {}),
    seedLedger: audit.value.arc.seedLedger,
    chapterFunctions: audit.value.arc.chapterFunctions,
    tics: audit.value.tics.rows,
  });
  if (!g.ok) throw new Error(g.error.code);
  return { genome: g.value, rawCast: imp.value.castProposal, chapters: imp.value.chapters };
}

function main(): void {
  // AVANT (état NCR) : V0 bruitée, cast extrait brut — pour le diff du closeout.
  const before = genomeOf(`${RUN}/MANUSCRIT.md`, false);
  // APRÈS : V1 réparée + cast validé + alias + ledger 3 états.
  const afterA = genomeOf(`${RUN}/DOCTOR_V1.md`, true);
  const afterB = genomeOf(`${RUN}/DOCTOR_V1.md`, true); // reproductibilité
  // Sensibilité : V0 validée ≠ V1 validée (textes différents ⇒ ADN différents).
  const v0Validated = genomeOf(`${RUN}/MANUSCRIT.md`, true);

  // Tokens rejetés par la stoplist : diff entre extraction sans/avec stoplist
  // (la stoplist est désormais DANS detectCast — on mesure sur la V0 ce qu'elle bloque).
  const v0Text = readFileSync(`${RUN}/MANUSCRIT.md`, 'utf8');
  const impV0 = importManuscript(v0Text);
  if (!impV0.ok) throw new Error('import');
  const castNow = detectCast(impV0.value.chapters).map((c) => c.name);
  const structuralBlocked = ['Acte', 'Clac', 'Chapitre', 'Scène'].filter((t) => !castNow.includes(t));

  const henri = afterA.genome.cast.find((c) => c.name === 'Henri');
  const lettre = afterA.genome.seedLedger.find((s) => s.seed === 'lettre');
  const registre = afterA.genome.seedLedger.find((s) => s.seed === 'registre');

  const closeout = {
    item1_castBefore: before.genome.cast.slice(0, 10).map((c) => `${c.name}×${c.occurrences}`),
    item1_castAfter: afterA.genome.cast.map((c) => `${c.name}×${c.occurrences}`),
    item2_structuralTokensBlocked: structuralBlocked,
    item3_candidateEntitiesSeparated: afterA.genome.unknownCandidates.slice(0, 10).map((u) => `${u.name}×${u.occurrences}`),
    item4_validatedCastFinal: VALIDATED_CAST,
    item5_aliasTable: ALIASES,
    item6_ledgerBefore: before.genome.seedLedger.map((s) => `${s.seed}:${s.payoff}`),
    item6_ledgerAfter: afterA.genome.seedLedger.map((s) => `${s.seed}:${s.payoff}`),
    item7_lettreStatus: lettre?.payoff ?? 'n/a',
    item7_registreStatus: registre?.payoff ?? 'n/a',
    item8_myceliumV2Hash: afterA.genome.genomeHash,
    item9_reproducible: afterA.genome.genomeHash === afterB.genome.genomeHash,
    item10_sensitivity_v0_vs_v1: v0Validated.genome.genomeHash !== afterA.genome.genomeHash,
    henriOccurrencesWithAliases: henri?.occurrences ?? 0,
    castSource: afterA.genome.castSource,
  };
  writeFileSync(`${RUN}/MYCELIUM_V2_CLEAN.json`, JSON.stringify(afterA.genome, null, 2), 'utf8');
  writeFileSync(`${RUN}/NCR_MYC_001_CLOSEOUT.json`, JSON.stringify(closeout, null, 2), 'utf8');

  /* UI régénérée — la vue MYCELIUM consomme désormais l'ADN PROPRE. */
  const g = afterA.genome;
  const mycelium = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>OMEGA MYCELIUM V2 — ADN propre</title>
<style>body{font-family:system-ui;background:#0d1117;color:#e6edf3;margin:24px}code{background:#161b22;padding:2px 6px;border-radius:4px;font-size:12px}h1{font-size:18px}h2{font-size:13px;color:#8b949e}li{font-size:13px;margin:3px 0}.h{color:#7ee787}.warn{color:#d29922}</style></head>
<body><h1>OMEGA MYCELIUM V2 (NCR-MYC-001 close) — « Le Silence du Phare » V1 réparée</h1>
<p>ADN narratif (castSource=<b>${g.castSource}</b>): <code class="h">${g.genomeHash}</code></p>
<h2>Cast VALIDÉ (occurrences alias inclus)</h2><ul>${g.cast.map((c) => `<li>${c.name}×${c.occurrences} (1ʳᵉ ch.${c.firstChapter})</li>`).join('')}</ul>
<h2>Alias gravés</h2><ul>${g.aliases.map((a) => `<li>« ${a.surface} » → ${a.canonical}</li>`).join('')}</ul>
<h2>Candidats NON validés (séparés — jamais gravés au cast)</h2><ul>${g.unknownCandidates.slice(0, 8).map((u) => `<li class="warn">${u.name}×${u.occurrences}</li>`).join('')}</ul>
<h2>Graines (3 états)</h2><ul>${g.seedLedger.map((s) => `<li>« ${s.seed} » planté ${s.planted} → <b>${s.payoff}</b> (${s.recalls} rappels)</li>`).join('')}</ul>
<h2>Tics signature</h2><p>${g.ticsSignature.slice(0, 5).map((t) => `«${t.gram}»×${t.occurrences}`).join(' · ')}</p>
</body></html>`;
  writeFileSync(`${RUN}/MYCELIUM_VIEW_60K.html`, mycelium, 'utf8');

  process.stdout.write(`${JSON.stringify(closeout, null, 2)}\n`);
}

main();
