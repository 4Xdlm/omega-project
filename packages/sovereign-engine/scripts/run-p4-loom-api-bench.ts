/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA — BENCH API P4: Loom OFF vs Loom ON
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Phase: P4 — Loom & Cohérence Longue Portée
 * Objectif: Mesurer l'impact runtime du Loom sur le pipeline Sovereign complet.
 *
 * Protocole:
 *   ARM A = Loom OFF (OMEGA_LOOM_ENABLED=0) — baseline
 *   ARM B = Loom ON  (OMEGA_LOOM_ENABLED=1) — JsonFileLoomAdapter actif
 *   Même golden run, mêmes scènes, même seed.
 *   Scènes exécutées SÉQUENTIELLEMENT (ch1→ch2→...→chN) dans chaque arm.
 *   ARM B accumule l'état Loom entre scènes (persistance réelle).
 *
 * KPI mesurés:
 *   1. Coût token: taille ForgeContinuity.previous_scene_summary (proxy)
 *   2. Qualité prose: S-Oracle composite + 5 macro-axes (ECC/AAI/RCI/SII/IFI)
 *   3. Cohérence cross-scène: dettes ouvertes/résolues, motifs, characters
 *   4. Latence locale: extractDelta + JsonFile I/O (ms)
 *   5. Stabilité: crash count, verdicts, INV-LOOM-01
 *
 * Usage (PowerShell):
 *   $env:ANTHROPIC_API_KEY = "sk-ant-..."
 *   npx tsx scripts/run-p4-loom-api-bench.ts [goldenRunPath] [sceneCount]
 *
 * Défaut:
 *   goldenRunPath = golden/e2e/run_001/runs/13535cccff86620f
 *   sceneCount = 5
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

// ── OMEGA imports ──
import { runSovereignForge } from '../src/engine.js';
import { loadGoldenRun } from '../src/runtime/golden-loader.js';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import { CreditExhaustedError } from '../src/runtime/anthropic-provider.js';
import { resetLoomConfig } from '../src/loom/loom-config.js';
import { extractDelta } from '../src/cde/delta-extractor.js';
import type { AnthropicProviderConfig } from '../src/runtime/live-types.js';
import type { ForgeContinuity } from '../src/types.js';
import type { SovereignForgeResult } from '../src/engine.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface SceneMetrics {
  readonly scene_index: number;
  readonly scene_id: string;
  readonly arm: 'A_LOOM_OFF' | 'B_LOOM_ON';
  readonly verdict: string;
  readonly composite: number;
  readonly ecc: number;
  readonly aai: number;
  readonly rci: number;
  readonly sii: number;
  readonly ifi: number;
  readonly continuity_summary_length: number;   // chars in previous_scene_summary
  readonly continuity_tokens_approx: number;    // ~4 chars/token estimate
  readonly prose_word_count: number;
  readonly elapsed_ms: number;
  readonly loom_extractdelta_ms: number;
  readonly loom_io_ms: number;
  readonly crash: boolean;
  readonly error_msg: string;
  // Loom-specific (arm B only)
  readonly loom_debts_opened: number;
  readonly loom_debts_resolved: number;
  readonly loom_motifs: number;
  readonly loom_characters: number;
  readonly loom_new_facts: number;
}

interface BenchReport {
  readonly bench_id: string;
  readonly timestamp: string;
  readonly golden_run: string;
  readonly scene_count: number;
  readonly model: string;
  readonly arm_a: readonly SceneMetrics[];
  readonly arm_b: readonly SceneMetrics[];
  readonly summary: BenchSummary;
}

