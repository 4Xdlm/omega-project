/**
 * OMEGA METROLOGY — WS-D R2.3 GAMEABILITY @ SCALE (Ollama, terminal Architecte)
 * ============================================================================
 * Mandat Architecte : « pousser au maximum, 1000 tests sur 5 tailles, même les livres entiers,
 * ne pas lésiner sur la quantité ni la qualité des données. » Vérité ×1000.
 *
 * Tranche l'ambiguïté du critère (b) R2.1 v2 (d_sem ≈ +31/100 mots, CONSTANT) :
 *   3 BRAS de longueur identique × 5 TAILLES de texte (+ livre entier opt-in) × corpus large (30 livres).
 *   bras : (1) base ; (2) +SALADE sensorielle incohérente ; (3) +FILLER NEUTRE non-sensoriel (même nb mots).
 *   GAMEABILITÉ NETTE = Δ_salade/100 − Δ_neutre/100.
 *
 * LECTURE PAR TAILLE (le point décisif) :
 *   - NET plat & >5 sur toutes tailles -> gameabilité sensorielle RÉELLE (capteur dupé).
 *   - NET -> 0 quand la taille monte -> effet de DENSITÉ qui se dilue (artefact ; seuil R2.1 mal posé).
 *   - Δneutre ≈ Δsalade -> artefact pur longueur/récence (le LLM réagit à tout ajout).
 *
 * ÉCHELLE (défauts) : 30 livres (5/cellule × 6) × R2_PASS passages × 5 tailles × 3 bras.
 *   PASS=2 -> 60 passages × 5 × 3 = 900 mesures (+ livre entier opt-in 30×3=90 -> ~990). Monter PASS pour >2000.
 * CRASH-SAFE : checkpoint JSONL après CHAQUE mesure, reprise auto (skip clés déjà faites). R2_LIMIT pour cap.
 * DROITS : best-sellers + mauvaise-prose sous droits. Sortie scores + sha16 + mots only. AUCUNE prose committée.
 *
 * NÉCESSITE OLLAMA -> terminal Architecte. Run (cwd=packages/sovereign-engine) :
 *   $env:ECC_K='1'; npx tsx ..\..\scripts\metrology\wsd-r2-3-gameability-scale.ts
 * Options : $env:R2_PASS='3'  $env:R2_WHOLEBOOK='1'  $env:R2_SIZES='150,300,600,1200,2400'
 *           $env:R2_WHOLE_MAX='4000'  $env:R2_LIMIT='200'  $env:ECC_MODEL='qwen3:32b'
 * REPRISE : relancer la même commande -> reprend où il s'est arrêté (lit le .jsonl).
 */
