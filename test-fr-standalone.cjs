// Standalone test: FR emotion detection
// No imports from omega-forge - just copy the logic

const EMOTION_14_KEYS = [
  'joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger',
  'anticipation', 'love', 'submission', 'awe', 'disapproval', 'remorse', 'contempt',
];

const EMOTION_KEYWORDS = {
  joy: ['joy', 'happy', 'delight', 'laugh', 'smile', 'warmth', 'elation', 'cheer', 'bliss', 'glee', 'jubilant'],
  trust: ['trust', 'faith', 'believe', 'rely', 'confident', 'safe', 'secure', 'loyal', 'steady', 'assurance'],
  fear: ['fear', 'terror', 'dread', 'panic', 'fright', 'horror', 'anxiety', 'afraid', 'tremble', 'shudder', 'dark', 'shadow', 'creep'],
  surprise: ['surprise', 'shock', 'astonish', 'unexpected', 'sudden', 'gasp', 'startle', 'stun', 'jolt', 'revelation'],
  sadness: ['sad', 'sorrow', 'grief', 'mourn', 'weep', 'cry', 'loss', 'melancholy', 'despair', 'lonely', 'ache'],
  disgust: ['disgust', 'revulsion', 'repulse', 'nausea', 'loathe', 'abhor', 'vile', 'foul', 'putrid', 'recoil'],
  anger: ['anger', 'rage', 'fury', 'wrath', 'hostile', 'furious', 'bitter', 'resent', 'seethe', 'burn', 'violent'],
  anticipation: ['anticipation', 'expect', 'await', 'hope', 'eager', 'watchful', 'ready', 'prepare', 'yearn', 'suspense'],
  love: ['love', 'adore', 'cherish', 'devotion', 'tender', 'embrace', 'affection', 'intimate', 'beloved', 'passion'],
  submission: ['submit', 'yield', 'obey', 'surrender', 'defer', 'comply', 'accept', 'resign', 'bow', 'passive'],
  awe: ['awe', 'wonder', 'marvel', 'magnificent', 'sublime', 'vast', 'profound', 'transcend', 'majestic', 'overwhelm'],
  disapproval: ['disapprove', 'reject', 'refuse', 'deny', 'condemn', 'criticize', 'oppose', 'object', 'scorn', 'disdain'],
  remorse: ['remorse', 'regret', 'guilt', 'shame', 'sorry', 'repent', 'atone', 'contrite', 'blame', 'fault'],
  contempt: ['contempt', 'scorn', 'disdain', 'mock', 'deride', 'sneer', 'belittle', 'dismiss', 'arrogant', 'superior'],
};

const EMOTION_KEYWORDS_FR = {
  joy: ['joie', 'heureux', 'heureuse', 'sourire', 'rire', 'jubilation', 'content', 'ravissement', 'plaisir', 'enchantement', 'allegresse', 'bonheur'],
  trust: ['confiance', 'fier', 'fiere', 'serein', 'sereine', 'apaisement', 'assurance', 'foi', 'loyal', 'stable', 'securite', 'certitude'],
  fear: ['peur', 'effroi', 'terreur', 'panique', 'angoisse', 'inquiet', 'inquiete', 'crainte', 'menace', 'trembler', 'frayeur', 'epouvante'],
  surprise: ['surprise', 'stupeur', 'etonne', 'etonnee', 'choc', 'soudain', 'brusque', 'inattendu', 'abasourdi', 'surprendre', 'stupefait'],
  sadness: ['tristesse', 'chagrin', 'melancolie', 'pleurer', 'larme', 'abattu', 'abattue', 'deuil', 'douleur', 'solitude', 'desespoir', 'peine'],
  disgust: ['degout', 'repulsion', 'ecoeurement', 'nausee', 'immonde', 'infect', 'pourri', 'rance', 'rebutant', 'repugnant', 'aversion'],
  anger: ['colere', 'rage', 'fureur', 'furieux', 'furieuse', 'haine', 'agacement', 'irrite', 'irritee', 'exploser', 'emportement', 'hostil'],
  anticipation: ['attente', 'anticiper', 'pressentir', 'prevoir', 'bientot', 'imminence', 'preparer', 'espoir', 'apprehension', 'guetter', 'impatien'],
  love: ['amour', 'aimer', 'tendresse', 'affection', 'cherir', 'desir', 'passion', 'intime', 'enlace', 'chaleur', 'devouement', 'adoration'],
  submission: ['soumission', 'obeir', 'docile', 'ceder', 'plier', 'capituler', 'consentir', 'subir', 'resigne', 'resignee', 'accepter'],
  awe: ['admiration', 'reverence', 'sublime', 'vertige', 'grandiose', 'sacre', 'fascination', 'epoustouflant', 'majestueux', 'emerveillement'],
  disapproval: ['desapprobation', 'reproche', 'blamer', 'condamner', 'critique', 'mepris', 'desaccord', 'severite', 'reprimande', 'censure'],
  remorse: ['remords', 'regret', 'culpabilite', 'honte', 'pardonner', 'excuse', 'repentir', 'faute', 'desole', 'desolee', 'contrition'],
  contempt: ['mepris', 'dedain', 'ironie', 'sarcasme', 'condescendance', 'ricaner', 'rabaisser', 'insignifiant', 'minable', 'derision'],
};

