/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS — ATLAS MODULE TESTS
 * Tests for deterministic view generation
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';

import {
  ATLAS_VERSION,
  ATLAS_PATHS,
  LIFECYCLE_MUSEUM,
  LIFECYCLE_LESSONS,
  LIFECYCLE_VISIONS,
  LIFECYCLE_ACTIVE,
  loadEntities,
  loadEvents,
  loadLinks,
  loadSeals,
  loadLedger,
  buildTimeline,
  buildMuseum,
  buildVisions,
  buildLessons,
  generateAtlasMeta,
  generateAtlasRun,
  buildAll,
  verifyAtlas
} from '../scripts/atlas.js';

console.log('Atlas tests loaded');

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

const TEST_DIR = '/tmp/omega-nexus-test-atlas';

function setupTestNexus() {
  // Clean up if exists
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
  
  // Create nexus structure
  mkdirSync(join(TEST_DIR, 'nexus', 'genesis'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'ledger', 'entities'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'ledger', 'events'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'ledger', 'links'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'ledger', 'registry'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'proof', 'seals'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'proof', 'snapshots', 'manifests'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'proof', 'states'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'proof', 'completeness'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'raw', 'sessions'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'atlas', 'museum'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'atlas', 'visions'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'atlas', 'lessons'), { recursive: true });
  
  // Create genesis files
  writeFileSync(join(TEST_DIR, 'nexus', 'genesis', 'THE_OATH.md'), '# The Oath\n');
  writeFileSync(join(TEST_DIR, 'nexus', 'genesis', 'LAWS.yaml'), stringify({
    version: '1.0.0',
    laws: ['Law 1', 'Law 2']
  }));
  writeFileSync(join(TEST_DIR, 'nexus', 'genesis', 'IDENTITY.yaml'), stringify({
    project: 'OMEGA',
    version: '1.0.0'
  }));
}

function createTestEntities() {
  // Entity 1: DRAFT (vision)
  const ent1 = {
    id: 'ENT-20260112-0001',
    type: 'CONCEPT',
    title: 'Future Feature',
    lifecycle: 'DRAFT',
    created_at: '2026-01-12T10:00:00Z',
    tags: ['future', 'concept']
  };
  writeFileSync(
    join(TEST_DIR, 'nexus', 'ledger', 'entities', 'ENT-20260112-0001.yaml'),
    stringify(ent1)
  );
  
  // Entity 2: ACTIVE
  const ent2 = {
    id: 'ENT-20260112-0002',
    type: 'MODULE',
    title: 'Core Module',
    lifecycle: 'ACTIVE',
    created_at: '2026-01-12T11:00:00Z',
    tags: ['core', 'module']
  };
  writeFileSync(
    join(TEST_DIR, 'nexus', 'ledger', 'entities', 'ENT-20260112-0002.yaml'),
    stringify(ent2)
  );
  
  // Entity 3: DEPRECATED (museum)
  const ent3 = {
    id: 'ENT-20260112-0003',
    type: 'DECISION',
    title: 'Old Decision',
    lifecycle: 'DEPRECATED',
    created_at: '2026-01-12T12:00:00Z',
    tags: ['legacy', 'deprecated']
  };
  writeFileSync(
    join(TEST_DIR, 'nexus', 'ledger', 'entities', 'ENT-20260112-0003.yaml'),
    stringify(ent3)
  );
  
  // Entity 4: FAILED (lesson)
  const ent4 = {
    id: 'ENT-20260112-0004',
    type: 'SPEC',
    title: 'Failed Spec',
    lifecycle: 'FAILED',
    created_at: '2026-01-12T13:00:00Z',
    tags: ['failed', 'lesson']
  };
  writeFileSync(
    join(TEST_DIR, 'nexus', 'ledger', 'entities', 'ENT-20260112-0004.yaml'),
    stringify(ent4)
  );
  
  // Entity 5: CERTIFIED
  const ent5 = {
    id: 'ENT-20260112-0005',
    type: 'TEST',
    title: 'Certified Test',
    lifecycle: 'CERTIFIED',
    created_at: '2026-01-12T14:00:00Z',
    tags: ['certified', 'pass']
  };
  writeFileSync(
    join(TEST_DIR, 'nexus', 'ledger', 'entities', 'ENT-20260112-0005.yaml'),
    stringify(ent5)
  );
}

