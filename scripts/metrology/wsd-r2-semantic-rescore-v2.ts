/**
 * OMEGA METROLOGY — WS-D R2.1 SEMANTIC vs KEYWORD RE-SCORE **v2** (Ollama, terminal Architecte)
 * ============================================================================
 * SUPERSEDE wsd-r2-semantic-rescore.ts (v1). Corrige les 2 trous du verdict WS_D_R2_1_VERDICT.md :
 *   (1) corpus = 3 familles VRAIMENT distinctes, FR+EN chacune (au lieu de ALTERNANCE dégénéré + goldens vides) ;
 *   (2) adversarial CONTRÔLÉ EN LONGUEUR : passages normalisés à NORM_WORDS, stuffing PROPORTIONNEL
 *       et APPARIÉ À LA LANGUE, Δ rapporté PAR 100 MOTS de stuffing (élimine l'artefact des passages courts).
 *
 * Preuve R2.1 (EMP-16, triple-preuve sur 3 corpus INDÉPENDANTS) : le capteur SÉMANTIQUE existant
 * `scoreSensoryDensity` (HYBRID CALC+LLM, bilingue) couvre l'immersion SANS biais langue et SANS être
 * gameable par keyword-stuffing — contrairement aux capteurs keyword (sensory_richness FR-only, corporeal_anchoring).
 *
 * 3 CORPUS INDÉPENDANTS (mandat Architecte « maîtres + best-sellers + mauvaise-prose ») :
 *   maitres      = canon littéraire domaine public (FR+EN)
 *   bestsellers  = commercial grand public contemporain (FR+EN)
 *   badprose     = pulp / genre / bas de gamme (FR+EN)
 * Source : omega-autopsie/corpus_r/txt (déjà présent dans le repo — EMP-17).
 *
 * DROITS : best-sellers + mauvaise-prose = œuvres sous droits. MESURE INTERNE UNIQUEMENT.
 *   Ce script ne sort QUE des scores + sha256(prose) + nombre de mots. AUCUNE prose n'est écrite
 *   dans les outputs ni committée. Les .txt sources ne sont jamais copiés ni versionnés.
 *
 * CONVERGENCE attendue (EMP-16, 3/3 familles) :
 *   (a) sémantique FR ~ EN (pas de biais langue ; |Δ|<10) DANS CHAQUE famille,
 *   (b) sémantique NON-gameable (Δ_sem_stuff/100mots petit, << Δ_kw_stuff/100mots) DANS CHAQUE famille,
 *   (c) keyword reproduit le défaut (FR-only : EN effondré et/ou FR gameable) DANS CHAQUE famille.
 *   3/3 familles convergent -> R2.1 prouvé -> GO code (couche RÔLE, flag, shadow). 1 diverge -> STOP.
 *
 * NÉCESSITE OLLAMA -> terminal Architecte. Run (cwd=packages/sovereign-engine) :
 *   $env:ECC_K='1'; npx tsx ../../scripts/metrology/wsd-r2-semantic-rescore-v2.ts
 */
process.env.OMEGA_CHUNKED_V4='1'; process.env.OMEGA_PROMPT_V4='1';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as path from 'node:path';
import { createGenesisPlan } from '../../packages/genesis-planner/src/planner.js';
import { createDefaultConfig } from '../../packages/genesis-planner/src/config.js';
import type { Scene } from '../../packages/genesis-planner/src/types.js';
import { assembleForgePacket } from '../../packages/sovereign-engine/src/input/forge-packet-assembler.js';
import { SOVEREIGN_CONFIG } from '../../packages/sovereign-engine/src/config.js';
import { scoreSensoryDensity } from '../../packages/sovereign-engine/src/oracle/axes/sensory-density.js';
import { createOllamaProvider } from '../../packages/sovereign-engine/src/runtime/ollama-provider.js';
import { DEFAULT_VOICE_GENOME } from '../../packages/sovereign-engine/src/voice/voice-genome.js';
import type { ForgePacket, StyleProfile, KillLists, CanonEntry, ForgeContinuity } from '../../packages/sovereign-engine/src/types.js';

