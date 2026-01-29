#!/usr/bin/env node
/**
 * OMEGA SBOM Generator
 *
 * Generates a Software Bill of Materials for the OMEGA project.
 * ZERO external dependencies - uses only Node.js built-ins.
 *
 * @module sbom/generator
 * @version 1.0.0
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// ═══════════════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════════════

const SBOM_VERSION = '1.0.0'
const SBOM_FORMAT = 'OMEGA-SBOM'

// ═══════════════════════════════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Read and parse package.json
 * @param {string} projectPath
 * @returns {object}
 */
function readPackageJson(projectPath) {
  const pkgPath = path.join(projectPath, 'package.json')
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
}

/**
 * Read and parse package-lock.json
 * @param {string} projectPath
 * @returns {object}
 */
function readLockfile(projectPath) {
  const lockPath = path.join(projectPath, 'package-lock.json')
  return JSON.parse(fs.readFileSync(lockPath, 'utf8'))
}

/**
 * Compute SHA-256 of file
 * @param {string} filePath
 * @returns {string}
 */
function hashFile(filePath) {
  const content = fs.readFileSync(filePath)
  return crypto.createHash('sha256').update(content).digest('hex')
}

/**
 * Compute SHA-256 of string
 * @param {string} str
 * @returns {string}
 */
function hashString(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex')
}

/**
 * Check for floating versions in dependencies
 * @param {object} deps - Dependencies object
 * @returns {Array<{name: string, version: string, issue: string}>}
 */
function checkFloatingVersions(deps) {
  const floating = []

  for (const [name, version] of Object.entries(deps || {})) {
    if (typeof version !== 'string') continue

    if (version.startsWith('^') || version.startsWith('~') || version === '*' || version === 'latest') {
      floating.push({ name, version, issue: 'floating' })
    }
  }

  return floating
}

/**
 * Extract dependencies from lockfile
 * @param {object} lockfile
 * @returns {Array}
 */
