/**
 * OMEGA METROLOGY — WS-D IFI AUTOPSY (CALC-only, READ-ONLY, autonome)
 * ============================================================================
 * WS-C : IFI = axe-tueur des maîtres (médiane 49.4 -> plombe min_axis). Question
 * (point Architecte) : IFI est-il CASSÉ, ou JUSTE mais l'échelle/attente fausse
 * (biais de modernité : la prose XIXe a moins d'immersion sensorielle explicite) ?
 *
 * IFI = sensory_richness*0.25 + corporeal_anchoring*0.25 + focalisation*0.25(LLM)
 *       + attention*0.125 + fatigue*0.125 (+ distribution bonus).
 * 4/5 sous-axes sont CALC -> autopsie autonome (focalisation LLM = 0.25, reportée).
 * On RÉPLIQUE fidèlement computeSensoryRichness + computeCorporealAnchoring
 * (macro-axes.ts:776,824) et on appelle scoreAttentionSustain/scoreFatigueManagement
 * (exportés) sur le corpus maître -> décompose IFI par sous-axe et par auteur.
 * 0 Ollama, 0 patch. Run via Start-Process node + tsx.
 */
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { createGenesisPlan } from '../../packages/genesis-planner/src/planner.js';
import { createDefaultConfig } from '../../packages/genesis-planner/src/config.js';
import type { Scene } from '../../packages/genesis-planner/src/types.js';
import { assembleForgePacket } from '../../packages/sovereign-engine/src/input/forge-packet-assembler.js';
import { SOVEREIGN_CONFIG } from '../../packages/sovereign-engine/src/config.js';
import { scoreAttentionSustain } from '../../packages/sovereign-engine/src/oracle/axes/attention-sustain.js';
import { scoreFatigueManagement } from '../../packages/sovereign-engine/src/oracle/axes/fatigue-management.js';
import { DEFAULT_VOICE_GENOME } from '../../packages/sovereign-engine/src/voice/voice-genome.js';
import type { ForgePacket, StyleProfile, KillLists, CanonEntry, ForgeContinuity } from '../../packages/sovereign-engine/src/types.js';

const REPO = path.resolve(process.cwd(), process.cwd().endsWith('sovereign-engine') ? '../..' : '.');
const CACHE = path.join(REPO, 'omega-autopsie', 'gutenberg_cache');
const TS = '2026-01-01T00:00:00.000Z';
function log(s: string){ process.stderr.write(s+'\n'); }
function words(s: string){ return s.split(/\s+/).filter(w=>w.length>0).length; }

