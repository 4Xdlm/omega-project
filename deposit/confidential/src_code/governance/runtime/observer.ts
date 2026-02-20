import fs from "node:fs";

type ObservationResult = {
  totalEvents: number;
  passCount: number;
  failCount: number;
  anomalyDetected: boolean;
};

export function observeGovernanceLog(args: { logPath: string }): ObservationResult {
  const { logPath } = args;

  // Graceful handling: if log does not exist, return empty observation
  if (!fs.existsSync(logPath)) {
    return { totalEvents: 0, passCount: 0, failCount: 0, anomalyDetected: false };
  }

  const content = fs.readFileSync(logPath, "utf8");
  const lines = content.split("\n").filter(Boolean);

  let passCount = 0;
  let failCount = 0;

  for (const line of lines) {
    try {
      const event = JSON.parse(line);
      if (event.verdict === "PASS") passCount++;
      if (event.verdict === "FAIL") failCount++;
    } catch {
      // Ignore malformed lines (read-only, no intervention)
    }
  }

  const totalEvents = lines.length;
  const anomalyDetected = failCount > 0;

  return { totalEvents, passCount, failCount, anomalyDetected };
}
