/**
 * OMEGA METROLOGY — MIN_AXIS aggregation (READ-ONLY audit support)
 * ============================================================================
 * Aggregates the FULL-5-AXIS sovereign scoring troves into one table +
 * distributions + min_axis frequency by axis + axis-vs-length. Emits
 * docs/audit/minaxis/MINAXIS_DISTRIBUTION.csv + a summary JSON.
 * Sources located by recon agent (full ECC/RCI/SII/IFI/AAI only; partial/zeroed
 * troves flagged). NO engine code touched. Run: npx tsx scripts/metrology/minaxis-aggregate.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO = path.resolve(process.cwd());
const OUT_DIR = path.join(REPO, 'docs', 'audit', 'minaxis');
const AXES = ['ecc', 'rci', 'sii', 'ifi', 'aai'] as const;
type Axis = typeof AXES[number];
interface Row { source: string; scene: string; model: string; words: number; composite: number; ecc: number; rci: number; sii: number; ifi: number; aai: number; min_axis: number; min_axis_name: string; partial: boolean; }

const rows: Row[] = [];
function push(source: string, scene: string, model: string, words: number, composite: number, a: Partial<Record<Axis, number>>) {
  const present = AXES.filter((x) => typeof a[x] === 'number' && (a[x] as number) > 0);
  const partial = present.length < 5;
  const vals = present.map((x) => a[x] as number);
  const min = vals.length ? Math.min(...vals) : 0;
  const minName = present.find((x) => a[x] === min) ?? '';
  rows.push({ source, scene, model, words: words || 0, composite: composite || 0,
    ecc: a.ecc ?? 0, rci: a.rci ?? 0, sii: a.sii ?? 0, ifi: a.ifi ?? 0, aai: a.aai ?? 0,
    min_axis: min, min_axis_name: minName, partial });
}
function readJSON(p: string): any { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }
function glob(dir: string, re: RegExp): string[] {
  const out: string[] = []; const st = [dir];
  while (st.length) { const d = st.pop()!; let e: fs.Dirent[]; try { e = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const x of e) { const f = path.join(d, x.name); if (x.isDirectory()) st.push(f); else if (re.test(f)) out.push(f); } }
  return out;
}

// 1) M0.b (sovereign + scribe)
const m0b = readJSON(path.join(REPO, 'docs/audit/metrology/m0b-runs/m0b_runs.json'));
if (m0b?.runs) for (const r of m0b.runs) for (const eng of ['sovereign', 'scribe'] as const) {
  const o = r[eng]; if (o && !o.error) push(`m0b/${eng}`, 'Le Gardien sc1', m0b.config?.MODEL ?? 'qwen3:32b', o.words, o.composite, { ecc: o.ECC, rci: o.RCI, sii: o.SII, ifi: o.IFI, aai: o.AAI });
}

// 2) BOOK_V3 (chapters[].macro_axes)
for (const f of glob(path.join(REPO, 'packages/sovereign-engine/sessions'), /BOOK_V3_.*BOOK_RESULTS\.json$/)) {
  const j = readJSON(f); const chs = j?.chapters ?? [];
  for (const c of chs) { const m = c.macro_axes ?? {}; push('BOOK_V3', c.title ?? `ch${c.chapter}`, j.model ?? 'qwen3:32b', c.words, c.composite, { ecc: m.ecc, rci: m.rci, sii: m.sii, ifi: m.ifi, aai: m.aai }); }
}

// 3) BESTOF3_VALIDATION (flat)
{
  const j = readJSON(path.join(REPO, 'packages/sovereign-engine/sessions/BESTOF3_VALIDATION/bestof3_results.json'));
  if (Array.isArray(j)) for (const r of j) push('BESTOF3', r.scene ?? '', r.model ?? 'qwen3:32b', r.words, r.composite, { ecc: r.ECC, rci: r.RCI, sii: r.SII, ifi: r.IFI, aai: r.AAI });
}

// 4) P311 overnight (flat)
{
  const j = readJSON(path.join(REPO, 'nexus/proof/P311_BENCH_OVERNIGHT_Z1_RESULTS_2026-05-16.json'));
  const arr = Array.isArray(j) ? j : (j?.results ?? []);
  for (const r of arr) push('P311', r.scene ?? '', r.model ?? 'qwen3:32b', r.words, r.composite, { ecc: r.ECC, rci: r.RCI, sii: r.SII, ifi: r.IFI, aai: r.AAI });
}

// 5) MINI_V5R6 (PARTIAL: ECC + RCI only — flagged)
for (const f of glob(path.join(REPO, 'packages/sovereign-engine/sessions'), /MINI_V5R6.*RESULTS\.json$/)) {
  const j = readJSON(f); const arr = Array.isArray(j) ? j : (j?.results ?? []);
  for (const r of arr) if (typeof r.composite === 'number') push('MINI_V5R6', r.scene ?? '', r.model ?? 'qwen3:32b', r.words, r.composite, { ecc: r.ECC, rci: r.RCI });
}

// ---------- stats ----------
function dist(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b); const n = s.length; if (!n) return null;
  const q = (p: number) => s[Math.min(n - 1, Math.floor(p * (n - 1)))];
  const mean = s.reduce((a, b) => a + b, 0) / n;
  return { n, mean: +mean.toFixed(2), median: +q(0.5)!.toFixed(2), p10: +q(0.1)!.toFixed(2), p25: +q(0.25)!.toFixed(2), p75: +q(0.75)!.toFixed(2), p90: +q(0.9)!.toFixed(2), min: +s[0]!.toFixed(2), max: +s[n - 1]!.toFixed(2) };
}
const full = rows.filter((r) => !r.partial);
const axisDist: Record<string, any> = {};
for (const x of AXES) axisDist[x] = dist(rows.filter((r) => r[x] > 0).map((r) => r[x]));
const minFreq: Record<string, number> = {};
for (const r of full) minFreq[r.min_axis_name] = (minFreq[r.min_axis_name] ?? 0) + 1;
// correlation axis vs words (Pearson) on full rows
function pearson(a: number[], b: number[]) { const n = a.length; if (n < 3) return null; const ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n; let num = 0, da = 0, db = 0; for (let i = 0; i < n; i++) { num += (a[i]! - ma) * (b[i]! - mb); da += (a[i]! - ma) ** 2; db += (b[i]! - mb) ** 2; } return da && db ? +(num / Math.sqrt(da * db)).toFixed(3) : null; }
const wordCorr: Record<string, number | null> = {};
for (const x of AXES) { const fr = full.filter((r) => r.words > 0); wordCorr[x] = pearson(fr.map((r) => r.words), fr.map((r) => r[x])); }

fs.mkdirSync(OUT_DIR, { recursive: true });
const cols = ['source', 'scene', 'model', 'words', 'composite', 'ecc', 'rci', 'sii', 'ifi', 'aai', 'min_axis', 'min_axis_name', 'partial'];
const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => { const v = (r as any)[c]; const s = String(v); return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(','))].join('\n');
fs.writeFileSync(path.join(OUT_DIR, 'MINAXIS_DISTRIBUTION.csv'), csv + '\n', 'utf8');
const summary = { generated: 'minaxis-aggregate.ts', total_rows: rows.length, full_5axis_rows: full.length, partial_rows: rows.length - full.length,
  sources: [...new Set(rows.map((r) => r.source))], axisDist, min_axis_frequency_full: minFreq, axis_vs_words_pearson_full: wordCorr,
  rci_below_85: full.filter((r) => r.rci < 85).length, ecc_below_88: full.filter((r) => r.ecc < 88).length,
  rci_is_min: full.filter((r) => r.min_axis_name === 'rci').length, ecc_is_min: full.filter((r) => r.min_axis_name === 'ecc').length };
fs.writeFileSync(path.join(OUT_DIR, 'minaxis_summary.json'), JSON.stringify(summary, null, 2), 'utf8');
process.stderr.write(`[minaxis] ${rows.length} rows (${full.length} full-5axis), sources ${summary.sources.join(',')}\n`);
process.stderr.write(`[minaxis] min_axis freq (full): ${JSON.stringify(minFreq)} | RCI<85: ${summary.rci_below_85}/${full.length} | ECC<88: ${summary.ecc_below_88}/${full.length}\n`);
process.stderr.write(`[minaxis] axisDist RCI=${JSON.stringify(axisDist.rci)} ECC=${JSON.stringify(axisDist.ecc)}\n`);
process.stderr.write(`[minaxis] word-corr: ${JSON.stringify(wordCorr)}\n`);
