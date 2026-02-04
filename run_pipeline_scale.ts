// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA PIPELINE SCALE v1.0.0 — NASA-GRADE BATCH PROCESSING
// ═══════════════════════════════════════════════════════════════════════════════
// Batch + Parallel + Metrics + Deterministic
// Standard: NASA-Grade L4 / AS9100D / DO-178C Level A
//
// INVARIANTS:
//   INV-SCALE-01: Concurrency-invariant hash (c=1 === c=N)
//   INV-SCALE-02: Batch idempotent (2 runs → same output)
//   INV-SCALE-03: Mode-sensitive hash (sentence ≠ paragraph)
//   INV-SCALE-04: Text exclusion from hash (--no-text === --include-text)
//   INV-SCALE-05: Ordered aggregation (sort by index before Merkle)
// ═══════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import type {
  SegmentationResult,
  SegmentAnalysis,
  SegmentWithDNA,
  AggregateResult,
  MyceliumDNAAdapter as MyceliumDNAAdapterType
} from "./pipeline_types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const VERSION = "1.0.0";
const PIPELINE_VERSION = "3.0.0";
const DEFAULT_SEED = 42;
const DEFAULT_CONCURRENCY = Math.min(4, os.cpus().length);
const MAX_CONCURRENCY = os.cpus().length;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type SegmentMode = "sentence" | "paragraph" | "scene";

interface ScaleOptions {
  inputs: string[];
  outDir: string;
  seed: number;
  mode: SegmentMode;
  concurrency: number;
  includeText: boolean;
  verbose: boolean;
}

interface PerfMetrics {
  read_ms: number;
  segment_ms: number;
  analyze_ms: number;
  dna_ms: number;
  aggregate_ms: number;
  total_ms: number;
}

interface ScaleOutput {
  version: string;
  pipeline_version: string;
  profile: string;
  seed: number;
  input: {
    file: string;
    hash: string;
    char_count: number;
    word_count: number;
  };
  perf: PerfMetrics;
  segmentation: {
    mode: SegmentMode;
    segmentation_hash: string;
    segment_count: number;
    coverage_ratio: number;
  };
  segments: Array<{
    id: string;
    index: number;
    start: number;
    end: number;
    word_count: number;
    char_count: number;
    line_count: number;
    text?: string;
  }>;
  segment_dnas: Array<{
    segment_id: string;
    segment_index: number;
    rootHash: string;
    nodeCount: number;
  }>;
  global_dna: {
    rootHash: string;
    version: string;
    profile: string;
    fingerprint: string;
    merkle_root: string;
    segment_root_hashes: string[];
    segmentation_hash: string;
  };
}

interface FileResult {
  file: string;
  out: string;
  ms: number;
  rootHash: string;
  segments: number;
  success: boolean;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function nowMs(): number {
  return Date.now();
}

function sha256(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function safeName(filePath: string): string {
  return path.basename(filePath).replace(/[^a-zA-Z0-9._-]/g, "_");
}

function log(msg: string, verbose: boolean): void {
  if (verbose) console.log(msg);
}

// ─────────────────────────────────────────────────────────────────────────────
// INPUT RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

function resolveInputs(inArg: string): string[] {
  const p = path.resolve(inArg);
  
  if (!fs.existsSync(p)) {
    throw new Error(`Input not found: ${p}`);
  }

  const stat = fs.statSync(p);
  
  if (stat.isFile()) {
    return [p];
  }

  // Directory → recursively find all .txt files
  const files: string[] = [];
  
  const walk = (dir: string): void => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const st = fs.statSync(full);
      
      if (st.isDirectory()) {
        walk(full);
      } else if (st.isFile() && full.toLowerCase().endsWith(".txt")) {
        files.push(full);
      }
    }
  };
  
  walk(p);
  
  if (files.length === 0) {
    throw new Error(`No .txt files found in directory: ${p}`);
  }
  
  // CRITICAL: Sort for determinism (INV-SCALE-02)
  return files.sort();
}

