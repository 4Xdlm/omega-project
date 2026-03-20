/**
 * OMEGA — Rosetta Phase S0: Épreuve de Vérité du Langage LLM
 * "Sortir la vérité mathématique — millimétrée"
 *
 * Phases:
 *   S0.2 — Bench features pilotables (100 tests)
 *   S0.3 — Bench contradictoire Principe #6 (240 tests)
 *   S0.4 — Bench features contournables (50 tests)
 *   S0.5 — Bench micro-chirurgie bornée (60 rewrites)
 *   S0.6 — Classification des règles (0 API)
 *   S0.7 — Matrice Rosetta versionnée v1 (0 API)
 *
 * Usage:
 *   $env:ANTHROPIC_API_KEY = "sk-ant-..."
 *   npx tsx scripts/rosetta-s0-calibration.ts
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * FIX S0.1 applied: text-features.ts ACTION_VERB_FORMS exact matching
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { computeTextFeatures } from '../src/scoring/text-features.js';
import { MultiStageScorer } from '../src/scoring/multi-stage-scorer.js';
import { computeSpacyFeatures, isSpacyBridgeAvailable } from '../src/scoring/spacy-bridge.js';

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');
const ROSETTA_DIR = path.resolve(ROOT_DIR, 'omega-autopsie/results_rosetta');
const S0_DIR = path.resolve(ROSETTA_DIR, 's0');
const PHASE2_DIR = path.resolve(ROSETTA_DIR, 'phase2');
const EXTRACTS_DIR = path.resolve(PHASE2_DIR, 'extracts');
const GUTENBERG_DIR = path.resolve(ROOT_DIR, 'omega-autopsie/gutenberg_cache');
const LIVRE_DIR = path.resolve(ROOT_DIR, 'omega-autopsie/livre_cache');
const COEFF_PATH = path.resolve(__dirname, '../src/scoring/data/OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json');
const METRO_PATH = path.resolve(ROOT_DIR, 'omega-autopsie/results_r1/OMEGA_METROLOGIE_EMPIRIQUE_v1.json');

const MODEL = 'claude-sonnet-4-20250514';

const STYLES = ['DESCRIPTION', 'ACTION', 'INTROSPECTION', 'CONTEMPLATION', 'LYRIQUE'] as const;
type Style = (typeof STYLES)[number];

const KEY_FEATURES = [
  'f1_mean', 'f5a_verb_density', 'f25g_description_score', 'f28d_sil_score',
  'f27d_modal_score', 'f38c_speed_score', 'f29d_ttr_score', 'f24e_contrast_score',
  'f1b_rhythm_ratio', 'f15b_redundancy_compression', 'f16a_bigram_rarity',
  'f5c_action_verb_ratio', 'f17_knife_count', 'f9a_contradiction_rate',
  'f21c_diacope_rate', 'f36c_cliff_score', 'f35c_hook_score',
];

// ═══════════════════════════════════════════════════════════════════
// FEATURE INSTRUCTIONS — A/B/C VARIANTES (from roadmap)
// ═══════════════════════════════════════════════════════════════════

interface FeatureVariants {
  feature: string;
  name: string;
  A: string; // LLM instruction (Dictionnaire v3)
  B: string; // Human reformulation
  C: string; // Hybrid (human + metrics)
}

const CORE_FEATURES: FeatureVariants[] = [
  {
    feature: 'f29d_ttr_score',
    name: 'Richesse lexicale (TTR)',
    A: 'Varie le vocabulaire. Remplace les mots répétés par des synonymes ou des périphrases.',
    B: 'Aucun nom ou adjectif ne doit apparaître deux fois. Synonymes obligatoires à chaque occurrence.',
    C: 'Vocabulaire varié. MÉTRIQUE : le ratio types/tokens doit dépasser 0.75 sur chaque fenêtre de 100 mots.',
  },
  {
    feature: 'f24e_contrast_score',
    name: 'Contraste syntaxique',
    A: 'Alterne plus brutalement entre phrases courtes et phrases longues.',
    B: 'Une phrase sur trois doit faire moins de 8 mots. Une phrase sur trois doit dépasser 25 mots.',
    C: 'Contraste syntaxique fort. MÉTRIQUE : la plus longue phrase doit faire 3× la plus courte au minimum.',
  },
  {
    feature: 'f15b_redundancy_compression',
    name: 'Anti-répétition (compression)',
    A: 'Réduis les répétitions de bigrammes. Varie les formulations.',
    B: 'Jamais deux phrases qui commencent par le même mot. Jamais deux adjectifs du même champ sémantique consécutifs.',
    C: 'Zéro redondance. MÉTRIQUE : aucun bigramme ne doit apparaître plus de 2 fois dans le texte entier.',
  },
  {
    feature: 'f16a_bigram_rarity',
    name: 'Originalité (rareté bigrammes)',
    A: 'Utilise des combinaisons de mots plus originales et rares.',
    B: 'Évite les tournures courantes. Chaque association nom-adjectif doit être surprenante ou inédite.',
    C: 'Associations originales. MÉTRIQUE : plus de 90% des bigrammes du texte doivent être uniques.',
  },
];

const EXP_FEATURES: FeatureVariants[] = [
  {
    feature: 'f25g_description_score',
    name: 'Description sensorielle',
    A: 'Enrichis les descriptions sensorielles : couleurs précises, textures, sons, odeurs spécifiques.',
    B: 'Chaque paragraphe utilise AU MOINS 3 des 5 sens. Nommer les sensations explicitement.',
    C: 'Description sensorielle dense. MÉTRIQUE : au moins 8 mots sensoriels pour 100 mots.',
  },
  {
    feature: 'f17_knife_count',
    name: 'Mots percutants',
    A: 'Ajoute des mots percutants, des images vives, des contrastes forts.',
    B: 'Intègre au moins 5 mots rares ou percutants (exemples : vertige, étincelle, fracas, tumulte, abîme).',
    C: 'Mots puissants. MÉTRIQUE : au moins 1 mot rare ou percutant toutes les 100 mots.',
  },
  {
    feature: 'f35c_hook_score',
    name: 'Accroche début',
    A: 'Commence par une phrase d\'accroche qui crée de la tension.',
    B: 'La première phrase doit intriguer, choquer ou questionner. Pas de description plate.',
    C: 'Accroche forte. MÉTRIQUE : la première phrase doit contenir une tension en moins de 15 mots.',
  },
  {
    feature: 'f36c_cliff_score',
    name: 'Suspense fin',
    A: 'Termine sur une note de suspense ou d\'incomplétude.',
    B: 'La dernière phrase doit laisser une question ouverte. Ne PAS conclure proprement.',
    C: 'Fin en suspens. MÉTRIQUE : les 20 derniers mots doivent contenir une image ouverte ou un conditionnel.',
  },
];

const ALL_BENCH_FEATURES = [...CORE_FEATURES, ...EXP_FEATURES];

// ═══════════════════════════════════════════════════════════════════
// CONTOURNABLE FEATURES (S0.4)
// ═══════════════════════════════════════════════════════════════════

const CONTOURNABLE_FEATURES = [
  {
    feature: 'f27d_modal_score',
    name: 'Modalisation',
    S1: 'Créez une prose où les certitudes vacillent : utilisez des perceptions floues et indistinctes, des métaphores d\'instabilité, alternez affirmations brèves et phrases sinueuses.',
    S2: 'Utilisez le vocabulaire de l\'approximation : "frôler", "effleurer", "pressentir". Terminez chaque paragraphe par une question implicite.',
    S3: 'Modalisation indirecte. MÉTRIQUE : au moins 2 verbes de perception incertaine par paragraphe (semblait, paraissait, comme si, peut-être).',
  },
  {
    feature: 'f5c_action_verb_ratio',
    name: 'Ratio verbes d\'action',
    S1: 'Privilégier les substantifs et adjectifs évoquant le mouvement (élan, bond, fracas, cinglant). Décrire prioritairement sensations tactiles et kinesthésiques.',
    S2: 'Remplacer les verbes d\'état par des verbes de mouvement physique : saisir, bondir, frapper, courir, ouvrir, fermer. Au moins 3 par paragraphe.',
    S3: 'Verbes d\'action physique. MÉTRIQUE : au moins 1 verbe d\'action physique (courir, saisir, frapper, ouvrir) toutes les 3 phrases.',
  },
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function roundN(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

let apiCalls = 0;
const MAX_API_CALLS = 400;

async function callLLM(client: Anthropic, prompt: string, maxTokens = 1024): Promise<string> {
  if (apiCalls >= MAX_API_CALLS) {
    console.log(`  [API LIMIT] ${apiCalls}/${MAX_API_CALLS} — skipping`);
    return '';
  }
  apiCalls++;
  console.log(`  [API call #${apiCalls}/${MAX_API_CALLS}]`);
  try {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = resp.content[0];
    return block.type === 'text' ? block.text : '';
  } catch (err) {
    console.error(`  [API ERROR] ${err}`);
    return '';
  }
}

async function computeAllFeatures(prose: string): Promise<Record<string, number>> {
  const features = computeTextFeatures(prose);
  if (isSpacyBridgeAvailable()) {
    try {
      const sf = await computeSpacyFeatures(prose, 'fr');
      Object.assign(features, sf);
    } catch { /* 44/49 features */ }
  }
  return features;
}

