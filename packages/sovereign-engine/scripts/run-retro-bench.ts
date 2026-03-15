/**
 * run-retro-bench.ts — Phase R : Bench RETRO PROMPT vs V3 STANDARD
 * 
 * Génère 2 scènes avec un prompt court retro-engineered (~287 tokens)
 * et 2 scènes avec le V3 standard (~15 476 tokens).
 * Score les 4 avec judgeAestheticV3() et compare.
 *
 * Usage :
 *   $env:ANTHROPIC_API_KEY = "sk-ant-..."
 *   npx tsx scripts/run-retro-bench.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSceneChain, type SceneChainConfig, type SceneChainReport } from '../src/cde/scene-chain.js';
import type { CDEInput } from '../src/cde/types.js';
import type { ForgePacketInput } from '../src/input/forge-packet-assembler.js';
import type { GenesisPlan, Scene } from '@omega/genesis-planner';
import type { StyleProfile, KillLists, ForgeContinuity } from '../src/types.js';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import { computeMinAxis } from '../src/utils/math-utils.js';
import { assembleForgePacket } from '../src/input/forge-packet-assembler.js';
import { generateSymbolMap } from '../src/symbol/symbol-mapper.js';
import { bridgeSignatureFromSymbolMap } from '../src/input/signature-bridge.js';
import { judgeAestheticV3 } from '../src/oracle/aesthetic-oracle.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MODEL = 'claude-sonnet-4-20250514';
const DRAFT_TEMPERATURE = 1.0;
const JUDGE_TEMPERATURE = 0.0;

// ── Scénarios ────────────────────────────────────────────────────────────────

const CDE_INPUT: CDEInput = {
  hot_elements: [
    { id: 'persona-marie', type: 'persona', priority: 9, content: 'Marie, 38 ans, medecin urgentiste, dissimule un secret' },
    { id: 'arc-pierre', type: 'arc', priority: 8, content: 'Pierre decouvre la trahison de Marie' },
    { id: 'tension-couple', type: 'tension', priority: 10, content: 'Le couple se dechire en silence depuis des mois' },
    { id: 'debt-promesse', type: 'debt', priority: 7, content: 'Marie a promis de tout dire avant la fin du mois' },
    { id: 'canon-lieu', type: 'canon', priority: 6, content: 'L action se passe a Lyon en hiver' },
  ],
  canon_facts: [
    { id: 'cf-marie-medecin', fact: 'Marie est medecin urgentiste a Lyon', sealed_at: '2026-01-01T00:00:00Z' },
    { id: 'cf-pierre-prof', fact: 'Pierre est professeur de philosophie', sealed_at: '2026-01-01T00:00:00Z' },
    { id: 'cf-saison', fact: 'On est en janvier, il fait froid', sealed_at: '2026-01-01T00:00:00Z' },
  ],
  open_debts: [
    { id: 'debt-01', content: 'Marie a promis de reveler son secret', opened_at: 'ch-3', resolved: false },
    { id: 'debt-02', content: 'Pierre doute de la fidelite de Marie', opened_at: 'ch-5', resolved: false },
  ],
  arc_states: [
    { character_id: 'Pierre', arc_phase: 'confrontation', current_need: 'comprendre pourquoi Marie ment', current_mask: 'calme apparent, controle', tension: 'rage contenue vs amour residuel' },
    { character_id: 'Marie', arc_phase: 'setup', current_need: 'proteger son secret sans perdre Pierre', current_mask: 'normalite forcee', tension: 'culpabilite vs instinct de survie' },
  ],
  scene_objective: 'Pierre confronte Marie dans leur cuisine, le silence eclate en accusations voilees',
};

const SCENE: Scene = {
  scene_id: 'retro-bench-scene', arc_id: 'arc-couple',
  objective: 'Pierre confronte Marie dans leur cuisine apres une longue journee',
  conflict: 'le silence explose en reproches voiles', conflict_type: 'relational',
  emotion_target: 'anger', emotion_intensity: 0.8,
  seeds_planted: ['Marie cache un document dans son sac'], seeds_bloomed: [],
  subtext: { character_thinks: 'Marie sait que Pierre sait', reader_knows: 'Pierre a trouve le message mais ne dit rien encore', tension_type: 'dramatic_irony', implied_emotion: 'dread' },
  sensory_anchor: 'bruit du couteau sur la planche a decouper',
  constraints: ['Pas de violence physique', 'Pas de resolution — scene ouverte'],
  beats: [
    { beat_id: 'b-01', action: 'Pierre entre dans la cuisine', intention: 'observer Marie sans se trahir', pivot: false, tension_delta: 1, information_revealed: [], information_withheld: ['il a lu le message'] },
    { beat_id: 'b-02', action: 'Echange banal qui derape', intention: 'tester la reaction de Marie', pivot: true, tension_delta: 1, information_revealed: ['Pierre sait quelque chose'], information_withheld: ['la nature exacte du secret'] },
    { beat_id: 'b-03', action: 'Silence lourd — Pierre sort', intention: 'signifier sa connaissance sans confronter', pivot: false, tension_delta: 0, information_revealed: [], information_withheld: ['la decision de Pierre'] },
  ],
  target_word_count: 500, justification: 'climax acte 2 — point de non-retour',
};

const PLAN: GenesisPlan = {
  plan_id: 'retro-bench-plan', plan_hash: 'retro-bench-plan-hash',
  version: '1.0.0', intent_hash: 'retro-bench-intent', canon_hash: 'retro-bench-canon',
  constraints_hash: 'retro-bench-constraints', genome_hash: 'retro-bench-genome', emotion_hash: 'retro-bench-emotion',
  arcs: [{ arc_id: 'arc-couple', theme: 'la desintegration d un couple par le non-dit', progression: 'confrontation', justification: 'tension narrative principale', scenes: [SCENE] }],
  seed_registry: [{ id: 'seed-secret', type: 'plot', description: 'Le secret de Marie', planted_in: 'ch-1', blooms_in: 'ch-8' }],
  tension_curve: [0.3, 0.5, 0.7, 0.8, 0.6, 0.9, 0.7],
  emotion_trajectory: [
    { position: 0.0, emotion: 'tension', intensity: 0.5 },
    { position: 0.5, emotion: 'anger', intensity: 0.8 },
    { position: 1.0, emotion: 'despair', intensity: 0.7 },
  ],
  scene_count: 1, beat_count: 3, estimated_word_count: 500,
};

const STYLE_PROFILE: StyleProfile = {
  version: '1.0.0', universe: 'contemporain-litteraire',
  lexicon: { signature_words: ['silence', 'froid', 'regard', 'main'], forbidden_words: ['soudain', 'tout a coup', 'en effet'], abstraction_max_ratio: 0.15, concrete_min_ratio: 0.60 },
  rhythm: { avg_sentence_length_target: 14, gini_target: 0.45, max_consecutive_similar: 3, min_syncopes_per_scene: 2, min_compressions_per_scene: 1 },
  tone: { dominant_register: 'litteraire', intensity_range: [0.6, 0.9] },
  imagery: { recurrent_motifs: ['froid', 'couteau', 'lumiere'], density_target_per_100_words: 3, banned_metaphors: ['le coeur brise', 'les larmes coulaient'] },
};

const KILL_LISTS: KillLists = {
  banned_words: ['soudain', 'tout a coup', 'en effet', 'vraiment'],
  banned_cliches: ['le coeur brise', 'les larmes coulaient', 'il retint son souffle'],
  banned_ai_patterns: ['il ne put s empecher', 'une vague de', 'ses pensees se bousculaient'],
  banned_filter_words: ['semblait', 'paraissait', 'avait l air'],
};

const CONTINUITY: ForgeContinuity = {
  previous_scene_summary: 'Pierre a decouvert un message suspect sur le telephone de Marie apres le diner',
  character_states: [
    { character_id: 'pierre', character_name: 'Pierre', emotional_state: 'controlled_anger', physical_state: 'tense', location: 'apartment_corridor' },
    { character_id: 'marie', character_name: 'Marie', emotional_state: 'anxious_guilt', physical_state: 'tired_from_shift', location: 'kitchen' },
  ],
  open_threads: ['La nature du secret de Marie', 'Le document dans son sac', 'La decision que Pierre doit prendre'],
};

const FORGE_INPUT: ForgePacketInput = {
  plan: PLAN, scene: SCENE, style_profile: STYLE_PROFILE,
  kill_lists: KILL_LISTS, canon: [], continuity: CONTINUITY,
  run_id: `retro-bench-${Date.now()}`, language: 'fr',
};

// ── Les 2 prompts retro-engineered ──────────────────────────────────────────

// PROMPT RETRO 1 : Basé sur B1 (notre meilleure prose OMEGA — approche sensorielle)
const RETRO_PROMPT_1 = `Tu es un écrivain spécialisé dans la fiction psychologique contemporaine, maître de la narration par détails sensoriels.

Écris une scène où Pierre et Marie, couple en délitement, se retrouvent dans leur cuisine un soir d'hiver à Lyon. Marie rentre de son travail de médecin urgentiste, Pierre soupçonne un mensonge. Tension domestique, secrets qui affleurent, révélation imminente d'une infidélité. Pierre a trouvé un message suspect sur le téléphone de Marie mais ne dit rien encore.

Trajectoire émotionnelle : tension larvée et observation méfiante, puis montée par micro-confrontations voilées, vers acceptation silencieuse que quelque chose est irrémédiablement cassé. La scène reste ouverte, sans résolution.

STYLE : Ancre chaque émotion dans un détail physique précis (mains sur l'évier, épaules raides, nuque observée). Utilise des métaphores organiques pour les relations. Alterne phrases courtes percutantes et périodes sinueuses. Fais des objets domestiques des révélateurs psychologiques (couteau, carrelage, radiateur). Privilégie le sous-texte : dis l'essentiel par ce qui n'est pas dit. Vocabulaire clinique et poétique. Intègre l'environnement urbain (Lyon, janvier, circulation, froid) comme écho émotionnel.

Ancre vocale : « Ses doigts glissèrent le long du métal, cherchant une prise qui n'existait pas. »

INTERDITS : ne jamais nommer directement les émotions (colère, tristesse, jalousie), éviter les dialogues explicatifs ou les révélations directes, ne pas tomber dans le lyrisme gratuit ou la métaphore décorative.

Écris cette scène comme si tu filmais au microscope la désintégration d'un couple, où chaque détail matériel révèle l'invisible. ~500 mots.`;

// PROMPT RETRO 2 : Basé sur A4/Camus (approche témoin — voix grave)  
const RETRO_PROMPT_2 = `Tu es un narrateur omniscient à la troisième personne, observateur lucide et compatissant de la condition humaine. Ta voix porte la gravité sobre de celui qui voit l'essentiel et refuse les consolations faciles.

Écris une scène où Pierre entre dans la cuisine de leur appartement lyonnais en janvier. Marie, médecin urgentiste, est rentrée avant lui. Il a trouvé un message suspect sur son téléphone mais ne dit rien. Le couple prépare le dîner dans un silence chargé. Un échange banal dérape. Pierre sort de la pièce sans avoir confronté Marie.

Trajectoire émotionnelle : partir d'une froideur contrôlée nourrie par les détails sensoriels de la cuisine hivernale, traverser une montée de tension par micro-observations et non-dits, pour aboutir à un retrait silencieux qui dit plus que n'importe quelle confrontation.

Style : alterne phrases courtes et périodes amples pour créer un rythme respiratoire qui mime la réflexion. Ancre chaque mouvement de pensée dans une sensation concrète (bruit du couteau, froid du carrelage, lumière du néon). Utilise un lexique précis mais accessible. Maintiens une distance narrative qui permet la compassion sans sentimentalisme. Fais des gestes domestiques des métaphores silencieuses du délitement.

Ancre vocale : « Le silence de Pierre n'était pas une absence — c'était un choix, lourd comme la lame posée sur la planche. »

Interdits : pas de lyrisme facile ni d'emphase dramatique, pas de métaphores qui attirent l'attention sur elles-mêmes, ne pas expliciter les émotions — les faire naître de la situation et du rythme.

Écris comme quelqu'un qui témoigne de l'effondrement intime avec la responsabilité de celui qui comprend et la retenue de celui qui respecte la douleur. ~500 mots.`;

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string { return n.toFixed(1).padStart(6); }
function fmtDelta(d: number): string { return ((d >= 0 ? '+' : '') + d.toFixed(1)).padStart(7); }

interface SceneScores {
  composite: number;
  ecc: number; rci: number; sii: number; ifi: number; aai: number;
  min_axis: number;
  prose_words: number;
}

function extractSceneScores(report: SceneChainReport, sceneIdx: number): SceneScores {
  const scene = report.scenes[sceneIdx];
  const ma = scene?.forge_result?.macro_score?.macro_axes;
  return {
    composite: scene?.forge_result?.s_score?.composite ?? 0,
    ecc: ma?.ecc?.score ?? 0, rci: ma?.rci?.score ?? 0,
    sii: ma?.sii?.score ?? 0, ifi: ma?.ifi?.score ?? 0,
    aai: ma?.aai?.score ?? 0, min_axis: computeMinAxis(ma),
    prose_words: (scene?.forge_result?.final_prose ?? '').split(/\s+/).length,
  };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1); }

  const provider = createAnthropicProvider({
    apiKey, model: MODEL, judgeStable: false,
    draftTemperature: DRAFT_TEMPERATURE, judgeTemperature: JUDGE_TEMPERATURE,
    judgeTopP: 1.0, judgeMaxTokens: 200,
  });

  const client = new Anthropic({ apiKey });

  // ── Assembler un ForgePacket pour le scoring ──
  const packet = assembleForgePacket({ ...FORGE_INPUT, run_id: `retro-bench-base-${Date.now()}` });
  const symbolMap = await generateSymbolMap(packet, provider);
  const enrichedPacket = bridgeSignatureFromSymbolMap(packet, symbolMap);

  // ══════════════════════════════════════════════════════════════════════════
  // RUN 1 — V3 STANDARD (2 scènes via pipeline complet)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('[RETRO-BENCH] ═══ RUN V3 STANDARD (2 scènes) ═══\n');
  process.env.OMEGA_PROMPT_COMPILER_V3 = '1';
  delete process.env.OMEGA_TARGETED_PATCH;
  delete process.env.OMEGA_ORCHESTRATED_MODE;

  const v3Config: SceneChainConfig = {
    n_scenes: 2, initial_input: CDE_INPUT,
    forge_input: { ...FORGE_INPUT, run_id: `retro-bench-v3-${Date.now()}` },
  };
  const v3Report = await runSceneChain(v3Config, provider);
  const v3Scores = v3Report.scenes.map((_, i) => extractSceneScores(v3Report, i));

  // ══════════════════════════════════════════════════════════════════════════
  // RUN 2 — RETRO PROMPT 1 (sensoriel/B1 style)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n[RETRO-BENCH] ═══ RUN RETRO PROMPT 1 (sensoriel) ═══\n');

  const retro1Draft = await client.messages.create({
    model: MODEL, max_tokens: 4000, temperature: DRAFT_TEMPERATURE,
    messages: [{ role: 'user', content: RETRO_PROMPT_1 }],
  });
  const retro1Prose = retro1Draft.content[0].type === 'text' ? retro1Draft.content[0].text : '';
  console.log(`[RETRO-BENCH] Retro 1 generated: ${retro1Prose.split(/\s+/).length} words`);

  // Score with judgeAestheticV3
  console.log('[RETRO-BENCH] Scoring retro 1 with judgeAestheticV3()...');
  const retro1Score = await judgeAestheticV3(enrichedPacket, retro1Prose, provider, symbolMap, null);
  const retro1MA = retro1Score.macro_axes;
  console.log(`[RETRO-BENCH] Retro 1 composite: ${retro1Score.composite.toFixed(1)}`);

  // ══════════════════════════════════════════════════════════════════════════
  // RUN 3 — RETRO PROMPT 2 (témoin/Camus style)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n[RETRO-BENCH] ═══ RUN RETRO PROMPT 2 (témoin) ═══\n');

  const retro2Draft = await client.messages.create({
    model: MODEL, max_tokens: 4000, temperature: DRAFT_TEMPERATURE,
    messages: [{ role: 'user', content: RETRO_PROMPT_2 }],
  });
  const retro2Prose = retro2Draft.content[0].type === 'text' ? retro2Draft.content[0].text : '';
  console.log(`[RETRO-BENCH] Retro 2 generated: ${retro2Prose.split(/\s+/).length} words`);

  console.log('[RETRO-BENCH] Scoring retro 2 with judgeAestheticV3()...');
  const retro2Score = await judgeAestheticV3(enrichedPacket, retro2Prose, provider, symbolMap, null);
  const retro2MA = retro2Score.macro_axes;
  console.log(`[RETRO-BENCH] Retro 2 composite: ${retro2Score.composite.toFixed(1)}`);

  // ══════════════════════════════════════════════════════════════════════════
  // TABLEAU COMPARATIF
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n[RETRO-BENCH] ═══ TABLEAU COMPARATIF ═══\n');
  console.log('| Metrique          | V3-S0 | V3-S1 | RETRO1 | RETRO2 | Δ(R1-V3) | Δ(R2-V3) |');
  console.log('|-------------------|-------|-------|--------|--------|----------|----------|');

  const v3Mean = (v3Scores[0].composite + v3Scores[1].composite) / 2;

  function row(label: string, v3s0: number, v3s1: number, r1: number, r2: number) {
    const d1 = r1 - v3Mean;
    const d2 = r2 - v3Mean;
    console.log(`| ${label.padEnd(17)} | ${fmt(v3s0)} | ${fmt(v3s1)} | ${fmt(r1)} | ${fmt(r2)} | ${fmtDelta(d1)} | ${fmtDelta(d2)} |`);
  }

  row('Composite', v3Scores[0].composite, v3Scores[1].composite,
    retro1Score.composite, retro2Score.composite);
  row('ECC', v3Scores[0].ecc, v3Scores[1].ecc,
    retro1MA?.ecc?.score ?? 0, retro2MA?.ecc?.score ?? 0);
  row('RCI', v3Scores[0].rci, v3Scores[1].rci,
    retro1MA?.rci?.score ?? 0, retro2MA?.rci?.score ?? 0);
  row('SII', v3Scores[0].sii, v3Scores[1].sii,
    retro1MA?.sii?.score ?? 0, retro2MA?.sii?.score ?? 0);
  row('IFI', v3Scores[0].ifi, v3Scores[1].ifi,
    retro1MA?.ifi?.score ?? 0, retro2MA?.ifi?.score ?? 0);
  row('AAI', v3Scores[0].aai, v3Scores[1].aai,
    retro1MA?.aai?.score ?? 0, retro2MA?.aai?.score ?? 0);
  row('min_axis', v3Scores[0].min_axis, v3Scores[1].min_axis,
    computeMinAxis(retro1MA), computeMinAxis(retro2MA));

  console.log('\n[RETRO-BENCH] ═══ DIAGNOSTIC ═══');
  console.log(`[RETRO-BENCH] V3 standard moyen : ${v3Mean.toFixed(1)}`);
  console.log(`[RETRO-BENCH] Retro 1 (sensoriel) : ${retro1Score.composite.toFixed(1)} (${retro1Prose.split(/\s+/).length} mots)`);
  console.log(`[RETRO-BENCH] Retro 2 (témoin)    : ${retro2Score.composite.toFixed(1)} (${retro2Prose.split(/\s+/).length} mots)`);
  console.log(`[RETRO-BENCH] Prompt V3 : ~15 476 tokens | Prompts retro : ~287 tokens chacun`);

  const bestRetro = Math.max(retro1Score.composite, retro2Score.composite);
  if (bestRetro > v3Mean) {
    console.log(`\n[RETRO-BENCH] ★ VICTOIRE RETRO : meilleur retro (${bestRetro.toFixed(1)}) > V3 moyen (${v3Mean.toFixed(1)})`);
  } else {
    console.log(`\n[RETRO-BENCH] V3 gagne : V3 moyen (${v3Mean.toFixed(1)}) > meilleur retro (${bestRetro.toFixed(1)})`);
  }

  // ── SAVE ──
  const sessionsDir = resolve(__dirname, '..', 'sessions');
  mkdirSync(sessionsDir, { recursive: true });
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

  const benchResult = {
    bench_id: `BENCH_RETRO_${timestamp.replace(/[-T]/g, '')}`,
    model: MODEL,
    v3: { scores: v3Scores, mean: v3Mean, prompt_tokens: 15476 },
    retro1: {
      composite: retro1Score.composite,
      macro_axes: { ecc: retro1MA?.ecc?.score, rci: retro1MA?.rci?.score, sii: retro1MA?.sii?.score, ifi: retro1MA?.ifi?.score, aai: retro1MA?.aai?.score },
      min_axis: computeMinAxis(retro1MA),
      words: retro1Prose.split(/\s+/).length,
      prompt_tokens: 287,
      prompt_style: 'sensoriel (B1)',
      prose: retro1Prose,
    },
    retro2: {
      composite: retro2Score.composite,
      macro_axes: { ecc: retro2MA?.ecc?.score, rci: retro2MA?.rci?.score, sii: retro2MA?.sii?.score, ifi: retro2MA?.ifi?.score, aai: retro2MA?.aai?.score },
      min_axis: computeMinAxis(retro2MA),
      words: retro2Prose.split(/\s+/).length,
      prompt_tokens: 287,
      prompt_style: 'témoin (A4/Camus)',
      prose: retro2Prose,
    },
    verdict: bestRetro > v3Mean ? 'RETRO_WINS' : 'V3_WINS',
    created_at: new Date().toISOString(),
  };

  const outPath = resolve(sessionsDir, `retro-bench-${timestamp}.json`);
  writeFileSync(outPath, JSON.stringify(benchResult, null, 2), 'utf-8');
  console.log(`\n[RETRO-BENCH] Resultats : ${outPath}`);

  // Cleanup
  delete process.env.OMEGA_PROMPT_COMPILER_V3;
}

main().catch(err => {
  console.error('[RETRO-BENCH] FATAL:', err);
  process.exit(1);
});
