// Test FR emotion detection
const { analyzeEmotionFromText, computeArousal } = require('C:/Users/elric/omega-project/packages/omega-forge/dist/physics/trajectory-analyzer.js');

const testFR = 'Les racines de Lena s enfonçaient dans le parchemin. Chaque trait de plume creusait plus profond. La chaleur de sa paume irradiait. Quatre cents ans. Le chiffre s enracinait dans sa gorge. Cendreville respirait. Lena sentait cette respiration. Sa main tremblait. De mémoire. Les strates de confiance se superposaient. La douleur sourde. Elle ferma les yeux. L oubli effacait les rues.';

try {
  const result = analyzeEmotionFromText(testFR);
  const arousal = computeArousal(result);
  console.log('=== analyzeEmotionFromText on FR prose ===');
  console.log(JSON.stringify(result, null, 2));
  console.log('arousal:', arousal);
  const nonZero = Object.entries(result).filter(([k,v]) => v > 0);
  console.log('Non-zero dims:', nonZero.length);
  nonZero.forEach(([k,v]) => console.log('  ' + k + ' = ' + v.toFixed(3)));
} catch(e) {
  console.error('ERROR:', e.message);
  console.error(e.stack);
}
