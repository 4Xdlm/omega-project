import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { emitRuntimeEvent } from "../../src/governance/runtime/event_emitter";

function readLines(p: string): string[] {
  if (!fs.existsSync(p)) return [];
  const s = fs.readFileSync(p, "utf8");
  return s.split("\n").filter(Boolean);
}

describe("governance/runtime/event_emitter", () => {
  it("appends a runtime_event to governance log (append-only) and writes event line", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "omega-gov-"));
    const outEvent = path.join(dir, "RUNTIME_EVENT.ndjson");
    const outLog = path.join(dir, "GOVERNANCE_LOG.ndjson");

    // Pre-seed log (append-only behavior must preserve previous lines)
    fs.writeFileSync(outLog, JSON.stringify({ seed: true }) + "\n", "utf8");

    const run = {
      event_type: "runtime_event",
      schema_version: "1.0",
      run_id: "RUN_TEST_0001",
      run_ref: { commit: "057157ab", tag: "roadmap-b-v1.0-sealed" },
      inputs_sha256: "SHA256_INPUTS_PLACEHOLDER",
      outputs_sha256: "SHA256_OUTPUTS_PLACEHOLDER",
      verdict: "PASS",
      observed_at: "ISO8601_PLACEHOLDER"
    } as const;

    emitRuntimeEvent({
      event: run,
      paths: { runtimeEventNdjson: outEvent, governanceLogNdjson: outLog }
    });

    const logLines = readLines(outLog);
    const eventLines = readLines(outEvent);

    expect(logLines.length).toBe(2);
    expect(JSON.parse(logLines[0]).seed).toBe(true);

    const appended = JSON.parse(logLines[1]);
    expect(appended.event_type).toBe("runtime_event");
    expect(appended.run_id).toBe("RUN_TEST_0001");

    expect(eventLines.length).toBe(1);
    expect(JSON.parse(eventLines[0]).run_id).toBe("RUN_TEST_0001");
  });
});
