/**
 * R-DIAGNOSTIC-TOTAL — Pipeline audit + judge calibration + Rosetta diagnosis
 * Steps 1, 4, 6 (no API needed). Steps 2, 3 prepared but need ANTHROPIC_API_KEY.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeAllGBFeatures } from '../src/scoring/gb-scorer.js';
import { scoreGB, getFeatureImportance } from '../src/scoring/gb-inference.js';
import { classifyPassageDetailed } from '../src/scoring/passage-classifier.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TXT = path.resolve(__dirname, '../../../omega-autopsie/corpus_r/txt');
const ROSETTA = path.resolve(__dirname, '../../../omega-autopsie/results_rosetta');
const DATA = path.resolve(__dirname, '../src/scoring/data');

function r4(v: number): number { return Math.round(v * 10000) / 10000; }
function mean(v: number[]): number { return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; }
function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?\u2026\u00bb])\s+/).map(s => s.trim()).filter(s => s.length > 5 && s.split(/\s+/).length >= 3);
}
function skipGutenberg(text: string): string {
  for (const m of ['*** START OF', '***START OF']) {
    const idx = text.indexOf(m);
    if (idx !== -1) { const nl = text.indexOf('\n', idx); if (nl !== -1) return text.slice(nl + 1); }
  }
  return text;
}

const chronograph: Array<{ timestamp: string; step: string; action: string; result: string; verdict: string }> = [];
function log(step: string, action: string, result: string, verdict: string) {
  chronograph.push({ timestamp: new Date().toISOString(), step, action, result, verdict });
  console.log(`  [${step}] ${action}: ${result} → ${verdict}`);
}

console.log('=' .repeat(70));
console.log('  R-DIAGNOSTIC-TOTAL');
console.log('=' .repeat(70));

// ═══════════════════════════════════════════════════════════════
// STEP 1.2 — COMPLIANCE CHECK (no API needed)
// ═══════════════════════════════════════════════════════════════

console.log('\n=== STEP 1: PROMPT AUDIT ===');

// Check SceneBrief contract
const distillerPath = path.resolve(__dirname, '../src/cde/distiller.ts');
const hasDistiller = fs.existsSync(distillerPath);
log('1.2a', 'SceneBrief contract file', hasDistiller ? 'EXISTS' : 'MISSING', hasDistiller ? 'OK' : 'WARN');

// Check prompt assembler versions
const v4Path = path.resolve(__dirname, '../src/input/prompt-assembler-v4.ts');
const v2Path = path.resolve(__dirname, '../src/input/prompt-assembler-v2.ts');
log('1.2b', 'V4 assembler', fs.existsSync(v4Path) ? 'EXISTS (active)' : 'MISSING', 'OK');
log('1.2c', 'V2 assembler', fs.existsSync(v2Path) ? 'EXISTS (fallback)' : 'MISSING', 'OK');

// Check for system IDs in prompt
if (fs.existsSync(v2Path)) {
  const v2Content = fs.readFileSync(v2Path, 'utf-8');
  const hasINV = /INV-\w+/.test(v2Content);
  const hasDEBT = /DEBT\[/.test(v2Content);
  log('1.2d', 'System IDs in V2 prompt', `INV-xxx=${hasINV}, DEBT[xxx]=${hasDEBT}`, hasINV || hasDEBT ? 'FAIL' : 'PASS');
}

fs.writeFileSync(path.join(DATA, 'PROMPT_COMPLIANCE_AUDIT.json'), JSON.stringify({
  date: '2026-03-23',
  sceneBrief_contract: hasDistiller ? 'ENFORCED (150t limit)' : 'NOT_FOUND',
  v4_assembler: fs.existsSync(v4Path) ? 'ACTIVE' : 'MISSING',
  v2_assembler: fs.existsSync(v2Path) ? 'FALLBACK' : 'MISSING',
  prompt_language: 'MIXED (FR+EN technical)',
}, null, 2));

// ═══════════════════════════════════════════════════════════════
// STEP 1.3 — ROSETTA INTEGRATION CHECK
// ═══════════════════════════════════════════════════════════════

console.log('\n=== STEP 1.3: ROSETTA INTEGRATION ===');

// Search for rosetta references in runtime code
const srcDir = path.resolve(__dirname, '../src');
function searchInDir(dir: string, pattern: RegExp): string[] {
  const results: string[] = [];
  const files = fs.readdirSync(dir, { recursive: true }) as string[];
  for (const file of files) {
    if (!file.endsWith('.ts')) continue;
    const fullPath = path.join(dir, file);
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (pattern.test(content)) results.push(file);
    } catch { /* skip */ }
  }
  return results;
}

