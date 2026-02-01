import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { emitRuntimeEvent } from "../../src/governance/runtime/event_emitter";
import { observeGovernanceLog } from "../../src/governance/runtime/observer";

describe("governance/runtime/integration", () => {
  it("end-to-end: emit → log → observe → validate schema compliance", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "omega-e2e-"));
    const eventPath = path.join(dir, "RUNTIME_EVENT.ndjson");
    const logPath = path.join(dir, "GOVERNANCE_LOG.ndjson");

    // Emit multiple events
    const events = [
      {
        event_type: "runtime_event",
        schema_version: "1.0",
        run_id: "RUN_E2E_001",
        run_ref: { commit: "9ed7ab9d", tag: "phase-d2-observer-sealed" },
        inputs_sha256: "SHA256_IN_001",
        outputs_sha256: "SHA256_OUT_001",
        verdict: "PASS",
        observed_at: new Date().toISOString()
      },
      {
        event_type: "runtime_event",
        schema_version: "1.0",
        run_id: "RUN_E2E_002",
        run_ref: { commit: "9ed7ab9d", tag: "phase-d2-observer-sealed" },
        inputs_sha256: "SHA256_IN_002",
        outputs_sha256: "SHA256_OUT_002",
        verdict: "PASS",
        observed_at: new Date().toISOString()
      },
      {
        event_type: "runtime_event",
        schema_version: "1.0",
        run_id: "RUN_E2E_003",
        run_ref: { commit: "9ed7ab9d", tag: "phase-d2-observer-sealed" },
        inputs_sha256: "SHA256_IN_003",
        outputs_sha256: "SHA256_OUT_003",
        verdict: "FAIL",
        observed_at: new Date().toISOString()
      }
    ];

    events.forEach(event => {
      emitRuntimeEvent({
        event,
        paths: { runtimeEventNdjson: eventPath, governanceLogNdjson: logPath }
      });
    });

    // Observe accumulated log
    const obs = observeGovernanceLog({ logPath });

    // Validate observations
    expect(obs.totalEvents).toBe(3);
    expect(obs.passCount).toBe(2);
    expect(obs.failCount).toBe(1);
    expect(obs.anomalyDetected).toBe(true);

    // Validate append-only behavior (log should have all 3 events)
    const logContent = fs.readFileSync(logPath, "utf8");
    const logLines = logContent.split("\n").filter(Boolean);
    expect(logLines.length).toBe(3);

    // Validate schema compliance (basic structure check)
    logLines.forEach(line => {
      const parsed = JSON.parse(line);
      expect(parsed.event_type).toBe("runtime_event");
      expect(parsed.schema_version).toBe("1.0");
      expect(parsed.run_id).toMatch(/^RUN_E2E_\d{3}$/);
      expect(parsed.verdict).toMatch(/^(PASS|FAIL)$/);
    });

    // Validate RUNTIME_EVENT.ndjson also has all events
    const eventContent = fs.readFileSync(eventPath, "utf8");
    const eventLines = eventContent.split("\n").filter(Boolean);
    expect(eventLines.length).toBe(3);
  });

  it("validates append-only: existing log is preserved", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "omega-append-"));
    const logPath = path.join(dir, "GOVERNANCE_LOG.ndjson");

    // Pre-seed log
    const seed = { event_type: "seed", run_id: "SEED_000", verdict: "PASS" };
    fs.writeFileSync(logPath, JSON.stringify(seed) + "\n", "utf8");

    // Emit new event
    const newEvent = {
      event_type: "runtime_event",
      schema_version: "1.0",
      run_id: "RUN_APPEND_001",
      run_ref: { commit: "9ed7ab9d" },
      inputs_sha256: "SHA256_APPEND",
      outputs_sha256: "SHA256_APPEND",
      verdict: "PASS",
      observed_at: new Date().toISOString()
    };

    emitRuntimeEvent({
      event: newEvent,
      paths: { 
        runtimeEventNdjson: path.join(dir, "RUNTIME_EVENT.ndjson"),
        governanceLogNdjson: logPath 
      }
    });

    // Validate both events present
    const obs = observeGovernanceLog({ logPath });
    expect(obs.totalEvents).toBe(2);

    const lines = fs.readFileSync(logPath, "utf8").split("\n").filter(Boolean);
    expect(lines.length).toBe(2);
    expect(JSON.parse(lines[0]).run_id).toBe("SEED_000");
    expect(JSON.parse(lines[1]).run_id).toBe("RUN_APPEND_001");
  });
});
