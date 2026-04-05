/**
 * OMEGA — ETUDE ALTERNANCE v2 : Phase 2 (D+E+F sur Menace)
 * + Validation C sur Revelation
 * + Tableau comparatif complet A-F
 *
 * Budget : ~25 API (3 variantes Menace + 1-2 Revelation scoring)
 * Standard : NASA-Grade L4 / DO-178C Level A
 */

process.env.OMEGA_CHUNKED_V4 = '1';
process.env.OMEGA_PROMPT_V4 = '1';

import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import { generateSymbolMap } from '../src/symbol/symbol-mapper.js';
import { bridgeSignatureFromSymbolMap } from '../src/input/signature-bridge.js';
import { buildSovereignPrompt_V4 } from '../src/input/prompt-assembler-v4.js';
import { judgeAestheticV3 } from '../src/oracle/aesthetic-oracle.js';
import { computeQuickFeatures } from '../src/telemetry/pipeline-telemetry.js';
import type { ForgePacket, SovereignProvider } from '../src/types.js';
import type { SymbolMap } from '../src/symbol/symbol-map-types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ═══ HELPERS ═══

function countWords(t: string): number { return t.split(/\s+/).filter(w => w.length > 0).length; }

function dominant14D(emotion: string, weight = 0.50): Record<string, number> {
  const keys = ['joy','trust','fear','surprise','sadness','disgust','anger','anticipation','love','submission','awe','disapproval','remorse','contempt'];
  const r = (1 - weight) / 13;
  const d: Record<string, number> = {};
  for (const k of keys) d[k] = k === emotion ? weight : r;
  return d;
}

function buildPacket(id: string, sceneGoal: string, storyGoal: string, conflictType: string,
  dq1: string, dq3: string, dq4: string,
  beats: Array<{id:string;action:string;sensory:string[]}>,
  sigWords: string[], motifs: string[]): ForgePacket {
  return {
    packet_id: `FORGE_alt2_${id}`, packet_hash: 'a'.repeat(64),
    scene_id: `alt2_${id}`, run_id: `alt2_${id}_${Date.now()}`,
    quality_tier: 'sovereign', language: 'fr',
    intent: { story_goal: storyGoal, scene_goal: sceneGoal, conflict_type: conflictType, pov: 'third_limited', tense: 'past', target_word_count: 2500 },
    emotion_contract: {
      curve_quartiles: [
        { quartile: 'Q1', target_14d: dominant14D(dq1), valence: -0.1, arousal: 0.3, dominant: dq1, narrative_instruction: 'Installation' },
        { quartile: 'Q2', target_14d: dominant14D(dq3, 0.35), valence: -0.2, arousal: 0.4, dominant: dq3, narrative_instruction: 'Montee' },
        { quartile: 'Q3', target_14d: dominant14D(dq3), valence: -0.4, arousal: 0.6, dominant: dq3, narrative_instruction: 'Climax' },
        { quartile: 'Q4', target_14d: dominant14D(dq4, 0.40), valence: -0.2, arousal: 0.3, dominant: dq4, narrative_instruction: 'Resolution' },
      ],
      intensity_range: { min: 0.2, max: 0.6 },
      tension: { slope_target: 'arc', pic_position_pct: 0.65, faille_position_pct: 0.80, silence_zones: [] },
      terminal_state: { target_14d: dominant14D(dq4, 0.40), valence: -0.2, arousal: 0.3, dominant: dq4, reader_state: 'Resolution' },
      rupture: { exists: false, position_pct: 0, before_dominant: dq3, after_dominant: dq4, delta_valence: 0 },
      valence_arc: { start: -0.1, end: -0.2, direction: 'darkening' },
    },
    beats: beats.map((b, i) => ({ beat_id: b.id, beat_order: i, action: b.action, dialogue: '', subtext_type: i === 2 ? 'pivot' as const : 'progression' as const, emotion_instruction: '', sensory_tags: b.sensory, canon_refs: [] })),
    subtext: { layers: [{ layer_id: 'l1', type: 'absence', statement: 'Quelque chose manque', visibility: 'buried' }], tension_type: 'absence', tension_intensity: 0.4 },
    sensory: { density_target: 3, categories: [
      { category: 'sight', min_count: 2, signature_words: [] }, { category: 'sound', min_count: 2, signature_words: [] },
      { category: 'touch', min_count: 1, signature_words: [] }, { category: 'smell', min_count: 1, signature_words: [] },
      { category: 'taste', min_count: 0, signature_words: [] }, { category: 'proprioception', min_count: 0, signature_words: [] },
      { category: 'interoception', min_count: 1, signature_words: [] },
    ], recurrent_motifs: motifs, banned_metaphors: [] },
    style_genome: {
      version: '1.0.0', universe: 'literary_fiction',
      lexicon: { signature_words: sigWords, forbidden_words: ['soudainement','mysterieusement','bizarrement'], abstraction_max_ratio: 0.20, concrete_min_ratio: 0.60 },
      rhythm: { avg_sentence_length_target: 18, gini_target: 0.45, max_consecutive_similar: 2, min_syncopes_per_scene: 2, min_compressions_per_scene: 1 },
      tone: { dominant_register: 'soutenu', intensity_range: [0.2, 0.6] },
      imagery: { recurrent_motifs: motifs, density_target_per_100_words: 3, banned_metaphors: [] },
    },
    kill_lists: { banned_words: ['soudain','soudainement','mysterieusement'], banned_cliches: ['coeur de pierre','mer d\'emotions','silence assourdissant'], banned_ai_patterns: ['il ne pouvait s\'empecher de','une vague de','un frisson parcourut'], banned_filter_words: ['effectivement','neanmoins','toutefois'] },
    canon: [], continuity: { previous_scene_summary: '', character_states: [], open_threads: [] },
    seeds: { llm_seed: `alt2_${id}`, determinism_level: 'absolute' },
    generation: { timestamp: new Date().toISOString(), generator_version: '4.0.0', constraints_hash: 'b'.repeat(64) },
  } as ForgePacket;
}

