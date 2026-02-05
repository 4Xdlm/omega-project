/**
 * PHASE J — INCIDENT RULE VALIDATORS
 * Specification: INCIDENT_PROCESS.md
 *
 * Validates all 5 incident rules:
 * INC-001: No blame culture
 * INC-002: Immediate logging (15 min)
 * INC-003: Evidence preservation
 * INC-004: Transparent communication
 * INC-005: Mandatory post-mortem (MEDIUM+)
 */

import type {
  IncidentEvent,
  PostMortem,
  IncidentRuleCode,
  IncidentRuleViolation
} from '../types.js';
import { requiresPostMortem, checkImmediateLogging } from '../incident_utils.js';

// ─────────────────────────────────────────────────────────────
// INC-001: NO BLAME CULTURE
// ─────────────────────────────────────────────────────────────

/**
 * Validate INC-001: No blame culture.
 * Post-mortem should focus on system, not individuals.
 */
export function validateINC001(
  incident: IncidentEvent,
  postmortem: PostMortem | null
): IncidentRuleViolation | null {
  if (!postmortem) {
    return null; // Can't validate blame without post-mortem
  }

  // Check for blame-free statement
  if (!postmortem.blame_free_statement || postmortem.blame_free_statement.trim() === '') {
    return {
      rule: 'INC-001',
      incident_id: incident.incident_id,
      description: 'Post-mortem missing blame-free statement',
      severity: 'error'
    };
  }

  // Check for blame language
  const blamePatterns = [
    /\bfault\b/i,
    /\bblame\b/i,
    /\bresponsible for the failure\b/i,
    /\bshould have\b/i,
    /\bfailed to\b/i
  ];

  const textToCheck = `${postmortem.summary} ${postmortem.root_cause.description}`;

  for (const pattern of blamePatterns) {
    if (pattern.test(textToCheck)) {
      return {
        rule: 'INC-001',
        incident_id: incident.incident_id,
        description: `Post-mortem contains blame language: ${pattern.source}`,
        severity: 'warning'
      };
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// INC-002: IMMEDIATE LOGGING
// ─────────────────────────────────────────────────────────────

/**
 * Validate INC-002: Immediate logging.
 * Incident must be logged within 15 minutes of detection.
 */
export function validateINC002(incident: IncidentEvent): IncidentRuleViolation | null {
  if (!checkImmediateLogging(incident.detected_at, incident.timestamp)) {
    return {
      rule: 'INC-002',
      incident_id: incident.incident_id,
      description: 'Incident not logged within 15 minutes of detection',
      severity: 'error'
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// INC-003: EVIDENCE PRESERVATION
// ─────────────────────────────────────────────────────────────

/**
 * Validate INC-003: Evidence preservation.
 * No evidence should be deleted before post-mortem.
 */
export function validateINC003(
  incident: IncidentEvent,
  postmortem: PostMortem | null
): IncidentRuleViolation | null {
  // Check incident has evidence
  if (!incident.evidence_refs || incident.evidence_refs.length === 0) {
    return {
      rule: 'INC-003',
      incident_id: incident.incident_id,
      description: 'Incident has no evidence references',
      severity: 'error'
    };
  }

  // If post-mortem exists, check it references evidence
  if (postmortem) {
    if (!postmortem.evidence_refs || postmortem.evidence_refs.length === 0) {
      return {
        rule: 'INC-003',
        incident_id: incident.incident_id,
        description: 'Post-mortem has no evidence references',
        severity: 'error'
      };
    }

    // Check post-mortem references at least some incident evidence
    const incidentEvidenceSet = new Set(incident.evidence_refs);
    const hasSharedEvidence = postmortem.evidence_refs.some(
      ref => incidentEvidenceSet.has(ref)
    );

    if (!hasSharedEvidence) {
      return {
        rule: 'INC-003',
        incident_id: incident.incident_id,
        description: 'Post-mortem does not reference incident evidence',
        severity: 'warning'
      };
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// INC-004: TRANSPARENT COMMUNICATION
// ─────────────────────────────────────────────────────────────

/**
 * Validate INC-004: Transparent communication.
 * Stakeholders should be informed based on severity.
 */
export function validateINC004(incident: IncidentEvent): IncidentRuleViolation | null {
  // For CRITICAL and HIGH, timeline should show communication actions
  if (incident.severity === 'CRITICAL' || incident.severity === 'HIGH') {
    const hasCommunication = incident.timeline.some(
      entry => entry.action.toLowerCase().includes('notif') ||
               entry.action.toLowerCase().includes('alert') ||
               entry.action.toLowerCase().includes('inform') ||
               entry.action.toLowerCase().includes('communic')
    );

    if (!hasCommunication) {
      return {
        rule: 'INC-004',
        incident_id: incident.incident_id,
        description: `${incident.severity} incident should have stakeholder communication logged in timeline`,
        severity: 'warning'
      };
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// INC-005: MANDATORY POST-MORTEM
// ─────────────────────────────────────────────────────────────

/**
 * Validate INC-005: Mandatory post-mortem.
 * All MEDIUM+ incidents require post-mortem.
 * INV-J-04 and INV-J-05: Silence = violation.
 */
export function validateINC005(
  incident: IncidentEvent,
  postmortem: PostMortem | null
): IncidentRuleViolation | null {
  // Check if post-mortem is required
  if (!requiresPostMortem(incident.severity)) {
    return null; // LOW severity doesn't require post-mortem
  }

  // INV-J-05: Silence = violation
  if (!postmortem) {
    return {
      rule: 'INC-005',
      incident_id: incident.incident_id,
      description: `${incident.severity} incident requires post-mortem (Silence = violation)`,
      severity: 'error'
    };
  }

  // Check post-mortem is linked to incident
  if (postmortem.incident_id !== incident.incident_id) {
    return {
      rule: 'INC-005',
      incident_id: incident.incident_id,
      description: 'Post-mortem incident_id does not match',
      severity: 'error'
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// VALIDATE ALL RULES
// ─────────────────────────────────────────────────────────────

/**
 * Validate all incident rules.
 */
export function validateAllRules(
  incident: IncidentEvent,
  postmortem: PostMortem | null
): readonly IncidentRuleViolation[] {
  const violations: IncidentRuleViolation[] = [];

  const v001 = validateINC001(incident, postmortem);
  if (v001) violations.push(v001);

  const v002 = validateINC002(incident);
  if (v002) violations.push(v002);

  const v003 = validateINC003(incident, postmortem);
  if (v003) violations.push(v003);

  const v004 = validateINC004(incident);
  if (v004) violations.push(v004);

  const v005 = validateINC005(incident, postmortem);
  if (v005) violations.push(v005);

  return violations;
}
