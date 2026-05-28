/**
 * OMEGA V2.2-C — SHADOW boundary optimizer (probe, NON production)
 *
 * Objectif : etant donne le decoupage V2.1 (chunks), proposer pour chaque
 * frontiere interne un deplacement local (parmi shift_candidates) qui MINIMISE
 * la similarite cosinus entre la zone-frontiere gauche et droite — c.-a-d. la
 * coupe semantiquement la plus nette — sous contraintes de longueur.
 *
 * SHADOW : ce module CALCULE des propositions de frontieres et des metriques,
 * mais ne modifie PAS chunkAdaptive() ni le pipeline production. Il sert a
 * mesurer (Phase V2.2-C) si un optimizer reel vaut la peine (Phase V2.2-D).
 *
 * Justification empirique (B2 2026-05-28) : 52.4% des frontieres V2.1 sont
 * SUB_OPTIMAL (une coupe voisine donnerait une rupture plus nette) et
 * random_control_gap ~ 0 (frontieres V2.1 quasi-aleatoires, HALLU-IA-014).
 *
 * Determinisme : fonction pure de (chunks, config) pour un embedder
 * deterministe (nomic-embed-text). boundary_hash = SHA256 des positions proposees.
 *
 * Contrainte Ollama (LAW-CHUNK-047) : zone_words <= 250 << 1200 mots -> pas de
 * crash 500. L'embedder injecte reste responsable du sub-chunking si besoin.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Sprint V2.2-C 2026-05-28
 */

import { createHash } from 'node:crypto';
import { cosineSimilarity } from '../embeddings/similarity.js';

/** Fonction d'embedding injectee (async, ex: OllamaEmbedder.embed). */
export type EmbedFn = (text: string) => Promise<Float32Array>;

export interface ShadowOptimizerConfig {
  /** Mots par zone-frontiere de chaque cote (<= 250 pour rester sous la limite Ollama). */
  readonly zone_words: number;
  /** Decalages candidats en mots (0 inclus = position V2.1). */
  readonly shift_candidates: readonly number[];
  /** Taille minimale d'un chunk resultant (mots) — contrainte de validite. */
  readonly min_chunk_words: number;
}

export const DEFAULT_SHADOW_CONFIG: ShadowOptimizerConfig = {
  zone_words: 250,
  shift_candidates: [-200, -100, 0, 100, 200],
  min_chunk_words: 100,
};

export interface BoundaryProposal {
  readonly boundary_index: number;
  readonly original_word_pos: number;
  readonly proposed_word_pos: number;
  readonly shift: number;
  readonly cosine_original: number;
  readonly cosine_proposed: number;
  /** cosine_original - cosine_proposed : > 0 => coupe proposee plus nette. */
  readonly improvement: number;
  readonly moved: boolean;
  readonly candidates_evaluated: number;
}

export interface ShadowOptimizationResult {
  readonly boundary_count: number;
  readonly proposals: readonly BoundaryProposal[];
  readonly moved_count: number;
  readonly pct_moved: number;
  readonly mean_improvement: number;
  readonly mean_cosine_original: number;
  readonly mean_cosine_proposed: number;
  readonly original_boundaries: readonly number[];
  readonly proposed_boundaries: readonly number[];
  readonly boundary_hash: string;
  /** true si toutes les frontieres proposees respectent les contraintes (strictement croissantes + min_chunk_words). */
  readonly valid: boolean;
}

interface Zone {
  readonly left: string;
  readonly right: string;
}

/** Extrait les zones gauche/droite autour d'une position-mot (exclusive a droite). */
function extractZoneAt(words: readonly string[], pos: number, zoneWords: number): Zone {
  const leftStart = Math.max(0, pos - zoneWords);
  const rightEnd = Math.min(words.length, pos + zoneWords);
  return {
    left: words.slice(leftStart, pos).join(' '),
    right: words.slice(pos, rightEnd).join(' '),
  };
}

function computeBoundaryHash(boundaries: readonly number[]): string {
  return createHash('sha256').update(JSON.stringify(boundaries)).digest('hex');
}

/**
 * SHADOW boundary optimization.
 *
 * @param chunks Chunks V2.1 (on n'utilise que .text). >= 2 chunks requis.
 * @param embed Fonction d'embedding async injectee.
 * @param config Config (defaults DEFAULT_SHADOW_CONFIG).
 * @returns Propositions de frontieres + metriques + boundary_hash deterministe.
 */
