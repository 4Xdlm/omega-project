/**
 * OMEGA — RÈGLE « TRANSGRESSION ABSORBÉE » v2 (opérationnalisation CALC d'EMP-20).
 * Une mesure SOFT (densité-tics, longueur) n'est jugée qu'en RELATIF au livre lui-même
 * (médiane + MAD), jamais sur un seuil absolu arbitraire. Un chapitre ne TRANSGRESSE que s'il
 * est un OUTLIER de sa propre distribution. Et même outlier, la transgression est ABSORBÉE si un
 * axe compensateur mesurable (AGENCY dramatique) monte proportionnellement : le coût (densité/
 * longueur excédentaire) est payé par un gain (le chapitre fait AGIR / RÉVÉLER / DÉCIDER).
 *
 * HARD (jamais transgressable, gérés par buildCanonical) : langue, tics BANNIS, cohérence.
 * SOFT (transgressable si absorbé) : densité-tics, longueur.
 *   Verdict par chapitre : CLEAN (dans la distribution) / ABSORBED (outlier compensé) /
 *   DEFECT (outlier NON compensé = vrai défaut).
 *   tsx src/c7/absorption-analyzer.ts runs/atlas/MANUSCRIT_V4_DRAFT.md
 */
import { readFileSync } from 'node:fs';
import { measureRepetition } from '../coherence/repetition-sensor.js';

const K_OUTLIER = 2.0;        // outlier si mesure > médiane + K·MAD
const AGENCY_RE = /\b(avoua|avouai|révéla|exigea|ordonna|décida|saisit|frappa|plongea|arracha|brandit|tendit|jeta|poussa|trancha|lâcha|coupa|pointa|referma|désigna|accusa|menaça|confessa|dénonça|surgit|bondit|empoigna|gifla|renversa|abattit)\w*/giu;

function words(s: string): number { return s.split(/\s+/u).filter((w) => w.length > 0).length; }
function ticDensity(text: string): number { const w = words(text); if (!w) return 0; const rep = measureRepetition(text); return (rep.families.reduce((a, f) => a + f.total, 0) / w) * 1000; }
function agencyDensity(text: string): number { const w = words(text); if (!w) return 0; return ((text.match(AGENCY_RE) ?? []).length / w) * 1000; }
function chapters(md: string): Array<{ n: number; prose: string }> {
  const parts = md.split(/(?:^|\n)#{1,3}\s*Chapitre\s+(\d+)\s*\n/);
  const out: Array<{ n: number; prose: string }> = [];
  for (let i = 1; i < parts.length; i += 2) out.push({ n: Number(parts[i]), prose: (parts[i + 1] ?? '').trim() });
  return out;
}
function median(xs: number[]): number { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? (s[m] ?? 0) : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2; }
function mad(xs: number[], med: number): number { return median(xs.map((x) => Math.abs(x - med))); }

interface Row { n: number; words: number; dens: number; agency: number; }

function main(): void {
  const path = process.argv[2] ?? 'runs/atlas/MANUSCRIT_V4_DRAFT.md';
  const chs = chapters(readFileSync(path, 'utf8'));
  const rows: Row[] = chs.map((c) => ({ n: c.n, words: words(c.prose), dens: Number(ticDensity(c.prose).toFixed(2)), agency: Number(agencyDensity(c.prose).toFixed(2)) }));
  const densMed = median(rows.map((r) => r.dens)); const densMad = mad(rows.map((r) => r.dens), densMed);
  const lenMed = median(rows.map((r) => r.words)); const lenMad = mad(rows.map((r) => r.words), lenMed);
  const agMed = median(rows.map((r) => r.agency));
  const densCap = densMed + K_OUTLIER * densMad; const lenCap = lenMed + K_OUTLIER * lenMad;

  console.log(`ABSORPTION v2 (book-relative) — ${path}`);
  console.log(`densité: médiane=${densMed.toFixed(2)} MAD=${densMad.toFixed(2)} → cap outlier=${densCap.toFixed(2)}`);
  console.log(`longueur: médiane=${lenMed} MAD=${lenMad} → cap outlier=${lenCap.toFixed(0)}`);
  console.log(`agency: médiane=${agMed.toFixed(2)}\n`);
  console.log(`${'ch'.padStart(3)} ${'mots'.padStart(5)} ${'dens'.padStart(6)} ${'agency'.padStart(6)}  verdict`);
  const defects: number[] = [];
  for (const r of rows) {
    const densOut = r.dens > densCap; const lenOut = r.words > lenCap;
    let verdict = 'CLEAN';
    if (densOut || lenOut) {
      const absorbed = r.agency >= agMed; // compensation : agency au moins médiane
      const which = [densOut ? `densité(${r.dens})` : '', lenOut ? `longueur(${r.words})` : ''].filter(Boolean).join('+');
      if (absorbed) verdict = `ABSORBED ${which} — compensé par agency=${r.agency}≥méd ${agMed.toFixed(2)}`;
      else { verdict = `DEFECT ${which} — agency=${r.agency}<méd, non compensé`; defects.push(r.n); }
    }
    console.log(`${String(r.n).padStart(3)} ${String(r.words).padStart(5)} ${r.dens.toFixed(2).padStart(6)} ${r.agency.toFixed(2).padStart(6)}  ${verdict}`);
  }
  console.log(`\nOutliers non compensés (DEFECT) : ${defects.length}${defects.length ? ' → ch ' + defects.join(', ') : ''}`);
  const aveu = rows.find((r) => r.n === 14);
  if (aveu) console.log(`\nAVEU (ch.14) : ${aveu.words} mots, densité ${aveu.dens} (cap ${densCap.toFixed(2)}), agency ${aveu.agency} (méd ${agMed.toFixed(2)}) → ${aveu.dens > densCap || aveu.words > lenCap ? (aveu.agency >= agMed ? 'OUTLIER MAIS ABSORBÉ' : 'OUTLIER DEFECT') : 'DANS LA DISTRIBUTION (aucune transgression)'}`);
}
main();
