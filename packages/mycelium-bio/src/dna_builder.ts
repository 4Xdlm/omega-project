// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — DNA BUILDER v1.0.0
// ═══════════════════════════════════════════════════════════════════════════════
// Construction de la carte d'identité unique du livre (MyceliumDNA)
// Garantie: même texte + même seed → même DNA à 100%
// ═══════════════════════════════════════════════════════════════════════════════

import {
  EmotionType,
  EmotionState,
  EmotionRecord14,
  IntensityRecord14,
  EmotionField,
  MyceliumNode,
  MyceliumDNA,
  MyceliumFingerprint,
  BioMarker,
  Vector3,
  HSL,
  EMOTION_TYPES,
  PHYSICS
} from "./types.js";
import { canonicalHashSync } from "./canonical_json.js";
import { computeGematria, computeBranchWeight as gemBranchWeight } from "./gematria.js";
import {
  buildEmotionField,
  createNeutralRecord,
  applyOfficialDecay
} from "./emotion_field.js";
import { computeOxygen, detectMarkers } from "./bio_engine.js";
import { computeHSL, computeDirection, computeBranchWeight, computeThickness } from "./morpho_engine.js";
import { buildFingerprint } from "./fingerprint.js";
import { computeMerkleRoot, updateNodeHash, recomputeAllHashes } from "./merkle.js";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES INPUT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Segment de texte avec émotions analysées
 */
export interface TextSegment {
  /** Texte brut */
  text: string;

  /** Type de segment */
  kind: "chapter" | "paragraph" | "sentence";

  /** Index dans le livre */
  index: number;

  /** Index du parent (chapitre pour paragraph, paragraph pour sentence) */
  parentIndex?: number;

  /** Intensités émotionnelles (14D) */
  emotions: Partial<IntensityRecord14>;

  /** Boost événement (0-1, optionnel) */
  eventBoost?: number;
}

/**
 * Options de construction
 */
export interface BuildOptions {
  /** Seed pour déterminisme (défaut: 42) */
  seed?: number;

  /** Titre du livre (pour hash source) */
  title?: string;

  /** Texte brut complet (pour hash source) */
  rawText?: string;

