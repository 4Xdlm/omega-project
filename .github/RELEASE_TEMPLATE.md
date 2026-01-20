# Release Checklist

## Pre-Release

- [ ] All tests pass (2126+ tests)
- [ ] Coverage >= 95%
- [ ] FROZEN modules: 0 bytes modified
- [ ] Security scan clean
- [ ] Documentation updated
- [ ] CHANGELOG updated
- [ ] Version bumped in package.json files

## Release Information

**Version**: vX.Y.Z
**Date**: YYYY-MM-DD
**Standard**: NASA-Grade L4 / DO-178C Level A

## Test Results

```
Test Files:  XX passed (XX)
Tests:       XXXX passed (XXXX)
Coverage:    XX%
```

## FROZEN Module Verification

| Module | Status | Bytes Modified |
|--------|--------|----------------|
| packages/sentinel | NOT TOUCHED | 0 |
| packages/genome | NOT TOUCHED | 0 |
| gateway/sentinel | NOT TOUCHED | 0 |

## Security Checks

- [ ] npm audit: 0 vulnerabilities
- [ ] CodeQL: No issues
- [ ] License compliance: 100%
- [ ] Secrets scan: Clean

## Packages Published

| Package | Version | Status |
|---------|---------|--------|
| @omega-private/nexus-shared | X.Y.Z | [ ] Published |
| @omega-private/nexus-atlas | X.Y.Z | [ ] Published |
| @omega-private/nexus-raw | X.Y.Z | [ ] Published |
| @omega-private/proof-utils | X.Y.Z | [ ] Published |

## Release Steps

1. [ ] Run `scripts/release.sh vX.Y.Z --dry-run`
2. [ ] Review generated release notes
3. [ ] Run `scripts/release.sh vX.Y.Z`
4. [ ] Verify GitHub release created
5. [ ] Verify packages published
6. [ ] Complete post-release checklist

## Post-Release

- [ ] Announce release
- [ ] Update external documentation
- [ ] Monitor for issues
- [ ] Archive proof pack

## Rollback Plan

If issues are discovered:

1. Delete the release tag: `git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z`
2. Unpublish packages (within 72 hours): `npm unpublish @omega-private/package@X.Y.Z`
3. Create hotfix branch: `git checkout -b hotfix/vX.Y.Z-fix`
4. Fix issues and create new release

## Approvals

- [ ] Architect approval: Francky
- [ ] CI/CD verification: Green
- [ ] Security review: Complete

---

**Standard**: NASA-Grade L4 / DO-178C Level A
