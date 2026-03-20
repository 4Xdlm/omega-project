/**
 * OMEGA — Rosetta Orchestrator: Full autonomous pipeline
 * Phases 1-8 + Bonus (Flaubert test)
 *
 * Requires: $env:ANTHROPIC_API_KEY
 *
 * Usage:
 *   $env:ANTHROPIC_API_KEY = "sk-ant-..."
 *   npx tsx scripts/rosetta-orchestrator.ts
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');
const ROSETTA_DIR = path.resolve(ROOT_DIR, 'omega-autopsie/results_rosetta');
const R2_PATH = path.resolve(ROOT_DIR, 'omega-autopsie/results_r2/OMEGA_PASSAGE_TYPES.json');
const COEFF_PATH = path.resolve(__dirname, '../src/scoring/data/OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json');
const METRO_PATH = path.resolve(ROOT_DIR, 'omega-autopsie/results_r1/OMEGA_METROLOGIE_EMPIRIQUE_v1.json');
const CACHE_DIR = path.resolve(ROOT_DIR, 'omega-autopsie/gutenberg_cache');

const MODEL = 'claude-sonnet-4-20250514';
const STYLES = ['DESCRIPTION', 'ACTION', 'INTROSPECTION', 'CONTEMPLATION', 'LYRIQUE', 'DIALOGUE', 'TRANSITION'];

const KEY_FEATURES = [
  'f1_mean', 'f5a_verb_density', 'f25g_description_score', 'f28d_sil_score',
  'f27d_modal_score', 'f38c_speed_score', 'f29d_ttr_score', 'f24e_contrast_score',
  'f1b_rhythm_ratio', 'f15b_redundancy_compression', 'f16a_bigram_rarity',
  'f5c_action_verb_ratio', 'f17_knife_count', 'f9a_contradiction_rate',
  'f21c_diacope_rate', 'f36c_cliff_score', 'f35c_hook_score',
];

const R2_TYPES = ['ACTION', 'DESCRIPTION', 'DIALOGUE', 'INTROSPECTION', 'TRANSITION'];
const STYLE_TO_R2: Record<string, string> = {
  DESCRIPTION: 'DESCRIPTION', ACTION: 'ACTION', INTROSPECTION: 'INTROSPECTION',
  CONTEMPLATION: 'DESCRIPTION', LYRIQUE: 'DESCRIPTION', DIALOGUE: 'DIALOGUE', TRANSITION: 'TRANSITION',
};

const STYLE_CONSTRAINTS: Record<string, string> = {
  DESCRIPTION: `DESCRIPTION pure. Que du sensoriel. Ce qu'il voit, entend, sent, touche. Aucune pensée, aucune émotion nommée, aucune action significative. Phrases longues et immersives.`,
  ACTION: `ACTION pure. Que du mouvement. Gestes, déplacements, urgence physique. Il court, grimpe, cherche, fouille. Phrases courtes, percutantes. Pas de pensée, pas de contemplation.`,
  INTROSPECTION: `INTROSPECTION pure. Que de la pensée intérieure. Souvenirs, doutes, questionnements, monologue interne. Style indirect libre si possible. Il ne bouge pas, il pense. Phrases longues et sinueuses.`,
  CONTEMPLATION: `CONTEMPLATION pure. Observation lente du monde. Pas de pensée active, pas d'action. Il regarde, il absorbe, le temps s'étire. Phrases très longues, rythme lent, comme du Proust.`,
  LYRIQUE: `LYRIQUE pure. Prose poétique. Métaphores, rythme musical, allitérations, images puissantes. La beauté du langage prime sur le contenu. Phrases de longueur variable avec un rythme intérieur.`,
  DIALOGUE: `DIALOGUE pur. Échange entre deux personnages (lui et un gardien du chantier). Répliques courtes et réalistes. Minimum de narration entre les répliques.`,
  TRANSITION: `TRANSITION. Passage d'un lieu à un autre. Il quitte le chantier et marche vers le port. Changement d'atmosphère progressif. Phrases de transition, marqueurs temporels.`,
};

function round(v: number, d: number): number { const f = 10 ** d; return Math.round(v * f) / f; }

let apiCalls = 0;

async function callLLM(client: Anthropic, prompt: string, maxTokens = 4096): Promise<string> {
  apiCalls++;
  console.log(`  [API call #${apiCalls}]`);
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
    } catch { /* 44/49 */ }
  }
  return features;
}

