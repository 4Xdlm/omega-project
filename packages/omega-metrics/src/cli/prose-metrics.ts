/**
 * OMEGA Metrics — Prose Metrics CLI
 * Usage: npx tsx src/cli/prose-metrics.ts --prosepack <ProsePack.json>
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { computeProseMetrics } from '../metrics/prose.js';

const args = process.argv.slice(2);
const ppIdx = args.indexOf('--prosepack');
if (ppIdx === -1) {
  console.error('Usage: npx tsx src/cli/prose-metrics.ts --prosepack <ProsePack.json>');
  process.exit(2);
}

const ppPath = resolve(args[ppIdx + 1]);
const prosePack = JSON.parse(readFileSync(ppPath, 'utf8'));

const result = computeProseMetrics({ prosePack });

console.log(`[prose-metrics] ${prosePack.meta.plan_id}`);
console.log(`  MP1 schema_valid:          ${result.mp1_schema_valid}`);
console.log(`  MP2 constraint_satisfaction: ${result.mp2_constraint_satisfaction.toFixed(3)}`);
console.log(`  MP3 pov_tense_consistency:  ${result.mp3_pov_tense_consistency.toFixed(3)}`);
console.log(`  MP4 lexical_diversity:      ${result.mp4_lexical_diversity.toFixed(3)}`);
console.log(`  MP5 sensory_density:        ${result.mp5_sensory_density.toFixed(3)}`);
console.log(`  MP6 dialogue_conformity:    ${result.mp6_dialogue_conformity.toFixed(3)}`);
console.log(`  ─────────────────────────────`);
console.log(`  COMPOSITE:                  ${result.prose_composite.toFixed(3)}`);
