/**
 * OMEGA Scribe Engine — ProsePack Normalizer
 * Phase P.2-B — Transforms raw ProseDoc into canonical ProsePack v1
 * Detects POV, tense, banned words, clichés, sensory anchors, dialogue
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type { ProseDoc, ProseParagraph, GenesisPlan, Scene } from '../types.js';
import type {
  ProsePack, ProsePackMeta, ProsePackScene, ProsePackScore,
  ProseConstraintConfig, ProseViolation,
} from './types.js';

// ─── POV Detection ───────────────────────────────────────────────

const FIRST_PERSON_MARKERS = [
  /\bje\b/i, /\bj'/i, /\bme\b/i, /\bm'/i, /\bmon\b/i, /\bma\b/i, /\bmes\b/i, /\bmoi\b/i,
  /\bI\b/, /\bmy\b/i, /\bme\b/i, /\bmyself\b/i, /\bmine\b/i,
];

const THIRD_PERSON_MARKERS = [
  /\bil\b/i, /\belle\b/i, /\bson\b/i, /\bsa\b/i, /\bses\b/i, /\blui\b/i,
  /\bhe\b/i, /\bshe\b/i, /\bhis\b/i, /\bher\b/i, /\bhimself\b/i, /\bherself\b/i,
];

export function detectPOV(text: string): 'first' | 'third-limited' | 'unknown' {
  const firstCount = FIRST_PERSON_MARKERS.reduce((n, re) => n + (text.match(new RegExp(re, 'g'))?.length ?? 0), 0);
  const thirdCount = THIRD_PERSON_MARKERS.reduce((n, re) => n + (text.match(new RegExp(re, 'g'))?.length ?? 0), 0);

  if (firstCount === 0 && thirdCount === 0) return 'unknown';
  if (firstCount > thirdCount * 2) return 'first';
  if (thirdCount > firstCount * 2) return 'third-limited';
  return 'unknown';
}

// ─── Tense Detection ─────────────────────────────────────────────

const PAST_MARKERS_FR = [/\bétait\b/, /\bétaient\b/, /\bavait\b/, /\bavaient\b/, /\bfut\b/, /\beurent\b/, /\balla\b/, /\bvinrent\b/, /\bprit\b/, /\bdit\b/];
const PRESENT_MARKERS_FR = [/\best\b/, /\bsont\b/, /\bfait\b/, /\bva\b/, /\bvient\b/, /\bje\b/, /\bsuis\b/, /\bporte\b/, /\bpeux\b/, /\bvois\b/, /\bsens\b/, /\bme\b.*\be\b/];
const PAST_MARKERS_EN = [/\bwas\b/i, /\bwere\b/i, /\bhad\b/i, /ed\b/];
const PRESENT_MARKERS_EN = [/\bis\b/i, /\bare\b/i, /\bhas\b/i, /\bdoes\b/i];

export function detectTense(text: string): 'past' | 'present' | 'unknown' {
  const pastFR = PAST_MARKERS_FR.reduce((n, re) => n + (text.match(new RegExp(re, 'g'))?.length ?? 0), 0);
  const presentFR = PRESENT_MARKERS_FR.reduce((n, re) => n + (text.match(new RegExp(re, 'g'))?.length ?? 0), 0);
  const pastEN = PAST_MARKERS_EN.reduce((n, re) => n + (text.match(new RegExp(re, 'g'))?.length ?? 0), 0);
  const presentEN = PRESENT_MARKERS_EN.reduce((n, re) => n + (text.match(new RegExp(re, 'g'))?.length ?? 0), 0);

  const past = pastFR + pastEN;
  const present = presentFR + presentEN;

  if (past === 0 && present === 0) return 'unknown';
  if (past > present * 1.5) return 'past';
  if (present > past * 1.5) return 'present';
  return 'unknown';
}

// ─── Banned Words / Clichés ──────────────────────────────────────

export function findBannedWords(text: string, banned: readonly string[]): string[] {
  const lower = text.toLowerCase();
  return banned.filter(w => lower.includes(w.toLowerCase()));
}

export function findCliches(text: string, cliches: readonly string[]): string[] {
  const lower = text.toLowerCase();
  return cliches.filter(c => lower.includes(c.toLowerCase()));
}

// ─── Sensory Anchors ─────────────────────────────────────────────

const SENSORY_PATTERNS = [
  // Smell
  /\bodeur\b/i, /\bparfum\b/i, /\bpuanteur\b/i, /\bsentait\b/i, /\bsmell\b/i, /\bscent\b/i, /\bstench\b/i, /\baroma\b/i,
  // Touch
  /\btoucher\b/i, /\brugue/i, /\blisse\b/i, /\bfroid\b/i, /\bchaud\b/i, /\btiède\b/i, /\btexture\b/i,
  /\btouch\b/i, /\brough\b/i, /\bsmooth\b/i, /\bcold\b/i, /\bwarm\b/i, /\btepid\b/i,
  // Sound
  /\bbruit\b/i, /\bsilence\b/i, /\bécho\b/i, /\bmurmure\b/i, /\bgrince/i, /\bcraque/i,
  /\bsound\b/i, /\bnoise\b/i, /\becho\b/i, /\bwhisper\b/i, /\bcreak\b/i, /\bgrind\b/i,
  // Taste
  /\bgoût\b/i, /\bsaveur\b/i, /\bamer\b/i, /\bsalé\b/i, /\bsucré\b/i,
  /\btaste\b/i, /\bflavor\b/i, /\bbitter\b/i, /\bsalty\b/i, /\bsweet\b/i,
  // Sight (specific, not generic)
  /\bombre\b/i, /\breflet\b/i, /\blueur\b/i, /\bscintill/i, /\bébloui/i,
  /\bshadow\b/i, /\breflection\b/i, /\bglimmer\b/i, /\bglint\b/i, /\bblind\b/i,
];

export function countSensoryAnchors(text: string): number {
  let count = 0;
  for (const pattern of SENSORY_PATTERNS) {
    const matches = text.match(new RegExp(pattern, 'g'));
    if (matches) count += matches.length;
  }
  return count;
}

// ─── Dialogue Ratio ──────────────────────────────────────────────

export function computeDialogueRatio(text: string): number {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 0;

  // Detect dialogue: text between « » or " " or quoted
  const dialogueMatches = text.match(/[«""][^»""]*[»""]/g) ?? [];
  const dialogueWords = dialogueMatches.join(' ').split(/\s+/).filter(w => w.length > 0);

  return dialogueWords.length / words.length;
}

// ─── Scene Builder ───────────────────────────────────────────────

// ─── Scene Prose Analyzer (shared by normalize + repair) ─────────

export interface SceneProseAnalysis {
  readonly word_count: number;
  readonly sentence_count: number;
  readonly pov_detected: 'first' | 'third-limited' | 'unknown';
  readonly tense_detected: 'past' | 'present' | 'unknown';
  readonly sensory_anchor_count: number;
  readonly dialogue_ratio: number;
  readonly banned_word_hits: readonly string[];
  readonly cliche_hits: readonly string[];
  readonly violations: readonly ProseViolation[];
}

/**
 * Analyze scene prose text and produce features + violations.
 * Single source of truth — used by both normalize and repair.
 * INV-REPAIR-OBS-01: No silent wipe of violations.
 */
