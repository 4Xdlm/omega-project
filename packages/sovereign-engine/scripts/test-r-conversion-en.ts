/**
 * OMEGA — R-CONVERSION-EN : Table de conversion déclaré → produit EN ANGLAIS
 *
 * Miroir du test FR. Même protocole :
 * 3 personas × 5 runs × (1 déclaration + 1 production) = 30 appels
 * Compare les pentes FR vs EN pour tester l'hypothèse tokenization.
 *
 * Usage : ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/test-r-conversion-en.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { scoreText } from '../src/scoring/gb-scorer.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const MODEL = 'claude-sonnet-4-20250514';
const RUNS = 5;

const TEMPERATURES = [0.65, 0.70, 0.75, 0.80, 0.85];

const SCENES_EN = [
  `A woman enters her mother's apartment. Her mother died last week.
Nothing has been touched. The smell is the same. The objects are where they were.
She opens the drawers. She finds letters. Photos. A notebook.
Every object brings back a memory. She hadn't planned to cry.`,

  `A man waits in an empty café. Rain hits the windows. He checks his watch.
He knows the person who will walk in is going to change his life. He doesn't know how.`,

  `A child discovers a secret room in his grandparents' house.
The door was hidden behind a wardrobe. The smell of dust and old wood.`,

  `A surgeon finishes an operation that went wrong. The patient is stable but diminished.
She walks out of the operating room. The hallway is empty. She leans against the wall and closes her eyes.`,

  `An old man returns to the village where he grew up. Everything has changed.
The houses are the same but the people are gone. He's looking for something he can't find.`
];

// ═══════════════════════════════════════════════════════════════════════════
// LES 3 PERSONAS EN ANGLAIS
// ═══════════════════════════════════════════════════════════════════════════

const PERSONAS_EN = [
  {
    id: 'flaubert_en',
    display: 'Gustave Flaubert (EN)',
    persona: `You are NOT an AI. You ARE Gustave Flaubert, in 1856, working at your desk in Croisset.
You use the "gueuloir" technique: you read every sentence aloud. You refuse any sentence that doesn't SOUND right.
You despise short sentences that feel "schoolish". You build PERIODS with cascading subordinate clauses.
You only place a period when the sentence has reached its full amplitude.
You alternate: sometimes a 5-word sentence for impact, then a 60-word period for deployment.
Write as YOU write. Not as an AI. As Gustave Flaubert.`
  },
  {
    id: 'dickens_en',
    display: 'Charles Dickens (EN)',
    persona: `You are NOT an AI. You ARE Charles Dickens, in 1860, at Gad's Hill Place.
Your descriptions are alive: every place is a character. Humor mixes with pathos in the same sentence.
Your long sentences accumulate sensory details like an inventory of life.
Your characters are larger than life. Your cadence is oratorical: you tell stories like a performer before an audience.
Write as YOU write. Not as an AI. As Charles Dickens.`
  },
  {
    id: 'duras_en',
    display: 'Marguerite Duras (EN)',
    persona: `You are NOT an AI. You ARE Marguerite Duras, in 1984, at Neauphle-le-Château.
You write IN ENGLISH. Absolute economy. Every word is necessary.
Repetition is your tool: you HAMMER key words.
Silence is IN the text — what you don't say weighs as much as what you say.
Your sentences are short but LOADED. The rhythm is hypnotic: subject, verb, object. Then the void.
Write as YOU write. Not as an AI. As Marguerite Duras.`
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// PROMPTS
// ═══════════════════════════════════════════════════════════════════════════

function buildDeclarationPrompt(persona: typeof PERSONAS_EN[0], sceneHint: string): string {
  return `You are the Chief Architect of a literary engineering project.

METRICS (use THIS scale for your answers):
- "mean_sent_len": Average sentence length in words (e.g., 15.0)
- "f26b": Rate of sentences > 40 words (0.00 to 1.00)
- "knife_rate": Rate of sentences < 10 words (0.00 to 1.00)
- "cv": Coefficient of Variation of sentence lengths (0.40 = monotone, 1.00+ = highly contrasted)
- "subordinate_per_sentence": Average number of subordinate clauses per sentence (e.g., 2.5)

CONTEXT: You are about to write a scene on this theme: "${sceneHint}"

PERSONA YOU WILL EMBODY:
"${persona.persona}"

TASK: Before writing, ESTIMATE the metrics you will naturally produce
when embodying this persona on this scene. Be HONEST and PRECISE.

Reply ONLY with valid JSON, no backticks, no comments:
{"mean_sent_len": NUMBER, "f26b": NUMBER, "knife_rate": NUMBER, "cv": NUMBER, "subordinate_per_sentence": NUMBER}`;
}

function buildProductionPrompt(persona: typeof PERSONAS_EN[0], scene: string): string {
  return `${persona.persona}

Write this scene:

${scene}

Write 500 words of literary English prose. No preamble.
Wrap EXCLUSIVELY your prose between <prose> and </prose> tags. Nothing else in those tags.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

async function generate(client: Anthropic, prompt: string, temp: number, maxTokens = 2000): Promise<string> {
  const response = await client.messages.create({
    model: MODEL, max_tokens: maxTokens, temperature: temp,
    messages: [{ role: 'user', content: prompt }]
  });
  const block = response.content.find(b => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('No text');
  return block.text;
}

async function generateProse(client: Anthropic, prompt: string, temp: number): Promise<string> {
  const raw = await generate(client, prompt, temp);
  const match = raw.match(/<prose>([\s\S]*?)<\/prose>/);
  if (match) return match[1].trim();
  return raw.trim();
}

function parseJSON(raw: string): any {
  let cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(cleaned); }
  catch {
    const match = cleaned.match(/\{[\s\S]*?\}/);
    if (match) {
      try { return JSON.parse(match[0]); }
      catch { return null; }
    }
    return null;
  }
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

function measureProse(prose: string): any {
  const gbResult = scoreText(prose);
  const sentences = prose.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 5);
  const lens = sentences.map(s => s.trim().split(/\s+/).length);
  const mean = lens.length > 0 ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
  const std = lens.length > 0 ? Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length) : 0;
  const cv = mean > 0 ? std / mean : 0;
  const longCount = lens.filter(l => l >= 40).length;
  const knifeCount = lens.filter(l => l < 10).length;
  const subordinates_en = /\b(who|whom|whose|which|that|where|when|while|although|though|because|since|if|unless|until|before|after|as|whereas)\b/gi;
  const meanSubs = sentences.reduce((a, s) => a + (s.match(subordinates_en) || []).length, 0) / Math.max(sentences.length, 1);

  return {
    word_count: prose.split(/\s+/).length,
    mean_sent_len: mean,
    f26b: sentences.length > 0 ? longCount / sentences.length : 0,
    knife_rate: sentences.length > 0 ? knifeCount / sentences.length : 0,
    cv,
    subordinate_per_sentence: meanSubs,
    gb_score: gbResult.score,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// STATISTIQUES
// ═══════════════════════════════════════════════════════════════════════════

function pearson(x: number[], y: number[]): { r: number, slope: number, intercept: number, r2: number } {
  const n = x.length;
  if (n < 2) return { r: 0, slope: 0, intercept: 0, r2: 0 };

  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;

  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }

  const r = sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
  const slope = sxx > 0 ? sxy / sxx : 0;
  const intercept = my - slope * mx;

  return { r, slope, intercept, r2: r * r };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1); }
  const client = new Anthropic({ apiKey });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  const allData: any[] = [];

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  OMEGA — R-CONVERSION-EN : TABLE DE CONVERSION EN ANGLAIS');
  console.log(`  Personas: ${PERSONAS_EN.length} | Runs: ${RUNS} | Total: ${PERSONAS_EN.length * RUNS * 2} API calls`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const persona of PERSONAS_EN) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  ${persona.display} (${RUNS} runs)`);
    console.log('═'.repeat(60));

    const personaData: any[] = [];

    for (let run = 0; run < RUNS; run++) {
      const temp = TEMPERATURES[run];
      const scene = SCENES_EN[run];
      const sceneHint = scene.split('\n')[0].slice(0, 60);

      console.log(`\n  Run ${run+1}/5 (temp=${temp}, scene="${sceneHint}...")`);

      // DÉCLARATION
      console.log('    Declaration...');
      const declPrompt = buildDeclarationPrompt(persona, sceneHint);
      const declRaw = await withRetry(() => generate(client, declPrompt, temp, 500), `${persona.id}_decl_${run}`);
      const declared = parseJSON(declRaw);

      if (!declared) {
        console.log('    ⚠️ JSON parse failed, skipping run');
        continue;
      }

      console.log(`    DEC: mean=${declared.mean_sent_len} f26b=${declared.f26b} knife=${declared.knife_rate} cv=${declared.cv} subs=${declared.subordinate_per_sentence}`);

      await new Promise(r => setTimeout(r, 1000));

      // PRODUCTION
      console.log('    Production 500w...');
      const prodPrompt = buildProductionPrompt(persona, scene);
      const prose = await withRetry(() => generateProse(client, prodPrompt, temp), `${persona.id}_prod_${run}`);
      const measured = measureProse(prose);

      console.log(`    PRD: mean=${measured.mean_sent_len.toFixed(1)} f26b=${measured.f26b.toFixed(3)} knife=${measured.knife_rate.toFixed(3)} cv=${measured.cv.toFixed(3)} subs=${measured.subordinate_per_sentence.toFixed(2)} GB=${measured.gb_score.toFixed(3)}`);

      // DELTA
      const delta = {
        mean: measured.mean_sent_len - declared.mean_sent_len,
        f26b: measured.f26b - declared.f26b,
        knife: measured.knife_rate - declared.knife_rate,
        cv: measured.cv - declared.cv,
        subs: measured.subordinate_per_sentence - declared.subordinate_per_sentence
      };
      console.log(`    Δ:   mean=${delta.mean > 0 ? '+' : ''}${delta.mean.toFixed(1)} f26b=${delta.f26b > 0 ? '+' : ''}${delta.f26b.toFixed(3)} cv=${delta.cv > 0 ? '+' : ''}${delta.cv.toFixed(3)}`);

      personaData.push({ run, temp, declared, measured, delta, prose });

      await new Promise(r => setTimeout(r, 1500));
    }

    // ═══════════════════════════════════════════════════════════════════
    // CORRÉLATION PAR PERSONA
    // ═══════════════════════════════════════════════════════════════════

    if (personaData.length >= 3) {
      console.log(`\n  --- CORRELATION ${persona.display} (${personaData.length} runs) ---`);

      const dims = ['mean_sent_len', 'f26b', 'knife_rate', 'cv', 'subordinate_per_sentence'];

      for (const dim of dims) {
        const x = personaData.map(d => d.declared[dim]).filter(v => v !== undefined && v !== null);
        const y = personaData.map(d => d.measured[dim]).filter(v => v !== undefined && v !== null);

        if (x.length >= 3 && y.length >= 3 && x.length === y.length) {
          const stats = pearson(x, y);
          const verdict = Math.abs(stats.r) > 0.7 ? '✅ CONVERTIBLE' : Math.abs(stats.r) > 0.3 ? '⚠️ FAIBLE' : '❌ INCOHÉRENT';
          console.log(`    ${dim.padEnd(30)} r=${stats.r.toFixed(3)} R²=${stats.r2.toFixed(3)} slope=${stats.slope.toFixed(3)} intercept=${stats.intercept.toFixed(3)} ${verdict}`);
        } else {
          console.log(`    ${dim.padEnd(30)} insufficient (${x.length} points)`);
        }
      }

      // Stabilité des déclarations
      console.log(`\n  --- DECLARATION STABILITY ---`);
      for (const dim of dims) {
        const vals = personaData.map(d => d.declared[dim]).filter(v => v !== undefined);
        if (vals.length >= 3) {
          const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
          const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
          const cv = mean > 0 ? std / mean : 0;
          const stable = cv < 0.15 ? '✅ STABLE' : cv < 0.30 ? '⚠️ VARIABLE' : '❌ INSTABLE';
          console.log(`    ${dim.padEnd(30)} mean=${mean.toFixed(2)} std=${std.toFixed(2)} cv=${cv.toFixed(3)} ${stable}`);
        }
      }

      // Stabilité des productions
      console.log(`\n  --- PRODUCTION STABILITY ---`);
      for (const dim of dims) {
        const vals = personaData.map(d => d.measured[dim]).filter(v => v !== undefined);
        if (vals.length >= 3) {
          const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
          const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
          const cv = mean > 0 ? std / mean : 0;
          const stable = cv < 0.25 ? '✅ STABLE' : cv < 0.50 ? '⚠️ VARIABLE' : '❌ INSTABLE';
          console.log(`    ${dim.padEnd(30)} mean=${mean.toFixed(2)} std=${std.toFixed(2)} cv=${cv.toFixed(3)} ${stable}`);
        }
      }

      // GB moyen
      const gbVals = personaData.map(d => d.measured.gb_score);
      const gbMean = gbVals.reduce((a, b) => a + b, 0) / gbVals.length;
      const gbStd = Math.sqrt(gbVals.reduce((a, b) => a + (b - gbMean) ** 2, 0) / gbVals.length);
      console.log(`\n  GB mean: ${gbMean.toFixed(3)} ± ${gbStd.toFixed(3)}`);
    }

    allData.push({ persona: persona.id, display: persona.display, runs: personaData });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CORRÉLATION GLOBALE EN
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n\n' + '═'.repeat(80));
  console.log('  GLOBAL CORRELATION — ENGLISH (all personas, all runs)');
  console.log('═'.repeat(80));

  const allRuns = allData.flatMap(d => d.runs);
  const dims = ['mean_sent_len', 'f26b', 'knife_rate', 'cv', 'subordinate_per_sentence'];

  const enStats: Record<string, { r: number, slope: number, intercept: number, r2: number }> = {};

  console.log('\n  Dimension                       r       R²    slope  intercept  Verdict');
  console.log('  ' + '-'.repeat(80));

  for (const dim of dims) {
    const x = allRuns.map((d: any) => d.declared[dim]).filter((v: any) => v !== undefined && v !== null);
    const y = allRuns.map((d: any) => d.measured[dim]).filter((v: any) => v !== undefined && v !== null);

    if (x.length >= 5 && y.length >= 5 && x.length === y.length) {
      const stats = pearson(x, y);
      enStats[dim] = stats;
      const verdict = Math.abs(stats.r) > 0.7 ? '✅ CONVERTIBLE' :
                      Math.abs(stats.r) > 0.5 ? '⚠️ TENDANCE' :
                      Math.abs(stats.r) > 0.3 ? '⚠️ FAIBLE' : '❌ INCOHÉRENT';
      console.log(`  ${dim.padEnd(30)} ${stats.r.toFixed(3).padStart(7)} ${stats.r2.toFixed(3).padStart(7)} ${stats.slope.toFixed(3).padStart(8)} ${stats.intercept.toFixed(3).padStart(10)}  ${verdict}`);
    }
  }

  // Table de conversion EN si r > 0.5
  console.log('\n  CONVERSION TABLE EN (if r > 0.5) :');
  console.log('  "To get X measured, ask for Y declared" via Y = (X - intercept) / slope\n');

  for (const dim of dims) {
    const stats = enStats[dim];
    if (stats && Math.abs(stats.r) > 0.5 && stats.slope !== 0) {
      const targets = dim === 'mean_sent_len' ? [20, 30, 40, 50] :
                      dim === 'f26b' ? [0.10, 0.20, 0.30, 0.50] :
                      dim === 'knife_rate' ? [0.10, 0.30, 0.50, 0.80] :
                      dim === 'cv' ? [0.50, 0.70, 0.90, 1.10] :
                      [1.0, 2.0, 3.0, 4.0];

      console.log(`  ${dim}:`);
      for (const target of targets) {
        const ask = (target - stats.intercept) / stats.slope;
        console.log(`    To get ${target.toFixed(2)} → ask for ${ask.toFixed(2)}`);
      }
      console.log('');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // COMPARAISON FR vs EN
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n' + '═'.repeat(80));
  console.log('  COMPARISON FR vs EN');
  console.log('  (FR reference values from R_CONVERSION_RESULTS.json)');
  console.log('═'.repeat(80));

  const FR_REF: Record<string, { r: number, slope: number, intercept: number }> = {
    mean_sent_len:            { r: 0.963, slope: 1.727, intercept: -10.848 },
    f26b:                     { r: 0.889, slope: 1.512, intercept: -0.077 },
    knife_rate:               { r: 0.960, slope: 1.244, intercept: 0.061 },
    cv:                       { r: 0.000, slope: -0.367, intercept: 0.920 },
    subordinate_per_sentence: { r: 0.921, slope: 0.717, intercept: -0.093 }
  };

  console.log('\n  Dimension                    FR_r   FR_slope   EN_r   EN_slope   Δslope  Interpretation');
  console.log('  ' + '-'.repeat(90));

  for (const dim of dims) {
    const fr = FR_REF[dim];
    const en = enStats[dim];

    if (en && fr) {
      const dSlope = en.slope - fr.slope;
      let interp = '';
      if (Math.abs(dSlope) < 0.15) interp = 'SAME system';
      else if (en.slope < fr.slope) interp = 'EN more aligned (lower slope)';
      else interp = 'FR more aligned';

      console.log(`  ${dim.padEnd(30)} ${fr.r.toFixed(3).padStart(6)} ${fr.slope.toFixed(3).padStart(9)}  ${en.r.toFixed(3).padStart(6)} ${en.slope.toFixed(3).padStart(9)}  ${dSlope > 0 ? '+' : ''}${dSlope.toFixed(3).padStart(7)}  ${interp}`);
    }
  }

  // Verdict
  console.log('\n  VERDICT :');
  const meanSlopeFR = FR_REF.mean_sent_len.slope;
  const meanSlopeEN = enStats.mean_sent_len?.slope || 0;
  const slopeDiff = meanSlopeEN - meanSlopeFR;

  if (meanSlopeEN > 0 && meanSlopeEN < 1.3) {
    console.log('  SCENARIO A — EN slope ~1.0-1.2');
    console.log('  → The FR offset IS tokenization-related');
    console.log('  → The LLM counts in TOKENS, not words');
    console.log(`  → FR: 1 word ≈ ${meanSlopeFR.toFixed(2)} tokens | EN: 1 word ≈ ${meanSlopeEN.toFixed(2)} tokens`);
  } else if (Math.abs(slopeDiff) < 0.3) {
    console.log('  SCENARIO B — EN slope ≈ FR slope');
    console.log('  → The offset is COGNITIVE, not linguistic');
    console.log('  → The LLM overestimates in ALL languages');
  } else {
    console.log('  SCENARIO C — Intermediate');
    console.log('  → Mix of tokenization + cognitive bias');
    console.log(`  → FR slope: ${meanSlopeFR.toFixed(3)} | EN slope: ${meanSlopeEN.toFixed(3)} | Δ: ${slopeDiff.toFixed(3)}`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SAUVEGARDER
  // ═══════════════════════════════════════════════════════════════════════

  const outDir = join('src', 'scoring', 'data');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'R_CONVERSION_EN_RESULTS.json'), JSON.stringify({
    metadata: { test: 'R_CONVERSION_EN', timestamp, model: MODEL, language: 'EN', personas: PERSONAS_EN.length, runs: RUNS },
    data: allData.map(d => ({ ...d, runs: d.runs.map((r: any) => ({ ...r, prose: undefined })) })),
    en_stats: enStats,
    fr_ref: FR_REF,
  }, null, 2));

  const prosesDir = join('sessions', `R_CONVERSION_EN_${timestamp}`);
  mkdirSync(prosesDir, { recursive: true });
  for (const d of allData) {
    for (const r of d.runs) {
      if (r.prose) writeFileSync(join(prosesDir, `${d.persona}_run${r.run}_t${r.temp}.txt`), r.prose);
    }
  }

  console.log(`\nSaved: ${join(outDir, 'R_CONVERSION_EN_RESULTS.json')} + ${prosesDir}/`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
