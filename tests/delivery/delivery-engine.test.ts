/**
 * OMEGA Delivery Engine Tests v1.0
 * Phase H - NASA-Grade L4 / DO-178C
 *
 * Tests for H2 main delivery engine.
 */

import { describe, it, expect } from 'vitest';
import {
  DeliveryEngine,
  createEngine,
  createEngineWithConfig,
  deliverBody,
  deliverWithProfile,
  createDeliveryBundle,
} from '../../src/delivery/delivery-engine';
import type {
  EngineConfig,
  DeliveryRequest,
  BundleRequest,
} from '../../src/delivery/delivery-engine';
import type { ProfileId, ISO8601 } from '../../src/delivery/types';
import { isSha256 } from '../../src/delivery/types';

const FIXED_TIMESTAMP = '2025-01-15T10:30:00.000Z' as ISO8601;

describe('Delivery Engine — Phase H', () => {
  describe('DeliveryEngine constructor', () => {
    it('creates engine with default config', () => {
      const engine = new DeliveryEngine();

      expect(engine.state.initialized).toBe(true);
    });

    it('loads profiles on initialization', () => {
      const engine = new DeliveryEngine();

      expect(engine.profiles.verified).toBe(true);
    });

    it('initializes empty artifacts list', () => {
      const engine = new DeliveryEngine();

      expect(engine.artifacts).toHaveLength(0);
    });

    it('initializes hash chain', () => {
      const engine = new DeliveryEngine();

      expect(engine.chain.version).toBe('1.0');
      expect(engine.chain.entries).toHaveLength(0);
    });

    it('accepts custom timestamp', () => {
      const engine = new DeliveryEngine({ timestamp: FIXED_TIMESTAMP });

      expect(engine.chain.created).toBe(FIXED_TIMESTAMP);
    });
  });

  describe('engine.state', () => {
    it('returns frozen state', () => {
      const engine = createEngine();
      const state = engine.state;

      expect(Object.isFrozen(state)).toBe(true);
    });

    it('includes all state properties', () => {
      const engine = createEngine();
      const state = engine.state;

      expect(state.profiles).toBeDefined();
      expect(state.chain).toBeDefined();
      expect(state.artifacts).toBeDefined();
      expect(state.initialized).toBe(true);
    });
  });

  describe('engine.getProfile', () => {
    it('finds profile by ID', () => {
      const engine = createEngine();

      const profile = engine.getProfile('OMEGA_STD' as ProfileId);

      expect(profile).toBeDefined();
      expect(profile!.profileId).toBe('OMEGA_STD');
    });

    it('returns undefined for unknown ID', () => {
      const engine = createEngine();

      const profile = engine.getProfile('UNKNOWN' as ProfileId);

      expect(profile).toBeUndefined();
    });
  });

  describe('engine.getDefaultProfile', () => {
    it('returns OMEGA_STD profile', () => {
      const engine = createEngine();

      const profile = engine.getDefaultProfile();

      expect(profile.profileId).toBe('OMEGA_STD');
    });
  });

  describe('engine.validateBody', () => {
    it('validates clean body', () => {
      const engine = createEngine();

      const result = engine.validateBody('clean\nbody');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('detects BOM (H-INV-06)', () => {
      const engine = createEngine();

      const result = engine.validateBody('\uFEFFbody with BOM');

      expect(result.valid).toBe(false);
      expect(result.violations.some(v => v.includes('H-INV-06'))).toBe(true);
    });

    it('detects CRLF (H-INV-07)', () => {
      const engine = createEngine();

      const result = engine.validateBody('line1\r\nline2');

      expect(result.valid).toBe(false);
      expect(result.violations.some(v => v.includes('H-INV-07'))).toBe(true);
    });
  });

  describe('engine.deliver', () => {
    it('delivers valid content', () => {
      const engine = createEngine();

      const result = engine.deliver({
        body: 'test content',
        filename: 'test.txt',
      });

      expect(result.valid).toBe(true);
      expect(result.artifact.content).toBe('test content');
    });

    it('uses default profile if not specified', () => {
      const engine = createEngine();

      const result = engine.deliver({
        body: 'content',
        filename: 'test.txt',
      });

      expect(result.artifact.profileId).toBe('OMEGA_STD');
    });

    it('uses specified profile', () => {
      const engine = createEngine();

      const result = engine.deliver({
        body: 'content',
        profileId: 'PROF-markdown' as ProfileId,
        filename: 'test.md',
      });

      expect(result.artifact.profileId).toBe('PROF-markdown');
    });

    it('adds to hash chain', () => {
      const engine = createEngine();

      engine.deliver({ body: 'content', filename: 'test.txt' });

      expect(engine.chain.entries).toHaveLength(1);
    });

    it('returns chain entry info', () => {
      const engine = createEngine();

      const result = engine.deliver({ body: 'content', filename: 'test.txt' });

      expect(result.chainEntry.index).toBe(0);
      expect(isSha256(result.chainEntry.hash)).toBe(true);
    });

    it('stores artifact', () => {
      const engine = createEngine();

      engine.deliver({ body: 'content', filename: 'test.txt' });

      expect(engine.artifacts).toHaveLength(1);
    });

    it('returns invalid for bad body', () => {
      const engine = createEngine();

      const result = engine.deliver({
        body: '\uFEFFbad body',
        filename: 'test.txt',
      });

      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('throws for unknown profile', () => {
      const engine = createEngine();

      expect(() =>
        engine.deliver({
          body: 'content',
          profileId: 'UNKNOWN' as ProfileId,
          filename: 'test.txt',
        })
      ).toThrow('Profile not found');
    });

    it('throws for invalid filename (H-INV-08)', () => {
      const engine = createEngine();

      expect(() =>
        engine.deliver({
          body: 'content',
          filename: '../evil.txt',
        })
      ).toThrow('H-INV-08');
    });

    it('preserves body exactly (H-INV-01)', () => {
      const engine = createEngine();
      const body = 'exact content with émoji 🎉';

      const result = engine.deliver({ body, filename: 'test.txt' });

      expect(result.artifact.content).toBe(body);
    });
  });

  describe('engine.deliverBatch', () => {
    it('delivers multiple items', () => {
      const engine = createEngine();
      const requests = [
        { body: 'content a', filename: 'a.txt' },
        { body: 'content b', filename: 'b.txt' },
        { body: 'content c', filename: 'c.txt' },
      ];

      const results = engine.deliverBatch(requests);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.valid)).toBe(true);
    });

    it('maintains chain order', () => {
      const engine = createEngine();
      const requests = [
        { body: 'a', filename: 'a.txt' },
        { body: 'b', filename: 'b.txt' },
      ];

      engine.deliverBatch(requests);

      expect(engine.chain.entries).toHaveLength(2);
      expect(engine.chain.entries[1].previousHash).toBe(engine.chain.entries[0].hash);
    });

    it('returns frozen array', () => {
      const engine = createEngine();

      const results = engine.deliverBatch([
        { body: 'content', filename: 'test.txt' },
      ]);

      expect(Object.isFrozen(results)).toBe(true);
    });
  });

  describe('engine.createBundle', () => {
    it('creates bundle from artifacts', () => {
      const engine = createEngine();
      engine.deliver({ body: 'content a', filename: 'a.txt' });
      engine.deliver({ body: 'content b', filename: 'b.txt' });

      const result = engine.createBundle();

      expect(result.bundle.artifacts).toHaveLength(2);
      expect(result.bundle.manifest.artifactCount).toBe(2);
    });

    it('validates bundle', () => {
      const engine = createEngine();
      engine.deliver({ body: 'content', filename: 'test.txt' });

      const result = engine.createBundle();

      expect(result.valid).toBe(true);
    });

    it('includes chain when requested', () => {
      const engine = createEngine();
      engine.deliver({ body: 'content', filename: 'test.txt' });

      const result = engine.createBundle({ includeChain: true });

      expect(result.chain).toBeDefined();
      expect(result.chainText).toBeDefined();
    });

    it('includes proof pack when requested', () => {
      const engine = createEngine();
      engine.deliver({ body: 'content', filename: 'test.txt' });

      const result = engine.createBundle({ includeProofPack: true });

      expect(result.proofPack).toBeDefined();
    });

    it('uses custom name', () => {
      const engine = createEngine();
      engine.deliver({ body: 'content', filename: 'test.txt' });

      const result = engine.createBundle({ name: 'custom-bundle' });

      expect(result.bundle.manifest.name).toBe('custom-bundle');
    });

    it('returns frozen result', () => {
      const engine = createEngine();
      engine.deliver({ body: 'content', filename: 'test.txt' });

      const result = engine.createBundle();

      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  describe('engine.verifyChain (H-INV-09)', () => {
    it('validates empty chain', () => {
      const engine = createEngine();

      const result = engine.verifyChain();

      expect(result.valid).toBe(true);
    });

    it('validates chain with entries', () => {
      const engine = createEngine();
      engine.deliver({ body: 'a', filename: 'a.txt' });
      engine.deliver({ body: 'b', filename: 'b.txt' });

      const result = engine.verifyChain();

      expect(result.valid).toBe(true);
    });
  });

  describe('engine.getChainText', () => {
    it('returns serialized chain', () => {
      const engine = createEngine();
      engine.deliver({ body: 'content', filename: 'test.txt' });

      const text = engine.getChainText();

      expect(text).toContain('# OMEGA Hash Chain');
      expect(text).toContain('[0]');
    });
  });

  describe('engine.getManifest', () => {
    it('returns manifest for artifacts', () => {
      const engine = createEngine();
      engine.deliver({ body: 'content', filename: 'test.txt' });

      const manifest = engine.getManifest();

      expect(manifest.entries).toHaveLength(1);
    });

    it('uses custom name', () => {
      const engine = createEngine();
      engine.deliver({ body: 'content', filename: 'test.txt' });

      const manifest = engine.getManifest('custom');

      expect(manifest.name).toBe('custom');
    });

    it('includes profiles hash', () => {
      const engine = createEngine();
      engine.deliver({ body: 'content', filename: 'test.txt' });

      const manifest = engine.getManifest();

      expect(isSha256(manifest.profilesHash!)).toBe(true);
    });
  });

  describe('engine.getManifestJson', () => {
    it('returns valid JSON', () => {
      const engine = createEngine();
      engine.deliver({ body: 'content', filename: 'test.txt' });

      const json = engine.getManifestJson();

      expect(() => JSON.parse(json)).not.toThrow();
    });
  });

  describe('engine.reset', () => {
    it('clears artifacts', () => {
      const engine = createEngine();
      engine.deliver({ body: 'content', filename: 'test.txt' });

      engine.reset();

      expect(engine.artifacts).toHaveLength(0);
    });

    it('resets chain', () => {
      const engine = createEngine();
      engine.deliver({ body: 'content', filename: 'test.txt' });

      engine.reset();

      expect(engine.chain.entries).toHaveLength(0);
    });
  });

  describe('createEngine', () => {
    it('creates engine with defaults', () => {
      const engine = createEngine();

      expect(engine.state.initialized).toBe(true);
    });
  });

  describe('createEngineWithConfig', () => {
    it('creates engine with config', () => {
      const engine = createEngineWithConfig({
        timestamp: FIXED_TIMESTAMP,
      });

      expect(engine.chain.created).toBe(FIXED_TIMESTAMP);
    });
  });

  describe('deliverBody', () => {
    it('delivers body with default profile', () => {
      const artifact = deliverBody('test content', 'test.txt');

      expect(artifact.content).toBe('test content');
      expect(artifact.filename).toBe('test.txt');
    });

    it('throws for invalid body', () => {
      expect(() => deliverBody('\uFEFFbad', 'test.txt')).toThrow();
    });
  });

  describe('deliverWithProfile', () => {
    it('delivers with specific profile', () => {
      const artifact = deliverWithProfile(
        '# Markdown',
        'PROF-markdown' as ProfileId,
        'test.md'
      );

      expect(artifact.profileId).toBe('PROF-markdown');
    });
  });

  describe('createDeliveryBundle', () => {
    it('creates bundle from items', () => {
      const bundle = createDeliveryBundle(
        [
          { body: 'content a', filename: 'a.txt' },
          { body: 'content b', filename: 'b.txt' },
        ],
        'test-bundle'
      );

      expect(bundle.artifacts).toHaveLength(2);
      expect(bundle.manifest.name).toBe('test-bundle');
    });
  });

  describe('Determinism (H-INV-05)', () => {
    it('produces identical results for identical input', () => {
      const engine1 = createEngineWithConfig({ timestamp: FIXED_TIMESTAMP });
      const engine2 = createEngineWithConfig({ timestamp: FIXED_TIMESTAMP });

      const result1 = engine1.deliver({
        body: 'deterministic',
        filename: 'test.txt',
        timestamp: FIXED_TIMESTAMP,
      });
      const result2 = engine2.deliver({
        body: 'deterministic',
        filename: 'test.txt',
        timestamp: FIXED_TIMESTAMP,
      });

      expect(result1.artifact.hash).toBe(result2.artifact.hash);
    });
  });

  describe('H-INV-01: Body bytes preserved', () => {
    it('preserves exact bytes through delivery', () => {
      const engine = createEngine();
      const bodies = [
        'simple text',
        'with\nnewlines',
        'émoji 🎉 中文',
        '   spaces   ',
        '',
      ];

      for (const body of bodies) {
        const result = engine.deliver({ body, filename: `test-${bodies.indexOf(body)}.txt` });
        expect(result.artifact.content).toBe(body);
      }
    });
  });

  describe('Full delivery pipeline', () => {
    it('handles complete workflow', () => {
      const engine = createEngine();

      // Deliver multiple items
      engine.deliver({ body: 'Content A', filename: 'a.txt' });
      engine.deliver({ body: '# Title\n\nBody', filename: 'b.md', profileId: 'PROF-markdown' as ProfileId });
      engine.deliver({ body: 'Content C', filename: 'c.txt' });

      // Verify chain
      const chainResult = engine.verifyChain();
      expect(chainResult.valid).toBe(true);

      // Create bundle
      const bundleResult = engine.createBundle({
        name: 'full-test',
        includeChain: true,
        includeProofPack: true,
      });

      expect(bundleResult.valid).toBe(true);
      expect(bundleResult.bundle.artifacts).toHaveLength(3);
      expect(bundleResult.chain).toBeDefined();
      expect(bundleResult.proofPack).toBeDefined();
    });
  });
});
