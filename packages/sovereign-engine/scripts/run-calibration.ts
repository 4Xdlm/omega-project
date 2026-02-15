#!/usr/bin/env node
/**
 * OMEGA Sovereign — Calibration Runner
 * Sprint 5 — Commit 5.3
 *
 * Runs N deterministic pipeline executions to collect calibration metrics.
 * Phase "20 LIVE runs" from roadmap.
 *
 * Usage:
 *   npm run calibrate
 *   npm run calibrate -- --runs=10
 *
 * Output: calibration-report.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSovereignForge } from '../src/engine.js';
import { SOVEREIGN_CONFIG } from '../src/config.js';
import type { SovereignProvider, ForgePacketInput } from '../src/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse CLI args
const args = process.argv.slice(2);
const runsArg = args.find((a) => a.startsWith('--runs='));
const numRuns = runsArg ? parseInt(runsArg.split('=')[1], 10) : SOVEREIGN_CONFIG.CALIBRATION_RUNS;

// Mock provider for calibration (deterministic)
const mockProvider: SovereignProvider = {
  async generateDraft(prompt: string, mode: string, seed: number): Promise<string> {
    // Deterministic mock prose based on seed
    return `La peur montait, lente et sourde. Elle s'infiltrait dans chaque recoin.
Le souffle se coupait, la gorge se nouait. Le cœur tambourinait.
Puis la terreur explosait, brutale et dévastatrice.
Tout s'effondrait dans un vertige noir. Les mains tremblaient.
Lentement, la tristesse prenait la place. Le silence revenait, lourd.
Un poids écrasait la poitrine. Plus rien ne bougeait.
Seed: ${seed}, Mode: ${mode}`;
  },

  async evaluateAxis(prose: string, axis: string, criteria: string, seed: number): Promise<number> {
    // Deterministic score based on seed + axis hash
    const hash = axis.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return 50 + ((seed + hash) % 50);
  },

  async mapSymbol(packet: any, seed: number): Promise<any> {
    return {
      symbol_map_id: `mock-symbol-${seed}`,
      quartile_hooks: [],
      recurrent_motifs: [],
    };
  },
};

// Mock packet input
const mockPacketInput: ForgePacketInput = {
  scene_id: 'calibration_scene_001',
  genesis_plan: {
    conflict_type: 'emotional',
    protagonist_goal: 'survive',
    protagonist_name: 'Alice',
    obstacle_nature: 'fear',
    story_world: 'dark room',
    inciting_event: 'lights go out',
  },
  style_genome: {
    lexicon: {
      intensity_level: 7,
      signature_words: ['souffle', 'ombre', 'silence'],
      forbidden_words: ['très', 'vraiment'],
      abstraction_tolerance: 0.3,
    },
    voice: {
      narrative_distance: 'close',
      tense: 'past',
      person: 'third',
    },
    imagery: {
      sensory_emphasis: ['tactile', 'auditory'],
      metaphor_frequency: 'moderate',
      recurrent_motifs: ['darkness', 'breath'],
    },
  },
  emotion_contract: {
    curve_quartiles: [
      { quartile: 'Q1', name: 'fear', intensity: 0.4, position: 0.0 },
      { quartile: 'Q2', name: 'terror', intensity: 0.9, position: 0.25 },
      { quartile: 'Q3', name: 'sadness', intensity: 0.6, position: 0.5 },
      { quartile: 'Q4', name: 'calm', intensity: 0.2, position: 0.75 },
    ],
  },
  seeds: {
    world_seed: 12345,
    llm_seed: 67890,
  },
  constraints: {
    scene_type: 'emotion_peak',
    word_budget: { min: 800, max: 1200 },
    paragraph_count: { min: 6, max: 10 },
  },
};

interface CalibrationRun {
  run_id: number;
  verdict: 'SEAL' | 'REJECT';
  s_score: number;
  macro_score: number | null;
  passes_executed: number;
  delta_hash?: string;
}

interface CalibrationReport {
  timestamp: string;
  total_runs: number;
  config: {
    runs: number;
    scenes: readonly string[];
  };
  results: {
    seal_count: number;
    reject_count: number;
    avg_score: number;
    min_score: number;
    max_score: number;
    score_stddev: number;
  };
  runs: CalibrationRun[];
}

async function runCalibration(): Promise<void> {
  console.log(`🔬 Starting calibration — ${numRuns} runs`);
  console.log('');

  const runs: CalibrationRun[] = [];

  for (let i = 0; i < numRuns; i++) {
    console.log(`  Run ${i + 1}/${numRuns}...`);

    const result = await runSovereignForge(mockPacketInput, mockProvider);

    runs.push({
      run_id: i + 1,
      verdict: result.verdict,
      s_score: result.s_score.composite,
      macro_score: result.macro_score?.composite ?? null,
      passes_executed: result.passes_executed,
      delta_hash: result.physics_audit?.physics_delta?.delta_hash,
    });
  }

  // Compute statistics
  const sealCount = runs.filter((r) => r.verdict === 'SEAL').length;
  const rejectCount = runs.filter((r) => r.verdict === 'REJECT').length;
  const scores = runs.map((r) => r.s_score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);

  const variance = scores.reduce((acc, s) => acc + Math.pow(s - avgScore, 2), 0) / scores.length;
  const stddev = Math.sqrt(variance);

  const report: CalibrationReport = {
    timestamp: new Date().toISOString(),
    total_runs: numRuns,
    config: {
      runs: numRuns,
      scenes: SOVEREIGN_CONFIG.CALIBRATION_SCENES,
    },
    results: {
      seal_count: sealCount,
      reject_count: rejectCount,
      avg_score: Math.round(avgScore * 100) / 100,
      min_score: Math.round(minScore * 100) / 100,
      max_score: Math.round(maxScore * 100) / 100,
      score_stddev: Math.round(stddev * 100) / 100,
    },
    runs,
  };

  // Write report
  const outputPath = path.resolve(process.cwd(), SOVEREIGN_CONFIG.CALIBRATION_OUTPUT_PATH);
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n', 'utf-8');

  console.log('');
  console.log('✅ Calibration complete');
  console.log('');
  console.log('Results:');
  console.log(`  SEAL:   ${sealCount}/${numRuns} (${((sealCount / numRuns) * 100).toFixed(1)}%)`);
  console.log(`  REJECT: ${rejectCount}/${numRuns} (${((rejectCount / numRuns) * 100).toFixed(1)}%)`);
  console.log(`  Avg Score: ${report.results.avg_score.toFixed(1)} ± ${report.results.score_stddev.toFixed(1)}`);
  console.log(`  Range: [${report.results.min_score.toFixed(1)}, ${report.results.max_score.toFixed(1)}]`);
  console.log('');
  console.log(`Report: ${outputPath}`);
}

runCalibration().catch((err) => {
  console.error('❌ Calibration failed:', err);
  process.exit(1);
});
