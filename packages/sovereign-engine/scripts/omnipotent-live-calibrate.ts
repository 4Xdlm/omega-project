#!/usr/bin/env node
/**
 * OMEGA Sovereign — OMNIPOTENT Live Calibration Script
 *
 * Runs 20 LIVE pipeline executions with a real LLM provider.
 * Measures double correlation: physics_score vs S_score + Q_text.
 * Produces canonical JSON per run, REPORT.md, and HASHES.txt.
 *
 * Usage:
 *   pnpm --filter sovereign-engine run omnipotent:live-calibrate -- \
 *     --provider anthropic --model claude-sonnet-4-20250514 \
 *     --out nexus/proof/omnipotent_live_calibration \
 *     --run ../../golden/e2e/run_001/runs/13535cccff86620f
 *
 * Environment:
 *   ANTHROPIC_API_KEY — Required for Anthropic provider
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import {
  spearmanCorrelation,
  pearsonCorrelation,
  decideScenario,
  loadOmnipotentThresholds,
  validateRunCount,
  mean,
  stddev,
  type CalibrationRunJSON,
  type CalibrationRunScores,
  type MacroSubScore,
} from '../src/calibration/omnipotent-calibration-utils.js';
import { runSovereignForge } from '../src/engine.js';
import { loadGoldenRun } from '../src/runtime/golden-loader.js';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import type { AnthropicProviderConfig } from '../src/runtime/live-types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════════
// CLI ARGS
// ═══════════════════════════════════════════════════════════════════════════════

function parseArgs(): {
  provider: string;
  model: string;
  out: string;
  seeds: number[];
  run: string;
  scene: number;
} {
  const args = process.argv.slice(2);
  const getArg = (name: string): string | undefined => {
    const idx = args.indexOf(`--${name}`);
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };

  const provider = getArg('provider') ?? 'anthropic';
  const model = getArg('model') ?? 'claude-sonnet-4-20250514';
  const out = getArg('out') ?? 'nexus/proof/omnipotent_live_calibration';
  const run = getArg('run') ?? '../../golden/e2e/run_001/runs/13535cccff86620f';
  const scene = parseInt(getArg('scene') ?? '0', 10);
  const seedsStr = getArg('seeds') ?? '1..20';

  // Parse seeds range (e.g., "1..20" → [1,2,...,20])
  let seeds: number[];
  if (seedsStr.includes('..')) {
    const [startStr, endStr] = seedsStr.split('..');
    const start = parseInt(startStr, 10);
    const end = parseInt(endStr, 10);
    seeds = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  } else {
    seeds = seedsStr.split(',').map((s) => parseInt(s.trim(), 10));
  }

  return { provider, model, out, seeds, run, scene };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHA256
// ═══════════════════════════════════════════════════════════════════════════════

function sha256(data: string): string {
  return createHash('sha256').update(data, 'utf-8').digest('hex');
}

function canonicalize(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as object).sort(), 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER PLACEHOLDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check that the required API key is configured.
 * The actual provider implementation would be injected here.
 */