function writeJSON(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`  [WRITE] ${path.basename(filePath)}`);
}

function buildPrompt(style: Style, constraint: string): string {
  return `Écris 500 mots de prose littéraire française.
Style : ${style}
Thème : Un personnage seul dans un lieu chargé d'histoire au crépuscule.

CONTRAINTE PRINCIPALE à respecter absolument :
${constraint}

Écris directement, sans préambule ni commentaire.`;
}

// ═══════════════════════════════════════════════════════════════════
// S0.2 — BENCH FEATURES PILOTABLES
// ═══════════════════════════════════════════════════════════════════

interface TestResult {
  style: Style;
  idx: number;
  feature_value: number;
  r6: number;
  all_key_features: Record<string, number>;
}

async function benchPilotables(
  client: Anthropic,
  scorer: MultiStageScorer,
  profilesClassiques: Record<string, Record<string, number>>,
): Promise<void> {
  console.log('\n═══ S0.2 — BENCH FEATURES PILOTABLES (100 tests) ═══\n');

  const results: Record<string, {
    tests: TestResult[];
    taux_respect_global: number;
    taux_par_style: Record<string, number>;
    mean_value: number;
    verdict: string;
  }> = {};

  for (const fv of CORE_FEATURES) {
    console.log(`\nFeature: ${fv.feature} (${fv.name})`);
    const tests: TestResult[] = [];

    for (const style of STYLES) {
      const classicProfile = profilesClassiques[style] || {};
      const classicValue = classicProfile[fv.feature] ?? 0;

      for (let idx = 0; idx < 5; idx++) {
        const prompt = buildPrompt(style, fv.A); // Use LLM instruction as baseline
        const prose = await callLLM(client, prompt);
        if (!prose) continue;
        await new Promise(r => setTimeout(r, 1500));

        const features = await computeAllFeatures(prose);
        const scoreResult = scorer.score(features, {
          wordCount: prose.split(/\s+/).length,
          pRel: 0.5, profile: 'STRATOSPHERIQUE', text: prose,
        });

        const value = features[fv.feature] ?? 0;
        tests.push({
          style,
          idx,
          feature_value: roundN(value, 4),
          r6: roundN(scoreResult.composite.score, 2),
          all_key_features: Object.fromEntries(KEY_FEATURES.map(f => [f, roundN(features[f] ?? 0, 4)])),
        });

        console.log(`  ${style}[${idx}] ${fv.feature}=${roundN(value, 4)} r6=${roundN(scoreResult.composite.score, 2)}`);
      }
    }

    // Compute alignment with classical profiles
    let totalAligned = 0;
    const styleAligned: Record<string, number> = {};
    for (const style of STYLES) {
      const styleTests = tests.filter(t => t.style === style);
      const classicValue = (profilesClassiques[style] || {})[fv.feature] ?? 0;
      const aligned = styleTests.filter(t => {
        if (classicValue === 0) return t.feature_value > 0;
        const ratio = t.feature_value / classicValue;
        return ratio >= 0.60 && ratio <= 1.40; // 60%-140% of classic = aligned
      });
      styleAligned[style] = styleTests.length > 0 ? roundN(aligned.length / styleTests.length, 2) : 0;
      totalAligned += aligned.length;
    }

    const tauxGlobal = tests.length > 0 ? roundN(totalAligned / tests.length, 2) : 0;
    const meanVal = roundN(tests.reduce((s, t) => s + t.feature_value, 0) / Math.max(tests.length, 1), 4);
    const verdict = tauxGlobal >= 0.80 ? 'SOLIDE' : tauxGlobal >= 0.60 ? 'PROMETTEUSE' : 'EXPÉRIMENTALE';

    results[fv.feature] = {
      tests,
      taux_respect_global: tauxGlobal,
      taux_par_style: styleAligned,
      mean_value: meanVal,
      verdict,
    };

    console.log(`  → taux_global=${tauxGlobal} verdict=${verdict}`);
  }

  writeJSON(path.join(S0_DIR, 's02_bench_pilotables.json'), results);
}

