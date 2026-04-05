/**
 * OMEGA — ETUDE TECHNIQUE INJECTION LOI D'ALTERNANCE v2
 * Bloc 0 (alignement metriques) + Phase 1 (A+B+C sur Menace)
 * Principes Rosetta. LOI L3 respectee. Pas de chiffres dans les prompts.
 *
 * Budget : ~15 API (3 variantes x 1 brique x ~5 API scoring)
 * Standard : NASA-Grade L4 / DO-178C Level A
 */

process.env.OMEGA_CHUNKED_V4 = '1';
process.env.OMEGA_PROMPT_V4 = '1';

import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import { generateSymbolMap } from '../src/symbol/symbol-mapper.js';
import { bridgeSignatureFromSymbolMap } from '../src/input/signature-bridge.js';
import { buildSovereignPrompt_V4 } from '../src/input/prompt-assembler-v4.js';
import { judgeAestheticV3 } from '../src/oracle/aesthetic-oracle.js';
import { forgePacketToSceneBrief } from '../src/generation/forge-to-brief.js';
import { computeQuickFeatures } from '../src/telemetry/pipeline-telemetry.js';
import type { ForgePacket, SovereignProvider } from '../src/types.js';
import type { SymbolMap } from '../src/symbol/symbol-map-types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ═══ HELPERS ═══

function correlation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return NaN;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  return Math.sqrt(dx * dy) === 0 ? 0 : num / Math.sqrt(dx * dy);
}

function countWords(t: string): number { return t.split(/\s+/).filter(w => w.length > 0).length; }

function dominant14D(emotion: string, weight = 0.50): Record<string, number> {
  const keys = ['joy','trust','fear','surprise','sadness','disgust','anger','anticipation','love','submission','awe','disapproval','remorse','contempt'];
  const r = (1 - weight) / 13;
  const d: Record<string, number> = {};
  for (const k of keys) d[k] = k === emotion ? weight : r;
  return d;
}

// ═══ MENACE PACKET ═══

function buildMenacePacket(): ForgePacket {
  return {
    packet_id: 'FORGE_alternance_menace', packet_hash: 'a'.repeat(64),
    scene_id: 'alternance_menace', run_id: `alternance_menace_${Date.now()}`,
    quality_tier: 'sovereign', language: 'fr',
    intent: { story_goal: 'La peur primitive et l\'instinct de survie', scene_goal: 'Elle comprend qu\'elle n\'est pas seule dans les bois', conflict_type: 'external', pov: 'third_limited', tense: 'past', target_word_count: 2500 },
    emotion_contract: {
      curve_quartiles: [
        { quartile: 'Q1', target_14d: dominant14D('anticipation'), valence: -0.1, arousal: 0.3, dominant: 'anticipation', narrative_instruction: 'Installation' },
        { quartile: 'Q2', target_14d: dominant14D('fear', 0.35), valence: -0.2, arousal: 0.4, dominant: 'fear', narrative_instruction: 'Montee' },
        { quartile: 'Q3', target_14d: dominant14D('fear'), valence: -0.4, arousal: 0.6, dominant: 'fear', narrative_instruction: 'Climax' },
        { quartile: 'Q4', target_14d: dominant14D('fear', 0.40), valence: -0.2, arousal: 0.3, dominant: 'fear', narrative_instruction: 'Resolution' },
      ],
      intensity_range: { min: 0.2, max: 0.6 },
      tension: { slope_target: 'arc', pic_position_pct: 0.65, faille_position_pct: 0.80, silence_zones: [] },
      terminal_state: { target_14d: dominant14D('fear', 0.40), valence: -0.2, arousal: 0.3, dominant: 'fear', reader_state: 'Resolution' },
      rupture: { exists: false, position_pct: 0, before_dominant: 'fear', after_dominant: 'fear', delta_valence: 0 },
      valence_arc: { start: -0.1, end: -0.2, direction: 'darkening' },
    },
    beats: [
      { beat_id: 'b1', beat_order: 0, action: 'Elle marche sur le sentier au crepuscule', dialogue: '', subtext_type: 'progression', emotion_instruction: '', sensory_tags: ['sight','sound'], canon_refs: [] },
      { beat_id: 'b2', beat_order: 1, action: 'Un bruit de branche cassee derriere elle', dialogue: '', subtext_type: 'progression', emotion_instruction: '', sensory_tags: ['sound'], canon_refs: [] },
      { beat_id: 'b3', beat_order: 2, action: 'Elle accelere, son coeur bat plus fort', dialogue: '', subtext_type: 'pivot', emotion_instruction: '', sensory_tags: ['touch','sound'], canon_refs: [] },
      { beat_id: 'b4', beat_order: 3, action: 'Elle atteint la lisiere', dialogue: '', subtext_type: 'progression', emotion_instruction: '', sensory_tags: ['sight'], canon_refs: [] },
    ],
    subtext: { layers: [{ layer_id: 'l1', type: 'absence', statement: 'Quelque chose manque', visibility: 'buried' }], tension_type: 'absence', tension_intensity: 0.4 },
    sensory: {
      density_target: 3,
      categories: [
        { category: 'sight', min_count: 2, signature_words: [] }, { category: 'sound', min_count: 2, signature_words: [] },
        { category: 'touch', min_count: 1, signature_words: [] }, { category: 'smell', min_count: 1, signature_words: [] },
        { category: 'taste', min_count: 0, signature_words: [] }, { category: 'proprioception', min_count: 0, signature_words: [] },
        { category: 'interoception', min_count: 1, signature_words: [] },
      ],
      recurrent_motifs: ['foret','crepuscule','ombre'], banned_metaphors: [],
    },
    style_genome: {
      version: '1.0.0', universe: 'literary_fiction',
      lexicon: { signature_words: ['ombre','branche','souffle','silence','froid','terre','pas','nuit','peau','sang'], forbidden_words: ['soudainement','mysterieusement','bizarrement'], abstraction_max_ratio: 0.20, concrete_min_ratio: 0.60 },
      rhythm: { avg_sentence_length_target: 18, gini_target: 0.45, max_consecutive_similar: 2, min_syncopes_per_scene: 2, min_compressions_per_scene: 1 },
      tone: { dominant_register: 'soutenu', intensity_range: [0.2, 0.6] },
      imagery: { recurrent_motifs: ['foret','crepuscule','ombre'], density_target_per_100_words: 3, banned_metaphors: [] },
    },
    kill_lists: { banned_words: ['soudain','soudainement','mysterieusement'], banned_cliches: ['coeur de pierre','mer d\'emotions','silence assourdissant'], banned_ai_patterns: ['il ne pouvait s\'empecher de','une vague de','un frisson parcourut'], banned_filter_words: ['effectivement','neanmoins','toutefois'] },
    canon: [], continuity: { previous_scene_summary: '', character_states: [], open_threads: [] },
    seeds: { llm_seed: 'alternance_menace', determinism_level: 'absolute' },
    generation: { timestamp: new Date().toISOString(), generator_version: '4.0.0', constraints_hash: 'b'.repeat(64) },
  } as ForgePacket;
}