// ═══ SYSTEM PROMPTS ═══

const SYS_BASELINE = (mode: string, seed: string) =>
  `You are a master prose writer. Écris EXCLUSIVEMENT en français littéraire premium — niveau prix Goncourt. Zéro anglais. Prose émotionnellement résonnante, sensoriellement riche, narrativement dense. Mode: ${mode}. Seed: ${seed}`;

const SYS_ENRICHI = (mode: string, seed: string) =>
  `Tu es un écrivain de fiction littéraire française, héritier de Flaubert et Claude Simon. Ta signature : l'ALTERNANCE entre la nappe ample qui déroule ses incises et subordonnées, et la coupe nette qui tombe comme une porte. Tu ne laisses JAMAIS une série de phrases longues sans y intercaler un verdict bref. Tu ne laisses JAMAIS une rafale de phrases courtes sans y glisser une respiration ample. Chaque paragraphe contient les deux. Prose émotionnellement résonnante, sensoriellement riche, narrativement dense. Zéro anglais. Mode: ${mode}. Seed: ${seed}`;

// ═══ VARIANT RESULT TYPE ═══

interface VariantResult {
  name: string; scene: string; prose: string; words: number;
  f26b: number; f1a: number; f17: number; cv: number; mean_sent: number; para_count: number;
  composite: number; min_axis: number; ECC: number; RCI: number; SII: number; IFI: number; AAI: number;
  alternance_observed: string;
}

