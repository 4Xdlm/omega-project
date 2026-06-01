/**
 * OMEGA METROLOGY — WS-C MASTER COMPOSITE CALIBRATION (Ollama, terminal Architecte)
 * ============================================================================
 * Mesure le COMPOSITE COMPLET (ECC+RCI+SII+IFI+AAI) des maîtres sur un large corpus,
 * pour recalibrer les paliers par PROPORTIONNALITÉ (percentiles), pas par nombres ronds.
 * Décision Architecte §3 = OPTION A : contrat 14D dérivé de l'arc émotionnel de l'ŒUVRE
 * ENTIÈRE (pas du passage scoré). Résidu circulaire tension_14d REPORTÉ (un passage tend à
 * matcher l'arc de son œuvre). Packet REPRÉSENTATIF (WS-B2, lexique de l'œuvre).
 *
 * 4/5 axes = LLM (ECC/AAI/SII/IFI) → NÉCESSITE OLLAMA → terminal Architecte (shell DC bloqué).
 * Juge déterministe à temp 0 (prouvé WS-B0c) → k=1 suffit (ECC_K pour forcer).
 * Resumable : JSONL append-only, skip (sha_prose + contract_hash) déjà mesurés.
 * Provenance DEC-014 complète par mesure. Aucun seuil touché. STOP au rapport.
 *
 * Run (cwd=packages/sovereign-engine), idéalement détaché (heures) :
 *   $env:WSC_PASSAGES='5'; npx tsx ../../scripts/metrology/wsc-master-composite-calibration.ts
 */
process.env.OMEGA_CHUNKED_V4 = '1'; process.env.OMEGA_PROMPT_V4 = '1';
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import * as path from 'node:path';
import { createGenesisPlan } from '../../packages/genesis-planner/src/planner.js';
import { createDefaultConfig } from '../../packages/genesis-planner/src/config.js';
import type { Scene } from '../../packages/genesis-planner/src/types.js';
import { assembleForgePacket } from '../../packages/sovereign-engine/src/input/forge-packet-assembler.js';
import { computeECC, computeRCI, computeSII, computeIFI, computeAAI } from '../../packages/sovereign-engine/src/oracle/macro-axes.js';
import { createOllamaProvider } from '../../packages/sovereign-engine/src/runtime/ollama-provider.js';
import { DEFAULT_VOICE_GENOME } from '../../packages/sovereign-engine/src/voice/voice-genome.js';
import { analyzeEmotionFromText } from '@omega/omega-forge';
import type { ForgePacket, StyleProfile, KillLists, CanonEntry, ForgeContinuity, EmotionContract } from '../../packages/sovereign-engine/src/types.js';

const DIMS = ['joy','trust','fear','surprise','sadness','disgust','anger','anticipation','love','submission','awe','disapproval','remorse','contempt'] as const;
const VAL: Record<string,number> = { joy:0.8,trust:0.5,fear:-0.6,surprise:0.1,sadness:-0.7,disgust:-0.6,anger:-0.5,anticipation:0.2,love:0.8,submission:-0.2,awe:0.3,disapproval:-0.4,remorse:-0.5,contempt:-0.5 };
const ARO: Record<string,number> = { joy:0.6,trust:0.3,fear:0.8,surprise:0.8,sadness:0.3,disgust:0.5,anger:0.8,anticipation:0.6,love:0.6,submission:0.3,awe:0.6,disapproval:0.4,remorse:0.4,contempt:0.4 };
const TS = '2026-01-01T00:00:00.000Z';
const REPO = path.resolve(process.cwd(), process.cwd().endsWith('sovereign-engine') ? '../..' : '.');
const CACHE = path.join(REPO, 'omega-autopsie', 'gutenberg_cache');
const OUT = path.join(REPO, 'docs', 'audit', 'calibration');
const JSONL = path.join(OUT, 'WS_C_MEASURES.jsonl');
const MODEL = process.env.ECC_MODEL ?? 'qwen3:32b';
const OLLAMA_URL = process.env.ECC_OLLAMA_URL ?? 'http://localhost:11434';
const K = parseInt(process.env.ECC_K ?? '1', 10);
const NPASS = parseInt(process.env.WSC_PASSAGES ?? '5', 10);
function log(s: string){ process.stderr.write(s+'\n'); }
function words(s: string){ return s.split(/\s+/).filter(w=>w.length>0).length; }
function sha(s: string){ return createHash('sha256').update(s).digest('hex'); }
function z(){ return Object.fromEntries(DIMS.map(d=>[d,0])) as Record<string,number>; }
function engineVersion(){ try { return execSync('git rev-parse --short HEAD',{cwd:REPO}).toString().trim(); } catch { return 'unknown'; } }
let COEFF_SHA='unknown'; try { COEFF_SHA = sha(readFileSync(path.join(REPO,'packages/sovereign-engine/src/scoring/dispatcher/coefficients-v3-4.ts'),'utf8')).slice(0,16); } catch {}

