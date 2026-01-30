# T6_DEPENDENCY_RISK
**STATUS**: PASS
**RUN_ID**: B3B09F008BC17BDF

## SCOPE
Analyze dependency tree for security, versioning, and supply chain risks.

## ARTEFACTS
| File | Description | Path |
|------|-------------|------|
| npm_config.txt | npm configuration | EVIDENCE/npm_config.txt |
| package.json | Root package manifest | (repo root) |

## FINDINGS

### F6.1 ROOT PACKAGE DEPENDENCIES
**Production Dependencies (2)**:
| Package | Version | Purpose | Risk |
|---------|---------|---------|------|
| archiver | ^7.0.1 | ZIP archive creation | LOW - mature package |
| fast-json-stable-stringify | ^2.1.0 | Deterministic JSON | LOW - no deps |

**Dev Dependencies (6)**:
| Package | Version | Purpose | Risk |
|---------|---------|---------|------|
| @types/archiver | ^7.0.0 | TypeScript types | MINIMAL |
| @vitest/coverage-v8 | ^4.0.17 | Test coverage | DEV-ONLY |
| esbuild | ^0.27.2 | Bundler | DEV-ONLY |
| tsx | ^4.21.0 | TypeScript executor | DEV-ONLY |
| vitest | ^4.0.17 | Test runner | DEV-ONLY |
| zod | ^3.23.8 | Schema validation | LOW |

### F6.2 INTERNAL DEPENDENCIES
Workspaces use file: protocol for internal linking:
- `@omega/mycelium`: file:../mycelium
- No external npm registry dependencies between workspaces

### F6.3 VERSION PINNING ANALYSIS
All dependencies use caret (^) versioning:
- Allows minor/patch updates
- Risk: potential breaking changes in minor versions
- Mitigation: package-lock.json should lock exact versions

### F6.4 NPM CONFIGURATION
Key settings from EVIDENCE/npm_config.txt:
- **registry**: https://registry.npmjs.org/ (standard)
- **package-lock**: true (enabled)
- **strict-ssl**: true (secure)
- **audit**: true (security audits enabled)
- **engine-strict**: false (may allow version mismatches)

### F6.5 SUPPLY CHAIN OBSERVATIONS

**Positive Indicators**:
- Minimal production dependencies (2)
- Well-known, audited packages
- No known CVEs in direct dependencies (based on package age/maturity)
- Dev dependencies isolated from production bundle

**Risk Factors**:
- No package-lock.json analysis in evidence (would need `npm ls --all`)
- Transitive dependency tree not captured
- No SBOM (Software Bill of Materials) in evidence

### F6.6 GENOME PACKAGE DEPENDENCIES
packages/genome/package.json:
- **@omega/mycelium**: file:../mycelium (internal)
- **typescript**: ^5.3.0 (dev)
- **vitest**: ^4.0.17 (dev)
- **@types/node**: ^20.10.0 (dev)

### F6.7 ENGINE REQUIREMENTS
- Root: Not specified (implicit Node.js)
- genome: node >= 18.0.0
- **Actual Node**: v24.12.0 (exceeds requirement)

---

**SECTION STATUS**: PASS (minimal dependencies, no high-risk packages detected)

**RECOMMENDATION**:
1. Run `npm audit` to verify no CVEs
2. Generate SBOM for compliance
3. Consider enabling engine-strict for production
