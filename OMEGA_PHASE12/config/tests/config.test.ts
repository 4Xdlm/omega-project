// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA PROJECT — CONFIGURATION TESTS
// Phase 12 — Industrial Deployment
// Standard: NASA-Grade L4 / DO-178C Level A
// ═══════════════════════════════════════════════════════════════════════════════
//
// TEST COUNT: 17 tests
//
// INVARIANTS TESTED:
// - INV-CFG-01: Validation stricte au démarrage (tests 1-4)
// - INV-CFG-02: Config invalide = refus démarrage (tests 5-12)
// - INV-CFG-03: Zéro valeur par défaut implicite (tests 13-14)
// - INV-CFG-04: Config Object.freeze() (tests 15-16)
// - INV-SAFE-01: SAFE MODE true par défaut (test 17)
//
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { 
  validateOmegaConfig, 
  REQUIRED_FIELDS,
  VALID_VALUES,
  type OmegaConfig 
} from "../omega.config.schema.js";
import { 
  loadOmegaConfigFromString, 
  OmegaConfigError,
  CONFIG_ERROR_CODES,
  isConfigError
} from "../omega.config.loader.js";

// ═══════════════════════════════════════════════════════════════════════════════
// VALID CONFIG FIXTURE
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_CONFIG = {
  version: "v3.12.0",
  environment: "dev" as const,
  safe_mode: true,
  audit: {
    enable_forensic_export: true,
    log_level: "INFO" as const,
    retention_days: 90,
  },
  limits: {
    max_input_bytes: 10485760,
    max_run_ms: 30000,
    max_concurrent_ops: 4,
  },
  deployment: {
    deployed_at: "2026-01-04T12:00:00.000Z",
    deployed_by: "omega-deploy-script",
    commit_hash: "bf7fc9d",
  },
};

/**
 * Helper to create config with overrides
 */