// corpus : œuvres maîtres (gutenberg_cache) avec catégorie
const BOOKS: ReadonlyArray<readonly [string,string,'fr'|'en',string]> = [
  ['flaubert_bovary_14155.txt','Flaubert','fr','realisme'],['flaubert_education_14285.txt','Flaubert','fr','realisme'],
  ['flaubert_salammbo_10884.txt','Flaubert','fr','epique'],['hugo_miserables_17489.txt','Hugo','fr','social'],
  ['hugo_travailleurs_10907.txt','Hugo','fr','epique'],['maupassant_une_vie_6902.txt','Maupassant','fr','realisme'],
  ['maupassant_bel_ami_3088.txt','Maupassant','fr','realisme'],['proust_swann_2650.txt','Proust','fr','psychologique'],
  ['proust_jeunes_filles_17180.txt','Proust','fr','psychologique'],['zola_bonheur_11953.txt','Zola','fr','naturalisme'],
  ['zola_bete_10007.txt','Zola','fr','naturalisme'],['stendhal_chartreuse_7524.txt','Stendhal','fr','romanesque'],
  ['balzac_lys_1237.txt','Balzac','fr','romanesque'],['balzac_eugenie_1715.txt','Balzac','fr','realisme'],
  ['dickens_two_cities_98.txt','Dickens','en','historique'],['dickens_copperfield_766.txt','Dickens','en','social'],
  ['bronte_e_wuthering_768.txt','Bronte','en','romantique'],['austen_pride_1342.txt','Austen','en','social'],
  ['melville_moby_2701.txt','Melville','en','epique'],
];
const STOP = new Set<string>(('le la les un une des de du au aux et ou mais donc car ce cet cette ces son sa ses mon mes ton tes notre nos votre vos leur leurs il elle ils elles je tu nous vous on que qui quoi dont quand comme dans sur sous avec sans pour par vers chez entre etait etaient sont avait avaient ont est ne pas plus tout tous toute toutes meme aussi bien tres alors apres avant encore puis cela the and that was were have has had his her their they them you not but for with from this these those there here what which when where who how all any are our your she him out about into than then too very upon would could should been being said one like').split(/\s+/));

function cleanG(raw: string){ let t=raw; const s=t.search(/\*\*\*\s*START OF (THE|THIS)? ?PROJECT GUTENBERG/i); if(s>=0)t=t.slice(t.indexOf('\n',s)+1); const e=t.search(/\*\*\*\s*END OF (THE|THIS)? ?PROJECT GUTENBERG/i); if(e>=0)t=t.slice(0,e); return t; }
function passages(raw: string, n: number, target: number){ const text=cleanG(raw); const paras=text.split(/\n\s*\n/).map(p=>p.replace(/\s+/g,' ').trim()).filter(p=>words(p)>=8); const lo=Math.floor(paras.length*0.10),hi=Math.floor(paras.length*0.92); const body=paras.slice(lo,hi); if(body.length<4)return []; const out:string[]=[]; const stride=Math.max(1,Math.floor(body.length/(n+1))); for(let k=1;k<=n;k++){ const start=Math.min(body.length-1,k*stride); let acc:string[]=[],w=0; for(let i=start;i<body.length&&w<target;i++){acc.push(body[i]!);w+=words(body[i]!);} const p=acc.join('\n\n'); if(words(p)>=500&&words(p)<=2600)out.push(p);} return out; }
function signature(raw: string){ const text=cleanG(raw).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,''); const toks=text.split(/[^a-z]+/).filter(w=>w.length>=4&&!STOP.has(w)); const f=new Map<string,number>(); for(const t of toks)f.set(t,(f.get(t)??0)+1); return [...f.entries()].sort((a,b)=>b[1]-a[1]).slice(0,12).map(([w])=>w); }