// ═══════════════════════════════════════════════════════════════════
// S0.3 — BENCH CONTRADICTOIRE PRINCIPE #6
// ═══════════════════════════════════════════════════════════════════

interface VariantResult {
  tests: TestResult[];
  taux_global: number;
  r6_moyen: number;
  mean_value: number;
}

async function benchContradictoire(
  client: Anthropic,
  scorer: MultiStageScorer,
  profilesClassiques: Record<string, Record<string, number>>,
): Promise<void> {
  console.log('\n═══ S0.3 — BENCH CONTRADICTOIRE PRINCIPE #6 (240 tests) ═══\n');

  const results: Record<string, {
    variante_A: VariantResult;
    variante_B: VariantResult;
    variante_C: VariantResult;
    gagnant: string;
    verdict: string;
  }> = {};

  for (const fv of ALL_BENCH_FEATURES) {
    console.log(`\nFeature: ${fv.feature} (${fv.name})`);

    const variantResults: Record<string, TestResult[]> = { A: [], B: [], C: [] };
    const instructions = { A: fv.A, B: fv.B, C: fv.C };

    for (const [variant, instruction] of Object.entries(instructions)) {
      for (const style of STYLES) {
        for (let idx = 0; idx < 2; idx++) { // 2 texts per style per variant (to save budget)
          const prompt = buildPrompt(style, instruction);
          const prose = await callLLM(client, prompt);
          if (!prose) continue;
          await new Promise(r => setTimeout(r, 1500));

          const features = await computeAllFeatures(prose);
          const scoreResult = scorer.score(features, {
            wordCount: prose.split(/\s+/).length,
            pRel: 0.5, profile: 'STRATOSPHERIQUE', text: prose,
          });

          const value = features[fv.feature] ?? 0;
          variantResults[variant].push({
            style,
            idx,
            feature_value: roundN(value, 4),
            r6: roundN(scoreResult.composite.score, 2),
            all_key_features: Object.fromEntries(KEY_FEATURES.map(f => [f, roundN(features[f] ?? 0, 4)])),
          });

          console.log(`  ${variant}/${style}[${idx}] ${fv.feature}=${roundN(value, 4)} r6=${roundN(scoreResult.composite.score, 2)}`);
        }
      }
    }

    // Compare variants
    const computeVariantStats = (tests: TestResult[]): VariantResult => {
      const classicAligned = tests.filter(t => {
        const classicValue = (profilesClassiques[t.style] || {})[fv.feature] ?? 0;
        if (classicValue === 0) return t.feature_value > 0;
        const ratio = t.feature_value / classicValue;
        return ratio >= 0.60 && ratio <= 1.40;
      });
      return {
        tests,
        taux_global: tests.length > 0 ? roundN(classicAligned.length / tests.length, 2) : 0,
        r6_moyen: roundN(tests.reduce((s, t) => s + t.r6, 0) / Math.max(tests.length, 1), 2),
        mean_value: roundN(tests.reduce((s, t) => s + t.feature_value, 0) / Math.max(tests.length, 1), 4),
      };
    };

    const vA = computeVariantStats(variantResults['A']);
    const vB = computeVariantStats(variantResults['B']);
    const vC = computeVariantStats(variantResults['C']);

    // Winner = highest taux_global, tiebreak by r6_moyen
    const variants = [
      { label: 'A', stats: vA },
      { label: 'B', stats: vB },
      { label: 'C', stats: vC },
    ].sort((a, b) => b.stats.taux_global - a.stats.taux_global || b.stats.r6_moyen - a.stats.r6_moyen);

    const gagnant = variants[0].label;
    const bestTaux = variants[0].stats.taux_global;
    const llmTaux = vA.taux_global;
    const deltaVsLLM = bestTaux - llmTaux;

    let verdict: string;
    if (bestTaux >= 0.80) verdict = 'SOLIDE';
    else if (bestTaux >= 0.60) verdict = 'PROMETTEUSE';
    else if (bestTaux >= 0.40) verdict = 'EXPÉRIMENTALE';
    else verdict = 'ILLUSION_DÉCLARATIVE';

    // Override: if human/hybrid beats LLM by >20%, it's an ILLUSION
    if (gagnant !== 'A' && deltaVsLLM > 0.20) {
      verdict = 'ILLUSION_DÉCLARATIVE';
    }

    results[fv.feature] = {
      variante_A: vA,
      variante_B: vB,
      variante_C: vC,
      gagnant,
      verdict: `${verdict} — gagnant=${gagnant} (taux=${bestTaux}, delta_vs_LLM=${deltaVsLLM >= 0 ? '+' : ''}${roundN(deltaVsLLM, 2)})`,
    };

    console.log(`  → gagnant=${gagnant} taux=${bestTaux} verdict=${verdict}`);
  }

  writeJSON(path.join(S0_DIR, 's03_bench_contradictoire.json'), results);
}

