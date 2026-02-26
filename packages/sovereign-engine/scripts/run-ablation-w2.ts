// scripts/run-ablation-w2.ts
// Ablation W2 LOT 2 — 30 runs — soma-gate + budget-gate + LOT2 PDB
// Usage: npx tsx scripts/run-ablation-w2.ts

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');

const configSrc = path.join(pkgRoot, 'validation', 'validation-config-w2.json');
const configDst = path.join(pkgRoot, 'validation', 'validation-config.json');
const configBak = path.join(pkgRoot, 'validation', 'validation-config.BACKUP.json');

// Vérifier API key
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[ablation-w2] FATAL: ANTHROPIC_API_KEY non définie');
  process.exit(1);
}

// Vérifier config existe
if (!fs.existsSync(configSrc)) {
  console.error(`[ablation-w2] FATAL: ${configSrc} introuvable`);
  process.exit(1);
}

console.log('[ablation-w2] OMEGA Phase T — W2 ABLATION — LOT 2');
console.log('[ablation-w2] Baseline W1 (no-lot4): 40.0% SEAL rate');
console.log('[ablation-w2] Source commit: 99c5d86b');
console.log('[ablation-w2] Modules actifs: InstructionToggleTable + soma-gate + budget-gate + LOT2 PDB');
console.log('[ablation-w2] Instructions LOT2: LOT2-01 (anatomie spécifique) + LOT2-02 (budget révélation) + LOT2-03 (nécessité absolue)');
console.log('[ablation-w2] Hard gates: INV-SOMA-01 + INV-BUDGET-01 + INV-RETEN-01');
console.log('');

// Backup config actuelle
if (fs.existsSync(configDst)) {
  fs.copyFileSync(configDst, configBak);
  console.log(`[ablation-w2] Config backupée: ${configBak}`);
}

// Swap config → W2
fs.copyFileSync(configSrc, configDst);
console.log('[ablation-w2] Config W2 activée (10 runs × 3 exp = 30 runs)');
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
  if (fs.existsSync(configBak)) {
    fs.copyFileSync(configBak, configDst);
    fs.unlinkSync(configBak);
    console.log('[ablation-w2] Config originale restaurée');
  }
}
