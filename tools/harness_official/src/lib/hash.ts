import { createHash } from "node:crypto";

export function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function canonicalJson(obj: unknown): string {
  return JSON.stringify(sortKeys(obj), null, 2);
}

function sortKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sortKeys);
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
    sorted[key] = sortKeys((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}
