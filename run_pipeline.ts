// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA PIPELINE v3.0.0 — NASA-GRADE INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════
// Segment Engine → TextAnalyzer → Bridge → DNA (per segment) → Aggregate DNA
// ═══════════════════════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const VERSION = "3.0.0";
const SEED = parseInt(process.env.OMEGA_SEED || "42", 10);

type SegmentMode = "sentence" | "paragraph" | "scene";

interface PipelineOptions {
  inputFile: string;
  outputFile: string;
  mode: SegmentMode;
  seed: number;
  verbose: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function sha256(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function log(msg: string, verbose = true) {
  if (verbose) console.log(msg);
}

function parseArgs(): PipelineOptions {
  const args = process.argv.slice(2);
  
  let inputFile = "";
  let outputFile = "output.json";
  let mode: SegmentMode = "sentence";
  let verbose = true;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--mode" && args[i + 1]) {
      mode = args[++i] as SegmentMode;
    } else if (arg === "--output" && args[i + 1]) {
      outputFile = args[++i];
    } else if (arg === "--quiet" || arg === "-q") {
      verbose = false;
    } else if (!arg.startsWith("-") && !inputFile) {
      inputFile = arg;
    }
  }
  
  if (!inputFile) {
    console.log("OMEGA PIPELINE v" + VERSION + " — NASA-Grade");
    console.log("");
    console.log("Usage: npx tsx run_pipeline.ts <input_file> [options]");
    console.log("");
    console.log("Options:");
    console.log("  --mode <sentence|paragraph|scene>  Segmentation mode (default: sentence)");
    console.log("  --output <file>                    Output file (default: output.json)");
    console.log("  --quiet, -q                        Suppress verbose output");
    console.log("");
    console.log("Examples:");
    console.log("  npx tsx run_pipeline.ts novel.txt");
    console.log("  npx tsx run_pipeline.ts novel.txt --mode paragraph --output novel_dna.json");
    process.exit(1);
  }
  
