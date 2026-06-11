/**
 * OMEGA Book-Factory — BREATH PROXY (read-only, ADVISORY, NOT_GATE, NO_AUTO_PATCH).
 * Réutilise les briques scellées omega-p0 (@omega/phonetic-stack) : analyzeEuphony,
 * analyzeRhythm, analyzeCalques. z-normalisation par composant (aucun axe ne domine ;
 * correctif de l'artefact densité/longueur). Ne mute rien, ne patche rien.
 * Cf BREATH_PROXY_SPEC.md. Canon V3 INTACT.
 *
 *   node packages/book-factory/scripts/breath-proxy-readonly.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ATLAS = path.resolve(HERE, '..', 'runs', 'atlas');
const P0 = path.resolve(HERE, '..', '..', 'omega-p0', 'dist', 'index.js');
const { analyzeEuphony, analyzeRhythm, analyzeCalques } = await import('file://' + P0);

const raw = (t) => {
  const e = analyzeEuphony(t), r = analyzeRhythm(t), c = analyzeCalques(t);
  return {
    euphony: e.euphonyScore ?? 0,
    cacophonie: (e.hiatusCount ?? 0) + (e.clusterCount ?? 0), // COMPTE, pas densité
    rhythm: r.rhythm_score ?? 0,
    calque: c.penalty ?? 0,
  };
};

// Source de vérité : triage (before/after de chaque candidat) + verdict gemma (GREEN19).
const triage = JSON.parse(readFileSync(path.join(ATLAS, 'AP_REVIEW_TRIAGE_V1.json'), 'utf8')).rows;
const judge = JSON.parse(readFileSync(path.join(ATLAS, 'GREEN19_LLM_JUDGE.json'), 'utf8'));
const keepIds = new Set(judge.filter((j) => j.verdict === 'KEEP_FOR_MICROLOT').map((j) => j.id));
const pick = (row) => ({ id: row.ticId, chapter: row.chapter, family: row.family, tic: row.tic, before: row.before, after: row.after, reason: row.auto_reason ?? '' });
const keep = triage.filter((r) => keepIds.has(r.ticId)).map(pick);
const orange = triage.filter((r) => String(r.final_ai_verdict || '').startsWith('ORANGE')).map(pick);
const all = [...keep.map((x) => ({ ...x, set: 'KEEP' })), ...orange.map((x) => ({ ...x, set: 'ORANGE' }))];
for (const it of all) { it.b = raw(it.before); it.a = raw(it.after); }

const comps = ['euphony', 'cacophonie', 'rhythm', 'calque'];
const stats = {};
for (const k of comps) {
  const xs = all.map((it) => it.a[k]);
  const m = xs.reduce((s, v) => s + v, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / xs.length) || 1;
  stats[k] = { m, sd };
}
const z = (k, v) => (v - stats[k].m) / stats[k].sd;
const breathZ = (o) => z('euphony', o.euphony) - z('cacophonie', o.cacophonie) + z('rhythm', o.rhythm) - z('calque', o.calque);
for (const it of all) {
  it.after_breath = +breathZ(it.a).toFixed(3);
  it.delta = +(breathZ(it.a) - breathZ(it.b)).toFixed(3);
  it.d_euphony = it.a.euphony - it.b.euphony;
  it.d_caco = it.a.cacophonie - it.b.cacophonie;
}
const slim = (it) => ({ id: it.id, chapter: it.chapter, family: it.family, tic: it.tic, reason: it.reason, after_breath: it.after_breath, delta: it.delta, d_euphony: it.d_euphony, d_caco: it.d_caco });
writeFileSync(path.join(ATLAS, '_breath_keep.json'), JSON.stringify(all.filter((x) => x.set === 'KEEP').sort((a, b) => b.delta - a.delta).map(slim), null, 1));
writeFileSync(path.join(ATLAS, '_breath_orange.json'), JSON.stringify(all.filter((x) => x.set === 'ORANGE').sort((a, b) => a.after_breath - b.after_breath).map(slim), null, 1));
console.log(`BREATH PROXY (read-only) : KEEP ${keep.length} + ORANGE ${orange.length} classés. ADVISORY/NOT_GATE. Canon intact.`);
