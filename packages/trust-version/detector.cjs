/**
 * OMEGA Trust Version Detector
 *
 * Detects the schema version of trust chain payloads.
 * ZERO external dependencies.
 *
 * @module trust-version/detector
 * @version 1.0.0
 */

const VERSIONS = {
  V1: '1.0.0',
  V2: '2.0.0',
  V3: '3.0.0'
}

/**
 * Detect the version of a trust chain payload
 * @param {object} payload - Trust chain payload
 * @returns {string} Version string or 'UNKNOWN'
 */
function detectVersion(payload) {
  if (!payload || typeof payload !== 'object') {
    return 'UNKNOWN'
  }

  // V2+ uses explicit schema_version field
  if (payload.schema_version) {
    if (payload.schema_version === '2.0.0') return VERSIONS.V2
    if (payload.schema_version === '3.0.0') return VERSIONS.V3
    return 'UNKNOWN'
  }

  // V1 detection: has version, chain_id, phases, root_hash
  if (payload.version && /^[0-9]+\.[0-9]+\.[0-9]+$/.test(payload.version)) {
    if (payload.chain_id && payload.phases && payload.root_hash) {
      return VERSIONS.V1
    }
    // Legacy Phase X format with entries instead of phases
    if (payload.chain_id && payload.entries) {
      return VERSIONS.V1
    }
  }

  return 'UNKNOWN'
}

/**
 * Check if a version is supported
 * @param {string} version - Version string
 * @returns {boolean}
 */
function isSupported(version) {
  return Object.values(VERSIONS).includes(version)
}

/**
 * Get list of supported versions
 * @returns {string[]}
 */
function getSupportedVersions() {
  return Object.values(VERSIONS)
}

/**
 * Get the latest supported version
 * @returns {string}
 */
function getLatestVersion() {
  return VERSIONS.V2 // V3 reserved for future
}

module.exports = {
  VERSIONS,
  detectVersion,
  isSupported,
  getSupportedVersions,
  getLatestVersion
}
