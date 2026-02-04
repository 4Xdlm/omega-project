#!/usr/bin/env node
/**
 * OMEGA Runner CLI Main Entry Point v1.0
 * Phase I - NASA-Grade L4 / DO-178C
 *
 * Main executable that dispatches CLI commands.
 *
 * SPEC: RUNNER_SPEC v1.2 §I
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { join, resolve, basename, dirname } from 'path';

import {
  parseArgs,
  getHelpText,
  formatError,
  CliParseError,
} from './cli-parser';

import type { ParsedArgs, RunResult, BatchResult, VerifyResult, CapsuleResult } from './types';
import { ExitCode, FIXED_PATHS, RUN_FILES, DEFAULT_PROFILE } from './types';

import { getPipelineFiles } from './pipeline';
import { verifyRun } from './verifier';
import { createCapsule } from './capsule';

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Ensures directory exists.
 */
function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Gets fixed timestamp for determinism.
 */
function getFixedTimestamp(): string {
  // Use fixed timestamp for deterministic runs in test mode
  // In production, this could use real timestamp
  return '2026-01-28T00:00:00.000Z';
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handles 'help' command.
 */
function handleHelp(): number {
  console.log(getHelpText());
  return ExitCode.PASS;
}

/**
 * Handles 'run' command.
 */
function handleRun(args: ParsedArgs): number {
  if (args.command !== 'run' || !args.intentPath) {
    console.error('Error: Invalid run command');
    return ExitCode.INTENT_INVALID;
  }

  const intentPath = resolve(args.intentPath);

  // Check intent file exists
  if (!existsSync(intentPath)) {
    console.error(`Error: Intent file not found: ${intentPath}`);
    return ExitCode.INTENT_INVALID;
  }

  // Read intent
  let intentContent: string;
  try {
    intentContent = readFileSync(intentPath, 'utf-8');
  } catch (e) {
    console.error(`Error: Could not read intent file: ${(e as Error).message}`);
    return ExitCode.INTENT_INVALID;
  }

  // Parse intent to get intentId
  let intentData: { intentId?: string; [key: string]: unknown };
  try {
    intentData = JSON.parse(intentContent);
  } catch (e) {
    console.error(`Error: Invalid intent JSON: ${(e as Error).message}`);
    return ExitCode.INTENT_INVALID;
  }

  // Generate intentId if missing (from filename)
  if (!intentData.intentId) {
    const baseFilename = basename(intentPath, '.json');
    intentData.intentId = baseFilename;
    intentContent = JSON.stringify(intentData, null, 2);
  }

  // Ensure runs directory exists
  const runsDir = resolve(FIXED_PATHS.RUNS_ROOT);
  ensureDir(runsDir);

  // Execute pipeline
  const profile = args.profile ?? DEFAULT_PROFILE;
  const { files, result } = getPipelineFiles(intentContent, {
    profile,
    basePath: resolve('.'),
    timestamp: getFixedTimestamp(),
  });

  if (!result.success) {
    console.error(`Error: Pipeline failed - ${result.error}`);
    return result.exitCode;
  }

  // Write files to run directory
  const runDir = result.runPath;
  ensureDir(runDir);

  for (const [filename, content] of files) {
    const filePath = join(runDir, filename);
    const fileDir = dirname(filePath);
    ensureDir(fileDir);
    writeFileSync(filePath, content, 'utf-8');
  }

  // Output result
  console.log(`✅ Run completed successfully`);
  console.log(`   Run ID:   ${result.runId}`);
  console.log(`   Run Path: ${result.runPath}`);
  console.log(`   Run Hash: ${result.runHash}`);

  return ExitCode.PASS;
}

/**
 * Handles 'batch' command.
 */
function handleBatch(args: ParsedArgs): number {
  if (args.command !== 'batch' || !args.dirPath) {
    console.error('Error: Invalid batch command');
    return ExitCode.INTENT_INVALID;
  }

  const dirPath = resolve(args.dirPath);

  // Check directory exists
  if (!existsSync(dirPath)) {
    console.error(`Error: Directory not found: ${dirPath}`);
    return ExitCode.INTENT_INVALID;
  }

  // List intent files
  const files = readdirSync(dirPath)
    .filter(f => f.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    console.error(`Error: No JSON files found in ${dirPath}`);
    return ExitCode.INTENT_INVALID;
  }

  console.log(`Processing ${files.length} intent files...`);

  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    const intentPath = join(dirPath, file);
    console.log(`\n--- Processing: ${file} ---`);

    // Create run args
    const runArgs: ParsedArgs = {
      command: 'run',
      intentPath,
      profile: args.profile ?? DEFAULT_PROFILE,
    };

    const exitCode = handleRun(runArgs);

    if (exitCode === ExitCode.PASS) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log(`\n=== Batch Complete ===`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed:  ${failCount}`);

  return failCount > 0 ? ExitCode.GENERATION_FAIL : ExitCode.PASS;
}

/**
 * Handles 'verify' command.
 */
function handleVerify(args: ParsedArgs): number {
  if (args.command !== 'verify' || !args.runPath) {
    console.error('Error: Invalid verify command');
    return ExitCode.VERIFY_FAIL;
  }

  const runPath = resolve(args.runPath);

  // Check run directory exists
  if (!existsSync(runPath)) {
    console.error(`Error: Run directory not found: ${runPath}`);
    return ExitCode.VERIFY_FAIL;
  }

  console.log(`Verifying run: ${runPath}`);

  const result = verifyRun(runPath);

  if (result.success) {
    console.log(`✅ Verification PASSED`);
    console.log(`   Files checked: ${result.filesChecked}`);
    console.log(`   Files valid:   ${result.filesValid}`);
  } else {
    console.error(`❌ Verification FAILED`);
    console.error(`   Files checked: ${result.filesChecked}`);
    console.error(`   Mismatches: ${result.mismatches.length}`);

    for (const mismatch of result.mismatches) {
      console.error(`   - ${mismatch.file}: expected ${mismatch.expected.substring(0, 16)}..., got ${mismatch.actual.substring(0, 16)}...`);
    }
  }

  return result.exitCode;
}

/**
 * Handles 'capsule' command.
 */
async function handleCapsule(args: ParsedArgs): Promise<number> {
  if (args.command !== 'capsule' || !args.runPath || !args.outputPath) {
    console.error('Error: Invalid capsule command');
    return ExitCode.CAPSULE_FAIL;
  }

  const runPath = resolve(args.runPath);
  const outputPath = resolve(args.outputPath);

  // Check run directory exists
  if (!existsSync(runPath)) {
    console.error(`Error: Run directory not found: ${runPath}`);
    return ExitCode.CAPSULE_FAIL;
  }

  console.log(`Creating capsule from: ${runPath}`);
  console.log(`Output: ${outputPath}`);

  const result = await createCapsule(runPath, { outputPath });

  if (result.success) {
    console.log(`✅ Capsule created successfully`);
    console.log(`   Path:   ${result.capsulePath}`);
    console.log(`   Hash:   ${result.capsuleHash}`);
    console.log(`   Files:  ${result.fileCount}`);
    console.log(`   Size:   ${result.totalBytes} bytes`);
  } else {
    console.error(`❌ Capsule creation failed`);
    console.error(`   Error: ${(result as unknown as { error?: string }).error ?? 'Unknown error'}`);
  }

  return result.exitCode;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Main CLI entry point.
 */
async function main(): Promise<number> {
  const argv = process.argv.slice(2);

  // Parse arguments
  let args: ParsedArgs;
  try {
    args = parseArgs(argv);
  } catch (e) {
    if (e instanceof CliParseError) {
      console.error(formatError(e.message));
    } else {
      console.error(`Error: ${(e as Error).message}`);
    }
    return ExitCode.INTENT_INVALID;
  }

  // Dispatch command
  switch (args.command) {
    case 'help':
      return handleHelp();

    case 'run':
      return handleRun(args);

    case 'batch':
      return handleBatch(args);

    case 'verify':
      return handleVerify(args);

    case 'capsule':
      return await handleCapsule(args);

    default: {
      console.error(`Error: Unknown command`);
      return ExitCode.INTENT_INVALID;
    }
  }
}

// Run main
main()
  .then((exitCode) => process.exit(exitCode))
  .catch((error) => {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
  });
