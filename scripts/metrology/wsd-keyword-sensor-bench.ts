/**
 * OMEGA METROLOGY — WS-D KEYWORD SENSOR FR/EN BIAS BENCH (CALC, READ-ONLY, autonome)
 * ============================================================================
 * Audit empirique du biais LANGUE des sous-capteurs CALC keyword/lexical/structurel,
 * sur le corpus maître WS-C (FR vs EN). Étend l'autopsie IFI à tous les capteurs CALC.
 * Capteurs mesurés (tous CALC, 0 Ollama) :
 *   sensory_richness (répliqué, FR keyword), corporeal_anchoring (répliqué),
 *   anti_cliche (scoreAntiCliche), rhythm (scoreRhythm), euphony (scoreEuphonyBasic).
 * But : montrer FR-mean vs EN-mean par capteur -> classer LANGUAGE_BIASED.
 * 0 patch, 0 seuil. Run via Start-Process node + tsx.
 */
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { createGenesisPlan } from '../../packages/genesis-planner/src/planner.js';
import { createDefaultConfig } from '../../packages/genesis-planner/src/config.js';
import type { Scene } from '../../packages/genesis-planner/src/types.js';
import { assembleForgePacket } from '../../packages/sovereign-engine/src/input/forge-packet-assembler.js';
import { SOVEREIGN_CONFIG } from '../../packages/sovereign-engine/src/config.js';
import { scoreAntiCliche } from '../../packages/sovereign-engine/src/oracle/axes/anti-cliche.js';
import { scoreRhythm } from '../../packages/sovereign-engine/src/oracle/axes/rhythm.js';
import { scoreEuphonyBasic } from '../../packages/sovereign-engine/src/oracle/axes/euphony-basic.js';
import { DEFAULT_VOICE_GENOME } from '../../packages/sovereign-engine/src/voice/voice-genome.js';
import type { ForgePacket, StyleProfile, KillLists, CanonEntry, ForgeContinuity } from '../../packages/sovereign-engine/src/types.js';

const REPO = path.resolve(process.cwd(), process.cwd().endsWith('sovereign-engine') ? '../..' : '.');
const CACHE = path.join(REPO, 'omega-autopsie', 'gutenberg_cache');
const TS = '2026-01-01T00:00:00.000Z';
function log(s:string){process.stderr.write(s+'\n');}
function words(s:string){return s.split(/\s+/).filter(w=>w.length>0).length;}
const SENSORY:Record<string,string[]>={sight:['voir','regard','yeux','lumière','ombre','couleur','forme','éclat','reflet','lueur','scintillement','obscurité','clarté','horizon','silhouette','contour','teinte','pénombre'],sound:['entendre','bruit','voix','silence','écho','murmure','grondement','sifflement','crissement','bourdonnement','résonance','fracas','clapotis','bruissement','tintement'],touch:['toucher','peau','contact','texture','caresser','frôler','effleurer','rugosité','douceur','pression','grain','surface','palper','saisir','empoigner','serrer'],smell:['odeur','parfum','sentir','puanteur','arôme','fragrance','effluve','relent','exhalaison','encens','musc','résine','moisi','âcre','épicé'],temperature:['chaud','froid','tiède','glacé','brûlant','frais','chaleur','geler','fièvre','moiteur','fraîcheur','canicule','givre','vapeur','torride','mordant']};
function sensory(p:string){const lp=p.toLowerCase();let n=0;for(const c of Object.keys(SENSORY))if(SENSORY[c].some(m=>lp.includes(m)))n++;return n/5*100;}
function corporeal(p:string){const lp=p.toLowerCase();let c=0;for(const m of (SOVEREIGN_CONFIG as any).CORPOREAL_MARKERS)if(lp.includes(m))c++;return Math.min(c/(SOVEREIGN_CONFIG as any).CORPOREAL_TARGET,1)*100;}
function cleanG(raw:string){let t=raw;const s=t.search(/\*\*\*\s*START OF (THE|THIS)? ?PROJECT GUTENBERG/i);if(s>=0)t=t.slice(t.indexOf('\n',s)+1);const e=t.search(/\*\*\*\s*END OF (THE|THIS)? ?PROJECT GUTENBERG/i);if(e>=0)t=t.slice(0,e);return t;}
function passages(raw:string,n:number,target:number){const text=cleanG(raw);const paras=text.split(/\n\s*\n/).map(p=>p.replace(/\s+/g,' ').trim()).filter(p=>words(p)>=8);const lo=Math.floor(paras.length*0.10),hi=Math.floor(paras.length*0.92);const body=paras.slice(lo,hi);if(body.length<4)return[];const out:string[]=[];const stride=Math.max(1,Math.floor(body.length/(n+1)));for(let k=1;k<=n;k++){const start=Math.min(body.length-1,k*stride);let acc:string[]=[],w=0;for(let i=start;i<body.length&&w<target;i++){acc.push(body[i]!);w+=words(body[i]!);}const p=acc.join('\n\n');if(words(p)>=500&&words(p)<=2600)out.push(p);}return out;}
const BOOKS:ReadonlyArray<readonly[string,string,'fr'|'en']>=[['flaubert_bovary_14155.txt','Flaubert','fr'],['flaubert_education_14285.txt','Flaubert','fr'],['flaubert_salammbo_10884.txt','Flaubert','fr'],['hugo_miserables_17489.txt','Hugo','fr'],['hugo_travailleurs_10907.txt','Hugo','fr'],['maupassant_une_vie_6902.txt','Maupassant','fr'],['maupassant_bel_ami_3088.txt','Maupassant','fr'],['proust_swann_2650.txt','Proust','fr'],['proust_jeunes_filles_17180.txt','Proust','fr'],['zola_bonheur_11953.txt','Zola','fr'],['zola_bete_10007.txt','Zola','fr'],['stendhal_chartreuse_7524.txt','Stendhal','fr'],['balzac_lys_1237.txt','Balzac','fr'],['balzac_eugenie_1715.txt','Balzac','fr'],['dickens_two_cities_98.txt','Dickens','en'],['dickens_copperfield_766.txt','Dickens','en'],['bronte_e_wuthering_768.txt','Bronte','en'],['austen_pride_1342.txt','Austen','en'],['melville_moby_2701.txt','Melville','en']];
function basePacket(lang:'fr'|'en'):ForgePacket{const pack=JSON.parse(readFileSync(path.join(REPO,'golden/intents/intent_pack_gardien.json'),'utf8'));const {plan}=createGenesisPlan(pack.intent,pack.canon,pack.constraints,pack.genome,pack.emotion,createDefaultConfig(),TS);const scene0=plan.arcs[0]!.scenes[0]! as Scene;const style:StyleProfile={version:'1.0.0',universe:'literary_fiction',lexicon:{signature_words:[],forbidden_words:[],abstraction_max_ratio:0.3,concrete_min_ratio:0.5},rhythm:{avg_sentence_length_target:20,gini_target:0.45,max_consecutive_similar:2,min_syncopes_per_scene:2,min_compressions_per_scene:1},tone:{dominant_register:'soutenu',intensity_range:[0.2,0.9] as readonly[number,number]},imagery:{recurrent_motifs:[],density_target_per_100_words:3,banned_metaphors:[]},voice:DEFAULT_VOICE_GENOME};return assembleForgePacket({plan,scene:scene0,style_profile:style,kill_lists:{banned_words:[],banned_cliches:[],banned_ai_patterns:[],banned_filter_words:[]} as KillLists,canon:[] as CanonEntry[],continuity:{previous_scene_summary:'',character_states:[],open_threads:[]} as ForgeContinuity,run_id:'kw',language:lang});}
function mean(xs:number[]){return xs.length?+(xs.reduce((a,b)=>a+b,0)/xs.length).toFixed(1):0;}
function med(xs:number[]){const s=[...xs].sort((a,b)=>a-b);return s.length?+s[Math.floor(s.length/2)].toFixed(1):0;}

