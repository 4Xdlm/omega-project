/**
 * OMEGA V2.3-A P2 — Harness de routage A/B (réécriture) — PUR, generate INJECTÉ.
 *
 * Compare deux découpages d'un MÊME texte source, à K segments identiques :
 *   - bras CONTRÔLE  : frontières NAÏVES (découpage à mots égaux)
 *   - bras TRAITEMENT : frontières SCALPEL (chunkAdaptive)
 * La position des frontières est la SEULE variable (même K, même texte) — cf dossier M0.
 *
 * Chaque segment passe par : deriveEmotionContractFromSegment (P0) -> buildForgePacketFromSegment (P1)
 * -> forgePacketToSceneBrief -> generate(brief, seed). `generate` est INJECTÉ : en P2 c'est un MOCK
 * ([MOCK GENERATION]) -> zéro qwen/Ollama/heure GPU. Aucun appel generateChunkedDraft.
 *
 * But P2 : prouver que la plomberie route et assemble les prompts des DEUX bras avant d'allumer Qwen (P3/P4).
 *
 * Standard: NASA-Grade L4 / DO-178C Level A — Sprint V2.3-A P2 2026-05-29
 */

import { chunkAdaptive } from './adaptive.js';
import { deriveEmotionContractFromSegment } from './deriveEmotionContract.js';
import { buildForgePacketFromSegment } from './deriveForgePacket.js';
import { forgePacketToSceneBrief } from '../generation/forge-to-brief.js';

/** Fonction de génération injectée (MOCK en P2, qwen en P3/P4). */
export type GenerateFn = (brief: string, seed: string) => string;

/** MOCK déterministe : ne consomme aucun token. */
export const MOCK_GENERATE: GenerateFn = () => '[MOCK GENERATION]';

export type ArmName = 'control_naive' | 'treatment_scalpel';

export interface SegmentRouting {
  readonly index: number;
  readonly word_count: number;
  readonly segment_hash: string;
  readonly packet_id: string;
  readonly packet_hash: string;
  readonly confidence: number;
  readonly brief_length: number;
  readonly brief_non_empty: boolean;
  readonly generation: string; // sortie generate (MOCK en P2)
}

export interface ArmRouting {
  readonly arm: ArmName;
  readonly segment_count: number;
  readonly segments: readonly SegmentRouting[];
}

export interface ABRoutingResult {
  readonly k_segments: number;
  readonly control: ArmRouting;
  readonly treatment: ArmRouting;
  readonly identical_segment_count: boolean; // K identique entre bras (invariant "frontière = seule variable")
}

/** Découpe `text` en `k` segments contigus à nombre de mots quasi-égal (frontières naïves). */
export function naiveSegments(text: string, k: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter((w) => w.length > 0);
  if (k <= 1 || words.length === 0) return [words.join(' ')];
  const out: string[] = [];
  const size = Math.ceil(words.length / k);
  for (let i = 0; i < k; i++) {
    const slice = words.slice(i * size, (i + 1) * size);
    if (slice.length > 0) out.push(slice.join(' '));
  }
  return out.length > 0 ? out : [words.join(' ')];
}

/** Frontières SCALPEL : chunkAdaptive -> textes des chunks. */
export function scalpelSegments(text: string): string[] {
  return chunkAdaptive(text).map((c) => c.text);
}

function routeArm(arm: ArmName, segments: readonly string[], generate: GenerateFn): ArmRouting {
  const rows: SegmentRouting[] = segments.map((seg, index) => {
    const candidate = deriveEmotionContractFromSegment(seg);
    const fp = buildForgePacketFromSegment(seg, candidate);
    const brief = forgePacketToSceneBrief(fp.packet);
    const seed = `${arm}_${index}_${fp.source_segment_hash.slice(0, 8)}`;
    return {
      index,
      word_count: Number(candidate.evidence['word_count'] ?? 0),
      segment_hash: fp.source_segment_hash,
      packet_id: fp.packet.packet_id,
      packet_hash: fp.packet.packet_hash,
      confidence: fp.confidence,
      brief_length: brief.length,
      brief_non_empty: brief.trim().length > 0,
      generation: generate(brief, seed),
    };
  });
  return { arm, segment_count: rows.length, segments: rows };
}

/**
 * Route un texte source via les deux bras (contrôle naïf vs traitement scalpel), à K segments égal.
 * @param text     texte source (mode réécriture)
 * @param generate fonction de génération injectée (MOCK en P2)
 */
export function runABRouting(text: string, generate: GenerateFn = MOCK_GENERATE): ABRoutingResult {
  const scalpel = scalpelSegments(text);
  const k = Math.max(1, scalpel.length);
  const naive = naiveSegments(text, k);
  const control = routeArm('control_naive', naive, generate);
  const treatment = routeArm('treatment_scalpel', scalpel, generate);
  return {
    k_segments: k,
    control,
    treatment,
    identical_segment_count: control.segment_count === treatment.segment_count,
  };
}