// ═══ VARIANTE SYSTEM PROMPTS ═══

const SYSTEM_PROMPT_BASELINE = (mode: string, seed: string) =>
  `You are a master prose writer. Écris EXCLUSIVEMENT en français littéraire premium — niveau prix Goncourt. Zéro anglais. Prose émotionnellement résonnante, sensoriellement riche, narrativement dense. Mode: ${mode}. Seed: ${seed}`;

const SYSTEM_PROMPT_ENRICHI = (mode: string, seed: string) =>
  `Tu es un écrivain de fiction littéraire française, héritier de Flaubert et Claude Simon. Ta signature : l'ALTERNANCE entre la nappe ample qui déroule ses incises et subordonnées, et la coupe nette qui tombe comme une porte. Tu ne laisses JAMAIS une série de phrases longues sans y intercaler un verdict bref. Tu ne laisses JAMAIS une rafale de phrases courtes sans y glisser une respiration ample. Chaque paragraphe contient les deux. Prose émotionnellement résonnante, sensoriellement riche, narrativement dense. Zéro anglais. Mode: ${mode}. Seed: ${seed}`;

// ═══ EXEMPLAR ALTERNANT ═══

// Construit a partir du GE-SAGA-01 qui montre deja de l'alternance naturelle
// + renforcement du pattern LONG-COURT-LONG-COURT
const EXEMPLAR_ALTERNANT = `Le sentier s'enfonçait sous les branches basses, et ses pas soulevaient de la terre humide cette odeur de mousse et de champignon pourrissant qui montait jusqu'à ses narines tandis que la lumière déclinait entre les troncs serrés, filtrant en lames obliques qui découpaient l'obscurité naissante avec cette précision géométrique que seuls les crépuscules de novembre savent produire. Quelque chose craqua. Ses doigts se refermèrent sur l'écorce d'un bouleau, et elle sentit sous ses ongles la peau froide de l'arbre qui s'effritait. La forêt respirait autour d'elle — cette respiration lente et massive des sous-bois quand le jour capitule, quand les dernières mésanges se taisent et que commence le règne silencieux des choses sans nom qui peuplent l'intervalle entre chien et loup. Elle ne bougea plus. Le bruit avait cessé, mais l'air restait épais, chargé de cette tension sourde qu'elle connaissait depuis l'enfance — celle qui précède la pluie, ou le malheur.`;