// ─────────────────────────────────────────────────────────────────────────────
// ARGUMENT PARSING
// ─────────────────────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): ScaleOptions {
  const get = (key: string, defaultValue?: string): string | undefined => {
    const idx = argv.indexOf(key);
    if (idx === -1) return defaultValue;
    return argv[idx + 1];
  };

  const has = (key: string): boolean => argv.includes(key);

  const inArg = get("--in");
  
  if (!inArg || has("--help") || has("-h")) {
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    console.log("  OMEGA PIPELINE SCALE v" + VERSION + " — NASA-GRADE BATCH PROCESSING");
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    console.log("");
    console.log("Usage: npx tsx run_pipeline_scale.ts --in <file|dir> [options]");
    console.log("");
    console.log("Options:");
    console.log("  --in <path>         Input file or directory (required)");
    console.log("  --out <dir>         Output directory (default: out_scale)");
    console.log("  --mode <mode>       sentence | paragraph | scene (default: sentence)");
    console.log("  --seed <int>        Random seed (default: 42)");
    console.log("  --concurrency <n>   Parallel workers (default: " + DEFAULT_CONCURRENCY + ", max: " + MAX_CONCURRENCY + ")");
    console.log("  --include-text      Include segment text in output");
    console.log("  --no-text           Exclude segment text (default)");
    console.log("  --quiet, -q         Suppress verbose output");
    console.log("  --help, -h          Show this help");
    console.log("");
    console.log("Examples:");
    console.log("  npx tsx run_pipeline_scale.ts --in novel.txt --out results");
    console.log("  npx tsx run_pipeline_scale.ts --in ./texts --mode paragraph --concurrency 8");
    console.log("  npx tsx run_pipeline_scale.ts --in corpus/ --seed 42 --no-text");
    console.log("");
    console.log("Invariants (NASA L4):");
    console.log("  INV-SCALE-01: concurrency=1 produces same hash as concurrency=N");
    console.log("  INV-SCALE-02: Batch runs are idempotent (same input → same output)");
    console.log("  INV-SCALE-03: Different modes produce different hashes");
    console.log("  INV-SCALE-04: --no-text and --include-text produce same rootHash");
    console.log("  INV-SCALE-05: Segments sorted by index before aggregation");
    console.log("");
    process.exit(inArg ? 1 : 0);
  }

  const outDir = get("--out", "out_scale")!;
  const seed = Number(get("--seed", String(DEFAULT_SEED)));
  const mode = (get("--mode", "sentence") as SegmentMode);
  const rawConcurrency = Number(get("--concurrency", String(DEFAULT_CONCURRENCY)));
  const concurrency = Math.max(1, Math.min(rawConcurrency, MAX_CONCURRENCY));
  const includeText = has("--include-text");
  const verbose = !has("--quiet") && !has("-q");

  // Validate mode
  if (!["sentence", "paragraph", "scene"].includes(mode)) {
    throw new Error(`Invalid mode: ${mode}. Must be sentence, paragraph, or scene.`);
  }

  // Validate seed
  if (isNaN(seed) || seed < 0) {
    throw new Error(`Invalid seed: ${seed}. Must be a non-negative integer.`);
  }

  const inputs = resolveInputs(inArg);

  return { inputs, outDir, seed, mode, concurrency, includeText, verbose };
}

// ─────────────────────────────────────────────────────────────────────────────
// PARALLEL POOL (DETERMINISTIC)
// ─────────────────────────────────────────────────────────────────────────────

async function runPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  // Pre-allocate results array to preserve order (INV-SCALE-01)
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const idx = nextIndex++;
      if (idx >= items.length) break;
      results[idx] = await fn(items[idx], idx);
    }
  });

  await Promise.all(workers);
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE FILE PROCESSOR
// ─────────────────────────────────────────────────────────────────────────────

