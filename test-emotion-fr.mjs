import { analyzeEmotionFromText, computeArousal } from './packages/omega-forge/dist/physics/trajectory-analyzer.js';

const frProse = "La peur s'enfoncait dans sa gorge. Elle tremblait de terreur face a l'obscurite. La chaleur de sa paume contre le papier, tendresse et confiance melees. Sa colere montait, furieuse.";

const result = analyzeEmotionFromText(frProse);
console.log('FR RESULT:', JSON.stringify(result, null, 2));
console.log('FR AROUSAL:', computeArousal(result));

const enProse = "Fear gripped her throat. She trembled with terror in the darkness. Warmth of her palm, tenderness and trust. Anger rose, furious.";
const resultEN = analyzeEmotionFromText(enProse);
console.log('EN RESULT:', JSON.stringify(resultEN, null, 2));
console.log('EN AROUSAL:', computeArousal(resultEN));