export function analyzeSceneProse(
  sceneId: string,
  fullText: string,
  targetWordCount: number,
  config: ProseConstraintConfig,
): SceneProseAnalysis {
  const wordCount = fullText.split(/\s+/).filter(w => w.length > 0).length;
  const sentenceCount = (fullText.match(/[.!?]+(?:\s|$)/g) ?? []).length;

  const povDetected = detectPOV(fullText);
  const tenseDetected = detectTense(fullText);
  const bannedHits = findBannedWords(fullText, config.banned_words);
  const clicheHits = findCliches(fullText, config.forbidden_cliches);
  const sensoryCount = countSensoryAnchors(fullText);
  const dialogueRatio = computeDialogueRatio(fullText);

  const violations: ProseViolation[] = [];

  // HARD: word count ±tolerance
  const minWords = Math.floor(targetWordCount * (1 - config.word_count_tolerance));
  const maxWords = Math.ceil(targetWordCount * (1 + config.word_count_tolerance));
  if (wordCount < minWords || wordCount > maxWords) {
    violations.push({
      scene_id: sceneId,
      rule: 'word_count_range',
      severity: 'HARD',
      message: `Word count ${wordCount} outside [${minWords}, ${maxWords}]`,
      value: wordCount,
      threshold: `${minWords}-${maxWords}`,
    });
  }

  // HARD: banned words
  if (bannedHits.length > 0) {
    violations.push({
      scene_id: sceneId,
      rule: 'banned_words',
      severity: 'HARD',
      message: `Banned words found: ${bannedHits.join(', ')}`,
      value: bannedHits.length,
      threshold: 0,
    });
  }

  // HARD: POV conformity
  const expectedPov = config.pov;
  if (povDetected !== 'unknown') {
    const povMatch =
      (expectedPov === 'first' && povDetected === 'first') ||
      (expectedPov.startsWith('third') && povDetected === 'third-limited') ||
      expectedPov === 'mixed';
    if (!povMatch) {
      violations.push({
        scene_id: sceneId,
        rule: 'pov_conformity',
        severity: 'HARD',
        message: `POV detected '${povDetected}', expected '${expectedPov}'`,
        value: povDetected,
        threshold: expectedPov,
      });
    }
  }

  // HARD: tense conformity
  if (tenseDetected !== 'unknown' && tenseDetected !== config.tense) {
    violations.push({
      scene_id: sceneId,
      rule: 'tense_conformity',
      severity: 'HARD',
      message: `Tense detected '${tenseDetected}', expected '${config.tense}'`,
      value: tenseDetected,
      threshold: config.tense,
    });
  }

  // SOFT: sensory anchors
  if (sensoryCount < config.min_sensory_anchors_per_scene) {
    violations.push({
      scene_id: sceneId,
      rule: 'sensory_anchors',
      severity: 'SOFT',
      message: `Sensory anchors ${sensoryCount} < min ${config.min_sensory_anchors_per_scene}`,
      value: sensoryCount,
      threshold: config.min_sensory_anchors_per_scene,
    });
  }

  // SOFT: dialogue ratio
  if (dialogueRatio > config.max_dialogue_ratio && config.max_dialogue_ratio > 0) {
    violations.push({
      scene_id: sceneId,
      rule: 'dialogue_ratio',
      severity: 'SOFT',
      message: `Dialogue ratio ${dialogueRatio.toFixed(3)} > max ${config.max_dialogue_ratio}`,
      value: dialogueRatio,
      threshold: config.max_dialogue_ratio,
    });
  }

  // SOFT: clichés
  if (clicheHits.length > 0) {
    violations.push({
      scene_id: sceneId,
      rule: 'forbidden_cliches',
      severity: 'SOFT',
      message: `Clichés found: ${clicheHits.join(', ')}`,
      value: clicheHits.length,
      threshold: 0,
    });
  }

  return {
    word_count: wordCount,
    sentence_count: sentenceCount,
    pov_detected: povDetected,
    tense_detected: tenseDetected,
    sensory_anchor_count: sensoryCount,
    dialogue_ratio: dialogueRatio,
    banned_word_hits: bannedHits,
    cliche_hits: clicheHits,
    violations,
  };
}

