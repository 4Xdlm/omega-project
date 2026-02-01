import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { observeGovernanceLog } from "../../src/governance/runtime/observer";

describe("governance/runtime/observer", () => {
  it("reads governance log (read-only) and detects basic patterns", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "omega-obs-"));
    const logPath = path.join(dir, "GOVERNANCE_LOG.ndjson");

    // Seed log with events
    const events = [
      { event_type: "runtime_event", run_id: "RUN_001", verdict: "PASS" },
      { event_type: "runtime_event", run_id: "RUN_002", verdict: "PASS" },
      { event_type: "runtime_event", run_id: "RUN_003", verdict: "FAIL" }
    ];

    fs.writeFileSync(logPath, events.map(e => JSON.stringify(e)).join("\n") + "\n", "utf8");

    const obs = observeGovernanceLog({ logPath });

    expect(obs.totalEvents).toBe(3);
    expect(obs.passCount).toBe(2);
    expect(obs.failCount).toBe(1);
    expect(obs.anomalyDetected).toBe(true); // FAIL is anomaly
  });

  it("returns empty observation when log does not exist (graceful)", () => {
    const obs = observeGovernanceLog({ logPath: "/nonexistent/path.ndjson" });
    expect(obs.totalEvents).toBe(0);
    expect(obs.anomalyDetected).toBe(false);
  });
});
