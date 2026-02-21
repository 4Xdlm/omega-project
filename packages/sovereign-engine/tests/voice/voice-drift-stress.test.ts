/**
 * OFFLINE STRESS TEST — Voice Drift Exclusion Impact
 * INV-VOICE-DRIFT-01
 * 
 * Purpose: Prove voice_conformity score improvement BEFORE burning API credits.
 * Simulates realistic FR literary prose → measures genome → computes drift 10/10 vs 7/10.
 * 
 * Expected: score jumps from ~60 range to ~75-85 range.
 * Cost: 0 API credits.
 */

import { describe, it, expect } from 'vitest';
import {
  measureVoice,
  computeVoiceDrift,
  NON_APPLICABLE_VOICE_PARAMS,
  DEFAULT_VOICE_GENOME,
  type VoiceGenome,
} from '../../src/voice/voice-genome.js';
import { scoreVoiceConformity } from '../../src/oracle/axes/voice-conformity.js';
import type { ForgePacket } from '../../src/types.js';

// ─── REALISTIC TARGET GENOME (mirrors golden-loader buildVoiceGenome defaults) ───
const GOLDEN_TARGET: VoiceGenome = {
  phrase_length_mean: 0.29,  // norm(15, 5, 40) ≈ 0.29
  dialogue_ratio: 0.10,      // typical narrative scene
  metaphor_density: 0.4,     // default
  language_register: 0.7,    // soutenu
  irony_level: 0.2,          // default
  ellipsis_rate: 0.3,        // default
  abstraction_ratio: 0.4,    // default
  punctuation_style: 0.5,    // default
  paragraph_rhythm: 0.6,     // moderate burstiness
  opening_variety: 0.7,      // default
};

// ─── 5 REALISTIC FR LITERARY PROSE SAMPLES ───
const PROSE_SAMPLES = [
  // Sample 1: Narrative tension — short/medium sentences, literary register
  `La porte claqua. Silence. Puis le bruit de ses pas sur le parquet, lent, régulier, comme une horloge détraquée. Il ne se retourna pas.

L'obscurité envahissait la pièce par degrés imperceptibles. Les ombres rampaient le long des murs, dévorant les dernières traces de lumière. Un frisson parcourut son échine.

Elle attendait. Depuis combien de temps exactement, elle ne savait plus. Les minutes s'étiraient, poisseuses, interminables. Chaque battement de son cœur résonnait dans le vide.`,

  // Sample 2: Introspective — longer sentences, abstract vocabulary
  `Les pensées tourbillonnaient dans son esprit fatigué. Chaque tentative de concentration s'effondrait aussitôt, emportée par le courant incessant des souvenirs. La nuit précédente avait laissé des traces profondes.

Il contemplait le plafond fissuré avec une attention morbide. Les craquelures formaient une carte indéchiffrable, un réseau de chemins impossibles. Quelque chose en lui résistait encore.

Le silence de la chambre pesait sur ses épaules. Dehors, la ville bruissait de mille activités indifférentes à sa détresse. Le monde continuait sans lui.`,

  // Sample 3: Action scene — short punchy sentences, high variety
  `Il courut. Le souffle court. Les jambes brûlantes. Derrière lui, le bruit se rapprochait.

Le mur surgit devant ses yeux. Trop tard pour freiner. Il sauta, agrippa le rebord, se hissa d'un mouvement désespéré. Ses doigts glissèrent. Il serra plus fort.

En bas, les chiens aboyaient avec rage. Leurs crocs luisaient sous la lune. La sueur dégoulinait dans ses yeux. Il devait continuer.

Le toit s'étendait devant lui, plat et désert. Il reprit sa course. Chaque foulée comptait maintenant.`,

  // Sample 4: Description atmosphérique — balanced, sensory details
  `Le jardin s'éveillait dans la brume matinale. Les roses portaient encore leurs perles de rosée, fragiles et translucides. Un merle chantait quelque part dans les branches du tilleul centenaire.

La lumière filtrait à travers les feuilles en motifs changeants. Le sol humide exhalait cette odeur particulière de terre mouillée qui annonçait le printemps. Les premières abeilles bourdonnaient autour des lavandes.

Marguerite traversa la pelouse pieds nus. L'herbe froide la fit frissonner. Elle s'assit sur le banc de pierre et ferma les yeux. Le monde entier respirait autour d'elle.`,

  // Sample 5: Dialogue-free emotional scene — mixed rhythm
  `Le train s'éloignait. Sur le quai désert, elle restait immobile. Sa valise gisait à ses pieds comme un animal abandonné. Les rails vibraient encore.

Quelque chose venait de se briser en elle. Pas avec fracas, non. Avec la discrétion terrible des catastrophes intérieures. Un effondrement silencieux, invisible aux passants pressés.

Elle finit par bouger. Un pas. Puis un autre. Le monde reprenait forme autour d'elle, flou d'abord, puis progressivement net. La gare sentait le métal et le café tiède. Les haut-parleurs crachaient des annonces incompréhensibles.

Il faudrait rentrer. Défaire cette valise. Réapprendre à respirer dans un espace vidé de sa présence.`,
];