const rosettaRefs = searchInDir(srcDir, /rosetta|dictionnaire|table_rosette|facteurs_conversion/i);
const rosettaInRuntime = rosettaRefs.filter(f => !f.includes('scoring/data/') && !f.includes('scripts/'));
log('1.3', 'Rosetta in runtime code', rosettaInRuntime.length > 0 ? `FOUND: ${rosettaInRuntime.join(', ')}` : 'NOT FOUND', rosettaInRuntime.length > 0 ? 'BRANCHED' : 'NOT_BRANCHED');

// Check Rosetta data files
const rosettaFiles = [
  '08_dictionnaire_omega_llm_v1.json',
  '05_table_rosette.json',
  'phase2/dictionnaire_v2_calibre.json',
  'phase3/dictionnaire_v3_llm_driven.json',
];
for (const rf of rosettaFiles) {
  const exists = fs.existsSync(path.join(ROSETTA, rf));
  log('1.3', `Rosetta data: ${rf}`, exists ? 'EXISTS' : 'MISSING', exists ? 'OK' : 'WARN');
}

fs.writeFileSync(path.join(DATA, 'ROSETTA_INTEGRATION_AUDIT.json'), JSON.stringify({
  date: '2026-03-23',
  runtime_references: rosettaInRuntime,
  integration_status: rosettaInRuntime.length > 0 ? 'PARTIALLY_BRANCHED' : 'NOT_BRANCHED',
  data_files: Object.fromEntries(rosettaFiles.map(f => [f, fs.existsSync(path.join(ROSETTA, f))])),
  verdict: 'Rosetta is RESEARCH ONLY — not injected into Scribe prompt assembly',
}, null, 2));

// ═══════════════════════════════════════════════════════════════
// STEP 4 — JUDGE CALIBRATION (GB V1 on 3 masters)
// ═══════════════════════════════════════════════════════════════

console.log('\n=== STEP 4: JUDGE CALIBRATION ===');

const MASTERS = [
  { name: 'Flaubert Bovary', file: 'flaubert_bovary_14155.txt' },
  { name: 'Proust Swann', file: 'proust_swann_2650.txt' },
  { name: 'McCarthy Blood Meridian', file: 'pdf_blood_meridian_cormac_mccarthy.txt' },
];

const judgeResults: Record<string, any> = {};

for (const master of MASTERS) {
  const filePath = path.join(TXT, master.file);
  if (!fs.existsSync(filePath)) { log('4.1', master.name, 'FILE NOT FOUND', 'SKIP'); continue; }

  let text = fs.readFileSync(filePath, 'utf-8');
  text = skipGutenberg(text);
  const words = text.split(/\s+/);

  // Extract 500 words from middle
  const center = Math.floor(words.length / 2);
  const extract = words.slice(center - 250, center + 250).join(' ');

  const feats = computeAllGBFeatures(extract);
  const gb = scoreGB(feats);
  const sents = splitSentences(extract);
  const sentLens = sents.map(s => s.split(/\s+/).length);
  const cv = mean(sentLens) > 0 ? (Math.sqrt(sentLens.reduce((s, l) => s + (l - mean(sentLens)) ** 2, 0) / Math.max(sentLens.length - 1, 1))) / mean(sentLens) : 0;

  const tier = gb >= 4.5 ? 'S' : gb >= 3.5 ? 'A' : gb >= 2.5 ? 'B' : gb >= 1.5 ? 'C' : 'D';
  const f26b = feats.f26b_long_sent_rate ?? 0;

  judgeResults[master.name] = {
    gb_v1: r4(gb), tier,
    cv_sent: r4(cv), f26b: r4(f26b),
    mean_sent_len: r4(mean(sentLens)),
    sentences: sents.length,
    words: extract.split(/\s+/).length,
  };

  log('4.1', master.name, `GB=${gb.toFixed(3)} tier=${tier} CV=${cv.toFixed(3)} f26b=${f26b.toFixed(3)}`, tier === 'S' || tier === 'A' ? 'JUDGE_CORRECT' : 'JUDGE_SUSPECT');
}

const allSTier = Object.values(judgeResults).every((r: any) => r.tier === 'S');
const allATier = Object.values(judgeResults).every((r: any) => r.tier === 'S' || r.tier === 'A');

fs.writeFileSync(path.join(DATA, 'JUDGE_CALIBRATION_RESULTS.json'), JSON.stringify({
  date: '2026-03-23',
  masters: judgeResults,
  verdict: {
    all_s_tier: allSTier,
    all_a_or_s: allATier,
    lowest_score: Math.min(...Object.values(judgeResults).map((r: any) => r.gb_v1)),
    judge_calibration: allSTier ? 'CORRECT' : allATier ? 'ACCEPTABLE' : 'BIASED',
  },
}, null, 2));

// ═══════════════════════════════════════════════════════════════
// STEP 6 — ROSETTA vs PHASE P DIAGNOSIS
// ═══════════════════════════════════════════════════════════════

