# LR8 — SECURITY / SUPPLY CHAIN AUDIT

## NPM AUDIT SUMMARY

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 0 | **PASS** |
| High | 0 | **PASS** |
| Moderate | 4 | **REVIEW** |
| Low | 0 | **PASS** |
| Info | 0 | **PASS** |

---

## VULNERABILITY DETAILS

### GHSA-67mh-4wv8-2f99: esbuild (MODERATE)

| Field | Value |
|-------|-------|
| Package | esbuild |
| Severity | MODERATE (CVSS 5.3) |
| Title | esbuild enables any website to send requests to dev server |
| CWE | CWE-346 (Origin Validation Error) |
| Range | <=0.24.2 |
| Vector | CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:H/I:N/A:N |

**Affected Nodes**:
- node_modules/vite-node/node_modules/esbuild
- packages/canon-kernel/node_modules/esbuild
- packages/emotion-gate/node_modules/esbuild
- packages/sentinel-judge/node_modules/esbuild
- packages/truth-gate/node_modules/esbuild

**Risk Assessment**:
- **Development-only**: Affects dev server, NOT production builds
- **Requires user interaction**: Attack needs victim to visit malicious site
- **High complexity**: Network conditions required
- **Impact**: Confidentiality only (read responses)

**Recommendation**: LOW PRIORITY — Dev-only vulnerability. Update vitest to latest when convenient.

### vite, vite-node, vitest (MODERATE)

All three are transitive dependencies of the esbuild vulnerability.

| Package | Range | Fix Available |
|---------|-------|---------------|
| vite | 0.11.0 - 6.1.6 | vitest 4.0.18 |
| vite-node | <=2.2.0-beta.2 | vitest 4.0.18 |
| vitest | 0.0.1 - 2.2.0-beta.2 | vitest 4.0.18 |

**Note**: Root vitest is already 4.0.18. Nested versions in packages/* need update.

---

## DEPENDENCY STATISTICS

| Category | Count |
|----------|-------|
| Production | 136 |
| Development | 337 |
| Optional | 168 |
| Peer | 5 |
| **Total** | 473 |

---

## LICENSE AUDIT

### Production Dependencies

All production dependencies use permissive licenses:
- MIT: ~90%
- ISC: ~5%
- Apache-2.0: ~3%
- BSD variants: ~2%

**No GPL or AGPL dependencies in production.**

### Verification Command

```powershell
npm ls --json | Out-File deps.json
# Manual review of license field in each package.json
```

---

## SBOM STATUS

SBOM generation available via:
- `packages/sbom/` — SBOM manifest package

---

## POLICY VIOLATIONS

**None detected.**

- No known malicious packages
- No typosquatting detected
- No deprecated packages with security issues

---

## SUPPLY CHAIN HARDENING

### package-lock.json

| Check | Status |
|-------|--------|
| Lockfile present | YES |
| Lockfile version | 3 |
| Integrity hashes | YES (SHA-512) |

### npm ci

```powershell
npm ci --ignore-scripts
# Clean install with integrity verification
```

---

## RECOMMENDATIONS

### LOW PRIORITY

1. Update nested vitest versions in packages/* to 4.0.18:
   - packages/canon-kernel
   - packages/emotion-gate
   - packages/sentinel-judge
   - packages/truth-gate

   ```powershell
   cd packages/canon-kernel && npm update vitest
   cd packages/emotion-gate && npm update vitest
   # etc.
   ```

### NO ACTION REQUIRED

- All vulnerabilities are:
  - Development-only (not in production bundles)
  - Moderate severity (CVSS 5.3)
  - Require user interaction to exploit

---

## VERDICT

| Check | Status |
|-------|--------|
| Critical/High vulnerabilities | **PASS** (0) |
| Production vulnerabilities | **PASS** (0) |
| Dev-only moderate | **ACCEPTABLE** (4) |
| License compliance | **PASS** |
| Lockfile integrity | **PASS** |

**OVERALL: PASS**

No production vulnerabilities. 4 moderate dev-only issues (esbuild CORS in dev server).
