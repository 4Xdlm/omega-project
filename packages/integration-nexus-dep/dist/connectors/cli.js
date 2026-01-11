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
// REAL CLI CONNECTOR
// ═══════════════════════════════════════════════════════════════════════════════
export class RealCLIConnector {
    type = "real";
    parseArgs(args) {
        return parseCommandLineArgs(args);
    }
    print(message) {
        console.log(message);
    }
    printError(message) {
        console.error(message);
    }
    async prompt(question) {
        // Real implementation would use readline
        this.print(question);
        return "";
    }
    exit(code) {
        process.exit(code);
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// MOCK CLI CONNECTOR
// ═══════════════════════════════════════════════════════════════════════════════
export class MockCLIConnector {
    type = "mock";
    _stdout = [];
    _stderr = [];
    _exitCode;
    _promptResponses = [];
    parseArgs(args) {
        return parseCommandLineArgs(args);
    }
    print(message) {
        this._stdout.push(message);
    }
    printError(message) {
        this._stderr.push(message);
    }
    async prompt(_question) {
        return this._promptResponses.shift() || "";
    }
    exit(code) {
        this._exitCode = code;
    }
    // Mock-specific methods
    /**
     * Get captured output
     */
    getOutput() {
        return {
            stdout: [...this._stdout],
            stderr: [...this._stderr],
            exitCode: this._exitCode
        };
    }
    /**
     * Clear captured output
     */
    clear() {
        this._stdout.length = 0;
        this._stderr.length = 0;
        this._exitCode = undefined;
    }
    /**
     * Set responses for prompt
     */
    setPromptResponses(responses) {
        this._promptResponses.push(...responses);
    }
    /**
     * Check if exit was called
     */
    didExit() {
        return this._exitCode !== undefined;
    }
    /**
     * Get exit code
     */
    getExitCode() {
        return this._exitCode;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// ARGUMENT PARSING
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Parse command-line arguments
 */
export function parseCommandLineArgs(args) {
    const result = {
        flags: new Set(),
        positional: [],
        raw: args
    };
    let command;
    let input;
    let output;
    let seed;
    let verbose = false;
    let quiet = false;
    let format;
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        // Flags with values
        if (arg === "--input" || arg === "-i") {
            input = args[++i];
        }
        else if (arg === "--output" || arg === "-o") {
            output = args[++i];
        }
        else if (arg === "--seed" || arg === "-s") {
            seed = parseInt(args[++i], 10);
        }
        else if (arg === "--format" || arg === "-f") {
            format = args[++i];
        }
        // Boolean flags
        else if (arg === "--verbose" || arg === "-v") {
            verbose = true;
            result.flags.add("verbose");
        }
        else if (arg === "--quiet" || arg === "-q") {
            quiet = true;
            result.flags.add("quiet");
        }
        else if (arg === "--help" || arg === "-h") {
            result.flags.add("help");
        }
        else if (arg === "--version") {
            result.flags.add("version");
        }
        // Generic flag
        else if (arg.startsWith("--")) {
            result.flags.add(arg.slice(2));
        }
        else if (arg.startsWith("-")) {
            result.flags.add(arg.slice(1));
        }
        // Positional
        else {
            if (!command) {
                command = arg;
            }
            else {
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
export function createCLIConnector() {
    return new RealCLIConnector();
}
/**
 * Create a mock CLI connector for testing
 */
export function createMockCLI() {
    return new MockCLIConnector();
}
//# sourceMappingURL=cli.js.map