function main(){
  log('=== WS-D KEYWORD SENSOR FR/EN BIAS BENCH ===');
  const pktFr=basePacket('fr'), pktEn=basePacket('en');
  const rows:any[]=[];
  for(const [file,author,lang] of BOOKS){let raw:string;try{raw=readFileSync(path.join(CACHE,file),'utf8');}catch{continue;}
    const pkt=lang==='fr'?pktFr:pktEn;
    for(const prose of passages(raw,5,1400)){
      rows.push({author,lang,
        sensory:+sensory(prose).toFixed(1), corporeal:+corporeal(prose).toFixed(1),
        anti_cliche:+scoreAntiCliche(pkt,prose).score.toFixed(1),
        rhythm:+scoreRhythm(pkt,prose).score.toFixed(1),
        euphony:+scoreEuphonyBasic(pkt,prose).score.toFixed(1)});
    }
  }
  const fr=rows.filter(r=>r.lang==='fr'), en=rows.filter(r=>r.lang==='en');
  log(`\nn_total=${rows.length} (FR ${fr.length} / EN ${en.length})`);
  log('\n=== BIAIS LANGUE par capteur CALC (FR mean | EN mean | écart EN-FR) ===');
  for(const k of ['sensory','corporeal','anti_cliche','rhythm','euphony']){
    const f=mean(fr.map(r=>r[k])), e=mean(en.map(r=>r[k]));
    const verdict=Math.abs(e-f)>=10?(e<f?'LANGUAGE_BIASED (EN pénalisé)':'LANGUAGE_BIASED (FR pénalisé)'):'langue-neutre';
    log(`  ${k.padEnd(14)} FR=${f}  EN=${e}  Δ(EN-FR)=${(e-f).toFixed(1)}  -> ${verdict}`);
  }
  log('\n=== médianes globales ===');
  for(const k of ['sensory','corporeal','anti_cliche','rhythm','euphony']) log(`  ${k.padEnd(14)} médiane=${med(rows.map(r=>r[k]))} (min ${Math.min(...rows.map(r=>r[k]))} / max ${Math.max(...rows.map(r=>r[k]))})`);
}
main();
