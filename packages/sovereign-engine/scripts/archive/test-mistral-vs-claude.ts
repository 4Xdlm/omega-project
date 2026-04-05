/**
 * OMEGA — Test Mistral vs Claude — French Native
 * 4 scenes × 2 sizes × 2 models = 16 API calls
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... MISTRAL_API_KEY=... npx tsx scripts/test-mistral-vs-claude.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { computeAllGBFeatures } from '../src/scoring/gb-scorer.js';
import { scoreGB } from '../src/scoring/gb-inference.js';
import { classifyPassage } from '../src/scoring/passage-classifier.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const MISTRAL_MODEL = 'mistral-large-latest';
const TEMPERATURE = 0.75;

const SIZES = [
  { label: '500w', max_tokens: 2000, target: 500 },
  { label: '3000w', max_tokens: 8000, target: 3000 },
];

function r4(v: number): number { return Math.round(v * 10000) / 10000; }
function mean(v: number[]): number { return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; }
function stdevFn(v: number[]): number {
  if (v.length < 2) return 0;
  const m = mean(v); return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
}
function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?\u2026\u00bb])\s+/).map(s => s.trim()).filter(s => s.length > 5 && s.split(/\s+/).length >= 3);
}

function getBriefs(target: number): Array<{ id: string; archetype: string; brief: string }> {
  const short = target <= 600;
  return [
    { id: 'confrontation', archetype: 'BRUTAL',
      brief: short
        ? `Tu es un romancier français. Écris une scène de confrontation violente. Un homme entre dans un bar. Il cherche celui qui a trahi sa sœur. La tension monte. Les regards se croisent. Quelqu'un va tomber. Écris ${target} mots de prose littéraire française. Pas de préambule. Contraintes : vocabulaire varié, alternance phrases courtes et longues, associations originales, zéro redondance.`
        : `Tu es un romancier français de premier plan. Écris une longue scène de confrontation. Un homme entre dans un bar de bord de route. Il cherche celui qui a trahi sa sœur il y a dix ans. La scène se déploie lentement : le lieu, les corps, les odeurs. Puis les pensées. Le dialogue s'engage. Les masques tombent. Écris ${target} mots de prose littéraire française. Pas de préambule. La scène doit MÉLANGER description, dialogue, introspection et narration dans le même flux. Contraintes : vocabulaire très varié, alterner phrases très courtes (3-8 mots) et longues (25-40+ mots), au moins 10% des phrases > 40 mots, associations originales, zéro redondance.`
    },
    { id: 'contemplation', archetype: 'SENSORY',
      brief: short
        ? `Tu es un romancier français. Écris une scène de contemplation. Une femme seule sur un quai de gare vide au crépuscule. Elle regarde les rails dans la brume. Elle pense à tout ce qu'elle laisse. Écris ${target} mots de prose littéraire française. Pas de préambule. Contraintes : vocabulaire varié, alternance phrases courtes et longues, associations originales, zéro redondance.`
        : `Tu es un romancier français de premier plan. Écris une longue scène de contemplation. Une femme seule sur un quai de gare vide, la nuit. Le dernier train est parti. Elle ne l'a pas pris. Elle a choisi de rester. Ses pensées se mêlent aux sensations. Elle se souvient d'une conversation. Le dialogue revient par fragments. Écris ${target} mots de prose littéraire française. Pas de préambule. La scène doit MÉLANGER description, dialogue rapporté, introspection et narration — fondus, pas successifs. Contraintes : vocabulaire très varié, alterner phrases courtes et longues (>30 mots), au moins 10% des phrases > 40 mots, associations originales, zéro redondance.`
    },
    { id: 'action_pure', archetype: 'BRUTAL',
      brief: short
        ? `Tu es un romancier français. Écris une scène d'action pure. Une poursuite à travers les ruelles d'une ville méditerranéenne la nuit. Deux silhouettes. L'une fuit. L'autre chasse. Les toits, les escaliers, les passages. Écris ${target} mots de prose littéraire française. Pas de préambule. Contraintes : vocabulaire varié, alternance phrases courtes et longues, associations originales, zéro redondance.`
        : `Tu es un romancier français de premier plan. Écris une longue scène d'action. Une poursuite à travers une ville méditerranéenne la nuit. Deux silhouettes : l'une fuit, l'autre chasse. Ce n'est pas que de la course — celui qui fuit pense. Celui qui chasse doute. La ville est un personnage. Écris ${target} mots de prose littéraire française. Pas de préambule. La scène doit MÉLANGER description, introspection, narration et micro-dialogues dans le flux. Contraintes : vocabulaire très varié, alterner phrases courtes (coups secs) et longues (descriptions en mouvement), au moins 10% des phrases > 40 mots, associations originales, zéro redondance.`
    },
    { id: 'elegie', archetype: 'INTERIOR',
      brief: short
        ? `Tu es un romancier français. Écris une scène d'élégie intérieure. Un vieil homme assis dans la chambre de son fils mort. Les objets parlent. La lumière décline. Le souvenir et le présent se confondent. Écris ${target} mots de prose littéraire française. Pas de préambule. Contraintes : vocabulaire varié, alternance phrases courtes et longues, associations originales, zéro redondance.`
        : `Tu es un romancier français de premier plan. Écris une longue scène d'élégie. Un vieil homme dans la chambre de son fils mort depuis six mois. Il n'a rien touché. Aujourd'hui il a décidé de ranger. Mais chaque objet arrête le geste. Un livre, un pull, une photo. Et le souvenir qui vient avec. Écris ${target} mots de prose littéraire française. Pas de préambule. La scène doit MÉLANGER description, dialogue rapporté, introspection et narration dans un flux unique. Contraintes : vocabulaire très varié, alterner phrases courtes et longues (>30 mots), au moins 10% des phrases > 40 mots, associations originales, zéro redondance.`
    },
  ];
}

// ═══════════════════════════════════════════════════════════════
// PROVIDERS
// ═══════════════════════════════════════════════════════════════

async function generateClaude(client: Anthropic, prompt: string, maxTokens: number): Promise<string> {
  const response = await client.messages.create({
    model: CLAUDE_MODEL, max_tokens: maxTokens, temperature: TEMPERATURE,
    messages: [{ role: 'user', content: prompt }],
  });
  const tb = response.content.find(b => b.type === 'text');
  if (!tb || tb.type !== 'text') throw new Error('No text block');
  return tb.text;
}

async function generateMistral(apiKey: string, prompt: string, maxTokens: number): Promise<string> {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MISTRAL_MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens, temperature: TEMPERATURE }),
  });
  if (!res.ok) throw new Error(`Mistral ${res.status}: ${await res.text()}`);
  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0].message.content;
}

async function withRetry<T>(fn: () => Promise<T>, label: string, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try { return await fn(); }
    catch (e: any) { console.warn(`  [RETRY ${i + 1}] ${label}: ${e.message}`); if (i === retries - 1) throw e; await new Promise(r => setTimeout(r, 3000 * (i + 1))); }
  }
  throw new Error('unreachable');
}

// ═══════════════════════════════════════════════════════════════
// MEASURE
// ═══════════════════════════════════════════════════════════════

interface Result {
  scene: string; model: string; size: string; words: number; sents: number;
  mean_len: number; cv: number; gb: number; tier: string; type: string;
  f26b: number; f1a: number; f29d: number; f9a: number; f17: number; f1_mean: number;
  prose: string;
}

function measure(prose: string, scene: string, model: string, size: string): Result {
  const feats = computeAllGBFeatures(prose);
  const gb = scoreGB(feats);
  const tier = gb >= 4.5 ? 'S' : gb >= 3.5 ? 'A' : gb >= 2.5 ? 'B' : gb >= 1.5 ? 'C' : 'D';
  const cls = classifyPassage(prose);
  const sents = splitSentences(prose);
  const lens = sents.map(s => s.split(/\s+/).length);
  const avg = mean(lens); const cv = avg > 0 ? stdevFn(lens) / avg : 0;
  return {
    scene, model, size, words: prose.split(/\s+/).length, sents: sents.length,
    mean_len: r4(avg), cv: r4(cv), gb: r4(gb), tier, type: cls.dominant_type,
    f26b: r4(feats.f26b_long_sent_rate ?? 0), f1a: r4(feats.f1a_rhythm_variance ?? 0),
    f29d: r4(feats.f29d_ttr_score ?? 0), f9a: r4(feats.f9a_contradiction_rate ?? 0),
    f17: feats.f17_knife_count ?? 0, f1_mean: r4(feats.f1_mean ?? 0), prose,
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  const anthropicKey = process.env['ANTHROPIC_API_KEY'];
  const mistralKey = process.env['MISTRAL_API_KEY'];
  if (!anthropicKey) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1); }
  if (!mistralKey) { console.error('ERROR: MISTRAL_API_KEY not set'); process.exit(1); }

  const claude = new Anthropic({ apiKey: anthropicKey });
  const results: Result[] = [];
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  console.log('=' .repeat(70));
  console.log('  OMEGA — MISTRAL vs CLAUDE — FRANÇAIS NATIF');
  console.log(`  Claude: ${CLAUDE_MODEL} | Mistral: ${MISTRAL_MODEL} | T=${TEMPERATURE}`);
  console.log('=' .repeat(70));

  for (const size of SIZES) {
    const briefs = getBriefs(size.target);
    console.log(`\n--- ${size.label.toUpperCase()} ---`);

    for (const scene of briefs) {
      // Claude
      console.log(`\n[${scene.id}/${size.label}] Claude...`);
      const pc = await withRetry(() => generateClaude(claude, scene.brief, size.max_tokens), `Claude ${scene.id}`);
      const mc = measure(pc, scene.id, 'claude', size.label);
      results.push(mc);
      console.log(`  Claude: ${mc.words}w GB=${mc.gb} CV=${mc.cv} f26b=${mc.f26b} type=${mc.type}`);

      await new Promise(r => setTimeout(r, 2000));

      // Mistral
      console.log(`[${scene.id}/${size.label}] Mistral...`);
      const pm = await withRetry(() => generateMistral(mistralKey, scene.brief, size.max_tokens), `Mistral ${scene.id}`);
      const mm = measure(pm, scene.id, 'mistral', size.label);
      results.push(mm);
      console.log(`  Mistral: ${mm.words}w GB=${mm.gb} CV=${mm.cv} f26b=${mm.f26b} type=${mm.type}`);

      const dg = mm.gb - mc.gb;
      console.log(`  Delta: GB=${dg > 0 ? '+' : ''}${dg.toFixed(3)} ${dg > 0.05 ? '→ MISTRAL' : dg < -0.05 ? '→ CLAUDE' : '→ TIE'}`);

      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════

  console.log(`\n${'='.repeat(70)}`);
  console.log('  SUMMARY');
  console.log(`${'='.repeat(70)}`);

  for (const size of SIZES) {
    const cs = results.filter(r => r.model === 'claude' && r.size === size.label);
    const ms = results.filter(r => r.model === 'mistral' && r.size === size.label);
    const cMeanGB = mean(cs.map(r => r.gb));
    const mMeanGB = mean(ms.map(r => r.gb));
    const d = mMeanGB - cMeanGB;
    console.log(`\n  ${size.label}: Claude avg GB=${cMeanGB.toFixed(3)} | Mistral avg GB=${mMeanGB.toFixed(3)} | Delta=${d > 0 ? '+' : ''}${d.toFixed(3)}`);
    console.log(`    Claude: CV=${mean(cs.map(r => r.cv)).toFixed(3)} f26b=${mean(cs.map(r => r.f26b)).toFixed(4)} f9a=${mean(cs.map(r => r.f9a)).toFixed(3)}`);
    console.log(`    Mistral: CV=${mean(ms.map(r => r.cv)).toFixed(3)} f26b=${mean(ms.map(r => r.f26b)).toFixed(4)} f9a=${mean(ms.map(r => r.f9a)).toFixed(3)}`);
  }

  const allC = results.filter(r => r.model === 'claude');
  const allM = results.filter(r => r.model === 'mistral');
  const overallD = mean(allM.map(r => r.gb)) - mean(allC.map(r => r.gb));
  const verdict = overallD > 0.15 ? 'MISTRAL_WINS' : overallD > 0.05 ? 'MISTRAL_SLIGHT' : overallD > -0.05 ? 'NO_DIFFERENCE' : 'CLAUDE_WINS';

  console.log(`\n  OVERALL: Delta=${overallD > 0 ? '+' : ''}${overallD.toFixed(3)} → ${verdict}`);

  // Save
  const dataDir = resolve(__dirname, '../src/scoring/data');
  writeFileSync(join(dataDir, 'MISTRAL_VS_CLAUDE_FR.json'), JSON.stringify({
    date: new Date().toISOString(), claude_model: CLAUDE_MODEL, mistral_model: MISTRAL_MODEL,
    temperature: TEMPERATURE, verdict,
    overall_delta: r4(overallD),
    results: results.map(({ prose: _p, ...rest }) => rest),
  }, null, 2));

  const proseDir = resolve(__dirname, `../sessions/MISTRAL_VS_CLAUDE_${ts}`);
  mkdirSync(proseDir, { recursive: true });
  for (const r of results) writeFileSync(join(proseDir, `${r.scene}_${r.model}_${r.size}.txt`), r.prose);

  console.log(`\n  Saved: data/MISTRAL_VS_CLAUDE_FR.json + ${proseDir}`);
  console.log('=' .repeat(70));
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
