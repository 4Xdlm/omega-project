/**
 * OMEGA — Bench Chapter: 3 Models × 2 Configs + Continuity
 * Claude (with Rosetta) vs Mistral (raw) vs GPT (raw)
 *
 * Usage: ANTHROPIC_API_KEY=... MISTRAL_API_KEY=... OPENAI_API_KEY=...
 *        npx tsx scripts/bench-chapter-3models.ts
 */
import Anthropic from '@anthropic-ai/sdk';
import { computeAllGBFeatures } from '../src/scoring/gb-scorer.js';
import { scoreGB } from '../src/scoring/gb-inference.js';
import { classifyPassage } from '../src/scoring/passage-classifier.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPERATURE = 0.75;

function r4(v: number): number { return Math.round(v * 10000) / 10000; }
function mean(v: number[]): number { return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; }
function stdevFn(v: number[]): number { if (v.length < 2) return 0; const m = mean(v); return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1)); }
function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?\u2026\u00bb])\s+/).map(s => s.trim()).filter(s => s.length > 5 && s.split(/\s+/).length >= 3);
}

// Rosetta prefix for Claude only
const ROSETTA_SUFFIX = `

Contraintes mécaniques (calibrées sur 450 tests) :
- Vocabulaire : au moins 70 mots uniques pour 100 mots consécutifs.
- Contraste : une phrase sur trois < 8 mots, une sur trois > 25 mots.
- Redondance : aucun bigramme ne doit apparaître plus de 2 fois.
- Originalité : > 85% des bigrammes doivent être uniques.
- Accroche : la première phrase contient une tension en moins de 15 mots.
- Suspense : les 20 derniers mots laissent une question ouverte.
- Sensoriel : au moins 6 mots sensoriels pour 100 mots.

Syntaxe obligatoire :
- Au moins 15% de tes phrases DOIVENT dépasser 30 mots.
- Au moins 5% DOIVENT dépasser 40 mots.
- Utilise la subordination profonde : relatives, participiales, circonstancielles.

Langue FR natif :
Écris directement en français natif. Pas de calques anglais.
Privilégie incises, appositions, cadence majeure française.`;

const CONFIG_A = `Tu es un romancier français de premier plan. Écris un chapitre complet d'environ 3000 mots.

CHAPITRE : "L'Arrivée"
Antoine arrive dans le village de son enfance après vingt ans d'absence. Il a reçu une lettre anonyme qui lui annonce que sa mère, qu'il croyait morte, est vivante. Le village a changé. Les gens le reconnaissent mais détournent le regard. Il va au café. Il pose des questions. Personne ne répond vraiment. La tension monte. À la fin du chapitre, quelqu'un glisse un mot sous sa porte d'hôtel : "Elle ne veut pas te voir."

STRUCTURE : ARC complet — ouverture → montée → tension → chute. Le ton évolue : curiosité → malaise → frustration → choc. MÉLANGER dans le flux : description, dialogue, introspection, narration. Pas de blocs séparés.

Contraintes : vocabulaire très varié, alterner phrases courtes (< 8 mots) et longues (> 30 mots), au moins 10% > 40 mots, associations originales, zéro redondance, accroche forte, fin ouverte.

Écris directement, sans préambule ni titre.`;

const CONFIG_B = `Tu es un romancier français de premier plan. Écris un chapitre complet d'environ 3000 mots.

CHAPITRE : "La Chambre"
Élise entre dans l'appartement de son père, mort trois jours plus tôt. Elle est venue chercher les papiers pour la succession. Mais l'appartement est un musée de sa vie. Chaque pièce contient un souvenir. La cuisine. Le bureau où il écrivait des lettres qu'il n'envoyait jamais. La chambre où elle trouve, dans un tiroir fermé à clé, un carnet de lettres à elle — jamais envoyées. Elle les lit. Le chapitre finit quand elle referme le carnet et sort.

STRUCTURE : ARC émotionnel — distance → curiosité → émotion → effondrement → résolution. MÉLANGER : description minutieuse, dialogue rapporté (souvenirs), introspection profonde, narration des gestes. La tension n'est pas de l'action — c'est de l'émotion.

Contraintes : vocabulaire très varié, alterner phrases très courtes (3-6 mots) et très longues (30-50 mots), au moins 10% > 40 mots, associations originales, zéro redondance. Première phrase = le ton. Dernière phrase = une image, pas une pensée.

Écris directement, sans préambule ni titre.`;

