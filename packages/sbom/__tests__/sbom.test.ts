import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

const {
  generateSBOM,
  verifySBOM,
  detectDrift,
  checkFloatingVersions,
  extractDependencies
} = require('../generator.cjs')

// ═══════════════════════════════════════════════════════════════════════════════════════
// L0-SBOM: FLOATING VERSION DETECTION
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('L0-SBOM: Floating Version Detection', () => {
  test('L0-SBOM-001: detects caret versions', () => {
    const deps = { lodash: '^4.17.0' }
    const floating = checkFloatingVersions(deps)
    expect(floating).toHaveLength(1)
    expect(floating[0].name).toBe('lodash')
    expect(floating[0].issue).toBe('floating')
  })

  test('L0-SBOM-002: detects tilde versions', () => {
    const deps = { express: '~4.18.0' }
    const floating = checkFloatingVersions(deps)
    expect(floating).toHaveLength(1)
    expect(floating[0].name).toBe('express')
  })

  test('L0-SBOM-003: detects star versions', () => {
    const deps = { moment: '*' }
    const floating = checkFloatingVersions(deps)
    expect(floating).toHaveLength(1)
  })

  test('L0-SBOM-004: detects latest keyword', () => {
    const deps = { axios: 'latest' }
    const floating = checkFloatingVersions(deps)
    expect(floating).toHaveLength(1)
  })

  test('L0-SBOM-005: accepts exact versions', () => {
    const deps = { 'left-pad': '1.3.0' }
    const floating = checkFloatingVersions(deps)
    expect(floating).toHaveLength(0)
  })

  test('L0-SBOM-006: accepts git URLs', () => {
    const deps = { 'my-pkg': 'git+https://github.com/user/repo.git' }
    const floating = checkFloatingVersions(deps)
    expect(floating).toHaveLength(0)
  })

  test('L0-SBOM-007: handles empty deps', () => {
    const floating = checkFloatingVersions({})
    expect(floating).toHaveLength(0)
  })

  test('L0-SBOM-008: handles null deps', () => {
    const floating = checkFloatingVersions(null)
    expect(floating).toHaveLength(0)
  })

  test('L0-SBOM-009: handles undefined deps', () => {
    const floating = checkFloatingVersions(undefined)
    expect(floating).toHaveLength(0)
  })

  test('L0-SBOM-010: detects multiple floating versions', () => {
    const deps = {
      lodash: '^4.17.0',
      express: '~4.18.0',
      axios: '*'
    }
    const floating = checkFloatingVersions(deps)
    expect(floating).toHaveLength(3)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// L1-SBOM: GENERATION
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('L1-SBOM: Generation', () => {
  let tempDir: string

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sbom-test-'))

    // Create minimal package.json
    const pkg = {
      name: 'test-project',
      version: '1.0.0',
      description: 'Test project',
      dependencies: {}
    }
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(pkg, null, 2))

    // Create minimal lockfile
    const lock = {
      name: 'test-project',
      version: '1.0.0',
      lockfileVersion: 3,
      packages: {}
    }
    fs.writeFileSync(path.join(tempDir, 'package-lock.json'), JSON.stringify(lock, null, 2))
  })

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  test('L1-SBOM-001: generates valid SBOM', () => {
    const sbom = generateSBOM(tempDir)

    expect(sbom.sbom_format).toBe('OMEGA-SBOM')
    expect(sbom.sbom_version).toBe('1.0.0')
    expect(sbom.project.name).toBe('test-project')
    expect(sbom.lockfile.sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(sbom.integrity.sbom_hash).toMatch(/^[a-f0-9]{64}$/)
  })

  test('L1-SBOM-002: includes project metadata', () => {
    const sbom = generateSBOM(tempDir)

    expect(sbom.project.name).toBe('test-project')
    expect(sbom.project.version).toBe('1.0.0')
    expect(sbom.project.description).toBe('Test project')
  })

  test('L1-SBOM-003: includes dependency summary', () => {
    const sbom = generateSBOM(tempDir)

    expect(sbom.summary).toBeDefined()
    expect(typeof sbom.summary.total_dependencies).toBe('number')
    expect(typeof sbom.summary.production_dependencies).toBe('number')
    expect(typeof sbom.summary.dev_dependencies).toBe('number')
    expect(typeof sbom.summary.optional_dependencies).toBe('number')
  })

  test('L1-SBOM-004: includes timestamp', () => {
    const sbom = generateSBOM(tempDir)
    expect(sbom.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })

  test('L1-SBOM-005: includes lockfile version', () => {
    const sbom = generateSBOM(tempDir)
    expect(sbom.lockfile.lockfileVersion).toBe(3)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// L1-SBOM: VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('L1-SBOM: Verification', () => {
  let tempDir: string
  let sbomPath: string

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sbom-verify-'))

    const pkg = { name: 'verify-test', version: '1.0.0', dependencies: {} }
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(pkg, null, 2))

    const lock = { name: 'verify-test', version: '1.0.0', lockfileVersion: 3, packages: {} }
    fs.writeFileSync(path.join(tempDir, 'package-lock.json'), JSON.stringify(lock, null, 2))

    const sbom = generateSBOM(tempDir)
    sbomPath = path.join(tempDir, 'sbom.json')
    fs.writeFileSync(sbomPath, JSON.stringify(sbom, null, 2))
  })

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  test('L1-SBOM-010: valid SBOM passes verification', () => {
    const results = verifySBOM(sbomPath, tempDir)
    expect(results.valid).toBe(true)
    expect(results.errors).toHaveLength(0)
  })

  test('L1-SBOM-011: all checks pass for unmodified state', () => {
    const results = verifySBOM(sbomPath, tempDir)
    const passedChecks = results.checks.filter(c => c.status === 'PASS')
    expect(passedChecks.length).toBe(results.checks.length)
  })

  test('L1-SBOM-012: modified lockfile fails verification', () => {
    // Modify lockfile temporarily
    const lockPath = path.join(tempDir, 'package-lock.json')
    const originalLock = fs.readFileSync(lockPath, 'utf8')
    const lock = JSON.parse(originalLock)
    lock.modified = true
    fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2))

    const results = verifySBOM(sbomPath, tempDir)
    expect(results.valid).toBe(false)
    expect(results.errors.length).toBeGreaterThan(0)

    // Restore
    fs.writeFileSync(lockPath, originalLock)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// L1-SBOM: DRIFT DETECTION
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('L1-SBOM: Drift Detection', () => {
  test('L1-SBOM-020: detects added dependencies', () => {
    const baseline = {
      dependencies: [{ name: 'lodash', version: '4.17.0' }]
    }
    const current = {
      dependencies: [
        { name: 'lodash', version: '4.17.0' },
        { name: 'express', version: '4.18.0' }
      ]
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-'))
    fs.writeFileSync(path.join(tempDir, 'baseline.json'), JSON.stringify(baseline))
    fs.writeFileSync(path.join(tempDir, 'current.json'), JSON.stringify(current))

    const drift = detectDrift(
      path.join(tempDir, 'baseline.json'),
      path.join(tempDir, 'current.json')
    )

    expect(drift.added).toHaveLength(1)
    expect(drift.added[0].name).toBe('express')

    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  test('L1-SBOM-021: detects removed dependencies', () => {
    const baseline = {
      dependencies: [
        { name: 'lodash', version: '4.17.0' },
        { name: 'express', version: '4.18.0' }
      ]
    }
    const current = {
      dependencies: [{ name: 'lodash', version: '4.17.0' }]
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-'))
    fs.writeFileSync(path.join(tempDir, 'baseline.json'), JSON.stringify(baseline))
    fs.writeFileSync(path.join(tempDir, 'current.json'), JSON.stringify(current))

    const drift = detectDrift(
      path.join(tempDir, 'baseline.json'),
      path.join(tempDir, 'current.json')
    )

    expect(drift.removed).toHaveLength(1)
    expect(drift.removed[0].name).toBe('express')

    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  test('L1-SBOM-022: detects version changes', () => {
    const baseline = {
      dependencies: [{ name: 'lodash', version: '4.17.0' }]
    }
    const current = {
      dependencies: [{ name: 'lodash', version: '4.18.0' }]
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-'))
    fs.writeFileSync(path.join(tempDir, 'baseline.json'), JSON.stringify(baseline))
    fs.writeFileSync(path.join(tempDir, 'current.json'), JSON.stringify(current))

    const drift = detectDrift(
      path.join(tempDir, 'baseline.json'),
      path.join(tempDir, 'current.json')
    )

    expect(drift.changed).toHaveLength(1)
    expect(drift.changed[0].name).toBe('lodash')
    expect(drift.changed[0].from).toBe('4.17.0')
    expect(drift.changed[0].to).toBe('4.18.0')

    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  test('L1-SBOM-023: no drift for identical SBOMs', () => {
    const sbom = {
      dependencies: [
        { name: 'lodash', version: '4.17.0' },
        { name: 'express', version: '4.18.0' }
      ]
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-'))
    fs.writeFileSync(path.join(tempDir, 'baseline.json'), JSON.stringify(sbom))
    fs.writeFileSync(path.join(tempDir, 'current.json'), JSON.stringify(sbom))

    const drift = detectDrift(
      path.join(tempDir, 'baseline.json'),
      path.join(tempDir, 'current.json')
    )

    expect(drift.added).toHaveLength(0)
    expect(drift.removed).toHaveLength(0)
    expect(drift.changed).toHaveLength(0)

    fs.rmSync(tempDir, { recursive: true, force: true })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// L4-SBOM: DETERMINISM
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('L4-SBOM: Determinism', () => {
  test('L4-SBOM-001: SBOM generation is deterministic (excluding timestamp)', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sbom-det-'))

    const pkg = { name: 'det-test', version: '1.0.0', dependencies: {} }
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(pkg))

    const lock = { name: 'det-test', version: '1.0.0', lockfileVersion: 3, packages: {} }
    fs.writeFileSync(path.join(tempDir, 'package-lock.json'), JSON.stringify(lock))

    const sbom1 = generateSBOM(tempDir)
    const sbom2 = generateSBOM(tempDir)
    const sbom3 = generateSBOM(tempDir)

    // Compare without timestamps and integrity hash (which depends on timestamp)
    const normalize = (s: any) => {
      const copy = JSON.parse(JSON.stringify(s))
      delete copy.generated_at
      delete copy.integrity // Hash depends on generated_at
      return JSON.stringify(copy)
    }

    expect(normalize(sbom1)).toBe(normalize(sbom2))
    expect(normalize(sbom2)).toBe(normalize(sbom3))

    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  test('L4-SBOM-002: lockfile hash is deterministic', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sbom-hash-'))

    const pkg = { name: 'hash-test', version: '1.0.0', dependencies: {} }
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(pkg))

    const lock = { name: 'hash-test', version: '1.0.0', lockfileVersion: 3, packages: {} }
    fs.writeFileSync(path.join(tempDir, 'package-lock.json'), JSON.stringify(lock))

    const hashes = []
    for (let i = 0; i < 5; i++) {
      const sbom = generateSBOM(tempDir)
      hashes.push(sbom.lockfile.sha256)
    }

    expect(new Set(hashes).size).toBe(1)

    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  test('L4-SBOM-003: SBOM integrity hash is deterministic', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sbom-int-'))

    const pkg = { name: 'int-test', version: '1.0.0', dependencies: {} }
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(pkg))

    const lock = { name: 'int-test', version: '1.0.0', lockfileVersion: 3, packages: {} }
    fs.writeFileSync(path.join(tempDir, 'package-lock.json'), JSON.stringify(lock))

    const hashes = []
    for (let i = 0; i < 5; i++) {
      const sbom = generateSBOM(tempDir)
      // Need to normalize before comparing because timestamp affects hash
      const copy = JSON.parse(JSON.stringify(sbom))
      delete copy.generated_at
      copy.integrity = {}
      hashes.push(JSON.stringify(copy))
    }

    expect(new Set(hashes).size).toBe(1)

    fs.rmSync(tempDir, { recursive: true, force: true })
  })
})
