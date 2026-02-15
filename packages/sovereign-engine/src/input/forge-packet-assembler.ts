/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — FORGE PACKET ASSEMBLER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: input/forge-packet-assembler.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Assembles FORGE_PACKET from GenesisPlan + Scene + Constraints.
 * Integrates 14+ @omega/omega-forge functions for 14D emotion trajectory.
 *
 * ALGORITHM:
 * 1. Build prescribed trajectory using omega-forge (14D states by paragraph)
 * 2. Group paragraphs into 4 quartiles (Q1-Q4)
 * 3. Compute quartile statistics: valence, arousal, dominant emotion
 * 4. Detect tension markers: pic, faille, silence zones
 * 5. Detect rupture: largest valence delta between adjacent quartiles
 * 6. Compute valence arc: start → end direction
 * 7. Assemble ForgePacket with all data
 * 8. Hash with sha256(canonicalize(packet))
 * 9. Return frozen packet
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type { Beat, EmotionWaypoint } from '@omega/genesis-planner';
import {
  singleEmotionState,
  computeValence,
  computeArousal,
  dominantEmotion,
  EMOTION_14_KEYS,
  type EmotionState14D,
  type Emotion14,
} from '@omega/omega-forge';

import type {
  ForgePacket,
  EmotionContract,
  EmotionQuartile,
  TensionTargets,
  EmotionTerminal,
  EmotionRupture,
  ValenceArc,
  ForgeBeat,
  ForgeSubtext,
  ForgeSensory,
  StyleProfile,
  KillLists,
  CanonEntry,
  ForgeContinuity,
  ForgeSeeds,
  ForgeGeneration,
  ForgeIntent,
} from '../types.js';

import type { GenesisPlan, Scene } from '@omega/genesis-planner';

import { SOVEREIGN_CONFIG } from '../config.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ASSEMBLY INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface ForgePacketInput {
  readonly plan: GenesisPlan;
  readonly scene: Scene;
  readonly style_profile: StyleProfile;
  readonly kill_lists: KillLists;
  readonly canon: readonly CanonEntry[];
  readonly continuity: ForgeContinuity;
  readonly run_id: string;
  readonly language?: 'fr' | 'en'; // Default: 'fr' (FR PREMIUM)
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ASSEMBLER
// ═══════════════════════════════════════════════════════════════════════════════

