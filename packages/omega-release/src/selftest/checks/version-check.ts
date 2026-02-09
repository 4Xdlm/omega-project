/**
 * OMEGA Release — Version Check
 * Phase G.0 — Verify VERSION file consistency
 */

import type { TestCheck } from '../types.js';
import { existsSync, readFileSync } from 'node:fs';
import { isSemVer } from '../../version/parser.js';

/** Check VERSION file exists and is valid SemVer */
export function checkVersion(versionFilePath: string): TestCheck {
  const start = Date.now();

  if (!existsSync(versionFilePath)) {
    return {
      id: 'VERSION', name: 'Version File', status: 'FAIL',
      message: `VERSION file not found: ${versionFilePath}`,
      duration_ms: Date.now() - start,
    };
  }

  const version = readFileSync(versionFilePath, 'utf-8').trim();

  if (!isSemVer(version)) {
    return {
      id: 'VERSION', name: 'Version File', status: 'FAIL',
      message: `Invalid SemVer in VERSION file: "${version}"`,
      duration_ms: Date.now() - start,
    };
  }

  return {
    id: 'VERSION', name: 'Version File', status: 'PASS',
    message: `Version: ${version}`,
    duration_ms: Date.now() - start,
    details: { version },
  };
}
