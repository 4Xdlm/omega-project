# NCR-NEXUS-TRACE-001

## Non-Conformance Report — OMEGA NEXUS

| Field | Value |
|-------|-------|
| **NCR ID** | NCR-NEXUS-TRACE-001 |
| **Date Opened** | 2026-01-15 |
| **Date Closed** | 2026-01-15 |
| **Status** | RESOLVED |
| **Severity** | HIGH |
| **Category** | Law Violation |

---

## 1. Description

During audit of the NEXUS seal chain, it was discovered that **5 seals and 4 manifests were deleted** in commit `d6e1e8cdc28ad4b0bd508ec04fd13397712e8549` (Phase 88 - Merkle path normalization fix).

### Deleted Artifacts

**Seals:**
- SEAL-20260112-0001.yaml
- SEAL-20260112-0002.yaml
- SEAL-20260112-0003.yaml
- SEAL-20260112-0004.yaml
- SEAL-20260112-0005.yaml

**Manifests:**
- MANIFEST-20260112-0001.json
- MANIFEST-20260112-0002.json
- MANIFEST-20260112-0003.json
- MANIFEST-20260112-0005.json

---

## 2. Laws Violated

| Law | Description | Status |
|-----|-------------|--------|
| **Law #1** | APPEND-ONLY — Deletion is forbidden | VIOLATED |
| **Law #3** | RIEN NE MEURT — Nothing should be deleted | VIOLATED |

---

## 3. Root Cause

Commit `d6e1e8cd` was created to fix Merkle path normalization issues (Windows backslash `\` vs Unix forward slash `/`). The old seals had root_hashes computed with Windows paths, which became invalid after the normalization patch (v1.0.1).

Rather than marking the old seals as **SUPERSEDED** or **HISTORICAL**, they were deleted outright.

---

## 4. Resolution

### Actions Taken

1. **Identified** the deletion commit via `git log --diff-filter=D`
2. **Recovered** all deleted files from git history using `git checkout d6e1e8cd^ -- <files>`
3. **Restored** files with proper UTF-8 encoding (initial restoration had UTF-16 BOM issues)
4. **Committed** restoration as `d0eb0d8` with reference to this NCR
5. **Created** new seal `SEAL-20260115-0001` capturing the repaired state
6. **Tagged** release as `v3.86.0-NCR-TRACE-001`

### Commits

| Commit | Description |
|--------|-------------|
| `d0eb0d8` | fix(nexus): restore deleted seals/manifests (append-only repair) |
| `67800f4` | feat(nexus): seal current state after NCR-NEXUS-TRACE-001 |
| `e7f5230` | chore: update .gitignore + add registry |
| `ac056b3` | fix(nexus): add --passWithNoTests to vitest script |

### Tag

`v3.86.0-NCR-TRACE-001`

---

## 5. Verification Status

### Restored Seals (Historical)

| Seal | Timestamp | Verification |
|------|-----------|--------------|
| SEAL-20260112-0001 | 12:19:27 | FAIL (old path format) |
| SEAL-20260112-0002 | 12:22:08 | FAIL (old path format) |
| SEAL-20260112-0003 | 12:32:24 | FAIL (old path format) |
| SEAL-20260112-0004 | 12:38:16 | FAIL (old path format) |
| SEAL-20260112-0005 | 13:07:08 | FAIL (old path format) |

### Current Seals (Valid)

| Seal | Timestamp | Verification |
|------|-----------|--------------|
| SEAL-20260112-0006 | 13:39:08 | PASS |
| SEAL-20260112-0007 | 13:45:16 | PASS |
| SEAL-20260115-0001 | 21:04:22 | PASS |

**Note:** The restored seals fail cryptographic verification because their root_hashes were computed with Windows backslash paths. They are retained for **audit trail purposes** per Law #1 (APPEND-ONLY) and Law #3 (RIEN NE MEURT).

---

## 6. Lessons Learned

1. **Never delete seals** — even if they become cryptographically invalid
2. **Mark as SUPERSEDED** — use lifecycle transitions instead of deletion
3. **Document breaking changes** — path normalization should have been documented as a chain-breaking change
4. **Preserve audit trail** — the historical record is more important than clean verification

---

## 7. Attestation

```
NCR-NEXUS-TRACE-001 has been investigated and resolved.
All deleted artifacts have been restored from git history.
Laws #1 and #3 compliance has been repaired.

Resolved by: Claude Code
Date: 2026-01-15
Tag: v3.86.0-NCR-TRACE-001
```

---

*This document is part of the OMEGA NEXUS proof chain.*
