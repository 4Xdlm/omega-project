#!/usr/bin/env node
/**
 * gate-node-import.mjs
 *
 * Native Node ESM import probe for @omega/sovereign-engine.
 *
 * Per Mini-Tribunal S10.2.1 verdict (Q3 = Option II ciblée immédiate),
 * this gate validates that the published entrypoint is importable under
 * Node native ESM strict resolution — catching typo paths and ESM
 * compliance regressions that bundler resolution (esbuild/tsx/vitest)
 * silently masks.
 *
 * Cross-ref:
 * - NCR_GATE_IMPORTS_BUNDLER_BLINDNESS (this gate addresses it scoped)
 * - NCR_ESM_BUNDLER_VS_NODE_RUNTIME §11.2 (H1 confirmed)
 * - S10_STEP2_0_JUDGE_CACHE_FORENSIC_AUDIT.md (3-site N3 typo discovery)
 *
 * Exit codes:
 *   0 — PASS: import succeeds with > 0 keys
 *   1 — FAIL: import throws OR yields 0 keys
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

const PKG = '@omega/sovereign-engine';

try {
  const mod = await import(PKG);
  const keys = Object.keys(mod);
  if (keys.length < 1) {
    console.error(`[gate:node-import] FAIL — ${PKG} imported but exposes 0 keys`);
    process.exit(1);
  }
  console.log(`[gate:node-import] PASS — ${PKG} keys=${keys.length}`);
  process.exit(0);
} catch (err) {
  console.error(`[gate:node-import] FAIL — ${PKG} import threw:`);
  console.error(err);
  process.exit(1);
}
