# Contributing to OMEGA

Thank you for your interest in OMEGA. This project follows strict
quality standards. Please read this document carefully.

## Before You Start

1. Read [GENESIS.md](nexus/genesis/GENESIS.md) (5 min)
2. Read [DANGER_ZONES.md](nexus/handover/DANGER_ZONES.md) (5 min)
3. Understand the FROZEN modules policy

## What We Accept

| Type | Accepted | Process |
|------|----------|---------|
| Bug fixes | Yes | PR with tests |
| Documentation | Yes | PR |
| New tests | Yes | PR |
| Performance (measured) | Yes | RFC first |
| New features | Maybe | RFC + Architect approval |
| FROZEN modifications | No | Never (create v2 instead) |

## What We Do NOT Accept

- Changes to FROZEN modules (genome, mycelium)
- PRs without passing tests
- "Refactoring for cleanliness" without justification
- Features without metrics of success
- Breaking changes without migration path

## Pull Request Process

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Make changes
4. Ensure tests pass: `npm test`
5. Commit with clear message
6. Open PR against `master`
7. Wait for review

## Commit Message Format

```
type(scope): description

- type: feat, fix, docs, test, refactor, perf
- scope: module affected
- description: concise, imperative mood
```

Example: `feat(sentinel): add rate limiting for API endpoints`

## Quality Standards

- All tests must pass (1389+)
- No `any` types without justification
- No `console.log` in production code
- Documentation for public APIs

## Questions?

Open an issue with tag `[QUESTION]`.
