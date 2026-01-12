/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS — TEMPLATES MODULE
 * Pre-defined templates for common entity types
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module templates
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ENTITY TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

export const ENTITY_TEMPLATES = {
  
  // Decision entity
  DECISION: {
    type: 'DECISION',
    lifecycle: 'ACTIVE',
    fields: {
      context: '',
      alternatives: [],
      chosen: '',
      rationale: '',
      consequences: [],
      reversible: true
    }
  },
  
  // Module entity
  MODULE: {
    type: 'MODULE',
    lifecycle: 'DRAFT',
    fields: {
      purpose: '',
      dependencies: [],
      exports: [],
      tests: 0,
      coverage: 0
    }
  },
  
  // Bug entity
  BUG: {
    type: 'BUG',
    lifecycle: 'ACTIVE',
    fields: {
      severity: 'MEDIUM', // LOW, MEDIUM, HIGH, CRITICAL
      reproduction: '',
      expected: '',
      actual: '',
      root_cause: '',
      fix: ''
    }
  },
  
  // Feature entity
  FEATURE: {
    type: 'FEATURE',
    lifecycle: 'DRAFT',
    fields: {
      description: '',
      user_story: '',
      acceptance_criteria: [],
      priority: 'MEDIUM',
      estimate: ''
    }
  },
  
  // Concept entity
  CONCEPT: {
    type: 'CONCEPT',
    lifecycle: 'DRAFT',
    fields: {
      definition: '',
      examples: [],
      related: [],
      applications: []
    }
  },
  
  // Test entity
  TEST: {
    type: 'TEST',
    lifecycle: 'ACTIVE',
    fields: {
      target: '',
      type: 'UNIT', // UNIT, INTEGRATION, E2E, PERFORMANCE
      inputs: [],
      expected_outputs: [],
      actual_outputs: [],
      status: 'PENDING'
    }
  },
  
  // Milestone entity
  MILESTONE: {
    type: 'MILESTONE',
    lifecycle: 'DRAFT',
    fields: {
      target_date: '',
      deliverables: [],
      dependencies: [],
      blockers: [],
      progress: 0
    }
  },
  
  // Incident entity
  INCIDENT: {
    type: 'INCIDENT',
    lifecycle: 'ACTIVE',
    fields: {
      severity: 'HIGH',
      detected_at: '',
      resolved_at: '',
      impact: '',
      root_cause: '',
      resolution: '',
      prevention: []
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

export const EVENT_TEMPLATES = {
  
  CREATED: {
    type: 'CREATED',
    fields: {
      actor: '',
      context: ''
    }
  },
  
  UPDATED: {
    type: 'UPDATED',
    fields: {
      actor: '',
      changes: [],
      reason: ''
    }
  },
  
  PROMOTED: {
    type: 'PROMOTED',
    fields: {
      actor: '',
      from_lifecycle: '',
      to_lifecycle: '',
      reason: ''
    }
  },
  
  REVIEWED: {
    type: 'REVIEWED',
    fields: {
      reviewer: '',
      verdict: '', // APPROVED, REJECTED, NEEDS_WORK
      comments: []
    }
  },
  
  TESTED: {
    type: 'TESTED',
    fields: {
      tester: '',
      result: '', // PASS, FAIL, SKIP
      details: ''
    }
  },
  
  SEALED: {
    type: 'SEALED',
    fields: {
      seal_id: '',
      root_hash: ''
    }
  },
  
  DEPRECATED: {
    type: 'DEPRECATED',
    fields: {
      actor: '',
      reason: '',
      replacement: ''
    }
  },
  
  ABANDONED: {
    type: 'ABANDONED',
    fields: {
      actor: '',
      reason: '',
      lessons: []
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LINK TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

export const LINK_TEMPLATES = {
  
  DEPENDS_ON: {
    type: 'DEPENDS_ON',
    strength: 'HARD',
    fields: {
      reason: ''
    }
  },
  
  SUPERSEDES: {
    type: 'SUPERSEDES',
    strength: 'HARD',
    fields: {
      reason: '',
      migration_notes: ''
    }
  },
  
  IMPLEMENTS: {
    type: 'IMPLEMENTS',
    strength: 'HARD',
    fields: {
      completeness: 100
    }
  },
  
  TESTS: {
    type: 'TESTS',
    strength: 'HARD',
    fields: {
      coverage: 0,
      test_count: 0
    }
  },
  
  RELATES_TO: {
    type: 'RELATES_TO',
    strength: 'SOFT',
    fields: {
      relationship: ''
    }
  },
  
  BLOCKS: {
    type: 'BLOCKS',
    strength: 'HARD',
    fields: {
      reason: '',
      resolution: ''
    }
  },
  
  LESSON_FROM: {
    type: 'LESSON_FROM',
    strength: 'HARD',
    fields: {
      lessons: [],
      applied: false
    }
  },
  
  EVIDENCE_FOR: {
    type: 'EVIDENCE_FOR',
    strength: 'HARD',
    fields: {
      evidence_type: '',
      path: ''
    }
  },
  
  DERIVED_FROM: {
    type: 'DERIVED_FROM',
    strength: 'HARD',
    fields: {
      transformation: ''
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get template for entity type
 * @param {string} type - Entity type
 * @returns {object|null} Template or null
 */
export function getEntityTemplate(type) {
  return ENTITY_TEMPLATES[type] || null;
}

/**
 * Get template for event type
 * @param {string} type - Event type
 * @returns {object|null} Template or null
 */
export function getEventTemplate(type) {
  return EVENT_TEMPLATES[type] || null;
}

/**
 * Get template for link type
 * @param {string} type - Link type
 * @returns {object|null} Template or null
 */
export function getLinkTemplate(type) {
  return LINK_TEMPLATES[type] || null;
}

/**
 * List available entity templates
 * @returns {string[]} Template names
 */
export function listEntityTemplates() {
  return Object.keys(ENTITY_TEMPLATES);
}

/**
 * List available event templates
 * @returns {string[]} Template names
 */
export function listEventTemplates() {
  return Object.keys(EVENT_TEMPLATES);
}

/**
 * List available link templates
 * @returns {string[]} Template names
 */
export function listLinkTemplates() {
  return Object.keys(LINK_TEMPLATES);
}

/**
 * Create entity from template
 * @param {string} type - Entity type
 * @param {object} overrides - Field overrides
 * @returns {object} Entity data
 */
export function createFromTemplate(type, overrides = {}) {
  const template = ENTITY_TEMPLATES[type];
  if (!template) {
    throw new Error(`Unknown entity template: ${type}`);
  }
  
  return {
    type: template.type,
    lifecycle: overrides.lifecycle || template.lifecycle,
    ...template.fields,
    ...overrides
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  ENTITY_TEMPLATES,
  EVENT_TEMPLATES,
  LINK_TEMPLATES,
  getEntityTemplate,
  getEventTemplate,
  getLinkTemplate,
  listEntityTemplates,
  listEventTemplates,
  listLinkTemplates,
  createFromTemplate
};
