/**
 * OMEGA Delivery Determinism Integration Tests v1.0
 * Phase H - NASA-Grade L4 / DO-178C
 *
 * Tests for H-INV-05: Stable hashes (deterministic output)
 */

import { describe, it, expect } from 'vitest';
import {
  DeliveryEngine,
  createEngineWithConfig,
} from '../../../src/delivery/delivery-engine';
import { render } from '../../../src/delivery/renderer';
import { hashString, computeChainLink, createChain, addToChain } from '../../../src/delivery/hasher';
import { createManifest, serializeManifest } from '../../../src/delivery/manifest';
import { buildProofPack } from '../../../src/delivery/proof-pack';
import { loadProfiles, getDefaultProfile } from '../../../src/delivery/profile-loader';
import type { ProfileId, ISO8601, DeliveryArtifact, DeliveryFormat } from '../../../src/delivery/types';

const FIXED_TIMESTAMP = '2025-01-15T10:30:00.000Z' as ISO8601;
const FIXED_TIMESTAMP_2 = '2025-01-15T10:31:00.000Z' as ISO8601;

// Helper to create deterministic artifact
function createFixedArtifact(
  body: string,
  filename: string,
  format: DeliveryFormat = 'TEXT'
): DeliveryArtifact {
  return Object.freeze({
    filename,
    format,
    content: body,
    hash: hashString(body),
    bodyHash: hashString(body),
    byteLength: Buffer.byteLength(body, 'utf-8'),
    timestamp: FIXED_TIMESTAMP,
    profileId: 'PROF-test',
  });
}

