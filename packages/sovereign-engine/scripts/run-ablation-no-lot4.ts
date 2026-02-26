// scripts/run-ablation-no-lot4.ts
// Ablation W1 sans LOT1-04 — 30 runs — isolation régression E3
// Usage: npx tsx scripts/run-ablation-no-lot4.ts

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');

const configSrc = path.join(pkgRoot, 'validation', 'validation-config-w1-no-lot4.json');
const configDst = path.join(pkgRoot, 'validation', 'validation-config.json');
const configBak = path.join(pkgRoot, 'validation', 'validation-config.BACKUP.json');

// Vérifier API key
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[ablation-no-lot4] FATAL: ANTHROPIC_API_KEY non définie');
  process.exit(1);
}

// Vérifier config existe
if (!fs.existsSync(configSrc)) {
  console.error(`[ablation-no-lot4] FATAL: ${configSrc} introuvable`);
  process.exit(1);
}

console.log('[ablation-no-lot4] OMEGA Phase T — W1 ABLATION — SANS LOT1-04');
console.log('[ablation-no-lot4] Baseline Phase S: 39.3% SEAL rate');
console.log('[ablation-no-lot4] W1 LOT 1 complet: 33.3% SEAL rate (régression -6%)');
console.log('[ablation-no-lot4] Instructions actives: LOT1-01 + LOT1-02 + LOT1-03');
console.log('[ablation-no-lot4] Instruction désactivée: LOT1-04 (pente tension +0.15/Q)');
console.log('[ablation-no-lot4] Hypothèse: LOT1-04 incompatible shapes Contemplative/SlowBurn');
console.log('');

// Backup config actuelle
fs.copyFileSync(configDst, configBak);
console.log(`[ablation-no-lot4] Config backupée: ${configBak}`);

// Swap config → no-lot4
fs.copyFileSync(configSrc, configDst);
console.log('[ablation-no-lot4] Config no-lot4 activée (10 runs × 3 exp = 30 runs)');
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
  console.log('[ablation-no-lot4] Config originale restaurée');
}
