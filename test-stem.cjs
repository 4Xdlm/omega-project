function normalizeToken(word) {
  return word
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2019\u2018]/g, "'")
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

// Test: does "tremblait" match keyword "trembler"?
const word = "tremblait";
const cleaned = normalizeToken(word);
const kw = "trembler";
console.log(`"${word}" -> "${cleaned}"`);
console.log(`cleaned === kw: ${cleaned === kw}`);
console.log(`cleaned.startsWith(kw): ${cleaned.startsWith(kw)}`);
// tremblait does NOT start with trembler!

// What about stems?
const stem_tests = [
  ["tremblait", "trembl"],
  ["douleur", "douleur"],
  ["raidit", "raid"],
  ["crainte", "crainte"],
  ["mémoire", "memoire"],
  ["obscurité", "obscurit"],
  ["chaleur", "chaleur"],
  ["enracinait", "enracin"],
  ["s'enfonçaient", "enfon"],
];
console.log('\n=== STEM MATCHING ===');
for (const [w, stem] of stem_tests) {
  const c = normalizeToken(w);
  console.log(`"${w}" -> "${c}" startsWith("${stem}"): ${c.startsWith(stem)}`);
}
