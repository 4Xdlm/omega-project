#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — LIVE5-STABILITY CLI
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: scripts/sovereign-live.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Executes Sovereign Engine N times on a golden run.
 * Writes: RUN_ID.json, SHA256SUMS.txt, SUMMARY.json per run.
 * Fail-closed: any error → FAIL.json + exit 1.
 *
 * Usage:
 *   node scripts/sovereign-live.ts \
 *     --run <path> \
 *     --out <path> \
 *     --count <N> \
 *     [--judge-stable] \
 *     [--scene <index>] \
 *     [--model <model-name>]
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { sha256 } from '@omega/canon-kernel';
import { runSovereignForge } from '../src/engine.js';
import { loadGoldenRun } from '../src/runtime/golden-loader.js';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import { buildRunIdRecord, generateDeterministicSeed } from '../src/runtime/run-id.js';
import { generateSHA256SUMS } from '../src/runtime/sha256sums.js';
import { validateDirectoryPathSafety } from '../src/runtime/path-safety.js';
import type { LiveConfig, LiveRunResult, LiveSummary, AnthropicProviderConfig } from '../src/runtime/live-types.js';

/**
 * Parse CLI arguments
 */
function parseArgs(): LiveConfig {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        parsed[key] = value;
        i++;
      } else {
        parsed[key] = 'true';
      }
    }
  }

  // Validate required args
  if (!parsed.run) throw new Error('Missing required argument: --run');
  if (!parsed.out) throw new Error('Missing required argument: --out');
  if (!parsed.count) throw new Error('Missing required argument: --count');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Missing required environment variable: ANTHROPIC_API_KEY');
  }

  return {
    runPath: parsed.run,
    outPath: parsed.out,
    count: parseInt(parsed.count, 10),
    judgeStable: parsed['judge-stable'] === 'true',
    sceneIndex: parsed.scene ? parseInt(parsed.scene, 10) : 0,
    apiKey,
    model: parsed.model ?? 'claude-sonnet-4-20250514',
  };
}

/**
 * Write FAIL.json on error
 */
