/**
 * PHASE I — VERSION RULE VALIDATORS
 * Specification: VERSIONING_CONTRACT.md
 *
 * Validates all 5 version rules:
 * VER-001: Schema stability
 * VER-002: API stability
 * VER-003: Data migration
 * VER-004: Deprecation cycle
 * VER-005: Changelog mandatory
 */

import type {
  VersionContractEvent,
  VersionRuleCode,
  VersionRuleViolation,
  Deprecation
} from '../types.js';
import { parseSemver, compareSemver } from '../version_utils.js';

// ─────────────────────────────────────────────────────────────
// VER-001: SCHEMA STABILITY
// ─────────────────────────────────────────────────────────────

/**
 * Validate VER-001: Schema stability.
 * JSON schemas cannot change incompatibly without MAJOR bump.
 * @param event - Version event to validate
 * @returns Violation if rule broken, null otherwise
 */
export function validateVER001(event: VersionContractEvent): VersionRuleViolation | null {
  // Check for schema breaking changes
  const schemaChanges = event.breaking_changes.filter(c => c.change_type === 'schema');

  if (schemaChanges.length > 0 && event.version.bump_type !== 'major') {
    return {
      rule: 'VER-001',
      component: schemaChanges[0].component,
      description: `Schema breaking change requires MAJOR bump: ${schemaChanges[0].description}`,
      severity: 'error'
    };
  }

  // Check schema compatibility flag
  if (!event.compatibility.schema_compatible && event.version.bump_type !== 'major') {
    return {
      rule: 'VER-001',
      component: 'schema',
      description: 'Schema incompatibility detected without MAJOR bump',
      severity: 'error'
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// VER-002: API STABILITY
// ─────────────────────────────────────────────────────────────

/**
 * Validate VER-002: API stability.
 * Public function signatures are stable within MAJOR version.
 * @param event - Version event to validate
 * @returns Violation if rule broken, null otherwise
 */
export function validateVER002(event: VersionContractEvent): VersionRuleViolation | null {
  // Check for API breaking changes
  const apiChanges = event.breaking_changes.filter(c => c.change_type === 'api');

  if (apiChanges.length > 0 && event.version.bump_type !== 'major') {
    return {
      rule: 'VER-002',
      component: apiChanges[0].component,
      description: `API breaking change requires MAJOR bump: ${apiChanges[0].description}`,
      severity: 'error'
    };
  }

  // Check API compatibility flag
  if (!event.compatibility.api_compatible && event.version.bump_type !== 'major') {
    return {
      rule: 'VER-002',
      component: 'api',
      description: 'API incompatibility detected without MAJOR bump',
      severity: 'error'
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// VER-003: DATA MIGRATION
// ─────────────────────────────────────────────────────────────

/**
 * Validate VER-003: Data migration.
 * Any data format change requires migration script.
 * @param event - Version event to validate
 * @returns Violation if rule broken, null otherwise
 */
export function validateVER003(event: VersionContractEvent): VersionRuleViolation | null {
  // Check for changes requiring migration
  const changesRequiringMigration = event.breaking_changes.filter(c => c.migration_required);

  if (changesRequiringMigration.length > 0) {
    // Migration path must be provided
    if (!event.migration_path) {
      return {
        rule: 'VER-003',
        component: changesRequiringMigration[0].component,
        description: 'Data format change requires migration path',
        severity: 'error'
      };
    }

    // Check that migration documentation exists for each change
    for (const change of changesRequiringMigration) {
      if (!change.migration_doc_ref) {
        return {
          rule: 'VER-003',
          component: change.component,
          description: `Migration documentation required for: ${change.description}`,
          severity: 'error'
        };
      }
    }
  }

  // If data is not compatible, migration path is required
  if (!event.compatibility.data_compatible && !event.migration_path) {
    return {
      rule: 'VER-003',
      component: 'data',
      description: 'Data incompatibility requires migration path',
      severity: 'error'
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// VER-004: DEPRECATION CYCLE
// ─────────────────────────────────────────────────────────────

/**
 * Validate VER-004: Deprecation cycle.
 * Deprecation → Warning 2 MINOR versions → Removal at next MAJOR.
 * @param event - Version event to validate
 * @param existingDeprecations - Previously known deprecations
 * @returns Violation if rule broken, null otherwise
 */
export function validateVER004(
  event: VersionContractEvent,
  existingDeprecations: readonly Deprecation[] = []
): VersionRuleViolation | null {
  // Check removals
  const removals = event.breaking_changes.filter(c => c.change_type === 'removal');

  for (const removal of removals) {
    // Find if this was properly deprecated
    const deprecation = existingDeprecations.find(
      d => d.component === removal.component
    );

    if (!deprecation) {
      return {
        rule: 'VER-004',
        component: removal.component,
        description: 'Component removed without prior deprecation warning',
        severity: 'error'
      };
    }

    // Check if enough warning was given (should be deprecated for 2 MINOR versions)
    if (deprecation.warning_count < 2) {
      return {
        rule: 'VER-004',
        component: removal.component,
        description: `Removal requires 2 MINOR version warnings, only ${deprecation.warning_count} given`,
        severity: 'error'
      };
    }

    // Removal should only happen at MAJOR bump
    if (event.version.bump_type !== 'major') {
      return {
        rule: 'VER-004',
        component: removal.component,
        description: 'Deprecated component removal requires MAJOR bump',
        severity: 'error'
      };
    }
  }

  // Validate deprecation structure
  for (const deprecation of event.deprecations) {
    if (!deprecation.deprecated_in) {
      return {
        rule: 'VER-004',
        component: deprecation.component,
        description: 'Deprecation must specify version it was deprecated in',
        severity: 'error'
      };
    }

    if (!deprecation.removal_planned) {
      return {
        rule: 'VER-004',
        component: deprecation.component,
        description: 'Deprecation must specify planned removal version',
        severity: 'warning'
      };
    }

    // Planned removal must be a MAJOR version
    const plannedRemoval = parseSemver(deprecation.removal_planned);
    if (plannedRemoval && plannedRemoval.minor !== 0 && plannedRemoval.patch !== 0) {
      return {
        rule: 'VER-004',
        component: deprecation.component,
        description: 'Deprecated component removal must be at MAJOR version (x.0.0)',
        severity: 'warning'
      };
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// VER-005: CHANGELOG MANDATORY
// ─────────────────────────────────────────────────────────────

/**
 * Validate VER-005: Changelog mandatory.
 * Each release must update CHANGELOG.md.
 * @param event - Version event to validate
 * @returns Violation if rule broken, null otherwise
 */
export function validateVER005(event: VersionContractEvent): VersionRuleViolation | null {
  if (!event.changelog_ref || event.changelog_ref.trim() === '') {
    return {
      rule: 'VER-005',
      component: 'CHANGELOG.md',
      description: 'Changelog reference is required for every version change',
      severity: 'error'
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// VALIDATE ALL RULES
// ─────────────────────────────────────────────────────────────

/**
 * Validate all version rules for an event.
 * @param event - Version event to validate
 * @param existingDeprecations - Previously known deprecations
 * @returns Array of rule violations
 */
export function validateAllRules(
  event: VersionContractEvent,
  existingDeprecations: readonly Deprecation[] = []
): readonly VersionRuleViolation[] {
  const violations: VersionRuleViolation[] = [];

  const v001 = validateVER001(event);
  if (v001) violations.push(v001);

  const v002 = validateVER002(event);
  if (v002) violations.push(v002);

  const v003 = validateVER003(event);
  if (v003) violations.push(v003);

  const v004 = validateVER004(event, existingDeprecations);
  if (v004) violations.push(v004);

  const v005 = validateVER005(event);
  if (v005) violations.push(v005);

  return violations;
}