function createTestEvents() {
  const evt1 = {
    id: 'EVT-20260112-0001',
    type: 'CREATED',
    target: 'ENT-20260112-0001',
    timestamp: '2026-01-12T10:00:00Z'
  };
  writeFileSync(
    join(TEST_DIR, 'nexus', 'ledger', 'events', 'EVT-20260112-0001.yaml'),
    stringify(evt1)
  );
  
  const evt2 = {
    id: 'EVT-20260112-0002',
    type: 'PROMOTED',
    target: 'ENT-20260112-0002',
    timestamp: '2026-01-12T11:30:00Z'
  };
  writeFileSync(
    join(TEST_DIR, 'nexus', 'ledger', 'events', 'EVT-20260112-0002.yaml'),
    stringify(evt2)
  );
}

function createTestLinks() {
  const link1 = {
    id: 'LINK-20260112-0001',
    type: 'LESSON_FROM',
    source: 'ENT-20260112-0001',
    target: 'ENT-20260112-0004',
    created_at: '2026-01-12T15:00:00Z'
  };
  writeFileSync(
    join(TEST_DIR, 'nexus', 'ledger', 'links', 'LINK-20260112-0001.yaml'),
    stringify(link1)
  );
}

function createTestSeal() {
  const seal = {
    id: 'SEAL-20260112-0001',
    timestamp: '2026-01-12T16:00:00Z',
    rootHash: 'sha256:' + 'a'.repeat(64),
    scope: 'FULL',
    status: 'VALID',
    fileCount: 10
  };
  writeFileSync(
    join(TEST_DIR, 'nexus', 'proof', 'seals', 'SEAL-20260112-0001.yaml'),
    stringify(seal)
  );
}