function extractDependencies(lockfile) {
  const deps = []

  // Lockfile v2/v3 format
  if (lockfile.packages) {
    for (const [pkgPath, pkg] of Object.entries(lockfile.packages)) {
      if (pkgPath === '') continue // Root package
      if (!pkg || typeof pkg !== 'object') continue

      const name = pkgPath.replace(/^node_modules\//, '').split('/node_modules/').pop()

      deps.push({
        name,
        version: pkg.version || 'unknown',
        resolved: pkg.resolved,
        integrity: pkg.integrity,
        dev: pkg.dev || false,
        optional: pkg.optional || false
      })
    }
  }

  return deps
}

/**
 * Generate SBOM for project
 * @param {string} projectPath
 * @param {object} options - Options (allowFloating: boolean)
 * @returns {object}
 */
function generateSBOM(projectPath, options = {}) {
  const pkg = readPackageJson(projectPath)
  const lockfile = readLockfile(projectPath)

  // Check for floating versions
  const floatingDeps = checkFloatingVersions(pkg.dependencies)
  const floatingDevDeps = checkFloatingVersions(pkg.devDependencies)
  const allFloating = [...floatingDeps, ...floatingDevDeps]

  if (allFloating.length > 0 && !options.allowFloating) {
    throw new Error(`Floating versions detected: ${JSON.stringify(allFloating)}`)
  }

  // Extract dependencies
  const dependencies = extractDependencies(lockfile)

  // Compute lockfile hash
  const lockfileHash = hashFile(path.join(projectPath, 'package-lock.json'))

  // Build SBOM
  const sbom = {
    sbom_format: SBOM_FORMAT,
    sbom_version: SBOM_VERSION,
    generated_at: new Date().toISOString(),
    project: {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description || ''
    },
    lockfile: {
      path: 'package-lock.json',
      lockfileVersion: lockfile.lockfileVersion,
      sha256: lockfileHash
    },
    summary: {
      total_dependencies: dependencies.length,
      production_dependencies: dependencies.filter(d => !d.dev).length,
      dev_dependencies: dependencies.filter(d => d.dev).length,
      optional_dependencies: dependencies.filter(d => d.optional).length
    },
    warnings: allFloating.length > 0 ? {
      floating_versions: allFloating
    } : undefined,
    dependencies: dependencies.map(d => ({
      name: d.name,
      version: d.version,
      integrity: d.integrity,
      dev: d.dev,
      optional: d.optional
    })),
    integrity: {
      sbom_hash: '' // Computed after
    }
  }

  // Compute SBOM hash (excluding the hash field itself)
  const sbomForHash = JSON.parse(JSON.stringify(sbom))
  sbomForHash.integrity = {}
  sbom.integrity.sbom_hash = hashString(JSON.stringify(sbomForHash))

  return sbom
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// VERIFICATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Verify SBOM against current state
 * @param {string} sbomPath
 * @param {string} projectPath
 * @returns {object}
 */
function verifySBOM(sbomPath, projectPath) {
  const sbom = JSON.parse(fs.readFileSync(sbomPath, 'utf8'))
  const results = { valid: true, checks: [], errors: [] }

  // 1. Verify lockfile hash
  const currentLockHash = hashFile(path.join(projectPath, 'package-lock.json'))
  if (currentLockHash === sbom.lockfile.sha256) {
    results.checks.push({ name: 'Lockfile hash', status: 'PASS' })
  } else {
    results.valid = false
    results.checks.push({ name: 'Lockfile hash', status: 'FAIL' })
    results.errors.push(`Lockfile changed: expected ${sbom.lockfile.sha256}, got ${currentLockHash}`)
  }

  // 2. Verify SBOM integrity
  const sbomCopy = JSON.parse(JSON.stringify(sbom))
  const declaredHash = sbomCopy.integrity.sbom_hash
  sbomCopy.integrity = {}
  const computedHash = hashString(JSON.stringify(sbomCopy))

  if (computedHash === declaredHash) {
    results.checks.push({ name: 'SBOM integrity', status: 'PASS' })
  } else {
    results.valid = false
    results.checks.push({ name: 'SBOM integrity', status: 'FAIL' })
    results.errors.push('SBOM has been modified')
  }

  // 3. Verify dependency count matches
  const lockfile = readLockfile(projectPath)
  const currentDeps = extractDependencies(lockfile)

  if (currentDeps.length === sbom.dependencies.length) {
    results.checks.push({ name: 'Dependency count', status: 'PASS' })
  } else {
    results.valid = false
    results.checks.push({ name: 'Dependency count', status: 'FAIL' })
    results.errors.push(`Dependency count changed: expected ${sbom.dependencies.length}, got ${currentDeps.length}`)
  }

  return results
}

/**
 * Detect drift between two SBOMs
 * @param {string} baselinePath
 * @param {string} currentPath
 * @returns {object}
 */
function detectDrift(baselinePath, currentPath) {
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
  const current = JSON.parse(fs.readFileSync(currentPath, 'utf8'))

  const drift = {
    added: [],
    removed: [],
    changed: []
  }

  const baselineDeps = new Map(baseline.dependencies.map(d => [d.name, d]))
  const currentDeps = new Map(current.dependencies.map(d => [d.name, d]))

  // Find added
  for (const [name, dep] of currentDeps) {
    if (!baselineDeps.has(name)) {
      drift.added.push(dep)
    }
  }

  // Find removed
  for (const [name, dep] of baselineDeps) {
    if (!currentDeps.has(name)) {
      drift.removed.push(dep)
    }
  }

  // Find changed
  for (const [name, currentDep] of currentDeps) {
    const baselineDep = baselineDeps.get(name)
    if (baselineDep && baselineDep.version !== currentDep.version) {
      drift.changed.push({
        name,
        from: baselineDep.version,
        to: currentDep.version
      })
    }
  }

  return drift
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════════════════════════

function printUsage() {
  console.log(`
OMEGA SBOM Generator v${SBOM_VERSION}

Usage:
  node generator.cjs generate [--output <file>]
  node generator.cjs verify <sbom.json>
  node generator.cjs drift <baseline.json> <current.json>

Commands:
  generate    Generate SBOM for current project
  verify      Verify SBOM against current state
  drift       Detect changes between two SBOMs

Options:
  --output          Output file path (default: stdout)
  --allow-floating  Allow floating versions (^, ~, *) with warning
  --help            Show this help
`)
}

function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  if (!command || command === '--help') {
    printUsage()
    process.exit(0)
  }

  try {
    switch (command) {
      case 'generate': {
        const outputIndex = args.indexOf('--output')
        const outputPath = outputIndex !== -1 ? args[outputIndex + 1] : null
        const allowFloating = args.includes('--allow-floating')

        const sbom = generateSBOM(process.cwd(), { allowFloating })
        const sbomJson = JSON.stringify(sbom, null, 2)

        if (outputPath) {
          fs.writeFileSync(outputPath, sbomJson)
          console.log(`SBOM generated: ${outputPath}`)
          console.log(`  Dependencies: ${sbom.summary.total_dependencies}`)
          console.log(`  Lockfile hash: ${sbom.lockfile.sha256.substring(0, 16)}...`)
        } else {
          console.log(sbomJson)
        }
        break
      }

      case 'verify': {
        const sbomPath = args[1]
        if (!sbomPath) {
          console.error('ERROR: SBOM path required')
          process.exit(1)
        }

        const results = verifySBOM(sbomPath, process.cwd())

        console.log('VERIFICATION RESULTS:')
        for (const check of results.checks) {
          const icon = check.status === 'PASS' ? '✓' : '✗'
          console.log(`  ${icon} ${check.name}`)
        }

        if (results.errors.length > 0) {
          console.log('\nERRORS:')
          for (const error of results.errors) {
            console.log(`  ✗ ${error}`)
          }
        }

        console.log(`\nVERDICT: ${results.valid ? '✓ VALID' : '✗ INVALID'}`)
        process.exit(results.valid ? 0 : 1)
      }

      case 'drift': {
        const baselinePath = args[1]
        const currentPath = args[2]

        if (!baselinePath || !currentPath) {
          console.error('ERROR: Both baseline and current SBOM paths required')
          process.exit(1)
        }

        const drift = detectDrift(baselinePath, currentPath)

        console.log('DRIFT DETECTION RESULTS:')
        console.log(`  Added: ${drift.added.length}`)
        console.log(`  Removed: ${drift.removed.length}`)
        console.log(`  Changed: ${drift.changed.length}`)

        if (drift.added.length > 0) {
          console.log('\nADDED:')
          for (const dep of drift.added) {
            console.log(`  + ${dep.name}@${dep.version}`)
          }
        }

        if (drift.removed.length > 0) {
          console.log('\nREMOVED:')
          for (const dep of drift.removed) {
            console.log(`  - ${dep.name}@${dep.version}`)
          }
        }

        if (drift.changed.length > 0) {
          console.log('\nCHANGED:')
          for (const change of drift.changed) {
            console.log(`  ~ ${change.name}: ${change.from} → ${change.to}`)
          }
        }

        const hasDrift = drift.added.length > 0 || drift.removed.length > 0 || drift.changed.length > 0
        process.exit(hasDrift ? 1 : 0)
      }

      default:
        console.error(`Unknown command: ${command}`)
        printUsage()
        process.exit(1)
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = {
  generateSBOM,
  verifySBOM,
  detectDrift,
  checkFloatingVersions,
  extractDependencies,
  hashFile,
  hashString
}
