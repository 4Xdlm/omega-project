/**
 * Quick diagnostic: does analyzeEmotionFromText actually detect FR emotions?
 */
import { analyzeEmotionFromText, computeArousal } from '@omega/omega-forge';

const frProse = `Les racines de Léna s'enfonçaient dans le parchemin comme dans une terre familière. 
La chaleur de sa paume irradiait contre le papier. Sa main droite tremblait imperceptiblement. 
Les strates de confiance se superposaient sous ses doigts. La douleur sourde dans sa poitrine.
Elle ferma les yeux. La foi s'étendait jusqu'aux territoires dangereux.
L'irradiation constante de la certitude réchauffait ses épaules malgré l'air froid.`;

const result = analyzeEmotionFromText(frProse);
console.log('=== FR EMOTION VECTOR ===');
for (const [k, v] of Object.entries(result)) {
  if (v as number > 0) console.log(`  ${k} = ${v}`);
}
console.log(`arousal = ${computeArousal(result)}`);
console.log('=== ALL VALUES ===');
console.log(JSON.stringify(result, null, 2));

// Now test with explicit 'fr'
const resultFR = analyzeEmotionFromText(frProse, 'fr');
console.log('\n=== EXPLICIT FR ===');
for (const [k, v] of Object.entries(resultFR)) {
  if (v as number > 0) console.log(`  ${k} = ${v}`);
}