// ═══ MAIN ═══

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA — ETUDE ALTERNANCE v2 : Bloc 0 + Phase 1 (A+B+C sur Menace)');
  console.log('  LOI L3 : pas de chiffres dans les prompts actifs');
  console.log('═══════════════════════════════════════════════════════════════════════');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1); }

  const sessionDir = path.join('sessions', `ALTERNANCE_STUDY_${new Date().toISOString().replace(/[:.]/g, '-').slice(0,19)}`);
  fs.mkdirSync(sessionDir, { recursive: true });

  // ═══════════════════════════════════════════════════════════════════════
  // BLOC 0 — ALIGNEMENT DES METRIQUES
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n═══ BLOC 0 — ALIGNEMENT DES METRIQUES ═══\n');

  // Charger les donnees OMEGA existantes
  interface OmegaPoint { f26b: number; f1a: number; rci: number; cv: number; words: number }
  const omegaPoints: OmegaPoint[] = [];

  // Audit causal — has features AND scores
  const audit = JSON.parse(fs.readFileSync(path.join('sessions/AUDIT_CAUSAL_2026-03-26T19-34-04/audit_results.json'), 'utf-8'));
  for (const [_, data] of Object.entries(audit.blocA?.data ?? {})) {
    const d = data as any;
    omegaPoints.push({ f26b: d.features.f26b_long_sent_rate, f1a: d.features.f1a_rhythm_variance, rci: d.scores.RCI, cv: d.features.cv_sent, words: d.words });
  }
  for (const [_, data] of Object.entries(audit.blocB?.data ?? {})) {
    const d = data as any;
    for (const w of d.windows) {
      omegaPoints.push({ f26b: w.features.f26b_long_sent_rate, f1a: w.features.f1a_rhythm_variance, rci: w.scores.RCI, cv: w.features.cv_sent, words: w.words });
    }
  }

  if (omegaPoints.length >= 3) {
    const r_f26b_f1a = correlation(omegaPoints.map(p => p.f26b), omegaPoints.map(p => p.f1a));
    const r_f26b_rci = correlation(omegaPoints.map(p => p.f26b), omegaPoints.map(p => p.rci));
    const r_f26b_cv = correlation(omegaPoints.map(p => p.f26b), omegaPoints.map(p => p.cv));
    const r_f1a_rci = correlation(omegaPoints.map(p => p.f1a), omegaPoints.map(p => p.rci));

    console.log(`  Donnees OMEGA: ${omegaPoints.length} points`);
    console.log(`  r(f26b, f1a)  = ${r_f26b_f1a.toFixed(3)}   ← conflit dans le TEXTE ?`);
    console.log(`  r(f26b, RCI)  = ${r_f26b_rci.toFixed(3)}   ← conflit dans le SCORER ?`);
    console.log(`  r(f26b, cv)   = ${r_f26b_cv.toFixed(3)}`);
    console.log(`  r(f1a, RCI)   = ${r_f1a_rci.toFixed(3)}`);
    console.log(`  Rappel: r(f26b, f1a) sur CORPUS MAITRES = +0.840`);

    if (r_f26b_f1a < -0.3) {
      console.log(`\n  VERDICT: Conflit dans le TEXTE confirme (r=${r_f26b_f1a.toFixed(3)} < -0.3)`);
      console.log('  → L\'etude d\'injection est JUSTIFIEE');
    } else if (r_f26b_rci < -0.3) {
      console.log(`\n  VERDICT: Conflit dans le SCORER (r_f26b_rci=${r_f26b_rci.toFixed(3)}), PAS dans le texte`);
      console.log('  → L\'injection peut quand meme aider (meilleur texte = meilleur score)');
    } else {
      console.log('\n  VERDICT: Pas de conflit fort detecte');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 1 — TEST A + B + C SUR MENACE
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n═══ PHASE 1 — VARIANTES A + B + C SUR MENACE ═══\n');

  const provider = createAnthropicProvider({
    apiKey, model: 'claude-sonnet-4-20250514',
    judgeStable: false, draftTemperature: 0.75,
    judgeTemperature: 0.0, judgeTopP: 1.0, judgeMaxTokens: 2000,
  });

  const packet = buildMenacePacket();
  const symbolMap = await generateSymbolMap(packet, provider);
  const enrichedPacket = bridgeSignatureFromSymbolMap(packet, symbolMap);
  const promptObj = buildSovereignPrompt_V4(enrichedPacket, symbolMap);
  const promptText = promptObj.sections.map(s => s.content).join('\n\n');

  interface VariantResult {
    name: string;
    prose: string;
    words: number;
    f26b: number;
    f1a: number;
    f17: number;
    cv: number;
    mean_sent: number;
    para_count: number;
    composite: number;
    min_axis: number;
    ECC: number;
    RCI: number;
    SII: number;
    IFI: number;
    AAI: number;
    alternance_observed: string;
  }

  const results: VariantResult[] = [];

  // Helper: generate + score a variant
  async function testVariant(
    name: string,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<VariantResult> {
    console.log(`  --- Variante ${name} ---`);

    // Generate draft with custom system prompt
    const prose = await provider.generateDraft(userPrompt, 'sensoriel_dense', `alternance_${name}`);
    const words = countWords(prose);
    const f = computeQuickFeatures(prose);

    // Score with MacroSScore
    const ms = await judgeAestheticV3(enrichedPacket, prose, provider, symbolMap);

    // Check alternance: count transitions long->short and short->long
    const sentences = prose.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
    const sentLens = sentences.map(s => s.split(/\s+/).length);
    let transitions = 0;
    for (let i = 1; i < sentLens.length; i++) {
      const prev = sentLens[i-1];
      const curr = sentLens[i];
      if ((prev > 30 && curr < 12) || (prev < 12 && curr > 30)) transitions++;
    }
    const alternance = transitions >= 4 ? 'OUI' : transitions >= 2 ? 'PARTIEL' : 'NON';

    const result: VariantResult = {
      name, prose, words,
      f26b: f.f26b_long_sent_rate, f1a: f.f1a_rhythm_variance,
      f17: f.f17_knife_count, cv: f.cv_sent, mean_sent: f.f1_mean_sent_len,
      para_count: f.paragraph_count,
      composite: ms.composite, min_axis: ms.min_axis,
      ECC: ms.ecc_score, RCI: ms.macro_axes.rci.score,
      SII: ms.macro_axes.sii.score, IFI: ms.macro_axes.ifi.score,
      AAI: ms.macro_axes.aai.score,
      alternance_observed: `${alternance} (${transitions} transitions)`,
    };

    console.log(`  Words=${words} f26b=${f.f26b_long_sent_rate.toFixed(3)} f17=${f.f17_knife_count} f1a=${f.f1a_rhythm_variance.toFixed(1)} cv=${f.cv_sent.toFixed(3)} mean=${f.f1_mean_sent_len.toFixed(1)}`);
    console.log(`  Comp=${ms.composite.toFixed(1)} min=${ms.min_axis.toFixed(1)} ECC=${ms.ecc_score.toFixed(1)} RCI=${ms.macro_axes.rci.score.toFixed(1)} SII=${ms.macro_axes.sii.score.toFixed(1)} IFI=${ms.macro_axes.ifi.score.toFixed(1)} AAI=${ms.macro_axes.aai.score.toFixed(1)}`);
    console.log(`  Alternance: ${result.alternance_observed}`);

    // Save prose
    fs.writeFileSync(path.join(sessionDir, `prose_${name}.txt`), prose);

    return result;
  }

  // --- Variante A: BASELINE ---
  results.push(await testVariant('A_baseline', SYSTEM_PROMPT_BASELINE('sensoriel_dense', 'alternance_A'), promptText));
  await new Promise(r => setTimeout(r, 3000));

  // --- Variante B: EXEMPLAR ALTERNANT ---
  // Inject the alternant exemplar into the prompt
  const promptB = promptText.replace(
    /Exemple du niveau de qualité attendu :\n«[\s\S]*?»/,
    `Exemple du niveau de qualité attendu :\n« ${EXEMPLAR_ALTERNANT} »`
  );
  // If no exemplar was found, append it
  const promptBFinal = promptB.includes(EXEMPLAR_ALTERNANT.slice(0, 30))
    ? promptB
    : promptText + `\n\nExemple du niveau de qualité attendu — ALTERNANCE :\n« ${EXEMPLAR_ALTERNANT} »`;
  results.push(await testVariant('B_exemplar', SYSTEM_PROMPT_BASELINE('sensoriel_dense', 'alternance_B'), promptBFinal));
  await new Promise(r => setTimeout(r, 3000));

  // --- Variante C: SYSTEM PROMPT ENRICHI ---
  results.push(await testVariant('C_sysprompt', SYSTEM_PROMPT_ENRICHI('sensoriel_dense', 'alternance_C'), promptText));

  // ═══ TABLEAU COMPARATIF ═══

  console.log('\n═══ TABLEAU COMPARATIF PHASE 1 ═══\n');
  console.log('  Variante       Words  f26b   f17  f1a    cv     mean   Para  Comp   min   ECC   RCI   SII   IFI   AAI   Altern');
  console.log('  ' + '─'.repeat(120));

  for (const r of results) {
    console.log(
      `  ${r.name.padEnd(14)} ${String(r.words).padStart(5)} ${r.f26b.toFixed(3).padStart(6)} ${String(r.f17).padStart(4)} ${r.f1a.toFixed(1).padStart(5)} ${r.cv.toFixed(3).padStart(6)} ${r.mean_sent.toFixed(1).padStart(6)} ${String(r.para_count).padStart(4)} ${r.composite.toFixed(1).padStart(5)} ${r.min_axis.toFixed(1).padStart(5)} ${r.ECC.toFixed(1).padStart(5)} ${r.RCI.toFixed(1).padStart(5)} ${r.SII.toFixed(1).padStart(5)} ${r.IFI.toFixed(1).padStart(5)} ${r.AAI.toFixed(1).padStart(5)}   ${r.alternance_observed}`
    );
  }

  // ═══ CRITERE DE SUCCES ═══

  console.log('\n═══ CRITERE DE SUCCES ═══\n');
  const baseline = results.find(r => r.name === 'A_baseline')!;

  for (const r of results) {
    if (r.name === 'A_baseline') continue;
    const f17ok = r.f17 >= 4;
    const f26bok = r.f26b >= baseline.f26b - 0.01;
    const f1aok = r.f1a >= baseline.f1a - 1;
    const rciok = r.RCI >= baseline.RCI - 2;
    const eccok = r.ECC >= baseline.ECC - 2;
    const success = f17ok && f26bok && f1aok && rciok && eccok && r.alternance_observed.startsWith('OUI');

    console.log(`  ${r.name}: f17>=${4}=${f17ok?'OK':'FAIL'} f26b>=${baseline.f26b.toFixed(3)}=${f26bok?'OK':'FAIL'} f1a>=${(baseline.f1a-1).toFixed(1)}=${f1aok?'OK':'FAIL'} RCI>=${(baseline.RCI-2).toFixed(1)}=${rciok?'OK':'FAIL'} ECC>=${(baseline.ECC-2).toFixed(1)}=${eccok?'OK':'FAIL'} alt=${r.alternance_observed.split(' ')[0]}`);
    console.log(`    → ${success ? 'SUCCES' : 'ECHEC'}`);
  }

  // ═══ VERDICT ═══

  const bestVariant = results.slice(1).sort((a, b) => {
    // Score = composite + bonus for alternance
    const scoreA = a.composite + (a.f17 >= 4 ? 2 : 0) + (a.alternance_observed.startsWith('OUI') ? 3 : 0);
    const scoreB = b.composite + (b.f17 >= 4 ? 2 : 0) + (b.alternance_observed.startsWith('OUI') ? 3 : 0);
    return scoreB - scoreA;
  })[0];

  console.log(`\n  MEILLEURE VARIANTE Phase 1 : ${bestVariant.name}`);
  console.log(`    Composite: ${bestVariant.composite.toFixed(1)} (baseline: ${baseline.composite.toFixed(1)}, delta: ${(bestVariant.composite - baseline.composite).toFixed(1)})`);
  console.log(`    f17: ${bestVariant.f17} (baseline: ${baseline.f17})`);
  console.log(`    f26b: ${bestVariant.f26b.toFixed(3)} (baseline: ${baseline.f26b.toFixed(3)})`);
  console.log(`    Alternance: ${bestVariant.alternance_observed}`);

  console.log('\n═══════════════════════════════════════════════════════════════════════');

  // Save results
  fs.writeFileSync(path.join(sessionDir, 'phase1_results.json'), JSON.stringify(results.map(r => ({
    name: r.name, words: r.words, f26b: r.f26b, f17: r.f17, f1a: r.f1a,
    cv: r.cv, mean_sent: r.mean_sent, para_count: r.para_count,
    composite: r.composite, min_axis: r.min_axis,
    ECC: r.ECC, RCI: r.RCI, SII: r.SII, IFI: r.IFI, AAI: r.AAI,
    alternance: r.alternance_observed,
  })), null, 2));
  console.log(`\nSaved: ${sessionDir}/`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
