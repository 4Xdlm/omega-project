/**
 * OMEGA METROLOGY — WS-D R4 QUALITY DISCRIMINATION BENCH (Ollama, terminal Architecte)
 * ============================================================================
 * Question centrale (cf WS_D_R4_QUALITY_DISCRIMINATION_PLAN.md) : un signal QUELCONQUE sépare-t-il
 * les MAÎTRES de la PULP, et à quelle ÉCHELLE ? (H1 granularité vs H2 calibration juge.)
 *
 * Axes INTRINSÈQUES uniquement (contract-free) — ECC/tension EXCLUS (= ContractConformity, N/A sans contrat) :
 *   SII : necessity, metaphor_novelty, anti_cliche   |  AAI : show_dont_tell, authenticity   |  RCI : rhythm, euphony_basic
 *   (+ densité advisory focalisation : NON mesurée ici pour économiser des appels — déjà cartographiée R2.3)
 *
 * BALAYAGE D'ÉCHELLE : 600 / 1500 / 3000 mots (+ œuvre quasi-entière opt-in). Teste H1.
 * CORPUS : maîtres / best-sellers / pulp, FR+EN (corpus_r).
 * MÉTRIQUE de discrimination : AUC = P(score_maître > score_pulp) par axe × échelle.
 *   AUC=0.5 -> aucune séparation ; -> 1.0 maîtres toujours au-dessus ; <0.5 inversion (pulp au-dessus).
 *   Critère « discrimine » : AUC stable ≥ 0.70 (ou ≤0.30 inversion) à au moins une échelle.
 *
 * DROITS : best-sellers + pulp sous droits. Sortie scores + sha16 + mots only. AUCUNE prose committée.
 * CRASH-SAFE : checkpoint JSONL, reprise. NÉCESSITE OLLAMA -> terminal Architecte.
 * Run (cwd=packages/sovereign-engine) :
 *   $env:ECC_K='1'; npx tsx ..\..\scripts\metrology\wsd-r4-quality-discrimination-bench.ts
 * Options : $env:R4_SIZES='600,1500,3000'  $env:R4_BOOKS_PER_CELL='3'  $env:R4_WHOLE='1'  $env:R4_WHOLE_MAX='6000'  $env:R4_DRYRUN='1'
 */
