# TODO Marker Exceptions (Intentional Patterns)

**Purpose:** This document lists the remaining occurrences of `TODO|FIXME|HACK|XXX` in comment context that are **intentional** and required for scan/verify tooling.

**Rule:** No `TODO/FIXME/HACK/XXX` markers are allowed in active documentation or production code.
These exceptions are confined to scan/verification scripts where the literal tokens are required as search patterns.

**Generated:** 2026-01-19 17:49:27
**Scope:** repo root (excluding FROZEN modules, `nexus/proof/**`, `node_modules/**`, build artifacts, binaries)
**Pattern:** Comment markers only (`// TODO`, `/* FIXME`, `# HACK:`, etc.)

**FROZEN modules (intentionally preserved):**
- `OMEGA_SENTINEL_SUPREME`
- `packages\\genome`
- `packages\\mycelium`
- `sprint28_5`
- `nexus\\proof`
- `node_modules`
- `.git`
- `dist`
- `build`
- `coverage`
- `archives`
- `evidence`

**Allowed scan tool files:**
- `omega-math-scan.ps1`
- `VERIFY.ps1`
- `verify-omega.ps1`
- `verify-omega.sh`
- `generate_gaps_report.ps1`
- `doc-todo-exceptions.ps1`

**Scan tool exceptions count:** 50
**Other markers found (FROZEN/false positives):** 2335

---

## Scan Tool Exceptions (file:line)

