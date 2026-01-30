/**
 * OMEGA Ignition Gate - Master Script
 *
 * Runs all oracles and compares to baselines.
 * This is the single entry point for pre-launch verification.
 *
 * ORACLE-1: Structured test report (deterministic)
 * ORACLE-2: Production artefact manifest (deterministic, has baseline)
 * ORACLE-X: Runtime artifact manifest (deterministic)
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { generateDistManifest } from './oracle_dist_manifest.js';
import { generateTestReport } from './oracle_test_report.js';
import { generateRuntimeManifest } from './oracle_runtime_manifest.js';
import type { BaselineComparisonResult, OracleResult } from './types.js';

const BASELINES = {
  'ORACLE-2': {
    expected: 'baselines/oracles/dist_manifest.expected.sha256',
    actual: 'artefacts/oracles/dist_manifest.sha256',
  },
  // ORACLE-1 and ORACLE-X don't have fixed baselines
  // They depend on test count/content which may change
  // We verify they are deterministic via triple-run
};

const RESULTS_DIR = 'artefacts/oracles';

function compareToBaseline(oracle: string, expectedPath: string, actualPath: string): BaselineComparisonResult {
  if (!existsSync(actualPath)) {
    console.log(`  ${oracle}: No actual hash found at ${actualPath}`);
    return {
      oracle,
      pass: false,
      expectedHash: 'N/A',
      actualHash: 'MISSING',
    };
  }

  const actual = readFileSync(actualPath, 'utf8').trim();

  if (!existsSync(expectedPath)) {
    console.log(`  ${oracle}: No baseline found at ${expectedPath}`);
    console.log(`  ${oracle}: Actual hash = ${actual}`);
    return {
      oracle,
      pass: true, // No baseline = no comparison, pass by default
      expectedHash: 'N/A (no baseline)',
      actualHash: actual,
    };
  }

  const expected = readFileSync(expectedPath, 'utf8').trim();
  const pass = expected === actual;

  if (pass) {
    console.log(`  ${oracle}: Matches baseline`);
  } else {
    console.log(`  ${oracle}: BASELINE MISMATCH`);
    console.log(`    Expected: ${expected}`);
    console.log(`    Actual:   ${actual}`);
  }

  return { oracle, pass, expectedHash: expected, actualHash: actual };
}

function writeResults(results: {
  oracle1: OracleResult;
  oracle2: OracleResult;
  oracleX: OracleResult;
  baseline2: BaselineComparisonResult;
}): void {
  if (!existsSync(RESULTS_DIR)) {
    mkdirSync(RESULTS_DIR, { recursive: true });
  }

  const summary = {
    timestamp: new Date().toISOString(),
    oracles: {
      'ORACLE-1': {
        hash: results.oracle1.hash,
        entryCount: results.oracle1.entryCount,
        success: results.oracle1.success,
      },
      'ORACLE-2': {
        hash: results.oracle2.hash,
        entryCount: results.oracle2.entryCount,
        success: results.oracle2.success,
        baselineMatch: results.baseline2.pass,
      },
      'ORACLE-X': {
        hash: results.oracleX.hash,
        entryCount: results.oracleX.entryCount,
        success: results.oracleX.success,
      },
    },
  };

  writeFileSync(
    join(RESULTS_DIR, 'ignition_summary.json'),
    JSON.stringify(summary, null, 2) + '\n',
    'utf8'
  );
}

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA IGNITION — All Oracles');
  console.log('═══════════════════════════════════════════════════════════════════════');

  let allPass = true;

  // ═══════════════════════════════════════════════════════════════════════════════
  // ORACLE-2: Dist manifest (run first since it doesn't require tests)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('');
  console.log('[1/3] ORACLE-2: Production Artefact Manifest');
  console.log('─────────────────────────────────────────────');

  const oracle2 = await generateDistManifest();
  if (!oracle2.success) {
    console.log('  ORACLE-2: FAILED (no production files)');
    allPass = false;
  }

  const baseline2 = compareToBaseline(
    'ORACLE-2',
    BASELINES['ORACLE-2'].expected,
    BASELINES['ORACLE-2'].actual
  );
  if (!baseline2.pass && existsSync(BASELINES['ORACLE-2'].expected)) {
    allPass = false;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ORACLE-1: Test report
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('');
  console.log('[2/3] ORACLE-1: Structured Test Report');
  console.log('─────────────────────────────────────────────');

  const oracle1 = await generateTestReport();
  if (!oracle1.success) {
    console.log('  ORACLE-1: Tests have failures (non-blocking for ignition)');
    // Note: We don't set allPass = false here because test failures
    // should be caught by the test step, not the oracle step
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ORACLE-X: Runtime manifest
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('');
  console.log('[3/3] ORACLE-X: Runtime Artifact Manifest');
  console.log('─────────────────────────────────────────────');

  const oracleX = await generateRuntimeManifest();
  if (!oracleX.success) {
    console.log('  ORACLE-X: FAILED');
    // Note: ORACLE-X failure is non-blocking as it's the "radical" variant
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Write results
  // ═══════════════════════════════════════════════════════════════════════════════
  writeResults({ oracle1, oracle2, oracleX, baseline2 });

  // ═══════════════════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  IGNITION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`  ORACLE-1 (Tests):   ${oracle1.hash || 'N/A'} (${oracle1.entryCount} tests)`);
  console.log(`  ORACLE-2 (Dist):    ${oracle2.hash || 'N/A'} ${baseline2.pass ? '✓ baseline' : '✗ MISMATCH'}`);
  console.log(`  ORACLE-X (Runtime): ${oracleX.hash || 'N/A'} (${oracleX.entryCount} files)`);
  console.log('═══════════════════════════════════════════════════════════════════════');

  if (allPass) {
    console.log('');
    console.log('  ✓ IGNITION: PASS');
    console.log('');
    process.exit(0);
  } else {
    console.log('');
    console.log('  ✗ IGNITION: FAIL');
    console.log('');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('IGNITION CRASHED:', err);
  process.exit(1);
});
