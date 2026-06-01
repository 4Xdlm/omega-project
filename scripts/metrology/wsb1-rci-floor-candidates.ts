/**
 * OMEGA METROLOGY — WS-B1 RCI FLOOR CANDIDATES (CALC, READ-ONLY)
 * ============================================================================
 * Lit docs/audit/minaxis/MINAXIS_E_LITERARY_RECOMPUTE.csv (57 passages, 11 maîtres).
 * DÉCOUVERTE WS-B0b appliquée : MINAXIS_E a été calculé avec le MÊME probe packet
 * (signature=60, hook=85 constants) → la corpus-proof "0/57 ≥85" est packet-confondue.
 * RCI_ceiling (signature=hook=100) = distribution PACKET-FAIR.
 * Produit : percentiles RCI (probe) vs RCI_ceiling (fair), overall + FR/EN, candidats
 * floor (p10/p25/p50/p75), taux de passage à divers floors, comparaison K2-fair.
 * AUCUN floor appliqué, AUCUN patch, 0 Ollama. Run via Start-Process node + tsx.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
const REPO = path.resolve(process.cwd(), process.cwd().endsWith('sovereign-engine') ? '../..' : '.');
const CSV = path.join(REPO, 'docs', 'audit', 'minaxis', 'MINAXIS_E_LITERARY_RECOMPUTE.csv');
const OUT = path.join(REPO, 'docs', 'audit', 'minaxis');
const K2_REF = 82.6; // engine_RCI_reference_mean (real-packet K2 output)

function pct(sorted: number[], p: number): number {
  if (!sorted.length) return NaN;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return +(sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)).toFixed(2);
}
function dist(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  const mean = +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2);
  return { n: xs.length, mean, p10: pct(s, 10), p25: pct(s, 25), p50: pct(s, 50), p75: pct(s, 75), p90: pct(s, 90), min: +s[0].toFixed(2), max: +s[s.length - 1].toFixed(2) };
}
function passRate(xs: number[], floor: number) { return `${xs.filter((x) => x >= floor).length}/${xs.length}`; }

function main() {
  const lines = fs.readFileSync(CSV, 'utf8').trim().split(/\r?\n/);
  const header = lines[0].split(',');
  const ix = (k: string) => header.indexOf(k);
  const rows = lines.slice(1).map((l) => l.split(','));
  const lang = (r: string[]) => r[ix('lang')];
  const num = (r: string[], k: string) => parseFloat(r[ix(k)]);
  const all = rows;
  const fr = rows.filter((r) => lang(r) === 'fr');
  const en = rows.filter((r) => lang(r) === 'en');

  const rci = (rs: string[][]) => rs.map((r) => num(r, 'RCI'));
  const ceil = (rs: string[][]) => rs.map((r) => num(r, 'RCI_ceiling'));
  const rhythm = (rs: string[][]) => rs.map((r) => num(r, 'rhythm'));
  const euph = (rs: string[][]) => rs.map((r) => num(r, 'euphony'));

  const out: any = {
    tool: 'wsb1-rci-floor-candidates.ts',
    source: 'MINAXIS_E_LITERARY_RECOMPUTE.csv', n: all.length,
    CONFOUND_WARNING: 'MINAXIS_E RCI uses probe packet (signature=60, hook=85 const) — same artefact as WS-B0b. RCI_ceiling (signature=hook=100) is the PACKET-FAIR distribution. Floor candidates MUST use RCI_ceiling, not RCI(probe).',
    K2_ref_realpacket: K2_REF,
    RCI_probe: { all: dist(rci(all)), fr: dist(rci(fr)), en: dist(rci(en)) },
    RCI_ceiling_fair: { all: dist(ceil(all)), fr: dist(ceil(fr)), en: dist(ceil(en)) },
    rhythm: { all: dist(rhythm(all)), fr: dist(rhythm(fr)), en: dist(rhythm(en)) },
    euphony: { all: dist(euph(all)) },
    pass_rates_RCI_probe: Object.fromEntries([68, 72, 76, 80, 82, 85].map((f) => [f, passRate(rci(all), f)])),
    pass_rates_RCI_ceiling_fair: Object.fromEntries([76, 79, 80, 81, 82, 84, 85, 88].map((f) => [f, passRate(ceil(all), f)])),
    K2_vs_masters_fair: {
      K2_realpacket: K2_REF,
      masters_ceiling_median: dist(ceil(all)).p50,
      masters_ceiling_mean: dist(ceil(all)).mean,
      note: 'Comparaison packet-fair : K2 (real packet 82.6) vs maîtres CEILING. Si maîtres_ceiling >= K2 -> la circularité "K2>maîtres" etait un artefact probe-vs-real.',
    },
    floor_candidates_PACKET_FAIR: {
      p10_ceiling: dist(ceil(all)).p10,
      p25_ceiling: dist(ceil(all)).p25,
      p50_ceiling: dist(ceil(all)).p50,
      note: 'Candidats data-driven sur distribution PACKET-FAIR (RCI_ceiling). Gemini reco P25. Aucun appliqué.',
    },
  };
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'RCI_FLOOR_CANDIDATES.json'), JSON.stringify(out, null, 2), 'utf8');
  process.stderr.write(JSON.stringify(out, null, 2) + '\n');
}
main();
