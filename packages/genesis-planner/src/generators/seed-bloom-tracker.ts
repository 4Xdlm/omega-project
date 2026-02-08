/**
 * OMEGA Genesis Planner — Seed/Bloom Tracker
 * Phase C.1 — G-INV-03: bidirectional seed→bloom integrity.
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type {
  Seed, SeedType, Scene, Intent, Arc, GConfig,
  ValidationResult, ValidationError,
} from '../types.js';
import { resolveConfigRef } from '../config.js';

const TIMESTAMP_ZERO = '2026-02-08T00:00:00.000Z';

export interface SeedBloomTracker {
  plantSeed(seed: Omit<Seed, 'blooms_in'> & { planted_in: string }): void;
  bloomSeed(seedId: string, sceneId: string): void;
  getSeedForBloom(bloomSceneId: string): Seed | undefined;
  getBloomForSeed(seedId: string): string | undefined;
  validate(scenes: readonly Scene[], config: GConfig): ValidationResult;
  getSeeds(): readonly Seed[];
}

export function createSeedBloomTracker(): SeedBloomTracker {
  const seedMap = new Map<string, {
    id: string; type: SeedType; description: string; planted_in: string; blooms_in: string;
  }>();

  return {
    plantSeed(seed: Omit<Seed, 'blooms_in'> & { planted_in: string }): void {
      seedMap.set(seed.id, { ...seed, blooms_in: '' });
    },

    bloomSeed(seedId: string, sceneId: string): void {
      const existing = seedMap.get(seedId);
      if (existing) {
        seedMap.set(seedId, { ...existing, blooms_in: sceneId });
      }
    },

    getSeedForBloom(bloomSceneId: string): Seed | undefined {
      for (const seed of seedMap.values()) {
        if (seed.blooms_in === bloomSceneId) return seed as Seed;
      }
      return undefined;
    },

    getBloomForSeed(seedId: string): string | undefined {
      return seedMap.get(seedId)?.blooms_in || undefined;
    },

    validate(scenes: readonly Scene[], config: GConfig): ValidationResult {
      const errors: ValidationError[] = [];
      const invariant = 'G-INV-03' as const;
      const minSeeds = resolveConfigRef(config, 'CONFIG:MIN_SEEDS');
      const maxDistance = resolveConfigRef(config, 'CONFIG:SEED_BLOOM_MAX_DISTANCE');

      const seeds = [...seedMap.values()];
      if (seeds.length < minSeeds) {
        errors.push({ invariant, path: 'seed_registry', message: `Need at least ${minSeeds} seeds, got ${seeds.length}`, severity: 'FATAL' });
      }

      const sceneIds = scenes.map((s) => s.scene_id);

      for (const seed of seeds) {
        if (!seed.blooms_in || seed.blooms_in === '') {
          errors.push({ invariant, path: `seed[${seed.id}]`, message: 'Seed has no bloom', severity: 'FATAL' });
          continue;
        }

        const plantIdx = sceneIds.indexOf(seed.planted_in);
        const bloomIdx = sceneIds.indexOf(seed.blooms_in);

        if (plantIdx === -1) {
          errors.push({ invariant, path: `seed[${seed.id}].planted_in`, message: `Unknown scene: ${seed.planted_in}`, severity: 'FATAL' });
        }
        if (bloomIdx === -1) {
          errors.push({ invariant, path: `seed[${seed.id}].blooms_in`, message: `Unknown scene: ${seed.blooms_in}`, severity: 'FATAL' });
        }
        if (plantIdx !== -1 && bloomIdx !== -1) {
          if (bloomIdx <= plantIdx) {
            errors.push({ invariant, path: `seed[${seed.id}]`, message: 'Bloom must come after plant', severity: 'FATAL' });
          }
          const totalScenes = sceneIds.length;
          const distance = totalScenes > 1 ? (bloomIdx - plantIdx) / (totalScenes - 1) : 0;
          if (distance > maxDistance) {
            errors.push({ invariant, path: `seed[${seed.id}]`, message: `Distance ${distance.toFixed(2)} exceeds max ${maxDistance}`, severity: 'FATAL' });
          }
        }
      }

      const passed = errors.length === 0;
      return {
        verdict: passed ? 'PASS' : 'FAIL',
        errors,
        invariants_checked: [invariant],
        invariants_passed: passed ? [invariant] : [],
        timestamp_deterministic: TIMESTAMP_ZERO,
      };
    },

    getSeeds(): readonly Seed[] {
      return [...seedMap.values()] as readonly Seed[];
    },
  };
}

export function autoGenerateSeeds(
  arcs: readonly Arc[],
  intent: Intent,
  config: GConfig,
): readonly Seed[] {
  const minSeeds = resolveConfigRef(config, 'CONFIG:MIN_SEEDS');
  const allScenes: Scene[] = [];
  for (const arc of arcs) {
    for (const scene of arc.scenes) {
      allScenes.push(scene);
    }
  }

  if (allScenes.length < 2) return [];

  const seedHash = sha256(canonicalize({ themes: intent.themes, scene_count: allScenes.length }));
  const seeds: Seed[] = [];

  const seedTypes: readonly SeedType[] = ['plot', 'character', 'thematic', 'symbol', 'emotional'];
  const seedCount = Math.max(minSeeds, Math.min(allScenes.length - 1, intent.themes.length + 2));

  const maxDistance = resolveConfigRef(config, 'CONFIG:SEED_BLOOM_MAX_DISTANCE');

  for (let i = 0; i < seedCount; i++) {
    const type = seedTypes[i % seedTypes.length];
    const seedId = `SEED-${String(i + 1).padStart(3, '0')}-${seedHash.slice(i * 2, i * 2 + 6)}`;

    const plantIdx = Math.min(i, allScenes.length - 2);
    const maxBloomIdx = Math.min(
      allScenes.length - 1,
      plantIdx + Math.floor(maxDistance * (allScenes.length - 1)),
    );
    const bloomIdx = Math.max(plantIdx + 1, Math.min(maxBloomIdx, plantIdx + 1 + (i % Math.max(1, allScenes.length - plantIdx - 1))));
    const clampedBloomIdx = Math.min(bloomIdx, allScenes.length - 1);

    const themeRef = intent.themes[i % intent.themes.length];

    seeds.push({
      id: seedId,
      type,
      description: `${type} seed: ${themeRef} — planted as foreshadowing, blooms as payoff`,
      planted_in: allScenes[plantIdx].scene_id,
      blooms_in: allScenes[clampedBloomIdx].scene_id,
    });
  }

  return seeds;
}
