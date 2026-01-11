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
export interface CLIOutput {
    readonly stdout: string[];
    readonly stderr: string[];
    readonly exitCode?: number;
}
export declare class RealCLIConnector implements CLIConnector {
    readonly type: "real";
    parseArgs(args: string[]): ParsedArgs;
    print(message: string): void;
    printError(message: string): void;
    prompt(question: string): Promise<string>;
    exit(code: number): void;
}
export declare class MockCLIConnector implements CLIConnector {
    readonly type: "mock";
    private readonly _stdout;
    private readonly _stderr;
    private _exitCode?;
    private readonly _promptResponses;
    parseArgs(args: string[]): ParsedArgs;
    print(message: string): void;
    printError(message: string): void;
    prompt(_question: string): Promise<string>;
    exit(code: number): void;
    /**
     * Get captured output
     */
    getOutput(): CLIOutput;
    /**
     * Clear captured output
     */
    clear(): void;
    /**
     * Set responses for prompt
     */
    setPromptResponses(responses: string[]): void;
    /**
     * Check if exit was called
     */
    didExit(): boolean;
    /**
     * Get exit code
     */
    getExitCode(): number | undefined;
}
/**
 * Parse command-line arguments
 */
export declare function parseCommandLineArgs(args: string[]): ParsedArgs;
/**
 * Create a real CLI connector
 */
export declare function createCLIConnector(): CLIConnector;
/**
 * Create a mock CLI connector for testing
 */
export declare function createMockCLI(): MockCLIConnector;
//# sourceMappingURL=cli.d.ts.map