export async function optimizeBoundariesShadow(
  chunks: readonly { readonly text: string }[],
  embed: EmbedFn,
  config: ShadowOptimizerConfig = DEFAULT_SHADOW_CONFIG
): Promise<ShadowOptimizationResult> {
  if (config.zone_words <= 0) throw new Error(`zone_words must be > 0, got ${config.zone_words}`);
  if (!config.shift_candidates.includes(0)) {
    throw new Error('shift_candidates must include 0 (la position V2.1 baseline)');
  }

  // Reconstruction robuste : words global + frontieres = cumul des longueurs de chunks.
  const perChunkWords = chunks.map((c) => c.text.split(/\s+/).filter((w) => w.length > 0));
  const words: string[] = perChunkWords.flat();
  const totalWords = words.length;

  const originalBoundaries: number[] = [];
  let acc = 0;
  for (let i = 0; i < perChunkWords.length - 1; i++) {
    acc += perChunkWords[i]!.length;
    originalBoundaries.push(acc);
  }

  // Cache d'embeddings intra-appel (positions partagees entre frontieres voisines).
  const cache = new Map<number, Promise<Float32Array>>();
  const embedAt = async (pos: number, side: 'L' | 'R'): Promise<Float32Array> => {
    const key = side === 'L' ? -pos - 1 : pos; // clef distincte L/R
    const existing = cache.get(key);
    if (existing) return existing;
    const zone = extractZoneAt(words, pos, config.zone_words);
    const p = embed(side === 'L' ? zone.left : zone.right);
    cache.set(key, p);
    return p;
  };

  const cosineAt = async (pos: number): Promise<number> => {
    const [l, r] = await Promise.all([embedAt(pos, 'L'), embedAt(pos, 'R')]);
    // Clamp [0,1] comme convention espace embedding (cf boundaryZone.ts).
    return Math.max(0, cosineSimilarity(l, r));
  };

  const proposals: BoundaryProposal[] = [];
  const proposedBoundaries: number[] = [];
  let prevProposed = 0;

  for (let i = 0; i < originalBoundaries.length; i++) {
    const orig = originalBoundaries[i]!;
    const nextOriginal = i + 1 < originalBoundaries.length ? originalBoundaries[i + 1]! : totalWords;

    const cosOriginal = await cosineAt(orig);
    let bestPos = orig;
    let bestCos = cosOriginal;
    let evaluated = 1;

    for (const shift of config.shift_candidates) {
      if (shift === 0) continue;
      const cand = orig + shift;
      // Contraintes de validite : strictement croissant + min_chunk_words des deux cotes.
      if (cand - prevProposed < config.min_chunk_words) continue;
      if (nextOriginal - cand < config.min_chunk_words) continue;
      if (cand <= 0 || cand >= totalWords) continue;
      const cos = await cosineAt(cand);
      evaluated++;
      if (cos < bestCos) {
        bestCos = cos;
        bestPos = cand;
      }
    }

    const moved = bestPos !== orig;
    proposals.push({
      boundary_index: i,
      original_word_pos: orig,
      proposed_word_pos: bestPos,
      shift: bestPos - orig,
      cosine_original: cosOriginal,
      cosine_proposed: bestCos,
      improvement: cosOriginal - bestCos,
      moved,
      candidates_evaluated: evaluated,
    });
    proposedBoundaries.push(bestPos);
    prevProposed = bestPos;
  }

  const boundaryCount = proposals.length;
  const movedCount = proposals.filter((p) => p.moved).length;
  const meanImprovement =
    boundaryCount > 0 ? proposals.reduce((a, p) => a + p.improvement, 0) / boundaryCount : 0;
  const meanCosOriginal =
    boundaryCount > 0 ? proposals.reduce((a, p) => a + p.cosine_original, 0) / boundaryCount : 0;
  const meanCosProposed =
    boundaryCount > 0 ? proposals.reduce((a, p) => a + p.cosine_proposed, 0) / boundaryCount : 0;

  // Validite : strictement croissant + chaque gap >= min_chunk_words (bornes incluses).
  let valid = true;
  let cursor = 0;
  for (const b of proposedBoundaries) {
    if (b - cursor < config.min_chunk_words) {
      valid = false;
      break;
    }
    cursor = b;
  }
  if (valid && totalWords - cursor < config.min_chunk_words && proposedBoundaries.length > 0) {
    valid = false;
  }

  return {
    boundary_count: boundaryCount,
    proposals,
    moved_count: movedCount,
    pct_moved: boundaryCount > 0 ? (movedCount / boundaryCount) * 100 : 0,
    mean_improvement: meanImprovement,
    mean_cosine_original: meanCosOriginal,
    mean_cosine_proposed: meanCosProposed,
    original_boundaries: originalBoundaries,
    proposed_boundaries: proposedBoundaries,
    boundary_hash: computeBoundaryHash(proposedBoundaries),
    valid,
  };
}
