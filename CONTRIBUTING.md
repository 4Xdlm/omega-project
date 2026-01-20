# Contributing to OMEGA

Thank you for your interest in contributing to OMEGA. This document outlines the contribution process and standards required for this project.

---

## Table of Contents

- [Important Notice](#important-notice)
- [Code of Conduct](#code-of-conduct)
- [Development Setup](#development-setup)
- [Contribution Workflow](#contribution-workflow)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [FROZEN Modules](#frozen-modules)

---

## Important Notice

OMEGA is a **proprietary project** following NASA-Grade L4 / DO-178C Level A engineering standards. Contributions are limited to authorized team members.

### Before Contributing

1. Ensure you have authorization to contribute
2. Read this document completely
3. Understand the [FROZEN module policy](#frozen-modules)
4. Familiarize yourself with the codebase structure

---

## Code of Conduct

### Our Standards

- Write factual, precise, and verifiable code
- Follow existing patterns and conventions
- Provide evidence for all claims
- Respect FROZEN module boundaries
- Communicate clearly and professionally

### Unacceptable Behavior

- Modifying FROZEN modules without authorization
- Submitting untested code
- Making claims without proof
- Introducing non-deterministic behavior
- Bypassing security checks

---

## Development Setup

### Prerequisites

- Node.js >=18.0.0
- npm >=9.0.0
- Git
- PowerShell (Windows) or Bash (Unix)

### Installation

```bash
# Clone the repository
git clone https://github.com/omega/omega-project.git
cd omega-project

# Install dependencies
npm install

# Verify setup
npm test
```

### IDE Configuration

Recommended: VS Code with extensions:
- ESLint
- Prettier
- TypeScript and JavaScript Language Features

---

## Contribution Workflow

### 1. Create a Branch

```bash
# Start from main branch
git checkout master
git pull origin master

# Create feature branch
git checkout -b feature/your-feature-name
```

### Branch Naming

| Type | Format | Example |
|------|--------|---------|
| Feature | `feature/description` | `feature/add-metrics` |
| Bug Fix | `fix/description` | `fix/query-timeout` |
| Documentation | `docs/description` | `docs/api-reference` |
| Test | `test/description` | `test/edge-cases` |

### 2. Make Changes

- Follow [Code Standards](#code-standards)
- Write tests for new functionality
- Update documentation as needed
- Keep commits atomic and well-described

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific tests
npm test -- tests/unit/your-test.test.ts
```

### 4. Submit Pull Request

See [Pull Request Process](#pull-request-process).

---

## Code Standards

### TypeScript Guidelines

```typescript
// Use explicit types
function processEvent(event: Event): ProcessedEvent {
  // Implementation
}

// Use interfaces for contracts
interface EventProcessor {
  process(event: Event): ProcessedEvent;
  validate(event: Event): boolean;
}

// Use const for immutable values
const MAX_RETRIES = 3;
const DEFAULT_TIMEOUT = 5000;
```

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files | kebab-case | `event-processor.ts` |
| Classes | PascalCase | `EventProcessor` |
| Functions | camelCase | `processEvent` |
| Constants | UPPER_SNAKE | `MAX_RETRIES` |
| Interfaces | PascalCase | `EventProcessor` |

### Determinism Requirements

All code must be deterministic:

```typescript
// BAD - Non-deterministic
const timestamp = Date.now();
const id = Math.random().toString();

// GOOD - Injectable dependencies
interface ClockFn {
  (): number;
}

function createEvent(clock: ClockFn): Event {
  return { timestamp: clock() };
}
```

---

## Testing Requirements

### Test Coverage

- Minimum coverage: **95%** (enforced in CI)
- All new code must have corresponding tests
- Edge cases must be tested

### Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('ComponentName', () => {
  let component: Component;

  beforeEach(() => {
    component = new Component();
  });

  describe('methodName', () => {
    it('should handle normal case', () => {
      const result = component.methodName('input');
      expect(result).toBe('expected');
    });

    it('should handle edge case', () => {
      expect(() => component.methodName('')).toThrow();
    });
  });
});
```

### Test Categories

| Category | Location | Purpose |
|----------|----------|---------|
| Unit | `tests/unit/` | Individual functions/classes |
| Integration | `tests/integration/` | Module interactions |
| E2E | `tests/e2e/` | Complete workflows |

### Running Tests

```bash
# All tests (2126+ tests)
npm test

# With coverage (>=95% required)
npm run test:coverage

# Specific file
npm test -- tests/unit/atlas.test.ts

# E2E tests only
npm test -- tests/e2e
```

---

## Documentation

### When to Document

- New public APIs
- Complex algorithms
- Configuration options
- Breaking changes

### Documentation Format

```typescript
/**
 * Processes an event and returns the result.
 *
 * @param event - The event to process
 * @param options - Processing options
 * @returns The processed event
 * @throws {ValidationError} If event is invalid
 *
 * @example
 * ```typescript
 * const result = processEvent(event, { validate: true });
 * ```
 */
function processEvent(event: Event, options?: Options): ProcessedEvent {
  // Implementation
}
```

---

## Pull Request Process

### Before Submitting

- [ ] All tests pass locally (2126+ tests)
- [ ] Coverage meets threshold (>=95%)
- [ ] Code follows style guidelines
- [ ] Documentation is updated
- [ ] No FROZEN modules modified
- [ ] Commit messages are clear

### PR Title Format

```
type(scope): description

Examples:
feat(atlas): add batch insert method
fix(raw): handle empty buffer edge case
docs(readme): update installation steps
test(proof): add verification edge cases
```

### PR Description Template

```markdown
## Summary

Brief description of changes.

## Changes

- Change 1
- Change 2

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] E2E tests pass (if applicable)

## FROZEN Check

- [ ] No FROZEN modules modified
```

### CI Checks

All PRs must pass:

| Check | Requirement |
|-------|-------------|
| Tests | 100% pass rate |
| Coverage | >=95% |
| Linting | No errors |
| FROZEN | 0 bytes modified |
| Security | No vulnerabilities |

---

## FROZEN Modules

### What are FROZEN Modules?

FROZEN modules are certified, immutable code that cannot be modified:

| Module | Path | Status |
|--------|------|--------|
| Sentinel | `packages/sentinel/` | FROZEN |
| Genome | `packages/genome/` | SEALED |
| Gateway Sentinel | `gateway/sentinel/` | FROZEN |

### Why FROZEN?

- Certified for production use
- Verified test coverage
- Security audited
- Cryptographic hash locked

### Working with FROZEN Modules

**Allowed:**
- Reading/importing FROZEN modules
- Creating extension layers
- Writing tests that use FROZEN modules

**Forbidden:**
- Modifying any file in FROZEN directories
- Adding new files to FROZEN directories
- Changing FROZEN module dependencies

### Extending FROZEN Modules

```typescript
// GOOD - Create extension layer
import { Sentinel } from '@omega/sentinel';

export class ExtendedSentinel extends Sentinel {
  // Add new functionality here
}

// BAD - Never modify FROZEN module directly
// packages/sentinel/src/sentinel.ts <- DO NOT TOUCH
```

---

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

- Changes to FROZEN modules (sentinel, genome)
- PRs without passing tests
- "Refactoring for cleanliness" without justification
- Features without metrics of success
- Breaking changes without migration path

---

## Questions?

Contact the project maintainers:

- **Architect**: Francky
- **Standard**: NASA-Grade L4 / DO-178C Level A

Open an issue with tag `[QUESTION]` for general questions.

---

**Remember**: All contributions must be verifiable, tested, and documented.
