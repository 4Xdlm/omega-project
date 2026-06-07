/** OMEGA — annotation TYPÉE du canonique : personnages + LIEUX + ÉVÉNEMENTS +
 *  OBJETS (extension Architecte 2026-06-07). Les seeds du run deviennent des
 *  pointeurs suivis — nourriture du Radar GPS. */
import { readFileSync, writeFileSync } from 'node:fs';
import { annotateMentions } from '../identity/mention-annotator.js';
import { importManuscript } from '../doctor/manuscript-import.js';
const RUN = 'runs/c8_book60k';
const text = readFileSync(`${RUN}/MANUSCRIT_V1_FINAL.md`, 'utf8');
const imp = importManuscript(text);
if (!imp.ok) throw new Error('import');
const r = annotateMentions(imp.value.chapters, [
  /* — personnages (casse stricte) — */
  { charId: 'ent_lena', canonical: 'Léna', aliases: ['Marchetti'], vital: 'ALIVE', kind: 'CHARACTER' },
  { charId: 'ent_garcia', canonical: 'Garcia', aliases: [], vital: 'ALIVE', kind: 'CHARACTER' },
  { charId: 'ent_gaspard', canonical: 'Gaspard', aliases: [], vital: 'ALIVE', kind: 'CHARACTER' },
  { charId: 'ent_yvon', canonical: 'Yvon', aliases: ['Squarcioni'], vital: 'ALIVE', kind: 'CHARACTER' },
  { charId: 'ent_henri', canonical: 'Henri', aliases: ['Morel'], vital: 'DEAD', kind: 'CHARACTER' },
  /* — lieux — */
  { charId: 'loc_kermorvan', canonical: 'Ker-Morvan', aliases: [], vital: 'ALIVE', kind: 'PLACE' },
  { charId: 'loc_mairie', canonical: 'mairie', aliases: [], vital: 'ALIVE', kind: 'PLACE' },
  { charId: 'loc_port', canonical: 'port', aliases: [], vital: 'ALIVE', kind: 'PLACE' },
  { charId: 'loc_eglise', canonical: 'église', aliases: [], vital: 'ALIVE', kind: 'PLACE' },
  { charId: 'loc_cale', canonical: 'cale', aliases: [], vital: 'ALIVE', kind: 'PLACE' },
  /* — événements / seeds — */
  { charId: 'evt_naufrage', canonical: 'naufrage', aliases: [], vital: 'ALIVE', kind: 'EVENT' },
  { charId: 'evt_dette', canonical: 'dette', aliases: ['dettes'], vital: 'ALIVE', kind: 'EVENT' },
  /* — objets-seeds — */
  { charId: 'obj_lettre', canonical: 'lettre', aliases: [], vital: 'ALIVE', kind: 'OBJECT' },
  { charId: 'obj_carnet', canonical: 'carnet', aliases: [], vital: 'ALIVE', kind: 'OBJECT' },
  { charId: 'obj_registre', canonical: 'registre', aliases: ['registres'], vital: 'ALIVE', kind: 'OBJECT' },
]);
if (!r.ok) throw new Error('annot');
writeFileSync(`${RUN}/MANUSCRIT_V1_FINAL_ANNOTATED.md`, r.value.annotated, 'utf8');
const perEntity: Record<string, number> = {};
for (const m of r.value.mentions) perEntity[m.charId] = (perEntity[m.charId] ?? 0) + m.count;
const byKind: Record<string, number> = {};
for (const m of r.value.mentions) byKind[m.kind] = (byKind[m.kind] ?? 0) + m.count;
const report = {
  totalMentions: r.value.totalMentions, resolvedRate: r.value.resolvedRate,
  mentionsByKind: byKind, perEntity,
  presenceSample: r.value.presence.slice(0, 3),
  unresolvedTop: r.value.unresolved.slice(0, 8),
  suspicions: r.value.suspicions.length, suspicionSamples: r.value.suspicions.slice(0, 5),
};
writeFileSync(`${RUN}/ANNOTATION_REPORT.json`, JSON.stringify(report, null, 2), 'utf8');
writeFileSync(`${RUN}/PRESENCE_MAP.json`, JSON.stringify(r.value.presence, null, 2), 'utf8');
console.log(JSON.stringify({ totalMentions: report.totalMentions, resolvedRate: report.resolvedRate, mentionsByKind: byKind, suspicions: report.suspicions }, null, 2));
