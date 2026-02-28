// scripts/run-ablation-w4.ts
// Ablation W4 Prompt Injection — 30 runs
// Usage: npx tsx scripts/run-ablation-w4.ts

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');

const configSrc = path.join(pkgRoot, 'validation', 'validation-config-w3.json');
const configDst = path.join(pkgRoot, 'validation', 'validation-config.json');
const configBak = path.join(pkgRoot, 'validation', 'validation-config.BACKUP.json');

// Vérifier API key
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[ablation-w4] FATAL: ANTHROPIC_API_KEY non définie');
  process.exit(1);
}

// Vérifier config existe
if (!fs.existsSync(configSrc)) {
  console.error(`[ablation-w4] FATAL: ${configSrc} introuvable`);
  process.exit(1);
}

const headCommit = execSync('git rev-parse HEAD').toString().trim();

console.log('[ablation-w4] Flag GENESIS_V2=' + (process.env.GENESIS_V2 ?? 'unset (off)'));

console.log('[ablation-w4] OMEGA Phase T — W4 PROMPT INJECTION ABLATION');
console.log('[ablation-w4] Baseline W2: 46.7% SEAL rate');
console.log(`[ablation-w4] Source commit: ${headCommit}`);
console.log('[ablation-w4] Injections: signature_words + tension + densité ');
console.log('[ablation-w4] Scoring fix: scoreSignatureOffline threshold 0.6');
console.log('');

// Backup config actuelle
if (fs.existsSync(configDst)) {
  fs.copyFileSync(configDst, configBak);
  console.log(`[ablation-w4] Config backupée: ${configBak}`);
}

// Swap config → W4 (reuses W3 config — same experiments)
fs.copyFileSync(configSrc, configDst);
console.log('[ablation-w4] Config W4 activée (10 runs × 3 exp = 30 runs)');
console.log('');

try {
  execSync('npx tsx scripts/run-validation.ts', {
    cwd: pkgRoot,
    stdio: 'inherit',
    env: { ...process.env },
  });
} finally {
  if (fs.existsSync(configBak)) {
    fs.copyFileSync(configBak, configDst);
    fs.unlinkSync(configBak);
    console.log('[ablation-w4] Config originale restaurée');
  }
}

