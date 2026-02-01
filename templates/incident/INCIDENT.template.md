# INCIDENT <INCIDENT_ID>

## Metadata

| Field | Value |
|-------|-------|
| Incident ID | `<INCIDENT_ID>` |
| Severity | `<CRITICAL\|HIGH\|MEDIUM\|LOW>` |
| Status | `<OPEN\|INVESTIGATING\|RESOLVED\|CLOSED>` |
| Detected | `<ISO8601>` |
| Resolved | `<ISO8601>` |
| Duration | `<DURATION>` |

---

## Summary

<2-3 sentences describing the incident>

---

## Timeline

| Time (UTC) | Event |
|------------|-------|
| `<ISO8601>` | Incident detected |
| `<ISO8601>` | Team alerted |
| `<ISO8601>` | Root cause identified |
| `<ISO8601>` | Fix deployed / Rollback executed |
| `<ISO8601>` | Resolution verified |
| `<ISO8601>` | Incident closed |

---

## Impact

### Affected Components
- `<COMPONENT_1>`
- `<COMPONENT_2>`

### Affected Users/Systems
- `<DESCRIPTION>`

### Data Impact
- `<NONE\|DESCRIPTION>`

### Business Impact
- `<DESCRIPTION>`

---

## Root Cause

### What happened
<Detailed explanation of what went wrong>

### Why it happened
<Explanation of the underlying cause>

### Contributing factors
- `<FACTOR_1>`
- `<FACTOR_2>`

---

## Resolution

### Immediate actions
1. `<ACTION_1>`
2. `<ACTION_2>`

### Fix description
<What was done to fix the issue>

### Rollback (if applicable)
- Target: `<TAG>`
- Reason: `<REASON>`
- Rollback plan ref: `<ROLLBACK_PLAN_ID>`

---

## Prevention

### Action items
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| `<ACTION>` | `<OWNER>` | `<DATE>` | `<STATUS>` |

### Process improvements
- `<IMPROVEMENT_1>`
- `<IMPROVEMENT_2>`

### Monitoring improvements
- `<IMPROVEMENT_1>`

---

## Evidence References

| Type | Reference |
|------|-----------|
| Logs | `<LOG_REF>` |
| Traces | `<TRACE_REF>` |
| Screenshots | `<SCREENSHOT_REF>` |
| Metrics | `<METRIC_REF>` |

---

## Approvals

| Role | Name | Date |
|------|------|------|
| Incident Owner | `<NAME>` | `<DATE>` |
| Post-mortem Reviewer | `<NAME>` | `<DATE>` |

---

**Generated**: `<ISO8601>`
**Standard**: NASA-Grade L4
