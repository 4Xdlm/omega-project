/**
 * OMEGA Canon Kernel — Hash Module Index
 */

export {
  canonicalize,
  verifyCanonicalEquivalence,
  sortArraysAtPaths,
  type CanonicalPrimitive,
  type CanonicalValue,
  type CanonicalArray,
  type CanonicalObject,
} from './canonicalize.js';

export {
  sha256,
  sha256Buffer,
  sha256Multi,
  verifyHash,
} from './sha256.js';

export {
  toHashableView,
  hashTx,
  hashOps,
  verifyTimestampExclusion,
  inspectHashableFields,
} from './hashable-view.js';

export {
  type HashEntry,
  GENESIS_HASH,
  computeCumulativeHash,
  createHashEntry,
  verifyChain,
  findChainBreak,
  buildChain,
  getChainHead,
} from './chain.js';
