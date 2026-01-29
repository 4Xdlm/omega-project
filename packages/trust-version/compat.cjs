/**
 * OMEGA Trust Version Compatibility Layer
 *
 * Provides compatibility checking and verification routing.
 * ZERO external dependencies.
 *
 * @module trust-version/compat
 * @version 1.0.0
 */

const { detectVersion, VERSIONS } = require('./detector.cjs')
const { migrate, isMigrationLossless } = require('./migrate.cjs')

/**
 * Check if a payload can be verified with given verifier version
 * @param {object} payload - Trust chain payload
 * @param {Buffer} signature - Signature bytes
 * @param {string} publicKey - Public key
 * @param {object} options - Options including verifierVersion
 * @returns {object} Compatibility result
 */
function verifyCompat(payload, signature, publicKey, options = {}) {
  const version = detectVersion(payload)

  if (version === 'UNKNOWN') {
    return {
      valid: false,
      error: 'Unknown payload version',
      version: 'UNKNOWN'
    }
  }

  // Signature verification requires original version verifier
  // because the canonical form differs between versions
  if (options.verifierVersion && options.verifierVersion !== version) {
    return {
      valid: false,
      error: 'Signature verification requires original version verifier',
      version,
      requestedVersion: options.verifierVersion,
      note: 'Re-signing required after migration'
    }
  }

  return {
    valid: true,
    version,
    verifierUsed: version
  }
}

/**
 * Get the compatibility matrix for all versions
 * @returns {object} Compatibility matrix
 */
function getCompatibilityMatrix() {
  return {
    [VERSIONS.V1]: {
      canReadBy: [VERSIONS.V1, VERSIONS.V2],
      canVerifyWith: [VERSIONS.V1],
      canMigrateTo: [VERSIONS.V2],
      lossyMigrations: []
    },
    [VERSIONS.V2]: {
      canReadBy: [VERSIONS.V2],
      canVerifyWith: [VERSIONS.V2],
      canMigrateTo: [VERSIONS.V1],
      lossyMigrations: [VERSIONS.V1]
    },
    [VERSIONS.V3]: {
      canReadBy: [VERSIONS.V3],
      canVerifyWith: [VERSIONS.V3],
      canMigrateTo: [VERSIONS.V2],
      lossyMigrations: [VERSIONS.V2, VERSIONS.V1]
    }
  }
}

/**
 * Check if source version is compatible with target reader
 * @param {string} sourceVersion
 * @param {string} readerVersion
 * @returns {boolean}
 */
function isReadableBy(sourceVersion, readerVersion) {
  const matrix = getCompatibilityMatrix()
  const entry = matrix[sourceVersion]
  if (!entry) return false
  return entry.canReadBy.includes(readerVersion)
}

/**
 * Get upgrade path from source to target version
 * @param {string} sourceVersion
 * @param {string} targetVersion
 * @returns {Array<{from: string, to: string, lossless: boolean}>|null}
 */
function getUpgradePath(sourceVersion, targetVersion) {
  if (sourceVersion === targetVersion) {
    return [] // No migration needed
  }

  // Direct paths
  const directPaths = {
    [`${VERSIONS.V1}→${VERSIONS.V2}`]: [
      { from: VERSIONS.V1, to: VERSIONS.V2, lossless: true }
    ],
    [`${VERSIONS.V2}→${VERSIONS.V1}`]: [
      { from: VERSIONS.V2, to: VERSIONS.V1, lossless: false }
    ],
  }

  return directPaths[`${sourceVersion}→${targetVersion}`] || null
}

module.exports = {
  verifyCompat,
  getCompatibilityMatrix,
  isReadableBy,
  getUpgradePath
}
