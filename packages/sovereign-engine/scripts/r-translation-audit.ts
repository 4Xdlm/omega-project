/**
 * R-TRANSLATION-AUDIT — Original vs Translation FR↔EN
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyPassageDetailed } from '../src/scoring/passage-classifier.js';
import { computeAllGBFeatures } from '../src/scoring/gb-scorer.js';
import { scoreGB } from '../src/scoring/gb-inference.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TXT = path.resolve(__dirname, '../../../omega-autopsie/corpus_r/txt');
const DATA = path.resolve(__dirname, '../src/scoring/data');

function mean(v: number[]): number { return v.length ? v.reduce((a,b)=>a+b,0)/v.length : 0; }
function stdev(v: number[]): number { if(v.length<2) return 0; const m=mean(v); return Math.sqrt(v.reduce((s,x)=>s+(x-m)**2,0)/(v.length-1)); }
function r4(v: number): number { return Math.round(v*10000)/10000; }
function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?\u2026\u00bb])\s+/).map(s=>s.trim()).filter(s=>s.length>5&&s.split(/\s+/).length>=3);
}
function skipGutenberg(text: string): string {
  for(const m of ['*** START OF','***START OF']){const i=text.indexOf(m);if(i!==-1){const nl=text.indexOf('\n',i);if(nl!==-1)return text.slice(nl+1);}}
  return text;
}
function countRe(re: RegExp, t: string): number { re.lastIndex=0;const m=t.match(re);re.lastIndex=0;return m?m.length:0; }

const ADV_FR = /\b(?:mais|cependant|pourtant|neanmoins|toutefois|or|malgre|bien que|quoique|au contraire|en revanche)\b/gi;
const ADV_EN = /\b(?:but|however|yet|nevertheless|nonetheless|although|though|whereas|while|despite|still|even so|on the contrary)\b/gi;
const SILENCE_RE = /\b(?:silence|se tut|ne dit rien|immobile|fige|fell silent|said nothing|motionless|frozen|nothing moved)\b/gi;
const IRREV_RE = /\b(?:obtint|mourut|quitta|perdit|gagna|trouva|brisa|detruisit|devint|achieved|died|left|lost|won|found|broke|destroyed|became)\b/gi;
const MALAISE_RE = /\b(?:tache|moisi|insecte|etrange|bizarre|stain|mold|strange|bizarre|odd)\b/gi;
const IRONIE_RE = /\b(?:naturellement|evidemment|bien sur|apparently|of course|naturally|obviously|certainly)\b/gi;

// Translation pairs
interface Pair { author: string; original: string; translation: string; direction: 'FR_TO_EN' | 'EN_TO_FR'; }

const PAIRS: Pair[] = [
  // FR→EN
  { author: 'Hugo', original: 'hugo_miserables_17489.txt', translation: 'les_miserables_victor_hugo.txt', direction: 'FR_TO_EN' },
  { author: 'Hugo', original: 'notre_dame_de_paris_victor_hugo.txt', translation: 'the_hunchback_of_notre_dame_victor_hugo.txt', direction: 'FR_TO_EN' },
  { author: 'Hugo', original: 'hugo_travailleurs_10907.txt', translation: 'toilers_of_the_sea_by_victor_hugo_victor_hugo.txt', direction: 'FR_TO_EN' },
  { author: 'Flaubert', original: 'flaubert_bovary_14155.txt', translation: 'pdf_madame_bovary_gustave_flaubert.txt', direction: 'FR_TO_EN' },
  { author: 'Zola', original: 'zola_bete_10007.txt', translation: 'the_beast_within_emile_zola.txt', direction: 'FR_TO_EN' },
  { author: 'Zola', original: 'au_bonheur_des_dames_emile_zola.txt', translation: 'a_love_story_emile_zola.txt', direction: 'FR_TO_EN' },
  { author: 'Zola', original: 'loeuvre_emile_zola.txt', translation: 'pdf_the_kill_emile_zola.txt', direction: 'FR_TO_EN' },
  { author: 'Zola', original: 'zola_bonheur_11953.txt', translation: 'pdf_the_joy_of_life_emile_zola.txt', direction: 'FR_TO_EN' },
  { author: 'Camus', original: 'letranger_french_edition_albert_camus.txt', translation: 'pdf_the_stranger_albert_camus.txt', direction: 'FR_TO_EN' },
  { author: 'Camus', original: 'la_peste_french_edition_albert_camus.txt', translation: 'pdf_reflections_on_the_guillotine_albert_camus.txt', direction: 'FR_TO_EN' },
  { author: 'Zola', original: 'les_soirees_de_medan_emile_zola.txt', translation: 'pdf_dead_men_tell_no_tales_and_other_stories_emile_zola.txt', direction: 'FR_TO_EN' },
  { author: 'Zola', original: 'largent_emile_zola.txt', translation: 'pdf_the_attack_on_the_mill_and_other_stories_emile_zola.txt', direction: 'FR_TO_EN' },
  // EN→FR
  { author: 'Hemingway', original: 'pdf_the_sun_also_rises_ernest_hemingway.txt', translation: 'pdf_le_soleil_se_leve_aussi_french_edition_hemingway_ernest.txt', direction: 'EN_TO_FR' },
  { author: 'Hemingway', original: 'pdf_men_without_women_ernest_hemingway.txt', translation: 'pdf_le_vieil_homme_et_la_mer_french_edition_ernest_hemingway.txt', direction: 'EN_TO_FR' },
  { author: 'Steinbeck', original: 'pdf_sweet_thursday_john_steinbeck.txt', translation: 'pdf_des_souris_et_des_hommes_french_edition_john_steinbeck.txt', direction: 'EN_TO_FR' },
  { author: 'DeLillo', original: 'pdf_end_zone_don_delillo.txt', translation: 'pdf_letoile_de_ratner_french_edition_delillo_don.txt', direction: 'EN_TO_FR' },
  { author: 'DeLillo', original: 'pdf_underworld_don_delillo.txt', translation: 'pdf_white_noise_don_delillo.txt', direction: 'EN_TO_FR' },
  { author: 'Dostoievski', original: 'dostoievski_crime_36034.txt', translation: 'crimes_et_chatiments_french_edition_fiodor_dostoievski.txt', direction: 'EN_TO_FR' },
];

interface NovelMeasures {
  file: string; lang: 'FR' | 'EN';
  words: number; sentences: number;
  rhythm_cv: number; mean_sent_len: number; std_sent_len: number;
  short_ratio: number; long_ratio: number;
  contradiction: number;
  silence: number; irrev: number; malaise: number; ironie: number;
  gb_mean: number; gb_std: number;
  pct_dialogue: number; pct_action: number; pct_description: number;
  pct_introspection: number; pct_narration: number;
}

function measureNovel(file: string): NovelMeasures | null {
  const filePath = path.join(TXT, file);
  if (!fs.existsSync(filePath)) return null;
  let text = fs.readFileSync(filePath, 'utf-8');
  text = skipGutenberg(text);
  const words = text.split(/\s+/);
  if (words.length < 1000) return null;

  const sents = splitSentences(text);
  if (sents.length < 20) return null;

  const sentLens = sents.map(s => s.split(/\s+/).length);
  const avgSL = mean(sentLens);
  const stdSL = stdev(sentLens);
  const lower = text.toLowerCase();
  const nw = words.length;
  const ns = sents.length;

  // Detect language
  const frWords = countRe(/\b(?:le|la|les|des|une|dans|pour|avec|qui|que|est|sont|mais|pas)\b/gi, lower);
  const enWords = countRe(/\b(?:the|and|was|were|his|her|had|not|but|with|from|they|have|this)\b/gi, lower);
  const lang: 'FR' | 'EN' = frWords > enWords ? 'FR' : 'EN';
  const advRe = lang === 'FR' ? ADV_FR : ADV_EN;

  // GB samples
  const WINDOW = 20; const STEP = 10;
  const gbs: number[] = [];
  for (let i = 0; i <= sents.length - WINDOW; i += STEP) {
    const wText = sents.slice(i, i + WINDOW).join(' ');
    gbs.push(scoreGB(computeAllGBFeatures(wText)));
    if (gbs.length >= 50) break; // Cap at 50 windows for speed
  }

  // Composition
  const analysis = classifyPassageDetailed(sents.slice(0, Math.min(500, sents.length)).join(' '));
  const cls = analysis.classification;

  return {
    file, lang, words: nw, sentences: ns,
    rhythm_cv: r4(avgSL > 0 ? stdSL / avgSL : 0),
    mean_sent_len: r4(avgSL), std_sent_len: r4(stdSL),
    short_ratio: r4(sentLens.filter(l => l < 10).length / ns),
    long_ratio: r4(sentLens.filter(l => l > 40).length / ns),
    contradiction: r4(countRe(advRe, lower) / ns),
    silence: r4(countRe(SILENCE_RE, lower) / ns),
    irrev: r4(countRe(IRREV_RE, lower) / ns),
    malaise: r4(countRe(MALAISE_RE, lower) / nw * 1000),
    ironie: r4(countRe(IRONIE_RE, lower) / nw * 1000),
    gb_mean: r4(mean(gbs)), gb_std: r4(stdev(gbs)),
    pct_dialogue: cls.dialogue, pct_action: cls.action,
    pct_description: cls.description, pct_introspection: cls.introspection,
    pct_narration: cls.narration,
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

console.log('R-TRANSLATION-AUDIT: Measuring pairs...');

interface PairResult {
  author: string; direction: string;
  original: NovelMeasures; translation: NovelMeasures;
  delta_rhythm: number; delta_contradiction: number; delta_gb: number;
  delta_rel_rhythm: number; delta_rel_contradiction: number; delta_rel_gb: number;
  fidelity: number;
}

const results: PairResult[] = [];

for (const pair of PAIRS) {
  const orig = measureNovel(pair.original);
  const trad = measureNovel(pair.translation);
  if (!orig || !trad) {
    console.log(`  SKIP: ${pair.author} (${pair.original} or ${pair.translation} not found/too short)`);
    continue;
  }

  const dr = trad.rhythm_cv - orig.rhythm_cv;
  const dc = trad.contradiction - orig.contradiction;
  const dg = trad.gb_mean - orig.gb_mean;

  const drr = orig.rhythm_cv > 0.01 ? dr / orig.rhythm_cv : 0;
  const dcr = orig.contradiction > 0.01 ? dc / orig.contradiction : 0;
  const dgr = orig.gb_mean > 0.1 ? dg / orig.gb_mean : 0;

  // Type distance
  const typeDist = Math.sqrt(
    (trad.pct_dialogue - orig.pct_dialogue) ** 2 +
    (trad.pct_action - orig.pct_action) ** 2 +
    (trad.pct_description - orig.pct_description) ** 2 +
    (trad.pct_introspection - orig.pct_introspection) ** 2 +
    (trad.pct_narration - orig.pct_narration) ** 2
  );

  const fidelity = Math.max(0, 1 - (Math.abs(drr) + Math.abs(dcr) + typeDist + Math.abs(dgr)) / 4);

  results.push({
    author: pair.author, direction: pair.direction,
    original: orig, translation: trad,
    delta_rhythm: r4(dr), delta_contradiction: r4(dc), delta_gb: r4(dg),
    delta_rel_rhythm: r4(drr), delta_rel_contradiction: r4(dcr), delta_rel_gb: r4(dgr),
    fidelity: r4(fidelity),
  });

  console.log(`  ${pair.author.padEnd(15)} ${pair.direction.padEnd(10)} orig_lang=${orig.lang} trad_lang=${trad.lang} rhythm: ${orig.rhythm_cv.toFixed(3)}→${trad.rhythm_cv.toFixed(3)} (${drr > 0 ? '+' : ''}${(drr*100).toFixed(0)}%) contra: ${orig.contradiction.toFixed(3)}→${trad.contradiction.toFixed(3)} GB: ${orig.gb_mean.toFixed(3)}→${trad.gb_mean.toFixed(3)} fidelity=${fidelity.toFixed(3)}`);
}

// ═══════════════════════════════════════════════════════════════
// ANALYSIS BY DIRECTION
// ═══════════════════════════════════════════════════════════════

console.log(`\n${'='.repeat(80)}`);
console.log('  TRANSLATION AUDIT — COMPARISON BY DIRECTION');
console.log(`${'='.repeat(80)}`);

for (const dir of ['FR_TO_EN', 'EN_TO_FR']) {
  const dirResults = results.filter(r => r.direction === dir);
  if (dirResults.length === 0) continue;
  console.log(`\n  ${dir} (${dirResults.length} pairs):`);
  console.log(`    Mean Δ rhythm:       ${mean(dirResults.map(r => r.delta_rhythm)) > 0 ? '+' : ''}${mean(dirResults.map(r => r.delta_rhythm)).toFixed(4)}`);
  console.log(`    Mean Δ contradiction:${mean(dirResults.map(r => r.delta_contradiction)) > 0 ? '+' : ''}${mean(dirResults.map(r => r.delta_contradiction)).toFixed(4)}`);
  console.log(`    Mean Δ GB:           ${mean(dirResults.map(r => r.delta_gb)) > 0 ? '+' : ''}${mean(dirResults.map(r => r.delta_gb)).toFixed(4)}`);
  console.log(`    Mean fidelity:       ${mean(dirResults.map(r => r.fidelity)).toFixed(4)}`);

  // Per pair detail
  for (const r of dirResults) {
    console.log(`      ${r.author.padEnd(15)} rhythm=${r.delta_rel_rhythm > 0 ? '+' : ''}${(r.delta_rel_rhythm*100).toFixed(0)}% contra=${r.delta_rel_contradiction > 0 ? '+' : ''}${(r.delta_rel_contradiction*100).toFixed(0)}% GB=${r.delta_gb > 0 ? '+' : ''}${r.delta_gb.toFixed(3)} fid=${r.fidelity.toFixed(3)}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// SAVE
// ═══════════════════════════════════════════════════════════════

const frToEn = results.filter(r => r.direction === 'FR_TO_EN');
const enToFr = results.filter(r => r.direction === 'EN_TO_FR');

fs.writeFileSync(path.join(DATA, 'TRANSLATION_PAIRS.json'), JSON.stringify({
  date: '2026-03-23',
  fr_to_en: frToEn.length, en_to_fr: enToFr.length,
  pairs: PAIRS.map(p => ({ ...p, found: results.some(r => r.author === p.author && r.direction === p.direction) })),
}, null, 2));

fs.writeFileSync(path.join(DATA, 'TRANSLATION_FIDELITY.json'), JSON.stringify({
  date: '2026-03-23',
  summary: {
    fr_to_en: { n: frToEn.length, mean_fidelity: r4(mean(frToEn.map(r => r.fidelity))), mean_delta_rhythm: r4(mean(frToEn.map(r => r.delta_rhythm))), mean_delta_gb: r4(mean(frToEn.map(r => r.delta_gb))) },
    en_to_fr: { n: enToFr.length, mean_fidelity: r4(mean(enToFr.map(r => r.fidelity))), mean_delta_rhythm: r4(mean(enToFr.map(r => r.delta_rhythm))), mean_delta_gb: r4(mean(enToFr.map(r => r.delta_gb))) },
  },
  pairs: results.map(r => ({
    author: r.author, direction: r.direction,
    orig_lang: r.original.lang, trad_lang: r.translation.lang,
    orig_rhythm: r.original.rhythm_cv, trad_rhythm: r.translation.rhythm_cv,
    orig_contra: r.original.contradiction, trad_contra: r.translation.contradiction,
    orig_gb: r.original.gb_mean, trad_gb: r.translation.gb_mean,
    delta_rhythm: r.delta_rhythm, delta_gb: r.delta_gb, fidelity: r.fidelity,
  })),
}, null, 2));

console.log(`\nSaved: TRANSLATION_PAIRS.json, TRANSLATION_FIDELITY.json`);
console.log('=== R-TRANSLATION-AUDIT COMPLETE ===');
