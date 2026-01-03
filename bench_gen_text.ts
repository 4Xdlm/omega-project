// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA BENCH — TEXT GENERATOR v1.0.0
// ═══════════════════════════════════════════════════════════════════════════════
// Génère des fichiers texte de test pour benchmarks et stress tests
// ═══════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const VERSION = "1.0.0";

// Phrases avec variété émotionnelle (FR + EN)
const SENTENCES_FR = [
  "Il avait peur, une peur sourde qui lui nouait l'estomac.",
  "Puis il ressentit de la joie, une joie pure et inattendue!",
  "Soudain, tout changea. Le monde bascula.",
  "Elle sourit, les yeux brillants de bonheur.",
  "La colère montait en lui, irrépressible.",
  "Un sentiment de tristesse l'envahit lentement.",
  "L'espoir renaissait, fragile mais tenace.",
  "Il était surpris par cette révélation soudaine.",
  "La confiance qu'il avait en elle était inébranlable.",
  "Le dégoût se lisait sur son visage.",
  "L'amour qu'ils partageaient était plus fort que tout.",
  "La honte le submergea, brûlante et cuisante.",
  "Il ressentait une fierté immense devant son accomplissement.",
  "Le désespoir s'abattit sur elle comme une chape de plomb.",
];

const SENTENCES_EN = [
  "Fear gripped him, a cold fear that turned his blood to ice.",
  "Then joy washed over him, pure and unexpected!",
  "Suddenly, everything changed. The world shifted.",
  "She smiled, her eyes shining with happiness.",
  "Anger rose within him, unstoppable.",
  "A feeling of sadness slowly enveloped him.",
  "Hope was reborn, fragile but persistent.",
  "He was surprised by this sudden revelation.",
  "The trust he had in her was unshakeable.",
  "Disgust was written all over his face.",
  "The love they shared was stronger than anything.",
  "Shame overwhelmed him, burning and stinging.",
  "He felt immense pride at his accomplishment.",
  "Despair fell upon her like a lead weight.",
];

// ─────────────────────────────────────────────────────────────────────────────
// GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

interface GenOptions {
  lines: number;
  lang: "fr" | "en" | "mixed";
  paragraphEvery: number;
  sceneEvery: number;
  seed: number;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function generateText(opts: GenOptions): string {
  const random = seededRandom(opts.seed);
  const sentences = opts.lang === "fr" 
    ? SENTENCES_FR 
    : opts.lang === "en" 
      ? SENTENCES_EN 
      : [...SENTENCES_FR, ...SENTENCES_EN];

  const lines: string[] = [];

  for (let i = 0; i < opts.lines; i++) {
    // Pick a sentence deterministically based on seed
    const idx = Math.floor(random() * sentences.length);
    const sentence = sentences[idx];
    
    lines.push(`${i + 1}. ${sentence}`);

    // Add paragraph breaks
    if (opts.paragraphEvery > 0 && (i + 1) % opts.paragraphEvery === 0) {
      lines.push("");
    }

    // Add scene separators
    if (opts.sceneEvery > 0 && (i + 1) % opts.sceneEvery === 0) {
      lines.push("");
      lines.push("###");
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────

function printUsage(): void {
  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log("  OMEGA BENCH — TEXT GENERATOR v" + VERSION);
  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log("");
  console.log("Usage: npx tsx bench_gen_text.ts <output_file> [lines] [options]");
  console.log("");
  console.log("Arguments:");
  console.log("  output_file    Output file path (required)");
  console.log("  lines          Number of lines to generate (default: 10000)");
  console.log("");
  console.log("Options:");
  console.log("  --lang <fr|en|mixed>   Language (default: mixed)");
  console.log("  --seed <int>           Random seed for reproducibility (default: 42)");
  console.log("  --paragraph <n>        Insert blank line every n lines (default: 50)");
  console.log("  --scene <n>            Insert scene separator (###) every n lines (default: 500)");
  console.log("  --no-paragraph         Disable paragraph breaks");
  console.log("  --no-scene             Disable scene separators");
  console.log("");
  console.log("Examples:");
  console.log("  npx tsx bench_gen_text.ts bench_10k.txt 10000");
  console.log("  npx tsx bench_gen_text.ts bench_100k.txt 100000 --lang fr --seed 42");
  console.log("  npx tsx bench_gen_text.ts corpus.txt 50000 --paragraph 30 --scene 300");
  console.log("");
  console.log("Presets:");
  console.log("  Small (10k):   npx tsx bench_gen_text.ts small.txt 10000");
  console.log("  Medium (100k): npx tsx bench_gen_text.ts medium.txt 100000");
  console.log("  Large (500k):  npx tsx bench_gen_text.ts large.txt 500000");
  console.log("  Stress (1M):   npx tsx bench_gen_text.ts stress.txt 1000000");
  console.log("");
}

function parseArgs(): { outFile: string; opts: GenOptions } | null {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    return null;
  }

  const outFile = args[0];
  let lines = 10000;
  let lang: "fr" | "en" | "mixed" = "mixed";
  let seed = 42;
  let paragraphEvery = 50;
  let sceneEvery = 500;

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    
    if (!arg.startsWith("-") && !isNaN(Number(arg))) {
      lines = Number(arg);
    } else if (arg === "--lang" && args[i + 1]) {
      lang = args[++i] as "fr" | "en" | "mixed";
    } else if (arg === "--seed" && args[i + 1]) {
      seed = Number(args[++i]);
    } else if (arg === "--paragraph" && args[i + 1]) {
      paragraphEvery = Number(args[++i]);
    } else if (arg === "--scene" && args[i + 1]) {
      sceneEvery = Number(args[++i]);
    } else if (arg === "--no-paragraph") {
      paragraphEvery = 0;
    } else if (arg === "--no-scene") {
      sceneEvery = 0;
    }
  }

  return {
    outFile,
    opts: { lines, lang, seed, paragraphEvery, sceneEvery },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

function main(): void {
  const parsed = parseArgs();
  if (!parsed) {
    process.exit(0);
  }

  const { outFile, opts } = parsed;

  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log("  OMEGA BENCH — TEXT GENERATOR v" + VERSION);
  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log(`  Output:     ${outFile}`);
  console.log(`  Lines:      ${opts.lines.toLocaleString()}`);
  console.log(`  Language:   ${opts.lang}`);
  console.log(`  Seed:       ${opts.seed}`);
  console.log(`  Paragraph:  ${opts.paragraphEvery > 0 ? `every ${opts.paragraphEvery} lines` : "disabled"}`);
  console.log(`  Scene:      ${opts.sceneEvery > 0 ? `every ${opts.sceneEvery} lines` : "disabled"}`);
  console.log("───────────────────────────────────────────────────────────────────────────────");

  const startTime = Date.now();
  const text = generateText(opts);
  const generateTime = Date.now() - startTime;

  fs.writeFileSync(outFile, text, "utf8");
  const writeTime = Date.now() - startTime;

  const stats = fs.statSync(outFile);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

  console.log("");
  console.log("  ✓ Generated in " + generateTime + "ms");
  console.log("  ✓ Written in " + writeTime + "ms");
  console.log("");
  console.log("  File Size:  " + sizeMB + " MB");
  console.log("  Characters: " + text.length.toLocaleString());
  console.log("  Words:      " + wordCount.toLocaleString());
  console.log("  Lines:      " + opts.lines.toLocaleString());
  console.log("═══════════════════════════════════════════════════════════════════════════════");
}

main();