// RÉPLIQUE EXACTE de computeSensoryRichness (macro-axes.ts:776)
const SENSORY: Record<string,string[]> = {
  sight:['voir','regard','yeux','lumière','ombre','couleur','forme','éclat','reflet','lueur','scintillement','obscurité','clarté','horizon','silhouette','contour','teinte','pénombre'],
  sound:['entendre','bruit','voix','silence','écho','murmure','grondement','sifflement','crissement','bourdonnement','résonance','fracas','clapotis','bruissement','tintement'],
  touch:['toucher','peau','contact','texture','caresser','frôler','effleurer','rugosité','douceur','pression','grain','surface','palper','saisir','empoigner','serrer'],
  smell:['odeur','parfum','sentir','puanteur','arôme','fragrance','effluve','relent','exhalaison','encens','musc','résine','moisi','âcre','épicé'],
  temperature:['chaud','froid','tiède','glacé','brûlant','frais','chaleur','geler','fièvre','moiteur','fraîcheur','canicule','givre','vapeur','torride','mordant'],
};
function sensoryRichness(prose: string): number {
  const lp=prose.toLowerCase(); let n=0;
  for(const c of Object.keys(SENSORY)) if(SENSORY[c].some(m=>lp.includes(m))) n++;
  return n/5*100;
}
// RÉPLIQUE EXACTE de computeCorporealAnchoring (macro-axes.ts:824)
function corporealAnchoring(prose: string): number {
  const lp=prose.toLowerCase(); let count=0;
  for(const m of (SOVEREIGN_CONFIG as any).CORPOREAL_MARKERS) if(lp.includes(m)) count++;
  const ratio=Math.min(count/(SOVEREIGN_CONFIG as any).CORPOREAL_TARGET,1.0);
  return ratio*100;
}
function cleanG(raw: string){ let t=raw; const s=t.search(/\*\*\*\s*START OF (THE|THIS)? ?PROJECT GUTENBERG/i); if(s>=0)t=t.slice(t.indexOf('\n',s)+1); const e=t.search(/\*\*\*\s*END OF (THE|THIS)? ?PROJECT GUTENBERG/i); if(e>=0)t=t.slice(0,e); return t; }
function passages(raw: string, n: number, target: number){ const text=cleanG(raw); const paras=text.split(/\n\s*\n/).map(p=>p.replace(/\s+/g,' ').trim()).filter(p=>words(p)>=8); const lo=Math.floor(paras.length*0.10),hi=Math.floor(paras.length*0.92); const body=paras.slice(lo,hi); if(body.length<4)return[]; const out:string[]=[]; const stride=Math.max(1,Math.floor(body.length/(n+1))); for(let k=1;k<=n;k++){ const start=Math.min(body.length-1,k*stride); let acc:string[]=[],w=0; for(let i=start;i<body.length&&w<target;i++){acc.push(body[i]!);w+=words(body[i]!);} const p=acc.join('\n\n'); if(words(p)>=500&&words(p)<=2600)out.push(p);} return out; }

const BOOKS:ReadonlyArray<readonly[string,string]>=[
  ['flaubert_bovary_14155.txt','Flaubert'],['flaubert_education_14285.txt','Flaubert'],['flaubert_salammbo_10884.txt','Flaubert'],
  ['hugo_miserables_17489.txt','Hugo'],['hugo_travailleurs_10907.txt','Hugo'],['maupassant_une_vie_6902.txt','Maupassant'],
  ['maupassant_bel_ami_3088.txt','Maupassant'],['proust_swann_2650.txt','Proust'],['proust_jeunes_filles_17180.txt','Proust'],
  ['zola_bonheur_11953.txt','Zola'],['zola_bete_10007.txt','Zola'],['stendhal_chartreuse_7524.txt','Stendhal'],
  ['balzac_lys_1237.txt','Balzac'],['balzac_eugenie_1715.txt','Balzac'],['dickens_two_cities_98.txt','Dickens'],
  ['dickens_copperfield_766.txt','Dickens'],['bronte_e_wuthering_768.txt','Bronte'],['austen_pride_1342.txt','Austen'],
  ['melville_moby_2701.txt','Melville'],
];
function basePacket(): ForgePacket {
  const pack=JSON.parse(readFileSync(path.join(REPO,'golden/intents/intent_pack_gardien.json'),'utf8'));
  const { plan }=createGenesisPlan(pack.intent,pack.canon,pack.constraints,pack.genome,pack.emotion,createDefaultConfig(),TS);
  const scene0=plan.arcs[0]!.scenes[0]! as Scene;
  const style:StyleProfile={version:'1.0.0',universe:'literary_fiction',lexicon:{signature_words:[],forbidden_words:[],abstraction_max_ratio:0.3,concrete_min_ratio:0.5},rhythm:{avg_sentence_length_target:20,gini_target:0.45,max_consecutive_similar:2,min_syncopes_per_scene:2,min_compressions_per_scene:1},tone:{dominant_register:'soutenu',intensity_range:[0.2,0.9] as readonly[number,number]},imagery:{recurrent_motifs:[],density_target_per_100_words:3,banned_metaphors:[]},voice:DEFAULT_VOICE_GENOME};
  return assembleForgePacket({plan,scene:scene0,style_profile:style,kill_lists:{banned_words:[],banned_cliches:[],banned_ai_patterns:[],banned_filter_words:[]} as KillLists,canon:[] as CanonEntry[],continuity:{previous_scene_summary:'',character_states:[],open_threads:[]} as ForgeContinuity,run_id:'ifi_autopsy',language:'fr'});
}
function dist(xs:number[]){ const s=[...xs].sort((a,b)=>a-b); const n=s.length; const q=(p:number)=>{const i=p/100*(n-1),lo=Math.floor(i),hi=Math.ceil(i);return +(lo===hi?s[lo]:s[lo]+(s[hi]-s[lo])*(i-lo)).toFixed(1);}; return {n,mean:+(s.reduce((a,b)=>a+b,0)/n).toFixed(1),p10:q(10),p50:q(50),p90:q(90),min:+s[0].toFixed(1),max:+s[n-1].toFixed(1)}; }

