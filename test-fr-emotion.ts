import { analyzeEmotionFromText } from '@omega/omega-forge';

const frText = "Les racines de Lena s'enfoncaient dans le parchemin. La peur et l'angoisse envahissaient sa gorge. Elle tremblait de colere face a l'obscurite. Un espoir fragile, une joie sourde, la confiance qui s'enracinait.";

const result = analyzeEmotionFromText(frText);
console.log("=== FR EMOTION ANALYSIS ===");
for (const [key, val] of Object.entries(result)) {
  if ((val as number) > 0) console.log(`  ${key}: ${(val as number).toFixed(3)}`);
}
const total = Object.values(result).reduce((a: number, b) => a + (b as number), 0);
console.log(`TOTAL non-zero sum: ${total.toFixed(3)}`);
if (total === 0) console.log("BUG CONFIRMED: all zeros - FR not detected");
else console.log("PASS: FR emotions detected");