  /** Temps simulé entre segments en ms (défaut: 5000) */
  segmentDurationMs?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILDER
// ─────────────────────────────────────────────────════════════════════════════

/**
 * Construit un MyceliumDNA complet à partir de segments de texte
 */
export function buildMyceliumDNA(
  segments: TextSegment[],
  options: BuildOptions = {}
): MyceliumDNA {
  const startTime = Date.now();
  const seed = options.seed ?? 42;
  const segmentDurationMs = options.segmentDurationMs ?? 5000;

  // Hash du texte source (pour unicité)
  const sourceText = options.rawText || segments.map(s => s.text).join("\n");
  const sourceHash = canonicalHashSync(sourceText);

  // Construire les nœuds
  const nodes: MyceliumNode[] = [];
  let previousField: EmotionRecord14 | undefined;
  let previousOxygen: number | undefined;
  let streakWords = 0;

  // Créer le nœud racine (book)
  const bookNode = createBookNode(sourceHash, seed);
  nodes.push(bookNode);

  // Traiter chaque segment
  for (const segment of segments) {
    const node = processSegment(
      segment,
      previousField,
      previousOxygen,
      streakWords,
      seed,
      segmentDurationMs
    );

    nodes.push(node);

    // Mettre à jour l'état pour le prochain segment
    previousField = node.emotionField.states;
    previousOxygen = node.oxygen;

    // Compter les mots pour le streak
    const wordCount = segment.text.split(/\s+/).filter(w => w.length > 0).length;
    if ((segment.eventBoost ?? 0) > 0.2) {
      streakWords = 0; // Reset après événement
    } else {
      streakWords += wordCount;
    }
  }

  // Calculer les hashes de tous les nœuds
  const nodesWithHashes = recomputeAllHashes(nodes);

  // Calculer le Merkle root
  const rootHash = computeMerkleRoot(nodesWithHashes);

  // Construire le fingerprint
  const fingerprint = buildFingerprint(nodesWithHashes);

  // Assembler le DNA
  const processingTimeMs = Date.now() - startTime;

  return {
    version: "1.0.0",
    profile: "L4",
    seed,
    sourceHash,
    fingerprint,
    nodes: nodesWithHashes,
    rootHash,
    meta: {
      computedAt: new Date().toISOString(),
      nodeCount: nodesWithHashes.length,
      processingTimeMs
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CRÉATION NŒUDS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crée le nœud racine (book)
 */
function createBookNode(sourceHash: string, seed: number): MyceliumNode {
  const neutralField = buildEmotionField(createNeutralRecord());

  return {
    id: `book-${sourceHash.substring(0, 8)}`,
    kind: "book",
    level: 0,
    gematriaSum: 0,
    branchWeight: 1,
    thickness: 1,
    emotionField: neutralField,
    emotionDominant: neutralField.dominant,
    emotionIntensity: neutralField.peak,
    oxygen: 0.5,
    direction: { x: 0, y: 1, z: 0 },
    color: { h: 0, s: 0, l: 0.5 },
    markers: [],
    nodeHash: ""
  };
}

/**
 * Traite un segment et crée le nœud correspondant
 */
function processSegment(
  segment: TextSegment,
  previousRecord: EmotionRecord14 | undefined,
  previousOxygen: number | undefined,
  streakWords: number,
  seed: number,
  segmentDurationMs: number
): MyceliumNode {
  // 1. Gématrie
  const gematriaSum = computeGematria(segment.text);

  // 2. Construire le record émotionnel 14D
  const emotionRecord = buildEmotionRecord(segment.emotions);

  // 3. Appliquer le decay si on a un état précédent
  let decayedRecord = emotionRecord;
  if (previousRecord) {
    decayedRecord = applyDecayToRecord(previousRecord, segmentDurationMs);
    // Fusionner avec les nouvelles émotions du segment
    decayedRecord = mergeEmotionRecords(decayedRecord, emotionRecord);
  }

  // 4. Construire le champ émotionnel
  const emotionField = buildEmotionField(decayedRecord, previousRecord);

  // 5. Calculer l'oxygène
  const oxygenResult = computeOxygen(
    emotionField,
    segment.eventBoost ?? 0,
    streakWords,
    previousOxygen
  );

  // 6. ID déterministe
  const nodeId = `${segment.kind}-${segment.index}-${gematriaSum}-${seed}`;

  // 7. Direction et couleur
  const direction = computeDirection(emotionField, nodeId, seed);
  const color = computeHSL(emotionField, oxygenResult.final);

  // 8. Poids de branche et épaisseur
  const branchWeight = computeBranchWeight(gematriaSum, emotionField.peak);
  const thickness = computeThickness(branchWeight);

  // 9. Markers (champignons, cicatrices)
  const markers = detectMarkers(
    oxygenResult.final,
    previousOxygen,
    segment.eventBoost ?? 0,
    emotionField,
    segment.index,
    "" // Hash sera calculé après
  );

  // 10. Niveau hiérarchique
  const level = segment.kind === "chapter" ? 1 : segment.kind === "paragraph" ? 1 : 2;

  return {
    id: nodeId,
    kind: segment.kind,
    level: level as 0 | 1 | 2 | 3,
    parentId: segment.parentIndex !== undefined
      ? `${segment.kind === "sentence" ? "paragraph" : "chapter"}-${segment.parentIndex}`
      : undefined,
    gematriaSum,
    branchWeight,
    thickness,
    emotionField,
    emotionDominant: emotionField.dominant,
    emotionIntensity: emotionField.peak,
    oxygen: oxygenResult.final,
    direction,
    color,
    markers,
    sentenceIndex: segment.kind === "sentence" ? segment.index : undefined,
    nodeHash: "" // Sera calculé après
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS ÉMOTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construit un EmotionRecord14 à partir d'intensités partielles
 */
function buildEmotionRecord(intensities: Partial<IntensityRecord14>): EmotionRecord14 {
  const record: Record<EmotionType, EmotionState> = {} as Record<EmotionType, EmotionState>;

  for (const type of EMOTION_TYPES) {
    const intensity = intensities[type] ?? 0.1;
    record[type] = {
      type,
      mass: 1.0,
      intensity: Math.max(0, Math.min(1, intensity)),
      inertia: getDefaultInertia(type),
      decay_rate: 0.1,
      baseline: 0.2
    };
  }

  return record as EmotionRecord14;
}

/**
 * Applique le decay à tout le record
 */
function applyDecayToRecord(
  record: EmotionRecord14,
  elapsed_ms: number
): EmotionRecord14 {
  const result: Record<EmotionType, EmotionState> = {} as Record<EmotionType, EmotionState>;

  for (const type of EMOTION_TYPES) {
    const state = record[type];
    const newIntensity = applyDecay(state, elapsed_ms);
    result[type] = {
      ...state,
      intensity: newIntensity
    };
  }

  return result as EmotionRecord14;
}

/**
 * Formule decay officielle
 */
function applyDecay(state: EmotionState, elapsed_ms: number): number {
  const elapsed_seconds = elapsed_ms / 1000;
  const effective_decay = state.decay_rate / state.mass;
  const delta = state.intensity - state.baseline;
  const decay_factor = Math.exp(-effective_decay * elapsed_seconds);
  return Math.max(0, Math.min(1, state.baseline + delta * decay_factor));
}

/**
 * Fusionne deux records émotionnels (moyenne pondérée)
 */
function mergeEmotionRecords(
  decayed: EmotionRecord14,
  fresh: EmotionRecord14
): EmotionRecord14 {
  const result: Record<EmotionType, EmotionState> = {} as Record<EmotionType, EmotionState>;

  for (const type of EMOTION_TYPES) {
    const d = decayed[type];
    const f = fresh[type];

    // Pondération: 40% decay, 60% fresh
    const mergedIntensity = 0.4 * d.intensity + 0.6 * f.intensity;

    result[type] = {
      ...d,
      intensity: Math.max(0, Math.min(1, mergedIntensity))
    };
  }

  return result as EmotionRecord14;
}

/**
 * Inertie par défaut selon l'émotion
 */
function getDefaultInertia(type: EmotionType): number {
  const INERTIA: Record<EmotionType, number> = {
    sadness: 0.85,
    despair: 0.90,
    shame: 0.80,
    guilt: 0.75,
    fear: 0.70,
    disgust: 0.65,
    trust: 0.60,
    love: 0.55,
    anger: 0.45,
    anticipation: 0.40,
    hope: 0.35,
    pride: 0.35,
    joy: 0.30,
    surprise: 0.20
  };
  return INERTIA[type] ?? 0.5;
}

// ─────────────────────────────────────────────────────────────────────────────
// VÉRIFICATION DÉTERMINISME
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vérifie le déterminisme: même input → même output
 */
export function verifyDeterminism(
  segments: TextSegment[],
  options: BuildOptions = {}
): boolean {
  const dna1 = buildMyceliumDNA(segments, options);
  const dna2 = buildMyceliumDNA(segments, options);

  return dna1.rootHash === dna2.rootHash;
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS INLINE
// ─────────────────────────────────────────────────────────────────────────────

export function selfTest(): boolean {
  // Créer des segments de test
  const segments: TextSegment[] = [
    {
      text: "Il était une fois dans un royaume lointain.",
      kind: "sentence",
      index: 0,
      emotions: { joy: 0.3, anticipation: 0.5 }
    },
    {
      text: "Le roi portait une lourde couronne de doutes.",
      kind: "sentence",
      index: 1,
      emotions: { sadness: 0.4, fear: 0.3 }
    },
    {
      text: "Soudain, un dragon apparut dans le ciel!",
      kind: "sentence",
      index: 2,
      emotions: { fear: 0.6, surprise: 0.8 },
      eventBoost: 0.5
    },
    {
      text: "Le héros brandit son épée avec courage.",
      kind: "sentence",
      index: 3,
      emotions: { anger: 0.5, pride: 0.6 }
    }
  ];

  // Test construction
  const dna = buildMyceliumDNA(segments, { seed: 42, title: "Test Story" });

  // Vérifications
  if (!dna.rootHash || dna.rootHash.length !== 64) {
    console.error("FAIL: Invalid rootHash:", dna.rootHash);
    return false;
  }

  if (dna.nodes.length !== 5) { // 1 book + 4 sentences
    console.error("FAIL: Wrong node count:", dna.nodes.length);
    return false;
  }

  if (dna.version !== "1.0.0") {
    console.error("FAIL: Wrong version:", dna.version);
    return false;
  }

  if (dna.profile !== "L4") {
    console.error("FAIL: Wrong profile:", dna.profile);
    return false;
  }

  // Test déterminisme
  if (!verifyDeterminism(segments, { seed: 42 })) {
    console.error("FAIL: Determinism check failed");
    return false;
  }

  // Test fingerprint
  if (!dna.fingerprint || !dna.fingerprint.emotionDistribution) {
    console.error("FAIL: Missing fingerprint");
    return false;
  }

  // Vérifier que la somme des distributions = 1
  const distSum = Object.values(dna.fingerprint.emotionDistribution)
    .reduce((a, b) => a + b, 0);
  if (Math.abs(distSum - 1) > 0.01) {
    console.error("FAIL: Distribution sum != 1:", distSum);
    return false;
  }

  // Test seed différent = hash différent
  const dna2 = buildMyceliumDNA(segments, { seed: 43 });
  if (dna.rootHash === dna2.rootHash) {
    console.error("FAIL: Different seeds should produce different hashes");
    return false;
  }

  console.log("✅ dna_builder.ts: All tests passed");
  console.log(`   Root hash: ${dna.rootHash.substring(0, 16)}...`);
  console.log(`   Nodes: ${dna.nodes.length}`);
  console.log(`   Processing: ${dna.meta.processingTimeMs}ms`);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  buildMyceliumDNA,
  verifyDeterminism,
  selfTest
};
