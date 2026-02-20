// ═══════════════════════════════════════════════════════════════════════════
// OMEGA SCRIBE v1.0 — PROMPT BUILDER
// Version: 1.0.0
// Date: 01 janvier 2026
// Certification: NASA-GRADE AS9100D / DO-178C
// ═══════════════════════════════════════════════════════════════════════════

import { 
  SceneSpec, 
  ScribeRequest,
  HashHex 
} from './types';
import { sha256, canonicalizeJson } from './canonicalize';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Prompt build result
 */
export interface PromptBuildResult {
  prompt: string;
  prompt_hash: HashHex;
  constraint_hash: HashHex;
}

/**
 * Voice guidance structure (from VOICE module)
 */
export interface VoiceGuidance {
  expected_metrics?: Record<string, number>;
  style_markers?: string[];
  forbidden_patterns?: string[];
  guidance_text?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const PROMPT_VERSION = 'OMEGA_SCRIBE_PROMPT_v1';

const SECTION_MARKERS = {
  HEADER: `═════════════════════════════════════════════════════════════════════════════`,
  DIVIDER: `─────────────────────────────────────────────────────────────────────────────`,
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN BUILDER FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a deterministic prompt from ScribeRequest
 * 
 * @invariant SCRIBE-I06: Prompt hash is deterministic
 * @invariant Same inputs = same prompt = same hash (100 runs)
 * 
 * The prompt structure is fixed and ordered:
 * 1. Header
 * 2. Scene Spec
 * 3. Canon Snapshot
 * 4. Voice Guidance
 * 5. Constraints
 * 6. Requirements
 * 
 * @param request ScribeRequest
 * @returns PromptBuildResult with prompt string and hashes
 */
export function buildPrompt(request: ScribeRequest): PromptBuildResult {
  // Compute constraint hash first (for inclusion in prompt)
  const constraint_hash = computeConstraintHash(request);
  
  // Build prompt sections
  const sections: string[] = [];
  
  // 1. Header
  sections.push(buildHeader(request.run_id));
  
  // 2. Scene Spec
  sections.push(buildSceneSpecSection(request.scene_spec));
  
  // 3. Canon Snapshot
  sections.push(buildCanonSection(request.canon_snapshot, request.scene_spec.canon_read_scope));
  
  // 4. Voice Guidance
  sections.push(buildVoiceSection(request.voice_guidance));
  
  // 5. Constraints
  sections.push(buildConstraintsSection(request.scene_spec, constraint_hash));
  
  // 6. Requirements
  sections.push(buildRequirementsSection(request.scene_spec));
  
  // Join all sections
  const prompt = sections.join('\n\n');
  
  // Compute prompt hash
  const prompt_hash = sha256(prompt);
  
  return {
    prompt,
    prompt_hash,
    constraint_hash
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION BUILDERS (Deterministic, ordered)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build header section
 */
function buildHeader(run_id: string): string {
  return `${PROMPT_VERSION}
${SECTION_MARKERS.HEADER}
RUN_ID: ${run_id}
TIMESTAMP: ${new Date().toISOString().split('T')[0]}
${SECTION_MARKERS.HEADER}`;
}

/**
 * Build scene spec section
 */
function buildSceneSpecSection(spec: SceneSpec): string {
  const lines: string[] = [
    `[SCENE_SPEC]`,
    SECTION_MARKERS.DIVIDER,
    `Scene ID: ${spec.scene_id}`,
    `POV: ${spec.pov.entity_id}`,
    `Tense: ${spec.tense}`,
    `Length: ${spec.target_length.min_words}-${spec.target_length.max_words} words (${spec.target_length.mode})`,
    ``,
    `CONTINUITY CLAIMS:`,
  ];
  
  // Add continuity claims (sorted for determinism)
  const sortedClaims = [...spec.continuity_claims].sort((a, b) => 
    `${a.subject}:${a.predicate}`.localeCompare(`${b.subject}:${b.predicate}`)
  );
  
  for (const claim of sortedClaims) {
    lines.push(`  - ${claim.subject} | ${claim.predicate} | ${JSON.stringify(claim.object)}`);
  }
  
  if (spec.forbidden_facts.length > 0) {
    lines.push(``, `FORBIDDEN FACTS:`);
    const sortedForbidden = [...spec.forbidden_facts].sort((a, b) =>
      `${a.subject}:${a.predicate}`.localeCompare(`${b.subject}:${b.predicate}`)
    );
    for (const fact of sortedForbidden) {
      lines.push(`  - ${fact.subject} | ${fact.predicate} | ${JSON.stringify(fact.object)}`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Build canon snapshot section
 */
function buildCanonSection(
  canonSnapshot: Record<string, unknown>,
  scope: string[]
): string {
  const lines: string[] = [
    `[CANON_SNAPSHOT]`,
    SECTION_MARKERS.DIVIDER,
    `Scope: ${scope.join(', ')}`,
    ``,
    `ENTITIES IN SCOPE:`,
  ];
  
  // Filter and sort entities by scope
  const filteredEntities: Record<string, unknown> = {};
  
  for (const entityId of scope.sort()) {
    if (canonSnapshot[entityId]) {
      filteredEntities[entityId] = canonSnapshot[entityId];
    }
  }
  
  // Add canonical JSON representation
  const canonical = canonicalizeJson(filteredEntities);
  lines.push(canonical);
  
  return lines.join('\n');
}

/**
 * Build voice guidance section
 */
function buildVoiceSection(voiceGuidance: Record<string, unknown>): string {
  const lines: string[] = [
    `[VOICE_GUIDANCE]`,
    SECTION_MARKERS.DIVIDER,
  ];
  
  // Extract known fields
  const guidance = voiceGuidance as VoiceGuidance;
  
  if (guidance.expected_metrics) {
    lines.push(`EXPECTED METRICS:`);
    const sortedMetrics = Object.entries(guidance.expected_metrics).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [key, value] of sortedMetrics) {
      lines.push(`  - ${key}: ${value}`);
    }
  }
  
  if (guidance.style_markers && guidance.style_markers.length > 0) {
    lines.push(``, `STYLE MARKERS:`);
    for (const marker of guidance.style_markers.sort()) {
      lines.push(`  - ${marker}`);
    }
  }
  
  if (guidance.forbidden_patterns && guidance.forbidden_patterns.length > 0) {
    lines.push(``, `FORBIDDEN PATTERNS:`);
    for (const pattern of guidance.forbidden_patterns.sort()) {
      lines.push(`  - ${pattern}`);
    }
  }
  
  if (guidance.guidance_text) {
    lines.push(``, `GUIDANCE TEXT:`, guidance.guidance_text);
  }
  
  // Also include full JSON for completeness
  lines.push(``, `FULL GUIDANCE (canonical):`, canonicalizeJson(voiceGuidance));
  
  return lines.join('\n');
}

/**
 * Build constraints section
 */
function buildConstraintsSection(spec: SceneSpec, constraint_hash: HashHex): string {
  const lines: string[] = [
    `[CONSTRAINTS]`,
    SECTION_MARKERS.DIVIDER,
    `Constraint Hash: ${constraint_hash}`,
    ``,
  ];
  
  if (spec.constraints.length > 0) {
    const sortedConstraints = [...spec.constraints].sort((a, b) => 
      a.key.localeCompare(b.key)
    );
    
    for (const constraint of sortedConstraints) {
      lines.push(`- ${constraint.key}: ${JSON.stringify(constraint.value)}`);
    }
  } else {
    lines.push(`No additional constraints.`);
  }
  
  return lines.join('\n');
}

/**
 * Build requirements section
 */
function buildRequirementsSection(spec: SceneSpec): string {
  const povEntity = spec.pov.entity_id.split(':')[1] || spec.pov.entity_id;
  
  return `[REQUIREMENTS]
${SECTION_MARKERS.DIVIDER}
CRITICAL REQUIREMENTS (MUST FOLLOW):

1. POINT OF VIEW
   - Write from the perspective of ${povEntity}
   - Use third person narrative
   - Stay inside this character's knowledge and perception

2. TENSE
   - Use ${spec.tense === 'PAST' ? 'past' : 'present'} tense consistently
   - Do not mix tenses

3. LENGTH
   - Target: ${spec.target_length.min_words} to ${spec.target_length.max_words} words
   - Mode: ${spec.target_length.mode}

4. CONTINUITY
   - Respect ALL continuity claims listed above
   - Do NOT contradict any established facts
   - Do NOT introduce facts outside the CANON scope

5. FORBIDDEN
   - Avoid ALL forbidden facts and patterns
   - If uncertain about a fact, do NOT include it

6. OUTPUT FORMAT
   - Output ONLY the narrative text
   - No meta-commentary, no explanations
   - No headers or markers in the output`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HASH COMPUTATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute constraint hash from request
 * 
 * @invariant SCRIBE-I06: Deterministic
 */
function computeConstraintHash(request: ScribeRequest): HashHex {
  // Create canonical representation of all constraint-relevant data
  const constraintData = {
    scene_id: request.scene_spec.scene_id,
    pov: request.scene_spec.pov,
    tense: request.scene_spec.tense,
    target_length: request.scene_spec.target_length,
    canon_read_scope: [...request.scene_spec.canon_read_scope].sort(),
    continuity_claims: [...request.scene_spec.continuity_claims]
      .sort((a, b) => `${a.subject}:${a.predicate}`.localeCompare(`${b.subject}:${b.predicate}`)),
    forbidden_facts: [...request.scene_spec.forbidden_facts]
      .sort((a, b) => `${a.subject}:${a.predicate}`.localeCompare(`${b.subject}:${b.predicate}`)),
    voice_profile_ref: request.scene_spec.voice_profile_ref,
    constraints: [...request.scene_spec.constraints]
      .sort((a, b) => a.key.localeCompare(b.key)),
    voice_guidance: request.voice_guidance,
    seed: request.seed
  };
  
  const canonical = canonicalizeJson(constraintData);
  return sha256(canonical);
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTING UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Test prompt determinism
 * 
 * @param request ScribeRequest to test
 * @param runs Number of runs (default 100)
 * @returns Test result
 */
export function testPromptDeterminism(
  request: ScribeRequest,
  runs: number = 100
): { passed: boolean; hash: HashHex; inconsistencies: number } {
  const firstResult = buildPrompt(request);
  let inconsistencies = 0;
  
  for (let i = 0; i < runs; i++) {
    const result = buildPrompt(request);
    if (result.prompt_hash !== firstResult.prompt_hash) {
      inconsistencies++;
    }
    if (result.constraint_hash !== firstResult.constraint_hash) {
      inconsistencies++;
    }
  }
  
  return {
    passed: inconsistencies === 0,
    hash: firstResult.prompt_hash,
    inconsistencies
  };
}

/**
 * Extract prompt sections for inspection
 */
export function extractPromptSections(prompt: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const sectionRegex = /\[([A-Z_]+)\]/g;
  
  let match: RegExpExecArray | null;
  const positions: Array<{ name: string; start: number }> = [];
  
  while ((match = sectionRegex.exec(prompt)) !== null) {
    positions.push({ name: match[1], start: match.index });
  }
  
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].start;
    const end = i < positions.length - 1 ? positions[i + 1].start : prompt.length;
    sections[positions[i].name] = prompt.substring(start, end).trim();
  }
  
  return sections;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export const PromptBuilder = {
  buildPrompt,
  computeConstraintHash,
  testPromptDeterminism,
  extractPromptSections
};

export default PromptBuilder;
