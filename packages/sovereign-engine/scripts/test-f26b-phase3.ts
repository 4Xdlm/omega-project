/**
 * OMEGA — Phase 3: f26b validation on 3000-word chapters
 * F3_flaubert (champion) + D3_exemplar (challenger) + BASELINE
 * 3 variants × 3 scenes × 2 runs = 18 API calls
 * Windowed analysis for drift detection.
 *
 * Usage: ANTHROPIC_API_KEY=sk-... npx tsx scripts/test-f26b-phase3.ts
 */
import Anthropic from '@anthropic-ai/sdk';
import { computeAllGBFeatures } from '../src/scoring/gb-scorer.js';
import { scoreGB } from '../src/scoring/gb-inference.js';
import { classifyPassage } from '../src/scoring/passage-classifier.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODEL = 'claude-sonnet-4-20250514';
const TEMPERATURE = 0.75;
const MAX_TOKENS = 8000;
const RUNS = 2;

function r4(v: number): number { return Math.round(v * 10000) / 10000; }
function mean(v: number[]): number { return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; }
function stdevFn(v: number[]): number { if (v.length < 2) return 0; const m = mean(v); return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1)); }
function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?\u2026\u00bb])\s+/).map(s => s.trim()).filter(s => s.length > 5 && s.split(/\s+/).length >= 3);
}

const SCENES = [
  { id: 'confrontation', brief: `Un homme entre dans un bar de bord de route. Il cherche celui qui a trahi sa sœur il y a dix ans. Le lieu est presque vide. La serveuse nettoie les verres. La lumière est mauvaise. L'homme s'assoit. Il attend. Puis l'autre arrive. La scène se déploie lentement : le lieu, les corps, les odeurs. Les pensées de l'homme. Le dialogue s'engage — d'abord banal, puis chargé. Les masques tombent.` },
  { id: 'deuil', brief: `Élise entre dans l'appartement de son père, mort trois jours plus tôt. Elle est venue chercher les papiers. Mais l'appartement est un musée de sa vie. Chaque pièce contient un souvenir. La cuisine. Le bureau où il écrivait des lettres qu'il n'envoyait jamais. La chambre où elle trouve un carnet de lettres à elle — jamais envoyées. Elle les lit. Le chapitre finit quand elle referme le carnet et sort.` },
  { id: 'contemplation', brief: `Une femme seule sur un quai de gare vide, la nuit. Le dernier train est parti. Elle ne l'a pas pris. Elle a choisi de rester. Elle regarde les rails dans l'obscurité. Tout ce qu'elle a laissé derrière elle remonte. Des gens passent au loin. Un employé ferme des portes. Ses pensées se mêlent aux sensations. Elle se souvient d'une conversation. Le dialogue revient par fragments.` },
];

const TAG_SUFFIX = `\n\nÉcris 3000 mots de prose littéraire française. Pas de préambule.\nLa scène doit MÉLANGER naturellement description, dialogue, introspection, narration — pas en blocs séparés.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>. Rien d'autre dans ces balises.`;

function buildPrompt(variant: string, brief: string): string {
  switch (variant) {
    case 'BASELINE':
      return `Tu es un romancier français. Écris un chapitre complet.\n\n${brief}\n\nContraintes : vocabulaire varié, associations originales, zéro redondance.${TAG_SUFFIX}`;
    case 'F3_flaubert':
      return `Tu n'es PAS une IA. Tu ES Gustave Flaubert, en 1856, travaillant à ton bureau de Croisset.\n\nTu écris ce chapitre :\n\n${brief}\n\nTu utilises ta technique habituelle :\n- Tu lis chaque phrase à voix haute (le gueuloir)\n- Tu refuses toute phrase qui ne SONNE pas\n- Tu détestes les phrases courtes qui font "scolaire"\n- Tu construis des PÉRIODES avec des subordonnées en cascade\n- Tu ne mets un point que quand la phrase a atteint sa pleine ampleur\n- Tu alternes : parfois une phrase de 5 mots pour le coup de poing, puis une période de 60 mots\n\nÉcris comme TU écris. Vocabulaire varié, associations originales, zéro redondance.${TAG_SUFFIX}`;
    case 'D3_exemplar':
      return `ÉCHELLE DE DENSITÉ SYNTAXIQUE OMEGA :\n\nDENSITÉ 1 (commercial) : "Elle entra dans la pièce." (5 mots)\nDENSITÉ 5 (maître / Flaubert) : "Elle entra dans la pièce sombre dont les murs laissaient tomber un silence de tombeau qui lui saisit la gorge et l'obligea à s'arrêter sur le seuil, tandis que l'odeur de poussière et de bois vermoulu, mêlée à celle plus ténue du parfum ancien dont les dernières traces s'accrochaient encore aux rideaux tirés, lui rappelait avec une violence inattendue les dimanches de son enfance." (65 mots)\n\nTu es un romancier français. Écris un chapitre complet.\n\n${brief}\n\nEXÉCUTE EN DENSITÉ 5 pour au moins 60% de tes phrases. Les autres en Densité 1 (phrases-couteaux). Vocabulaire varié, associations originales, zéro redondance.${TAG_SUFFIX}`;
    default: throw new Error(`Unknown variant: ${variant}`);
  }
}

