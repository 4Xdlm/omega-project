/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — FILESYSTEM CONNECTOR
 * Version: 0.4.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Filesystem abstraction for text input/output.
 * Supports real filesystem and in-memory mock for testing.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export interface FilesystemConnector {
    readonly type: "real" | "mock";
    readFile(filePath: string): Promise<string>;
    writeFile(filePath: string, content: string): Promise<void>;
    exists(filePath: string): Promise<boolean>;
    listFiles(dirPath: string, pattern?: string): Promise<string[]>;
    mkdir(dirPath: string): Promise<void>;
}
export interface FileReadResult {
    readonly path: string;
    readonly content: string;
    readonly size: number;
    readonly encoding: string;
}
export interface FileWriteResult {
    readonly path: string;
    readonly bytesWritten: number;
    readonly timestamp: string;
}
export declare class RealFilesystemConnector implements FilesystemConnector {
    readonly type: "real";
    private readonly encoding;
    readFile(filePath: string): Promise<string>;
    writeFile(filePath: string, content: string): Promise<void>;
    exists(filePath: string): Promise<boolean>;
    listFiles(dirPath: string, pattern?: string): Promise<string[]>;
    mkdir(dirPath: string): Promise<void>;
}
export declare class MockFilesystemConnector implements FilesystemConnector {
    readonly type: "mock";
    private readonly files;
    private readonly directories;
    constructor(initialFiles?: Record<string, string>);
    readFile(filePath: string): Promise<string>;
    writeFile(filePath: string, content: string): Promise<void>;
    exists(filePath: string): Promise<boolean>;
    listFiles(dirPath: string, pattern?: string): Promise<string[]>;
    mkdir(dirPath: string): Promise<void>;
    /**
     * Get all files in mock filesystem
     */
    getAllFiles(): Map<string, string>;
    /**
     * Clear all files
     */
    clear(): void;
    /**
     * Set file content directly
     */
    setFile(filePath: string, content: string): void;
    private normalizePath;
    private addParentDirs;
}
/**
 * Create a real filesystem connector
 */
export declare function createFilesystemConnector(): FilesystemConnector;
/**
 * Create a mock filesystem connector for testing
 */
export declare function createMockFilesystem(initialFiles?: Record<string, string>): MockFilesystemConnector;
//# sourceMappingURL=filesystem.d.ts.map