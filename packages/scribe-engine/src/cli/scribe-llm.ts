/**
 * OMEGA Scribe Engine — P.2-SCRIBE CLI
 * Standalone prose generation from golden run artifacts
 *
 * Usage:
 *   npx tsx src/cli/scribe-llm.ts --run <dir> --out <dir> [--mode mock|llm|cache] [--model <model>]
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { sha256 } from '@omega/canon-kernel';
import { segmentPlan } from '../segmenter.js';
import { buildSkeleton } from '../skeleton.js';
import { weaveLLM } from '../weaver-llm.js';
import { createScribeProvider } from '../providers/factory.js';
import { normalizeToProsePack } from '../prosepack/normalize.js';
import type { ProseConstraintConfig } from '../prosepack/types.js';
import type { ScribeProviderConfig } from '../providers/types.js';
import type { GenesisPlan } from '../types.js';

function findFile(dir: string, pattern: string): string | null {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isFile() && entry.name.includes(pattern)) return fullPath;
    if (entry.isDirectory()) {
      const found = findFile(fullPath, pattern);
      if (found) return found;
    }
  }
  return null;
}

function main(): void {
  const args = process.argv.slice(2);
  const getArg = (name: string): string | undefined => {
    const idx = args.indexOf(name);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  const runDir = resolve(getArg('--run') ?? '');
  const outDir = resolve(getArg('--out') ?? '');
  const mode = (getArg('--mode') ?? 'mock') as 'mock' | 'llm' | 'cache';
  const model = getArg('--model') ?? process.env.OMEGA_SCRIBE_MODEL ?? 'claude-sonnet-4-20250514';
  const cacheDir = getArg('--cache-dir');

  if (!runDir || !outDir) {
    console.error('Usage: npx tsx src/cli/scribe-llm.ts --run <dir> --out <dir> [--mode mock|llm|cache] [--model <model>]');
    process.exit(2);
  }

  console.log(`[scribe-llm] Run dir: ${runDir}`);
  console.log(`[scribe-llm] Mode: ${mode} | Model: ${model}`);

  // Load artifacts
  const planPath = findFile(runDir, 'genesis-plan.json');
  const intentPath = findFile(runDir, 'intent.json');

  if (!planPath || !intentPath) {
    console.error('[scribe-llm] Missing genesis-plan.json or intent.json');
    process.exit(2);
  }

  const plan = JSON.parse(readFileSync(planPath, 'utf8')) as GenesisPlan;
  const intent = JSON.parse(readFileSync(intentPath, 'utf8')) as Record<string, unknown>;

  const intentBlock = (intent as any).intent ?? {};
  console.log(`[scribe-llm] Story: "${intentBlock.title ?? 'Untitled'}"`);
  console.log(`[scribe-llm] Plan: ${plan.plan_id} (${plan.scene_count} scenes, ${plan.beat_count} beats)`);

  // Extract fields
  const constraints = (intent as any).constraints;
  const genome = (intent as any).genome;
  const emotion = (intent as any).emotion;

  // Provider config
  const providerConfig: ScribeProviderConfig = {
    mode,
    apiKey: mode === 'llm' ? process.env.ANTHROPIC_API_KEY : undefined,
    model,
    temperature: 0.75,
    maxTokens: 8192,
    cacheDir: cacheDir ? resolve(cacheDir) : join(outDir, '.cache'),
  };

  if (mode === 'llm' && !providerConfig.apiKey) {
    console.error('[scribe-llm] LLM mode requires ANTHROPIC_API_KEY env var');
    process.exit(2);
  }

  const provider = createScribeProvider(providerConfig);

  // Pipeline
  console.log(`[scribe-llm] Segmenting...`);
  const segments = segmentPlan(plan);
  const skeleton = buildSkeleton(segments, plan);
  console.log(`[scribe-llm] Skeleton: ${skeleton.segment_count} segments, ${skeleton.scene_order.length} scenes`);

  console.log(`[scribe-llm] Weaving prose (${mode})...`);
  const startTime = Date.now();
  const prose = weaveLLM(skeleton, plan, constraints, genome, emotion, provider, sha256(plan.plan_hash), intent);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`[scribe-llm] ✅ Prose: ${prose.paragraphs.length} paragraphs, ${prose.total_word_count} words (${elapsed}s)`);

  // Write outputs
  mkdirSync(outDir, { recursive: true });

  writeFileSync(join(outDir, 'scribe-prose.json'), JSON.stringify(prose, null, 2), 'utf8');
  writeFileSync(join(outDir, 'scribe-prose.txt'), prose.paragraphs.map(p => p.text).join('\n\n'), 'utf8');

  // Summary
  const summary = {
    mode, model,
    story_title: intentBlock.title,
    plan_id: plan.plan_id,
    plan_hash: plan.plan_hash,
    skeleton_hash: skeleton.skeleton_hash,
    prose_hash: prose.prose_hash,
    paragraphs: prose.paragraphs.length,
    total_words: prose.total_word_count,
    total_sentences: prose.total_sentence_count,
    scenes: skeleton.scene_order.length,
    elapsed_seconds: parseFloat(elapsed),
    timestamp: new Date().toISOString(),
  };
  writeFileSync(join(outDir, 'scribe-summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  // Build ProsePack v1
  console.log(`[scribe-llm] Building ProsePack v1...`);
  const constraintConfig: ProseConstraintConfig = {
    pov: constraints.pov ?? 'third-limited',
    tense: constraints.tense ?? 'past',
    min_scenes: constraints.min_scenes ?? 1,
    max_scenes: constraints.max_scenes ?? 99,
    banned_words: constraints.banned_words ?? [],
    forbidden_cliches: constraints.forbidden_cliches ?? [],
    max_dialogue_ratio: constraints.max_dialogue_ratio ?? 1.0,
    min_sensory_anchors_per_scene: constraints.min_sensory_anchors_per_scene ?? 1,
    word_count_tolerance: 0.50, // ±50% — LLM tends to undershoot targets
  };

  const prosePack = normalizeToProsePack(prose, plan, constraintConfig, {
    run_id: summary.prose_hash.slice(0, 16),
    plan_id: plan.plan_id,
    plan_hash: plan.plan_hash,
    skeleton_hash: skeleton.skeleton_hash,
    model,
    provider_mode: mode,
    temperature: 0.75,
    created_utc: new Date().toISOString(),
  });

  writeFileSync(join(outDir, 'ProsePack.json'), JSON.stringify(prosePack, null, 2), 'utf8');

  const status = prosePack.score.hard_pass ? (prosePack.score.soft_pass ? 'PASS' : 'WARN') : 'FAIL';
  console.log(`[scribe-llm] ProsePack: ${status} | satisfaction=${prosePack.score.constraint_satisfaction.toFixed(3)} | hard=${prosePack.score.hard_violations} soft=${prosePack.score.soft_violations}`);

  console.log(`[scribe-llm] Files written to: ${outDir}`);
}

main();
