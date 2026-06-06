/**
 * OMEGA — GO2 CHAIN E2E (script BF-08) : (1) SAGA_CONTRACT réel du 88k + faux
 * tome 2 violant, (2) C15-gen RÉEL via Ollama (fallback honnête si daemon down),
 * (3) emotionalHash RÉEL (analyzeText+generateDNA de l'UI — réutilisation, zéro
 * doublon — la jonction backend OmegaDNA propre = V2 documentée) → fusion
 * COMPLETE, (4) génération des UI phases 16-17 (COCKPIT + MYCELIUM, data-driven).
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { sha256, canonicalize } from '@omega/canon-kernel';

// Réutilisation de l'implémentation Emotion14 EXISTANTE (apps/omega-ui/src/core
// — CODÉ isolé, aucune dep UI dans ces deux fichiers ; vérifié par recon).
import { analyzeText } from '../../../../apps/omega-ui/src/core/analyzer.js';
import { generateDNA } from '../../../../apps/omega-ui/src/core/dna.js';

import { buildSagaContract, checkContract } from '../saga/saga-contract.js';
import { assertRights } from '../style/rights-gate.js';
import { extractStyleFingerprint } from '../style/style-extractor.js';
import { generateInStyle } from '../style/style-generation.js';
import type { StyleGenPort } from '../style/style-generation.js';
import { buildNarrativeGenome } from '../mycelium-export/narrative-genome.js';
import { fuseGenomes } from '../mycelium-export/fused-genome.js';
import { importManuscript } from '../doctor/manuscript-import.js';
import { runDoctorAudit } from '../doctor/doctor-orchestrator.js';
import { measureKnobFeatures } from '../mixer/knob-bindings.js';

const RUN = process.env['GO2_RUN'] ?? 'runs/c8_book60k';
const OLLAMA = process.env['OLLAMA_URL'] ?? 'http://127.0.0.1:11434';
const MODEL = process.env['GO2_MODEL'] ?? 'qwen3.5:35b-a3b';

class OllamaStylePort implements StyleGenPort {
  async generate(directives: string, brief: string): Promise<string> {
    const res = await fetch(`${OLLAMA}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL, stream: false, think: false,
        messages: [{ role: 'user', content: `Écris un paragraphe narratif français (~250 mots). Contraintes de forme : ${directives}\nSujet : ${brief}\nRéponds UNIQUEMENT par la prose.` }],
        options: { temperature: 0.7, num_predict: 500 },
      }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) throw new Error(`ollama ${res.status}`);
    const json = (await res.json()) as { message?: { content?: string } };
    return json.message?.content ?? '';
  }
}

async function main(): Promise<void> {
  const manuscript = readFileSync(`${RUN}/MANUSCRIT.md`, 'utf8');
  const imp = importManuscript(manuscript);
  if (!imp.ok) throw new Error('import');
  const audit = runDoctorAudit(imp.value.chapters, imp.value.castProposal.slice(0, 4).map((c) => c.name), ['naufrage', 'dette', 'lettre', 'carnet', 'registre']);
  if (!audit.ok) throw new Error('audit');

  /* ── 1. SAGA_CONTRACT du tome 1 réel ─────────────────────────────────── */
  const unpaid = audit.value.arc.seedLedger
    .filter((s) => s.payoffChapter === 'UNPAID' && typeof s.plantedChapter === 'number')
    .map((s) => ({ seed: s.seed, plantedChapter: s.plantedChapter as number }));
  const contract = buildSagaContract({
    sagaId: 'saga-phare',
    fromBookTitle: 'Le Silence du Phare',
    unpaidSeeds: unpaid,
    characterStates: [
      { name: 'Henri', vital: 'DEAD', detail: 'gardien mort avant ch.1 (autorité plan/C10)' },
      { name: 'Léna', vital: 'ALIVE', detail: 'protagoniste vivante fin tome 1' },
      { name: 'Yvon', vital: 'ALIVE', detail: 'maire vivant fin tome 1' },
    ],
    facts: [{ subject: 'naufrage', fact: 'le Ker-Vo a coulé moteur coupé, dix ans avant le tome 1 (payé ch.46/50)' }],
  });
  if (!contract.ok) throw new Error('contract');
  const tome2Violant = '« Le phare tiendra encore cent ans », dit Henri en riant, et le registre resta fermé sur la table.';
  const check = checkContract(contract.value, tome2Violant);
  if (!check.ok) throw new Error('check');

  /* ── 2. C15-gen RÉEL (Ollama) — fallback honnête ─────────────────────── */
  const tAnalyze = assertRights('OWN_WORK', 'ANALYZE_STYLE');
  const tGen = assertRights('OWN_WORK', 'GENERATE_IN_STYLE');
  if (!tAnalyze.ok || !tGen.ok) throw new Error('rights');
  const fp = extractStyleFingerprint(tAnalyze.value, manuscript);
  if (!fp.ok) throw new Error('fingerprint');
  let stylegen: { status: string; conformityScore?: number; belowStyleFloor?: boolean; excerpt?: string } = { status: 'OLLAMA_UNAVAILABLE (fallback honnête — stub testé en suite)' };
  try {
    const r = await generateInStyle(tGen.value, fp.value, new OllamaStylePort(), 'Léna revient au village dix ans après, premier matin.');
    stylegen = r.ok
      ? { status: 'REAL_GENERATION_OK', conformityScore: r.value.conformityScore, belowStyleFloor: r.value.belowStyleFloor, excerpt: r.value.prose.slice(0, 200) }
      : { status: `GEN_ERROR_${r.error.code}` };
  } catch (e) {
    stylegen = { status: `OLLAMA_DOWN: ${String(e).slice(0, 80)}` };
  }

  /* ── 3. emotionalHash RÉEL + fusion COMPLETE ─────────────────────────── */
  const analysis = analyzeText(manuscript);
  const dna = generateDNA(analysis);
  const emotionalHash = String(sha256(canonicalize(dna as unknown as Record<string, unknown>)));
  const narrative = buildNarrativeGenome({
    title: 'Le Silence du Phare',
    chapters: imp.value.chapters.map((c) => ({ chapter: c.chapter, prose: c.prose })),
    cast: imp.value.castProposal, seedLedger: audit.value.arc.seedLedger,
    chapterFunctions: audit.value.arc.chapterFunctions, tics: audit.value.tics.rows,
  });
  if (!narrative.ok) throw new Error('genome');
  const fusedA = fuseGenomes(narrative.value.genomeHash, emotionalHash);
  const fusedB = fuseGenomes(narrative.value.genomeHash, emotionalHash);
  if (!fusedA.ok || !fusedB.ok || fusedA.value.status !== 'COMPLETE' || fusedB.value.status !== 'COMPLETE') throw new Error('fusion');

  /* ── 4. UI phases 16-17 : COCKPIT + MYCELIUM (data-driven, zéro logique moteur) ── */
  const perChapter = imp.value.chapters.map((c) => ({ ch: c.chapter, ...measureKnobFeatures(c.prose), fn: audit.value.arc.chapterFunctions.find((f) => f.chapter === c.chapter)?.fn ?? '?' }));
  const svgCurve = (key: 'TENSION' | 'MYSTERE' | 'ESPOIR' | 'ROMANCE' | 'VIOLENCE', color: string): string => {
    const max = Math.max(...perChapter.map((p) => p[key]), 1);
    const pts = perChapter.map((p, i) => `${(i / (perChapter.length - 1)) * 940 + 30},${190 - (p[key] / max) * 160}`).join(' ');
    return `<polyline fill="none" stroke="${color}" stroke-width="2" points="${pts}"/><text x="975" y="${190 - (perChapter[perChapter.length - 1]?.[key] ?? 0) / max * 160}" fill="${color}" font-size="11">${key}</text>`;
  };
  const cockpit = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>OMEGA COCKPIT — Le Silence du Phare</title>
