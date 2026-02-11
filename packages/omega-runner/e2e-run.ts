/**
 * OMEGA E2E — Direct pipeline runner with console output
 * Bypasses the silent CLI logger
 */
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { orchestrateFull } from './src/orchestrator/runFull.js';
import { validateIntent } from './src/validation/index.js';
import { createLogger } from './src/logger/index.js';
import { canonicalJSON } from './src/proofpack/canonical.js';
import { hashString } from './src/proofpack/hash.js';
import { writeProofPack } from './src/proofpack/write.js';
import { getVersionMap } from './src/version.js';

const intentPath = process.argv[2];
const outDir = process.argv[3];
const seed = process.argv[4] ?? '';

if (!intentPath || !outDir) {
  console.error('Usage: npx tsx e2e-run.ts <intent.json> <outDir> [seed]');
  process.exit(2);
}

console.log(`[E2E] Intent: ${intentPath}`);
console.log(`[E2E] Output: ${outDir}`);
console.log(`[E2E] Seed: ${seed}`);

try {
  const raw = readFileSync(resolve(intentPath), 'utf8');
  const parsed = JSON.parse(raw);
  console.log(`[E2E] Intent loaded: ${parsed.intent?.title ?? 'untitled'}`);

  const validation = validateIntent(parsed);
  if (!validation.valid) {
    console.error(`[E2E] VALIDATION FAIL:`, validation.errors);
    process.exit(2);
  }
  console.log(`[E2E] Validation: PASS (format=${validation.format})`);

  const logger = createLogger();
  const timestamp = '2026-01-01T00:00:00.000Z';

  console.log(`[E2E] Running orchestrateFull...`);
  const result = orchestrateFull(parsed, seed, timestamp, logger);
  console.log(`[E2E] Pipeline complete: run_id=${result.run_id}, verdict=${result.creation.verdict}`);

  // Write proof pack
  const runDir = join(resolve(outDir), 'runs', result.run_id);
  const creation = result.creation;
  const forge = result.forge;
  const intentCanonical = canonicalJSON(parsed);

  const artifacts = [
    { stage: '00-intent', filename: 'intent.json', content: intentCanonical },
    { stage: '10-genesis', filename: 'genesis-plan.json', content: canonicalJSON(creation.genesis_plan) },
    { stage: '20-scribe', filename: 'scribe-output.json', content: canonicalJSON(creation.scribe_output) },
    { stage: '30-style', filename: 'styled-output.json', content: canonicalJSON(creation.style_output) },
    { stage: '40-creation', filename: 'creation-result.json', content: canonicalJSON({
      pipeline_id: creation.pipeline_id,
      output_hash: creation.output_hash,
      intent_hash: creation.intent_hash,
      verdict: creation.verdict,
    }) },
    { stage: '50-forge', filename: 'forge-report.json', content: canonicalJSON(forge.forge_report) },
  ];

  const stagesCompleted = ['00-intent', '10-genesis', '20-scribe', '30-style', '40-creation', '50-forge'];
  const intentHash = hashString(intentCanonical);

  writeProofPack(
    runDir, result.run_id, seed, getVersionMap(),
    artifacts, intentHash, forge.output_hash, forge.verdict, stagesCompleted,
    canonicalJSON({ run_id: result.run_id, verdict: forge.verdict }),
    `# Full Run ${result.run_id}\n\nVerdict: ${forge.verdict}\n`,
    logger.toText(),
    logger,
  );

  console.log(`[E2E] Proof pack written to: ${runDir}`);
  console.log(`[E2E] Genesis plan hash: ${creation.genesis_plan.plan_hash}`);
  console.log(`[E2E] Logger output:`);
  console.log(logger.toText());
  console.log(`[E2E] SUCCESS`);
  process.exit(0);
} catch (err) {
  console.error(`[E2E] CRASH:`, err instanceof Error ? err.message : err);
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  process.exit(4);
}
