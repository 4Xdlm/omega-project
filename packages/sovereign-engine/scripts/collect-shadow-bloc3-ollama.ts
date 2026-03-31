/**
 * OMEGA — BLOC 3 SHADOW COLLECT via Ollama (0€ API)
 * 8 runs contemplation — cliff_quality + branching_signal
 * Prose via Ollama qwen3.5:35b-a3b, scoring CALC pur (0 LLM judge)
 * SHADOW MODE (D1)
 */

import { execSync } from 'node:child_process';
import { computeLanguageProfile } from '../src/scoring/language-profiles.js';
import { computeDualScale, resetArcBuffer } from '../src/scoring/dual-scale.js';
import { computeTextFeatures } from '../src/scoring/text-features.js';
import { computeCIL37 } from '../src/scoring/ci-l37.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ═══ OLLAMA DIRECT CALL ═══

function callOllama(systemPrompt: string, userPrompt: string): string {
  const model = 'qwen3.5:35b-a3b';
  const url = 'http://localhost:11434';

  const requestBody = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    stream: false,
    think: false,
    options: { temperature: 0.8, num_predict: 8192, top_p: 0.92 },
  });

  const script = `
    const http = require('http');
    let stdinBuf = '';
    process.stdin.on('data', (chunk) => stdinBuf += chunk);
    process.stdin.on('end', () => {
      const { body, url } = JSON.parse(stdinBuf);
      const parsed = new URL(url + '/api/chat');
      const req = http.request({
        hostname: parsed.hostname, port: parsed.port, path: parsed.pathname,
        method: 'POST', headers: { 'Content-Type': 'application/json' },
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode !== 200) { process.stderr.write('Ollama error ' + res.statusCode + ': ' + data); process.exit(1); }
          const parsed = JSON.parse(data);
          process.stdout.write(parsed.message.content || '');
        });
      });
      req.on('error', (e) => { process.stderr.write(e.message); process.exit(1); });
      req.write(body);
      req.end();
    });
  `.replace(/\n/g, ' ');

  const stdinPayload = JSON.stringify({ body: requestBody, url });
  const result = execSync(
    `node -e "${script.replace(/"/g, '\\"')}"`,
    { encoding: 'utf8', timeout: 300000, maxBuffer: 20 * 1024 * 1024, input: stdinPayload },
  );

  return result.trim().replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

// ═══ HELPERS ═══

function computeCliff(prose: string): number {
  const words = prose.split(/\s+/);
  const cliffText = words.slice(-100).join(' ');
  const sents = cliffText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  if (sents.length === 0) return 0;
  const lastSent = sents[sents.length - 1].trim();
  const endsEllipsis = lastSent.endsWith('...') || lastSent.endsWith('\u2026');
  const lastChar = lastSent[lastSent.length - 1] || '';
  const endsIncomplete = !['.', '!', '?', '\u2026'].includes(lastChar);
  const meanLen = sents.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sents.length;
  const tension = Math.min(1.0, 20.0 / Math.max(meanLen, 1));
  return Math.round((tension * 0.5 + (endsEllipsis ? 0.3 : 0) + (endsIncomplete ? 0.2 : 0)) * 10000) / 10000;
}

function pearsonR(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return 0;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx, dy = y[i] - my;
    num += dx * dy; dx2 += dx * dx; dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : Math.round((num / denom) * 1000) / 1000;
}

// ═══ SCENE PROMPT ═══

const SYSTEM_PROMPT = `Tu es OMEGA SCRIBE, le moteur de prose littéraire française le plus avancé.

RÈGLES ABSOLUES :
1. MONTRER PAR LE CORPS, jamais par l'esprit — pas de "elle se sentait triste"
2. RYTHME : alterner phrases courtes (< 8 mots) et longues (> 35 mots)
3. Minimum 5 sens différents par scène (vue, ouïe, toucher, odorat, goût)
4. ZÉRO cliché — chaque métaphore doit être originale
5. Prose soutenue, registre littéraire français contemporain
6. Paragraphes séparés par une ligne vide
7. NE PAS conclure la scène — laisser la brique ouverte (pas de fin)`;

