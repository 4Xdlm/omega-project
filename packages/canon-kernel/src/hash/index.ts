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
} from './canonicalize';

export {
  sha256,
  sha256Buffer,
  sha256Multi,
  verifyHash,
} from './sha256';

export {
  toHashableView,
  hashTx,
  hashOps,
  verifyTimestampExclusion,
  inspectHashableFields,
} from './hashable-view';

export {
  type HashEntry,
  GENESIS_HASH,
  computeCumulativeHash,
  createHashEntry,
  verifyChain,
  findChainBreak,
  buildChain,
  getChainHead,
} from './chain';