  return { inputFile, outputFile, mode, seed: SEED, verbose };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PIPELINE
// ─────────────────────────────────────────────────────────────────────────────

async function runPipeline(opts: PipelineOptions) {
  const startTime = Date.now();
  
  log("", opts.verbose);
  log("═══════════════════════════════════════════════════════════════════════════════", opts.verbose);
  log("  OMEGA PIPELINE v" + VERSION + " — NASA-GRADE", opts.verbose);
  log("═══════════════════════════════════════════════════════════════════════════════", opts.verbose);
  log("  Input:  " + opts.inputFile, opts.verbose);
  log("  Output: " + opts.outputFile, opts.verbose);
  log("  Mode:   " + opts.mode, opts.verbose);
  log("  Seed:   " + opts.seed, opts.verbose);
  log("───────────────────────────────────────────────────────────────────────────────", opts.verbose);

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 1: LOAD & SEGMENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  log("\n[1/5] Loading and segmenting text...", opts.verbose);
  
  if (!fs.existsSync(opts.inputFile)) {
    throw new Error("Input file not found: " + opts.inputFile);
  }
  
  const rawText = fs.readFileSync(opts.inputFile, 'utf-8');
  const inputHash = sha256(rawText);
  
  // Import segment engine
  const { segmentText } = await import('./packages/omega-segment-engine/src/index.js');
  
  const segmentation = segmentText(rawText, {
    mode: opts.mode,
    newline_policy: "normalize_lf",
    trim_segments: true,
    include_empty: false,
  });
  
  log("  ✓ " + segmentation.segments.length + " segments (" + opts.mode + " mode)", opts.verbose);
  log("  ✓ Hash: " + segmentation.segmentation_hash.substring(0, 16) + "...", opts.verbose);

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 2: ANALYZE EACH SEGMENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  log("\n[2/5] Analyzing segments (TextAnalyzer)...", opts.verbose);
  
  const { analyze: analyzeText } = await import("./src/text_analyzer/index.js");
  const { adaptTextAnalyzerToBridge } = await import("./text_analyzer_adapter.js");
  const { prepareDNABuild } = await import('./packages/omega-bridge-ta-mycelium/src/bridge/analysis_to_dna.js');
  
  const segmentAnalyses: any[] = [];
  
  for (let i = 0; i < segmentation.segments.length; i++) {
    const seg = segmentation.segments[i];
    
    // Analyze segment text
    const textAnalysisResult = analyzeText(seg.text);
    const analysis = adaptTextAnalyzerToBridge(textAnalysisResult, "segment-" + i);
    
    // Prepare DNA inputs via bridge
    const dnaInputs = prepareDNABuild(analysis, {
      seed: opts.seed,
      title: "Segment-" + i,
    });
    
    segmentAnalyses.push({
      segment_id: seg.id,
      segment_index: i,
      segment_text: seg.text,
      word_count: seg.word_count,
      char_count: seg.char_count,
      analysis,
      dnaInputs,
    });
  }
  
  log("  ✓ " + segmentAnalyses.length + " segments analyzed", opts.verbose);

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 3: BUILD DNA FOR EACH SEGMENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  log("\n[3/5] Building MyceliumDNA per segment...", opts.verbose);
  
  const { buildMyceliumDNA } = await import('./packages/mycelium-bio/src/dna_builder.js');
  
  const segmentDNAs: any[] = [];
  
  for (const segAnalysis of segmentAnalyses) {
    const dna = buildMyceliumDNA(segAnalysis.dnaInputs.segments, {
      seed: opts.seed,
      title: "Segment-" + segAnalysis.segment_index,
      rawText: segAnalysis.segment_text,
    });
    
    segmentDNAs.push({
      segment_id: segAnalysis.segment_id,
      segment_index: segAnalysis.segment_index,
      word_count: segAnalysis.word_count,
      dna,
    });
  }
  
  log("  ✓ " + segmentDNAs.length + " DNA structures built", opts.verbose);

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 4: AGGREGATE DNA (GLOBAL)
  // ═══════════════════════════════════════════════════════════════════════════
  
  log("\n[4/5] Aggregating to global DNA...", opts.verbose);
  
  const { aggregateDNA, MyceliumDNAAdapter } = await import('./packages/omega-aggregate-dna/src/index.js');
  
  const dnaList = segmentDNAs.map(s => s.dna);
  const wordCounts = segmentDNAs.map(s => s.word_count);
  
  const aggregateResult = aggregateDNA(
    {
      seed: opts.seed,
      version: VERSION,
      segmentDNAs: dnaList,
      segmentWeights: wordCounts,
      segmentationHash: segmentation.segmentation_hash,
    },
    MyceliumDNAAdapter
  );
  
  log("  ✓ Merkle root: " + aggregateResult.aggregation.merkle_root.substring(0, 16) + "...", opts.verbose);
  log("  ✓ Global root: " + aggregateResult.dna.rootHash.substring(0, 16) + "...", opts.verbose);

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 5: BUILD OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════
  
  log("\n[5/5] Building output...", opts.verbose);
  
  const processingTime = Date.now() - startTime;
  
  const output = {
    version: VERSION,
    profile: "L4",
    seed: opts.seed,
    
    input: {
      path: opts.inputFile,
      hash: inputHash,
      char_count: rawText.length,
      word_count: segmentation.segments.reduce((sum, s) => sum + s.word_count, 0),
    },
    
    segmentation: {
      mode: opts.mode,
      segmentation_hash: segmentation.segmentation_hash,
      segment_count: segmentation.segments.length,
      coverage_ratio: segmentation.coverage_ratio,
    },
    
    segments: segmentation.segments.map(s => ({
      id: s.id,
      index: s.index,
      start: s.start,
      end: s.end,
      word_count: s.word_count,
      char_count: s.char_count,
      line_count: s.line_count,
      // text: s.text, // Uncomment to include text (increases file size)
    })),
    
    segment_dnas: segmentDNAs.map(sd => ({
      segment_id: sd.segment_id,
      segment_index: sd.segment_index,
      rootHash: sd.dna.rootHash,
      nodeCount: sd.dna.nodes.length,
      fingerprint: sd.dna.fingerprint,
    })),
    
    global_dna: {
      rootHash: aggregateResult.dna.rootHash,
      version: aggregateResult.dna.version,
      profile: aggregateResult.dna.profile,
      fingerprint: aggregateResult.dna.fingerprint,
      aggregation: aggregateResult.aggregation,
    },
    
    meta: {
      pipeline_version: VERSION,
      computed_at: new Date().toISOString(),
      processing_time_ms: processingTime,
      deterministic: true,
    },
  };
  
  // Write output
  fs.writeFileSync(opts.outputFile, JSON.stringify(output, null, 2), 'utf-8');
  
  log("", opts.verbose);
  log("═══════════════════════════════════════════════════════════════════════════════", opts.verbose);
  log("  PIPELINE COMPLETE ✓", opts.verbose);
  log("═══════════════════════════════════════════════════════════════════════════════", opts.verbose);
  log("  Output:     " + opts.outputFile, opts.verbose);
  log("  Segments:   " + segmentation.segments.length, opts.verbose);
  log("  Root Hash:  " + aggregateResult.dna.rootHash, opts.verbose);
  log("  Time:       " + processingTime + "ms", opts.verbose);
  log("═══════════════════════════════════════════════════════════════════════════════", opts.verbose);

  return output;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

const opts = parseArgs();

runPipeline(opts)
  .then(() => process.exit(0))
  .catch(err => {
    console.error("\n❌ PIPELINE ERROR:", err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  });



