/** OMEGA — annotation TYPÉE du canonique : personnages + LIEUX + ÉVÉNEMENTS +
 *  OBJETS (extension Architecte 2026-06-07). Les seeds du run deviennent des
 *  pointeurs suivis — nourriture du Radar GPS. */
import { readFileSync, writeFileSync } from 'node:fs';
import { annotateMentions } from '../identity/mention-annotator.js';
import { EntityRegistry, verifyManuscriptIdentities } from '../identity/entity-registry.js';
import { importManuscript } from '../doctor/manuscript-import.js';
const RUN = 'runs/c8_book60k';
const text = readFileSync(`${RUN}/MANUSCRIT_V1_FINAL.md`, 'utf8');
const imp = importManuscript(text);
if (!imp.ok) throw new Error('import');
/* P0-A : le REGISTRE TYPÉ UNIQUE est LA source — l'annotateur reçoit une
 * PROJECTION, plus jamais sa propre carte du monde. */
const reg = new EntityRegistry('c8_book60k');
const MINTS: ReadonlyArray<Parameters<EntityRegistry['mint']>[0]> = [
  { kind: 'CHARACTER', canonical: 'Léna', aliases: ['Marchetti'] },
  { kind: 'CHARACTER', canonical: 'Garcia' },
  { kind: 'CHARACTER', canonical: 'Gaspard' },
  { kind: 'CHARACTER', canonical: 'Yvon', aliases: ['Squarcioni'] },
  { kind: 'CHARACTER', canonical: 'Henri', aliases: ['Morel'], vital: 'DEAD' },
  { kind: 'PLACE', canonical: 'Ker-Morvan' },
  { kind: 'PLACE', canonical: 'mairie' },
  { kind: 'PLACE', canonical: 'port' },
  { kind: 'PLACE', canonical: 'église' },
  { kind: 'PLACE', canonical: 'cale' },
  { kind: 'EVENT', canonical: 'naufrage' },
  { kind: 'EVENT', canonical: 'dette', aliases: ['dettes'] },
  { kind: 'OBJECT', canonical: 'lettre' },
  { kind: 'OBJECT', canonical: 'carnet' },
  { kind: 'OBJECT', canonical: 'registre', aliases: ['registres'] },
];
for (const m of MINTS) {
  const minted = reg.mint(m);
  if (!minted.ok) throw new Error(`mint: ${minted.error.detail}`);
}
const r = annotateMentions(imp.value.chapters, reg.toAnnotatorEntities());
if (!r.ok) throw new Error('annot');
/* LOI CASTING TOTAL : le déficit du 88k est MESURÉ (jamais silencieux). */
const casting = verifyManuscriptIdentities(imp.value.chapters, reg);
const castingDeficit = casting.ok ? casting.value.undefinedMentions : [];
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
  /* P0-A — LOI CASTING TOTAL : déficit du 88k (entités jamais mintées). */
  castingDeficitCount: castingDeficit.length,
  castingDeficitTop: [...castingDeficit].sort((a, b) => b.count - a.count).slice(0, 10),
};
writeFileSync(`${RUN}/ANNOTATION_REPORT.json`, JSON.stringify(report, null, 2), 'utf8');
writeFileSync(`${RUN}/PRESENCE_MAP.json`, JSON.stringify(r.value.presence, null, 2), 'utf8');
console.log(JSON.stringify({ totalMentions: report.totalMentions, resolvedRate: report.resolvedRate, mentionsByKind: byKind, suspicions: report.suspicions }, null, 2));
