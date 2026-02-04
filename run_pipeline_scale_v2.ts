// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA PIPELINE SCALE v2.0.0 — STREAMING SUPPORT
// ═══════════════════════════════════════════════════════════════════════════════
// Batch + Parallel + Metrics + Streaming + Deterministic
// Standard: NASA-Grade L4 / AS9100D / DO-178C Level A
//
// NOUVEAUTÉS v2.0.0:
//   --stream              Force streaming mode
//   --chunk-size <int>    Chunk size in bytes (default: 65536)
//   --stream-threshold-mb Auto-stream si fichier > threshold (default: 50)
//
// INVARIANTS:
//   INV-SCALE-01 à 05 (conservés)
//   INV-STR-01: Streaming == Non-streaming (rootHash identique)
//   INV-STR-02: chunk_size ne change pas le hash
//   INV-STR-03: Offsets globaux valides
//   INV-STR-04: Auto-stream = même résultat que --stream explicite
//   INV-STR-05: Determinism multi-runs
// ═══════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import type {
  SegmentationResult,
  Segment,
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

const VERSION = "2.0.0";
const PIPELINE_VERSION = "3.2.0";
const DEFAULT_SEED = 42;
const DEFAULT_CONCURRENCY = Math.min(4, os.cpus().length);
const MAX_CONCURRENCY = os.cpus().length;
const DEFAULT_CHUNK_SIZE = 65536; // 64KB
const DEFAULT_STREAM_THRESHOLD_MB = 50;

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
  // Streaming options
  forceStream: boolean;
  chunkSize: number;
  streamThresholdMB: number;
}

interface PerfMetrics {
  read_ms: number;
  segment_ms: number;
  analyze_ms: number;
  dna_ms: number;
  aggregate_ms: number;
  total_ms: number;
  streaming_used: boolean;
}