function buildScene(
  sceneId: string,
  paragraphs: readonly ProseParagraph[],
  plan: GenesisPlan,
  config: ProseConstraintConfig,
): ProsePackScene {
  // Find scene in plan
  let planScene: Scene | null = null;
  let arcId = '';
  for (const arc of plan.arcs) {
    for (const s of arc.scenes) {
      if (s.scene_id === sceneId) {
        planScene = s;
        arcId = arc.arc_id;
        break;
      }
    }
    if (planScene) break;
  }

  const texts = paragraphs.map(p => p.text);
  const fullText = texts.join('\n\n');
  const targetWordCount = planScene?.target_word_count ?? 500;

  const analysis = analyzeSceneProse(sceneId, fullText, targetWordCount, config);

  return {
    scene_id: sceneId,
    arc_id: arcId,
    paragraphs: texts,
    word_count: analysis.word_count,
    sentence_count: analysis.sentence_count,
    target_word_count: targetWordCount,
    pov_detected: analysis.pov_detected as any,
    tense_detected: analysis.tense_detected as any,
    sensory_anchor_count: analysis.sensory_anchor_count,
    dialogue_ratio: analysis.dialogue_ratio,
    banned_word_hits: analysis.banned_word_hits,
    cliche_hits: analysis.cliche_hits,
    violations: analysis.violations,
  };
}

