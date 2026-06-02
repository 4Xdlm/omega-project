/**
 * OMEGA METROLOGY — WS-D R4-LARGE QUALITY DISCRIMINATION CONFIRMATION (Ollama, terminal Architecte)
 * ============================================================================
 * Confirme à GRANDE ÉCHELLE (mandat Tribunal 2/2, EMP-16 triple-preuve) que authenticity + euphony + rhythm
 * discriminent la qualité (maîtres > pulp), et que necessity/show_dont_tell/anti_cliche/SII n'entrent PAS dans la porte qualité.
 *
 * Corpus : ~9 livres/cellule × 6 cellules (maîtres/best-sellers/pulp × FR/EN) = ~53 livres. Échelles 600/1500/3000/entier.
 * Axes INTRINSÈQUES (ECC exclu = ContractConformity) : necessity, metaphor_novelty, anti_cliche (SII) ;
 *   show_dont_tell, authenticity (AAI) ; rhythm, euphony_basic (RCI) ; + composites SII/AAI/RCI.
 * STATS : AUC=P(maître>pulp) + bootstrap IC95 + test de permutation (p) + AUC par langue, par échelle, par famille-paire.
 * VERDICTS auto : STRONG (AUC≥0.80 & CI_lo>0.70 sur ≥3 échelles) / VALID (≥0.70 & CI_lo>0.60 sur ≥3) /
 *   INVERTED (≤0.40 stable) / INERT (~0.50 ou saturé) / SCALE_DEPENDENT.
 *
 * TRONCATURE œuvre entière : tête du corps nettoyé (10%-92%) tronquée à R4_WHOLE_MAX mots (défaut 6000). Documenté.
 * DROITS : best-sellers + pulp sous droits. Sortie scores + sha16 + mots only. AUCUNE prose committée.
 * CRASH-SAFE : checkpoint JSONL, reprise (les stats se recalculent sur tout le checkpoint). NÉCESSITE OLLAMA -> terminal.
 * Run (cwd=packages/sovereign-engine) :
 *   $env:ECC_K='1'; $env:R4_WHOLE='1'; npx tsx ..\..\scripts\metrology\wsd-r4-large-quality-bench.ts
 * Options : $env:R4_SIZES='600,1500,3000'  $env:R4_BOOKS_PER_CELL='9'  $env:R4_WHOLE_MAX='6000'  $env:R4_BOOT='2000'  $env:R4_DRYRUN='1'
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
const CKPT=path.join(OUT,'WS_D_R4_LARGE.jsonl');
const TS='2026-01-01T00:00:00.000Z';
const MODEL=process.env.ECC_MODEL??'qwen3:32b';
const OLLAMA=process.env.ECC_OLLAMA_URL??'http://localhost:11434';
const SIZES=(process.env.R4_SIZES??'600,1500,3000').split(',').map(s=>+s.trim()).filter(n=>n>0);
const BPC=Number(process.env.R4_BOOKS_PER_CELL??'9');
const WHOLE=process.env.R4_WHOLE==='1';
const WHOLE_MAX=Number(process.env.R4_WHOLE_MAX??'6000');
const BOOT=Number(process.env.R4_BOOT??'2000');
function log(s:string){process.stderr.write(s+'\n');}
function words(s:string){return s.split(/\s+/).filter(w=>w.length>0).length;}
function sha(s:string){return createHash('sha256').update(s,'utf8').digest('hex').slice(0,16);}
// PRNG déterministe (mulberry32)
function rng(seed:number){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

function cleanG(raw:string){let t=raw;const s=t.search(/\*\*\*\s*START OF (THE|THIS)? ?PROJECT GUTENBERG/i);if(s>=0)t=t.slice(t.indexOf('\n',s)+1);const e=t.search(/\*\*\*\s*END OF (THE|THIS)? ?PROJECT GUTENBERG/i);if(e>=0)t=t.slice(0,e);return t;}
function bodyWords(raw:string){const paras=cleanG(raw).split(/\n\s*\n/).map(p=>p.replace(/\s+/g,' ').trim()).filter(p=>words(p)>=8);const lo=Math.floor(paras.length*0.1),hi=Math.floor(paras.length*0.92);return paras.slice(lo,hi).join(' ').split(/\s+/).filter(w=>w.length>0);}
function truncW(s:string,n:number){return s.split(/\s+/).slice(0,n).join(' ');}
function longWindow(raw:string,minW:number){const w=bodyWords(raw);if(w.length<minW)return w.length>=Math.min(...SIZES)?w.join(' '):null;const st=Math.floor((w.length-minW)/2);return w.slice(st,st+minW).join(' ');}

const ALL:ReadonlyArray<readonly[string,string,'fr'|'en']>=[
  // ── MAÎTRES FR (9)
  ['flaubert_bovary_14155.txt','maitres','fr'],['hugo_miserables_17489.txt','maitres','fr'],['proust_swann_2650.txt','maitres','fr'],['zola_bete_10007.txt','maitres','fr'],['maupassant_bel_ami_3088.txt','maitres','fr'],['stendhal_chartreuse_7524.txt','maitres','fr'],['flaubert_education_14285.txt','maitres','fr'],['maupassant_une_vie_6902.txt','maitres','fr'],['zola_bonheur_11953.txt','maitres','fr'],
  // ── MAÎTRES EN (9)
  ['dickens_two_cities_98.txt','maitres','en'],['austen_pride_1342.txt','maitres','en'],['melville_moby_2701.txt','maitres','en'],['bronte_e_wuthering_768.txt','maitres','en'],['george_eliot_middlemarch.txt','maitres','en'],['henry_james_the_portrait_of_a_lady.txt','maitres','en'],['thomas_hardy_tess_of_the_durbervilles.txt','maitres','en'],['joseph_conrad_heart_of_darkness.txt','maitres','en'],['mark_twain_adventures_of_huckleberry_finn.txt','maitres','en'],
  // ── BEST-SELLERS FR (8)
  ['projet_derniere_chance_french_edition_andy_weir.txt','bestsellers','fr'],['le_crime_du_paradis_french_edition_guillaume_musso.txt','bestsellers','fr'],['mille_petits_riens_french_edition_jodi_picoult.txt','bestsellers','fr'],['fourth_wing_tome_2_french_edition_rebecca_yarros.txt','bestsellers','fr'],['il_faut_qu_on_parle_de_kevin_french_edition_lionel_shriver.txt','bestsellers','fr'],['gardiens_des_cites_perdues_le_grand_brasier_french_edition_shannon_messenger.txt','bestsellers','fr'],['la_huitieme_porte_french_edition_pierre_bottero.txt','bestsellers','fr'],['lheritiere_de_jasad_french_edition_sara_hashem.txt','bestsellers','fr'],
  // ── BEST-SELLERS EN (9)
  ['andy_weir_the_martian.txt','bestsellers','en'],['colleen_hoover_it_ends_with_us.txt','bestsellers','en'],['dan_brown_origin.txt','bestsellers','en'],['john_grisham_the_firm.txt','bestsellers','en'],['jk_rowling_harry_potter_and_the_philosophers_stone.txt','bestsellers','en'],['suzanne_collins_catching_fire.txt','bestsellers','en'],['ken_follett_pillars_of_the_earth.txt','bestsellers','en'],['lee_child_killing_floor.txt','bestsellers','en'],['michael_crichton_sphere.txt','bestsellers','en'],
  // ── PULP FR (9)
  ['cinquante_nuances_de_grey_french_edition_el_james.txt','badprose','fr'],['le_pacte_de_sang_french_edition_laura_s_wild.txt','badprose','fr'],['grossesse_mafia_french_edition_melanie_rain.txt','badprose','fr'],['bikers_law_tome_2_french_edition_arizona_brooks.txt','badprose','fr'],['seduite_par_le_guerrier_alien_french_edition_ava_ross.txt','badprose','fr'],['convoitee_par_le_guerrier_alien_french_edition_ava_ross.txt','badprose','fr'],['mon_pire_date_french_edition_noemie_conte.txt','badprose','fr'],['contrat_avec_un_milliardaire_vol_12_french_edition_phoebe_p_campell.txt','badprose','fr'],['double_bluff_french_edition_ruby_vincent.txt','badprose','fr'],
  // ── PULP EN (9)
  ['el_james_fifty_shades_of_grey.txt','badprose','en'],['gently_yours_gently_series_book_1_sweetblunch.txt','badprose','en'],['claimed_by_the_mountain_kings_alisson_bento.txt','badprose','en'],['milked_by_the_italian_mafia_hucow_for_mafioso_book_1_leandra_camilli.txt','badprose','en'],['the_reno_man_and_my_hotwife_epub_the_reno_man.txt','badprose','en'],['my_primitive_alien_exile_lindsey_fox.txt','badprose','en'],['secret_twins_for_my_brothers_best_friends_hannah_ryder.txt','badprose','en'],['cheating_with_my_boyfriends_bully_2_manus_dare.txt','badprose','en'],['a_ghetto_tale_from_ebony_ladies_night_chronicles_antoinette_sherell.txt','badprose','en'],
];
function manifest(){const out:Array<readonly[string,string,'fr'|'en']>=[];for(const fam of ['maitres','bestsellers','badprose'])for(const lg of ['fr','en'] as const)out.push(...ALL.filter(r=>r[1]===fam&&r[2]===lg).slice(0,BPC));return out;}
function basePacket(lang:'fr'|'en'):ForgePacket{const pack=JSON.parse(readFileSync(path.join(REPO,'golden/intents/intent_pack_gardien.json'),'utf8'));const {plan}=createGenesisPlan(pack.intent,pack.canon,pack.constraints,pack.genome,pack.emotion,createDefaultConfig(),TS);const scene0=plan.arcs[0]!.scenes[0]! as Scene;const style:StyleProfile={version:'1.0.0',universe:'literary_fiction',lexicon:{signature_words:[],forbidden_words:[],abstraction_max_ratio:0.3,concrete_min_ratio:0.5},rhythm:{avg_sentence_length_target:20,gini_target:0.45,max_consecutive_similar:2,min_syncopes_per_scene:2,min_compressions_per_scene:1},tone:{dominant_register:'soutenu',intensity_range:[0.2,0.9] as readonly[number,number]},imagery:{recurrent_motifs:[],density_target_per_100_words:3,banned_metaphors:[]},voice:DEFAULT_VOICE_GENOME};return assembleForgePacket({plan,scene:scene0,style_profile:style,kill_lists:{banned_words:[],banned_cliches:[],banned_ai_patterns:[],banned_filter_words:[]} as KillLists,canon:[] as CanonEntry[],continuity:{previous_scene_summary:'',character_states:[],open_threads:[]} as ForgeContinuity,run_id:'r4L',language:lang});}
const mean=(xs:number[])=>xs.length?+(xs.reduce((a,b)=>a+b,0)/xs.length).toFixed(2):0;
function sub(ax:any,re:RegExp){const s=(ax.sub_scores||[]).find((x:any)=>re.test(String(x.name||'')));return s?+s.score:NaN;}
function aucRaw(a:number[],b:number[]){let s=0;for(const x of a)for(const y of b)s+=x>y?1:x===y?0.5:0;return s/(a.length*b.length);}
function auc(a:number[],b:number[]){if(!a.length||!b.length)return null;return +aucRaw(a,b).toFixed(3);}
function bootCI(a:number[],b:number[],iters:number,seed:number){if(!a.length||!b.length)return null;const r=rng(seed);const xs:number[]=[];for(let it=0;it<iters;it++){const aa=Array.from({length:a.length},()=>a[Math.floor(r()*a.length)]!);const bb=Array.from({length:b.length},()=>b[Math.floor(r()*b.length)]!);xs.push(aucRaw(aa,bb));}xs.sort((p,q)=>p-q);return [+xs[Math.floor(iters*0.025)]!.toFixed(3),+xs[Math.floor(iters*0.975)]!.toFixed(3)];}
function permP(a:number[],b:number[],iters:number,seed:number){if(!a.length||!b.length)return null;const obs=Math.abs(aucRaw(a,b)-0.5);const pool=[...a,...b];const n1=a.length;const r=rng(seed+777);let c=0;for(let it=0;it<iters;it++){for(let i=pool.length-1;i>0;i--){const j=Math.floor(r()*(i+1));const t=pool[i]!;pool[i]=pool[j]!;pool[j]=t;}const aa=pool.slice(0,n1),bb=pool.slice(n1);if(Math.abs(aucRaw(aa,bb)-0.5)>=obs)c++;}return +((c+1)/(iters+1)).toFixed(4);}
const AXES=['necessity','metaphor_novelty','anti_cliche','show_dont_tell','authenticity','rhythm','euphony','sii','aai','rci'];

async function main(){
  log(`=== WS-D R4-LARGE (${MODEL}) | sizes=[${SIZES.join(',')}] books/cell=${BPC} whole=${WHOLE} boot=${BOOT} ===`);
  if(process.env.R4_DRYRUN==='1'){const man=manifest();let u=0;const per:Record<string,number>={};for(const [f,family,lang] of man){const fp=path.join(CORP,f);if(!existsSync(fp)){log(`  [MISS] ${f}`);continue;}const lw=longWindow(readFileSync(fp,'utf8'),Math.max(...SIZES));const n=lw?SIZES.filter(s=>words(lw)>=s).length+(WHOLE?1:0):0;u+=n;per[`${family}_${lang}`]=(per[`${family}_${lang}`]||0)+1;}
    log(`[DRYRUN] ${man.length} livres (${Object.entries(per).map(([k,v])=>k+'='+v).join(' ')}), ${u} unités, ~${u*8} appels LLM. Imports OK.`);return;}
  const provider=createOllamaProvider({baseUrl:OLLAMA,model:MODEL,draftTemperature:0,judgeTemperature:0,draftMaxTokens:2000,judgeMaxTokens:2000});
  const pkt={fr:basePacket('fr'),en:basePacket('en')};
  const probe=await scoreSensoryDensity(pkt.fr,'Le vent froid glaçait la peau ; au loin une lueur tremblait dans la pénombre.',provider);
  if(!/LLM:\s*\d+/.test(String(probe.details||''))){log('FATAL: SEMANTIC_NOT_RUNNING — fallback keyword. Terminal Architecte + Ollama.');process.exit(2);}
  log('[PREFLIGHT] Ollama OK');
  mkdirSync(OUT,{recursive:true});
  const done=new Set<string>();if(existsSync(CKPT))for(const l of readFileSync(CKPT,'utf8').split('\n'))if(l.trim())try{done.add(JSON.parse(l).key);}catch{}
  log(`[RESUME] ${done.size} déjà au checkpoint`);
  const man=manifest();
  type U={family:string,lang:'fr'|'en',book:string,size:number,base:string,sha:string,key:string};
  const work:U[]=[];
  for(const [f,family,lang] of man){const fp=path.join(CORP,f);if(!existsSync(fp)){log(`  [MISS] ${f}`);continue;}
    const raw=readFileSync(fp,'utf8');const lw=longWindow(raw,Math.max(...SIZES));if(!lw)continue;const book=f.replace(/\.txt$/,'');
    for(const size of SIZES){if(words(lw)<size)continue;const b=truncW(lw,size);work.push({family,lang,book,size,base:b,sha:sha(b),key:`${sha(b)}_${size}`});}
    if(WHOLE){const wb=truncW(bodyWords(raw).join(' '),WHOLE_MAX);if(words(wb)>=Math.min(...SIZES)){work.push({family,lang,book,size:-1,base:wb,sha:sha(wb),key:`${sha(wb)}_whole`});}}}
  const todo=work.filter(u=>!done.has(u.key));
  log(`[PLAN] ${work.length} unités (${todo.length} à faire) — ~${todo.length*8} appels LLM`);
  let n=0;
  for(const u of todo){
    const [sii,aai,rci]=await Promise.all([computeSII(pkt[u.lang],u.base,provider),computeAAI(pkt[u.lang],u.base,provider),computeRCI(pkt[u.lang],u.base,provider)]);
    const row={key:u.key,family:u.family,lang:u.lang,book:u.book,size:u.size,sha16:u.sha,words:words(u.base),
      necessity:sub(sii,/necessity/),metaphor_novelty:sub(sii,/metaphor/),anti_cliche:sub(sii,/anti_cliche/),
      show_dont_tell:sub(aai,/show_dont_tell/),authenticity:sub(aai,/authenticity/),rhythm:sub(rci,/rhythm/),euphony:sub(rci,/euphony/),
      sii:+sii.score.toFixed(1),aai:+aai.score.toFixed(1),rci:+rci.score.toFixed(1)};
    appendFileSync(CKPT,JSON.stringify(row)+'\n','utf8');n++;
    if(n%10===0||n<=3)log(`  [${n}/${todo.length}] ${u.family}/${u.lang} ${u.book.slice(0,18)} sz${u.size} auth${row.authenticity} euph${row.euphony} rhy${typeof row.rhythm==='number'?row.rhythm.toFixed(0):'NA'} nec${row.necessity}`);
  }
  // ── STATS sur tout le checkpoint
  const all:any[]=[];for(const l of readFileSync(CKPT,'utf8').split('\n'))if(l.trim())try{all.push(JSON.parse(l));}catch{}
  const scales=[...SIZES,...(WHOLE?[-1]:[])];
  const summary:any={tool:'wsd-r4-large-quality-bench.ts',model:MODEL,sizes:SIZES,whole:WHOLE,whole_max:WHOLE_MAX,books_per_cell:BPC,boot_iters:BOOT,n:all.length,by_axis:{}};
  let si=1;
  for(const ax of AXES){summary.by_axis[ax]={};
    for(const sz of scales){const tag=sz===-1?'whole':String(sz);const rs=all.filter(o=>o.size===sz);
      const M=rs.filter(o=>o.family==='maitres').map(o=>o[ax]).filter(x=>typeof x==='number'&&!isNaN(x));
      const B=rs.filter(o=>o.family==='badprose').map(o=>o[ax]).filter(x=>typeof x==='number'&&!isNaN(x));
      const S=rs.filter(o=>o.family==='bestsellers').map(o=>o[ax]).filter(x=>typeof x==='number'&&!isNaN(x));
      const Mfr=rs.filter(o=>o.family==='maitres'&&o.lang==='fr').map(o=>o[ax]).filter(x=>typeof x==='number'&&!isNaN(x));
      const Bfr=rs.filter(o=>o.family==='badprose'&&o.lang==='fr').map(o=>o[ax]).filter(x=>typeof x==='number'&&!isNaN(x));
      const Men=rs.filter(o=>o.family==='maitres'&&o.lang==='en').map(o=>o[ax]).filter(x=>typeof x==='number'&&!isNaN(x));
      const Ben=rs.filter(o=>o.family==='badprose'&&o.lang==='en').map(o=>o[ax]).filter(x=>typeof x==='number'&&!isNaN(x));
      summary.by_axis[ax][tag]={auc_m_vs_pulp:auc(M,B),ci95:bootCI(M,B,BOOT,si++),perm_p:permP(M,B,BOOT,si++),
        auc_m_vs_best:auc(M,S),auc_best_vs_pulp:auc(S,B),auc_fr:auc(Mfr,Bfr),auc_en:auc(Men,Ben),nM:M.length,nB:B.length};}
  }
  // verdicts auto
  const verdicts:Record<string,string>={};
  for(const ax of AXES){const cells=scales.map(sz=>summary.by_axis[ax][sz===-1?'whole':String(sz)]).filter(Boolean);
    const strong=cells.filter(c=>c.auc_m_vs_pulp!=null&&c.auc_m_vs_pulp>=0.80&&c.ci95&&c.ci95[0]>0.70).length;
    const valid=cells.filter(c=>c.auc_m_vs_pulp!=null&&c.auc_m_vs_pulp>=0.70&&c.ci95&&c.ci95[0]>0.60).length;
    const inv=cells.filter(c=>c.auc_m_vs_pulp!=null&&c.auc_m_vs_pulp<=0.40).length;
    const inert=cells.filter(c=>c.auc_m_vs_pulp!=null&&Math.abs(c.auc_m_vs_pulp-0.5)<0.10).length;
    verdicts[ax]= strong>=3?'STRONG_QUALITY': valid>=3?'VALID_QUALITY': inv>=Math.ceil(cells.length/2)?'INVERTED': inert>=Math.ceil(cells.length/2)?'INERT': valid>=1?'SCALE_DEPENDENT':'WEAK_NOISE';}
  summary.axis_verdicts=verdicts;
  summary.recommendation={
    intrinsic_quality_gate:Object.keys(verdicts).filter(a=>['authenticity','euphony','rhythm'].includes(a)&&/STRONG|VALID|SCALE/.test(verdicts[a]!)),
    exclude_from_gate:Object.keys(verdicts).filter(a=>/INVERTED|INERT|WEAK/.test(verdicts[a]!)),
    note:'STRONG/VALID sur >=3 echelles avec CI95 bas>0.60-0.70 = axe qualite. INVERTED/INERT/WEAK = hors porte qualite. EMP-16 : composer IntrinsicQualityScore uniquement sur les axes confirmes. Verifier rhythm@whole + necessity inversion.'};
  writeFileSync(path.join(OUT,'WS_D_R4_LARGE.json'),JSON.stringify({summary},null,2),'utf8');
  const cols=['family','lang','book','size','words','necessity','metaphor_novelty','anti_cliche','show_dont_tell','authenticity','rhythm','euphony','sii','aai','rci'];
  writeFileSync(path.join(OUT,'WS_D_R4_LARGE.csv'),[cols.join(','),...all.map((r:any)=>cols.map(c=>r[c]).join(','))].join('\n')+'\n','utf8');
  log('\n=== AXIS VERDICTS ===');log(JSON.stringify(verdicts,null,2));
  log('\n=== RECOMMENDATION ===');log(JSON.stringify(summary.recommendation,null,2));
  log(`\n${all.length} mesures. Detail AUC+CI95+perm par axe×echelle dans WS_D_R4_LARGE.json. Scores-only, droits respectes.`);
}
main().catch(e=>{log('FATAL: '+(e?.stack??e));process.exit(1);});
