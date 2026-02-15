const fs = require('fs');
const f = 'C:/Users/elric/omega-project/packages/sovereign-engine/src/symbol/symbol-mapper.ts';
let c = fs.readFileSync(f, 'utf8');
const lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('CRITICAL') || lines[i].includes('CRITIQUE')) {
    lines[i] = "  prompt += '**CRITIQUE \u2014 LANGUE** : TOUT le contenu textuel (signature_hooks, lexical_fields, one_line_commandment, forbidden_moves, taboos) DOIT \u00eatre en FRAN\u00c7AIS. La prose sera \u00e9crite en fran\u00e7ais litt\u00e9raire premium. G\u00e9n\u00e9rer des expressions fran\u00e7aises concr\u00e8tes et d\u00e9tectables (ex: \"racines enchev\u00eatr\u00e9es\", \"ancrage thermique\", \"chaleur soutenue\").\\n';";
    console.log('REPLACED line ' + i);
    break;
  }
}
c = lines.join('\n');
fs.writeFileSync(f, c, 'utf8');
console.log('DONE');
