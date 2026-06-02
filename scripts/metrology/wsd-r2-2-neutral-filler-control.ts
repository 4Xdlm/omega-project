/**
 * OMEGA METROLOGY — WS-D R2.2 NEUTRAL-FILLER CONTROL (Ollama, terminal Architecte)
 * ============================================================================
 * Désambiguïse le critère (b) échoué en R2.1 v2 (d_sem ≈ +31/100 mots de salade, CONSTANT sur 36 passages).
 * Question : ce décalage est-il (i) une vraie gameabilité immersion, ou (ii) une simple réponse de DENSITÉ
 * (capteur sensory_density légitimement sensible au sensoriel ajouté) — voire un artefact longueur/récence ?
 *
 * MÉTHODE — 3 bras de longueur IDENTIQUE sur chaque passage (mêmes 18 livres / corpus_r) :
 *   (1) base
 *   (2) + SALADE sensorielle incohérente (comme R2.1)
 *   (3) + FILLER NEUTRE non-sensoriel (texte plat administratif/logistique), MÊME nb de mots que (2)
 *
 * GAMEABILITÉ NETTE = Δ_salade/100 − Δ_neutre/100. Critère (b') : net < 5 ET net < (Δ_kw_salade/100)/2.
 *   - filler neutre décale AUSSI ~31 -> artefact longueur/récence (le seuil R2.1 était mal posé).
 *   - seul le sensoriel décale, neutre ~0 -> capteur de DENSITÉ correct (mais ≠ immersion-qualité -> re-cadrer rôle).
 *   - salade ≫ neutre AVEC net>5 -> gameabilité réelle confirmée.
 *
 * DROITS : best-sellers + mauvaise-prose sous droits. Sortie scores + sha16 + mots only. AUCUNE prose committée.
 * NÉCESSITE OLLAMA -> terminal Architecte. Run (cwd=packages/sovereign-engine) :
 *   $env:ECC_K='1'; npx tsx ..\..\scripts\metrology\wsd-r2-2-neutral-filler-control.ts
 */
process.env.OMEGA_CHUNKED_V4='1'; process.env.OMEGA_PROMPT_V4='1';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
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
const TS='2026-01-01T00:00:00.000Z';
const MODEL=process.env.ECC_MODEL??'qwen3:32b';
const OLLAMA=process.env.ECC_OLLAMA_URL??'http://localhost:11434';
const NORM_WORDS=Number(process.env.R2_NORM_WORDS??'600');
const PASS_PER_BOOK=Number(process.env.R2_PASS_PER_BOOK??'2');
const STUFF_RATIO=Number(process.env.R2_STUFF_RATIO??'0.08');
function log(s:string){process.stderr.write(s+'\n');}
function words(s:string){return s.split(/\s+/).filter(w=>w.length>0).length;}
function sha(s:string){return createHash('sha256').update(s,'utf8').digest('hex').slice(0,16);}

// BRAS 2 : salade sensorielle incohérente (apparié langue)
const SALAD:Record<'fr'|'en',string>={
  fr:" La lumière, l'ombre, la couleur, le bruit, la voix, l'odeur, le parfum, le chaud, le froid : peau, main, doigts, souffle, regard, chaleur glacée, texture brûlante.",
  en:" The light, the shadow, the color, the noise, the voice, the smell, the scent, the heat, the cold: skin, hand, fingers, breath, gaze, icy warmth, burning texture."};
// BRAS 3 : filler NEUTRE non-sensoriel (procédural/administratif), longueur ~ égale, AUCUN marqueur sensoriel
const NEUTRAL:Record<'fr'|'en',string>={
  fr:" Le rapport fut transmis au service concerné selon la procédure habituelle, puis enregistré dans le système conformément au règlement administratif en vigueur avant la clôture du trimestre comptable annuel.",
  en:" The report was forwarded to the relevant department according to the usual procedure, then logged into the system in accordance with the administrative regulation in force before the annual accounting quarter closed."};

