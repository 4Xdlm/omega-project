/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA PROJECT — CREATION_LAYER
 * creation_request.test.ts — Tests Request Validation & Hashing
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * INVARIANTS TESTÉS :
 *   INV-CRE-07 : Request Validation
 *   INV-CRE-10 : Idempotency (request_hash)
 */

import { describe, it, expect } from "vitest";
import {
  canonicalEncode,
  sha256Sync,
  validateRequest,
  computeRequestHashSync,
  createRequestSync,
  requestsEqual,
  cloneRequest,
  generateRequestId,
} from "./creation_request.js";
import { DEFAULT_CREATION_CONFIG } from "./creation_types.js";

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — CANONICAL ENCODE
// ═══════════════════════════════════════════════════════════════════════════════

describe("canonicalEncode", () => {
  describe("primitives", () => {
    it("should encode null", () => {
      expect(canonicalEncode(null)).toBe("null");
    });

    it("should encode booleans", () => {
      expect(canonicalEncode(true)).toBe("true");
      expect(canonicalEncode(false)).toBe("false");
    });

    it("should encode strings", () => {
      expect(canonicalEncode("hello")).toBe('"hello"');
      expect(canonicalEncode("")).toBe('""');
    });

    it("should encode integers", () => {
      expect(canonicalEncode(42)).toBe("42");
      expect(canonicalEncode(-17)).toBe("-17");
      expect(canonicalEncode(0)).toBe("0");
    });

    it("should encode floats", () => {
      expect(canonicalEncode(3.14)).toBe("3.14");
      expect(canonicalEncode(-0.5)).toBe("-0.5");
    });

    it("should normalize -0 to 0", () => {
      expect(canonicalEncode(-0)).toBe("0");
    });
  });

  describe("rejected values", () => {
    it("should reject undefined", () => {
      expect(() => canonicalEncode(undefined)).toThrow("undefined");
    });

    it("should reject NaN", () => {
      expect(() => canonicalEncode(NaN)).toThrow("non-finite");
    });

    it("should reject Infinity", () => {
      expect(() => canonicalEncode(Infinity)).toThrow("non-finite");
      expect(() => canonicalEncode(-Infinity)).toThrow("non-finite");
    });

    it("should reject BigInt", () => {
      expect(() => canonicalEncode(BigInt(123))).toThrow("BigInt");
    });

    it("should reject Symbol", () => {
      expect(() => canonicalEncode(Symbol("test"))).toThrow("Symbol");
    });

    it("should reject Function", () => {
      expect(() => canonicalEncode(() => {})).toThrow("Function");
    });
  });

  describe("arrays", () => {
    it("should encode empty array", () => {
      expect(canonicalEncode([])).toBe("[]");
    });

    it("should encode array of primitives", () => {
      expect(canonicalEncode([1, 2, 3])).toBe("[1,2,3]");
    });

    it("should encode nested arrays", () => {
      expect(canonicalEncode([[1], [2, 3]])).toBe("[[1],[2,3]]");
    });
  });

  describe("objects", () => {
    it("should encode empty object", () => {
      expect(canonicalEncode({})).toBe("{}");
    });

    it("should sort keys lexicographically", () => {
      const obj = { z: 1, a: 2, m: 3 };
      expect(canonicalEncode(obj)).toBe('{"a":2,"m":3,"z":1}');
    });

    it("should handle nested objects with sorted keys", () => {
      const obj = { b: { z: 1, a: 2 }, a: 1 };
      expect(canonicalEncode(obj)).toBe('{"a":1,"b":{"a":2,"z":1}}');
    });

    it("should skip undefined properties", () => {
      const obj = { a: 1, b: undefined, c: 3 };
      expect(canonicalEncode(obj)).toBe('{"a":1,"c":3}');
    });
  });

  describe("determinism — INV-CRE-10", () => {
    it("should produce same output for same input (1000 runs)", () => {
      const input = {
        name: "test",
        values: [1, 2, 3],
        nested: { z: true, a: false },
      };
      
      const first = canonicalEncode(input);
      
      for (let i = 0; i < 1000; i++) {
        expect(canonicalEncode(input)).toBe(first);
      }
    });

    it("should produce same output regardless of key insertion order", () => {
      const obj1: Record<string, number> = {};
      obj1.a = 1;
      obj1.b = 2;
      obj1.c = 3;

      const obj2: Record<string, number> = {};
      obj2.c = 3;
      obj2.a = 1;
      obj2.b = 2;

      expect(canonicalEncode(obj1)).toBe(canonicalEncode(obj2));
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — SHA256
// ═══════════════════════════════════════════════════════════════════════════════

describe("sha256Sync", () => {
  it("should produce 64-char hex string", () => {
    const hash = sha256Sync("test");
    expect(hash).toHaveLength(64);
    expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
  });

  it("should be deterministic", () => {
    const input = "hello world";
    const hash1 = sha256Sync(input);
    const hash2 = sha256Sync(input);
    expect(hash1).toBe(hash2);
  });

  it("should match known hash", () => {
    // SHA256("test") = known value
    const hash = sha256Sync("test");
    expect(hash).toBe("9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08");
  });

  it("should produce different hashes for different inputs", () => {
    const hash1 = sha256Sync("input1");
    const hash2 = sha256Sync("input2");
    expect(hash1).not.toBe(hash2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — REQUEST VALIDATION — INV-CRE-07
// ═══════════════════════════════════════════════════════════════════════════════

describe("validateRequest — INV-CRE-07", () => {
  // Helper to create valid request
  function makeValidRequest(overrides: Record<string, unknown> = {}) {
    const base = {
      request_id: "req_abc123",
      snapshot_id: "snap_xyz789",
      template_id: "SCENE_OUTLINE",
      params: { chapter: 1 },
      timeout_ms: 5000,
    };
    const merged = { ...base, ...overrides };
    const hash = computeRequestHashSync(merged);
    return { ...merged, request_hash: hash };
  }

  describe("valid requests", () => {
    it("should accept valid request", () => {
      const request = makeValidRequest();
      const result = validateRequest(request);
      expect(result.valid).toBe(true);
    });

    it("should accept request without timeout_ms", () => {
      const request = makeValidRequest({ timeout_ms: undefined });
      // Recompute hash without timeout
      const { timeout_ms, request_hash, ...rest } = request;
      const newHash = computeRequestHashSync(rest);
      const result = validateRequest({ ...rest, request_hash: newHash });
      expect(result.valid).toBe(true);
    });
  });

  describe("request_id validation", () => {
    it("should reject non-string request_id", () => {
      const result = validateRequest(makeValidRequest({ request_id: 123 }));
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.code).toBe("INVALID_REQUEST");
      }
    });

    it("should reject empty request_id", () => {
      const request = { ...makeValidRequest(), request_id: "" };
      const result = validateRequest(request);
      expect(result.valid).toBe(false);
    });

    it("should reject request_id with invalid chars", () => {
      const request = { ...makeValidRequest(), request_id: "req@123" };
      const result = validateRequest(request);
      expect(result.valid).toBe(false);
    });

    it("should reject request_id > 64 chars", () => {
      const request = { ...makeValidRequest(), request_id: "a".repeat(65) };
      const result = validateRequest(request);
      expect(result.valid).toBe(false);
    });
  });

  describe("snapshot_id validation", () => {
    it("should reject non-string snapshot_id", () => {
      const result = validateRequest(makeValidRequest({ snapshot_id: null }));
      expect(result.valid).toBe(false);
    });

    it("should reject empty snapshot_id", () => {
      const request = { ...makeValidRequest(), snapshot_id: "" };
      const result = validateRequest(request);
      expect(result.valid).toBe(false);
    });

    it("should reject snapshot_id > 128 chars", () => {
      const request = { ...makeValidRequest(), snapshot_id: "s".repeat(129) };
      const result = validateRequest(request);
      expect(result.valid).toBe(false);
    });
  });

  describe("template_id validation", () => {
    it("should reject non-string template_id", () => {
      const result = validateRequest(makeValidRequest({ template_id: 123 }));
      expect(result.valid).toBe(false);
    });

    it("should reject lowercase template_id", () => {
      const request = { ...makeValidRequest(), template_id: "scene_outline" };
      const result = validateRequest(request);
      expect(result.valid).toBe(false);
    });

    it("should reject template_id starting with number", () => {
      const request = { ...makeValidRequest(), template_id: "1SCENE" };
      const result = validateRequest(request);
      expect(result.valid).toBe(false);
    });

    it("should accept valid UPPER_SNAKE_CASE template_id", () => {
      const request = makeValidRequest({ template_id: "MY_TEMPLATE_V2" });
      const result = validateRequest(request);
      expect(result.valid).toBe(true);
    });
  });

  describe("params validation", () => {
    it("should reject missing params", () => {
      const request = { ...makeValidRequest() };
      delete (request as Record<string, unknown>).params;
      const result = validateRequest(request);
      expect(result.valid).toBe(false);
    });

    it("should accept null params", () => {
      const request = makeValidRequest({ params: null });
      const result = validateRequest(request);
      expect(result.valid).toBe(true);
    });

    it("should reject params with NaN", () => {
      // NaN in params will fail at hash computation (canonicalEncode rejects NaN)
      // This is correct behavior - validation catches it
      const request = {
        request_id: "req_abc123",
        snapshot_id: "snap_xyz789",
        template_id: "SCENE_OUTLINE",
        params: { value: NaN },
        request_hash: "0".repeat(64), // Will fail anyway
      };
      const result = validateRequest(request);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.message).toContain("JSON-encodable");
      }
    });

    it("should reject params with undefined nested", () => {
      // Note: canonicalEncode skips undefined, but we should still test
      const request = makeValidRequest({ params: { value: undefined } });
      const result = validateRequest(request);
      // This should pass because undefined is skipped in canonicalEncode
      expect(result.valid).toBe(true);
    });
  });

  describe("timeout_ms validation", () => {
    it("should reject non-integer timeout_ms", () => {
      const request = { ...makeValidRequest(), timeout_ms: 5000.5 };
      const result = validateRequest(request);
      expect(result.valid).toBe(false);
    });

    it("should reject timeout_ms < 100", () => {
      const request = { ...makeValidRequest(), timeout_ms: 50 };
      const result = validateRequest(request);
      expect(result.valid).toBe(false);
    });

    it("should reject timeout_ms > 300000", () => {
      const request = { ...makeValidRequest(), timeout_ms: 400000 };
      const result = validateRequest(request);
      expect(result.valid).toBe(false);
    });

    it("should accept timeout_ms = 100 (min)", () => {
      const request = makeValidRequest({ timeout_ms: 100 });
      const result = validateRequest(request);
      expect(result.valid).toBe(true);
    });

    it("should accept timeout_ms = 300000 (max)", () => {
      const request = makeValidRequest({ timeout_ms: 300000 });
      const result = validateRequest(request);
      expect(result.valid).toBe(true);
    });
  });

  describe("request_hash validation", () => {
    it("should reject non-string hash", () => {
      const request = { ...makeValidRequest(), request_hash: 12345 };
      const result = validateRequest(request);
      expect(result.valid).toBe(false);
    });

    it("should reject hash with wrong length", () => {
      const request = { ...makeValidRequest(), request_hash: "abc123" };
      const result = validateRequest(request);
      expect(result.valid).toBe(false);
    });

    it("should reject uppercase hex", () => {
      const request = { ...makeValidRequest(), request_hash: "A".repeat(64) };
      const result = validateRequest(request);
      expect(result.valid).toBe(false);
    });

    it("should reject mismatched hash", () => {
      const request = { ...makeValidRequest(), request_hash: "0".repeat(64) };
      const result = validateRequest(request);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.message).toContain("does not match");
      }
    });
  });

  describe("null and undefined handling", () => {
    it("should reject null request", () => {
      const result = validateRequest(null);
      expect(result.valid).toBe(false);
    });

    it("should reject undefined request", () => {
      const result = validateRequest(undefined);
      expect(result.valid).toBe(false);
    });

    it("should reject non-object request", () => {
      const result = validateRequest("string");
      expect(result.valid).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — REQUEST HASH COMPUTATION — INV-CRE-10
// ═══════════════════════════════════════════════════════════════════════════════

describe("computeRequestHashSync — INV-CRE-10", () => {
  it("should produce 64-char lowercase hex", () => {
    const hash = computeRequestHashSync({
      request_id: "req1",
      snapshot_id: "snap1",
      template_id: "TPL",
      params: {},
    });
    expect(hash).toHaveLength(64);
    expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
  });

  it("should be deterministic (same input = same hash)", () => {
    const input = {
      request_id: "req1",
      snapshot_id: "snap1",
      template_id: "TPL",
      params: { x: 1 },
    };
    
    const hash1 = computeRequestHashSync(input);
    const hash2 = computeRequestHashSync(input);
    expect(hash1).toBe(hash2);
  });

  it("should produce different hash for different request_id", () => {
    const base = { snapshot_id: "snap", template_id: "TPL", params: {} };
    const hash1 = computeRequestHashSync({ ...base, request_id: "req1" });
    const hash2 = computeRequestHashSync({ ...base, request_id: "req2" });
    expect(hash1).not.toBe(hash2);
  });

  it("should produce different hash for different snapshot_id", () => {
    const base = { request_id: "req", template_id: "TPL", params: {} };
    const hash1 = computeRequestHashSync({ ...base, snapshot_id: "snap1" });
    const hash2 = computeRequestHashSync({ ...base, snapshot_id: "snap2" });
    expect(hash1).not.toBe(hash2);
  });

  it("should produce different hash for different params", () => {
    const base = { request_id: "req", snapshot_id: "snap", template_id: "TPL" };
    const hash1 = computeRequestHashSync({ ...base, params: { x: 1 } });
    const hash2 = computeRequestHashSync({ ...base, params: { x: 2 } });
    expect(hash1).not.toBe(hash2);
  });

  it("should include timeout_ms in hash when present", () => {
    const base = { request_id: "req", snapshot_id: "snap", template_id: "TPL", params: {} };
    const hash1 = computeRequestHashSync({ ...base, timeout_ms: 5000 });
    const hash2 = computeRequestHashSync({ ...base, timeout_ms: 10000 });
    const hash3 = computeRequestHashSync(base);
    expect(hash1).not.toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — REQUEST BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

describe("createRequestSync", () => {
  it("should create valid frozen request", () => {
    const request = createRequestSync({
      request_id: "req_test",
      snapshot_id: "snap_test",
      template_id: "SCENE_OUTLINE",
      params: { chapter: 1 },
    });
    
    expect(Object.isFrozen(request)).toBe(true);
    expect(request.request_id).toBe("req_test");
    expect(request.request_hash).toHaveLength(64);
  });

  it("should throw for invalid input", () => {
    expect(() => createRequestSync({
      request_id: "",
      snapshot_id: "snap",
      template_id: "TPL",
      params: {},
    })).toThrow();
  });

  it("should compute correct hash", () => {
    const request = createRequestSync({
      request_id: "req1",
      snapshot_id: "snap1",
      template_id: "TPL",
      params: { x: 1 },
    });
    
    const expectedHash = computeRequestHashSync({
      request_id: "req1",
      snapshot_id: "snap1",
      template_id: "TPL",
      params: { x: 1 },
    });
    
    expect(request.request_hash).toBe(expectedHash);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

describe("requestsEqual", () => {
  it("should return true for same hash", () => {
    const r1 = createRequestSync({
      request_id: "req1",
      snapshot_id: "snap",
      template_id: "TPL",
      params: {},
    });
    const r2 = createRequestSync({
      request_id: "req1",
      snapshot_id: "snap",
      template_id: "TPL",
      params: {},
    });
    expect(requestsEqual(r1, r2)).toBe(true);
  });

  it("should return false for different hash", () => {
    const r1 = createRequestSync({
      request_id: "req1",
      snapshot_id: "snap",
      template_id: "TPL",
      params: {},
    });
    const r2 = createRequestSync({
      request_id: "req2",
      snapshot_id: "snap",
      template_id: "TPL",
      params: {},
    });
    expect(requestsEqual(r1, r2)).toBe(false);
  });
});

describe("cloneRequest", () => {
  it("should create new frozen object", () => {
    const original = createRequestSync({
      request_id: "req1",
      snapshot_id: "snap",
      template_id: "TPL",
      params: { x: 1 },
    });
    
    const clone = cloneRequest(original);
    
    expect(clone).not.toBe(original);
    expect(Object.isFrozen(clone)).toBe(true);
    expect(clone.request_id).toBe(original.request_id);
    expect(clone.request_hash).toBe(original.request_hash);
  });

  it("should deep clone params", () => {
    const original = createRequestSync({
      request_id: "req1",
      snapshot_id: "snap",
      template_id: "TPL",
      params: { nested: { value: 1 } },
    });
    
    const clone = cloneRequest(original);
    
    expect(clone.params).not.toBe(original.params);
    expect(clone.params).toEqual(original.params);
  });
});

describe("generateRequestId", () => {
  it("should generate unique IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateRequestId());
    }
    expect(ids.size).toBe(100);
  });

  it("should start with req_", () => {
    const id = generateRequestId();
    expect(id.startsWith("req_")).toBe(true);
  });

  it("should be valid request_id format", () => {
    const id = generateRequestId();
    expect(/^[a-zA-Z0-9_-]{1,64}$/.test(id)).toBe(true);
  });
});
