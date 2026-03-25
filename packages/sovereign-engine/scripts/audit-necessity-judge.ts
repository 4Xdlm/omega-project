/**
 * audit-necessity-judge.ts — Audit du juge Necessity V2 (calibration littéraire)
 * Phase R — Vérification que les maîtres obtiennent >= 85
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Budget: 6-8 API calls (1 par texte évalué)
 *
 * Usage: npx tsx scripts/audit-necessity-judge.ts
 * Requires: ANTHROPIC_API_KEY in environment
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Paths ────────────────────────────────────────────────────────────────────

const ROOT = resolve(__dirname, '..');
const AUTOPSIE = resolve(ROOT, '..', '..', 'omega-autopsie');

// ── Parse sub-criteria from raw LLM response ────────────────────────────────

interface NecessityDetail {
  justesse: number | null;
  couverture: number | null;
  densite: number | null;
  progression: number | null;
  irreductibilite: number | null;
  necessity: number;
}

function parseNecessityResponse(response: string): NecessityDetail {
  const extract = (label: string): number | null => {
    const re = new RegExp(`${label}\\s*:\\s*(\\d+(?:\\.\\d+)?)`, 'i');
    const m = response.match(re);
    return m ? parseFloat(m[1]) : null;
  };

  return {
    justesse: extract('JUSTESSE'),
    couverture: extract('COUVERTURE'),
    densite: extract('DENSIT'),
    progression: extract('PROGRESSION'),
    irreductibilite: extract('IRR[ÉE]DUCTIBILIT'),
    necessity: extract('NECESSITY') ?? extract('NEC') ?? 0,
  };
}

// ── Load text files ──────────────────────────────────────────────────────────

interface AuditSource {
  name: string;
  path: string;
  targetMin: number;
  oldScore: number | null; // V1 score if known
}

function loadSources(): AuditSource[] {
  const sources: AuditSource[] = [];

  // Masters: GE-SAGA exemplars (inline — from golden-exemplars.ts)
  // These are OMEGA-generated prose scored 92+ by the canonical scorer.
  // We use them as "master-level" reference since the Flaubert files are English translations.

  // V-ATOMIC bricks
  const brickDir = resolve(ROOT, 'sessions', 'VATOMIC_2026-03-25T21-13-08');
  const bricks = [
    { file: 'brick_contemplation.txt', name: 'V3 Contemplation', old: 75 },
    { file: 'brick_souvenir.txt', name: 'V3 Souvenir', old: 83 },
    { file: 'brick_revelation.txt', name: 'V3 Révélation', old: 81 },
  ];
  for (const b of bricks) {
    const p = resolve(brickDir, b.file);
    if (existsSync(p)) {
      sources.push({ name: b.name, path: p, targetMin: 75, oldScore: b.old });
    }
  }

  // Run canonique
  const canonPath = resolve(ROOT, 'sessions', 'VRECAL1_ENGINE_2026-03-25T11-54-28', 'prose.txt');
  if (existsSync(canonPath)) {
    sources.push({ name: 'Run canonique 92.3', path: canonPath, targetMin: 80, oldScore: null });
  }

  return sources;
}

// ── GE-SAGA master texts (inline) ───────────────────────────────────────────

const MASTER_TEXTS: { name: string; text: string; targetMin: number }[] = [
  {
    name: 'GE-SAGA-01 (Théière)',
    text: `La théière tremblait contre ses doigts. Dans la cuisine aux carreaux disjoints, l'eau refusait de bouillir.

L'odeur de bergamote montait par vagues tièdes tandis qu'elle versait l'eau fumante sur les feuilles noires, ses gestes ralentis par cette pesanteur qui s'installait chaque soir à la même heure, quand les ombres commençaient à ramper le long des murs écaillés et que le vent marin portait jusqu'à sa fenêtre ces effluves salés qui lui rappelaient d'autres automnes, d'autres attentes. Le thé infusait dans la porcelaine ébréchée — celle qu'elle gardait pour les occasions qui n'arrivaient plus — et ses paumes épousaient la chaleur de la tasse comme pour y puiser une consolation que les mots ne savaient plus offrir. Par la baie vitrée aux joints rongés par l'humidité, la mer étendait sa surface plombée jusqu'à l'horizon brouillé, ses vagues léchant la grève avec cette régularité hypnotique qui berçait ses journées vides depuis qu'elle avait appris à ne plus compter les heures.

Un rire brisé. Cristallin. Porté par la brise d'été. Ses épaules se contractèrent. Le passé venait de la gifler.

Mais ce n'était qu'un goéland qui criaillait au-dessus des rochers noirs, et elle laissa retomber sa nuque contre le dossier de la chaise cannée, acceptant enfin que cette journée s'achève comme toutes les autres, dans ce silence peuplé qu'elle avait appris à habiter avec la patience minérale des falaises qui encadraient sa maison.`,
    targetMin: 85,
  },
  {
    name: 'GE-SAGA-02 (Rosiers)',
    text: `Les rosiers de septembre exigeaient cette attention méticuleuse que seules les mains vieillies savent dispenser, et Henri, courbé sur les tiges encore gorgées de la chaleur estivale, maniait le sécateur avec cette précision d'horloger qu'avaient acquise ses doigts au fil des décennies passées dans ce même jardin. Chaque coup sec qui tranchait les tiges mortes résonnait dans l'air immobile avec cette netteté particulière aux fins d'été, quand la terre commence à exhaler ses parfums concentrés.

L'épine qui venait de lui percer l'index droit ne lui arracha qu'un paisible tressaillement. Il porta machinalement le doigt à ses lèvres, goûtant cette saveur métallique qui se mêlait aux effluves de la Rosa Mundi qu'il venait de tailler.

— Tu vois, Henri, les roses galliques ont une âme que n'ont pas les hybrides modernes.

Il parlait maintenant à voix haute, comme si cette habitude prise depuis qu'elle n'était plus là pouvait conjurer l'absence qui s'étalait dans chaque recoin du jardin.

Elle n'était plus là.

Le parfum du Zéphirine Drouhin continuait de monter vers lui par vagues successives, et chacune de ces vagues portait avec elle un fragment de leur histoire commune.`,
    targetMin: 85,
  },
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY not set in environment.');
    process.exit(1);
  }

  const provider = createAnthropicProvider({
    apiKey,
    model: 'claude-sonnet-4-20250514',
    judgeStable: true,
    draftTemperature: 1.0,
    judgeTemperature: 0.0,
    judgeTopP: 1.0,
    judgeMaxTokens: 300,
  });

  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA — AUDIT DU JUGE NECESSITY V2 (calibration littéraire)');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  const fileSources = loadSources();

  interface Result {
    name: string;
    words: number;
    score: number;
    targetMin: number;
    oldScore: number | null;
    pass: boolean;
  }

  const results: Result[] = [];

  // Score master texts (GE-SAGA exemplars)
  for (const master of MASTER_TEXTS) {
    console.log(`  Scoring: ${master.name}...`);
    const words = master.text.split(/\s+/).length;
    const score = await provider.scoreNecessity(
      master.text, 4, undefined, 'scène littéraire contemplative', 'internal',
    );
    const pass = score >= master.targetMin;
    results.push({ name: master.name, words, score, targetMin: master.targetMin, oldScore: null, pass });
    console.log(`    → NEC=${score} (cible ≥${master.targetMin}) ${pass ? 'PASS' : 'FAIL'}`);
  }

  // Score file-based sources
  for (const src of fileSources) {
    console.log(`  Scoring: ${src.name}...`);
    const prose = readFileSync(src.path, 'utf-8').trim();
    const words = prose.split(/\s+/).length;
    const score = await provider.scoreNecessity(
      prose, 4, undefined, 'scène littéraire', 'internal',
    );
    const pass = score >= src.targetMin;
    results.push({ name: src.name, words, score, targetMin: src.targetMin, oldScore: src.oldScore, pass });
    const delta = src.oldScore ? ` (Δ=${score - src.oldScore >= 0 ? '+' : ''}${score - src.oldScore})` : '';
    console.log(`    → NEC=${score}${delta} (cible ≥${src.targetMin}) ${pass ? 'PASS' : 'FAIL'}`);
  }

  // ── Summary table ─────────────────────────────────────────────────────────

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('  RÉSULTATS');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  console.log(`  ${'Source'.padEnd(28)} ${'Words'.padStart(5)}  ${'NEC'.padStart(4)}  ${'Old'.padStart(4)}  ${'Δ'.padStart(4)}  Verdict`);
  console.log(`  ${'-'.repeat(28)} ${'-'.repeat(5)}  ${'-'.repeat(4)}  ${'-'.repeat(4)}  ${'-'.repeat(4)}  -------`);

  for (const r of results) {
    const old = r.oldScore !== null ? String(r.oldScore).padStart(4) : '   -';
    const delta = r.oldScore !== null ? `${r.score - r.oldScore >= 0 ? '+' : ''}${r.score - r.oldScore}`.padStart(4) : '   -';
    const verdict = r.pass ? 'PASS' : 'FAIL';
    console.log(`  ${r.name.padEnd(28)} ${String(r.words).padStart(5)}  ${String(r.score).padStart(4)}  ${old}  ${delta}  ${verdict}`);
  }

  // ── Verdict ───────────────────────────────────────────────────────────────

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('  VERDICT DE CALIBRATION');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  const masters = results.filter(r => r.name.startsWith('GE-SAGA'));
  const mastersPass = masters.filter(r => r.score >= 85).length;
  console.log(`  Maîtres ≥ 85 : ${mastersPass}/${masters.length}  (cible: ${masters.length}/${masters.length})`);

  const bricks = results.filter(r => r.oldScore !== null);
  if (bricks.length > 0) {
    const avgDelta = bricks.reduce((s, r) => s + (r.score - (r.oldScore ?? 0)), 0) / bricks.length;
    console.log(`  V3 briques gain moyen : ${avgDelta >= 0 ? '+' : ''}${avgDelta.toFixed(1)} (vs scores V1)`);
    const bricksGainOk = avgDelta >= 5;
    const overallPass = mastersPass === masters.length && bricksGainOk;
    console.log(`  Critère PASS : maîtres ≥ 85 ET briques V3 ≥ +5 vs V1`);
    console.log(`  Résultat : ${overallPass ? 'PASS' : 'FAIL'}\n`);
  } else {
    console.log(`  (Pas de briques V1 pour comparer)\n`);
  }

  console.log(`  API calls: ${results.length}`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
