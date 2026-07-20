/**
 * OMEGA — DE_SIMILE_P1_MICROLOT (2026-07-19) : découverte LECTORAT confirmée par corpus
 * (SIMILE_SENSOR_P0) : famille IMPACT « tomba/frappa/claqua… comme » ≈20× la P90 corpus (2,2/100k),
 * + gabarits répétés (pierre dans un puits ×4, couperet ×3, coup de poing ×3…). SCALPEL, pas purge :
 *   - IMPACT : 17 → ≤3 ; gabarits répétés → ≤1 par famille ; images isolées fortes INTOUCHABLES.
 *   - remplacement = fait concret / conséquence physique / phrase plus sèche ; JAMAIS un autre « comme »
 *     ni un tic gestuel (silence, immobile, regard, mâchoire, fit un pas, esquissa).
 * Entrée MANUSCRIT_V4_COH6.md → sortie MANUSCRIT_V4_COH7.md. Gardé : buildCanonical + famRise=0
 * (familles existantes) + garde SIMILE (impact≤3, aucun gabarit « comme » répété >1, densité en baisse)
 * + phrase finale intacte. gemma4:31b assisté, cache résumable.
 *   [DRY=1] tsx src/c7/patch-v4-desimile.ts   (cwd = book-factory ; Ollama requis)
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { AuthorDecisionLedger } from '../identity/author-seal.js';
import { buildCanonical } from './build-canonical.js';
import { measureRepetition } from '../coherence/repetition-sensor.js';

const OUT = 'runs/atlas';
const INPUT = `${OUT}/MANUSCRIT_V4_COH6.md`;
const OUT_MS = `${OUT}/MANUSCRIT_V4_COH7.md`;
const CAND_MS = `${OUT}/MANUSCRIT_V4_COH7_CANDIDATE.md`;
const LEDGER = `${OUT}/COH7_DESIMILE_LEDGER.jsonl`;
const CACHE = `${OUT}/COH7_REWRITE_CACHE.json`;
const MODEL = process.env['PATCH_MODEL'] ?? 'gemma4:31b';
const DRY = process.env['DRY'] === '1';
const FINAL_LINE = 'La justice est une notion urbaine';

const IMPACT_KEEP = 3;   // on garde au plus 3 clichés d'impact
const SIM_RE = /\bcomme (?:un|une|des)\b[^.,;:!?»\n]{0,32}/giu;
const IMPACT_RE = /\b(?:tomba|tombait|frappa|frappait|claqua|r[ée]sonna|r[ée]sonnait|[ée]clata|s'abattit|jaillit|fusa|percuta|d[ée]chira)\b[^.!?»\n]{0,30}\bcomme\b[^.,;:!?»\n]{0,25}/giu;
// gemma ne doit PAS réintroduire de comparaison ni de tic gestuel
// interdit à la réécriture : comparaisons + toute la famille GESTURAL/ATMOSPHERIC/PHRASE du juge
// (aucune famille de tic ne peut remonter d'une réécriture ; garantit famRise=0).
const FORBID = ['comme un', 'comme une', 'comme des',
  'esquissa', 'ne cilla pas', 'ne bougea', 'se crispa', 'fronça', 'ne répondit', 'ferma les yeux',
  'haussa les épaules', 'hocha la tête', 'eut un rictus', 'ne recula', 'ne dit rien',
  'fit un pas', 'resta immobile', 'immobile', 'le silence', 'la mâchoire', 'les mâchoires', 'près de la fenêtre'];
const EN_RE = /\b(the|and the|with the|something|nothing|standing|passing|blood|shadow)\b/giu;

function countRe(t: string, re: RegExp): number { return (t.match(new RegExp(re.source, re.flags)) ?? []).length; }
function famTotals(text: string): Record<string, number> {
  const p = measureRepetition(text);
  const o: Record<string, number> = { exactRepeats: p.exactRepeatCount };
  for (const f of p.families) o[f.family] = f.total;
  return o;
}
function normHead(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/gu, '').replace(/[^a-z\s]/gu, ' ').replace(/\s+/gu, ' ').trim().split(' ').slice(0, 6).join(' ');
}
function hash(s: string): string { return createHash('sha256').update(s.normalize('NFC')).digest('hex').slice(0, 16); }
function words(s: string): number { return s.split(/\s+/u).filter((w) => w.length > 0).length; }
function countOccExact(t: string, s: string): number { if (s.length === 0) return 0; let n = 0; let i = t.indexOf(s); while (i >= 0) { n++; i = t.indexOf(s, i + s.length); } return n; }
function rulesOnlyLedger(): AuthorDecisionLedger {
  const raw = readFileSync('../../nexus/proof/AUTHOR_DECISIONS.json', 'utf8');
  const parsed = JSON.parse(raw) as { decisions: Array<{ anchorExcerpt: string | null }> };
  return AuthorDecisionLedger.fromJson(JSON.stringify({ ledger: 'AUTHOR_DECISIONS', concept: 'CONCEPT-AUTHOR-SEAL-001', decisions: parsed.decisions.filter((d) => d.anchorExcerpt === null) }));
}
interface Unit { raw: string; start: number; end: number; }
function unitSpans(text: string): Unit[] {
  const re = /[^.!?…»]*[.!?…»]+/gsu;
  const out: Unit[] = []; let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) { if (m[0].trim().length > 0) out.push({ raw: m[0], start: m.index, end: re.lastIndex }); }
  return out;
}
function unitAt(units: Unit[], idx: number): Unit | null { for (const u of units) if (idx >= u.start && idx < u.end) return u; return null; }

async function gemma(sys: string, user: string, seed: number, numPredict: number): Promise<string> {
  const body = { model: MODEL, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], stream: false, think: false, options: { temperature: 0.7, top_p: 0.9, num_predict: numPredict, seed } };
  const res = await fetch('http://localhost:11434/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const data = (await res.json()) as { message?: { content?: string } };
  return (data.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/gu, '').trim();
}
function clean(out: string): string {
  let s = out.trim().replace(/^["«»""']+|["«»""']+$/gu, '').trim();
  s = s.replace(/^(phrase r[ée]écrite\s*:?\s*)/iu, '').trim();
  const lines = s.split(/\n/u).map((x) => x.trim()).filter((x) => x.length > 0);
  return (lines.length > 0 ? lines.join(' ') : s).trim();
}
function accept(orig: string, out: string): { ok: boolean; why: string } {
  if (out.length === 0) return { ok: false, why: 'empty' };
  if (out === orig.trim()) return { ok: false, why: 'identical' };
  const lo = out.toLowerCase();
  for (const f of FORBID) if (lo.includes(f.toLowerCase())) return { ok: false, why: `forbid:${f}` };
  if (new RegExp(IMPACT_RE.source, 'iu').test(out)) return { ok: false, why: 'impact-simile' };
  if (new RegExp(EN_RE.source, 'iu').test(out)) return { ok: false, why: 'english' };
  const wo = words(orig); const wn = words(out);
  if (wn < 2) return { ok: false, why: `len ${wo}->${wn}` };
  if (wo >= 10 && wn < wo * 0.4) return { ok: false, why: `len ${wo}->${wn}` };
  if (wn > wo * 2.0 + 8) return { ok: false, why: `len ${wo}->${wn}` };
  return { ok: true, why: 'ok' };
}

const SYS = "Tu es un romancier français de polar littéraire (registre Simenon, sobre, concret). On te donne UNE phrase contenant une COMPARAISON clichée (« comme un… »). Réécris la phrase en SUPPRIMANT la comparaison : remplace-la par un FAIT concret, une conséquence physique directe, un détail local, ou fais simplement une phrase plus sèche. INTERDIT ABSOLU : une autre comparaison en « comme », et tout tic (silence, immobile, regard, mâchoire, fit un pas, esquissa). Garde le sens, l'information et le ton noir. Réponds UNIQUEMENT par la phrase réécrite, sans guillemets ni commentaire.";

async function main(): Promise<void> {
  writeFileSync(LEDGER, '');
  const log = (o: unknown): void => appendFileSync(LEDGER, `${JSON.stringify(o)}\n`, 'utf8');
  let text = readFileSync(INPUT, 'utf8');
  const famBefore = famTotals(text);
  const impactBefore = countRe(text, IMPACT_RE);
  const simBefore = countRe(text, SIM_RE);
  log({ event: 'START', impactBefore, simBefore, famBefore });

  const cache: Record<string, string> = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) as Record<string, string> : {};
  const units = unitSpans(text);

  // 1) cibles : IMPACT au-delà de 3 (ordre du doc) + gabarits « comme un(e/des) » répétés (>1) au-delà du 1er
  const toRewrite = new Map<string, string>(); // unit.trim -> famille
  // IMPACT
  const impRe = new RegExp(IMPACT_RE.source, IMPACT_RE.flags); let m: RegExpExecArray | null; let impIdx: number[] = [];
  while ((m = impRe.exec(text)) !== null) { impIdx.push(m.index); if (m.index === impRe.lastIndex) impRe.lastIndex++; }
  for (const idx of impIdx.slice(IMPACT_KEEP)) { const u = unitAt(units, idx); if (u && !u.raw.includes('## Chapitre') && !u.raw.includes(FINAL_LINE)) toRewrite.set(u.raw.trim(), 'IMPACT'); }
  // gabarits répétés
  const simRe = new RegExp(SIM_RE.source, SIM_RE.flags); const byHead = new Map<string, number[]>();
  while ((m = simRe.exec(text)) !== null) { const h = normHead(m[0]); if (!byHead.has(h)) byHead.set(h, []); byHead.get(h)!.push(m.index); if (m.index === simRe.lastIndex) simRe.lastIndex++; }
  for (const [, idxs] of byHead) { if (idxs.length < 2) continue; for (const idx of idxs.slice(1)) { const u = unitAt(units, idx); if (u && !u.raw.includes('## Chapitre') && !u.raw.includes(FINAL_LINE)) { const k = u.raw.trim(); if (!toRewrite.has(k)) toRewrite.set(k, 'REPEATED'); } } }
  log({ event: 'PLAN', targets: toRewrite.size });
  if (DRY) { for (const [orig, fam] of toRewrite) log({ dry: true, fam, orig: orig.slice(0, 90) }); console.log(`DESIMILE_DRY targets=${toRewrite.size}`); return; }

  // 2) réécriture guardée (multi-occurrences, cache)
  let applied = 0; const unresolved: Array<{ orig: string; why: string }> = []; let done = 0;
  const usedHead = new Map<string, number>(); // diversité : aucun remplacement court ne se répète (anti « tic contre tic »)
  for (const [orig, fam] of toRewrite) {
    done++;
    const occ = countOccExact(text, orig); if (occ === 0) continue;
    for (let k = 0; k < occ; k++) {
      const h = hash(`${orig}|${k}`);
      let repl = cache[h] ?? '';
      if (repl.length === 0) {
        let lastWhy = 'no-attempt';
        for (let attempt = 0; attempt < 6; attempt++) {
          const seed = 200 + attempt * 7 + done * 13 + k * 101;
          const strict = attempt >= 2 ? ' ATTENTION : ta réponse contenait encore une comparaison ou un cliché. Supprime TOUTE comparaison, fais une phrase sèche et concrète.' : '';
          const hint = ' N\'emploie NI « le silence » NI un geste (ne bougea, ne répondit, haussa…). Fais bref et concret. Exemples de ton : « Le mot pesa dans la pièce. » / « Personne ne parla. » / « Puis plus rien. » / « La phrase resta suspendue. »';
          let out: string;
          try { out = await gemma(SYS, `Supprime la comparaison clichée.${strict}${hint}\nPhrase :\n${orig}`, seed, Math.min(400, words(orig) * 3 + 40)); }
          catch (e) { lastWhy = `ollama:${String(e)}`; await sleep(400); continue; }
          const cand = clean(out); const v = accept(orig, cand);
          if (v.ok) { const hd = normHead(cand); if (attempt < 5 && (usedHead.get(hd) ?? 0) >= 1) { lastWhy = `overused-repl:${hd}`; await sleep(120); continue; } repl = cand; break; }
          lastWhy = v.why; await sleep(120);
        }
        if (repl.length === 0) { unresolved.push({ orig, why: lastWhy }); log({ i: done, k, ok: false, fam, why: lastWhy, orig: orig.slice(0, 70) }); continue; }
        cache[h] = repl; writeFileSync(CACHE, JSON.stringify(cache), 'utf8');
      }
      if (countOccExact(text, orig) > 0) { const hd = normHead(repl); usedHead.set(hd, (usedHead.get(hd) ?? 0) + 1); text = text.replace(orig, repl); applied += 1; log({ i: done, k, ok: true, fam, wOrig: words(orig), wNew: words(repl) }); }
    }
  }

  // 3) garde globale
  const impactAfter = countRe(text, IMPACT_RE); const simAfter = countRe(text, SIM_RE);
  // aucun gabarit « comme un(e/des) » répété > 1 après
  const headsAfter = new Map<string, number>();
  { const re = new RegExp(SIM_RE.source, SIM_RE.flags); let mm: RegExpExecArray | null; while ((mm = re.exec(text)) !== null) { const h = normHead(mm[0]); headsAfter.set(h, (headsAfter.get(h) ?? 0) + 1); if (mm.index === re.lastIndex) re.lastIndex++; } }
  const stillRepeated = [...headsAfter.entries()].filter(([, c]) => c > 1).map(([h, c]) => `${h}:${c}`);
  const famAfter = famTotals(text);
  const famRise = Object.keys(famBefore).filter((k) => (famAfter[k] ?? 0) > (famBefore[k] ?? 0)).map((k) => `${k}:${famBefore[k]}->${famAfter[k]}`);
  const finalOk = text.includes(FINAL_LINE);
  const build = await buildCanonical(text, { authorLocks: rulesOnlyLedger(), enforceAuthorRules: false });
  const wOk = build.ok ? build.value.words >= 34000 : false;
  const pass = impactAfter <= IMPACT_KEEP && stillRepeated.length === 0 && famRise.length === 0 && finalOk && build.ok && wOk && unresolved.length <= 8 && simAfter < simBefore;

  writeFileSync(CAND_MS, text, 'utf8');
  if (pass) writeFileSync(OUT_MS, text, 'utf8');
  log({ event: 'RESULT', applied, unresolved: unresolved.length, impactBefore, impactAfter, simBefore, simAfter, stillRepeated, famRise, finalOk, langClean: build.ok ? build.value.cleanliness.LANG_CLEAN : null, words: build.ok ? build.value.words : null, outCanon: build.ok ? build.value.finalHash : 'FAIL', verdict: pass ? 'PASS' : 'FAIL' });
  console.log(`DESIMILE_DONE verdict=${pass ? 'PASS' : 'FAIL'} applied=${applied} unresolved=${unresolved.length} impact ${impactBefore}->${impactAfter} sim ${simBefore}->${simAfter} stillRepeated=[${stillRepeated.join(',')}] famRise=[${famRise.join(',')}] finalLine=${finalOk} canon=${build.ok ? build.value.finalHash.slice(0, 12) : 'FAIL'}`);
}
function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }
main().catch((e: unknown) => { appendFileSync(LEDGER, `${JSON.stringify({ event: 'FATAL', err: String(e) })}\n`, 'utf8'); console.error('FATAL', e); process.exitCode = 1; });