const REPO=path.resolve(process.cwd(),process.cwd().endsWith('sovereign-engine')?'../..':'.');
const CORP=path.join(REPO,'omega-autopsie','corpus_r','txt');
const OUT=path.join(REPO,'docs','audit','calibration');
const TS='2026-01-01T00:00:00.000Z';
const MODEL=process.env.ECC_MODEL??'qwen3:32b';
const OLLAMA=process.env.ECC_OLLAMA_URL??'http://localhost:11434';
const NORM_WORDS=Number(process.env.R2_NORM_WORDS??'600');   // longueur normalisée de chaque passage
const PASS_PER_BOOK=Number(process.env.R2_PASS_PER_BOOK??'2');
const STUFF_RATIO=Number(process.env.R2_STUFF_RATIO??'0.08'); // fraction de stuffing visée vs base
function log(s:string){process.stderr.write(s+'\n');}
function words(s:string){return s.split(/\s+/).filter(w=>w.length>0).length;}
function sha(s:string){return createHash('sha256').update(s,'utf8').digest('hex').slice(0,16);}

// keyword sensors = REPRODUCTION fidèle des sous-capteurs sous test (FR-only volontaire : c'est le défaut prouvé)
const SENSORY:Record<string,string[]>={sight:['voir','regard','yeux','lumière','ombre','couleur','forme','éclat','reflet','lueur','obscurité','clarté','horizon','silhouette','teinte','pénombre'],sound:['entendre','bruit','voix','silence','écho','murmure','grondement','sifflement','crissement','résonance','fracas','bruissement','tintement'],touch:['toucher','peau','contact','texture','caresser','frôler','rugosité','douceur','pression','grain','palper','saisir','serrer'],smell:['odeur','parfum','sentir','puanteur','arôme','fragrance','effluve','relent','encens','musc','moisi','âcre','épicé'],temperature:['chaud','froid','tiède','glacé','brûlant','frais','chaleur','geler','fièvre','moiteur','fraîcheur','givre','vapeur','torride']};
function kwSensory(p:string){const lp=p.toLowerCase();let n=0;for(const c of Object.keys(SENSORY))if(SENSORY[c]!.some(m=>lp.includes(m)))n++;return n/5*100;}
function kwCorporeal(p:string){const lp=p.toLowerCase();let c=0;for(const m of (SOVEREIGN_CONFIG as any).CORPOREAL_MARKERS)if(lp.includes(m))c++;return Math.min(c/(SOVEREIGN_CONFIG as any).CORPOREAL_TARGET,1)*100;}

// stuffing APPARIÉ à la langue (salade de mots-clés sensoriels creux, sans contenu narratif)
const STUFF_FR=" La lumière, l'ombre, la couleur, le bruit, la voix, l'odeur, le parfum, le chaud, le froid : peau, main, doigts, souffle, regard, chaleur glacée, texture brûlante.";
const STUFF_EN=" The light, the shadow, the color, the noise, the voice, the smell, the scent, the heat, the cold: skin, hand, fingers, breath, gaze, icy warmth, burning texture.";
const STUFF:Record<'fr'|'en',string>={fr:STUFF_FR,en:STUFF_EN};

function cleanG(raw:string){let t=raw;const s=t.search(/\*\*\*\s*START OF (THE|THIS)? ?PROJECT GUTENBERG/i);if(s>=0)t=t.slice(t.indexOf('\n',s)+1);const e=t.search(/\*\*\*\s*END OF (THE|THIS)? ?PROJECT GUTENBERG/i);if(e>=0)t=t.slice(0,e);return t;}
// extrait n passages du CORPS (10%-92%), chacun TRONQUÉ à NORM_WORDS mots (normalisation longueur)
function passages(raw:string,n:number){
  const paras=cleanG(raw).split(/\n\s*\n/).map(p=>p.replace(/\s+/g,' ').trim()).filter(p=>words(p)>=8);
  const lo=Math.floor(paras.length*0.1),hi=Math.floor(paras.length*0.92);const body=paras.slice(lo,hi);
  const out:string[]=[];const stride=Math.max(1,Math.floor(body.length/(n+1)));
  for(let k=1;k<=n;k++){const st=Math.min(body.length-1,k*stride);let acc:string[]=[],w=0;
    for(let i=st;i<body.length&&w<NORM_WORDS*1.6;i++){acc.push(body[i]!);w+=words(body[i]!);}
    let pp=acc.join(' ').split(/\s+/).slice(0,NORM_WORDS).join(' ');   // tronque à NORM_WORDS
    if(words(pp)>=Math.floor(NORM_WORDS*0.7))out.push(pp);}
  return out;
}

