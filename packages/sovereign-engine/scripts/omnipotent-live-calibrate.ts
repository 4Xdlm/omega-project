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
 *     --out nexus/proof/omnipotent_live_calibration
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
} from '../src/calibration/omnipotent-calibration-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════════
// CLI ARGS
// ═══════════════════════════════════════════════════════════════════════════════

function parseArgs(): {
  provider: string;
  model: string;
  out: string;
  seeds: number[];
} {
  const args = process.argv.slice(2);
  const getArg = (name: string): string | undefined => {
    const idx = args.indexOf(`--${name}`);
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };

  const provider = getArg('provider') ?? 'anthropic';
  const model = getArg('model') ?? 'claude-sonnet-4-20250514';
  const out = getArg('out') ?? 'nexus/proof/omnipotent_live_calibration';
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

  return { provider, model, out, seeds };
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

async function main(): Promise<void> {
  const { provider, model, out, seeds } = parseArgs();
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

  // Create output directory
  fs.mkdirSync(outDir, { recursive: true });

  console.log('OMNIPOTENT LIVE CALIBRATION');
  console.log('==========================');
  console.log(`Provider: ${provider} / ${model}`);
  console.log(`Seeds: ${seeds[0]}..${seeds[seeds.length - 1]} (${seeds.length} runs)`);
  console.log(`Output: ${outDir}`);
  console.log(`Thresholds: strong_min=${thresholds.physics_corr_strong_min}, weak_max=${thresholds.physics_corr_weak_max}`);
  console.log('');

  // ── RUN PIPELINE ──────────────────────────────────────────────────────────
  // NOTE: This is a placeholder. The actual pipeline integration requires:
  // 1. Creating a real SovereignProvider backed by the Anthropic/OpenAI API
  // 2. Creating a ForgePacketInput from a golden scenario
  // 3. Calling runSovereignForge() for each seed
  // 4. Extracting all scores from the result
  //
  // Francky will provide the golden scenario and API key before execution.
  // The framework below handles everything AFTER the runs complete.
  // ──────────────────────────────────────────────────────────────────────────

  console.log('Waiting for LIVE runs...');
  console.log('(Configure provider API key and golden scenario to execute)');
  console.log('');

  // Placeholder: In production, this loop calls runSovereignForge() per seed.
  // For now, we demonstrate the framework with the existing runs infrastructure.
  // After the runs complete, the script reads run_XX.json files from outDir.

  // ── POST-RUN ANALYSIS ─────────────────────────────────────────────────────
  // If run files already exist (from a previous execution), analyze them.

  const runFiles = fs.readdirSync(outDir).filter((f) => f.match(/^run_\d+\.json$/)).sort();

  if (runFiles.length === 0) {
    console.log('No run files found. Execute the pipeline first, then re-run analysis.');
    console.log('');
    console.log('Expected format: run_01.json, run_02.json, ... run_20.json');
    console.log('Schema: omnipotent.calibration.v1');
    process.exit(0);
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
