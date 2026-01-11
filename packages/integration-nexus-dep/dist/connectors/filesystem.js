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
import * as fs from "fs/promises";
import * as path from "path";
// ═══════════════════════════════════════════════════════════════════════════════
// REAL FILESYSTEM CONNECTOR
// ═══════════════════════════════════════════════════════════════════════════════
export class RealFilesystemConnector {
    type = "real";
    encoding = "utf-8";
    async readFile(filePath) {
        return fs.readFile(filePath, { encoding: this.encoding });
    }
    async writeFile(filePath, content) {
        await fs.writeFile(filePath, content, { encoding: this.encoding });
    }
    async exists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
    async listFiles(dirPath, pattern) {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        let files = entries
            .filter(e => e.isFile())
            .map(e => path.join(dirPath, e.name));
        if (pattern) {
            const regex = new RegExp(pattern.replace(/\*/g, ".*"));
            files = files.filter(f => regex.test(path.basename(f)));
        }
        return files;
    }
    async mkdir(dirPath) {
        await fs.mkdir(dirPath, { recursive: true });
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// MOCK FILESYSTEM CONNECTOR
// ═══════════════════════════════════════════════════════════════════════════════
export class MockFilesystemConnector {
    type = "mock";
    files;
    directories;
    constructor(initialFiles) {
        this.files = new Map();
        this.directories = new Set();
        if (initialFiles) {
            for (const [path, content] of Object.entries(initialFiles)) {
                this.files.set(this.normalizePath(path), content);
                this.addParentDirs(path);
            }
        }
    }
    async readFile(filePath) {
        const normalized = this.normalizePath(filePath);
        const content = this.files.get(normalized);
        if (content === undefined) {
            throw new Error(`ENOENT: no such file: ${filePath}`);
        }
        return content;
    }
    async writeFile(filePath, content) {
        const normalized = this.normalizePath(filePath);
        this.files.set(normalized, content);
        this.addParentDirs(filePath);
    }
    async exists(filePath) {
        const normalized = this.normalizePath(filePath);
        return this.files.has(normalized) || this.directories.has(normalized);
    }
    async listFiles(dirPath, pattern) {
        const normalizedDir = this.normalizePath(dirPath);
        const files = [];
        for (const filePath of this.files.keys()) {
            const dir = path.dirname(filePath);
            if (this.normalizePath(dir) === normalizedDir) {
                files.push(filePath);
            }
        }
        if (pattern) {
            const regex = new RegExp(pattern.replace(/\*/g, ".*"));
            return files.filter(f => regex.test(path.basename(f)));
        }
        return files;
    }
    async mkdir(dirPath) {
        this.directories.add(this.normalizePath(dirPath));
    }
    // Mock-specific methods
    /**
     * Get all files in mock filesystem
     */
    getAllFiles() {
        return new Map(this.files);
    }
    /**
     * Clear all files
     */
    clear() {
        this.files.clear();
        this.directories.clear();
    }
    /**
     * Set file content directly
     */
    setFile(filePath, content) {
        this.files.set(this.normalizePath(filePath), content);
        this.addParentDirs(filePath);
    }
    // Private helpers
    normalizePath(p) {
        return p.replace(/\\/g, "/").toLowerCase();
    }
    addParentDirs(filePath) {
        const parts = filePath.replace(/\\/g, "/").split("/");
        for (let i = 1; i < parts.length; i++) {
            const dir = parts.slice(0, i).join("/");
            if (dir) {
                this.directories.add(this.normalizePath(dir));
            }
        }
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Create a real filesystem connector
 */
export function createFilesystemConnector() {
    return new RealFilesystemConnector();
}
/**
 * Create a mock filesystem connector for testing
 */
export function createMockFilesystem(initialFiles) {
    return new MockFilesystemConnector(initialFiles);
}
//# sourceMappingURL=filesystem.js.map