// MANIFEST : 3 familles × FR/EN × 3 livres (corpus_r/txt). Best-sellers + bad = sous droits (mesure interne only).
const MANIFEST:ReadonlyArray<readonly[string,'maitres'|'bestsellers'|'badprose','fr'|'en']>=[
  // --- MAÎTRES (domaine public, canon) ---
  ['flaubert_bovary_14155.txt','maitres','fr'],['hugo_miserables_17489.txt','maitres','fr'],['proust_swann_2650.txt','maitres','fr'],
  ['dickens_two_cities_98.txt','maitres','en'],['austen_pride_1342.txt','maitres','en'],['melville_moby_2701.txt','maitres','en'],
  // --- BEST-SELLERS (commercial grand public, sous droits) ---
  ['projet_derniere_chance_french_edition_andy_weir.txt','bestsellers','fr'],['le_crime_du_paradis_french_edition_guillaume_musso.txt','bestsellers','fr'],['mille_petits_riens_french_edition_jodi_picoult.txt','bestsellers','fr'],
  ['andy_weir_the_martian.txt','bestsellers','en'],['colleen_hoover_it_ends_with_us.txt','bestsellers','en'],['dan_brown_origin.txt','bestsellers','en'],
  // --- MAUVAISE PROSE (pulp / genre / bas de gamme, sous droits) ---
  ['cinquante_nuances_de_grey_french_edition_el_james.txt','badprose','fr'],['le_pacte_de_sang_french_edition_laura_s_wild.txt','badprose','fr'],['grossesse_mafia_french_edition_melanie_rain.txt','badprose','fr'],
  ['el_james_fifty_shades_of_grey.txt','badprose','en'],['gently_yours_gently_series_book_1_sweetblunch.txt','badprose','en'],['claimed_by_the_mountain_kings_alisson_bento.txt','badprose','en'],
];

function loadCorpora():{family:string,lang:'fr'|'en',book:string,prose:string}[]{
  const rows:{family:string,lang:'fr'|'en',book:string,prose:string}[]=[];
  for(const [f,family,lang] of MANIFEST){const fp=path.join(CORP,f);
    if(!existsSync(fp)){log(`  [MISS] ${f}`);continue;}
    const ps=passages(readFileSync(fp,'utf8'),PASS_PER_BOOK);
    for(const pr of ps)rows.push({family,lang,book:f.replace(/\.txt$/,''),prose:pr});
    log(`  [load] ${family}/${lang} ${f} -> ${ps.length} passage(s)`);
  }
  return rows;
}
function basePacket(lang:'fr'|'en'):ForgePacket{const pack=JSON.parse(readFileSync(path.join(REPO,'golden/intents/intent_pack_gardien.json'),'utf8'));const {plan}=createGenesisPlan(pack.intent,pack.canon,pack.constraints,pack.genome,pack.emotion,createDefaultConfig(),TS);const scene0=plan.arcs[0]!.scenes[0]! as Scene;const style:StyleProfile={version:'1.0.0',universe:'literary_fiction',lexicon:{signature_words:[],forbidden_words:[],abstraction_max_ratio:0.3,concrete_min_ratio:0.5},rhythm:{avg_sentence_length_target:20,gini_target:0.45,max_consecutive_similar:2,min_syncopes_per_scene:2,min_compressions_per_scene:1},tone:{dominant_register:'soutenu',intensity_range:[0.2,0.9] as readonly[number,number]},imagery:{recurrent_motifs:[],density_target_per_100_words:3,banned_metaphors:[]},voice:DEFAULT_VOICE_GENOME};return assembleForgePacket({plan,scene:scene0,style_profile:style,kill_lists:{banned_words:[],banned_cliches:[],banned_ai_patterns:[],banned_filter_words:[]} as KillLists,canon:[] as CanonEntry[],continuity:{previous_scene_summary:'',character_states:[],open_threads:[]} as ForgeContinuity,run_id:'r2v2',language:lang});}
function llmOf(ax:any){const m=String(ax.details||'').match(/LLM:\s*(\d+)/);return m?+m[1]:ax.score;}
const mean=(xs:number[])=>xs.length?+(xs.reduce((a,b)=>a+b,0)/xs.length).toFixed(1):0;

