/**
 * OMEGA — GOLD-SET BENCH DES PROXYS (script BF-08) — étalonnage ordonné par
 * l'Architecte : (1) REVELATION V1 (figée ici pour comparaison) vs V2 (recalibrée)
 * sur le gold-set 64 ; (2) re-mesure du ledger 88k avec la V2 (lettre/registre
 * attendus PAID si la V2 lit « confirma »/« trouva les lettres ») ; (3) tics du
 * 18k = 2ᵉ point de données EMP-16 ; (4) sensibilité du seuil UNCERTAIN (quintile).
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { benchRevelationProxy, PROXY_GOLDSET } from '../goldset/proxy-goldset.js';
import { REVELATION_RE, analyzeArcCoherence } from '../coherence/arc-coherence.js';
import { measureTics } from '../coherence/tics-gate.js';
import { importManuscript } from '../doctor/manuscript-import.js';

const RUN60 = 'runs/c8_book60k';
const RUN18 = 'runs/c7_book';

/** V1 FIGÉE (l'ancienne regex, conservée ici comme référence de bench). */
const REVELATION_V1 = /\b(avou[ae]|avoua|révèle|révéla|comprend\s+que|comprit\s+que|la\s+vérité|découvre\s+que|découvrit\s+que|apprend\s+que|apprit\s+que|reconnaît|reconnut|c[''](?:était|est)\s+(?:lui|elle)\s+qui|enfin\s+su)\b/iu;

function main(): void {
  /* ── 1. Bench V1 vs V2 sur le gold-set ───────────────────────────────── */
  const v1 = benchRevelationProxy((t) => REVELATION_V1.test(t));
  const v2 = benchRevelationProxy((t) => REVELATION_RE.test(t));

  /* ── 2. Ledger 88k re-mesuré avec la V2 ──────────────────────────────── */
  const v1Text = readFileSync(`${RUN60}/DOCTOR_V1.md`, 'utf8');
  const imp = importManuscript(v1Text);
  if (!imp.ok) throw new Error('import60');
  const arc = analyzeArcCoherence(
    imp.value.chapters.map((c) => ({ chapter: c.chapter, prose: c.prose })),
    { seeds: ['naufrage', 'dette', 'lettre', 'carnet', 'registre'] },
  );
  if (!arc.ok) throw new Error('arc');
  const ledger88k = arc.value.seedLedger.map((s) => `${s.seed}:${String(s.payoffChapter)}`);

  /* ── 3. Tics du 18k — 2ᵉ point EMP-16 ────────────────────────────────── */
  let tics18: readonly string[] = ['RUN_18K_ABSENT'];
  try {
    const t18 = readFileSync(`${RUN18}/MANUSCRIT.md`, 'utf8');
    const imp18 = importManuscript(t18);
    if (imp18.ok) {
      const tr = measureTics(imp18.value.chapters.map((c) => ({ chapter: c.chapter, prose: c.prose })));
      if (tr.ok) tics18 = tr.value.rows.filter((r) => r.level === 'FAIL_SHADOW').slice(0, 8).map((r) => `«${r.gram}»×${r.occurrences} (${r.perChapter}/chap)`);
    }
  } catch { /* run absent — documenté */ }

  /* ── 4. Sensibilité du seuil UNCERTAIN (quintile vs quartile vs décile) ── */
  const sensitivity = [5, 4, 10].map((div) => {
    const maxCh = Math.max(...imp.value.chapters.map((c) => c.chapter));
    const thr = maxCh - Math.ceil(maxCh / div);
    return { divisor: div, lateThresholdChapter: thr };
  });

  const report = {
    goldset: { size: PROXY_GOLDSET.length, positives: PROXY_GOLDSET.filter((e) => e.revelation).length, labelling: 'IA_LABELLED_V1 (validation humaine = upgrade)' },
    revelationV1: v1,
    revelationV2: v2,
    gains: { recall: Number((v2.recall - v1.recall).toFixed(3)), precision: Number((v2.precision - v1.precision).toFixed(3)), f1: Number((v2.f1 - v1.f1).toFixed(3)) },
    ledger88k_withV2: ledger88k,
    tics18k_failShadow: tics18,
    uncertainSensitivity: sensitivity,
  };
  writeFileSync(`${RUN60}/GOLDSET_PROXY_REPORT.json`, JSON.stringify(report, null, 2), 'utf8');
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