// ═══════════════════════════════════════════════════════════════════
// S0.4 — BENCH FEATURES CONTOURNABLES
// ═══════════════════════════════════════════════════════════════════

async function benchContournables(
  client: Anthropic,
  scorer: MultiStageScorer,
  profilesClassiques: Record<string, Record<string, number>>,
): Promise<void> {
  console.log('\n═══ S0.4 — BENCH FEATURES CONTOURNABLES (50 tests) ═══\n');

  const results: Record<string, unknown> = {};

  for (const cf of CONTOURNABLE_FEATURES) {
    console.log(`\nFeature: ${cf.feature} (${cf.name})`);
    const variantResults: Record<string, TestResult[]> = { S1: [], S2: [], S3: [] };
    const instructions = { S1: cf.S1, S2: cf.S2, S3: cf.S3 };

    for (const [variant, instruction] of Object.entries(instructions)) {
      for (const style of STYLES) {
        const prompt = buildPrompt(style, instruction);
        const prose = await callLLM(client, prompt);
        if (!prose) continue;
        await new Promise(r => setTimeout(r, 1500));

        const features = await computeAllFeatures(prose);
        const scoreResult = scorer.score(features, {
          wordCount: prose.split(/\s+/).length,
          pRel: 0.5, profile: 'STRATOSPHERIQUE', text: prose,
        });

        const value = features[cf.feature] ?? 0;
        variantResults[variant].push({
          style,
          idx: 0,
          feature_value: roundN(value, 4),
          r6: roundN(scoreResult.composite.score, 2),
          all_key_features: Object.fromEntries(KEY_FEATURES.map(f => [f, roundN(features[f] ?? 0, 4)])),
        });

        console.log(`  ${variant}/${style} ${cf.feature}=${roundN(value, 4)} r6=${roundN(scoreResult.composite.score, 2)}`);
      }
    }

    // Find best strategy
    const stratStats = Object.entries(variantResults).map(([label, tests]) => ({
      label,
      mean_value: roundN(tests.reduce((s, t) => s + t.feature_value, 0) / Math.max(tests.length, 1), 4),
      r6_moyen: roundN(tests.reduce((s, t) => s + t.r6, 0) / Math.max(tests.length, 1), 2),
      tests,
    })).sort((a, b) => b.mean_value - a.mean_value);

    results[cf.feature] = {
      strategies: Object.fromEntries(stratStats.map(s => [s.label, { mean_value: s.mean_value, r6_moyen: s.r6_moyen, tests: s.tests }])),
      best_strategy: stratStats[0].label,
      best_mean_value: stratStats[0].mean_value,
    };

    console.log(`  → best=${stratStats[0].label} mean=${stratStats[0].mean_value}`);
  }

  writeJSON(path.join(S0_DIR, 's04_bench_contournables.json'), results);
}

