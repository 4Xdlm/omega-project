#!/usr/bin/env node
/**
 * OMEGA Runner CLI v1.0
 * Phase I - NASA-Grade L4 / DO-178C
 *
 * Command-line interface for OMEGA runner operations.
 *
 * INVARIANTS:
 * - I-INV-02: No network usage
 * - I-INV-03: No dynamic imports
 * - I-INV-04: No ENV override for critical paths
 * - I-INV-06: Exit codes deterministic and stage-mapped
 *
 * USAGE:
 *   omega-run run <intent.json> [--profile=<id>]
 *   omega-run batch <dir> [--profile=<id>]
 *   omega-run verify <run-dir>
 *   omega-run capsule <run-dir> [--output=<path>]
 *   omega-run help [command]
 *
 * SPEC: RUNNER_SPEC v1.2 §I
 */

import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

// Import runner modules (static imports only - I-INV-03)
import {
  ExitCode,
  parseArgs,
  formatHelp,
  formatCommandHelp,
  executePipeline,
  getPipelineFiles,
  writeAllRunFiles,
  createRunPath,
  verifyRun,
  createCapsule,
  listIntentFiles,
  readIntentFile,
  generateRunReport,
  generateBatchReport,
  generateVerifyReport,
  generateCapsuleReport,
  writeReportToRun,
  appendLog,
  createLogEntryFromRun,
  createLogEntryFromVerify,
} from '../dist/runner/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const LOG_PATH = 'artefacts/runs/runner.log';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Prints message to stdout.
 */
function print(message) {
  console.log(message);
}

/**
 * Prints error message to stderr.
 */
function printError(message) {
  console.error(`ERROR: ${message}`);
}

/**
 * Gets current timestamp.
 */
