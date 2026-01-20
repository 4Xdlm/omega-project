/**
 * E2E Test Setup
 * Standard: NASA-Grade L4
 *
 * Provides test context and utilities for end-to-end integration tests.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AtlasStore } from '../../nexus/atlas/src/store';
import { RawStorage } from '../../nexus/raw/src/storage';
import { MemoryBackend } from '../../nexus/raw/src/backends/memoryBackend';
import { buildManifest, verifyManifest } from '../../nexus/proof-utils/src';
import { createLogger, createNullLogger } from '../../nexus/shared/logging';
import { createMetricsCollector } from '../../nexus/shared/metrics';
import { createTracer, createCorrelationProvider } from '../../nexus/shared/tracing';

// ============================================================================
// Types
// ============================================================================

export interface E2EContext {
  tmpDir: string;
  atlas: AtlasStore;
  raw: RawStorage;
  clock: { now: () => number };
  cleanup: () => void;
}

export interface E2EContextOptions {
  maxRawSize?: number;
  enableLogging?: boolean;
  enableMetrics?: boolean;
  enableTracing?: boolean;
}

// ============================================================================
// Context Factory
// ============================================================================

/**
 * Create E2E test environment
 */
export function createE2EContext(options: E2EContextOptions = {}): E2EContext {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omega-e2e-'));

  // Create clock
  const clock = { now: () => Date.now() };

  // Create optional observability components
  const logger = options.enableLogging
    ? createLogger({ module: 'e2e', clock: clock.now })
    : undefined;

  const metrics = options.enableMetrics
    ? createMetricsCollector({ prefix: 'e2e', clock: clock.now })
    : undefined;

  const tracer = options.enableTracing
    ? createTracer({
        serviceName: 'e2e-test',
        correlationProvider: createCorrelationProvider(),
        clock: clock.now,
      })
    : undefined;

  // Create Atlas store
  const atlas = new AtlasStore({
    clock,
    logger,
    metrics,
    tracer,
  });

  // Create Raw storage with memory backend
  const raw = new RawStorage({
    backend: new MemoryBackend({ maxSize: options.maxRawSize ?? 100 * 1024 * 1024 }),
    clock,
    logger,
    metrics,
    tracer,
  });

  return {
    tmpDir,
    atlas,
    raw,
    clock,
    cleanup: () => {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    },
  };
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Wait for async operation
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate test events
 */
export function generateTestEvents(count: number): Array<{ type: string; index: number; timestamp: number; value: number }> {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    type: 'test-event',
    index: i,
    timestamp: now + i,
    value: Math.random(),
  }));
}

/**
 * Generate test data of specific size
 */
export function generateTestData(sizeBytes: number): Buffer {
  return Buffer.alloc(sizeBytes, 'x');
}

/**
 * Write test file and return path
 */
export function writeTestFile(dir: string, name: string, content: string | Buffer): string {
  const filePath = path.join(dir, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return filePath;
}

/**
 * Read test file
 */
export function readTestFile(filePath: string): Buffer {
  return fs.readFileSync(filePath);
}

/**
 * Create subdirectory in temp dir
 */
export function createSubDir(tmpDir: string, name: string): string {
  const subDir = path.join(tmpDir, name);
  fs.mkdirSync(subDir, { recursive: true });
  return subDir;
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that two buffers are equal
 */
export function assertBuffersEqual(actual: Buffer, expected: Buffer): boolean {
  return actual.equals(expected);
}

/**
 * Assert that manifest is valid
 */
export function assertManifestValid(filePaths: string[]): { valid: boolean; errors: readonly string[] } {
  const manifest = buildManifest(filePaths);
  return verifyManifest(manifest);
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

export { buildManifest, verifyManifest };
