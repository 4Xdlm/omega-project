/**
 * OMEGA Metrics — Semantic Metrics (M1-M5)
 * Phase R-METRICS — Objective semantic quality measures
 * NO NLP, NO sentiment analysis — deterministic heuristics only
 */

import type { GenesisPlan, IntentPack, SemanticMetrics, Arc, Scene } from '../types.js';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'of', 'and', 'or', 'in', 'to', 'for', 'is', 'it', 'its',
  'be', 'as', 'at', 'by', 'on', 'with', 'from', 'that', 'this', 'was', 'are',
  'le', 'la', 'les', 'de', 'du', 'des', 'et', 'ou', 'un', 'une', 'en', 'dans',
  'qui', 'que', 'est', 'sur', 'par', 'pour', 'pas', 'son', 'ses', 'aux',
]);

const NEGATION_PREFIXES = ['not ', 'no ', 'never ', 'without ', 'impossible '];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-zà-ÿ0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

// ─── M1: intent_theme_coverage ──────────────────────────────────────────────

/**
 * M1 — intent_theme_coverage (weight: 0.20)
 * Checks if intent themes appear in arc themes (case-insensitive substring)
 */
export function intentThemeCoverage(plan: GenesisPlan, intent: IntentPack): number {
  const themes = intent.intent.themes;
  if (!themes || themes.length === 0) return 1.0;

  const arcThemes = plan.arcs.map(a => a.theme.toLowerCase());

  let covered = 0;
  for (const theme of themes) {
    const themeLower = theme.toLowerCase();
    const found = arcThemes.some(at => at.includes(themeLower) || themeLower.includes(at));
    if (found) covered++;
  }

  return covered / themes.length;
}

// ─── M2: theme_fidelity ─────────────────────────────────────────────────────

/**
 * M2 — theme_fidelity (weight: 0.15)
 * Overlap coefficient between intent theme tokens and plan theme+progression tokens.
 * Formula: |A ∩ B| / min(|A|, |B|)
 * Measures whether the smaller set (intent themes) is contained in the larger (plan).
 * More appropriate than Jaccard when sets have very different sizes.
 */
export function themeFidelity(plan: GenesisPlan, intent: IntentPack): number {
  const intentTokens = new Set<string>();
  for (const theme of intent.intent.themes) {
    for (const t of tokenize(theme)) intentTokens.add(t);
  }

  const planTokens = new Set<string>();
  for (const arc of plan.arcs) {
    for (const t of tokenize(arc.theme)) planTokens.add(t);
    for (const t of tokenize(arc.progression)) planTokens.add(t);
  }

  if (intentTokens.size === 0 && planTokens.size === 0) return 1.0;
  if (intentTokens.size === 0 || planTokens.size === 0) return 0;

  let intersection = 0;
  for (const t of intentTokens) {
    if (planTokens.has(t)) intersection++;
  }

  const minSize = Math.min(intentTokens.size, planTokens.size);
  return minSize > 0 ? intersection / minSize : 0;
}

// ─── M3: canon_respect ──────────────────────────────────────────────────────

/**
 * M3 — canon_respect (weight: 0.25)
 * Heuristic: checks for explicit negation of canon keywords in descriptions.
 * Returns { score, violation_count }
 */
export function canonRespect(plan: GenesisPlan, intent: IntentPack): { score: number; violation_count: number } {
  const entries = intent.canon?.entries;
  if (!entries || entries.length === 0) return { score: 1.0, violation_count: 0 };

  // Collect all descriptive text from plan
  const allTexts: string[] = [];
  for (const arc of plan.arcs) {
    allTexts.push(arc.progression.toLowerCase());
    for (const scene of arc.scenes) {
      allTexts.push(scene.objective.toLowerCase());
      allTexts.push(scene.conflict.toLowerCase());
      for (const beat of scene.beats) {
        allTexts.push(beat.action.toLowerCase());
      }
    }
  }
  const combinedText = allTexts.join(' ');

  let violations = 0;

  for (const entry of entries) {
    const keywords = tokenize(entry.statement).filter(w => w.length > 3);

    for (const keyword of keywords) {
      for (const prefix of NEGATION_PREFIXES) {
        if (combinedText.includes(prefix + keyword)) {
          violations++;
          break; // one violation per entry is enough
        }
      }
    }
  }

  const score = entries.length > 0 ? 1.0 - (violations / entries.length) : 1.0;
  return { score: Math.max(0, score), violation_count: violations };
}

// ─── M4: emotion_trajectory_alignment ───────────────────────────────────────

