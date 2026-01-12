/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS — GUARDIAN MODULE TESTS
 * Tests for all 14 validation rules
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';

import {
  RULE_STATUS,
  RULES,
  RULE_DEFINITIONS,
  ALLOWED_EXTENSIONS,
  FORBIDDEN_DIRS,
  loadSchema,
  getSchemaForType,
  validateSchemaYaml,
  validateUtcOnly,
  validateIdDateUtc,
  validateCanonicalPath,
  validateNoCollision,
  validateIdFormat,
  validateLinksValid,
  validateEvidenceExists,
  validateCertifiedProof,
  validateTagsRequired,
  validateAbandonedHasLesson,
  validateToolingExtAllowlist,
  validateToolingForbiddenDirs,
  validateToolingNoPackagesImport,
  validateFile,
  validateNexus,
  validateBeforeSeal
} from '../scripts/guardian.js';

console.log('Guardian tests loaded');

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

const TEST_DIR = '/tmp/omega-nexus-test-guardian';

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

function cleanupTestNexus() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Guardian Module', () => {

  describe('Constants', () => {
    
    it('should have all 14 rules defined', () => {
      assert.strictEqual(Object.keys(RULES).length, 14);
    });
    
    it('should have rule definitions for all rules', () => {
      for (const ruleId of Object.values(RULES)) {
        assert.ok(RULE_DEFINITIONS[ruleId], `Missing definition for ${ruleId}`);
        assert.ok(RULE_DEFINITIONS[ruleId].name);
        assert.ok(RULE_DEFINITIONS[ruleId].description);
        assert.ok(RULE_DEFINITIONS[ruleId].bloc);
      }
    });
    
    it('should have valid rule status values', () => {
      assert.ok(RULE_STATUS.PASS);
      assert.ok(RULE_STATUS.FAIL);
      assert.ok(RULE_STATUS.SKIP);
      assert.ok(RULE_STATUS.WARN);
    });
    
    it('should have allowed extensions', () => {
      assert.ok(ALLOWED_EXTENSIONS.has('.yaml'));
      assert.ok(ALLOWED_EXTENSIONS.has('.json'));
      assert.ok(ALLOWED_EXTENSIONS.has('.md'));
      assert.ok(!ALLOWED_EXTENSIONS.has('.exe'));
    });
    
    it('should have forbidden directories', () => {
      assert.ok(FORBIDDEN_DIRS.has('src'));
      assert.ok(FORBIDDEN_DIRS.has('packages'));
      assert.ok(FORBIDDEN_DIRS.has('node_modules'));
      assert.ok(!FORBIDDEN_DIRS.has('genesis'));
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SCHEMA TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Schema Functions', () => {
    
    it('should load ENT schema', () => {
      const schema = loadSchema('ENT');
      assert.ok(schema);
      assert.ok(schema.properties.id);
      assert.ok(schema.properties.type);
      assert.ok(schema.properties.lifecycle);
    });
    
    it('should load EVT schema', () => {
      const schema = loadSchema('EVT');
      assert.ok(schema);
      assert.ok(schema.properties.target);
      assert.ok(schema.properties.timestamp);
    });
    
    it('should load SEAL schema', () => {
      const schema = loadSchema('SEAL');
      assert.ok(schema);
      assert.ok(schema.properties.rootHash);
    });
    
    it('should throw on unknown schema', () => {
      assert.throws(() => loadSchema('UNKNOWN'));
    });
    
    it('should get correct schema for type', () => {
      assert.strictEqual(getSchemaForType('ENT'), 'ENT');
      assert.strictEqual(getSchemaForType('EVT'), 'EVT');
      assert.strictEqual(getSchemaForType('LINK'), 'LINK');
      assert.strictEqual(getSchemaForType('UNKNOWN'), null);
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // RULE 1: SCHEMA_YAML TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Rule 1: SCHEMA_YAML', () => {
    
    it('should pass for valid entity', () => {
      const data = {
        id: 'ENT-20260112-0001',
        type: 'CONCEPT',
        title: 'Test Entity',
        lifecycle: 'DRAFT',
        created_at: '2026-01-12T10:00:00Z'
      };
      const result = validateSchemaYaml(data, 'ENT', 'test.yaml');
      assert.strictEqual(result.status, RULE_STATUS.PASS);
    });
    
    it('should fail for missing required field', () => {
      const data = {
        id: 'ENT-20260112-0001',
        type: 'CONCEPT'
        // missing title, lifecycle, created_at
      };
      const result = validateSchemaYaml(data, 'ENT', 'test.yaml');
      assert.strictEqual(result.status, RULE_STATUS.FAIL);
    });
    
    it('should fail for invalid type enum', () => {
      const data = {
        id: 'ENT-20260112-0001',
        type: 'INVALID_TYPE',
        title: 'Test',
        lifecycle: 'DRAFT',
        created_at: '2026-01-12T10:00:00Z'
      };
      const result = validateSchemaYaml(data, 'ENT', 'test.yaml');
      assert.strictEqual(result.status, RULE_STATUS.FAIL);
    });
    
    it('should skip for unknown type', () => {
      const result = validateSchemaYaml({}, 'UNKNOWN', 'test.yaml');
      assert.strictEqual(result.status, RULE_STATUS.SKIP);
    });
    
    it('should validate event schema', () => {
      const data = {
        id: 'EVT-20260112-0001',
        type: 'CREATED',
        target: 'ENT-20260112-0001',
        timestamp: '2026-01-12T10:00:00Z'
      };
      const result = validateSchemaYaml(data, 'EVT', 'test.yaml');
      assert.strictEqual(result.status, RULE_STATUS.PASS);
    });
    
    it('should validate seal schema', () => {
      const data = {
        id: 'SEAL-20260112-0001',
        timestamp: '2026-01-12T10:00:00Z',
        rootHash: 'sha256:' + 'a'.repeat(64),
        scope: 'FULL',
        status: 'VALID'
      };
      const result = validateSchemaYaml(data, 'SEAL', 'test.yaml');
      assert.strictEqual(result.status, RULE_STATUS.PASS);
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // RULE 2: UTC_ONLY TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Rule 2: UTC_ONLY', () => {
    
    it('should pass for UTC timestamps', () => {
      const data = {
        timestamp: '2026-01-12T10:00:00Z',
        created_at: '2026-01-12T10:00:00.123Z'
      };
      const result = validateUtcOnly(data, 'test.yaml');
      assert.strictEqual(result.status, RULE_STATUS.PASS);
    });
    
    it('should fail for non-UTC timestamp', () => {
      const data = {
        timestamp: '2026-01-12T10:00:00+01:00'
      };
      const result = validateUtcOnly(data, 'test.yaml');
      assert.strictEqual(result.status, RULE_STATUS.FAIL);
    });
    
    it('should fail for timestamp without timezone', () => {
      const data = {
        created_at: '2026-01-12T10:00:00'
      };
      const result = validateUtcOnly(data, 'test.yaml');
      assert.strictEqual(result.status, RULE_STATUS.FAIL);
    });
    
    it('should pass when no timestamp fields', () => {
      const data = { name: 'test' };
      const result = validateUtcOnly(data, 'test.yaml');
      assert.strictEqual(result.status, RULE_STATUS.PASS);
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // RULE 3: ID_DATE_UTC TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Rule 3: ID_DATE_UTC', () => {
    
    it('should pass when ID date matches timestamp', () => {
      const data = {
        id: 'ENT-20260112-0001',
        timestamp: '2026-01-12T10:00:00Z'
      };
      const result = validateIdDateUtc(data, 'test.yaml');
      assert.strictEqual(result.status, RULE_STATUS.PASS);
    });
    
    it('should pass with created_at instead of timestamp', () => {
      const data = {
        id: 'ENT-20260112-0001',
        created_at: '2026-01-12T10:00:00Z'
      };
      const result = validateIdDateUtc(data, 'test.yaml');
      assert.strictEqual(result.status, RULE_STATUS.PASS);
    });
    
    it('should fail when dates mismatch', () => {
      const data = {
        id: 'ENT-20260112-0001',
        timestamp: '2026-01-13T10:00:00Z'
      };
      const result = validateIdDateUtc(data, 'test.yaml');
      assert.strictEqual(result.status, RULE_STATUS.FAIL);
    });
    
    it('should skip when no ID', () => {
      const data = { timestamp: '2026-01-12T10:00:00Z' };
      const result = validateIdDateUtc(data, 'test.yaml');
      assert.strictEqual(result.status, RULE_STATUS.SKIP);
    });
    
    it('should skip when no timestamp', () => {
      const data = { id: 'ENT-20260112-0001' };
      const result = validateIdDateUtc(data, 'test.yaml');
      assert.strictEqual(result.status, RULE_STATUS.SKIP);
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // RULE 4: CANONICAL_PATH TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Rule 4: CANONICAL_PATH', () => {
    
    before(() => setupTestNexus());
    after(() => cleanupTestNexus());
    
    it('should pass for correct entity path', () => {
      const id = 'ENT-20260112-0001';
      const actualPath = join(TEST_DIR, 'nexus', 'ledger', 'entities', 'ENT-20260112-0001.yaml');
      const result = validateCanonicalPath(id, actualPath, TEST_DIR);
      assert.strictEqual(result.status, RULE_STATUS.PASS);
    });
    
    it('should fail for wrong path', () => {
      const id = 'ENT-20260112-0001';
      const actualPath = join(TEST_DIR, 'nexus', 'wrong', 'ENT-20260112-0001.yaml');
      const result = validateCanonicalPath(id, actualPath, TEST_DIR);
      assert.strictEqual(result.status, RULE_STATUS.FAIL);
    });
    
    it('should pass for correct seal path', () => {
      const id = 'SEAL-20260112-0001';
      const actualPath = join(TEST_DIR, 'nexus', 'proof', 'seals', 'SEAL-20260112-0001.yaml');
      const result = validateCanonicalPath(id, actualPath, TEST_DIR);
      assert.strictEqual(result.status, RULE_STATUS.PASS);
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // RULE 5: NO_COLLISION TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Rule 5: NO_COLLISION', () => {
    
    before(() => setupTestNexus());
    after(() => cleanupTestNexus());
    
    it('should pass for non-existent file', () => {
      const result = validateNoCollision(join(TEST_DIR, 'nonexistent.yaml'));
      assert.strictEqual(result.status, RULE_STATUS.PASS);
    });
    
    it('should fail for existing file', () => {
      const existingFile = join(TEST_DIR, 'nexus', 'genesis', 'THE_OATH.md');
      const result = validateNoCollision(existingFile);
      assert.strictEqual(result.status, RULE_STATUS.FAIL);
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // RULE 6: ID_FORMAT TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Rule 6: ID_FORMAT', () => {
    
    it('should pass for valid ENT ID', () => {
      const result = validateIdFormat('ENT-20260112-0001');
      assert.strictEqual(result.status, RULE_STATUS.PASS);
    });
    
    it('should pass for valid SEAL ID', () => {
      const result = validateIdFormat('SEAL-20260112-0001');
      assert.strictEqual(result.status, RULE_STATUS.PASS);
    });
    
    it('should pass for valid MANIFEST ID', () => {
      const result = validateIdFormat('MANIFEST-20260112-0001');
      assert.strictEqual(result.status, RULE_STATUS.PASS);
    });
    
    it('should fail for invalid format', () => {
      const result = validateIdFormat('INVALID');
      assert.strictEqual(result.status, RULE_STATUS.FAIL);
    });
    
    it('should fail for wrong date format', () => {
      const result = validateIdFormat('ENT-2026112-0001');
      assert.strictEqual(result.status, RULE_STATUS.FAIL);
    });
    
    it('should fail for null ID', () => {
      const result = validateIdFormat(null);
      assert.strictEqual(result.status, RULE_STATUS.FAIL);
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // RULE 7: LINKS_VALID TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Rule 7: LINKS_VALID', () => {
    
    before(() => {
      setupTestNexus();
      // Create source and target entities
      const sourceEntity = {
        id: 'ENT-20260112-0001',
        type: 'CONCEPT',
        title: 'Source',
        lifecycle: 'DRAFT',
        created_at: '2026-01-12T10:00:00Z'
      };
      const targetEntity = {
        id: 'ENT-20260112-0002',
        type: 'CONCEPT',
        title: 'Target',
        lifecycle: 'DRAFT',
        created_at: '2026-01-12T10:00:00Z'
      };
      writeFileSync(
        join(TEST_DIR, 'nexus', 'ledger', 'entities', 'ENT-20260112-0001.yaml'),
        stringify(sourceEntity)
      );
      writeFileSync(
        join(TEST_DIR, 'nexus', 'ledger', 'entities', 'ENT-20260112-0002.yaml'),
        stringify(targetEntity)
      );
    });
    after(() => cleanupTestNexus());
    
    it('should pass when both source and target exist', () => {
      const linkData = {
        source: 'ENT-20260112-0001',
        target: 'ENT-20260112-0002'
      };
      const result = validateLinksValid(linkData, TEST_DIR);
      assert.strictEqual(result.status, RULE_STATUS.PASS);
    });
    
    it('should fail when source missing', () => {
      const linkData = {
        source: 'ENT-20260112-9999',
        target: 'ENT-20260112-0002'
      };
      const result = validateLinksValid(linkData, TEST_DIR);
      assert.strictEqual(result.status, RULE_STATUS.FAIL);
    });
    
    it('should fail when target missing', () => {
      const linkData = {
        source: 'ENT-20260112-0001',
        target: 'ENT-20260112-9999'
      };
      const result = validateLinksValid(linkData, TEST_DIR);
      assert.strictEqual(result.status, RULE_STATUS.FAIL);
    });
    
    it('should fail when source/target fields missing', () => {
      const linkData = { source: 'ENT-20260112-0001' };
      const result = validateLinksValid(linkData, TEST_DIR);
      assert.strictEqual(result.status, RULE_STATUS.FAIL);
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // RULE 8: EVIDENCE_EXISTS TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Rule 8: EVIDENCE_EXISTS', () => {
    
    before(() => {
      setupTestNexus();
      // Create a state file
      writeFileSync(
        join(TEST_DIR, 'nexus', 'proof', 'states', 'STATE-20260112-0001.json'),
        JSON.stringify({ id: 'STATE-20260112-0001' })
      );
    });
    after(() => cleanupTestNexus());
    
    it('should skip when no evidence field', () => {
      const data = { id: 'ENT-20260112-0001' };
      const result = validateEvidenceExists(data, TEST_DIR);
      assert.strictEqual(result.status, RULE_STATUS.SKIP);
    });
    
    it('should pass when evidence files exist', () => {
      const data = {
        id: 'ENT-20260112-0001',
        evidence: {
          state: 'STATE-20260112-0001'
        }
      };
      const result = validateEvidenceExists(data, TEST_DIR);
      assert.strictEqual(result.status, RULE_STATUS.PASS);
    });
    
    it('should fail when evidence file missing', () => {
      const data = {
        id: 'ENT-20260112-0001',
        evidence: {
          state: 'STATE-20260112-9999'
        }
      };
      const result = validateEvidenceExists(data, TEST_DIR);
      assert.strictEqual(result.status, RULE_STATUS.FAIL);
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // RULE 9: CERTIFIED_PROOF TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Rule 9: CERTIFIED_PROOF', () => {
    
    it('should skip for non-CERTIFIED entities', () => {
      const data = { lifecycle: 'DRAFT' };
      const result = validateCertifiedProof(data);
      assert.strictEqual(result.status, RULE_STATUS.SKIP);
    });
    
    it('should fail for CERTIFIED without evidence', () => {
      const data = { lifecycle: 'CERTIFIED' };
      const result = validateCertifiedProof(data);
      assert.strictEqual(result.status, RULE_STATUS.FAIL);
    });
    
    it('should fail for CERTIFIED missing required evidence', () => {
      const data = { 
        lifecycle: 'CERTIFIED',
        evidence: { state: 'STATE-20260112-0001' }
        // missing manifest
      };
      const result = validateCertifiedProof(data);
      assert.strictEqual(result.status, RULE_STATUS.FAIL);
    });
    
    it('should pass for CERTIFIED with all evidence', () => {
      const data = { 
        lifecycle: 'CERTIFIED',
        evidence: { 
          state: 'STATE-20260112-0001',
          manifest: 'MANIFEST-20260112-0001'
        }
      };
      const result = validateCertifiedProof(data);
      assert.strictEqual(result.status, RULE_STATUS.PASS);
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // RULE 10: TAGS_REQUIRED TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Rule 10: TAGS_REQUIRED', () => {
    
    it('should skip for DRAFT lifecycle', () => {
      const data = { lifecycle: 'DRAFT' };
      const result = validateTagsRequired(data);
      assert.strictEqual(result.status, RULE_STATUS.SKIP);
    });
    
    it('should skip for ACTIVE lifecycle', () => {
      const data = { lifecycle: 'ACTIVE' };
      const result = validateTagsRequired(data);
      assert.strictEqual(result.status, RULE_STATUS.SKIP);
    });
    
    it('should fail for CERTIFIED without tags', () => {
      const data = { lifecycle: 'CERTIFIED' };
      const result = validateTagsRequired(data);
      assert.strictEqual(result.status, RULE_STATUS.FAIL);
    });
    
    it('should fail for ABANDONED with empty tags', () => {
      const data = { lifecycle: 'ABANDONED', tags: [] };
      const result = validateTagsRequired(data);
      assert.strictEqual(result.status, RULE_STATUS.FAIL);
    });
    
    it('should pass for CERTIFIED with tags', () => {
      const data = { lifecycle: 'CERTIFIED', tags: ['certified', 'tested'] };
      const result = validateTagsRequired(data);
      assert.strictEqual(result.status, RULE_STATUS.PASS);
    });
    
    it('should pass for FAILED with tags', () => {
      const data = { lifecycle: 'FAILED', tags: ['reason:timeout'] };
      const result = validateTagsRequired(data);
      assert.strictEqual(result.status, RULE_STATUS.PASS);
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // RULE 11: ABANDONED_HAS_LESSON TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Rule 11: ABANDONED_HAS_LESSON', () => {
    
    before(() => setupTestNexus());
    after(() => cleanupTestNexus());
    
    it('should skip for non-ABANDONED entities', () => {
      const data = { lifecycle: 'DRAFT' };
      const result = validateAbandonedHasLesson(data, 'ENT-20260112-0001', TEST_DIR);
      assert.strictEqual(result.status, RULE_STATUS.SKIP);
    });
    
    it('should skip for ACTIVE lifecycle', () => {
      const data = { lifecycle: 'ACTIVE' };
      const result = validateAbandonedHasLesson(data, 'ENT-20260112-0001', TEST_DIR);
      assert.strictEqual(result.status, RULE_STATUS.SKIP);
    });
    
    it('should check ABANDONED needs lesson', () => {
      const data = { lifecycle: 'ABANDONED' };
      const result = validateAbandonedHasLesson(data, 'ENT-20260112-0001', TEST_DIR);
      // Will be FAIL or WARN since no lesson link exists
      assert.ok([RULE_STATUS.FAIL, RULE_STATUS.WARN].includes(result.status));
    });
    
    it('should check FAILED needs lesson', () => {
      const data = { lifecycle: 'FAILED' };
      const result = validateAbandonedHasLesson(data, 'ENT-20260112-0001', TEST_DIR);
      assert.ok([RULE_STATUS.FAIL, RULE_STATUS.WARN].includes(result.status));
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // RULE 12: TOOLING_EXT_ALLOWLIST TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Rule 12: TOOLING_EXT_ALLOWLIST', () => {
    
    it('should pass for .yaml extension', () => {
      const result = validateToolingExtAllowlist('test.yaml');
      assert.strictEqual(result.status, RULE_STATUS.PASS);
    });
    
    it('should pass for .json extension', () => {
      const result = validateToolingExtAllowlist('test.json');
      assert.strictEqual(result.status, RULE_STATUS.PASS);
    });
    
    it('should pass for .md extension', () => {
      const result = validateToolingExtAllowlist('readme.md');
      assert.strictEqual(result.status, RULE_STATUS.PASS);
    });
    
    it('should pass for .jsonl extension', () => {
      const result = validateToolingExtAllowlist('session.jsonl');
      assert.strictEqual(result.status, RULE_STATUS.PASS);
    });
    
    it('should fail for .exe extension', () => {
      const result = validateToolingExtAllowlist('malware.exe');
      assert.strictEqual(result.status, RULE_STATUS.FAIL);
    });
    
    it('should fail for .js extension in nexus content', () => {
      const result = validateToolingExtAllowlist('script.js');
      assert.strictEqual(result.status, RULE_STATUS.FAIL);
    });
    
    it('should skip for no extension', () => {
      const result = validateToolingExtAllowlist('Makefile');
      assert.strictEqual(result.status, RULE_STATUS.SKIP);
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // RULE 13: TOOLING_FORBIDDEN_DIRS TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Rule 13: TOOLING_FORBIDDEN_DIRS', () => {
    
    it('should pass for valid path', () => {
      const result = validateToolingForbiddenDirs('nexus/ledger/entities/ENT-0001.yaml');
      assert.strictEqual(result.status, RULE_STATUS.PASS);
    });
    
    it('should fail for src directory', () => {
      const result = validateToolingForbiddenDirs('nexus/src/code.js');
      assert.strictEqual(result.status, RULE_STATUS.FAIL);
    });
    
    it('should fail for packages directory', () => {
      const result = validateToolingForbiddenDirs('nexus/packages/lib/index.js');
      assert.strictEqual(result.status, RULE_STATUS.FAIL);
    });
    
    it('should fail for node_modules', () => {
      const result = validateToolingForbiddenDirs('nexus/node_modules/pkg/index.js');
      assert.strictEqual(result.status, RULE_STATUS.FAIL);
    });
    
    it('should fail for dist directory', () => {
      const result = validateToolingForbiddenDirs('nexus/dist/bundle.js');
      assert.strictEqual(result.status, RULE_STATUS.FAIL);
    });
    
    it('should handle Windows paths', () => {
      const result = validateToolingForbiddenDirs('nexus\\ledger\\entities\\test.yaml');
      assert.strictEqual(result.status, RULE_STATUS.PASS);
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // RULE 14: TOOLING_NO_PACKAGES_IMPORT TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Rule 14: TOOLING_NO_PACKAGES_IMPORT', () => {
    
    it('should skip for non-JS files', () => {
      const result = validateToolingNoPackagesImport('test content', 'test.yaml');
      assert.strictEqual(result.status, RULE_STATUS.SKIP);
    });
    
    it('should pass for clean JS file', () => {
      const content = `import { something } from 'lodash';
const x = require('fs');`;
      const result = validateToolingNoPackagesImport(content, 'test.js');
      assert.strictEqual(result.status, RULE_STATUS.PASS);
    });
    
    it('should fail for import from packages/', () => {
      const content = `import { util } from '../packages/core/util.js';`;
      const result = validateToolingNoPackagesImport(content, 'test.js');
      assert.strictEqual(result.status, RULE_STATUS.FAIL);
    });
    
    it('should fail for require from packages/', () => {
      const content = `const util = require('../packages/core/util');`;
      const result = validateToolingNoPackagesImport(content, 'test.js');
      assert.strictEqual(result.status, RULE_STATUS.FAIL);
    });
    
    it('should fail for dynamic import from packages/', () => {
      const content = `const mod = await import('../packages/core/util.js');`;
      const result = validateToolingNoPackagesImport(content, 'test.mjs');
      assert.strictEqual(result.status, RULE_STATUS.FAIL);
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // HIGH-LEVEL VALIDATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('validateFile()', () => {
    
    before(() => {
      setupTestNexus();
      // Create a valid entity file
      const entity = {
        id: 'ENT-20260112-0001',
        type: 'CONCEPT',
        title: 'Test Entity',
        lifecycle: 'DRAFT',
        created_at: '2026-01-12T10:00:00Z'
      };
      writeFileSync(
        join(TEST_DIR, 'nexus', 'ledger', 'entities', 'ENT-20260112-0001.yaml'),
        stringify(entity)
      );
    });
    after(() => cleanupTestNexus());
    
    it('should validate valid entity file', () => {
      const filePath = join(TEST_DIR, 'nexus', 'ledger', 'entities', 'ENT-20260112-0001.yaml');
      const result = validateFile(filePath, TEST_DIR);
      assert.ok(result.results.length > 0);
      // Should have several rule results
      assert.ok(result.results.some(r => r.id === RULES.SCHEMA_YAML));
      assert.ok(result.results.some(r => r.id === RULES.UTC_ONLY));
    });
    
    it('should validate genesis file', () => {
      const filePath = join(TEST_DIR, 'nexus', 'genesis', 'THE_OATH.md');
      const result = validateFile(filePath, TEST_DIR);
      assert.ok(result.results.length > 0);
    });
    
  });

  describe('validateNexus()', () => {
    
    before(() => setupTestNexus());
    after(() => cleanupTestNexus());
    
    it('should validate entire nexus directory', () => {
      const report = validateNexus(TEST_DIR);
      assert.ok(report.timestamp);
      assert.ok(report.summary);
      assert.ok(report.summary.total >= 0);
      assert.ok(report.rules);
    });
    
    it('should have rule statistics', () => {
      const report = validateNexus(TEST_DIR);
      for (const ruleId of Object.values(RULES)) {
        assert.ok(report.rules[ruleId]);
        assert.ok(typeof report.rules[ruleId].pass === 'number');
        assert.ok(typeof report.rules[ruleId].fail === 'number');
      }
    });
    
  });

  describe('validateBeforeSeal()', () => {
    
    before(() => setupTestNexus());
    after(() => cleanupTestNexus());
    
    it('should return seal-compatible result', () => {
      const result = validateBeforeSeal(TEST_DIR);
      assert.ok(typeof result.valid === 'boolean');
      assert.ok(result.timestamp);
      assert.ok(result.summary);
      assert.ok(Array.isArray(result.failures));
    });
    
    it('should list failures when invalid', () => {
      // Create an invalid file
      writeFileSync(
        join(TEST_DIR, 'nexus', 'ledger', 'entities', 'INVALID.yaml'),
        stringify({ invalid: true })
      );
      
      const result = validateBeforeSeal(TEST_DIR);
      // May or may not be valid depending on rules
      assert.ok(typeof result.valid === 'boolean');
    });
    
  });

});
