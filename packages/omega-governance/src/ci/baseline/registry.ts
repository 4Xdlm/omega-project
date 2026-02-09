/**
 * OMEGA Governance — Baseline Registry
 * Phase F — Read/write baseline registry.json
 *
 * INV-F-08: Baselines are immutable once registered.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { BaselineRegistry, BaselineEntry } from './types.js';

const REGISTRY_FILENAME = 'registry.json';

/** Read baseline registry from baselines directory */
export function readRegistry(baselinesDir: string): BaselineRegistry {
  const registryPath = join(baselinesDir, REGISTRY_FILENAME);
  if (!existsSync(registryPath)) {
    return { version: '1.0.0', baselines: [], updated_at: '' };
  }
  const raw = readFileSync(registryPath, 'utf-8');
  return JSON.parse(raw) as BaselineRegistry;
}

/** Write registry to disk */
export function writeRegistry(baselinesDir: string, registry: BaselineRegistry): void {
  const registryPath = join(baselinesDir, REGISTRY_FILENAME);
  writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf-8');
}

/** Find a baseline by version */
export function findBaseline(registry: BaselineRegistry, version: string): BaselineEntry | null {
  return registry.baselines.find((b) => b.version === version) ?? null;
}

/** List all baselines */
export function listBaselines(registry: BaselineRegistry): readonly BaselineEntry[] {
  return registry.baselines;
}

/** Check if a baseline version exists */
export function baselineExists(registry: BaselineRegistry, version: string): boolean {
  return registry.baselines.some((b) => b.version === version);
}

/** Validate baseline directory exists on disk */
export function validateBaselinePath(baselinesDir: string, entry: BaselineEntry): boolean {
  const fullPath = join(baselinesDir, entry.version);
  return existsSync(fullPath);
}
