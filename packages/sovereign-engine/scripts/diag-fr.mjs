import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  // Import from omega-forge dist via workspace link
  const { analyzeEmotionFromText, cosineSimilarity14D, computeArousal } = await import('@omega/omega-forge');
  
  // Load prose
  const prosePath = resolve(__dirname, '..', '..', '..', 'metrics', 's', 'LIVE1_FR', 'run_000', 'final_prose.txt');
  const prose = readFileSync(prosePath, 'utf8');
  
  const paragraphs = prose.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  console.log(`Paragraphs: ${paragraphs.length}`);
  
  // Full prose analysis
  const fullState = analyzeEmotionFromText(prose);
  const arousal = computeArousal(fullState);
  console.log('\n=== FULL PROSE 14D ===');
  for (const [k, v] of Object.entries(fullState)) {
    if (v > 0) console.log(`  ${k}: ${v.toFixed(3)}`);
  }
  console.log(`  AROUSAL: ${arousal.toFixed(3)}`);

  // Per paragraph
  console.log('\n=== PER PARAGRAPH ===');
  paragraphs.forEach((p, i) => {
    const s = analyzeEmotionFromText(p);
    const a = computeArousal(s);
    const nonZero = Object.entries(s).filter(([_, v]) => v > 0).map(([k, v]) => `${k}=${v.toFixed(2)}`);
    console.log(`P${i}: arousal=${a.toFixed(3)} | ${nonZero.join(', ') || 'ALL ZERO'}`);
  });

  // Simple FR test
  console.log('\n=== SIMPLE FR TEST ===');
  const testFR = 'La peur et la colère envahissaient son coeur. Il tremblait de terreur face à la douleur intense.';
  const testState = analyzeEmotionFromText(testFR);
  for (const [k, v] of Object.entries(testState)) {
    if (v > 0) console.log(`  ${k}: ${v.toFixed(3)}`);
  }
  console.log(`  AROUSAL: ${computeArousal(testState).toFixed(3)}`);
  
  // Normalization proof
  console.log('\n=== NORMALIZATION PROOF ===');
  const words = ['colère', 'dégoût', 'mémoire', 'chaleur', 'peur', 'confiance', 'douleur', 'trembler'];
  for (const w of words) {
    const n = w.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
    console.log(`  "${w}" → "${n}"`);
  }
}

main().catch(e => console.error('ERROR:', e.message, e.stack));