function makeConfig(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const base = JSON.parse(JSON.stringify(VALID_CONFIG));
  
  for (const [key, value] of Object.entries(overrides)) {
    if (key.includes(".")) {
      const [parent, child] = key.split(".");
      if (value === undefined) {
        delete base[parent][child];
      } else {
        base[parent][child] = value;
      }
    } else {
      if (value === undefined) {
        delete base[key];
      } else {
        base[key] = value;
      }
    }
  }
  
  return base;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: INV-CFG-01 — Validation stricte au démarrage
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-CFG-01: Validation stricte au démarrage", () => {
  
  // Test 1: Valid config passes validation
  it("accepts fully valid configuration", () => {
    const result = validateOmegaConfig(VALID_CONFIG);
    
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.version).toBe("v3.12.0");
      expect(result.config.environment).toBe("dev");
      expect(result.config.safe_mode).toBe(true);
    }
  });
  
  // Test 2: Validates version format (semver)
  it("validates version format as semver", () => {
    const validVersions = ["v1.0.0", "1.0.0", "v3.12.0-beta", "2.1.3-alpha.1"];
    const invalidVersions = ["1.0", "version1", "v1", ""];
    
    for (const v of validVersions) {
      const result = validateOmegaConfig(makeConfig({ version: v }));
      expect(result.ok).toBe(true);
    }
    
    for (const v of invalidVersions) {
      const result = validateOmegaConfig(makeConfig({ version: v }));
      expect(result.ok).toBe(false);
    }
  });
  
  // Test 3: Validates environment values
  it("validates environment against allowed values", () => {
    for (const env of VALID_VALUES.environment) {
      const result = validateOmegaConfig(makeConfig({ environment: env }));
      expect(result.ok).toBe(true);
    }
    
    const invalidEnvs = ["production", "test", "local", "PROD", ""];
    for (const env of invalidEnvs) {
      const result = validateOmegaConfig(makeConfig({ environment: env }));
      expect(result.ok).toBe(false);
    }
  });
  
  // Test 4: Validates ISO 8601 date format
  it("validates deployment.deployed_at as ISO 8601", () => {
    const validDates = [
      "2026-01-04T12:00:00.000Z",
      "2026-01-04T00:00:00Z",
      "2025-12-31T23:59:59.999Z",
    ];
    
    for (const date of validDates) {
      const result = validateOmegaConfig(makeConfig({ "deployment.deployed_at": date }));
      expect(result.ok).toBe(true);
    }
    
    const invalidDates = [
      "2026-01-04",          // Missing time
      "01/04/2026",          // Wrong format
      "not-a-date",          // Invalid
      "",                    // Empty
    ];
    
    for (const date of invalidDates) {
      const result = validateOmegaConfig(makeConfig({ "deployment.deployed_at": date }));
      expect(result.ok).toBe(false);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: INV-CFG-02 — Config invalide = refus démarrage
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-CFG-02: Config invalide = refus démarrage", () => {
  
  // Test 5: Rejects config without version
  it("rejects config without version", () => {
    const result = validateOmegaConfig(makeConfig({ version: undefined }));
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some(e => e.includes("version"))).toBe(true);
    }
  });
  
  // Test 6: Rejects config without environment
  it("rejects config without environment", () => {
    const result = validateOmegaConfig(makeConfig({ environment: undefined }));
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some(e => e.includes("environment"))).toBe(true);
    }
  });
  
  // Test 7: Rejects invalid log_level
  it("rejects invalid audit.log_level", () => {
    const result = validateOmegaConfig(makeConfig({ "audit.log_level": "VERBOSE" }));
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some(e => e.includes("log_level"))).toBe(true);
    }
  });
  
  // Test 8: Rejects negative max_input_bytes
  it("rejects negative limits.max_input_bytes", () => {
    const result = validateOmegaConfig(makeConfig({ "limits.max_input_bytes": -1 }));
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some(e => e.includes("max_input_bytes"))).toBe(true);
    }
  });
  
  // Test 9: Rejects max_run_ms < 100
  it("rejects limits.max_run_ms < 100", () => {
    const result = validateOmegaConfig(makeConfig({ "limits.max_run_ms": 50 }));
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some(e => e.includes("max_run_ms"))).toBe(true);
    }
  });
  
  // Test 10: Rejects missing safe_mode
  it("rejects config without safe_mode", () => {
    const result = validateOmegaConfig(makeConfig({ safe_mode: undefined }));
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some(e => e.includes("safe_mode"))).toBe(true);
    }
  });
  
  // Test 11: Rejects invalid commit_hash format
  it("rejects invalid deployment.commit_hash format", () => {
    const result = validateOmegaConfig(makeConfig({ "deployment.commit_hash": "not-a-hash!" }));
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some(e => e.includes("commit_hash"))).toBe(true);
    }
  });
  
  // Test 12: Throws OmegaConfigError on invalid JSON string
  it("throws OmegaConfigError on invalid JSON", () => {
    expect(() => {
      loadOmegaConfigFromString("{ invalid json }");
    }).toThrow(OmegaConfigError);
    
    try {
      loadOmegaConfigFromString("{ invalid json }");
    } catch (err) {
      expect(isConfigError(err)).toBe(true);
      if (isConfigError(err)) {
        expect(err.code).toBe(CONFIG_ERROR_CODES.JSON_PARSE_ERROR);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: INV-CFG-03 — Zéro valeur par défaut implicite
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-CFG-03: Zéro valeur par défaut implicite", () => {
  
  // Test 13: Schema defines all required fields
  it("REQUIRED_FIELDS contains all necessary fields", () => {
    expect(REQUIRED_FIELDS.length).toBe(12);
    expect(REQUIRED_FIELDS).toContain("version");
    expect(REQUIRED_FIELDS).toContain("environment");
    expect(REQUIRED_FIELDS).toContain("safe_mode");
    expect(REQUIRED_FIELDS).toContain("audit.enable_forensic_export");
    expect(REQUIRED_FIELDS).toContain("audit.log_level");
    expect(REQUIRED_FIELDS).toContain("audit.retention_days");
    expect(REQUIRED_FIELDS).toContain("limits.max_input_bytes");
    expect(REQUIRED_FIELDS).toContain("limits.max_run_ms");
    expect(REQUIRED_FIELDS).toContain("limits.max_concurrent_ops");
    expect(REQUIRED_FIELDS).toContain("deployment.deployed_at");
    expect(REQUIRED_FIELDS).toContain("deployment.deployed_by");
    expect(REQUIRED_FIELDS).toContain("deployment.commit_hash");
  });
  
  // Test 14: Empty config is rejected (no defaults applied)
  it("rejects empty object - no defaults applied", () => {
    const result = validateOmegaConfig({});
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // Should have errors for all missing fields
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: INV-CFG-04 — Config Object.freeze()
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-CFG-04: Config Object.freeze()", () => {
  
  // Test 15: Returned config is frozen
  it("returns frozen config object", () => {
    const result = validateOmegaConfig(VALID_CONFIG);
    
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.isFrozen(result.config)).toBe(true);
      expect(Object.isFrozen(result.config.audit)).toBe(true);
      expect(Object.isFrozen(result.config.limits)).toBe(true);
      expect(Object.isFrozen(result.config.deployment)).toBe(true);
    }
  });
  
  // Test 16: Mutation attempt fails silently (frozen)
  it("prevents mutation after load", () => {
    const result = validateOmegaConfig(VALID_CONFIG);
    
    expect(result.ok).toBe(true);
    if (result.ok) {
      const config = result.config as OmegaConfig;
      
      // These should silently fail or throw in strict mode
      expect(() => {
        (config as any).version = "hacked";
      }).toThrow();
      
      expect(() => {
        (config.audit as any).log_level = "HACKED";
      }).toThrow();
      
      // Verify values unchanged
      expect(config.version).toBe("v3.12.0");
      expect(config.audit.log_level).toBe("INFO");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: INV-SAFE-01 — SAFE MODE true par défaut
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-SAFE-01: SAFE MODE true par défaut", () => {
  
  // Test 17: Rejects config where safe_mode !== true
  it("rejects config where safe_mode is false", () => {
    const result = validateOmegaConfig(makeConfig({ safe_mode: false }));
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some(e => e.includes("safe_mode"))).toBe(true);
      expect(result.errors.some(e => e.includes("MUST be true"))).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADDITIONAL ROBUSTNESS TESTS (CRLF/Encoding)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Robustness: Encoding and Line Endings", () => {
  
  it("handles CRLF line endings correctly", () => {
    const jsonWithCRLF = JSON.stringify(VALID_CONFIG, null, 2).replace(/\n/g, "\r\n");
    
    const config = loadOmegaConfigFromString(jsonWithCRLF);
    expect(config.version).toBe("v3.12.0");
  });
  
  it("handles mixed line endings correctly", () => {
    const jsonMixed = JSON.stringify(VALID_CONFIG, null, 2)
      .replace(/\n/g, "\r\n")
      .replace(/\r\n/g, (_, i) => i % 2 === 0 ? "\r\n" : "\n");
    
    const config = loadOmegaConfigFromString(jsonMixed);
    expect(config.version).toBe("v3.12.0");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR STRUCTURE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Error Structure: OmegaConfigError", () => {
  
  it("contains all required error fields for forensic audit", () => {
    try {
      loadOmegaConfigFromString("invalid");
    } catch (err) {
      expect(isConfigError(err)).toBe(true);
      if (isConfigError(err)) {
        expect(err.code).toBeDefined();
        expect(err.path).toBeDefined();
        expect(err.timestamp).toBeDefined();
        expect(err.details).toBeDefined();
        expect(typeof err.toLogEntry()).toBe("string");
      }
    }
  });
});
