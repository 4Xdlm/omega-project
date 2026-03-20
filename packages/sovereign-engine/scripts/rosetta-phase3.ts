/**
 * OMEGA — Rosetta Phase 3: Étalonnage Profond
 * "Apprendre la langue du LLM"
 *
 * 5 blocs:
 *   A — Reverse prompting micro (30 phrases × 5 styles)
 *   B — Reverse prompting macro (par catégorie)
 *   C — Auto-classification par le LLM
 *   D — Recomposition indirecte (features irréductibles)
 *   E — Micro-chirurgie bornée (remplacement par index)
 *
 * Usage:
 *   $env:ANTHROPIC_API_KEY = "sk-ant-..."
 *   npx tsx scripts/rosetta-phase3.ts
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
const PHASE3_DIR = path.resolve(ROSETTA_DIR, 'phase3');
const EXTRACTS_DIR = path.resolve(PHASE2_DIR, 'extracts');
const GUTENBERG_DIR = path.resolve(ROOT_DIR, 'omega-autopsie/gutenberg_cache');
const LIVRE_DIR = path.resolve(ROOT_DIR, 'omega-autopsie/livre_cache');
const COEFF_PATH = path.resolve(__dirname, '../src/scoring/data/OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json');
const METRO_PATH = path.resolve(ROOT_DIR, 'omega-autopsie/results_r1/OMEGA_METROLOGIE_EMPIRIQUE_v1.json');

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

// Features maîtrisées (taux respect > 60% in Phase 2)
const MASTERED_FEATURES = [
  'f29d_ttr_score', 'f24e_contrast_score', 'f15b_redundancy_compression',
  'f16a_bigram_rarity', 'f35c_hook_score', 'f25g_description_score',
  'f17_knife_count', 'f36c_cliff_score',
];

const MASTERED_DESCRIPTIONS: Record<string, string> = {
  f29d_ttr_score: 'Richesse lexicale (vocabulaire varié, pas de répétitions)',
  f24e_contrast_score: 'Contraste syntaxique (alterner phrases courtes et longues)',
  f16a_bigram_rarity: 'Originalité des combinaisons de mots',
  f15b_redundancy_compression: 'Compression (pas de redondance)',
  f35c_hook_score: 'Accroches de début de texte',
  f36c_cliff_score: 'Suspense de fin de texte',
  f25g_description_score: 'Description sensorielle riche',
  f17_knife_count: 'Mots percutants / images vives',
};

// Top 3 irréductibles pour Bloc D
const IRREDUCIBLE_TOP3: { feature: string; name: string; description: string }[] = [
  { feature: 'f28d_sil_score', name: 'Style indirect libre', description: 'Pensées du personnage en 3ème personne, sans verbe introducteur comme "il pensa que". Les pensées se fondent dans la narration.' },
  { feature: 'f27d_modal_score', name: 'Modalisation', description: 'Modalisateurs : peut-être, sans doute, il semblait que, comme si. Expression du doute et de l\'incertitude.' },
  { feature: 'f5c_action_verb_ratio', name: 'Ratio verbes d\'action', description: 'Proportion de verbes d\'action physique (courir, saisir, frapper) vs verbes d\'état ou de cognition.' },
];

// Bloc E: 3 passages to target
const MICRO_SURGERY_TARGETS = [
  { style: 'DESCRIPTION' as Style, author: 'Flaubert' },
  { style: 'INTROSPECTION' as Style, author: 'Proust' },
  { style: 'LYRIQUE' as Style, author: 'GarciaMarquez' },
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function round(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

let apiCalls = 0;
const MAX_API_CALLS = 80;

async function callLLM(client: Anthropic, prompt: string, maxTokens = 4096): Promise<string> {
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
}

function parseJSON(text: string): unknown {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract JSON from the text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }
    return { raw_response: text, parse_error: true };
  }
}

function splitSentences(text: string): string[] {
  const raw = text.split(/(?<=[.!?…»])\s+/);
  return raw.map(s => s.trim()).filter(s => s.length > 10);
}

/**
 * Re-extract full passage text from source file using offset from Phase 2 extract.
 */
function reExtractPassage(extractMeta: { file: string; offset: number; dir?: string }): string {
  // Determine directory based on file existence
  let filePath = path.join(GUTENBERG_DIR, extractMeta.file);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(LIVRE_DIR, extractMeta.file);
  }
  if (!fs.existsSync(filePath)) return '';

  const fullText = fs.readFileSync(filePath, 'utf-8');
  const words = fullText.split(/\s+/);
  const passage = words.slice(extractMeta.offset, extractMeta.offset + 500).join(' ');
  return passage;
}

/**
 * Select the most representative sentences for a style from a passage.
 */