process.env.OMEGA_CHUNKED_V4='1'; process.env.OMEGA_PROMPT_V4='1';
import { readFileSync, existsSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as path from 'node:path';
import { createGenesisPlan } from '../../packages/genesis-planner/src/planner.js';
import { createDefaultConfig } from '../../packages/genesis-planner/src/config.js';
import type { Scene } from '../../packages/genesis-planner/src/types.js';
import { assembleForgePacket } from '../../packages/sovereign-engine/src/input/forge-packet-assembler.js';
import { scoreSensoryDensity } from '../../packages/sovereign-engine/src/oracle/axes/sensory-density.js';
import { createOllamaProvider } from '../../packages/sovereign-engine/src/runtime/ollama-provider.js';
import { DEFAULT_VOICE_GENOME } from '../../packages/sovereign-engine/src/voice/voice-genome.js';
import type { ForgePacket, StyleProfile, KillLists, CanonEntry, ForgeContinuity } from '../../packages/sovereign-engine/src/types.js';

const REPO=path.resolve(process.cwd(),process.cwd().endsWith('sovereign-engine')?'../..':'.');
const CORP=path.join(REPO,'omega-autopsie','corpus_r','txt');
const OUT=path.join(REPO,'docs','audit','calibration');
const CKPT=path.join(OUT,'WS_D_R2_3_GAMEABILITY.jsonl');
const TS='2026-01-01T00:00:00.000Z';
const MODEL=process.env.ECC_MODEL??'qwen3:32b';
const OLLAMA=process.env.ECC_OLLAMA_URL??'http://localhost:11434';
const SIZES=(process.env.R2_SIZES??'150,300,600,1200,2400').split(',').map(s=>+s.trim()).filter(n=>n>0);
const PASS=Number(process.env.R2_PASS??'2');
const STUFF_RATIO=Number(process.env.R2_STUFF_RATIO??'0.08');
const WHOLEBOOK=process.env.R2_WHOLEBOOK==='1';
const WHOLE_MAX=Number(process.env.R2_WHOLE_MAX??'4000');
const LIMIT=Number(process.env.R2_LIMIT??'0'); // 0 = pas de cap
function log(s:string){process.stderr.write(s+'\n');}
function words(s:string){return s.split(/\s+/).filter(w=>w.length>0).length;}
function sha(s:string){return createHash('sha256').update(s,'utf8').digest('hex').slice(0,16);}

const SALAD:Record<'fr'|'en',string>={
  fr:" La lumière, l'ombre, la couleur, le bruit, la voix, l'odeur, le parfum, le chaud, le froid : peau, main, doigts, souffle, regard, chaleur glacée, texture brûlante.",
  en:" The light, the shadow, the color, the noise, the voice, the smell, the scent, the heat, the cold: skin, hand, fingers, breath, gaze, icy warmth, burning texture."};
const NEUTRAL:Record<'fr'|'en',string>={
  fr:" Le rapport fut transmis au service concerné selon la procédure habituelle, puis enregistré dans le système conformément au règlement administratif en vigueur avant la clôture du trimestre comptable annuel.",
  en:" The report was forwarded to the relevant department according to the usual procedure, then logged into the system in accordance with the administrative regulation in force before the annual accounting quarter closed."};

function cleanG(raw:string){let t=raw;const s=t.search(/\*\*\*\s*START OF (THE|THIS)? ?PROJECT GUTENBERG/i);if(s>=0)t=t.slice(t.indexOf('\n',s)+1);const e=t.search(/\*\*\*\s*END OF (THE|THIS)? ?PROJECT GUTENBERG/i);if(e>=0)t=t.slice(0,e);return t;}
function bodyWords(raw:string):string[]{
  const paras=cleanG(raw).split(/\n\s*\n/).map(p=>p.replace(/\s+/g,' ').trim()).filter(p=>words(p)>=8);
  const lo=Math.floor(paras.length*0.1),hi=Math.floor(paras.length*0.92);
  return paras.slice(lo,hi).join(' ').split(/\s+/).filter(w=>w.length>0);
}
// extrait N fenêtres longues (>= max(SIZES) mots) bien réparties dans le corps
function longPassages(raw:string,n:number,minW:number):string[]{
  const w=bodyWords(raw); if(w.length<minW) {return w.length>=Math.min(...SIZES)? [w.join(' ')] : [];}
  const out:string[]=[]; const stride=Math.max(minW,Math.floor((w.length-minW)/(n+1)));
  for(let k=1;k<=n;k++){const st=Math.min(w.length-minW,k*stride); out.push(w.slice(st,st+minW).join(' '));}
  return out;
}
function truncW(s:string,n:number){return s.split(/\s+/).slice(0,n).join(' ');}
function appendN(prose:string,unit:string,targetWords:number){const u=words(unit);const copies=Math.max(1,Math.round(targetWords/u));return {text:prose+unit.repeat(copies),w:copies*u};}

const MANIFEST:ReadonlyArray<readonly[string,'maitres'|'bestsellers'|'badprose','fr'|'en']>=[
  // maitres FR (5) / EN (5)
  ['flaubert_bovary_14155.txt','maitres','fr'],['hugo_miserables_17489.txt','maitres','fr'],['proust_swann_2650.txt','maitres','fr'],['zola_bete_10007.txt','maitres','fr'],['maupassant_bel_ami_3088.txt','maitres','fr'],
  ['dickens_two_cities_98.txt','maitres','en'],['austen_pride_1342.txt','maitres','en'],['melville_moby_2701.txt','maitres','en'],['bronte_e_wuthering_768.txt','maitres','en'],['george_eliot_middlemarch.txt','maitres','en'],
  // bestsellers FR (5) / EN (5)
  ['projet_derniere_chance_french_edition_andy_weir.txt','bestsellers','fr'],['le_crime_du_paradis_french_edition_guillaume_musso.txt','bestsellers','fr'],['mille_petits_riens_french_edition_jodi_picoult.txt','bestsellers','fr'],['fourth_wing_tome_2_french_edition_rebecca_yarros.txt','bestsellers','fr'],['il_faut_qu_on_parle_de_kevin_french_edition_lionel_shriver.txt','bestsellers','fr'],
  ['andy_weir_the_martian.txt','bestsellers','en'],['colleen_hoover_it_ends_with_us.txt','bestsellers','en'],['dan_brown_origin.txt','bestsellers','en'],['john_grisham_the_firm.txt','bestsellers','en'],['jk_rowling_harry_potter_and_the_philosophers_stone.txt','bestsellers','en'],
  // badprose FR (5) / EN (5)
  ['cinquante_nuances_de_grey_french_edition_el_james.txt','badprose','fr'],['le_pacte_de_sang_french_edition_laura_s_wild.txt','badprose','fr'],['grossesse_mafia_french_edition_melanie_rain.txt','badprose','fr'],['bikers_law_tome_2_french_edition_arizona_brooks.txt','badprose','fr'],['seduite_par_le_guerrier_alien_french_edition_ava_ross.txt','badprose','fr'],
  ['el_james_fifty_shades_of_grey.txt','badprose','en'],['gently_yours_gently_series_book_1_sweetblunch.txt','badprose','en'],['claimed_by_the_mountain_kings_alisson_bento.txt','badprose','en'],['milked_by_the_italian_mafia_hucow_for_mafioso_book_1_leandra_camilli.txt','badprose','en'],['the_reno_man_and_my_hotwife_epub_the_reno_man.txt','badprose','en'],
];
function basePacket(lang:'fr'|'en'):ForgePacket{const pack=JSON.parse(readFileSync(path.join(REPO,'golden/intents/intent_pack_gardien.json'),'utf8'));const {plan}=createGenesisPlan(pack.intent,pack.canon,pack.constraints,pack.genome,pack.emotion,createDefaultConfig(),TS);const scene0=plan.arcs[0]!.scenes[0]! as Scene;const style:StyleProfile={version:'1.0.0',universe:'literary_fiction',lexicon:{signature_words:[],forbidden_words:[],abstraction_max_ratio:0.3,concrete_min_ratio:0.5},rhythm:{avg_sentence_length_target:20,gini_target:0.45,max_consecutive_similar:2,min_syncopes_per_scene:2,min_compressions_per_scene:1},tone:{dominant_register:'soutenu',intensity_range:[0.2,0.9] as readonly[number,number]},imagery:{recurrent_motifs:[],density_target_per_100_words:3,banned_metaphors:[]},voice:DEFAULT_VOICE_GENOME};return assembleForgePacket({plan,scene:scene0,style_profile:style,kill_lists:{banned_words:[],banned_cliches:[],banned_ai_patterns:[],banned_filter_words:[]} as KillLists,canon:[] as CanonEntry[],continuity:{previous_scene_summary:'',character_states:[],open_threads:[]} as ForgeContinuity,run_id:'r23',language:lang});}
const mean=(xs:number[])=>xs.length?+(xs.reduce((a,b)=>a+b,0)/xs.length).toFixed(2):0;

async function main(){
  log(`=== WS-D R2.3 GAMEABILITY @ SCALE (${MODEL}) | sizes=[${SIZES.join(',')}] PASS=${PASS} wholebook=${WHOLEBOOK} ===`);
  if(process.env.R2_DRYRUN==='1'){
    const minW0=Math.max(...SIZES); let units=0,wholes=0; const perFam:Record<string,number>={};
    for(const [f,family,lang] of MANIFEST){const fp=path.join(CORP,f);if(!existsSync(fp)){log(`  [MISS] ${f}`);continue;}
      const raw=readFileSync(fp,'utf8'); const longs=longPassages(raw,PASS,minW0);
      let u=0; longs.forEach(lp=>{for(const size of SIZES)if(words(lp)>=size)u++;});
      if(WHOLEBOOK){u++;wholes++;} units+=u; perFam[family]=(perFam[family]||0)+u;
      log(`  [dry] ${family}/${lang} ${f.slice(0,40)} -> ${longs.length} fenêtre(s) (${longs.map(l=>words(l)).join('/')}w) => ${u} unités`);}
    log(`[DRYRUN] ${units} unités totales (${Object.entries(perFam).map(([k,v])=>k+'='+v).join(' ')}) ; ${units*3} appels LLM ; wholebook=${wholes}`);
    log('[DRYRUN] OK — manifest+tailles+worklist validés (sans Ollama). Run complet = terminal Architecte.'); return;
  }
  const provider=createOllamaProvider({baseUrl:OLLAMA,model:MODEL,draftTemperature:0,judgeTemperature:0,draftMaxTokens:2000,judgeMaxTokens:2000});
  const pkt={fr:basePacket('fr'),en:basePacket('en')};
  const hasLLM=(ax:any)=>/LLM:\s*\d+/.test(String(ax.details||''));
  const probe=await scoreSensoryDensity(pkt.fr,'Le vent froid glaçait la peau ; au loin une lueur tremblait dans la pénombre, et une odeur âcre montait du sol humide sous ses doigts.',provider);
  log(`[PREFLIGHT] LLM tag = ${hasLLM(probe)} | "${String(probe.details||'').slice(0,90)}"`);
  if(!hasLLM(probe)){log('FATAL: SEMANTIC_NOT_RUNNING — fallback keyword silencieux. RUN INVALIDE. Terminal Architecte + Ollama qwen3:32b.');process.exit(2);}

  // reprise : charge les clés déjà mesurées
  mkdirSync(OUT,{recursive:true});
  const done=new Set<string>(); const prior:any[]=[];
  if(existsSync(CKPT)){for(const line of readFileSync(CKPT,'utf8').split('\n')){if(!line.trim())continue;try{const o=JSON.parse(line);done.add(o.key);prior.push(o);}catch{}}}
  log(`[RESUME] ${done.size} mesures déjà au checkpoint (${CKPT.replace(REPO,'.')})`);

  const minW=Math.max(...SIZES);
  // build worklist
  type Unit={family:string,lang:'fr'|'en',book:string,passIdx:number,size:number,base:string,sha:string,key:string};
  const work:Unit[]=[];
  for(const [f,family,lang] of MANIFEST){const fp=path.join(CORP,f);if(!existsSync(fp)){log(`  [MISS] ${f}`);continue;}
    const raw=readFileSync(fp,'utf8'); const book=f.replace(/\.txt$/,'');
    const longs=longPassages(raw,PASS,minW);
    longs.forEach((lp,pi)=>{ for(const size of SIZES){ if(words(lp)<size)continue; const base=truncW(lp,size); const s=sha(base);
      work.push({family,lang,book,passIdx:pi,size,base,sha:s,key:`${s}_${size}`}); }});
    if(WHOLEBOOK){const wb=truncW(bodyWords(raw).join(' '),WHOLE_MAX); if(words(wb)>=Math.min(...SIZES)){const s=sha(wb);work.push({family,lang,book,passIdx:-1,size:-1,base:wb,sha:s,key:`${s}_whole`});}}
  }
  const todo=work.filter(u=>!done.has(u.key));
  log(`[PLAN] ${work.length} unités (${work.length-todo.length} déjà faites, ${todo.length} à faire) — ${todo.length*3} appels LLM restants`);

  let n=0;
  for(const u of todo){
    if(LIMIT&&n>=LIMIT){log(`[LIMIT] cap ${LIMIT} atteint, arrêt propre (reprise possible).`);break;}
    const targetW=Math.max(words(SALAD[u.lang]),Math.round(words(u.base)*STUFF_RATIO));
    const sal=appendN(u.base,SALAD[u.lang],targetW), neu=appendN(u.base,NEUTRAL[u.lang],targetW);
    const bA=await scoreSensoryDensity(pkt[u.lang],u.base,provider);
    const sA=await scoreSensoryDensity(pkt[u.lang],sal.text,provider);
    const nA=await scoreSensoryDensity(pkt[u.lang],neu.text,provider);
    if(!hasLLM(bA)||!hasLLM(sA)||!hasLLM(nA)){log(`FATAL: tag LLM manquant sur ${u.book}/${u.size} => fallback partiel, INVALIDE. (reprise possible après correction Ollama)`);process.exit(3);}
    const dSal=(sA.score-bA.score)*100/sal.w, dNeu=(nA.score-bA.score)*100/neu.w, net=dSal-dNeu;
    const row={key:u.key,family:u.family,lang:u.lang,book:u.book,pass:u.passIdx,size:u.size,sha16:u.sha,words:words(u.base),
      sem_base:+bA.score.toFixed(1),sem_salad:+sA.score.toFixed(1),sem_neutral:+nA.score.toFixed(1),
      d_salad_per100:+dSal.toFixed(2),d_neutral_per100:+dNeu.toFixed(2),net_per100:+net.toFixed(2)};
    appendFileSync(CKPT,JSON.stringify(row)+'\n','utf8'); n++;
    if(n%10===0||n<=3)log(`  [${n}/${todo.length}] ${u.family}/${u.lang} ${u.book.slice(0,22)} sz${u.size} base ${bA.score.toFixed(0)} | Δsal ${dSal.toFixed(1)} Δneu ${dNeu.toFixed(1)} NET ${net.toFixed(1)}`);
  }

  // agrégats sur TOUT le checkpoint (prior + nouveaux)
  const all:any[]=[]; for(const line of readFileSync(CKPT,'utf8').split('\n')){if(line.trim())try{all.push(JSON.parse(line));}catch{}}
  const summary:any={tool:'wsd-r2-3-gameability-scale.ts',model:MODEL,sizes:SIZES,pass:PASS,wholebook:WHOLEBOOK,n:all.length,by_size:{},by_family:{},by_family_lang:{}};
  for(const sz of [...SIZES,-1]){const rs=all.filter(o=>o.size===sz);if(!rs.length)continue;
    summary.by_size[sz===-1?'whole':String(sz)]={n:rs.length,d_salad_per100:mean(rs.map(o=>o.d_salad_per100)),d_neutral_per100:mean(rs.map(o=>o.d_neutral_per100)),net_per100:mean(rs.map(o=>o.net_per100))};}
  for(const c of ['maitres','bestsellers','badprose']){const rs=all.filter(o=>o.family===c);if(!rs.length)continue;
    summary.by_family[c]={n:rs.length,d_salad_per100:mean(rs.map(o=>o.d_salad_per100)),d_neutral_per100:mean(rs.map(o=>o.d_neutral_per100)),net_per100:mean(rs.map(o=>o.net_per100))};
    for(const lg of ['fr','en']){const r2=rs.filter(o=>o.lang===lg);if(r2.length)summary.by_family_lang[`${c}_${lg}`]={n:r2.length,sem_base:mean(r2.map(o=>o.sem_base)),net_per100:mean(r2.map(o=>o.net_per100))};}}
  // tendance NET vs taille (le test décisif)
  const sizeNet=SIZES.map(s=>({size:s,net:summary.by_size[String(s)]?.net_per100??null})).filter(x=>x.net!==null);
  const small=sizeNet.length?sizeNet[0]!.net:null, big=sizeNet.length?sizeNet[sizeNet.length-1]!.net:null;
  summary.decisive={
    net_vs_size:sizeNet, net_small_size:small, net_big_size:big,
    note:'Si NET reste >5 et plat sur toutes tailles => gameabilite REELLE. Si NET decroit vers 0 quand size monte => effet densite dilue (artefact, seuil R2.1 mal pose). Si d_neutral ~ d_salad => artefact longueur/recence pur.',
    interpretation: big!==null&&Math.abs(big)<5&&small!==null&&Math.abs(small)>=5 ? 'DENSITE_DILUEE_artefact_taille'
      : (sizeNet.every(x=>Math.abs(x.net)>=5)?'GAMEABILITE_REELLE_persistante':'MIXTE_voir_courbe')};
  writeFileSync(path.join(OUT,'WS_D_R2_3_GAMEABILITY.json'),JSON.stringify({summary},null,2),'utf8');
  const cols=['family','lang','book','pass','size','sha16','words','sem_base','sem_salad','sem_neutral','d_salad_per100','d_neutral_per100','net_per100'];
  writeFileSync(path.join(OUT,'WS_D_R2_3_GAMEABILITY.csv'),[cols.join(','),...all.map((r:any)=>cols.map(c=>r[c]).join(','))].join('\n')+'\n','utf8');
  log('\n=== SUMMARY ===');log(JSON.stringify(summary,null,2));
  log(`\n${all.length} mesures totales. Checkpoint: ${CKPT.replace(REPO,'.')} (reprise: relancer la commande).`);
  log('DROITS : aucun extrait de prose ecrit. Decision role capteur = Architecte/Tribunal apres lecture courbe NET vs taille.');
}
main().catch(e=>{log('FATAL: '+(e?.stack??e));process.exit(1);});
