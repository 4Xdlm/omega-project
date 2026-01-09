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
