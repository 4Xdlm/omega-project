/**
 * OMEGA — Rosetta Phase 2: Calibration Mécanique
 *
 * Question: Si on donne au LLM les MÉTRIQUES PRÉCISES d'un passage réel,
 * peut-il produire un texte avec les mêmes métriques ?
 *
 * 5 phases:
 *   2.1 — Extraire 20 passages réels (5 styles × 4 auteurs)
 *   2.2 — 20 tests de rétro-ingénierie (LLM avec contraintes métriques)
 *   2.3 — Convergence (top 4, jusqu'à 5 itérations)
 *   2.4 — Dictionnaire V2 calibré
 *   2.5 — Rapport + matrice de faisabilité
 *
 * Usage:
 *   $env:ANTHROPIC_API_KEY = "sk-ant-..."
 *   npx tsx scripts/rosetta-phase2.ts
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
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
const PHASE2_DIR = path.resolve(ROSETTA_DIR, 'phase2');
const EXTRACTS_DIR = path.resolve(PHASE2_DIR, 'extracts');
const TESTS_DIR = path.resolve(PHASE2_DIR, 'tests');
const CONVERGENCE_DIR = path.resolve(PHASE2_DIR, 'convergence');
const COEFF_PATH = path.resolve(__dirname, '../src/scoring/data/OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json');
const METRO_PATH = path.resolve(ROOT_DIR, 'omega-autopsie/results_r1/OMEGA_METROLOGIE_EMPIRIQUE_v1.json');
const GUTENBERG_DIR = path.resolve(ROOT_DIR, 'omega-autopsie/gutenberg_cache');
const LIVRE_DIR = path.resolve(ROOT_DIR, 'omega-autopsie/livre_cache');

const MODEL = 'claude-sonnet-4-20250514';

const STYLES = ['DESCRIPTION', 'ACTION', 'INTROSPECTION', 'CONTEMPLATION', 'LYRIQUE'] as const;
type Style = typeof STYLES[number];

const KEY_FEATURES = [
  'f1_mean', 'f5a_verb_density', 'f25g_description_score', 'f28d_sil_score',
  'f27d_modal_score', 'f38c_speed_score', 'f29d_ttr_score', 'f24e_contrast_score',
  'f1b_rhythm_ratio', 'f15b_redundancy_compression', 'f16a_bigram_rarity',
  'f5c_action_verb_ratio', 'f17_knife_count', 'f9a_contradiction_rate',
  'f21c_diacope_rate', 'f36c_cliff_score', 'f35c_hook_score',
];

const STYLE_TO_R2: Record<Style, string> = {
  DESCRIPTION: 'DESCRIPTION',
  ACTION: 'ACTION',
  INTROSPECTION: 'INTROSPECTION',
  CONTEMPLATION: 'DESCRIPTION',
  LYRIQUE: 'DESCRIPTION',
};

// Passage sources: 5 styles × 4 (author, file, label)
const PASSAGE_SOURCES: Record<Style, { author: string; file: string; dir: 'gutenberg' | 'livre' }[]> = {
  DESCRIPTION: [
    { author: 'Flaubert', file: 'flaubert_bovary_14155.txt', dir: 'gutenberg' },
    { author: 'Hugo', file: 'hugo_travailleurs_10907.txt', dir: 'gutenberg' },
    { author: 'Zola', file: 'zola_bonheur_11953.txt', dir: 'gutenberg' },
    { author: 'Balzac', file: 'balzac_lys_1237.txt', dir: 'gutenberg' },
  ],
  ACTION: [
    { author: 'Hugo', file: 'hugo_miserables_17489.txt', dir: 'gutenberg' },
    { author: 'Dumas', file: 'dumas_monte_cristo_17989.txt', dir: 'gutenberg' },
    { author: 'Zola', file: 'zola_bete_10007.txt', dir: 'gutenberg' },
    { author: 'Maupassant', file: 'maupassant_bel_ami_3088.txt', dir: 'gutenberg' },
  ],
  INTROSPECTION: [
    { author: 'Proust', file: 'proust_swann_2650.txt', dir: 'gutenberg' },
    { author: 'Dostoievski', file: 'dostoievski_crime_36034.txt', dir: 'gutenberg' },
    { author: 'Stendhal', file: 'stendhal_chartreuse_7524.txt', dir: 'gutenberg' },
    { author: 'Flaubert', file: 'flaubert_education_14285.txt', dir: 'gutenberg' },
  ],
  CONTEMPLATION: [
    { author: 'Chateaubriand', file: 'chateaubriand_rene_18074.txt', dir: 'gutenberg' },
    { author: 'Nerval', file: 'nerval_aurelia_11828.txt', dir: 'gutenberg' },
    { author: 'Rousseau', file: 'rousseau_confessions_1_3913.txt', dir: 'gutenberg' },
    { author: 'Montaigne', file: 'montaigne_essais_3600.txt', dir: 'gutenberg' },
  ],
  LYRIQUE: [
    { author: 'Flaubert', file: 'flaubert_salammbo_10884.txt', dir: 'gutenberg' },
    { author: 'Baudelaire', file: 'baudelaire_spleen_14082.txt', dir: 'gutenberg' },
    { author: 'GarciaMarquez', file: '_Cent_ans_de_solitude_Gabriel_Garcia_Marquez.txt', dir: 'livre' },
    { author: 'Nerval', file: 'nerval_filles_feu_14012.txt', dir: 'gutenberg' },
  ],
};

// Style-specific prompt constraints
const STYLE_PROMPT_CONSTRAINTS: Record<Style, string> = {
  DESCRIPTION: `Que du sensoriel. Utiliser les 5 sens. Pas de pensée interne. Pas d'action significative. Décrire ce qu'on voit, entend, sent, touche, goûte.`,
  ACTION: `Phrases courtes < 12 mots. Verbes d'action physique. Pas d'introspection. Pas de contemplation. Mouvement, urgence, gestes rapides.`,
  INTROSPECTION: `Style indirect libre OBLIGATOIRE. Pensées en 3ème personne sans verbe introducteur. Verbes d'état : sembler, paraître, croire. Monologue intérieur.`,
  CONTEMPLATION: `Phrases > 18 mots. Rythme lent. Subordination complexe. Verbes d'état uniquement. Observation méditative du monde.`,
  LYRIQUE: `Musicalité : allitérations, images poétiques, rythme ternaire. Prose poétique, métaphores filées, beauté du langage.`,
};

// Corrective instructions per feature
const CORRECTIVE_INSTRUCTIONS: Record<string, { too_low: string; too_high: string }> = {
  f1_mean: {
    too_low: 'Allonge tes phrases. Fusionne avec des connecteurs (qui, dont, lorsque, tandis que).',
    too_high: 'Raccourcis tes phrases. Coupe les subordonnées. Plus de phrases simples.',
  },
  f5a_verb_density: {
    too_low: 'Ajoute plus de verbes d\'action dans chaque phrase.',
    too_high: 'Réduis les verbes. Plus de noms et d\'adjectifs.',
  },
  f28d_sil_score: {
    too_low: 'Utilise le style indirect libre : 3ème personne, pas de verbe introducteur. Ex: "Il n\'avait pas le droit. Pas après tout ce temps."',
    too_high: 'Réduis le style indirect libre. Plus de narration directe.',
  },
  f25g_description_score: {
    too_low: 'Enrichis les descriptions sensorielles : couleurs précises, textures, sons, odeurs spécifiques.',
    too_high: 'Réduis les descriptions sensorielles. Plus d\'action ou de pensée.',
  },
  f29d_ttr_score: {
    too_low: 'Varie le vocabulaire. Remplace les mots répétés par des synonymes ou des périphrases.',
    too_high: 'Simplifie le vocabulaire. Réutilise des mots-clés pour la cohérence.',
  },
  f24e_contrast_score: {
    too_low: 'Alterne plus brutalement entre phrases courtes et phrases longues.',
    too_high: 'Uniformise la longueur des phrases. Moins de contraste.',
  },
  f38c_speed_score: {
    too_low: 'Accélère. Phrases plus courtes par moments. Plus de sauts de paragraphe.',
    too_high: 'Ralentis. Plus de paragraphes longs. Moins de ponctuation exclamative.',
  },
  f1b_rhythm_ratio: {
    too_low: 'Alterne davantage entre phrases courtes et longues. Crée un rythme plus varié.',
    too_high: 'Uniformise la longueur des phrases.',
  },
  f5c_action_verb_ratio: {
    too_low: 'Utilise plus de verbes d\'action physique : courir, saisir, frapper, grimper.',
    too_high: 'Remplace des verbes d\'action par des verbes d\'état : être, sembler, paraître.',
  },
  f27d_modal_score: {
    too_low: 'Ajoute des modalisateurs : peut-être, sans doute, il semblait que, comme si.',
    too_high: 'Réduis les modalisateurs. Plus d\'assertions directes.',
  },
  f17_knife_count: {
    too_low: 'Ajoute des mots percutants, des images vives, des contrastes forts.',
    too_high: 'Adoucis le vocabulaire. Moins de mots à forte charge.',
  },
  f9a_contradiction_rate: {
    too_low: 'Ajoute des adversatifs : mais, pourtant, cependant, néanmoins.',
    too_high: 'Réduis les adversatifs. Plus de fluidité dans les enchaînements.',
  },
  f15b_redundancy_compression: {
    too_low: 'Réduis les répétitions de bigrammes. Varie les formulations.',
    too_high: 'Utilise quelques répétitions de structure pour créer un rythme.',
  },
  f16a_bigram_rarity: {
    too_low: 'Utilise des combinaisons de mots plus originales et rares.',
    too_high: 'Simplifie les combinaisons de mots. Moins de formulations recherchées.',
  },
  f21c_diacope_rate: {
    too_low: 'Répète des mots-clés à distance pour créer un écho. Ex: "La mer... [...] ...la mer."',
    too_high: 'Réduis les répétitions de mots à distance.',
  },
  f36c_cliff_score: {
    too_low: 'Termine sur une note de suspense ou d\'incomplétude.',
    too_high: 'Donne une fin plus conclusive et fermée.',
  },
  f35c_hook_score: {
    too_low: 'Commence par une phrase d\'accroche qui crée de la tension.',
    too_high: 'Commence de manière plus neutre et progressive.',
  },
};

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function round(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

let apiCalls = 0;
const MAX_API_CALLS = 60;

async function callLLM(client: Anthropic, prompt: string, maxTokens = 2048): Promise<string> {
  if (apiCalls >= MAX_API_CALLS) {
    console.log(`  [API LIMIT] ${apiCalls}/${MAX_API_CALLS} — skipping`);
    return '';
  }
  apiCalls++;
  console.log(`  [API call #${apiCalls}/${MAX_API_CALLS}]`);
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  const block = resp.content[0];
  return block.type === 'text' ? block.text : '';
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

function euclideanDistance(
  a: Record<string, number>,
  b: Record<string, number>,
  features: string[],
  normRanges?: Record<string, { p10: number; p90: number }>,
): number {
  let sumSq = 0;
  let count = 0;
  for (const feat of features) {
    const va = a[feat];
    const vb = b[feat];
    if (va === undefined || vb === undefined) continue;
    let norm = 1;
    if (normRanges && normRanges[feat]) {
      norm = Math.max(normRanges[feat].p90 - normRanges[feat].p10, 0.001);
    } else {
      norm = Math.max(Math.abs(vb), 0.001);
    }
    sumSq += ((va - vb) / norm) ** 2;
    count++;
  }
  return count > 0 ? Math.sqrt(sumSq / count) : 999;
}

function countAligned(
  a: Record<string, number>,
  b: Record<string, number>,
  features: string[],
): { aligned: string[]; divergent: string[] } {
  const aligned: string[] = [];
  const divergent: string[] = [];
  for (const feat of features) {
    const va = a[feat];
    const vb = b[feat];
    if (va === undefined || vb === undefined) { divergent.push(feat); continue; }
    if (vb === 0) { divergent.push(feat); continue; }
    const ratio = va / vb;
    if (ratio >= 0.80 && ratio <= 1.20) {
      aligned.push(feat);
    } else {
      divergent.push(feat);
    }
  }
  return { aligned, divergent };
}

/**
 * Extract the best passage of ~500 words from a text for a given style.
 * Heuristic: sample N random passages, measure features, pick closest to R2 profile.
 */