process.env.OMEGA_CHUNKED_V4='1'; process.env.OMEGA_PROMPT_V4='1';
import { readFileSync, existsSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as path from 'node:path';
import { createGenesisPlan } from '../../packages/genesis-planner/src/planner.js';
import { createDefaultConfig } from '../../packages/genesis-planner/src/config.js';
import type { Scene } from '../../packages/genesis-planner/src/types.js';
import { assembleForgePacket } from '../../packages/sovereign-engine/src/input/forge-packet-assembler.js';
import { computeAAI, computeRCI, computeSII } from '../../packages/sovereign-engine/src/oracle/macro-axes.js';
import { createOllamaProvider } from '../../packages/sovereign-engine/src/runtime/ollama-provider.js';
import { scoreSensoryDensity } from '../../packages/sovereign-engine/src/oracle/axes/sensory-density.js';
import { DEFAULT_VOICE_GENOME } from '../../packages/sovereign-engine/src/voice/voice-genome.js';
import type { ForgePacket, StyleProfile, KillLists, CanonEntry, ForgeContinuity } from '../../packages/sovereign-engine/src/types.js';

const REPO=path.resolve(process.cwd(),process.cwd().endsWith('sovereign-engine')?'../..':'.');
const CORP=path.join(REPO,'omega-autopsie','corpus_r','txt');
const OUT=path.join(REPO,'docs','audit','calibration');
const CKPT=path.join(OUT,'WS_D_R4_QUALITY_DISCRIM.jsonl');
const TS='2026-01-01T00:00:00.000Z';
const MODEL=process.env.ECC_MODEL??'qwen3:32b';
const OLLAMA=process.env.ECC_OLLAMA_URL??'http://localhost:11434';
const SIZES=(process.env.R4_SIZES??'600,1500,3000').split(',').map(s=>+s.trim()).filter(n=>n>0);
const BOOKS_PER_CELL=Number(process.env.R4_BOOKS_PER_CELL??'3');
const WHOLE=process.env.R4_WHOLE==='1';
const WHOLE_MAX=Number(process.env.R4_WHOLE_MAX??'6000');
function log(s:string){process.stderr.write(s+'\n');}
function words(s:string){return s.split(/\s+/).filter(w=>w.length>0).length;}
function sha(s:string){return createHash('sha256').update(s,'utf8').digest('hex').slice(0,16);}

function cleanG(raw:string){let t=raw;const s=t.search(/\*\*\*\s*START OF (THE|THIS)? ?PROJECT GUTENBERG/i);if(s>=0)t=t.slice(t.indexOf('\n',s)+1);const e=t.search(/\*\*\*\s*END OF (THE|THIS)? ?PROJECT GUTENBERG/i);if(e>=0)t=t.slice(0,e);return t;}
function bodyWords(raw:string){const paras=cleanG(raw).split(/\n\s*\n/).map(p=>p.replace(/\s+/g,' ').trim()).filter(p=>words(p)>=8);const lo=Math.floor(paras.length*0.1),hi=Math.floor(paras.length*0.92);return paras.slice(lo,hi).join(' ').split(/\s+/).filter(w=>w.length>0);}
function truncW(s:string,n:number){return s.split(/\s+/).slice(0,n).join(' ');}
function longWindow(raw:string,minW:number){const w=bodyWords(raw);if(w.length<minW)return w.length>=Math.min(...SIZES)?w.join(' '):null;const st=Math.floor((w.length-minW)/2);return w.slice(st,st+minW).join(' ');}

const ALL:ReadonlyArray<readonly[string,string,'fr'|'en']>=[
  ['flaubert_bovary_14155.txt','maitres','fr'],['hugo_miserables_17489.txt','maitres','fr'],['proust_swann_2650.txt','maitres','fr'],['zola_bete_10007.txt','maitres','fr'],
  ['dickens_two_cities_98.txt','maitres','en'],['austen_pride_1342.txt','maitres','en'],['melville_moby_2701.txt','maitres','en'],['george_eliot_middlemarch.txt','maitres','en'],
  ['projet_derniere_chance_french_edition_andy_weir.txt','bestsellers','fr'],['le_crime_du_paradis_french_edition_guillaume_musso.txt','bestsellers','fr'],['mille_petits_riens_french_edition_jodi_picoult.txt','bestsellers','fr'],['fourth_wing_tome_2_french_edition_rebecca_yarros.txt','bestsellers','fr'],
  ['andy_weir_the_martian.txt','bestsellers','en'],['colleen_hoover_it_ends_with_us.txt','bestsellers','en'],['dan_brown_origin.txt','bestsellers','en'],['john_grisham_the_firm.txt','bestsellers','en'],
  ['cinquante_nuances_de_grey_french_edition_el_james.txt','badprose','fr'],['le_pacte_de_sang_french_edition_laura_s_wild.txt','badprose','fr'],['grossesse_mafia_french_edition_melanie_rain.txt','badprose','fr'],['bikers_law_tome_2_french_edition_arizona_brooks.txt','badprose','fr'],
  ['el_james_fifty_shades_of_grey.txt','badprose','en'],['gently_yours_gently_series_book_1_sweetblunch.txt','badprose','en'],['claimed_by_the_mountain_kings_alisson_bento.txt','badprose','en'],['the_reno_man_and_my_hotwife_epub_the_reno_man.txt','badprose','en'],
];
function manifest(){const out:Array<readonly[string,string,'fr'|'en']>=[];for(const fam of ['maitres','bestsellers','badprose'])for(const lg of ['fr','en'] as const)out.push(...ALL.filter(r=>r[1]===fam&&r[2]===lg).slice(0,BOOKS_PER_CELL));return out;}
function basePacket(lang:'fr'|'en'):ForgePacket{const pack=JSON.parse(readFileSync(path.join(REPO,'golden/intents/intent_pack_gardien.json'),'utf8'));const {plan}=createGenesisPlan(pack.intent,pack.canon,pack.constraints,pack.genome,pack.emotion,createDefaultConfig(),TS);const scene0=plan.arcs[0]!.scenes[0]! as Scene;const style:StyleProfile={version:'1.0.0',universe:'literary_fiction',lexicon:{signature_words:[],forbidden_words:[],abstraction_max_ratio:0.3,concrete_min_ratio:0.5},rhythm:{avg_sentence_length_target:20,gini_target:0.45,max_consecutive_similar:2,min_syncopes_per_scene:2,min_compressions_per_scene:1},tone:{dominant_register:'soutenu',intensity_range:[0.2,0.9] as readonly[number,number]},imagery:{recurrent_motifs:[],density_target_per_100_words:3,banned_metaphors:[]},voice:DEFAULT_VOICE_GENOME};return assembleForgePacket({plan,scene:scene0,style_profile:style,kill_lists:{banned_words:[],banned_cliches:[],banned_ai_patterns:[],banned_filter_words:[]} as KillLists,canon:[] as CanonEntry[],continuity:{previous_scene_summary:'',character_states:[],open_threads:[]} as ForgeContinuity,run_id:'r4',language:lang});}
const mean=(xs:number[])=>xs.length?+(xs.reduce((a,b)=>a+b,0)/xs.length).toFixed(2):0;
const median=(xs:number[])=>{if(!xs.length)return 0;const s=[...xs].sort((a,b)=>a-b);const m=Math.floor(s.length/2);return +(s.length%2?s[m]!:(s[m-1]!+s[m]!)/2).toFixed(2);};
function sub(ax:any,re:RegExp){const s=(ax.sub_scores||[]).find((x:any)=>re.test(String(x.name||'')));return s?+s.score:NaN;}
// AUC = P(maitre > pulp) via rang (Mann-Whitney U / (n1*n2)), ties=0.5
function auc(a:number[],b:number[]){if(!a.length||!b.length)return null;let s=0;for(const x of a)for(const y of b)s+=x>y?1:x===y?0.5:0;return +(s/(a.length*b.length)).toFixed(3);}
const AXES=['necessity','metaphor_novelty','anti_cliche','show_dont_tell','authenticity','rhythm','euphony','sii','aai','rci'];

async function main(){
  log(`=== WS-D R4 QUALITY DISCRIMINATION (${MODEL}) | sizes=[${SIZES.join(',')}] books/cell=${BOOKS_PER_CELL} whole=${WHOLE} ===`);
  if(process.env.R4_DRYRUN==='1'){const man=manifest();let u=0;for(const [f,family,lang] of man){const fp=path.join(CORP,f);if(!existsSync(fp)){log(`  [MISS] ${f}`);continue;}const lw=longWindow(readFileSync(fp,'utf8'),Math.max(...SIZES));const n=lw?SIZES.filter(s=>words(lw)>=s).length+(WHOLE?1:0):0;u+=n;log(`  [dry] ${family}/${lang} ${f.slice(0,38)} -> ${n} unités`);}
    log(`[DRYRUN] ${man.length} livres, ${u} unités, ~${u*8} appels LLM. Imports moteur OK (computeSII/AAI/RCI). Run = terminal Architecte.`);return;}
  const provider=createOllamaProvider({baseUrl:OLLAMA,model:MODEL,draftTemperature:0,judgeTemperature:0,draftMaxTokens:2000,judgeMaxTokens:2000});
  const pkt={fr:basePacket('fr'),en:basePacket('en')};
  const probe=await scoreSensoryDensity(pkt.fr,'Le vent froid glaçait la peau ; au loin une lueur tremblait dans la pénombre.',provider);
  const okLLM=/LLM:\s*\d+/.test(String(probe.details||''));
  log(`[PREFLIGHT] Ollama LLM tag = ${okLLM}`);
  if(!okLLM){log('FATAL: SEMANTIC_NOT_RUNNING — fallback keyword. Terminal Architecte + Ollama qwen3:32b.');process.exit(2);}

  mkdirSync(OUT,{recursive:true});
  const done=new Set<string>();if(existsSync(CKPT))for(const l of readFileSync(CKPT,'utf8').split('\n'))if(l.trim())try{done.add(JSON.parse(l).key);}catch{}
  log(`[RESUME] ${done.size} déjà au checkpoint`);
  const man=manifest();
  type U={family:string,lang:'fr'|'en',book:string,size:number,base:string,sha:string,key:string};
  const work:U[]=[];
  for(const [f,family,lang] of man){const fp=path.join(CORP,f);if(!existsSync(fp)){log(`  [MISS] ${f}`);continue;}
    const raw=readFileSync(fp,'utf8');const lw=longWindow(raw,Math.max(...SIZES));if(!lw)continue;const book=f.replace(/\.txt$/,'');
    for(const size of SIZES){if(words(lw)<size)continue;const b=truncW(lw,size);const s=sha(b);work.push({family,lang,book,size,base:b,sha:s,key:`${s}_${size}`});}
    if(WHOLE){const wb=truncW(bodyWords(raw).join(' '),WHOLE_MAX);if(words(wb)>=Math.min(...SIZES)){const s=sha(wb);work.push({family,lang,book,size:-1,base:wb,sha:s,key:`${s}_whole`});}}}
  const todo=work.filter(u=>!done.has(u.key));
  log(`[PLAN] ${work.length} unités (${todo.length} à faire) — ~${todo.length*8} appels LLM`);

  let n=0;
  for(const u of todo){
    const [sii,aai,rci]=await Promise.all([computeSII(pkt[u.lang],u.base,provider),computeAAI(pkt[u.lang],u.base,provider),computeRCI(pkt[u.lang],u.base,provider)]);
    const row={key:u.key,family:u.family,lang:u.lang,book:u.book,size:u.size,sha16:u.sha,words:words(u.base),
      necessity:sub(sii,/necessity/),metaphor_novelty:sub(sii,/metaphor/),anti_cliche:sub(sii,/anti_cliche/),
      show_dont_tell:sub(aai,/show_dont_tell/),authenticity:sub(aai,/authenticity/),
      rhythm:sub(rci,/rhythm/),euphony:sub(rci,/euphony/),
      sii:+sii.score.toFixed(1),aai:+aai.score.toFixed(1),rci:+rci.score.toFixed(1)};
    appendFileSync(CKPT,JSON.stringify(row)+'\n','utf8');n++;
    if(n%5===0||n<=3)log(`  [${n}/${todo.length}] ${u.family}/${u.lang} ${u.book.slice(0,20)} sz${u.size} | nec${row.necessity} meta${row.metaphor_novelty} show${row.show_dont_tell} auth${row.authenticity} rhy${row.rhythm} euph${row.euphony}`);
  }

  const all:any[]=[];for(const l of readFileSync(CKPT,'utf8').split('\n'))if(l.trim())try{all.push(JSON.parse(l));}catch{}
  const summary:any={tool:'wsd-r4-quality-discrimination-bench.ts',model:MODEL,sizes:SIZES,n:all.length,discrimination_AUC:{},medians:{}};
  for(const sz of [...SIZES,...(WHOLE?[-1]:[])]){const tag=sz===-1?'whole':String(sz);const rs=all.filter(o=>o.size===sz);if(!rs.length)continue;
    const M=rs.filter(o=>o.family==='maitres'),B=rs.filter(o=>o.family==='badprose'),S=rs.filter(o=>o.family==='bestsellers');
    summary.discrimination_AUC[tag]={};summary.medians[tag]={};
    for(const ax of AXES){const mv=M.map(o=>o[ax]).filter(x=>!isNaN(x)),bv=B.map(o=>o[ax]).filter(x=>!isNaN(x)),sv=S.map(o=>o[ax]).filter(x=>!isNaN(x));
      summary.discrimination_AUC[tag][ax]={maitres_vs_badprose:auc(mv,bv),maitres_vs_bestsellers:auc(mv,sv)};
      summary.medians[tag][ax]={maitres:median(mv),bestsellers:median(sv),badprose:median(bv)};}}
  // verdict : un axe discrimine si AUC(maitres>badprose) >=0.70 (ou <=0.30) a une echelle
  const discriminating:string[]=[];
  for(const ax of AXES){let best=0.5;for(const tag of Object.keys(summary.discrimination_AUC)){const a=summary.discrimination_AUC[tag][ax]?.maitres_vs_badprose;if(a!=null&&Math.abs(a-0.5)>Math.abs(best-0.5))best=a;}if(Math.abs(best-0.5)>=0.20)discriminating.push(`${ax}(AUC=${best})`);}
  summary.verdict={discriminating_axes:discriminating,
    any_discriminates:discriminating.length>0,
    note:'AUC=P(maitre>pulp). 0.5=aucune separation. >=0.70 ou <=0.30 a une echelle = discrimine. Si liste vide a toutes echelles => le scorer ne distingue PAS la qualite (H2), ou pas a ces echelles (H1) -> tester plus grand. METRIC_HONESTY : acter le resultat tel quel.'};
  writeFileSync(path.join(OUT,'WS_D_R4_QUALITY_DISCRIM.json'),JSON.stringify({summary},null,2),'utf8');
  const cols=['family','lang','book','size','words','necessity','metaphor_novelty','anti_cliche','show_dont_tell','authenticity','rhythm','euphony','sii','aai','rci'];
  writeFileSync(path.join(OUT,'WS_D_R4_QUALITY_DISCRIM.csv'),[cols.join(','),...all.map((r:any)=>cols.map(c=>r[c]).join(','))].join('\n')+'\n','utf8');
  log('\n=== SUMMARY ===');log(JSON.stringify(summary,null,2));
  log('\nLire discrimination_AUC : par axe x echelle, AUC maitres vs pulp. Decision refonte juge = Architecte/Tribunal. Scores-only, droits respectes.');
}
main().catch(e=>{log('FATAL: '+(e?.stack??e));process.exit(1);});