function cleanG(raw:string){let t=raw;const s=t.search(/\*\*\*\s*START OF (THE|THIS)? ?PROJECT GUTENBERG/i);if(s>=0)t=t.slice(t.indexOf('\n',s)+1);const e=t.search(/\*\*\*\s*END OF (THE|THIS)? ?PROJECT GUTENBERG/i);if(e>=0)t=t.slice(0,e);return t;}
function passages(raw:string,n:number){
  const paras=cleanG(raw).split(/\n\s*\n/).map(p=>p.replace(/\s+/g,' ').trim()).filter(p=>words(p)>=8);
  const lo=Math.floor(paras.length*0.1),hi=Math.floor(paras.length*0.92);const body=paras.slice(lo,hi);
  const out:string[]=[];const stride=Math.max(1,Math.floor(body.length/(n+1)));
  for(let k=1;k<=n;k++){const st=Math.min(body.length-1,k*stride);let acc:string[]=[],w=0;
    for(let i=st;i<body.length&&w<NORM_WORDS*1.6;i++){acc.push(body[i]!);w+=words(body[i]!);}
    let pp=acc.join(' ').split(/\s+/).slice(0,NORM_WORDS).join(' ');
    if(words(pp)>=Math.floor(NORM_WORDS*0.7))out.push(pp);}
  return out;
}
const MANIFEST:ReadonlyArray<readonly[string,'maitres'|'bestsellers'|'badprose','fr'|'en']>=[
  ['flaubert_bovary_14155.txt','maitres','fr'],['hugo_miserables_17489.txt','maitres','fr'],['proust_swann_2650.txt','maitres','fr'],
  ['dickens_two_cities_98.txt','maitres','en'],['austen_pride_1342.txt','maitres','en'],['melville_moby_2701.txt','maitres','en'],
  ['projet_derniere_chance_french_edition_andy_weir.txt','bestsellers','fr'],['le_crime_du_paradis_french_edition_guillaume_musso.txt','bestsellers','fr'],['mille_petits_riens_french_edition_jodi_picoult.txt','bestsellers','fr'],
  ['andy_weir_the_martian.txt','bestsellers','en'],['colleen_hoover_it_ends_with_us.txt','bestsellers','en'],['dan_brown_origin.txt','bestsellers','en'],
  ['cinquante_nuances_de_grey_french_edition_el_james.txt','badprose','fr'],['le_pacte_de_sang_french_edition_laura_s_wild.txt','badprose','fr'],['grossesse_mafia_french_edition_melanie_rain.txt','badprose','fr'],
  ['el_james_fifty_shades_of_grey.txt','badprose','en'],['gently_yours_gently_series_book_1_sweetblunch.txt','badprose','en'],['claimed_by_the_mountain_kings_alisson_bento.txt','badprose','en'],
];
function loadCorpora(){const rows:{family:string,lang:'fr'|'en',book:string,prose:string}[]=[];
  for(const [f,family,lang] of MANIFEST){const fp=path.join(CORP,f);if(!existsSync(fp)){log(`  [MISS] ${f}`);continue;}
    for(const pr of passages(readFileSync(fp,'utf8'),PASS_PER_BOOK))rows.push({family,lang,book:f.replace(/\.txt$/,''),prose:pr});}
  return rows;}
function basePacket(lang:'fr'|'en'):ForgePacket{const pack=JSON.parse(readFileSync(path.join(REPO,'golden/intents/intent_pack_gardien.json'),'utf8'));const {plan}=createGenesisPlan(pack.intent,pack.canon,pack.constraints,pack.genome,pack.emotion,createDefaultConfig(),TS);const scene0=plan.arcs[0]!.scenes[0]! as Scene;const style:StyleProfile={version:'1.0.0',universe:'literary_fiction',lexicon:{signature_words:[],forbidden_words:[],abstraction_max_ratio:0.3,concrete_min_ratio:0.5},rhythm:{avg_sentence_length_target:20,gini_target:0.45,max_consecutive_similar:2,min_syncopes_per_scene:2,min_compressions_per_scene:1},tone:{dominant_register:'soutenu',intensity_range:[0.2,0.9] as readonly[number,number]},imagery:{recurrent_motifs:[],density_target_per_100_words:3,banned_metaphors:[]},voice:DEFAULT_VOICE_GENOME};return assembleForgePacket({plan,scene:scene0,style_profile:style,kill_lists:{banned_words:[],banned_cliches:[],banned_ai_patterns:[],banned_filter_words:[]} as KillLists,canon:[] as CanonEntry[],continuity:{previous_scene_summary:'',character_states:[],open_threads:[]} as ForgeContinuity,run_id:'r22',language:lang});}
const mean=(xs:number[])=>xs.length?+(xs.reduce((a,b)=>a+b,0)/xs.length).toFixed(2):0;
function appendN(prose:string,unit:string,targetWords:number){const u=words(unit);const copies=Math.max(1,Math.round(targetWords/u));return {text:prose+unit.repeat(copies),w:copies*u};}