describe('Determinism Integration (H-INV-05) — Phase H', () => {
  describe('Hash determinism', () => {
    it('hashString produces identical hashes for identical input', () => {
      const input = 'deterministic input';
      const hashes = Array.from({ length: 100 }, () => hashString(input));

      expect(new Set(hashes).size).toBe(1);
    });

    it('different inputs produce different hashes', () => {
      const inputs = ['input1', 'input2', 'input3', 'input 4', 'INPUT1'];
      const hashes = inputs.map(i => hashString(i));

      expect(new Set(hashes).size).toBe(inputs.length);
    });

    it('whitespace matters in hash computation', () => {
      const h1 = hashString('test');
      const h2 = hashString(' test');
      const h3 = hashString('test ');
      const h4 = hashString('test\n');

      expect(new Set([h1, h2, h3, h4]).size).toBe(4);
    });
  });

  describe('Render determinism', () => {
    it('render produces identical output for identical input', () => {
      const profiles = loadProfiles();
      const profile = getDefaultProfile(profiles);
      const body = 'Render test content';

      const results = Array.from({ length: 10 }, () =>
        render({ body, profile }, { timestamp: FIXED_TIMESTAMP })
      );

      const contents = results.map(r => r.content);
      const hashes = results.map(r => r.contentHash);

      expect(new Set(contents).size).toBe(1);
      expect(new Set(hashes).size).toBe(1);
    });

    it('different timestamps produce different output for JSON_PACK', () => {
      const profiles = loadProfiles();
      const profile = profiles.config.profiles.find(p => p.format === 'JSON_PACK');
      if (!profile) return;

      const body = 'JSON body';

      const result1 = render({ body, profile }, { timestamp: FIXED_TIMESTAMP });
      const result2 = render({ body, profile }, { timestamp: FIXED_TIMESTAMP_2 });

      expect(result1.content).not.toBe(result2.content);
      expect(result1.contentHash).not.toBe(result2.contentHash);
    });
  });

  describe('Chain determinism', () => {
    it('chain link computation is deterministic', () => {
      const prevHash = hashString('previous');
      const contentHash = hashString('content');

      const links = Array.from({ length: 100 }, () =>
        computeChainLink(prevHash, contentHash, FIXED_TIMESTAMP)
      );

      expect(new Set(links).size).toBe(1);
    });

    it('chain built from same inputs is identical', () => {
      const buildChain = () => {
        let chain = createChain(FIXED_TIMESTAMP);
        chain = addToChain(chain, hashString('a'), 'T', FIXED_TIMESTAMP);
        chain = addToChain(chain, hashString('b'), 'T', FIXED_TIMESTAMP_2);
        return chain;
      };

      const chains = Array.from({ length: 10 }, buildChain);
      const hashes = chains.map(c => c.chainHash);

      expect(new Set(hashes).size).toBe(1);
    });

    it('chain entry hashes are deterministic', () => {
      const buildChain = () => {
        let chain = createChain(FIXED_TIMESTAMP);
        chain = addToChain(chain, hashString('content'), 'TYPE', FIXED_TIMESTAMP);
        return chain;
      };

      const chains = Array.from({ length: 10 }, buildChain);
      const entryHashes = chains.map(c => c.entries[0].hash);

      expect(new Set(entryHashes).size).toBe(1);
    });
  });

  describe('Manifest determinism', () => {
    it('manifest creation is deterministic', () => {
      const artifacts = [
        createFixedArtifact('content a', 'a.txt'),
        createFixedArtifact('content b', 'b.txt'),
      ];

      const manifests = Array.from({ length: 10 }, () =>
        createManifest(artifacts, FIXED_TIMESTAMP)
      );

      const hashes = manifests.map(m => m.rootHash);
      const artifactRoots = manifests.map(m => m.artifactsRoot);

      expect(new Set(hashes).size).toBe(1);
      expect(new Set(artifactRoots).size).toBe(1);
    });

    it('manifest serialization is deterministic', () => {
      const artifacts = [createFixedArtifact('content', 'file.txt')];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      const jsons = Array.from({ length: 10 }, () => serializeManifest(manifest));

      expect(new Set(jsons).size).toBe(1);
    });

    it('manifest entry order is preserved', () => {
      const artifacts = [
        createFixedArtifact('a', 'a.txt'),
        createFixedArtifact('b', 'b.txt'),
        createFixedArtifact('c', 'c.txt'),
      ];

      const manifests = Array.from({ length: 10 }, () =>
        createManifest(artifacts, FIXED_TIMESTAMP)
      );

      for (const manifest of manifests) {
        expect(manifest.entries[0].filename).toBe('a.txt');
        expect(manifest.entries[1].filename).toBe('b.txt');
        expect(manifest.entries[2].filename).toBe('c.txt');
      }
    });
  });

  describe('Proof pack determinism', () => {
    it('proof pack creation is deterministic', () => {
      const artifacts = [
        createFixedArtifact('content a', 'a.txt'),
        createFixedArtifact('content b', 'b.txt'),
      ];

      const packs = Array.from({ length: 10 }, () =>
        buildProofPack(artifacts, FIXED_TIMESTAMP)
      );

      const hashes = packs.map(p => p.packHash);

      expect(new Set(hashes).size).toBe(1);
    });

    it('proof pack entry order is deterministic', () => {
      const artifacts = [
        createFixedArtifact('a', 'a.txt'),
        createFixedArtifact('b', 'b.txt'),
      ];

      const packs = Array.from({ length: 10 }, () =>
        buildProofPack(artifacts, FIXED_TIMESTAMP)
      );

      for (const pack of packs) {
        const paths = pack.entries.map(e => e.path);
        expect(paths[0]).toBe('artifacts/a.txt');
        expect(paths[1]).toBe('artifacts/b.txt');
      }
    });
  });

  describe('Engine determinism', () => {
    it('engine delivery is deterministic', () => {
      const deliver = () => {
        const engine = createEngineWithConfig({ timestamp: FIXED_TIMESTAMP });
        engine.deliver({
          body: 'deterministic body',
          filename: 'test.txt',
          timestamp: FIXED_TIMESTAMP,
        });
        return engine.artifacts[0].hash;
      };

      const hashes = Array.from({ length: 10 }, deliver);

      expect(new Set(hashes).size).toBe(1);
    });

    it('engine chain is deterministic', () => {
      const deliver = () => {
        const engine = createEngineWithConfig({ timestamp: FIXED_TIMESTAMP });
        engine.deliver({
          body: 'a',
          filename: 'a.txt',
          timestamp: FIXED_TIMESTAMP,
        });
        engine.deliver({
          body: 'b',
          filename: 'b.txt',
          timestamp: FIXED_TIMESTAMP_2,
        });
        return engine.chain.chainHash;
      };

      const hashes = Array.from({ length: 10 }, deliver);

      expect(new Set(hashes).size).toBe(1);
    });

    it('engine bundle is deterministic', () => {
      const deliver = () => {
        const engine = createEngineWithConfig({ timestamp: FIXED_TIMESTAMP });
        engine.deliver({
          body: 'content',
          filename: 'test.txt',
          timestamp: FIXED_TIMESTAMP,
        });
        const result = engine.createBundle({ name: 'test' });
        // Check artifacts root (doesn't include timestamp)
        return result.bundle.manifest.artifactsRoot;
      };

      const hashes = Array.from({ length: 10 }, deliver);

      expect(new Set(hashes).size).toBe(1);
    });
  });

  describe('Cross-run determinism', () => {
    it('same inputs produce same outputs across engine instances', () => {
      const createAndDeliver = (id: number) => {
        const engine = createEngineWithConfig({ timestamp: FIXED_TIMESTAMP });
        engine.deliver({
          body: 'shared content',
          filename: 'shared.txt',
          timestamp: FIXED_TIMESTAMP,
        });
        return {
          id,
          artifactHash: engine.artifacts[0].hash,
          chainHash: engine.chain.chainHash,
        };
      };

      const results = Array.from({ length: 5 }, (_, i) => createAndDeliver(i));

      const artifactHashes = new Set(results.map(r => r.artifactHash));
      const chainHashes = new Set(results.map(r => r.chainHash));

      expect(artifactHashes.size).toBe(1);
      expect(chainHashes.size).toBe(1);
    });
  });

  describe('Hash collision resistance', () => {
    it('similar inputs produce different hashes', () => {
      const inputs = [
        'content',
        'Content',
        'content ',
        ' content',
        'content\n',
        'contenT',
      ];

      const hashes = inputs.map(i => hashString(i));

      expect(new Set(hashes).size).toBe(inputs.length);
    });

    it('incremental changes produce different hashes', () => {
      const base = 'base content';
      const hashes: string[] = [];

      for (let i = 0; i < 10; i++) {
        hashes.push(hashString(base + i.toString()));
      }

      expect(new Set(hashes).size).toBe(10);
    });
  });

  describe('Reproducibility scenarios', () => {
    it('same delivery sequence produces identical bundle', () => {
      const deliverSequence = () => {
        const engine = createEngineWithConfig({ timestamp: FIXED_TIMESTAMP });

        engine.deliver({ body: 'First', filename: 'first.txt', timestamp: FIXED_TIMESTAMP });
        engine.deliver({ body: 'Second', filename: 'second.txt', timestamp: FIXED_TIMESTAMP_2 });

        return engine.createBundle({ name: 'sequence-test' });
      };

      const results = Array.from({ length: 5 }, deliverSequence);

      // Check artifacts root (doesn't include timestamp)
      const artifactRoots = new Set(results.map(r => r.bundle.manifest.artifactsRoot));

      expect(artifactRoots.size).toBe(1);
    });

    it('order affects final hash', () => {
      const deliverInOrder = (order: 'ab' | 'ba') => {
        const engine = createEngineWithConfig({ timestamp: FIXED_TIMESTAMP });

        if (order === 'ab') {
          engine.deliver({ body: 'A', filename: 'a.txt', timestamp: FIXED_TIMESTAMP });
          engine.deliver({ body: 'B', filename: 'b.txt', timestamp: FIXED_TIMESTAMP_2 });
        } else {
          engine.deliver({ body: 'B', filename: 'b.txt', timestamp: FIXED_TIMESTAMP });
          engine.deliver({ body: 'A', filename: 'a.txt', timestamp: FIXED_TIMESTAMP_2 });
        }

        return engine.chain.chainHash;
      };

      const hashAB = deliverInOrder('ab');
      const hashBA = deliverInOrder('ba');

      expect(hashAB).not.toBe(hashBA);
    });
  });
});
