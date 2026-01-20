/**
 * Raw Storage Benchmarks
 * Standard: NASA-Grade L4
 *
 * CRITICAL: No timing assertions - measure only
 */

import { RawStorage } from '../raw/src/storage.js';
import { MemoryBackend } from '../raw/src/backends/memoryBackend.js';
import { benchmark, type BenchmarkSuite } from './utils.js';

export async function runRawBenchmarks(): Promise<BenchmarkSuite> {
  const results = [];
  const clock = { now: () => Date.now() };

  // Benchmark: Store 1000 small items (100 bytes each)
  {
    const result = await benchmark(
      'raw_store_1000_small_items',
      async () => {
        const storage = new RawStorage({
          backend: new MemoryBackend({ maxSize: 100 * 1024 * 1024 }),
          clock,
        });
        const data = Buffer.alloc(100, 'x');

        for (let i = 0; i < 1000; i++) {
          await storage.store(`item-${i}`, data);
        }
      },
      { iterations: 10, warmup: 2 }
    );

    results.push(result);
  }

  // Benchmark: Retrieve 1000 items
  {
    const storage = new RawStorage({
      backend: new MemoryBackend({ maxSize: 100 * 1024 * 1024 }),
      clock,
    });
    const data = Buffer.alloc(100, 'x');

    // Setup: store 1000 items
    for (let i = 0; i < 1000; i++) {
      await storage.store(`item-${i}`, data);
    }

    const result = await benchmark(
      'raw_retrieve_1000_items',
      async () => {
        for (let i = 0; i < 1000; i++) {
          await storage.retrieve(`item-${i}`);
        }
      },
      { iterations: 50 }
    );

    results.push(result);
  }

  // Benchmark: Store 1 MB file
  {
    const result = await benchmark(
      'raw_store_1mb_file',
      async () => {
        const storage = new RawStorage({
          backend: new MemoryBackend({ maxSize: 100 * 1024 * 1024 }),
          clock,
        });
        const largeData = Buffer.alloc(1024 * 1024, 'y');
        await storage.store('large-file', largeData);
      },
      { iterations: 50, warmup: 5 }
    );

    results.push(result);
  }

  // Benchmark: Store 10 MB file
  {
    const result = await benchmark(
      'raw_store_10mb_file',
      async () => {
        const storage = new RawStorage({
          backend: new MemoryBackend({ maxSize: 100 * 1024 * 1024 }),
          clock,
        });
        const largeData = Buffer.alloc(10 * 1024 * 1024, 'z');
        await storage.store('large-file', largeData);
      },
      { iterations: 20, warmup: 5 }
    );

    results.push(result);
  }

  // Benchmark: List 1000 items
  {
    const storage = new RawStorage({
      backend: new MemoryBackend({ maxSize: 100 * 1024 * 1024 }),
      clock,
    });
    const data = Buffer.alloc(100, 'x');

    // Setup: store 1000 items
    for (let i = 0; i < 1000; i++) {
      await storage.store(`item-${i}`, data);
    }

    const result = await benchmark(
      'raw_list_1000_items',
      async () => {
        await storage.list();
      },
      { iterations: 100 }
    );

    results.push(result);
  }

  // Benchmark: Store with compression
  {
    const result = await benchmark(
      'raw_store_1mb_compressed',
      async () => {
        const storage = new RawStorage({
          backend: new MemoryBackend({ maxSize: 100 * 1024 * 1024 }),
          clock,
        });
        // Highly compressible data
        const compressibleData = Buffer.alloc(1024 * 1024, 'a');
        await storage.store('compressed-file', compressibleData, { compress: true });
      },
      { iterations: 20, warmup: 3 }
    );

    results.push(result);
  }

  return {
    name: 'Raw Storage Benchmarks',
    results,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'unknown',
  };
}
