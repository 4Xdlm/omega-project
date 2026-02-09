/**
 * OMEGA Release — Self-Test Runner
 * Phase G.0 — Execute all self-test checks
 */

import type { SelfTestResult, TestCheck } from './types.js';
import { checkVersion } from './checks/version-check.js';
import { checkHashEngine } from './checks/hash-check.js';
import { checkModules } from './checks/modules-check.js';
import { checkCLI } from './checks/cli-check.js';
import { checkIntegrity } from './checks/integrity-check.js';
import { join } from 'node:path';

export interface SelfTestConfig {
  readonly projectRoot: string;
  readonly version: string;
}

/** Run all self-test checks */
export function runSelfTest(config: SelfTestConfig): SelfTestResult {
  const start = Date.now();
  const checks: TestCheck[] = [];

  // 1. Version check
  const versionFilePath = join(config.projectRoot, 'VERSION');
  checks.push(checkVersion(versionFilePath));

  // 2. Hash engine check
  checks.push(checkHashEngine());

  // 3. Modules check
  checks.push(checkModules());

  // 4. CLI check
  checks.push(checkCLI());

  // 5. Integrity check
  checks.push(checkIntegrity(config.projectRoot));

  const hasFailure = checks.some(c => c.status === 'FAIL');

  return {
    timestamp: new Date().toISOString(),
    version: config.version,
    platform: `${process.platform}-${process.arch}`,
    checks,
    verdict: hasFailure ? 'FAIL' : 'PASS',
    duration_ms: Date.now() - start,
  };
}

/** Run a single check by ID */
export function runSingleCheck(checkId: string, config: SelfTestConfig): TestCheck | null {
  const versionFilePath = join(config.projectRoot, 'VERSION');
  switch (checkId) {
    case 'VERSION': return checkVersion(versionFilePath);
    case 'HASH_ENGINE': return checkHashEngine();
    case 'MODULES': return checkModules();
    case 'CLI': return checkCLI();
    case 'INTEGRITY': return checkIntegrity(config.projectRoot);
    default: return null;
  }
}
