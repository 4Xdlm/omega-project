/**
 * OMEGA Release — Self-Test Reporter
 * Phase G.0 — Format self-test results
 */

import type { SelfTestResult, TestCheck } from './types.js';

/** Format a single check result as a line */
function formatCheck(check: TestCheck): string {
  const icon = check.status === 'PASS' ? '[PASS]' :
    check.status === 'FAIL' ? '[FAIL]' :
    check.status === 'WARN' ? '[WARN]' : '[SKIP]';
  const msg = check.message ? ` — ${check.message}` : '';
  return `  ${icon} ${check.name}${msg} (${check.duration_ms}ms)`;
}

/** Format self-test results as text */
export function formatSelfTestText(result: SelfTestResult): string {
  const lines: string[] = [];
  lines.push('OMEGA Self-Test Report');
  lines.push(`Version: ${result.version}`);
  lines.push(`Platform: ${result.platform}`);
  lines.push(`Timestamp: ${result.timestamp}`);
  lines.push('');
  lines.push('Checks:');

  for (const check of result.checks) {
    lines.push(formatCheck(check));
  }

  lines.push('');
  lines.push(`Verdict: ${result.verdict}`);
  lines.push(`Duration: ${result.duration_ms}ms`);
  return lines.join('\n');
}

/** Format self-test results as JSON */
export function formatSelfTestJSON(result: SelfTestResult): string {
  return JSON.stringify(result, null, 2);
}

/** Get a summary line for self-test */
export function selfTestSummary(result: SelfTestResult): string {
  const passed = result.checks.filter(c => c.status === 'PASS').length;
  const total = result.checks.length;
  return `Self-test: ${passed}/${total} checks passed — ${result.verdict}`;
}