function checkProviderConfig(provider: string): void {
  const envVars: Record<string, string> = {
    anthropic: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
  };

  const envVar = envVars[provider];
  if (!envVar) {
    console.error(`Unknown provider: ${provider}`);
    console.error(`Supported providers: ${Object.keys(envVars).join(', ')}`);
    process.exit(1);
  }

  if (!process.env[envVar]) {
    console.error(`\nERROR: ${envVar} environment variable is not set.`);
    console.error(`\nTo run LIVE calibration with provider "${provider}":`);
    console.error(`  export ${envVar}="your-api-key-here"`);
    console.error(`  pnpm --filter sovereign-engine run omnipotent:live-calibrate -- --provider ${provider} --model <model>`);
    console.error(`\nThe calibration requires a real LLM provider for 20 runs.`);
    console.error(`Each run calls the full sovereign pipeline (runSovereignForge).`);
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SCORE EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract all calibration scores from a SovereignForgeResult.
 * Computes M (geometric mean of 5 macro-axes), G (V1 composite proxy),
 * Q_text = sqrt(M * G) * delta_AS per GENIUS_SSOT formula.
 */
function extractScores(result: Awaited<ReturnType<typeof runSovereignForge>>): CalibrationRunScores {
  const physics_score = result.physics_audit?.physics_score ?? 0;
  const S_score = result.macro_score?.composite ?? result.s_score?.composite ?? 0;

  // Macro-axes from V3
  const ECC = result.macro_score?.macro_axes.ecc.score ?? 0;
  const RCI = result.macro_score?.macro_axes.rci.score ?? 0;
  const SII = result.macro_score?.macro_axes.sii.score ?? 0;
  const IFI = result.macro_score?.macro_axes.ifi.score ?? 0;
  const AAI = result.macro_score?.macro_axes.aai.score ?? 0;

  // AS = Authenticity Score (AAI is the closest macro-axis proxy)
  const AS = AAI;
  const delta_as = AS >= 85 ? 1 : 0;

  // M = (ECC * RCI * SII * IFI * AAI) ^ (1/5) — SSOT formula
  const M = Math.pow(Math.max(0.01, ECC) * Math.max(0.01, RCI) * Math.max(0.01, SII) * Math.max(0.01, IFI) * Math.max(0.01, AAI), 1 / 5);

  // G = V1 composite as proxy (GENIUS D/S/I/R/V axes not yet implemented)
  const G = result.s_score?.composite ?? 0;

  // Q_text = sqrt(M * G) * delta_AS
  const Q_text = Math.sqrt(Math.max(0, M) * Math.max(0, G)) * delta_as;

  // L3 instrumentation: capture RCI sub-scores for diagnostic
  const rci_sub_scores: MacroSubScore[] = (result.macro_score?.macro_axes.rci.sub_scores ?? []).map(s => ({
    name: s.name,
    score: s.score,
    weight: s.weight,
  }));

  return { physics_score, S_score, Q_text, M, G, delta_as, AS, ECC, RCI, SII, IFI, AAI, rci_sub_scores };
}

/**
 * Build RCI sub-score diagnostic table for REPORT.md.
 * Shows per-seed breakdown of rhythm, signature, hook_presence, euphony_basic, voice_conformity.
 */
function buildRCISubScoreTable(runs: CalibrationRunJSON[]): string {
  // Collect all sub-score names from first run that has them
  const firstWithSub = runs.find(r => r.scores.rci_sub_scores && r.scores.rci_sub_scores.length > 0);
  if (!firstWithSub || !firstWithSub.scores.rci_sub_scores) {
    return '_No RCI sub-scores captured (pre-L3 runs)._';
  }
  const subNames = firstWithSub.scores.rci_sub_scores.map(s => s.name);

  // Header
  let table = `| Seed | RCI | ${subNames.join(' | ')} |\n`;
  table += `|------|-----|${subNames.map(() => '-----').join('|')}|\n`;

  // Data rows
  for (const run of runs) {
    const subs = run.scores.rci_sub_scores ?? [];
    const subValues = subNames.map(name => {
      const found = subs.find(s => s.name === name);
      return found ? found.score.toFixed(1) : 'N/A';
    });
    table += `| ${run.seed} | ${run.scores.RCI.toFixed(1)} | ${subValues.join(' | ')} |\n`;
  }

  // Summary stats
  table += `\n### RCI Sub-Score Statistics\n\n`;
  table += `| Sub-Score | Mean | Std | Min | Max | Weight |\n`;
  table += `|-----------|------|-----|-----|-----|--------|\n`;
  for (const name of subNames) {
    const values = runs
      .map(r => (r.scores.rci_sub_scores ?? []).find(s => s.name === name)?.score)
      .filter((v): v is number => v !== undefined);
    if (values.length > 0) {
      const w = firstWithSub.scores.rci_sub_scores!.find(s => s.name === name)?.weight ?? 0;
      table += `| ${name} | ${mean(values).toFixed(1)} | ${stddev(values).toFixed(1)} | ${Math.min(...values).toFixed(1)} | ${Math.max(...values).toFixed(1)} | ${w.toFixed(2)} |\n`;
    }
  }

  return table;
}

async function main(): Promise<void> {
  const { provider, model, out, seeds, run, scene } = parseArgs();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.resolve(process.cwd(), out, timestamp);

  // Load SSOT thresholds
  const thresholds = loadOmnipotentThresholds();
  if (!thresholds) {
    console.error('FAIL-CLOSED: omnipotent thresholds not found in GENIUS_SSOT.json');
    process.exit(1);
  }

  // Validate run count
  const runCountError = validateRunCount(seeds.length, thresholds.calibration_runs_required);
  if (runCountError) {
    console.error(`FAIL-CLOSED: ${runCountError}`);
    process.exit(1);
  }

  // Check provider config
  checkProviderConfig(provider);

  // Resolve golden run path
  const runPath = path.resolve(process.cwd(), run);
  if (!fs.existsSync(runPath)) {
    console.error(`FAIL-CLOSED: Golden run path not found: ${runPath}`);
    process.exit(1);
  }

  // Create output directory
  fs.mkdirSync(outDir, { recursive: true });

  console.log('OMNIPOTENT LIVE CALIBRATION');
  console.log('==========================');
  console.log(`Provider: ${provider} / ${model}`);
  console.log(`Golden run: ${runPath}`);
  console.log(`Scene index: ${scene}`);
  console.log(`Seeds: ${seeds[0]}..${seeds[seeds.length - 1]} (${seeds.length} runs)`);
  console.log(`Output: ${outDir}`);
  console.log(`Thresholds: strong_min=${thresholds.physics_corr_strong_min}, weak_max=${thresholds.physics_corr_weak_max}`);
  console.log('');

  // ── CREATE PROVIDER ────────────────────────────────────────────────────────

  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.OPENAI_API_KEY ?? '';
  const providerConfig: AnthropicProviderConfig = {
    apiKey,
    model,
    judgeStable: true,
    draftTemperature: 0.75,
    judgeTemperature: 0.0,
    judgeTopP: 1.0,
    judgeMaxTokens: 4096,
  };

  // ── RUN PIPELINE ──────────────────────────────────────────────────────────

  for (const seed of seeds) {
    const seedStr = String(seed).padStart(2, '0');
    const runId = `CALIB-RUN-${seedStr}-${Date.now()}`;

    console.log(`\n[Run ${seedStr}/${seeds.length}] Starting Sovereign Forge...`);

    try {
      // Load golden scenario
      const forgeInput = loadGoldenRun(runPath, scene, runId);

      // Create fresh provider for each run
      const llmProvider = createAnthropicProvider(providerConfig);

      // Execute full pipeline
      const t0 = Date.now();
      const result = await runSovereignForge(forgeInput, llmProvider);
      const durationMs = Date.now() - t0;

      // Extract scores
      const scores = extractScores(result);
      const verdict = result.verdict;

      // Build canonical run JSON
      const promptHash = sha256(JSON.stringify(forgeInput.scene));
      const outputHash = sha256(result.final_prose);

      const runJSON: CalibrationRunJSON = {
        schema: 'omnipotent.calibration.v1',
        seed,
        provider,
        model,
        timestamp: new Date().toISOString(),
        prompt_hash: promptHash,
        output_hash: outputHash,
        scores,
        verdict,
        physics_audit: {
          forced_transitions: result.physics_audit?.forced_transitions ?? 0,
          dead_zones: Array.isArray(result.physics_audit?.dead_zones) ? result.physics_audit!.dead_zones.length : 0,
          feasibility_failures: result.physics_audit?.feasibility_failures ?? 0,
          trajectory_compliance: (result.physics_audit?.physics_score ?? 0) / 100,
        },
        run_hash: sha256(canonicalize(scores)),
      };

      // Write run file
      const runFileName = `run_${seedStr}.json`;
      const runContent = JSON.stringify(runJSON, null, 2);
      fs.writeFileSync(path.join(outDir, runFileName), runContent, 'utf-8');

      console.log(`[Run ${seedStr}] DONE in ${(durationMs / 1000).toFixed(1)}s`);
      console.log(`  physics=${scores.physics_score.toFixed(1)} S=${scores.S_score.toFixed(1)} Q=${scores.Q_text.toFixed(1)} M=${scores.M.toFixed(1)} verdict=${verdict}`);
      console.log(`  ECC=${scores.ECC.toFixed(1)} RCI=${scores.RCI.toFixed(1)} SII=${scores.SII.toFixed(1)} IFI=${scores.IFI.toFixed(1)} AAI=${scores.AAI.toFixed(1)}`);
      if (scores.rci_sub_scores && scores.rci_sub_scores.length > 0) {
        const subStr = scores.rci_sub_scores.map(s => `${s.name}=${s.score.toFixed(1)}`).join(' ');
        console.log(`  RCI_SUB: ${subStr}`);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[Run ${seedStr}] FAILED: ${errMsg}`);

      // Classify error: provider vs engine
      const isProviderFail = errMsg.includes('credit balance') || errMsg.includes('rate limit') || errMsg.includes('quota') || errMsg.includes('billing') || errMsg.includes('overloaded') || errMsg.includes('Overloaded') || errMsg.includes('529') || errMsg.includes('not_found') || errMsg.includes('404');
      const errorJSON = {
        schema: 'omnipotent.calibration.v1',
        seed,
        provider,
        model,
        timestamp: new Date().toISOString(),
        error: errMsg,
        error_class: isProviderFail ? 'PROVIDER_FAIL' : 'ENGINE_FAIL',
      };
      fs.writeFileSync(path.join(outDir, `run_${seedStr}_ERROR.json`), JSON.stringify(errorJSON, null, 2), 'utf-8');

      // FAIL-CLOSED: stop batch immediately on provider billing/quota failure
      if (isProviderFail) {
        console.error(`\n⛔ PROVIDER_FAIL detected (${errMsg.slice(0, 80)}...). Stopping batch.`);
        console.error(`   Completed: ${seedStr}/${seeds.length} seeds. Rerun with valid credits.`);
        break;
      }
    }
  }

  console.log('\n── POST-RUN ANALYSIS ──────────────────────────────────────');

  // ── POST-RUN ANALYSIS ─────────────────────────────────────────────────────

  const runFiles = fs.readdirSync(outDir).filter((f) => f.match(/^run_\d+\.json$/)).sort();

  if (runFiles.length === 0) {
    console.error('FAIL-CLOSED: No successful run files produced. All runs failed.');
    process.exit(1);
  }

  // Warn if some runs failed
  const errorFiles = fs.readdirSync(outDir).filter((f) => f.includes('_ERROR.json'));
  if (errorFiles.length > 0) {
    console.log(`WARNING: ${errorFiles.length} runs failed. Analyzing ${runFiles.length} successful runs.`);
  }

  console.log(`Found ${runFiles.length} run files. Analyzing...`);

  const runs: CalibrationRunJSON[] = runFiles.map((f) => {
    const content = fs.readFileSync(path.join(outDir, f), 'utf-8');
    return JSON.parse(content) as CalibrationRunJSON;
  });

  // Extract score arrays
  const physicsScores = runs.map((r) => r.scores.physics_score);
  const sScores = runs.map((r) => r.scores.S_score);
  const qTextScores = runs.map((r) => r.scores.Q_text);

  // Compute correlations
  const rho_S = spearmanCorrelation(physicsScores, sScores);
  const rho_Q = spearmanCorrelation(physicsScores, qTextScores);
  const r_S = pearsonCorrelation(physicsScores, sScores);
  const r_Q = pearsonCorrelation(physicsScores, qTextScores);

  // Decision
  const decision = decideScenario(rho_S, rho_Q, {
    strong_min: thresholds.physics_corr_strong_min,
    weak_max: thresholds.physics_corr_weak_max,
  });

  // ── GENERATE REPORT ───────────────────────────────────────────────────────

  const runsTable = runs.map((r) =>
    `| ${r.seed} | ${r.scores.physics_score.toFixed(1)} | ${r.scores.S_score.toFixed(1)} | ${r.scores.Q_text.toFixed(1)} | ${r.scores.delta_as} | ${r.verdict} |`
  ).join('\n');

  const report = `# OMNIPOTENT — CALIBRATION REPORT
# Date: ${new Date().toISOString()}
# Provider: ${provider} / ${model}
# Runs: ${runs.length}

## Correlations

| Metric | Spearman rho | Pearson r |
|--------|-------------|-----------|
| physics_score vs S_score | ${rho_S.toFixed(4)} | ${r_S.toFixed(4)} |
| physics_score vs Q_text | ${rho_Q.toFixed(4)} | ${r_Q.toFixed(4)} |

## SSOT Thresholds

| Threshold | Value |
|-----------|-------|
| strong_min | ${thresholds.physics_corr_strong_min} |
| weak_max | ${thresholds.physics_corr_weak_max} |

## Decision

**SCENARIO: ${decision}**

Justification:
- rho_S (physics vs S_score) = ${rho_S.toFixed(4)}
- rho_Q (physics vs Q_text) = ${rho_Q.toFixed(4)}
- Decision rule applied from GENIUS_SSOT.json

## Data (${runs.length} runs)

| Seed | physics_score | S_score | Q_text | delta_AS | Verdict |
|------|--------------|---------|--------|----------|---------|
${runsTable}

## Descriptive Statistics

| Metric | Mean | Std | Min | Max |
|--------|------|-----|-----|-----|
| physics_score | ${mean(physicsScores).toFixed(2)} | ${stddev(physicsScores).toFixed(2)} | ${Math.min(...physicsScores).toFixed(2)} | ${Math.max(...physicsScores).toFixed(2)} |
| S_score | ${mean(sScores).toFixed(2)} | ${stddev(sScores).toFixed(2)} | ${Math.min(...sScores).toFixed(2)} | ${Math.max(...sScores).toFixed(2)} |
| Q_text | ${mean(qTextScores).toFixed(2)} | ${stddev(qTextScores).toFixed(2)} | ${Math.min(...qTextScores).toFixed(2)} | ${Math.max(...qTextScores).toFixed(2)} |

## RCI Sub-Scores Diagnostic

${buildRCISubScoreTable(runs)}
`;

  fs.writeFileSync(path.join(outDir, 'REPORT.md'), report, 'utf-8');
  console.log('REPORT.md generated');

  // ── GENERATE HASHES ───────────────────────────────────────────────────────

  const hashLines: string[] = [];
  hashLines.push(`SHA256 REPORT.md : ${sha256(report)}`);

  for (const f of runFiles) {
    const content = fs.readFileSync(path.join(outDir, f), 'utf-8');
    hashLines.push(`SHA256 ${f} : ${sha256(content)}`);
  }

  const sortedHashes = hashLines.map((l) => l.split(' : ')[1]).sort();
  const rootHash = sha256(sortedHashes.join(''));
  hashLines.push(`ROOT_HASH : ${rootHash}`);

  fs.writeFileSync(path.join(outDir, 'HASHES.txt'), hashLines.join('\n') + '\n', 'utf-8');
  console.log('HASHES.txt generated');

  // ── SUMMARY ───────────────────────────────────────────────────────────────

  console.log('');
  console.log('=== CALIBRATION RESULT ===');
  console.log(`Spearman rho_S (physics vs S_score): ${rho_S.toFixed(4)}`);
  console.log(`Spearman rho_Q (physics vs Q_text):  ${rho_Q.toFixed(4)}`);
  console.log(`Pearson r_S:                         ${r_S.toFixed(4)}`);
  console.log(`Pearson r_Q:                         ${r_Q.toFixed(4)}`);
  console.log(`DECISION: SCENARIO ${decision}`);
  console.log(`ROOT_HASH: ${rootHash}`);
}

main().catch((err) => {
  console.error('CALIBRATION FAILED:', err);
  process.exit(1);
});