- **doc-todo-exceptions.ps1:44:1**
  - Snippet: `# Matches: // TODO: , /* FIXME , # HACK: , // XXX , etc.`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **doc-todo-exceptions.ps1:120:1**
  - Snippet: `# TODO Marker Exceptions (Intentional Patterns)`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **doc-todo-exceptions.ps1:129:1**
  - Snippet: `**Pattern:** Comment markers only (``// TODO``, ``/* FIXME``, ``# HACK:``, etc.)`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **generate_gaps_report.ps1:21:1**
  - Snippet: `"`n## TODO / FIXME / NCR / OPEN (repo scan)`n" | Out-File $out -Append`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-cleanup-20260119-170500/AFTER_SCAN.txt:455:1**
  - Snippet: `.\nexus\proof\todo-scan-20260119-165002\TODO_SCAN_FILES.csv:119:30:"omega-math-scan.ps1",337,4,"TODO","## TODO METRICS"`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-cleanup-20260119-170500/AFTER_SCAN.txt:627:1**
  - Snippet: `.\nexus\proof\todo-scan-20260119-165002\raw_scan.txt:118:32:.\omega-math-scan.ps1:337:4:## TODO METRICS`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-cleanup-20260119-170500/AFTER_SCAN.txt:1878:1**
  - Snippet: `.\nexus\proof\todo-cleanup-20260119-170500\BEFORE_SCAN.txt:167:32:.\omega-math-scan.ps1:337:4:## TODO METRICS`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-cleanup-20260119-170500/AFTER_SCAN.txt:2336:1**
  - Snippet: `.\nexus\proof\todo-cleanup-20260119-170500\BEFORE_SCAN.txt:625:41:.\nexus\proof\todo-scan-20260119-165002\TODO_SCAN_FILES.csv:119:30:"omega-math-scan.ps1",337,4,"TODO","## TODO METRICS"`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-cleanup-20260119-170500/AFTER_SCAN.txt:2511:1**
  - Snippet: `.\nexus\proof\todo-cleanup-20260119-170500\BEFORE_SCAN.txt:800:92:.\nexus\proof\todo-scan-20260119-165002\raw_scan.txt:118:32:.\omega-math-scan.ps1:337:4:## TODO METRICS`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-cleanup-20260119-170500/BEFORE_SCAN.txt:167:1**
  - Snippet: `.\omega-math-scan.ps1:337:4:## TODO METRICS`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-cleanup-20260119-170500/BEFORE_SCAN.txt:625:1**
  - Snippet: `.\nexus\proof\todo-scan-20260119-165002\TODO_SCAN_FILES.csv:119:30:"omega-math-scan.ps1",337,4,"TODO","## TODO METRICS"`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-cleanup-20260119-170500/BEFORE_SCAN.txt:800:1**
  - Snippet: `.\nexus\proof\todo-scan-20260119-165002\raw_scan.txt:118:32:.\omega-math-scan.ps1:337:4:## TODO METRICS`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174620/raw_markers_all.txt:6:1**
  - Snippet: `doc-todo-exceptions.ps1:89:1:# TODO Marker Exceptions (Intentional Patterns)`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174620/raw_markers_all.txt:12:1**
  - Snippet: `generate_gaps_report.ps1:21:1:"`n## TODO / FIXME / NCR / OPEN (repo scan)`n" | Out-File $out -Append`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174620/raw_markers_unexpected.txt:6:1**
  - Snippet: `doc-todo-exceptions.ps1:89:1:# TODO Marker Exceptions (Intentional Patterns)`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174620/raw_markers_unexpected.txt:12:1**
  - Snippet: `generate_gaps_report.ps1:21:1:"`n## TODO / FIXME / NCR / OPEN (repo scan)`n" | Out-File $out -Append`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_all.txt:7:1**
  - Snippet: `doc-todo-exceptions.ps1:115:1:# TODO Marker Exceptions (Intentional Patterns)`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_all.txt:13:1**
  - Snippet: `generate_gaps_report.ps1:21:1:"`n## TODO / FIXME / NCR / OPEN (repo scan)`n" | Out-File $out -Append`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_all.txt:743:1**
  - Snippet: `nexus/proof/todo-cleanup-20260119-170500/AFTER_SCAN.txt:455:1:.\nexus\proof\todo-scan-20260119-165002\TODO_SCAN_FILES.csv:119:30:"omega-math-scan.ps1",337,4,"TODO","## TODO METRICS"`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_all.txt:915:1**
  - Snippet: `nexus/proof/todo-cleanup-20260119-170500/AFTER_SCAN.txt:627:1:.\nexus\proof\todo-scan-20260119-165002\raw_scan.txt:118:32:.\omega-math-scan.ps1:337:4:## TODO METRICS`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_all.txt:2166:1**
  - Snippet: `nexus/proof/todo-cleanup-20260119-170500/AFTER_SCAN.txt:1878:1:.\nexus\proof\todo-cleanup-20260119-170500\BEFORE_SCAN.txt:167:32:.\omega-math-scan.ps1:337:4:## TODO METRICS`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_all.txt:2624:1**
  - Snippet: `nexus/proof/todo-cleanup-20260119-170500/AFTER_SCAN.txt:2336:1:.\nexus\proof\todo-cleanup-20260119-170500\BEFORE_SCAN.txt:625:41:.\nexus\proof\todo-scan-20260119-165002\TODO_SCAN_FILES.csv:119:30:"omega-math-scan.ps1",337,4,"TODO","## TODO METRICS"`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_all.txt:2799:1**
  - Snippet: `nexus/proof/todo-cleanup-20260119-170500/AFTER_SCAN.txt:2511:1:.\nexus\proof\todo-cleanup-20260119-170500\BEFORE_SCAN.txt:800:92:.\nexus\proof\todo-scan-20260119-165002\raw_scan.txt:118:32:.\omega-math-scan.ps1:337:4:## TODO METRICS`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_all.txt:4099:1**
  - Snippet: `nexus/proof/todo-cleanup-20260119-170500/BEFORE_SCAN.txt:167:1:.\omega-math-scan.ps1:337:4:## TODO METRICS`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_all.txt:4557:1**
  - Snippet: `nexus/proof/todo-cleanup-20260119-170500/BEFORE_SCAN.txt:625:1:.\nexus\proof\todo-scan-20260119-165002\TODO_SCAN_FILES.csv:119:30:"omega-math-scan.ps1",337,4,"TODO","## TODO METRICS"`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_all.txt:4732:1**
  - Snippet: `nexus/proof/todo-cleanup-20260119-170500/BEFORE_SCAN.txt:800:1:.\nexus\proof\todo-scan-20260119-165002\raw_scan.txt:118:32:.\omega-math-scan.ps1:337:4:## TODO METRICS`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_all.txt:6134:1**
  - Snippet: `nexus/proof/todo-exceptions-doc-20260119-174620/raw_markers_all.txt:6:1:doc-todo-exceptions.ps1:89:1:# TODO Marker Exceptions (Intentional Patterns)`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_all.txt:6140:1**
  - Snippet: `nexus/proof/todo-exceptions-doc-20260119-174620/raw_markers_all.txt:12:1:generate_gaps_report.ps1:21:1:"`n## TODO / FIXME / NCR / OPEN (repo scan)`n" | Out-File $out -Append`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_all.txt:6870:1**
  - Snippet: `nexus/proof/todo-exceptions-doc-20260119-174620/raw_markers_unexpected.txt:6:1:doc-todo-exceptions.ps1:89:1:# TODO Marker Exceptions (Intentional Patterns)`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_all.txt:6876:1**
  - Snippet: `nexus/proof/todo-exceptions-doc-20260119-174620/raw_markers_unexpected.txt:12:1:generate_gaps_report.ps1:21:1:"`n## TODO / FIXME / NCR / OPEN (repo scan)`n" | Out-File $out -Append`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_all.txt:7676:1**
  - Snippet: `nexus/proof/todo-scan-20260119-165002/raw_scan.txt:118:1:.\omega-math-scan.ps1:337:4:## TODO METRICS`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_all.txt:8153:1**
  - Snippet: `nexus/proof/todo-scan-20260119-165002/TODO_SCAN_FILES.csv:119:1:"omega-math-scan.ps1",337,4,"TODO","## TODO METRICS"`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_exceptions.txt:7:1**
  - Snippet: `doc-todo-exceptions.ps1:115:1:# TODO Marker Exceptions (Intentional Patterns)`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_exceptions.txt:13:1**
  - Snippet: `generate_gaps_report.ps1:21:1:"`n## TODO / FIXME / NCR / OPEN (repo scan)`n" | Out-File $out -Append`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_exceptions.txt:63:1**
  - Snippet: `nexus/proof/todo-cleanup-20260119-170500/AFTER_SCAN.txt:455:1:.\nexus\proof\todo-scan-20260119-165002\TODO_SCAN_FILES.csv:119:30:"omega-math-scan.ps1",337,4,"TODO","## TODO METRICS"`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_exceptions.txt:82:1**
  - Snippet: `nexus/proof/todo-cleanup-20260119-170500/AFTER_SCAN.txt:627:1:.\nexus\proof\todo-scan-20260119-165002\raw_scan.txt:118:32:.\omega-math-scan.ps1:337:4:## TODO METRICS`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_exceptions.txt:176:1**
  - Snippet: `nexus/proof/todo-cleanup-20260119-170500/AFTER_SCAN.txt:1878:1:.\nexus\proof\todo-cleanup-20260119-170500\BEFORE_SCAN.txt:167:32:.\omega-math-scan.ps1:337:4:## TODO METRICS`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_exceptions.txt:215:1**
  - Snippet: `nexus/proof/todo-cleanup-20260119-170500/AFTER_SCAN.txt:2336:1:.\nexus\proof\todo-cleanup-20260119-170500\BEFORE_SCAN.txt:625:41:.\nexus\proof\todo-scan-20260119-165002\TODO_SCAN_FILES.csv:119:30:"omega-math-scan.ps1",337,4,"TODO","## TODO METRICS"`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_exceptions.txt:234:1**
  - Snippet: `nexus/proof/todo-cleanup-20260119-170500/AFTER_SCAN.txt:2511:1:.\nexus\proof\todo-cleanup-20260119-170500\BEFORE_SCAN.txt:800:92:.\nexus\proof\todo-scan-20260119-165002\raw_scan.txt:118:32:.\omega-math-scan.ps1:337:4:## TODO METRICS`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_exceptions.txt:304:1**
  - Snippet: `nexus/proof/todo-cleanup-20260119-170500/BEFORE_SCAN.txt:167:1:.\omega-math-scan.ps1:337:4:## TODO METRICS`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_exceptions.txt:343:1**
  - Snippet: `nexus/proof/todo-cleanup-20260119-170500/BEFORE_SCAN.txt:625:1:.\nexus\proof\todo-scan-20260119-165002\TODO_SCAN_FILES.csv:119:30:"omega-math-scan.ps1",337,4,"TODO","## TODO METRICS"`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_exceptions.txt:362:1**
  - Snippet: `nexus/proof/todo-cleanup-20260119-170500/BEFORE_SCAN.txt:800:1:.\nexus\proof\todo-scan-20260119-165002\raw_scan.txt:118:32:.\omega-math-scan.ps1:337:4:## TODO METRICS`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_exceptions.txt:462:1**
  - Snippet: `nexus/proof/todo-exceptions-doc-20260119-174620/raw_markers_all.txt:6:1:doc-todo-exceptions.ps1:89:1:# TODO Marker Exceptions (Intentional Patterns)`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_exceptions.txt:468:1**
  - Snippet: `nexus/proof/todo-exceptions-doc-20260119-174620/raw_markers_all.txt:12:1:generate_gaps_report.ps1:21:1:"`n## TODO / FIXME / NCR / OPEN (repo scan)`n" | Out-File $out -Append`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_exceptions.txt:540:1**
  - Snippet: `nexus/proof/todo-exceptions-doc-20260119-174620/raw_markers_unexpected.txt:6:1:doc-todo-exceptions.ps1:89:1:# TODO Marker Exceptions (Intentional Patterns)`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_exceptions.txt:546:1**
  - Snippet: `nexus/proof/todo-exceptions-doc-20260119-174620/raw_markers_unexpected.txt:12:1:generate_gaps_report.ps1:21:1:"`n## TODO / FIXME / NCR / OPEN (repo scan)`n" | Out-File $out -Append`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_exceptions.txt:562:1**
  - Snippet: `nexus/proof/todo-scan-20260119-165002/raw_scan.txt:118:1:.\omega-math-scan.ps1:337:4:## TODO METRICS`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-exceptions-doc-20260119-174816/raw_markers_exceptions.txt:611:1**
  - Snippet: `nexus/proof/todo-scan-20260119-165002/TODO_SCAN_FILES.csv:119:1:"omega-math-scan.ps1",337,4,"TODO","## TODO METRICS"`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-scan-20260119-165002/raw_scan.txt:118:1**
  - Snippet: `.\omega-math-scan.ps1:337:4:## TODO METRICS`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

- **nexus/proof/todo-scan-20260119-165002/TODO_SCAN_FILES.csv:119:1**
  - Snippet: `"omega-math-scan.ps1",337,4,"TODO","## TODO METRICS"`
  - Justification: **Intentional pattern token for scan/verify scripts - DO NOT REMOVE**

