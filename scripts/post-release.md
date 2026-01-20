# Post-Release Checklist

## Immediate (Within 1 Hour)

- [ ] Verify GitHub release is visible
- [ ] Verify all packages are published to GitHub Packages
- [ ] Test package installation from registry
- [ ] Verify documentation links work
- [ ] Check CI status on release branch

## Verification Commands

```bash
# Test package installation
npm config set @omega-private:registry https://npm.pkg.github.com
npm install @omega-private/nexus-atlas@latest --dry-run

# Verify tag
git tag -l "v6.0.0*"

# Check release
gh release view v6.0.0-INDUSTRIAL
```

## Short-Term (Within 24 Hours)

- [ ] Monitor GitHub Issues for bug reports
- [ ] Check npm download stats
- [ ] Verify dependent projects can upgrade
- [ ] Update project roadmap
- [ ] Archive release artifacts

## Communication

- [ ] Update internal documentation
- [ ] Notify stakeholders
- [ ] Update project status page
- [ ] Document lessons learned

## Monitoring

### Metrics to Watch

| Metric | Expected | Action if Exceeded |
|--------|----------|-------------------|
| New issues | < 5 | Investigate immediately |
| Failed installs | 0 | Check package integrity |
| CI failures | 0 | Review and fix |

### Health Checks

```bash
# Run smoke tests
npm test -- tests/e2e

# Verify integrity
npm run ci:frozen-check

# Check dependencies
npm audit
```

## Archive

- [ ] Save proof pack to long-term storage
- [ ] Export CI logs
- [ ] Document release metrics
- [ ] Update version history

## Rollback Procedure

If critical issues are found:

### Step 1: Assess Impact

- Is it a security vulnerability?
- Does it affect all users?
- Is there a workaround?

### Step 2: Decide Action

| Severity | Action |
|----------|--------|
| Critical | Immediate rollback |
| High | Hotfix within 24h |
| Medium | Patch in next release |
| Low | Document and track |

### Step 3: Execute Rollback (if needed)

```bash
# Delete release
gh release delete v6.0.0-INDUSTRIAL --yes

# Delete tag locally and remotely
git tag -d v6.0.0-INDUSTRIAL
git push origin :refs/tags/v6.0.0-INDUSTRIAL

# Unpublish packages (within 72 hours)
npm unpublish @omega-private/nexus-atlas@2.0.0
npm unpublish @omega-private/nexus-raw@2.0.0
npm unpublish @omega-private/nexus-shared@2.0.0
npm unpublish @omega-private/proof-utils@2.0.0
```

### Step 4: Communicate

- Update release notes with deprecation notice
- Notify users of rollback
- Document root cause

## Long-Term

- [ ] Review release process for improvements
- [ ] Update automation scripts if needed
- [ ] Plan next release cycle
- [ ] Archive this checklist

---

## Release Summary

| Item | Status |
|------|--------|
| Version | v6.0.0-INDUSTRIAL |
| Date | 2026-01-20 |
| Tests | 2126 passed |
| Coverage | >=95% |
| FROZEN | 0 bytes modified |
| Packages | 4 published |

---

**Standard**: NASA-Grade L4 / DO-178C Level A
**Completed by**: ________________
**Date**: ________________
