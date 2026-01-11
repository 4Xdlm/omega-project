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
// FILESYSTEM INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

export interface FilesystemConnector {
  readonly type: "real" | "mock";
  readFile(filePath: string): Promise<string>;
  writeFile(filePath: string, content: string): Promise<void>;
  exists(filePath: string): Promise<boolean>;
  listFiles(dirPath: string, pattern?: string): Promise<string[]>;
  mkdir(dirPath: string): Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILE RESULT
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// REAL FILESYSTEM CONNECTOR
// ═══════════════════════════════════════════════════════════════════════════════

export class RealFilesystemConnector implements FilesystemConnector {
  readonly type = "real" as const;
  private readonly encoding: BufferEncoding = "utf-8";

  async readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, { encoding: this.encoding });
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    await fs.writeFile(filePath, content, { encoding: this.encoding });
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async listFiles(dirPath: string, pattern?: string): Promise<string[]> {
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

  async mkdir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK FILESYSTEM CONNECTOR
// ═══════════════════════════════════════════════════════════════════════════════

export class MockFilesystemConnector implements FilesystemConnector {
  readonly type = "mock" as const;
  private readonly files: Map<string, string>;
  private readonly directories: Set<string>;

  constructor(initialFiles?: Record<string, string>) {
    this.files = new Map();
    this.directories = new Set();

    if (initialFiles) {
      for (const [path, content] of Object.entries(initialFiles)) {
        this.files.set(this.normalizePath(path), content);
        this.addParentDirs(path);
      }
    }
  }

  async readFile(filePath: string): Promise<string> {
    const normalized = this.normalizePath(filePath);
    const content = this.files.get(normalized);
    if (content === undefined) {
      throw new Error(`ENOENT: no such file: ${filePath}`);
    }
    return content;
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const normalized = this.normalizePath(filePath);
    this.files.set(normalized, content);
    this.addParentDirs(filePath);
  }

  async exists(filePath: string): Promise<boolean> {
    const normalized = this.normalizePath(filePath);
    return this.files.has(normalized) || this.directories.has(normalized);
  }

  async listFiles(dirPath: string, pattern?: string): Promise<string[]> {
    const normalizedDir = this.normalizePath(dirPath);
    const files: string[] = [];

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

  async mkdir(dirPath: string): Promise<void> {
    this.directories.add(this.normalizePath(dirPath));
  }

  // Mock-specific methods

  /**
   * Get all files in mock filesystem
   */
  getAllFiles(): Map<string, string> {
    return new Map(this.files);
  }

  /**
   * Clear all files
   */
  clear(): void {
    this.files.clear();
    this.directories.clear();
  }

  /**
   * Set file content directly
   */
  setFile(filePath: string, content: string): void {
    this.files.set(this.normalizePath(filePath), content);
    this.addParentDirs(filePath);
  }

  // Private helpers

  private normalizePath(p: string): string {
    return p.replace(/\\/g, "/").toLowerCase();
  }

  private addParentDirs(filePath: string): void {
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
export function createFilesystemConnector(): FilesystemConnector {
  return new RealFilesystemConnector();
}

/**
 * Create a mock filesystem connector for testing
 */
export function createMockFilesystem(
  initialFiles?: Record<string, string>
): MockFilesystemConnector {
  return new MockFilesystemConnector(initialFiles);
}
