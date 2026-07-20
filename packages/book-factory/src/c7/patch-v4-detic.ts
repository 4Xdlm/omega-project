/**
 * OMEGA — AP-9 (P3 V4 polish) : DE-TIC gardé, adossé au CORPUS RÉEL.
 * Cibles + plafonds issus de outputs/omega_tic_corpus_verite_v1.md (218 romans polar FR, 24,88 M mots).
 * On réduit chaque tic PROUVÉ (ratio 69–679× vs vrais écrivains) à un plafond adossé au corpus.
 * On NE TOUCHE PAS les tournures prouvées normales (hocha la tête, haussa les épaules, du coin de l'œil…).
 * Réécriture phrase-à-phrase par gemma4 (voix Simenon), guardée : la sortie ne réintroduit aucun tic cible.
 * Garde globale : buildCanonical (LANG clean) + famRise=0 (aucune famille de tic ne remonte) + phrase finale intacte.
 * Résumable : cache runs/atlas/COH5_REWRITE_CACHE.json (hash phrase -> réécriture acceptée).
 *   [DRY=1] tsx src/c7/patch-v4-detic.ts   (cwd = book-factory ; Ollama gemma4:31b requis)
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { AuthorDecisionLedger } from '../identity/author-seal.js';
import { buildCanonical } from './build-canonical.js';
import { measureRepetition } from '../coherence/repetition-sensor.js';

const OUT = 'runs/atlas';
const INPUT = `${OUT}/MANUSCRIT_V4_COH4.md`;
const OUT_MS = `${OUT}/MANUSCRIT_V4_COH5.md`;
const CAND_MS = `${OUT}/MANUSCRIT_V4_COH5_CANDIDATE.md`;
const LEDGER = `${OUT}/COH5_DETIC_LEDGER.jsonl`;
const CACHE = `${OUT}/COH5_REWRITE_CACHE.json`;
const MODEL = process.env['PATCH_MODEL'] ?? 'gemma4:31b';
const DRY = process.env['DRY'] === '1';
const FINAL_LINE = 'La justice est une notion urbaine';

interface Target { key: string; re: RegExp; cap: number; }
const TARGETS: Target[] = [
  { key: 'fit un pas', re: /fit un pas/giu, cap: 5 },
  { key: 'ne cilla pas', re: /ne cilla pas/giu, cap: 2 },
  { key: 'le silence qui suivit', re: /le silence qui suivit/giu, cap: 3 },
  { key: 'esquissa un/une', re: /esquissa (?:un|une)/giu, cap: 4 },
  { key: 'pres de la fenetre', re: /pr[eè]s de la fen[eê]tre/giu, cap: 4 },
  { key: 'ne repondit pas', re: /ne r[eé]pondit pas/giu, cap: 8 },
  { key: 'immobile', re: /\bimmobile\b/giu, cap: 12 },
  { key: 'comme un coup de feu', re: /comme un coup de feu/giu, cap: 2 },
];
// gemma ne doit réintroduire AUCUN de ces clichés (les 8 cibles, formes de surface).
const FORBID = ['fit un pas', 'ne cilla pas', 'le silence qui suivit', 'le silence', 'esquissa un sourire', 'esquissa une', 'esquissa un', 'près de la fenêtre', 'pres de la fenetre', 'ne répondit pas', 'comme un coup de feu', 'immobile'];
const EN_RE = /\b(the|and the|with the|something|nothing|standing|passing|viscous|lipids|blood|shadow)\b/giu;
// Contrôle de diversité : aucune tournure de réécriture ne doit dominer (anti « on troque un tic contre un tic »).
const VARIANT_CAP = 6;
const SUBJ = new Set(['garcia', 'yvon', 'lena', 'gaspard', 'squarcioni', 'il', 'elle', 'lhomme', 'linspecteur', 'le', 'la', 'les', 'un', 'une', 'l', 'maire', 'ses', 'son', 'sa', 'soudain', 'puis', 'alors', 'dehors', 'ici', 'leur', 'ce', 'cette', 'inspecteur']);
const CLITIC = new Set(['se', 'ne', 'en', 'y', 'lui', 'me', 'te', 'nous', 'vous', 's']);
function sig(s: string): string {
  const toks = s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/gu, '').replace(/[^a-z\s']/gu, ' ').replace(/'/gu, '').split(/\s+/u).filter((x) => x.length > 0);
  let i = 0; while (i < toks.length && SUBJ.has(toks[i]!)) i += 1;
  let key = toks[i] ?? '';
  if (CLITIC.has(key) && toks[i + 1]) key += ` ${toks[i + 1]}`; // "se tut" != "se planta"
  return key;
}

function countRe(t: string, re: RegExp): number { return (t.match(new RegExp(re.source, re.flags)) ?? []).length; }
function famTotals(text: string): Record<string, number> {
  const p = measureRepetition(text);
  const o: Record<string, number> = { exactRepeats: p.exactRepeatCount };
  for (const f of p.families) o[f.family] = f.total;
  return o;
}
function hash(s: string): string { return createHash('sha256').update(s.normalize('NFC')).digest('hex').slice(0, 16); }
function words(s: string): number { return s.split(/\s+/u).filter((w) => w.length > 0).length; }
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
function unitAt(units: Unit[], idx: number): Unit | null {
  for (const u of units) if (idx >= u.start && idx < u.end) return u;
  return null;
}

async function gemma(sys: string, user: string, seed: number, numPredict: number): Promise<string> {
  const body = { model: MODEL, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], stream: false, think: false, options: { temperature: 0.7, top_p: 0.9, num_predict: numPredict, seed } };
  const res = await fetch('http://localhost:11434/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const data = (await res.json()) as { message?: { content?: string } };
  return (data.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/gu, '').trim();
}
function clean(out: string): string {
  let s = out.trim();
  s = s.replace(/^["«»""']+|["«»""']+$/gu, '').trim();
  s = s.replace(/^(phrase r[ée]écrite\s*:?\s*)/iu, '').trim();
  s = s.replace(/^[-–—]\s*/u, (m) => m).trim(); // garde tiret de dialogue légitime
  const firstLine = s.split(/\n/u).map((x) => x.trim()).filter((x) => x.length > 0);
  return (firstLine.length > 0 ? firstLine.join(' ') : s).trim();
}
function accept(orig: string, out: string, removeTics: string[]): { ok: boolean; why: string } {
  if (out.length === 0) return { ok: false, why: 'empty' };
  if (out === orig.trim()) return { ok: false, why: 'identical' };
  const lo = out.toLowerCase();
  for (const t of removeTics) if (lo.includes(t.toLowerCase())) return { ok: false, why: `still:${t}` };
  for (const f of FORBID) if (lo.includes(f.toLowerCase())) return { ok: false, why: `forbid:${f}` };
  if (new RegExp(EN_RE.source, 'iu').test(out)) return { ok: false, why: 'english' };
  const wo = words(orig); const wn = words(out);
  if (wn < 2) return { ok: false, why: `len ${wo}->${wn}` };                 // vide/tronqué
  if (wo >= 10 && wn < wo * 0.4) return { ok: false, why: `len ${wo}->${wn}` }; // perte de contenu sur phrase longue
  if (wn > wo * 2.2 + 8) return { ok: false, why: `len ${wo}->${wn}` };       // délayage
  return { ok: true, why: 'ok' };
}