async function main(){
  log(`=== WS-D R2.2 NEUTRAL-FILLER CONTROL (${MODEL}) | NORM_WORDS=${NORM_WORDS} STUFF_RATIO=${STUFF_RATIO} ===`);
  const provider=createOllamaProvider({baseUrl:OLLAMA,model:MODEL,draftTemperature:0,judgeTemperature:0,draftMaxTokens:2000,judgeMaxTokens:2000});
  const pkt={fr:basePacket('fr'),en:basePacket('en')};
  const hasLLM=(ax:any)=>/LLM:\s*\d+/.test(String(ax.details||''));
  const probe=await scoreSensoryDensity(pkt.fr,'Le vent froid glaçait la peau ; au loin une lueur tremblait dans la pénombre, et une odeur âcre montait du sol humide sous ses doigts.',provider);
  log(`[PREFLIGHT] LLM tag = ${hasLLM(probe)} | "${String(probe.details||'').slice(0,90)}"`);
  if(!hasLLM(probe)){log('FATAL: SEMANTIC_NOT_RUNNING — fallback keyword silencieux. RUN INVALIDE. Terminal Architecte + Ollama qwen3:32b.');process.exit(2);}
  const rows=loadCorpora();
  log(`corpus : ${rows.length} passages (${['maitres','bestsellers','badprose'].map(c=>c+'='+rows.filter(r=>r.family===c).length).join(' ')})`);
  let nLLM=0;const out:any[]=[];
  for(const r of rows){
    const targetW=Math.max(words(SALAD[r.lang]),Math.round(words(r.prose)*STUFF_RATIO));
    const base=await scoreSensoryDensity(pkt[r.lang],r.prose,provider);if(hasLLM(base))nLLM++;
    const sal=appendN(r.prose,SALAD[r.lang],targetW);const neu=appendN(r.prose,NEUTRAL[r.lang],targetW);
    const sSal=await scoreSensoryDensity(pkt[r.lang],sal.text,provider);
    const sNeu=await scoreSensoryDensity(pkt[r.lang],neu.text,provider);
    const dSal=(sSal.score-base.score)*100/sal.w, dNeu=(sNeu.score-base.score)*100/neu.w, net=dSal-dNeu;
    out.push({family:r.family,lang:r.lang,book:r.book,sha16:sha(r.prose),words:words(r.prose),
      sem_base:+base.score.toFixed(1),sem_salad:+sSal.score.toFixed(1),sem_neutral:+sNeu.score.toFixed(1),
      d_salad_per100:+dSal.toFixed(2),d_neutral_per100:+dNeu.toFixed(2),net_gameability_per100:+net.toFixed(2)});
    log(`  [${r.family}/${r.lang}] ${r.book.slice(0,26)} base ${base.score.toFixed(0)} | /100 Δsalade ${dSal.toFixed(1)} Δneutre ${dNeu.toFixed(1)} NET ${net.toFixed(1)}`);
  }
  if(nLLM<out.length){log(`\nFATAL: seulement ${nLLM}/${out.length} scores avec tag LLM => run partiellement fallback, INVALIDE.`);process.exit(3);}
  const summary:any={tool:'wsd-r2-2-neutral-filler-control.ts',model:MODEL,n:out.length,by_family:{}};
  for(const c of ['maitres','bestsellers','badprose']){const rs=out.filter(o=>o.family===c);if(!rs.length)continue;
    const dSal=mean(rs.map(o=>o.d_salad_per100)),dNeu=mean(rs.map(o=>o.d_neutral_per100)),net=mean(rs.map(o=>o.net_gameability_per100));
    summary.by_family[c]={n:rs.length,d_salad_per100:dSal,d_neutral_per100:dNeu,net_gameability_per100:net,
      net_below_5:Math.abs(net)<5};}
  const fams=Object.values<any>(summary.by_family);
  summary.interpretation={
    net_all_below_5:fams.every(f=>f.net_below_5),
    note:'NET = Δsalade − Δneutre. NET~0 (neutre≈salade) => artefact longueur/recence (seuil R2.1 mal pose). NET grand (salade≫neutre) => gameabilite sensorielle reelle. Δneutre~0 & Δsalade grand => capteur DENSITE correct mais != immersion-qualite (re-cadrer role).',
    verdict_b_prime:fams.every(f=>f.net_below_5)?'GAMEABILITE_NETTE_FAIBLE_seuil_R2.1_mal_pose':'GAMEABILITE_NETTE_REELLE_capteur_sensible_au_sensoriel'};
  mkdirSync(OUT,{recursive:true});
  writeFileSync(path.join(OUT,'WS_D_R2_2_NEUTRAL_FILLER.json'),JSON.stringify({summary,rows:out},null,2),'utf8');
  const cols=['family','lang','book','sha16','words','sem_base','sem_salad','sem_neutral','d_salad_per100','d_neutral_per100','net_gameability_per100'];
  writeFileSync(path.join(OUT,'WS_D_R2_2_NEUTRAL_FILLER.csv'),[cols.join(','),...out.map(r=>cols.map(c=>r[c]).join(','))].join('\n')+'\n','utf8');
  log('\n=== SUMMARY ===');log(JSON.stringify(summary,null,2));
  log('\nDROITS : aucun extrait de prose ecrit (scores+sha16+mots only). Decision role = Architecte/Tribunal apres lecture NET.');
}
main().catch(e=>{log('FATAL: '+(e?.stack??e));process.exit(1);});