function getTimestamp() {
  return new Date().toISOString();
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handles 'run' command.
 */
async function handleRun(intentPath, profile) {
  if (!intentPath) {
    printError('Missing intent file path');
    return ExitCode.INTENT_INVALID;
  }

  const resolvedPath = resolve(intentPath);
  if (!existsSync(resolvedPath)) {
    printError(`Intent file not found: ${resolvedPath}`);
    return ExitCode.INTENT_INVALID;
  }

  print(`Running intent: ${resolvedPath}`);

  // Read intent
  const intentContent = readFileSync(resolvedPath, 'utf-8');
  const timestamp = getTimestamp();

  // Execute pipeline
  const { files, result } = getPipelineFiles(intentContent, {
    profile,
    timestamp,
    basePath: process.cwd(),
  });

  if (!result.success) {
    printError(result.error || 'Pipeline failed');
    return result.exitCode;
  }

  // Write files to disk
  const runDir = createRunPath(process.cwd(), result.runId.replace(/^run_/, '').replace(/_\d+$/, ''));
  writeAllRunFiles(runDir, files);

  // Write report
  const report = generateRunReport(result);
  writeReportToRun(runDir.path, report);

  // Log
  try {
    appendLog(LOG_PATH, createLogEntryFromRun(result));
  } catch {
    // Logging is best-effort
  }

  print(`\nRun completed successfully!`);
  print(`  Run ID:   ${result.runId}`);
  print(`  Run Path: ${runDir.path}`);
  print(`  Run Hash: ${result.runHash}`);

  return ExitCode.PASS;
}

/**
 * Handles 'batch' command.
 */
async function handleBatch(dirPath, profile) {
  if (!dirPath) {
    printError('Missing directory path');
    return ExitCode.INTENT_INVALID;
  }

  const resolvedPath = resolve(dirPath);
  if (!existsSync(resolvedPath)) {
    printError(`Directory not found: ${resolvedPath}`);
    return ExitCode.INTENT_INVALID;
  }

  print(`Batch processing: ${resolvedPath}`);

  // List intent files
  const intentFiles = listIntentFiles(resolvedPath);
  if (intentFiles.length === 0) {
    printError('No intent files found in directory');
    return ExitCode.INTENT_INVALID;
  }

  print(`Found ${intentFiles.length} intent files\n`);

  const results = [];
  let successCount = 0;
  let failCount = 0;

  // Process each intent
  for (const intentFile of intentFiles) {
    const intentContent = readIntentFile(intentFile);
    const timestamp = getTimestamp();

    const { files, result } = getPipelineFiles(intentContent, {
      profile,
      timestamp,
      basePath: process.cwd(),
    });

    if (result.success) {
      // Write files
      const runDir = createRunPath(
        process.cwd(),
        result.runId.replace(/^run_/, '').replace(/_\d+$/, '')
      );
      writeAllRunFiles(runDir, files);

      // Write report
      const report = generateRunReport(result);
      writeReportToRun(runDir.path, report);

      print(`  ✓ ${result.runId}`);
      successCount++;
    } else {
      print(`  ✗ ${intentFile}: ${result.error}`);
      failCount++;
    }

    results.push(result);

    // Log
    try {
      appendLog(LOG_PATH, createLogEntryFromRun(result));
    } catch {
      // Logging is best-effort
    }
  }

  // Summary
  const batchResult = {
    success: failCount === 0,
    exitCode: failCount === 0 ? ExitCode.PASS : ExitCode.INTENT_INVALID,
    runs: results,
    totalRuns: results.length,
    successfulRuns: successCount,
    failedRuns: failCount,
  };

  print(`\nBatch complete: ${successCount} passed, ${failCount} failed`);

  return batchResult.exitCode;
}

/**
 * Handles 'verify' command.
 */
async function handleVerify(runPath) {
  if (!runPath) {
    printError('Missing run directory path');
    return ExitCode.VERIFY_FAIL;
  }

  const resolvedPath = resolve(runPath);
  if (!existsSync(resolvedPath)) {
    printError(`Run directory not found: ${resolvedPath}`);
    return ExitCode.VERIFY_FAIL;
  }

  print(`Verifying: ${resolvedPath}`);

  // Run verification
  const result = verifyRun(resolvedPath);
  const timestamp = getTimestamp();

  // Log
  try {
    appendLog(LOG_PATH, createLogEntryFromVerify(result, resolvedPath, timestamp));
  } catch {
    // Logging is best-effort
  }

  if (result.success) {
    print(`\nVerification PASSED`);
    print(`  Files checked: ${result.filesChecked}`);
    print(`  Files valid:   ${result.filesValid}`);
    return ExitCode.PASS;
  } else {
    print(`\nVerification FAILED`);
    print(`  Files checked: ${result.filesChecked}`);
    print(`  Files valid:   ${result.filesValid}`);
    print(`  Mismatches:`);
    for (const m of result.mismatches) {
      print(`    - ${m.file}`);
      print(`      Expected: ${m.expected.slice(0, 16)}...`);
      print(`      Actual:   ${m.actual.slice(0, 16)}...`);
    }
    return ExitCode.VERIFY_FAIL;
  }
}

/**
 * Handles 'capsule' command.
 */
async function handleCapsule(runPath, outputPath) {
  if (!runPath) {
    printError('Missing run directory path');
    return ExitCode.CAPSULE_FAIL;
  }

  const resolvedPath = resolve(runPath);
  if (!existsSync(resolvedPath)) {
    printError(`Run directory not found: ${resolvedPath}`);
    return ExitCode.CAPSULE_FAIL;
  }

  print(`Creating capsule: ${resolvedPath}`);

  // Create capsule
  const result = await createCapsule(resolvedPath, {
    outputPath: outputPath ? resolve(outputPath) : undefined,
  });

  if (result.success) {
    print(`\nCapsule created successfully!`);
    print(`  Path:       ${result.capsulePath}`);
    print(`  Hash:       ${result.capsuleHash}`);
    print(`  Files:      ${result.fileCount}`);
    print(`  Total size: ${result.totalBytes} bytes`);
    return ExitCode.PASS;
  } else {
    printError('Failed to create capsule');
    return ExitCode.CAPSULE_FAIL;
  }
}

/**
 * Handles 'help' command.
 */
function handleHelp(command) {
  if (command) {
    print(formatCommandHelp(command));
  } else {
    print(formatHelp());
  }
  return ExitCode.PASS;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const parsed = parseArgs(args);

  if (!parsed.success) {
    printError(parsed.error || 'Invalid arguments');
    print('\nUsage: omega-run <command> [options]');
    print('Run "omega-run help" for more information.');
    process.exit(ExitCode.INTENT_INVALID);
  }

  const { command, intentPath, dirPath, runPath, outputPath, profile } = parsed.args;

  let exitCode;

  switch (command) {
    case 'run':
      exitCode = await handleRun(intentPath, profile);
      break;

    case 'batch':
      exitCode = await handleBatch(dirPath, profile);
      break;

    case 'verify':
      exitCode = await handleVerify(runPath);
      break;

    case 'capsule':
      exitCode = await handleCapsule(runPath, outputPath);
      break;

    case 'help':
    default:
      exitCode = handleHelp(args[1]);
      break;
  }

  process.exit(exitCode);
}

// Run main
main().catch((err) => {
  printError(err.message);
  process.exit(1);
});