// ═══════════════════════════════════════════════════════════════════
// S0.5 — BENCH MICRO-CHIRURGIE BORNÉE
// ═══════════════════════════════════════════════════════════════════

async function benchMicroChirurgie(
  client: Anthropic,
  scorer: MultiStageScorer,
): Promise<void> {
  console.log('\n═══ S0.5 — BENCH MICRO-CHIRURGIE BORNÉE (30 API calls) ═══\n');

  const extractFiles = fs.readdirSync(EXTRACTS_DIR).filter(f => f.endsWith('.json'));
  const results: unknown[] = [];
  let tested = 0;

  for (const ef of extractFiles) {
    if (tested >= 10) break;
    const extractData = JSON.parse(fs.readFileSync(path.join(EXTRACTS_DIR, ef), 'utf-8'));
    const originalText = extractData.passage || extractData.text || '';
    if (!originalText || originalText.split(/\s+/).length < 100) continue;

    const originalFeatures = await computeAllFeatures(originalText);
    const originalScore = scorer.score(originalFeatures, {
      wordCount: originalText.split(/\s+/).length,
      pRel: 0.5, profile: 'STRATOSPHERIQUE', text: originalText,
    });

    // Find 3 weakest sentences (shortest = likely least literary)
    const sents = originalText.split(/(?<=[.!?…»])\s+/).filter((s: string) => s.length > 10);
    if (sents.length < 5) continue;

    const sentScores = sents.map((s: string, i: number) => ({
      index: i,
      text: s,
      wordCount: s.split(/\s+/).length,
    })).sort((a: {wordCount: number}, b: {wordCount: number}) => a.wordCount - b.wordCount);

    const weakest3 = sentScores.slice(0, 3);

    // V1: vague surgery
    const promptV1 = `Voici 3 phrases extraites d'un texte littéraire. Réécris CHACUNE pour améliorer sa qualité littéraire, sans changer le sens.

${weakest3.map((w: {index: number; text: string}, i: number) => `Phrase ${i + 1}: "${w.text}"`).join('\n')}

Réponds UNIQUEMENT avec les 3 phrases réécrites, numérotées.`;

    const v1Result = await callLLM(client, promptV1);
    await new Promise(r => setTimeout(r, 1500));

    // V2: bounded surgery
    const promptV2 = `Voici 3 phrases extraites d'un texte littéraire. Pour CHACUNE, applique ces transformations PRÉCISES :
- Remplace les verbes abstraits (être, avoir, faire, sembler) par des verbes physiques concrets
- Ajoute UN détail sensoriel (son, texture, odeur, lumière)
- Garde EXACTEMENT le même sens et la même longueur (±3 mots)

${weakest3.map((w: {index: number; text: string}, i: number) => `Phrase ${i + 1}: "${w.text}"`).join('\n')}

Réponds UNIQUEMENT avec les 3 phrases réécrites, numérotées.`;

    const v2Result = await callLLM(client, promptV2);
    await new Promise(r => setTimeout(r, 1500));

    // Parse V1 and V2 rewrites and reconstruct text
    const parseRewrites = (raw: string): string[] => {
      const lines = raw.split('\n').filter(l => l.trim().length > 0);
      return lines.map(l => l.replace(/^\d+[\.\):\-]\s*/, '').replace(/^[""]|[""]$/g, '').trim()).filter(l => l.length > 10).slice(0, 3);
    };

    const v1Phrases = parseRewrites(v1Result);
    const v2Phrases = parseRewrites(v2Result);

    // Reconstruct modified texts
    const reconstruct = (phrases: string[]): string => {
      const modified = [...sents];
      weakest3.forEach((w: {index: number}, i: number) => {
        if (phrases[i]) modified[w.index] = phrases[i];
      });
      return modified.join(' ');
    };

    const textV1 = v1Phrases.length >= 3 ? reconstruct(v1Phrases) : originalText;
    const textV2 = v2Phrases.length >= 3 ? reconstruct(v2Phrases) : originalText;

    const featV1 = await computeAllFeatures(textV1);
    const featV2 = await computeAllFeatures(textV2);
    const scoreV1 = scorer.score(featV1, { wordCount: textV1.split(/\s+/).length, pRel: 0.5, profile: 'STRATOSPHERIQUE', text: textV1 });
    const scoreV2 = scorer.score(featV2, { wordCount: textV2.split(/\s+/).length, pRel: 0.5, profile: 'STRATOSPHERIQUE', text: textV2 });

    results.push({
      extract: ef,
      r6_original: roundN(originalScore.composite.score, 2),
      r6_v1_vague: roundN(scoreV1.composite.score, 2),
      r6_v2_bornee: roundN(scoreV2.composite.score, 2),
      delta_v1: roundN(scoreV1.composite.score - originalScore.composite.score, 2),
      delta_v2: roundN(scoreV2.composite.score - originalScore.composite.score, 2),
      v2_beats_v1: scoreV2.composite.score > scoreV1.composite.score,
    });

    console.log(`  ${ef}: original=${roundN(originalScore.composite.score, 2)} V1=${roundN(scoreV1.composite.score, 2)} V2=${roundN(scoreV2.composite.score, 2)}`);
    tested++;
  }

  // Summary
  const v2Wins = results.filter((r: any) => r.v2_beats_v1).length;
  const summary = {
    tests: results,
    total_tested: results.length,
    v2_wins: v2Wins,
    v1_wins: results.length - v2Wins,
    verdict: v2Wins > results.length / 2 ? 'CHIRURGIE_BORNÉE_SUPÉRIEURE' : 'PAS_DE_DIFFÉRENCE_CLAIRE',
    mean_delta_v1: roundN(results.reduce((s: number, r: any) => s + r.delta_v1, 0) / Math.max(results.length, 1), 2),
    mean_delta_v2: roundN(results.reduce((s: number, r: any) => s + r.delta_v2, 0) / Math.max(results.length, 1), 2),
  };

  writeJSON(path.join(S0_DIR, 's05_bench_micro_chirurgie.json'), summary);
}

