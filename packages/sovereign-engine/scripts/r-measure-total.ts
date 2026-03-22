/**
 * OMEGA R-MEASURE-TOTAL — Complete Measurement Campaign
 * 55 measures × 6 axes × 571 novels × 400K windows
 *
 * Single-pass corpus scan. Each window gets all measures.
 * Then correlate each measure against 6 axes.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyPassageDetailed, type SentenceType } from '../src/scoring/passage-classifier.js';
import { computeAllGBFeatures } from '../src/scoring/gb-scorer.js';
import { scoreGB } from '../src/scoring/gb-inference.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TXT = path.resolve(__dirname, '../../../omega-autopsie/corpus_r/txt');
const TIERS_PATH = path.resolve(__dirname, '../../../omega-autopsie/corpus_r/CORPUS_TIERS_V3.json');
const DATA = path.resolve(__dirname, '../src/scoring/data');

const tiersData = JSON.parse(fs.readFileSync(TIERS_PATH, 'utf-8')) as Array<{filename: string; tier_suggestion: string}>;
const tierLookup: Record<string, string> = {};
for (const e of tiersData) tierLookup[e.filename] = e.tier_suggestion || '?';

function mean(v: number[]): number { return v.length ? v.reduce((a,b) => a+b, 0)/v.length : 0; }
function stdev(v: number[]): number { if (v.length<2) return 0; const m=mean(v); return Math.sqrt(v.reduce((s,x) => s+(x-m)**2, 0)/(v.length-1)); }
function r4(v: number): number { return Math.round(v*10000)/10000; }
function spearman(x: number[], y: number[]): number {
  if (x.length<10) return 0;
  const n=x.length;
  function rank(a: number[]): number[] {
    const s=a.map((v,i)=>({v,i})).sort((a,b)=>a.v-b.v);
    const r=new Array<number>(n); let i=0;
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
  for (const m of ['*** START OF','***START OF']){const i=text.indexOf(m);if(i!==-1){const nl=text.indexOf('\n',i);if(nl!==-1)return text.slice(nl+1);}}
  return text;
}
function cleanW(w: string): string { return w.toLowerCase().replace(/[.,;:!?"'()\u00ab\u00bb\u2014\u2013\u2026\u201c\u201d]/g, ''); }
function countRe(re: RegExp, text: string): number { re.lastIndex=0; const m=text.match(re); re.lastIndex=0; return m?m.length:0; }

const STOP = new Set('le la les un une des de du au aux ce cette ces mon ton son et ou mais donc or ni car dans sur sous avec sans pour par entre que qui dont est sont the a an and or but in on at to for of with is was were it he she they not'.split(' '));

// ═══════════════════════════════════════════════════════════════
// WORD LISTS
// ═══════════════════════════════════════════════════════════════

const TELL_RE = /\b(?:triste|tristesse|heureux|bonheur|joie|colere|fureur|peur|terreur|angoisse|honte|culpabilite|amour|haine|jalousie|degout|mepris|desespoir|emotion|sentiment|sad|sadness|happy|happiness|joy|anger|fear|terror|anguish|shame|guilt|love|hatred|jealousy|disgust|contempt|despair|emotion|feeling)\b/gi;
const SHOW_RE = /\b(?:tremblait|frissonna|sueur|palit|rougit|gorge|souffle|haleta|poings|machoire|nausee|vertige|chancela|genoux|sursauta|se figea|se raidit|se crispa|serra|trembled|shivered|sweat|pale|flushed|throat|gasped|fist|jaw|stomach|nausea|staggered|flinched|froze|stiffened|clenched)\b/gi;
const EVAL_ADV_RE = /\b(?:profondement|terriblement|incroyablement|absolument|totalement|vraiment|extremement|parfaitement|deeply|terribly|incredibly|absolutely|totally|really|extremely)\b/gi;
const EXPL_RE = /\b(?:il sentit que|elle comprit que|il realisa que|c'etait parce que|la raison etait|cela signifiait que|he felt that|she realized that|it was because|the reason was|this meant that)\b/gi;
const SUGGEST_RE = /\b(?:quelque chose|une forme|une ombre|on aurait dit|comme un|comme si|une sorte de|il semblait que|something|a shape|a shadow|as if|like a|some kind of|it seemed)\b/gi;
const NEG_CREAT_RE = /\b(?:ne dit rien|ne bougea pas|personne ne|rien ne|aucun bruit|pas un mot|sans un regard|said nothing|didn't move|no one|nothing|not a sound|not a word|without a glance)\b/gi;
const SILENCE_RE = /\b(?:silence|se tut|ne dit rien|un long moment|immobile|fige|rien ne bougeait|fell silent|said nothing|a long moment|motionless|frozen|nothing moved)\b/gi;
const DANGER_RE = /\b(?:couteau|arme|sang|ombre|bruit|pas|silhouette|inconnu|nuit|knife|weapon|blood|shadow|noise|footstep|figure|stranger|darkness)\b/gi;
const CLICHE_RE = /\b(?:coeur brise|larmes de joie|sang glace|souffle coupe|un lourd silence|le temps s'arreta|broken heart|tears of joy|heavy silence|time stood still)\b/gi;
const IRREV_RE = /\b(?:obtint|mourut|quitta|perdit|gagna|trouva|brisa|detruisit|tua|aneantit|devint|achieved|died|left|lost|won|found|broke|destroyed|killed|became)\b/gi;
const ADVERSATIVE_RE = /\b(?:mais|cependant|pourtant|neanmoins|toutefois|or|malgre|but|however|yet|nevertheless|despite)\b/gi;
const CONCRETE_RE = /\b(?:main|porte|table|pierre|sang|eau|terre|visage|mur|fenetre|hand|door|table|stone|blood|water|face|wall|window)\b/gi;
const ABSTRACT_RE = /\b(?:ame|esprit|pensee|verite|destin|liberte|temps|mort|soul|spirit|thought|truth|destiny|freedom|time|death)\b/gi;
const HARD_C = /[ktpqgdb]/gi;
const SOFT_C = /[lmnsfvjz]/gi;

// Sensations (simplified from r-oracle)
function scoreSensations(text: string, sentLens: number[]): Record<string, number> {
  const lo=text.toLowerCase(); const nw=Math.max(text.split(/\s+/).length,1); const ns=Math.max(sentLens.length,1);
  const shortR=sentLens.filter(l=>l<8).length/ns; const longR=sentLens.filter(l=>l>30).length/ns;
  const qs=splitSentences(text).filter(s=>s.trim().endsWith('?')).length/ns;
  return {
    tension: Math.min(1,qs*2+countRe(/\b(?:soudain|tout a coup|suddenly|soon)\b/gi,lo)/ns*3),
    oppression: Math.min(1,countRe(/\b(?:souffle|gorge|poitrine|sueur|mur|cellule|breath|chest|sweat|wall)\b/gi,lo)/nw*20+longR*0.5),
    vertige: Math.min(1,countRe(/\b(?:vide|neant|infini|vertige|void|abyss|infinite)\b/gi,lo)/nw*20),
    fascination: Math.min(1,longR*1.5+countRe(/\b(?:lumiere|brillant|eclat|light|gleam)\b/gi,lo)/nw*15),
    melancolie: Math.min(1,countRe(/\b(?:autrefois|jadis|se souvenait|remembered|once|twilight)\b/gi,lo)/nw*15),
    violence_seche: Math.min(1,shortR*1.5+countRe(/\b(?:frappa|brisa|ecrasa|sang|blood|struck|smashed)\b/gi,lo)/nw*20),
    mystere: Math.min(1,qs*1.5+countRe(/\b(?:ombre|secret|cache|shadow|hidden|secret)\b/gi,lo)/nw*15),
    apaisement: Math.min(1,countRe(/\b(?:soleil|jardin|ciel|doux|sun|garden|sky|gentle|warm)\b/gi,lo)/nw*12),
    malaise: Math.min(1,countRe(/\b(?:tache|moisi|insecte|etrange|bizarre|stain|mold|strange)\b/gi,lo)/nw*20),
    propulsion: Math.min(1,shortR*2+countRe(/\b(?:aussitot|d'un bond|instantly|at once)\b/gi,lo)/ns*4),
    ironie_mordante: Math.min(1,countRe(/\b(?:naturellement|evidemment|bien sur|apparently|of course|naturally)\b/gi,lo)/nw*15),
    recueillement: Math.min(1,countRe(/\b(?:silence|immobile|ame|eternite|soul|eternity)\b/gi,lo)/nw*15+longR*0.3),
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN SCAN
// ═══════════════════════════════════════════════════════════════

const allFiles = fs.readdirSync(TXT).filter(f => f.endsWith('.txt')).sort();
console.log(`R-MEASURE-TOTAL: ${allFiles.length} files`);

const WINDOW = 20; const STEP = 10;
const ALL_TYPES: SentenceType[] = ['dialogue','action','description','introspection','narration'];

// Accumulate per-measure: arrays of (value, gb, tier, author, type_dominant, sensations)
interface WinData { gb: number; tier: string; author: string; dom: SentenceType; malaise: number; ironie: number; }
const measureAccum: Record<string, { vals: number[]; meta: WinData[] }> = {};

function initM(name: string) { if (!measureAccum[name]) measureAccum[name] = { vals: [], meta: [] }; }
function pushM(name: string, val: number, meta: WinData) { initM(name); measureAccum[name].vals.push(val); measureAccum[name].meta.push(meta); }

let processed = 0;
let totalWindows = 0;

for (const file of allFiles) {
  let text = fs.readFileSync(path.join(TXT, file), 'utf-8');
  text = skipGutenberg(text);
  const words = text.split(/\s+/);
  if (words.length < 2000) continue;

  const tier = tierLookup[file] || '?';
  const author = file.split('_')[0];
  const sents = splitSentences(text);
  if (sents.length < WINDOW) continue;

  const analysis = classifyPassageDetailed(text);
  const tags = analysis.sentences;

  for (let i = 0; i <= tags.length - WINDOW; i += STEP) {
    const wTags = tags.slice(i, i + WINDOW);
    const wSents = sents.slice(i, i + WINDOW);
    const wText = wSents.join(' ');
    const wLower = wText.toLowerCase();
    const wWords = wText.split(/\s+/);
    const nw = Math.max(wWords.length, 1);
    const ns = wSents.length;
    const sentLens = wSents.map(s => s.split(/\s+/).length);

    // Composition + dominant
    const comp: Record<SentenceType, number> = { dialogue:0, action:0, description:0, introspection:0, narration:0 };
    for (const t of wTags) for (const k of ALL_TYPES) comp[k] += t.scores[k];
    const ct = Object.values(comp).reduce((a,b) => a+b, 0);
    if (ct > 0) for (const k of ALL_TYPES) comp[k] /= ct;
    let dom: SentenceType = 'narration'; let maxC = 0;
    for (const k of ALL_TYPES) if (comp[k] > maxC) { maxC = comp[k]; dom = k; }

    // GB
    const feats = computeAllGBFeatures(wText);
    const gb = scoreGB(feats);

    // Sensations
    const sens = scoreSensations(wText, sentLens);
    const meta: WinData = { gb, tier, author, dom, malaise: sens.malaise, ironie: sens.ironie_mordante };

    // ═══ FAMILY 1: IMPLICATURE ═══
    const tellC = countRe(TELL_RE, wLower);
    const showC = countRe(SHOW_RE, wLower);
    pushM('M1.1_show_dont_tell', showC / (showC + tellC + 1), meta);
    pushM('M1.4_explanation_density', countRe(EXPL_RE, wLower) / ns, meta);
    pushM('M1.5_eval_adverb_density', countRe(EVAL_ADV_RE, wLower) / nw, meta);

    // ═══ FAMILY 2: REMANENCE ═══
    pushM('M2.1_suggestion', countRe(SUGGEST_RE, wLower) / ns, meta);
    pushM('M2.2_neg_creatrice', countRe(NEG_CREAT_RE, wLower) / ns, meta);
    pushM('M2.5_ecourte', wSents.filter(s => s.endsWith('...') || s.endsWith('\u2026') || s.endsWith('\u2014')).length / ns, meta);
    const qSents = wSents.filter(s => s.trim().endsWith('?'));
    const unresolvedQ = qSents.filter((_, qi) => {
      const qIdx = wSents.indexOf(qSents[qi]);
      const next5 = wSents.slice(qIdx + 1, qIdx + 6).join(' ').toLowerCase();
      return !(/\b(?:parce que|car|c'est que|la reponse|because|the answer)\b/i.test(next5));
    }).length;
    pushM('M2.6_questions_sans_reponse', qSents.length > 0 ? unresolvedQ / qSents.length : 0, meta);
    pushM('M2.7_silence', countRe(SILENCE_RE, wLower) / ns, meta);

    // ═══ FAMILY 3: IRREVERSIBILITE ═══
    pushM('M3.1_irreversibilite', countRe(IRREV_RE, wLower) / ns, meta);
    pushM('M3.4_compression_causale', (countRe(IRREV_RE, wLower) * countRe(/\b(?:car|donc|parce que|because|therefore)\b/gi, wLower)) / nw, meta);

    // ═══ FAMILY 4: DISSONANCE ═══
    pushM('M4.3_contradiction', countRe(ADVERSATIVE_RE, wLower) / ns, meta);
    pushM('M4.4_menace_sans_evenement', (() => {
      const dangerC = countRe(DANGER_RE, wLower);
      const actionC = wWords.filter(w => {
        const c = cleanW(w);
        return ['frappa','bondit','courut','struck','ran','jumped','fired'].includes(c);
      }).length;
      return dangerC > 0 && actionC === 0 ? dangerC / ns : 0;
    })(), meta);

    // ═══ FAMILY 5: TRAJECTOIRE ═══
    // Semantic jump
    const contentWords = (s: string) => s.split(/\s+/).map(cleanW).filter(w => w.length > 4 && !STOP.has(w));
    let jumpSum = 0; let jumpCount = 0;
    for (let j = 0; j < wSents.length - 1; j++) {
      const cA = new Set(contentWords(wSents[j]));
      const cB = new Set(contentWords(wSents[j + 1]));
      const union = new Set([...cA, ...cB]);
      const inter = [...cA].filter(w => cB.has(w)).length;
      if (union.size > 0) { jumpSum += 1 - inter / union.size; jumpCount++; }
    }
    pushM('M5.1_semantic_jump', jumpCount > 0 ? jumpSum / jumpCount : 0, meta);

    // Switch rate
    let switches = 0;
    for (let j = 1; j < wTags.length; j++) if (wTags[j].dominant !== wTags[j - 1].dominant) switches++;
    pushM('M5.2_switch_rate', switches / (WINDOW - 1), meta);

    // Block acceleration
    const blocks: number[] = []; let bl = 1;
    for (let j = 1; j < wTags.length; j++) {
      if (wTags[j].dominant === wTags[j - 1].dominant) bl++;
      else { blocks.push(bl); bl = 1; }
    }
    blocks.push(bl);
    if (blocks.length >= 3) {
      const xs = blocks.map((_, i) => i);
      const xm = mean(xs); const ym = mean(blocks);
      let num = 0, den = 0;
      for (let j = 0; j < blocks.length; j++) { num += (j - xm) * (blocks[j] - ym); den += (j - xm) ** 2; }
      pushM('M5.4_block_acceleration', den > 0 ? num / den : 0, meta);
    } else { pushM('M5.4_block_acceleration', 0, meta); }

    // Bigram entropy
    const bigrams: Record<string, number> = {};
    for (let j = 1; j < wTags.length; j++) {
      const bg = `${wTags[j - 1].dominant[0]}${wTags[j].dominant[0]}`;
      bigrams[bg] = (bigrams[bg] || 0) + 1;
    }
    const bgTotal = Object.values(bigrams).reduce((a, b) => a + b, 0);
    let bgEntropy = 0;
    for (const c of Object.values(bigrams)) { const p = c / bgTotal; if (p > 0) bgEntropy -= p * Math.log2(p); }
    pushM('M5.9_bigram_entropy', bgEntropy, meta);

    // ═══ FAMILY 6: SIGNAL ═══
    pushM('M6.3_rugosite', (() => {
      const hard = countRe(HARD_C, wText);
      const soft = countRe(SOFT_C, wText);
      return hard / Math.max(hard + soft, 1);
    })(), meta);
    pushM('M6.5_regularite_rythm', mean(sentLens) > 0 ? stdev(sentLens) / mean(sentLens) : 0, meta);
    // ACF lag 1
    if (sentLens.length >= 10) {
      const m = mean(sentLens);
      const v = sentLens.reduce((s, x) => s + (x - m) ** 2, 0) / sentLens.length;
      if (v > 0) {
        let acf1 = 0;
        for (let j = 0; j < sentLens.length - 1; j++) acf1 += (sentLens[j] - m) * (sentLens[j + 1] - m);
        pushM('M6.4_acf_lag1', acf1 / (sentLens.length * v), meta);
      } else { pushM('M6.4_acf_lag1', 0, meta); }
    } else { pushM('M6.4_acf_lag1', 0, meta); }

    // ═══ FAMILY 7: POLYPHONIE ═══
    // TTR dialogue vs narration (simplified)
    const dlgWords = wSents.filter((_, j) => wTags[j]?.dominant === 'dialogue').join(' ').split(/\s+/).map(cleanW).filter(w => w.length > 2);
    const narWords = wSents.filter((_, j) => wTags[j]?.dominant !== 'dialogue').join(' ').split(/\s+/).map(cleanW).filter(w => w.length > 2);
    const ttrDlg = dlgWords.length >= 20 ? new Set(dlgWords).size / dlgWords.length : 0;
    const ttrNar = narWords.length >= 20 ? new Set(narWords).size / narWords.length : 0;
    pushM('M7.2_ttr_ratio', ttrNar > 0 && ttrDlg > 0 ? ttrDlg / ttrNar : 0, meta);

    // ═══ FAMILY 8: SURFACE ═══
    pushM('M8.2_concrete_abstract', (() => {
      const conc = countRe(CONCRETE_RE, wLower);
      const abst = countRe(ABSTRACT_RE, wLower);
      return conc / (conc + abst + 1);
    })(), meta);
    pushM('M8.6_cliche_density', countRe(CLICHE_RE, wLower) / ns, meta);

    // Richesse intra-phrase
    let polyCount = 0;
    for (const t of wTags) {
      const active = Object.values(t.scores).filter(v => v > 0.1).length;
      if (active >= 3) polyCount++;
    }
    pushM('M8.5_richesse_poly', polyCount / ns, meta);

    // ═══ FAMILY 9: SENSATION ═══
    for (const [sName, sVal] of Object.entries(sens)) {
      pushM(`M9_${sName}`, sVal, meta);
    }
    // Purity
    const sensVals = Object.values(sens);
    const sensTotal = sensVals.reduce((a, b) => a + b, 0);
    if (sensTotal > 0) {
      const sensProbs = sensVals.map(v => v / sensTotal);
      const sensEntropy = -sensProbs.filter(p => p > 0).reduce((s, p) => s + p * Math.log2(p), 0);
      pushM('M9.14_purete', 1 - sensEntropy / Math.log2(12), meta);
    } else { pushM('M9.14_purete', 0, meta); }
    // Valence + Arousal
    pushM('M9.16_valence', (sens.apaisement + sens.fascination + sens.recueillement) - (sens.violence_seche + sens.oppression + sens.malaise), meta);
    pushM('M9.17_arousal', (sens.tension + sens.propulsion + sens.violence_seche) - (sens.apaisement + sens.recueillement + sens.melancolie), meta);

    totalWindows++;
  }

  processed++;
  if (processed % 50 === 0) console.log(`  ${processed}/${allFiles.length} (${totalWindows} windows)`);
}

console.log(`\nDone: ${processed} novels, ${totalWindows} windows, ${Object.keys(measureAccum).length} measures`);

// ═══════════════════════════════════════════════════════════════
// COMPUTE 6 AXES FOR EACH MEASURE
// ═══════════════════════════════════════════════════════════════

console.log('\n=== COMPUTING 6 AXES ===');

interface MeasureResult {
  global_mean: number; global_std: number;
  axe1_corr_gb: number;
  axe2_corr_intra_author: number;
  axe3_by_tier: Record<string, number>;
  axe4_corr_malaise: number;
  axe5_corr_ironie: number;
  axe6_by_type: Record<string, number>;
}

const results: Record<string, MeasureResult> = {};

for (const [mName, { vals, meta }] of Object.entries(measureAccum)) {
  if (vals.length < 100) continue;

  const gbs = meta.map(m => m.gb);
  const malaises = meta.map(m => m.malaise);
  const ironies = meta.map(m => m.ironie);

  // AXE 1: global GB correlation
  const axe1 = spearman(vals, gbs);

  // AXE 2: intra-author (mean of per-author correlations)
  const authorGroups: Record<string, { v: number[]; g: number[] }> = {};
  for (let i = 0; i < vals.length; i++) {
    const a = meta[i].author;
    if (!authorGroups[a]) authorGroups[a] = { v: [], g: [] };
    authorGroups[a].v.push(vals[i]);
    authorGroups[a].g.push(gbs[i]);
  }
  const authorCorrs: number[] = [];
  for (const { v, g } of Object.values(authorGroups)) {
    if (v.length >= 20) authorCorrs.push(spearman(v, g));
  }
  const axe2 = authorCorrs.length > 0 ? mean(authorCorrs) : 0;

  // AXE 3: by tier
  const axe3: Record<string, number> = {};
  for (const t of ['S', 'A', 'B', 'C', 'D']) {
    const tVals = vals.filter((_, i) => meta[i].tier === t);
    axe3[t] = tVals.length > 0 ? r4(mean(tVals)) : 0;
  }

  // AXE 4 & 5: malaise and ironie
  const axe4 = spearman(vals, malaises);
  const axe5 = spearman(vals, ironies);

  // AXE 6: by dominant type
  const axe6: Record<string, number> = {};
  for (const t of ['dialogue', 'action', 'description', 'introspection', 'narration']) {
    const tVals = vals.filter((_, i) => meta[i].dom === t);
    axe6[t] = tVals.length > 10 ? r4(mean(tVals)) : 0;
  }

  results[mName] = {
    global_mean: r4(mean(vals)), global_std: r4(stdev(vals)),
    axe1_corr_gb: r4(axe1), axe2_corr_intra_author: r4(axe2),
    axe3_by_tier: axe3, axe4_corr_malaise: r4(axe4), axe5_corr_ironie: r4(axe5),
    axe6_by_type: axe6,
  };
}

// ═══════════════════════════════════════════════════════════════
// RANKINGS
// ═══════════════════════════════════════════════════════════════

const byGB = Object.entries(results).sort((a, b) => Math.abs(b[1].axe1_corr_gb) - Math.abs(a[1].axe1_corr_gb));
const byIntra = Object.entries(results).sort((a, b) => Math.abs(b[1].axe2_corr_intra_author) - Math.abs(a[1].axe2_corr_intra_author));
const byTierSep = Object.entries(results).sort((a, b) => Math.abs((b[1].axe3_by_tier.S || 0) - (b[1].axe3_by_tier.D || 0)) - Math.abs((a[1].axe3_by_tier.S || 0) - (a[1].axe3_by_tier.D || 0)));
const byMalaise = Object.entries(results).sort((a, b) => Math.abs(b[1].axe4_corr_malaise) - Math.abs(a[1].axe4_corr_malaise));

// Print table
console.log(`\n${'='.repeat(95)}`);
console.log('  R-MEASURE-TOTAL — TOP 20 BY GB CORRELATION');
console.log(`${'='.repeat(95)}`);
console.log(`  ${'MEASURE'.padEnd(35)} ${'GB'.padStart(7)} ${'INTRA'.padStart(7)} ${'S'.padStart(6)} ${'D'.padStart(6)} ${'MAL'.padStart(7)} ${'IRO'.padStart(7)}`);
console.log('  ' + '-'.repeat(90));
for (const [name, r] of byGB.slice(0, 20)) {
  console.log(`  ${name.padEnd(35)} ${(r.axe1_corr_gb>0?'+':'')+r.axe1_corr_gb.toFixed(3).padStart(6)} ${(r.axe2_corr_intra_author>0?'+':'')+r.axe2_corr_intra_author.toFixed(3).padStart(6)} ${(r.axe3_by_tier.S||0).toFixed(3).padStart(6)} ${(r.axe3_by_tier.D||0).toFixed(3).padStart(6)} ${(r.axe4_corr_malaise>0?'+':'')+r.axe4_corr_malaise.toFixed(3).padStart(6)} ${(r.axe5_corr_ironie>0?'+':'')+r.axe5_corr_ironie.toFixed(3).padStart(6)}`);
}

// Nulls
const nulls = Object.entries(results).filter(([, r]) =>
  Math.abs(r.axe1_corr_gb) < 0.05 && Math.abs(r.axe2_corr_intra_author) < 0.05 &&
  Math.abs(r.axe4_corr_malaise) < 0.05 && Math.abs(r.axe5_corr_ironie) < 0.05
);
console.log(`\n  NULL measures (all |corr| < 0.05): ${nulls.length}`);
for (const [name] of nulls) console.log(`    ${name}`);

// Redundancies (simplified: check if two measures have similar GB correlation pattern)
console.log(`\n  Measures computed: ${Object.keys(results).length}`);

// Save
fs.writeFileSync(path.join(DATA, 'R_MEASURE_TOTAL.json'), JSON.stringify({
  date: '2026-03-22', corpus: processed, windows: totalWindows,
  measures: results,
  rankings: {
    by_gb: byGB.slice(0, 20).map(([n, r]) => ({ name: n, corr: r.axe1_corr_gb })),
    by_intra: byIntra.slice(0, 20).map(([n, r]) => ({ name: n, corr: r.axe2_corr_intra_author })),
    by_tier_sep: byTierSep.slice(0, 20).map(([n, r]) => ({ name: n, s: r.axe3_by_tier.S, d: r.axe3_by_tier.D })),
    by_malaise: byMalaise.slice(0, 20).map(([n, r]) => ({ name: n, corr: r.axe4_corr_malaise })),
  },
  nulls: nulls.map(([n]) => n),
}, null, 2));

console.log(`\nSaved: ${path.join(DATA, 'R_MEASURE_TOTAL.json')}`);
console.log('=== R-MEASURE-TOTAL COMPLETE ===');