<style>body{font-family:system-ui;background:#0d1117;color:#e6edf3;margin:24px}h1{font-size:18px}h2{font-size:14px;color:#8b949e}svg{background:#161b22;border-radius:8px}td,th{padding:2px 8px;font-size:12px;text-align:left}table{border-collapse:collapse}tr:nth-child(even){background:#161b22}</style></head>
<body><h1>OMEGA COCKPIT (phase 16 V0-viz) — météo émotionnelle mesurée, 50 chapitres</h1>
<h2>Données réelles (knob features /1000 mots) — généré par go2-chain-e2e.ts, AUCUNE logique moteur dans cette page</h2>
<svg viewBox="0 0 1060 210" width="100%">${svgCurve('TENSION', '#f85149')}${svgCurve('MYSTERE', '#a371f7')}${svgCurve('ESPOIR', '#3fb950')}${svgCurve('ROMANCE', '#f0883e')}${svgCurve('VIOLENCE', '#8b949e')}</svg>
<h2>Fonctions de chapitre (proxy CALC)</h2><table><tr><th>ch</th><th>fn</th><th>TEN</th><th>MYS</th><th>ESP</th></tr>
${perChapter.map((p) => `<tr><td>${p.ch}</td><td>${p.fn}</td><td>${p.TENSION.toFixed(1)}</td><td>${p.MYSTERE.toFixed(1)}</td><td>${p.ESPOIR.toFixed(1)}</td></tr>`).join('')}</table></body></html>`;
  writeFileSync(`${RUN}/COCKPIT_60K.html`, cockpit, 'utf8');

  const mycelium = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>OMEGA MYCELIUM — ADN</title>
<style>body{font-family:system-ui;background:#0d1117;color:#e6edf3;margin:24px}code{background:#161b22;padding:2px 6px;border-radius:4px;font-size:12px}h1{font-size:18px}li{font-size:13px;margin:3px 0}.h{color:#7ee787}</style></head>
<body><h1>OMEGA MYCELIUM (phase 17 V0-viz) — ADN de « Le Silence du Phare »</h1>
<p>Narratif: <code class="h">${narrative.value.genomeHash}</code><br>Émotionnel (Emotion14 via analyzeText/generateDNA réels): <code class="h">${emotionalHash}</code><br><b>FUSED_GENOME_V1: <code class="h">${fusedA.value.fusedHash}</code></b></p>
<p>Cast (${narrative.value.cast.length}): ${narrative.value.cast.slice(0, 8).map((c) => `${c.name}×${c.occurrences}`).join(' · ')}</p>
<p>Graines: ${narrative.value.seedLedger.map((s) => `<li>« ${s.seed} » planté ${s.planted} → payoff ${s.payoff} (${s.recalls} rappels)</li>`).join('')}</p>
<p>Contrat de saga: <code>${contract.value.contractHash}</code> (${contract.value.promises.length} promesses)</p>
<p>Tics signature: ${narrative.value.ticsSignature.slice(0, 5).map((t) => `«${t.gram}»×${t.occurrences}`).join(' · ')}</p></body></html>`;
  writeFileSync(`${RUN}/MYCELIUM_VIEW_60K.html`, mycelium, 'utf8');

  const report = {
    saga: { contractHash: contract.value.contractHash, promises: contract.value.promises.length, unpaidCarried: unpaid.map((u) => u.seed), violationsOnFakeTome2: check.value.violations.map((v) => v.kind), seedsCarriedInFake: check.value.seedsCarried },
    stylegen,
    fusion: { narrativeHash: narrative.value.genomeHash, emotionalHash, fusedHash: fusedA.value.fusedHash, deterministic: fusedA.value.fusedHash === fusedB.value.fusedHash, dnaComponents: (dna as unknown as { components?: unknown[] }).components?.length ?? Object.keys(dna as object).length },
    ui: { cockpit: 'COCKPIT_60K.html', mycelium: 'MYCELIUM_VIEW_60K.html', chapters: perChapter.length },
  };
  writeFileSync(`${RUN}/GO2_CHAIN_REPORT.json`, JSON.stringify(report, null, 2), 'utf8');
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((e: unknown) => {
  process.stderr.write(`FATAL ${String(e)}\n`);
  process.exitCode = 1;
});
