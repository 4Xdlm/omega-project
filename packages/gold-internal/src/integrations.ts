/**
 * @fileoverview OMEGA Gold Internal - Integration Tests
 * @module @omega/gold-internal/integrations
 *
 * Cross-package integration test definitions.
 */

import { sha256, createSystemClock, stableStringify } from '@omega/orchestrator-core';
import { LRUCache, lazy } from '@omega/performance';
import {
  sanitizeString,
  validateString,
  safeJsonParse,
  computeHash,
  seal,
  unseal,
} from '@omega/hardening';
import {
  ProofPackBuilder,
  verifyProofPack,
  serializeProofPack,
  deserializeProofPack,
} from '@omega/proof-pack';
import type { ProofPackManifest } from '@omega/proof-pack';
import { ALL_INVARIANTS, ALL_MODULES } from '@omega/contracts-canon';

import type { IntegrationTest } from './validator.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CORE INTEGRATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Test orchestrator-core + hardening integration.
 */
export const coreHardeningIntegration: IntegrationTest = {
  name: 'Core + Hardening Hash Consistency',
  packages: ['@omega/orchestrator-core', '@omega/hardening'],
  test: () => {
    // Both packages should produce same SHA-256 hashes
    const content = 'test content';
    const coreHash = sha256(content);
    const hardeningHash = computeHash(content);
    return coreHash === hardeningHash;
  },
};

/**
 * Test orchestrator-core + performance integration.
 */
export const corePerformanceIntegration: IntegrationTest = {
  name: 'Core + Performance Determinism',
  packages: ['@omega/orchestrator-core', '@omega/performance'],
  test: () => {
    // Clock provides injectable time source
    const clock = createSystemClock();
    const clockTime = clock.now();

    // LRU cache uses stableStringify for deterministic keys
    const cache = new LRUCache<string>({ maxSize: 10 });
    cache.set('key', stableStringify({ test: 'value' }));

    // Both should work together
    return clockTime >= 0 && cache.has('key') && cache.get('key') === '{"test":"value"}';
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROOF PACK INTEGRATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Test proof-pack + hardening integration.
 */
export const proofPackHardeningIntegration: IntegrationTest = {
  name: 'ProofPack + Hardening Verification',
  packages: ['@omega/proof-pack', '@omega/hardening'],
  test: () => {
    // Create proof pack
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'content');
    const pack = builder.build();

    // Verify with both packages
    const packValid = verifyProofPack(pack).valid;

    // Hardening hash should match
    const evidenceHash = computeHash('content');
    const manifestHash = pack.manifest.evidence[0].hash;

    return packValid && evidenceHash === manifestHash;
  },
};

/**
 * Test proof-pack + orchestrator-core integration.
 */
export const proofPackCoreIntegration: IntegrationTest = {
  name: 'ProofPack + Core Stable JSON',
  packages: ['@omega/proof-pack', '@omega/orchestrator-core'],
  test: () => {
    // Create pack
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'content');
    const pack = builder.build();

    // Serialize and deserialize
    const json = serializeProofPack(pack);
    const restored = deserializeProofPack(json);

    // Should round-trip correctly
    return (
      restored.manifest.packId === pack.manifest.packId &&
      restored.manifest.rootHash === pack.manifest.rootHash
    );
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACTS INTEGRATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Test contracts-canon + hardening integration.
 */
export const contractsHardeningIntegration: IntegrationTest = {
  name: 'Contracts + Hardening Validation',
  packages: ['@omega/contracts-canon', '@omega/hardening'],
  test: () => {
    // Get first invariant from contracts
    const invariant = ALL_INVARIANTS[0];
    if (!invariant) return false;

    // Validate with hardening
    const validation = validateString(invariant.id);
    const sanitized = sanitizeString(invariant.description);

    return validation.valid && sanitized.success;
  },
};

/**
 * Test contracts-canon + proof-pack integration.
 */
export const contractsProofPackIntegration: IntegrationTest = {
  name: 'Contracts + ProofPack Evidence',
  packages: ['@omega/contracts-canon', '@omega/proof-pack'],
  test: () => {
    // Get module contract from canon
    const moduleContract = ALL_MODULES[0];
    if (!moduleContract) return false;

    // Bundle in proof pack
    const builder = new ProofPackBuilder({ name: 'Contract Pack' });
    builder.addConfig('contract.json', JSON.stringify(moduleContract));
    const pack = builder.build();

    return verifyProofPack(pack).valid;
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PERFORMANCE INTEGRATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Test performance + hardening integration.
 */
export const performanceHardeningIntegration: IntegrationTest = {
  name: 'Performance + Hardening Memoization',
  packages: ['@omega/performance', '@omega/hardening'],
  test: () => {
    // Use cache with safe JSON
    const cache = new LRUCache<string>({ maxSize: 10 });

    const json = '{"key": "value"}';
    const result = safeJsonParse(json);

    if (result.success) {
      cache.set('parsed', JSON.stringify(result.value));
    }

    return cache.has('parsed') && result.success;
  },
};

/**
 * Test performance + proof-pack integration.
 */
export const performanceProofPackIntegration: IntegrationTest = {
  name: 'Performance + ProofPack Lazy Building',
  packages: ['@omega/performance', '@omega/proof-pack'],
  test: () => {
    // Lazy proof pack building
    const lazyPack = lazy(() => {
      const builder = new ProofPackBuilder({ name: 'Lazy Pack' });
      builder.addTestLog('lazy.log', 'lazy content');
      return builder.build();
    });

    // Should not be evaluated yet
    if (lazyPack.isEvaluated()) return false;

    // Get the pack
    const pack = lazyPack.get();

    // Should now be evaluated
    return lazyPack.isEvaluated() && verifyProofPack(pack).valid;
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SEALING INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Test hardening seal + proof-pack integration.
 */
export const sealProofPackIntegration: IntegrationTest = {
  name: 'Hardening Seal + ProofPack',
  packages: ['@omega/hardening', '@omega/proof-pack'],
  test: () => {
    // Create and seal proof pack
    const builder = new ProofPackBuilder({ name: 'Sealed Pack' });
    builder.addTestLog('test.log', 'content');
    const pack = builder.build();

    // Seal the manifest
    const sealed = seal(pack.manifest);

    // Unseal and verify
    const unsealed = unseal<ProofPackManifest>(sealed);

    if (!unsealed.valid || !unsealed.payload) return false;

    return unsealed.payload.packId === pack.manifest.packId;
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ALL INTEGRATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All integration tests.
 */
export const ALL_INTEGRATIONS: readonly IntegrationTest[] = [
  coreHardeningIntegration,
  corePerformanceIntegration,
  proofPackHardeningIntegration,
  proofPackCoreIntegration,
  contractsHardeningIntegration,
  contractsProofPackIntegration,
  performanceHardeningIntegration,
  performanceProofPackIntegration,
  sealProofPackIntegration,
];
