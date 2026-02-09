/**
 * OMEGA Release — Modules Check
 * Phase G.0 — Verify critical modules importable
 */

import type { TestCheck } from '../types.js';
import { isSemVer } from '../../version/parser.js';
import { sha256String } from '../../release/hasher.js';

/** Check that critical modules can be imported */
export function checkModules(): TestCheck {
  const start = Date.now();
  const modules: string[] = [];
  const failures: string[] = [];

  // Check version module
  try {
    if (typeof isSemVer === 'function') {
      modules.push('version/parser');
    } else {
      failures.push('version/parser');
    }
  } catch {
    failures.push('version/parser');
  }

  // Check hasher module
  try {
    if (typeof sha256String === 'function') {
      modules.push('release/hasher');
    } else {
      failures.push('release/hasher');
    }
  } catch {
    failures.push('release/hasher');
  }

  if (failures.length > 0) {
    return {
      id: 'MODULES', name: 'Critical Modules', status: 'FAIL',
      message: `Failed to import: ${failures.join(', ')}`,
      duration_ms: Date.now() - start,
    };
  }

  return {
    id: 'MODULES', name: 'Critical Modules', status: 'PASS',
    message: `${modules.length} modules verified`,
    duration_ms: Date.now() - start,
    details: { modules },
  };
}
