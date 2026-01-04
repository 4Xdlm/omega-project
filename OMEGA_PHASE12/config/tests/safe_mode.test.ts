// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA PROJECT — SAFE MODE TESTS
// Phase 12 — Industrial Deployment
// Standard: NASA-Grade L4 / DO-178C Level A
// ═══════════════════════════════════════════════════════════════════════════════
//
// TEST COUNT: 14 tests
//
// INVARIANTS TESTED:
// - INV-SAFE-02: 8 actions critiques refusées en SAFE MODE (tests 1-8)
// - INV-SAFE-03: Refus journalisé avec champs requis (tests 9-14)
//
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from "vitest";
import {
  SafeModeController,
  createSafeModeController,
  HITL_ACTIONS,
  FORBIDDEN_ACTIONS,
  validateRefusalLog,
  type HITLAction,
  type RefusalLogEntry,
} from "../safe_mode.js";

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISTIC PROVIDERS FOR TESTING
// ═══════════════════════════════════════════════════════════════════════════════

const FIXED_TIMESTAMP = "2026-01-04T12:00:00.000Z";
const FIXED_UUID = "test-uuid-12345678";

const fixedTimeProvider = () => FIXED_TIMESTAMP;
let uuidCounter = 0;
const sequentialUuidProvider = () => `trace-${++uuidCounter}`;

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: INV-SAFE-02 — 8 actions critiques refusées en SAFE MODE
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-SAFE-02: 8 actions critiques refusées en SAFE MODE", () => {
  let controller: SafeModeController;

  beforeEach(() => {
    uuidCounter = 0;
    controller = new SafeModeController(true, fixedTimeProvider, sequentialUuidProvider);
  });

  // Test 1: DELETE_PROJECT refused
  it("refuses DELETE_PROJECT in SAFE MODE", () => {
    const result = controller.checkAction("DELETE_PROJECT", "ADMIN");

    expect(result.allowed).toBe(false);
    expect(result.status).toBe("BLOCKED_SAFE_MODE");
    expect(result.reason).toContain("SAFE MODE");
  });

  // Test 2: DELETE_RUN refused
  it("refuses DELETE_RUN in SAFE MODE", () => {
    const result = controller.checkAction("DELETE_RUN", "ADMIN");

    expect(result.allowed).toBe(false);
    expect(result.status).toBe("BLOCKED_SAFE_MODE");
  });

  // Test 3: OVERRIDE_INVARIANT refused
  it("refuses OVERRIDE_INVARIANT in SAFE MODE", () => {
    const result = controller.checkAction("OVERRIDE_INVARIANT", "ARCHITECT");

    expect(result.allowed).toBe(false);
    expect(result.status).toBe("BLOCKED_SAFE_MODE");
  });

  // Test 4: MODIFY_CANON refused
  it("refuses MODIFY_CANON in SAFE MODE", () => {
    const result = controller.checkAction("MODIFY_CANON", "ARCHITECT");

    expect(result.allowed).toBe(false);
    expect(result.status).toBe("BLOCKED_SAFE_MODE");
  });

  // Test 5: BYPASS_TRUTH_GATE refused
  it("refuses BYPASS_TRUTH_GATE in SAFE MODE", () => {
    const result = controller.checkAction("BYPASS_TRUTH_GATE", "ARCHITECT");

    expect(result.allowed).toBe(false);
    expect(result.status).toBe("BLOCKED_SAFE_MODE");
  });

  // Test 6: FORCE_VALIDATION refused
  it("refuses FORCE_VALIDATION in SAFE MODE", () => {
    const result = controller.checkAction("FORCE_VALIDATION", "ADMIN");

    expect(result.allowed).toBe(false);
    expect(result.status).toBe("BLOCKED_SAFE_MODE");
  });

  // Test 7: EXPORT_SENSITIVE refused
  it("refuses EXPORT_SENSITIVE in SAFE MODE", () => {
    const result = controller.checkAction("EXPORT_SENSITIVE", "ADMIN");

    expect(result.allowed).toBe(false);
    expect(result.status).toBe("BLOCKED_SAFE_MODE");
  });

  // Test 8: MODIFY_GOVERNANCE refused
  it("refuses MODIFY_GOVERNANCE in SAFE MODE", () => {
    const result = controller.checkAction("MODIFY_GOVERNANCE", "ARCHITECT");

    expect(result.allowed).toBe(false);
    expect(result.status).toBe("BLOCKED_SAFE_MODE");
  });

  // Additional: All 8 HITL actions in one test
  it("refuses ALL 8 HITL actions in SAFE MODE", () => {
    for (const action of HITL_ACTIONS) {
      const result = controller.checkAction(action, "ARCHITECT");
      expect(result.allowed).toBe(false);
      expect(result.status).toBe("BLOCKED_SAFE_MODE");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: INV-SAFE-03 — Refus journalisé
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-SAFE-03: Refus journalisé (action, role, reason, trace_id)", () => {
  let controller: SafeModeController;

  beforeEach(() => {
    uuidCounter = 0;
    controller = new SafeModeController(true, fixedTimeProvider, sequentialUuidProvider);
  });

  // Test 9: Refusal log contains trace_id
  it("refusal log contains trace_id", () => {
    controller.checkAction("DELETE_PROJECT", "ADMIN");
    const logs = controller.refusalLogs;

    expect(logs.length).toBe(1);
    expect(logs[0].trace_id).toBe("trace-1");
  });

  // Test 10: Refusal log contains action
  it("refusal log contains action name", () => {
    controller.checkAction("MODIFY_CANON", "ARCHITECT");
    const logs = controller.refusalLogs;

    expect(logs[0].action).toBe("MODIFY_CANON");
  });

  // Test 11: Refusal log contains role
  it("refusal log contains role", () => {
    controller.checkAction("DELETE_RUN", "USER");
    const logs = controller.refusalLogs;

    expect(logs[0].role).toBe("USER");
  });

  // Test 12: Refusal log contains reason
  it("refusal log contains reason", () => {
    controller.checkAction("EXPORT_SENSITIVE", "ADMIN");
    const logs = controller.refusalLogs;

    expect(logs[0].reason).toBeDefined();
    expect(logs[0].reason.length).toBeGreaterThan(0);
  });

  // Test 13: Refusal log contains all required fields
  it("refusal log contains ALL required fields (action, role, reason, trace_id, timestamp, status, safe_mode_active)", () => {
    controller.checkAction("DELETE_PROJECT", "ADMIN", { source: "test" });
    const log = controller.refusalLogs[0];

    expect(validateRefusalLog(log)).toBe(true);
    expect(log.trace_id).toBeDefined();
    expect(log.timestamp).toBe(FIXED_TIMESTAMP);
    expect(log.action).toBe("DELETE_PROJECT");
    expect(log.role).toBe("ADMIN");
    expect(log.reason).toBeDefined();
    expect(log.status).toBe("BLOCKED_SAFE_MODE");
    expect(log.safe_mode_active).toBe(true);
  });

  // Test 14: Multiple refusals are all logged
  it("logs all refusals sequentially", () => {
    controller.checkAction("DELETE_PROJECT", "ADMIN");
    controller.checkAction("DELETE_RUN", "USER");
    controller.checkAction("MODIFY_CANON", "ARCHITECT");

    const logs = controller.refusalLogs;
    expect(logs.length).toBe(3);
    expect(logs[0].trace_id).toBe("trace-1");
    expect(logs[1].trace_id).toBe("trace-2");
    expect(logs[2].trace_id).toBe("trace-3");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: Forbidden Actions (INV-GOV-04 integration)
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-GOV-04: Forbidden actions ALWAYS blocked", () => {
  it("blocks forbidden actions even when SAFE MODE is disabled", () => {
    const controller = new SafeModeController(false); // SAFE MODE OFF

    for (const action of FORBIDDEN_ACTIONS) {
      const result = controller.checkAction(action, "ARCHITECT");
      expect(result.allowed).toBe(false);
      expect(result.status).toBe("BLOCKED_FORBIDDEN");
    }
  });

  it("blocks forbidden actions with SAFE MODE enabled", () => {
    const controller = new SafeModeController(true);

    for (const action of FORBIDDEN_ACTIONS) {
      const result = controller.checkAction(action, "ARCHITECT");
      expect(result.allowed).toBe(false);
      expect(result.status).toBe("BLOCKED_FORBIDDEN");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: SAFE MODE disabled allows HITL actions
// ═══════════════════════════════════════════════════════════════════════════════

describe("SAFE MODE disabled: HITL actions allowed", () => {
  it("allows HITL actions when SAFE MODE is disabled", () => {
    const controller = new SafeModeController(false); // SAFE MODE OFF

    for (const action of HITL_ACTIONS) {
      const result = controller.checkAction(action, "ARCHITECT");
      expect(result.allowed).toBe(true);
      expect(result.status).toBe("ALLOWED");
    }
  });

  it("does not log when action is allowed", () => {
    const controller = new SafeModeController(false);

    controller.checkAction("DELETE_PROJECT", "ARCHITECT");
    expect(controller.refusalLogs.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: Forensic Export (INV-TRACE-05 integration)
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-TRACE-05: Forensic export", () => {
  it("exports refusal logs as JSON", () => {
    const controller = new SafeModeController(true, fixedTimeProvider, sequentialUuidProvider);

    controller.checkAction("DELETE_PROJECT", "ADMIN");
    controller.checkAction("MODIFY_CANON", "ARCHITECT");

    const exported = controller.exportRefusalLogs();
    const parsed = JSON.parse(exported);

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(2);
    expect(parsed[0].action).toBe("DELETE_PROJECT");
    expect(parsed[1].action).toBe("MODIFY_CANON");
  });

  it("provides refusal count by action", () => {
    const controller = new SafeModeController(true);

    controller.checkAction("DELETE_PROJECT", "ADMIN");
    controller.checkAction("DELETE_PROJECT", "USER");
    controller.checkAction("MODIFY_CANON", "ARCHITECT");

    const counts = controller.getRefusalCountByAction();
    expect(counts["DELETE_PROJECT"]).toBe(2);
    expect(counts["MODIFY_CANON"]).toBe(1);
  });

  it("provides refusal count by status", () => {
    const controller = new SafeModeController(true);

    controller.checkAction("DELETE_PROJECT", "ADMIN"); // BLOCKED_SAFE_MODE
    controller.checkAction("DISABLE_LOGGING", "ARCHITECT"); // BLOCKED_FORBIDDEN

    const counts = controller.getRefusalCountByStatus();
    expect(counts["BLOCKED_SAFE_MODE"]).toBe(1);
    expect(counts["BLOCKED_FORBIDDEN"]).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: Immutability (INV-TRACE-02 integration)
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-TRACE-02: Logs immutability", () => {
  it("refusal logs are frozen", () => {
    const controller = new SafeModeController(true, fixedTimeProvider, sequentialUuidProvider);

    controller.checkAction("DELETE_PROJECT", "ADMIN");
    const logs = controller.refusalLogs;

    expect(Object.isFrozen(logs)).toBe(true);
  });

  it("individual log entries are frozen", () => {
    const controller = new SafeModeController(true, fixedTimeProvider, sequentialUuidProvider);

    const result = controller.checkAction("DELETE_PROJECT", "ADMIN");

    expect(result.refusal_log).toBeDefined();
    if (result.refusal_log) {
      expect(Object.isFrozen(result.refusal_log)).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: Factory function
// ═══════════════════════════════════════════════════════════════════════════════

describe("createSafeModeController factory", () => {
  it("creates controller with SAFE MODE enabled by default", () => {
    const controller = createSafeModeController();
    expect(controller.isSafeModeEnabled).toBe(true);
  });
});
