/**
 * OMEGA Delivery Full Pipeline Integration Tests v1.0
 * Phase H - NASA-Grade L4 / DO-178C
 *
 * End-to-end integration tests for complete delivery pipeline.
 */

import { describe, it, expect } from 'vitest';
import {
  DeliveryEngine,
  createEngine,
  deliverBody,
  createDeliveryBundle,
} from '../../../src/delivery/delivery-engine';
import { verifyManifest, verifyBundle } from '../../../src/delivery/manifest';
import { verifyChain, hashString } from '../../../src/delivery/hasher';
import { verifyProofPack, buildProofPack } from '../../../src/delivery/proof-pack';
import { loadProfiles, getProfile, getDefaultProfile } from '../../../src/delivery/profile-loader';
import { validateBody } from '../../../src/delivery/normalizer';
import { render } from '../../../src/delivery/renderer';
import type { ProfileId, ISO8601 } from '../../../src/delivery/types';
import { isSha256 } from '../../../src/delivery/types';

const FIXED_TIMESTAMP = '2025-01-15T10:30:00.000Z' as ISO8601;

describe('Full Pipeline Integration — Phase H', () => {
  describe('Profile → Render → Deliver → Bundle', () => {
    it('completes full delivery flow', () => {
      // 1. Load profiles
      const profiles = loadProfiles();
      expect(profiles.verified).toBe(true);

      // 2. Get default profile
      const profile = getDefaultProfile(profiles);
      expect(profile.profileId).toBe('OMEGA_STD');

      // 3. Create engine
      const engine = createEngine();

      // 4. Validate body
      const body = 'Full pipeline test content\nWith multiple lines';
      const validation = engine.validateBody(body);
      expect(validation.valid).toBe(true);

      // 5. Deliver content
      const result = engine.deliver({
        body,
        filename: 'pipeline-test.txt',
      });
      expect(result.valid).toBe(true);
      expect(result.artifact.content).toBe(body);

      // 6. Verify chain
      const chainResult = engine.verifyChain();
      expect(chainResult.valid).toBe(true);

      // 7. Create bundle
      const bundleResult = engine.createBundle({
        name: 'pipeline-test',
        includeChain: true,
        includeProofPack: true,
      });
      expect(bundleResult.valid).toBe(true);

      // 8. Verify bundle
      const bundleVerification = verifyBundle(bundleResult.bundle);
      expect(bundleVerification.valid).toBe(true);

      // 9. Verify proof pack
      if (bundleResult.proofPack) {
        const packVerification = verifyProofPack(bundleResult.proofPack);
        expect(packVerification.valid).toBe(true);
      }
    });
  });

  describe('Multi-format delivery', () => {
    it('delivers to multiple formats', () => {
      const engine = createEngine();

      // Deliver TEXT
      const textResult = engine.deliver({
        body: 'Plain text content',
        profileId: 'OMEGA_STD' as ProfileId,
        filename: 'output.txt',
      });
      expect(textResult.valid).toBe(true);
      expect(textResult.artifact.format).toBe('TEXT');

      // Deliver MARKDOWN
      const mdResult = engine.deliver({
        body: '# Markdown Title\n\nContent here',
        profileId: 'PROF-markdown' as ProfileId,
        filename: 'output.md',
      });
      expect(mdResult.valid).toBe(true);
      expect(mdResult.artifact.format).toBe('MARKDOWN');

      // Verify chain contains both
      expect(engine.chain.entries).toHaveLength(2);
      expect(engine.chain.entries[0].contentType).toBe('TEXT');
      expect(engine.chain.entries[1].contentType).toBe('MARKDOWN');
    });
  });

  describe('Batch delivery', () => {
    it('delivers batch of items', () => {
      const engine = createEngine();
      const items = Array.from({ length: 10 }, (_, i) => ({
        body: `Content for item ${i}`,
        filename: `item-${i}.txt`,
      }));

      const results = engine.deliverBatch(items);

      expect(results).toHaveLength(10);
      expect(results.every(r => r.valid)).toBe(true);
      expect(engine.artifacts).toHaveLength(10);
      expect(engine.chain.entries).toHaveLength(10);
    });
  });

  describe('Chain continuity', () => {
    it('maintains chain through multiple deliveries', () => {
      const engine = createEngine();

      // Deliver in sequence
      for (let i = 0; i < 5; i++) {
        engine.deliver({
          body: `Content ${i}`,
          filename: `file-${i}.txt`,
        });
      }

      // Verify chain structure
      const chain = engine.chain;
      expect(chain.entries).toHaveLength(5);

      // Verify linkage
      for (let i = 1; i < chain.entries.length; i++) {
        expect(chain.entries[i].previousHash).toBe(chain.entries[i - 1].hash);
      }

      // Verify chain hash matches last entry
      expect(chain.chainHash).toBe(chain.entries[chain.entries.length - 1].hash);

      // Full verification
      const verification = verifyChain(chain);
      expect(verification.valid).toBe(true);
    });
  });

  describe('Manifest integrity', () => {
    it('creates valid manifest for all artifacts', () => {
      const engine = createEngine();

      engine.deliver({ body: 'A', filename: 'a.txt' });
      engine.deliver({ body: 'B', filename: 'b.txt' });
      engine.deliver({ body: 'C', filename: 'c.txt' });

      const manifest = engine.getManifest('test-manifest');

      // Verify structure
      expect(manifest.version).toBe('1.0');
      expect(manifest.entries).toHaveLength(3);
      expect(manifest.artifactCount).toBe(3);

      // Verify total bytes
      const expectedBytes = engine.artifacts.reduce((sum, a) => sum + a.byteLength, 0);
      expect(manifest.totalBytes).toBe(expectedBytes);

      // Verify root hash
      expect(isSha256(manifest.rootHash)).toBe(true);

      // Full verification
      const verification = verifyManifest(manifest);
      expect(verification.valid).toBe(true);
    });
  });

  describe('Bundle completeness', () => {
    it('bundle contains all components', () => {
      const engine = createEngine();

      engine.deliver({ body: 'Content 1', filename: 'file1.txt' });
      engine.deliver({ body: 'Content 2', filename: 'file2.txt' });

      const result = engine.createBundle({
        name: 'complete-bundle',
        description: 'Test bundle with all components',
        includeChain: true,
        includeProofPack: true,
      });

      // Check bundle
      expect(result.bundle.manifest.name).toBe('complete-bundle');
      expect(result.bundle.manifest.description).toBe('Test bundle with all components');
      expect(result.bundle.artifacts).toHaveLength(2);

      // Check chain
      expect(result.chain).toBeDefined();
      expect(result.chain!.entries).toHaveLength(2);
      expect(result.chainText).toContain('# OMEGA Hash Chain');

      // Check proof pack
      expect(result.proofPack).toBeDefined();
      expect(result.proofPack!.meta.artifactCount).toBe(2);
    });
  });

  describe('Proof pack structure', () => {
    it('proof pack matches artifacts', () => {
      const engine = createEngine();

      engine.deliver({ body: 'Alpha', filename: 'alpha.txt' });
      engine.deliver({ body: 'Beta', filename: 'beta.txt' });

      const result = engine.createBundle({ includeProofPack: true });
      const pack = result.proofPack!;

      // Check entries
      const artifactPaths = pack.entries.filter(e => e.path.startsWith('artifacts/'));
      expect(artifactPaths).toHaveLength(2);

      // Check content matches
      for (const artifact of engine.artifacts) {
        const entry = pack.entries.find(e => e.path === `artifacts/${artifact.filename}`);
        expect(entry).toBeDefined();
        expect(entry!.content).toBe(artifact.content);
      }

      // Verify pack
      const verification = verifyProofPack(pack);
      expect(verification.valid).toBe(true);
    });
  });

  describe('Convenience functions', () => {
    it('deliverBody creates valid artifact', () => {
      const artifact = deliverBody('Simple content', 'simple.txt');

      expect(artifact.content).toBe('Simple content');
      expect(artifact.filename).toBe('simple.txt');
      expect(isSha256(artifact.hash)).toBe(true);
    });

    it('createDeliveryBundle creates valid bundle', () => {
      const bundle = createDeliveryBundle(
        [
          { body: 'Item 1', filename: 'item1.txt' },
          { body: 'Item 2', filename: 'item2.txt' },
        ],
        'convenience-bundle'
      );

      expect(bundle.artifacts).toHaveLength(2);
      expect(bundle.manifest.name).toBe('convenience-bundle');

      const verification = verifyBundle(bundle);
      expect(verification.valid).toBe(true);
    });
  });

  describe('Reset and reuse', () => {
    it('engine can be reset and reused', () => {
      const engine = createEngine();

      // First batch
      engine.deliver({ body: 'First', filename: 'first.txt' });
      expect(engine.artifacts).toHaveLength(1);
      expect(engine.chain.entries).toHaveLength(1);

      // Reset
      engine.reset();
      expect(engine.artifacts).toHaveLength(0);
      expect(engine.chain.entries).toHaveLength(0);

      // Second batch
      engine.deliver({ body: 'Second', filename: 'second.txt' });
      expect(engine.artifacts).toHaveLength(1);
      expect(engine.artifacts[0].content).toBe('Second');
    });
  });

  describe('Large content handling', () => {
    it('handles large content correctly', () => {
      const engine = createEngine();
      const largeBody = 'x'.repeat(100000);

      const result = engine.deliver({
        body: largeBody,
        filename: 'large.txt',
      });

      expect(result.valid).toBe(true);
      expect(result.artifact.content).toBe(largeBody);
      expect(result.artifact.byteLength).toBe(100000);
    });
  });

  describe('Unicode content handling', () => {
    it('handles unicode content correctly', () => {
      const engine = createEngine();
      const unicodeBody = 'Émoji 🎉 中文 العربية עברית';

      const result = engine.deliver({
        body: unicodeBody,
        filename: 'unicode.txt',
      });

      expect(result.valid).toBe(true);
      expect(result.artifact.content).toBe(unicodeBody);
      // Verify byte length accounts for UTF-8
      expect(result.artifact.byteLength).toBeGreaterThan(unicodeBody.length);
    });
  });

  describe('Empty content handling', () => {
    it('handles empty content correctly', () => {
      const engine = createEngine();

      const result = engine.deliver({
        body: '',
        filename: 'empty.txt',
      });

      expect(result.valid).toBe(true);
      expect(result.artifact.content).toBe('');
      expect(result.artifact.byteLength).toBe(0);
    });
  });

  describe('Profiles hash in manifest', () => {
    it('manifest includes profiles hash', () => {
      const engine = createEngine();
      engine.deliver({ body: 'content', filename: 'test.txt' });

      const manifest = engine.getManifest();

      expect(manifest.profilesHash).toBeDefined();
      expect(isSha256(manifest.profilesHash!)).toBe(true);
    });
  });
});
