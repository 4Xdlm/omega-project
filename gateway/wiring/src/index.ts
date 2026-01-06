// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — INDEX
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  NexusMessageKind,
  NexusAuthContext,
  NexusEnvelope,
  NexusError,
  NexusOk,
  NexusErr,
  NexusResult,
  Clock,
  IdFactory,
  NexusHandler,
} from './types.js';

export {
  ENVELOPE_ALLOWED_FIELDS,
  ENVELOPE_REQUIRED_STRING_FIELDS,
  ok,
  fail,
  isOk,
  isErr,
} from './types.js';

// ─── Clock ────────────────────────────────────────────────────────────────────
export {
  SystemClock,
  FixedClock,
  IncrementalClock,
  createSystemClock,
  createFixedClock,
  createIncrementalClock,
} from './clock.js';

// ─── IdFactory ────────────────────────────────────────────────────────────────
export {
  SystemIdFactory,
  FixedIdFactory,
  SequentialIdFactory,
  DeterministicIdFactory,
  createSystemIdFactory,
  createFixedIdFactory,
  createSequentialIdFactory,
  createDeterministicIdFactory,
} from './id_factory.js';

// ─── Canonical JSON ───────────────────────────────────────────────────────────
export {
  CanonicalJsonError,
  canonicalStringify,
  canonicalNormalize,
  canonicalEquals,
  canonicalHash,
} from './canonical_json.js';

// ─── Errors ───────────────────────────────────────────────────────────────────
export {
  EnvelopeErrorCodes,
  WiringErrorCodes,
  AdapterErrorCodes,
  err,
  envelopeError,
  wiringError,
  adapterError,
  EnvelopeErrors,
  WiringErrors,
  safeError,
  safeExecute,
} from './errors.js';

// ─── Envelope ─────────────────────────────────────────────────────────────────
export type { BuildEnvelopeArgs } from './envelope.js';

export {
  buildEnvelope,
  validateEnvelopeStrict,
  validateEnvelopeLenient,
  parsePayloadSchema,
  buildPayloadSchema,
  isSameReplayKey,
  computeReplayKey,
  verifyReplayKey,
} from './envelope.js';

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════════════════════

export const WIRING_VERSION = '1.0.0';
export const WIRING_MODULE = 'wiring@1.0.0';