const SYS = "Tu es un romancier français de polar littéraire (registre Simenon, sobre, tenu, concret). On te donne UNE phrase d'un roman et des clichés à en retirer. Réécris la phrase en supprimant ces clichés, en gardant EXACTEMENT le même sens, le même ton, la même information, et un français impeccable. Varie la formulation (ne remplace pas par un synonyme mécanique). N'introduis AUCUN nouveau cliché. Réponds UNIQUEMENT par la phrase réécrite, sans guillemets, sans commentaire, sans titre.";

async function main(): Promise<void> {
  writeFileSync(LEDGER, '');
  const log = (o: unknown): void => appendFileSync(LEDGER, `${JSON.stringify(o)}\n`, 'utf8');
  let text = readFileSync(INPUT, 'utf8');
  const famBefore = famTotals(text);
  const before: Record<string, number> = {};
  for (const t of TARGETS) before[t.key] = countRe(text, t.re);
  log({ event: 'START', input: INPUT, words: words(text), famBefore, ticBefore: before });

  const cache: Record<string, string> = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) as Record<string, string> : {};

  // 1) collecte des unités à réécrire (occurrences au-delà du plafond, ordre du doc, on garde les `cap` premières)
  const units = unitSpans(text);
  const unitTics = new Map<string, Set<string>>(); // unit.raw.trim() -> tics à retirer
  for (const t of TARGETS) {
    const re = new RegExp(t.re.source, t.re.flags);
    const idxs: number[] = []; let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) { idxs.push(m.index); if (m.index === re.lastIndex) re.lastIndex++; }
    if (idxs.length <= t.cap) continue;
    const toRewrite = idxs.slice(t.cap); // garde les `cap` premières occurrences
    for (const idx of toRewrite) {
      const u = unitAt(units, idx); if (!u) continue;
      const key = u.raw.trim();
      if (key.includes('## Chapitre') || key.includes(FINAL_LINE)) continue; // protège headers + chute
      if (!unitTics.has(key)) unitTics.set(key, new Set());
      unitTics.get(key)!.add(t.key);
    }
  }
  log({ event: 'PLAN', unitsToRewrite: unitTics.size });

  // 2+3) réécriture guardée gemma (cache + retries) PUIS application inline.
  // Multi-occurrences : une phrase verbatim dupliquée (tic + répétition exacte) est réécrite
  // occurrence par occurrence avec des variantes DISTINCTES (tue le tic ET l'exact-repeat).
  let appliedCount = 0;
  const unresolved: Array<{ orig: string; tics: string[]; why: string }> = [];
  const usedSig = new Map<string, number>(); // diversité : compte des tournures de réécriture déjà employées
  let done = 0;
  for (const [orig, ticSet] of unitTics) {
    done++;
    const tics = [...ticSet];
    if (orig.includes('## Chapitre') || orig.includes(FINAL_LINE)) continue;
    const removeList = tics.map((k) => k === 'esquissa un/une' ? 'esquissa un' : k === 'comme un coup de feu' ? 'coup de feu' : k === 'pres de la fenetre' ? 'près de la fenêtre' : k);
    const occ = countOccExact(text, orig);
    if (occ === 0) continue;
    if (DRY) { log({ i: done, dry: true, occ, tics, orig: orig.slice(0, 80) }); continue; }
    for (let k = 0; k < occ; k++) {
      const h = hash(`${orig}|${tics.join(',')}|${k}`);
      let repl = cache[h] ?? '';
      if (repl.length === 0) {
        let lastWhy = 'no-attempt';
        for (let attempt = 0; attempt < 4; attempt++) {
          const seed = 100 + attempt * 7 + done * 13 + k * 101;
          const strict = attempt >= 2 ? " ATTENTION : ta réponse précédente contenait encore un cliché interdit. Reformule COMPLÈTEMENT sans aucun des clichés listés." : '';
          const variety = k > 0 ? ` (variante n°${k + 1} — formule-la DIFFÉREMMENT des autres occurrences)` : '';
          const hint = tics.some((t) => t === 'ne repondit pas' || t === 'comme un coup de feu')
            ? " N'utilise NI « silence » NI « resta muet ». Pour un personnage qui se tait, VARIE à chaque fois : se tut, ne dit mot, laissa la question sans réponse, aucune réponse ne vint, détourna les yeux, fixa un point devant lui, baissa la tête. Pour un bruit sec : claqua, une détonation, un craquement bref."
            : '';
          const overused = [...usedSig.entries()].filter(([, n]) => n >= VARIANT_CAP).map(([kk]) => kk);
          const divHint = overused.length > 0 ? ` Ne commence PAS la phrase par ces tournures déjà trop utilisées : ${overused.slice(0, 8).join(', ')}. Varie la construction.` : '';
          let out: string;
          try { out = await gemma(SYS, `Clichés à supprimer : ${removeList.join(' ; ')}.${strict}${variety}${hint}${divHint}\nPhrase :\n${orig}`, seed, Math.min(420, words(orig) * 3 + 50)); }
          catch (e) { lastWhy = `ollama:${String(e)}`; await sleep(400); continue; }
          const cand = clean(out);
          const v = accept(orig, cand, removeList);
          if (!v.ok) { lastWhy = v.why; await sleep(120); continue; }
          const sg = sig(cand);
          if ((usedSig.get(sg) ?? 0) >= VARIANT_CAP) { lastWhy = `overused:${sg}`; await sleep(120); continue; } // cap DUR : aucun gabarit ne dépasse VARIANT_CAP
          repl = cand; break;
        }
        if (repl.length === 0) { unresolved.push({ orig, tics, why: lastWhy }); log({ i: done, k, ok: false, why: lastWhy, orig: orig.slice(0, 70) }); continue; }
        cache[h] = repl; writeFileSync(CACHE, JSON.stringify(cache), 'utf8');
      }
      if (countOccExact(text, orig) > 0) { const sg2 = sig(repl); usedSig.set(sg2, (usedSig.get(sg2) ?? 0) + 1); text = text.replace(orig, repl); appliedCount += 1; log({ i: done, k, ok: true, sig: sg2, wOrig: words(orig), wNew: words(repl) }); }
    }
  }

  if (DRY) { console.log(`DETIC_DRY units=${unitTics.size} (aucune écriture)`); log({ event: 'DRY_DONE', units: unitTics.size }); return; }

  // 4) garde globale
  const after: Record<string, number> = {}; for (const t of TARGETS) after[t.key] = countRe(text, t.re);
  const overCap = TARGETS.filter((t) => after[t.key]! > t.cap).map((t) => `${t.key}:${after[t.key]}/${t.cap}`);
  const famAfter = famTotals(text);
  const famRise = Object.keys(famBefore).filter((k) => (famAfter[k] ?? 0) > (famBefore[k] ?? 0)).map((k) => `${k}:${famBefore[k]}->${famAfter[k]}`);
  const finalOk = text.includes(FINAL_LINE);
  // garde anti-gabarit-émergent : les tournures de remplacement ne doivent pas devenir un nouveau tic.
  const EMERGENT = ["un silence s'installa", 'ne prenne la parole', 'resta muet', 'resta silencieux', 'passa sur le visage', 'passa sur les lèvres', "s'installa avant que"];
  const lo = text.toLowerCase();
  const emergent = EMERGENT.map((p) => ({ p, n: countOccExact(lo, p.toLowerCase()) }));
  const emergentBad = emergent.filter((e) => e.n > 6).map((e) => `${e.p}:${e.n}`);
  const build = await buildCanonical(text, { authorLocks: rulesOnlyLedger(), enforceAuthorRules: false });
  const wOk = build.ok ? build.value.words >= 34000 : false;
  const pass = famRise.length === 0 && finalOk && build.ok && wOk && unresolved.length <= 20 && emergentBad.length === 0;

  writeFileSync(CAND_MS, text, 'utf8'); // toujours garder le travail LLM
  if (pass) writeFileSync(OUT_MS, text, 'utf8');
  log({ event: 'RESULT', applied: appliedCount, unresolved: unresolved.length, ticBefore: before, ticAfter: after, overCap, famBefore, famAfter, famRise, emergent, emergentBad, finalOk, langClean: build.ok ? build.value.cleanliness.LANG_CLEAN : null, narrativeClean: build.ok ? build.value.cleanliness.NARRATIVE_CLEAN : null, outWords: build.ok ? build.value.words : null, outCanon: build.ok ? build.value.finalHash : 'FAIL', verdict: pass ? 'PASS' : 'FAIL' });
  log({ event: 'UNRESOLVED', items: unresolved.slice(0, 20) });
  console.log(`DETIC_DONE verdict=${pass ? 'PASS' : 'FAIL'} applied=${appliedCount} unresolved=${unresolved.length} overCap=[${overCap.join(',')}] famRise=[${famRise.join(',')}] finalLine=${finalOk} words=${build.ok ? build.value.words : 'FAIL'} canon=${build.ok ? build.value.finalHash.slice(0, 12) : 'FAIL'}`);
}
function countOccExact(t: string, s: string): number { if (s.length === 0) return 0; let n = 0; let i = t.indexOf(s); while (i >= 0) { n++; i = t.indexOf(s, i + s.length); } return n; }
function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }
main().catch((e: unknown) => { appendFileSync(LEDGER, `${JSON.stringify({ event: 'FATAL', err: String(e) })}\n`, 'utf8'); console.error('FATAL', e); process.exitCode = 1; });