// ─── Score Builder ───────────────────────────────────────────────

function buildScore(scenes: readonly ProsePackScene[]): ProsePackScore {
  const allViolations = scenes.flatMap(s => s.violations);
  const hardViolations = allViolations.filter(v => v.severity === 'HARD');
  const softViolations = allViolations.filter(v => v.severity === 'SOFT');

  const totalChecks = scenes.length * 4; // 4 hard checks per scene
  const hardFails = hardViolations.length;
  const satisfaction = totalChecks > 0 ? Math.max(0, 1 - hardFails / totalChecks) : 1;

  return {
    schema_ok: true,
    constraint_satisfaction: satisfaction,
    hard_pass: hardViolations.length === 0,
    soft_pass: softViolations.length === 0,
    total_violations: allViolations.length,
    hard_violations: hardViolations.length,
    soft_violations: softViolations.length,
  };
}

// ─── Main Normalizer ─────────────────────────────────────────────

export function normalizeToProsePack(
  prose: ProseDoc,
  plan: GenesisPlan,
  config: ProseConstraintConfig,
  meta: Omit<ProsePackMeta, 'version' | 'prose_hash'>,
): ProsePack {
  // Group paragraphs by scene
  const sceneIds = [...new Set(prose.paragraphs.flatMap(p => {
    // Each paragraph has segment_ids that map to scenes
    // We need to find which scene each paragraph belongs to
    return p.segment_ids;
  }))];

  // Build scene map from plan
  const sceneOrder: string[] = [];
  for (const arc of plan.arcs) {
    for (const scene of arc.scenes) {
      sceneOrder.push(scene.scene_id);
    }
  }

  // Group paragraphs by their scene (using segment_ids to find scene_id)
  const sceneParagraphs = new Map<string, ProseParagraph[]>();
  for (const para of prose.paragraphs) {
    // Find which scene this paragraph belongs to (from segment metadata)
    // Segments carry source_scene_id — paragraphs carry segment_ids
    // We use the first segment_id prefix to identify the scene
    const segId = para.segment_ids[0] ?? '';
    // segment_ids follow pattern: SEG-{sceneId}-{index}
    // Find matching scene by checking which scene owns these segments
    let matchedScene = '';
    for (const sid of sceneOrder) {
      if (para.segment_ids.some(s => s.includes(sid))) {
        matchedScene = sid;
        break;
      }
    }
    // Fallback: use emotion field or sequential assignment
    if (!matchedScene) {
      // Assign sequentially based on paragraph order
      const paraIdx = prose.paragraphs.indexOf(para);
      const parasPerScene = Math.ceil(prose.paragraphs.length / sceneOrder.length);
      const sceneIdx = Math.min(Math.floor(paraIdx / parasPerScene), sceneOrder.length - 1);
      matchedScene = sceneOrder[sceneIdx];
    }

    if (!sceneParagraphs.has(matchedScene)) {
      sceneParagraphs.set(matchedScene, []);
    }
    sceneParagraphs.get(matchedScene)!.push(para);
  }

  // Build scenes
  const scenes: ProsePackScene[] = [];
  for (const sceneId of sceneOrder) {
    const paras = sceneParagraphs.get(sceneId) ?? [];
    if (paras.length > 0) {
      scenes.push(buildScene(sceneId, paras, plan, config));
    }
  }

  const score = buildScore(scenes);

  const totalWords = scenes.reduce((s, sc) => s + sc.word_count, 0);
  const totalSentences = scenes.reduce((s, sc) => s + sc.sentence_count, 0);
  const totalParagraphs = scenes.reduce((s, sc) => s + sc.paragraphs.length, 0);

  const fullMeta: ProsePackMeta = {
    ...meta,
    version: '1.0.0',
    prose_hash: prose.prose_hash,
  };

  return {
    meta: fullMeta,
    constraints: config,
    scenes,
    score,
    total_words: totalWords,
    total_sentences: totalSentences,
    total_paragraphs: totalParagraphs,
  };
}
