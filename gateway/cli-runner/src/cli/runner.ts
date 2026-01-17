/**
 * OMEGA CLI_RUNNER — Main Runner
 * Phase 16.0 — NASA-Grade
 * 
 * Orchestrates command execution with invariant enforcement.
 */

import type { CLICommand, CLIResult, ParsedArgs } from './types.js';
import { EXIT_CODES, CLI_VERSION } from './constants.js';
import { parse, validateArgs, generateHelp, generateGeneralHelp } from './parser.js';
import { enforceContract, CONTRACTS } from './contract.js';
import {
  analyzeCommand,
  compareCommand,
  exportCommand,
  batchCommand,
  healthCommand,
  versionCommand,
  infoCommand,
} from './commands/index.js';

// ============================================================================
// COMMAND REGISTRY
// ============================================================================

const COMMANDS: Map<string, CLICommand> = new Map([
  ['analyze', analyzeCommand],
  ['compare', compareCommand],
  ['export', exportCommand],
  ['batch', batchCommand],
  ['health', healthCommand],
  ['version', versionCommand],
  ['info', infoCommand],
]);

// ============================================================================
// INVARIANT CHECKS
// ============================================================================

/**
 * INV-CLI-01: Exit Code Coherent
 * success=true → exitCode=0, success=false → exitCode>0
 */
function verifyExitCodeCoherence(result: CLIResult): boolean {
  if (result.success && result.exitCode !== EXIT_CODES.SUCCESS) {
    return false;
  }
  if (!result.success && result.exitCode === EXIT_CODES.SUCCESS) {
    return false;
  }
  return true;
}

/**
 * INV-CLI-02: No Silent Failure
 * Every error must produce a message on stderr
 */
function verifyNoSilentFailure(result: CLIResult): boolean {
  if (!result.success && !result.error) {
    return false;
  }
  return true;
}

/**
 * INV-CLI-04: Duration Always Set
 * duration > 0 for every command
 */
function verifyDurationSet(result: CLIResult): boolean {
  return result.duration > 0;
}

/**
 * INV-CLI-06: Help Available
 * --help on any command returns usage
 */
function isHelpRequest(args: ParsedArgs): boolean {
  return args.options['help'] === true || args.options['h'] === true;
}

// ============================================================================
// MAIN RUNNER
// ============================================================================

export interface RunnerOptions {
  exitOnComplete?: boolean;
  stdout?: (msg: string) => void;
  stderr?: (msg: string) => void;
}

export async function run(
  argv: string[],
  options: RunnerOptions = {}
): Promise<CLIResult> {
  const startTime = performance.now();
  const stdout = options.stdout || console.log;
  const stderr = options.stderr || console.error;
  
  // Parse arguments
  const parsed = parse(argv);
  
  // No command provided
  if (!parsed.command) {
    const helpText = generateGeneralHelp(Array.from(COMMANDS.values()));
    stdout(helpText);
    
    return {
      success: true,
      exitCode: EXIT_CODES.SUCCESS,
      output: helpText,
      duration: performance.now() - startTime,
    };
  }
  
  // Find command
  const command = COMMANDS.get(parsed.command);
  
  if (!command) {
    const errorMsg = `Error: Unknown command '${parsed.command}'`;
    const helpText = generateGeneralHelp(Array.from(COMMANDS.values()));
    stderr(errorMsg);
    stdout(helpText);
    
    return {
      success: false,
      exitCode: EXIT_CODES.USAGE,
      error: errorMsg,
      output: helpText,
      duration: performance.now() - startTime,
    };
  }
  
  // Check for help request (INV-CLI-06)
  if (isHelpRequest(parsed)) {
    const helpText = generateHelp(command);
    stdout(helpText);
    
    return {
      success: true,
      exitCode: EXIT_CODES.SUCCESS,
      output: helpText,
      duration: performance.now() - startTime,
    };
  }
  
  // Validate arguments
  const validation = validateArgs(parsed, command);
  if (!validation.valid) {
    const errorMsg = `Error: ${validation.errors.join(', ')}`;
    const helpText = generateHelp(command);
    stderr(errorMsg);
    stdout(helpText);
    
    return {
      success: false,
      exitCode: EXIT_CODES.USAGE,
      error: errorMsg,
      output: helpText,
      duration: performance.now() - startTime,
    };
  }
  
  // Verify routing contract (INV-CLI-05)
  const contractCheck = enforceContract(parsed.command, command.routing);
  if (!contractCheck.valid) {
    const errorMsg = `Contract Error: ${contractCheck.error}`;
    stderr(errorMsg);
    
    return {
      success: false,
      exitCode: EXIT_CODES.INTERNAL,
      error: errorMsg,
      duration: performance.now() - startTime,
    };
  }
  
  // Execute command
  let result: CLIResult;
  try {
    result = await command.execute(parsed);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    result = {
      success: false,
      exitCode: EXIT_CODES.INTERNAL,
      error: `Internal Error: ${errorMsg}`,
      duration: performance.now() - startTime,
    };
  }
  
  // Verify invariants
  if (!verifyExitCodeCoherence(result)) {
    stderr('Warning: INV-CLI-01 violation - Exit code incoherent');
    // Fix it
    result.exitCode = result.success ? EXIT_CODES.SUCCESS : EXIT_CODES.ERROR;
  }
  
  if (!verifyNoSilentFailure(result)) {
    stderr('Warning: INV-CLI-02 violation - Silent failure detected');
    // Fix it
    result.error = result.error || 'Unknown error occurred';
  }
  
  if (!verifyDurationSet(result)) {
    stderr('Warning: INV-CLI-04 violation - Duration not set');
    // Fix it
    result.duration = performance.now() - startTime;
  }
  
  // Output results
  if (result.output) {
    stdout(result.output);
  }
  if (result.error) {
    stderr(result.error);
  }
  
  return result;
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export function getCommand(name: string): CLICommand | undefined {
  return COMMANDS.get(name);
}

export function getAllCommands(): CLICommand[] {
  return Array.from(COMMANDS.values());
}

export function getVersion(): string {
  return CLI_VERSION;
}

// ============================================================================
// MAIN ENTRY POINT (for direct execution)
// ============================================================================

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const result = await run(argv, {
    exitOnComplete: true,
    stdout: console.log,
    stderr: console.error,
  });

  if (typeof process !== 'undefined' && process.exit) {
    process.exit(result.exitCode);
  }
}

// ============================================================================
// AUTO-EXECUTE WHEN RUN DIRECTLY
// ============================================================================

// Check if this is the main module being run
const isMainModule = typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('runner.js') || process.argv[1].endsWith('runner.ts'));

if (isMainModule) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
