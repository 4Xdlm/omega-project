/**
 * OMEGA — BLOC 5 : Claude vs Ollama bench (32 runs)
 * 4 scènes × 8 runs via Ollama qwen3.5:35b-a3b
 * Données Claude chargées depuis SHADOW_BLOC2_COLLECT/shadow_data.json
 * Scoring CALC pur (0 LLM judge) — comparaison métriques déterministes
 */

import { execSync } from 'node:child_process';
import { computeLanguageProfile } from '../src/scoring/language-profiles.js';
import { computeDualScale, resetArcBuffer } from '../src/scoring/dual-scale.js';
import { computeTextFeatures } from '../src/scoring/text-features.js';
import { computeCIL37 } from '../src/scoring/ci-l37.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ═══ OLLAMA CALL ═══

function callOllama(systemPrompt: string, userPrompt: string): string {
  const model = 'qwen3.5:35b-a3b';
  const url = 'http://localhost:11434';
  const requestBody = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    stream: false, think: false,
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

function mean(arr: number[]): number { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

// ═══ SCENE PROMPTS ═══

const SYSTEM_PROMPT = `Tu es OMEGA SCRIBE, le moteur de prose littéraire française le plus avancé.

RÈGLES ABSOLUES :
1. MONTRER PAR LE CORPS, jamais par l'esprit — pas de "elle se sentait triste"
2. RYTHME : alterner phrases courtes (< 8 mots) et longues (> 35 mots)
3. Minimum 5 sens différents par scène (vue, ouïe, toucher, odorat, goût)
4. ZÉRO cliché — chaque métaphore doit être originale
5. Prose soutenue, registre littéraire français contemporain
6. Paragraphes séparés par une ligne vide
7. NE PAS conclure la scène — laisser la brique ouverte (pas de fin)`;

interface SceneSpec {
  id: string;
  prompt: string;
}

const SCENES: SceneSpec[] = [
  {
    id: 'contemplation',
    prompt: `Écris une scène littéraire en français (~2500 mots, 4 paragraphes minimum).
SCÈNE : CONTEMPLATION — Femme seule au bord de la mer, fin d'après-midi d'automne.
Elle prépare du thé dans sa cuisine aux carreaux disjoints. Regarde la mer par la baie vitrée.
Un souvenir surgit — odeur, voix, geste oublié. La nuit tombe.
ÉMOTION : Arc solitude — anticipation → tristesse → acceptation résignée.
POV : 3e personne, focalisation interne. TEMPO : lent, contemplatif.
Signature sensorielle : silence, ombre, vent, sel. Motifs : mer, vent.
NE PAS conclure. Brique ouverte.`,
  },
  {
    id: 'menace',
    prompt: `Écris une scène littéraire en français (~2500 mots, 4 paragraphes minimum).
SCÈNE : MENACE — Femme en forêt au crépuscule, danger croissant.
Elle marche sur un sentier familier qui devient étranger. Les oiseaux se taisent.
Une branche casse derrière elle. Elle accélère vers la lisière.
ÉMOTION : Arc peur — anticipation → peur → fuite → peur résiduelle.
POV : 3e personne, focalisation interne. TEMPO : accélération progressive.
Signature sensorielle : ombre, branche, souffle, nuit. Motifs : forêt, crépuscule.
NE PAS conclure. Brique ouverte.`,
  },
  {
    id: 'revelation',
    prompt: `Écris une scène littéraire en français (~2500 mots, 4 paragraphes minimum).
SCÈNE : RÉVÉLATION — Enfant qui trouve des lettres secrètes dans un grenier.
Exploration du grenier pendant que les adultes parlent en bas. Découverte d'une boîte.
Lecture d'une lettre qui révèle un secret familial. Descente silencieuse.
ÉMOTION : Arc innocence brisée — confiance → surprise → tristesse.
POV : 3e personne, focalisation interne. TEMPO : lent puis choc puis silence.
Signature sensorielle : poussière, papier, encre, secret. Motifs : grenier, lettres.
NE PAS conclure. Brique ouverte.`,
  },
  {
    id: 'confrontation',
    prompt: `Écris une scène littéraire en français (~2500 mots, 4 paragraphes minimum).
SCÈNE : CONFRONTATION — Deux associés règlent leurs comptes dans un bureau.
L'un entre sans frapper. Mots tranchants. Un dossier jeté sur la table de verre.
Sortie sans un mot. Trahison financière révélée.
ÉMOTION : Arc trahison — anticipation → colère → dégoût → silence.
POV : 3e personne, focalisation interne. TEMPO : tendu, phrases courtes au climax.
Signature sensorielle : acier, verre, silence, mâchoire. Motifs : bureau, lumière.
NE PAS conclure. Brique ouverte.`,
  },
];

// ═══ MAIN ═══

async function main() {
  console.log('=== OMEGA BLOC 5 — Claude vs Ollama Bench (32 runs) ===');
  console.log('Ollama: qwen3.5:35b-a3b | Scoring: CALC pur | Cost: 0€\n');

  // Load Claude data
  const claudeDataPath = path.join('sessions', 'SHADOW_BLOC2_COLLECT', 'shadow_data.json');
  if (!fs.existsSync(claudeDataPath)) {
    console.error('ERROR: Claude data not found at', claudeDataPath);
    process.exit(1);
  }
  const claudeRaw = JSON.parse(fs.readFileSync(claudeDataPath, 'utf8'));
  const claudeData = claudeRaw.filter((d: any) => !d.error);
  console.log(`Claude data loaded: ${claudeData.length} valid runs\n`);

  // Run Ollama
  const sessionDir = path.join('sessions', 'BLOC5_CLAUDE_VS_OLLAMA');
  fs.mkdirSync(sessionDir, { recursive: true });

  const RUNS_PER_SCENE = 8;
  const ollamaData: any[] = [];

  for (const scene of SCENES) {
    resetArcBuffer();
    console.log(`\n=== SCENE: ${scene.id} (${RUNS_PER_SCENE} runs) ===`);

    for (let run = 0; run < RUNS_PER_SCENE; run++) {
      console.log(`  [${scene.id}] run ${run + 1}/${RUNS_PER_SCENE}...`);
      const startMs = Date.now();

      try {
        const prompt = scene.prompt + `\nSeed: bloc5_${scene.id}_${run}_${Date.now()}`;
        const prose = callOllama(SYSTEM_PROMPT, prompt);
        const durationMs = Date.now() - startMs;
        const wordCount = prose.split(/\s+/).filter(w => w.length > 0).length;

        if (wordCount < 100) {
          console.warn(`    WARNING: ${wordCount} words — skipping`);
          ollamaData.push({ scene: scene.id, run, error: `Too few words: ${wordCount}` });
          continue;
        }

        const cliff = computeCliff(prose);
        const profileFr = computeLanguageProfile(prose, 'fr');
        const profileEnMax = computeLanguageProfile(prose, 'en', 'max');
        const branchingSignal = Math.round((profileEnMax.profile_score - profileFr.profile_score) * 100) / 100;
        const ciL37 = computeCIL37(prose);
        const feats = computeTextFeatures(prose) as Record<string, number>;

        const entry = {
          scene: scene.id, run, word_count: wordCount,
          duration_s: Math.round(durationMs / 1000),
          model: 'qwen3.5:35b-a3b',
          cliff_score: cliff,
          cliff_quality: cliff >= 0.50,
          profile_fr: profileFr.profile_score,
          profile_en_max: profileEnMax.profile_score,
          branching_signal: branchingSignal,
          branching_flag: branchingSignal > 10 ? 'BRANCH_CANDIDATE' : (branchingSignal < 5 ? 'FR_STABLE' : 'NEUTRAL'),
          ci_l37_corpus: ciL37.ci_l37_corpus,
          ci_l37_omega: ciL37.ci_l37_omega,
          sub_per_sentence: ciL37.sub_per_sentence,
          f26b_long_sent_rate: ciL37.f26b_long_sent_rate,
          f1a_rhythm_variance: feats.f1a_rhythm_variance ?? 0,
          f17_knife_count: feats.f17_knife_count ?? 0,
          f29d_ttr_score: feats.f29d_ttr_score ?? 0,
          f35c_hook_score: feats.f35c_hook_score ?? 0,
          f36c_cliff_score: feats.f36c_cliff_score ?? 0,
          f24c_contrast_delta: feats.f24c_contrast_delta ?? 0,
        };
        ollamaData.push(entry);

        console.log(`    ${wordCount}w ${(durationMs/1000).toFixed(0)}s cliff=${cliff.toFixed(3)} branch=${branchingSignal.toFixed(1)} CI=${ciL37.ci_l37_corpus.toFixed(0)}`);

      } catch (e: any) {
        console.error(`    ERROR: ${e.message?.slice(0, 150)}`);
        ollamaData.push({ scene: scene.id, run, error: e.message?.slice(0, 200) });
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Save Ollama data
  fs.writeFileSync(path.join(sessionDir, 'ollama_data.json'), JSON.stringify(ollamaData, null, 2));
  console.log(`\nSaved: ${sessionDir}/ollama_data.json`);

  // ═══ COMPARATIVE ANALYSIS ═══
  const ollamaOk = ollamaData.filter(d => !d.error);
  const nOllama = ollamaOk.length;
  const nClaude = claudeData.length;

  console.log(`\n${'='.repeat(70)}`);
  console.log('OMEGA BLOC 5 — CLAUDE vs OLLAMA — RAPPORT COMPARATIF');
  console.log('='.repeat(70));
  console.log(`\nClaude: ${nClaude} runs | Ollama: ${nOllama} runs | Cost Ollama: 0€\n`);

  // Helper to extract field
  const extract = (data: any[], field: string) => data.map(d => d[field] as number);

  // Global comparison
  const metrics = [
    { name: 'cliff_score', label: 'Cliff score' },
    { name: 'ci_l37_corpus', label: 'CI_L37 corpus' },
    { name: 'profile_fr', label: 'PROFILE_FR' },
    { name: 'f1a_rhythm_variance', label: 'Rhythm variance' },
    { name: 'f29d_ttr_score', label: 'TTR score' },
    { name: 'f35c_hook_score', label: 'Hook score' },
    { name: 'f17_knife_count', label: 'Knife count' },
  ];

  // Claude has 'composite' from full V3 scoring; Ollama doesn't
  // Compare only the CALC metrics that exist in both
  console.log('GLOBAL COMPARISON (CALC metrics):');
  console.log(`${'Metric'.padEnd(22)} ${'Claude'.padStart(10)} ${'Ollama'.padStart(10)} ${'Delta'.padStart(10)} Winner`);
  console.log('-'.repeat(65));

  for (const m of metrics) {
    const cVals = extract(claudeData, m.name);
    const oVals = extract(ollamaOk, m.name);
    if (cVals.length === 0 || oVals.length === 0) continue;
    const cMean = mean(cVals);
    const oMean = mean(oVals);
    const delta = oMean - cMean;
    const winner = Math.abs(delta) < 0.5 ? 'TIE' : (delta > 0 ? 'OLLAMA' : 'CLAUDE');
    console.log(`${m.label.padEnd(22)} ${cMean.toFixed(2).padStart(10)} ${oMean.toFixed(2).padStart(10)} ${(delta >= 0 ? '+' : '') + delta.toFixed(2).padStart(9)} ${winner}`);
  }

  // Branching comparison
  const claudeBranch = extract(claudeData, 'profile_en_max').map((v, i) => v - (claudeData[i].profile_fr ?? 0));
  const ollamaBranch = ollamaOk.map((d: any) => d.branching_signal);
  console.log(`${'Branching signal'.padEnd(22)} ${mean(claudeBranch).toFixed(2).padStart(10)} ${mean(ollamaBranch).toFixed(2).padStart(10)} ${((mean(ollamaBranch) - mean(claudeBranch)) >= 0 ? '+' : '') + (mean(ollamaBranch) - mean(claudeBranch)).toFixed(2).padStart(9)} ${mean(ollamaBranch) < mean(claudeBranch) ? 'OLLAMA' : 'CLAUDE'}`);

  // Claude composite (Ollama doesn't have full V3 composite)
  const claudeComposites = extract(claudeData, 'composite');
  console.log(`\nCLAUDE COMPOSITE (full V3 — not available for Ollama):`);
  console.log(`  mean=${mean(claudeComposites).toFixed(2)} std=${std(claudeComposites).toFixed(2)} min=${Math.min(...claudeComposites).toFixed(2)} max=${Math.max(...claudeComposites).toFixed(2)}`);

  // Per-scene comparison
  console.log(`\nPER-SCENE COMPARISON:`);
  console.log(`${'Scene'.padEnd(18)} ${'Claude cliff'.padStart(14)} ${'Ollama cliff'.padStart(14)} ${'Claude CI'.padStart(12)} ${'Ollama CI'.padStart(12)}`);
  console.log('-'.repeat(70));

  for (const scene of SCENES) {
    const cScene = claudeData.filter((d: any) => d.scene === scene.id);
    const oScene = ollamaOk.filter((d: any) => d.scene === scene.id);
    if (cScene.length === 0 || oScene.length === 0) continue;
    const cCliff = mean(extract(cScene, 'cliff_score'));
    const oCliff = mean(extract(oScene, 'cliff_score'));
    const cCI = mean(extract(cScene, 'ci_l37_corpus'));
    const oCI = mean(extract(oScene, 'ci_l37_corpus'));
    console.log(`${scene.id.padEnd(18)} ${cCliff.toFixed(3).padStart(14)} ${oCliff.toFixed(3).padStart(14)} ${cCI.toFixed(1).padStart(12)} ${oCI.toFixed(1).padStart(12)}`);
  }

  // Stability
  console.log(`\nSTABILITY (std across all runs):`);
  for (const m of metrics.slice(0, 3)) {
    const cStd = std(extract(claudeData, m.name));
    const oStd = std(extract(ollamaOk, m.name));
    console.log(`  ${m.label.padEnd(22)} Claude std=${cStd.toFixed(3)}  Ollama std=${oStd.toFixed(3)}  ${oStd <= cStd * 1.5 ? 'OK' : 'VOLATILE'}`);
  }

  // Word counts
  const oWords = extract(ollamaOk, 'word_count');
  const oDurations = extract(ollamaOk, 'duration_s');
  console.log(`\nGENERATION:`);
  console.log(`  Ollama words/run: ${mean(oWords).toFixed(0)} (target: 2500)`);
  console.log(`  Ollama duration: ${mean(oDurations).toFixed(0)}s/run`);
  console.log(`  Total Ollama time: ${(oDurations.reduce((a, b) => a + b, 0) / 60).toFixed(1)} min`);

  // Cliff quality
  const oCliffQ = ollamaOk.filter((d: any) => d.cliff_quality).length;
  const cCliffs = extract(claudeData, 'cliff_score');
  const cCliffQ = cCliffs.filter(c => c >= 0.50).length;
  console.log(`\nCLIFF QUALITY (>=0.50):`);
  console.log(`  Claude: ${cCliffQ}/${nClaude} (${Math.round(cCliffQ/nClaude*100)}%)`);
  console.log(`  Ollama: ${oCliffQ}/${nOllama} (${Math.round(oCliffQ/nOllama*100)}%)`);

  // Decision
  console.log(`\n${'='.repeat(70)}`);
  console.log('DECISION D-BLOC5');
  console.log('='.repeat(70));

  const oCliffMean = mean(extract(ollamaOk, 'cliff_score'));
  const cCliffMean = mean(cCliffs);
  const oCIMean = mean(extract(ollamaOk, 'ci_l37_corpus'));
  const cCIMean = mean(extract(claudeData, 'ci_l37_corpus'));
  const oBranchMean = mean(ollamaBranch);
  const cBranchMean = mean(claudeBranch);

  console.log(`\n  Cliff: Ollama ${oCliffMean.toFixed(3)} vs Claude ${cCliffMean.toFixed(3)} → ${oCliffMean > cCliffMean ? 'OLLAMA WINS' : 'CLAUDE WINS'}`);
  console.log(`  CI_L37: Ollama ${oCIMean.toFixed(1)} vs Claude ${cCIMean.toFixed(1)} → ${oCIMean < cCIMean ? 'OLLAMA DISCRIMINANT' : 'BOTH SATURATED'}`);
  console.log(`  Branching: Ollama ${oBranchMean.toFixed(1)} vs Claude ${cBranchMean.toFixed(1)} → ${oBranchMean < cBranchMean ? 'OLLAMA MORE FR' : 'CLAUDE MORE FR'}`);
  console.log(`  Cost: Ollama $0.00 vs Claude ~$4.80 → OLLAMA WINS`);

  // Note: composite comparison not possible (Ollama has no V3 judge)
  console.log(`\n  NOTE: Full V3 composite comparison not possible.`);
  console.log(`  Claude composite=${mean(claudeComposites).toFixed(2)} (V3 LLM judges).`);
  console.log(`  Ollama runs CALC-only — V3 scoring requires Claude judge API.`);
  console.log(`  → Architecture hybride recommandée: Ollama draft + Claude judge.`);

  console.log(`\n${'='.repeat(70)}`);

  // Save summary
  const summary = {
    date: new Date().toISOString(),
    claude_runs: nClaude,
    ollama_runs: nOllama,
    claude_composite_mean: Math.round(mean(claudeComposites) * 100) / 100,
    claude_composite_std: Math.round(std(claudeComposites) * 100) / 100,
    ollama_cliff_mean: Math.round(oCliffMean * 1000) / 1000,
    claude_cliff_mean: Math.round(cCliffMean * 1000) / 1000,
    ollama_ci_l37_mean: Math.round(oCIMean * 10) / 10,
    claude_ci_l37_mean: Math.round(cCIMean * 10) / 10,
    ollama_branching_mean: Math.round(oBranchMean * 10) / 10,
    claude_branching_mean: Math.round(cBranchMean * 10) / 10,
    ollama_cliff_quality_pct: Math.round(oCliffQ / nOllama * 100),
    claude_cliff_quality_pct: Math.round(cCliffQ / nClaude * 100),
    ollama_words_mean: Math.round(mean(oWords)),
    ollama_duration_mean_s: Math.round(mean(oDurations)),
    cost_ollama: 0, cost_claude_estimated: 4.80,
  };
  fs.writeFileSync(path.join(sessionDir, 'SUMMARY.json'), JSON.stringify(summary, null, 2));
  console.log(`\nSaved: ${sessionDir}/SUMMARY.json`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
