import fs from "node:fs";
import path from "node:path";

type RuntimeEvent = Record<string, unknown>;

type EmitPaths = {
  runtimeEventNdjson: string;
  governanceLogNdjson: string;
};

function stableStringify(obj: unknown): string {
  const seen = new WeakSet<object>();

  const normalize = (v: unknown): unknown => {
    if (v === null) return null;
    if (typeof v !== "object") return v;
    if (Array.isArray(v)) return v.map(normalize);

    const o = v as Record<string, unknown>;
    if (seen.has(o)) throw new Error("stableStringify: circular reference");
    seen.add(o);

    const keys = Object.keys(o).sort();
    const out: Record<string, unknown> = {};
    for (const k of keys) out[k] = normalize(o[k]);
    return out;
  };

  return JSON.stringify(normalize(obj));
}

function ensureDir(filePath: string): void {
  const d = path.dirname(filePath);
  fs.mkdirSync(d, { recursive: true });
}

export function emitRuntimeEvent(args: { event: RuntimeEvent; paths: EmitPaths }): void {
  const { event, paths: p } = args;

  // Hard guard: write ONLY to provided paths (governance outputs)
  if (!p.runtimeEventNdjson || !p.governanceLogNdjson) throw new Error("emitRuntimeEvent: missing paths");

  ensureDir(p.runtimeEventNdjson);
  ensureDir(p.governanceLogNdjson);

  const line = stableStringify(event) + "\n";

  // Append-only semantics
  fs.appendFileSync(p.runtimeEventNdjson, line, "utf8");
  fs.appendFileSync(p.governanceLogNdjson, line, "utf8");
}
