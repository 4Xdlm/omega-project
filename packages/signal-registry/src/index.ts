/**
 * OMEGA Signal Registry — Public API
 * @module @omega/signal-registry
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import { OMEGA_SIGNAL_REGISTRY } from './registry.js';

// Types
export type { SignalDescriptor, SignalStability, ProducerName, ValidationResult } from './types.js';
export { VALID_PRODUCERS } from './types.js';

// Registry
export { OMEGA_SIGNAL_REGISTRY, SIGNAL_ID_SET } from './registry.js';
export type { SignalId } from './registry.js';

// Validators
export { validateProducerOutputs, validateConsumerRequirements } from './validators.js';

// Registry hash (computed once, deterministic)
export const REGISTRY_HASH: string = sha256(canonicalize(OMEGA_SIGNAL_REGISTRY));
