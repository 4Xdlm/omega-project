/**
 * OMEGA — Rescore V-ATOMIC bricks cold (0 API) — Correction B
 *
 * Reads the 5 VATOMIC prose files, recalculates rhythm (raw CALC, no neutralization),
 * then recalculates RCI with confidence-scaled rhythm WEIGHT.
 *
 * Correction B: confidence affects the WEIGHT of rhythm in RCI, not its value.
 * "faible confiance = faible AUTORITÉ du signal, pas retour à la moyenne"
 *
 * Usage: npx tsx scripts/rescore-vatomic-cold.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { scoreRhythm, rhythmConfidence } from '../src/oracle/axes/rhythm.js';

const VATOMIC_DIR = join('sessions', 'VATOMIC_2026-03-25T13-32-47');
const RESULTS_PATH = join('src', 'scoring', 'data', 'VATOMIC_RESULTS.json');

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

// Simulated RCI recalculation with confidence-weighted rhythm.
// Original RCI sub-scores: rhythm (w=1.0), signature (w=1.0), hook_presence (w=0.20), euphony (w=1.0), voice (w=0 neutralized)
// With Correction B: rhythm gets w = 1.0 × conf instead of 1.0
// We don't have the individual sub-scores, so we reverse-engineer:
//   RCI_orig = (rhythm_orig × 1.0 + signature × 1.0 + hook × 0.20 + euphony × 1.0) / (1.0 + 1.0 + 0.20 + 1.0)
//   totalWeight_orig = 3.20
//   sum_others = RCI_orig × totalWeight_orig - rhythm_orig × 1.0
//   RCI_new = (rhythm_new × conf + sum_others) / (conf + 1.0 + 0.20 + 1.0)

function recalcRCI_B(originalRCI: number, rhythmNew: number, conf: number): number {
  const totalWeightOrig = 3.20; // 1.0 + 1.0 + 0.20 + 1.0 + 0 (voice neutralized)
  // We approximate original rhythm ≈ raw recalculated rhythm (since Correction A was reverted)
  // But we don't have the original rhythm isolated. Best proxy: use the raw rhythm score
  // since it's the same scorer code (no neutralization in either case now).
  // For the "others" sum, we use: sum_others = RCI_orig × totalWeight_orig - rhythm_orig × 1.0
  // Since we're re-running the same scorer, rhythmNew IS what rhythm_orig was before Correction A.
  const sumOthers = originalRCI * totalWeightOrig - rhythmNew * 1.0;
  const totalWeightNew = conf + 1.0 + 0.20 + 1.0; // rhythm conf + signature + hook + euphony
  return (rhythmNew * conf + sumOthers) / totalWeightNew;
}

function recalcComposite(ecc: number, rci: number, sii: number, ifi: number, aai: number): number {
  return ecc * 0.33 + rci * 0.17 + sii * 0.15 + ifi * 0.10 + aai * 0.25;
}

async function main() {
  const originalResults = JSON.parse(readFileSync(RESULTS_PATH, 'utf-8'));

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  RESCORE V-ATOMIC — Correction B : Confidence comme POIDS');
  console.log('  (0 API — rhythm raw CALC + weight scaling dans RCI)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const brickFiles: Record<string, string> = {
    contemplation: 'brick_contemplation.txt',
    confrontation: 'brick_confrontation.txt',
    souvenir: 'brick_souvenir.txt',
    menace: 'brick_menace.txt',
    revelation: 'brick_revelation.txt',
  };

  const rescored: any[] = [];

  console.log('  Scene            Words  Conf   Rhythm_RAW  w_eff  RCI_OLD  RCI_NEW   Δ     Comp_OLD  Comp_NEW   Δ');
  console.log('  ' + '-'.repeat(110));

  for (const orig of originalResults) {
    const proseFile = join(VATOMIC_DIR, brickFiles[orig.scene]);
    const prose = readFileSync(proseFile, 'utf-8');
    const packet = makeMinimalPacket(orig.conflict_type);

    // Raw rhythm (no neutralization — Correction B)
    const rhythmResult = scoreRhythm(packet, prose);
    const rhythmRaw = rhythmResult.score;

    // Confidence
    const wordCount = prose.split(/\s+/).filter(w => w.length > 0).length;
    const conf = rhythmConfidence(wordCount);

    // Effective weight
    const wEff = 1.0 * conf;

    // Recalculate RCI with confidence-weighted rhythm
    const oldRCI = orig.macro.rci;
    const newRCI = recalcRCI_B(oldRCI, rhythmRaw, conf);
    const newComposite = recalcComposite(orig.macro.ecc, newRCI, orig.macro.sii, orig.macro.ifi, orig.macro.aai);
    const newMinAxis = Math.min(orig.macro.ecc, newRCI, orig.macro.sii, orig.macro.ifi, orig.macro.aai);
    const sagaReady = newComposite >= 92 && newMinAxis >= 85;

    const deltaRCI = newRCI - oldRCI;
    const deltaComp = newComposite - orig.macro.composite;

    console.log(`  ${orig.scene.padEnd(18)} ${wordCount.toString().padStart(4)}   ${conf.toFixed(2)}   ${rhythmRaw.toFixed(1).padStart(10)}  ${wEff.toFixed(2)}   ${oldRCI.toFixed(1).padStart(7)}  ${newRCI.toFixed(1).padStart(7)}  ${(deltaRCI > 0 ? '+' : '') + deltaRCI.toFixed(1).padStart(5)}  ${orig.macro.composite.toFixed(1).padStart(8)}  ${newComposite.toFixed(1).padStart(8)}  ${(deltaComp > 0 ? '+' : '') + deltaComp.toFixed(1).padStart(5)}`);
    console.log(`    ${rhythmResult.details}`);

    rescored.push({
      scene: orig.scene,
      words: wordCount,
      conf_r3: conf,
      rhythm_raw: rhythmRaw,
      w_eff: wEff,
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
  console.log('  RÉSUMÉ — Correction B');
  console.log('═'.repeat(70));

  const avgDeltaRCI = rescored.reduce((s, r) => s + r.delta_rci, 0) / rescored.length;
  const avgDeltaComp = rescored.reduce((s, r) => s + r.delta_composite, 0) / rescored.length;
  const sagaCount = rescored.filter(r => r.saga_ready).length;
  const best = rescored.reduce((a, b) => b.composite_new > a.composite_new ? b : a);

  console.log(`  ΔRCI moyen     : ${avgDeltaRCI > 0 ? '+' : ''}${avgDeltaRCI.toFixed(1)}`);
  console.log(`  ΔComposite moy : ${avgDeltaComp > 0 ? '+' : ''}${avgDeltaComp.toFixed(1)}`);
  console.log(`  SAGA_READY     : ${sagaCount}/5`);
  console.log(`  Meilleur       : ${best.scene} (comp=${best.composite_new.toFixed(1)})`);
  console.log('');
  console.log('  Principe : raw rhythm inchangé, son POIDS dans RCI réduit pour textes courts');
  console.log('  Effet    : un mauvais rhythm court bloque MOINS le RCI');

  // Save
  const outDir = join('src', 'scoring', 'data');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'VATOMIC_RESCORED_B.json'), JSON.stringify({
    metadata: { test: 'VATOMIC_RESCORED_B', correction: 'confidence_as_weight', api_calls: 0 },
    results: rescored,
  }, null, 2));

  console.log(`\nSaved: ${join(outDir, 'VATOMIC_RESCORED_B.json')}`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