async function processFile(
  filePath: string,
  opts: ScaleOptions,
  modules: {
    segmentText: Function;
    analyze: Function;
    adaptTextAnalyzerToBridge: Function;
    prepareDNABuild: Function;
    buildMyceliumDNA: Function;
    aggregateDNA: Function;
    MyceliumDNAAdapter: MyceliumDNAAdapterType;
  }
): Promise<FileResult> {
  const t0 = nowMs();

  try {
    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 1: READ
    // ═══════════════════════════════════════════════════════════════════════════
    const inputText = fs.readFileSync(filePath, "utf8");
    const inputHash = sha256(inputText);
    const tRead = nowMs();

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 2: SEGMENT
    // ═══════════════════════════════════════════════════════════════════════════
    const segmentation = modules.segmentText(inputText, {

      mode: opts.mode,
      newline_policy: "normalize_lf",
      trim_segments: true,
      include_empty: false,
    });
    const tSeg = nowMs();

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 3: ANALYZE EACH SEGMENT (sequential for now, deterministic)
    // ═══════════════════════════════════════════════════════════════════════════
    const segmentAnalyses: SegmentAnalysis[] = [];

    for (let i = 0; i < segmentation.segments.length; i++) {
      const seg = segmentation.segments[i];
      const textAnalysisResult = modules.analyze(seg.text);
      const analysis = modules.adaptTextAnalyzerToBridge(textAnalysisResult, `segment-${i}`);
      const dnaInputs = modules.prepareDNABuild(analysis, {
        seed: opts.seed,
        title: `Segment-${i}`,
      });

      segmentAnalyses.push({
        segment_id: seg.id,
        segment_index: i,
        segment_text: seg.text,
        word_count: seg.word_count,
        char_count: seg.char_count,
        line_count: seg.line_count,
        start: seg.start,
        end: seg.end,
        dnaInputs,
      });
    }
    const tAna = nowMs();

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 4: BUILD DNA PER SEGMENT
    // ═══════════════════════════════════════════════════════════════════════════
    const segmentDNAs: SegmentWithDNA[] = [];

    for (const segAnalysis of segmentAnalyses) {
      const dna = modules.buildMyceliumDNA(segAnalysis.dnaInputs.segments, {
        seed: opts.seed,
        title: `Segment-${segAnalysis.segment_index}`,
        rawText: segAnalysis.segment_text,
      });

      segmentDNAs.push({
        segment_id: segAnalysis.segment_id,
        segment_index: segAnalysis.segment_index,
        word_count: segAnalysis.word_count,
        dna,
      });
    }
    const tDNA = nowMs();

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 5: AGGREGATE (CRITICAL: sort by index first - INV-SCALE-05)
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Sort by segment_index to ensure determinism regardless of processing order
    segmentDNAs.sort((a, b) => a.segment_index - b.segment_index);

    const dnaList = segmentDNAs.map(s => s.dna);
    const wordCounts = segmentDNAs.map(s => s.word_count);

    const aggregateResult = modules.aggregateDNA(
      {
        seed: opts.seed,
        version: PIPELINE_VERSION,
        segmentDNAs: dnaList,
        segmentWeights: wordCounts,
        segmentationHash: segmentation.segmentation_hash,
      },
      modules.MyceliumDNAAdapter
    );
    const tAgg = nowMs();

    // ═══════════════════════════════════════════════════════════════════════════
    // BUILD OUTPUT (no timestamps in hash-critical fields)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const totalWordCount = segmentation.segments.reduce(
      (sum: number, s) => sum + s.word_count, 0
    );

    const output: ScaleOutput = {
      version: `SCALE-${VERSION}`,
      pipeline_version: PIPELINE_VERSION,
      profile: "L4",
      seed: opts.seed,

      input: {
        file: filePath,
        hash: inputHash,
        char_count: inputText.length,
        word_count: totalWordCount,
      },

      perf: {
        read_ms: tRead - t0,
        segment_ms: tSeg - tRead,
        analyze_ms: tAna - tSeg,
        dna_ms: tDNA - tAna,
        aggregate_ms: tAgg - tDNA,
        total_ms: tAgg - t0,
      },

      segmentation: {
        mode: opts.mode,
        segmentation_hash: segmentation.segmentation_hash,
        segment_count: segmentation.segments.length,
        coverage_ratio: segmentation.coverage_ratio,
      },

      segments: segmentAnalyses.map((sa) => ({
        id: sa.segment_id,
        index: sa.segment_index,
        start: sa.start,
        end: sa.end,
        word_count: sa.word_count,
        char_count: sa.char_count,
        line_count: sa.line_count,
        ...(opts.includeText ? { text: sa.segment_text } : {}),
      })),

      segment_dnas: segmentDNAs.map((sd) => ({
        segment_id: sd.segment_id,
        segment_index: sd.segment_index,
        rootHash: sd.dna.rootHash,
        nodeCount: sd.dna.nodes.length,
      })),

      global_dna: {
        rootHash: aggregateResult.dna.rootHash,
        version: aggregateResult.dna.version,
        profile: aggregateResult.dna.profile,
        fingerprint: aggregateResult.dna.fingerprint,
        merkle_root: aggregateResult.aggregation.merkle_root,
        segment_root_hashes: aggregateResult.aggregation.segment_root_hashes,
        segmentation_hash: segmentation.segmentation_hash,
      },
    };

    // Write output
    const outPath = path.join(opts.outDir, safeName(filePath) + ".omega.json");
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");

    return {
      file: filePath,
      out: outPath,
      ms: output.perf.total_ms,
      rootHash: output.global_dna.rootHash,
      segments: segmentation.segments.length,
      success: true,
    };

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      file: filePath,
      out: "",
      ms: nowMs() - t0,
      rootHash: "",
      segments: 0,
      success: false,
      error: message,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // Create output directory
  fs.mkdirSync(args.outDir, { recursive: true });

  log("", args.verbose);
  log("═══════════════════════════════════════════════════════════════════════════════", args.verbose);
  log("  OMEGA PIPELINE SCALE v" + VERSION + " — NASA-GRADE BATCH", args.verbose);
  log("═══════════════════════════════════════════════════════════════════════════════", args.verbose);
  log(`  Inputs:      ${args.inputs.length} file(s)`, args.verbose);
  log(`  Output Dir:  ${path.resolve(args.outDir)}`, args.verbose);
  log(`  Mode:        ${args.mode}`, args.verbose);
  log(`  Seed:        ${args.seed}`, args.verbose);
  log(`  Concurrency: ${args.concurrency}`, args.verbose);
  log(`  Include Text: ${args.includeText ? "YES" : "NO"}`, args.verbose);
  log("───────────────────────────────────────────────────────────────────────────────", args.verbose);

  // ═══════════════════════════════════════════════════════════════════════════
  // LOAD MODULES (once, shared across all files)
  // ═══════════════════════════════════════════════════════════════════════════

  log("\n[INIT] Loading modules...", args.verbose);

  const { segmentText } = await import("./packages/omega-segment-engine/src/index.js");
  const { analyze } = await import("./src/text_analyzer/index.js");
  const { adaptTextAnalyzerToBridge } = await import("./text_analyzer_adapter.js");
  const { prepareDNABuild } = await import("./packages/omega-bridge-ta-mycelium/src/bridge/analysis_to_dna.js");
  const { buildMyceliumDNA } = await import("./packages/mycelium-bio/src/dna_builder.js");
  const { aggregateDNA, MyceliumDNAAdapter } = await import("./packages/omega-aggregate-dna/src/index.js");

  const modules = {
    segmentText,
    analyze,
    adaptTextAnalyzerToBridge,
    prepareDNABuild,
    buildMyceliumDNA,
    aggregateDNA,
    MyceliumDNAAdapter,
  };

  log("  ✓ All modules loaded", args.verbose);

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESS FILES (parallel with ordered results)
  // ═══════════════════════════════════════════════════════════════════════════

  log("\n[PROCESS] Running batch...\n", args.verbose);

  const startedAll = nowMs();

  const results = await runPool(args.inputs, args.concurrency, async (filePath, idx) => {
    const result = await processFile(filePath, args, modules);
    
    if (args.verbose) {
      const status = result.success ? "✓" : "✗";
      const info = result.success 
        ? `seg=${result.segments} | ${result.ms}ms | root=${result.rootHash.substring(0, 16)}...`
        : `ERROR: ${result.error}`;
      console.log(`  [${idx + 1}/${args.inputs.length}] ${status} ${path.basename(filePath)} | ${info}`);
    }
    
    return result;
  });

  const totalMs = nowMs() - startedAll;

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════

  const successResults = results.filter(r => r.success);
  const failedResults = results.filter(r => !r.success);
  const avgMs = successResults.length > 0 
    ? Math.round(successResults.reduce((a, r) => a + r.ms, 0) / successResults.length)
    : 0;
  const totalSegments = successResults.reduce((a, r) => a + r.segments, 0);

  log("", args.verbose);
  log("═══════════════════════════════════════════════════════════════════════════════", args.verbose);
  log("  SCALE RUN COMPLETE", args.verbose);
  log("═══════════════════════════════════════════════════════════════════════════════", args.verbose);
  log(`  Files Processed: ${successResults.length}/${results.length}`, args.verbose);
  log(`  Total Segments:  ${totalSegments}`, args.verbose);
  log(`  Total Time:      ${totalMs}ms`, args.verbose);
  log(`  Avg per File:    ${avgMs}ms`, args.verbose);
  log(`  Concurrency:     ${args.concurrency}`, args.verbose);

  if (failedResults.length > 0) {
    log("───────────────────────────────────────────────────────────────────────────────", args.verbose);
    log("  FAILURES:", args.verbose);
    for (const f of failedResults) {
      log(`    ✗ ${path.basename(f.file)}: ${f.error}`, args.verbose);
    }
  }

  log("═══════════════════════════════════════════════════════════════════════════════", args.verbose);

  // Write batch summary
  const summaryPath = path.join(args.outDir, "_BATCH_SUMMARY.json");
  const summary = {
    version: `SCALE-${VERSION}`,
    seed: args.seed,
    mode: args.mode,
    concurrency: args.concurrency,
    files_total: results.length,
    files_success: successResults.length,
    files_failed: failedResults.length,
    total_segments: totalSegments,
    total_ms: totalMs,
    avg_ms: avgMs,
    results: results.map(r => ({
      file: r.file,
      out: r.out,
      success: r.success,
      ms: r.ms,
      segments: r.segments,
      rootHash: r.rootHash || null,
      error: r.error || null,
    })),
  };
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf8");

  // Exit with error if any failures
  if (failedResults.length > 0) {
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error("\n❌ FATAL ERROR:", err.message || err);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
