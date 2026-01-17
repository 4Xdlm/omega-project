# OMEGA Trust Boundaries

## Generated
- Date: 2026-01-17
- Auditor: Claude Code (Prompt 11 Ultimate)

---

## Boundary Map

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│                            UNTRUSTED ZONE                                       │
│                                                                                 │
│   ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐          │
│   │   User Input    │     │   File Input    │     │   CLI Args      │          │
│   │   (text)        │     │   (documents)   │     │   (parameters)  │          │
│   └────────┬────────┘     └────────┬────────┘     └────────┬────────┘          │
│            │                       │                       │                    │
│            └───────────────────────┼───────────────────────┘                    │
│                                    │                                            │
│                                    ▼                                            │
│   ══════════════════════════════════════════════════════════════════════════   │
│   ║              TRUST BOUNDARY 1: INPUT VALIDATION                        ║   │
│   ║                                                                        ║   │
│   ║    @omega/mycelium.validate()                                          ║   │
│   ║    • UTF-8 encoding validation                                         ║   │
│   ║    • Size limit enforcement (min/max)                                  ║   │
│   ║    • Binary content rejection                                          ║   │
│   ║    • Markup/data format rejection (HTML, JSON, XML)                    ║   │
│   ║    • Control character filtering                                       ║   │
│   ║    • Seed/mode validation                                              ║   │
│   ║                                                                        ║   │
│   ║    INVARIANTS ENFORCED: 12                                             ║   │
│   ║    REJECTION TYPES: 20                                                 ║   │
│   ║                                                                        ║   │
│   ══════════════════════════════════════════════════════════════════════════   │
│                                    │                                            │
│                                    ▼ (validated input only)                     │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                          TRUSTED CORE                                   │   │
│   │                                                                         │   │
│   │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │   │
│   │   │   genome    │    │   oracle    │    │   search    │                 │   │
│   │   │  (FROZEN)   │    │             │    │             │                 │   │
│   │   └─────────────┘    └─────────────┘    └─────────────┘                 │   │
│   │                                                                         │   │
│   │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │   │
│   │   │ orchestrator│    │  proof-pack │    │  integration│                 │   │
│   │   │   -core     │    │             │    │  -nexus-dep │                 │   │
│   │   └─────────────┘    └─────────────┘    └─────────────┘                 │   │
│   │                                                                         │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                            │
│   ══════════════════════════════════════════════════════════════════════════   │
│   ║              TRUST BOUNDARY 2: OUTPUT SERIALIZATION                    ║   │
│   ║                                                                        ║   │
│   ║    @omega/genome.canonicalSerialize()                                  ║   │
│   ║    @omega/proof-pack.serialize()                                       ║   │
│   ║    • Deterministic output                                              ║   │
│   ║    • Float quantization for cross-platform                             ║   │
│   ║    • Hash verification                                                 ║   │
│   ║                                                                        ║   │
│   ══════════════════════════════════════════════════════════════════════════   │
│                                    │                                            │
│                                    ▼                                            │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                        OUTPUT ZONE                                      │   │
│   │                                                                         │   │
│   │   ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐   │   │
│   │   │   API Response  │     │   File Output   │     │   CLI Output    │   │   │
│   │   │   (JSON)        │     │   (bundles)     │     │   (reports)     │   │   │
│   │   └─────────────────┘     └─────────────────┘     └─────────────────┘   │   │
│   │                                                                         │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Validation Points

| Boundary | Module | Function | Validates | Failure Mode |
|----------|--------|----------|-----------|--------------|
| INPUT | @omega/mycelium | validate() | User text | RejectResult |
| INPUT | @omega/mycelium | validateUTF8() | Encoding | Rejection |
| INPUT | @omega/mycelium | validateSize() | Length limits | Rejection |
| INPUT | @omega/mycelium | validateBinary() | Binary detection | Rejection |
| INPUT | @omega/mycelium | validateControlChars() | Dangerous chars | Rejection |
| OUTPUT | @omega/genome | quantizeFloat() | Float precision | Exception |
| OUTPUT | @omega/genome | canonicalSerialize() | Determinism | Exception |
| OUTPUT | @omega/proof-pack | verify() | Bundle integrity | VerificationError |

---

## Trust Assumptions

### Assumed Trusted

| Component | Assumption | Basis |
|-----------|------------|-------|
| @omega/orchestrator-core | Deterministic execution | Foundation axiom |
| Node.js runtime | Correct execution | Platform dependency |
| TypeScript compiler | Correct compilation | Build tooling |
| Vitest framework | Accurate test results | Test framework |
| SHA-256 | Cryptographic integrity | Standard algorithm |

### Assumed Untrusted

| Component | Treatment | Mitigation |
|-----------|-----------|------------|
| User text input | Always validate | Mycelium gate |
| File contents | Validate on read | Mycelium gate |
| CLI arguments | Parse and validate | Argument parsing |
| External packages | npm audit | Dependency review |

---

## Sanctuary Modules (Maximum Trust)

These modules are FROZEN and have elevated trust status:

| Module | Status | Trust Level | Reason |
|--------|--------|-------------|--------|
| @omega/mycelium | FROZEN | MAXIMUM | Input validation gate |
| @omega/genome | FROZEN | MAXIMUM | Core fingerprinting |
| OMEGA_SENTINEL_SUPREME | FROZEN | MAXIMUM | Certification axioms |
| gateway | FROZEN | HIGH | API surface |

**Rule:** Frozen modules cannot be modified. Any change requires:
1. New version
2. New phase
3. Full recertification

---

## Attack Surface

### Entry Points

| Entry Point | Type | Trust Level | Validation |
|-------------|------|-------------|------------|
| CLI arguments | process.argv | LOW | Argument parsing |
| Text input | User data | LOW | Mycelium validation |
| File input | File system | LOW | Mycelium validation |
| API calls | N/A | N/A | No external APIs |

### Protected Operations

| Operation | Protection | Location |
|-----------|------------|----------|
| File write | CLI output only | gold-cli/src/cli.ts |
| Process exit | CLI only | gold-cli, integration-nexus-dep |
| Network | None used | N/A |

---

## Security Invariants

| ID | Invariant | Enforced By |
|----|-----------|-------------|
| SEC-01 | All user input must pass validation | @omega/mycelium |
| SEC-02 | Binary content is never processed | validateBinary() |
| SEC-03 | Output is deterministic | canonicalSerialize() |
| SEC-04 | Hashes are SHA-256 | crypto module |
| SEC-05 | No eval() or dynamic code | Code review |
| SEC-06 | No network calls | Static analysis |

---

*END TRUST_BOUNDARIES.md*
