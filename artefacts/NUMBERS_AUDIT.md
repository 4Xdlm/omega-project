# OMEGA NUMBERS AUDIT
# Generated: 2026-01-24
# By: Claude EXECUTOR OMEGA

---

## PROVEN Numbers (with reference)

| Number | Meaning | Proof File | Command |
|--------|---------|------------|---------|
| 368 | Tests GENESIS FORGE | scan_forensique/tests/test_output.txt | `npm test` |
| 971 | Tests OMEGA Core | PHASE17_CERTIFICATION_FINAL.md | `npm test` |
| 27 | Date.now() occurrences | patch_scan/PATCH2_DATENOW.md | `grep -rn "Date.now()"` |
| 0 | Date.now() affecting output | patch_scan/PATCH2_DATENOW.md | Classification |
| 56 | Build files in dist/ | patch_scan/determinism_artefacts/ | `ls dist/ | wc -l` |
| 0 | Critical vulnerabilities | patch_scan/supply_chain/npm_audit.json | `npm audit --json` |
| 0 | High vulnerabilities | patch_scan/supply_chain/npm_audit.json | `npm audit --json` |
| 5 | Moderate vulnerabilities (dev) | patch_scan/supply_chain/npm_audit.json | `npm audit --json` |
| 8 | Classes (AST) | scan_forensique/ast/symbols.txt | AST extraction |
| 27 | Interfaces (AST) | scan_forensique/ast/symbols.txt | AST extraction |
| 52 | Functions (AST) | scan_forensique/ast/symbols.txt | AST extraction |
| 6 | Types (AST) | scan_forensique/ast/symbols.txt | AST extraction |
| 14 | Emotion dimensions | src/genesis/types/index.ts:17 | Code definition |
| 3 | Production dependencies | patch_scan/supply_chain/sbom.json | `npm ls --prod` |
| 4 | Dev dependencies | patch_scan/supply_chain/sbom.json | `npm ls --dev` |
| 0 | any type usages | patch_scan/PATCH4_AUDIT_LOG.md | `grep -rn ": any"` |
| 0 | @ts-ignore comments | patch_scan/PATCH4_AUDIT_LOG.md | `grep -rn "@ts-ignore"` |
| 0 | TODO/FIXME comments | patch_scan/PATCH4_AUDIT_LOG.md | `grep -rn "TODO\|FIXME"` |
| 0 | Secrets detected | patch_scan/PATCH4_AUDIT_LOG.md | `grep -rn "AKIA\|sk-\|ghp_"` |
| 13 | PROUVE modules | DOC_CODE_MATRIX.json | Module count |

---

## CONFIGURABLE Symbols (not magic numbers)

| Symbol | Meaning | Domain | Default |
|--------|---------|--------|---------|
| tau | J1 acceptance threshold | R+ | Domain-specific |
| N | Emotion space dimension | N | 14 (fixed by design) |
| TTL | Cache time-to-live | ms | CONFIGURABLE |
| T_max | Generation timeout | ms | CONFIGURABLE |
| seed | RNG seed for MockProvider | N | Injected parameter |
| maxTokens | Generation limit | N | Request parameter |
| temperature | LLM temperature | [0, 2] | Request parameter |

---

## UNPROVEN Numbers (to verify or symbolize)

| Number | Context | Status | Action |
|--------|---------|--------|--------|
| "74+" | Invariants total | APPROXIMATIF | Count exactly or use "N invariants" |
| "100%" | Coverage claim | UNPROVEN | Run coverage tool |
| "<5%" | False positive target | TARGET | Use "tau_fp (objective)" |

---

## Verification Commands

```powershell
# Test count
npm test 2>&1 | Select-String "passed"

# Date.now count
Select-String -Path src/**/*.ts -Pattern "Date.now\(\)" | Measure-Object

# Vulnerability count
npm audit --json | ConvertFrom-Json | Select-Object -ExpandProperty metadata

# AST symbols
# Requires custom extraction script
```

---

## Number Change Protocol

1. Any number change MUST update this file
2. Proof file reference MUST be provided
3. Command to reproduce MUST be documented
4. UNPROVEN numbers MUST be marked

---

**END OF NUMBERS AUDIT**