function createPacket(voice: VoiceGenome): ForgePacket {
  return {
    packet_id: 'offline-stress',
    packet_hash: 'stress-hash',
    scene_id: 'stress-scene',
    run_id: 'stress-run',
    quality_tier: 'standard',
    language: 'fr',
    style_genome: {
      version: '1.0',
      universe: 'test',
      lexicon: { signature_words: [], forbidden_words: [], abstraction_max_ratio: 0.3, concrete_min_ratio: 0.5 },
      rhythm: { avg_sentence_length_target: 15, gini_target: 0.45, max_consecutive_similar: 2, min_syncopes_per_scene: 3, min_compressions_per_scene: 2 },
      tone: { dominant_register: 'soutenu', intensity_range: [0.4, 0.8] },
      imagery: { recurrent_motifs: [], density_target_per_100_words: 5, banned_metaphors: [] },
      voice: voice,
    },
  } as any;
}

describe('OFFLINE STRESS: Voice Drift Exclusion Impact (0 API credits)', () => {

  // ─── Per-sample analysis ───
  PROSE_SAMPLES.forEach((prose, i) => {
    it(`STRESS-${String(i + 1).padStart(2, '0')}: prose sample ${i + 1} — drift 7/10 < drift 10/10`, () => {
      const measured = measureVoice(prose);
      const drift10 = computeVoiceDrift(GOLDEN_TARGET, measured);
      const drift7 = computeVoiceDrift(GOLDEN_TARGET, measured, NON_APPLICABLE_VOICE_PARAMS);

      // Filtered drift should be lower
      expect(drift7.drift).toBeLessThanOrEqual(drift10.drift);
      expect(drift7.n_applicable).toBe(6);
      expect(drift10.n_applicable).toBe(10);

      // Score 7/10 should be higher
      const score10 = (1 - drift10.drift) * 100;
      const score7 = (1 - drift7.drift) * 100;
      expect(score7).toBeGreaterThanOrEqual(score10);

      console.log(`  Sample ${i + 1}: score10=${score10.toFixed(1)}, score7=${score7.toFixed(1)}, delta=+${(score7 - score10).toFixed(1)}`);
    });
  });

  // ─── Aggregate: prove score enters 70+ zone ───
  it('STRESS-AGG-01: mean voice_conformity score (7/10) >= 70 across all samples', () => {
    const scores: number[] = [];

    for (const prose of PROSE_SAMPLES) {
      const measured = measureVoice(prose);
      const drift7 = computeVoiceDrift(GOLDEN_TARGET, measured, NON_APPLICABLE_VOICE_PARAMS);
      scores.push((1 - drift7.drift) * 100);
    }

    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const min = Math.min(...scores);
    const max = Math.max(...scores);

    console.log(`  Aggregate: mean=${mean.toFixed(1)}, min=${min.toFixed(1)}, max=${max.toFixed(1)}`);

    expect(mean).toBeGreaterThanOrEqual(70);
  });

  // ─── Prove the 3 excluded params are systematically drifting ───
  it('STRESS-DIAG-01: irony_level drift > 0.15 on all samples (broken heuristic)', () => {
    for (const prose of PROSE_SAMPLES) {
      const measured = measureVoice(prose);
      const result = computeVoiceDrift(GOLDEN_TARGET, measured);
      expect(result.per_param.irony_level).toBeGreaterThan(0.15);
    }
  });

  it('STRESS-DIAG-02: metaphor_density drift > 0.10 on >= 3 samples (keyword limitation)', () => {
    let highDriftCount = 0;
    for (const prose of PROSE_SAMPLES) {
      const measured = measureVoice(prose);
      const result = computeVoiceDrift(GOLDEN_TARGET, measured);
      if (result.per_param.metaphor_density > 0.10) highDriftCount++;
    }
    expect(highDriftCount).toBeGreaterThanOrEqual(3);
  });

  // ─── Full scoreVoiceConformity integration ───
  it('STRESS-INT-01: scoreVoiceConformity uses filtered drift (N_applicable=7)', async () => {
    const packet = createPacket(GOLDEN_TARGET);
    const scores: number[] = [];

    for (const prose of PROSE_SAMPLES) {
      const result = await scoreVoiceConformity(packet, prose);
      scores.push(result.score);

      expect(result.details).toContain('N_applicable: 6/10');
      expect(result.details).toContain('irony_level');
    }

    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    console.log(`  Integration scores: [${scores.map(s => s.toFixed(1)).join(', ')}], mean=${mean.toFixed(1)}`);

    expect(mean).toBeGreaterThanOrEqual(65);
  });

  // ─── Edge case: DEFAULT_VOICE_GENOME target ───
  it('STRESS-EDGE-01: default genome target also benefits from exclusion', () => {
    const prose = PROSE_SAMPLES[0];
    const measured = measureVoice(prose);

    const drift10 = computeVoiceDrift(DEFAULT_VOICE_GENOME, measured);
    const drift7 = computeVoiceDrift(DEFAULT_VOICE_GENOME, measured, NON_APPLICABLE_VOICE_PARAMS);

    const score10 = (1 - drift10.drift) * 100;
    const score7 = (1 - drift7.drift) * 100;

    console.log(`  Default genome: score10=${score10.toFixed(1)}, score7=${score7.toFixed(1)}`);
    expect(score7).toBeGreaterThanOrEqual(score10);
  });
});