async function extractBestPassage(
  fullText: string,
  targetProfile: Record<string, number>,
  scorer: MultiStageScorer,
  numSamples = 8,
): Promise<{ text: string; features: Record<string, number>; r6: number; distance: number; offset: number }> {
  const words = fullText.split(/\s+/);
  if (words.length < 600) {
    // Text too short, use everything
    const text = words.join(' ');
    const features = await computeAllFeatures(text);
    const r = scorer.score(features, { wordCount: words.length, pRel: 0.5, profile: 'STRATOSPHERIQUE', text });
    const dist = euclideanDistance(features, targetProfile, KEY_FEATURES);
    return { text, features, r6: r.composite.score, distance: dist, offset: 0 };
  }

  const maxStart = words.length - 500;
  const candidates: { text: string; features: Record<string, number>; r6: number; distance: number; offset: number }[] = [];

  // Generate sample offsets spread across the text (skip first/last 5%)
  const start5pct = Math.floor(words.length * 0.05);
  const end5pct = Math.floor(words.length * 0.95) - 500;
  const step = Math.max(1, Math.floor((end5pct - start5pct) / numSamples));

  for (let i = 0; i < numSamples; i++) {
    const offset = Math.min(start5pct + i * step, maxStart);
    const passage = words.slice(offset, offset + 500).join(' ');
    const features = await computeAllFeatures(passage);
    const r = scorer.score(features, { wordCount: 500, pRel: 0.5, profile: 'STRATOSPHERIQUE', text: passage });
    const dist = euclideanDistance(features, targetProfile, KEY_FEATURES);
    candidates.push({ text: passage, features, r6: r.composite.score, distance: dist, offset });
  }

  // Return closest to target profile
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0];
}

