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
 * Exit  : 0 = OK, 1 = FAIL critique (CI block)
 *
 * Standard : NASA-Grade L4 / DO-178C Level A
 */

const CRITICAL_PACKAGES = [
  '@omega/omega-forge',
  '@omega/canon-kernel',
  '@omega/genesis-planner',
  '@omega/genome',
  '@omega/phonetic-stack',
  '@omega/signal-registry',
];

// Path résolu depuis project root (gate-imports.ts lives in scripts/, but invoked via
// `npm run gate:imports` so process.cwd() = project root)
import { pathToFileURL } from 'node:url';
import * as path from 'node:path';
const ENGINE_PATH = pathToFileURL(
  path.resolve(process.cwd(), 'packages/sovereign-engine/src/engine.ts'),
).href;
const REQUIRED_EXPORTS = [
  'runSovereignForge',
  'runSovereignForgeBestOfN',
  'runSovereignForgeWithPacket',
];

let failures = 0;
const startTs = Date.now();

console.log('═══ GATE IMPORTS — pipeline souverain runtime check ═══');
console.log(`Date: ${new Date().toISOString()}`);
console.log('');

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
