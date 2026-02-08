/**
 * OMEGA Style Emergence Engine -- Style Profiler
 * Phase C.3 -- Aggregates all metric analyzers + genome deviation
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type { ProseParagraph } from '@omega/scribe-engine';
import type {
  StyleProfile, GenomeDeviation, CoherenceProfile, StyledParagraph,
} from '../types.js';
import type { StyleGenomeInput } from '@omega/genesis-planner';
import { analyzeCadence } from './cadence-analyzer.js';
import { analyzeLexical } from './lexical-analyzer.js';
import { analyzeSyntactic } from './syntactic-analyzer.js';
import { analyzeDensity } from './density-analyzer.js';

function emptyCoherence(): CoherenceProfile {
  return {
    style_drift: 0,
    max_local_drift: 0,
    voice_stability: 1,
    outlier_paragraphs: [],
  };
}

function computeGenomeDeviation(
  cadenceCV: number,
  lexicalTTR: number,
  avgSentLen: number,
  dialogueRatio: number,
  descDensity: number,
  genome: StyleGenomeInput,
  tolerance: number,
): GenomeDeviation {
  const burstDelta = Math.abs(cadenceCV - genome.target_burstiness);
  const lexDelta = Math.abs(lexicalTTR - genome.target_lexical_richness);
  const sentDelta = genome.target_avg_sentence_length > 0
    ? Math.abs(avgSentLen - genome.target_avg_sentence_length) / genome.target_avg_sentence_length
    : 0;
  const dialogDelta = Math.abs(dialogueRatio - genome.target_dialogue_ratio);
  const descDelta = Math.abs(descDensity - genome.target_description_density);

  const deltas = [burstDelta, lexDelta, sentDelta, dialogDelta, descDelta];
  const maxDev = Math.max(...deltas);
  const avgDev = deltas.reduce((a, b) => a + b, 0) / deltas.length;

  return {
    burstiness_delta: burstDelta,
    lexical_richness_delta: lexDelta,
    sentence_length_delta: sentDelta,
    dialogue_ratio_delta: dialogDelta,
    description_density_delta: descDelta,
    max_deviation: maxDev,
    avg_deviation: avgDev,
    all_within_tolerance: maxDev <= tolerance,
  };
}

export function profileStyle(
  paragraphs: readonly ProseParagraph[],
  genome: StyleGenomeInput,
  timestamp: string,
  tolerance?: number,
  coherence?: CoherenceProfile,
): StyleProfile {
  const cadence = analyzeCadence(paragraphs);
  const lexical = analyzeLexical(paragraphs);
  const syntactic = analyzeSyntactic(paragraphs);
  const density = analyzeDensity(paragraphs);
  const coh = coherence ?? emptyCoherence();

  const genomeDev = computeGenomeDeviation(
    cadence.coefficient_of_variation,
    lexical.type_token_ratio,
    cadence.avg_sentence_length,
    density.dialogue_ratio,
    density.description_density,
    genome,
    tolerance ?? 0.25,
  );

  const profileContent = canonicalize({
    cadence, lexical, syntactic, density, coherence: coh, genome_deviation: genomeDev,
  });
  const profileHash = sha256(profileContent);
  const profileId = `EPROF-${profileHash.slice(0, 16)}`;

  return {
    profile_id: profileId,
    profile_hash: profileHash,
    cadence,
    lexical,
    syntactic,
    density,
    coherence: coh,
    genome_deviation: genomeDev,
    timestamp_deterministic: timestamp,
  };
}

export function profileStyledParagraph(
  para: StyledParagraph,
  genome: StyleGenomeInput,
  timestamp: string,
  tolerance?: number,
): StyleProfile {
  const prosePara: ProseParagraph = {
    paragraph_id: para.paragraph_id,
    segment_ids: [],
    text: para.text,
    word_count: para.word_count,
    sentence_count: para.sentence_count,
    avg_sentence_length: para.sentence_count > 0 ? para.word_count / para.sentence_count : 0,
    emotion: '',
    intensity: 0,
    rhetorical_devices: [],
    sensory_anchors: [],
    motif_refs: [],
    canon_refs: [],
  };
  return profileStyle([prosePara], genome, timestamp, tolerance);
}