// stuffing proportionnel : k copies pour viser STUFF_RATIO de la base ; renvoie {text, stuffWords}
function stuffProportional(prose:string,lang:'fr'|'en'){const base=words(prose);const unit=STUFF[lang];const unitW=words(unit);
  const target=Math.max(unitW,Math.round(base*STUFF_RATIO));const copies=Math.max(1,Math.round(target/unitW));
  return {text:prose+unit.repeat(copies),stuffWords:copies*unitW};}

async function main(){
  log(`=== WS-D R2.1 v2 SEMANTIC vs KEYWORD (${MODEL}) | NORM_WORDS=${NORM_WORDS} STUFF_RATIO=${STUFF_RATIO} ===`);
  // --- DRY-RUN CALC-PUR (R2_DRYRUN=1) : pas d'Ollama. Valide corpus+normalisation, prouve le biais keyword FR-only. ---
  if(process.env.R2_DRYRUN==='1'){
    const rows=loadCorpora();
    log(`[DRYRUN] ${rows.length} passages (${['maitres','bestsellers','badprose'].map(c=>c+'='+rows.filter(r=>r.family===c).length).join(' ')})`);
    const dry:any[]=[];
    for(const r of rows){const kS=kwSensory(r.prose),kC=kwCorporeal(r.prose);const {text:st,stuffWords}=stuffProportional(r.prose,r.lang);const kSs=kwSensory(st);
      dry.push({family:r.family,lang:r.lang,book:r.book,words:words(r.prose),stuff_words:stuffWords,kw_sensory:+kS.toFixed(1),kw_corporeal:+kC.toFixed(1),d_kw_per100:+((kSs-kS)*100/stuffWords).toFixed(2)});}
    const sum:any={tool:'wsd-r2-semantic-rescore-v2.ts[DRYRUN]',mode:'CALC_ONLY_no_ollama',norm_words:NORM_WORDS,n:dry.length,by_family:{}};
    for(const c of ['maitres','bestsellers','badprose']){const rs=dry.filter(o=>o.family===c);if(!rs.length)continue;const fr=rs.filter(o=>o.lang==='fr'),en=rs.filter(o=>o.lang==='en');
      sum.by_family[c]={n:rs.length,kw_sensory_FR:mean(fr.map(o=>o.kw_sensory)),kw_sensory_EN:mean(en.map(o=>o.kw_sensory)),kw_corporeal_FR:mean(fr.map(o=>o.kw_corporeal)),kw_corporeal_EN:mean(en.map(o=>o.kw_corporeal)),d_kw_per100:mean(rs.map(o=>o.d_kw_per100))};}
    mkdirSync(OUT,{recursive:true});writeFileSync(path.join(OUT,'WS_D_R2_SEMANTIC_RESCORE_V2_DRYRUN.json'),JSON.stringify({summary:sum,rows:dry},null,2),'utf8');
    log('\n=== DRYRUN SUMMARY (CALC keyword only) ===');log(JSON.stringify(sum,null,2));
    log('\n[DRYRUN] OK — corpus chargé, normalisation appliquée, biais keyword FR/EN mesuré. Sémantique (Ollama) = run complet terminal Architecte.');
    return;
  }
  const provider=createOllamaProvider({baseUrl:OLLAMA,model:MODEL,draftTemperature:0,judgeTemperature:0,draftMaxTokens:2000,judgeMaxTokens:2000});
  const pkt={fr:basePacket('fr'),en:basePacket('en')};
  const rows=loadCorpora();
  log(`corpus chargés : ${rows.length} passages (${['maitres','bestsellers','badprose'].map(c=>c+'='+rows.filter(r=>r.family===c).length).join(' ')})`);
  const out:any[]=[];
  for(const r of rows){
    const kS=kwSensory(r.prose),kC=kwCorporeal(r.prose);
    const sem=await scoreSensoryDensity(pkt[r.lang],r.prose,provider);const semLLM=llmOf(sem);
    const {text:stuffed,stuffWords}=stuffProportional(r.prose,r.lang);
    const kSs=kwSensory(stuffed);const semS=await scoreSensoryDensity(pkt[r.lang],stuffed,provider);
    const dKw=kSs-kS,dSem=semS.score-sem.score;const per=(d:number)=>+(d*100/stuffWords).toFixed(2);
    out.push({family:r.family,lang:r.lang,book:r.book,sha16:sha(r.prose),words:words(r.prose),stuff_words:stuffWords,
      kw_sensory:+kS.toFixed(1),kw_corporeal:+kC.toFixed(1),sem_focalisation:+sem.score.toFixed(1),sem_LLM:+semLLM.toFixed(1),
      kw_sensory_stuffed:+kSs.toFixed(1),sem_stuffed:+semS.score.toFixed(1),
      d_kw_stuff:+dKw.toFixed(1),d_sem_stuff:+dSem.toFixed(1),d_kw_per100:per(dKw),d_sem_per100:per(dSem)});
    log(`  [${r.family}/${r.lang}] ${r.book.slice(0,28)} kwSens ${kS.toFixed(0)} kwCorp ${kC.toFixed(0)} | semFoc ${sem.score.toFixed(0)} (LLM ${semLLM.toFixed(0)}) | /100w Δkw ${per(dKw)} Δsem ${per(dSem)}`);
  }
  const summary:any={tool:'wsd-r2-semantic-rescore-v2.ts',model:MODEL,norm_words:NORM_WORDS,stuff_ratio:STUFF_RATIO,n:out.length,by_family:{}};
  for(const c of ['maitres','bestsellers','badprose']){const rs=out.filter(o=>o.family===c);if(!rs.length)continue;
    const fr=rs.filter(o=>o.lang==='fr'),en=rs.filter(o=>o.lang==='en');
    const semFR=mean(fr.map(o=>o.sem_focalisation)),semEN=mean(en.map(o=>o.sem_focalisation));
    const kwFR=mean(fr.map(o=>o.kw_sensory)),kwEN=mean(en.map(o=>o.kw_sensory));
    const dKw=mean(rs.map(o=>o.d_kw_per100)),dSem=mean(rs.map(o=>o.d_sem_per100));
    const a_unbiased=Math.abs(semFR-semEN)<10, b_robust=Math.abs(dSem)<Math.abs(dKw)/2, b_small=Math.abs(dSem)<5;
    summary.by_family[c]={n:rs.length,sem_FR:semFR,sem_EN:semEN,sem_absDelta:+Math.abs(semFR-semEN).toFixed(1),
      kw_sensory_FR:kwFR,kw_sensory_EN:kwEN,d_kw_per100:dKw,d_sem_per100:dSem,
      verdict:{a_unbiased,b_robust_and_small:b_robust&&b_small,converges:a_unbiased&&b_robust&&b_small}};
  }
  const fams=Object.values<any>(summary.by_family);
  summary.triple_proof={families_converging:fams.filter(f=>f.verdict.converges).length,total:fams.length,
    result:fams.length===3&&fams.every(f=>f.verdict.converges)?'CONVERGE_3_3_GO_CODE':'NOT_3_3_STOP',
    note:'(a) |sem_FR-sem_EN|<10 ; (b) |Δ_sem/100|<|Δ_kw/100|/2 ET <5. 3/3 familles => GO couche rôle (flag/shadow). 1 diverge => STOP (EMP-16).'};
  mkdirSync(OUT,{recursive:true});
  writeFileSync(path.join(OUT,'WS_D_R2_SEMANTIC_RESCORE_V2.json'),JSON.stringify({summary,rows:out},null,2),'utf8');
  const cols=['family','lang','book','sha16','words','stuff_words','kw_sensory','kw_corporeal','sem_focalisation','sem_LLM','kw_sensory_stuffed','sem_stuffed','d_kw_stuff','d_sem_stuff','d_kw_per100','d_sem_per100'];
  writeFileSync(path.join(OUT,'WS_D_R2_SEMANTIC_RESCORE_V2.csv'),[cols.join(','),...out.map(r=>cols.map(c=>r[c]).join(','))].join('\n')+'\n','utf8');
  log('\n=== SUMMARY ===');log(JSON.stringify(summary,null,2));
  log('\nDROITS : aucun extrait de prose n\'est écrit (scores + sha16 + mots uniquement).');
  log(summary.triple_proof.result==='CONVERGE_3_3_GO_CODE'?'\n>>> 3/3 CONVERGE -> GO code couche rôle (flag, shadow, terminal Architecte EMP-10).':'\n>>> PAS 3/3 -> STOP, aucune modif moteur (EMP-16).');
}
main().catch(e=>{log('FATAL: '+(e?.stack??e));process.exit(1);});
