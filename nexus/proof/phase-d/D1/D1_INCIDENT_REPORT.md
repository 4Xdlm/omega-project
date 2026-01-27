# D1 Incident Report — ESM/CJS Gate Script

- Symptom: node gate failed with "require is not defined in ES module scope"
- Root cause: repository package.json sets "type": "module" → .js treated as ESM
- Fix: rename gate script to .cjs and re-run
- Evidence: nexus/proof/phase-d/D1/D1_MEMORY_GATES_REPORT.md + D1_HASHES.json
