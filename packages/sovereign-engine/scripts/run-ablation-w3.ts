// scripts/run-ablation-w3.ts
// Ablation W3a GENESIS v2 — 30 runs — Focal Paradox + LOT3
// Usage: GENESIS_V2=1 npx tsx scripts/run-ablation-w3.ts

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
  console.error('[ablation-w3] FATAL: ANTHROPIC_API_KEY non définie');
  process.exit(1);
}

// Vérifier config existe
if (!fs.existsSync(configSrc)) {
  console.error(`[ablation-w3] FATAL: ${configSrc} introuvable`);
  process.exit(1);
}

// Forcer GENESIS_V2=1
if (process.env.GENESIS_V2 !== '1') {
  console.log('[ablation-w3] GENESIS_V2 non défini → forçage automatique GENESIS_V2=1');
}

console.log('[ablation-w3] OMEGA Phase T — W3a ABLATION — GENESIS v2');
console.log('[ablation-w3] Baseline W2: 46.7% SEAL rate');
console.log('[ablation-w3] Source commit: a778d58a');
console.log('[ablation-w3] Modules actifs: TranscendentPlanner + ParadoxGate + LOT3 (4 instructions)');
console.log('[ablation-w3] Hard gates: INV-PARADOX-01/02/03 + INV-SOMA-01 + INV-BUDGET-01');
console.log('[ablation-w3] Flag: GENESIS_V2=1');
console.log('');

// Backup config actuelle
if (fs.existsSync(configDst)) {
  fs.copyFileSync(configDst, configBak);
  console.log(`[ablation-w3] Config backupée: ${configBak}`);
}

// Swap config → W3
fs.copyFileSync(configSrc, configDst);
console.log('[ablation-w3] Config W3 activée (10 runs × 3 exp = 30 runs)');
console.log('');

try {
  execSync('npx tsx scripts/run-validation.ts', {
    cwd: pkgRoot,
    stdio: 'inherit',
    env: { ...process.env, GENESIS_V2: '1' },
  });
} finally {
  if (fs.existsSync(configBak)) {
    fs.copyFileSync(configBak, configDst);
    fs.unlinkSync(configBak);
    console.log('[ablation-w3] Config originale restaurée');
  }
}
