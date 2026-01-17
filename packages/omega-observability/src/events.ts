// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA OBSERVABILITY — STRUCTURED EVENTS
// packages/omega-observability/src/events.ts
// Version: 1.0.0
// ═══════════════════════════════════════════════════════════════════════════════
//
// Minimal, opt-in structured event emission for observability.
// NO console.* calls. NO sensitive data. NO spam.
//
// INVARIANTS:
//   - Events are fire-and-forget (never block pipeline)
//   - Disabled by default (opt-in via setEventCallback)
//   - Never logs sensitive data (text, prompts, PII)
//   - Only logs: durations, counts, codes, truncated IDs
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Severity levels for observability events
 */
export type ObsSeverity = 'INFO' | 'WARN' | 'ERROR';

/**
 * Structured observability event
 *
 * CRITICAL: Context must NEVER contain sensitive data:
 * - NO text/content/prompts
 * - NO user IDs (use truncated hash if needed)
 * - NO secrets/tokens
 *
 * ALLOWED in context:
 * - durationMs, itemCount, errorCode
 * - truncated IDs (first 8 chars of hash)
 * - step names, operation names
 */
export interface ObsEvent {
  /** Event name (e.g., "pipeline.start") */
  readonly name: string;
  /** Severity level */
  readonly severity: ObsSeverity;
  /** Stable event code (e.g., "OBS-PIPE-001") */
  readonly code: string;
  /** ISO timestamp */
  readonly timestamp: string;
  /** Context (REDACTED - no sensitive data) */
  readonly context: Readonly<Record<string, string | number | boolean | undefined>>;
}

/**
 * Event callback type
 */
export type ObsEventCallback = (event: Readonly<ObsEvent>) => void;

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL STATE
// ═══════════════════════════════════════════════════════════════════════════════

/** Global event callback (undefined = disabled) */
let globalCallback: ObsEventCallback | undefined;

/** Event history for testing (limited to 100) */
let eventHistory: ObsEvent[] = [];
const MAX_HISTORY = 100;

/** Enable history recording (for testing) */
let recordHistory = false;

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Set global event callback
 *
 * @param callback - Callback to receive events (undefined to disable)
 */
export function setEventCallback(callback: ObsEventCallback | undefined): void {
  globalCallback = callback;
}

/**
 * Enable/disable event history recording (for testing)
 */
export function setRecordHistory(enabled: boolean): void {
  recordHistory = enabled;
  if (!enabled) {
    eventHistory = [];
  }
}

/**
 * Get recorded event history (for testing)
 */
export function getEventHistory(): readonly ObsEvent[] {
  return [...eventHistory];
}

/**
 * Clear event history
 */
export function clearEventHistory(): void {
  eventHistory = [];
}

/**
 * Emit an observability event
 *
 * Fire-and-forget: never blocks, never throws.
 * Does nothing if no callback is registered.
 *
 * @param name - Event name (e.g., "pipeline.start")
 * @param severity - INFO, WARN, or ERROR
 * @param code - Stable event code (e.g., "OBS-PIPE-001")
 * @param context - Context object (no sensitive data!)
 */
export function emitEvent(
  name: string,
  severity: ObsSeverity,
  code: string,
  context: Record<string, string | number | boolean | undefined> = {}
): void {
  // Fast path: no callback and no history recording
  if (!globalCallback && !recordHistory) {
    return;
  }

  const event: ObsEvent = Object.freeze({
    name,
    severity,
    code,
    timestamp: new Date().toISOString(),
    context: Object.freeze({ ...context }),
  });

  // Record history if enabled (for testing)
  if (recordHistory) {
    eventHistory.push(event);
    if (eventHistory.length > MAX_HISTORY) {
      eventHistory.shift();
    }
  }

  // Fire callback (never throw)
  if (globalCallback) {
    try {
      globalCallback(event);
    } catch {
      // Silently ignore callback errors
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Truncate an ID to first 8 characters (safe for logging)
 */
export function truncateId(id: string): string {
  return id.slice(0, 8);
}

/**
 * Create a duration tracker
 * Returns a function that, when called, emits a "complete" event with duration
 */
export function trackDuration(
  startName: string,
  completeName: string,
  code: string,
  baseContext: Record<string, string | number | boolean | undefined> = {}
): () => void {
  const startTime = Date.now();

  emitEvent(startName, 'INFO', code, baseContext);

  return () => {
    const durationMs = Date.now() - startTime;
    emitEvent(completeName, 'INFO', code, { ...baseContext, durationMs });
  };
}
