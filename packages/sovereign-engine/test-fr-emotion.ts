// Test FR emotion detection — ESM
import { analyzeEmotionFromText, computeArousal } from '@omega/omega-forge';

const testFR = "Les racines de Lena s'enfoncaient dans le parchemin. La chaleur de sa paume irradiait. Sa main tremblait de peur. Les strates de confiance. La douleur sourde. L'oubli effacait les rues. Elle aimait cette chaleur. Colere et rage dans ses veines.";

const result = analyzeEmotionFromText(testFR);
const arousal = computeArousal(result);

console.log('=== FR EMOTION TEST ===');
console.log(JSON.stringify(result, null, 2));
console.log('arousal:', arousal);

for (const [k, v] of Object.entries(result)) {
  if ((v as number) > 0) {
    console.log(`  HIT: ${k} = ${(v as number).toFixed(3)}`);
  }
}

// Also test EN baseline
const testEN = "She felt joy and happiness. Fear crept through her. Anger and rage burned. She loved him with tender devotion.";
const resultEN = analyzeEmotionFromText(testEN);
console.log('\n=== EN EMOTION TEST ===');
for (const [k, v] of Object.entries(resultEN)) {
  if ((v as number) > 0) {
    console.log(`  HIT: ${k} = ${(v as number).toFixed(3)}`);
  }
}
