/**
 * OMEGA — CHAÎNE GO E2E (script BF-08) : (1) calibration KNOB_WEIGHT (sweep 8
 * valeurs × 450 sélections persistées), (2) démo GPS réelle (l'écrivain « vient
 * de taper » la fin du ch.5 du 88k), (3) fingerprint de style du 88k (rights-
 * gated), (4) fusion génome. Sorties : GO_CHAIN_REPORT.{json,md} dans le run.
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

import { mixedSelect } from '../mixer/mixer-selector.js';
import type { MixerCandidate } from '../mixer/mixer-selector.js';
import type { KnobId } from '../mixer/knob-bindings.js';
import { setMode } from '../router/product-mode-router.js';
import { guardedGps } from '../router/guarded.js';
import { assertRights } from '../style/rights-gate.js';
import { extractStyleFingerprint } from '../style/style-extractor.js';
import { buildNarrativeGenome } from '../mycelium-export/narrative-genome.js';
import { fuseGenomes } from '../mycelium-export/fused-genome.js';
import { importManuscript } from '../doctor/manuscript-import.js';
import { runDoctorAudit } from '../doctor/doctor-orchestrator.js';

const RUN = process.env['GO_RUN'] ?? 'runs/c8_book60k';
const WEIGHTS: readonly number[] = [5, 10, 15, 20, 25, 30, 40, 50];
const KNOBS: readonly KnobId[] = ['TENSION', 'MYSTERE', 'ESPOIR'];

function loadChapters(): readonly { chapter: number; candidates: readonly MixerCandidate[] }[] {
  const out: { chapter: number; candidates: MixerCandidate[] }[] = [];
  for (const dir of readdirSync(RUN).filter((d) => d.startsWith('chap_')).sort()) {
    const adm = JSON.parse(readFileSync(`${RUN}/${dir}/admission.json`, 'utf8')) as {
      chapter: number; candidates: readonly { profile: string; eligible: boolean; expScore: number }[];
    };
    const candidates: MixerCandidate[] = [];
    for (const c of adm.candidates) {
      try {
        candidates.push({ id: c.profile, prose: readFileSync(`${RUN}/${dir}/candidate_${c.profile}.txt`, 'utf8'), baseScore: c.expScore, eligible: c.eligible });
      } catch { /* absent — ignoré */ }
    }
    if (candidates.length >= 2) out.push({ chapter: adm.chapter, candidates });
  }
  return out;
}

