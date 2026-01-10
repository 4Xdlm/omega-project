/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — CLI CONNECTOR
 * Version: 0.4.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Command-line interface abstraction.
 * Supports real CLI and mock for testing.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CLI INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

export interface CLIConnector {
  readonly type: "real" | "mock";
  parseArgs(args: string[]): ParsedArgs;
  print(message: string): void;
  printError(message: string): void;
  prompt(question: string): Promise<string>;
  exit(code: number): void;
}

export interface ParsedArgs {
  readonly command?: string;
  readonly input?: string;
  readonly output?: string;
  readonly seed?: number;
  readonly verbose?: boolean;
  readonly quiet?: boolean;
  readonly format?: string;
  readonly flags: Set<string>;
  readonly positional: string[];
  readonly raw: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface CLIOutput {
  readonly stdout: string[];
  readonly stderr: string[];
  readonly exitCode?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REAL CLI CONNECTOR
// ═══════════════════════════════════════════════════════════════════════════════

export class RealCLIConnector implements CLIConnector {
  readonly type = "real" as const;

  parseArgs(args: string[]): ParsedArgs {
    return parseCommandLineArgs(args);
  }

  print(message: string): void {
    console.log(message);
  }

  printError(message: string): void {
    console.error(message);
  }

  async prompt(question: string): Promise<string> {
    // Real implementation would use readline
    this.print(question);
    return "";
  }

  exit(code: number): void {
    process.exit(code);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK CLI CONNECTOR
// ═══════════════════════════════════════════════════════════════════════════════

export class MockCLIConnector implements CLIConnector {
  readonly type = "mock" as const;

  private readonly _stdout: string[] = [];
  private readonly _stderr: string[] = [];
  private _exitCode?: number;
  private readonly _promptResponses: string[] = [];

  parseArgs(args: string[]): ParsedArgs {
    return parseCommandLineArgs(args);
  }

  print(message: string): void {
    this._stdout.push(message);
  }

  printError(message: string): void {
    this._stderr.push(message);
  }

  async prompt(_question: string): Promise<string> {
    return this._promptResponses.shift() || "";
  }

  exit(code: number): void {
    this._exitCode = code;
  }

  // Mock-specific methods

  /**
   * Get captured output
   */
  getOutput(): CLIOutput {
    return {
      stdout: [...this._stdout],
      stderr: [...this._stderr],
      exitCode: this._exitCode
    };
  }

  /**
   * Clear captured output
   */
  clear(): void {
    this._stdout.length = 0;
    this._stderr.length = 0;
    this._exitCode = undefined;
  }

  /**
   * Set responses for prompt
   */
  setPromptResponses(responses: string[]): void {
    this._promptResponses.push(...responses);
  }

  /**
   * Check if exit was called
   */
  didExit(): boolean {
    return this._exitCode !== undefined;
  }

  /**
   * Get exit code
   */
  getExitCode(): number | undefined {
    return this._exitCode;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARGUMENT PARSING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse command-line arguments
 */
export function parseCommandLineArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = {
    flags: new Set(),
    positional: [],
    raw: args
  };

  let command: string | undefined;
  let input: string | undefined;
  let output: string | undefined;
  let seed: number | undefined;
  let verbose = false;
  let quiet = false;
  let format: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Flags with values
    if (arg === "--input" || arg === "-i") {
      input = args[++i];
    } else if (arg === "--output" || arg === "-o") {
      output = args[++i];
    } else if (arg === "--seed" || arg === "-s") {
      seed = parseInt(args[++i], 10);
    } else if (arg === "--format" || arg === "-f") {
      format = args[++i];
    }
    // Boolean flags
    else if (arg === "--verbose" || arg === "-v") {
      verbose = true;
      result.flags.add("verbose");
    } else if (arg === "--quiet" || arg === "-q") {
      quiet = true;
      result.flags.add("quiet");
    } else if (arg === "--help" || arg === "-h") {
      result.flags.add("help");
    } else if (arg === "--version") {
      result.flags.add("version");
    }
    // Generic flag
    else if (arg.startsWith("--")) {
      result.flags.add(arg.slice(2));
    } else if (arg.startsWith("-")) {
      result.flags.add(arg.slice(1));
    }
    // Positional
    else {
      if (!command) {
        command = arg;
      } else {
        result.positional.push(arg);
      }
    }
  }

  return {
    ...result,
    command,
    input,
    output,
    seed,
    verbose,
    quiet,
    format
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a real CLI connector
 */
export function createCLIConnector(): CLIConnector {
  return new RealCLIConnector();
}

/**
 * Create a mock CLI connector for testing
 */
export function createMockCLI(): MockCLIConnector {
  return new MockCLIConnector();
}