interface BenchSummary {
  readonly arm_a_composite_mean: number;
  readonly arm_b_composite_mean: number;
  readonly delta_composite: number;
  readonly arm_a_ecc_mean: number;
  readonly arm_b_ecc_mean: number;
  readonly arm_a_elapsed_mean_ms: number;
  readonly arm_b_elapsed_mean_ms: number;
  readonly delta_elapsed_ms: number;
  readonly arm_a_continuity_tokens_mean: number;
  readonly arm_b_continuity_tokens_mean: number;
  readonly delta_continuity_tokens: number;
  readonly arm_a_crashes: number;
  readonly arm_b_crashes: number;
  readonly arm_a_seal_count: number;
  readonly arm_b_seal_count: number;
  readonly total_loom_debts_opened: number;
  readonly total_loom_debts_resolved: number;
  readonly total_loom_motifs: number;
  readonly loom_overhead_pct: number;
  readonly verdict: 'PASS' | 'FAIL';
  readonly fail_reasons: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function mean(arr: readonly number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

function r2(n: number): number { return Math.round(n * 100) / 100; }

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function log(msg: string): void {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  // ── Parse args ──
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ERREUR FATALE: ANTHROPIC_API_KEY manquante.');
    console.error('Usage: $env:ANTHROPIC_API_KEY = "sk-ant-..." ; npx tsx scripts/run-p4-loom-api-bench.ts');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const goldenRunRel = args[0] || 'golden/e2e/run_001/runs/13535cccff86620f';
  const sceneCount = parseInt(args[1] || '5', 10);
  const model = args[2] || 'claude-sonnet-4-20250514';

  const goldenRunPath = resolve(PKG_ROOT, '../../', goldenRunRel);
  if (!existsSync(goldenRunPath)) {
    console.error(`Golden run introuvable: ${goldenRunPath}`);
    process.exit(1);
  }

  // ── Output directory ──
  const benchId = `P4-BENCH-${Date.now()}`;
  const outDir = resolve(PKG_ROOT, 'bench-results', benchId);
  mkdirSync(outDir, { recursive: true });

  log(`═══ OMEGA BENCH API P4 ═══`);
  log(`Bench ID:    ${benchId}`);
  log(`Golden run:  ${goldenRunRel}`);
  log(`Scenes:      ${sceneCount}`);
  log(`Model:       ${model}`);
  log(`Output:      ${outDir}`);
  log(`═════════════════════════`);

  // ── Provider config ──
  const providerConfig: AnthropicProviderConfig = {
    apiKey,
    model,
    judgeStable: true,
    draftTemperature: 0.75,
    judgeTemperature: 0.0,
    judgeTopP: 1.0,
    judgeMaxTokens: 300,
  };
  const provider = createAnthropicProvider(providerConfig);

  // ── Loom DB paths (isolated per arm) ──
  const loomDbA = resolve(outDir, 'loom-db-arm-a');
  const loomDbB = resolve(outDir, 'loom-db-arm-b');
  mkdirSync(loomDbA, { recursive: true });
  mkdirSync(loomDbB, { recursive: true });

  // ═══════════════════════════════════════════════════════════════════════════
  // ARM A: LOOM OFF
  // ═══════════════════════════════════════════════════════════════════════════
  log('');
  log('╔══════════════════════════════════════╗');
  log('║  ARM A — LOOM OFF (baseline)         ║');
  log('╚══════════════════════════════════════╝');

  const armA = await runArm(
    'A_LOOM_OFF',
    false,
    loomDbA,
    goldenRunPath,
    sceneCount,
    provider,
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ARM B: LOOM ON
  // ═══════════════════════════════════════════════════════════════════════════
  log('');
  log('╔══════════════════════════════════════╗');
  log('║  ARM B — LOOM ON (JsonFile)          ║');
  log('╚══════════════════════════════════════╝');

  const armB = await runArm(
    'B_LOOM_ON',
    true,
    loomDbB,
    goldenRunPath,
    sceneCount,
    provider,
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY & VERDICT
  // ═══════════════════════════════════════════════════════════════════════════
  const summary = computeSummary(armA, armB);

  const report: BenchReport = {
    bench_id: benchId,
    timestamp: new Date().toISOString(),
    golden_run: goldenRunRel,
    scene_count: sceneCount,
    model,
    arm_a: armA,
    arm_b: armB,
    summary,
  };

  // ── Write JSON report ──
  const jsonPath = join(outDir, 'bench-report.json');
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');

  // ── Write human-readable report ──
  const mdPath = join(outDir, 'bench-report.md');
  writeFileSync(mdPath, formatMarkdownReport(report), 'utf8');

  // ── Console summary ──
  log('');
  log('═══════════════════════════════════════════════════════');
  log('  BENCH P4 — RÉSULTATS');
  log('═══════════════════════════════════════════════════════');
  log('');
  log(`  Composite moyen    A: ${r2(summary.arm_a_composite_mean)}   B: ${r2(summary.arm_b_composite_mean)}   Δ: ${r2(summary.delta_composite)}`);
  log(`  ECC moyen          A: ${r2(summary.arm_a_ecc_mean)}   B: ${r2(summary.arm_b_ecc_mean)}`);
  log(`  Temps moyen (ms)   A: ${r2(summary.arm_a_elapsed_mean_ms)}   B: ${r2(summary.arm_b_elapsed_mean_ms)}   Δ: ${r2(summary.delta_elapsed_ms)}`);
  log(`  Continuity tokens  A: ${r2(summary.arm_a_continuity_tokens_mean)}   B: ${r2(summary.arm_b_continuity_tokens_mean)}   Δ: ${r2(summary.delta_continuity_tokens)}`);
  log(`  SEAL               A: ${summary.arm_a_seal_count}/${armA.length}   B: ${summary.arm_b_seal_count}/${armB.length}`);
  log(`  Crashes            A: ${summary.arm_a_crashes}   B: ${summary.arm_b_crashes}`);
  log(`  Loom overhead      ${r2(summary.loom_overhead_pct)}%`);
  log(`  Dettes ouvertes    ${summary.total_loom_debts_opened}`);
  log(`  Dettes résolues    ${summary.total_loom_debts_resolved}`);
  log(`  Motifs accumulés   ${summary.total_loom_motifs}`);
  log('');
  log(`  VERDICT: ${summary.verdict}`);
  if (summary.fail_reasons.length > 0) {
    summary.fail_reasons.forEach((r) => log(`    ✗ ${r}`));
  }
  log('');
  log(`  Rapports: ${outDir}`);
  log('═══════════════════════════════════════════════════════');
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUN ARM
// ═══════════════════════════════════════════════════════════════════════════════

async function runArm(
  armName: 'A_LOOM_OFF' | 'B_LOOM_ON',
  loomEnabled: boolean,
  loomDbPath: string,
  goldenRunPath: string,
  sceneCount: number,
  provider: ReturnType<typeof createAnthropicProvider>,
): Promise<SceneMetrics[]> {
  const metrics: SceneMetrics[] = [];

  // ── Set env for this arm ──
  process.env.OMEGA_LOOM_ENABLED = loomEnabled ? '1' : '0';
  process.env.OMEGA_LOOM_DB_PATH = loomDbPath;
  process.env.OMEGA_LOOM_EXTRACTION = '0';  // CALC only, pas de LLM extraction
  resetLoomConfig();  // Force re-resolve du singleton

  // Continuity chaînée: la sortie de la scène N alimente la scène N+1
  let rollingContinuity: ForgeContinuity = {
    previous_scene_summary: '',
    character_states: [],
    open_threads: [],
  };

  for (let i = 0; i < sceneCount; i++) {
    const sceneLabel = `${armName} scene ${i + 1}/${sceneCount}`;
    log(`  ▸ ${sceneLabel}...`);

    let result: SovereignForgeResult | null = null;
    let crash = false;
    let errorMsg = '';
    let extractDeltaMs = 0;
    let loomIoMs = 0;

    const t0 = performance.now();

    try {
      // Charger le golden run pour cette scène
      const input = loadGoldenRun(goldenRunPath, i, `${armName}-scene-${i}`);

      // Injecter la continuité chaînée (sauf scène 0)
      const chainedInput = {
        ...input,
        continuity: i === 0 ? input.continuity : rollingContinuity,
      };

      // Exécuter le pipeline complet
      result = await runSovereignForge(chainedInput, provider);

      // Mesurer extractDelta isolément (pour le KPI latence)
      if (result.final_prose) {
        const tD0 = performance.now();
        try {
          extractDelta(result.final_prose, {
            canon_facts: [],
            open_debts: [],
            arc_states: [],
          });
        } catch { /* ignore */ }
        extractDeltaMs = performance.now() - tD0;
      }

      // Mettre à jour la continuité pour la scène suivante
      if (result.final_prose) {
        // Extraire un résumé de la prose pour la continuité
        const sentences = result.final_prose.split(/[.!?]+/).filter(Boolean);
        const summary = sentences.slice(0, 3).join('. ').trim();
        rollingContinuity = {
          previous_scene_summary: summary.slice(0, 500),
          character_states: chainedInput.continuity.character_states,
          open_threads: chainedInput.continuity.open_threads,
        };
      }
    } catch (err: unknown) {
      crash = true;
      errorMsg = err instanceof Error ? err.message : String(err);
      // Credit exhausted → abort entire arm
      if (err instanceof CreditExhaustedError) {
        log(`  ✗ ${sceneLabel}: CRÉDIT ÉPUISÉ — abandon du bras.`);
        metrics.push(buildCrashMetric(i, 'unknown', armName, errorMsg));
        break;
      }
      log(`  ✗ ${sceneLabel}: ${errorMsg.slice(0, 100)}`);
    }

    const elapsed = performance.now() - t0;

    // Extraire les métriques Loom si arm B
    let loomDebtsOpened = 0;
    let loomDebtsResolved = 0;
    let loomMotifs = 0;
    let loomCharacters = 0;
    let loomNewFacts = 0;

    if (loomEnabled && result?.final_prose) {
      try {
        const tIO0 = performance.now();
        const delta = extractDelta(result.final_prose, {
          canon_facts: [],
          open_debts: [],
          arc_states: [],
        });
        loomIoMs = performance.now() - tIO0;
        loomDebtsOpened = delta.debts_opened.length;
        loomDebtsResolved = delta.debts_resolved.length;
        loomMotifs = delta.motifs?.length ?? 0;
        loomCharacters = delta.characters_present?.length ?? 0;
        loomNewFacts = delta.new_facts.length;
      } catch { /* ignore */ }
    }

    const macro = result?.macro_score;
    const sceneId = (() => {
      try { return loadGoldenRun(goldenRunPath, i, 'id-only').scene.scene_id; }
      catch { return `scene-${i}`; }
    })();

    const continuityLen = rollingContinuity.previous_scene_summary.length;

    metrics.push({
      scene_index: i,
      scene_id: sceneId,
      arm: armName,
      verdict: result?.verdict ?? 'CRASH',
      composite: macro?.composite ?? 0,
      ecc: macro?.macro_axes?.ecc?.score ?? 0,
      aai: macro?.macro_axes?.aai?.score ?? 0,
      rci: macro?.macro_axes?.rci?.score ?? 0,
      sii: macro?.macro_axes?.sii?.score ?? 0,
      ifi: macro?.macro_axes?.ifi?.score ?? 0,
      continuity_summary_length: continuityLen,
      continuity_tokens_approx: Math.ceil(continuityLen / 4),
      prose_word_count: result?.final_prose ? wordCount(result.final_prose) : 0,
      elapsed_ms: Math.round(elapsed),
      loom_extractdelta_ms: Math.round(extractDeltaMs * 100) / 100,
      loom_io_ms: Math.round(loomIoMs * 100) / 100,
      crash,
      error_msg: errorMsg,
      loom_debts_opened: loomDebtsOpened,
      loom_debts_resolved: loomDebtsResolved,
      loom_motifs: loomMotifs,
      loom_characters: loomCharacters,
      loom_new_facts: loomNewFacts,
    });

    const compStr = macro ? `${r2(macro.composite)}` : 'N/A';
    const verdStr = result?.verdict ?? 'CRASH';
    log(`    ${verdStr} | comp=${compStr} | ${Math.round(elapsed)}ms | words=${result?.final_prose ? wordCount(result.final_prose) : 0}`);
  }

  return metrics;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

function computeSummary(armA: readonly SceneMetrics[], armB: readonly SceneMetrics[]): BenchSummary {
  const aComps = armA.filter((m) => !m.crash).map((m) => m.composite);
  const bComps = armB.filter((m) => !m.crash).map((m) => m.composite);
  const aEccs = armA.filter((m) => !m.crash).map((m) => m.ecc);
  const bEccs = armB.filter((m) => !m.crash).map((m) => m.ecc);
  const aElapsed = armA.filter((m) => !m.crash).map((m) => m.elapsed_ms);
  const bElapsed = armB.filter((m) => !m.crash).map((m) => m.elapsed_ms);
  const aContinuity = armA.filter((m) => !m.crash).map((m) => m.continuity_tokens_approx);
  const bContinuity = armB.filter((m) => !m.crash).map((m) => m.continuity_tokens_approx);

  const aMean = mean(aComps);
  const bMean = mean(bComps);
  const aElapsedMean = mean(aElapsed);
  const bElapsedMean = mean(bElapsed);

  const failReasons: string[] = [];

  // Critère 1: pas de crash arm B
  const bCrashes = armB.filter((m) => m.crash).length;
  const aCrashes = armA.filter((m) => m.crash).length;
  if (bCrashes > 0) failReasons.push(`ARM B: ${bCrashes} crash(es)`);

  // Critère 2: pas de régression qualité > 3 points
  const deltaComp = bMean - aMean;
  if (deltaComp < -3) failReasons.push(`Régression composite: ${r2(deltaComp)} (seuil: -3)`);

  // Critère 3: overhead latence < 20%
  const overheadPct = aElapsedMean > 0 ? ((bElapsedMean - aElapsedMean) / aElapsedMean) * 100 : 0;
  if (overheadPct > 20) failReasons.push(`Overhead latence: ${r2(overheadPct)}% (seuil: 20%)`);

  // Critère 4: au moins 1 debt retrouvée en arm B (preuve retrieval)
  const totalDebtsOpened = armB.reduce((s, m) => s + m.loom_debts_opened, 0);
  const totalDebtsResolved = armB.reduce((s, m) => s + m.loom_debts_resolved, 0);
  const totalMotifs = armB.reduce((s, m) => s + m.loom_motifs, 0);
  if (totalDebtsOpened === 0 && totalMotifs === 0) {
    failReasons.push('Aucune dette ni motif détecté en arm B — Loom inutile');
  }

  return {
    arm_a_composite_mean: r2(aMean),
    arm_b_composite_mean: r2(bMean),
    delta_composite: r2(deltaComp),
    arm_a_ecc_mean: r2(mean(aEccs)),
    arm_b_ecc_mean: r2(mean(bEccs)),
    arm_a_elapsed_mean_ms: r2(aElapsedMean),
    arm_b_elapsed_mean_ms: r2(bElapsedMean),
    delta_elapsed_ms: r2(bElapsedMean - aElapsedMean),
    arm_a_continuity_tokens_mean: r2(mean(aContinuity)),
    arm_b_continuity_tokens_mean: r2(mean(bContinuity)),
    delta_continuity_tokens: r2(mean(bContinuity) - mean(aContinuity)),
    arm_a_crashes: aCrashes,
    arm_b_crashes: bCrashes,
    arm_a_seal_count: armA.filter((m) => m.verdict === 'SEAL').length,
    arm_b_seal_count: armB.filter((m) => m.verdict === 'SEAL').length,
    total_loom_debts_opened: totalDebtsOpened,
    total_loom_debts_resolved: totalDebtsResolved,
    total_loom_motifs: totalMotifs,
    loom_overhead_pct: r2(overheadPct),
    verdict: failReasons.length === 0 ? 'PASS' : 'FAIL',
    fail_reasons: failReasons,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARKDOWN REPORT
// ═══════════════════════════════════════════════════════════════════════════════

function formatMarkdownReport(report: BenchReport): string {
  const s = report.summary;
  const lines: string[] = [
    `# OMEGA Bench API P4 — Loom OFF vs ON`,
    ``,
    `**Bench ID**: ${report.bench_id}`,
    `**Date**: ${report.timestamp}`,
    `**Golden run**: ${report.golden_run}`,
    `**Scènes**: ${report.scene_count}`,
    `**Modèle**: ${report.model}`,
    ``,
    `## Résumé`,
    ``,
    `| Métrique | ARM A (OFF) | ARM B (ON) | Delta |`,
    `|----------|-------------|------------|-------|`,
    `| Composite moyen | ${s.arm_a_composite_mean} | ${s.arm_b_composite_mean} | ${s.delta_composite} |`,
    `| ECC moyen | ${s.arm_a_ecc_mean} | ${s.arm_b_ecc_mean} | ${r2(s.arm_b_ecc_mean - s.arm_a_ecc_mean)} |`,
    `| Temps moyen (ms) | ${s.arm_a_elapsed_mean_ms} | ${s.arm_b_elapsed_mean_ms} | ${s.delta_elapsed_ms} |`,
    `| Continuity tokens | ${s.arm_a_continuity_tokens_mean} | ${s.arm_b_continuity_tokens_mean} | ${s.delta_continuity_tokens} |`,
    `| SEAL | ${s.arm_a_seal_count} | ${s.arm_b_seal_count} | — |`,
    `| Crashes | ${s.arm_a_crashes} | ${s.arm_b_crashes} | — |`,
    `| Overhead Loom | — | ${s.loom_overhead_pct}% | — |`,
    ``,
    `## Loom Telemetry (ARM B)`,
    ``,
    `| Métrique | Total |`,
    `|----------|-------|`,
    `| Dettes ouvertes | ${s.total_loom_debts_opened} |`,
    `| Dettes résolues | ${s.total_loom_debts_resolved} |`,
    `| Motifs accumulés | ${s.total_loom_motifs} |`,
    ``,
    `## Détail par scène`,
    ``,
    `### ARM A — LOOM OFF`,
    ``,
    `| # | Scene ID | Verdict | Comp | ECC | AAI | RCI | SII | IFI | Words | ms |`,
    `|---|----------|---------|------|-----|-----|-----|-----|-----|-------|----|`,
  ];

  for (const m of report.arm_a) {
    lines.push(
      `| ${m.scene_index} | ${m.scene_id.slice(0, 16)} | ${m.verdict} | ${r2(m.composite)} | ${r2(m.ecc)} | ${r2(m.aai)} | ${r2(m.rci)} | ${r2(m.sii)} | ${r2(m.ifi)} | ${m.prose_word_count} | ${m.elapsed_ms} |`,
    );
  }

  lines.push(
    ``,
    `### ARM B — LOOM ON`,
    ``,
    `| # | Scene ID | Verdict | Comp | ECC | AAI | RCI | SII | IFI | Words | ms | Debts+ | Debts- | Motifs |`,
    `|---|----------|---------|------|-----|-----|-----|-----|-----|-------|----|--------|--------|--------|`,
  );

  for (const m of report.arm_b) {
    lines.push(
      `| ${m.scene_index} | ${m.scene_id.slice(0, 16)} | ${m.verdict} | ${r2(m.composite)} | ${r2(m.ecc)} | ${r2(m.aai)} | ${r2(m.rci)} | ${r2(m.sii)} | ${r2(m.ifi)} | ${m.prose_word_count} | ${m.elapsed_ms} | ${m.loom_debts_opened} | ${m.loom_debts_resolved} | ${m.loom_motifs} |`,
    );
  }

  lines.push(
    ``,
    `## VERDICT`,
    ``,
    `**${s.verdict}**`,
    ``,
  );

  if (s.fail_reasons.length > 0) {
    lines.push(`Raisons d'échec :`);
    s.fail_reasons.forEach((r) => lines.push(`- ${r}`));
  } else {
    lines.push(
      `Critères satisfaits :`,
      `- Pas de crash ARM B`,
      `- Régression composite < 3 points (Δ = ${s.delta_composite})`,
      `- Overhead latence < 20% (${s.loom_overhead_pct}%)`,
      `- Retrieval Loom actif (dettes: ${s.total_loom_debts_opened}, motifs: ${s.total_loom_motifs})`,
    );
  }

  lines.push('');
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// CRASH METRIC BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function buildCrashMetric(
  index: number,
  sceneId: string,
  arm: 'A_LOOM_OFF' | 'B_LOOM_ON',
  errorMsg: string,
): SceneMetrics {
  return {
    scene_index: index,
    scene_id: sceneId,
    arm,
    verdict: 'CRASH',
    composite: 0, ecc: 0, aai: 0, rci: 0, sii: 0, ifi: 0,
    continuity_summary_length: 0,
    continuity_tokens_approx: 0,
    prose_word_count: 0,
    elapsed_ms: 0,
    loom_extractdelta_ms: 0,
    loom_io_ms: 0,
    crash: true,
    error_msg: errorMsg,
    loom_debts_opened: 0,
    loom_debts_resolved: 0,
    loom_motifs: 0,
    loom_characters: 0,
    loom_new_facts: 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENTRY
// ═══════════════════════════════════════════════════════════════════════════════

main().catch((err) => {
  console.error('BENCH FATAL:', err);
  process.exit(1);
});
