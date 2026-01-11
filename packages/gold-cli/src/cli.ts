#!/usr/bin/env node
/**
 * @fileoverview OMEGA Gold CLI - Main Entry Point
 * @module @omega/gold-cli/cli
 *
 * Command-line interface for gold certification.
 */

import { parseArgs, generateHelp, generateVersion } from './parser.js';
import { runGoldCertification, generateCertificationReport, runIntegrations, generateProofPack } from './runner.js';
import { createConsoleWriter } from './output.js';
import type { ParsedArgs } from './types.js';
import * as fs from 'fs';

// ═══════════════════════════════════════════════════════════════════════════════
// CLI EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Execute CLI command.
 */
export async function executeCli(args: readonly string[]): Promise<number> {
  const parsed = parseArgs(args);
  const output = createConsoleWriter();

  try {
    switch (parsed.command) {
      case 'help':
        output.writeln(generateHelp());
        return 0;

      case 'version':
        output.writeln(generateVersion());
        return 0;

      case 'certify':
        return await runCertifyCommand(parsed, output);

      case 'validate':
        return await runValidateCommand(parsed, output);

      case 'report':
        return await runReportCommand(parsed, output);

      default:
        output.error(`Unknown command: ${parsed.command}`);
        output.writeln(generateHelp());
        return 1;
    }
  } catch (error) {
    output.error(error instanceof Error ? error.message : 'Unknown error');
    return 1;
  }
}

/**
 * Run certify command.
 */
async function runCertifyCommand(
  parsed: ParsedArgs,
  output: ReturnType<typeof createConsoleWriter>
): Promise<number> {
  const { options } = parsed;

  output.info('Starting OMEGA Gold Certification...');
  output.info(`Version: ${options.version}`);
  output.info(`Format: ${options.format}`);

  // Run certification
  const result = await runGoldCertification(
    options.version,
    options.cwd,
    output,
    options.verbose
  );

  // Generate report
  const report = await generateCertificationReport(
    result,
    options.format,
    output,
    options.verbose
  );

  // Generate proof pack if requested
  if (options.proofPack) {
    output.info('Generating proof pack...');
    const pack = generateProofPack(result, report, options.version);
    if (options.verbose) {
      output.success(`Proof pack created with ${Object.keys(pack.content).length} files`);
    }
  }

  // Output report
  if (options.output) {
    fs.writeFileSync(options.output, report, 'utf8');
    output.success(`Report written to ${options.output}`);
  } else {
    output.writeln(report);
  }

  // Summary
  output.writeln('');
  output.info('═══════════════════════════════════════════════════════════════');
  output.info('CERTIFICATION SUMMARY');
  output.info('═══════════════════════════════════════════════════════════════');
  output.info(`Total Tests: ${result.totalTests}`);
  output.info(`Passed: ${result.totalPassed}`);
  output.info(`Failed: ${result.totalFailed}`);
  output.info(`Duration: ${result.totalDuration}ms`);
  output.info(`Status: ${result.success ? 'CERTIFIED' : 'FAILED'}`);
  output.info('═══════════════════════════════════════════════════════════════');

  return result.success ? 0 : 1;
}

/**
 * Run validate command.
 */
async function runValidateCommand(
  parsed: ParsedArgs,
  output: ReturnType<typeof createConsoleWriter>
): Promise<number> {
  output.info('Running validation...');

  const validation = await runIntegrations(output, parsed.options.verbose);

  output.writeln('');
  output.info('INTEGRATION RESULTS:');
  for (const integration of validation.integrations) {
    const status = integration.valid ? '[PASS]' : '[FAIL]';
    output.writeln(`  ${status} ${integration.name}`);
    if (!integration.valid && integration.errors.length > 0) {
      for (const error of integration.errors) {
        output.error(`    - ${error}`);
      }
    }
  }

  const passed = validation.integrations.filter((i) => i.valid).length;
  const total = validation.integrations.length;

  output.writeln('');
  output.info(`Validation: ${passed}/${total} integrations passed`);

  return validation.valid ? 0 : 1;
}

/**
 * Run report command.
 */
async function runReportCommand(
  parsed: ParsedArgs,
  output: ReturnType<typeof createConsoleWriter>
): Promise<number> {
  output.info('Generating report...');

  // Run minimal certification for report
  const result = await runGoldCertification(
    parsed.options.version,
    parsed.options.cwd,
    output,
    false
  );

  const report = await generateCertificationReport(
    result,
    parsed.options.format,
    output,
    false
  );

  if (parsed.options.output) {
    fs.writeFileSync(parsed.options.output, report, 'utf8');
    output.success(`Report written to ${parsed.options.output}`);
  } else {
    output.writeln(report);
  }

  return 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

// Run if executed directly
if (process.argv[1]?.endsWith('cli.js') || process.argv[1]?.endsWith('cli.ts')) {
  executeCli(process.argv).then((code) => {
    process.exit(code);
  });
}
