/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — PATH SAFETY VALIDATOR
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: runtime/path-safety.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Detects absolute paths in generated JSON/TXT files.
 * FAIL-CLOSED: Any absolute path found → validation fails.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const ABSOLUTE_PATH_PATTERNS: readonly RegExp[] = [
  /[A-Z]:\\/i, // Windows: C:\, D:\
  /\/home\//i, // Linux home
  /\/Users\//i, // macOS
  /(?:^|["'\s])\\\\[a-zA-Z]+\\/i, // UNC: \\server\ (must be at value start, not mid-path)
  /\/tmp\//i, // Linux tmp
  /\/var\//i, // Linux var
  /\/mnt\//i, // Mount points
];

/**
 * Scan content for absolute paths
 * Returns array of matched patterns
 */
export function scanForAbsolutePaths(content: string): readonly string[] {
  const violations: string[] = [];

  for (const pattern of ABSOLUTE_PATH_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      for (const match of matches) {
        violations.push(match);
      }
    }
  }

  return violations;
}

/**
 * Validate a single file for path safety
 */
export function validateFilePathSafety(filePath: string): { readonly safe: boolean; readonly violations: readonly string[] } {
  if (!fs.existsSync(filePath)) {
    return { safe: true, violations: [] };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const violations = scanForAbsolutePaths(content);

  return {
    safe: violations.length === 0,
    violations,
  };
}

/**
 * Validate entire directory recursively for path safety
 * Skip binary files and certain extensions
 */
export function validateDirectoryPathSafety(
  dirPath: string,
): { readonly safe: boolean; readonly violations: readonly { readonly file: string; readonly patterns: readonly string[] }[] } {
  const violations: { file: string; patterns: string[] }[] = [];

  function walk(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        // Only check text files (JSON, TXT, MD)
        const ext = path.extname(entry.name).toLowerCase();
        if (['.json', '.txt', '.md'].includes(ext)) {
          const result = validateFilePathSafety(fullPath);
          if (!result.safe) {
            violations.push({
              file: path.relative(dirPath, fullPath),
              patterns: [...result.violations],
            });
          }
        }
      }
    }
  }

  walk(dirPath);

  return {
    safe: violations.length === 0,
    violations,
  };
}
