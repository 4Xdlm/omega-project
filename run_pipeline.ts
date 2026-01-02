import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SEED = 42;

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('Usage: npx tsx run_pipeline.js <input_file> [output_file]');
    process.exit(1);
  }
  
  const inputFile = args[0];
  const outputFile = args[1] || 'MyceliumDNA.json';
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  OMEGA PIPELINE v1.0.0');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Input:  ${inputFile}`);
  console.log(`  Output: ${outputFile}`);
  console.log(`  Seed:   ${SEED}`);
  console.log('───────────────────────────────────────────────────────────────');
  
  // 1. Load analysis
  console.log('\n[1/3] Loading analysis...');
  const dumpPath = path.join(__dirname, 'dump_analysis.json');
  if (!fs.existsSync(dumpPath)) {
    console.error('ERROR: dump_analysis.json not found');
    process.exit(1);
  }
  const analysis = JSON.parse(fs.readFileSync(dumpPath, 'utf-8'));
  console.log(`  ✓ Loaded: ${analysis.total_emotion_hits} emotion hits`);
  console.log(`  ✓ Dominant: ${analysis.dominant_emotion}`);
  
  // 2. Bridge
  console.log('\n[2/3] Building bridge data...');
  const { prepareDNABuild, validateDNAInputs } = await import('./packages/omega-bridge-ta-mycelium/src/bridge/analysis_to_dna.ts');
  
  const dnaInputs = prepareDNABuild(analysis, { seed: SEED, title: path.basename(inputFile) });
  const validation = validateDNAInputs(dnaInputs);
  if (!validation.valid) {
    console.error('ERROR:', validation.errors);
    process.exit(1);
  }
  console.log(`  ✓ ${dnaInputs.segments.length} segments`);
  console.log(`  ✓ Hash: ${dnaInputs.bridgeData.contentHash.substring(0, 16)}...`);
  
  // 3. DNA
  console.log('\n[3/3] Building MyceliumDNA...');
  const { buildMyceliumDNA } = await import('./packages/mycelium-bio/src/dna_builder.ts');
  
  const dna = buildMyceliumDNA(dnaInputs.segments, dnaInputs.options);
  console.log(`  ✓ ${dna.nodes.length} nodes`);
  console.log(`  ✓ Root: ${dna.rootHash.substring(0, 16)}...`);
  
  // 4. Save
  fs.writeFileSync(outputFile, JSON.stringify(dna, null, 2), 'utf-8');
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  PIPELINE COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Output: ${outputFile}`);
  console.log(`  Root Hash: ${dna.rootHash}`);
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
