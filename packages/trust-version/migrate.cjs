/**
 * OMEGA Trust Version Migration
 *
 * Provides migration functions between trust chain schema versions.
 * ZERO external dependencies.
 *
 * @module trust-version/migrate
 * @version 1.0.0
 */

const { detectVersion, VERSIONS } = require('./detector.cjs')

/**
 * Migrate V1 payload to V2 (lossless)
 * @param {object} v1Payload - V1 trust chain payload
 * @returns {object} V2 payload
 */
function migrateV1toV2(v1Payload) {
  const version = detectVersion(v1Payload)
  if (version !== VERSIONS.V1) {
    throw new Error(`Input is not a valid V1 payload (detected: ${version})`)
  }

  // Handle both 'phases' and legacy 'entries' format
  const phases = v1Payload.phases || v1Payload.entries || []

  return {
    schema_version: '2.0.0',
    chain_id: v1Payload.chain_id,
    phases: phases.map(phase => ({
      id: phase.id || phase.phase,
      status: phase.status || 'PENDING',
      hash: phase.hash
    })).filter(p => p.id), // Filter out invalid entries
    root_hash: v1Payload.root_hash || '',
    signature_algorithm: 'ed25519',
    migrated_from: 'v1',
    migration_timestamp: new Date().toISOString()
  }
}

/**
 * Migrate V2 payload to V1 (lossy - loses V2-specific fields)
 * @param {object} v2Payload - V2 trust chain payload
 * @returns {object} V1 payload
 */
function migrateV2toV1(v2Payload) {
  const version = detectVersion(v2Payload)
  if (version !== VERSIONS.V2) {
    throw new Error(`Input is not a valid V2 payload (detected: ${version})`)
  }

  return {
    chain_id: v2Payload.chain_id,
    version: '1.0.0',
    phases: v2Payload.phases.map(phase => ({
      id: phase.id,
      // V1 doesn't support 'FAILED' status, map to 'PENDING'
      status: phase.status === 'FAILED' ? 'PENDING' : phase.status,
      hash: phase.hash
    })),
    root_hash: v2Payload.root_hash
    // Note: signature_algorithm, migrated_from, migration_timestamp are lost
  }
}

/**
 * Migrate payload to target version
 * @param {object} payload - Source payload
 * @param {string} targetVersion - Target version
 * @returns {object} Migrated payload
 */
function migrate(payload, targetVersion) {
  const sourceVersion = detectVersion(payload)

  if (sourceVersion === 'UNKNOWN') {
    throw new Error('Cannot detect source version')
  }

  if (sourceVersion === targetVersion) {
    // Return deep clone
    return JSON.parse(JSON.stringify(payload))
  }

  const migrations = {
    [`${VERSIONS.V1}→${VERSIONS.V2}`]: migrateV1toV2,
    [`${VERSIONS.V2}→${VERSIONS.V1}`]: migrateV2toV1,
  }

  const key = `${sourceVersion}→${targetVersion}`
  const migrator = migrations[key]

  if (!migrator) {
    throw new Error(`No migration path from ${sourceVersion} to ${targetVersion}`)
  }

  return migrator(payload)
}

/**
 * Check if migration between versions is lossless
 * @param {string} sourceVersion
 * @param {string} targetVersion
 * @returns {boolean}
 */
function isMigrationLossless(sourceVersion, targetVersion) {
  const lossless = {
    [`${VERSIONS.V1}→${VERSIONS.V2}`]: true,  // V1→V2 adds fields, no loss
    [`${VERSIONS.V2}→${VERSIONS.V1}`]: false, // V2→V1 loses signature_algorithm, etc.
  }
  return lossless[`${sourceVersion}→${targetVersion}`] ?? false
}

/**
 * Get all available migration paths
 * @returns {Array<{from: string, to: string, lossless: boolean}>}
 */
function getMigrationPaths() {
  return [
    { from: VERSIONS.V1, to: VERSIONS.V2, lossless: true },
    { from: VERSIONS.V2, to: VERSIONS.V1, lossless: false },
  ]
}

module.exports = {
  migrateV1toV2,
  migrateV2toV1,
  migrate,
  isMigrationLossless,
  getMigrationPaths
}
