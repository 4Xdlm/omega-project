# FROZEN MODULES — OMEGA PROJECT
**Standard**: NASA-Grade L4 / DO-178C Level A

---

## A) FROZEN MODULE LIST

| Module | Version | Status | Sealed Date | Tests | Invariants |
|--------|---------|--------|-------------|-------|------------|
| `packages/genome` | 1.2.0 | SEALED | 2026-01-07 | 109 | 14 |
| `packages/mycelium` | 1.0.0 | SEALED | 2026-01-09 | 97 | 12 |

### packages/genome
**Purpose**: Narrative Genome fingerprinting system. Generates deterministic SHA-256 fingerprints for narrative works based on emotional and stylistic analysis.

### packages/mycelium
**Purpose**: Input validation guardian for DNA/Genome pipeline. Validates and normalizes all inputs before they enter the analysis chain.

---

## B) WHAT FROZEN MEANS

### Implications

| Aspect | Status |
|--------|--------|
| Bug fixes | FORBIDDEN (open NCR instead) |
| New features | FORBIDDEN (create v2 instead) |
| Refactoring | FORBIDDEN |
| Documentation fixes | ALLOWED (README only) |
| Test additions | FORBIDDEN |

### Prohibitions

| Category | Prohibition |
|----------|-------------|
| Source code | No modification to any `.ts` file |
| Exports | No change to public API signatures |
| Function signatures | No parameter changes |
| Return types | No type changes |
| Dependencies | No version bumps or new deps |
| Test files | No modifications |
| Artifacts | No modification to SEAL files |

### What You CAN Do

- Read the code
- Import and use the module
- Create extension layers that wrap the module
- Propose a v2 (following the process below)

---

## C) WHEN TO PROPOSE V2

### Legitimate Technical Criteria

| Criteria | Example |
|----------|---------|
| Critical bug affecting correctness | Fingerprint calculation error |
| Security vulnerability | Input injection risk |
| Performance blocker | O(n^2) becoming unacceptable at scale |
| Dependency EOL | Node.js version requirement change |

### Legitimate Business Criteria

| Criteria | Example |
|----------|---------|
| New spec version | Emotion14 -> Emotion20 |
| New use case | Support for audio content |
| Regulatory requirement | GDPR compliance change |

### ANTI-PATTERNS — When NOT to Make v2

| Anti-Pattern | Why It's Wrong |
|--------------|----------------|
| "Code is ugly" | Aesthetic preferences don't justify v2 |
| "I'd write it differently" | Personal style != improvement |
| "Could be faster" (without data) | Premature optimization |
| "Missing feature X" | Add via wrapper, not v2 |
| "Tests are incomplete" | Add tests in separate test package |
| "Documentation is poor" | Update docs without touching code |
| "Refactoring would help" | Stability > elegance |
| "Dependencies are old" | If it works, don't touch |

---

## D) PROCESS V2 — 5 STEPS

### Step 1: Proposal (RFC Document)

Create `docs/RFC_{MODULE}_V2.md`:

```markdown
# RFC: {Module} v2

## Summary
{1-2 sentences}

## Motivation
{Why v1 cannot be extended}

## Technical Design
{High-level architecture}

## Breaking Changes
{List all incompatibilities}

## Migration Path
{How v1 users can migrate}

## Risks
{What could go wrong}

## Timeline
{Estimated phases}
```

### Step 2: Impact Analysis

Document in RFC:
- All packages that depend on v1
- All tests that use v1
- All invariants affected
- Risk assessment (HIGH/MEDIUM/LOW)

### Step 3: Architect Validation

**MANDATORY**: Written approval from Francky required.

Approval format:
```
APPROVED: {RFC_NAME}
Date: {YYYY-MM-DD}
Architect: Francky
Conditions: {any conditions}
```

### Step 4: Implementation v2

| Rule | Description |
|------|-------------|
| New package | Create `packages/{module}-v2/` |
| Never modify v1 | v1 remains untouched |
| Own test suite | Independent tests for v2 |
| Own artifacts | New SEAL file for v2 |
| Own version | Start at 2.0.0 |

### Step 5: Adoption Progressive

| Phase | Action |
|-------|--------|
| Alpha | v2 available, opt-in only |
| Beta | v2 recommended for new code |
| Stable | v2 is default, v1 still supported |
| Deprecated | v1 deprecated (never removed) |

---

## E) COEXISTENCE RULES

### Indefinite Coexistence

```
v1 and v2 CAN coexist indefinitely.
Migration is NEVER mandatory.
```

### Import Conventions

```typescript
// v1 (original)
import { analyze } from "@omega/genome";

// v2 (if created)
import { analyze } from "@omega/genome-v2";
```

### Deprecation Policy

| Stage | Timeline | Action |
|-------|----------|--------|
| Announced | T+0 | Deprecation notice in README |
| Warning | T+6 months | Console warning on import |
| Documented | T+12 months | Migration guide complete |
| Maintained | Indefinite | Security fixes only |

**RULE**: Deprecation is ANNOUNCED, never IMMEDIATE.

---

## F) EVIDENCE REQUIREMENTS

### Required Documents for V2 Approval

| Document | Purpose |
|----------|---------|
| RFC document | Technical proposal |
| Impact analysis | Risk assessment |
| Architect sign-off | Written approval |
| Test plan | v2 test strategy |
| Migration guide | How to switch |

### Required Artifacts After V2 Complete

| Artifact | Purpose |
|----------|---------|
| Full v1 test suite passing | v1 unchanged |
| Full v2 test suite passing | v2 complete |
| SEAL file for v2 | Certification |
| Updated FROZEN_MODULES.md | Add v2 entry |
| Changelog | Document changes |

---

## QUICK REFERENCE

### Before Touching FROZEN Module

```
1. STOP
2. Check if change is truly necessary
3. Check anti-patterns list
4. If necessary: start RFC process
5. Get Architect approval
6. Create v2 package
7. NEVER modify v1
```

### Escalation

```
Question about FROZEN module -> Ask Francky
Need to fix bug in FROZEN -> Open NCR -> Ask Francky
Want to add feature -> Create wrapper or propose v2
```

---

**Remember**: FROZEN means FROZEN. No exceptions without Architect approval.

```
╔═══════════════════════════════════════════════════════════════╗
║  Architect: Francky          IA Principal: Claude Code        ║
║  Standard:  NASA-Grade L4 / DO-178C Level A                   ║
╚═══════════════════════════════════════════════════════════════╝
```