// ═══════════════════════════════════════════════════════════════════
// S0.6 — CLASSIFICATION DES RÈGLES (0 API)
// ═══════════════════════════════════════════════════════════════════

function classifyRules(): void {
  console.log('\n═══ S0.6 — CLASSIFICATION DES RÈGLES ═══\n');

  // Read S0.2 and S0.3 results
  const s02Path = path.join(S0_DIR, 's02_bench_pilotables.json');
  const s03Path = path.join(S0_DIR, 's03_bench_contradictoire.json');

  if (!fs.existsSync(s02Path) || !fs.existsSync(s03Path)) {
    console.log('  [SKIP] S0.2 and/or S0.3 results not found. Run bench phases first.');
    return;
  }

  const s02 = JSON.parse(fs.readFileSync(s02Path, 'utf-8'));
  const s03 = JSON.parse(fs.readFileSync(s03Path, 'utf-8'));

  const regles: unknown[] = [];

  for (const fv of ALL_BENCH_FEATURES) {
    const pilotData = s02[fv.feature];
    const contraData = s03[fv.feature];

    const tauxPilot = pilotData?.taux_respect_global ?? 0;
    const gagnant = contraData?.gagnant ?? 'A';
    const verdictContra = contraData?.verdict ?? '';

    // Determine best instruction
    const bestInstruction = gagnant === 'A' ? fv.A : gagnant === 'B' ? fv.B : fv.C;

    // Final category
    let categorie: string;
    if (verdictContra.includes('ILLUSION')) {
      categorie = 'ILLUSION_DÉCLARATIVE';
    } else if (verdictContra.includes('SOLIDE') || tauxPilot >= 0.80) {
      categorie = 'SOLIDE';
    } else if (verdictContra.includes('PROMETTEUSE') || tauxPilot >= 0.60) {
      categorie = 'PROMETTEUSE';
    } else if (tauxPilot >= 0.40) {
      categorie = 'EXPÉRIMENTALE';
    } else {
      categorie = 'ILLUSION_DÉCLARATIVE';
    }

    regles.push({
      feature: fv.feature,
      name: fv.name,
      instruction_gagnante: `variante_${gagnant}`,
      instruction_exacte: bestInstruction,
      taux_pilotabilite: tauxPilot,
      gagnant_contradictoire: gagnant,
      categorie,
    });

    console.log(`  ${fv.feature}: ${categorie} (gagnant=${gagnant}, taux=${tauxPilot})`);
  }

  const stats = {
    SOLIDE: regles.filter((r: any) => r.categorie === 'SOLIDE').length,
    PROMETTEUSE: regles.filter((r: any) => r.categorie === 'PROMETTEUSE').length,
    EXPÉRIMENTALE: regles.filter((r: any) => r.categorie === 'EXPÉRIMENTALE').length,
    ILLUSION_DÉCLARATIVE: regles.filter((r: any) => r.categorie === 'ILLUSION_DÉCLARATIVE').length,
  };

  writeJSON(path.join(S0_DIR, 's06_classification_regles.json'), { regles, stats });
}