// OPTION A : contrat dérivé de l'arc de l'ŒUVRE entière (4 quartiles du livre complet)
function deriveWorkContract(raw: string, lang: 'fr'|'en'): { contract: EmotionContract; hash: string } {
  const text=cleanG(raw); const paras=text.split(/\n\s*\n/).map(p=>p.replace(/\s+/g,' ').trim()).filter(p=>words(p)>=8);
  const lo=Math.floor(paras.length*0.10),hi=Math.floor(paras.length*0.92); const body=paras.slice(lo,hi);
  const q: Record<string,number>[]=[];
  for(let i=0;i<4;i++){ const seg=body.slice(Math.floor(i*body.length/4),Math.floor((i+1)*body.length/4)).join('\n\n');
    const e=analyzeEmotionFromText(seg,lang) as unknown as Record<string,number>; const t14=z(); for(const d of DIMS)t14[d]=e[d]??0; q.push(t14); }
  const cq=q.map((t14,i)=>{ let dom='', bv=-1; for(const d of DIMS){const x=t14[d]??0; if(x>bv){bv=x;dom=d;}}
    const norm=DIMS.reduce((a,d)=>a+(t14[d]??0),0)||1; let val=0,aro=0; for(const d of DIMS){const w=(t14[d]??0)/norm; val+=w*VAL[d]; aro+=w*ARO[d];}
    return { quartile:['Q1','Q2','Q3','Q4'][i], target_14d:t14, valence:+val.toFixed(2), arousal:+aro.toFixed(2), dominant:dom, narrative_instruction:`work-arc Q${i+1}` }; });
  const q4=cq[3];
  const contract={ curve_quartiles:cq as any, intensity_range:{min:0.3,max:0.9}, tension:{slope_target:'arc',pic_position_pct:0.6,faille_position_pct:0.75,silence_zones:[]},
    terminal_state:{target_14d:q4.target_14d,valence:q4.valence,arousal:q4.arousal,dominant:q4.dominant,reader_state:'work terminal'},
    rupture:{exists:false,position_pct:0,before_dominant:cq[0].dominant,after_dominant:q4.dominant,delta_valence:0},
    valence_arc:{start:cq[0].valence,end:q4.valence,direction:q4.valence<cq[0].valence?'darkening':'brightening'} } as EmotionContract;
  return { contract, hash: sha(JSON.stringify(cq)).slice(0,16) };
}
function buildPacket(sig: string[], lang: 'fr'|'en', contract: EmotionContract): ForgePacket {
  const pack=JSON.parse(readFileSync(path.join(REPO,'golden/intents/intent_pack_gardien.json'),'utf8'));
  const { plan }=createGenesisPlan(pack.intent,pack.canon,pack.constraints,pack.genome,pack.emotion,createDefaultConfig(),TS);
  const scene0=plan.arcs[0]!.scenes[0]! as Scene;
  const style:StyleProfile={ version:'1.0.0',universe:'literary_fiction',
    lexicon:{signature_words:sig,forbidden_words:[],abstraction_max_ratio:0.30,concrete_min_ratio:0.50},
    rhythm:{avg_sentence_length_target:20,gini_target:0.45,max_consecutive_similar:2,min_syncopes_per_scene:2,min_compressions_per_scene:1},
    tone:{dominant_register:'soutenu',intensity_range:[0.2,0.9] as readonly[number,number]},
    imagery:{recurrent_motifs:sig.slice(0,5),density_target_per_100_words:3,banned_metaphors:[]}, voice:DEFAULT_VOICE_GENOME };
  const base=assembleForgePacket({plan,scene:scene0,style_profile:style,kill_lists:{banned_words:[],banned_cliches:[],banned_ai_patterns:[],banned_filter_words:[]} as KillLists,canon:[] as CanonEntry[],continuity:{previous_scene_summary:'',character_states:[],open_threads:[]} as ForgeContinuity,run_id:'wsc',language:lang});
  return { ...base, emotion_contract: contract };
}