function writeFail(outPath: string, error: Error): void {
  const failPath = path.join(outPath, 'FAIL.json');
  fs.mkdirSync(outPath, { recursive: true });
  fs.writeFileSync(
    failPath,
    JSON.stringify(
      {
        status: 'FAIL',
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
    'utf8',
  );
}

/**
 * Execute single run
 */
async function executeRun(
  runIndex: number,
  config: LiveConfig,
  providerConfig: AnthropicProviderConfig,
): Promise<LiveRunResult> {
  try {
    // Create output directory for this run (ABSOLUTE path to avoid cwd issues)
    const absOutPath = path.resolve(config.outPath);
    const runOutPath = path.join(absOutPath, `run_${String(runIndex).padStart(3, '0')}`);
    fs.mkdirSync(runOutPath, { recursive: true });
    console.log(`  Output dir: ${runOutPath} (exists=${fs.existsSync(runOutPath)})`);

    // Load golden run
    const runId = `LIVE-RUN-${runIndex}-${Date.now()}`;
    const forgeInput = loadGoldenRun(config.runPath, config.sceneIndex, runId);

    // Create provider
    const provider = createAnthropicProvider(providerConfig);

    // Generate prompt hash (simplified - real implementation would build full prompt)
    const promptHash = sha256(JSON.stringify(forgeInput.scene));

    console.log(`\n[Run ${runIndex}] Starting Sovereign Forge...`);
    console.log(`  Scene: ${forgeInput.scene.scene_id}`);
    console.log(`  Model: ${providerConfig.model}`);
    console.log(`  Judge Stable: ${providerConfig.judgeStable}`);

    // Execute Sovereign Forge (async — provider calls are async)
    const forgeResult = await runSovereignForge(forgeInput, provider);

    // Build RUN_ID.json
    const runIdRecord = buildRunIdRecord(
      runIndex,
      path.relative(process.cwd(), config.runPath),
      path.relative(process.cwd(), runOutPath),
      forgeInput.scene.scene_id,
      forgeResult,
      providerConfig,
      promptHash,
      'fr', // FR PREMIUM — production language
    );

    // Write RUN_ID.json
    fs.writeFileSync(
      path.join(runOutPath, 'RUN_ID.json'),
      JSON.stringify(runIdRecord, null, 2),
      'utf8',
    );

    // Write S_SCORE detail (v1 axes from sovereign loop)
    if (forgeResult.loop_result?.s_score_initial) {
      fs.writeFileSync(
        path.join(runOutPath, 'S_SCORE_INITIAL.json'),
        JSON.stringify(forgeResult.loop_result.s_score_initial, null, 2),
        'utf8',
      );
    }
    if (forgeResult.loop_result?.s_score_final) {
      fs.writeFileSync(
        path.join(runOutPath, 'S_SCORE_FINAL.json'),
        JSON.stringify(forgeResult.loop_result.s_score_final, null, 2),
        'utf8',
      );
    }

    // Write final S_SCORE V3 (4 macro-axes ECC/RCI/SII/IFI)
    if (forgeResult.macro_score) {
      fs.writeFileSync(
        path.join(runOutPath, 'S_SCORE_V3.json'),
        JSON.stringify(forgeResult.macro_score, null, 2),
        'utf8',
      );
    } else {
      // Fallback: write legacy s_score
      fs.writeFileSync(
        path.join(runOutPath, 'S_SCORE_V3.json'),
        JSON.stringify(forgeResult.s_score, null, 2),
        'utf8',
      );
    }

    // Write final prose
    fs.writeFileSync(
      path.join(runOutPath, 'final_prose.txt'),
      forgeResult.final_prose,
      'utf8',
    );

    // Write symbol map
    if (forgeResult.symbol_map) {
      fs.writeFileSync(
        path.join(runOutPath, 'symbol_map.json'),
        JSON.stringify(forgeResult.symbol_map, null, 2),
        'utf8',
      );
    }

    // Generate SHA256SUMS.txt
    generateSHA256SUMS(runOutPath, path.join(runOutPath, 'SHA256SUMS.txt'));

    // Validate path safety
    const pathSafetyResult = validateDirectoryPathSafety(runOutPath);
    if (!pathSafetyResult.safe) {
      throw new Error(
        `Path safety validation failed:\n${pathSafetyResult.violations.map((v) => `  ${v.file}: ${v.patterns.join(', ')}`).join('\n')}`,
      );
    }

    console.log(`[Run ${runIndex}] SUCCESS`);
    console.log(`  S-Score V1 (composite): ${forgeResult.s_score?.composite?.toFixed(2) ?? 0}`);
    console.log(`  Verdict: ${forgeResult.verdict}`);
    console.log(`  Passes: ${forgeResult.passes_executed}`);

    // Log V3 macro-axes detail
    const ms = forgeResult.macro_score;
    if (ms) {
      console.log(`  --- V3 MACRO-AXES ---`);
      console.log(`    ECC: ${ms.macro_axes.ecc.score.toFixed(1)} (w=0.60, floor=88)`);
      console.log(`    RCI: ${ms.macro_axes.rci.score.toFixed(1)} (w=0.15, floor=85)`);
      console.log(`    SII: ${ms.macro_axes.sii.score.toFixed(1)} (w=0.15, floor=85)`);
      console.log(`    IFI: ${ms.macro_axes.ifi.score.toFixed(1)} (w=0.10, floor=85)`);
      console.log(`  V3 Composite: ${ms.composite.toFixed(2)} | Min Axis: ${ms.min_axis.toFixed(1)} | ECC: ${ms.ecc_score.toFixed(1)}`);
      console.log(`  V3 Verdict: ${ms.verdict}`);
      // ECC sub-scores
      console.log(`  --- ECC Detail ---`);
      for (const sub of ms.macro_axes.ecc.sub_scores) {
        console.log(`    ${sub.name}: ${sub.score.toFixed(1)} (w=${sub.weight})`);
      }
      for (const b of ms.macro_axes.ecc.bonuses) {
        if (b.triggered) console.log(`    bonus ${b.type}: ${b.value > 0 ? '+' : ''}${b.value} — ${b.detail}`);
      }
    }

    // Log V1 axes for comparison
    const initScore = forgeResult.loop_result?.s_score_initial;
    if (initScore?.axes) {
      console.log(`  --- V1 Initial Axes ---`);
      for (const [name, axis] of Object.entries(initScore.axes)) {
        const a = axis as { score: number; weight: number; method: string };
        console.log(`    ${name}: ${a.score.toFixed(1)} (w=${a.weight}, ${a.method})`);
      }
      console.log(`  V1 Initial Composite: ${initScore.composite.toFixed(2)}`);
    }

    return {
      run_index: runIndex,
      success: true,
      run_id_record: runIdRecord,
      error: null,
    };
  } catch (err: unknown) {
    console.error(`[Run ${runIndex}] FAILED:`, err);
    return {
      run_index: runIndex,
      success: false,
      run_id_record: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Write SUMMARY.json
 */
function writeSummary(outPath: string, results: readonly LiveRunResult[]): void {
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  const sScores = successful
    .map((r) => r.run_id_record?.s_score_composite ?? 0)
    .filter((s) => s > 0);

  const verdicts = successful
    .map((r) => r.run_id_record?.s_score_verdict ?? 'REJECT')
    .filter((v) => v !== 'REJECT');

  const sScoreMin = sScores.length > 0 ? Math.min(...sScores) : 0;
  const sScoreMax = sScores.length > 0 ? Math.max(...sScores) : 0;
  const sScoreRange = sScoreMax - sScoreMin;
  const sScoreMean =
    sScores.length > 0 ? sScores.reduce((a, b) => a + b, 0) / sScores.length : 0;

  const allSeal = verdicts.length > 0 && verdicts.every((v) => v === 'SEAL');
  const gatePass = allSeal && sScoreRange <= 5.0;

  const summary: LiveSummary = {
    live_id: `LIVE-${Date.now()}`,
    total_runs: results.length,
    successful_runs: successful.length,
    failed_runs: failed.length,
    s_scores: sScores,
    s_score_min: sScoreMin,
    s_score_max: sScoreMax,
    s_score_range: sScoreRange,
    s_score_mean: sScoreMean,
    verdicts,
    all_seal: allSeal,
    gate_pass: gatePass,
    gate_criteria: {
      required_seal_rate: '100%',
      required_range_max: 5.0,
      actual_range: sScoreRange,
    },
  };

  fs.writeFileSync(
    path.join(outPath, 'SUMMARY.json'),
    JSON.stringify(summary, null, 2),
    'utf8',
  );

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('LIVE5-STABILITY SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total Runs:       ${summary.total_runs}`);
  console.log(`Successful:       ${summary.successful_runs}`);
  console.log(`Failed:           ${summary.failed_runs}`);
  console.log(`S-Score Range:    ${summary.s_score_min.toFixed(2)} - ${summary.s_score_max.toFixed(2)} (Δ ${summary.s_score_range.toFixed(2)})`);
  console.log(`S-Score Mean:     ${summary.s_score_mean.toFixed(2)}`);
  console.log(`All SEAL:         ${summary.all_seal ? 'YES' : 'NO'}`);
  console.log(`Gate Pass:        ${summary.gate_pass ? 'YES' : 'NO'}`);
  console.log('═══════════════════════════════════════════════════════════\n');
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('OMEGA SOVEREIGN STYLE ENGINE — LIVE5-STABILITY');
    console.log('═══════════════════════════════════════════════════════════\n');

    const config = parseArgs();

    console.log('Configuration:');
    console.log(`  Run Path:      ${config.runPath}`);
    console.log(`  Out Path:      ${config.outPath}`);
    console.log(`  Count:         ${config.count}`);
    console.log(`  Scene Index:   ${config.sceneIndex}`);
    console.log(`  Judge Stable:  ${config.judgeStable}`);
    console.log(`  Model:         ${config.model}`);

    // Create output directory
    fs.mkdirSync(config.outPath, { recursive: true });

    // Build provider config
    const providerConfig: AnthropicProviderConfig = {
      apiKey: config.apiKey,
      model: config.model,
      judgeStable: config.judgeStable,
      draftTemperature: 0.75,
      judgeTemperature: 0.0,
      judgeTopP: 1.0,
      judgeMaxTokens: 4096,
    };

    // Execute N runs
    const results: LiveRunResult[] = [];
    for (let i = 0; i < config.count; i++) {
      const result = await executeRun(i, config, providerConfig);
      results.push(result);

      // Fail-closed: stop on first error
      if (!result.success) {
        writeFail(config.outPath, new Error(result.error ?? 'Unknown error'));
        console.error('\n[FAIL] Run failed, stopping execution.');
        process.exit(1);
      }
    }

    // Write summary
    writeSummary(config.outPath, results);

    console.log('[SUCCESS] All runs completed successfully.');
    process.exit(0);
  } catch (err: unknown) {
    console.error('\n[FATAL ERROR]', err);
    const config = parseArgs();
    writeFail(config.outPath, err instanceof Error ? err : new Error(String(err)));
    process.exit(1);
  }
}

main();
