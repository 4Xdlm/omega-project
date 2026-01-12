/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS — Seal Tests
 * Tests pour le gestionnaire de scellement
 * 
 * Version: 1.0.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';

import { setClockOverride } from '../scripts/registry.js';
import {
  ENTITY_TYPES,
  LIFECYCLES,
  TAGS_REQUIRED_LIFECYCLES,
  EVENT_TYPES,
  LINK_TYPES,
  createSession,
  appendToSession,
  closeSession,
  createEntity,
  createEvent,
  createLink,
  createManifest,
  createSeal,
  createState,
  createCompleteness
} from '../scripts/seal.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SETUP
// ═══════════════════════════════════════════════════════════════════════════════

const TEST_DIR = '/tmp/omega-nexus-test-seal';

describe('Seal Module', () => {
  
  before(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    // Créer la structure complète
    const dirs = [
      'nexus/genesis',
      'nexus/ledger/entities',
      'nexus/ledger/events',
      'nexus/ledger/links',
      'nexus/ledger/registry',
      'nexus/raw/sessions',
      'nexus/proof/seals',
      'nexus/proof/snapshots/manifests',
      'nexus/proof/states',
      'nexus/proof/completeness'
    ];
    for (const dir of dirs) {
      mkdirSync(join(TEST_DIR, dir), { recursive: true });
    }
    
    // Créer des fichiers genesis minimaux
    writeFileSync(join(TEST_DIR, 'nexus/genesis/THE_OATH.md'), '# The Oath\n');
    writeFileSync(join(TEST_DIR, 'nexus/genesis/LAWS.yaml'), 'version: "2.2.3"\n');
    writeFileSync(join(TEST_DIR, 'nexus/genesis/IDENTITY.yaml'), 'project: omega\n');
  });
  
  after(() => {
    setClockOverride(null);
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });
  
  beforeEach(() => {
    setClockOverride(new Date('2026-01-12T15:00:00Z'));
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONSTANTS TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Constants', () => {
    
    it('should have valid entity types', () => {
      assert.ok(ENTITY_TYPES.includes('DECISION'));
      assert.ok(ENTITY_TYPES.includes('INVARIANT'));
      assert.ok(ENTITY_TYPES.includes('LESSON'));
    });
    
    it('should have valid lifecycles', () => {
      assert.ok(LIFECYCLES.includes('PROPOSED'));
      assert.ok(LIFECYCLES.includes('CERTIFIED'));
      assert.ok(LIFECYCLES.includes('ABANDONED'));
    });
    
    it('should have tags required lifecycles', () => {
      assert.ok(TAGS_REQUIRED_LIFECYCLES.includes('CERTIFIED'));
      assert.ok(TAGS_REQUIRED_LIFECYCLES.includes('ABANDONED'));
      assert.ok(!TAGS_REQUIRED_LIFECYCLES.includes('PROPOSED'));
    });
    
    it('should have valid event types', () => {
      assert.ok(EVENT_TYPES.includes('CREATED'));
      assert.ok(EVENT_TYPES.includes('LIFECYCLE_CHANGE'));
      assert.ok(EVENT_TYPES.includes('SEALED'));
    });
    
    it('should have valid link types', () => {
      assert.ok(LINK_TYPES.includes('DEPENDS_ON'));
      assert.ok(LINK_TYPES.includes('SUPERSEDES'));
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SESSION TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('createSession()', () => {
    
    it('should create session with correct ID format', () => {
      const session = createSession({ baseDir: TEST_DIR, purpose: 'test' });
      
      assert.match(session.id, /^SES-20260112-\d{4}$/);
      assert.ok(existsSync(session.path));
    });
    
    it('should create JSONL file with SESSION_START', () => {
      const session = createSession({ baseDir: TEST_DIR, purpose: 'test' });
      
      const content = readFileSync(session.path, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      const firstEntry = JSON.parse(lines[0]);
      
      assert.strictEqual(firstEntry.type, 'SESSION_START');
      assert.strictEqual(firstEntry.session_id, session.id);
    });
    
  });

  describe('appendToSession()', () => {
    
    it('should append entries to session', () => {
      const session = createSession({ baseDir: TEST_DIR });
      
      appendToSession(session.path, 'TEST_ENTRY', { data: 'test' });
      
      const content = readFileSync(session.path, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      
      assert.strictEqual(lines.length, 2);
      const lastEntry = JSON.parse(lines[1]);
      assert.strictEqual(lastEntry.type, 'TEST_ENTRY');
    });
    
  });

  describe('closeSession()', () => {
    
    it('should add SESSION_END entry', () => {
      const session = createSession({ baseDir: TEST_DIR });
      closeSession(session.path, { count: 5 });
      
      const content = readFileSync(session.path, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      const lastEntry = JSON.parse(lines[lines.length - 1]);
      
      assert.strictEqual(lastEntry.type, 'SESSION_END');
      assert.strictEqual(lastEntry.summary.count, 5);
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // ENTITY TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('createEntity()', () => {
    
    it('should create entity with correct ID format', () => {
      const result = createEntity({
        baseDir: TEST_DIR,
        type: 'DECISION',
        title: 'Test Decision',
        summary: 'A test decision for unit tests',
        created_by: 'test'
      });
      
      assert.match(result.id, /^ENT-20260112-\d{4}$/);
      assert.ok(existsSync(result.path));
    });
    
    it('should create YAML file with correct structure', () => {
      const result = createEntity({
        baseDir: TEST_DIR,
        type: 'INVARIANT',
        title: 'Test Invariant',
        summary: 'Must be true always',
        tags: ['test'],
        created_by: 'test'
      });
      
      const content = readFileSync(result.path, 'utf8');
      const entity = YAML.parse(content);
      
      assert.strictEqual(entity.id, result.id);
      assert.strictEqual(entity.type, 'INVARIANT');
      assert.strictEqual(entity.lifecycle, 'PROPOSED');
      assert.strictEqual(entity.version, 1);
    });
    
    it('should throw on invalid type', () => {
      assert.throws(() => {
        createEntity({
          baseDir: TEST_DIR,
          type: 'INVALID_TYPE',
          title: 'Test',
          summary: 'Test'
        });
      }, /Invalid entity type/);
    });
    
    it('should throw on invalid lifecycle', () => {
      assert.throws(() => {
        createEntity({
          baseDir: TEST_DIR,
          type: 'DECISION',
          title: 'Test',
          summary: 'Test',
          lifecycle: 'INVALID'
        });
      }, /Invalid lifecycle/);
    });
    
    it('should throw when tags required but empty', () => {
      assert.throws(() => {
        createEntity({
          baseDir: TEST_DIR,
          type: 'DECISION',
          title: 'Test',
          summary: 'Test',
          lifecycle: 'CERTIFIED',
          tags: []
        });
      }, /Tags required/);
    });
    
    it('should throw on title too long', () => {
      assert.throws(() => {
        createEntity({
          baseDir: TEST_DIR,
          type: 'DECISION',
          title: 'x'.repeat(101),
          summary: 'Test'
        });
      }, /Title/);
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // EVENT TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('createEvent()', () => {
    
    it('should create event with correct ID format', () => {
      const result = createEvent({
        baseDir: TEST_DIR,
        event_type: 'CREATED',
        target: 'ENT-20260112-0001',
        actor: 'test'
      });
      
      assert.match(result.id, /^EVT-20260112-\d{4}$/);
      assert.ok(existsSync(result.path));
    });
    
    it('should create YAML file with correct structure', () => {
      const result = createEvent({
        baseDir: TEST_DIR,
        event_type: 'LIFECYCLE_CHANGE',
        target: 'ENT-20260112-0001',
        actor: 'Francky',
        description: 'Changed to CERTIFIED'
      });
      
      const content = readFileSync(result.path, 'utf8');
      const event = YAML.parse(content);
      
      assert.strictEqual(event.event_type, 'LIFECYCLE_CHANGE');
      assert.strictEqual(event.target, 'ENT-20260112-0001');
    });
    
    it('should throw on invalid event type', () => {
      assert.throws(() => {
        createEvent({
          baseDir: TEST_DIR,
          event_type: 'INVALID',
          target: 'ENT-20260112-0001'
        });
      }, /Invalid event type/);
    });
    
    it('should throw without target', () => {
      assert.throws(() => {
        createEvent({
          baseDir: TEST_DIR,
          event_type: 'CREATED'
        });
      }, /Target.*required/);
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // LINK TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('createLink()', () => {
    
    it('should create link with correct ID format', () => {
      const result = createLink({
        baseDir: TEST_DIR,
        link_type: 'DEPENDS_ON',
        source: 'ENT-20260112-0001',
        target: 'ENT-20260112-0002'
      });
      
      assert.match(result.id, /^LINK-20260112-\d{4}$/);
      assert.ok(existsSync(result.path));
    });
    
    it('should throw on invalid link type', () => {
      assert.throws(() => {
        createLink({
          baseDir: TEST_DIR,
          link_type: 'INVALID',
          source: 'ENT-1',
          target: 'ENT-2'
        });
      }, /Invalid link type/);
    });
    
    it('should throw without source or target', () => {
      assert.throws(() => {
        createLink({
          baseDir: TEST_DIR,
          link_type: 'DEPENDS_ON',
          source: 'ENT-1'
        });
      }, /required/);
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // MANIFEST TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('createManifest()', () => {
    
    it('should create manifest with correct ID format', () => {
      const result = createManifest({
        baseDir: TEST_DIR,
        session_id: 'SES-20260112-0001',
        files_in_scope: ['nexus/genesis/THE_OATH.md']
      });
      
      assert.match(result.id, /^MANIFEST-20260112-\d{4}$/);
      assert.ok(existsSync(result.path));
    });
    
    it('should create JSON file with file hashes', () => {
      const result = createManifest({
        baseDir: TEST_DIR,
        session_id: 'SES-20260112-0001',
        files_in_scope: ['nexus/genesis/THE_OATH.md', 'nexus/genesis/LAWS.yaml']
      });
      
      const content = JSON.parse(readFileSync(result.path, 'utf8'));
      
      assert.ok(content.file_hashes);
      assert.ok(content.files_in_scope);
      assert.strictEqual(content.file_count, 2);
    });
    
    it('should exclude specified files', () => {
      const result = createManifest({
        baseDir: TEST_DIR,
        session_id: 'SES-20260112-0001',
        files_in_scope: ['nexus/genesis/THE_OATH.md', 'nexus/genesis/LAWS.yaml'],
        excludeCurrentSeal: 'SEAL-20260112-0001'
      });
      
      // Le manifest ne doit pas contenir le seal
      const content = JSON.parse(readFileSync(result.path, 'utf8'));
      assert.ok(!content.files_in_scope.some(f => f.includes('SEAL-20260112-0001')));
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SEAL TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('createSeal()', () => {
    
    it('should create seal with correct ID format', () => {
      const result = createSeal({
        baseDir: TEST_DIR,
        session_id: 'SES-20260112-0001',
        manifest_id: 'MANIFEST-20260112-0001',
        root_hash: 'sha256:' + 'a'.repeat(64),
        sealed_by: 'Francky'
      });
      
      assert.match(result.id, /^SEAL-20260112-\d{4}$/);
      assert.ok(existsSync(result.path));
    });
    
    it('should create YAML file with correct structure', () => {
      const result = createSeal({
        baseDir: TEST_DIR,
        session_id: 'SES-20260112-0001',
        manifest_id: 'MANIFEST-20260112-0001',
        root_hash: 'sha256:' + 'b'.repeat(64),
        entities_created: ['ENT-20260112-0001'],
        events_created: ['EVT-20260112-0001'],
        sealed_by: 'Francky',
        notes: 'Test seal'
      });
      
      const content = readFileSync(result.path, 'utf8');
      const seal = YAML.parse(content);
      
      assert.strictEqual(seal.session_id, 'SES-20260112-0001');
      assert.strictEqual(seal.sealed_by, 'Francky');
      assert.deepStrictEqual(seal.entities_created, ['ENT-20260112-0001']);
      assert.strictEqual(seal.verification.spec_version, '2.2.3');
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // STATE TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('createState()', () => {
    
    it('should create state with correct structure', () => {
      const result = createState({
        baseDir: TEST_DIR,
        entity_id: 'ENT-20260112-0001',
        lifecycle: 'CERTIFIED',
        tests_passed: 50,
        tests_total: 50,
        coverage: 95.5
      });
      
      assert.match(result.id, /^STATE-20260112-\d{4}$/);
      
      const content = readFileSync(result.path, 'utf8');
      const state = YAML.parse(content);
      
      assert.strictEqual(state.metrics.tests_passed, 50);
      assert.strictEqual(state.metrics.coverage, 95.5);
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // COMPLETENESS TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('createCompleteness()', () => {
    
    it('should create completeness report', () => {
      const result = createCompleteness({
        baseDir: TEST_DIR,
        seal_id: 'SEAL-20260112-0001',
        rules_checked: 14,
        rules_passed: 14,
        rules_failed: 0
      });
      
      assert.match(result.id, /^COMP-20260112-\d{4}$/);
      
      const content = readFileSync(result.path, 'utf8');
      const comp = YAML.parse(content);
      
      assert.strictEqual(comp.summary.status, 'PASS');
    });
    
    it('should report FAIL when rules fail', () => {
      const result = createCompleteness({
        baseDir: TEST_DIR,
        seal_id: 'SEAL-20260112-0001',
        rules_checked: 14,
        rules_passed: 12,
        rules_failed: 2
      });
      
      const content = readFileSync(result.path, 'utf8');
      const comp = YAML.parse(content);
      
      assert.strictEqual(comp.summary.status, 'FAIL');
    });
    
  });

});

console.log('Seal tests loaded');
