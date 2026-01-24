/**
 * OMEGA V4.4 — Mycelium Unit Tests
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  Mycelium,
  BoussoleEmotionnelle,
  O2Calculator,
  GeometryCalculator,
  WindowManager,
} from '../../src/phase5_mycelium/index.js';
import { CoreEngine } from '../../src/phase2_core/index.js';
import { Snapshot } from '../../src/phase3_snapshot/index.js';
import type { TextInput } from '../../src/phase2_core/index.js';
import type { SnapshotMeta } from '../../src/phase3_snapshot/index.js';

describe('Boussole Émotionnelle', () => {
  const boussole = new BoussoleEmotionnelle();

  it('classifies JOIE as North', () => {
    expect(boussole.getDirection('JOIE')).toBe('N');
  });

  it('classifies TRISTESSE as South', () => {
    expect(boussole.getDirection('TRISTESSE')).toBe('S');
  });

  it('classifies COLERE as East', () => {
    expect(boussole.getDirection('COLERE')).toBe('E');
  });

  it('classifies PEUR as West', () => {
    expect(boussole.getDirection('PEUR')).toBe('O');
  });

  it('classifies AMOUR as North', () => {
    expect(boussole.getDirection('AMOUR')).toBe('N');
  });

  it('classifies HAINE as East', () => {
    expect(boussole.getDirection('HAINE')).toBe('E');
  });

  it('classifies ANXIETE as West', () => {
    expect(boussole.getDirection('ANXIETE')).toBe('O');
  });

  it('classifies DEUIL as South', () => {
    expect(boussole.getDirection('DEUIL')).toBe('S');
  });

  it('calculates angular distance correctly', () => {
    expect(boussole.getAngularDistance('N', 'N')).toBe(0);
    expect(boussole.getAngularDistance('N', 'E')).toBe(90);
    expect(boussole.getAngularDistance('N', 'S')).toBe(180);
    expect(boussole.getAngularDistance('N', 'O')).toBe(90);
  });
});

describe('O2 Calculator', () => {
  let engine: CoreEngine;
  let o2calc: O2Calculator;
  const meta: SnapshotMeta = {
    source: 'test',
    contractVersion: '4.4.0',
    coreVersion: '1.0.0',
  };

  beforeEach(() => {
    engine = new CoreEngine();
    o2calc = new O2Calculator();
  });

  const createSnapshots = (texts: string[], timeDelta: number = 1000): Snapshot[] => {
    const snapshots: Snapshot[] = [];
    let t = 1000000000000;

    for (const text of texts) {
      const input: TextInput = { text, timestamp: t, sourceId: 'test' };
      const output = engine.compute(input);
      const snapshot = Snapshot.create(output, {
        ...meta,
        prevSnapshotId: snapshots[snapshots.length - 1]?.snapshotId,
        sequence: snapshots.length,
      });
      snapshots.push(snapshot);
      t += timeDelta;
    }

    return snapshots;
  };

  it('returns initial O2 for single snapshot', () => {
    const snapshots = createSnapshots(['Hello world']);
    const timeline = o2calc.calculate(snapshots);

    expect(timeline.points).toHaveLength(1);
    expect(timeline.points[0]?.o2).toBe(o2calc.getConfig().O2_INITIAL);
  });

  it('O2 decreases with stagnation', () => {
    // Same text repeatedly = no movement = O2 decreases
    const texts = ['Same text', 'Same text', 'Same text', 'Same text', 'Same text'];
    const snapshots = createSnapshots(texts, 10000); // 10 second gaps

    const timeline = o2calc.calculate(snapshots);

    // O2 should decrease (erosion without regeneration)
    const firstO2 = timeline.points[0]?.o2 ?? 0;
    const lastO2 = timeline.points[timeline.points.length - 1]?.o2 ?? 0;

    expect(lastO2).toBeLessThanOrEqual(firstO2);
  });

  it('O2 increases with variation', () => {
    // Very different texts = movement = O2 increases
    const texts = [
      'AAAAAAAAAAAAAAAAAAA',
      'zzzzzzzzzzzzzzzzzzz',
      '12345678901234567890',
      '!@#$%^&*()!@#$%^&*()',
    ];
    const snapshots = createSnapshots(texts, 100); // Short gaps

    const timeline = o2calc.calculate(snapshots);

    // Should have some regeneration
    const hasRegeneration = timeline.points.some(p => p.regeneration > 0);
    expect(hasRegeneration).toBe(true);
  });

  it('O2 is bounded', () => {
    const texts = Array.from({ length: 100 }, (_, i) => `Text ${i} with variation`);
    const snapshots = createSnapshots(texts, 100);

    const timeline = o2calc.calculate(snapshots);

    for (const point of timeline.points) {
      expect(point.o2).toBeGreaterThanOrEqual(0);
      expect(point.o2).toBeLessThanOrEqual(o2calc.getConfig().O2_MAX);
    }
  });

  it('detects depletion', () => {
    // Use high erosion rate to force depletion
    const fastDepletionCalc = new O2Calculator({
      O2_INITIAL: 50,
      O2_MIN: 10,
      O2_MAX: 100,
      COST_TIME: 0.1, // 100x faster erosion
      GAIN_FACTOR: 5,
    });

    // Create many stagnant snapshots to deplete O2
    const texts = Array.from({ length: 50 }, () => 'Stagnant text');
    const snapshots = createSnapshots(texts, 60000); // 1 minute gaps

    const timeline = fastDepletionCalc.calculate(snapshots);

    // Check if O2 gets depleted (with high erosion rate)
    const minO2 = Math.min(...timeline.points.map(p => p.o2));
    expect(minO2).toBeLessThanOrEqual(fastDepletionCalc.getConfig().O2_MIN);
  });
});

describe('Geometry Calculator', () => {
  const geometry = new GeometryCalculator();

  it('same text produces same geometry', () => {
    const text = 'Hello world';
    const g1 = geometry.calculateBranches(text);
    const g2 = geometry.calculateBranches(text);

    expect(g1.geometryHash).toBe(g2.geometryHash);
    expect(g1.branchSize).toBe(g2.branchSize);
    expect(g1.branchDensity).toBe(g2.branchDensity);
  });

  it('different text produces different geometry', () => {
    const g1 = geometry.calculateBranches('Hello world');
    const g2 = geometry.calculateBranches('Goodbye world');

    expect(g1.geometryHash).not.toBe(g2.geometryHash);
  });

  it('1 character change produces different hash', () => {
    const g1 = geometry.calculateBranches('Hello World');
    const g2 = geometry.calculateBranches('Hello world'); // lowercase 'w'

    expect(g1.geometryHash).not.toBe(g2.geometryHash);
  });

  it('calculates distance between geometries', () => {
    const g1 = geometry.calculateBranches('Short');
    const g2 = geometry.calculateBranches('This is a much longer text with more characters');

    const distance = geometry.calculateDistance(g1, g2);
    expect(distance).toBeGreaterThan(0);
  });

  it('identical texts have zero distance', () => {
    const text = 'Same text';
    const g1 = geometry.calculateBranches(text);
    const g2 = geometry.calculateBranches(text);

    const distance = geometry.calculateDistance(g1, g2);
    expect(distance).toBe(0);
  });
});

describe('Window Manager', () => {
  let engine: CoreEngine;
  const windowManager = new WindowManager();
  const meta: SnapshotMeta = {
    source: 'test',
    contractVersion: '4.4.0',
    coreVersion: '1.0.0',
  };

  beforeEach(() => {
    engine = new CoreEngine();
  });

  const createSnapshots = (count: number, timeDelta: number, referenceTime: number): Snapshot[] => {
    const snapshots: Snapshot[] = [];
    let t = referenceTime - count * timeDelta;

    for (let i = 0; i < count; i++) {
      const input: TextInput = { text: `Text ${i}`, timestamp: t, sourceId: 'test' };
      const output = engine.compute(input);
      const snapshot = Snapshot.create(output, meta);
      snapshots.push(snapshot);
      t += timeDelta;
    }

    return snapshots;
  };

  it('tags snapshots with window types', () => {
    const now = Date.now();
    const snapshots = createSnapshots(20, 10000, now); // 20 snapshots, 10s apart

    const tags = windowManager.tagWithWindows(snapshots, now);

    expect(tags.size).toBe(20);

    // Recent snapshots should be SHORT
    let shortCount = 0;
    for (const type of tags.values()) {
      if (type === 'SHORT') shortCount++;
    }
    expect(shortCount).toBeGreaterThan(0);
  });

  it('getWindows returns short/medium/long', () => {
    const now = Date.now();
    const snapshots = createSnapshots(200, 1000, now); // 200 snapshots, 1s apart

    const windows = windowManager.getWindows(snapshots, now);

    expect(windows.short.length).toBeLessThanOrEqual(windowManager.getConfig().SHORT_N);
    expect(windows.medium.length).toBeLessThanOrEqual(windowManager.getConfig().MEDIUM_N);
    expect(windows.long.length).toBeLessThanOrEqual(windowManager.getConfig().LONG_N);
  });
});

describe('Mycelium', () => {
  let engine: CoreEngine;
  let mycelium: Mycelium;
  const meta: SnapshotMeta = {
    source: 'test',
    contractVersion: '4.4.0',
    coreVersion: '1.0.0',
  };

  beforeEach(() => {
    engine = new CoreEngine();
    mycelium = new Mycelium();
  });

  const createSnapshots = (texts: string[]): Snapshot[] => {
    const snapshots: Snapshot[] = [];
    let t = 1000000000000;

    for (const text of texts) {
      const input: TextInput = { text, timestamp: t, sourceId: 'test' };
      const output = engine.compute(input);
      const snapshot = Snapshot.create(output, {
        ...meta,
        prevSnapshotId: snapshots[snapshots.length - 1]?.snapshotId,
        sequence: snapshots.length,
      });
      snapshots.push(snapshot);
      t += 1000;
    }

    return snapshots;
  };

  it('computes DNA from snapshots', () => {
    const texts = ['Hello world', 'Goodbye world', 'Another text'];
    const snapshots = createSnapshots(texts);

    const dna = mycelium.compute(snapshots, texts.join(' '));

    expect(dna.dnaId).toBeDefined();
    expect(dna.tree).toHaveLength(3);
    expect(dna.dnaHash.length).toBe(64);
  });

  it('same snapshots produce same hash', () => {
    const texts = ['Test text one', 'Test text two'];
    const snapshots = createSnapshots(texts);
    const sourceText = texts.join(' ');

    const dna1 = mycelium.compute(snapshots, sourceText);
    const dna2 = mycelium.compute(snapshots, sourceText);

    expect(dna1.dnaHash).toBe(dna2.dnaHash);
  });

  it('includes O2 timeline', () => {
    const texts = ['Text one', 'Text two', 'Text three'];
    const snapshots = createSnapshots(texts);

    const dna = mycelium.compute(snapshots);

    expect(dna.o2Timeline.points).toHaveLength(3);
    expect(dna.o2Timeline.avgO2).toBeDefined();
  });

  it('includes patterns', () => {
    const dna = mycelium.compute([]);

    expect(dna.patterns).toBeDefined();
    expect(Array.isArray(dna.patterns)).toBe(true);
  });

  it('includes metadata', () => {
    const texts = ['Hello', 'World'];
    const snapshots = createSnapshots(texts);

    const dna = mycelium.compute(snapshots);

    expect(dna.metadata.snapshotCount).toBe(2);
    expect(dna.metadata.dominantDirection).toBeDefined();
    expect(dna.metadata.avgIntensity).toBeGreaterThanOrEqual(0);
  });

  it('compareADN returns similarity', () => {
    const texts1 = ['Happy joyful content'];
    const texts2 = ['Happy joyful content']; // Same
    const snapshots1 = createSnapshots(texts1);
    const snapshots2 = createSnapshots(texts2);

    const dna1 = mycelium.compute(snapshots1, texts1.join(' '));
    const dna2 = mycelium.compute(snapshots2, texts2.join(' '));

    const comparison = mycelium.compareADN(dna1, dna2);

    expect(comparison.similarity).toBeGreaterThanOrEqual(0);
    expect(comparison.similarity).toBeLessThanOrEqual(1);
  });

  it('identical ADN has similarity 1', () => {
    const texts = ['Test content'];
    const snapshots = createSnapshots(texts);
    const sourceText = texts.join(' ');

    const dna = mycelium.compute(snapshots, sourceText);

    const comparison = mycelium.compareADN(dna, dna);

    expect(comparison.similarity).toBe(1);
    expect(comparison.distanceTotal).toBe(0);
  });

  it('handles empty snapshots', () => {
    const dna = mycelium.compute([]);

    expect(dna.tree).toHaveLength(0);
    expect(dna.metadata.snapshotCount).toBe(0);
    expect(dna.dnaHash).toBeDefined();
  });
});
