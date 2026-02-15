/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Sovereign — Deterministic Constraint Compiler
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Transforme ForgeEmotionBrief → section prompt budgetée.
 *
 * RÈGLES :
 * - Jamais de vecteurs 14D/XYZ bruts dans l'output
 * - Jamais de chiffres "force 35.2" ou "drop 55%"
 * - Seulement des instructions narratives en français
 * - Budget tokens strict (fail-closed si dépassé après CRITICAL)
 * - Déterministe : même brief → même text → même hash
 */

import { sha256, canonicalize } from '@omega/canon-kernel';
import type {
  ForgeEmotionBrief,
  QuartileTarget,
  EmotionPhysicsProfile,
  TransitionConstraint,
  ForbiddenTransition,
  DecayExpectation,
  BlendZone,
} from '@omega/omega-forge';
import type {
  CompiledConstraint,
  CompiledPhysicsSection,
  PhysicsCompilerConfig,
} from './types.js';
import { countTokens } from './token-counter.js';

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPILER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compile ForgeEmotionBrief into a budgeted physics prompt section.
 * FAIL-CLOSED: throws if config invalid or CRITICAL exceeds budget.
 * DETERMINISTIC: same brief + same config → same output → same hash.
 */
export function compilePhysicsSection(
  brief: ForgeEmotionBrief,
  cfg: PhysicsCompilerConfig,
): CompiledPhysicsSection {
  // ── GATE: validate config ──
  if (!cfg.physics_prompt_budget_tokens || cfg.physics_prompt_budget_tokens <= 0) {
    throw new Error('COMPILE FAIL: physics_prompt_budget_tokens must be > 0');
  }
  if (!cfg.physics_prompt_tokenizer_id || cfg.physics_prompt_tokenizer_id.trim() === '') {
    throw new Error('COMPILE FAIL: physics_prompt_tokenizer_id is required');
  }
  if (!brief.language || (brief.language !== 'fr' && brief.language !== 'en')) {
    throw new Error(`COMPILE FAIL: brief.language must be 'fr' or 'en', got '${brief.language}'`);
  }

  const budget = cfg.physics_prompt_budget_tokens;
  const tokenizerId = cfg.physics_prompt_tokenizer_id;
  const isFr = brief.language === 'fr';

  // ── PASS 1: Build all constraints by priority ──
  const allConstraints: CompiledConstraint[] = [];

  // CRITICAL: Emotional arc + active emotions
  const emotionConstraints = compileEmotionBehaviors(
    brief.physics_profiles,
    brief.quartile_targets,
    cfg.top_k_emotions,
    isFr,
  );
  allConstraints.push(...emotionConstraints);

  // CRITICAL: Transitions
  const transitionConstraints = compileTransitions(
    brief.transition_map,
    cfg.top_k_transitions,
    isFr,
  );
  allConstraints.push(...transitionConstraints);

  // CRITICAL: Forbidden
  const forbiddenConstraints = compileForbidden(brief.forbidden_transitions, isFr);
  allConstraints.push(...forbiddenConstraints);

  // HIGH: Decay
  const decayConstraints = compileDecay(brief.decay_expectations, isFr);
  allConstraints.push(...decayConstraints);

  // HIGH: Blend zones
  const blendConstraints = compileBlendZones(brief.blend_zones, isFr);
  allConstraints.push(...blendConstraints);

  // MED: Anti-dead-zone
  const deadZoneConstraint = compileAntiDeadZone(brief, isFr);
  if (deadZoneConstraint) allConstraints.push(deadZoneConstraint);

  // ── PASS 2: Budget-aware selection ──
  const selected = selectWithinBudget(allConstraints, budget, tokenizerId);

  // ── PASS 3: Assemble final text ──
  const sectionTitle = '# PHYSICS (COMPILED)\n\n';
  const body = selected.map((c) => c.text).join('\n\n');
  const text = sectionTitle + body;

  const token_count = countTokens(text, tokenizerId);
  const section_hash = sha256(canonicalize({ text }));
  const used_signal_ids = [...new Set(selected.flatMap((c) => c.source_signal_ids))].sort();

  return {
    text,
    token_count,
    tokenizer_id: tokenizerId,
    used_signal_ids,
    constraints: selected,
    section_hash,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTRAINT BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

function compileEmotionBehaviors(
  profiles: readonly EmotionPhysicsProfile[],
  quartiles: readonly QuartileTarget[],
  topK: number,
  fr: boolean,
): CompiledConstraint[] {
  const sorted = [...profiles].sort((a, b) => b.mass - a.mass).slice(0, topK);
  const constraints: CompiledConstraint[] = [];

  // Quartile emotional arc (always included)
  const arcLines: string[] = [];
  for (const q of quartiles) {
    arcLines.push(`- ${q.quartile}: émotion dominante **${q.dominant}**`);
  }
  constraints.push({
    id: 'PHYS-ARC',
    priority: 'CRITICAL',
    text: fr
      ? `## Arc émotionnel prescrit\n\n${arcLines.join('\n')}`
      : `## Prescribed emotional arc\n\n${arcLines.join('\n')}`,
    source_signal_ids: ['emotion.trajectory.prescribed.14d'],
  });

  // Per-emotion behavior
  for (const profile of sorted) {
    const behavior = fr ? describeBehaviorFr(profile) : describeBehaviorEn(profile);
    constraints.push({
      id: `PHYS-EMO-${profile.emotion.toUpperCase()}`,
      priority: 'CRITICAL',
      text: behavior,
      source_signal_ids: ['emotion.physics_profile'],
    });
  }

  return constraints;
}

function describeBehaviorFr(p: EmotionPhysicsProfile): string {
  const persistence = p.lambda < 0.08 ? 'persiste longtemps dans la prose'
    : p.lambda > 0.15 ? 's\'estompe rapidement après le pic'
    : 'décroît à rythme modéré';
  const weight = p.mass > 6 ? 'lourde et difficile à déplacer (nécessite un événement fort)'
    : p.mass < 4 ? 'légère et mobile (transitions fluides possibles)'
    : 'poids narratif modéré';
  return `**${p.emotion}** — ${weight}, ${persistence}.`;
}

function describeBehaviorEn(p: EmotionPhysicsProfile): string {
  const persistence = p.lambda < 0.08 ? 'lingers long in the prose'
    : p.lambda > 0.15 ? 'fades quickly after peak'
    : 'decays at moderate pace';
  const weight = p.mass > 6 ? 'heavy, hard to shift (requires strong narrative event)'
    : p.mass < 4 ? 'light and mobile (smooth transitions possible)'
    : 'moderate narrative weight';
  return `**${p.emotion}** — ${weight}, ${persistence}.`;
}

function compileTransitions(
  transitions: readonly TransitionConstraint[],
  topK: number,
  fr: boolean,
): CompiledConstraint[] {
  const sorted = [...transitions].sort((a, b) => b.required_force - a.required_force).slice(0, topK);
  return sorted.map((t, i) => {
    const text = fr
      ? `**${t.from_quartile}→${t.to_quartile}** (${t.from_dominant}→${t.to_dominant}): ${t.feasible ? t.narrative_hint_fr : `⚠️ ${t.narrative_hint_fr}`}`
      : `**${t.from_quartile}→${t.to_quartile}** (${t.from_dominant}→${t.to_dominant}): ${t.feasible ? 'feasible' : 'DIFFICULT — narrative catalyst required'}`;
    return {
      id: `PHYS-TRANS-${i}`,
      priority: 'CRITICAL' as const,
      text,
      source_signal_ids: ['emotion.transition_map'],
    };
  });
}

function compileForbidden(
  forbidden: readonly ForbiddenTransition[],
  fr: boolean,
): CompiledConstraint[] {
  if (forbidden.length === 0) return [];
  const lines = forbidden.map((f) =>
    fr ? `- **${f.from}→${f.to}** : interdit (${f.reason_fr})` : `- **${f.from}→${f.to}** : forbidden`
  );
  return [{
    id: 'PHYS-FORBIDDEN',
    priority: 'CRITICAL',
    text: fr
      ? `## Transitions interdites\n\n${lines.join('\n')}\n\nSi la narration exige ce passage, insérer une émotion intermédiaire.`
      : `## Forbidden transitions\n\n${lines.join('\n')}\n\nIf narrative requires this shift, insert intermediate emotion.`,
    source_signal_ids: ['emotion.forbidden_transitions'],
  }];
}

function compileDecay(
  decay: readonly DecayExpectation[],
  fr: boolean,
): CompiledConstraint[] {
  if (decay.length === 0) return [];
  const lines = decay.map((d) =>
    fr ? `- ${d.instruction_fr}` : `- After ${d.emotion} peak in ${d.peak_quartile}: expect decay`
  );
  return [{
    id: 'PHYS-DECAY',
    priority: 'HIGH',
    text: fr
      ? `## Décroissance émotionnelle\n\n${lines.join('\n')}\n\nNe pas maintenir un pic artificiellement — laisser l'émotion retomber naturellement.`
      : `## Emotional decay\n\n${lines.join('\n')}\n\nDo not maintain peaks artificially.`,
    source_signal_ids: ['emotion.decay_expectations'],
  }];
}

function compileBlendZones(
  blends: readonly BlendZone[],
  fr: boolean,
): CompiledConstraint[] {
  if (blends.length === 0) return [];
  const lines = blends.map((b) =>
    fr ? `- ${b.instruction_fr}` : `- ${b.quartile}: blend zone`
  );
  return [{
    id: 'PHYS-BLEND',
    priority: 'HIGH',
    text: fr
      ? `## Zones de mélange émotionnel\n\n${lines.join('\n')}\n\nDans ces zones, laisser coexister les émotions sans en écraser une.`
      : `## Emotional blend zones\n\n${lines.join('\n')}`,
    source_signal_ids: ['emotion.blend_zones'],
  }];
}

function compileAntiDeadZone(brief: ForgeEmotionBrief, fr: boolean): CompiledConstraint | null {
  if (brief.trajectory.length < 4) return null;
  return {
    id: 'PHYS-DEADZONE',
    priority: 'MED',
    text: fr
      ? `## Anti-zone-morte\n\nChaque quartile doit contenir au moins un mouvement émotionnel. Pas de paragraphes "neutres" consécutifs.`
      : `## Anti-dead-zone\n\nEvery quartile must contain at least one emotional movement. No consecutive neutral paragraphs.`,
    source_signal_ids: ['emotion.dead_zones'],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUDGET-AWARE SELECTION
// ═══════════════════════════════════════════════════════════════════════════════

function selectWithinBudget(
  constraints: readonly CompiledConstraint[],
  budget: number,
  tokenizerId: string,
): CompiledConstraint[] {
  const header = '# PHYSICS (COMPILED)\n\n';
  const headerTokens = countTokens(header, tokenizerId);
  let remaining = budget - headerTokens;

  const critical = constraints.filter((c) => c.priority === 'CRITICAL');
  const high = constraints.filter((c) => c.priority === 'HIGH');
  const med = constraints.filter((c) => c.priority === 'MED');

  const selected: CompiledConstraint[] = [];

  // CRITICAL — must all fit, fail-closed otherwise
  for (const c of critical) {
    const tokens = countTokens(c.text + '\n\n', tokenizerId);
    remaining -= tokens;
    selected.push(c);
  }
  if (remaining < 0) {
    throw new Error(
      `COMPILE FAIL: CRITICAL constraints alone exceed budget ` +
      `(${budget} tokens). Need ${budget - remaining}. Increase physics_prompt_budget_tokens.`
    );
  }

  // HIGH — include if budget allows
  for (const c of high) {
    const tokens = countTokens(c.text + '\n\n', tokenizerId);
    if (tokens <= remaining) { selected.push(c); remaining -= tokens; }
  }

  // MED — include if budget allows
  for (const c of med) {
    const tokens = countTokens(c.text + '\n\n', tokenizerId);
    if (tokens <= remaining) { selected.push(c); remaining -= tokens; }
  }

  return selected;
}
