/**
 * OMEGA METROLOGY — WS-D R3 SHADOW DECOUPLE BENCH (DEC-016 O2, Ollama, terminal Architecte)
 * ============================================================================
 * Bench SHADOW de l'option O2 (DEC-016) SANS modifier le moteur : score les 5 macro-axes via le
 * pipeline existant, puis recalcule min_axis / composite / verdict DEUX FOIS :
 *   - LEGACY  : IFI = valeur actuelle (densité : sensory+corporeal+focalisation+attention+fatigue)
 *   - O2      : IFI = PACING uniquement = attention_sustain×0.5 + fatigue_management×0.5
 *               (reconstruit depuis les sub_scores déjà renvoyés par computeIFI — AUCUN patch moteur)
 *
 * QUESTION : retirer la densité de l'axe IFI (a) débloque-t-il le min_axis des MAÎTRES (IFI cessant
 * d'être l'axe-tueur, cf WS-C médiane IFI 49) SANS (b) faire passer la MAUVAISE PROSE en SEAL ?
 *   => si maîtres min_axis ↑ ET badprose ne SEAL pas, O2 est sain. Décision flip = Architecte.
 *
 * NB : packet = gardien (target_14d plat) -> ECC absolu peu réaliste, MAIS identique legacy/O2 :
 *   la comparaison est RELATIVE (seul IFI change) donc le packet s'annule. Le focus est
 *   « IFI était-il l'axe contraignant ? » et « min_axis bouge de combien ? », pas le SEAL absolu.
 *
 * DROITS : best-sellers + mauvaise-prose sous droits. Sortie scores + sha16 + mots only. AUCUNE prose committée.
 * CRASH-SAFE : checkpoint JSONL, reprise auto. NÉCESSITE OLLAMA -> terminal Architecte.
 * Run (cwd=packages/sovereign-engine) :
 *   $env:ECC_K='1'; npx tsx ..\..\scripts\metrology\wsd-r3-shadow-decouple-bench.ts
 * Options : $env:R3_FAMILIES='maitres,badprose,bestsellers'  $env:R3_BOOKS_PER_CELL='3'  $env:R3_SIZE='600'  $env:R3_PASS='1'
 */