async function main(){
  log(`=== WS-C MASTER COMPOSITE CALIBRATION — ${MODEL} | k=${K} | passages/work=${NPASS} | OPTION A ===`);
  mkdirSync(OUT,{recursive:true});
  const provider=createOllamaProvider({baseUrl:OLLAMA_URL,model:MODEL,draftTemperature:0.0,judgeTemperature:0.0,draftMaxTokens:2000,judgeMaxTokens:2000});
  const done=new Set<string>();
  if(existsSync(JSONL)) for(const l of readFileSync(JSONL,'utf8').split(/\n/)){ if(!l.trim())continue; try{const r=JSON.parse(l); done.add(r.key);}catch{} }
  log(`resume: ${done.size} mesures déjà présentes`);
  const avg=(xs:number[])=>xs.reduce((a,b)=>a+b,0)/(xs.length||1);
  for(const [file,author,lang,cat] of BOOKS){
    const fp=path.join(CACHE,file); if(!existsSync(fp)){log(`  MISSING ${file}`);continue;}
    const raw=readFileSync(fp,'utf8'); const sig=signature(raw); const {contract,hash:chash}=deriveWorkContract(raw,lang); const packet=buildPacket(sig,lang,contract);
    const ps=passages(raw,NPASS,1400);
    for(let i=0;i<ps.length;i++){ const prose=ps[i]!; const psha=sha(prose).slice(0,16); const key=`${psha}:${chash}`;
      if(done.has(key)){continue;}
      try {
        const eccR:number[]=[],rciR:number[]=[],siiR:number[]=[],ifiR:number[]=[],aaiR:number[]=[];
        log(`  -> ${author.padEnd(10)} [${cat}] p${i} (${words(prose)}w) scoring 5 axes x k=${K}...`);
        for(let k=0;k<K;k++){
          const e=(await computeECC(packet,prose,provider)).score; if(k===0)log(`       ecc=${e.toFixed(0)}`); eccR.push(e);
          const rc=(await computeRCI(packet,prose)).score; rciR.push(rc);
          const s=(await computeSII(packet,prose,provider)).score; if(k===0)log(`       sii=${s.toFixed(0)}`); siiR.push(s);
          const f=(await computeIFI(packet,prose,provider)).score; if(k===0)log(`       ifi=${f.toFixed(0)}`); ifiR.push(f);
          const a=(await computeAAI(packet,prose,provider)).score; if(k===0)log(`       aai=${a.toFixed(0)}`); aaiR.push(a);
        }
        const ecc=avg(eccR),rci=avg(rciR),sii=avg(siiR),ifi=avg(ifiR),aai=avg(aaiR);
        const composite=ecc*0.33+rci*0.17+sii*0.15+ifi*0.10+aai*0.25;
        const min_axis=Math.min(ecc,rci,sii,ifi,aai);
        const rec={ key, author, lang, category:cat, passage:i, words:words(prose),
          score:{ composite:+composite.toFixed(2), ecc:+ecc.toFixed(2), rci:+rci.toFixed(2), sii:+sii.toFixed(2), ifi:+ifi.toFixed(2), aai:+aai.toFixed(2), min_axis:+min_axis.toFixed(2) },
          provenance:{ prose_sha256:sha(prose), prose_words:words(prose), contract_hash:chash, packet_signature_words:sig, language:lang,
            engine_version:engineVersion(), coefficients_sha256:COEFF_SHA, model:MODEL, judge_temperature:0, k_runs:K,
            packet_completeness: sig.length>0?'FULL':'INVALID_PACKET', contract_method:'OPTION_A_work_arc', timestamp:new Date().toISOString() } };
        appendFileSync(JSONL,JSON.stringify(rec)+'\n','utf8'); done.add(key);
        log(`  ${author.padEnd(10)} [${cat}] p${i} comp=${composite.toFixed(1)} (ecc=${ecc.toFixed(0)} rci=${rci.toFixed(0)} sii=${sii.toFixed(0)} ifi=${ifi.toFixed(0)} aai=${aai.toFixed(0)}) min=${min_axis.toFixed(0)}`);
      } catch(e:any){ log(`  ERR ${author} p${i}: ${e?.message??e}`); }
    }
  }
  // ---- agrégation finale ----
  const rows=readFileSync(JSONL,'utf8').split(/\n/).filter(l=>l.trim()).map(l=>JSON.parse(l));
  const pick=(k:string)=>rows.map(r=>r.score[k]).filter((x:number)=>Number.isFinite(x));
  const pct=(xs:number[],p:number)=>{const s=[...xs].sort((a,b)=>a-b);if(!s.length)return NaN;const i=p/100*(s.length-1),lo=Math.floor(i),hi=Math.ceil(i);return +(lo===hi?s[lo]:s[lo]+(s[hi]-s[lo])*(i-lo)).toFixed(2);};
  const dist=(k:string)=>{const xs=pick(k);return {n:xs.length,mean:+avg(xs).toFixed(2),p10:pct(xs,10),p25:pct(xs,25),p50:pct(xs,50),p75:pct(xs,75),p90:pct(xs,90),min:Math.min(...xs),max:Math.max(...xs)};};
  const OLD={composite:93,min_axis:80,ecc:88,aai:85};
  const summary={ tool:'wsc-master-composite-calibration.ts', model:MODEL, k:K, n_measures:rows.length, n_works:new Set(rows.map(r=>r.author+r.category)).size, contract_method:'OPTION_A_work_arc',
    dist:{ composite:dist('composite'),ecc:dist('ecc'),rci:dist('rci'),sii:dist('sii'),ifi:dist('ifi'),aai:dist('aai'),min_axis:dist('min_axis') },
    OLD_thresholds:OLD,
    palier_candidates_percentile:{ S_composite_p90:dist('composite').p90, A_composite_p50:dist('composite').p50, B_composite_p25:dist('composite').p25,
      SEAL_old_93_master_passrate:`${pick('composite').filter((x:number)=>x>=93).length}/${rows.length}`,
      ecc_floor_p25:dist('ecc').p25, aai_floor_p25:dist('aai').p25, min_axis_p25:dist('min_axis').p25 },
    CAVEAT:'OPTION A : contrat = arc de l œuvre entière. Résidu circulaire sur tension_14d (un passage tend à matcher l arc de son œuvre) => ECC composite légèrement optimiste. Contrôle croisé Option B/C recommandé. Aucun seuil changé.' };
  writeFileSync(path.join(OUT,'WS_C_MASTER_COMPOSITE_CALIBRATION.json'),JSON.stringify(summary,null,2),'utf8');
  const cols=['author','lang','category','passage','words','composite','ecc','rci','sii','ifi','aai','min_axis'];
  writeFileSync(path.join(OUT,'WS_C_MASTER_COMPOSITE_CALIBRATION.csv'),[cols.join(','),...rows.map(r=>[r.author,r.lang,r.category,r.passage,r.words,r.score.composite,r.score.ecc,r.score.rci,r.score.sii,r.score.ifi,r.score.aai,r.score.min_axis].join(','))].join('\n')+'\n','utf8');
  log('\n=== SUMMARY ==='); log(JSON.stringify(summary,null,2));
}
main().catch(e=>{log('FATAL: '+(e?.stack??e));process.exit(1);});
