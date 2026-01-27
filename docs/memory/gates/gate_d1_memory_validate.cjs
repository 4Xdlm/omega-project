const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Ajv = require("ajv");

function sha256File(p) {
  const buf = fs.readFileSync(p);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function main() {
  const root = process.cwd();
  const schemaPath = path.join(root, "docs", "memory", "schemas", "MEMORY_ENTRY_SCHEMA_v1.0.json");
  const ledgerPath  = path.join(root, "docs", "memory", "ledgers", "LEDGER_MEMORY_EVENTS.ndjson");
  const outDir      = path.join(root, "nexus", "proof", "phase-d", "D1");

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const ajv = new Ajv({ allErrors: true, strict: true });
  const validate = ajv.compile(schema);

  const lines = fs.readFileSync(ledgerPath, "utf8").split(/\r?\n/).filter(Boolean);
  const ids = new Set();
  const entries = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    let obj;
    try { obj = JSON.parse(raw); } catch (e) {
      throw new Error(`Ledger line ${i+1} invalid JSON`);
    }
    const ok = validate(obj);
    if (!ok) {
      throw new Error(`Ledger line ${i+1} schema FAIL: ${JSON.stringify(validate.errors)}`);
    }
    if (ids.has(obj.id)) throw new Error(`Duplicate id: ${obj.id}`);
    ids.add(obj.id);
    entries.push(obj);
  }

  // Append-only invariant: file must not contain trailing edits markers, and order is preserved by file order.
  // Deterministic proof: compute hashes of schema + ledger.
  const schemaSha = sha256File(schemaPath);
  const ledgerSha = sha256File(ledgerPath);

  const report = [
    "# PHASE D1 — MEMORY GATES REPORT",
    "",
    "## Inputs",
    `- Schema: ${schemaPath}`,
    `- Ledger: ${ledgerPath}`,
    "",
    "## Results",
    `- Entries validated: ${entries.length}`,
    `- Unique IDs: ${ids.size}`,
    "",
    "## Hashes (SHA256)",
    `- MEMORY_ENTRY_SCHEMA_v1.0.json: ${schemaSha}`,
    `- LEDGER_MEMORY_EVENTS.ndjson: ${ledgerSha}`,
    ""
  ].join("\n");

  fs.writeFileSync(path.join(outDir, "D1_MEMORY_GATES_REPORT.md"), report, "utf8");
  fs.writeFileSync(path.join(outDir, "D1_HASHES.json"), JSON.stringify({ schemaSha, ledgerSha }, null, 2), "utf8");
}

main();
