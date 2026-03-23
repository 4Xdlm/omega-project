/**
 * R-CERTIFY-EN — Test surviving measures on native English corpus
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyPassageDetailed } from '../src/scoring/passage-classifier.js';
import { computeAllGBFeatures } from '../src/scoring/gb-scorer.js';
import { scoreGB } from '../src/scoring/gb-inference.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TXT = path.resolve(__dirname, '../../../omega-autopsie/corpus_r/txt');
const TIERS_PATH = path.resolve(__dirname, '../../../omega-autopsie/corpus_r/CORPUS_TIERS_V3.json');
const DATA = path.resolve(__dirname, '../src/scoring/data');

const tiersData = JSON.parse(fs.readFileSync(TIERS_PATH, 'utf-8')) as Array<{filename: string; tier_suggestion: string}>;
const tierLookup: Record<string, string> = {};
for (const e of tiersData) tierLookup[e.filename] = e.tier_suggestion || '?';

function mean(v: number[]): number { return v.length ? v.reduce((a,b)=>a+b,0)/v.length : 0; }
function stdev(v: number[]): number { if(v.length<2) return 0; const m=mean(v); return Math.sqrt(v.reduce((s,x)=>s+(x-m)**2,0)/(v.length-1)); }
function r4(v: number): number { return Math.round(v*10000)/10000; }
function spearman(x: number[], y: number[]): number {
  const n=x.length; if(n<10) return 0;
  function rank(a: number[]): number[] {
    const s=a.map((v,i)=>({v,i})).sort((a,b)=>a.v-b.v);
    const r=new Array<number>(n);let i=0;
    while(i<n){let j=i;while(j<n-1&&s[j+1].v===s[j].v)j++;const avg=(i+j)/2+1;for(let k=i;k<=j;k++)r[s[k].i]=avg;i=j+1;}
    return r;
  }
  const rx=rank(x),ry=rank(y);let d2=0;for(let i=0;i<n;i++)d2+=(rx[i]-ry[i])**2;
  return 1-(6*d2)/(n*(n*n-1));
}
function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?\u2026\u00bb])\s+/).map(s=>s.trim()).filter(s=>s.length>5&&s.split(/\s+/).length>=3);
}
function skipGutenberg(text: string): string {
  for(const m of ['*** START OF','***START OF']){const i=text.indexOf(m);if(i!==-1){const nl=text.indexOf('\n',i);if(nl!==-1)return text.slice(nl+1);}}
  return text;
}
function countRe(re: RegExp, t: string): number { re.lastIndex=0;const m=t.match(re);re.lastIndex=0;return m?m.length:0; }

// EN native authors (excluding translations)
const EN_AUTHORS = new Set(['austen','bronte','dickens','fitzgerald','forster','hardy','hawthorne','james','joyce','lawrence','melville','orwell','woolf','mccarthy','hemingway','faulkner','delillo','morrison','steinbeck','wharton','nabokov','conrad','stevenson','poe','twain','wells','wilde','chesterton','london','shelley']);
const FR_TRANSLATION_MARKERS = ['french', 'souris', 'chambre', 'etoile', 'soleil', 'vieil', 'cinquante', 'orgueil'];

function isENNative(filename: string): boolean {
  const lower = filename.toLowerCase();
  if (FR_TRANSLATION_MARKERS.some(m => lower.includes(m))) return false;
  // Check author prefix
  const prefix = lower.split('_')[0];
  if (EN_AUTHORS.has(prefix)) return true;
  // Check pdf_ files
  if (lower.startsWith('pdf_')) {
    const inner = lower.replace('pdf_', '');
    for (const a of EN_AUTHORS) {
      if (inner.includes(a)) return true;
    }
  }
  return false;
}

// Regex for measures
const ADVERSATIVE_EN = /\b(?:but|however|yet|nevertheless|nonetheless|although|though|whereas|while|despite|still|even so|on the contrary|conversely)\b/gi;
const ADVERSATIVE_FR = /\b(?:mais|cependant|pourtant|neanmoins|toutefois|or|malgre|bien que|quoique|au contraire|en revanche)\b/gi;
const TELL_RE=/\b(?:sad|sadness|happy|happiness|joy|anger|fear|terror|anguish|shame|guilt|love|hatred|jealousy|disgust|contempt|despair|emotion|feeling|worried|anxious|frightened)\b/gi;
const SHOW_RE=/\b(?:trembled|shivered|sweat|pale|flushed|throat|gasped|fist|jaw|stomach|nausea|staggered|flinched|froze|stiffened|clenched)\b/gi;
const SILENCE_RE=/\b(?:silence|fell silent|said nothing|a long moment|motionless|frozen|nothing moved)\b/gi;
const IRREV_RE=/\b(?:achieved|died|left|lost|won|found|broke|destroyed|killed|became)\b/gi;
const MALAISE_RE=/\b(?:stain|mold|insect|strange|bizarre|odd|peculiar|unsettling)\b/gi;
const IRONIE_RE=/\b(?:apparently|of course|naturally|obviously|certainly|surely|indeed)\b/gi;
const SUGGEST_RE=/\b(?:something|a shape|a shadow|as if|like a|some kind of|it seemed)\b/gi;
const NEG_CR_RE=/\b(?:said nothing|didn't move|no one|nothing|not a sound|not a word|without a glance)\b/gi;
const COMPR_RE=/\b(?:because|therefore|consequently|thus|hence|so that)\b/gi;

const WINDOW = 20; const STEP = 10;
const allFiles = fs.readdirSync(TXT).filter(f => f.endsWith('.txt'));

// Separate EN and FR files
const enFiles = allFiles.filter(isENNative);
const frFiles = allFiles.filter(f => !isENNative(f));

console.log(`EN native files: ${enFiles.length}`);
console.log(`Non-EN files: ${frFiles.length}`);

// Scan both corpora
interface WindowData { gb: number; tier: string; rhythmCV: number; contradiction: number; avgSentLen: number; malaise: number; ironie: number; silence: number; irrev: number; sdt: number; suggest: number; negCr: number; compress: number; violence: number; propulsion: number; }

function scanCorpus(files: string[], label: string): WindowData[] {
  const windows: WindowData[] = [];
  let processed = 0;
  for (const file of files) {
    let text = fs.readFileSync(path.join(TXT, file), 'utf-8');
    text = skipGutenberg(text);
    if (text.split(/\s+/).length < 2000) continue;
    const sents = splitSentences(text);
    if (sents.length < WINDOW) continue;

    for (let i = 0; i <= sents.length - WINDOW; i += STEP) {
      const wSents = sents.slice(i, i + WINDOW);
      const wText = wSents.join(' ');
      const wLower = wText.toLowerCase();
      const nw = Math.max(wText.split(/\s+/).length, 1);
      const ns = wSents.length;
      const sentLens = wSents.map(s => s.split(/\s+/).length);
      const avgSL = mean(sentLens);
      const shortR = sentLens.filter(l => l < 8).length / ns;

      const feats = computeAllGBFeatures(wText);
      const gb = scoreGB(feats);
      const rhythmCV = avgSL > 0 ? stdev(sentLens) / avgSL : 0;
      // Use EN-specific adversatives for EN corpus
      const contradiction = label === 'EN'
        ? countRe(ADVERSATIVE_EN, wLower) / ns
        : countRe(ADVERSATIVE_FR, wLower) / ns;
      const tellC = countRe(TELL_RE, wLower);
      const showC = countRe(SHOW_RE, wLower);

      windows.push({
        gb, tier: tierLookup[file] || '?', rhythmCV, contradiction, avgSentLen: avgSL,
        malaise: countRe(MALAISE_RE, wLower) / nw * 20,
        ironie: countRe(IRONIE_RE, wLower) / nw * 15,
        silence: countRe(SILENCE_RE, wLower) / ns,
        irrev: countRe(IRREV_RE, wLower) / ns,
        sdt: showC / (showC + tellC + 1),
        suggest: countRe(SUGGEST_RE, wLower) / ns,
        negCr: countRe(NEG_CR_RE, wLower) / ns,
        compress: (countRe(IRREV_RE, wLower) * countRe(COMPR_RE, wLower)) / nw,
        violence: Math.min(1, shortR * 1.5 + countRe(/\b(?:struck|smashed|blood|slashed|killed)\b/gi, wLower) / nw * 20),
        propulsion: Math.min(1, shortR * 2),
      });
    }
    processed++;
    if (processed % 20 === 0) console.log(`  ${label}: ${processed}/${files.length} (${windows.length} windows)`);
  }
  return windows;
}

console.log('\nScanning EN corpus...');
const enWindows = scanCorpus(enFiles, 'EN');
console.log(`EN: ${enWindows.length} windows from ${enFiles.length} files`);

console.log('\nScanning FR corpus...');
const frWindows = scanCorpus(frFiles, 'FR');
console.log(`FR: ${frWindows.length} windows from ${frFiles.length} files`);

// ═══════════════════════════════════════════════════════════════
// COMPUTE CORRELATIONS
// ═══════════════════════════════════════════════════════════════

const MEASURES: Array<{ name: string; extract: (w: WindowData) => number }> = [
  { name: 'M6.5_rhythm_cv', extract: w => w.rhythmCV },
  { name: 'M4.3_contradiction', extract: w => w.contradiction },
  { name: 'M9_malaise', extract: w => w.malaise },
  { name: 'M9_ironie', extract: w => w.ironie },
  { name: 'M2.7_silence', extract: w => w.silence },
  { name: 'M3.1_irrev', extract: w => w.irrev },
  { name: 'M1.1_SDT', extract: w => w.sdt },
  { name: 'M2.1_suggest', extract: w => w.suggest },
  { name: 'M2.2_neg_cr', extract: w => w.negCr },
  { name: 'M3.4_compress', extract: w => w.compress },
  { name: 'M9_violence', extract: w => w.violence },
  { name: 'M9_propulsion', extract: w => w.propulsion },
];

function computeCorrelations(windows: WindowData[], label: string) {
  const gbs = windows.map(w => w.gb);
  const lens = windows.map(w => w.avgSentLen);

  // Partial correlation: residualize against length
  const xm = mean(lens); const ym = mean(gbs);
  let num = 0, den = 0;
  for (let i = 0; i < windows.length; i++) { num += (lens[i]-xm)*(gbs[i]-ym); den += (lens[i]-xm)**2; }
  const slope = den > 0 ? num/den : 0; const intercept = ym - slope*xm;
  const gbResid = gbs.map((g, i) => g - (slope * lens[i] + intercept));

  console.log(`\n  ${label} (${windows.length} windows):`);
  console.log(`  ${'Measure'.padEnd(25)} ${'raw_GB'.padStart(10)} ${'corr_len'.padStart(10)} ${'partial'.padStart(10)}`);
  console.log('  ' + '-'.repeat(60));

  const results: Record<string, { raw: number; corr_len: number; partial: number }> = {};

  for (const m of MEASURES) {
    const vals = windows.map(m.extract);
    const rawGB = spearman(vals, gbs);
    const corrLen = spearman(vals, lens);
    // Residualize measure against length
    const mm = mean(vals); let mn2 = 0, md2 = 0;
    for (let i = 0; i < windows.length; i++) { mn2 += (lens[i]-xm)*(vals[i]-mm); md2 += (lens[i]-xm)**2; }
    const mSlope = md2 > 0 ? mn2/md2 : 0; const mInt = mm - mSlope*xm;
    const mResid = vals.map((v, i) => v - (mSlope*lens[i]+mInt));
    const partial = spearman(mResid, gbResid);

    results[m.name] = { raw: r4(rawGB), corr_len: r4(corrLen), partial: r4(partial) };
    console.log(`  ${m.name.padEnd(25)} ${(rawGB>0?'+':'')+rawGB.toFixed(4).padStart(9)} ${(corrLen>0?'+':'')+corrLen.toFixed(4).padStart(9)} ${(partial>0?'+':'')+partial.toFixed(4).padStart(9)}`);
  }

  return results;
}

const enResults = computeCorrelations(enWindows, 'ENGLISH NATIVE');
const frResults = computeCorrelations(frWindows, 'FRENCH/OTHER');

// ═══════════════════════════════════════════════════════════════
// COMPARISON TABLE
// ═══════════════════════════════════════════════════════════════

console.log(`\n${'='.repeat(85)}`);
console.log('  FR vs EN COMPARISON');
console.log(`${'='.repeat(85)}`);
console.log(`  ${'Measure'.padEnd(25)} ${'FR_raw'.padStart(8)} ${'EN_raw'.padStart(8)} ${'FR_part'.padStart(8)} ${'EN_part'.padStart(8)} ${'Verdict'.padStart(18)}`);
console.log('  ' + '-'.repeat(80));

const comparisons: Record<string, { fr_raw: number; en_raw: number; fr_partial: number; en_partial: number; verdict: string }> = {};

for (const m of MEASURES) {
  const fr = frResults[m.name] || { raw: 0, partial: 0 };
  const en = enResults[m.name] || { raw: 0, partial: 0 };
  const partialDelta = Math.abs(en.partial - fr.partial);
  let verdict: string;
  if (Math.abs(en.partial) > 0.10 && Math.abs(fr.partial) > 0.10 && Math.sign(en.partial) === Math.sign(fr.partial)) {
    verdict = 'UNIVERSAL';
  } else if (Math.abs(en.partial) > 0.05 || Math.abs(fr.partial) > 0.05) {
    verdict = 'LANG_MODULATED';
  } else {
    verdict = partialDelta > 0.1 ? 'LANG_SPECIFIC' : 'WEAK';
  }
  comparisons[m.name] = { fr_raw: fr.raw, en_raw: en.raw, fr_partial: fr.partial, en_partial: en.partial, verdict };
  console.log(`  ${m.name.padEnd(25)} ${(fr.raw>0?'+':'')+fr.raw.toFixed(3).padStart(7)} ${(en.raw>0?'+':'')+en.raw.toFixed(3).padStart(7)} ${(fr.partial>0?'+':'')+fr.partial.toFixed(3).padStart(7)} ${(en.partial>0?'+':'')+en.partial.toFixed(3).padStart(7)} ${verdict.padStart(18)}`);
}

// Save
fs.writeFileSync(path.join(DATA, 'EN_NATIVE_CORPUS.json'), JSON.stringify({
  date: '2026-03-23', en_files: enFiles.length, en_windows: enWindows.length, fr_windows: frWindows.length,
}, null, 2));

fs.writeFileSync(path.join(DATA, 'FR_VS_EN_COMPARISON.json'), JSON.stringify({
  date: '2026-03-23', en_windows: enWindows.length, fr_windows: frWindows.length,
  comparisons,
  verdicts: {
    universal: Object.values(comparisons).filter(c => c.verdict === 'UNIVERSAL').length,
    lang_modulated: Object.values(comparisons).filter(c => c.verdict === 'LANG_MODULATED').length,
    lang_specific: Object.values(comparisons).filter(c => c.verdict === 'LANG_SPECIFIC').length,
    weak: Object.values(comparisons).filter(c => c.verdict === 'WEAK').length,
  },
}, null, 2));

console.log(`\n${'='.repeat(85)}`);
console.log(`  UNIVERSAL: ${Object.values(comparisons).filter(c => c.verdict === 'UNIVERSAL').length}`);
console.log(`  LANG_MODULATED: ${Object.values(comparisons).filter(c => c.verdict === 'LANG_MODULATED').length}`);
console.log(`  WEAK: ${Object.values(comparisons).filter(c => c.verdict === 'WEAK').length}`);
console.log(`${'='.repeat(85)}`);
