// scripts/run-ablation-w5c.ts
// W5c — 100-run BASELINE W4b — Phase T SEAL candidate
// Architecture: W4b stable (one-shot, NO E1_MULTI_PROMPT)
// Distribution: E1=34 + E2=33 + E3=33 = 100 runs
// Usage: npx tsx scripts/run-ablation-w5c.ts
//
// INV-W5C-01: E1_MULTI_PROMPT must be unset (one-shot architecture)
// INV-W5C-02: GENESIS_V2=1 required (W4b config)
// INV-W5C-03: run_count_per_experiment = 34 (E1) / overridden to 33 for E2+E3
// INV-W5C-04: validation-config.json restored after run (FAIL-SAFE)

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');

const configSrc = path.join(pkgRoot, 'validation', 'validation-config-w5c.json');
const configDst = path.join(pkgRoot, 'validation', 'validation-config.json');
const configBak = path.join(pkgRoot, 'validation', 'validation-config.BACKUP.json');

// ─────────────────────────────────────────────────────────────────────────────
// GATE 0 — Pré-conditions
// ─────────────────────────────────────────────────────────────────────────────

// INV-W5C-01: E1_MULTI_PROMPT doit être absent
if (process.env.E1_MULTI_PROMPT === '1') {
  console.error('[run-w5c] FATAL: E1_MULTI_PROMPT=1 détecté — W5b architecture interdite pour baseline W4b');
  console.error('[run-w5c] Unset E1_MULTI_PROMPT avant de lancer W5c');
  process.exit(1);
}

// API key
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[run-w5c] FATAL: ANTHROPIC_API_KEY non définie');
  process.exit(1);
}

// Config W5c
if (!fs.existsSync(configSrc)) {
  console.error(`[run-w5c] FATAL: ${configSrc} introuvable`);
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// INFO
// ─────────────────────────────────────────────────────────────────────────────

const headCommit = execSync('git rev-parse HEAD').toString().trim();
const w4bTag = execSync('git tag -l vW4b-ADOPTED').toString().trim();

console.log('═══════════════════════════════════════════════════════════════');
console.log('  OMEGA Phase T — W5c BASELINE 100-RUN VALIDATION');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  HEAD commit:     ${headCommit}`);
console.log(`  W4b-ADOPTED tag: ${w4bTag || '(not found — verify)'}`);
console.log(`  Architecture:    W4b one-shot (E1_MULTI_PROMPT unset)`);
console.log(`  Runs:            E1=34 + E2=33 + E3=33 = 100`);
console.log(`  Objectif:        Ground truth Phase T SEAL candidate`);
console.log(`  Critères SEAL:   Global ≥50% | E1 ≥30% | E3 ≥28% | mean_composite ≥93`);
console.log('');

// Avertir si HEAD ≠ W4b (W5b commits présents mais flag-gated)
const w4bCommit = execSync('git rev-parse vW4b-ADOPTED 2>/dev/null || echo ""').toString().trim();
if (w4bCommit && headCommit !== w4bCommit) {
  console.log(`  [INFO] HEAD (${headCommit.slice(0,8)}) ≠ W4b (${w4bCommit.slice(0,8)})`);
  console.log('  [INFO] W5b commits présents mais flag-gated (E1_MULTI_PROMPT unset = SAFE)');
  console.log('');
}

// ─────────────────────────────────────────────────────────────────────────────
// SWAP CONFIG
// ─────────────────────────────────────────────────────────────────────────────

if (fs.existsSync(configDst)) {
  fs.copyFileSync(configDst, configBak);
  console.log(`  Config backupée: ${path.basename(configBak)}`);
}

fs.copyFileSync(configSrc, configDst);
console.log('  Config W5c activée (34 runs × E1, 33 × E2, 33 × E3)');
console.log('');

// ─────────────────────────────────────────────────────────────────────────────
// RUN — FAIL-SAFE wrapper (INV-W5C-04)
// ─────────────────────────────────────────────────────────────────────────────

let runExitCode = 0;

try {
  execSync('npx tsx scripts/run-validation.ts', {
    cwd: pkgRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      GENESIS_V2: '1',  // W4b config requires GENESIS_V2
      // E1_MULTI_PROMPT intentionally absent
    },
  });
} catch (err) {
  runExitCode = 1;
  console.error('[run-w5c] run-validation.ts exited with error:', (err as Error).message);
} finally {
  // INV-W5C-04: Restore config unconditionally
  if (fs.existsSync(configBak)) {
    fs.copyFileSync(configBak, configDst);
    fs.unlinkSync(configBak);
    console.log('[run-w5c] Config originale restaurée (INV-W5C-04 PASS)');
  }
}

if (runExitCode !== 0) {
  console.error('[run-w5c] FATAL: validation run échoué — analyser les logs');
  process.exit(1);
}

console.log('');
console.log('[run-w5c] DONE — lancer: npx tsx scripts/analyze-ablation-w5c.ts');
