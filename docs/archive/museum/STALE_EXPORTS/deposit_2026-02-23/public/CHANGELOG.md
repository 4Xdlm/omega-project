# Changelog

All notable changes to OMEGA will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [6.0.0-INDUSTRIAL] - 2026-01-20

### Major Production Release

**Test Count**: 2126 tests (100% pass rate)
**Coverage**: ≥95% (enforced)
**FROZEN Modules**: 0 bytes modified

---

### Added

#### Phase A — Hardening (+143 tests)

- API stability policy and compatibility matrix
- Typed error catalog (261 lines)
- Comprehensive cookbook (517 lines)
- 67 edge case tests (extreme sizes, special chars, corruption)
- Security threat model and SECURITY.md policy
- Zip-slip protection and path validation

#### Phase B — Performance (+22 tests)

- Benchmark suite (15 benchmarks)
- Injectable performance abstractions (ClockFn, PerfNowFn)
- CPU profiling tools
- Performance budgets and tracking
- Baseline performance established

#### Phase C — Observability (+74 tests)

- Structured logger with injectable ClockFn (11 tests)
- Metrics collector: Counter, Gauge, Histogram (33 tests)
- Prometheus exporter
- Distributed tracing with CorrelationProvider interface (30 tests)
- Integration in all modules (Atlas, Raw, Proof)

#### Phase D — E2E Integration (+21 tests)

- 21 E2E integration tests
- Complete workflow tests (5 tests)
- Backup/restore patterns (4 tests)
- Concurrent operations tests (5 tests)
- Event replay and checkpointing (3 tests)
- Error handling scenarios (4 tests)
- Workflows documentation (456 lines)

#### Phase E — CI/CD

- GitHub Actions CI matrix (3 OS × 3 Node = 9 configs)
- Coverage threshold enforcement (≥95%)
- FROZEN integrity checks in CI
- CodeQL security analysis
- Dependency audits (automated)
- Secrets scanning (TruffleHog)
- License compliance checks
- Dependabot configuration
- Proof pack automation

#### Phase F — Packaging

- GitHub Packages configuration (4 packages)
- Build and publish scripts
- Complete documentation
- README for all packages
- NPM package metadata
- TypeScript build configuration

---

### Changed

- Test count: 1866 → 2126 (+260 tests, +13.9%)
- Enhanced security posture (5 automated checks)
- Improved observability (logging, metrics, tracing)
- Production-ready CI/CD pipeline

---

### Performance

All operations meet budgets (p95):

| Operation | Result | Budget | Status |
|-----------|--------|--------|--------|
| Atlas query (10k) | 0.53ms | <100ms | ✅ 0.5% |
| Raw store (10 MB) | 5.35ms | <1000ms | ✅ 0.5% |
| Proof verify (100) | 5.06ms | <200ms | ✅ 2.5% |

**All operations <3% of budget targets.**

---

### Security

- Zero vulnerabilities (npm audit)
- CodeQL: No issues detected
- License compliance: 100%
- FROZEN modules: 0 bytes modified

---

### Documentation

- 10+ comprehensive guides
- 5 E2E workflow examples
- API documentation complete
- Security policy established
- Contributing guidelines

---

### Packages Published

| Package | Version |
|---------|---------|
| @omega-private/nexus-shared | 2.0.0 |
| @omega-private/nexus-atlas | 2.0.0 |
| @omega-private/nexus-raw | 2.0.0 |
| @omega-private/proof-utils | 2.0.0 |

---

## [5.3.0] - 2026-01-19

### Phase A Hardening

- API stability policy
- Error catalog
- Edge case tests
- Security threat model

---

## [5.1.1] - 2026-01-18

### NCR-CLI-TESTS-001 — Fix Pre-existing Test Failures

- Fixed 7 pre-existing test failures
- Tests: 1525/1532 → 1532/1532 PASS

---

## [5.1.0] - 2026-01-18

### Chapter 24 — Events Filter + CLI Audit

- NEW: `--events <types>` option for NDJSON streaming
- 10 new tests for NDJSON streaming
- Vitest config fixed to include CLI tests

---

## [5.0.0] - 2026-01-18

### Chapter 23 — JSON Schema Export

- NEW: `omega schema` command
- Schema version v1.2.0

---

## Version History

| Version | Date | Tests | Description |
|---------|------|-------|-------------|
| 6.0.0-INDUSTRIAL | 2026-01-20 | 2126 | Production release |
| 5.3.0 | 2026-01-19 | 1866 | Phase A hardening |
| 5.1.1 | 2026-01-18 | 1532 | Test fixes |
| 5.1.0 | 2026-01-18 | 1525 | Events filter |
| 5.0.0 | 2026-01-18 | 1389 | Schema export |

---

**Full release notes**: [v6.0.0-INDUSTRIAL](https://github.com/omega/omega-project/releases/tag/v6.0.0-INDUSTRIAL)
