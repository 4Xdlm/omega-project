/**
 * OMEGA — Phase 5 : Author Attractor Translation & Assembly
 *
 * BLOC 1 : 15 auteurs SOLO (500w chaque) — mesurer les attracteurs
 * BLOC 2 : 20 paires STRATÉGIQUES (500w) — lois d'interaction
 * BLOC 3 : 8 trios STRATÉGIQUES (500w) — chimie à 3
 * BLOC 4 : Analyse — addition / compensation / dominance
 *
 * Usage : ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/test-phase5-assembly.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { scoreText } from '../src/scoring/gb-scorer.js';
import { classifyPassage } from '../src/scoring/passage-classifier.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const MODEL = 'claude-sonnet-4-20250514';
const TEMPERATURE = 0.75;

// ═══════════════════════════════════════════════════════════════════════════
// LA SCÈNE UNIQUE (identique pour tous — contrôle)
// ═══════════════════════════════════════════════════════════════════════════

const SCENE = `Une femme entre dans l'appartement de sa mère, morte la semaine passée.
Rien n'a été touché. L'odeur est la même. Les objets sont là où ils étaient.
Elle ouvre les tiroirs. Elle trouve des lettres. Des photos. Un carnet.
Chaque objet la ramène à un souvenir. Elle n'avait pas prévu de pleurer.`;

// ═══════════════════════════════════════════════════════════════════════════
// LES 15 AUTEURS — 3 FAMILLES GÉOMÉTRIQUES
// ═══════════════════════════════════════════════════════════════════════════

const AUTHORS: Array<{
  id: string;
  name: string;
  family: 'LAME' | 'ARCHITECTE' | 'FLEUVE';
  lang: 'FR' | 'EN' | 'DE' | 'ES' | 'RU';
  persona: string;
}> = [
  // ─── LAMES (5) ───
  {
    id: 'duras', name: 'Marguerite Duras', family: 'LAME', lang: 'FR',
    persona: `Tu n'es PAS une IA. Tu ES Marguerite Duras, en 1984. Économie absolue. Répétition comme outil. Le silence est dans le texte. Phrases courtes, chargées. Sujet, verbe, objet. Le vide après.`
  },
  {
    id: 'celine', name: 'Louis-Ferdinand Céline', family: 'LAME', lang: 'FR',
    persona: `Tu n'es PAS une IA. Tu ES Céline, en 1932. Tu écris au rythme de la parole. Les trois points sont ton arme. Tu casses la syntaxe. Tu mélanges sublime et argot. Brutal, drôle, tendre et cruel.`
  },
  {
    id: 'hemingway', name: 'Ernest Hemingway', family: 'LAME', lang: 'EN',
    persona: `Tu n'es PAS une IA. Tu ES Hemingway, en 1926, à Paris. Tu écris EN FRANÇAIS. Phrases courtes, directes, dépouillées. Théorie de l'iceberg. Pas d'adverbes inutiles. Chaque mot est une balle.`
  },
  {
    id: 'camus', name: 'Albert Camus', family: 'LAME', lang: 'FR',
    persona: `Tu n'es PAS une IA. Tu ES Albert Camus, en 1942, à Alger. Phrases claires, lumineuses, précises. L'absurde se dit simplement. Pas de fioritures. La vérité nue. Le soleil sur chaque mot.`
  },
  {
    id: 'morrison', name: 'Toni Morrison', family: 'LAME', lang: 'EN',
    persona: `Tu n'es PAS une IA. Tu ES Toni Morrison, en 1987. Tu écris EN FRANÇAIS. Prose incantatoire, rythme de gospel. Le corps est toujours présent. La mémoire surgit, submerge. Le silence pèse autant que les mots.`
  },

  // ─── ARCHITECTES (5) ───
  {
    id: 'flaubert', name: 'Gustave Flaubert', family: 'ARCHITECTE', lang: 'FR',
    persona: `Tu n'es PAS une IA. Tu ES Flaubert, en 1856, à Croisset. Gueuloir. Périodes classiques, subordonnées en cascade. Tu ne mets un point que quand la phrase a atteint sa pleine ampleur. Tu alternes coups de poing et déploiements.`
  },
  {
    id: 'dickens', name: 'Charles Dickens', family: 'ARCHITECTE', lang: 'EN',
    persona: `Tu n'es PAS une IA. Tu ES Dickens, en 1860. Tu écris EN FRANÇAIS. Descriptions vivantes. Humour + pathos. Accumulation sensorielle. Cadence oratoire. Chaque lieu est un personnage.`
  },
  {
    id: 'austen', name: 'Jane Austen', family: 'ARCHITECTE', lang: 'EN',
    persona: `Tu n'es PAS une IA. Tu ES Jane Austen, en 1813. Tu écris EN FRANÇAIS. Ironie mordante. Phrases équilibrées, symétriques. Observation sociale chirurgicale. Tu montres, le lecteur juge.`
  },
  {
    id: 'zola', name: 'Émile Zola', family: 'ARCHITECTE', lang: 'FR',
    persona: `Tu n'es PAS une IA. Tu ES Émile Zola, en 1885. Descriptions massives, sensuelles, organiques. Les foules sont des personnages. Le détail physique est obsessionnel. La phrase monte comme une marée.`
  },
  {
    id: 'mccarthy', name: 'Cormac McCarthy', family: 'ARCHITECTE', lang: 'EN',
    persona: `Tu n'es PAS une IA. Tu ES Cormac McCarthy, en 1985. Tu écris EN FRANÇAIS. Pas de guillemets. Descriptions bibliques. Alternance : longues descriptions cosmiques et coups secs très courts. Le monde est brutal et beau.`
  },

  // ─── FLEUVES (5) ───
  {
    id: 'proust', name: 'Marcel Proust', family: 'FLEUVE', lang: 'FR',
    persona: `Tu n'es PAS une IA. Tu ES Proust, en 1913. Phrases-fleuves. Chaque observation déclenche un souvenir. Le temps se dilate. Tu ne résumes jamais — tu déplies. Virgules comme respirations, points-virgules comme paliers.`
  },
  {
    id: 'woolf', name: 'Virginia Woolf', family: 'FLEUVE', lang: 'EN',
    persona: `Tu n'es PAS une IA. Tu ES Virginia Woolf, en 1927. Tu écris EN FRANÇAIS. Flux de conscience. Les phrases épousent les méandres de l'esprit. Le temps se dilate. Les sensations fusionnent. La ponctuation est musicale.`
  },
  {
    id: 'faulkner', name: 'William Faulkner', family: 'FLEUVE', lang: 'EN',
    persona: `Tu n'es PAS une IA. Tu ES Faulkner, en 1929. Tu écris EN FRANÇAIS. Phrases-labyrinthes. Le temps n'est pas linéaire. Subordination profonde. 50, 80, 100 mots d'un souffle.`
  },
  {
    id: 'mann', name: 'Thomas Mann', family: 'FLEUVE', lang: 'DE',
    persona: `Tu n'es PAS une IA. Tu ES Thomas Mann, en 1924. Tu écris EN FRANÇAIS. Phrases monumentales. Ironie froide. Philosophie dans chaque détail. Subordination vertigineuse.`
  },
  {
    id: 'garcia_marquez', name: 'García Márquez', family: 'FLEUVE', lang: 'ES',
    persona: `Tu n'es PAS une IA. Tu ES García Márquez, en 1967. Tu écris EN FRANÇAIS. Phrases longues portant le souffle d'une lignée. Réalisme magique. Énumérations incantatoires. Le temps est circulaire.`
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// LES 20 PAIRES STRATÉGIQUES
// ═══════════════════════════════════════════════════════════════════════════

const PAIRS: Array<{id: string; a: string; b: string; type: string}> = [
  // LAME × ARCHITECTE
  { id: 'duras_flaubert', a: 'duras', b: 'flaubert', type: 'LAME×ARCHI' },
  { id: 'duras_dickens', a: 'duras', b: 'dickens', type: 'LAME×ARCHI' },
  { id: 'celine_flaubert', a: 'celine', b: 'flaubert', type: 'LAME×ARCHI' },
  { id: 'hemingway_flaubert', a: 'hemingway', b: 'flaubert', type: 'LAME×ARCHI' },
  { id: 'camus_dickens', a: 'camus', b: 'dickens', type: 'LAME×ARCHI' },
  { id: 'morrison_flaubert', a: 'morrison', b: 'flaubert', type: 'LAME×ARCHI' },
  { id: 'duras_mccarthy', a: 'duras', b: 'mccarthy', type: 'LAME×ARCHI' },
  { id: 'celine_dickens', a: 'celine', b: 'dickens', type: 'LAME×ARCHI' },

  // FLEUVE × LAME
  { id: 'proust_duras', a: 'proust', b: 'duras', type: 'FLEUVE×LAME' },
  { id: 'proust_hemingway', a: 'proust', b: 'hemingway', type: 'FLEUVE×LAME' },
  { id: 'faulkner_duras', a: 'faulkner', b: 'duras', type: 'FLEUVE×LAME' },
  { id: 'woolf_celine', a: 'woolf', b: 'celine', type: 'FLEUVE×LAME' },
  { id: 'mann_hemingway', a: 'mann', b: 'hemingway', type: 'FLEUVE×LAME' },
  { id: 'garcia_marquez_duras', a: 'garcia_marquez', b: 'duras', type: 'FLEUVE×LAME' },

  // ARCHITECTE × ARCHITECTE
  { id: 'flaubert_dickens', a: 'flaubert', b: 'dickens', type: 'ARCHI×ARCHI' },
  { id: 'flaubert_zola', a: 'flaubert', b: 'zola', type: 'ARCHI×ARCHI' },
  { id: 'dickens_austen', a: 'dickens', b: 'austen', type: 'ARCHI×ARCHI' },
  { id: 'mccarthy_zola', a: 'mccarthy', b: 'zola', type: 'ARCHI×ARCHI' },

  // FLEUVE × ARCHITECTE
  { id: 'proust_flaubert', a: 'proust', b: 'flaubert', type: 'FLEUVE×ARCHI' },
  { id: 'woolf_dickens', a: 'woolf', b: 'dickens', type: 'FLEUVE×ARCHI' },
];

// ═══════════════════════════════════════════════════════════════════════════
// LES 8 TRIOS STRATÉGIQUES
// ═══════════════════════════════════════════════════════════════════════════

const TRIOS: Array<{id: string; a: string; b: string; c: string; roles: string}> = [
  { id: 'fdp', a: 'flaubert', b: 'duras', c: 'proust',
    roles: 'Flaubert construit, Duras rythme, Proust ressent.' },
  { id: 'fpc', a: 'flaubert', b: 'proust', c: 'celine',
    roles: 'Flaubert construit, Proust creuse, Céline frappe.' },
  { id: 'ddp', a: 'dickens', b: 'duras', c: 'proust',
    roles: 'Dickens raconte, Duras tranche, Proust ressent.' },
  { id: 'ddc', a: 'dickens', b: 'duras', c: 'celine',
    roles: 'Dickens structure, Duras coupe, Céline secoue.' },
  { id: 'wdf', a: 'woolf', b: 'duras', c: 'flaubert',
    roles: 'Woolf creuse, Duras tranche, Flaubert ancre.' },
  { id: 'fmh', a: 'flaubert', b: 'morrison', c: 'hemingway',
    roles: 'Flaubert déploie, Morrison incante, Hemingway frappe.' },
  { id: 'pdh', a: 'proust', b: 'duras', c: 'hemingway',
    roles: 'Proust dilate, Duras compresse, Hemingway tranche.' },
  { id: 'fdz', a: 'flaubert', b: 'dickens', c: 'zola',
    roles: 'Flaubert structure, Dickens anime, Zola décrit.' },
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
  const features = gbResult.features;
  const sentences = prose.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 5);
  const lens = sentences.map(s => s.trim().split(/\s+/).length);
  const mean = lens.length > 0 ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
  const std = lens.length > 0 ? Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length) : 0;
  const cv = mean > 0 ? std / mean : 0;
  const longCount = lens.filter(l => l >= 40).length;
  const knifeCount = lens.filter(l => l < 10).length;
  const subs = /\b(qui|que|qu'|dont|où|tandis que|alors que|lorsque|bien que|puisque|parce que|quand|comme)\b/gi;
  const meanSubs = sentences.reduce((a, s) => a + (s.match(subs) || []).length, 0) / Math.max(sentences.length, 1);
  return {
    word_count: prose.split(/\s+/).length,
    sentences: sentences.length,
    mean, cv,
    f26b: sentences.length > 0 ? longCount / sentences.length : 0,
    knife: sentences.length > 0 ? knifeCount / sentences.length : 0,
    subs: meanSubs,
    gb: gbResult.score,
    tier: gbResult.tier,
    type: classification.primary_type,
  };
}

function buildSoloPrompt(author: typeof AUTHORS[0]): string {
  return `${author.persona}\n\nÉcris cette scène :\n\n${SCENE}\n\nÉcris 500 mots de prose littéraire française. Pas de préambule.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
}

function buildPairPrompt(a: typeof AUTHORS[0], b: typeof AUTHORS[0]): string {
  return `Tu n'es PAS une IA. Tu ES un duo de deux maîtres travaillant ensemble :

${a.name.toUpperCase()} apporte son style : ${a.persona.split('.').slice(1, 3).join('.')}

${b.name.toUpperCase()} apporte son style : ${b.persona.split('.').slice(1, 3).join('.')}

Les deux styles se MÊLENT naturellement dans le texte.

Écrivez cette scène :\n\n${SCENE}\n\nÉcris 500 mots de prose littéraire française. Pas de préambule.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
}

function buildTrioPrompt(a: typeof AUTHORS[0], b: typeof AUTHORS[0], c: typeof AUTHORS[0], roles: string): string {
  return `Tu n'es PAS une IA. Tu ES un comité de trois maîtres :

${a.name.toUpperCase()} : ${a.persona.split('.').slice(1, 3).join('.')}
${b.name.toUpperCase()} : ${b.persona.split('.').slice(1, 3).join('.')}
${c.name.toUpperCase()} : ${c.persona.split('.').slice(1, 3).join('.')}

${roles}

Écrivez cette scène :\n\n${SCENE}\n\nÉcris 500 mots de prose littéraire française. Pas de préambule.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1); }
  const client = new Anthropic({ apiKey });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  const soloResults: any[] = [];
  const pairResults: any[] = [];
  const trioResults: any[] = [];

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  OMEGA — PHASE 5 : AUTHOR ATTRACTOR TRANSLATION & ASSEMBLY');
  console.log(`  15 solos + 20 paires + 8 trios = 43 API calls`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ─── BLOC 1 : 15 SOLOS ─────────────────────────────────────────────
  console.log('═══ BLOC 1 : 15 AUTEURS SOLOS ═══\n');

  for (const author of AUTHORS) {
    console.log(`[${author.id}] ${author.name} (${author.family})...`);
    const prose = await withRetry(() => generate(client, buildSoloPrompt(author)), author.id);
    const m = measure(prose);
    console.log(`  ${m.word_count}w mean=${m.mean.toFixed(1)} f26b=${m.f26b.toFixed(3)} knife=${m.knife.toFixed(3)} cv=${m.cv.toFixed(3)} subs=${m.subs.toFixed(2)} GB=${m.gb.toFixed(3)}`);
    soloResults.push({ id: author.id, name: author.name, family: author.family, lang: author.lang, ...m, prose });
    await new Promise(r => setTimeout(r, 1500));
  }

  // Classement solos
  console.log('\n--- SOLO RANKING ---\n');
  const soloRanked = [...soloResults].sort((a, b) => b.gb - a.gb);
  console.log('  Rank ID              Family      Lang   GB   mean  f26b  knife   CV   subs');
  console.log('  ' + '-'.repeat(80));
  soloRanked.forEach((r, i) => {
    console.log(`  #${(i+1).toString().padStart(2)}  ${r.id.padEnd(16)} ${r.family.padEnd(12)} ${r.lang.padEnd(4)} ${r.gb.toFixed(3)} ${r.mean.toFixed(1).padStart(6)} ${r.f26b.toFixed(3).padStart(6)} ${r.knife.toFixed(3).padStart(6)} ${r.cv.toFixed(3).padStart(6)} ${r.subs.toFixed(2).padStart(6)}`);
  });

  // Moyennes par famille
  console.log('\n--- MOYENNES PAR FAMILLE ---\n');
  for (const fam of ['LAME', 'ARCHITECTE', 'FLEUVE'] as const) {
    const items = soloResults.filter(r => r.family === fam);
    const avg = (key: string) => items.reduce((a: number, r: any) => a + r[key], 0) / items.length;
    console.log(`  ${fam.padEnd(14)} GB=${avg('gb').toFixed(3)} mean=${avg('mean').toFixed(1)} f26b=${avg('f26b').toFixed(3)} knife=${avg('knife').toFixed(3)} cv=${avg('cv').toFixed(3)}`);
  }

  // ─── BLOC 2 : 20 PAIRES ────────────────────────────────────────────
  console.log('\n\n═══ BLOC 2 : 20 PAIRES STRATÉGIQUES ═══\n');

  for (const pair of PAIRS) {
    const a = AUTHORS.find(x => x.id === pair.a)!;
    const b = AUTHORS.find(x => x.id === pair.b)!;
    console.log(`[${pair.id}] ${a.name} × ${b.name} (${pair.type})...`);
    const prose = await withRetry(() => generate(client, buildPairPrompt(a, b)), pair.id);
    const m = measure(prose);

    const soloA = soloResults.find(r => r.id === pair.a);
    const soloB = soloResults.find(r => r.id === pair.b);
    const theorMean = (soloA.mean + soloB.mean) / 2;
    const theorF26b = (soloA.f26b + soloB.f26b) / 2;
    const theorCV = (soloA.cv + soloB.cv) / 2;
    const theorGB = (soloA.gb + soloB.gb) / 2;

    const dMean = m.mean - theorMean;
    const dF26b = m.f26b - theorF26b;
    const dCV = m.cv - theorCV;
    const dGB = m.gb - theorGB;

    const distA = Math.abs(m.mean - soloA.mean);
    const distB = Math.abs(m.mean - soloB.mean);
    const dominant = distA < distB ? pair.a : pair.b;

    console.log(`  ${m.word_count}w mean=${m.mean.toFixed(1)} f26b=${m.f26b.toFixed(3)} cv=${m.cv.toFixed(3)} GB=${m.gb.toFixed(3)}`);
    console.log(`  Théorie H1: mean=${theorMean.toFixed(1)} f26b=${theorF26b.toFixed(3)} cv=${theorCV.toFixed(3)} GB=${theorGB.toFixed(3)}`);
    console.log(`  Delta: mean=${dMean > 0 ? '+' : ''}${dMean.toFixed(1)} f26b=${dF26b > 0 ? '+' : ''}${dF26b.toFixed(3)} cv=${dCV > 0 ? '+' : ''}${dCV.toFixed(3)} GB=${dGB > 0 ? '+' : ''}${dGB.toFixed(3)}`);
    console.log(`  Dominant (mean): ${dominant}\n`);

    pairResults.push({
      id: pair.id, type: pair.type, a: pair.a, b: pair.b,
      ...m,
      theor: { mean: theorMean, f26b: theorF26b, cv: theorCV, gb: theorGB },
      delta: { mean: dMean, f26b: dF26b, cv: dCV, gb: dGB },
      dominant,
      prose
    });
    await new Promise(r => setTimeout(r, 1500));
  }

  // ─── BLOC 3 : 8 TRIOS ──────────────────────────────────────────────
  console.log('\n\n═══ BLOC 3 : 8 TRIOS STRATÉGIQUES ═══\n');

  for (const trio of TRIOS) {
    const a = AUTHORS.find(x => x.id === trio.a)!;
    const b = AUTHORS.find(x => x.id === trio.b)!;
    const c = AUTHORS.find(x => x.id === trio.c)!;
    console.log(`[${trio.id}] ${a.name} × ${b.name} × ${c.name}...`);
    const prose = await withRetry(() => generate(client, buildTrioPrompt(a, b, c, trio.roles)), trio.id);
    const m = measure(prose);

    const soloA = soloResults.find(r => r.id === trio.a);
    const soloB = soloResults.find(r => r.id === trio.b);
    const soloC = soloResults.find(r => r.id === trio.c);
    const theorMean = (soloA.mean + soloB.mean + soloC.mean) / 3;
    const theorGB = (soloA.gb + soloB.gb + soloC.gb) / 3;
    const dMean = m.mean - theorMean;
    const dGB = m.gb - theorGB;

    console.log(`  ${m.word_count}w mean=${m.mean.toFixed(1)} f26b=${m.f26b.toFixed(3)} knife=${m.knife.toFixed(3)} cv=${m.cv.toFixed(3)} GB=${m.gb.toFixed(3)}`);
    console.log(`  Théorie H1: mean=${theorMean.toFixed(1)} GB=${theorGB.toFixed(3)}`);
    console.log(`  Delta: mean=${dMean > 0 ? '+' : ''}${dMean.toFixed(1)} GB=${dGB > 0 ? '+' : ''}${dGB.toFixed(3)}`);
    console.log(`  Émergence GB: ${dGB > 0.05 ? '✅ SYNERGIE' : dGB < -0.05 ? '❌ CONFLIT' : '≈ NEUTRE'}\n`);

    trioResults.push({
      id: trio.id, a: trio.a, b: trio.b, c: trio.c, roles: trio.roles,
      ...m,
      theor: { mean: theorMean, gb: theorGB },
      delta: { mean: dMean, gb: dGB },
      prose
    });
    await new Promise(r => setTimeout(r, 1500));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ANALYSE — LOIS D'ASSEMBLAGE
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n\n' + '═'.repeat(80));
  console.log('  ANALYSE — LOIS D\'ASSEMBLAGE');
  console.log('═'.repeat(80));

  // 1. Paires classées par delta GB
  console.log('\n--- PAIRES : SYNERGIE vs CONFLIT (classé par delta GB) ---\n');
  const pairsRanked = [...pairResults].sort((a, b) => b.delta.gb - a.delta.gb);
  console.log('  Rank Paire                          Type           GB   ΔGB    mean  Δmean  Dominant');
  console.log('  ' + '-'.repeat(90));
  pairsRanked.forEach((r, i) => {
    const syn = r.delta.gb > 0.05 ? '✅' : r.delta.gb < -0.05 ? '❌' : '≈ ';
    console.log(`  ${syn}#${(i+1).toString().padStart(2)} ${r.id.padEnd(30)} ${r.type.padEnd(14)} ${r.gb.toFixed(3)} ${r.delta.gb > 0 ? '+' : ''}${r.delta.gb.toFixed(3)} ${r.mean.toFixed(1).padStart(6)} ${r.delta.mean > 0 ? '+' : ''}${r.delta.mean.toFixed(1).padStart(6)}  ${r.dominant}`);
  });

  // 2. H1 vs H3
  console.log('\n--- TEST H1 (LINÉAIRE) vs H3 (DOMINANCE) ---\n');
  const meanDeltas = pairResults.map(r => Math.abs(r.delta.mean));
  const avgDelta = meanDeltas.reduce((a, b) => a + b, 0) / meanDeltas.length;
  console.log(`  Erreur moyenne absolue mean (H1 linéaire): ${avgDelta.toFixed(1)} mots`);
  console.log(`  Si < 5 → H1 (linéaire) domine`);
  console.log(`  Si > 10 → H3 (dominance) domine`);
  console.log(`  Verdict: ${avgDelta < 5 ? 'H1 LINÉAIRE' : avgDelta < 10 ? 'MIXTE' : 'H3 DOMINANCE'}\n`);

  for (const type of ['LAME×ARCHI', 'FLEUVE×LAME', 'ARCHI×ARCHI', 'FLEUVE×ARCHI']) {
    const items = pairResults.filter(r => r.type === type);
    if (items.length === 0) continue;
    const avgDM = items.reduce((a, r) => a + Math.abs(r.delta.mean), 0) / items.length;
    const avgDGB = items.reduce((a, r) => a + r.delta.gb, 0) / items.length;
    const dominantCounts: Record<string, number> = {};
    items.forEach(r => { dominantCounts[r.dominant] = (dominantCounts[r.dominant] || 0) + 1; });
    console.log(`  ${type.padEnd(16)} ΔMean_abs=${avgDM.toFixed(1)} ΔGB_avg=${avgDGB > 0 ? '+' : ''}${avgDGB.toFixed(3)} Dominant: ${JSON.stringify(dominantCounts)}`);
  }

  // 3. Trios classés par GB
  console.log('\n--- TRIOS : CLASSEMENT ---\n');
  const triosRanked = [...trioResults].sort((a, b) => b.gb - a.gb);
  console.log('  Rank Trio                 GB    ΔGB    mean  f26b  knife   CV   Émergence');
  console.log('  ' + '-'.repeat(80));
  triosRanked.forEach((r, i) => {
    const syn = r.delta.gb > 0.05 ? '✅ SYNERGIE' : r.delta.gb < -0.05 ? '❌ CONFLIT' : '≈  NEUTRE';
    console.log(`  #${i+1}   ${r.id.padEnd(20)} ${r.gb.toFixed(3)} ${r.delta.gb > 0 ? '+' : ''}${r.delta.gb.toFixed(3)} ${r.mean.toFixed(1).padStart(6)} ${r.f26b.toFixed(3).padStart(6)} ${r.knife.toFixed(3).padStart(6)} ${r.cv.toFixed(3).padStart(6)}  ${syn}`);
  });

  // 4. Références
  console.log('\n--- RÉFÉRENCES ---');
  console.log('  Trio FDP (Phase 4b) :    GB=4.087  f26b=0.400  CV=0.884');
  console.log('  Trio FPC (Miroir) :      GB=4.030  f26b=0.333  CV=1.257');
  console.log('  Flaubert solo (Miroir):  GB=3.990  f26b=0.500  CV=0.813');
  console.log('  Dickens solo (Miroir):   GB=4.155  f26b=0.286  CV=0.607');
  console.log('  Masters @500w:           GB=3.910  f26b=0.177  CV=0.940');

  // ═══════════════════════════════════════════════════════════════════════
  // SAUVEGARDER
  // ═══════════════════════════════════════════════════════════════════════

  const outDir = join('src', 'scoring', 'data');
  mkdirSync(outDir, { recursive: true });

  writeFileSync(join(outDir, 'PHASE5_ASSEMBLY_RESULTS.json'), JSON.stringify({
    metadata: { test: 'PHASE5_ASSEMBLY', timestamp, model: MODEL },
    solos: soloResults.map(r => ({ ...r, prose: undefined })),
    pairs: pairResults.map(r => ({ ...r, prose: undefined })),
    trios: trioResults.map(r => ({ ...r, prose: undefined })),
  }, null, 2));

  const prosesDir = join('sessions', `PHASE5_${timestamp}`);
  mkdirSync(prosesDir, { recursive: true });
  for (const r of [...soloResults, ...pairResults, ...trioResults]) {
    if (r.prose) writeFileSync(join(prosesDir, `${r.id}.txt`), r.prose);
  }

  console.log(`\nSaved: ${join(outDir, 'PHASE5_ASSEMBLY_RESULTS.json')} + ${prosesDir}/`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