function main(){
  log('=== WS-D IFI AUTOPSY (CALC sous-axes, autonome) ===');
  log(`CORPOREAL_TARGET=${(SOVEREIGN_CONFIG as any).CORPOREAL_TARGET} | CORPOREAL_MARKERS=${((SOVEREIGN_CONFIG as any).CORPOREAL_MARKERS||[]).length}`);
  const packet=basePacket();
  const rows:any[]=[];
  for(const [file,author] of BOOKS){
    const fp=path.join(CACHE,file); let raw:string; try{raw=readFileSync(fp,'utf8');}catch{continue;}
    const ps=passages(raw,5,1400);
    for(let i=0;i<ps.length;i++){ const prose=ps[i]!;
      const sr=sensoryRichness(prose), ca=corporealAnchoring(prose);
      const att=scoreAttentionSustain(packet,prose).score, fat=scoreFatigueManagement(packet,prose).score;
      // IFI CALC partiel (sans focalisation LLM 0.25) renormalisé sur 0.75
      const ifi_calc_partial=(sr*0.25+ca*0.25+att*0.125+fat*0.125)/0.75;
      rows.push({author,passage:i,words:words(prose),sensory:+sr.toFixed(1),corporeal:+ca.toFixed(1),attention:+att.toFixed(1),fatigue:+fat.toFixed(1),ifi_calc_partial:+ifi_calc_partial.toFixed(1)});
    }
  }
  const col=(k:string)=>rows.map(r=>r[k]);
  log(`\n=== DISTRIBUTIONS sous-axes IFI (CALC) sur ${rows.length} passages maîtres ===`);
  for(const k of ['sensory','corporeal','attention','fatigue','ifi_calc_partial']) log(`  ${k.padEnd(18)}: ${JSON.stringify(dist(col(k)))}`);
  // par auteur : moyenne sensory+corporeal (les axes "immersion sensorielle/corps")
  log('\n=== par auteur (sensory / corporeal / attention / fatigue) ===');
  const byA=new Map<string,any[]>(); for(const r of rows){ if(!byA.has(r.author))byA.set(r.author,[]); byA.get(r.author)!.push(r); }
  for(const [a,rs] of byA){ const m=(k:string)=>+(rs.reduce((x,r)=>x+r[k],0)/rs.length).toFixed(0); log(`  ${a.padEnd(11)} sens=${m('sensory')} corp=${m('corporeal')} att=${m('attention')} fat=${m('fatigue')}`); }
  // 5 pires ifi_calc_partial
  log('\n=== 5 pires (ifi_calc_partial) ===');
  [...rows].sort((a,b)=>a.ifi_calc_partial-b.ifi_calc_partial).slice(0,5).forEach(r=>log(`  ${r.author} p${r.passage}: IFIcalc=${r.ifi_calc_partial} (sens=${r.sensory} corp=${r.corporeal} att=${r.attention} fat=${r.fatigue})`));
  log('\nVerdict-guide : si sensory/corporeal sont structurellement bas chez TOUS les maîtres -> IFI mesure correctement une DENSITÉ d immersion sensorielle (biais de modernité) -> le capteur est JUSTE, c est l ÉCHELLE (IFI en floor universel min_axis) qui est fausse. Si att/fatigue dominent la chute -> autre cause.');
}
main();