function cleanupTestNexus() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Atlas Module', () => {

  describe('Constants', () => {
    
    it('should have ATLAS_VERSION defined', () => {
      assert.ok(ATLAS_VERSION);
      assert.match(ATLAS_VERSION, /^\d+\.\d+\.\d+$/);
    });
    
    it('should have ATLAS_PATHS defined', () => {
      assert.ok(ATLAS_PATHS.timeline);
      assert.ok(ATLAS_PATHS.museum);
      assert.ok(ATLAS_PATHS.visions);
      assert.ok(ATLAS_PATHS.lessons);
      assert.ok(ATLAS_PATHS.meta);
      assert.ok(ATLAS_PATHS.run);
    });
    
    it('should have lifecycle classifications', () => {
      assert.ok(LIFECYCLE_MUSEUM.includes('DEPRECATED'));
      assert.ok(LIFECYCLE_LESSONS.includes('FAILED'));
      assert.ok(LIFECYCLE_VISIONS.includes('DRAFT'));
      assert.ok(LIFECYCLE_ACTIVE.includes('CERTIFIED'));
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // LEDGER LOADING TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Ledger Loading', () => {
    
    before(() => {
      setupTestNexus();
      createTestEntities();
      createTestEvents();
      createTestLinks();
      createTestSeal();
    });
    after(() => cleanupTestNexus());
    
    it('should load entities', () => {
      const entities = loadEntities(TEST_DIR);
      assert.strictEqual(entities.length, 5);
      assert.ok(entities.every(e => e.id.startsWith('ENT-')));
    });
    
    it('should load events', () => {
      const events = loadEvents(TEST_DIR);
      assert.strictEqual(events.length, 2);
      assert.ok(events.every(e => e.id.startsWith('EVT-')));
    });
    
    it('should load links', () => {
      const links = loadLinks(TEST_DIR);
      assert.strictEqual(links.length, 1);
      assert.ok(links.every(l => l.id.startsWith('LINK-')));
    });
    
    it('should load seals', () => {
      const seals = loadSeals(TEST_DIR);
      assert.strictEqual(seals.length, 1);
      assert.ok(seals.every(s => s.id.startsWith('SEAL-')));
    });
    
    it('should load complete ledger', () => {
      const ledger = loadLedger(TEST_DIR);
      assert.strictEqual(ledger.entities.length, 5);
      assert.strictEqual(ledger.events.length, 2);
      assert.strictEqual(ledger.links.length, 1);
      assert.strictEqual(ledger.seals.length, 1);
    });
    
    it('should return empty array for missing directory', () => {
      const empty = loadEntities('/nonexistent');
      assert.strictEqual(empty.length, 0);
    });
    
    it('should return sorted entities by filename', () => {
      const entities = loadEntities(TEST_DIR);
      for (let i = 1; i < entities.length; i++) {
        assert.ok(entities[i - 1].id < entities[i].id);
      }
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // VIEW GENERATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('buildTimeline()', () => {
    
    before(() => {
      setupTestNexus();
      createTestEntities();
      createTestEvents();
      createTestSeal();
    });
    after(() => cleanupTestNexus());
    
    it('should generate markdown timeline', () => {
      const ledger = loadLedger(TEST_DIR);
      const timeline = buildTimeline(ledger, TEST_DIR);
      
      assert.ok(timeline.includes('# OMEGA NEXUS — TIMELINE'));
      assert.ok(timeline.includes('Atlas v'));
    });
    
    it('should include entities in timeline', () => {
      const ledger = loadLedger(TEST_DIR);
      const timeline = buildTimeline(ledger, TEST_DIR);
      
      assert.ok(timeline.includes('ENT-20260112-0001'));
      assert.ok(timeline.includes('Future Feature'));
    });
    
    it('should include events in timeline', () => {
      const ledger = loadLedger(TEST_DIR);
      const timeline = buildTimeline(ledger, TEST_DIR);
      
      assert.ok(timeline.includes('EVT-20260112-0001'));
      assert.ok(timeline.includes('CREATED'));
    });
    
    it('should include seals in timeline', () => {
      const ledger = loadLedger(TEST_DIR);
      const timeline = buildTimeline(ledger, TEST_DIR);
      
      assert.ok(timeline.includes('SEAL-20260112-0001'));
      assert.ok(timeline.includes('🔐'));
    });
    
    it('should group by date', () => {
      const ledger = loadLedger(TEST_DIR);
      const timeline = buildTimeline(ledger, TEST_DIR);
      
      assert.ok(timeline.includes('## 2026-01-12'));
    });
    
    it('should handle empty ledger', () => {
      const emptyLedger = { entities: [], events: [], links: [], seals: [] };
      const timeline = buildTimeline(emptyLedger, TEST_DIR);
      
      assert.ok(timeline.includes('No items in ledger yet'));
    });
    
  });

  describe('buildMuseum()', () => {
    
    before(() => {
      setupTestNexus();
      createTestEntities();
    });
    after(() => cleanupTestNexus());
    
    it('should include only DEPRECATED/ARCHIVED entities', () => {
      const ledger = loadLedger(TEST_DIR);
      const museum = buildMuseum(ledger);
      
      assert.strictEqual(museum.view, 'museum');
      assert.strictEqual(museum.count, 1); // Only DEPRECATED one
      assert.ok(museum.entities.every(e => LIFECYCLE_MUSEUM.includes(e.lifecycle)));
    });
    
    it('should have sorted entities', () => {
      const ledger = loadLedger(TEST_DIR);
      const museum = buildMuseum(ledger);
      
      for (let i = 1; i < museum.entities.length; i++) {
        assert.ok(museum.entities[i - 1].id < museum.entities[i].id);
      }
    });
    
  });

  describe('buildVisions()', () => {
    
    before(() => {
      setupTestNexus();
      createTestEntities();
    });
    after(() => cleanupTestNexus());
    
    it('should include only DRAFT/PROPOSED entities', () => {
      const ledger = loadLedger(TEST_DIR);
      const visions = buildVisions(ledger);
      
      assert.strictEqual(visions.view, 'visions');
      assert.strictEqual(visions.count, 1); // Only DRAFT one
      assert.ok(visions.entities.every(e => LIFECYCLE_VISIONS.includes(e.lifecycle)));
    });
    
  });

  describe('buildLessons()', () => {
    
    before(() => {
      setupTestNexus();
      createTestEntities();
      createTestLinks();
    });
    after(() => cleanupTestNexus());
    
    it('should include only ABANDONED/FAILED entities', () => {
      const ledger = loadLedger(TEST_DIR);
      const lessons = buildLessons(ledger);
      
      assert.strictEqual(lessons.view, 'lessons');
      assert.strictEqual(lessons.count, 1); // Only FAILED one
      assert.ok(lessons.entities.every(e => LIFECYCLE_LESSONS.includes(e.lifecycle)));
    });
    
    it('should link to LESSON_FROM entities', () => {
      const ledger = loadLedger(TEST_DIR);
      const lessons = buildLessons(ledger);
      
      // The FAILED entity should have a lesson link
      const failed = lessons.entities.find(e => e.id === 'ENT-20260112-0004');
      assert.ok(failed);
      assert.ok(Array.isArray(failed.lesson_entities));
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // METADATA TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('generateAtlasMeta()', () => {
    
    before(() => {
      setupTestNexus();
      createTestEntities();
      createTestEvents();
      createTestLinks();
      createTestSeal();
    });
    after(() => cleanupTestNexus());
    
    it('should generate deterministic meta', () => {
      const ledger = loadLedger(TEST_DIR);
      const meta1 = generateAtlasMeta(ledger, TEST_DIR);
      const meta2 = generateAtlasMeta(ledger, TEST_DIR);
      
      // Should be identical
      assert.deepStrictEqual(meta1, meta2);
    });
    
    it('should not contain timestamps', () => {
      const ledger = loadLedger(TEST_DIR);
      const meta = generateAtlasMeta(ledger, TEST_DIR);
      const metaStr = JSON.stringify(meta);
      
      // Should not contain generated_at or similar
      assert.ok(!metaStr.includes('generated_at'));
      assert.ok(!metaStr.includes('built_at'));
    });
    
    it('should have correct counts', () => {
      const ledger = loadLedger(TEST_DIR);
      const meta = generateAtlasMeta(ledger, TEST_DIR);
      
      assert.strictEqual(meta.counts.entities, 5);
      assert.strictEqual(meta.counts.events, 2);
      assert.strictEqual(meta.counts.links, 1);
      assert.strictEqual(meta.counts.seals, 1);
    });
    
    it('should have source_root_hash', () => {
      const ledger = loadLedger(TEST_DIR);
      const meta = generateAtlasMeta(ledger, TEST_DIR);
      
      assert.ok(meta.source_root_hash);
      assert.ok(meta.source_root_hash.startsWith('sha256:'));
    });
    
    it('should have lifecycle distribution', () => {
      const ledger = loadLedger(TEST_DIR);
      const meta = generateAtlasMeta(ledger, TEST_DIR);
      
      assert.ok(meta.lifecycle_distribution);
      assert.strictEqual(meta.lifecycle_distribution.DRAFT, 1);
      assert.strictEqual(meta.lifecycle_distribution.ACTIVE, 1);
      assert.strictEqual(meta.lifecycle_distribution.DEPRECATED, 1);
      assert.strictEqual(meta.lifecycle_distribution.FAILED, 1);
      assert.strictEqual(meta.lifecycle_distribution.CERTIFIED, 1);
    });
    
    it('should have view counts', () => {
      const ledger = loadLedger(TEST_DIR);
      const meta = generateAtlasMeta(ledger, TEST_DIR);
      
      assert.ok(meta.views);
      assert.strictEqual(meta.views.museum, 1);
      assert.strictEqual(meta.views.visions, 1);
      assert.strictEqual(meta.views.lessons, 1);
      assert.strictEqual(meta.views.active, 2); // ACTIVE + CERTIFIED
    });
    
  });

  describe('generateAtlasRun()', () => {
    
    before(() => {
      setupTestNexus();
      createTestEntities();
    });
    after(() => cleanupTestNexus());
    
    it('should include timestamp', () => {
      const ledger = loadLedger(TEST_DIR);
      const run = generateAtlasRun(ledger, TEST_DIR);
      
      assert.ok(run.generated_at);
      assert.ok(run.generated_at.endsWith('Z'));
    });
    
    it('should include entity IDs', () => {
      const ledger = loadLedger(TEST_DIR);
      const run = generateAtlasRun(ledger, TEST_DIR);
      
      assert.ok(Array.isArray(run.entity_ids));
      assert.strictEqual(run.entity_ids.length, 5);
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // FULL BUILD TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('buildAll()', () => {
    
    before(() => {
      setupTestNexus();
      createTestEntities();
      createTestEvents();
      createTestLinks();
      createTestSeal();
    });
    after(() => cleanupTestNexus());
    
    it('should build all outputs', () => {
      const result = buildAll(TEST_DIR);
      
      assert.ok(result.success);
      assert.ok(result.outputs.timeline);
      assert.ok(result.outputs.museum);
      assert.ok(result.outputs.visions);
      assert.ok(result.outputs.lessons);
      assert.ok(result.outputs.meta);
      assert.ok(result.outputs.run);
    });
    
    it('should create files on disk', () => {
      buildAll(TEST_DIR);
      
      assert.ok(existsSync(join(TEST_DIR, ATLAS_PATHS.timeline)));
      assert.ok(existsSync(join(TEST_DIR, ATLAS_PATHS.museum)));
      assert.ok(existsSync(join(TEST_DIR, ATLAS_PATHS.visions)));
      assert.ok(existsSync(join(TEST_DIR, ATLAS_PATHS.lessons)));
      assert.ok(existsSync(join(TEST_DIR, ATLAS_PATHS.meta)));
      assert.ok(existsSync(join(TEST_DIR, ATLAS_PATHS.run)));
    });
    
    it('should support dry run', () => {
      // Clean atlas first
      rmSync(join(TEST_DIR, 'nexus', 'atlas'), { recursive: true });
      mkdirSync(join(TEST_DIR, 'nexus', 'atlas', 'museum'), { recursive: true });
      mkdirSync(join(TEST_DIR, 'nexus', 'atlas', 'visions'), { recursive: true });
      mkdirSync(join(TEST_DIR, 'nexus', 'atlas', 'lessons'), { recursive: true });
      
      const result = buildAll(TEST_DIR, { dryRun: true });
      
      assert.ok(result.success);
      assert.ok(result.dry_run);
      // Files should not exist
      assert.ok(!existsSync(join(TEST_DIR, ATLAS_PATHS.timeline)));
    });
    
    it('should return meta hash', () => {
      const result = buildAll(TEST_DIR);
      
      assert.ok(result.meta_hash);
      assert.ok(result.meta_hash.startsWith('sha256:'));
    });
    
    it('should be idempotent', () => {
      const result1 = buildAll(TEST_DIR);
      const result2 = buildAll(TEST_DIR);
      
      // Meta hash should be identical
      assert.strictEqual(result1.meta_hash, result2.meta_hash);
    });
    
  });

  describe('verifyAtlas()', () => {
    
    before(() => {
      setupTestNexus();
      createTestEntities();
      createTestEvents();
      createTestLinks();
      createTestSeal();
    });
    after(() => cleanupTestNexus());
    
    it('should return valid for up-to-date atlas', () => {
      buildAll(TEST_DIR);
      const result = verifyAtlas(TEST_DIR);
      
      assert.ok(result.valid);
      assert.ok(result.meta_hash);
    });
    
    it('should return invalid for missing atlas', () => {
      rmSync(join(TEST_DIR, ATLAS_PATHS.meta), { force: true });
      const result = verifyAtlas(TEST_DIR);
      
      assert.ok(!result.valid);
      assert.ok(result.reason.includes('not found'));
    });
    
    it('should detect outdated atlas', () => {
      buildAll(TEST_DIR);
      
      // Add a new entity
      const newEnt = {
        id: 'ENT-20260112-0099',
        type: 'CONCEPT',
        title: 'New Entity',
        lifecycle: 'DRAFT',
        created_at: '2026-01-12T20:00:00Z'
      };
      writeFileSync(
        join(TEST_DIR, 'nexus', 'ledger', 'entities', 'ENT-20260112-0099.yaml'),
        stringify(newEnt)
      );
      
      const result = verifyAtlas(TEST_DIR);
      
      assert.ok(!result.valid);
      assert.ok(result.reason.includes('outdated'));
    });
    
  });

});