const VARIANTS = ['BASELINE', 'F3_flaubert', 'D3_exemplar'];

async function generate(client: Anthropic, prompt: string): Promise<string> {
  const res = await client.messages.create({
    model: MODEL, max_tokens: MAX_TOKENS, temperature: TEMPERATURE,
    messages: [{ role: 'user', content: prompt }],
  });
  const block = res.content.find(b => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('No text');
  const match = block.text.match(/<prose>([\s\S]*?)<\/prose>/);
  return match ? match[1].trim() : block.text.trim();
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

// Windowed analysis
function measureWindows(prose: string, windowSize = 500): Array<{ pos: number; words: number; sents: number; mean_len: number; cv: number; long_rate: number; max_sent: number }> {
  const words = prose.split(/\s+/);
  const results: Array<{ pos: number; words: number; sents: number; mean_len: number; cv: number; long_rate: number; max_sent: number }> = [];
  for (let i = 0; i < words.length; i += windowSize) {
    const ww = words.slice(i, i + windowSize);
    if (ww.length < 100) break;
    const text = ww.join(' ');
    const sents = splitSentences(text);
    const lens = sents.map(s => s.split(/\s+/).length);
    const avg = mean(lens); const cv = avg > 0 ? stdevFn(lens) / avg : 0;
    results.push({ pos: r4(i / words.length), words: ww.length, sents: sents.length, mean_len: r4(avg), cv: r4(cv), long_rate: r4(sents.length > 0 ? lens.filter(l => l >= 40).length / sents.length : 0), max_sent: Math.max(0, ...lens) });
  }
  return results;
}

interface Result {
  variant: string; scene: string; run: number;
  words: number; sents: number; mean_len: number; cv: number;
  long_count: number; long_rate: number; max_sent: number;
  gb: number; tier: string; type: string;
  f26b: number; f1a: number; f29d: number; f9a: number; f17: number;
  windows: ReturnType<typeof measureWindows>;
  drift_mean_len: number; drift_cv: number; drift_long: number;
  prose: string;
}

function measureFull(prose: string, variant: string, scene: string, run: number): Result {
  const feats = computeAllGBFeatures(prose);
  const gb = scoreGB(feats);
  const tier = gb >= 4.5 ? 'S' : gb >= 3.5 ? 'A' : gb >= 2.5 ? 'B' : gb >= 1.5 ? 'C' : 'D';
  const cls = classifyPassage(prose);
  const sents = splitSentences(prose);
  const lens = sents.map(s => s.split(/\s+/).length);
  const avg = mean(lens); const cv = avg > 0 ? stdevFn(lens) / avg : 0;
  const longCount = lens.filter(l => l >= 40).length;

  const windows = measureWindows(prose);
  const first = windows[0]; const last = windows[windows.length - 1];
  const driftMean = first && last ? last.mean_len - first.mean_len : 0;
  const driftCV = first && last ? last.cv - first.cv : 0;
  const driftLong = first && last ? last.long_rate - first.long_rate : 0;

  return {
    variant, scene, run,
    words: prose.split(/\s+/).length, sents: sents.length,
    mean_len: r4(avg), cv: r4(cv),
    long_count: longCount, long_rate: r4(sents.length > 0 ? longCount / sents.length : 0),
    max_sent: Math.max(0, ...lens),
    gb: r4(gb), tier, type: cls.dominant_type,
    f26b: r4(feats.f26b_long_sent_rate ?? 0), f1a: r4(feats.f1a_rhythm_variance ?? 0),
    f29d: r4(feats.f29d_ttr_score ?? 0), f9a: r4(feats.f9a_contradiction_rate ?? 0),
    f17: feats.f17_knife_count ?? 0,
    windows, drift_mean_len: r4(driftMean), drift_cv: r4(driftCV), drift_long: r4(driftLong),
    prose,
  };
}

async function main() {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1); }

  const client = new Anthropic({ apiKey });
  const results: Result[] = [];
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  console.log('=' .repeat(70));
  console.log('  OMEGA — PHASE 3: f26b VALIDATION ON 3000-WORD CHAPTERS');
  console.log(`  Model: ${MODEL} | Variants: ${VARIANTS.length} | Scenes: ${SCENES.length} | Runs: ${RUNS}`);
  console.log(`  Total: ${VARIANTS.length * SCENES.length * RUNS} API calls`);
  console.log('=' .repeat(70));

  for (const v of VARIANTS) {
    for (const scene of SCENES) {
      for (let run = 1; run <= RUNS; run++) {
        const label = `${v}/${scene.id}/r${run}`;
        console.log(`\n[${label}] Generating 3000w...`);
        try {
          const prose = await withRetry(() => generate(client, buildPrompt(v, scene.brief)), label);
          const m = measureFull(prose, v, scene.id, run);
          results.push(m);
          console.log(`  ${m.words}w ${m.sents}s mean=${m.mean_len} CV=${m.cv} f26b=${m.f26b} long%=${(m.long_rate*100).toFixed(0)} GB=${m.gb} type=${m.type}`);
          console.log(`  DRIFT: mean_len ${m.drift_mean_len > 0 ? '+' : ''}${m.drift_mean_len} | long% ${(m.drift_long*100).toFixed(0)}%`);
          for (let w = 0; w < m.windows.length; w++) {
            const win = m.windows[w];
            console.log(`    W${w+1}(${(win.pos*100).toFixed(0)}%): mean=${win.mean_len} CV=${win.cv} long%=${(win.long_rate*100).toFixed(0)} max=${win.max_sent}`);
          }
        } catch (e: any) { console.error(`  ERROR: ${e.message}`); }
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }

  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('  SUMMARY BY VARIANT');
  console.log(`${'='.repeat(80)}`);
  console.log(`  ${'Variant'.padEnd(18)} ${'Words'.padStart(6)} ${'GB'.padStart(7)} ${'f26b'.padStart(7)} ${'CV'.padStart(7)} ${'Long%'.padStart(6)} ${'MeanLen'.padStart(8)} ${'Drift'.padStart(7)} ${'PASS'.padStart(6)}`);
  console.log('  ' + '-'.repeat(70));

  for (const v of VARIANTS) {
    const vr = results.filter(r => r.variant === v);
    if (vr.length === 0) continue;
    const avgGB = mean(vr.map(r => r.gb));
    const avgF26b = mean(vr.map(r => r.f26b));
    const avgCV = mean(vr.map(r => r.cv));
    const avgLong = mean(vr.map(r => r.long_rate));
    const avgLen = mean(vr.map(r => r.mean_len));
    const avgWords = mean(vr.map(r => r.words));
    const avgDrift = mean(vr.map(r => r.drift_mean_len));
    const pass = avgGB > 3.90 && avgF26b > 0.10 && avgCV > 0.60;
    console.log(`  ${v.padEnd(18)} ${avgWords.toFixed(0).padStart(6)} ${avgGB.toFixed(3).padStart(7)} ${avgF26b.toFixed(4).padStart(7)} ${avgCV.toFixed(3).padStart(7)} ${(avgLong*100).toFixed(0).padStart(5)}% ${avgLen.toFixed(1).padStart(8)} ${(avgDrift>0?'+':'')+avgDrift.toFixed(1).padStart(6)} ${(pass?'PASS':'FAIL').padStart(6)}`);
  }

  console.log('\n  REFERENCE:');
  console.log('  F3 @500w (Phase 2): GB=4.075  f26b=0.568  CV=0.817');
  console.log('  Masters @2000w:     GB=4.090  f26b=0.177  CV=0.940');

  // Save
  const dataDir = resolve(__dirname, '../src/scoring/data');
  writeFileSync(join(dataDir, 'F26B_PHASE3_RESULTS.json'), JSON.stringify({
    date: new Date().toISOString(), model: MODEL, temperature: TEMPERATURE,
    variants: VARIANTS, scenes: SCENES.map(s => s.id), runs: RUNS,
    results: results.map(({ prose: _, ...rest }) => rest),
    summary: Object.fromEntries(VARIANTS.map(v => {
      const vr = results.filter(r => r.variant === v);
      return [v, { gb: r4(mean(vr.map(r => r.gb))), f26b: r4(mean(vr.map(r => r.f26b))), cv: r4(mean(vr.map(r => r.cv))), long_rate: r4(mean(vr.map(r => r.long_rate))), drift: r4(mean(vr.map(r => r.drift_mean_len))) }];
    })),
  }, null, 2));

  const proseDir = resolve(__dirname, `../sessions/F26B_PHASE3_${ts}`);
  mkdirSync(proseDir, { recursive: true });
  for (const r of results) writeFileSync(join(proseDir, `${r.variant}_${r.scene}_r${r.run}.txt`), r.prose);

  console.log(`\n  Saved: data/F26B_PHASE3_RESULTS.json + ${proseDir}`);
  console.log('=' .repeat(70));
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