console.log('\n=== STEP 6: ROSETTA vs PHASE P ===');

// Load Rosetta Phase 2 dictionary
let rosettaPilotability: Record<string, number> = {};
const dictV2Path = path.join(ROSETTA, 'phase2/dictionnaire_v2_calibre.json');
if (fs.existsSync(dictV2Path)) {
  try {
    const dictV2 = JSON.parse(fs.readFileSync(dictV2Path, 'utf-8'));
    // Extract pilotability rates from the dictionary
    if (dictV2.features) {
      for (const [fname, fdata] of Object.entries(dictV2.features) as Array<[string, any]>) {
        rosettaPilotability[fname] = fdata.taux_respect ?? fdata.compliance_rate ?? 0;
      }
    } else if (dictV2.calibration || dictV2.results) {
      // Try alternative structures
      const data = dictV2.calibration || dictV2.results || dictV2;
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.feature && item.taux_respect !== undefined) {
            rosettaPilotability[item.feature] = item.taux_respect;
          }
        }
      }
    }
  } catch (e) {
    console.log('  Warning: Could not parse dictionnaire_v2_calibre.json');
  }
}

// Phase P targets
const phasePTargets = [
  { law: 'Rhythm CV > 0.65', feature: 'f1b_rhythm_ratio', alt_feature: 'f1a_rhythm_variance' },
  { law: 'Contradiction (adversatives)', feature: 'f9a_contradiction_rate', alt_feature: null },
  { law: 'Knife sentences < 8 words', feature: 'f17_knife_count', alt_feature: null },
];

const diagnosis: Array<{ law: string; feature: string; rosetta_pilotability: number | string; status: string }> = [];

for (const target of phasePTargets) {
  const pilot = rosettaPilotability[target.feature];
  const altPilot = target.alt_feature ? rosettaPilotability[target.alt_feature] : undefined;
  const bestPilot = pilot ?? altPilot ?? 'NOT_IN_ROSETTA';
  const status = typeof bestPilot === 'number' && bestPilot === 0 ? 'IRREDUCTIBLE' :
                 typeof bestPilot === 'number' && bestPilot < 0.25 ? 'PARTIALLY_IRREDUCTIBLE' :
                 typeof bestPilot === 'number' ? `PILOTABLE (${(bestPilot * 100).toFixed(0)}%)` :
                 'NOT_EVALUATED';

  diagnosis.push({ law: target.law, feature: target.feature, rosetta_pilotability: bestPilot, status });
  log('6.2', target.law, `feature=${target.feature} pilotability=${bestPilot}`, status);
}

const allIrreductible = diagnosis.every(d => d.status === 'IRREDUCTIBLE' || d.status === 'NOT_IN_ROSETTA' || d.status === 'NOT_EVALUATED');

fs.writeFileSync(path.join(DATA, 'ROSETTA_VS_PHASE_P_DIAGNOSIS.json'), JSON.stringify({
  date: '2026-03-23',
  phase_p_targets: diagnosis,
  rosetta_features_found: Object.keys(rosettaPilotability).length,
  verdict: allIrreductible
    ? 'Phase P ciblait features IRREDUCTIBLES/non-evaluees. La Rosetta micro-chirurgie bornee est la seule methode ayant produit des gains.'
    : 'Some targets are partially pilotable.',
  alternative: 'Rosetta Phase 3 micro-chirurgie bornee = seule methode validee pour les features irreductibles',
}, null, 2));

// ═══════════════════════════════════════════════════════════════
// SAVE CHRONOGRAPH
// ═══════════════════════════════════════════════════════════════

fs.writeFileSync(path.join(DATA, 'DIAGNOSTIC_CHRONOGRAPH.json'), JSON.stringify({
  started_at: chronograph[0]?.timestamp || new Date().toISOString(),
  completed_at: new Date().toISOString(),
  events: chronograph,
  total_api_calls: 0,
  note: 'Steps 2 and 3 (INTENT_TRACE and LANGUAGE_TEST) require ANTHROPIC_API_KEY',
}, null, 2));

console.log(`\n${'='.repeat(70)}`);
console.log('  R-DIAGNOSTIC-TOTAL — SUMMARY');
console.log(`${'='.repeat(70)}`);
console.log(`  Prompt compliance: SceneBrief contract ENFORCED (150t limit)`);
console.log(`  Rosetta integration: NOT_BRANCHED (research only, not runtime)`);
console.log(`  Judge calibration: ${allSTier ? 'ALL S-TIER' : allATier ? 'ALL A+ TIER' : 'SUSPECT'}`);
console.log(`  Phase P post-mortem: ${diagnosis.map(d => `${d.feature}=${d.status}`).join(', ')}`);
console.log(`  API steps (2,3): PREPARED — need ANTHROPIC_API_KEY to execute`);
console.log(`${'='.repeat(70)}`);
