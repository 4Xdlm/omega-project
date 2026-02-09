# @omega/release

Phase G.0 — Production Hardening & Release Management.

## Modules

| Module | Description |
|--------|-------------|
| `version/` | SemVer 2.0.0 parser, validator, bumper, comparator |
| `changelog/` | Keep a Changelog parser, generator, validator, writer |
| `release/` | Artifact builder, hasher, packager, manifest, SBOM |
| `install/` | Archive verifier and extractor |
| `selftest/` | 5-check verification system |
| `policy/` | Support lifecycle and rollback planning |
| `invariants/` | INV-G0-01 through INV-G0-10 |
| `cli/` | Command-line interface |

## Invariants

| ID | Name | Description |
|----|------|-------------|
| INV-G0-01 | Version Coherence | VERSION = package.json = tag = filename |
| INV-G0-02 | SemVer Validity | All versions strictly SemVer 2.0.0 |
| INV-G0-03 | Version Monotonicity | N+1 > N, no downgrade |
| INV-G0-04 | Changelog Consistency | Version entry exists in CHANGELOG.md |
| INV-G0-05 | Artifact Integrity | Every artifact has SHA-256 checksum |
| INV-G0-06 | Self-Test Gate | Self-test must pass before release |
| INV-G0-07 | Checksum Determinism | Same input = same checksum |
| INV-G0-08 | Platform Coverage | All 3 platforms must have artifacts |
| INV-G0-09 | Build Determinism | Same source + config = same artifacts |
| INV-G0-10 | Manifest Integrity | Manifest hash is valid |

## Tests

```
218 tests | 25 test files | 0 failures
```

## CLI

```
omega-release version [show|bump|validate|set]
omega-release changelog [show|validate|render|init]
omega-release build [--platform=X] [--output=DIR]
omega-release selftest [--format=json|summary]
omega-release rollback <version> [--json]
omega-release help
```