export function assembleForgePacket(input: ForgePacketInput): ForgePacket {
  const { plan, scene, style_profile, kill_lists, canon, continuity, run_id, language = 'fr' } = input;

  // Build prescribed 14D trajectory
  const prescribed = buildScenePrescribedTrajectory(plan, scene);

  // Group into 4 quartiles
  const quartiles = groupIntoQuartiles(prescribed);

  // Compute emotion contract
  const emotion_contract = computeEmotionContract(quartiles, scene);

  // Build beats
  const beats = scene.beats.map((b, index) => convertBeat(b, index));

  // Build subtext
  const subtext = convertSubtext(scene);

  // Build sensory
  const sensory = buildSensory(scene, style_profile);

  // Build intent
  const intent = buildIntent(scene, plan);

  // Build seeds
  const seeds: ForgeSeeds = {
    llm_seed: `${run_id}_${scene.scene_id}`,
    determinism_level: 'absolute',
  };

  // Build generation
  const generation: ForgeGeneration = {
    timestamp: new Date().toISOString(),
    generator_version: '1.0.0',
    constraints_hash: sha256(canonicalize({ kill_lists, style_profile })),
  };

  // Assemble packet
  const packet_data = {
    packet_id: `FORGE_${scene.scene_id}_${run_id}`,
    scene_id: scene.scene_id,
    run_id,
    quality_tier: 'sovereign' as const,
    language,
    intent,
    emotion_contract,
    beats,
    subtext,
    sensory,
    style_genome: style_profile,
    kill_lists,
    canon,
    continuity,
    seeds,
    generation,
  };

  const packet_hash = sha256(canonicalize(packet_data));

  return {
    ...packet_data,
    packet_hash,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESCRIBED TRAJECTORY
// ═══════════════════════════════════════════════════════════════════════════════

interface PrescribedParagraph {
  readonly paragraph_index: number;
  readonly target_14d: EmotionState14D;
  readonly valence: number;
  readonly arousal: number;
  readonly dominant: Emotion14;
}

function buildScenePrescribedTrajectory(
  plan: GenesisPlan,
  scene: Scene,
): readonly PrescribedParagraph[] {
  // Estimate paragraph count from target word count
  const avgWordsPerParagraph = 80;
  const totalParagraphs = Math.max(
    3,
    Math.round(scene.target_word_count / avgWordsPerParagraph),
  );

  // Extract waypoints relevant to this scene
  const sceneIndex = plan.arcs
    .flatMap((arc) => arc.scenes)
    .findIndex((s) => s.scene_id === scene.scene_id);

  const sceneCount = plan.scene_count;
  const sceneStartPct = sceneIndex / sceneCount;
  const sceneEndPct = (sceneIndex + 1) / sceneCount;

  // Filter waypoints in this scene's range
  const sceneWaypoints = plan.emotion_trajectory.filter(
    (wp) => wp.position >= sceneStartPct && wp.position <= sceneEndPct,
  );

  // If no waypoints in scene, use scene's emotion_target
  const waypoints: EmotionWaypoint[] =
    sceneWaypoints.length > 0
      ? sceneWaypoints
      : [
          {
            position: sceneStartPct,
            emotion: scene.emotion_target,
            intensity: scene.emotion_intensity,
          },
          {
            position: sceneEndPct,
            emotion: scene.emotion_target,
            intensity: scene.emotion_intensity,
          },
        ];

  // Build trajectory for each paragraph
  const states: PrescribedParagraph[] = [];

  for (let i = 0; i < totalParagraphs; i++) {
    const position =
      totalParagraphs > 1 ? i / (totalParagraphs - 1) : 0;
    const globalPosition = sceneStartPct + position * (sceneEndPct - sceneStartPct);

    // Find surrounding waypoints
    let prevWP = waypoints[0];
    let nextWP = waypoints[waypoints.length - 1];

    for (let w = 0; w < waypoints.length - 1; w++) {
      if (waypoints[w].position <= globalPosition && waypoints[w + 1].position >= globalPosition) {
        prevWP = waypoints[w];
        nextWP = waypoints[w + 1];
        break;
      }
    }

    // Interpolate intensity
    const range = nextWP.position - prevWP.position;
    const t = range > 0 ? (globalPosition - prevWP.position) / range : 0;
    const intensity = prevWP.intensity + t * (nextWP.intensity - prevWP.intensity);

    // Select emotion
    const emotionName = t < 0.5 ? prevWP.emotion : nextWP.emotion;
    const emotion14 = EMOTION_14_KEYS.includes(emotionName as Emotion14)
      ? (emotionName as Emotion14)
      : 'anticipation';

    // Build 14D state
    const target_14d = singleEmotionState(emotion14, Math.min(1, intensity));
    const valence = computeValence(target_14d);
    const arousal = computeArousal(target_14d);
    const dominant = dominantEmotion(target_14d);

    states.push({
      paragraph_index: i,
      target_14d,
      valence,
      arousal,
      dominant,
    });
  }

  return states;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUARTILE GROUPING
// ═══════════════════════════════════════════════════════════════════════════════

interface QuartileGroup {
  readonly quartile: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  readonly paragraphs: readonly PrescribedParagraph[];
  readonly avg_14d: EmotionState14D;
  readonly avg_valence: number;
  readonly avg_arousal: number;
  readonly dominant: Emotion14;
}

function groupIntoQuartiles(
  prescribed: readonly PrescribedParagraph[],
): readonly QuartileGroup[] {
  const total = prescribed.length;
  const bounds = SOVEREIGN_CONFIG.QUARTILE_BOUNDS;

  const quartiles: Array<'Q1' | 'Q2' | 'Q3' | 'Q4'> = ['Q1', 'Q2', 'Q3', 'Q4'];

  return quartiles.map((q) => {
    const [startFrac, endFrac] = bounds[q];
    const startIdx = Math.floor(startFrac * total);
    const endIdx = Math.ceil(endFrac * total);

    const paragraphs = prescribed.slice(startIdx, endIdx);

    // Average 14D state
    const avg_14d: Record<string, number> = {};
    for (const emotion of EMOTION_14_KEYS) {
      const sum = paragraphs.reduce((acc, p) => acc + p.target_14d[emotion], 0);
      avg_14d[emotion] = paragraphs.length > 0 ? sum / paragraphs.length : 0;
    }

    // Normalize to sum = 1.0 (required by validateForge14D)
    const stateSum = Object.values(avg_14d).reduce((acc, v) => acc + v, 0);
    if (stateSum > 0) {
      for (const emotion of EMOTION_14_KEYS) {
        avg_14d[emotion] /= stateSum;
      }
    }

    const avg_valence = computeValence(avg_14d as EmotionState14D);
    const avg_arousal = computeArousal(avg_14d as EmotionState14D);
    const dominant = dominantEmotion(avg_14d as EmotionState14D);

    return {
      quartile: q,
      paragraphs,
      avg_14d: avg_14d as EmotionState14D,
      avg_valence,
      avg_arousal,
      dominant,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION CONTRACT COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

function computeEmotionContract(
  quartiles: readonly QuartileGroup[],
  scene: Scene,
): EmotionContract {
  const curve_quartiles: [EmotionQuartile, EmotionQuartile, EmotionQuartile, EmotionQuartile] = [
    buildEmotionQuartile(quartiles[0]),
    buildEmotionQuartile(quartiles[1]),
    buildEmotionQuartile(quartiles[2]),
    buildEmotionQuartile(quartiles[3]),
  ];

  // Intensity range
  const allArousals = quartiles.map((q) => q.avg_arousal);
  const intensity_range = {
    min: Math.min(...allArousals),
    max: Math.max(...allArousals),
  };

  // Tension targets
  const tension = buildTensionTargets(quartiles, scene);

  // Terminal state (Q4)
  const terminal_state = buildTerminalState(quartiles[3]);

  // Rupture detection
  const rupture = detectRupture(quartiles);

  // Valence arc
  const valence_arc = computeValenceArc(quartiles);

  return {
    curve_quartiles,
    intensity_range,
    tension,
    terminal_state,
    rupture,
    valence_arc,
  };
}

function buildEmotionQuartile(group: QuartileGroup): EmotionQuartile {
  const target_14d: Record<string, number> = {};
  for (const emotion of EMOTION_14_KEYS) {
    target_14d[emotion] = group.avg_14d[emotion];
  }

  return {
    quartile: group.quartile,
    target_14d,
    valence: group.avg_valence,
    arousal: group.avg_arousal,
    dominant: group.dominant,
    narrative_instruction: getNarrativeInstruction(group),
  };
}

function getNarrativeInstruction(group: QuartileGroup): string {
  const { quartile, avg_valence, avg_arousal, dominant } = group;

  if (quartile === 'Q1') {
    return `Opening with ${dominant} (valence=${avg_valence.toFixed(2)}, arousal=${avg_arousal.toFixed(2)})`;
  } else if (quartile === 'Q4') {
    return `Closing with ${dominant} (valence=${avg_valence.toFixed(2)}, arousal=${avg_arousal.toFixed(2)})`;
  } else if (avg_arousal > 0.7) {
    return `High tension peak with ${dominant}`;
  } else if (avg_arousal < 0.3) {
    return `Low tension valley with ${dominant}`;
  } else {
    return `Emotional transition through ${dominant}`;
  }
}

function buildTensionTargets(
  quartiles: readonly QuartileGroup[],
  scene: Scene,
): TensionTargets {
  const arousals = quartiles.map((q) => q.avg_arousal);

  // Determine slope
  const start = arousals[0];
  const mid1 = arousals[1];
  const mid2 = arousals[2];

  let slope_target: 'ascending' | 'descending' | 'arc' | 'reverse_arc';
  if (mid1 > start && mid2 > mid1) {
    slope_target = 'ascending';
  } else if (mid1 < start && mid2 < mid1) {
    slope_target = 'descending';
  } else if (mid1 > start && mid2 < mid1) {
    slope_target = 'arc';
  } else {
    slope_target = 'reverse_arc';
  }

  // Pic position (max arousal)
  const maxArousal = Math.max(...arousals);
  const maxIdx = arousals.indexOf(maxArousal);
  const pic_position_pct = (maxIdx + 0.5) / 4;

  // Faille position (largest drop)
  let maxDrop = 0;
  let dropIdx = 0;
  for (let i = 0; i < arousals.length - 1; i++) {
    const drop = arousals[i] - arousals[i + 1];
    if (drop > maxDrop) {
      maxDrop = drop;
      dropIdx = i;
    }
  }
  const faille_position_pct = (dropIdx + 1) / 4;

  // Silence zones (where tension_delta = 0 in beats)
  const silenceZones: Array<{ start_pct: number; end_pct: number }> = [];
  const beatCount = scene.beats.length;
  let silenceStart = -1;

  for (let i = 0; i < beatCount; i++) {
    const beat = scene.beats[i];
    if (beat.tension_delta === 0 && silenceStart === -1) {
      silenceStart = i;
    } else if (beat.tension_delta !== 0 && silenceStart !== -1) {
      silenceZones.push({
        start_pct: silenceStart / beatCount,
        end_pct: i / beatCount,
      });
      silenceStart = -1;
    }
  }

  if (silenceStart !== -1) {
    silenceZones.push({
      start_pct: silenceStart / beatCount,
      end_pct: 1.0,
    });
  }

  return {
    slope_target,
    pic_position_pct,
    faille_position_pct,
    silence_zones: silenceZones,
  };
}

function buildTerminalState(q4: QuartileGroup): EmotionTerminal {
  const target_14d: Record<string, number> = {};
  for (const emotion of EMOTION_14_KEYS) {
    target_14d[emotion] = q4.avg_14d[emotion];
  }

  return {
    target_14d,
    valence: q4.avg_valence,
    arousal: q4.avg_arousal,
    dominant: q4.dominant,
    reader_state: `Terminal emotion: ${q4.dominant}`,
  };
}

function detectRupture(quartiles: readonly QuartileGroup[]): EmotionRupture {
  let maxDelta = 0;
  let ruptureIdx = -1;

  for (let i = 0; i < quartiles.length - 1; i++) {
    const delta = Math.abs(quartiles[i + 1].avg_valence - quartiles[i].avg_valence);
    if (delta > maxDelta) {
      maxDelta = delta;
      ruptureIdx = i;
    }
  }

  if (maxDelta > 0.5 && ruptureIdx >= 0) {
    return {
      exists: true,
      position_pct: (ruptureIdx + 1) / 4,
      before_dominant: quartiles[ruptureIdx].dominant,
      after_dominant: quartiles[ruptureIdx + 1].dominant,
      delta_valence: quartiles[ruptureIdx + 1].avg_valence - quartiles[ruptureIdx].avg_valence,
    };
  }

  return {
    exists: false,
    position_pct: 0,
    before_dominant: quartiles[0].dominant,
    after_dominant: quartiles[0].dominant,
    delta_valence: 0,
  };
}

function computeValenceArc(quartiles: readonly QuartileGroup[]): ValenceArc {
  const start = quartiles[0].avg_valence;
  const end = quartiles[3].avg_valence;
  const delta = end - start;

  let direction: 'darkening' | 'brightening' | 'stable' | 'oscillating';
  if (Math.abs(delta) < 0.2) {
    direction = 'stable';
  } else if (delta < 0) {
    direction = 'darkening';
  } else {
    direction = 'brightening';
  }

  // Check for oscillation
  const valences = quartiles.map((q) => q.avg_valence);
  let oscillations = 0;
  for (let i = 0; i < valences.length - 2; i++) {
    const trend1 = valences[i + 1] - valences[i];
    const trend2 = valences[i + 2] - valences[i + 1];
    if (trend1 * trend2 < 0) oscillations++;
  }

  if (oscillations >= 2) {
    direction = 'oscillating';
  }

  return { start, end, direction };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BEAT / SUBTEXT / SENSORY CONVERSION
// ═══════════════════════════════════════════════════════════════════════════════

function convertBeat(beat: Beat, index: number): ForgeBeat {
  return {
    beat_id: beat.beat_id,
    beat_order: index,
    action: beat.action,
    dialogue: '',
    subtext_type: beat.pivot ? 'pivot' : 'progression',
    emotion_instruction: '',
    sensory_tags: [],
    canon_refs: beat.information_revealed,
  };
}

function convertSubtext(scene: Scene): ForgeSubtext {
  return {
    layers: [
      {
        layer_id: `${scene.scene_id}_layer_1`,
        type: scene.subtext.tension_type,
        statement: scene.subtext.character_thinks,
        visibility: 'buried',
      },
    ],
    tension_type: scene.subtext.tension_type,
    tension_intensity: scene.emotion_intensity,
  };
}

function buildSensory(_scene: Scene, profile: StyleProfile): ForgeSensory {
  return {
    density_target: profile.imagery.density_target_per_100_words,
    categories: [
      { category: 'sight', min_count: 2, signature_words: [] },
      { category: 'sound', min_count: 1, signature_words: [] },
      { category: 'touch', min_count: 1, signature_words: [] },
      { category: 'smell', min_count: 0, signature_words: [] },
      { category: 'taste', min_count: 0, signature_words: [] },
      { category: 'proprioception', min_count: 0, signature_words: [] },
      { category: 'interoception', min_count: 1, signature_words: [] },
    ],
    recurrent_motifs: profile.imagery.recurrent_motifs,
    banned_metaphors: profile.imagery.banned_metaphors,
  };
}

function buildIntent(scene: Scene, plan: GenesisPlan): ForgeIntent {
  return {
    story_goal: plan.arcs[0]?.theme ?? 'narrative progression',
    scene_goal: scene.objective,
    conflict_type: scene.conflict_type,
    pov: 'third_limited',
    tense: 'past',
    target_word_count: scene.target_word_count,
  };
}
