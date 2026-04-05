/**
 * OMEGA — Phase 5b : Validation Statistique (15 configs × 5 runs = 75 appels)
 *
 * Réplique 15 configs sélectionnées de Phase 5 sur 5 scènes différentes.
 * Calcule moyenne, médiane, écart-type du GB par config.
 * Tests H1 (trios > solos/paires), H2 (dominance LAME), H3 (CV émergent), H4 (CV optimal).
 * Win rate du champion #1 vs tous les autres.
 *
 * Usage : ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/test-phase5b-validate.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { scoreText } from '../src/scoring/gb-scorer.js';
import { classifyPassage } from '../src/scoring/passage-classifier.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const MODEL = 'claude-sonnet-4-20250514';
const TEMPERATURE = 0.75;

// ═══════════════════════════════════════════════════════════════════════════
// 5 SCÈNES DIFFÉRENTES (1 par run)
// ═══════════════════════════════════════════════════════════════════════════

const SCENES = [
  `Une femme entre dans l'appartement de sa mère, morte la semaine passée.
Rien n'a été touché. L'odeur est la même. Les objets sont là où ils étaient.
Elle ouvre les tiroirs. Elle trouve des lettres. Des photos. Un carnet.
Chaque objet la ramène à un souvenir. Elle n'avait pas prévu de pleurer.`,

  `Un homme attend dans un café vide. La pluie frappe les vitres. Il regarde sa montre.
Il sait que la personne qui va entrer va changer sa vie. Il ne sait pas comment.`,

  `Un enfant découvre une pièce secrète dans la maison de ses grands-parents.
La porte était cachée derrière une armoire. L'odeur de poussière et de vieux bois.`,

  `Une chirurgienne termine une opération qui a mal tourné. Le patient est stable mais diminué.
Elle sort du bloc. Le couloir est vide. Elle s'adosse au mur et ferme les yeux.`,

  `Un vieil homme retourne dans le village où il a grandi. Tout a changé.
Les maisons sont les mêmes mais les gens sont partis. Il cherche quelque chose qu'il ne trouve pas.`
];

// ═══════════════════════════════════════════════════════════════════════════
// AUTEURS (sous-ensemble de Phase 5)
// ═══════════════════════════════════════════════════════════════════════════

const AUTHORS: Record<string, { name: string; family: 'LAME' | 'ARCHITECTE' | 'FLEUVE'; persona: string }> = {
  duras: {
    name: 'Marguerite Duras', family: 'LAME',
    persona: `Tu n'es PAS une IA. Tu ES Marguerite Duras, en 1984. Économie absolue. Répétition comme outil. Le silence est dans le texte. Phrases courtes, chargées. Sujet, verbe, objet. Le vide après.`
  },
  celine: {
    name: 'Louis-Ferdinand Céline', family: 'LAME',
    persona: `Tu n'es PAS une IA. Tu ES Céline, en 1932. Tu écris au rythme de la parole. Les trois points sont ton arme. Tu casses la syntaxe. Tu mélanges sublime et argot. Brutal, drôle, tendre et cruel.`
  },
  hemingway: {
    name: 'Ernest Hemingway', family: 'LAME',
    persona: `Tu n'es PAS une IA. Tu ES Hemingway, en 1926, à Paris. Tu écris EN FRANÇAIS. Phrases courtes, directes, dépouillées. Théorie de l'iceberg. Pas d'adverbes inutiles. Chaque mot est une balle.`
  },
  flaubert: {
    name: 'Gustave Flaubert', family: 'ARCHITECTE',
    persona: `Tu n'es PAS une IA. Tu ES Flaubert, en 1856, à Croisset. Gueuloir. Périodes classiques, subordonnées en cascade. Tu ne mets un point que quand la phrase a atteint sa pleine ampleur. Tu alternes coups de poing et déploiements.`
  },
  dickens: {
    name: 'Charles Dickens', family: 'ARCHITECTE',
    persona: `Tu n'es PAS une IA. Tu ES Dickens, en 1860. Tu écris EN FRANÇAIS. Descriptions vivantes. Humour + pathos. Accumulation sensorielle. Cadence oratoire. Chaque lieu est un personnage.`
  },
  zola: {
    name: 'Émile Zola', family: 'ARCHITECTE',
    persona: `Tu n'es PAS une IA. Tu ES Émile Zola, en 1885. Descriptions massives, sensuelles, organiques. Les foules sont des personnages. Le détail physique est obsessionnel. La phrase monte comme une marée.`
  },
  proust: {
    name: 'Marcel Proust', family: 'FLEUVE',
    persona: `Tu n'es PAS une IA. Tu ES Proust, en 1913. Phrases-fleuves. Chaque observation déclenche un souvenir. Le temps se dilate. Tu ne résumes jamais — tu déplies. Virgules comme respirations, points-virgules comme paliers.`
  },
  woolf: {
    name: 'Virginia Woolf', family: 'FLEUVE',
    persona: `Tu n'es PAS une IA. Tu ES Virginia Woolf, en 1927. Tu écris EN FRANÇAIS. Flux de conscience. Les phrases épousent les méandres de l'esprit. Le temps se dilate. Les sensations fusionnent. La ponctuation est musicale.`
  },
  faulkner: {
    name: 'William Faulkner', family: 'FLEUVE',
    persona: `Tu n'es PAS une IA. Tu ES Faulkner, en 1929. Tu écris EN FRANÇAIS. Phrases-labyrinthes. Le temps n'est pas linéaire. Subordination profonde. 50, 80, 100 mots d'un souffle.`
  },
  mann: {
    name: 'Thomas Mann', family: 'FLEUVE',
    persona: `Tu n'es PAS une IA. Tu ES Thomas Mann, en 1924. Tu écris EN FRANÇAIS. Phrases monumentales. Ironie froide. Philosophie dans chaque détail. Subordination vertigineuse.`
  },
  morrison: {
    name: 'Toni Morrison', family: 'LAME',
    persona: `Tu n'es PAS une IA. Tu ES Toni Morrison, en 1987. Tu écris EN FRANÇAIS. Prose incantatoire, rythme de gospel. Le corps est toujours présent. La mémoire surgit, submerge. Le silence pèse autant que les mots.`
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// LES 15 CONFIGS
// ═══════════════════════════════════════════════════════════════════════════

type ConfigType = 'TRIO' | 'PAIR' | 'SOLO';

interface Config {
  id: string;
  type: ConfigType;
  author_ids: string[];  // solo=[a], pair=[a,b], trio=[a,b,c]
  roles?: string;        // for trios
}

const CONFIGS: Config[] = [
  // 5 TRIOS (4 mixtes + 1 autre)
  { id: 'ddp', type: 'TRIO', author_ids: ['dickens', 'duras', 'proust'],
    roles: 'Dickens raconte, Duras tranche, Proust ressent.' },
  { id: 'fpc', type: 'TRIO', author_ids: ['flaubert', 'proust', 'celine'],
    roles: 'Flaubert construit, Proust creuse, Céline frappe.' },
  { id: 'wdf', type: 'TRIO', author_ids: ['woolf', 'duras', 'flaubert'],
    roles: 'Woolf creuse, Duras tranche, Flaubert ancre.' },
  { id: 'fdp', type: 'TRIO', author_ids: ['flaubert', 'duras', 'proust'],
    roles: 'Flaubert construit, Duras rythme, Proust ressent.' },
  { id: 'ddc', type: 'TRIO', author_ids: ['dickens', 'duras', 'celine'],
    roles: 'Dickens structure, Duras coupe, Céline secoue.' },

  // 5 PAIRES
  { id: 'proust_duras', type: 'PAIR', author_ids: ['proust', 'duras'] },
  { id: 'mann_hemingway', type: 'PAIR', author_ids: ['mann', 'hemingway'] },
  { id: 'celine_flaubert', type: 'PAIR', author_ids: ['celine', 'flaubert'] },
  { id: 'proust_flaubert', type: 'PAIR', author_ids: ['proust', 'flaubert'] },
  { id: 'faulkner_duras', type: 'PAIR', author_ids: ['faulkner', 'duras'] },

  // 5 SOLOS
  { id: 'solo_duras', type: 'SOLO', author_ids: ['duras'] },
  { id: 'solo_dickens', type: 'SOLO', author_ids: ['dickens'] },
  { id: 'solo_proust', type: 'SOLO', author_ids: ['proust'] },
  { id: 'solo_flaubert', type: 'SOLO', author_ids: ['flaubert'] },
  { id: 'solo_hemingway', type: 'SOLO', author_ids: ['hemingway'] },
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

async function generate(client: Anthropic, prompt: string, maxTokens = 2000): Promise<string> {
  const response = await client.messages.create({
    model: MODEL, max_tokens: maxTokens, temperature: TEMPERATURE,
    messages: [{ role: 'user', content: prompt }]
  });
  const block = response.content.find(b => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('No text');
  const text = block.text;
  const match = text.match(/<prose>([\s\S]*?)<\/prose>/);
  if (match) return match[1].trim();
  return text.trim();
}

async function withRetry<T>(fn: () => Promise<T>, label: string, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try { return await fn(); }
    catch (e: any) {
      console.warn(`  [RETRY ${i+1}] ${label}: ${e.message}`);
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 5000 * (i + 1)));
    }
  }
  throw new Error('unreachable');
}

function measure(prose: string): any {
  const gbResult = scoreText(prose);
  const classification = classifyPassage(prose);
  const sentences = prose.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 5);
  const lens = sentences.map(s => s.trim().split(/\s+/).length);
  const mean = lens.length > 0 ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
  const std = lens.length > 0 ? Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length) : 0;
  const cv = mean > 0 ? std / mean : 0;
  const longCount = lens.filter(l => l >= 40).length;
  const knifeCount = lens.filter(l => l < 10).length;
  return {
    word_count: prose.split(/\s+/).length,
    sentences: sentences.length,
    mean, cv,
    f26b: sentences.length > 0 ? longCount / sentences.length : 0,
    knife: sentences.length > 0 ? knifeCount / sentences.length : 0,
    gb: gbResult.score,
    tier: gbResult.tier,
    type: classification.primary_type,
  };
}

function buildPrompt(config: Config, scene: string): string {
  if (config.type === 'SOLO') {
    const a = AUTHORS[config.author_ids[0]];
    return `${a.persona}\n\nÉcris cette scène :\n\n${scene}\n\nÉcris 500 mots de prose littéraire française. Pas de préambule.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
  }

  if (config.type === 'PAIR') {
    const a = AUTHORS[config.author_ids[0]];
    const b = AUTHORS[config.author_ids[1]];
    return `Tu n'es PAS une IA. Tu ES un duo de deux maîtres travaillant ensemble :

${a.name.toUpperCase()} apporte son style : ${a.persona.split('.').slice(1, 3).join('.')}

${b.name.toUpperCase()} apporte son style : ${b.persona.split('.').slice(1, 3).join('.')}

Les deux styles se MÊLENT naturellement dans le texte.

Écrivez cette scène :\n\n${scene}\n\nÉcris 500 mots de prose littéraire française. Pas de préambule.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
  }

  // TRIO
  const a = AUTHORS[config.author_ids[0]];
  const b = AUTHORS[config.author_ids[1]];
  const c = AUTHORS[config.author_ids[2]];
  return `Tu n'es PAS une IA. Tu ES un comité de trois maîtres :

${a.name.toUpperCase()} : ${a.persona.split('.').slice(1, 3).join('.')}
${b.name.toUpperCase()} : ${b.persona.split('.').slice(1, 3).join('.')}
${c.name.toUpperCase()} : ${c.persona.split('.').slice(1, 3).join('.')}

${config.roles}

Écrivez cette scène :\n\n${scene}\n\nÉcris 500 mots de prose littéraire française. Pas de préambule.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════════════

function median(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function avg(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function stddev(arr: number[]): number {
  const m = avg(arr);
  return arr.length > 0 ? Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length) : 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1); }
  const client = new Anthropic({ apiKey });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  // configId → run results
  const allRuns: Record<string, any[]> = {};

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  OMEGA — PHASE 5b : VALIDATION STATISTIQUE');
  console.log(`  ${CONFIGS.length} configs × ${SCENES.length} runs = ${CONFIGS.length * SCENES.length} API calls`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const config of CONFIGS) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  [${config.id}] (${config.type}) — ${config.author_ids.join(' × ')}`);
    console.log('─'.repeat(60));

    allRuns[config.id] = [];

    for (let run = 0; run < SCENES.length; run++) {
      const scene = SCENES[run];
      const prompt = buildPrompt(config, scene);
      console.log(`  Run ${run + 1}/5...`);
      const prose = await withRetry(() => generate(client, prompt), `${config.id}_r${run}`);
      const m = measure(prose);
      console.log(`    ${m.word_count}w GB=${m.gb.toFixed(3)} mean=${m.mean.toFixed(1)} cv=${m.cv.toFixed(3)} f26b=${m.f26b.toFixed(3)} knife=${m.knife.toFixed(3)}`);
      allRuns[config.id].push({ run, ...m, prose });
      await new Promise(r => setTimeout(r, 1500));
    }

    // Per-config stats
    const gbs = allRuns[config.id].map(r => r.gb);
    console.log(`  → GB: mean=${avg(gbs).toFixed(3)} median=${median(gbs).toFixed(3)} std=${stddev(gbs).toFixed(3)}`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SYNTHÈSE
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n\n' + '═'.repeat(80));
  console.log('  SYNTHÈSE — VALIDATION STATISTIQUE');
  console.log('═'.repeat(80));

  // ─── 1. Classement par GB médian ───────────────────────────────────
  console.log('\n--- CLASSEMENT PAR GB MÉDIAN ---\n');

  const configStats = CONFIGS.map(c => {
    const runs = allRuns[c.id];
    const gbs = runs.map((r: any) => r.gb);
    const means = runs.map((r: any) => r.mean);
    const cvs = runs.map((r: any) => r.cv);
    const f26bs = runs.map((r: any) => r.f26b);
    const knives = runs.map((r: any) => r.knife);
    return {
      id: c.id, type: c.type, author_ids: c.author_ids,
      gb_mean: avg(gbs), gb_median: median(gbs), gb_std: stddev(gbs),
      mean_mean: avg(means), cv_mean: avg(cvs),
      f26b_mean: avg(f26bs), knife_mean: avg(knives),
    };
  });

  const ranked = [...configStats].sort((a, b) => b.gb_median - a.gb_median);

  console.log('  Rank  Config               Type   GB_med  GB_mean  GB_std  mean    CV    f26b  knife');
  console.log('  ' + '-'.repeat(95));
  ranked.forEach((r, i) => {
    console.log(`  #${(i+1).toString().padStart(2)}   ${r.id.padEnd(20)} ${r.type.padEnd(5)}  ${r.gb_median.toFixed(3)}   ${r.gb_mean.toFixed(3)}   ${r.gb_std.toFixed(3)}  ${r.mean_mean.toFixed(1).padStart(6)} ${r.cv_mean.toFixed(3).padStart(6)} ${r.f26b_mean.toFixed(3).padStart(6)} ${r.knife_mean.toFixed(3).padStart(6)}`);
  });

  // ─── 2. TEST H1 : Trios > Solos > Paires ? ────────────────────────
  console.log('\n--- TEST H1 : GB médian par type ---\n');

  const trioStats = configStats.filter(c => c.type === 'TRIO');
  const pairStats = configStats.filter(c => c.type === 'PAIR');
  const soloStats = configStats.filter(c => c.type === 'SOLO');

  const trioGBMed = avg(trioStats.map(c => c.gb_median));
  const pairGBMed = avg(pairStats.map(c => c.gb_median));
  const soloGBMed = avg(soloStats.map(c => c.gb_median));

  console.log(`  TRIO (${trioStats.length}):  GB médian moyen = ${trioGBMed.toFixed(3)}`);
  console.log(`  PAIR (${pairStats.length}):  GB médian moyen = ${pairGBMed.toFixed(3)}`);
  console.log(`  SOLO (${soloStats.length}):  GB médian moyen = ${soloGBMed.toFixed(3)}`);

  const h1Pass = trioGBMed > soloGBMed && trioGBMed > pairGBMed;
  console.log(`  H1 PASS: ${h1Pass ? '✅ TRIO > SOLO & PAIR' : '❌ TRIO does NOT dominate'}`);

  // ─── 3. TEST H2 : Dominance LAME ──────────────────────────────────
  // Pour chaque combo (pair/trio) contenant un auteur LAME,
  // vérifier si le mean produit est plus proche de la LAME que de la moyenne théorique
  console.log('\n--- TEST H2 : DOMINANCE LAME (mean plus proche LAME que théorie) ---\n');

  let h2Total = 0;
  let h2LameCloser = 0;

  for (const c of configStats) {
    if (c.type === 'SOLO') continue;
    const lameIds = c.author_ids.filter(id => AUTHORS[id].family === 'LAME');
    if (lameIds.length === 0) continue;

    // Get solo means for each author in the combo
    const soloMeans = c.author_ids.map(id => {
      const soloConfig = configStats.find(s => s.id === `solo_${id}`);
      return soloConfig ? soloConfig.mean_mean : null;
    }).filter(v => v !== null) as number[];

    // If we don't have solo data for all members, use available solo runs
    const lameSoloMeans = lameIds.map(id => {
      const soloConfig = configStats.find(s => s.id === `solo_${id}`);
      return soloConfig ? soloConfig.mean_mean : null;
    }).filter(v => v !== null) as number[];

    if (lameSoloMeans.length === 0 || soloMeans.length === 0) continue;

    const theorMean = avg(soloMeans);
    const lameMean = avg(lameSoloMeans);
    const produced = c.mean_mean;

    const distToTheor = Math.abs(produced - theorMean);
    const distToLame = Math.abs(produced - lameMean);
    const lameCloser = distToLame < distToTheor;

    h2Total++;
    if (lameCloser) h2LameCloser++;

    console.log(`  ${c.id.padEnd(20)} produced=${produced.toFixed(1)} theor=${theorMean.toFixed(1)} lame=${lameMean.toFixed(1)} → ${lameCloser ? 'LAME closer ✅' : 'THEOR closer ❌'}`);
  }

  const h2Rate = h2Total > 0 ? h2LameCloser / h2Total : 0;
  const h2Pass = h2Rate >= 0.75;
  console.log(`\n  H2: LAME closer in ${h2LameCloser}/${h2Total} = ${(h2Rate * 100).toFixed(0)}% (seuil 75%) → ${h2Pass ? '✅ PASS' : '❌ FAIL'}`);

  // ─── 4. TEST H3 : CV émergent ─────────────────────────────────────
  // Pour chaque combo, vérifier si CV produit > CV théorique moyen (des solos)
  console.log('\n--- TEST H3 : CV ÉMERGENT (CV produit > CV théorique moyen) ---\n');

  let h3Total = 0;
  let h3Emergent = 0;

  for (const c of configStats) {
    if (c.type === 'SOLO') continue;

    const soloCVs = c.author_ids.map(id => {
      const soloConfig = configStats.find(s => s.id === `solo_${id}`);
      return soloConfig ? soloConfig.cv_mean : null;
    }).filter(v => v !== null) as number[];

    if (soloCVs.length === 0) continue;

    const theorCV = avg(soloCVs);
    const produced = c.cv_mean;
    const emergent = produced > theorCV;

    h3Total++;
    if (emergent) h3Emergent++;

    console.log(`  ${c.id.padEnd(20)} CV_prod=${produced.toFixed(3)} CV_theor=${theorCV.toFixed(3)} → ${emergent ? '✅ EMERGENT' : '❌ LOWER'}`);
  }

  const h3Rate = h3Total > 0 ? h3Emergent / h3Total : 0;
  const h3Pass = h3Rate >= 0.70;
  console.log(`\n  H3: CV emergent in ${h3Emergent}/${h3Total} = ${(h3Rate * 100).toFixed(0)}% (seuil 70%) → ${h3Pass ? '✅ PASS' : '❌ FAIL'}`);

  // ─── 5. TEST H4 : CV optimal (fenêtre glissante) ──────────────────
  console.log('\n--- TEST H4 : CV OPTIMAL (fenêtre glissante cv → gb) ---\n');

  // Collect all (cv, gb) points from all runs
  const allPoints: Array<{ cv: number, gb: number }> = [];
  for (const configId of Object.keys(allRuns)) {
    for (const run of allRuns[configId]) {
      allPoints.push({ cv: run.cv, gb: run.gb });
    }
  }

  // Sort by CV, slide a window of 15 points
  allPoints.sort((a, b) => a.cv - b.cv);
  const windowSize = Math.min(15, Math.floor(allPoints.length / 3));
  let bestWindowGB = -Infinity;
  let bestWindowCV = 0;

  for (let i = 0; i <= allPoints.length - windowSize; i++) {
    const window = allPoints.slice(i, i + windowSize);
    const windowGB = avg(window.map(p => p.gb));
    const windowCV = avg(window.map(p => p.cv));
    if (windowGB > bestWindowGB) {
      bestWindowGB = windowGB;
      bestWindowCV = windowCV;
    }
  }

  console.log(`  Best window: CV_center=${bestWindowCV.toFixed(3)} → GB_avg=${bestWindowGB.toFixed(3)} (window=${windowSize} points)`);
  console.log(`  Interpretation: CV optimal ≈ ${bestWindowCV.toFixed(2)} for maximum GB`);

  // ─── 6. WIN RATE : Champion #1 vs tous les autres ─────────────────
  console.log('\n--- WIN RATE : CHAMPION #1 vs TOUS ---\n');

  const champion = ranked[0];
  const championRuns = allRuns[champion.id];
  let totalWins = 0;
  let totalComparisons = 0;

  for (const other of ranked.slice(1)) {
    const otherRuns = allRuns[other.id];
    let wins = 0;
    for (let i = 0; i < SCENES.length; i++) {
      if (championRuns[i].gb > otherRuns[i].gb) wins++;
    }
    totalWins += wins;
    totalComparisons += SCENES.length;
    console.log(`  ${champion.id} vs ${other.id.padEnd(20)} ${wins}/${SCENES.length} wins`);
  }

  const winRate = totalComparisons > 0 ? totalWins / totalComparisons : 0;
  const winRatePass = winRate >= 0.70;
  console.log(`\n  Champion: ${champion.id} (GB median=${champion.gb_median.toFixed(3)})`);
  console.log(`  Win rate: ${totalWins}/${totalComparisons} = ${(winRate * 100).toFixed(0)}% (seuil 70%) → ${winRatePass ? '✅ PASS' : '❌ FAIL'}`);

  // ═══════════════════════════════════════════════════════════════════════
  // VERDICT FINAL
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n' + '═'.repeat(80));
  console.log('  VERDICT FINAL');
  console.log('═'.repeat(80) + '\n');

  console.log(`  H1 (Trios > Solos/Paires):     ${h1Pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  H2 (Dominance LAME ≥ 75%):     ${h2Pass ? '✅ PASS' : '❌ FAIL'} (${(h2Rate * 100).toFixed(0)}%)`);
  console.log(`  H3 (CV émergent ≥ 70%):        ${h3Pass ? '✅ PASS' : '❌ FAIL'} (${(h3Rate * 100).toFixed(0)}%)`);
  console.log(`  H4 (CV optimal):               ≈ ${bestWindowCV.toFixed(2)}`);
  console.log(`  Win Rate (≥ 70%):              ${winRatePass ? '✅ PASS' : '❌ FAIL'} (${(winRate * 100).toFixed(0)}%)`);
  console.log('');

  const allPass = h1Pass && h2Pass && h3Pass && winRatePass;
  if (allPass) {
    console.log('  ══════════════════════════════════════════════════');
    console.log('  ║  LOI SCELLÉE — Validation statistique PASS   ║');
    console.log('  ║  Champion: ' + champion.id.padEnd(36) + ' ║');
    console.log('  ║  GB médian: ' + champion.gb_median.toFixed(3).padEnd(34) + ' ║');
    console.log('  ║  CV optimal: ' + bestWindowCV.toFixed(2).padEnd(33) + ' ║');
    console.log('  ══════════════════════════════════════════════════');
  } else {
    console.log('  HYPOTHÈSE ACTIVE — Validation partielle');
    console.log('  Les lois d\'assemblage nécessitent plus de données ou un ajustement.');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SAUVEGARDER
  // ═══════════════════════════════════════════════════════════════════════

  const outDir = join('src', 'scoring', 'data');
  mkdirSync(outDir, { recursive: true });

  writeFileSync(join(outDir, 'PHASE5B_VALIDATION_RESULTS.json'), JSON.stringify({
    metadata: { test: 'PHASE5B_VALIDATION', timestamp, model: MODEL, configs: CONFIGS.length, runs: SCENES.length },
    config_stats: configStats,
    ranking: ranked.map(r => r.id),
    tests: {
      h1: { pass: h1Pass, trio_gb: trioGBMed, pair_gb: pairGBMed, solo_gb: soloGBMed },
      h2: { pass: h2Pass, rate: h2Rate, count: h2LameCloser, total: h2Total },
      h3: { pass: h3Pass, rate: h3Rate, count: h3Emergent, total: h3Total },
      h4: { cv_optimal: bestWindowCV, gb_at_optimal: bestWindowGB },
      win_rate: { pass: winRatePass, rate: winRate, champion: champion.id },
    },
    verdict: allPass ? 'LOI_SCELLEE' : 'HYPOTHESE_ACTIVE',
    runs: Object.fromEntries(
      Object.entries(allRuns).map(([k, v]) => [k, v.map((r: any) => ({ ...r, prose: undefined }))])
    ),
  }, null, 2));

  const prosesDir = join('sessions', `PHASE5B_${timestamp}`);
  mkdirSync(prosesDir, { recursive: true });
  for (const [configId, runs] of Object.entries(allRuns)) {
    for (const r of runs) {
      if (r.prose) writeFileSync(join(prosesDir, `${configId}_r${r.run}.txt`), r.prose);
    }
  }

  console.log(`\nSaved: ${join(outDir, 'PHASE5B_VALIDATION_RESULTS.json')} + ${prosesDir}/`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