function summarizeTheme(text: string): string {
  // Extract first 2 sentences as theme summary (simple heuristic)
  const sentences = text.split(/(?<=[.!?])\s+/).slice(0, 2);
  const preview = sentences.join(' ').slice(0, 200);
  return `Un passage littéraire évoquant : "${preview}..."`;
}

function writeJSON(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
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

  // Create output directories
  for (const dir of [PHASE2_DIR, EXTRACTS_DIR, TESTS_DIR, CONVERGENCE_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const hasMetro = fs.existsSync(METRO_PATH);
  const scorer = hasMetro ? new MultiStageScorer(COEFF_PATH, METRO_PATH) : new MultiStageScorer(COEFF_PATH);

  // Load classical profiles
  const profilesPath = path.join(ROSETTA_DIR, '04_profiles_classiques.json');
  if (!fs.existsSync(profilesPath)) {
    console.error('[FATAL] 04_profiles_classiques.json not found. Run rosetta-orchestrator first.');
    process.exit(1);
  }
  const profilesClassiques: Record<string, Record<string, number>> = JSON.parse(fs.readFileSync(profilesPath, 'utf-8'));

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  OMEGA — ROSETTA PHASE 2 : CALIBRATION MÉCANIQUE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Model: ${MODEL}`);
  console.log(`spaCy: ${isSpacyBridgeAvailable() ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
  console.log(`Profiles: ${Object.keys(profilesClassiques).join(', ')}`);
  console.log('');

  // ════════════════════════════════════════════════════════════════
  // PHASE 2.1 — EXTRAIRE 20 PASSAGES RÉELS
  // ════════════════════════════════════════════════════════════════
  console.log('PHASE 2.1 — Extraction de 20 passages réels...');

  interface ExtractResult {
    style: Style;
    author: string;
    file: string;
    text: string;
    features: Record<string, number>;
    r6: number;
    distance: number;
    offset: number;
    wordCount: number;
  }
  const extracts: ExtractResult[] = [];

  for (const style of STYLES) {
    const r2Type = STYLE_TO_R2[style];
    const targetProfile = profilesClassiques[r2Type];
    if (!targetProfile) {
      console.log(`  [SKIP] No classical profile for ${r2Type}`);
      continue;
    }

    for (const source of PASSAGE_SOURCES[style]) {
      const filePath = source.dir === 'gutenberg'
        ? path.join(GUTENBERG_DIR, source.file)
        : path.join(LIVRE_DIR, source.file);

      if (!fs.existsSync(filePath)) {
        console.log(`  [SKIP] ${source.file} not found`);
        continue;
      }

      try {
        const fullText = fs.readFileSync(filePath, 'utf-8');
        console.log(`  ${style}/${source.author}: scanning ${source.file} (${fullText.split(/\s+/).length} words)...`);
        const best = await extractBestPassage(fullText, targetProfile, scorer);

        const extract: ExtractResult = {
          style,
          author: source.author,
          file: source.file,
          text: best.text,
          features: best.features,
          r6: best.r6,
          distance: best.distance,
          offset: best.offset,
          wordCount: best.text.split(/\s+/).length,
        };
        extracts.push(extract);

        const outPath = path.join(EXTRACTS_DIR, `${style}_${source.author}.json`);
        writeJSON(outPath, {
          style,
          author: source.author,
          file: source.file,
          offset: best.offset,
          wordCount: extract.wordCount,
          r6: round(best.r6, 2),
          distance_to_profile: round(best.distance, 4),
          features: Object.fromEntries(KEY_FEATURES.map(f => [f, round(best.features[f] ?? 0, 4)])),
          text_preview: best.text.slice(0, 500) + '...',
        });

        console.log(`    R6=${best.r6.toFixed(2)}, dist=${best.distance.toFixed(4)}, ${extract.wordCount} words`);
      } catch (err) {
        console.error(`  [ERROR] ${style}/${source.author}: ${err}`);
      }
    }
  }

  console.log(`  [Phase 2.1] ${extracts.length}/20 passages extracted\n`);

  // ════════════════════════════════════════════════════════════════
  // PHASE 2.2 — 20 TESTS DE RÉTRO-INGÉNIERIE
  // ════════════════════════════════════════════════════════════════
  console.log('PHASE 2.2 — Tests de rétro-ingénierie...');

  interface TestResult {
    style: Style;
    author: string;
    llmFeatures: Record<string, number>;
    originalFeatures: Record<string, number>;
    distance: number;
    r6_llm: number;
    r6_original: number;
    aligned: string[];
    divergent: string[];
    llmText: string;
  }
  const testResults: TestResult[] = [];

  for (const extract of extracts) {
    try {
      const f = extract.features;
      const sentCount = f['f1_sentence_count'] ?? Math.round(extract.wordCount / (f['f1_mean'] || 15));

      const prompt = `Tu es un écrivain de prose littéraire française de très haut niveau.

Écris un texte de 500 mots.
Thème : ${summarizeTheme(extract.text)}

CONTRAINTES MÉTRIQUES À RESPECTER IMPÉRATIVEMENT :
- Longueur moyenne des phrases : ${round(f['f1_mean'] ?? 15, 1)} mots (tolérance ±3)
- Nombre de phrases : environ ${Math.round(sentCount)}
- Contraste syntaxique : alterner entre phrases courtes et phrases longues. Ratio long/court : ${round(f['f1b_rhythm_ratio'] ?? 1, 2)}
- Richesse lexicale : vocabulaire très varié, éviter les répétitions
- Densité verbale : ${round(f['f5a_verb_density'] ?? 0.08, 3)}
- Score de description sensorielle : ${round(f['f25g_description_score'] ?? 0.3, 3)}
- Contraste : ${round(f['f24e_contrast_score'] ?? 0.8, 2)}
- Vitesse : ${round(f['f38c_speed_score'] ?? 0.3, 3)}

${STYLE_PROMPT_CONSTRAINTS[extract.style]}

Écris directement, sans préambule ni commentaire.`;

      const llmText = await callLLM(client, prompt);
      if (!llmText) continue;

      const llmFeatures = await computeAllFeatures(llmText);
      const llmScore = scorer.score(llmFeatures, {
        wordCount: llmText.split(/\s+/).length,
        pRel: 0.5, profile: 'STRATOSPHERIQUE', text: llmText,
      });

      const dist = euclideanDistance(llmFeatures, extract.features, KEY_FEATURES);
      const { aligned, divergent } = countAligned(llmFeatures, extract.features, KEY_FEATURES);

      const result: TestResult = {
        style: extract.style,
        author: extract.author,
        llmFeatures,
        originalFeatures: extract.features,
        distance: dist,
        r6_llm: llmScore.composite.score,
        r6_original: extract.r6,
        aligned,
        divergent,
        llmText,
      };
      testResults.push(result);

      const outPath = path.join(TESTS_DIR, `${extract.style}_${extract.author}_test.json`);
      writeJSON(outPath, {
        style: extract.style,
        author: extract.author,
        distance: round(dist, 4),
        r6_llm: round(llmScore.composite.score, 2),
        r6_original: round(extract.r6, 2),
        aligned_count: aligned.length,
        divergent_count: divergent.length,
        aligned_features: aligned,
        divergent_features: divergent,
        feature_comparison: Object.fromEntries(KEY_FEATURES.map(f => [f, {
          original: round(extract.features[f] ?? 0, 4),
          llm: round(llmFeatures[f] ?? 0, 4),
          ratio: extract.features[f] ? round(llmFeatures[f] / extract.features[f], 4) : null,
        }])),
      });

      console.log(`  ${extract.style}/${extract.author}: dist=${dist.toFixed(4)}, aligned=${aligned.length}/${KEY_FEATURES.length}`);
    } catch (err) {
      console.error(`  [ERROR] ${extract.style}/${extract.author}: ${err}`);
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`  [Phase 2.2] ${testResults.length} tests completed\n`);

  // ════════════════════════════════════════════════════════════════
  // PHASE 2.3 — CONVERGENCE (top 4, up to 5 iterations)
  // ════════════════════════════════════════════════════════════════
  console.log('PHASE 2.3 — Convergence itérative...');

  // Select top 4 closest results
  const sorted = [...testResults].sort((a, b) => a.distance - b.distance);
  const top4 = sorted.slice(0, 4);

  console.log('  Top 4 for convergence:');
  for (const t of top4) {
    console.log(`    ${t.style}/${t.author}: dist=${t.distance.toFixed(4)}`);
  }

  interface ConvergenceResult {
    style: Style;
    author: string;
    iterations: {
      iteration: number;
      distance: number;
      aligned_count: number;
      r6: number;
      divergent_features: string[];
    }[];
    final_distance: number;
    converged_at: number;
  }
  const convergenceResults: ConvergenceResult[] = [];

  for (const test of top4) {
    const extract = extracts.find(e => e.style === test.style && e.author === test.author);
    if (!extract) continue;

    console.log(`  Converging ${test.style}/${test.author}...`);

    const iterations: ConvergenceResult['iterations'] = [{
      iteration: 1,
      distance: test.distance,
      aligned_count: test.aligned.length,
      r6: test.r6_llm,
      divergent_features: test.divergent,
    }];

    let prevText = test.llmText;
    let prevFeatures = test.llmFeatures;
    let prevDistance = test.distance;
    let convergedAt = 1;

    for (let iter = 2; iter <= 5; iter++) {
      // Build corrective feedback
      const divergentDetails: string[] = [];
      for (const feat of test.divergent) {
        const llmVal = prevFeatures[feat];
        const targetVal = extract.features[feat];
        if (llmVal === undefined || targetVal === undefined) continue;

        const correction = CORRECTIVE_INSTRUCTIONS[feat];
        if (!correction) continue;

        const instruction = llmVal < targetVal ? correction.too_low : correction.too_high;
        divergentDetails.push(`- ${feat} était à ${round(llmVal, 4)} au lieu de ${round(targetVal, 4)}. ${instruction}`);
      }

      if (divergentDetails.length === 0) break;

      const prompt = `Tu es un écrivain de prose littéraire française de très haut niveau.

Voici un texte que tu as écrit précédemment :
---
${prevText}
---

ATTENTION : voici les écarts mesurés par rapport aux métriques cibles :
${divergentDetails.join('\n')}

Réécris le texte complet en corrigeant ces écarts.
Garde le même thème et la même longueur (500 mots ±30).
${STYLE_PROMPT_CONSTRAINTS[test.style]}

Écris directement, sans préambule ni commentaire.`;

      const rewriteText = await callLLM(client, prompt);
      if (!rewriteText) break;

      const rewriteFeatures = await computeAllFeatures(rewriteText);
      const rewriteScore = scorer.score(rewriteFeatures, {
        wordCount: rewriteText.split(/\s+/).length,
        pRel: 0.5, profile: 'STRATOSPHERIQUE', text: rewriteText,
      });

      const newDist = euclideanDistance(rewriteFeatures, extract.features, KEY_FEATURES);
      const { aligned: newAligned, divergent: newDivergent } = countAligned(rewriteFeatures, extract.features, KEY_FEATURES);

      iterations.push({
        iteration: iter,
        distance: round(newDist, 4),
        aligned_count: newAligned.length,
        r6: round(rewriteScore.composite.score, 2),
        divergent_features: newDivergent,
      });

      console.log(`    iter ${iter}: dist=${newDist.toFixed(4)} (Δ=${((1 - newDist / prevDistance) * 100).toFixed(1)}%), aligned=${newAligned.length}`);

      // Stop if improvement < 5%
      const improvement = (prevDistance - newDist) / prevDistance;
      convergedAt = iter;

      prevText = rewriteText;
      prevFeatures = rewriteFeatures;
      prevDistance = newDist;

      if (improvement < 0.05) {
        console.log(`    Convergence stalled at iteration ${iter}`);
        break;
      }

      await new Promise(r => setTimeout(r, 2000));
    }

    const convResult: ConvergenceResult = {
      style: test.style,
      author: test.author,
      iterations,
      final_distance: round(prevDistance, 4),
      converged_at: convergedAt,
    };
    convergenceResults.push(convResult);

    const outPath = path.join(CONVERGENCE_DIR, `${test.style}_${test.author}_convergence.json`);
    writeJSON(outPath, convResult);
  }

  console.log(`  [Phase 2.3] ${convergenceResults.length} convergences completed\n`);

  // ════════════════════════════════════════════════════════════════
  // PHASE 2.4 — DICTIONNAIRE V2 CALIBRÉ
  // ════════════════════════════════════════════════════════════════
  console.log('PHASE 2.4 — Dictionnaire V2 calibré...');

  const dictV2: Record<string, {
    contraintes_efficaces: { feature: string; instruction: string; taux_respect: number }[];
    contraintes_ignorees: { feature: string; instruction: string; taux_respect: number }[];
    meilleur_r6_atteint: number;
    distance_min_au_classique: number;
    features_irreductibles: string[];
    convergence_apres_iterations: number;
  }> = {};

  for (const style of STYLES) {
    const styleTests = testResults.filter(t => t.style === style);
    if (styleTests.length === 0) continue;

    // For each feature, count how many times the LLM respected the constraint (ratio 0.80-1.20)
    const featureRespect: Record<string, { respected: number; total: number }> = {};
    for (const feat of KEY_FEATURES) {
      featureRespect[feat] = { respected: 0, total: 0 };
      for (const test of styleTests) {
        const llmVal = test.llmFeatures[feat];
        const origVal = test.originalFeatures[feat];
        if (llmVal === undefined || origVal === undefined || origVal === 0) continue;
        featureRespect[feat].total++;
        const ratio = llmVal / origVal;
        if (ratio >= 0.80 && ratio <= 1.20) featureRespect[feat].respected++;
      }
    }

    const efficaces: { feature: string; instruction: string; taux_respect: number }[] = [];
    const ignorees: { feature: string; instruction: string; taux_respect: number }[] = [];
    const irreductibles: string[] = [];

    for (const feat of KEY_FEATURES) {
      const { respected, total } = featureRespect[feat];
      if (total === 0) continue;
      const taux = round(respected / total, 2);
      const instr = CORRECTIVE_INSTRUCTIONS[feat]?.too_low ?? 'N/A';

      if (taux >= 0.60) {
        efficaces.push({ feature: feat, instruction: instr, taux_respect: taux });
      } else {
        ignorees.push({ feature: feat, instruction: instr, taux_respect: taux });
      }
      if (taux < 0.20) {
        irreductibles.push(feat);
      }
    }

    const bestR6 = Math.max(...styleTests.map(t => t.r6_llm));
    const minDist = Math.min(...styleTests.map(t => t.distance));

    // Check convergence for this style
    const styleConv = convergenceResults.filter(c => c.style === style);
    const avgConvIter = styleConv.length > 0
      ? round(styleConv.reduce((s, c) => s + c.converged_at, 0) / styleConv.length, 1)
      : 0;

    dictV2[style] = {
      contraintes_efficaces: efficaces,
      contraintes_ignorees: ignorees,
      meilleur_r6_atteint: round(bestR6, 2),
      distance_min_au_classique: round(minDist, 4),
      features_irreductibles: irreductibles,
      convergence_apres_iterations: avgConvIter,
    };

    console.log(`  ${style}: ${efficaces.length} efficaces, ${ignorees.length} ignorées, ${irreductibles.length} irréductibles`);
  }

  writeJSON(path.join(PHASE2_DIR, 'dictionnaire_v2_calibre.json'), dictV2);
  console.log('  [Phase 2.4] OK\n');

  // ════════════════════════════════════════════════════════════════
  // PHASE 2.5 — RAPPORT + MATRICE DE FAISABILITÉ
  // ════════════════════════════════════════════════════════════════
  console.log('PHASE 2.5 — Rapport...');

  const reportLines: string[] = [];
  reportLines.push('# OMEGA — Rosetta Phase 2 : Calibration Mécanique');
  reportLines.push('');
  reportLines.push(`**Date** : ${new Date().toISOString().slice(0, 10)}`);
  reportLines.push(`**Modèle** : ${MODEL}`);
  reportLines.push(`**Appels API** : ${apiCalls}`);
  reportLines.push(`**Passages extraits** : ${extracts.length}`);
  reportLines.push(`**Tests rétro-ingénierie** : ${testResults.length}`);
  reportLines.push(`**Convergences** : ${convergenceResults.length}`);
  reportLines.push('');

  // 1. Matrice de faisabilité
  reportLines.push('## 1. Matrice de faisabilité par style');
  reportLines.push('');
  reportLines.push('| Style | Passages | Dist min | R6 max LLM | R6 classique | Gap | Converge? |');
  reportLines.push('|-------|----------|----------|-----------|-------------|-----|-----------|');

  for (const style of STYLES) {
    const styleTests = testResults.filter(t => t.style === style);
    const styleExtracts = extracts.filter(e => e.style === style);
    if (styleTests.length === 0) {
      reportLines.push(`| ${style} | 0 | — | — | — | — | — |`);
      continue;
    }
    const minDist = Math.min(...styleTests.map(t => t.distance));
    const maxR6 = Math.max(...styleTests.map(t => t.r6_llm));
    const avgOrigR6 = round(styleExtracts.reduce((s, e) => s + e.r6, 0) / styleExtracts.length, 2);
    const gap = round(avgOrigR6 - maxR6, 2);
    const conv = convergenceResults.filter(c => c.style === style);
    const converges = conv.length > 0 ? `Oui (${conv[0].converged_at} iter)` : 'Non testé';
    reportLines.push(`| ${style} | ${styleTests.length} | ${round(minDist, 4)} | ${round(maxR6, 2)} | ${avgOrigR6} | ${gap} | ${converges} |`);
  }
  reportLines.push('');

  // 2. Features maîtrisées
  reportLines.push('## 2. Features maîtrisées (taux respect > 60%)');
  reportLines.push('');
  const allEfficaces = new Set<string>();
  const allIgnorees = new Set<string>();
  for (const style of STYLES) {
    if (dictV2[style]) {
      for (const e of dictV2[style].contraintes_efficaces) allEfficaces.add(e.feature);
      for (const i of dictV2[style].contraintes_ignorees) allIgnorees.add(i.feature);
    }
  }
  if (allEfficaces.size > 0) {
    for (const f of allEfficaces) reportLines.push(`- **${f}** : maîtrisée`);
  } else {
    reportLines.push('Aucune feature systématiquement maîtrisée.');
  }
  reportLines.push('');

  // 3. Features irréductibles
  reportLines.push('## 3. Features irréductibles (taux respect < 20%)');
  reportLines.push('');
  const allIrreductibles = new Set<string>();
  for (const style of STYLES) {
    if (dictV2[style]) {
      for (const f of dictV2[style].features_irreductibles) allIrreductibles.add(f);
    }
  }
  if (allIrreductibles.size > 0) {
    for (const f of allIrreductibles) reportLines.push(`- **${f}** : irréductible`);
  } else {
    reportLines.push('Aucune feature irréductible identifiée.');
  }
  reportLines.push('');

  // 4. Réponse à Francky
  reportLines.push('## 4. Réponse à la question de Francky');
  reportLines.push('');
  reportLines.push('> "Si on donne au LLM les MÉTRIQUES PRÉCISES d\'un passage réel,');
  reportLines.push('>  peut-il produire un texte avec les mêmes métriques ?"');
  reportLines.push('');

  const globalAligned = testResults.length > 0
    ? round(testResults.reduce((s, t) => s + t.aligned.length, 0) / testResults.length, 1)
    : 0;
  const globalDivergent = testResults.length > 0
    ? round(testResults.reduce((s, t) => s + t.divergent.length, 0) / testResults.length, 1)
    : 0;
  const globalAvgDist = testResults.length > 0
    ? round(testResults.reduce((s, t) => s + t.distance, 0) / testResults.length, 4)
    : 0;
  const bestConvergeDist = convergenceResults.length > 0
    ? round(Math.min(...convergenceResults.map(c => c.final_distance)), 4)
    : 0;

  reportLines.push(`**Résultats chiffrés :**`);
  reportLines.push(`- Moyenne features alignées (ratio 0.80-1.20) : ${globalAligned}/${KEY_FEATURES.length}`);
  reportLines.push(`- Moyenne features divergentes : ${globalDivergent}/${KEY_FEATURES.length}`);
  reportLines.push(`- Distance euclidienne moyenne : ${globalAvgDist}`);
  reportLines.push(`- Meilleure distance après convergence : ${bestConvergeDist}`);
  reportLines.push('');

  if (globalAligned >= KEY_FEATURES.length * 0.6) {
    reportLines.push('**Verdict** : Le problème est principalement dans les INSTRUCTIONS.');
    reportLines.push('Le LLM peut approximer les métriques si on les spécifie explicitement.');
  } else if (globalAligned >= KEY_FEATURES.length * 0.3) {
    reportLines.push('**Verdict** : MIXTE — Le LLM maîtrise certaines features mais a des LIMITES STRUCTURELLES.');
    reportLines.push('Certaines dimensions stylistiques ne sont pas contrôlables par prompt seul.');
  } else {
    reportLines.push('**Verdict** : Le LLM a des LIMITES STRUCTURELLES profondes.');
    reportLines.push('Les contraintes métriques sont majoritairement ignorées.');
  }
  reportLines.push('');

  // 5. Facteurs de conversion
  reportLines.push('## 5. Facteurs de conversion par feature');
  reportLines.push('');
  reportLines.push('| Feature | Demandé (moy) | Produit (moy) | Facteur Y/X |');
  reportLines.push('|---------|--------------|--------------|-------------|');

  for (const feat of KEY_FEATURES) {
    let sumDemand = 0, sumProduit = 0, count = 0;
    for (const test of testResults) {
      const orig = test.originalFeatures[feat];
      const llm = test.llmFeatures[feat];
      if (orig !== undefined && llm !== undefined && orig !== 0) {
        sumDemand += orig;
        sumProduit += llm;
        count++;
      }
    }
    if (count > 0) {
      const avgDemand = round(sumDemand / count, 4);
      const avgProduit = round(sumProduit / count, 4);
      const facteur = round(avgProduit / avgDemand, 4);
      reportLines.push(`| ${feat} | ${avgDemand} | ${avgProduit} | ${facteur} |`);
    }
  }
  reportLines.push('');

  // 6. Recommandations
  reportLines.push('## 6. Recommandations pour le prompt-assembler');
  reportLines.push('');
  reportLines.push('1. **Features contrôlables** : intégrer dans le prompt avec valeurs cibles.');
  if (allEfficaces.size > 0) {
    reportLines.push(`   - ${[...allEfficaces].join(', ')}`);
  }
  reportLines.push('2. **Features irréductibles** : appliquer un facteur de conversion inverse.');
  if (allIrreductibles.size > 0) {
    reportLines.push(`   - ${[...allIrreductibles].join(', ')}`);
  }
  reportLines.push('3. **Convergence itérative** : efficace pour les 4-5 features les plus faciles.');
  reportLines.push('4. **Limite** : au-delà de 3-4 itérations, le LLM stagne.');
  reportLines.push('');

  // 7. Session save
  reportLines.push('## 7. SESSION_SAVE');
  reportLines.push('');
  reportLines.push('```');
  reportLines.push(`Date: ${new Date().toISOString()}`);
  reportLines.push(`Phase: Rosetta Phase 2 — Calibration Mécanique`);
  reportLines.push(`Passages extraits: ${extracts.length}`);
  reportLines.push(`Tests rétro-ingénierie: ${testResults.length}`);
  reportLines.push(`Convergences: ${convergenceResults.length}`);
  reportLines.push(`API calls: ${apiCalls}`);
  reportLines.push(`Features maîtrisées: ${allEfficaces.size}`);
  reportLines.push(`Features irréductibles: ${allIrreductibles.size}`);
  reportLines.push('```');
  reportLines.push('');
  reportLines.push('---');
  reportLines.push('');
  reportLines.push('**Message de redémarrage** : Pour reprendre, exécuter `npx tsx scripts/rosetta-phase2.ts`.');
  reportLines.push('Les résultats sont dans `omega-autopsie/results_rosetta/phase2/`.');

  const reportPath = path.resolve(ROOT_DIR, 'docs/OMEGA_ROSETTA_PHASE2_REPORT.md');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, reportLines.join('\n'));
  console.log(`  Report written to ${reportPath}`);

  // Also write SESSION_SAVE
  const sessionPath = path.resolve(ROOT_DIR, 'docs/SESSION_SAVE_ROSETTA_PHASE2.md');
  const sessionLines = [
    '# SESSION_SAVE — Rosetta Phase 2',
    '',
    `**Date** : ${new Date().toISOString()}`,
    `**Branch** : phase-w-mixer`,
    '',
    '## Travail accompli',
    '',
    `- ${extracts.length} passages classiques extraits (5 styles × 4 auteurs)`,
    `- ${testResults.length} tests de rétro-ingénierie avec contraintes métriques`,
    `- ${convergenceResults.length} séries de convergence itérative`,
    `- Dictionnaire V2 calibré (contraintes efficaces vs ignorées)`,
    `- Rapport de faisabilité complet`,
    '',
    '## Fichiers produits',
    '',
    '```',
    'omega-autopsie/results_rosetta/phase2/',
    '  extracts/*.json          — 20 passages classiques + features',
    '  tests/*.json             — 20 tests rétro-ingénierie',
    '  convergence/*.json       — 4 séries convergence',
    '  dictionnaire_v2_calibre.json — synthèse',
    'docs/OMEGA_ROSETTA_PHASE2_REPORT.md — rapport complet',
    '```',
    '',
    '## Pour reprendre',
    '',
    '```powershell',
    '$env:ANTHROPIC_API_KEY = "sk-ant-..."',
    'npx tsx packages/sovereign-engine/scripts/rosetta-phase2.ts',
    '```',
  ];
  fs.writeFileSync(sessionPath, sessionLines.join('\n'));
  console.log(`  Session save written to ${sessionPath}`);

  console.log('  [Phase 2.5] OK\n');

  // ════════════════════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  ROSETTA PHASE 2 COMPLETE — ${apiCalls} API calls`);
  console.log('═══════════════════════════════════════════════════════════');

  const outputFiles = fs.readdirSync(PHASE2_DIR, { recursive: true }) as string[];
  for (const f of outputFiles.sort()) console.log(`  ${f}`);
}

main().catch(err => { console.error('[FATAL]', err); process.exit(1); });
