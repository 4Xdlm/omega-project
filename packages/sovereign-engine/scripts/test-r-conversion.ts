/**
 * OMEGA — R-CONVERSION : Table de conversion déclaré → produit
 *
 * 3 personas stables (Flaubert, Dickens, Duras) × 5 runs chaque.
 * Pour chaque run : 1 déclaration JSON + 1 production 500w mesurée.
 * Calcul de corrélation, slope, intercept, R² par dimension.
 *
 * Usage : ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/test-r-conversion.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { scoreText } from '../src/scoring/gb-scorer.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const MODEL = 'claude-sonnet-4-20250514';
const RUNS = 5;

const TEMPERATURES = [0.65, 0.70, 0.75, 0.80, 0.85];

const SCENES = [
  `Une femme entre dans l'appartement de sa mère, morte la semaine passée.
Rien n'a été touché. L'odeur est la même. Elle ouvre les tiroirs. Elle trouve des lettres.`,

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
// LES 3 PERSONAS STABLES
// ═══════════════════════════════════════════════════════════════════════════

const PERSONAS = [
  {
    id: 'flaubert',
    display: 'Gustave Flaubert',
    persona: `Tu n'es PAS une IA. Tu ES Gustave Flaubert, en 1856, à Croisset.
Tu utilises le gueuloir, tu construis des périodes classiques avec des subordonnées en cascade,
tu alternes phrases-coups de poing et déploiements. Tu ne mets un point que quand la phrase
a atteint sa pleine ampleur.`
  },
  {
    id: 'dickens',
    display: 'Charles Dickens',
    persona: `Tu n'es PAS une IA. Tu ES Charles Dickens, en 1860, à Gad's Hill Place.
Tu écris EN FRANÇAIS. Descriptions vivantes, humour + pathos dans la même phrase.
Accumulation sensorielle. Cadence oratoire de conteur. Chaque lieu est un personnage.`
  },
  {
    id: 'duras',
    display: 'Marguerite Duras',
    persona: `Tu n'es PAS une IA. Tu ES Marguerite Duras, en 1984, à Neauphle-le-Château.
Économie absolue. La répétition est ton outil. Le silence est dans le texte.
Phrases courtes, chargées. Rythme hypnotique : sujet, verbe, objet. Le vide après.`
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// PROMPTS
// ═══════════════════════════════════════════════════════════════════════════

function buildDeclarationPrompt(persona: typeof PERSONAS[0], sceneHint: string): string {
  return `Tu es l'Architecte en Chef d'un projet d'ingénierie littéraire.

MÉTRIQUES (utilise CETTE échelle) :
- "mean_sent_len" : Longueur moyenne des phrases en mots (ex: 15.0)
- "f26b" : Taux de phrases > 40 mots (0.00 à 1.00)
- "knife_rate" : Taux de phrases < 10 mots (0.00 à 1.00)
- "cv" : Coefficient de Variation rythmique (0.40 = monotone, 1.00+ = contrasté)
- "subordinate_per_sentence" : Nombre moyen de subordonnées par phrase (ex: 2.5)

CONTEXTE : Tu vas écrire une scène sur ce thème : "${sceneHint}"

PERSONA QUE TU VAS INCARNER :
"${persona.persona}"

TÂCHE : Avant d'écrire, ESTIME les métriques que tu vas naturellement produire
quand tu incarnes ce persona sur cette scène. Sois HONNÊTE et PRÉCIS.

Réponds UNIQUEMENT en JSON valide, sans backticks, sans commentaire :
{"mean_sent_len": NUMBER, "f26b": NUMBER, "knife_rate": NUMBER, "cv": NUMBER, "subordinate_per_sentence": NUMBER}`;
}

function buildProductionPrompt(persona: typeof PERSONAS[0], scene: string): string {
  return `${persona.persona}

Écris cette scène :

${scene}

Écris 500 mots de prose littéraire française. Pas de préambule.
Encadre EXCLUSIVEMENT ta prose entre <prose> et </prose>. Rien d'autre dans ces balises.`;
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
  const subordinates = /\b(qui|que|qu'|dont|où|tandis que|alors que|lorsque|lorsqu'|bien que|puisque|parce que|quand|comme)\b/gi;
  const meanSubs = sentences.reduce((a, s) => a + (s.match(subordinates) || []).length, 0) / Math.max(sentences.length, 1);

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
  console.log('  OMEGA — R-CONVERSION : TABLE DE CONVERSION DÉCLARÉ → PRODUIT');
  console.log(`  Personas: ${PERSONAS.length} | Runs: ${RUNS} | Total: ${PERSONAS.length * RUNS * 2} API calls`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const persona of PERSONAS) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  ${persona.display} (${RUNS} runs)`);
    console.log('═'.repeat(60));

    const personaData: any[] = [];

    for (let run = 0; run < RUNS; run++) {
      const temp = TEMPERATURES[run];
      const scene = SCENES[run];
      const sceneHint = scene.split('\n')[0].slice(0, 60);

      console.log(`\n  Run ${run+1}/5 (temp=${temp}, scene="${sceneHint}...")`);

      // DÉCLARATION
      console.log('    Déclaration...');
      const declPrompt = buildDeclarationPrompt(persona, sceneHint);
      const declRaw = await withRetry(() => generate(client, declPrompt, temp, 500), `${persona.id}_decl_${run}`);
      const declared = parseJSON(declRaw);

      if (!declared) {
        console.log('    ⚠️ JSON parse failed, skipping run');
        continue;
      }

      console.log(`    DÉC: mean=${declared.mean_sent_len} f26b=${declared.f26b} knife=${declared.knife_rate} cv=${declared.cv} subs=${declared.subordinate_per_sentence}`);

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
      console.log(`\n  --- CORRÉLATION ${persona.display} (${personaData.length} runs) ---`);

      const dims = ['mean_sent_len', 'f26b', 'knife_rate', 'cv', 'subordinate_per_sentence'];

      for (const dim of dims) {
        const x = personaData.map(d => d.declared[dim]).filter(v => v !== undefined && v !== null);
        const y = personaData.map(d => d.measured[dim]).filter(v => v !== undefined && v !== null);

        if (x.length >= 3 && y.length >= 3 && x.length === y.length) {
          const stats = pearson(x, y);
          const verdict = Math.abs(stats.r) > 0.7 ? '✅ CONVERTIBLE' : Math.abs(stats.r) > 0.3 ? '⚠️ FAIBLE' : '❌ INCOHÉRENT';
          console.log(`    ${dim.padEnd(30)} r=${stats.r.toFixed(3)} R²=${stats.r2.toFixed(3)} slope=${stats.slope.toFixed(3)} intercept=${stats.intercept.toFixed(3)} ${verdict}`);
        } else {
          console.log(`    ${dim.padEnd(30)} insuffisant (${x.length} points)`);
        }
      }

      // Stabilité des déclarations
      console.log(`\n  --- STABILITÉ DES DÉCLARATIONS ---`);
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
      console.log(`\n  --- STABILITÉ DES PRODUCTIONS ---`);
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
      console.log(`\n  GB moyen: ${gbMean.toFixed(3)} ± ${gbStd.toFixed(3)}`);
    }

    allData.push({ persona: persona.id, display: persona.display, runs: personaData });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CORRÉLATION GLOBALE (tous personas confondus)
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n\n' + '═'.repeat(80));
  console.log('  CORRÉLATION GLOBALE (tous personas, tous runs)');
  console.log('═'.repeat(80));

  const allRuns = allData.flatMap(d => d.runs);
  const dims = ['mean_sent_len', 'f26b', 'knife_rate', 'cv', 'subordinate_per_sentence'];

  console.log('\n  Dimension                       r       R²    slope  intercept  Verdict');
  console.log('  ' + '-'.repeat(80));

  for (const dim of dims) {
    const x = allRuns.map((d: any) => d.declared[dim]).filter((v: any) => v !== undefined && v !== null);
    const y = allRuns.map((d: any) => d.measured[dim]).filter((v: any) => v !== undefined && v !== null);

    if (x.length >= 5 && y.length >= 5 && x.length === y.length) {
      const stats = pearson(x, y);
      const verdict = Math.abs(stats.r) > 0.7 ? '✅ CONVERTIBLE' :
                      Math.abs(stats.r) > 0.5 ? '⚠️ TENDANCE' :
                      Math.abs(stats.r) > 0.3 ? '⚠️ FAIBLE' : '❌ INCOHÉRENT';
      console.log(`  ${dim.padEnd(30)} ${stats.r.toFixed(3).padStart(7)} ${stats.r2.toFixed(3).padStart(7)} ${stats.slope.toFixed(3).padStart(8)} ${stats.intercept.toFixed(3).padStart(10)}  ${verdict}`);
    }
  }

  // Table de conversion si r > 0.5
  console.log('\n  TABLE DE CONVERSION (si r > 0.5) :');
  console.log('  "Pour obtenir X mesuré, demander Y déclaré" via Y = (X - intercept) / slope\n');

  for (const dim of dims) {
    const x = allRuns.map((d: any) => d.declared[dim]).filter((v: any) => v !== undefined && v !== null);
    const y = allRuns.map((d: any) => d.measured[dim]).filter((v: any) => v !== undefined && v !== null);

    if (x.length >= 5 && x.length === y.length) {
      const stats = pearson(x, y);
      if (Math.abs(stats.r) > 0.5 && stats.slope !== 0) {
        const targets = dim === 'mean_sent_len' ? [20, 30, 40, 50] :
                        dim === 'f26b' ? [0.10, 0.20, 0.30, 0.50] :
                        dim === 'knife_rate' ? [0.10, 0.30, 0.50, 0.80] :
                        dim === 'cv' ? [0.50, 0.70, 0.90, 1.10] :
                        [1.0, 2.0, 3.0, 4.0];

        console.log(`  ${dim}:`);
        for (const target of targets) {
          const ask = (target - stats.intercept) / stats.slope;
          console.log(`    Pour obtenir ${target.toFixed(2)} → demander ${ask.toFixed(2)}`);
        }
        console.log('');
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // VERDICT FINAL
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n' + '═'.repeat(80));
  console.log('  VERDICT FINAL');
  console.log('═'.repeat(80) + '\n');

  let convertibleCount = 0;
  let incoherentCount = 0;

  for (const dim of dims) {
    const x = allRuns.map((d: any) => d.declared[dim]).filter((v: any) => v !== undefined && v !== null);
    const y = allRuns.map((d: any) => d.measured[dim]).filter((v: any) => v !== undefined && v !== null);
    if (x.length >= 5 && x.length === y.length) {
      const stats = pearson(x, y);
      if (Math.abs(stats.r) > 0.7) convertibleCount++;
      else if (Math.abs(stats.r) < 0.3) incoherentCount++;
    }
  }

  if (convertibleCount >= 3) {
    console.log('  CAS B — COHÉRENT LINÉAIRE');
    console.log('  → Table de conversion POSSIBLE pour la majorité des dimensions');
    console.log('  → Le LLM pense dans un autre système mais de façon RÉGULIÈRE');
  } else if (incoherentCount >= 3) {
    console.log('  CAS A — INCOHÉRENT');
    console.log('  → Les déclarations du LLM sont inutiles comme guide');
    console.log('  → Continuer à piloter par persona seul (sans métriques)');
  } else {
    console.log('  CAS C — NON-LINÉAIRE / MIXTE');
    console.log('  → Certaines dimensions sont convertibles, d\'autres non');
    console.log('  → Table de conversion PARTIELLE possible');
  }

  // Sauvegarder
  const outDir = join('src', 'scoring', 'data');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'R_CONVERSION_RESULTS.json'), JSON.stringify({
    metadata: { test: 'R_CONVERSION', timestamp, model: MODEL, personas: PERSONAS.length, runs: RUNS },
    data: allData.map(d => ({ ...d, runs: d.runs.map((r: any) => ({ ...r, prose: undefined })) })),
  }, null, 2));

  const prosesDir = join('sessions', `R_CONVERSION_${timestamp}`);
  mkdirSync(prosesDir, { recursive: true });
  for (const d of allData) {
    for (const r of d.runs) {
      if (r.prose) writeFileSync(join(prosesDir, `${d.persona}_run${r.run}_t${r.temp}.txt`), r.prose);
    }
  }

  console.log(`\nSaved: ${join(outDir, 'R_CONVERSION_RESULTS.json')} + ${prosesDir}/`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