function buildScenePrompt(runIdx: number): string {
  return `Écris une scène littéraire en français (~2500 mots, 4 paragraphes minimum).

SCÈNE : CONTEMPLATION
Une femme seule au bord de la mer, en fin d'après-midi d'automne.
Elle prépare du thé dans sa cuisine aux carreaux disjoints.
Elle regarde la mer par la baie vitrée.
Un souvenir surgit — une odeur, une voix, un geste oublié.
La nuit tombe progressivement.

ÉMOTION : Arc de la solitude — anticipation → tristesse → tristesse → acceptation résignée.
POV : Troisième personne, focalisation interne.
TEMPO : Lent, contemplatif, chaque sensation est un événement.

CONTRAINTES STYLISTIQUES :
- Signature sensorielle : silence, ombre, vent, sel
- Motifs récurrents : la mer, le vent
- Mots interdits : soudain, soudainement, effectivement
- Métaphores bannies : "cœur de pierre"
- Patterns IA bannis : "il ne pouvait s'empêcher"

NE PAS conclure. La scène est une BRIQUE qui doit rester ouverte.
Seed: contemplation_ollama_${runIdx}_${Date.now()}`;
}

// ═══ MAIN ═══

async function main() {
  console.log('=== OMEGA BLOC 3 — SHADOW COLLECT via Ollama (8 runs) ===');
  console.log('Model: qwen3.5:35b-a3b | Scoring: CALC pur (0 LLM judge)\n');

  const sessionDir = path.join('sessions', 'SHADOW_BLOC3_COLLECT');
  fs.mkdirSync(sessionDir, { recursive: true });

  resetArcBuffer();
  const RUNS = 8;
  const allData: any[] = [];

  for (let run = 0; run < RUNS; run++) {
    console.log(`  [contemplation] run ${run + 1}/${RUNS}...`);
    const startMs = Date.now();

    try {
      const prose = callOllama(SYSTEM_PROMPT, buildScenePrompt(run));
      const durationMs = Date.now() - startMs;
      const wordCount = prose.split(/\s+/).filter(w => w.length > 0).length;
      const tokensPerSec = durationMs > 0 ? Math.round((wordCount * 1.3) / (durationMs / 1000)) : 0;
      console.log(`    Generated: ${wordCount} words in ${(durationMs / 1000).toFixed(1)}s (~${tokensPerSec} t/s)`);

      if (wordCount < 100) {
        console.warn(`    WARNING: only ${wordCount} words — possible think:false issue`);
        allData.push({ scene: 'contemplation', run, error: `Too few words: ${wordCount}` });
        continue;
      }

      // ── CALC scoring (deterministic, 0 LLM) ──
      const cliff = computeCliff(prose);
      const CLIFF_QUALITY_TARGET = 0.50;
      const cliffQuality = cliff >= CLIFF_QUALITY_TARGET;

      const profileFr = computeLanguageProfile(prose, 'fr');
      const profileEnMax = computeLanguageProfile(prose, 'en', 'max');
      const branchingSignal = Math.round((profileEnMax.profile_score - profileFr.profile_score) * 100) / 100;
      const branchingFlag = branchingSignal > 10 ? 'BRANCH_CANDIDATE' : (branchingSignal < 5 ? 'FR_STABLE' : 'NEUTRAL');

      const feats = computeTextFeatures(prose) as Record<string, number>;
      const ciL37 = computeCIL37(prose);

      // Compute a CALC-only composite proxy from text-features
      // This is NOT the full V3 score but gives a comparable signal
      const rhythmScore = feats.f1a_rhythm_variance ?? 0;
      const hookScore = feats.f35c_hook_score ?? 0;
      const ttrScore = feats.f29d_ttr_score ?? 0;
      const cliffFeature = feats.f36c_cliff_score ?? 0;

      const dualProxy = computeDualScale(85); // baseline placeholder

      const entry = {
        scene: 'contemplation', run, word_count: wordCount,
        duration_s: Math.round(durationMs / 1000),
        model: 'qwen3.5:35b-a3b',
        // Cliff
        cliff_score: cliff, cliff_quality: cliffQuality,
        // Branching
        profile_fr: profileFr.profile_score,
        profile_en_max: profileEnMax.profile_score,
        branching_signal: branchingSignal, branching_flag: branchingFlag,
        // CI_L37
        ci_l37_corpus: ciL37.ci_l37_corpus, ci_l37_omega: ciL37.ci_l37_omega,
        sub_per_sentence: ciL37.sub_per_sentence, f26b_long_sent_rate: ciL37.f26b_long_sent_rate,
        // Text features (CALC)
        f1a_rhythm_variance: rhythmScore,
        f17_knife_count: feats.f17_knife_count ?? 0,
        f29d_ttr_score: ttrScore,
        f35c_hook_score: hookScore,
        f36c_cliff_score: cliffFeature,
        f24c_contrast_delta: feats.f24c_contrast_delta ?? 0,
      };
      allData.push(entry);

      console.log(`    cliff=${cliff.toFixed(3)} quality=${cliffQuality} branching=${branchingSignal.toFixed(1)} (${branchingFlag}) CI_c=${ciL37.ci_l37_corpus.toFixed(1)}`);

    } catch (e: any) {
      console.error(`    ERROR: ${e.message?.slice(0, 150)}`);
      allData.push({ scene: 'contemplation', run, error: e.message?.slice(0, 200) });
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  // Save raw data
  const dataPath = path.join(sessionDir, 'shadow_data_bloc3.json');
  fs.writeFileSync(dataPath, JSON.stringify(allData, null, 2));
  console.log(`\nSaved: ${dataPath}`);

  // ═══ ANALYSIS ═══
  const ok = allData.filter(d => !d.error);
  const n = ok.length;

  console.log(`\n${'='.repeat(65)}`);
  console.log('OMEGA BLOC 3 — RAPPORT SHADOW (D1) — Ollama');
  console.log('='.repeat(65));
  console.log(`\nRUNS : ${n}/${RUNS} | Model: qwen3.5:35b-a3b | Cost: 0€\n`);

  if (n === 0) {
    console.log('NO VALID RUNS — check Ollama connection');
    return;
  }

  // Cliff analysis
  const cliffs = ok.map((d: any) => d.cliff_score);
  const cliffQ = ok.filter((d: any) => d.cliff_quality).length;
  console.log(`CLIFF QUALITY (D-B3-4) :`);
  console.log(`  cliff_score moyen: ${(cliffs.reduce((a: number, b: number) => a + b, 0) / n).toFixed(3)}`);
  console.log(`  cliff_quality=true (>=0.50): ${cliffQ}/${n} (${Math.round(cliffQ / n * 100)}%)`);
  console.log(`  cliff_score min: ${Math.min(...cliffs).toFixed(3)}`);
  console.log(`  cliff_score max: ${Math.max(...cliffs).toFixed(3)}`);

  // Branching analysis
  const brSignals = ok.map((d: any) => d.branching_signal);
  const brMean = brSignals.reduce((a: number, b: number) => a + b, 0) / n;
  const brCandidates = ok.filter((d: any) => d.branching_flag === 'BRANCH_CANDIDATE').length;
  const frStable = ok.filter((d: any) => d.branching_flag === 'FR_STABLE').length;
  console.log(`\nBRANCHING SIGNAL (D-B3-2) :`);
  console.log(`  branching_signal moyen: ${brMean.toFixed(1)}`);
  console.log(`  BRANCH_CANDIDATE (>10): ${brCandidates}/${n}`);
  console.log(`  FR_STABLE (<5): ${frStable}/${n}`);
  console.log(`  NEUTRAL (5-10): ${n - brCandidates - frStable}/${n}`);

  // CI_L37
  const ciCorpus = ok.map((d: any) => d.ci_l37_corpus);
  const ciMean = ciCorpus.reduce((a: number, b: number) => a + b, 0) / n;
  console.log(`\nCI_L37 :`);
  console.log(`  ci_l37_corpus moyen: ${ciMean.toFixed(1)}`);

  // Word count / timing
  const words = ok.map((d: any) => d.word_count);
  const durations = ok.map((d: any) => d.duration_s);
  console.log(`\nGENERATION :`);
  console.log(`  word_count moyen: ${Math.round(words.reduce((a: number, b: number) => a + b, 0) / n)}`);
  console.log(`  duration moyenne: ${Math.round(durations.reduce((a: number, b: number) => a + b, 0) / n)}s`);

  // Cross-correlation (if enough data)
  if (n >= 3) {
    const rCliffBranch = pearsonR(cliffs, brSignals);
    console.log(`\nCORRELATIONS :`);
    console.log(`  r(cliff, branching): ${rCliffBranch}`);
  }

  console.log(`\n${'='.repeat(65)}`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