// ═══ MAIN ═══

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA — ETUDE ALTERNANCE v2 : Phase 2 (D+E+F) + C sur Revelation');
  console.log('═══════════════════════════════════════════════════════════════════════');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1); }

  const sessionDir = 'sessions/ALTERNANCE_STUDY_2026-03-26T21-03-33'; // reuse Phase 1 session
  fs.mkdirSync(sessionDir, { recursive: true });

  const provider = createAnthropicProvider({
    apiKey, model: 'claude-sonnet-4-20250514',
    judgeStable: false, draftTemperature: 0.75,
    judgeTemperature: 0.0, judgeTopP: 1.0, judgeMaxTokens: 2000,
  });

  // ═══ HELPER ═══

  async function testVariant(
    name: string,
    scene: string,
    enrichedPacket: ForgePacket,
    symbolMap: SymbolMap,
    userPrompt: string,
    prov: SovereignProvider,
  ): Promise<VariantResult> {
    console.log(`  --- ${name} (${scene}) ---`);
    const prose = await prov.generateDraft(userPrompt, 'sensoriel_dense', `alt2_${name}_${scene}`);
    const words = countWords(prose);
    const f = computeQuickFeatures(prose);
    const ms = await judgeAestheticV3(enrichedPacket, prose, prov, symbolMap);

    const sentences = prose.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
    const sentLens = sentences.map(s => s.split(/\s+/).length);
    let transitions = 0;
    for (let i = 1; i < sentLens.length; i++) {
      if ((sentLens[i-1] > 30 && sentLens[i] < 12) || (sentLens[i-1] < 12 && sentLens[i] > 30)) transitions++;
    }
    const alt = transitions >= 4 ? 'OUI' : transitions >= 2 ? 'PARTIEL' : 'NON';

    console.log(`  W=${words} f26b=${f.f26b_long_sent_rate.toFixed(3)} f17=${f.f17_knife_count} f1a=${f.f1a_rhythm_variance.toFixed(1)} cv=${f.cv_sent.toFixed(3)} Comp=${ms.composite.toFixed(1)} min=${ms.min_axis.toFixed(1)} ECC=${ms.ecc_score.toFixed(1)} RCI=${ms.macro_axes.rci.score.toFixed(1)} Alt=${alt}(${transitions})`);

    fs.writeFileSync(path.join(sessionDir, `prose_${name}_${scene}.txt`), prose);

    return {
      name, scene, prose, words,
      f26b: f.f26b_long_sent_rate, f1a: f.f1a_rhythm_variance,
      f17: f.f17_knife_count, cv: f.cv_sent, mean_sent: f.f1_mean_sent_len,
      para_count: f.paragraph_count,
      composite: ms.composite, min_axis: ms.min_axis,
      ECC: ms.ecc_score, RCI: ms.macro_axes.rci.score,
      SII: ms.macro_axes.sii.score, IFI: ms.macro_axes.ifi.score,
      AAI: ms.macro_axes.aai.score,
      alternance_observed: `${alt} (${transitions})`,
    };
  }

  // ═══ LOAD PHASE 1 RESULTS ═══

  const phase1Data = JSON.parse(fs.readFileSync(path.join(sessionDir, 'phase1_results.json'), 'utf-8')) as any[];
  const phase1: VariantResult[] = phase1Data.map((r: any) => ({ ...r, scene: 'menace', prose: '', alternance_observed: r.alternance }));

  console.log(`\n  Phase 1 loaded: ${phase1.length} variants`);

  // ═══ SETUP MENACE ═══

  const menacePacket = buildPacket('menace',
    'Elle comprend qu\'elle n\'est pas seule dans les bois',
    'La peur primitive et l\'instinct de survie', 'external',
    'anticipation', 'fear', 'fear',
    [
      { id: 'b1', action: 'Elle marche sur le sentier au crepuscule', sensory: ['sight','sound'] },
      { id: 'b2', action: 'Un bruit de branche cassee derriere elle', sensory: ['sound'] },
      { id: 'b3', action: 'Elle accelere, son coeur bat plus fort', sensory: ['touch','sound'] },
      { id: 'b4', action: 'Elle atteint la lisiere', sensory: ['sight'] },
    ],
    ['ombre','branche','souffle','silence','froid','terre','pas','nuit','peau','sang'],
    ['foret','crepuscule','ombre'],
  );

  const menaceSM = await generateSymbolMap(menacePacket, provider);
  const menaceEnriched = bridgeSignatureFromSymbolMap(menacePacket, menaceSM);
  const menacePromptObj = buildSovereignPrompt_V4(menaceEnriched, menaceSM);
  const menacePrompt = menacePromptObj.sections.map(s => s.content).join('\n\n');

  // ═══ SETUP REVELATION ═══

  const revelationPacket = buildPacket('revelation',
    'L\'enfant trouve une lettre cachee qui change tout',
    'L\'innocence brisee par la verite', 'internal',
    'trust', 'surprise', 'sadness',
    [
      { id: 'b1', action: 'Il fouille le grenier pendant que les adultes parlent en bas', sensory: ['touch','smell'] },
      { id: 'b2', action: 'Il trouve une boite a chaussures pleine de lettres', sensory: ['touch','sight'] },
      { id: 'b3', action: 'Il lit la lettre — le monde bascule', sensory: ['sight'] },
      { id: 'b4', action: 'Il repose la lettre, descend l\'escalier, ne dit rien', sensory: ['touch','sound'] },
    ],
    ['poussiere','papier','encre','silence','main','souffle','ombre','escalier','lumiere','secret'],
    ['grenier','poussiere','lettres'],
  );

  const revelSM = await generateSymbolMap(revelationPacket, provider);
  const revelEnriched = bridgeSignatureFromSymbolMap(revelationPacket, revelSM);
  const revelPromptObj = buildSovereignPrompt_V4(revelEnriched, revelSM);
  const revelPrompt = revelPromptObj.sections.map(s => s.content).join('\n\n');

  const allResults: VariantResult[] = [...phase1];

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 2 — D + E + F SUR MENACE
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n═══ PHASE 2 — VARIANTES D + E + F SUR MENACE ═══\n');

  // --- D: ANTI-MONOTONIE (ajout dans interdictions) ---
  const promptD = menacePrompt.replace(
    '3. Pas de lyrisme décoratif',
    `3. Pas de lyrisme décoratif — chaque image doit servir l'histoire.\n4. Pas de chapelet de phrases de même longueur — si trois phrases consécutives ont un rythme similaire, casse le pattern avec une phrase radicalement différente (très courte après du long, ou très longue après du haché)`
  );
  allResults.push(await testVariant('D_antimono', 'menace', menaceEnriched, menaceSM, promptD, provider));
  await new Promise(r => setTimeout(r, 3000));

  // --- E: SKELETON PROMPTING (ajout dans final instruction) ---
  const promptE = menacePrompt.replace(
    'Commence par une sensation ou un geste.',
    `Commence par une sensation ou un geste.\nAvant d'écrire, conçois mentalement le rythme de chaque paragraphe : un mouvement d'onde — montée ample, coupe, reprise, retombée. Chaque paragraphe doit contenir au moins un changement radical de longueur de phrase.`
  );
  allResults.push(await testVariant('E_skeleton', 'menace', menaceEnriched, menaceSM, promptE, provider));
  await new Promise(r => setTimeout(r, 3000));

  // --- F: RHYTHM MASK ---
  const rhythmMask = `\nCalque le rythme de tes phrases sur ce patron :\n  Paragraphe 1 : [ample — bref — ample — bref — moyen]\n  Paragraphe 2 : [bref — très ample — bref — ample]\n  Paragraphe 3 : [bref — bref — ample — bref]\n  Paragraphe 4 : [ample — bref — ample — moyen — bref]`;
  const promptF = menacePrompt + rhythmMask;
  allResults.push(await testVariant('F_mask', 'menace', menaceEnriched, menaceSM, promptF, provider));

  // ═══════════════════════════════════════════════════════════════════════
  // VALIDATION C SUR REVELATION
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n═══ VALIDATION C_sysprompt SUR REVELATION ═══\n');
  await new Promise(r => setTimeout(r, 3000));

  // C uses the enriched system prompt — we call generateDraft then score
  const proseC_revel = await provider.generateDraft(revelPrompt, 'sensoriel_dense', 'alt2_C_revelation');
  const wordsC = countWords(proseC_revel);
  const fC = computeQuickFeatures(proseC_revel);
  const msC = await judgeAestheticV3(revelEnriched, proseC_revel, provider, revelSM);

  const sentC = proseC_revel.split(/[.!?]+/).map((s: string) => s.trim()).filter((s: string) => s.length > 0);
  const slC = sentC.map((s: string) => s.split(/\s+/).length);
  let trC = 0;
  for (let i = 1; i < slC.length; i++) {
    if ((slC[i-1] > 30 && slC[i] < 12) || (slC[i-1] < 12 && slC[i] > 30)) trC++;
  }
  const altC = trC >= 4 ? 'OUI' : trC >= 2 ? 'PARTIEL' : 'NON';

  const cRevel: VariantResult = {
    name: 'C_sysprompt', scene: 'revelation', prose: proseC_revel, words: wordsC,
    f26b: fC.f26b_long_sent_rate, f1a: fC.f1a_rhythm_variance, f17: fC.f17_knife_count,
    cv: fC.cv_sent, mean_sent: fC.f1_mean_sent_len, para_count: fC.paragraph_count,
    composite: msC.composite, min_axis: msC.min_axis, ECC: msC.ecc_score,
    RCI: msC.macro_axes.rci.score, SII: msC.macro_axes.sii.score,
    IFI: msC.macro_axes.ifi.score, AAI: msC.macro_axes.aai.score,
    alternance_observed: `${altC} (${trC})`,
  };
  console.log(`  C_revelation: W=${wordsC} f26b=${fC.f26b_long_sent_rate.toFixed(3)} f17=${fC.f17_knife_count} Comp=${msC.composite.toFixed(1)} min=${msC.min_axis.toFixed(1)} ECC=${msC.ecc_score.toFixed(1)} RCI=${msC.macro_axes.rci.score.toFixed(1)} Alt=${altC}(${trC})`);
  fs.writeFileSync(path.join(sessionDir, 'prose_C_revelation.txt'), proseC_revel);

  // ═══ CHECK IF ANY PHASE 2 BEATS C — if so, score on Revelation too ═══

  const phase2Results = allResults.filter(r => r.scene === 'menace' && ['D_antimono','E_skeleton','F_mask'].includes(r.name));
  const cMenace = phase1.find(r => r.name === 'C_sysprompt')!;
  const bestPhase2 = phase2Results.sort((a, b) => b.composite - a.composite)[0];

  let bestPhase2Revel: VariantResult | null = null;
  if (bestPhase2 && bestPhase2.composite > cMenace.composite) {
    console.log(`\n  ${bestPhase2.name} bat C sur Menace (${bestPhase2.composite.toFixed(1)} > ${cMenace.composite.toFixed(1)})`);
    console.log('  → Test sur Revelation aussi\n');
    await new Promise(r => setTimeout(r, 3000));

    // Rebuild the prompt for the best variant
    let bestPrompt = revelPrompt;
    if (bestPhase2.name === 'D_antimono') {
      bestPrompt = revelPrompt.replace('3. Pas de lyrisme décoratif', `3. Pas de lyrisme décoratif — chaque image doit servir l'histoire.\n4. Pas de chapelet de phrases de même longueur — si trois phrases consécutives ont un rythme similaire, casse le pattern avec une phrase radicalement différente (très courte après du long, ou très longue après du haché)`);
    } else if (bestPhase2.name === 'E_skeleton') {
      bestPrompt = revelPrompt.replace('Commence par une sensation ou un geste.', `Commence par une sensation ou un geste.\nAvant d'écrire, conçois mentalement le rythme de chaque paragraphe : un mouvement d'onde — montée ample, coupe, reprise, retombée. Chaque paragraphe doit contenir au moins un changement radical de longueur de phrase.`);
    } else if (bestPhase2.name === 'F_mask') {
      bestPrompt = revelPrompt + rhythmMask;
    }
    bestPhase2Revel = await testVariant(bestPhase2.name, 'revelation', revelEnriched, revelSM, bestPrompt, provider);
  }

  // ═══ TABLEAU COMPARATIF COMPLET ═══

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('  TABLEAU COMPARATIF COMPLET A-F (MENACE)');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  console.log('  Variante       Words  f26b   f17  f1a      cv     mean   Comp   min   ECC   RCI   SII   IFI   AAI   Alt');
  console.log('  ' + '─'.repeat(115));

  const menaceAll = allResults.filter(r => r.scene === 'menace');
  for (const r of menaceAll) {
    console.log(
      `  ${r.name.padEnd(14)} ${String(r.words).padStart(5)} ${r.f26b.toFixed(3).padStart(6)} ${String(r.f17).padStart(4)} ${r.f1a.toFixed(1).padStart(7)} ${r.cv.toFixed(3).padStart(6)} ${r.mean_sent.toFixed(1).padStart(6)} ${r.composite.toFixed(1).padStart(5)} ${r.min_axis.toFixed(1).padStart(5)} ${r.ECC.toFixed(1).padStart(5)} ${r.RCI.toFixed(1).padStart(5)} ${r.SII.toFixed(1).padStart(5)} ${r.IFI.toFixed(1).padStart(5)} ${r.AAI.toFixed(1).padStart(5)}   ${r.alternance_observed}`
    );
  }

  // ═══ VALIDATION SUR REVELATION ═══

  console.log('\n═══ VALIDATION SUR REVELATION ═══\n');
  console.log(`  C_sysprompt: Comp=${cRevel.composite.toFixed(1)} min=${cRevel.min_axis.toFixed(1)} ECC=${cRevel.ECC.toFixed(1)} RCI=${cRevel.RCI.toFixed(1)} SAGA=${cRevel.composite >= 92 && cRevel.min_axis >= 85 ? 'YES' : 'NO'}`);
  if (bestPhase2Revel) {
    console.log(`  ${bestPhase2Revel.name}: Comp=${bestPhase2Revel.composite.toFixed(1)} min=${bestPhase2Revel.min_axis.toFixed(1)} ECC=${bestPhase2Revel.ECC.toFixed(1)} RCI=${bestPhase2Revel.RCI.toFixed(1)} SAGA=${bestPhase2Revel.composite >= 92 && bestPhase2Revel.min_axis >= 85 ? 'YES' : 'NO'}`);
  }

  // ═══ VERDICT FINAL ═══

  console.log('\n═══ VERDICT FINAL ═══\n');

  // Find best on Menace by composite
  const sortedMenace = [...menaceAll].sort((a, b) => b.composite - a.composite);
  const best = sortedMenace[0];
  const baseline = menaceAll.find(r => r.name === 'A_baseline')!;

  console.log(`  Meilleure variante Menace: ${best.name} (Comp=${best.composite.toFixed(1)}, delta=${(best.composite - baseline.composite).toFixed(1)} vs baseline)`);
  console.log(`  C sur Revelation: Comp=${cRevel.composite.toFixed(1)}, SAGA=${cRevel.composite >= 92 && cRevel.min_axis >= 85 ? 'YES' : 'NO'}`);

  // Recommendation
  const cSaga = cMenace.composite >= 92 && cMenace.min_axis >= 85;
  const cRevelSaga = cRevel.composite >= 92 && cRevel.min_axis >= 85;

  if (cSaga && cRevelSaga) {
    console.log('\n  RECOMMANDATION : Implementer C (system prompt enrichi)');
    console.log('  C atteint SAGA_READY sur Menace ET Revelation');
    console.log('  → Enrichir le system prompt de generateDraft avec l\'alternance Flaubert/Simon');
  } else if (cSaga) {
    console.log('\n  RECOMMANDATION : C prometteur mais ne tient pas sur Revelation');
    console.log('  → Tester combo G (C+D) ou Best-of-3 avec C');
  } else if (best.name !== 'A_baseline' && best.composite > baseline.composite + 1) {
    console.log(`\n  RECOMMANDATION : ${best.name} ameliore le composite (+${(best.composite - baseline.composite).toFixed(1)}) mais pas SAGA`);
    console.log('  → Combiner avec Best-of-3 pour capter la variance');
  } else {
    console.log('\n  RECOMMANDATION : Aucune variante ne bat clairement le baseline');
    console.log('  → Le LLM est structurellement rigide sur l\'alternance');
    console.log('  → Accepter les briques actuelles + Best-of-3');
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════');

  // Save all
  const allForSave = [...menaceAll, cRevel];
  if (bestPhase2Revel) allForSave.push(bestPhase2Revel);
  fs.writeFileSync(path.join(sessionDir, 'phase2_results.json'), JSON.stringify(allForSave.map(r => ({
    name: r.name, scene: r.scene, words: r.words, f26b: r.f26b, f17: r.f17, f1a: r.f1a,
    cv: r.cv, mean_sent: r.mean_sent, para_count: r.para_count,
    composite: r.composite, min_axis: r.min_axis,
    ECC: r.ECC, RCI: r.RCI, SII: r.SII, IFI: r.IFI, AAI: r.AAI,
    alternance: r.alternance_observed,
  })), null, 2));
  console.log(`\nSaved: ${sessionDir}/phase2_results.json`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