function main(): void {
  /* ── 1. CALIBRATION KNOB_WEIGHT ──────────────────────────────────────── */
  const chapters = loadChapters();
  const neutral = new Map<number, string>();
  for (const ch of chapters) {
    const r = mixedSelect(ch.candidates, {});
    if (r.ok) neutral.set(ch.chapter, r.value.winner);
  }
  const sweep: { weight: number; meanChangedRateAtPlus1: number; perKnob: Record<string, number> }[] = [];
  for (const w of WEIGHTS) {
    const perKnob: Record<string, number> = {};
    let sum = 0;
    for (const k of KNOBS) {
      let changed = 0;
      for (const ch of chapters) {
        const r = mixedSelect(ch.candidates, { [k]: 1 }, w);
        if (r.ok && r.value.winner !== neutral.get(ch.chapter)) changed += 1;
      }
      const rate = changed / chapters.length;
      perKnob[k] = Number(rate.toFixed(3));
      sum += rate;
    }
    sweep.push({ weight: w, meanChangedRateAtPlus1: Number((sum / KNOBS.length).toFixed(3)), perKnob });
  }
  // Critère DOCUMENTÉ : plus petit poids atteignant ≥ 0.5 de réponse moyenne à +1
  // (assez fort pour agir, le plus faible possible pour préserver le score base).
  const calibrated = sweep.find((s) => s.meanChangedRateAtPlus1 >= 0.5)?.weight ?? 25;

  /* ── 2. DÉMO GPS RÉELLE (fin du ch.5 du 88k « en cours de frappe ») ───── */
  const manuscript = readFileSync(`${RUN}/MANUSCRIT.md`, 'utf8');
  const parts = manuscript.split(/^## Chapitre (\d+)/mu);
  const chapterTexts: { chapter: number; prose: string }[] = [];
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const n = Number(parts[i]);
    const body = (parts[i + 1] ?? '').replace(/^[^\n]*\n/u, '').trim();
    if (Number.isFinite(n) && body.length > 0) chapterTexts.push({ chapter: n, prose: body });
  }
  const current = chapterTexts.find((c) => c.chapter === 5);
  const history = chapterTexts.filter((c) => c.chapter < 5);
  const gpsSession = setMode('COAUTHOR_GPS');
  if (!gpsSession.ok) throw new Error('router');
  const typedSoFar = (current?.prose ?? '').split(/\s+/u).slice(0, 400).join(' '); // l'écrivain a tapé ~400 mots
  const gps = guardedGps(gpsSession.value, {
    currentText: typedSoFar, currentChapter: 5, history,
    knownCharacters: ['Léna', 'Garcia', 'Gaspard', 'Yvon', 'Henri'],
    seeds: ['naufrage', 'dette', 'lettre', 'carnet', 'registre'],
    dyingThreadThreshold: 3,
  }, ['naufrage', 'dette', 'lettre', 'carnet', 'registre']);
  if (!gps.ok) throw new Error(`gps: ${JSON.stringify(gps.error)}`);

  /* ── 3. FINGERPRINT DE STYLE DU 88k (rights-gated OWN_WORK) ───────────── */
  const ticket = assertRights('OWN_WORK', 'ANALYZE_STYLE');
  if (!ticket.ok) throw new Error('rights');
  const fpA = extractStyleFingerprint(ticket.value, manuscript);
  const fpB = extractStyleFingerprint(ticket.value, manuscript);
  if (!fpA.ok || !fpB.ok) throw new Error('fingerprint');
  const fpReproducible = JSON.stringify(fpA.value) === JSON.stringify(fpB.value);
  const blocked = assertRights('ANALYSIS_ONLY', 'GENERATE_IN_STYLE'); // preuve du mur

  /* ── 4. FUSION GÉNOME (narratif réel + émotionnel PENDING honnête) ────── */
  const imp = importManuscript(manuscript);
  if (!imp.ok) throw new Error('import');
  const audit = runDoctorAudit(imp.value.chapters, imp.value.castProposal.slice(0, 4).map((c) => c.name), []);
  if (!audit.ok) throw new Error('audit');
  const genome = buildNarrativeGenome({
    title: 'Le Silence du Phare', chapters: imp.value.chapters.map((c) => ({ chapter: c.chapter, prose: c.prose })),
    cast: imp.value.castProposal, seedLedger: audit.value.arc.seedLedger,
    chapterFunctions: audit.value.arc.chapterFunctions, tics: audit.value.tics.rows,
  });
  if (!genome.ok) throw new Error('genome');
  const fusedPending = fuseGenomes(genome.value.genomeHash);
  const fusedComplete = fuseGenomes(genome.value.genomeHash, String('e'.repeat(64))); // placeholder MARQUÉ démo
  if (!fusedPending.ok || !fusedComplete.ok) throw new Error('fusion');

  const report = {
    calibration: { sweep, calibratedWeight: calibrated, criterion: 'plus petit poids avec réponse moyenne ≥ 0.5 à +1', status: 'CALIBRATED_SINGLE_BOOK (EMP-16 : non scellé, multi-livres requis)' },
    gpsDemo: {
      typedWords: gps.value.position.words,
      inScene: gps.value.position.charactersInScene.map((c) => `${c.name}${c.speaking ? ' (parle)' : ''}`),
      weather: gps.value.position.emotionalWeather,
      dangers: gps.value.position.dangers.slice(0, 6).map((d) => `${d.kind}: ${d.detail.slice(0, 90)}`),
      trajectories: gps.value.trajectories.map((t) => ({ type: t.type, premise: t.premise, risks: t.risks })),
    },
    style: { fingerprint: fpA.value, reproducible: fpReproducible, generationBlockedForAnalysisOnly: !blocked.ok },
    fusion: { narrativeHash: genome.value.genomeHash, pendingStatus: fusedPending.value.status, completeDemo: fusedComplete.value.status === 'COMPLETE' ? fusedComplete.value.fusedHash : null },
  };
  writeFileSync(`${RUN}/GO_CHAIN_REPORT.json`, JSON.stringify(report, null, 2), 'utf8');
  const md = [
    `# GO CHAIN E2E — ${RUN}`,
    `## 1. CALIBRATION KNOB_WEIGHT (sweep ${WEIGHTS.join('/')}) → **${calibrated}** (${report.calibration.status})`,
    ...sweep.map((s) => `- w=${s.weight} : réponse moyenne ${(s.meanChangedRateAtPlus1 * 100).toFixed(0)}% (${KNOBS.map((k) => `${k}=${((s.perKnob[k] ?? 0) * 100).toFixed(0)}%`).join(' · ')})`),
    `## 2. GPS RÉEL (ch.5 en cours, ${report.gpsDemo.typedWords} mots tapés)`,
    `En scène: ${report.gpsDemo.inScene.join(', ') || 'personne'}`,
    `Dangers: ${report.gpsDemo.dangers.length}`,
    ...report.gpsDemo.dangers.map((d) => `- ${d}`),
    `Routes proposées (${report.gpsDemo.trajectories.length}, ordre alphabétique — AUCUNE préférence):`,
    ...report.gpsDemo.trajectories.map((t) => `- [${t.type}] ${t.premise} (risques: ${t.risks.join(' ; ')})`),
    `## 3. STYLE 88k : fingerprint reproductible=${fpReproducible} · génération bloquée en ANALYSIS_ONLY=${!blocked.ok}`,
    `## 4. FUSION : narratif=${genome.value.genomeHash.slice(0, 16)}… · sans émotionnel=${fusedPending.value.status} · démo complète=${report.fusion.completeDemo?.slice(0, 16) ?? 'n/a'}…`,
  ].join('\n\n');
  writeFileSync(`${RUN}/GO_CHAIN_REPORT.md`, md, 'utf8');
  process.stdout.write(`${md}\n`);
}

main();
