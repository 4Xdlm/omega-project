/**
 * smoke-p1-gating-propagation-v2.ts
 * ----------------------------------------------------------------------------
 * Extension du smoke v1 aux 4 archétypes R-D.1 (ACTION, INTERIOR, SENSORY,
 * CATHEDRAL) pour vérifier :
 *
 *   1. INTERIOR : détection archetype == INTERIOR ∧ gating appliqué sur
 *      chunks silence/introspective (pacing_directive == baseline).
 *
 *   2. ACTION / SENSORY / CATHEDRAL : archetype détecté correctement
 *      (PAS INTERIOR) ∧ gating NON déclenché même sur chunks silence/
 *      introspective (directives adaptive préservées).
 *
 * Vigilance critique (ChatGPT 2026-04-18) :
 *   - CATHEDRAL × silence_zones [0.3-0.45, 0.8-1.0] est le cas le plus
 *     discriminant : le contrat a silence_zones similaires à INTERIOR
 *     mais une direction 'brightening' et valences finales positives.
 *     Si detectArchetype classe CATHEDRAL comme INTERIOR, le gating
 *     fuiterait et corromprait la signature CATHEDRAL (μ=0.503).
 *
 * CALC pur — zéro LLM, zéro Ollama, déterministe.
 *
 * Usage :
 *   npx tsx packages/sovereign-engine/scripts/smoke-p1-gating-propagation-v2.ts
 */

import {
  planAdaptiveChunkingV2B2,
  detectArchetype,
  pickPacingDirective,
  type AdaptiveChunkConfig,
  type ChunkPlan,
} from '../src/generation/adaptive-chunker.js';
import type { EmotionContract } from '../src/types.js';

type ArchetypeLabel = 'ACTION' | 'INTERIOR' | 'SENSORY' | 'CATHEDRAL';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers — verbatim from bench-r-d-1-extended.ts
// ──────────────────────────────────────────────────────────────────────────────

function makeQuartile(q: 'Q1' | 'Q2' | 'Q3' | 'Q4', arousal: number, valence: number) {
  return {
    quartile: q,
    target_14d: {} as Record<string, number>,
    valence,
    arousal,
    dominant: 'neutral' as const,
    narrative_instruction: '',
  };
}