const CONFIG_C = `Tu es un romancier français de premier plan. Écris DEUX CHAPITRES CONSÉCUTIFS d'environ 2500 mots chacun (5000 mots total).

CONTEXTE : Marc, 45 ans, chirurgien. Sa femme Claire l'a quitté il y a six mois. Leur fille Léa, 17 ans, vit chez la mère. Marc n'a pas le droit de la voir. Il a découvert que Claire a un amant — un collègue de Marc à l'hôpital.

CHAPITRE 3 — "Le Bloc" : Marc en salle d'opération. Opération de routine. Il voit les mains de l'amant dans le bloc d'à côté. Ses propres mains tremblent. Il continue. Le patient ne doit pas mourir parce que lui souffre. Fin : il croise l'amant dans le couloir. Ils ne se disent rien.

CHAPITRE 4 — "Le Message" : Marc seul chez lui. Il boit. Son téléphone sonne : un message de Léa. "Papa, je sais tout. Je veux te voir." Il relit le message 50 fois. Il écrit, efface, réécrit. Le chapitre montre sa nuit entière. Fin : il envoie un seul mot. "Demain."

CONTINUITÉ OBLIGATOIRE : ce qui se passe au chapitre 3 a des conséquences au chapitre 4. Chaque chapitre a son ARC mais ils forment un arc PLUS GRAND. MÉLANGER les types. Au moins 10% > 40 mots. Vocabulaire varié. Marquer la séparation entre les deux chapitres.

Écris directement, sans préambule.`;

// ═══════════════════════════════════════════════════════════════
// PROVIDERS
// ═══════════════════════════════════════════════════════════════

async function genClaude(client: Anthropic, prompt: string): Promise<string> {
  const res = await client.messages.create({
    model: 'claude-sonnet-4-20250514', max_tokens: 12000, temperature: TEMPERATURE,
    messages: [{ role: 'user', content: prompt }],
  });
  const tb = res.content.find(b => b.type === 'text');
  if (!tb || tb.type !== 'text') throw new Error('No text');
  return tb.text;
}

async function genMistral(key: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ model: 'mistral-large-latest', messages: [{ role: 'user', content: prompt }], max_tokens: 12000, temperature: TEMPERATURE }),
  });
  if (!res.ok) throw new Error(`Mistral ${res.status}: ${await res.text()}`);
  return ((await res.json()) as any).choices[0].message.content;
}

async function genGPT(key: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'user', content: prompt }], max_tokens: 12000, temperature: TEMPERATURE }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  return ((await res.json()) as any).choices[0].message.content;
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  for (let i = 0; i < 3; i++) {
    try { return await fn(); } catch (e: any) {
      console.warn(`  [RETRY ${i + 1}] ${label}: ${e.message}`);
      if (i === 2) throw e;
      await new Promise(r => setTimeout(r, 5000 * (i + 1)));
    }
  }
  throw new Error('unreachable');
}

// ═══════════════════════════════════════════════════════════════
// MEASURE
// ═══════════════════════════════════════════════════════════════

interface Result {
  config: string; model: string; words: number; sents: number;
  mean_len: number; cv: number; gb: number; tier: string; type: string;
  f26b: number; f1a: number; f29d: number; f9a: number; f17: number;
}

