/**
 * OMEGA Release — Integrity Check
 * Phase G.0 — Verify package integrity
 */

import type { TestCheck } from '../types.js';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** Check package integrity (critical files exist) */
export function checkIntegrity(projectRoot: string): TestCheck {
  const start = Date.now();
  const requiredFiles = [
    'package.json',
    'VERSION',
  ];

  const missing: string[] = [];
  for (const file of requiredFiles) {
    if (!existsSync(join(projectRoot, file))) {
      missing.push(file);
    }
  }

  if (missing.length > 0) {
    return {
      id: 'INTEGRITY', name: 'Package Integrity', status: 'WARN',
      message: `Missing files: ${missing.join(', ')}`,
      duration_ms: Date.now() - start,
      details: { missing },
    };
  }

  return {
    id: 'INTEGRITY', name: 'Package Integrity', status: 'PASS',
    message: `${requiredFiles.length} critical files verified`,
    duration_ms: Date.now() - start,
  };
}
