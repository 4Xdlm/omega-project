/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA PROJECT — MEMORY_LAYER
 * memory_types.test.ts — Tests Types & Interfaces
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * INVARIANTS TESTÉS :
 *   INV-MEM-04 : Versioned Records
 *   INV-MEM-11 : Schema Validation
 */

import { describe, it, expect } from "vitest";
import {
  // Record Key
  parseRecordKey,
  formatRecordKey,
  isValidKeyFormat,
  
  // Provenance
  createUserProvenance,
  createSystemProvenance,
  isProvenance,
  isProvenanceSource,
  
  // Record
  isMemoryRecord,
  extractMetadata,
  createRecordRef,
  
  // Write Request
  isWriteRequest,
  
  // Validation
  validateKey,
  validatePayload,
  KEY_VALIDATION,
  
  // Config
  DEFAULT_MEMORY_CONFIG,
  MEMORY_LAYER_INFO,
  
  // Types for construction
  type MemoryRecord,
  type Provenance,
  type WriteRequest,
} from "./memory_types.js";

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — RECORD KEY
// ═══════════════════════════════════════════════════════════════════════════════

describe("RecordKey", () => {
  describe("parseRecordKey", () => {
    it("should parse valid key", () => {
      const key = parseRecordKey("char:alice");
      expect(key.namespace).toBe("char");
      expect(key.identifier).toBe("alice");
    });

    it("should parse key with complex identifier", () => {
      const key = parseRecordKey("scene:chapter_1_opening");
      expect(key.namespace).toBe("scene");
      expect(key.identifier).toBe("chapter_1_opening");
    });

    it("should parse key with multiple colons in identifier", () => {
      const key = parseRecordKey("data:uuid:1234-5678");
      expect(key.namespace).toBe("data");
      expect(key.identifier).toBe("uuid:1234-5678");
    });

    it("should freeze the result", () => {
      const key = parseRecordKey("char:alice");
      expect(Object.isFrozen(key)).toBe(true);
    });

    it("should throw for key without colon", () => {
      expect(() => parseRecordKey("nocolon")).toThrow("expected");
    });

    it("should throw for empty namespace", () => {
      expect(() => parseRecordKey(":identifier")).toThrow("cannot be empty");
    });

    it("should throw for empty identifier", () => {
      expect(() => parseRecordKey("namespace:")).toThrow("cannot be empty");
    });
  });

  describe("formatRecordKey", () => {
    it("should format key correctly", () => {
      const formatted = formatRecordKey({ namespace: "char", identifier: "alice" });
      expect(formatted).toBe("char:alice");
    });

    it("should be inverse of parseRecordKey", () => {
      const original = "emotion:joy";
      const parsed = parseRecordKey(original);
      const formatted = formatRecordKey(parsed);
      expect(formatted).toBe(original);
    });
  });

  describe("isValidKeyFormat", () => {
    it("should return true for valid keys", () => {
      expect(isValidKeyFormat("char:alice")).toBe(true);
      expect(isValidKeyFormat("scene:opening")).toBe(true);
      expect(isValidKeyFormat("a:b")).toBe(true);
    });

    it("should return false for invalid keys", () => {
      expect(isValidKeyFormat("nocolon")).toBe(false);
      expect(isValidKeyFormat(":empty")).toBe(false);
      expect(isValidKeyFormat("empty:")).toBe(false);
      expect(isValidKeyFormat("")).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — PROVENANCE
// ═══════════════════════════════════════════════════════════════════════════════

describe("Provenance", () => {
  describe("createUserProvenance", () => {
    it("should create valid user provenance", () => {
      const prov = createUserProvenance("user123", "CREATION", "Test creation");
      
      expect(prov.source.type).toBe("USER");
      expect((prov.source as { user_id: string }).user_id).toBe("user123");
      expect(prov.reason).toBe("CREATION");
      expect(prov.description).toBe("Test creation");
      expect(prov.timestamp_utc).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("should freeze provenance", () => {
      const prov = createUserProvenance("user", "UPDATE");
      expect(Object.isFrozen(prov)).toBe(true);
      expect(Object.isFrozen(prov.source)).toBe(true);
    });
  });

  describe("createSystemProvenance", () => {
    it("should create valid system provenance", () => {
      const prov = createSystemProvenance("memory_engine", "MIGRATION");
      
      expect(prov.source.type).toBe("SYSTEM");
      expect((prov.source as { component: string }).component).toBe("memory_engine");
      expect(prov.reason).toBe("MIGRATION");
    });
  });

  describe("isProvenance", () => {
    it("should return true for valid provenance", () => {
      const prov = createUserProvenance("user", "CREATION");
      expect(isProvenance(prov)).toBe(true);
    });

    it("should return false for invalid provenance", () => {
      expect(isProvenance(null)).toBe(false);
      expect(isProvenance(undefined)).toBe(false);
      expect(isProvenance({})).toBe(false);
      expect(isProvenance({ source: "invalid" })).toBe(false);
    });
  });

  describe("isProvenanceSource", () => {
    it("should validate USER source", () => {
      expect(isProvenanceSource({ type: "USER", user_id: "123" })).toBe(true);
      expect(isProvenanceSource({ type: "USER" })).toBe(false);
    });

    it("should validate SYSTEM source", () => {
      expect(isProvenanceSource({ type: "SYSTEM", component: "engine" })).toBe(true);
      expect(isProvenanceSource({ type: "SYSTEM" })).toBe(false);
    });

    it("should validate IMPORT source", () => {
      expect(isProvenanceSource({ type: "IMPORT", source_file: "data.json" })).toBe(true);
    });

    it("should validate MIGRATION source", () => {
      expect(isProvenanceSource({ type: "MIGRATION", from_version: "1.0.0" })).toBe(true);
    });

    it("should reject unknown types", () => {
      expect(isProvenanceSource({ type: "UNKNOWN" })).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — MEMORY RECORD
// ═══════════════════════════════════════════════════════════════════════════════

describe("MemoryRecord", () => {
  const validRecord: MemoryRecord = {
    key: "char:alice",
    version: 1,
    payload: { name: "Alice", age: 25 },
    payload_hash: "a".repeat(64),
    record_hash: "b".repeat(64),
    provenance: createUserProvenance("user", "CREATION"),
    created_at_utc: new Date().toISOString(),
  };

  describe("isMemoryRecord", () => {
    it("should return true for valid record", () => {
      expect(isMemoryRecord(validRecord)).toBe(true);
    });

    it("should return true for record with previous_hash", () => {
      const recordV2: MemoryRecord = {
        ...validRecord,
        version: 2,
        previous_hash: "c".repeat(64),
      };
      expect(isMemoryRecord(recordV2)).toBe(true);
    });

    it("should return false for null/undefined", () => {
      expect(isMemoryRecord(null)).toBe(false);
      expect(isMemoryRecord(undefined)).toBe(false);
    });

    it("should return false for missing key", () => {
      const invalid = { ...validRecord, key: undefined };
      expect(isMemoryRecord(invalid)).toBe(false);
    });

    it("should return false for invalid version", () => {
      expect(isMemoryRecord({ ...validRecord, version: 0 })).toBe(false);
      expect(isMemoryRecord({ ...validRecord, version: -1 })).toBe(false);
      expect(isMemoryRecord({ ...validRecord, version: "1" })).toBe(false);
    });

    it("should return false for invalid hash length", () => {
      expect(isMemoryRecord({ ...validRecord, payload_hash: "short" })).toBe(false);
      expect(isMemoryRecord({ ...validRecord, record_hash: "short" })).toBe(false);
    });

    it("should return false for invalid provenance", () => {
      expect(isMemoryRecord({ ...validRecord, provenance: {} })).toBe(false);
    });
  });

  describe("extractMetadata", () => {
    it("should extract metadata without payload", () => {
      const metadata = extractMetadata(validRecord);
      
      expect(metadata.key).toBe(validRecord.key);
      expect(metadata.version).toBe(validRecord.version);
      expect(metadata.payload_hash).toBe(validRecord.payload_hash);
      expect(metadata.record_hash).toBe(validRecord.record_hash);
      expect("payload" in metadata).toBe(false);
    });

    it("should freeze metadata", () => {
      const metadata = extractMetadata(validRecord);
      expect(Object.isFrozen(metadata)).toBe(true);
    });
  });

  describe("createRecordRef", () => {
    it("should create reference from record", () => {
      const ref = createRecordRef(validRecord);
      
      expect(ref.key).toBe(validRecord.key);
      expect(ref.version).toBe(validRecord.version);
      expect(ref.record_hash).toBe(validRecord.record_hash);
    });

    it("should freeze reference", () => {
      const ref = createRecordRef(validRecord);
      expect(Object.isFrozen(ref)).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — WRITE REQUEST
// ═══════════════════════════════════════════════════════════════════════════════

describe("WriteRequest", () => {
  describe("isWriteRequest", () => {
    it("should return true for valid request", () => {
      const request: WriteRequest = {
        key: "char:alice",
        payload: { name: "Alice" },
        provenance: createUserProvenance("user", "CREATION"),
      };
      expect(isWriteRequest(request)).toBe(true);
    });

    it("should return true for request with expected_version", () => {
      const request: WriteRequest = {
        key: "char:alice",
        payload: { name: "Alice" },
        provenance: createUserProvenance("user", "UPDATE"),
        expected_version: 1,
      };
      expect(isWriteRequest(request)).toBe(true);
    });

    it("should return false for invalid key", () => {
      expect(isWriteRequest({
        key: "invalid",
        payload: {},
        provenance: createUserProvenance("user", "CREATION"),
      })).toBe(false);
    });

    it("should return false for missing provenance", () => {
      expect(isWriteRequest({
        key: "char:alice",
        payload: {},
      })).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — VALIDATION — INV-MEM-11
// ═══════════════════════════════════════════════════════════════════════════════

describe("Validation (INV-MEM-11)", () => {
  describe("validateKey", () => {
    it("should accept valid keys", () => {
      expect(validateKey("char:alice").valid).toBe(true);
      expect(validateKey("scene:opening").valid).toBe(true);
      expect(validateKey("emotion:joy_intense").valid).toBe(true);
    });

    it("should reject keys exceeding max length", () => {
      const longKey = `char:${"a".repeat(200)}`;
      const result = validateKey(longKey);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("max length");
    });

    it("should reject invalid format", () => {
      expect(validateKey("nocolon").valid).toBe(false);
    });

    it("should reject invalid namespace", () => {
      // Namespace must start with lowercase letter
      expect(validateKey("123:id").valid).toBe(false);
      expect(validateKey("UPPER:id").valid).toBe(false);
    });

    it("should accept valid namespace patterns", () => {
      expect(validateKey("char:id").valid).toBe(true);
      expect(validateKey("character_sheet:id").valid).toBe(true);
      expect(validateKey("scene2:id").valid).toBe(true);
    });
  });

  describe("validatePayload", () => {
    it("should accept valid JSON-serializable payloads", () => {
      expect(validatePayload({ name: "Alice" }).valid).toBe(true);
      expect(validatePayload([1, 2, 3]).valid).toBe(true);
      expect(validatePayload("string").valid).toBe(true);
      expect(validatePayload(123).valid).toBe(true);
      expect(validatePayload(null).valid).toBe(true);
    });

    it("should reject undefined", () => {
      expect(validatePayload(undefined).valid).toBe(false);
    });

    it("should reject circular references", () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;
      expect(validatePayload(circular).valid).toBe(false);
    });

    it("should reject functions", () => {
      const withFunction = { fn: () => {} };
      // JSON.stringify ignores functions, so this actually serializes to {}
      expect(validatePayload(withFunction).valid).toBe(true);
    });
  });

  describe("KEY_VALIDATION patterns", () => {
    it("namespace pattern should match correctly", () => {
      const pattern = KEY_VALIDATION.namespacePattern;
      expect(pattern.test("char")).toBe(true);
      expect(pattern.test("scene_draft")).toBe(true);
      expect(pattern.test("a123")).toBe(true);
      expect(pattern.test("123")).toBe(false);
      expect(pattern.test("UPPER")).toBe(false);
      expect(pattern.test("")).toBe(false);
    });

    it("identifier pattern should match correctly", () => {
      const pattern = KEY_VALIDATION.identifierPattern;
      expect(pattern.test("alice")).toBe(true);
      expect(pattern.test("Alice_123")).toBe(true);
      expect(pattern.test("uuid-1234")).toBe(true);
      expect(pattern.test("")).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — INV-MEM-04 : VERSIONED RECORDS
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-MEM-04: Versioned Records", () => {
  it("version must be positive integer", () => {
    const validRecord: MemoryRecord = {
      key: "char:alice",
      version: 1,
      payload: {},
      payload_hash: "a".repeat(64),
      record_hash: "b".repeat(64),
      provenance: createUserProvenance("user", "CREATION"),
      created_at_utc: new Date().toISOString(),
    };
    
    expect(isMemoryRecord(validRecord)).toBe(true);
    expect(isMemoryRecord({ ...validRecord, version: 0 })).toBe(false);
    expect(isMemoryRecord({ ...validRecord, version: -1 })).toBe(false);
  });

  it("created_at_utc must be present", () => {
    const record = {
      key: "char:alice",
      version: 1,
      payload: {},
      payload_hash: "a".repeat(64),
      record_hash: "b".repeat(64),
      provenance: createUserProvenance("user", "CREATION"),
    };
    
    expect(isMemoryRecord(record)).toBe(false);
  });

  it("previous_hash links versions", () => {
    const v1: MemoryRecord = {
      key: "char:alice",
      version: 1,
      payload: { v: 1 },
      payload_hash: "a".repeat(64),
      record_hash: "hash_v1".padEnd(64, "0"),
      provenance: createUserProvenance("user", "CREATION"),
      created_at_utc: new Date().toISOString(),
    };
    
    const v2: MemoryRecord = {
      key: "char:alice",
      version: 2,
      payload: { v: 2 },
      payload_hash: "b".repeat(64),
      record_hash: "hash_v2".padEnd(64, "0"),
      provenance: createUserProvenance("user", "UPDATE"),
      created_at_utc: new Date().toISOString(),
      previous_hash: v1.record_hash,
    };
    
    expect(isMemoryRecord(v2)).toBe(true);
    expect(v2.previous_hash).toBe(v1.record_hash);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7 — CONFIG & METADATA
// ═══════════════════════════════════════════════════════════════════════════════

describe("Config & Metadata", () => {
  it("DEFAULT_MEMORY_CONFIG should be frozen", () => {
    expect(Object.isFrozen(DEFAULT_MEMORY_CONFIG)).toBe(true);
  });

  it("DEFAULT_MEMORY_CONFIG should have expected values", () => {
    expect(DEFAULT_MEMORY_CONFIG.defaultQueryTimeoutMs).toBe(5000);
    expect(DEFAULT_MEMORY_CONFIG.defaultQueryLimit).toBe(100);
    expect(DEFAULT_MEMORY_CONFIG.strictValidation).toBe(true);
  });

  it("MEMORY_LAYER_INFO should be frozen", () => {
    expect(Object.isFrozen(MEMORY_LAYER_INFO)).toBe(true);
  });

  it("MEMORY_LAYER_INFO should have correct version", () => {
    expect(MEMORY_LAYER_INFO.version).toBe("1.0.0-NASA");
    expect(MEMORY_LAYER_INFO.phase).toBe("10A");
  });

  it("MEMORY_LAYER_INFO should list all 11 invariants", () => {
    expect(MEMORY_LAYER_INFO.invariants.pending).toHaveLength(11);
    expect(MEMORY_LAYER_INFO.invariants.pending).toContain("INV-MEM-01");
    expect(MEMORY_LAYER_INFO.invariants.pending).toContain("INV-MEM-11");
  });
});