// ═══════════════════════════════════════════════════════════════════
// S0.7 — MATRICE ROSETTA VERSIONNÉE v1 (0 API)
// ═══════════════════════════════════════════════════════════════════

function buildRosettaMatrix(): void {
  console.log('\n═══ S0.7 — MATRICE ROSETTA VERSIONNÉE v1 ═══\n');

  const s03Path = path.join(S0_DIR, 's03_bench_contradictoire.json');
  const s06Path = path.join(S0_DIR, 's06_classification_regles.json');
  const s05Path = path.join(S0_DIR, 's05_bench_micro_chirurgie.json');

  if (!fs.existsSync(s06Path)) {
    console.log('  [SKIP] S0.6 results not found. Run classification first.');
    return;
  }

  const s06 = JSON.parse(fs.readFileSync(s06Path, 'utf-8'));
  const s05 = fs.existsSync(s05Path) ? JSON.parse(fs.readFileSync(s05Path, 'utf-8')) : null;
  const s03 = fs.existsSync(s03Path) ? JSON.parse(fs.readFileSync(s03Path, 'utf-8')) : {};

  const matrix: Record<string, unknown> = {
    matrix_id: `rosetta_${MODEL}_v1`,
    model: MODEL,
    calibration_date: new Date().toISOString().split('T')[0],
    calibration_tests: apiCalls,
    principles: ['P1_classiques_ancre', 'P2_contraintes_mecaniques', 'P3_premier_tir', 'P4_micro_chirurgie', 'P5_omega_garde_sa_langue', 'P6_llm_ne_se_connait_pas'],
    features: {} as Record<string, unknown>,
    micro_surgery: s05 ? {
      validated: s05.verdict === 'CHIRURGIE_BORNÉE_SUPÉRIEURE',
      method: 'phrase_par_phrase',
      max_phrases_par_passe: 3,
      consigne_type: 'bornee',
      delta_r6_moyen: `+${s05.mean_delta_v2}`,
      taux_succes: roundN(s05.v2_wins / Math.max(s05.total_tested, 1), 2),
    } : null,
  };

  for (const rule of s06.regles as any[]) {
    const contraData = s03[rule.feature];
    (matrix.features as Record<string, unknown>)[rule.feature] = {
      pilotability: rule.taux_pilotabilite,
      category: rule.categorie,
      declared_instruction: ALL_BENCH_FEATURES.find(f => f.feature === rule.feature)?.A ?? '',
      validated_instruction: rule.instruction_gagnante === 'variante_A' ? rule.instruction_exacte : null,
      optimized_instruction: rule.instruction_gagnante !== 'variante_A' ? rule.instruction_exacte : null,
      taux_respect_declared: contraData?.variante_A?.taux_global ?? 0,
      taux_respect_optimized: rule.instruction_gagnante !== 'variante_A'
        ? (contraData?.[`variante_${rule.gagnant_contradictoire}`]?.taux_global ?? 0)
        : null,
      r6_moyen: contraData?.[`variante_${rule.gagnant_contradictoire}`]?.r6_moyen ?? 0,
    };
  }

  writeJSON(path.join(S0_DIR, `rosetta_${MODEL}_v1.json`), matrix);
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey?.trim()) {
    console.error('[FATAL] ANTHROPIC_API_KEY not set.');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });
  fs.mkdirSync(S0_DIR, { recursive: true });

  const hasMetro = fs.existsSync(METRO_PATH);
  const scorer = hasMetro ? new MultiStageScorer(COEFF_PATH, METRO_PATH) : new MultiStageScorer(COEFF_PATH);

  // Load classical profiles
  const profilesClassiques: Record<string, Record<string, number>> = JSON.parse(
    fs.readFileSync(path.join(ROSETTA_DIR, '04_profiles_classiques.json'), 'utf-8')
  );

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  OMEGA — Rosetta Phase S0: Épreuve de Vérité du Langage LLM');
  console.log('  Model:', MODEL);
  console.log('  Budget:', MAX_API_CALLS, 'API calls');
  console.log('  Output:', S0_DIR);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // S0.2 — Bench pilotables (100 API calls)
  await benchPilotables(client, scorer, profilesClassiques);

  // S0.3 — Bench contradictoire (240 API calls)
  await benchContradictoire(client, scorer, profilesClassiques);

  // S0.4 — Bench contournables (30 API calls)
  await benchContournables(client, scorer, profilesClassiques);

  // S0.5 — Bench micro-chirurgie (30 API calls)
  await benchMicroChirurgie(client, scorer);

  // S0.6 — Classification (0 API)
  classifyRules();

  // S0.7 — Matrice Rosetta v1 (0 API)
  buildRosettaMatrix();

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  DONE. ${apiCalls} API calls used.`);
  console.log('  Output files in:', S0_DIR);
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
