# OMEGA SUCCESSION RULES

## Purpose

This document defines how OMEGA governance continues if the original Architect becomes unavailable.

---

## Cas 1: Architecte Indisponible Temporairement

**Duration**: Up to 30 days

| Allowed | Forbidden |
|---------|-----------|
| Maintenance (bug fixes) | Extensions |
| Documentation updates | New features |
| Test additions | API changes |
| Security patches | Architectural decisions |

### Procedure
1. Continue maintenance work only
2. Document all changes with extra detail
3. Queue RFCs for review when Architect returns
4. Set reminder at day 25 to escalate

---

## Cas 2: Architecte Indisponible Longue Duree

**Duration**: After 30 days without contact

### Actions
1. Last STATE_OF_TRUTH.md becomes permanent authority
2. Only maintenance is authorized
3. No evolution of any kind
4. Begin search for designated successor

### Status
- Repository: ACTIVE (read-mostly)
- Issues: OPEN (triage only)
- PRs: MAINTENANCE ONLY
- Roadmap: FROZEN

---

## Cas 3: Transfert Volontaire

**When**: Architect designates a successor

### Procedure
1. **Session de passation** (documented)
   - Full walkthrough of HANDOVER docs
   - Q&A session recorded
   - Successor demonstrates understanding

2. **New STATE_OF_TRUTH**
   - Update authority section
   - Record transfer date
   - Both sign off

3. **Transition Period** (minimum 30 days)
   - Old Architect available for questions
   - New Architect makes decisions
   - All changes double-reviewed

4. **Completion**
   - Old Architect becomes Consultant (read-only advice)
   - New Architect has full authority

---

## Cas 4: Aucun Successeur

**When**: No qualified successor found after 90 days

### Actions
1. OMEGA enters **ARCHIVED** mode
2. Repository remains public (read-only)
3. Issues closed with standard message:
   ```
   OMEGA is in ARCHIVED mode. No maintainer available.
   Repository preserved for reference only.
   See nexus/handover/ for context.
   ```
4. No modifications accepted
5. Forks allowed but not endorsed

---

## Criteres pour Successeur

| Critere | Obligatoire | Verification |
|---------|-------------|--------------|
| Maitrise TypeScript | YES | Code review |
| Comprend NASA-Grade | YES | Explain 3 principles |
| A lu tout le HANDOVER | YES | Quiz on content |
| Accepte les GUARDRAILS | YES | Written agreement |
| Peut passer 1389 tests | YES | Live demonstration |
| Comprend FROZEN policy | YES | Explain consequences |
| Peut expliquer DEC-001 to DEC-007 | YES | Verbal walkthrough |

### Evaluation Process
1. Candidate reads all HANDOVER docs (self-study)
2. Clone repo, run tests successfully
3. Written test on governance rules
4. Live session explaining 3 architectural decisions
5. Mock PR review (must catch planted violation)

---

## Anti-Patterns de Succession

| Interdit | Raison | Detection |
|----------|--------|-----------|
| Fork sauvage | Fragmentation | No link to original |
| "Je vais tout refaire" | Perte certification | Ignore existing structure |
| Ignorer les FROZEN | Corruption | Diff in genome/mycelium |
| "C'etait mieux avant" | Non-constructif | Revert without RFC |
| Skip les tests | False confidence | CI bypass |
| "On verra plus tard" | Dette explicite | TODO without NCR |

### Red Flags in Candidates
- Wants to "modernize" immediately
- Dismisses existing documentation
- Questions NASA-Grade necessity
- Proposes "quick fixes" to FROZEN modules
- Cannot explain why tests matter

---

## Authority Hierarchy

```
1. STATE_OF_TRUTH.md (immutable reference)
       ↓
2. Current Architect (living decisions)
       ↓
3. GENESIS_CHARTER.md (mission constraints)
       ↓
4. GUARDRAILS.md (automatic rules)
       ↓
5. This document (succession process)
```

---

## Template: Succession Agreement

```markdown
# OMEGA SUCCESSION AGREEMENT

Date: YYYY-MM-DD

## Parties
- Outgoing Architect: [Name]
- Incoming Architect: [Name]

## Confirmations

Incoming Architect confirms:
- [ ] Read all HANDOVER documents
- [ ] Ran tests successfully (1389 passed)
- [ ] Understands FROZEN policy
- [ ] Accepts GUARDRAILS
- [ ] Commits to NASA-Grade standards

## Transfer
- Effective Date: YYYY-MM-DD
- Transition Period Ends: YYYY-MM-DD

## Signatures

Outgoing: ___________________ Date: ___________
Incoming: ___________________ Date: ___________
```

---

## Summary

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   OMEGA must survive its creators.                                            ║
║                                                                               ║
║   - Temporary absence: maintenance only                                       ║
║   - Long absence: freeze + search successor                                   ║
║   - Transfer: documented + transition period                                  ║
║   - No successor: archive permanently                                         ║
║                                                                               ║
║   The project is more important than any individual.                          ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```
