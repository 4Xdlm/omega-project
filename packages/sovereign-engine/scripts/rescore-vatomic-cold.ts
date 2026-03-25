/**
 * OMEGA — Rescore V-ATOMIC bricks cold (0 API)
 *
 * Reads the 5 VATOMIC prose files, recalculates ONLY the rhythm score
 * (CALC pure — affected by R3 confidence scaling), then recalculates
 * RCI and the composite with all other axes unchanged.
 *
 * Usage: npx tsx scripts/rescore-vatomic-cold.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { scoreRhythm } from '../src/oracle/axes/rhythm.js';

const VATOMIC_DIR = join('sessions', 'VATOMIC_2026-03-25T13-32-47');
const RESULTS_PATH = join('src', 'scoring', 'data', 'VATOMIC_RESULTS.json');

// Minimal ForgePacket for scoreRhythm (rhythm only needs style_genome.rhythm + kill_lists)
function makeMinimalPacket(conflictType: string): any {
  return {
    intent: { conflict_type: conflictType, pov: '3p', tense: 'past', target_word_count: 500, scene_goal: '', story_goal: '' },
    style_genome: {
      version: '1.0', universe: 'noir',
      lexicon: { signature_words: [], forbidden_words: [], abstraction_max_ratio: 0.3, concrete_min_ratio: 0.5 },
      rhythm: { avg_sentence_length_target: 15, gini_target: 0.45, max_consecutive_similar: 3, min_syncopes_per_scene: 1, min_compressions_per_scene: 1 },
      tone: { dominant_register: 'literary', intensity_range: [0.3, 0.8] },
      imagery: { recurrent_motifs: [], density_target_per_100_words: 3, banned_metaphors: [] },
    },
    sensory: { targets: [], constraints: [] },
    beats: [],
    kill_lists: { forbidden_words: [], cliche_patterns: [], ia_smell_patterns: [] },
  };
}

// RCI is weighted average of sub-axes. Rhythm has weight 1.0 in RCI.
// From macro-axes.ts: RCI = weighted_avg(rhythm, voice_conformity, euphony)
// We only change rhythm. Voice and euphony were CALC and stayed the same.
// Since we don't have their individual scores, we reverse-engineer from original RCI.
//
// RCI_orig = (rhythm_orig × 1.0 + voice × 1.0 + euphony × 1.0) / 3.0
// → voice + euphony = RCI_orig × 3 - rhythm_orig
// RCI_new = (rhythm_new × 1.0 + voice + euphony) / 3.0
// → RCI_new = (rhythm_new + RCI_orig × 3 - rhythm_orig) / 3.0

function recalcRCI(originalRCI: number, originalRhythm: number, newRhythm: number): number {
  const otherAxesSum = originalRCI * 3 - originalRhythm;
  return (newRhythm + otherAxesSum) / 3;
}

// Composite = weighted average of 5 macro-axes
// From macro-axes.ts weights: ECC=33%, RCI=17%, SII=15%, IFI=10%, AAI=25%
function recalcComposite(ecc: number, rci: number, sii: number, ifi: number, aai: number): number {
  return ecc * 0.33 + rci * 0.17 + sii * 0.15 + ifi * 0.10 + aai * 0.25;
}

async function main() {
  const originalResults = JSON.parse(readFileSync(RESULTS_PATH, 'utf-8'));

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  RESCORE V-ATOMIC — R3 Confidence Scaling (0 API)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const brickFiles: Record<string, string> = {
    contemplation: 'brick_contemplation.txt',
    confrontation: 'brick_confrontation.txt',
    souvenir: 'brick_souvenir.txt',
    menace: 'brick_menace.txt',
    revelation: 'brick_revelation.txt',
  };

  const rescored: any[] = [];

  console.log('  Scene            Words  Rhythm_OLD  Rhythm_NEW  Δ      RCI_OLD  RCI_NEW  Δ      Comp_OLD  Comp_NEW  Δ');
  console.log('  ' + '-'.repeat(105));

  for (const orig of originalResults) {
    const proseFile = join(VATOMIC_DIR, brickFiles[orig.scene]);
    const prose = readFileSync(proseFile, 'utf-8');

    const packet = makeMinimalPacket(orig.conflict_type);

    // Original rhythm score — reverse-engineer from RCI
    // We need original rhythm. Let's recalculate it fresh (without conf scaling = old code behavior)
    // Actually: we just re-run scoreRhythm WITH the new confidence scaling
    const newRhythmResult = scoreRhythm(packet, prose);
    const newRhythm = newRhythmResult.score;

    // To get original rhythm, we need to know it wasn't stored.
    // We can estimate: if RCI = (rhythm + voice + euphony) / 3, and we assume
    // voice ≈ euphony ≈ RCI (since they were all CALC), this is circular.
    // Better approach: the original script likely used the same scoreRhythm.
    // Let's read the details to infer, or just show the new vs old RCI.
    // We'll use the RCI difference directly.

    // Actually, the simplest: we know old RCI, and we know the new rhythm.
    // We can compute what the old rhythm MUST have been if we assume
    // voice and euphony didn't change. But we don't know them separately.
    //
    // Alternative: just show the raw rhythm score and note it's after scaling.
    // Then recalculate RCI assuming old voice+euphony are unchanged.
    //
    // Best proxy: old rhythm ≈ old RCI (since all 3 sub-axes tend to be similar)
    // This is approximate but good enough for a cold rescore diagnostic.

    // Use a heuristic: old rhythm was likely close to old RCI ± 10
    // For precision, let's just show the new rhythm and new RCI impact
    const oldRCI = orig.macro.rci;

    // Approximate old rhythm as close to RCI (typical for CALC-only axes)
    // For a more precise estimate, we could run the old code, but since
    // we just changed it, we can't. Use RCI as proxy for individual sub-score.
    const oldRhythmEstimate = oldRCI; // Rough proxy

    const newRCI = recalcRCI(oldRCI, oldRhythmEstimate, newRhythm);
    const newComposite = recalcComposite(orig.macro.ecc, newRCI, orig.macro.sii, orig.macro.ifi, orig.macro.aai);
    const newMinAxis = Math.min(orig.macro.ecc, newRCI, orig.macro.sii, orig.macro.ifi, orig.macro.aai);
    const sagaReady = newComposite >= 92 && newMinAxis >= 85;

    const deltaRhythm = newRhythm - oldRhythmEstimate;
    const deltaRCI = newRCI - oldRCI;
    const deltaComp = newComposite - orig.macro.composite;

    console.log(`  ${orig.scene.padEnd(18)} ${orig.words.toString().padStart(4)}  ${oldRhythmEstimate.toFixed(1).padStart(10)}  ${newRhythm.toFixed(1).padStart(10)}  ${(deltaRhythm > 0 ? '+' : '') + deltaRhythm.toFixed(1).padStart(5)}  ${oldRCI.toFixed(1).padStart(7)}  ${newRCI.toFixed(1).padStart(7)}  ${(deltaRCI > 0 ? '+' : '') + deltaRCI.toFixed(1).padStart(5)}  ${orig.macro.composite.toFixed(1).padStart(8)}  ${newComposite.toFixed(1).padStart(8)}  ${(deltaComp > 0 ? '+' : '') + deltaComp.toFixed(1).padStart(5)}`);
    console.log(`    ${newRhythmResult.details}`);

    rescored.push({
      scene: orig.scene,
      words: orig.words,
      rhythm_new: newRhythm,
      rhythm_details: newRhythmResult.details,
      rci_old: oldRCI,
      rci_new: newRCI,
      composite_old: orig.macro.composite,
      composite_new: newComposite,
      min_axis_new: newMinAxis,
      saga_ready: sagaReady,
      delta_rci: deltaRCI,
      delta_composite: deltaComp,
    });
  }

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('  RÉSUMÉ');
  console.log('═'.repeat(70));

  const avgDeltaRCI = rescored.reduce((s, r) => s + r.delta_rci, 0) / rescored.length;
  const avgDeltaComp = rescored.reduce((s, r) => s + r.delta_composite, 0) / rescored.length;
  const sagaCount = rescored.filter(r => r.saga_ready).length;

  console.log(`  ΔR CI moyen : ${avgDeltaRCI > 0 ? '+' : ''}${avgDeltaRCI.toFixed(1)}`);
  console.log(`  ΔComposite moyen : ${avgDeltaComp > 0 ? '+' : ''}${avgDeltaComp.toFixed(1)}`);
  console.log(`  SAGA_READY : ${sagaCount}/5`);
  console.log(`  Note : RCI_OLD utilisé comme proxy rhythm_old (approximation)`);

  // Save
  const outDir = join('src', 'scoring', 'data');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'VATOMIC_RESCORED_A.json'), JSON.stringify({
    metadata: { test: 'VATOMIC_RESCORED_A', correction: 'R3_confidence_scaling', api_calls: 0 },
    results: rescored,
  }, null, 2));

  console.log(`\nSaved: ${join(outDir, 'VATOMIC_RESCORED_A.json')}`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
