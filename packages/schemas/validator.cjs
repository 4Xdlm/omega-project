/**
 * OMEGA Schema Validator
 * Zero external dependencies - uses native JSON Schema validation approach
 *
 * @module validator
 * @version 1.0.0
 */

const fs = require('fs')
const path = require('path')

// Load schemas
const schemasDir = __dirname
const schemas = {
  trust: JSON.parse(fs.readFileSync(path.join(schemasDir, 'trust.v1.schema.json'), 'utf8')),
  manifest: JSON.parse(fs.readFileSync(path.join(schemasDir, 'manifest.schema.json'), 'utf8')),
  sealedZones: JSON.parse(fs.readFileSync(path.join(schemasDir, 'sealed-zones.schema.json'), 'utf8'))
}

/**
 * Get the type of a value (distinguishes arrays from objects)
 * @param {*} value
 * @returns {string}
 */
function getType(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

/**
 * Validate value against schema
 * Simplified validator for OMEGA schemas (limited $ref resolution, core keywords)
 *
 * @param {*} value - Value to validate
 * @param {object} schema - JSON Schema
 * @param {string} path - Current path for error reporting
 * @param {object} rootSchema - Root schema for $ref resolution
 * @returns {Array<{path: string, message: string}>} - Array of validation errors
 */
function validate(value, schema, path = '', rootSchema = null) {
  const errors = []
  rootSchema = rootSchema || schema

  // Handle $ref
  if (schema.$ref) {
    const refPath = schema.$ref
    if (refPath.startsWith('#/$defs/')) {
      const defName = refPath.replace('#/$defs/', '')
      if (rootSchema.$defs && rootSchema.$defs[defName]) {
        return validate(value, rootSchema.$defs[defName], path, rootSchema)
      }
    }
    errors.push({ path, message: `Unresolved $ref: ${refPath}` })
    return errors
  }

  // Type check
  if (schema.type) {
    const actualType = getType(value)
    if (schema.type === 'integer') {
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        errors.push({ path, message: `Expected integer, got ${actualType}` })
        return errors
      }
    } else if (schema.type !== actualType) {
      errors.push({ path, message: `Expected ${schema.type}, got ${actualType}` })
      return errors // Type mismatch, skip further validation
    }
  }

  // Enum check
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push({ path, message: `Value must be one of: ${schema.enum.join(', ')}` })
  }

  // Pattern check (strings)
  if (schema.pattern && typeof value === 'string') {
    const regex = new RegExp(schema.pattern)
    if (!regex.test(value)) {
      errors.push({ path, message: `Value does not match pattern: ${schema.pattern}` })
    }
  }

  // Required properties (objects)
  if (schema.required && typeof value === 'object' && !Array.isArray(value) && value !== null) {
    for (const prop of schema.required) {
      if (!(prop in value)) {
        errors.push({ path: path ? `${path}.${prop}` : prop, message: `Required property missing` })
      }
    }
  }

  // Additional properties check (objects)
  if (schema.additionalProperties === false && typeof value === 'object' && !Array.isArray(value) && value !== null) {
    const allowed = Object.keys(schema.properties || {})
    for (const key of Object.keys(value)) {
      if (!allowed.includes(key)) {
        errors.push({ path: path ? `${path}.${key}` : key, message: `Additional property not allowed` })
      }
    }
  }

  // Properties validation (objects)
  if (schema.properties && typeof value === 'object' && !Array.isArray(value) && value !== null) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (key in value) {
        const propPath = path ? `${path}.${key}` : key
        errors.push(...validate(value[key], propSchema, propPath, rootSchema))
      }
    }
  }

  // additionalProperties with schema (for manifest artifacts)
  if (schema.additionalProperties && typeof schema.additionalProperties === 'object' && typeof value === 'object' && !Array.isArray(value) && value !== null) {
    const definedProps = Object.keys(schema.properties || {})
    for (const [key, propValue] of Object.entries(value)) {
      if (!definedProps.includes(key)) {
        const propPath = path ? `${path}.${key}` : key
        errors.push(...validate(propValue, schema.additionalProperties, propPath, rootSchema))
      }
    }
  }

  // Items validation (arrays)
  if (schema.items && Array.isArray(value)) {
    value.forEach((item, index) => {
      errors.push(...validate(item, schema.items, `${path}[${index}]`, rootSchema))
    })
  }

  // MinItems check (arrays)
  if (schema.minItems !== undefined && Array.isArray(value)) {
    if (value.length < schema.minItems) {
      errors.push({ path, message: `Array must have at least ${schema.minItems} items` })
    }
  }

  // Minimum check (numbers)
  if (schema.minimum !== undefined && typeof value === 'number') {
    if (value < schema.minimum) {
      errors.push({ path, message: `Value must be >= ${schema.minimum}` })
    }
  }

  return errors
}

/**
 * Validate trust payload
 * @param {*} payload - Trust payload to validate
 * @returns {Array<{path: string, message: string}>}
 */
function validateTrust(payload) {
  return validate(payload, schemas.trust)
}

/**
 * Validate manifest
 * @param {*} manifest - Manifest to validate
 * @returns {Array<{path: string, message: string}>}
 */
function validateManifest(manifest) {
  return validate(manifest, schemas.manifest)
}

/**
 * Validate sealed zones config
 * @param {*} config - Sealed zones config to validate
 * @returns {Array<{path: string, message: string}>}
 */
function validateSealedZones(config) {
  return validate(config, schemas.sealedZones)
}

module.exports = {
  validate,
  validateTrust,
  validateManifest,
  validateSealedZones,
  schemas
}
