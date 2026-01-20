/**
 * Atlas Benchmarks
 * Standard: NASA-Grade L4
 *
 * CRITICAL: No timing assertions - measure only
 */

import { AtlasStore } from '../atlas/src/store.js';
import { benchmark, type BenchmarkSuite } from './utils.js';

export async function runAtlasBenchmarks(): Promise<BenchmarkSuite> {
  const results = [];
  const clock = { now: () => Date.now() };

  // Benchmark: Insert 1000 items
  {
    const result = await benchmark(
      'atlas_insert_1000_items',
      async () => {
        const store = new AtlasStore({ clock });
        for (let i = 0; i < 1000; i++) {
          store.insert(`item-${i}`, {
            type: 'test',
            index: i,
            status: i % 2 === 0 ? 'active' : 'inactive',
          });
        }
      },
      { iterations: 20, warmup: 3 }
    );

    results.push(result);
  }

  // Benchmark: Query 10k items (full scan)
  {
    const store = new AtlasStore({ clock });

    // Setup: insert 10k items
    for (let i = 0; i < 10000; i++) {
      store.insert(`item-${i}`, {
        type: 'test',
        index: i,
        status: i % 2 === 0 ? 'active' : 'inactive',
        category: `cat-${i % 10}`,
      });
    }

    const result = await benchmark(
      'atlas_query_10k_full_scan',
      () => {
        store.query({});
      },
      { iterations: 50 }
    );

    results.push(result);
  }

  // Benchmark: Query with filter on 10k items
  {
    const store = new AtlasStore({ clock });

    // Setup: insert 10k items
    for (let i = 0; i < 10000; i++) {
      store.insert(`item-${i}`, {
        type: 'test',
        index: i,
        status: i % 2 === 0 ? 'active' : 'inactive',
      });
    }

    const result = await benchmark(
      'atlas_query_10k_with_filter',
      () => {
        store.query({
          filter: { field: 'status', operator: 'eq', value: 'active' },
        });
      },
      { iterations: 50 }
    );

    results.push(result);
  }

  // Benchmark: Query with index on 10k items
  {
    const store = new AtlasStore({ clock });

    // Setup: insert 10k items with index
    store.createIndex({ name: 'by-status', field: 'status', type: 'hash' });

    for (let i = 0; i < 10000; i++) {
      store.insert(`item-${i}`, {
        type: 'test',
        index: i,
        status: i % 2 === 0 ? 'active' : 'inactive',
      });
    }

    const result = await benchmark(
      'atlas_query_10k_with_index',
      () => {
        store.query({
          filter: { field: 'status', operator: 'eq', value: 'active' },
        });
      },
      { iterations: 50 }
    );

    results.push(result);
  }

  // Benchmark: Get by ID on 10k items
  {
    const store = new AtlasStore({ clock });

    // Setup: insert 10k items
    for (let i = 0; i < 10000; i++) {
      store.insert(`item-${i}`, { type: 'test', index: i });
    }

    const result = await benchmark(
      'atlas_get_by_id_10k',
      () => {
        store.get('item-5000');
      },
      { iterations: 100 }
    );

    results.push(result);
  }

  return {
    name: 'Atlas Benchmarks',
    results,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'unknown',
  };
}
