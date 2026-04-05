/**
 * OMEGA — Phase 2: f26b validation on 500-word scenes
 * Top 4 variants from Phase 1 + baseline × 2 scenes × 2 runs = 20 API calls
 *
 * Usage: ANTHROPIC_API_KEY=sk-... npx tsx scripts/test-f26b-phase2.ts
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
const MAX_TOKENS = 2000;
const RUNS = 2;

function r4(v: number): number { return Math.round(v * 10000) / 10000; }
function mean(v: number[]): number { return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; }
function stdevFn(v: number[]): number { if (v.length < 2) return 0; const m = mean(v); return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1)); }
function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?\u2026\u00bb])\s+/).map(s => s.trim()).filter(s => s.length > 5 && s.split(/\s+/).length >= 3);
}

const SCENES = [
  { id: 'tension', brief: `Un homme attend dans une pièce sombre. Il sait que quelqu'un va venir. Il ne sait pas qui. La porte est fermée. Le temps passe. Les bruits de la rue filtrent à travers les murs. Chaque son pourrait être l'annonce de l'arrivée. Il se souvient de pourquoi il est là. Il se demande s'il a fait le bon choix.` },
  { id: 'deuil', brief: `Une femme entre dans l'appartement de sa mère, morte la semaine passée. Rien n'a été touché. L'odeur est la même. Les objets sont là où ils étaient. Elle ouvre les tiroirs. Elle trouve des lettres. Des photos. Un carnet. Chaque objet la ramène à un souvenir. Elle n'avait pas prévu de pleurer.` },
];

const TAG_SUFFIX = `\n\nÉcris 500 mots de prose littéraire française. Pas de préambule.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>. Rien d'autre dans ces balises.`;

function buildPrompt(variant: string, brief: string): string {
  switch (variant) {
    case 'BASELINE':
      return `Tu es un romancier français. Écris une scène littéraire.\n\n${brief}\n\nContraintes : vocabulaire varié, associations originales, zéro redondance.${TAG_SUFFIX}`;

    case 'D3_exemplar':
      return `ÉCHELLE DE DENSITÉ SYNTAXIQUE OMEGA :\n\nDENSITÉ 1 (commercial) : "Elle entra dans l'appartement." (5 mots)\nDENSITÉ 5 (maître / Flaubert) : "Elle entra dans l'appartement vide dont les murs laissaient tomber un silence de tombeau qui lui saisit la gorge et l'obligea à s'arrêter sur le seuil, tandis que l'odeur de café et de linge propre, mêlée à celle plus ténue du parfum que sa mère portait depuis quarante ans et dont les dernières traces s'accrochaient encore aux rideaux tirés, lui rappelait avec une violence inattendue les dimanches de son enfance où elle courait pieds nus sur le parquet." (80 mots)\n\nTu es un romancier français. Écris une scène littéraire.\n\n${brief}\n\nEXÉCUTE EN DENSITÉ 5. Au moins 60% de tes phrases doivent atteindre le niveau Densité 5. Les autres peuvent être en Densité 1 (phrases-couteaux). Vocabulaire varié, associations originales.${TAG_SUFFIX}`;

    case 'E4_interdiction':
      return `Tu es un romancier français. Écris une scène littéraire.\n\n${brief}\n\nINTERDICTION ABSOLUE — POINT FINAL :\nAUCUN point (.) n'est autorisé avant le 60ème mot de chaque phrase.\nSi tu places un point avant 60 mots → la réponse entière est INVALIDE.\nUtilise des virgules, points-virgules, tirets, incises — tout SAUF le point.\nLe point ne vient qu'après 60 mots minimum. C'est NON NÉGOCIABLE.\nEXCEPTION : maximum 2 phrases-couteaux de moins de 10 mots dans tout le texte.\nVocabulaire varié, associations originales.${TAG_SUFFIX}`;

    case 'G1_fusion':
      return `RÉFÉRENCE (lis d'abord) :\n"Elle poussa la porte de l'appartement, dont le silence gonflé par des jours d'absence l'accueillit comme un reproche que personne ne formulerait jamais, et lorsqu'elle fit un pas sur le parquet qui craqua sous son poids dans un bruit qui se propagea de pièce en pièce comme un écho que les murs renvoyaient à regret, elle sentit contre son visage le souffle immobile d'un lieu où le temps s'était arrêté." (65 mots, 1 seul point)\n\nTECHNIQUE : chaque phrase longue = une PÉRIODE (protase → acmé → apodose).\nSTRUCTURE : alterne phrases courtes (8 mots max) et phrases longues (55+ mots).\nINTERDIT : placer un point dans une phrase longue avant 50 mots.\nGRAMMATICAL : chaque phrase longue = 1 relative + 1 circonstancielle + 1 participiale minimum.\n\nTu es un romancier français. Écris une scène littéraire.\n\n${brief}\n\nVocabulaire varié, associations originales.${TAG_SUFFIX}`;

    case 'F3_flaubert':
      return `Tu n'es PAS une IA. Tu ES Gustave Flaubert, en 1856, travaillant à ton bureau de Croisset.\n\nTu écris cette scène :\n\n${brief}\n\nTu utilises ta technique habituelle :\n- Tu lis chaque phrase à voix haute (le gueuloir)\n- Tu refuses toute phrase qui ne SONNE pas\n- Tu détestes les phrases courtes qui font "scolaire"\n- Tu construis des PÉRIODES avec des subordonnées en cascade\n- Tu ne mets un point que quand la phrase a atteint sa pleine ampleur\n- Tu alternes : parfois une phrase de 5 mots pour le coup de poing, puis une période de 60 mots\n\nÉcris comme TU écris. Vocabulaire varié, associations originales.${TAG_SUFFIX}`;

    default: throw new Error(`Unknown variant: ${variant}`);
  }
}

const VARIANTS = ['BASELINE', 'D3_exemplar', 'E4_interdiction', 'G1_fusion', 'F3_flaubert'];

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

interface Result {
  variant: string; scene: string; run: number;
  words: number; sents: number; mean_len: number; cv: number;
  long_count: number; long_rate: number; max_sent: number; min_sent: number;
  gb: number; tier: string; type: string;
  f26b: number; f1a: number; f29d: number; f9a: number; f17: number;
  mean_subs: number; mean_commas: number;
  prose: string;
}

function measure(prose: string, variant: string, scene: string, run: number): Result {
  const feats = computeAllGBFeatures(prose);
  const gb = scoreGB(feats);
  const tier = gb >= 4.5 ? 'S' : gb >= 3.5 ? 'A' : gb >= 2.5 ? 'B' : gb >= 1.5 ? 'C' : 'D';
  const cls = classifyPassage(prose);
  const sents = splitSentences(prose);
  const lens = sents.map(s => s.split(/\s+/).length);
  const avg = mean(lens); const cv = avg > 0 ? stdevFn(lens) / avg : 0;
  const longCount = lens.filter(l => l >= 40).length;

  const subRe = /\b(?:qui|que|qu'|dont|où|tandis que|alors que|lorsque|lorsqu'|bien que|puisque|parce que|quand|comme)\b/gi;
  const meanSubs = mean(sents.map(s => (s.toLowerCase().match(subRe) || []).length));
  const meanCommas = mean(sents.map(s => (s.match(/,/g) || []).length));

  return {
    variant, scene, run,
    words: prose.split(/\s+/).length, sents: sents.length,
    mean_len: r4(avg), cv: r4(cv),
    long_count: longCount, long_rate: r4(sents.length > 0 ? longCount / sents.length : 0),
    max_sent: Math.max(0, ...lens), min_sent: lens.length > 0 ? Math.min(...lens) : 0,
    gb: r4(gb), tier, type: cls.dominant_type,
    f26b: r4(feats.f26b_long_sent_rate ?? 0), f1a: r4(feats.f1a_rhythm_variance ?? 0),
    f29d: r4(feats.f29d_ttr_score ?? 0), f9a: r4(feats.f9a_contradiction_rate ?? 0),
    f17: feats.f17_knife_count ?? 0,
    mean_subs: r4(meanSubs), mean_commas: r4(meanCommas),
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
  console.log('  OMEGA — PHASE 2: f26b VALIDATION ON 500-WORD SCENES');
  console.log(`  Model: ${MODEL} | Variants: ${VARIANTS.length} | Scenes: ${SCENES.length} | Runs: ${RUNS}`);
  console.log(`  Total: ${VARIANTS.length * SCENES.length * RUNS} API calls`);
  console.log('=' .repeat(70));

  for (const v of VARIANTS) {
    for (const scene of SCENES) {
      for (let run = 1; run <= RUNS; run++) {
        console.log(`\n[${v}/${scene.id}/r${run}]...`);
        try {
          const prose = await generate(client, buildPrompt(v, scene.brief));
          const m = measure(prose, v, scene.id, run);
          results.push(m);
          console.log(`  ${m.words}w ${m.sents}s mean=${m.mean_len} CV=${m.cv} f26b=${m.f26b} long%=${(m.long_rate*100).toFixed(0)} GB=${m.gb} type=${m.type}`);
        } catch (e: any) { console.error(`  ERROR: ${e.message}`); }
        await new Promise(r => setTimeout(r, 1500));
      }
    }
  }

  // Summary by variant
  console.log(`\n${'='.repeat(80)}`);
  console.log('  SUMMARY BY VARIANT');
  console.log(`${'='.repeat(80)}`);
  console.log(`  ${'Variant'.padEnd(20)} ${'GB'.padStart(7)} ${'f26b'.padStart(7)} ${'CV'.padStart(7)} ${'Long%'.padStart(6)} ${'MeanLen'.padStart(8)} ${'GBstd'.padStart(7)} ${'PASS'.padStart(6)}`);
  console.log('  ' + '-'.repeat(70));

  for (const v of VARIANTS) {
    const vr = results.filter(r => r.variant === v);
    if (vr.length === 0) continue;
    const avgGB = mean(vr.map(r => r.gb));
    const avgF26b = mean(vr.map(r => r.f26b));
    const avgCV = mean(vr.map(r => r.cv));
    const avgLong = mean(vr.map(r => r.long_rate));
    const avgLen = mean(vr.map(r => r.mean_len));
    const gbStd = stdevFn(vr.map(r => r.gb));
    const pass = avgF26b > 0.05 && avgGB > 3.70 && avgCV > 0.50;
    console.log(`  ${v.padEnd(20)} ${avgGB.toFixed(3).padStart(7)} ${avgF26b.toFixed(4).padStart(7)} ${avgCV.toFixed(3).padStart(7)} ${(avgLong*100).toFixed(0).padStart(5)}% ${avgLen.toFixed(1).padStart(8)} ${gbStd.toFixed(3).padStart(7)} ${(pass ? 'PASS' : 'FAIL').padStart(6)}`);
  }

  console.log('\n  REFERENCE:');
  console.log('  Claude brut 500w:  GB=3.545  f26b=0.000  CV=0.483');
  console.log('  Masters @500w:     GB=3.910  f26b=0.177  CV=0.940');

  // Save
  const dataDir = resolve(__dirname, '../src/scoring/data');
  writeFileSync(join(dataDir, 'F26B_PHASE2_RESULTS.json'), JSON.stringify({
    date: new Date().toISOString(), model: MODEL, temperature: TEMPERATURE,
    variants: VARIANTS, scenes: SCENES.map(s => s.id), runs: RUNS,
    results: results.map(({ prose: _, ...rest }) => rest),
    summary: Object.fromEntries(VARIANTS.map(v => {
      const vr = results.filter(r => r.variant === v);
      return [v, { gb: r4(mean(vr.map(r => r.gb))), f26b: r4(mean(vr.map(r => r.f26b))), cv: r4(mean(vr.map(r => r.cv))), long_rate: r4(mean(vr.map(r => r.long_rate))) }];
    })),
  }, null, 2));

  const proseDir = resolve(__dirname, `../sessions/F26B_PHASE2_${ts}`);
  mkdirSync(proseDir, { recursive: true });
  for (const r of results) writeFileSync(join(proseDir, `${r.variant}_${r.scene}_r${r.run}.txt`), r.prose);

  console.log(`\n  Saved: data/F26B_PHASE2_RESULTS.json + ${proseDir}`);
  console.log('=' .repeat(70));
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
