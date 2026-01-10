# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA PROJECT — NCR LOG (Non-Conformance Reports)
# ═══════════════════════════════════════════════════════════════════════════════
# Ce fichier est APPEND-ONLY. Ne jamais supprimer d'entrees.
# ═══════════════════════════════════════════════════════════════════════════════

## NCR-001
| Field | Value |
|-------|-------|
| Date | 2026-01-09 22:32 |
| Phase | 29.3 |
| Severity | LOW |
| Description | Mycelium tsconfig.json manque "DOM" dans lib pour TextEncoder. Build tsc echoue mais vitest fonctionne via transformation directe. |
| Decision | Creer alias dans genome/vitest.config.ts pour resoudre @omega/mycelium vers sources TS directement. Ne pas modifier mycelium (FROZEN). |
| Status | CLOSED |
| Closed Date | 2026-01-09 |
| Resolution | Alias vitest configure. Tests passent 147/147. Module FROZEN non modifie. |

---

## NCR-002
| Field | Value |
|-------|-------|
| Date | 2026-01-09 23:25 |
| Phase | 31.0 |
| Severity | LOW |
| Description | DEL character (\x7F) is NOT rejected by Mycelium validation. Control character filtering is incomplete. |
| Decision | Document actual behavior in tests. Module SEALED/FROZEN - cannot modify validation logic. |
| Status | OPEN |
| Recommendation | Future phase could add DEL to control character rejection list. |

---

## NCR-003
| Field | Value |
|-------|-------|
| Date | 2026-01-09 23:25 |
| Phase | 31.0 |
| Severity | LOW |
| Description | ELF binary magic bytes (\x7FELF) are NOT rejected by Mycelium validation. Binary detection incomplete. |
| Decision | Document actual behavior in tests. Module SEALED/FROZEN - cannot modify validation logic. |
| Status | OPEN |
| Recommendation | Future phase could add ELF to binary magic bytes rejection list. |

---

## NCR-004
| Field | Value |
|-------|-------|
| Date | 2026-01-09 22:53:17 |
| Phase | N/A |
| Severity | CRITICAL |
| Command | `git reset --hard` |
| Reason | Forbidden command prefix detected |
| Commit | 16586f6 |
| Status | OPEN |

---

## NCR-005
| Field | Value |
|-------|-------|
| Date | 2026-01-09 23:40:07 |
| Phase | N/A |
| Severity | CRITICAL |
| Command | `git reset HEAD~1` |
| Reason | Forbidden command prefix detected |
| Commit | e7a5b6c |
| Status | CLOSED |
| Resolution | Not needed - alternative approach used |

---

## NCR-006
| Field | Value |
|-------|-------|
| Date | 2026-01-10 00:45 |
| Phase | 42.0 |
| Severity | HIGH |
| Description | GOLD MASTER FULL archive (1.5GB) exceeds GitHub 100MB file size limit. Large file in git history prevents push. |
| Decision | Replace FULL archive with smaller SRC archive. Mark as PUSH PENDING. Removal of large file from history requires forbidden git commands (filter-branch, rebase). |
| Status | OPEN |
| Impact | GOLD MASTER locally complete but push blocked. |
| Recommendation | Use GitHub LFS or external storage for large archives in future. |

---

## NCR-1768005853823

| Field | Value |
|-------|-------|
| **Timestamp** | 2026-01-10T00:44:13.822Z |
| **Severity** | MEDIUM |
| **Verdict** | DENY |
| **Command** | `git checkout -b cycle-43` |
| **Reason** | Unknown command pattern |

---

## NCR-1768005858862

| Field | Value |
|-------|-------|
| **Timestamp** | 2026-01-10T00:44:18.861Z |
| **Severity** | MEDIUM |
| **Verdict** | DENY |
| **Command** | `git push -u origin cycle-43` |
| **Reason** | Unknown command pattern |

---

## NCR-1768005863676

| Field | Value |
|-------|-------|
| **Timestamp** | 2026-01-10T00:44:23.675Z |
| **Severity** | MEDIUM |
| **Verdict** | DENY |
| **Command** | `git push origin cycle-43 --tags` |
| **Reason** | Unknown command pattern |

---
