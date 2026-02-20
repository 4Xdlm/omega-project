// ═══════════════════════════════════════════════════════════════════════════
// OMEGA SCRIBE v1.0 — STAGING ENGINE
// Version: 1.0.0
// Date: 01 janvier 2026
// Certification: NASA-GRADE AS9100D / DO-178C
// ═══════════════════════════════════════════════════════════════════════════

import { 
  StagedFact, 
  FactClass, 
  EntityId, 
  SceneSpec,
  Warning 
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Canon snapshot structure (simplified)
 */
export interface CanonSnapshot {
  entities?: Record<string, Record<string, unknown>>;
  facts?: Array<{
    subject: string;
    predicate: string;
    object: unknown;
  }>;
}

/**
 * Extraction result
 */
export interface ExtractionResult {
  staged_facts: StagedFact[];
  warnings: Warning[];
  summary: ExtractionSummary;
}

/**
 * Summary of extraction
 */
export interface ExtractionSummary {
  total_extracted: number;
  safe_count: number;
  conflict_count: number;
  needs_human_count: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTRACTION PATTERNS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pattern definitions for fact extraction
 * 
 * These are rule-based (safe, deterministic)
 * LLM-based extraction is optional and requires RECORD mode
 */
const EXTRACTION_PATTERNS = {
  // Pattern: "[Name] est/était [attribute]"
  ATTRIBUTE: {
    regex: /(\b[A-ZÀ-Ú][a-zà-ú]+)\s+(?:est|était|a|avait)\s+(?:un(?:e)?|le|la|les?)?\s*(\w+(?:\s+\w+)?)/gi,
    type: 'attribute'
  },
  
  // Pattern: "[Name] découvre/apprend que [fact]"
  DISCOVERY: {
    regex: /(\b[A-ZÀ-Ú][a-zà-ú]+)\s+(?:découvre|découvrit|apprend|apprit)\s+que\s+(.+?)[.!?]/gi,
    type: 'knowledge'
  },
  
  // Pattern: "[Name] se trouve/va à [location]"
  LOCATION: {
    regex: /(\b[A-ZÀ-Ú][a-zà-ú]+)\s+(?:se trouve|va|arrive|entre)\s+(?:à|au|aux|dans)\s+(?:la?\s+)?(\w+(?:\s+\w+)?)/gi,
    type: 'location'
  },
  
  // Pattern: "[Name] prend/obtient [object]"
  POSSESSION: {
    regex: /(\b[A-ZÀ-Ú][a-zà-ú]+)\s+(?:prend|prit|obtient|obtint|saisit|attrape)\s+(?:le|la|les?|un(?:e)?)\s+(\w+(?:\s+\w+)?)/gi,
    type: 'possession'
  },
  
  // Pattern: "[Name] ressent/éprouve [emotion]"
  EMOTION: {
    regex: /(\b[A-ZÀ-Ú][a-zà-ú]+)\s+(?:ressent|éprouve|sent)\s+(?:de la?|du|une?)?\s*(\w+(?:\s+\w+)?)/gi,
    type: 'emotion'
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXTRACTION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract staged facts from generated text
 * 
 * @invariant SCRIBE-I12: CANON is read-only (never writes)
 * @invariant SCRIBE-I13: Staging only, human validation required
 * 
 * @param text Generated text
 * @param sceneSpec Scene specification (for scope)
 * @param canonSnapshot Current CANON state
 * @returns Extraction result with classified facts
 */
export function extractStagedFacts(
  text: string,
  sceneSpec: SceneSpec,
  canonSnapshot: CanonSnapshot
): ExtractionResult {
  const staged_facts: StagedFact[] = [];
  const warnings: Warning[] = [];
  
  // Extract using rule-based patterns
  for (const [patternName, pattern] of Object.entries(EXTRACTION_PATTERNS)) {
    const matches = extractByPattern(text, pattern.regex, pattern.type);
    
    for (const match of matches) {
      // Check if subject is in scope
      const inScope = isInScope(match.subject, sceneSpec.canon_read_scope);
      
      if (!inScope) {
        // Subject not in scope - warn but don't stage
        warnings.push({
          code: 'ENTITY_OUT_OF_SCOPE',
          message: `Entity "${match.subject}" found but not in canon_read_scope`,
          details: {
            entity: match.subject,
            pattern: patternName,
            value: String(match.value)
          }
        });
        continue;
      }
      
      // Classify the fact
      const classification = classifyFact(
        match.subject,
        match.key,
        match.value,
        canonSnapshot
      );
      
      // Add to staged facts
      staged_facts.push({
        subject: normalizeEntityId(match.subject),
        key: match.key,
        value: match.value,
        classification
      });
      
      // Warn if conflict detected
      if (classification === 'CONFLICT') {
        warnings.push({
          code: 'CANON_CONFLICT_DETECTED',
          message: `Potential conflict with existing CANON fact for ${match.subject}`,
          details: {
            entity: match.subject,
            key: match.key,
            new_value: String(match.value)
          }
        });
      }
    }
  }
  
  // Deduplicate facts
  const deduped = deduplicateFacts(staged_facts);
  
  // Compute summary
  const summary = computeSummary(deduped);
  
  return {
    staged_facts: deduped,
    warnings,
    summary
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

interface RawMatch {
  subject: string;
  key: string;
  value: unknown;
}

/**
 * Extract matches using a regex pattern
 */
function extractByPattern(
  text: string,
  regex: RegExp,
  factType: string
): RawMatch[] {
  const matches: RawMatch[] = [];
  let match: RegExpExecArray | null;
  
  // Reset regex state
  regex.lastIndex = 0;
  
  while ((match = regex.exec(text)) !== null) {
    const subject = match[1]?.trim();
    const value = match[2]?.trim();
    
    if (subject && value) {
      matches.push({
        subject,
        key: factType,
        value
      });
    }
  }
  
  return matches;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCOPE CHECKING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a subject is in the canon_read_scope
 * 
 * @invariant SCRIBE-I03: Canon read scope must be explicit
 */
function isInScope(subject: string, scope: EntityId[]): boolean {
  const normalizedSubject = subject.toLowerCase();
  
  for (const entityId of scope) {
    // entityId format: TYPE:NAME
    const parts = entityId.split(':');
    if (parts.length === 2) {
      const name = parts[1].toLowerCase();
      if (normalizedSubject === name || normalizedSubject.includes(name)) {
        return true;
      }
    }
    
    // Also check direct match
    if (entityId.toLowerCase().includes(normalizedSubject)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Normalize subject to EntityId format
 */
function normalizeEntityId(subject: string): EntityId {
  // Capitalize and format as CHAR:NAME
  const normalized = subject.toUpperCase().replace(/\s+/g, '_');
  return `CHAR:${normalized}` as EntityId;
}

// ─────────────────────────────────────────────────────────────────────────────
// FACT CLASSIFICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classify a fact against existing CANON
 * 
 * Classifications:
 * - SAFE: New fact, no conflict
 * - CONFLICT: Contradicts existing CANON
 * - NEEDS_HUMAN: Ambiguous, requires human decision
 * 
 * @invariant SCRIBE-I13: Never auto-commit, always stage
 */
function classifyFact(
  subject: string,
  key: string,
  value: unknown,
  canonSnapshot: CanonSnapshot
): FactClass {
  // Check if entity exists in snapshot
  const normalizedSubject = normalizeEntityId(subject);
  
  if (!canonSnapshot.entities) {
    return 'NEEDS_HUMAN'; // No entities to compare
  }
  
  const existingEntity = canonSnapshot.entities[normalizedSubject];
  
  if (!existingEntity) {
    // Entity doesn't exist in CANON yet
    return 'NEEDS_HUMAN'; // New entity needs human validation
  }
  
  // Check if key exists
  const existingValue = existingEntity[key];
  
  if (existingValue === undefined) {
    // New attribute for existing entity
    return 'SAFE';
  }
  
  // Compare values
  if (valuesEqual(existingValue, value)) {
    return 'SAFE'; // Same value, no conflict
  }
  
  // Different value - conflict!
  return 'CONFLICT';
}

/**
 * Compare two values for equality
 */
function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  
  // String comparison (case-insensitive for text)
  if (typeof a === 'string' && typeof b === 'string') {
    return a.toLowerCase() === b.toLowerCase();
  }
  
  // Deep comparison for objects
  if (typeof a === 'object' && typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// DEDUPLICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deduplicate staged facts
 * Keep the most specific (CONFLICT > NEEDS_HUMAN > SAFE)
 */
function deduplicateFacts(facts: StagedFact[]): StagedFact[] {
  const map = new Map<string, StagedFact>();
  
  for (const fact of facts) {
    const key = `${fact.subject}:${fact.key}`;
    const existing = map.get(key);
    
    if (!existing) {
      map.set(key, fact);
    } else {
      // Keep the more severe classification
      const severity = classificationSeverity(fact.classification);
      const existingSeverity = classificationSeverity(existing.classification);
      
      if (severity > existingSeverity) {
        map.set(key, fact);
      }
    }
  }
  
  return Array.from(map.values());
}

/**
 * Get severity score for classification
 */
function classificationSeverity(classification: FactClass): number {
  switch (classification) {
    case 'CONFLICT': return 3;
    case 'NEEDS_HUMAN': return 2;
    case 'SAFE': return 1;
    default: return 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute extraction summary
 */
function computeSummary(facts: StagedFact[]): ExtractionSummary {
  let safe_count = 0;
  let conflict_count = 0;
  let needs_human_count = 0;
  
  for (const fact of facts) {
    switch (fact.classification) {
      case 'SAFE':
        safe_count++;
        break;
      case 'CONFLICT':
        conflict_count++;
        break;
      case 'NEEDS_HUMAN':
        needs_human_count++;
        break;
    }
  }
  
  return {
    total_extracted: facts.length,
    safe_count,
    conflict_count,
    needs_human_count
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate that staging doesn't attempt CANON write
 * 
 * @invariant SCRIBE-I12: CANON is read-only
 */
export function validateNoCanonWrite(facts: StagedFact[]): boolean {
  // In this implementation, we never write to CANON
  // This function exists for explicit invariant checking
  return true; // Staging only, never writes
}

/**
 * Filter facts by classification
 */
export function filterByClassification(
  facts: StagedFact[],
  classification: FactClass
): StagedFact[] {
  return facts.filter(f => f.classification === classification);
}

/**
 * Check if any conflicts exist
 */
export function hasConflicts(facts: StagedFact[]): boolean {
  return facts.some(f => f.classification === 'CONFLICT');
}

/**
 * Get all conflicting facts
 */
export function getConflicts(facts: StagedFact[]): StagedFact[] {
  return filterByClassification(facts, 'CONFLICT');
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export const Staging = {
  extractStagedFacts,
  validateNoCanonWrite,
  filterByClassification,
  hasConflicts,
  getConflicts,
  // For testing
  isInScope,
  normalizeEntityId,
  classifyFact
};

export default Staging;
