# OMEGA CI/CD Pipeline

## Overview
Automated testing and validation pipeline for OMEGA project.

## Version
- Version: 3.97.0
- Phase: 97
- Standard: NASA-Grade L4

## GitHub Actions Workflow

### Jobs

| Job | Description | Trigger |
|-----|-------------|---------|
| phase-gate | Verify phase declaration | All pushes |
| lint | Code quality checks | All pushes |
| test | Run all tests | After phase-gate |
| sanctuary | Check read-only paths | PRs only |
| hash-verify | Verify file integrity | After tests |
| release-check | Tag verification | Master only |

### Workflow File
Location: `.github/workflows/ci.yml`

## Local CI Runner

Run CI checks locally before pushing:

```bash
# Run all checks
node scripts/ci/run-local.cjs

# Skip tests (faster)
node scripts/ci/run-local.cjs --skip-tests
```

### Checks Performed

1. **Phase Declaration** - Verify `nexus/PHASE_CURRENT.md` exists
2. **Sanctuary Protection** - Check read-only paths not modified
3. **Type Check** - Run TypeScript compiler
4. **Tests** - Run full test suite

## Sanctuary Paths

Protected read-only paths:
- `packages/sentinel`
- `packages/genome`
- `packages/mycelium`
- `gateway`

## Badge Status

```markdown
![CI](https://github.com/{user}/{repo}/actions/workflows/ci.yml/badge.svg)
```

## References
- Tag: v3.97.0
- Phase: 97