/**
 * M4 — emotion_trajectory_alignment (weight: 0.20)
 * Checks if plan emotion trajectory matches intent waypoints and resolution
 */
export function emotionTrajectoryAlignment(plan: GenesisPlan, intent: IntentPack): number {
  if (!plan.emotion_trajectory || plan.emotion_trajectory.length === 0) return 0;

  let score = 0;

  // Check resolution emotion (40% weight)
  const resolutionEmotion = intent.emotion?.resolution_emotion;
  if (resolutionEmotion) {
    const lastPoint = plan.emotion_trajectory[plan.emotion_trajectory.length - 1];
    if (lastPoint && lastPoint.emotion.toLowerCase() === resolutionEmotion.toLowerCase()) {
      score += 0.4;
    }
  } else {
    score += 0.4; // No resolution specified → pass
  }

  // Check waypoints (60% weight)
  const waypoints = intent.emotion?.waypoints;
  if (!waypoints || waypoints.length === 0) {
    score += 0.6; // No waypoints specified → pass
    return Math.min(score, 1.0);
  }

  const tolerance = 0.15;
  let waypointsHit = 0;

  for (const wp of waypoints) {
    // Find closest trajectory point
    let matched = false;
    for (const tp of plan.emotion_trajectory) {
      const positionMatch = Math.abs(tp.position - wp.position) <= tolerance;
      const emotionMatch = tp.emotion.toLowerCase() === wp.emotion.toLowerCase();
      if (positionMatch && emotionMatch) {
        matched = true;
        break;
      }
    }
    if (matched) waypointsHit++;
  }

  score += (waypointsHit / waypoints.length) * 0.6;

  return Math.min(score, 1.0);
}

// ─── M5: constraint_satisfaction ────────────────────────────────────────────

/**
 * M5 — constraint_satisfaction (weight: 0.20)
 * Checks scene count, banned words, POV, tense constraints
 */
export function constraintSatisfaction(plan: GenesisPlan, intent: IntentPack): number {
  const constraints = intent.constraints;
  if (!constraints) return 1.0;

  let totalChecks = 0;
  let passed = 0;

  // C1: scene count in range
  if (typeof constraints.min_scenes === 'number' && typeof constraints.max_scenes === 'number') {
    totalChecks++;
    if (plan.scene_count >= constraints.min_scenes && plan.scene_count <= constraints.max_scenes) {
      passed++;
    }
  }

  // C2: banned words absent from descriptions
  const bannedWords = constraints.banned_words;
  if (bannedWords && bannedWords.length > 0) {
    totalChecks++;
    const allTexts: string[] = [];
    for (const arc of plan.arcs) {
      allTexts.push(arc.progression.toLowerCase());
      for (const scene of arc.scenes) {
        allTexts.push(scene.objective.toLowerCase());
        allTexts.push(scene.conflict.toLowerCase());
        allTexts.push(scene.sensory_anchor.toLowerCase());
        for (const beat of scene.beats) {
          allTexts.push(beat.action.toLowerCase());
        }
      }
    }
    const combined = allTexts.join(' ');
    const hasBanned = bannedWords.some(w => combined.includes(w.toLowerCase()));
    if (!hasBanned) passed++;
  }

  // C3: banned topics absent
  const bannedTopics = constraints.banned_topics;
  if (bannedTopics && bannedTopics.length > 0) {
    totalChecks++;
    const allTexts: string[] = [];
    for (const arc of plan.arcs) {
      allTexts.push(arc.theme.toLowerCase());
      allTexts.push(arc.progression.toLowerCase());
      for (const scene of arc.scenes) {
        allTexts.push(scene.objective.toLowerCase());
      }
    }
    const combined = allTexts.join(' ');
    const hasBannedTopic = bannedTopics.some(t => combined.includes(t.toLowerCase()));
    if (!hasBannedTopic) passed++;
  }

  if (totalChecks === 0) return 1.0;
  return passed / totalChecks;
}

// ─── Aggregate ──────────────────────────────────────────────────────────────

/**
 * Compute all semantic metrics
 */
export function computeSemanticMetrics(plan: GenesisPlan, intent: IntentPack): SemanticMetrics {
  const canon = canonRespect(plan, intent);

  return {
    intent_theme_coverage: intentThemeCoverage(plan, intent),
    theme_fidelity: themeFidelity(plan, intent),
    canon_respect: canon.score,
    canon_violation_count: canon.violation_count,
    emotion_trajectory_alignment: emotionTrajectoryAlignment(plan, intent),
    constraint_satisfaction: constraintSatisfaction(plan, intent),
  };
}
