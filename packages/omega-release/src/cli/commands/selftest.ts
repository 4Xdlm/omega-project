/**
 * OMEGA Release — CLI Self-Test Command
 * Phase G.0
 */

import type { ParsedArgs } from '../parser.js';
import { runSelfTest } from '../../selftest/runner.js';
import { formatSelfTestText, formatSelfTestJSON, selfTestSummary } from '../../selftest/reporter.js';
import { readVersionFile } from '../../version/file.js';
import { join } from 'node:path';

/** Handle selftest command */
export function handleSelftest(parsed: ParsedArgs, projectRoot: string): string {
  const versionFilePath = join(projectRoot, 'VERSION');
  const vf = readVersionFile(versionFilePath);
  const version = vf?.version ?? '0.0.0';

  const result = runSelfTest({ projectRoot, version });

  const format = parsed.flags['format'] as string | undefined;
  if (format === 'json') {
    return formatSelfTestJSON(result);
  }
  if (format === 'summary') {
    return selfTestSummary(result);
  }
  return formatSelfTestText(result);
}
