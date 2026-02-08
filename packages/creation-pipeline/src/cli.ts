#!/usr/bin/env node
/**
 * OMEGA Creation Pipeline — CLI
 * Phase C.4 — omega-create command
 * C4-INV-12: Non-actuation (data-only output)
 */

import type { CLIArgs, CLIOutput } from './types.js';

export function parseCLIArgs(argv: readonly string[]): CLIArgs {
  let intentPath = '';
  let outDir = './output';
  let strict = true;
  let dryRun = false;
  let verbose = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--intent' && i + 1 < argv.length) {
      intentPath = argv[i + 1];
      i++;
    } else if (arg === '--out' && i + 1 < argv.length) {
      outDir = argv[i + 1];
      i++;
    } else if (arg === '--strict') {
      strict = true;
    } else if (arg === '--no-strict') {
      strict = false;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--verbose') {
      verbose = true;
    }
  }

  return { intentPath, outDir, strict, dryRun, verbose };
}

export function validateCLIArgs(args: CLIArgs): { valid: boolean; error: string } {
  if (!args.intentPath) {
    return { valid: false, error: 'Missing --intent <path>' };
  }
  return { valid: true, error: '' };
}

export function formatCLIOutput(output: CLIOutput): string {
  const lines: string[] = [];
  lines.push(`Verdict: ${output.verdict}`);
  lines.push(`Duration: ${output.duration_ms}ms`);
  lines.push(`Files written: ${output.files_written.length}`);
  for (const f of output.files_written) {
    lines.push(`  - ${f}`);
  }
  return lines.join('\n');
}