interface ScaleOutput {
  version: string;
  pipeline_version: string;
  profile: string;
  seed: number;
  streaming: {
    used: boolean;
    chunk_size: number | null;
    threshold_mb: number;
  };
  input: {
    file: string;
    hash: string;
    char_count: number;
    word_count: number;
    size_bytes: number;
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
  streaming: boolean;
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

function getFileSizeBytes(filePath: string): number {
  return fs.statSync(filePath).size;
}

function shouldUseStreaming(
  filePath: string,
  forceStream: boolean,
  thresholdMB: number
): boolean {
  if (forceStream) return true;
  const sizeBytes = getFileSizeBytes(filePath);
  const thresholdBytes = thresholdMB * 1024 * 1024;
  return sizeBytes > thresholdBytes;
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
    console.log("  OMEGA PIPELINE SCALE v" + VERSION + " — NASA-GRADE + STREAMING");
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    console.log("");
    console.log("Usage: npx tsx run_pipeline_scale_v2.ts --in <file|dir> [options]");
    console.log("");
    console.log("Options:");
    console.log("  --in <path>              Input file or directory (required)");
    console.log("  --out <dir>              Output directory (default: out_scale)");
    console.log("  --mode <mode>            sentence | paragraph | scene (default: sentence)");
    console.log("  --seed <int>             Random seed (default: 42)");
    console.log("  --concurrency <n>        Parallel workers (default: " + DEFAULT_CONCURRENCY + ")");
    console.log("  --include-text           Include segment text in output");
    console.log("  --no-text                Exclude segment text (default)");
    console.log("");
    console.log("Streaming Options (NEW in v2):");
    console.log("  --stream                 Force streaming mode");
    console.log("  --chunk-size <bytes>     Chunk size (default: " + DEFAULT_CHUNK_SIZE + ")");
    console.log("  --stream-threshold-mb <n> Auto-stream if file > n MB (default: " + DEFAULT_STREAM_THRESHOLD_MB + ")");
    console.log("");
    console.log("Other:");
    console.log("  --quiet, -q              Suppress verbose output");
    console.log("  --help, -h               Show this help");
    console.log("");
    console.log("Examples:");
    console.log("  npx tsx run_pipeline_scale_v2.ts --in novel.txt --out results");
    console.log("  npx tsx run_pipeline_scale_v2.ts --in huge_book.txt --stream --chunk-size 131072");
    console.log("  npx tsx run_pipeline_scale_v2.ts --in corpus/ --mode paragraph --concurrency 8");
    console.log("");
    console.log("Invariants (NASA L4):");
    console.log("  INV-STR-01: Streaming == Non-streaming (rootHash identique)");
    console.log("  INV-STR-02: chunk_size ne change pas le hash");
    console.log("  INV-SCALE-01: concurrency=1 produces same hash as concurrency=N");
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
  
  // Streaming options
  const forceStream = has("--stream");
  const chunkSize = Number(get("--chunk-size", String(DEFAULT_CHUNK_SIZE)));
  const streamThresholdMB = Number(get("--stream-threshold-mb", String(DEFAULT_STREAM_THRESHOLD_MB)));

  if (!["sentence", "paragraph", "scene"].includes(mode)) {
    throw new Error(`Invalid mode: ${mode}. Must be sentence, paragraph, or scene.`);
  }

  if (isNaN(seed) || seed < 0) {
    throw new Error(`Invalid seed: ${seed}. Must be a non-negative integer.`);
  }

  const inputs = resolveInputs(inArg);

  return {
    inputs,
    outDir,
    seed,
    mode,
    concurrency,
    includeText,
    verbose,
    forceStream,
    chunkSize,
    streamThresholdMB,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PARALLEL POOL
// ─────────────────────────────────────────────────────────────────────────────

async function runPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
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
// SINGLE FILE PROCESSOR (with streaming support)
// ─────────────────────────────────────────────────────────────────────────────

async function processFile(
  filePath: string,
  opts: ScaleOptions,
  modules: {
    segmentText: Function;
    iterateSegmentsStreaming?: Function;
    analyze: Function;
    adaptTextAnalyzerToBridge: Function;
    prepareDNABuild: Function;
    buildMyceliumDNA: Function;
    aggregateDNA: Function;
    MyceliumDNAAdapter: MyceliumDNAAdapterType;
  }
): Promise<FileResult> {
  const t0 = nowMs();
  const fileSizeBytes = getFileSizeBytes(filePath);
  const useStreaming = shouldUseStreaming(filePath, opts.forceStream, opts.streamThresholdMB);

  try {
    let segmentation: SegmentationResult;
    let segmentTexts: string[] = [];
    const tRead = nowMs();

    if (useStreaming && modules.iterateSegmentsStreaming) {
      // ═══════════════════════════════════════════════════════════════════════
      // STREAMING MODE
      // ═══════════════════════════════════════════════════════════════════════
      
      const streamSegments: Segment[] = [];
      
      for await (const seg of modules.iterateSegmentsStreaming(filePath, {
        mode: opts.mode,
        chunkSize: opts.chunkSize,
        includeText: true, // Need text for analysis
      })) {
        streamSegments.push(seg);
        segmentTexts.push(seg.text);
      }
      
      // Build segmentation result compatible with non-streaming
      const hashParts = [opts.mode];
      for (const seg of streamSegments) {
        hashParts.push(`${seg.id}:${seg.start}:${seg.end}`);
      }
      
      segmentation = {
        segments: streamSegments.map((s, i) => ({
          id: s.id,
          index: s.index,
          start: s.start,
          end: s.end,
          word_count: s.word_count,
          char_count: s.char_count,
          line_count: s.line_count,
          text: s.text,
        })),
        segmentation_hash: createHash("sha256").update(hashParts.join("|"), "utf8").digest("hex"),
        segment_count: streamSegments.length,
        coverage_ratio: 1.0,
      };
      
    } else {
      // ═══════════════════════════════════════════════════════════════════════
      // NON-STREAMING MODE (original)
      // ═══════════════════════════════════════════════════════════════════════
      
      const rawText = fs.readFileSync(filePath, "utf8");
      
      segmentation = modules.segmentText(rawText, {
        mode: opts.mode,
        newline_policy: "normalize_lf",
        trim_segments: true,
        include_empty: false,
      });
      
      segmentTexts = segmentation.segments.map((s) => s.text);
    }
    
    const inputHash = useStreaming 
      ? sha256(fs.readFileSync(filePath, "utf8")) // For streaming, compute hash separately
      : sha256(fs.readFileSync(filePath, "utf8"));
    
    const tSeg = nowMs();

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 2-3: ANALYZE & BUILD DNA (same for both modes)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const segmentAnalyses: SegmentAnalysis[] = [];

    for (let i = 0; i < segmentation.segments.length; i++) {
      const seg = segmentation.segments[i];
      const segText = segmentTexts[i] || seg.text;
      
      const textAnalysisResult = modules.analyze(segText);
      const analysis = modules.adaptTextAnalyzerToBridge(textAnalysisResult, `segment-${i}`);
      const dnaInputs = modules.prepareDNABuild(analysis, {
        seed: opts.seed,
        title: `Segment-${i}`,
      });

      segmentAnalyses.push({
        segment_id: seg.id,
        segment_index: i,
        segment_text: segText,
        word_count: seg.word_count,
        char_count: seg.char_count,
        line_count: seg.line_count,
        start: seg.start,
        end: seg.end,
        dnaInputs,
      });
    }
    const tAna = nowMs();

    // Build DNA per segment
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
    // PHASE 4: AGGREGATE (CRITICAL: sort by index - INV-SCALE-05)
    // ═══════════════════════════════════════════════════════════════════════════
    
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
    // BUILD OUTPUT
    // ═══════════════════════════════════════════════════════════════════════════
    
    const totalWordCount = segmentation.segments.reduce(
      (sum: number, s) => sum + s.word_count, 0
    );

    const output: ScaleOutput = {
      version: `SCALE-${VERSION}`,
      pipeline_version: PIPELINE_VERSION,
      profile: "L4",
      seed: opts.seed,
      
      streaming: {
        used: useStreaming,
        chunk_size: useStreaming ? opts.chunkSize : null,
        threshold_mb: opts.streamThresholdMB,
      },

      input: {
        file: filePath,
        hash: inputHash,
        char_count: segmentation.segments.reduce((sum: number, s) => s.char_count, 0),
        word_count: totalWordCount,
        size_bytes: fileSizeBytes,
      },

      perf: {
        read_ms: tRead - t0,
        segment_ms: tSeg - tRead,
        analyze_ms: tAna - tSeg,
        dna_ms: tDNA - tAna,
        aggregate_ms: tAgg - tDNA,
        total_ms: tAgg - t0,
        streaming_used: useStreaming,
      },

      segmentation: {
        mode: opts.mode,
        segmentation_hash: segmentation.segmentation_hash,
        segment_count: segmentation.segments.length,
        coverage_ratio: segmentation.coverage_ratio ?? 1.0,
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
      streaming: useStreaming,
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
      streaming: useStreaming,
      error: message,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  fs.mkdirSync(args.outDir, { recursive: true });

  log("", args.verbose);
  log("═══════════════════════════════════════════════════════════════════════════════", args.verbose);
  log("  OMEGA PIPELINE SCALE v" + VERSION + " — NASA-GRADE + STREAMING", args.verbose);
  log("═══════════════════════════════════════════════════════════════════════════════", args.verbose);
  log(`  Inputs:           ${args.inputs.length} file(s)`, args.verbose);
  log(`  Output Dir:       ${path.resolve(args.outDir)}`, args.verbose);
  log(`  Mode:             ${args.mode}`, args.verbose);
  log(`  Seed:             ${args.seed}`, args.verbose);
  log(`  Concurrency:      ${args.concurrency}`, args.verbose);
  log(`  Include Text:     ${args.includeText ? "YES" : "NO"}`, args.verbose);
  log(`  Force Stream:     ${args.forceStream ? "YES" : "AUTO (>${args.streamThresholdMB}MB)"}`, args.verbose);
  log(`  Chunk Size:       ${args.chunkSize} bytes`, args.verbose);
  log("───────────────────────────────────────────────────────────────────────────────", args.verbose);

  // ═══════════════════════════════════════════════════════════════════════════
  // LOAD MODULES
  // ═══════════════════════════════════════════════════════════════════════════

  log("\n[INIT] Loading modules...", args.verbose);

  const { segmentText } = await import("./packages/omega-segment-engine/src/index.js");
  const { analyze } = await import("./src/text_analyzer/index.js");
  const { adaptTextAnalyzerToBridge } = await import("./text_analyzer_adapter.js");
  const { prepareDNABuild } = await import("./packages/omega-bridge-ta-mycelium/src/bridge/analysis_to_dna.js");
  const { buildMyceliumDNA } = await import("./packages/mycelium-bio/src/dna_builder.js");
  const { aggregateDNA, MyceliumDNAAdapter } = await import("./packages/omega-aggregate-dna/src/index.js");

  // Try to load streaming module (may not exist yet)
  let iterateSegmentsStreaming: Function | undefined;
  try {
    const streamingModule = await import("./packages/omega-segment-engine/src/stream/index.js");
    iterateSegmentsStreaming = streamingModule.iterateSegmentsStreaming;
    log("  ✓ Streaming module loaded", args.verbose);
  } catch {
    log("  ⚠ Streaming module not found (using non-streaming fallback)", args.verbose);
  }

  const modules = {
    segmentText,
    iterateSegmentsStreaming,
    analyze,
    adaptTextAnalyzerToBridge,
    prepareDNABuild,
    buildMyceliumDNA,
    aggregateDNA,
    MyceliumDNAAdapter,
  };

  log("  ✓ All modules loaded", args.verbose);

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESS FILES
  // ═══════════════════════════════════════════════════════════════════════════

  log("\n[PROCESS] Running batch...\n", args.verbose);

  const startedAll = nowMs();

  const results = await runPool(args.inputs, args.concurrency, async (filePath, idx) => {
    const result = await processFile(filePath, args, modules);
    
    if (args.verbose) {
      const status = result.success ? "✓" : "✗";
      const streamIcon = result.streaming ? "🌊" : "📄";
      const info = result.success 
        ? `seg=${result.segments} | ${result.ms}ms | ${streamIcon} | root=${result.rootHash.substring(0, 16)}...`
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
  const streamedResults = results.filter(r => r.streaming);
  const avgMs = successResults.length > 0 
    ? Math.round(successResults.reduce((a, r) => a + r.ms, 0) / successResults.length)
    : 0;
  const totalSegments = successResults.reduce((a, r) => a + r.segments, 0);

  log("", args.verbose);
  log("═══════════════════════════════════════════════════════════════════════════════", args.verbose);
  log("  SCALE RUN COMPLETE", args.verbose);
  log("═══════════════════════════════════════════════════════════════════════════════", args.verbose);
  log(`  Files Processed:  ${successResults.length}/${results.length}`, args.verbose);
  log(`  Files Streamed:   ${streamedResults.length}/${results.length}`, args.verbose);
  log(`  Total Segments:   ${totalSegments}`, args.verbose);
  log(`  Total Time:       ${totalMs}ms`, args.verbose);
  log(`  Avg per File:     ${avgMs}ms`, args.verbose);
  log(`  Concurrency:      ${args.concurrency}`, args.verbose);

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
    streaming: {
      force: args.forceStream,
      threshold_mb: args.streamThresholdMB,
      chunk_size: args.chunkSize,
    },
    files_total: results.length,
    files_success: successResults.length,
    files_failed: failedResults.length,
    files_streamed: streamedResults.length,
    total_segments: totalSegments,
    total_ms: totalMs,
    avg_ms: avgMs,
    results: results.map(r => ({
      file: r.file,
      out: r.out,
      success: r.success,
      streaming: r.streaming,
      ms: r.ms,
      segments: r.segments,
      rootHash: r.rootHash || null,
      error: r.error || null,
    })),
  };
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf8");

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
