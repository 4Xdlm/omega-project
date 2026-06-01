/**
 * OMEGA METROLOGY — WS-D KEYWORD CIRCULARITY (CALC, READ-ONLY, autonome, nuit)
 * ============================================================================
 * Quantifie la K2-CIRCULARITÉ : les capteurs keyword sont-ils SATURÉS par la sortie OMEGA
 * (ALTERNANCE prose) mais RATÉS par les maîtres ? Si oui -> ils récompensent le style de
 * l'engine, pas la qualité littéraire (circularité). CALC, 0 Ollama.
 * Capteurs : sensory_richness (répliqué), corporeal_anchoring (répliqué), anti_cliche,
 *   rhythm, euphony. Groupes : maîtres-FR, maîtres-EN, OMEGA-output (ALTERNANCE prose).
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
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
const REPO=path.resolve(process.cwd(),process.cwd().endsWith('sovereign-engine')?'../..':'.');
const CACHE=path.join(REPO,'omega-autopsie','gutenberg_cache');const TS='2026-01-01T00:00:00.000Z';
function log(s:string){process.stderr.write(s+'\n');}function words(s:string){return s.split(/\s+/).filter(w=>w.length>0).length;}
const SEN:Record<string,string[]>={sight:['voir','regard','yeux','lumière','ombre','couleur','forme','éclat','reflet','lueur','obscurité','clarté','horizon','silhouette','teinte','pénombre'],sound:['entendre','bruit','voix','silence','écho','murmure','grondement','sifflement','crissement','résonance','fracas','bruissement','tintement'],touch:['toucher','peau','contact','texture','caresser','frôler','rugosité','douceur','pression','grain','palper','saisir','serrer'],smell:['odeur','parfum','sentir','puanteur','arôme','fragrance','effluve','relent','encens','musc','moisi','âcre','épicé'],temperature:['chaud','froid','tiède','glacé','brûlant','frais','chaleur','geler','fièvre','moiteur','fraîcheur','givre','vapeur','torride']};
function sen(p:string){const lp=p.toLowerCase();let n=0;for(const c of Object.keys(SEN))if(SEN[c].some(m=>lp.includes(m)))n++;return n/5*100;}
function cor(p:string){const lp=p.toLowerCase();let c=0;for(const m of (SOVEREIGN_CONFIG as any).CORPOREAL_MARKERS)if(lp.includes(m))c++;return Math.min(c/(SOVEREIGN_CONFIG as any).CORPOREAL_TARGET,1)*100;}
function cg(raw:string){let t=raw;const s=t.search(/\*\*\*\s*START OF (THE|THIS)? ?PROJECT GUTENBERG/i);if(s>=0)t=t.slice(t.indexOf('\n',s)+1);const e=t.search(/\*\*\*\s*END OF (THE|THIS)? ?PROJECT GUTENBERG/i);if(e>=0)t=t.slice(0,e);return t;}
function pass(raw:string,n:number){const ps=cg(raw).split(/\n\s*\n/).map(p=>p.replace(/\s+/g,' ').trim()).filter(p=>words(p)>=8);const lo=Math.floor(ps.length*0.1),hi=Math.floor(ps.length*0.92);const b=ps.slice(lo,hi);const o:string[]=[];const str=Math.max(1,Math.floor(b.length/(n+1)));for(let k=1;k<=n;k++){const s=Math.min(b.length-1,k*str);let a:string[]=[],w=0;for(let i=s;i<b.length&&w<1400;i++){a.push(b[i]!);w+=words(b[i]!);}const pp=a.join('\n\n');if(words(pp)>=500&&words(pp)<=2600)o.push(pp);}return o;}
const M:ReadonlyArray<readonly[string,'fr'|'en']>=[['flaubert_bovary_14155.txt','fr'],['hugo_miserables_17489.txt','fr'],['proust_swann_2650.txt','fr'],['zola_bete_10007.txt','fr'],['maupassant_bel_ami_3088.txt','fr'],['balzac_lys_1237.txt','fr'],['stendhal_chartreuse_7524.txt','fr'],['dickens_two_cities_98.txt','en'],['austen_pride_1342.txt','en'],['melville_moby_2701.txt','en'],['bronte_e_wuthering_768.txt','en']];
function bp(lang:'fr'|'en'):ForgePacket{const pk=JSON.parse(readFileSync(path.join(REPO,'golden/intents/intent_pack_gardien.json'),'utf8'));const {plan}=createGenesisPlan(pk.intent,pk.canon,pk.constraints,pk.genome,pk.emotion,createDefaultConfig(),TS);const s0=plan.arcs[0]!.scenes[0]! as Scene;const st:StyleProfile={version:'1.0.0',universe:'literary_fiction',lexicon:{signature_words:[],forbidden_words:[],abstraction_max_ratio:0.3,concrete_min_ratio:0.5},rhythm:{avg_sentence_length_target:20,gini_target:0.45,max_consecutive_similar:2,min_syncopes_per_scene:2,min_compressions_per_scene:1},tone:{dominant_register:'soutenu',intensity_range:[0.2,0.9] as readonly[number,number]},imagery:{recurrent_motifs:[],density_target_per_100_words:3,banned_metaphors:[]},voice:DEFAULT_VOICE_GENOME};return assembleForgePacket({plan,scene:s0,style_profile:st,kill_lists:{banned_words:[],banned_cliches:[],banned_ai_patterns:[],banned_filter_words:[]} as KillLists,canon:[] as CanonEntry[],continuity:{previous_scene_summary:'',character_states:[],open_threads:[]} as ForgeContinuity,run_id:'circ',language:lang});}
const mean=(xs:number[])=>xs.length?+(xs.reduce((a,b)=>a+b,0)/xs.length).toFixed(1):0;
function score(prose:string,pkt:ForgePacket){return {sensory:sen(prose),corporeal:cor(prose),anti_cliche:scoreAntiCliche(pkt,prose).score,rhythm:scoreRhythm(pkt,prose).score,euphony:scoreEuphonyBasic(pkt,prose).score};}
function main(){
  log('=== WS-D KEYWORD CIRCULARITY (maîtres vs sortie OMEGA) ===');
  const pf=bp('fr'),pe=bp('en');
  const groups:Record<string,any[]>={mFR:[],mEN:[],omega:[]};
  for(const [f,lang] of M){const fp=path.join(CACHE,f);if(!existsSync(fp))continue;for(const pr of pass(readFileSync(fp,'utf8'),2))groups[lang==='fr'?'mFR':'mEN'].push(score(pr,lang==='fr'?pf:pe));}
  const sdir=path.join(REPO,'packages/sovereign-engine/sessions');const alt=existsSync(sdir)?readdirSync(sdir).find(d=>d.startsWith('ALTERNANCE_STUDY')):null;
  if(alt){const base=path.join(sdir,alt);for(const f of readdirSync(base).filter(x=>x.startsWith('prose_')&&x.endsWith('.txt'))){const pr=readFileSync(path.join(base,f),'utf8');if(words(pr)>=200)groups.omega.push(score(pr,pf));}}
  log(`\nn : maîtres-FR=${groups.mFR.length} maîtres-EN=${groups.mEN.length} OMEGA-output=${groups.omega.length}`);
  log('\ncapteur        | maîtres-FR | maîtres-EN | OMEGA-output | circularité (OMEGA - maîtres_moy)');
  for(const k of ['sensory','corporeal','anti_cliche','rhythm','euphony']){
    const mf=mean(groups.mFR.map(r=>r[k])),me=mean(groups.mEN.map(r=>r[k])),om=mean(groups.omega.map(r=>r[k]));
    const mAll=mean([...groups.mFR,...groups.mEN].map(r=>r[k]));const circ=+(om-mAll).toFixed(1);
    const flag=circ>=15?'  <-- CIRCULAIRE (OMEGA sature, maîtres ratent)':(Math.abs(circ)<10?'  (neutre)':'');
    log(`  ${k.padEnd(12)} | ${String(mf).padStart(9)} | ${String(me).padStart(9)} | ${String(om).padStart(11)} | Δ=${circ}${flag}`);
  }
  log('\nLecture : Δ>=15 (OMEGA >> maîtres) = capteur K2-circulaire (récompense le style engine, pas la qualité).');
  log('rhythm/euphony ~neutres attendus (VALID) ; sensory/corporeal/anti_cliche circulaires attendus.');
}
main();