function normalizeToken(word) {
  return word
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2019\u2018]/g, "'")
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

function analyzeEmotionFromText(text, language = 'auto') {
  const words = text.split(/\s+/);
  const counts = {};
  for (const key of EMOTION_14_KEYS) counts[key] = 0;

  const tables = [];
  if (language === 'en' || language === 'auto') tables.push(EMOTION_KEYWORDS);
  if (language === 'fr' || language === 'auto') tables.push(EMOTION_KEYWORDS_FR);

  for (const word of words) {
    const cleaned = normalizeToken(word);
    if (cleaned.length === 0) continue;
    for (const key of EMOTION_14_KEYS) {
      let matched = false;
      for (const table of tables) {
        for (const kw of table[key]) {
          if (cleaned === kw || cleaned.startsWith(kw)) {
            counts[key]++;
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
    }
  }

  const maxCount = Math.max(1, ...Object.values(counts));
  const state = {};
  for (const key of EMOTION_14_KEYS) {
    state[key] = Math.min(1, counts[key] / maxCount);
  }
  return state;
}

// ===== TEST =====
const fs = require('fs');
const prose = fs.readFileSync('C:\\Users\\elric\\omega-project\\metrics\\s\\LIVE1_FR\\run_000\\final_prose.txt', 'utf8');

console.log('=== LIVE1 FR PROSE ANALYSIS ===');
console.log('Prose chars:', prose.length);

const result = analyzeEmotionFromText(prose, 'auto');
console.log('\nAll dimensions:');
for (const [k, v] of Object.entries(result)) {
  console.log(`  ${k}: ${v.toFixed(4)} ${v > 0 ? 'HIT' : ''}`);
}
console.log(`\nNon-zero: ${Object.values(result).filter(v => v > 0).length}/14`);

// Show what words matched
console.log('\n=== DETAILED MATCHING ===');
const wordsInProse = prose.split(/\s+/);
for (const word of wordsInProse) {
  const cleaned = normalizeToken(word);
  if (cleaned.length === 0) continue;
  for (const key of EMOTION_14_KEYS) {
    for (const kw of EMOTION_KEYWORDS_FR[key]) {
      if (cleaned === kw || cleaned.startsWith(kw)) {
        console.log(`  "${word}" -> "${cleaned}" => ${key} (kw="${kw}")`);
      }
    }
  }
}

// Test known emotional text
console.log('\n=== KNOWN FR EMOTIONAL TEXT ===');
const testFR = "La peur envahit son corps. La terreur la paralysait. Elle tremblait de colere et de rage.";
const r2 = analyzeEmotionFromText(testFR, 'fr');
for (const [k, v] of Object.entries(r2)) {
  if (v > 0) console.log(`  ${k}: ${v.toFixed(4)}`);
}
