/**
 * Gate C2: Rule Coverage
 * Each rule has a test
 */

import { RULES_PHASE_C, DEFAULT_DENY_RULE } from '../src/sentinel/rules.js';
import { readFile } from 'fs/promises';

async function run() {
  const tests = await readFile('tests/sentinel/rule-engine.test.ts', 'utf-8');
  const rules = [...RULES_PHASE_C, DEFAULT_DENY_RULE];
  const results: string[] = [];
  let pass = true;

  for (const r of rules) {
    if (tests.includes(r.id)) {
      results.push(`OK ${r.id}`);
    } else {
      results.push(`FAIL ${r.id} - NO TEST`);
      pass = false;
    }
  }

  console.log('Gate C2 - Rule Coverage:', pass ? 'PASS' : 'FAIL');
  results.forEach((r) => console.log(r));
  process.exit(pass ? 0 : 1);
}

run().catch((e) => {
  console.error('Gate C2 error:', e);
  process.exit(2);
});
