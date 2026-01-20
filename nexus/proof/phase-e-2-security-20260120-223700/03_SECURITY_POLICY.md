# Security Policy — OMEGA

**Standard**: NASA-Grade L4
**Last Updated**: 2026-01-20

---

## Supported Versions

| Version | Support |
|---------|---------|
| 6.x | Active development |
| 5.x | Security fixes only |
| <5.0 | Not supported |

---

## Reporting Vulnerabilities

**DO NOT** open public issues for security vulnerabilities.

### Contact

For security issues, please contact the maintainers directly through private channels.

### Expected Response

- Acknowledgment: 48 hours
- Initial assessment: 1 week
- Fix timeline: Depends on severity

### Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| Critical | RCE, data breach | 24-48 hours |
| High | Auth bypass, injection | 1 week |
| Medium | XSS, CSRF | 2 weeks |
| Low | Info disclosure | 1 month |

---

## Security Features

### Built-in Protections

- **Path traversal protection**: All file operations validate paths
- **Hash verification**: SHA-256 for integrity checks
- **Encryption support**: AES-256-GCM for sensitive data
- **Zip-slip protection**: Archive extraction validates paths
- **Input validation**: Strict validation at system boundaries

### FROZEN Modules

The following modules are security-critical and FROZEN:

```
packages/genome/     -> FROZEN (no modifications allowed)
gateway/sentinel/    -> FROZEN (no modifications allowed)
```

Any changes to FROZEN modules require:
1. Security review
2. Full regression testing
3. Explicit approval from maintainers

---

## Security Testing

### Run Security Checks Locally

```bash
# Dependency audit
npm audit

# Audit with fix suggestions
npm audit fix --dry-run

# Check for known vulnerabilities
npm audit --audit-level=moderate

# License compliance
npx license-checker --summary --production
```

### CI/CD Security

Security checks run automatically on:
- Every push to master/phase-b-industrial
- Every pull request to master
- Weekly scheduled scans (Monday 00:00 UTC)

Checks include:
- Dependency audit (npm audit)
- CodeQL static analysis
- TruffleHog secrets scanning
- License compliance verification
- FROZEN module integrity

---

## Best Practices

### For Contributors

1. **Never commit secrets** (API keys, passwords, tokens)
2. **Keep dependencies updated** via Dependabot PRs
3. **Use encryption** for sensitive data at rest
4. **Validate all inputs** at system boundaries
5. **Follow least privilege** principle

### For Deployment

1. **Enable HTTPS** for all connections
2. **Rotate keys** regularly
3. **Monitor audit logs**
4. **Verify manifests** before restore operations
5. **Keep Node.js updated** to LTS versions

---

## Dependency Management

### Automated Updates

Dependabot is configured to:
- Check npm dependencies weekly
- Check GitHub Actions weekly
- Group development dependencies
- Require review before merge

### Manual Audit

```bash
# Full audit
npm audit

# Fix automatically (safe)
npm audit fix

# Fix with breaking changes (use caution)
npm audit fix --force
```

---

## Incident Response

### In Case of Security Incident

1. **Contain**: Isolate affected systems
2. **Assess**: Determine scope and impact
3. **Remediate**: Apply fixes
4. **Communicate**: Notify affected parties
5. **Review**: Post-incident analysis

### Security Advisories

Subscribe to GitHub security advisories for this repository to receive notifications about:
- New vulnerabilities
- Security patches
- Best practice updates

---

## Compliance

### Standards

- NASA-Grade L4 certification requirements
- DO-178C Level A compatible practices
- OWASP Top 10 awareness

### Audit Trail

All security-relevant operations are logged with:
- Timestamp
- Operation type
- Actor (if applicable)
- Result (success/failure)

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-20 | Claude Opus 4.5 | Comprehensive security policy |
