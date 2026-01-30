/**
 * ORACLE-1: Structured Test Report
 *
 * Creates a deterministic, canonicalized test report from vitest.
 * Volatile fields (duration, timestamp) are removed.
 * Results are sorted lexicographically for determinism.
 *
 * This proves test results are reproducible across runs.
 */

import { createHash } from 'crypto';
import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { canonicalizeVitestJson, serializeCanonical } from './canonicalizer.js';
import type { OracleResult } from './types.js';

const OUTPUT_DIR = 'artefacts/oracles';
const RAW_FILE = 'test_report.raw.json';
const CANON_FILE = 'test_report.canon.json';
const HASH_FILE = 'test_report.canon.sha256';

function sha256String(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex').toUpperCase();
}

export async function generateTestReport(): Promise<OracleResult> {
  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const rawPath = join(OUTPUT_DIR, RAW_FILE);
  const canonPath = join(OUTPUT_DIR, CANON_FILE);
  const hashPath = join(OUTPUT_DIR, HASH_FILE);

  // Run vitest with JSON reporter
  console.log('ORACLE-1: Running tests with JSON reporter...');
  let testsSucceeded = true;

  try {
    execSync(`npx vitest run --reporter=json --outputFile="${rawPath}"`, {
      stdio: 'inherit',
      env: { ...process.env, CI: 'true', NO_COLOR: '1' },
      cwd: process.cwd(),
    });
  } catch (err) {
    // Tests might fail, but we still want the report
    console.log('ORACLE-1: Tests completed (some may have failed)');
    testsSucceeded = false;
  }

  // Verify raw file exists
  if (!existsSync(rawPath)) {
    console.error('ORACLE-1 ERROR: Raw test report not generated');
    return {
      success: false,
      manifestPath: '',
      hashPath: '',
      hash: '',
      entryCount: 0,
    };
  }

  // Read and canonicalize
  const rawContent = readFileSync(rawPath, 'utf8');
  let rawJson: any;

  try {
    rawJson = JSON.parse(rawContent);
  } catch (err) {
    console.error('ORACLE-1 ERROR: Failed to parse raw test report');
    return {
      success: false,
      manifestPath: rawPath,
      hashPath: '',
      hash: '',
      entryCount: 0,
    };
  }

  const canonical = canonicalizeVitestJson(rawJson);
  const canonContent = serializeCanonical(canonical);
  const canonHash = sha256String(canonContent);

  // Write outputs
  writeFileSync(canonPath, canonContent, 'utf8');
  writeFileSync(hashPath, canonHash + '\n', 'utf8');

  console.log(`ORACLE-1: canonical test report generated`);
  console.log(`  Total: ${canonical.totalTests}`);
  console.log(`  Passed: ${canonical.passed}`);
  console.log(`  Failed: ${canonical.failed}`);
  console.log(`  Skipped: ${canonical.skipped}`);
  console.log(`  Hash: ${canonHash}`);
  console.log(`  Output: ${canonPath}`);

  return {
    success: canonical.failed === 0 && testsSucceeded,
    manifestPath: canonPath,
    hashPath,
    hash: canonHash,
    entryCount: canonical.totalTests,
  };
}

// CLI entry point
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` ||
                     process.argv[1]?.endsWith('oracle_test_report.ts');

if (isMainModule) {
  generateTestReport()
    .then(result => {
      // Exit 0 even if tests fail - the oracle ran successfully
      // CI should check the hash, not exit code
      if (result.entryCount === 0) process.exit(1);
    })
    .catch(err => {
      console.error('ORACLE-1 FAILED:', err);
      process.exit(1);
    });
}
