/**
 * ⚠️ LIMITATION CONNUE — NCR_GATE_IMPORTS_BUNDLER_BLINDNESS (P1 DRAFT) :
 * Ce gate s'exécute sous `npx tsx` (esbuild = bundler resolution). Il NE PEUT
 * PAS détecter les bugs ESM Node natif (imports sans extension dans dist/).
 * Voir mission S6.2 pour Test 4 (spawn `node` strict en child_process).
 * Source : OMEGA TRIBUNAL S6.1 hotfix 2026-04-27
 */

/**
 * GATE IMPORTS — NCR_E2E_ENGINE_IMPORT_GATE_MISSING resolution
 *
 * Smoke test runtime : vérifie que pipeline souverain complet est importable.
 * Doit ÉCHOUER fail-closed si rupture (omega-forge missing, build cascade broken,
 * @omega/* symlinks effacés, judge-cache.js manquant, etc.)
 *
 * Source NCR : OMEGA/outputs/OMEGA_TRIBUNAL_2026-04-26/S6_ENGINE_RUNTIME_FORENSICS/
 *              02_NCRS_PROMOTED.md NCR-3 + 08_PHASE2_BUILD_REPORT.md §J
 *
 * Convergence 3-IA Tribunal S6 : Cowork + ChatGPT + Gemini.
 *
 * Usage : npx tsx scripts/gate-imports.ts
 *         (CWD-INDEPENDENT post-S6.1 : peut être invoqué depuis n'importe où)
 * Exit  : 0 = OK, 1 = FAIL critique (CI block)
 *
 * S6.1 HOTFIX (2026-04-27, NCR_GATE_IMPORTS_PATH_BUG P0 RESOLVED) :
 *   Path resolution basée sur import.meta.url (script location), PAS process.cwd().
 *   Anciennement : path.resolve(process.cwd(), 'packages/...') → FAIL si cwd ≠ project root.
 *   Empirique pré-fix : `cd scripts && npx tsx gate-imports.ts` → path résolu
 *                       'scripts/packages/sovereign-engine/src/engine.ts' (FAIL).
 *
 * Standard : NASA-Grade L4 / DO-178C Level A
 */

import { fileURLToPath, pathToFileURL } from 'node:url';
import * as path from 'node:path';
import * as fs from 'node:fs';

const CRITICAL_PACKAGES = [
  '@omega/omega-forge',
  '@omega/canon-kernel',
  '@omega/genesis-planner',
  '@omega/genome',
  '@omega/phonetic-stack',
  '@omega/signal-registry',
];

// S6.1 HOTFIX — Path resolution CWD-independent (NCR_GATE_IMPORTS_PATH_BUG P0)
// Base sur l'emplacement réel du script via import.meta.url, pas process.cwd().
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), '..');
const ENGINE_PATH_FS = path.join(PROJECT_ROOT, 'packages/sovereign-engine/src/engine.ts');
const ENGINE_PATH = pathToFileURL(ENGINE_PATH_FS).href;
const REQUIRED_EXPORTS = [
  'runSovereignForge',
  'runSovereignForgeBestOfN',
  'runSovereignForgeWithPacket',
];

let failures = 0;
const startTs = Date.now();

console.log('═══ GATE IMPORTS — pipeline souverain runtime check ═══');
console.log(`Date: ${new Date().toISOString()}`);
console.log(`SCRIPT_PATH  : ${SCRIPT_PATH}`);
console.log(`PROJECT_ROOT : ${PROJECT_ROOT}`);
console.log(`ENGINE_PATH  : ${ENGINE_PATH_FS}`);
console.log('');

// S6.1 — Pre-flight check : engine.ts doit exister sur le filesystem AVANT import
if (!fs.existsSync(ENGINE_PATH_FS)) {
  console.error(`❌ engine.ts NOT FOUND on filesystem at: ${ENGINE_PATH_FS}`);
  console.error(`   PROJECT_ROOT may be incorrect. Verify scripts/ location relative to project root.`);
  console.error(`   See: NCR_GATE_IMPORTS_PATH_BUG (S6.1)`);
  process.exit(1);
}


// Test 1 : 6 packages critiques @omega/*
console.log('--- Test 1 : 6 critical packages ---');
for (const pkg of CRITICAL_PACKAGES) {
  try {
    const mod = await import(pkg);
    const exports = Object.keys(mod).length;
    if (exports === 0) {
      console.error(`❌ ${pkg} : 0 exports (broken module)`);
      failures++;
    } else {
      console.log(`✅ ${pkg} : ${exports} exports`);
    }
  } catch (e) {
    const msg = (e as Error).message.slice(0, 200);
    console.error(`❌ ${pkg} : FAIL — ${msg}`);
    failures++;
  }
}

// Test 2 : engine.ts loadable
console.log('');
console.log('--- Test 2 : engine.ts loadable ---');
let engineMod: Record<string, unknown> | null = null;
try {
  engineMod = await import(ENGINE_PATH);
  console.log(`✅ engine.ts : ${Object.keys(engineMod).length} exports`);
} catch (e) {
  const msg = (e as Error).message.slice(0, 300);
  console.error(`❌ engine.ts : FAIL — ${msg}`);
  failures++;
}

// Test 3 : 3 functions clés exportées
if (engineMod !== null) {
  console.log('');
  console.log('--- Test 3 : 3 critical functions exported ---');
  for (const fn of REQUIRED_EXPORTS) {
    const v = engineMod[fn];
    if (typeof v !== 'function') {
      console.error(`❌ engine.${fn} : missing or not a function (got ${typeof v})`);
      failures++;
    } else {
      console.log(`✅ engine.${fn} : function`);
    }
  }
}

// Verdict
const durationMs = Date.now() - startTs;
console.log('');
console.log('───────────────────────────────────────────────────────');
if (failures > 0) {
  console.error(`🚨 GATE IMPORTS FAIL : ${failures} critical issues detected (${durationMs}ms)`);
  console.error('   Pipeline souverain NON RUNNABLE — réparation requise.');
  console.error('   Voir : NCR_OMEGA_FORGE_RUNTIME_AUTHORITY (S6-01)');
  console.error('          NCR_E2E_ENGINE_IMPORT_GATE_MISSING (S6-04)');
  console.error('          OMEGA/outputs/.../S6_ENGINE_RUNTIME_FORENSICS/03_REPARATION_PLAN.md');
  process.exit(1);
} else {
  console.log(`✅ GATE IMPORTS PASS : pipeline souverain importable runtime (${durationMs}ms)`);
  process.exit(0);
}
