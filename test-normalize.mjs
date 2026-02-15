// Direct test - no external imports, just copy the logic
function normalizeToken(word) {
  return word
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2019\u2018]/g, "'")
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

const EMOTION_KEYWORDS_FR = {
  fear: ['peur', 'effroi', 'terreur', 'paniqu', 'angoiss', 'inquiet', 'crain', 'menac', 'trembl'],
  anger: ['coler', 'rage', 'fureur', 'furieu', 'haine'],
  joy: ['joie', 'heureux', 'souri', 'rire', 'jubil', 'content', 'ravis', 'plaisir'],
  trust: ['confian', 'fier', 'serein', 'apais', 'enracin', 'certitud', 'ancr'],
  sadness: ['triste', 'chagrin', 'pleur', 'larme', 'douleur', 'desespo', 'peine'],
};

const testWords = [
  'colère', 'dégoût', 'mémoire', 'peur', 'angoisse', 'tremblait', 
  'joie', 'confiance', 'enracinait', 'obscurité'
];

console.log("=== NORMALIZE TEST ===");
for (const w of testWords) {
  console.log(`  "${w}" -> "${normalizeToken(w)}"`);
}

console.log("\n=== MATCH TEST ===");
const frText = "Les racines s'enfoncaient. La peur et l'angoisse envahissaient sa gorge. Elle tremblait de colère. Un espoir fragile, une joie sourde, la confiance qui s'enracinait.";
const words = frText.split(/\s+/);

for (const word of words) {
  const cleaned = normalizeToken(word);
  if (cleaned.length === 0) continue;
  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS_FR)) {
    for (const kw of keywords) {
      if (cleaned === kw || cleaned.startsWith(kw)) {
        console.log(`  HIT: "${word}" -> "${cleaned}" matches ${emotion}:${kw}`);
      }
    }
  }
}
console.log("\nDONE");