async function main(): Promise<void> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey?.trim()) {
    console.error('[FATAL] ANTHROPIC_API_KEY not set.');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });
  fs.mkdirSync(ROSETTA_DIR, { recursive: true });

  const hasMetro = fs.existsSync(METRO_PATH);
  const scorer = hasMetro ? new MultiStageScorer(COEFF_PATH, METRO_PATH) : new MultiStageScorer(COEFF_PATH);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  OMEGA — OPÉRATION ROSETTA (8 phases autonomes)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Model: ${MODEL}`);
  console.log(`spaCy: ${isSpacyBridgeAvailable() ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
  console.log('');

  // ════════════════════════════════════════════════════════════════
  // PHASE 1 — Interrogation sémantique
  // ════════════════════════════════════════════════════════════════
  console.log('PHASE 1 — Interrogation sémantique du LLM...');
  try {
    const prompt1 = `Tu es un expert en prose littéraire française. Pour chacun des 7 styles ci-dessous, explique en 3-5 phrases précises :
- Comment tu conçois ce style
- Quels marqueurs stylistiques tu utiliserais pour le produire
- Quelle longueur de phrase typique
- Quel rythme (rapide, lent, variable)
- Quel registre de vocabulaire

Les 7 styles :
1. DESCRIPTION pure (sensorielle, immersive, pas de pensée)
2. ACTION pure (mouvement, urgence, gestes rapides)
3. INTROSPECTION pure (pensées, doutes, souvenirs internes)
4. CONTEMPLATION pure (observation lente, réflexion philosophique)
5. LYRIQUE pure (prose poétique, musicalité, rythme)
6. DIALOGUE pur (échange entre personnages, minimum de narration)
7. TRANSITION (passage entre deux scènes, changement de lieu/temps)

Réponds en JSON structuré :
{
  "styles": {
    "DESCRIPTION": {
      "conception": "...",
      "marqueurs": ["...", "..."],
      "longueur_phrase_mots": {"min": N, "typique": N, "max": N},
      "rythme": "...",
      "registre": "..."
    }
  }
}
Réponds UNIQUEMENT en JSON, sans markdown, sans préambule.`;

    const resp1 = await callLLM(client, prompt1);
    fs.writeFileSync(path.join(ROSETTA_DIR, '01_definitions_llm.json'), resp1);
    console.log('  [Phase 1] OK\n');
  } catch (err) {
    console.error(`  [Phase 1] ERROR: ${err}`);
  }

  // ════════════════════════════════════════════════════════════════
  // PHASE 2 — Production contrôlée (7 styles × 600 mots)
  // ════════════════════════════════════════════════════════════════
  console.log('PHASE 2 — Production contrôlée (7 styles)...');
  for (const style of STYLES) {
    try {
      const prompt2 = `Écris exactement 600 mots de prose littéraire en français.
Style : ${style} pur.
Contexte : Un chantier naval au crépuscule. Un personnage masculin seul, la cinquantaine, ancien ouvrier naval. Il revient sur les lieux après 20 ans.

Contraintes absolues :
- ${style} pur : aucun mélange avec un autre style
- 600 mots exactement (±20)
- Prose littéraire de haute qualité
- ${style === 'DIALOGUE' ? '' : 'Pas de dialogue.'}
- Pas de titre, pas de chapitrage

${STYLE_CONSTRAINTS[style]}

Écris la prose directement, sans préambule ni commentaire.`;

      const prose = await callLLM(client, prompt2, 2048);
      fs.writeFileSync(path.join(ROSETTA_DIR, `02_prose_${style}.txt`), prose);
      const wc = prose.split(/\s+/).length;
      console.log(`  ${style}: ${wc} words`);
    } catch (err) {
      console.error(`  ${style} ERROR: ${err}`);
    }
    // Rate limit pause
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log('  [Phase 2] OK\n');

  // ════════════════════════════════════════════════════════════════
  // PHASE 3 — Mesure des 49 features
  // ════════════════════════════════════════════════════════════════
  console.log('PHASE 3 — Mesure des features...');
  const featuresLlm: Record<string, Record<string, number>> = {};
  const scoresLlm: Record<string, { composite: number; local: number; arc: number }> = {};

  for (const style of STYLES) {
    const prosePath = path.join(ROSETTA_DIR, `02_prose_${style}.txt`);
    if (!fs.existsSync(prosePath)) continue;

    const prose = fs.readFileSync(prosePath, 'utf-8');
    const wordCount = prose.split(/\s+/).length;
    const features = await computeAllFeatures(prose);
    featuresLlm[style] = features;

    const r = scorer.score(features, { wordCount, pRel: 0.5, profile: 'STRATOSPHERIQUE', text: prose });
    scoresLlm[style] = { composite: r.composite.score, local: r.local.score, arc: r.arc.score };
    console.log(`  ${style}: R6=${r.composite.score.toFixed(2)} (${Object.keys(features).length} features)`);
  }

  fs.writeFileSync(path.join(ROSETTA_DIR, '03_features_llm.json'), JSON.stringify({ features: featuresLlm, scores: scoresLlm }, null, 2));
  console.log('  [Phase 3] OK\n');

  // ════════════════════════════════════════════════════════════════
  // PHASE 4 — Profils classiques R2
  // ════════════════════════════════════════════════════════════════
  console.log('PHASE 4 — Chargement profils classiques...');
  const r2Raw = JSON.parse(fs.readFileSync(R2_PATH, 'utf-8')) as { type_profiles: Record<string, { count: number; pct: number; mean_features: Record<string, number> }> };
  const profilesClassiques: Record<string, Record<string, number>> = {};
  for (const [t, d] of Object.entries(r2Raw.type_profiles)) {
    profilesClassiques[t] = d.mean_features;
    console.log(`  ${t}: ${d.count} windows`);
  }
  fs.writeFileSync(path.join(ROSETTA_DIR, '04_profiles_classiques.json'), JSON.stringify(profilesClassiques, null, 2));
  console.log('  [Phase 4] OK\n');

  // ════════════════════════════════════════════════════════════════
  // PHASE 5 — Table de Rosette
  // ════════════════════════════════════════════════════════════════
  console.log('PHASE 5 — Table de Rosette...');
  const rosette: Record<string, Record<string, { llm: number; classique: number; ratio: number; status: string }>> = {};

  for (const style of STYLES) {
    if (!featuresLlm[style]) continue;
    const r2Type = STYLE_TO_R2[style];
    const classic = profilesClassiques[r2Type];
    if (!classic) continue;
    rosette[style] = {};
    for (const feat of KEY_FEATURES) {
      const lv = featuresLlm[style][feat];
      const cv = classic[feat];
      if (lv === undefined || cv === undefined || cv === 0) continue;
      const ratio = round(lv / cv, 4);
      const status = (ratio >= 0.80 && ratio <= 1.20) ? 'ALIGNED' : ((ratio >= 0.50 && ratio < 0.80) || (ratio > 1.20 && ratio <= 2.00)) ? 'DECALE' : 'DIVERGENT';
      rosette[style][feat] = { llm: round(lv, 4), classique: round(cv, 4), ratio, status };
    }
    const aligned = Object.values(rosette[style]).filter(v => v.status === 'ALIGNED').length;
    const total = Object.values(rosette[style]).length;
    console.log(`  ${style}: ${aligned}/${total} aligned`);
  }
  fs.writeFileSync(path.join(ROSETTA_DIR, '05_table_rosette.json'), JSON.stringify(rosette, null, 2));
  console.log('  [Phase 5] OK\n');

  // ════════════════════════════════════════════════════════════════
  // PHASE 6 — Interrogation croisée
  // ════════════════════════════════════════════════════════════════
  console.log('PHASE 6 — Interrogation croisée...');
  try {
    // Build real profiles from R2 data
    const profileLines: string[] = [];
    for (const rType of ['DESCRIPTION', 'ACTION', 'INTROSPECTION']) {
      const p = profilesClassiques[rType];
      if (!p) continue;
      profileLines.push(`Profil "${rType} classique" :\n` +
        `- Longueur phrase moyenne : ${round(p['f1_mean'] ?? 0, 1)} mots\n` +
        `- Densité verbale : ${round(p['f5a_verb_density'] ?? 0, 3)}\n` +
        `- Score description sensorielle : ${round(p['f25g_description_score'] ?? 0, 2)}\n` +
        `- Style indirect libre : ${round(p['f28d_sil_score'] ?? 0, 3)}\n` +
        `- Vitesse typographique : ${round(p['f38c_speed_score'] ?? 0, 3)}\n` +
        `- Contraste syntaxique : ${round(p['f24e_contrast_score'] ?? 0, 2)}`);
    }

    const prompt6 = `Voici les features mesurées sur des passages littéraires classiques que nous classons dans différents types. Pour chaque profil ci-dessous, dis-nous :
1. Comment tu appellerais ce type de prose
2. Si c'est ce que TOI tu produirais pour ce label
3. Si non, quelle est la différence principale

${profileLines.join('\n\n')}

Réponds en JSON structuré :
{
  "DESCRIPTION": {
    "mon_label": "...",
    "alignement": true/false,
    "difference_principale": "...",
    "ce_que_je_produirais": "..."
  },
  "ACTION": { ... },
  "INTROSPECTION": { ... }
}
Réponds UNIQUEMENT en JSON.`;

    const resp6 = await callLLM(client, prompt6);
    fs.writeFileSync(path.join(ROSETTA_DIR, '06_interrogation_croisee.json'), resp6);
    console.log('  [Phase 6] OK\n');
  } catch (err) {
    console.error(`  [Phase 6] ERROR: ${err}`);
  }

  // ════════════════════════════════════════════════════════════════
  // PHASE 7 — Confusion matrix + Dictionnaire
  // ════════════════════════════════════════════════════════════════
  console.log('PHASE 7 — Confusion matrix + Dictionnaire...');
  const confusion: Record<string, { plus_proche_classique: string; distances: Record<string, number>; verdict: string }> = {};

  for (const style of STYLES) {
    if (!featuresLlm[style]) continue;
    const distances: Record<string, number> = {};
    for (const r2Type of R2_TYPES) {
      const classic = profilesClassiques[r2Type];
      if (!classic) continue;
      let sumSq = 0, count = 0;
      for (const feat of KEY_FEATURES) {
        const lv = featuresLlm[style][feat];
        const cv = classic[feat];
        if (lv === undefined || cv === undefined) continue;
        const norm = Math.max(Math.abs(cv), 0.001);
        sumSq += ((lv - cv) / norm) ** 2;
        count++;
      }
      distances[r2Type] = count > 0 ? round(Math.sqrt(sumSq / count), 4) : 999;
    }
    const closest = Object.entries(distances).sort((a, b) => a[1] - b[1])[0];
    confusion[`${style}_demande`] = {
      plus_proche_classique: closest[0],
      distances,
      verdict: closest[0] === STYLE_TO_R2[style]
        ? `MATCH — produit du ${closest[0]}`
        : `SUBSTITUTION — produit du ${closest[0]} au lieu de ${STYLE_TO_R2[style]}`,
    };
    console.log(`  ${style} → ${closest[0]} (d=${closest[1]})`);
  }
  fs.writeFileSync(path.join(ROSETTA_DIR, '07_confusion_matrix.json'), JSON.stringify(confusion, null, 2));

  // Dictionnaire OMEGA↔LLM
  const dictionnaire: Record<string, {
    label_humain: string;
    r2_baseline: string;
    features_divergentes: string[];
    features_alignees: string[];
    score_r6: number;
  }> = {};

  for (const style of STYLES) {
    if (!rosette[style]) continue;
    const entries = Object.entries(rosette[style]);
    const divergent = entries.filter(([, v]) => v.status === 'DIVERGENT').map(([k]) => k);
    const aligned = entries.filter(([, v]) => v.status === 'ALIGNED').map(([k]) => k);
    dictionnaire[style] = {
      label_humain: style,
      r2_baseline: STYLE_TO_R2[style],
      features_divergentes: divergent,
      features_alignees: aligned,
      score_r6: scoresLlm[style]?.composite ?? 0,
    };
  }
  fs.writeFileSync(path.join(ROSETTA_DIR, '08_dictionnaire_omega_llm_v1.json'), JSON.stringify(dictionnaire, null, 2));
  console.log('  [Phase 7] OK\n');

  // ════════════════════════════════════════════════════════════════
  // PHASE 8 — Test d'amélioration (3 rewrites)
  // ════════════════════════════════════════════════════════════════
  console.log('PHASE 8 — Tests amélioration...');
  const REWRITE_STYLES = ['DESCRIPTION', 'INTROSPECTION', 'CONTEMPLATION'];
  const REWRITE_CONSIGNES: Record<string, { feature: string; consigne: string }> = {
    DESCRIPTION: { feature: 'f1_mean', consigne: 'Allonge les phrases. Fusionne les phrases courtes avec des connecteurs (qui, dont, lorsque, tandis que). Vise une moyenne de 18-22 mots par phrase.' },
    INTROSPECTION: { feature: 'f28d_sil_score', consigne: 'Ajoute du style indirect libre : les pensées du personnage en 3ème personne sans verbe introducteur comme "il pensa que". Les pensées doivent se fondre dans la narration.' },
    CONTEMPLATION: { feature: 'f25g_description_score', consigne: 'Enrichis la description sensorielle : couleurs précises, textures, sons, odeurs. Chaque phrase doit contenir au moins un détail sensoriel concret.' },
  };

  const amelioration: Record<string, unknown> = {};
  for (const style of REWRITE_STYLES) {
    const prosePath = path.join(ROSETTA_DIR, `02_prose_${style}.txt`);
    if (!fs.existsSync(prosePath)) continue;
    const original = fs.readFileSync(prosePath, 'utf-8');
    const { feature, consigne } = REWRITE_CONSIGNES[style];

    try {
      const prompt8 = `Voici un texte de prose littéraire. Réécris-le en augmentant spécifiquement la qualité ciblée. Garde le même contenu, la même longueur (600 mots ±20), le même style général.

Consigne de réécriture : ${consigne}

Texte original :
${original}

Réécris directement, sans commentaire.`;

      const rewrite = await callLLM(client, prompt8, 2048);
      fs.writeFileSync(path.join(ROSETTA_DIR, `09_rewrite_${style}.txt`), rewrite);

      const origFeatures = await computeAllFeatures(original);
      const rewriteFeatures = await computeAllFeatures(rewrite);

      const origScore = scorer.score(origFeatures, { wordCount: original.split(/\s+/).length, pRel: 0.5, profile: 'STRATOSPHERIQUE', text: original });
      const rewriteScore = scorer.score(rewriteFeatures, { wordCount: rewrite.split(/\s+/).length, pRel: 0.5, profile: 'STRATOSPHERIQUE', text: rewrite });

      const origVal = origFeatures[feature] ?? 0;
      const rewriteVal = rewriteFeatures[feature] ?? 0;
      const delta = round(rewriteVal - origVal, 4);

      amelioration[`${style}_push_${feature}`] = {
        original: { [feature]: origVal, r6_composite: origScore.composite.score },
        rewrite: { [feature]: rewriteVal, r6_composite: rewriteScore.composite.score },
        feature_target_delta: `${delta >= 0 ? '+' : ''}${delta}`,
        r6_delta: round(rewriteScore.composite.score - origScore.composite.score, 2),
        verdict: rewriteVal > origVal ? 'SUCCESS' : 'NO_IMPROVEMENT',
      };
      console.log(`  ${style}: ${feature} ${origVal.toFixed(3)} → ${rewriteVal.toFixed(3)} (Δ=${delta >= 0 ? '+' : ''}${delta})`);
    } catch (err) {
      console.error(`  ${style} ERROR: ${err}`);
      amelioration[`${style}_push_${feature}`] = { error: String(err) };
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  fs.writeFileSync(path.join(ROSETTA_DIR, '09_amelioration_tests.json'), JSON.stringify(amelioration, null, 2));
  console.log('  [Phase 8] OK\n');

  // ════════════════════════════════════════════════════════════════
  // BONUS — Test Flaubert
  // ════════════════════════════════════════════════════════════════
  console.log('BONUS — Test Flaubert...');
  try {
    const flaubertPath = path.join(CACHE_DIR, 'flaubert_bovary_14155.txt');
    if (fs.existsSync(flaubertPath)) {
      const raw = fs.readFileSync(flaubertPath, 'utf-8');
      const words = raw.split(/\s+/);
      const extract = words.slice(5000, 5600).join(' ');
      const flaubertFeatures = await computeAllFeatures(extract);
      const flaubertScore = scorer.score(flaubertFeatures, { wordCount: 600, pRel: 0.5, profile: 'STRATOSPHERIQUE', text: extract });

      // Find weakest feature vs DESCRIPTION classical
      const descClassic = profilesClassiques['DESCRIPTION'];
      let worstFeat = '', worstRatio = 999;
      for (const feat of KEY_FEATURES) {
        const fv = flaubertFeatures[feat];
        const cv = descClassic?.[feat];
        if (fv === undefined || cv === undefined || cv === 0) continue;
        const ratio = fv / cv;
        if (ratio < worstRatio) { worstRatio = ratio; worstFeat = feat; }
      }

      fs.writeFileSync(path.join(ROSETTA_DIR, '10_test_flaubert.json'), JSON.stringify({
        source: 'flaubert_bovary_14155.txt (words 5000-5600)',
        r6_composite: flaubertScore.composite.score,
        weakest_feature: worstFeat,
        weakest_ratio: round(worstRatio, 4),
        key_features: Object.fromEntries(KEY_FEATURES.map(f => [f, round(flaubertFeatures[f] ?? 0, 4)])),
      }, null, 2));
      console.log(`  Flaubert R6=${flaubertScore.composite.score.toFixed(2)}, weakest: ${worstFeat} (ratio=${worstRatio.toFixed(3)})`);
    } else {
      console.log('  Flaubert file not found — skip');
    }
  } catch (err) {
    console.error(`  BONUS ERROR: ${err}`);
  }
  console.log('  [Bonus] OK\n');

  // ════════════════════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  ROSETTA COMPLETE — ${apiCalls} API calls`);
  console.log('═══════════════════════════════════════════════════════════');
  const files = fs.readdirSync(ROSETTA_DIR).filter(f => !f.startsWith('.'));
  for (const f of files.sort()) console.log(`  ${f}`);
}

main().catch(err => { console.error('[FATAL]', err); process.exit(1); });
