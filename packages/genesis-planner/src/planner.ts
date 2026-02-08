/**
 * OMEGA Genesis Planner — Main Orchestrator
 * Phase C.1 — 5 inputs → GenesisPlan → Evidence → Report
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type {
  Intent, Canon, Constraints, StyleGenomeInput, EmotionTarget,
  GConfig, GenesisPlan, Arc, Scene,
} from './types.js';
import type { GenesisReport } from './types.js';
import { validateIntent } from './validators/intent-validator.js';
import { validateCanon } from './validators/canon-validator.js';
import { validateConstraints } from './validators/constraints-validator.js';
import { validateGenome } from './validators/genome-validator.js';
import { validateEmotionTarget } from './validators/emotion-validator.js';
import { validatePlan } from './validators/plan-validator.js';
import { generateArcs } from './generators/arc-generator.js';
import { generateScenes } from './generators/scene-generator.js';
import { generateBeats } from './generators/beat-generator.js';
import { autoGenerateSeeds } from './generators/seed-bloom-tracker.js';
import { buildTensionCurve } from './generators/tension-builder.js';
import { mapEmotions } from './generators/emotion-mapper.js';
import { modelSubtext } from './generators/subtext-modeler.js';
import { createEvidenceChainBuilder } from './evidence.js';
import { generateReport } from './report.js';

function mergeValidationErrors(
  ...results: { verdict: string; errors: readonly { invariant: string; path: string; message: string; severity: string }[] }[]
): readonly { invariant: string; path: string; message: string; severity: string }[] {
  const all: { invariant: string; path: string; message: string; severity: string }[] = [];
  for (const r of results) {
    for (const e of r.errors) {
      all.push(e);
    }
  }
  return all;
}

export function createGenesisPlan(
  intent: Intent,
  canon: Canon,
  constraints: Constraints,
  genome: StyleGenomeInput,
  emotionTarget: EmotionTarget,
  config: GConfig,
  timestamp: string,
): { plan: GenesisPlan; report: GenesisReport } {
  const evidence = createEvidenceChainBuilder('', timestamp);
  const planIdSeed = sha256(canonicalize({ intent, canon, constraints, genome, emotionTarget }));
  const planId = `GPLAN-${planIdSeed.slice(0, 16)}`;

  // Step 1: VALIDATE 5 inputs (G-INV-01)
  const intentResult = validateIntent(intent, timestamp);
  const canonResult = validateCanon(canon, timestamp);
  const constraintsResult = validateConstraints(constraints, timestamp);
  const genomeResult = validateGenome(genome, timestamp);
  const emotionResult = validateEmotionTarget(emotionTarget, timestamp);

  const inputHash = sha256(canonicalize({ intent, canon, constraints, genome, emotionTarget }));
  const validationErrors = mergeValidationErrors(
    intentResult, canonResult, constraintsResult, genomeResult, emotionResult,
  );

  const anyFailed = [intentResult, canonResult, constraintsResult, genomeResult, emotionResult]
    .some((r) => r.verdict === 'FAIL');

  evidence.addStep(
    'validate-inputs', inputHash, sha256(canonicalize(validationErrors)),
    'G-INV-01: all inputs must be valid', anyFailed ? 'FAIL' : 'PASS',
  );

  if (anyFailed) {
    const failPlan: GenesisPlan = {
      plan_id: planId,
      plan_hash: '',
      version: '1.0.0',
      intent_hash: sha256(canonicalize(intent)),
      canon_hash: sha256(canonicalize(canon)),
      constraints_hash: sha256(canonicalize(constraints)),
      genome_hash: sha256(canonicalize(genome)),
      emotion_hash: sha256(canonicalize(emotionTarget)),
      arcs: [],
      seed_registry: [],
      tension_curve: [],
      emotion_trajectory: [],
      scene_count: 0,
      beat_count: 0,
      estimated_word_count: 0,
    };
    const failValidation = validatePlan(failPlan, config, timestamp);
    const failEvidence = evidence.build();
    const failReport = generateReport(failPlan, failValidation, failEvidence, config, timestamp);
    return { plan: failPlan, report: failReport };
  }

  // Step 2: HASH 5 inputs
  const intentHash = sha256(canonicalize(intent));
  const canonHash = sha256(canonicalize(canon));
  const constraintsHash = sha256(canonicalize(constraints));
  const genomeHash = sha256(canonicalize(genome));
  const emotionHash = sha256(canonicalize(emotionTarget));

  evidence.addStep(
    'hash-inputs', inputHash, sha256(canonicalize({ intentHash, canonHash, constraintsHash, genomeHash, emotionHash })),
    'SHA-256 hash of all 5 inputs', 'PASS',
  );

  // Step 3: GENERATE arcs
  const rawArcs = generateArcs(intent, canon, constraints);
  const arcsHash = sha256(canonicalize(rawArcs));
  evidence.addStep('generate-arcs', intentHash, arcsHash, 'Arc generation from intent', 'PASS');

  // Step 4: GENERATE scenes per arc
  let arcsWithScenes: Arc[] = [];
  for (let i = 0; i < rawArcs.length; i++) {
    const scenes = generateScenes(rawArcs[i], i, rawArcs.length, canon, constraints, emotionTarget);
    arcsWithScenes.push({ ...rawArcs[i], scenes });
  }
  const scenesHash = sha256(canonicalize(arcsWithScenes));
  evidence.addStep('generate-scenes', arcsHash, scenesHash, 'Scene generation per arc', 'PASS');

  // Step 5: GENERATE beats per scene
  const arcsWithBeats: Arc[] = [];
  for (const arc of arcsWithScenes) {
    const scenesWithBeats: Scene[] = [];
    for (let si = 0; si < arc.scenes.length; si++) {
      const beats = generateBeats(arc.scenes[si], si, config);
      scenesWithBeats.push({ ...arc.scenes[si], beats });
    }
    arcsWithBeats.push({ ...arc, scenes: scenesWithBeats });
  }
  arcsWithScenes = arcsWithBeats;
  const beatsHash = sha256(canonicalize(arcsWithScenes));
  evidence.addStep('generate-beats', scenesHash, beatsHash, 'Beat generation per scene', 'PASS');

  // Step 6: GENERATE seeds
  const seeds = autoGenerateSeeds(arcsWithScenes, intent, config);
  const seedsHash = sha256(canonicalize(seeds));
  evidence.addStep('generate-seeds', beatsHash, seedsHash, 'G-INV-03: seed generation', 'PASS');

  // Assign seeds to scenes
  const allScenesFlatForSeeds: Scene[] = [];
  for (const arc of arcsWithScenes) {
    for (const scene of arc.scenes) {
      allScenesFlatForSeeds.push(scene);
    }
  }

  const seedPlantMap = new Map<string, string[]>();
  const seedBloomMap = new Map<string, string[]>();
  for (const seed of seeds) {
    const planted = seedPlantMap.get(seed.planted_in) ?? [];
    planted.push(seed.id);
    seedPlantMap.set(seed.planted_in, planted);
    const bloomed = seedBloomMap.get(seed.blooms_in) ?? [];
    bloomed.push(seed.id);
    seedBloomMap.set(seed.blooms_in, bloomed);
  }

  const arcsWithSeeds: Arc[] = arcsWithScenes.map((arc) => ({
    ...arc,
    scenes: arc.scenes.map((scene) => ({
      ...scene,
      seeds_planted: seedPlantMap.get(scene.scene_id) ?? [],
      seeds_bloomed: seedBloomMap.get(scene.scene_id) ?? [],
    })),
  }));

  // Step 7: MODEL subtext
  const arcsWithSubtext: Arc[] = arcsWithSeeds.map((arc) => ({
    ...arc,
    scenes: modelSubtext(arc.scenes, canon),
  }));
  const subtextHash = sha256(canonicalize(arcsWithSubtext));
  evidence.addStep('model-subtext', seedsHash, subtextHash, 'G-INV-09: subtext modeling', 'PASS');

  // Step 8: BUILD tension curve
  const allScenesFlat: Scene[] = [];
  for (const arc of arcsWithSubtext) {
    for (const scene of arc.scenes) {
      allScenesFlat.push(scene);
    }
  }
  const tensionCurve = buildTensionCurve(allScenesFlat);
  const tensionHash = sha256(canonicalize(tensionCurve));
  evidence.addStep('build-tension', subtextHash, tensionHash, 'G-INV-04: tension curve', 'PASS');

  // Step 9: MAP emotions
  const emotionTrajectory = mapEmotions(allScenesFlat, emotionTarget);
  const emotionTrajHash = sha256(canonicalize(emotionTrajectory));
  evidence.addStep('map-emotions', tensionHash, emotionTrajHash, 'G-INV-06: emotion mapping', 'PASS');

  // Step 10: ASSEMBLE GenesisPlan
  let totalBeats = 0;
  let totalWordCount = 0;
  for (const scene of allScenesFlat) {
    totalBeats += scene.beats.length;
    totalWordCount += scene.target_word_count;
  }

  const planWithoutHash: Omit<GenesisPlan, 'plan_hash'> = {
    plan_id: planId,
    version: '1.0.0',
    intent_hash: intentHash,
    canon_hash: canonHash,
    constraints_hash: constraintsHash,
    genome_hash: genomeHash,
    emotion_hash: emotionHash,
    arcs: arcsWithSubtext,
    seed_registry: seeds,
    tension_curve: tensionCurve,
    emotion_trajectory: emotionTrajectory,
    scene_count: allScenesFlat.length,
    beat_count: totalBeats,
    estimated_word_count: totalWordCount,
  };

  // Step 11: VALIDATE plan
  const tempPlan: GenesisPlan = { ...planWithoutHash, plan_hash: '' };
  const validation = validatePlan(tempPlan, config, timestamp);
  const validationHash = sha256(canonicalize(validation));
  evidence.addStep('validate-plan', sha256(canonicalize(planWithoutHash)), validationHash,
    'G-INV-01..10: full plan validation', validation.verdict);

  // Step 12: COMPUTE plan_hash
  const planHash = sha256(canonicalize(planWithoutHash));
  const plan: GenesisPlan = { ...planWithoutHash, plan_hash: planHash };

  evidence.addStep('compute-hash', validationHash, planHash, 'Plan hash computation', 'PASS');

  // Step 13: BUILD evidence chain
  const evidenceChain = evidence.build();
  evidence.addStep('build-evidence', planHash, evidenceChain.chain_hash, 'G-INV-10: evidence chain', 'PASS');
  const finalEvidence = evidence.build();

  // Step 14: GENERATE report
  const report = generateReport(plan, validation, finalEvidence, config, timestamp);

  return { plan, report };
}
