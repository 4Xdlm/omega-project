import { readFileSync, writeFileSync } from 'node:fs';
import { annotateMentions } from '../identity/mention-annotator.js';
import { importManuscript } from '../doctor/manuscript-import.js';
const RUN = 'runs/c8_book60k';
const text = readFileSync(`${RUN}/MANUSCRIT_V1_FINAL.md`, 'utf8');
const imp = importManuscript(text);
if (!imp.ok) throw new Error('import');
const r = annotateMentions(imp.value.chapters, [
  { charId: 'ent_lena', canonical: 'Léna', aliases: ['Marchetti'], vital: 'ALIVE' },
  { charId: 'ent_garcia', canonical: 'Garcia', aliases: [], vital: 'ALIVE' },
  { charId: 'ent_gaspard', canonical: 'Gaspard', aliases: [], vital: 'ALIVE' },
  { charId: 'ent_yvon', canonical: 'Yvon', aliases: ['Squarcioni'], vital: 'ALIVE' },
  { charId: 'ent_henri', canonical: 'Henri', aliases: ['Morel'], vital: 'DEAD' },
]);
if (!r.ok) throw new Error('annot');
writeFileSync(`${RUN}/MANUSCRIT_V1_FINAL_ANNOTATED.md`, r.value.annotated, 'utf8');
const perChar: Record<string, number> = {};
for (const m of r.value.mentions) perChar[m.charId] = (perChar[m.charId] ?? 0) + m.count;
const report = { totalMentions: r.value.totalMentions, resolvedRate: r.value.resolvedRate, perCharacter: perChar,
  unresolvedTop: r.value.unresolved.slice(0, 8), suspicions: r.value.suspicions.length,
  suspicionSamples: r.value.suspicions.slice(0, 5) };
writeFileSync(`${RUN}/ANNOTATION_REPORT.json`, JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