function makeContract(
  arousals: readonly [number, number, number, number],
  valences: readonly [number, number, number, number],
  pic: number,
  faille: number,
  silence_zones: readonly { readonly start_pct: number; readonly end_pct: number }[],
  direction: 'darkening' | 'brightening' | 'stable' | 'oscillating',
): EmotionContract {
  return {
    curve_quartiles: [
      makeQuartile('Q1', arousals[0], valences[0]),
      makeQuartile('Q2', arousals[1], valences[1]),
      makeQuartile('Q3', arousals[2], valences[2]),
      makeQuartile('Q4', arousals[3], valences[3]),
    ],
    intensity_range: { min: Math.min(...arousals), max: Math.max(...arousals) },
    tension: {
      slope_target:
        arousals[3] > arousals[0] ? 'ascending' : arousals[3] < arousals[0] ? 'descending' : 'arc',
      pic_position_pct: pic,
      faille_position_pct: faille,
      silence_zones,
    },
    terminal_state: {
      target_14d: {} as Record<string, number>,
      valence: valences[3],
      arousal: arousals[3],
      dominant: 'neutral' as const,
      reader_state: '',
    },
    rupture: {
      exists: true,
      position_pct: pic,
      before_dominant: 'neutral' as const,
      after_dominant: 'neutral' as const,
      delta_valence: valences[3] - valences[0],
    },
    valence_arc: { start: valences[0], end: valences[3], direction },
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// 4 SCENES verbatim R-D.1
// ──────────────────────────────────────────────────────────────────────────────

interface SmokeScene {
  readonly id: string;
  readonly expected_archetype: ArchetypeLabel;
  readonly contract: EmotionContract;
}

const SCENES: readonly SmokeScene[] = [
  {
    id: 'fr_action_poursuite',
    expected_archetype: 'ACTION',
    contract: makeContract(
      [0.6, 0.85, 0.9, 0.5],
      [-0.2, -0.5, -0.4, 0.1],
      0.65,
      0.3,
      [{ start_pct: 0.85, end_pct: 1.0 }],
      'oscillating',
    ),
  },
  {
    id: 'fr_interior_maison_enfance',
    expected_archetype: 'INTERIOR',
    contract: makeContract(
      [0.3, 0.4, 0.5, 0.2],
      [-0.1, -0.3, -0.5, -0.4],
      0.5,
      0.85,
      [
        { start_pct: 0.0, end_pct: 0.2 },
        { start_pct: 0.7, end_pct: 1.0 },
      ],
      'darkening',
    ),
  },
  {
    id: 'fr_sensory_cuisine_nuit',
    expected_archetype: 'SENSORY',
    contract: makeContract(
      [0.4, 0.3, 0.55, 0.35],
      [-0.3, -0.2, 0.2, 0.4],
      0.6,
      0.2,
      [{ start_pct: 0.15, end_pct: 0.3 }],
      'brightening',
    ),
  },
  {
    id: 'fr_cathedral_gardien_nuit',
    expected_archetype: 'CATHEDRAL',
    contract: makeContract(
      [0.25, 0.35, 0.5, 0.3],
      [-0.2, -0.1, 0.3, 0.5],
      0.55,
      0.1,
      [
        { start_pct: 0.3, end_pct: 0.45 },
        { start_pct: 0.8, end_pct: 1.0 },
      ],
      'brightening',
    ),
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Config production-like (litteraire, defaults V1 sealed)
// ──────────────────────────────────────────────────────────────────────────────

const CONFIG: AdaptiveChunkConfig = {
  alpha: 0.5,
  beta: 0.2,
  gamma: 0.2,
  delta: 0.2,
  l_ref: 750,
  l_min: 300,
  l_max: 1200,
  w_ref: 3000,
  w_min: 2500,
  w_max: 4500,
  pivot_enabled: true,
  register: 'litteraire',
  arousal_action_threshold: 0.8,
  arousal_introspective_threshold: 0.3,
  silence_threshold: 0.5,
  pivot_word_target: 400,
};

// ──────────────────────────────────────────────────────────────────────────────
// Per-scene analysis
// ──────────────────────────────────────────────────────────────────────────────

interface SceneVerdict {
  readonly scene_id: string;
  readonly expected_archetype: ArchetypeLabel;
  readonly detected_archetype: ArchetypeLabel;
  readonly archetype_match: boolean;
  readonly total_chunks: number;
  readonly silence_chunks: number;
  readonly introspective_chunks: number;
  readonly gatable_chunks: number;
  readonly gated_to_baseline: number;
  readonly gating_rate: number | null;
  readonly is_interior: boolean;
  readonly gating_correctly_applied: boolean; // INTERIOR: all gated / non-INTERIOR: none gated
  readonly leak_observed: boolean; // TRUE si non-INTERIOR mais gated-to-baseline détecté
  readonly verdict: 'PASS' | 'FAIL';
  readonly failure_reason: string | null;
}

function analyzeScene(scene: SmokeScene): SceneVerdict {
  const baselineDirective = pickPacingDirective(CONFIG.register, 'baseline', 'adaptive');

  const detected = detectArchetype(scene.contract) as ArchetypeLabel;
  const archetypeMatch = detected === scene.expected_archetype;

  const plan = planAdaptiveChunkingV2B2(scene.contract, CONFIG);
  const silenceChunks = plan.filter((c) => c.pacing_state === 'silence');
  const introspectiveChunks = plan.filter((c) => c.pacing_state === 'introspective');
  const gatableChunks = [...silenceChunks, ...introspectiveChunks];
  const gatedToBaseline = gatableChunks.filter(
    (c) => c.pacing_directive === baselineDirective,
  );

  const isInterior = detected === 'INTERIOR';

  let gatingCorrectlyApplied: boolean;
  let leakObserved: boolean;
  let failureReason: string | null = null;

  if (isInterior) {
    // INTERIOR : TOUS les chunks silence/introspective doivent être gated → baseline
    gatingCorrectlyApplied =
      gatableChunks.length === 0 || gatedToBaseline.length === gatableChunks.length;
    leakObserved = false; // N/A pour INTERIOR
    if (!gatingCorrectlyApplied) {
      failureReason = `INTERIOR : gating partiel (${gatedToBaseline.length}/${gatableChunks.length} gated)`;
    }
  } else {
    // ACTION / SENSORY / CATHEDRAL : AUCUN chunk silence/introspective ne doit être gated
    gatingCorrectlyApplied = gatedToBaseline.length === 0;
    leakObserved = gatedToBaseline.length > 0;
    if (leakObserved) {
      failureReason = `${detected} : FUITE gating (${gatedToBaseline.length} chunk(s) silence/intro redirigés vers baseline — signature archétype corrompue)`;
    }
  }

  if (!archetypeMatch) {
    failureReason = failureReason
      ? `archetype mismatch (expected ${scene.expected_archetype}, got ${detected}) + ${failureReason}`
      : `archetype mismatch (expected ${scene.expected_archetype}, got ${detected})`;
  }

  const verdict: 'PASS' | 'FAIL' = archetypeMatch && gatingCorrectlyApplied ? 'PASS' : 'FAIL';

  return {
    scene_id: scene.id,
    expected_archetype: scene.expected_archetype,
    detected_archetype: detected,
    archetype_match: archetypeMatch,
    total_chunks: plan.length,
    silence_chunks: silenceChunks.length,
    introspective_chunks: introspectiveChunks.length,
    gatable_chunks: gatableChunks.length,
    gated_to_baseline: gatedToBaseline.length,
    gating_rate: gatableChunks.length === 0 ? null : gatedToBaseline.length / gatableChunks.length,
    is_interior: isInterior,
    gating_correctly_applied: gatingCorrectlyApplied,
    leak_observed: leakObserved,
    verdict,
    failure_reason: failureReason,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Output
// ──────────────────────────────────────────────────────────────────────────────

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

function main(): void {
  const runId = `smoke-p1-v2-${Date.now()}`;
  const startedAt = new Date().toISOString();

  console.log('═'.repeat(78));
  console.log(`SMOKE TEST P1-v2 — gating propagation multi-archétypes`);
  console.log(`(post-commit 7e89f95f — vigilance ChatGPT : no leak non-INTERIOR)`);
  console.log('═'.repeat(78));
  console.log(`Run ID         : ${runId}`);
  console.log(`Started at     : ${startedAt}`);
  console.log(`Variant        : v2b2 (production)`);
  console.log(`Register       : ${CONFIG.register}`);
  console.log(`Scenes         : ${SCENES.length} (ACTION, INTERIOR, SENSORY, CATHEDRAL)`);
  console.log('');

  const verdicts: SceneVerdict[] = [];
  for (const scene of SCENES) {
    verdicts.push(analyzeScene(scene));
  }

  // ── Matrice résultat ──
  console.log('── Matrice résultat ──');
  console.log(
    `  ${pad('scene', 32)}  ${pad('expect', 10)}  ${pad('detected', 10)}  ${pad('match', 5)}  ${pad('chunks', 6)}  ${pad('silen', 5)}  ${pad('intro', 5)}  ${pad('gated', 5)}  verdict`,
  );
  console.log(`  ${'-'.repeat(115)}`);
  for (const v of verdicts) {
    const matchFlag = v.archetype_match ? '✓' : '✗';
    const verdictFlag = v.verdict === 'PASS' ? '✅ PASS' : '❌ FAIL';
    console.log(
      `  ${pad(v.scene_id, 32)}  ${pad(v.expected_archetype, 10)}  ${pad(v.detected_archetype, 10)}  ${pad(matchFlag, 5)}  ${pad(String(v.total_chunks), 6)}  ${pad(String(v.silence_chunks), 5)}  ${pad(String(v.introspective_chunks), 5)}  ${pad(String(v.gated_to_baseline), 5)}  ${verdictFlag}`,
    );
    if (v.failure_reason) {
      console.log(`    ↳ FAILURE: ${v.failure_reason}`);
    }
  }
  console.log('');

  // ── Interprétation gating ──
  console.log('── Interprétation gating ──');
  for (const v of verdicts) {
    if (v.is_interior) {
      const gateDesc =
        v.gatable_chunks === 0
          ? 'aucun chunk gatable (normal si contrat sans silence/intro)'
          : `${v.gated_to_baseline}/${v.gatable_chunks} gated à baseline (attendu: tous)`;
      console.log(`  ${pad(v.scene_id, 32)} [INTERIOR]  → ${gateDesc}`);
    } else {
      const leakDesc =
        v.gated_to_baseline === 0
          ? 'zéro leak (directives adaptive préservées) ✓'
          : `${v.gated_to_baseline} leak détecté (signature corrompue) ✗`;
      console.log(
        `  ${pad(v.scene_id, 32)} [${pad(v.detected_archetype, 8)}]  → ${leakDesc}`,
      );
    }
  }
  console.log('');

  // ── Verdict global ──
  const allPass = verdicts.every((v) => v.verdict === 'PASS');
  const failures = verdicts.filter((v) => v.verdict === 'FAIL');

  console.log('── Verdict global ──');
  console.log(`  Scenes testés        : ${verdicts.length}`);
  console.log(`  PASS                 : ${verdicts.length - failures.length}`);
  console.log(`  FAIL                 : ${failures.length}`);
  console.log(
    `  Archetype mismatches : ${verdicts.filter((v) => !v.archetype_match).length}`,
  );
  console.log(`  Leaks détectés       : ${verdicts.filter((v) => v.leak_observed).length}`);
  console.log('');
  console.log(
    `  OVERALL              : ${
      allPass
        ? '✅ PASS — gating propagation multi-archétypes conforme'
        : '❌ FAIL — autopsie requise (voir failures ci-dessus)'
    }`,
  );
  console.log('═'.repeat(78));

  // ── JSON output ──
  const jsonOutput = {
    run_id: runId,
    started_at: startedAt,
    commit_ref: '7e89f95f',
    variant: 'v2b2',
    config_register: CONFIG.register,
    scenes_tested: SCENES.length,
    scenes: verdicts,
    summary: {
      total: verdicts.length,
      pass: verdicts.length - failures.length,
      fail: failures.length,
      archetype_mismatches: verdicts.filter((v) => !v.archetype_match).length,
      leaks_detected: verdicts.filter((v) => v.leak_observed).length,
      overall_pass: allPass,
    },
  };
  console.log('');
  console.log('── JSON ──');
  console.log(JSON.stringify(jsonOutput, null, 2));

  process.exit(allPass ? 0 : 1);
}

main();