process.env.OMEGA_CHUNKED_V4='1'; process.env.OMEGA_PROMPT_V4='1';
import { readFileSync, existsSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as path from 'node:path';
import { createGenesisPlan } from '../../packages/genesis-planner/src/planner.js';
import { createDefaultConfig } from '../../packages/genesis-planner/src/config.js';
import type { Scene } from '../../packages/genesis-planner/src/types.js';
import { assembleForgePacket } from '../../packages/sovereign-engine/src/input/forge-packet-assembler.js';
import { computeECC, computeAAI, computeRCI, computeSII, computeIFI } from '../../packages/sovereign-engine/src/oracle/macro-axes.js';
import { SOVEREIGN_CONFIG } from '../../packages/sovereign-engine/src/config.js';
import { createOllamaProvider } from '../../packages/sovereign-engine/src/runtime/ollama-provider.js';
import { DEFAULT_VOICE_GENOME } from '../../packages/sovereign-engine/src/voice/voice-genome.js';
import type { ForgePacket, StyleProfile, KillLists, CanonEntry, ForgeContinuity } from '../../packages/sovereign-engine/src/types.js';

const REPO=path.resolve(process.cwd(),process.cwd().endsWith('sovereign-engine')?'../..':'.');
const CORP=path.join(REPO,'omega-autopsie','corpus_r','txt');
const OUT=path.join(REPO,'docs','audit','calibration');
const CKPT=path.join(OUT,'WS_D_R3_SHADOW_DECOUPLE.jsonl');
const TS='2026-01-01T00:00:00.000Z';
const MODEL=process.env.ECC_MODEL??'qwen3:32b';
const OLLAMA=process.env.ECC_OLLAMA_URL??'http://localhost:11434';
const FAMILIES=(process.env.R3_FAMILIES??'maitres,badprose').split(',').map(s=>s.trim());
const BOOKS_PER_CELL=Number(process.env.R3_BOOKS_PER_CELL??'3');
const SIZE=Number(process.env.R3_SIZE??'600');
const PASS=Number(process.env.R3_PASS??'1');
const W=SOVEREIGN_CONFIG.MACRO_WEIGHTS, Z=SOVEREIGN_CONFIG.ZONES, F=SOVEREIGN_CONFIG.MACRO_FLOORS;
function log(s:string){process.stderr.write(s+'\n');}
function words(s:string){return s.split(/\s+/).filter(w=>w.length>0).length;}
function sha(s:string){return createHash('sha256').update(s,'utf8').digest('hex').slice(0,16);}

function cleanG(raw:string){let t=raw;const s=t.search(/\*\*\*\s*START OF (THE|THIS)? ?PROJECT GUTENBERG/i);if(s>=0)t=t.slice(t.indexOf('\n',s)+1);const e=t.search(/\*\*\*\s*END OF (THE|THIS)? ?PROJECT GUTENBERG/i);if(e>=0)t=t.slice(0,e);return t;}
function bodyWords(raw:string){const paras=cleanG(raw).split(/\n\s*\n/).map(p=>p.replace(/\s+/g,' ').trim()).filter(p=>words(p)>=8);const lo=Math.floor(paras.length*0.1),hi=Math.floor(paras.length*0.92);return paras.slice(lo,hi).join(' ').split(/\s+/).filter(w=>w.length>0);}
function passages(raw:string,n:number,size:number){const w=bodyWords(raw);if(w.length<size)return w.length>=Math.floor(size*0.7)?[w.join(' ')]:[];const out:string[]=[];const stride=Math.max(size,Math.floor((w.length-size)/(n+1)));for(let k=1;k<=n;k++){const st=Math.min(w.length-size,k*stride);out.push(w.slice(st,st+size).join(' '));}return out;}

// MANIFEST (3 livres/cellule ; on coupe à BOOKS_PER_CELL). FR+EN par famille.
const ALL:ReadonlyArray<readonly[string,string,'fr'|'en']>=[
  ['flaubert_bovary_14155.txt','maitres','fr'],['hugo_miserables_17489.txt','maitres','fr'],['proust_swann_2650.txt','maitres','fr'],
  ['dickens_two_cities_98.txt','maitres','en'],['austen_pride_1342.txt','maitres','en'],['melville_moby_2701.txt','maitres','en'],
  ['projet_derniere_chance_french_edition_andy_weir.txt','bestsellers','fr'],['le_crime_du_paradis_french_edition_guillaume_musso.txt','bestsellers','fr'],['mille_petits_riens_french_edition_jodi_picoult.txt','bestsellers','fr'],
  ['andy_weir_the_martian.txt','bestsellers','en'],['colleen_hoover_it_ends_with_us.txt','bestsellers','en'],['dan_brown_origin.txt','bestsellers','en'],
  ['cinquante_nuances_de_grey_french_edition_el_james.txt','badprose','fr'],['le_pacte_de_sang_french_edition_laura_s_wild.txt','badprose','fr'],['grossesse_mafia_french_edition_melanie_rain.txt','badprose','fr'],
  ['el_james_fifty_shades_of_grey.txt','badprose','en'],['gently_yours_gently_series_book_1_sweetblunch.txt','badprose','en'],['claimed_by_the_mountain_kings_alisson_bento.txt','badprose','en'],
];
function manifest(){const out:Array<readonly[string,string,'fr'|'en']>=[];for(const fam of FAMILIES){for(const lg of ['fr','en'] as const){const cell=ALL.filter(r=>r[1]===fam&&r[2]===lg).slice(0,BOOKS_PER_CELL);out.push(...cell);}}return out;}
function basePacket(lang:'fr'|'en'):ForgePacket{const pack=JSON.parse(readFileSync(path.join(REPO,'golden/intents/intent_pack_gardien.json'),'utf8'));const {plan}=createGenesisPlan(pack.intent,pack.canon,pack.constraints,pack.genome,pack.emotion,createDefaultConfig(),TS);const scene0=plan.arcs[0]!.scenes[0]! as Scene;const style:StyleProfile={version:'1.0.0',universe:'literary_fiction',lexicon:{signature_words:[],forbidden_words:[],abstraction_max_ratio:0.3,concrete_min_ratio:0.5},rhythm:{avg_sentence_length_target:20,gini_target:0.45,max_consecutive_similar:2,min_syncopes_per_scene:2,min_compressions_per_scene:1},tone:{dominant_register:'soutenu',intensity_range:[0.2,0.9] as readonly[number,number]},imagery:{recurrent_motifs:[],density_target_per_100_words:3,banned_metaphors:[]},voice:DEFAULT_VOICE_GENOME};return assembleForgePacket({plan,scene:scene0,style_profile:style,kill_lists:{banned_words:[],banned_cliches:[],banned_ai_patterns:[],banned_filter_words:[]} as KillLists,canon:[] as CanonEntry[],continuity:{previous_scene_summary:'',character_states:[],open_threads:[]} as ForgeContinuity,run_id:'r3sh',language:lang});}
const mean=(xs:number[])=>xs.length?+(xs.reduce((a,b)=>a+b,0)/xs.length).toFixed(2):0;
function subBy(ifi:any,re:RegExp,idx:number){const s=(ifi.sub_scores||[]).find((x:any)=>re.test(String(x.name||'')));return s?s.score:(ifi.sub_scores?.[idx]?.score??0);}
function composite(ecc:number,rci:number,sii:number,ifi:number,aai:number){return ecc*W.ecc+rci*W.rci+sii*W.sii+ifi*W.ifi+aai*W.aai;}
function verdict(comp:number,minax:number,ecc:number,aai:number){
  if(comp>=Z.GREEN.min_composite&&minax>=Z.GREEN.min_axis&&ecc>=F.ecc&&aai>=F.aai)return'SEAL';
  if(comp>=Z.YELLOW.min_composite&&minax>=Z.YELLOW.min_axis)return'PITCH';return'REJECT';}

async function main(){
  log(`=== WS-D R3 SHADOW DECOUPLE BENCH (${MODEL}) | families=[${FAMILIES.join(',')}] books/cell=${BOOKS_PER_CELL} size=${SIZE} ===`);
  if(process.env.R3_DRYRUN==='1'){
    const man=manifest(); let n=0;
    for(const [f,family,lang] of man){const fp=path.join(CORP,f);if(!existsSync(fp)){log(`  [MISS] ${f}`);continue;}
      const ps=passages(readFileSync(fp,'utf8'),PASS,SIZE); n+=ps.length; log(`  [dry] ${family}/${lang} ${f.slice(0,40)} -> ${ps.length} passage(s) (${ps.map(p=>words(p)).join('/')}w)`);}
    log(`[DRYRUN] ${man.length} livres, ${n} passages, ~${n*12} appels LLM. Imports moteur OK (computeECC/AAI/RCI/SII/IFI résolus). Run complet = terminal Architecte.`); return;
  }
  const provider=createOllamaProvider({baseUrl:OLLAMA,model:MODEL,draftTemperature:0,judgeTemperature:0,draftMaxTokens:2000,judgeMaxTokens:2000});
  const pkt={fr:basePacket('fr'),en:basePacket('en')};
  // preflight : prouver Ollama (via IFI focalisation tag)
  const probe=await computeIFI(pkt.fr,'Le vent froid glaçait la peau ; au loin une lueur tremblait dans la pénombre, et une odeur âcre montait du sol humide sous ses doigts.',provider);
  const okLLM=/LLM:\s*\d+/.test(String((probe.sub_scores||[]).find((x:any)=>/focal/.test(String(x.name)))?.details||''));
  log(`[PREFLIGHT] focalisation LLM tag = ${okLLM}`);
  if(!okLLM){log('FATAL: SEMANTIC_NOT_RUNNING — fallback keyword silencieux. Terminal Architecte + Ollama qwen3:32b.');process.exit(2);}

  mkdirSync(OUT,{recursive:true});
  const done=new Set<string>();if(existsSync(CKPT))for(const l of readFileSync(CKPT,'utf8').split('\n'))if(l.trim())try{done.add(JSON.parse(l).key);}catch{}
  log(`[RESUME] ${done.size} déjà au checkpoint`);
  const man=manifest();
  const work:Array<{family:string,lang:'fr'|'en',book:string,prose:string,sha:string,key:string}>=[];
  for(const [f,family,lang] of man){const fp=path.join(CORP,f);if(!existsSync(fp)){log(`  [MISS] ${f}`);continue;}
    passages(readFileSync(fp,'utf8'),PASS,SIZE).forEach(pr=>{const s=sha(pr);work.push({family,lang,book:f.replace(/\.txt$/,''),prose:pr,sha:s,key:`${s}_${SIZE}`});});}
  const todo=work.filter(u=>!done.has(u.key));
  log(`[PLAN] ${work.length} passages (${todo.length} à faire) — ~${todo.length*12} appels LLM`);

  for(const u of todo){
    const [ecc,aai,rci,sii,ifi]=await Promise.all([
      computeECC(pkt[u.lang],u.prose,provider),computeAAI(pkt[u.lang],u.prose,provider),
      computeRCI(pkt[u.lang],u.prose,provider),computeSII(pkt[u.lang],u.prose,provider),
      computeIFI(pkt[u.lang],u.prose,provider)]);
    const att=subBy(ifi,/attention/,3), fat=subBy(ifi,/fatigue/,4), foc=subBy(ifi,/focal/,2);
    const ifiLeg=ifi.score, ifiO2=att*0.5+fat*0.5;
    const minLeg=Math.min(ecc.score,rci.score,sii.score,ifiLeg,aai.score);
    const minO2=Math.min(ecc.score,rci.score,sii.score,ifiO2,aai.score);
    const compLeg=composite(ecc.score,rci.score,sii.score,ifiLeg,aai.score);
    const compO2=composite(ecc.score,rci.score,sii.score,ifiO2,aai.score);
    const axes={ecc:+ecc.score.toFixed(1),rci:+rci.score.toFixed(1),sii:+sii.score.toFixed(1),aai:+aai.score.toFixed(1)};
    const ifiBinding=ifiLeg<=Math.min(ecc.score,rci.score,sii.score,aai.score)+0.001;
    const row={key:u.key,family:u.family,lang:u.lang,book:u.book,sha16:u.sha,words:words(u.prose),...axes,
      ifi_legacy:+ifiLeg.toFixed(1),ifi_o2_pacing:+ifiO2.toFixed(1),attention:+att.toFixed(1),fatigue:+fat.toFixed(1),focalisation:+foc.toFixed(1),
      ifi_was_binding:ifiBinding,
      min_axis_legacy:+minLeg.toFixed(1),min_axis_o2:+minO2.toFixed(1),min_axis_delta:+(minO2-minLeg).toFixed(1),
      composite_legacy:+compLeg.toFixed(1),composite_o2:+compO2.toFixed(1),
      verdict_legacy:verdict(compLeg,minLeg,ecc.score,aai.score),verdict_o2:verdict(compO2,minO2,ecc.score,aai.score)};
    appendFileSync(CKPT,JSON.stringify(row)+'\n','utf8');
    log(`  [${u.family}/${u.lang}] ${u.book.slice(0,22)} ecc${axes.ecc} rci${axes.rci} sii${axes.sii} aai${axes.aai} | IFI ${ifiLeg.toFixed(0)}->${ifiO2.toFixed(0)} | minax ${minLeg.toFixed(0)}->${minO2.toFixed(0)} | ${row.verdict_legacy}->${row.verdict_o2}`);
  }

  const all:any[]=[];for(const l of readFileSync(CKPT,'utf8').split('\n'))if(l.trim())try{all.push(JSON.parse(l));}catch{}
  const summary:any={tool:'wsd-r3-shadow-decouple-bench.ts',model:MODEL,n:all.length,weights:W,zones:Z,by_family:{}};
  for(const fam of FAMILIES){const r=all.filter(o=>o.family===fam);if(!r.length)continue;
    summary.by_family[fam]={n:r.length,
      ifi_was_binding_pct:+(100*r.filter(o=>o.ifi_was_binding).length/r.length).toFixed(0),
      ifi_legacy:mean(r.map(o=>o.ifi_legacy)),ifi_o2_pacing:mean(r.map(o=>o.ifi_o2_pacing)),
      min_axis_legacy:mean(r.map(o=>o.min_axis_legacy)),min_axis_o2:mean(r.map(o=>o.min_axis_o2)),min_axis_delta:mean(r.map(o=>o.min_axis_delta)),
      composite_legacy:mean(r.map(o=>o.composite_legacy)),composite_o2:mean(r.map(o=>o.composite_o2)),
      seal_legacy:r.filter(o=>o.verdict_legacy==='SEAL').length,seal_o2:r.filter(o=>o.verdict_o2==='SEAL').length,
      pitch_o2:r.filter(o=>o.verdict_o2==='PITCH').length,reject_o2:r.filter(o=>o.verdict_o2==='REJECT').length};}
  summary.health_check={
    note:'O2 sain si : (1) IFI etait souvent binding chez maitres (IFI=axe-tueur) ; (2) min_axis maitres remonte (delta>0) ; (3) badprose ne gagne PAS de SEAL (seal_o2 badprose ~ seal_legacy, idealement 0). Le packet gardien rend le SEAL absolu peu realiste -> lire les DELTAS et le binding, pas le SEAL brut.',
    maitres_min_axis_rises: (summary.by_family.maitres?.min_axis_delta??0)>0,
    badprose_no_new_seal: (summary.by_family.badprose?summary.by_family.badprose.seal_o2<=summary.by_family.badprose.seal_legacy:null)};
  writeFileSync(path.join(OUT,'WS_D_R3_SHADOW_DECOUPLE.json'),JSON.stringify({summary},null,2),'utf8');
  const cols=['family','lang','book','words','ecc','rci','sii','aai','ifi_legacy','ifi_o2_pacing','attention','fatigue','focalisation','ifi_was_binding','min_axis_legacy','min_axis_o2','min_axis_delta','composite_legacy','composite_o2','verdict_legacy','verdict_o2'];
  writeFileSync(path.join(OUT,'WS_D_R3_SHADOW_DECOUPLE.csv'),[cols.join(','),...all.map((r:any)=>cols.map(c=>r[c]).join(','))].join('\n')+'\n','utf8');
  log('\n=== SUMMARY ===');log(JSON.stringify(summary,null,2));
  log('\nDROITS : aucun extrait de prose ecrit. Decision flip O2 = Architecte apres lecture (deltas min_axis + binding + badprose no-new-SEAL).');
}
main().catch(e=>{log('FATAL: '+(e?.stack??e));process.exit(1);});
