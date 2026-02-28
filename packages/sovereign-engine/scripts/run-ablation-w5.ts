// scripts/run-ablation-w5.ts
// Ablation W5b Multi-Prompt E1 — 10 runs (E1 only)
// Usage: npx tsx scripts/run-ablation-w5.ts

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');

const configDst = path.join(pkgRoot, 'validation', 'validation-config.json');
const configBak = path.join(pkgRoot, 'validation', 'validation-config.BACKUP.json');

// Verifier API key
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[ablation-w5] FATAL: ANTHROPIC_API_KEY non definie');
  process.exit(1);
}

const headCommit = execSync('git rev-parse HEAD').toString().trim();

console.log('[ablation-w5] OMEGA Phase T — W5b MULTI-PROMPT E1 ABLATION');
console.log('[ablation-w5] Baseline W4b E1: 40% SEAL rate');
console.log(`[ablation-w5] Source commit: ${headCommit}`);
console.log('[ablation-w5] Strategy: multi-prompt 10 scenes (E1 only)');
console.log('[ablation-w5] Flag E1_MULTI_PROMPT=1');
console.log('');

// Backup config actuelle
if (fs.existsSync(configDst)) {
  fs.copyFileSync(configDst, configBak);
  console.log(`[ablation-w5] Config backupee: ${configBak}`);
}

// Lire config et forcer E1 only + 10 runs
const config = JSON.parse(fs.readFileSync(configDst, 'utf8'));
const w5Config = {
  ...config,
  run_count_per_experiment: 10,
  baseline: {
    ...config.baseline,
    source_commit: headCommit.slice(0, 7),
    corpus: 'W5b multi-prompt E1 — 10 runs',
    value: 40.0,
  },
};
fs.writeFileSync(configDst, JSON.stringify(w5Config, null, 2), 'utf8');
console.log('[ablation-w5] Config W5b activee (10 runs, E1 only via flag)');
console.log('');

try {
  execSync('npx tsx scripts/run-validation.ts', {
    cwd: pkgRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      E1_MULTI_PROMPT: '1',
    },
  });
} finally {
  if (fs.existsSync(configBak)) {
    fs.copyFileSync(configBak, configDst);
    fs.unlinkSync(configBak);
    console.log('[ablation-w5] Config originale restauree');
  }
}
