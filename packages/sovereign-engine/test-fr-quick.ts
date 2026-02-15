import { analyzeEmotionFromText, computeArousal } from '@omega/omega-forge';

const textFR = `Les racines de Léna s'enfonçaient dans le parchemin comme dans une terre familière. Chaque trait de plume creusait plus profond que la surface. La chaleur de sa paume irradiait contre le papier tandis qu'elle traçait la rue des Tisserands, cette artère qui pulsait encore sous les cendres.`;

console.log("=== TEST analyzeEmotionFromText FR ===");
const state = analyzeEmotionFromText(textFR);
console.log("State:", JSON.stringify(state, null, 2));
const arousal = computeArousal(state);
console.log("Arousal:", arousal);
const nonZero = Object.entries(state).filter(([_k, v]) => (v as number) > 0);
console.log("Non-zero dims:", nonZero.length, nonZero.map(([k,v]) => `${k}=${v}`).join(', '));

// Test with explicit 'fr'
console.log("\n=== EXPLICIT language='fr' ===");
const stateFR = analyzeEmotionFromText(textFR, 'fr');
console.log("State FR:", JSON.stringify(stateFR, null, 2));
const nonZeroFR = Object.entries(stateFR).filter(([_k, v]) => (v as number) > 0);
console.log("Non-zero dims FR:", nonZeroFR.length, nonZeroFR.map(([k,v]) => `${k}=${v}`).join(', '));
