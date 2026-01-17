# OMEGA Observability Check — Chapter 9
**Date**: 2026-01-17

---

## Observability Package Found

**Package**: `omega-observability` v1.0.0
**Path**: `packages/omega-observability/`

### Exports
- `ProgressEmitter` - main class for progress tracking
- `createNoopEmitter()` - no-op emitter (silent)
- `createCliEmitter()` - CLI progress display
- `createCiEmitter()` - CI-friendly output
- `setEventCallback()` - set custom callback
- `setRecordHistory()` - enable history recording
- `getEventHistory()` - retrieve recorded events

---

## Can It Be Enabled Without Code Changes?

**NO**

### Reason
1. No documented environment variable (e.g., `OMEGA_DEBUG=1`)
2. No CLI flag to enable observability
3. Observability must be programmatically enabled by calling:
   ```typescript
   import { setEventCallback, setRecordHistory } from 'omega-observability';
   setRecordHistory(true);
   setEventCallback((event) => console.log(event));
   ```
4. Since there is no working CLI to call, there is no way to enable observability

---

## Alternative: omega-nexus verify

The `omega-nexus verify` command provides some observability:
```
node scripts/cli.js verify --dir "C:/Users/elric/omega-project"

═══════════════════════════════════════════════════════════════════════════════
  OMEGA NEXUS — VERIFY
═══════════════════════════════════════════════════════════════════════════════

Structure:
  ✓ nexus/genesis exists
  ...

Guardian:
  ✓ All 5 rules passed

Seal Chain:
  ✓ 22 seal(s) in chain

Latest Seal:
  ✗ Invalid seal structure
```

This is nexus verification, not pipeline observability.

---

## Conclusion

**Observability NOT AVAILABLE without code modification**

To enable observability for text analysis:
1. The omega CLI must be fixed (ts-node missing)
2. The analyze command must actually read files (currently simulated)
3. Code must call `setRecordHistory(true)` before pipeline execution
4. Events could then be captured via `getEventHistory()`

**BLOCKED BY**: No working CLI and no documented env/config toggle.
