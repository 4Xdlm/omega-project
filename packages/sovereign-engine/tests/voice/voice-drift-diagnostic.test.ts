/**
 * DIAGNOSTIC — Per-param drift breakdown
 * Purpose: identify which params are the REAL drift culprits
 * Cost: 0 API credits
 */

import { describe, it } from 'vitest';
import { measureVoice, computeVoiceDrift, type VoiceGenome } from '../../src/voice/voice-genome.js';

const GOLDEN_TARGET: VoiceGenome = {
  phrase_length_mean: 0.29,
  dialogue_ratio: 0.10,
  metaphor_density: 0.4,
  language_register: 0.7,
  irony_level: 0.2,
  ellipsis_rate: 0.3,
  abstraction_ratio: 0.4,
  punctuation_style: 0.5,
  paragraph_rhythm: 0.6,
  opening_variety: 0.7,
};

const PROSE_SAMPLES = [
  `La porte claqua. Silence. Puis le bruit de ses pas sur le parquet, lent, régulier, comme une horloge détraquée. Il ne se retourna pas.\n\nL'obscurité envahissait la pièce par degrés imperceptibles. Les ombres rampaient le long des murs, dévorant les dernières traces de lumière. Un frisson parcourut son échine.\n\nElle attendait. Depuis combien de temps exactement, elle ne savait plus. Les minutes s'étiraient, poisseuses, interminables. Chaque battement de son cœur résonnait dans le vide.`,

  `Il courut. Le souffle court. Les jambes brûlantes. Derrière lui, le bruit se rapprochait.\n\nLe mur surgit devant ses yeux. Trop tard pour freiner. Il sauta, agrippa le rebord, se hissa d'un mouvement désespéré. Ses doigts glissèrent. Il serra plus fort.\n\nEn bas, les chiens aboyaient avec rage. Leurs crocs luisaient sous la lune. La sueur dégoulinait dans ses yeux. Il devait continuer.\n\nLe toit s'étendait devant lui, plat et désert. Il reprit sa course. Chaque foulée comptait maintenant.`,

  `Le train s'éloignait. Sur le quai désert, elle restait immobile. Sa valise gisait à ses pieds comme un animal abandonné. Les rails vibraient encore.\n\nQuelque chose venait de se briser en elle. Pas avec fracas, non. Avec la discrétion terrible des catastrophes intérieures. Un effondrement silencieux, invisible aux passants pressés.\n\nElle finit par bouger. Un pas. Puis un autre. Le monde reprenait forme autour d'elle, flou d'abord, puis progressivement net. La gare sentait le métal et le café tiède. Les haut-parleurs crachaient des annonces incompréhensibles.\n\nIl faudrait rentrer. Défaire cette valise. Réapprendre à respirer dans un espace vidé de sa présence.`,
];

describe('DIAGNOSTIC: per-param drift breakdown', () => {
  it('dump all params — target vs measured vs diff', () => {
    const allParams = Object.keys(GOLDEN_TARGET) as (keyof VoiceGenome)[];

    for (let i = 0; i < PROSE_SAMPLES.length; i++) {
      const measured = measureVoice(PROSE_SAMPLES[i]);
      const result = computeVoiceDrift(GOLDEN_TARGET, measured);

      console.log(`\n=== SAMPLE ${i + 1} (drift=${result.drift.toFixed(4)}, score=${((1-result.drift)*100).toFixed(1)}) ===`);
      console.log('PARAM                  | TARGET | MEASURED | DIFF   | DIFF²');
      console.log('-'.repeat(70));

      const sorted = allParams
        .map(p => ({ param: p, target: GOLDEN_TARGET[p], measured: measured[p], diff: result.per_param[p] }))
        .sort((a, b) => b.diff - a.diff);

      for (const { param, target, measured: m, diff } of sorted) {
        const diffSq = diff * diff;
        const bar = '█'.repeat(Math.round(diff * 50));
        console.log(
          `${param.padEnd(22)} | ${target.toFixed(2)}   | ${m.toFixed(4)}   | ${diff.toFixed(4)} | ${diffSq.toFixed(4)} ${bar}`
        );
      }
    }

    // Aggregate: mean diff per param across all samples
    console.log('\n=== AGGREGATE MEAN DIFF ===');
    const meanDiffs: Record<string, number> = {};
    for (const p of allParams) meanDiffs[p] = 0;

    for (const prose of PROSE_SAMPLES) {
      const measured = measureVoice(prose);
      const result = computeVoiceDrift(GOLDEN_TARGET, measured);
      for (const p of allParams) meanDiffs[p] += result.per_param[p];
    }
    for (const p of allParams) meanDiffs[p] /= PROSE_SAMPLES.length;

    const sortedAgg = allParams
      .map(p => ({ param: p, meanDiff: meanDiffs[p] }))
      .sort((a, b) => b.meanDiff - a.meanDiff);

    console.log('PARAM                  | MEAN_DIFF | VERDICT');
    console.log('-'.repeat(55));
    for (const { param, meanDiff } of sortedAgg) {
      const verdict = meanDiff > 0.30 ? '🔴 CRITICAL' : meanDiff > 0.15 ? '🟡 HIGH' : '🟢 OK';
      console.log(`${param.padEnd(22)} | ${meanDiff.toFixed(4)}    | ${verdict}`);
    }
  });
});