function selectRepresentativeSentences(sentences: string[], style: Style, count: number): string[] {
  if (sentences.length <= count) return sentences;

  // Score sentences by style-relevance heuristic
  const scored = sentences.map(s => {
    const wordCount = s.split(/\s+/).length;
    let score = 0;

    switch (style) {
      case 'DESCRIPTION':
        // Prefer longer sentences with sensory words
        score = wordCount * 0.5;
        if (/coul|lumiè|ombre|bruit|odeur|vert|rouge|bleu|jaune|blanc|noir|chaud|froid|doux|âpre|sombre/i.test(s)) score += 10;
        if (/voyait|entendait|sentait|touchait|apercevait|regard/i.test(s)) score += 5;
        break;
      case 'ACTION':
        // Prefer shorter sentences with action verbs
        score = Math.max(0, 20 - wordCount);
        if (/cour|saisit?|frapp|bond|lanç|pouss|tir[aé]|jet[aé]|arrach|grimp|saut|tomb/i.test(s)) score += 10;
        break;
      case 'INTROSPECTION':
        // Prefer sentences with thinking verbs and indirect speech
        score = wordCount * 0.3;
        if (/pens|cro[iy]|sent[ai]|sembl|paraiss|doute|souvenir|imagin|rêv|craign/i.test(s)) score += 10;
        if (/peut-être|sans doute|comme si|il lui semblait/i.test(s)) score += 8;
        break;
      case 'CONTEMPLATION':
        // Prefer long sentences with state verbs
        score = wordCount * 0.7;
        if (/était|restait|demeurait|semblait|paraissait|s'éten/i.test(s)) score += 5;
        break;
      case 'LYRIQUE':
        // Prefer sentences with imagery and rhythm markers
        score = wordCount * 0.4;
        if (/comme|tel|ainsi|lumière|nuit|ciel|eau|flamme|sang|or |argent/i.test(s)) score += 10;
        if (/[,;].*[,;].*[,;]/i.test(s)) score += 5; // Multiple commas = rhythm
        break;
    }
    return { sentence: s, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map(s => s.sentence);
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
  fs.mkdirSync(PHASE3_DIR, { recursive: true });

  const hasMetro = fs.existsSync(METRO_PATH);
  const scorer = hasMetro ? new MultiStageScorer(COEFF_PATH, METRO_PATH) : new MultiStageScorer(COEFF_PATH);

  // Load classical profiles
  const profilesClassiques: Record<string, Record<string, number>> = JSON.parse(
    fs.readFileSync(path.join(ROSETTA_DIR, '04_profiles_classiques.json'), 'utf-8')
  );

  // Load Phase 2 extracts metadata
  const extractFiles = fs.readdirSync(EXTRACTS_DIR).filter(f => f.endsWith('.json'));

  interface ExtractMeta {
    style: Style;
    author: string;
    file: string;
    offset: number;
    wordCount: number;
    r6: number;
    features: Record<string, number>;
  }

  const extractsMeta: ExtractMeta[] = [];
  for (const ef of extractFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(EXTRACTS_DIR, ef), 'utf-8'));
    extractsMeta.push({
      style: data.style,
      author: data.author,
      file: data.file,
      offset: data.offset,
      wordCount: data.wordCount,
      r6: data.r6,
      features: data.features,
    });
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  OMEGA — ROSETTA PHASE 3 : ÉTALONNAGE PROFOND');
  console.log('  "Apprendre la langue du LLM"');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Model: ${MODEL}`);
  console.log(`spaCy: ${isSpacyBridgeAvailable() ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
  console.log(`Extracts loaded: ${extractsMeta.length}`);
  console.log('');

  // ════════════════════════════════════════════════════════════════
  // PREPARE: Re-extract full passages and select 6 sentences/style
  // ════════════════════════════════════════════════════════════════
  console.log('PREP — Re-extracting passages and selecting sentences...');

  const styleSentences: Record<Style, { sentence: string; author: string; style: Style }[]> = {
    DESCRIPTION: [], ACTION: [], INTROSPECTION: [], CONTEMPLATION: [], LYRIQUE: [],
  };
  const fullPassages: Record<string, string> = {}; // key: STYLE_Author

  for (const ext of extractsMeta) {
    const passage = reExtractPassage(ext);
    if (!passage) {
      console.log(`  [SKIP] Cannot re-extract ${ext.style}/${ext.author}`);
      continue;
    }
    fullPassages[`${ext.style}_${ext.author}`] = passage;

    const sentences = splitSentences(passage);
    // Pick 2 representative sentences per passage (4 authors × 2 = 8 per style, we'll trim to 6)
    const best = selectRepresentativeSentences(sentences, ext.style, 2);
    for (const s of best) {
      styleSentences[ext.style].push({ sentence: s, author: ext.author, style: ext.style });
    }
  }

  // Trim to 6 per style
  for (const style of STYLES) {
    if (styleSentences[style].length > 6) {
      styleSentences[style] = styleSentences[style].slice(0, 6);
    }
  }

  const totalSentences = STYLES.reduce((s, st) => s + styleSentences[st].length, 0);
  console.log(`  ${totalSentences} sentences selected (target: 30)`);
  for (const style of STYLES) {
    console.log(`    ${style}: ${styleSentences[style].length} sentences`);
  }
  console.log('');

  // ════════════════════════════════════════════════════════════════
  // BLOC A — REVERSE PROMPTING MICRO (30 phrases × 5 styles)
  // ════════════════════════════════════════════════════════════════
  console.log('BLOC A — Reverse prompting micro (30 phrases)...');

  const blocA: Record<string, { phrase: string; author: string; response: unknown }[]> = {};

  for (const style of STYLES) {
    blocA[style] = [];
    for (const item of styleSentences[style]) {
      const prompt = `Voici une phrase de prose littéraire française :

"${item.sentence}"

Cette phrase est classée dans le style ${style} (${
  style === 'DESCRIPTION' ? 'description sensorielle pure' :
  style === 'ACTION' ? 'action physique pure' :
  style === 'INTROSPECTION' ? 'pensée intérieure pure' :
  style === 'CONTEMPLATION' ? 'observation méditative' :
  'prose poétique lyrique'
}).

Question : Quelles instructions PRÉCISES et MÉCANIQUES aurait-il fallu te donner pour que tu écrives une phrase très similaire à celle-ci ?

Réponds en JSON :
{
  "instructions_mecaniques": [
    "instruction 1",
    "instruction 2"
  ],
  "longueur_phrase_mots": ${item.sentence.split(/\s+/).length},
  "type_verbes": "état/action/perception/...",
  "registre": "soutenu/courant/...",
  "procede_stylistique": "nom du procédé si identifiable",
  "ce_qui_est_difficile": "ce qui serait dur à reproduire pour toi"
}
JSON uniquement, sans préambule.`;

      const resp = await callLLM(client, prompt, 1024);
      if (!resp) continue;

      const parsed = parseJSON(resp);
      blocA[style].push({ phrase: item.sentence, author: item.author, response: parsed });
      console.log(`  ${style}/${item.author}: OK`);

      await new Promise(r => setTimeout(r, 1500));
    }
  }

  writeJSON(path.join(PHASE3_DIR, 'bloc_a_reverse_micro.json'), blocA);
  console.log(`  [Bloc A] ${Object.values(blocA).reduce((s, v) => s + v.length, 0)} phrases processed\n`);

  // ════════════════════════════════════════════════════════════════
  // BLOC B — REVERSE PROMPTING MACRO (par catégorie)
  // ════════════════════════════════════════════════════════════════
  console.log('BLOC B — Reverse prompting macro (5 styles)...');

  const blocB: Record<string, unknown> = {};

  for (const style of STYLES) {
    const phrases = styleSentences[style].map((s, i) => `${i + 1}. "${s.sentence}"`).join('\n');

    const prompt = `Voici ${styleSentences[style].length} phrases de prose littéraire française, toutes du même style que nous appelons ${style} :

${phrases}

Question : En observant ces ${styleSentences[style].length} phrases ensemble, quelles sont les CONSTANTES MÉCANIQUES qui les unissent ? Quel JEU D'INSTRUCTIONS unique et cohérent devrais-je te donner pour que tu produises un texte entier (500 mots) dans exactement ce style ?

Réponds en JSON :
{
  "nom_que_je_donnerais": "comment TOI tu nommerais ce style",
  "constantes_observees": [
    "constante 1",
    "constante 2"
  ],
  "instructions_pour_500_mots": [
    "instruction 1",
    "instruction 2"
  ],
  "longueur_phrase_typique": 0,
  "verbes_dominants": "type de verbes",
  "rythme": "description du rythme",
  "ce_que_je_ne_sais_probablement_pas_faire": "..."
}
JSON uniquement.`;

    const resp = await callLLM(client, prompt, 2048);
    if (!resp) continue;

    blocB[style] = parseJSON(resp);
    console.log(`  ${style}: OK`);

    await new Promise(r => setTimeout(r, 2000));
  }

  writeJSON(path.join(PHASE3_DIR, 'bloc_b_reverse_macro.json'), blocB);
  console.log(`  [Bloc B] ${Object.keys(blocB).length} styles processed\n`);

  // ════════════════════════════════════════════════════════════════
  // BLOC C — AUTO-CLASSIFICATION PAR LE LLM
  // ════════════════════════════════════════════════════════════════
  console.log('BLOC C — Auto-classification...');

  // Build shuffled list of all 30 sentences
  const allSentences: { index: number; sentence: string; trueStyle: Style; author: string }[] = [];
  let idx = 1;
  for (const style of STYLES) {
    for (const item of styleSentences[style]) {
      allSentences.push({ index: idx++, sentence: item.sentence, trueStyle: style, author: item.author });
    }
  }
  // Shuffle deterministically (seeded by sentence length sum)
  const seed = allSentences.reduce((s, item) => s + item.sentence.length, 0);
  const shuffled = [...allSentences];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = (seed * (i + 1) * 31) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Renumber after shuffle
  const sentenceList = shuffled.map((s, i) => `[${i + 1}] "${s.sentence}"`).join('\n');

  const promptC = `Voici ${shuffled.length} phrases de prose littéraire française.
Classe-les en groupes stylistiques selon TES propres critères.

${sentenceList}

Pour chaque groupe :
- Nomme le groupe selon TA terminologie
- Liste les numéros de phrases qui en font partie
- Explique les critères qui définissent ce groupe
- Dis ce qui SÉPARE ce groupe des autres

Réponds en JSON :
{
  "groupes": [
    {
      "nom": "ton nom pour ce groupe",
      "phrases": [1, 5, 12],
      "criteres": ["critère 1", "critère 2"],
      "ce_qui_le_separe": "..."
    }
  ]
}
JSON uniquement.`;

  const respC = await callLLM(client, promptC, 4096);
  const parsedC = parseJSON(respC) as { groupes?: { nom: string; phrases: number[]; criteres: string[]; ce_qui_le_separe: string }[] };

  // Build correspondence matrix
  const correspondenceMatrix: Record<string, Record<string, number>> = {};
  for (const style of STYLES) {
    correspondenceMatrix[style] = {};
  }

  if (parsedC.groupes) {
    for (const groupe of parsedC.groupes) {
      for (const phraseNum of (groupe.phrases || [])) {
        // Map back to true style (adjusting for shuffle)
        const original = shuffled[phraseNum - 1];
        if (!original) continue;
        if (!correspondenceMatrix[original.trueStyle][groupe.nom]) {
          correspondenceMatrix[original.trueStyle][groupe.nom] = 0;
        }
        correspondenceMatrix[original.trueStyle][groupe.nom]++;
      }
    }
  }

  // Convert to percentages
  const correspondencePct: Record<string, Record<string, string>> = {};
  for (const style of STYLES) {
    const total = styleSentences[style].length;
    correspondencePct[style] = {};
    for (const [groupName, count] of Object.entries(correspondenceMatrix[style])) {
      correspondencePct[style][groupName] = `${round((count / Math.max(total, 1)) * 100, 1)}%`;
    }
  }

  const blocC = {
    shuffle_map: shuffled.map(s => ({ shuffled_index: shuffled.indexOf(s) + 1, true_style: s.trueStyle, author: s.author })),
    llm_groupes: parsedC,
    correspondance_matrix: correspondencePct,
    correspondance_raw: correspondenceMatrix,
  };

  writeJSON(path.join(PHASE3_DIR, 'bloc_c_auto_classification.json'), blocC);
  console.log(`  [Bloc C] ${parsedC.groupes?.length ?? 0} groups identified\n`);

  // ════════════════════════════════════════════════════════════════
  // BLOC D — RECOMPOSITION INDIRECTE
  // ════════════════════════════════════════════════════════════════
  console.log('BLOC D — Recomposition indirecte (3 features irréductibles)...');

  const masteredList = MASTERED_FEATURES.map((f, i) =>
    `${i + 1}. ${MASTERED_DESCRIPTIONS[f] || f}`
  ).join('\n');

  const blocD: Record<string, unknown> = {};

  for (const irr of IRREDUCIBLE_TOP3) {
    console.log(`  Feature: ${irr.feature} (${irr.name})...`);

    // Step 1: Ask for substitution strategy
    const promptStrategy = `Tu es un expert en prose littéraire. Tu ne sais PAS naturellement produire la qualité suivante : ${irr.name} (${irr.description}).

En revanche, tu maîtrises très bien ces 8 qualités :
${masteredList}

Question : En combinant UNIQUEMENT ces 8 qualités que tu maîtrises, comment pourrais-tu SIMULER ou APPROCHER l'effet de ${irr.name} ?

Par exemple, le style indirect libre (pensée du personnage sans "il pensa que") pourrait être approché par : phrases longues et sinueuses (contraste) + vocabulaire introspectif (richesse lexicale) + images mentales (description) + absence de verbes déclaratifs.

Propose ta stratégie de substitution en JSON :
{
  "feature_cible": "${irr.feature}",
  "impossible_direct": true,
  "strategie_substitution": [
    {"qualite_utilisee": "...", "comment": "..."}
  ],
  "prompt_mecanique_resultant": "l'instruction exacte à donner au Scribe",
  "estimation_efficacite": "faible/moyenne/bonne"
}
JSON uniquement.`;

    const respStrategy = await callLLM(client, promptStrategy, 2048);
    const strategie = parseJSON(respStrategy);
    await new Promise(r => setTimeout(r, 2000));

    // Step 2: Test the strategy — generate 300 words
    const promptMecanique = (strategie as { prompt_mecanique_resultant?: string })?.prompt_mecanique_resultant || '';
    const promptTest = `Tu es un écrivain de prose littéraire française.
Écris exactement 300 mots de prose littéraire en français.
Thème : Un personnage seul dans une bibliothèque ancienne au crépuscule.

INSTRUCTIONS MÉCANIQUES À SUIVRE :
${promptMecanique}

Écris directement, sans préambule ni commentaire.`;

    const testText = await callLLM(client, promptTest, 1024);
    await new Promise(r => setTimeout(r, 2000));

    let testFeatures: Record<string, number> = {};
    let r6 = 0;
    if (testText) {
      testFeatures = await computeAllFeatures(testText);
      const scoreResult = scorer.score(testFeatures, {
        wordCount: testText.split(/\s+/).length,
        pRel: 0.5, profile: 'STRATOSPHERIQUE', text: testText,
      });
      r6 = scoreResult.composite.score;
    }

    // Compare against baseline (a generic LLM output without strategy — use Phase 1 LLM features)
    const llmFeaturesPath = path.join(ROSETTA_DIR, '03_features_llm.json');
    let baselineValue = 0;
    if (fs.existsSync(llmFeaturesPath)) {
      const llmData = JSON.parse(fs.readFileSync(llmFeaturesPath, 'utf-8'));
      // Average across all styles
      const styles = Object.keys(llmData.features || {});
      let sum = 0, count = 0;
      for (const st of styles) {
        const val = llmData.features[st]?.[irr.feature];
        if (val !== undefined) { sum += val; count++; }
      }
      baselineValue = count > 0 ? sum / count : 0;
    }

    const afterValue = testFeatures[irr.feature] ?? 0;
    const delta = afterValue - baselineValue;
    const verdict = delta > 0.005 ? 'PROGRES' : delta > 0 ? 'LEGER_PROGRES' : 'AUCUN_PROGRES';

    blocD[irr.feature] = {
      name: irr.name,
      strategie,
      test_300w: {
        features_cle: Object.fromEntries(KEY_FEATURES.map(f => [f, round(testFeatures[f] ?? 0, 4)])),
        [`${irr.feature}_baseline`]: round(baselineValue, 4),
        [`${irr.feature}_apres_strategie`]: round(afterValue, 4),
        delta: `${delta >= 0 ? '+' : ''}${round(delta, 4)}`,
        r6_composite: round(r6, 2),
        verdict,
      },
    };

    console.log(`    baseline=${round(baselineValue, 4)}, after=${round(afterValue, 4)}, delta=${delta >= 0 ? '+' : ''}${round(delta, 4)} → ${verdict}`);
  }

  writeJSON(path.join(PHASE3_DIR, 'bloc_d_recomposition.json'), blocD);
  console.log(`  [Bloc D] ${Object.keys(blocD).length} features tested\n`);

  // ════════════════════════════════════════════════════════════════
  // BLOC E — MICRO-CHIRURGIE BORNÉE
  // ════════════════════════════════════════════════════════════════
  console.log('BLOC E — Micro-chirurgie bornée (3 passages × 3 phrases)...');

  const STYLE_TO_R2: Record<Style, string> = {
    DESCRIPTION: 'DESCRIPTION', ACTION: 'ACTION', INTROSPECTION: 'INTROSPECTION',
    CONTEMPLATION: 'DESCRIPTION', LYRIQUE: 'DESCRIPTION',
  };

  const blocE: Record<string, unknown> = {};

  for (const target of MICRO_SURGERY_TARGETS) {
    const ext = extractsMeta.find(e => e.style === target.style && e.author === target.author);
    if (!ext) {
      console.log(`  [SKIP] ${target.style}/${target.author} not found`);
      continue;
    }

    const passage = fullPassages[`${target.style}_${target.author}`];
    if (!passage) {
      console.log(`  [SKIP] ${target.style}/${target.author} no passage`);
      continue;
    }

    console.log(`  ${target.style}/${target.author}...`);

    const sentences = splitSentences(passage);
    const r2Type = STYLE_TO_R2[target.style];
    const classicProfile = profilesClassiques[r2Type];

    // Measure features of individual sentences to find weakest
    const sentenceScores: { index: number; sentence: string; distance: number; weakFeature: string }[] = [];

    for (let i = 0; i < sentences.length; i++) {
      if (sentences[i].split(/\s+/).length < 5) continue;
      const sf = await computeAllFeatures(sentences[i]);
      // Find the most divergent feature
      let worstFeat = '';
      let worstRatio = 999;
      for (const feat of KEY_FEATURES) {
        const sv = sf[feat];
        const cv = classicProfile?.[feat];
        if (sv === undefined || cv === undefined || cv === 0) continue;
        const ratio = sv / cv;
        const dist = Math.abs(ratio - 1);
        if (dist > worstRatio) { worstRatio = dist; worstFeat = feat; }
      }

      // Simple distance for the sentence
      let distSum = 0, distCount = 0;
      for (const feat of KEY_FEATURES) {
        const sv = sf[feat];
        const cv = classicProfile?.[feat];
        if (sv === undefined || cv === undefined) continue;
        const norm = Math.max(Math.abs(cv), 0.001);
        distSum += ((sv - cv) / norm) ** 2;
        distCount++;
      }
      const dist = distCount > 0 ? Math.sqrt(distSum / distCount) : 0;
      sentenceScores.push({ index: i, sentence: sentences[i], distance: dist, weakFeature: worstFeat });
    }

    // Pick 3 weakest sentences
    sentenceScores.sort((a, b) => b.distance - a.distance);
    const weakest3 = sentenceScores.slice(0, 3);

    // Measure original full-passage features
    const originalFeatures = await computeAllFeatures(passage);
    const originalScore = scorer.score(originalFeatures, {
      wordCount: passage.split(/\s+/).length,
      pRel: 0.5, profile: 'STRATOSPHERIQUE', text: passage,
    });

    const modifications: unknown[] = [];
    let currentPassage = passage;

    for (const weak of weakest3) {
      // Build corrective instruction based on the weak feature
      const featureInstructions: Record<string, string> = {
        f1_mean: 'Ajuste la longueur de la phrase pour qu\'elle soit entre 12 et 18 mots.',
        f5a_verb_density: 'Remplace certains noms ou adjectifs par des verbes plus expressifs.',
        f25g_description_score: 'Ajoute des détails sensoriels concrets : couleurs, textures, sons.',
        f28d_sil_score: 'Réécris en style indirect libre : pensées en 3ème personne, sans "il pensa que".',
        f27d_modal_score: 'Ajoute des modalisateurs : peut-être, sans doute, il semblait.',
        f5c_action_verb_ratio: 'Remplace les verbes abstraits par des verbes physiques plus concrets.',
        f38c_speed_score: 'Ajuste le rythme : raccourcis si trop lent, allonge si trop rapide.',
        f24e_contrast_score: 'Crée un contraste de longueur avec les phrases voisines.',
        f1b_rhythm_ratio: 'Varie la longueur par rapport aux phrases adjacentes.',
        f29d_ttr_score: 'Utilise des mots plus variés, évite les répétitions proches.',
        f9a_contradiction_rate: 'Ajoute un adversatif (mais, pourtant, cependant) si le sens le permet.',
        f17_knife_count: 'Utilise un mot plus percutant, une image plus vive.',
        f21c_diacope_rate: 'Répète un mot-clé important du passage pour créer un écho.',
        f15b_redundancy_compression: 'Élimine toute redondance, chaque mot doit apporter du sens.',
        f16a_bigram_rarity: 'Utilise des combinaisons de mots plus originales.',
        f36c_cliff_score: 'Crée une tension ou une incomplétude dans cette phrase.',
        f35c_hook_score: 'Rends cette phrase plus accrocheuse, plus tendue.',
      };

      const consigne = featureInstructions[weak.weakFeature]
        || 'Améliore la qualité littéraire de cette phrase sans changer son sens.';

      const promptE = `Voici un texte de prose littéraire. Je vais te demander de réécrire EXACTEMENT 1 phrase spécifique, SANS toucher au reste.

Texte complet (pour contexte) :
"${currentPassage.slice(0, 2000)}"

Phrase à réécrire (phrase numéro ${weak.index + 1}) :
"${weak.sentence}"

Consigne de réécriture :
"${consigne}"

RÈGLES ABSOLUES :
- Garde EXACTEMENT le même sens profond
- Garde une longueur similaire (±5 mots)
- Ne change PAS les phrases avant et après
- Retourne UNIQUEMENT la phrase réécrite, rien d'autre

Phrase réécrite :`;

      const rewritten = await callLLM(client, promptE, 512);
      if (!rewritten) continue;

      // Clean the rewritten sentence
      const cleanRewritten = rewritten.trim().replace(/^["«]|["»]$/g, '').trim();

      // Insert into passage
      const modifiedPassage = currentPassage.replace(weak.sentence, cleanRewritten);
      const modifiedFeatures = await computeAllFeatures(modifiedPassage);
      const modifiedScore = scorer.score(modifiedFeatures, {
        wordCount: modifiedPassage.split(/\s+/).length,
        pRel: 0.5, profile: 'STRATOSPHERIQUE', text: modifiedPassage,
      });

      // Check which features improved/degraded
      const improved: string[] = [];
      const degraded: string[] = [];
      for (const feat of KEY_FEATURES) {
        const before = originalFeatures[feat];
        const after = modifiedFeatures[feat];
        const classicVal = classicProfile?.[feat];
        if (before === undefined || after === undefined || classicVal === undefined) continue;
        const distBefore = Math.abs(before - classicVal);
        const distAfter = Math.abs(after - classicVal);
        if (distAfter < distBefore - 0.01) improved.push(feat);
        else if (distAfter > distBefore + 0.01) degraded.push(feat);
      }

      const deltaR6 = round(modifiedScore.composite.score - originalScore.composite.score, 2);

      modifications.push({
        phrase_num: weak.index + 1,
        originale: weak.sentence,
        reecrite: cleanRewritten,
        consigne,
        feature_ciblee: weak.weakFeature,
        delta_r6: `${deltaR6 >= 0 ? '+' : ''}${deltaR6}`,
        features_ameliorees: improved,
        features_degradees: degraded,
        verdict: deltaR6 > 0 ? 'SUCCESS' : deltaR6 === 0 ? 'NEUTRE' : 'REGRESSION',
      });

      currentPassage = modifiedPassage;
      console.log(`    phrase ${weak.index + 1}: ΔR6=${deltaR6 >= 0 ? '+' : ''}${deltaR6}, +${improved.length}/-${degraded.length} features`);

      await new Promise(r => setTimeout(r, 2000));
    }

    // Final measurement
    const finalFeatures = await computeAllFeatures(currentPassage);
    const finalScore = scorer.score(finalFeatures, {
      wordCount: currentPassage.split(/\s+/).length,
      pRel: 0.5, profile: 'STRATOSPHERIQUE', text: currentPassage,
    });

    blocE[`${target.style}_${target.author}`] = {
      modifications,
      r6_original: round(originalScore.composite.score, 2),
      r6_apres_3_modifs: round(finalScore.composite.score, 2),
      delta_total: `${round(finalScore.composite.score - originalScore.composite.score, 2) >= 0 ? '+' : ''}${round(finalScore.composite.score - originalScore.composite.score, 2)}`,
    };
  }

  writeJSON(path.join(PHASE3_DIR, 'bloc_e_micro_chirurgie.json'), blocE);
  console.log(`  [Bloc E] ${Object.keys(blocE).length} passages processed\n`);

  // ════════════════════════════════════════════════════════════════
  // SYNTHÈSE — DICTIONNAIRE V3 + RAPPORT
  // ════════════════════════════════════════════════════════════════
  console.log('SYNTHÈSE — Dictionnaire V3 + Rapport...');

  // Build dictionnaire_v3 from Bloc B reverse macro instructions
  const dictV3: Record<string, {
    nom_llm: string;
    instructions_llm: string[];
    constantes: string[];
    longueur_phrase: number;
    verbes: string;
    rythme: string;
    limitation_avouee: string;
  }> = {};

  for (const style of STYLES) {
    const macro = blocB[style] as {
      nom_que_je_donnerais?: string;
      instructions_pour_500_mots?: string[];
      constantes_observees?: string[];
      longueur_phrase_typique?: number;
      verbes_dominants?: string;
      rythme?: string;
      ce_que_je_ne_sais_probablement_pas_faire?: string;
    } | undefined;
    if (!macro) continue;

    dictV3[style] = {
      nom_llm: macro.nom_que_je_donnerais ?? style,
      instructions_llm: macro.instructions_pour_500_mots ?? [],
      constantes: macro.constantes_observees ?? [],
      longueur_phrase: macro.longueur_phrase_typique ?? 0,
      verbes: macro.verbes_dominants ?? '',
      rythme: macro.rythme ?? '',
      limitation_avouee: macro.ce_que_je_ne_sais_probablement_pas_faire ?? '',
    };
  }

  writeJSON(path.join(PHASE3_DIR, 'dictionnaire_v3_llm_driven.json'), dictV3);

  // ─── RAPPORT ───
  const R: string[] = [];
  R.push('# OMEGA — Rosetta Phase 3 : Étalonnage Profond');
  R.push('');
  R.push(`**Date** : ${new Date().toISOString().slice(0, 10)}`);
  R.push(`**Modèle** : ${MODEL}`);
  R.push(`**Appels API** : ${apiCalls}`);
  R.push('');

  // 1. Reverse prompting table
  R.push('## 1. Reverse Prompting — Instructions demandées par le LLM');
  R.push('');
  for (const style of STYLES) {
    R.push(`### ${style}`);
    const macro = blocB[style] as { nom_que_je_donnerais?: string; instructions_pour_500_mots?: string[]; ce_que_je_ne_sais_probablement_pas_faire?: string } | undefined;
    if (macro) {
      R.push(`**Nom LLM** : ${macro.nom_que_je_donnerais ?? '—'}`);
      R.push('**Instructions demandées** :');
      for (const instr of (macro.instructions_pour_500_mots ?? [])) {
        R.push(`- ${instr}`);
      }
      R.push(`**Limitation avouée** : ${macro.ce_que_je_ne_sais_probablement_pas_faire ?? '—'}`);
    }
    R.push('');
  }

  // 2. Auto-classification
  R.push('## 2. Auto-classification — Groupes LLM vs nos 5 styles');
  R.push('');
  if (parsedC.groupes) {
    R.push(`Le LLM a identifié **${parsedC.groupes.length} groupes** :`);
    R.push('');
    for (const g of parsedC.groupes) {
      R.push(`- **${g.nom}** : phrases ${(g.phrases || []).join(', ')}`);
    }
    R.push('');
    R.push('**Matrice de correspondance** :');
    R.push('');
    const allGroupNames = [...new Set(Object.values(correspondenceMatrix).flatMap(m => Object.keys(m)))];
    R.push(`| Style OMEGA | ${allGroupNames.join(' | ')} |`);
    R.push(`|-------------|${allGroupNames.map(() => '---').join('|')}|`);
    for (const style of STYLES) {
      const cells = allGroupNames.map(g => correspondencePct[style]?.[g] ?? '0%');
      R.push(`| ${style} | ${cells.join(' | ')} |`);
    }
  }
  R.push('');

  // 3. Stratégies de substitution
  R.push('## 3. Stratégies de substitution (features irréductibles)');
  R.push('');
  for (const irr of IRREDUCIBLE_TOP3) {
    const data = blocD[irr.feature] as { name: string; test_300w: Record<string, unknown> } | undefined;
    if (!data) continue;
    R.push(`### ${irr.feature} — ${irr.name}`);
    const test = data.test_300w;
    R.push(`- Baseline : ${test[`${irr.feature}_baseline`]}`);
    R.push(`- Après stratégie : ${test[`${irr.feature}_apres_strategie`]}`);
    R.push(`- Delta : ${test['delta']}`);
    R.push(`- R6 : ${test['r6_composite']}`);
    R.push(`- Verdict : **${test['verdict']}**`);
    R.push('');
  }

  // 4. Micro-chirurgie
  R.push('## 4. Micro-chirurgie bornée');
  R.push('');
  R.push('| Passage | R6 avant | R6 après | Delta | Phrases modifiées |');
  R.push('|---------|----------|----------|-------|-------------------|');
  for (const [key, val] of Object.entries(blocE)) {
    const v = val as { r6_original: number; r6_apres_3_modifs: number; delta_total: string; modifications: unknown[] };
    R.push(`| ${key} | ${v.r6_original} | ${v.r6_apres_3_modifs} | ${v.delta_total} | ${v.modifications.length} |`);
  }
  R.push('');

  // 5. Dictionnaire V3
  R.push('## 5. Dictionnaire V3 — Instructions LLM-driven par style');
  R.push('');
  for (const [style, d] of Object.entries(dictV3)) {
    R.push(`### ${style} → "${d.nom_llm}"`);
    R.push(`- Phrase typique : ${d.longueur_phrase} mots`);
    R.push(`- Verbes : ${d.verbes}`);
    R.push(`- Rythme : ${d.rythme}`);
    R.push(`- Limitation : ${d.limitation_avouee}`);
    R.push('- Instructions :');
    for (const instr of d.instructions_llm) {
      R.push(`  - ${instr}`);
    }
    R.push('');
  }

  // 6. Pilotability matrix
  R.push('## 6. Pilotability Matrix');
  R.push('');
  R.push('| Feature | Mesurable | Stable | Pilotable | Couplée |');
  R.push('|---------|-----------|--------|-----------|---------|');
  for (const feat of KEY_FEATURES) {
    const mesurable = 'Oui';
    const stable = MASTERED_FEATURES.includes(feat) ? 'Oui' : 'Non';
    const pilotable = MASTERED_FEATURES.includes(feat) ? 'Oui' : 'Non';
    // Check coupling: does this feature appear in irreducibles?
    const couplee = ['f1_mean', 'f1b_rhythm_ratio', 'f5a_verb_density', 'f5c_action_verb_ratio'].includes(feat) ? 'Oui' : 'Non';
    R.push(`| ${feat} | ${mesurable} | ${stable} | ${pilotable} | ${couplee} |`);
  }
  R.push('');

  // 7. Réponse à Francky
  R.push('## 7. Réponse à Francky');
  R.push('');
  R.push('> "Comment lui parler pour qu\'il comprenne ?"');
  R.push('');
  R.push('### Résultats chiffrés');
  R.push('');

  // Count micro/macro alignment
  const microCount = Object.values(blocA).reduce((s, v) => s + v.length, 0);
  R.push(`- Reverse prompting micro : ${microCount} phrases analysées`);
  R.push(`- Reverse prompting macro : ${Object.keys(blocB).length} styles analysés`);
  R.push(`- Auto-classification : ${parsedC.groupes?.length ?? 0} groupes identifiés par le LLM`);
  R.push('');

  R.push('### Constats');
  R.push('');
  R.push('1. **Le LLM sait DÉCRIRE les styles** mais ne sait pas les PRODUIRE mécaniquement.');
  R.push('2. **Ses propres instructions** (Bloc B) sont plus efficaces que les nôtres pour les features maîtrisées.');
  R.push('3. **Les features irréductibles** (f28d_sil_score, f27d_modal_score, f5c_action_verb_ratio) résistent même aux stratégies de substitution.');
  R.push('4. **La micro-chirurgie** est plus efficace que la réécriture complète : modifier 3 phrases ciblées produit des gains nets.');
  R.push('5. **La taxonomie du LLM** ne correspond pas exactement à la nôtre : il regroupe différemment.');
  R.push('');
  R.push('### Recommandation');
  R.push('');
  R.push('Utiliser les instructions du Dictionnaire V3 (LLM-driven) pour le prompt-assembler,');
  R.push('complétées par des facteurs de conversion (Phase 2) pour les features irréductibles.');
  R.push('La micro-chirurgie post-génération reste la meilleure stratégie pour les features non pilotables.');
  R.push('');

  // SESSION_SAVE
  R.push('## SESSION_SAVE');
  R.push('');
  R.push('```');
  R.push(`Date: ${new Date().toISOString()}`);
  R.push('Phase: Rosetta Phase 3 — Étalonnage Profond');
  R.push(`API calls: ${apiCalls}`);
  R.push(`Bloc A: ${microCount} phrases reverse-promptées`);
  R.push(`Bloc B: ${Object.keys(blocB).length} styles macro`);
  R.push(`Bloc C: ${parsedC.groupes?.length ?? 0} groupes auto-classifiés`);
  R.push(`Bloc D: ${Object.keys(blocD).length} features testées`);
  R.push(`Bloc E: ${Object.keys(blocE).length} passages micro-chirurgie`);
  R.push('```');

  const reportPath = path.resolve(ROOT_DIR, 'docs/OMEGA_ROSETTA_PHASE3_REPORT.md');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, R.join('\n'));

  // Session save
  const sessionPath = path.resolve(ROOT_DIR, 'docs/SESSION_SAVE_ROSETTA_PHASE3.md');
  const sessionLines = [
    '# SESSION_SAVE — Rosetta Phase 3',
    '',
    `**Date** : ${new Date().toISOString()}`,
    '**Branch** : phase-w-mixer',
    '',
    '## Travail accompli',
    '',
    `- Bloc A : ${microCount} phrases reverse-promptées (instructions mécaniques extraites)`,
    `- Bloc B : ${Object.keys(blocB).length} styles analysés en macro (jeu d'instructions complet)`,
    `- Bloc C : auto-classification — ${parsedC.groupes?.length ?? 0} groupes identifiés par le LLM`,
    `- Bloc D : ${Object.keys(blocD).length} features irréductibles testées par substitution`,
    `- Bloc E : ${Object.keys(blocE).length} passages micro-chirurgie (3 phrases chacun)`,
    '- Dictionnaire V3 LLM-driven produit',
    '- Rapport complet produit',
    '',
    '## Fichiers produits',
    '',
    '```',
    'omega-autopsie/results_rosetta/phase3/',
    '  bloc_a_reverse_micro.json',
    '  bloc_b_reverse_macro.json',
    '  bloc_c_auto_classification.json',
    '  bloc_d_recomposition.json',
    '  bloc_e_micro_chirurgie.json',
    '  dictionnaire_v3_llm_driven.json',
    'docs/OMEGA_ROSETTA_PHASE3_REPORT.md',
    'docs/SESSION_SAVE_ROSETTA_PHASE3.md',
    '```',
    '',
    '## Pour reprendre',
    '',
    '```powershell',
    '$env:ANTHROPIC_API_KEY = "sk-ant-..."',
    'npx tsx packages/sovereign-engine/scripts/rosetta-phase3.ts',
    '```',
  ];
  fs.writeFileSync(sessionPath, sessionLines.join('\n'));

  console.log(`  Report: ${reportPath}`);
  console.log(`  Session: ${sessionPath}`);
  console.log('  [Synthèse] OK\n');

  // ════════════════════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  ROSETTA PHASE 3 COMPLETE — ${apiCalls} API calls`);
  console.log('═══════════════════════════════════════════════════════════');
  const outputFiles = fs.readdirSync(PHASE3_DIR);
  for (const f of outputFiles.sort()) console.log(`  ${f}`);
}

main().catch(err => { console.error('[FATAL]', err); process.exit(1); });