function measure(prose: string, config: string, model: string): Result {
  const feats = computeAllGBFeatures(prose);
  const gb = scoreGB(feats);
  const tier = gb >= 4.5 ? 'S' : gb >= 3.5 ? 'A' : gb >= 2.5 ? 'B' : gb >= 1.5 ? 'C' : 'D';
  const cls = classifyPassage(prose);
  const sents = splitSentences(prose);
  const lens = sents.map(s => s.split(/\s+/).length);
  const avg = mean(lens); const cv = avg > 0 ? stdevFn(lens) / avg : 0;
  return {
    config, model, words: prose.split(/\s+/).length, sents: sents.length,
    mean_len: r4(avg), cv: r4(cv), gb: r4(gb), tier, type: cls.dominant_type,
    f26b: r4(feats.f26b_long_sent_rate ?? 0), f1a: r4(feats.f1a_rhythm_variance ?? 0),
    f29d: r4(feats.f29d_ttr_score ?? 0), f9a: r4(feats.f9a_contradiction_rate ?? 0),
    f17: feats.f17_knife_count ?? 0,
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  const aKey = process.env['ANTHROPIC_API_KEY'];
  const mKey = process.env['MISTRAL_API_KEY'];
  const oKey = process.env['OPENAI_API_KEY'];

  const hasAll = aKey && mKey && oKey;
  const available: string[] = [];
  if (aKey) available.push('claude');
  if (mKey) available.push('mistral');
  if (oKey) available.push('gpt');

  if (available.length === 0) { console.error('ERROR: No API keys set'); process.exit(1); }
  console.log(`Available models: ${available.join(', ')}`);

  const claude = aKey ? new Anthropic({ apiKey: aKey }) : null;
  const results: Array<Result & { prose: string }> = [];
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  console.log('=' .repeat(70));
  console.log('  OMEGA — BENCH CHAPTER: 3 MODELS × 2 CONFIGS + CONTINUITY');
  console.log('=' .repeat(70));

  const CONFIGS: Array<{ id: string; brief: string }> = [
    { id: 'config_a', brief: CONFIG_A },
    { id: 'config_b', brief: CONFIG_B },
    { id: 'config_c', brief: CONFIG_C },
  ];

  for (const cfg of CONFIGS) {
    console.log(`\n--- ${cfg.id.toUpperCase()} ---`);

    for (const modelName of available) {
      const brief = modelName === 'claude' ? cfg.brief + ROSETTA_SUFFIX : cfg.brief;
      console.log(`[${cfg.id}] ${modelName}...`);

      let prose: string;
      if (modelName === 'claude' && claude) {
        prose = await withRetry(() => genClaude(claude, brief), `claude ${cfg.id}`);
      } else if (modelName === 'mistral' && mKey) {
        prose = await withRetry(() => genMistral(mKey, brief), `mistral ${cfg.id}`);
      } else if (modelName === 'gpt' && oKey) {
        prose = await withRetry(() => genGPT(oKey, brief), `gpt ${cfg.id}`);
      } else continue;

      const m = measure(prose, cfg.id, modelName);
      results.push({ ...m, prose });
      console.log(`  ${modelName}: ${m.words}w GB=${m.gb} CV=${m.cv} f26b=${m.f26b} type=${m.type} tier=${m.tier}`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('  SUMMARY TABLE');
  console.log(`${'='.repeat(70)}`);
  console.log(`  ${'Config'.padEnd(12)} ${'Model'.padEnd(10)} ${'Words'.padStart(6)} ${'GB'.padStart(6)} ${'Tier'.padStart(5)} ${'CV'.padStart(7)} ${'f26b'.padStart(7)} ${'f9a'.padStart(6)} ${'Type'.padStart(12)}`);
  console.log('  ' + '-'.repeat(68));
  for (const r of results) {
    console.log(`  ${r.config.padEnd(12)} ${r.model.padEnd(10)} ${String(r.words).padStart(6)} ${r.gb.toFixed(2).padStart(6)} ${r.tier.padStart(5)} ${r.cv.toFixed(3).padStart(7)} ${r.f26b.toFixed(4).padStart(7)} ${r.f9a.toFixed(3).padStart(6)} ${r.type.padStart(12)}`);
  }

  // Per-model averages
  console.log('\n  MODEL AVERAGES:');
  for (const m of available) {
    const mr = results.filter(r => r.model === m);
    console.log(`    ${m.padEnd(10)} GB=${mean(mr.map(r => r.gb)).toFixed(3)} CV=${mean(mr.map(r => r.cv)).toFixed(3)} f26b=${mean(mr.map(r => r.f26b)).toFixed(4)}`);
  }

  // Save
  const dataDir = resolve(__dirname, '../src/scoring/data');
  writeFileSync(join(dataDir, 'BENCH_CHAPTER_3MODELS.json'), JSON.stringify({
    date: new Date().toISOString(), models: available,
    results: results.map(({ prose: _, ...rest }) => rest),
    averages: Object.fromEntries(available.map(m => {
      const mr = results.filter(r => r.model === m);
      return [m, { gb: r4(mean(mr.map(r => r.gb))), cv: r4(mean(mr.map(r => r.cv))), f26b: r4(mean(mr.map(r => r.f26b))) }];
    })),
  }, null, 2));

  const proseDir = resolve(__dirname, `../sessions/BENCH_CHAPTER_${ts}`);
  mkdirSync(proseDir, { recursive: true });
  for (const r of results) writeFileSync(join(proseDir, `${r.config}_${r.model}.txt`), r.prose);

  console.log(`\n  Saved: data/BENCH_CHAPTER_3MODELS.json + ${proseDir}`);
  console.log('=' .repeat(70));
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
