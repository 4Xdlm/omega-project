// scripts/run-ablation-w1.ts
// Ablation W1 LOT 1 — 30 runs — wrapper sur run-validation.ts
// Usage: npx tsx scripts/run-ablation-w1.ts

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');

const configSrc = path.join(pkgRoot, 'validation', 'validation-config-w1-lot1.json');
const configDst = path.join(pkgRoot, 'validation', 'validation-config.json');
const configBak = path.join(pkgRoot, 'validation', 'validation-config.BACKUP.json');

// Vérifier API key
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[ablation-w1] FATAL: ANTHROPIC_API_KEY non définie');
  process.exit(1);
}

// Vérifier config W1 existe
if (!fs.existsSync(configSrc)) {
  console.error(`[ablation-w1] FATAL: ${configSrc} introuvable`);
  process.exit(1);
}

console.log('[ablation-w1] OMEGA Phase T — W1 LOT 1 — 30 RUNS ABLATION');
console.log('[ablation-w1] Baseline Phase S: 39.3% SEAL rate');
console.log('[ablation-w1] Instructions injectées: LOT1-01 + LOT1-02 + LOT1-03 + LOT1-04');
console.log('[ablation-w1] Objectif: SEAL rate E1 → 25-28%');
console.log('');

// Backup config actuelle
fs.copyFileSync(configDst, configBak);
console.log(`[ablation-w1] Config backupée: ${configBak}`);

// Swap config → W1
fs.copyFileSync(configSrc, configDst);
console.log('[ablation-w1] Config W1 activée (10 runs × 3 exp = 30 runs)');
console.log('');

try {
  // Lancer le runner existant
  execSync('npx tsx scripts/run-validation.ts', {
    cwd: pkgRoot,
    stdio: 'inherit',
    env: { ...process.env },
  });
} finally {
  // Toujours restaurer la config originale
  fs.copyFileSync(configBak, configDst);
  fs.unlinkSync(configBak);
  console.log('[ablation-w1] Config originale restaurée');
}
