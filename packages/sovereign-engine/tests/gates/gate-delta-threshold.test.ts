/**
 * Gate: DELTA_THRESHOLD calibration artifact integrity
 * Verifies calibration/delta-threshold.json exists, has valid hash, and config reads it.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { sha256, canonicalize } from '@omega/canon-kernel';
import { SOVEREIGN_CONFIG } from '../../src/config.js';

const ARTIFACT_PATH = path.resolve(
  import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname),
  '../../calibration/delta-threshold.json',
);

interface DeltaThresholdArtifact {
  value: number;
  computed_from: number;
  distances: number[];
  percentile: number;
  sha256: string;
  date: string;
}

describe('Gate: DELTA_THRESHOLD calibration artifact', () => {
  let artifact: DeltaThresholdArtifact;

  it('GT-DT-01: calibration/delta-threshold.json exists', () => {
    expect(fs.existsSync(ARTIFACT_PATH)).toBe(true);
    artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, 'utf8'));
  });

  it('GT-DT-02: has required fields', () => {
    artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, 'utf8'));
    expect(artifact).toHaveProperty('value');
    expect(artifact).toHaveProperty('computed_from');
    expect(artifact).toHaveProperty('distances');
    expect(artifact).toHaveProperty('percentile');
    expect(artifact).toHaveProperty('sha256');
    expect(artifact).toHaveProperty('date');
  });

  it('GT-DT-03: value is a finite positive number', () => {
    artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, 'utf8'));
    expect(typeof artifact.value).toBe('number');
    expect(Number.isFinite(artifact.value)).toBe(true);
    expect(artifact.value).toBeGreaterThan(0);
  });

  it('GT-DT-04: computed_from >= 3', () => {
    artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, 'utf8'));
    expect(artifact.computed_from).toBeGreaterThanOrEqual(3);
    expect(artifact.distances).toHaveLength(artifact.computed_from);
  });

  it('GT-DT-05: sha256 is valid 64 hex and matches recomputed hash', () => {
    artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, 'utf8'));
    expect(artifact.sha256).toMatch(/^[a-f0-9]{64}$/);

    const hashable = {
      value: artifact.value,
      computed_from: artifact.computed_from,
      distances: artifact.distances,
      percentile: artifact.percentile,
    };
    const recomputed = sha256(canonicalize(hashable));
    expect(artifact.sha256).toBe(recomputed);
  });

  it('GT-DT-06: SOVEREIGN_CONFIG.DELTA_THRESHOLD equals artifact value', () => {
    artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, 'utf8'));
    expect(SOVEREIGN_CONFIG.DELTA_THRESHOLD).toBe(artifact.value);
  });
});
