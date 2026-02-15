#!/usr/bin/env node
/**
 * OMEGA Sovereign — Gate: Active
 * Sprint 3.3 — GATE-ACTIVE-01
 *
 * Vérifie que les gates sont actives et fonctionnent.
 * Teste que gate:no-todo détecte réellement les violations.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testFile = path.resolve(__dirname, '../src/.gate-test-poison.ts');

try {
  // Créer un fichier temporaire avec un TODO
  fs.writeFileSync(testFile, '// TODO: Gate test poison\n', 'utf-8');

  // Exécuter gate:no-todo — doit échouer
  try {
    execSync('npm run gate:no-todo', {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'pipe',
    });

    // Si on arrive ici, le gate n'a PAS détecté le poison → FAIL
    console.error('❌ Gate ACTIVE violated [GATE-ACTIVE-01]:');
    console.error('  gate:no-todo did NOT detect test poison file');
    console.error('  Gates are NOT working correctly');
    process.exit(1);
  } catch (err: any) {
    // Gate a détecté le poison (exit 1) → GOOD
    if (err.status === 1) {
      console.log('✅ Gate ACTIVE passed — gate:no-todo correctly detected poison');
    } else {
      console.error('❌ Gate ACTIVE violated: unexpected error from gate:no-todo');
      console.error(err.message);
      process.exit(1);
    }
  }
} finally {
  // Nettoyer le fichier poison
  if (fs.existsSync(testFile)) {
    fs.unlinkSync(testFile);
  }
}

process.exit(0);
