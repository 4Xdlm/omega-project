# OMEGA HANDOVER PROTOCOL

## Purpose

This document enables any qualified developer or AI to take over OMEGA maintenance without the original author.

## Quick Links

| Document | Purpose |
|----------|---------|
| [PROJECT_STATE.md](PROJECT_STATE.md) | Current state snapshot |
| [DECISION_LOG.md](DECISION_LOG.md) | Key architectural decisions |
| [DANGER_ZONES.md](DANGER_ZONES.md) | What NOT to touch |
| [RECOVERY_PLAYBOOK.md](RECOVERY_PLAYBOOK.md) | Common failure scenarios |
| [SUCCESSION_RULES.md](SUCCESSION_RULES.md) | Governance continuity |

## Authority Chain

```
STATE_OF_TRUTH.md          ← Single source of truth
    ↓
GENESIS_CHARTER.md         ← Mission & anti-mission
    ↓
EVOLUTION_RULES.md         ← Change governance
    ↓
This HANDOVER              ← Transmission protocol
```

## First Steps for New Maintainer

### 1. Verify Environment (5 min)
```bash
git clone https://github.com/4Xdlm/omega-project.git
cd omega-project
npm install
npm test  # Must show: 1389 passed
```

### 2. Read Core Documents (30 min)
1. `nexus/proof/chapter6/STATE_OF_TRUTH.md`
2. `nexus/genesis/GENESIS_CHARTER.md`
3. `nexus/genesis/GUARDRAILS.md`
4. This file + linked documents

### 3. Understand Constraints
| Constraint | Non-Negotiable |
|------------|----------------|
| FROZEN modules untouched | YES |
| Tests must pass | YES |
| Proof for each change | YES |
| No silent behavior changes | YES |

### 4. Verify FROZEN Status
```bash
# These must be empty (no changes)
git diff v3.159.0-CHAPTER-5-CERTIFIED -- packages/genome/
git diff v3.159.0-CHAPTER-5-CERTIFIED -- packages/mycelium/
```

## What You CAN Do

| Action | Condition |
|--------|-----------|
| Bug fixes | Tests pass + documented |
| Documentation updates | No code impact |
| Test additions | Non-breaking |
| Performance (measured) | Baseline + proof |
| New peripheral modules | RFC + no FROZEN access |

## What You CANNOT Do

| Action | Why |
|--------|-----|
| Modify FROZEN modules | Certification void |
| Skip tests | No proof = no merge |
| "Improve" without metrics | Invisible debt |
| Refactor core without RFC | Risk too high |
| Change public APIs | Breaking changes |

## Emergency Contacts

| Role | Identity |
|------|----------|
| Original Architect | Francky |
| Primary IA | Claude |
| Repository | github.com/4Xdlm/omega-project |

## Certification

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   This HANDOVER protocol enables OMEGA to survive                             ║
║   independently of its original creators.                                     ║
║                                                                               ║
║   Standard: NASA-Grade L4 / DO-178C Level A                                   ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```
