/**
 * Proof Utils Benchmarks
 * Standard: NASA-Grade L4
 *
 * CRITICAL: No timing assertions - measure only
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { buildManifest } from '../proof-utils/src/manifest.js';
import { verifyManifest } from '../proof-utils/src/verify.js';
import { benchmark, type BenchmarkSuite } from './utils.js';

export async function runProofBenchmarks(): Promise<BenchmarkSuite> {
  const results = [];

  // Benchmark: Build manifest for 100 files
  {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-proof-'));
    const filePaths: string[] = [];

    // Setup: create 100 files
    for (let i = 0; i < 100; i++) {
      const filePath = path.join(tmpDir, `file-${i}.txt`);
      fs.writeFileSync(filePath, `content-${i}-`.repeat(100), 'utf8');
      filePaths.push(filePath);
    }

    const result = await benchmark(
      'proof_build_manifest_100_files',
      () => {
        buildManifest(filePaths);
      },
      { iterations: 20 }
    );

    results.push(result);

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true });
  }

  // Benchmark: Verify manifest 100 files
  {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-proof-'));
    const filePaths: string[] = [];

    // Setup: create 100 files
    for (let i = 0; i < 100; i++) {
      const filePath = path.join(tmpDir, `file-${i}.txt`);
      fs.writeFileSync(filePath, `content-${i}-`.repeat(100), 'utf8');
      filePaths.push(filePath);
    }

    const manifest = buildManifest(filePaths);

    const result = await benchmark(
      'proof_verify_manifest_100_files',
      () => {
        verifyManifest(manifest);
      },
      { iterations: 20 }
    );

    results.push(result);

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true });
  }

  // Benchmark: Build manifest for larger files (1 MB each, 10 files)
  {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-proof-'));
    const filePaths: string[] = [];
    const largeContent = 'x'.repeat(1024 * 1024); // 1 MB

    // Setup: create 10 large files
    for (let i = 0; i < 10; i++) {
      const filePath = path.join(tmpDir, `large-file-${i}.bin`);
      fs.writeFileSync(filePath, largeContent, 'utf8');
      filePaths.push(filePath);
    }

    const result = await benchmark(
      'proof_build_manifest_10_large_files',
      () => {
        buildManifest(filePaths);
      },
      { iterations: 10, warmup: 2 }
    );

    results.push(result);

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true });
  }

  // Benchmark: Verify manifest for larger files
  {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-proof-'));
    const filePaths: string[] = [];
    const largeContent = 'x'.repeat(1024 * 1024); // 1 MB

    // Setup: create 10 large files
    for (let i = 0; i < 10; i++) {
      const filePath = path.join(tmpDir, `large-file-${i}.bin`);
      fs.writeFileSync(filePath, largeContent, 'utf8');
      filePaths.push(filePath);
    }

    const manifest = buildManifest(filePaths);

    const result = await benchmark(
      'proof_verify_manifest_10_large_files',
      () => {
        verifyManifest(manifest);
      },
      { iterations: 10, warmup: 2 }
    );

    results.push(result);

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true });
  }

  return {
    name: 'Proof Utils Benchmarks',
    results,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'unknown',
  };
}
