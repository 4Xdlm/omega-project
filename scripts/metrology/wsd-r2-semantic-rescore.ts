/**
 * OMEGA METROLOGY — WS-D R2.1 SEMANTIC vs KEYWORD RE-SCORE (Ollama, terminal Architecte)
 * ============================================================================
 * Preuve R2.1 (sous EMP-16, triple-preuve) : le capteur SÉMANTIQUE existant
 * `scoreSensoryDensity` (HYBRID CALC+LLM, bilingue) couvre l'immersion SANS biais langue
 * et SANS être gameable par keyword-stuffing — contrairement aux capteurs keyword
 * (sensory_richness FR-only, corporeal_anchoring).
 *
 * Mesure sur 3 CORPUS INDÉPENDANTS :
 *   maitres   = omega-autopsie/gutenberg_cache (FR+EN, extraits)
 *   alternance= sessions/ALTERNANCE_STUDY_.../prose_*.txt (OMEGA output mars)
 *   goldens   = golden/ ** /20-scribe/scribe-output.json .final_prose (OMEGA sealed)
 * Pour chaque passage : keyword sensory/corporeal (CALC) vs focalisation sémantique (LLM),
 *   + version STUFFÉE (phrase de mots-clés creux) pour les deux -> qui bondit ?
 *
 * CONVERGENCE attendue (EMP-16, 3/3) :
 *   (a) sémantique FR ~ EN (pas de biais langue ; |Δ|<10) sur les 3 corpus,
 *   (b) sémantique NON-gameable (Δ_stuffing sémantique << Δ_stuffing keyword) sur les 3,
 *   (c) keyword reproduit le biais (EN<FR) + gameable sur les 3.
 *   3/3 -> R2.1 prouvé. 1 diverge -> STOP.
 *
 * NÉCESSITE OLLAMA -> terminal Architecte. Run (cwd=packages/sovereign-engine) :
 *   $env:ECC_K='1'; npx tsx ../../scripts/metrology/wsd-r2-semantic-rescore.ts
 */
process.env.OMEGA_CHUNKED_V4='1'; process.env.OMEGA_PROMPT_V4='1';
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
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
const CACHE=path.join(REPO,'omega-autopsie','gutenberg_cache');
const OUT=path.join(REPO,'docs','audit','calibration');
const TS='2026-01-01T00:00:00.000Z';
const MODEL=process.env.ECC_MODEL??'qwen3:32b';
const OLLAMA=process.env.ECC_OLLAMA_URL??'http://localhost:11434';
function log(s:string){process.stderr.write(s+'\n');}
function words(s:string){return s.split(/\s+/).filter(w=>w.length>0).length;}
const SENSORY:Record<string,string[]>={sight:['voir','regard','yeux','lumière','ombre','couleur','forme','éclat','reflet','lueur','obscurité','clarté','horizon','silhouette','teinte','pénombre'],sound:['entendre','bruit','voix','silence','écho','murmure','grondement','sifflement','crissement','résonance','fracas','bruissement','tintement'],touch:['toucher','peau','contact','texture','caresser','frôler','rugosité','douceur','pression','grain','palper','saisir','serrer'],smell:['odeur','parfum','sentir','puanteur','arôme','fragrance','effluve','relent','encens','musc','moisi','âcre','épicé'],temperature:['chaud','froid','tiède','glacé','brûlant','frais','chaleur','geler','fièvre','moiteur','fraîcheur','givre','vapeur','torride']};
function kwSensory(p:string){const lp=p.toLowerCase();let n=0;for(const c of Object.keys(SENSORY))if(SENSORY[c].some(m=>lp.includes(m)))n++;return n/5*100;}
function kwCorporeal(p:string){const lp=p.toLowerCase();let c=0;for(const m of (SOVEREIGN_CONFIG as any).CORPOREAL_MARKERS)if(lp.includes(m))c++;return Math.min(c/(SOVEREIGN_CONFIG as any).CORPOREAL_TARGET,1)*100;}
const STUFF=" La lumière, l'ombre, la couleur, le bruit, la voix, l'odeur, le parfum, le chaud, le froid : peau, main, doigts, souffle, regard, chaleur glacée, texture brûlante.";
function cleanG(raw:string){let t=raw;const s=t.search(/\*\*\*\s*START OF (THE|THIS)? ?PROJECT GUTENBERG/i);if(s>=0)t=t.slice(t.indexOf('\n',s)+1);const e=t.search(/\*\*\*\s*END OF (THE|THIS)? ?PROJECT GUTENBERG/i);if(e>=0)t=t.slice(0,e);return t;}
function gutPassages(raw:string,n:number){const paras=cleanG(raw).split(/\n\s*\n/).map(p=>p.replace(/\s+/g,' ').trim()).filter(p=>words(p)>=8);const lo=Math.floor(paras.length*0.1),hi=Math.floor(paras.length*0.92);const body=paras.slice(lo,hi);const out:string[]=[];const stride=Math.max(1,Math.floor(body.length/(n+1)));for(let k=1;k<=n;k++){const st=Math.min(body.length-1,k*stride);let acc:string[]=[],w=0;for(let i=st;i<body.length&&w<1400;i++){acc.push(body[i]!);w+=words(body[i]!);}const pp=acc.join('\n\n');if(words(pp)>=500&&words(pp)<=2600)out.push(pp);}return out;}

const MASTERS:ReadonlyArray<readonly[string,'fr'|'en']>=[['flaubert_bovary_14155.txt','fr'],['hugo_miserables_17489.txt','fr'],['proust_swann_2650.txt','fr'],['zola_bete_10007.txt','fr'],['maupassant_bel_ami_3088.txt','fr'],['dickens_two_cities_98.txt','en'],['austen_pride_1342.txt','en'],['melville_moby_2701.txt','en'],['bronte_e_wuthering_768.txt','en']];

function loadCorpora():{corpus:string,lang:'fr'|'en',prose:string}[]{
  const rows:{corpus:string,lang:'fr'|'en',prose:string}[]=[];
  for(const [f,lang] of MASTERS){const fp=path.join(CACHE,f);if(!existsSync(fp))continue;for(const pr of gutPassages(readFileSync(fp,'utf8'),2))rows.push({corpus:'maitres',lang,prose:pr});}
  const sdir=path.join(REPO,'packages/sovereign-engine/sessions');const alt=existsSync(sdir)?readdirSync(sdir).find(d=>d.startsWith('ALTERNANCE_STUDY')):null;
  if(alt){const base=path.join(sdir,alt);for(const f of readdirSync(base).filter(x=>x.startsWith('prose_')&&x.endsWith('.txt'))){const pr=readFileSync(path.join(base,f),'utf8');if(words(pr)>=300)rows.push({corpus:'alternance',lang:'fr',prose:pr});}}
  // goldens = prose OMEGA output. e2e/h2 ont une prose placeholder (objet) -> inutilisable.
  // Pointer R2_GOLDENS_DIR vers un dossier de .txt prose réelle (ex. sessions/PROD_REVELATION*/...
  // ou tout dossier de prose golden). Sinon tente scribe-output.final_prose (string only).
  const gdir=process.env.R2_GOLDENS_DIR;
  if(gdir&&existsSync(gdir)){(function w(d:string){for(const e of readdirSync(d)){const p=path.join(d,e);const st=statSync(p);if(st.isDirectory())w(p);else if(e.endsWith('.txt')){const pr=readFileSync(p,'utf8');if(words(pr)>=300)rows.push({corpus:'goldens',lang:'fr',prose:pr});}}})(gdir);}
  else{const groot=path.join(REPO,'golden');const found:string[]=[];if(existsSync(groot))(function w(d:string){for(const e of readdirSync(d)){const p=path.join(d,e);const st=statSync(p);if(st.isDirectory())w(p);else if(e==='scribe-output.json')found.push(p);}})(groot);
  for(const fp of found){try{const j=JSON.parse(readFileSync(fp,'utf8'));const pr=j.final_prose;if(typeof pr==='string'&&words(pr)>=300)rows.push({corpus:'goldens',lang:'fr',prose:pr});}catch{}}}
  return rows;
}
function basePacket(lang:'fr'|'en'):ForgePacket{const pack=JSON.parse(readFileSync(path.join(REPO,'golden/intents/intent_pack_gardien.json'),'utf8'));const {plan}=createGenesisPlan(pack.intent,pack.canon,pack.constraints,pack.genome,pack.emotion,createDefaultConfig(),TS);const scene0=plan.arcs[0]!.scenes[0]! as Scene;const style:StyleProfile={version:'1.0.0',universe:'literary_fiction',lexicon:{signature_words:[],forbidden_words:[],abstraction_max_ratio:0.3,concrete_min_ratio:0.5},rhythm:{avg_sentence_length_target:20,gini_target:0.45,max_consecutive_similar:2,min_syncopes_per_scene:2,min_compressions_per_scene:1},tone:{dominant_register:'soutenu',intensity_range:[0.2,0.9] as readonly[number,number]},imagery:{recurrent_motifs:[],density_target_per_100_words:3,banned_metaphors:[]},voice:DEFAULT_VOICE_GENOME};return assembleForgePacket({plan,scene:scene0,style_profile:style,kill_lists:{banned_words:[],banned_cliches:[],banned_ai_patterns:[],banned_filter_words:[]} as KillLists,canon:[] as CanonEntry[],continuity:{previous_scene_summary:'',character_states:[],open_threads:[]} as ForgeContinuity,run_id:'r2',language:lang});}
function llmOf(ax:any){const m=String(ax.details||'').match(/LLM:\s*(\d+)/);return m?+m[1]:ax.score;}
const mean=(xs:number[])=>xs.length?+(xs.reduce((a,b)=>a+b,0)/xs.length).toFixed(1):0;

async function main(){
  log(`=== WS-D R2.1 SEMANTIC vs KEYWORD (${MODEL}) ===`);
  const provider=createOllamaProvider({baseUrl:OLLAMA,model:MODEL,draftTemperature:0,judgeTemperature:0,draftMaxTokens:2000,judgeMaxTokens:2000});
  const pkt={fr:basePacket('fr'),en:basePacket('en')};
  const rows=loadCorpora(); log(`corpus chargés : ${rows.length} passages (${['maitres','alternance','goldens'].map(c=>c+'='+rows.filter(r=>r.corpus===c).length).join(' ')})`);
  const out:any[]=[];
  for(const r of rows){
    const kS=kwSensory(r.prose),kC=kwCorporeal(r.prose);
    const sem=await scoreSensoryDensity(pkt[r.lang],r.prose,provider); const semLLM=llmOf(sem);
    // adversarial : stuffé
    const st=r.prose+STUFF; const kSs=kwSensory(st); const semS=await scoreSensoryDensity(pkt[r.lang],st,provider); const semSLLM=llmOf(semS);
    out.push({corpus:r.corpus,lang:r.lang,words:words(r.prose),kw_sensory:+kS.toFixed(1),kw_corporeal:+kC.toFixed(1),sem_focalisation:+sem.score.toFixed(1),sem_LLM:+semLLM.toFixed(1),kw_sensory_stuffed:+kSs.toFixed(1),sem_stuffed:+semS.score.toFixed(1),d_kw_stuff:+(kSs-kS).toFixed(1),d_sem_stuff:+(semS.score-sem.score).toFixed(1)});
    log(`  [${r.corpus}/${r.lang}] kwSens ${kS.toFixed(0)} kwCorp ${kC.toFixed(0)} | semFoc ${sem.score.toFixed(0)} (LLM ${semLLM.toFixed(0)}) | stuff Δkw +${(kSs-kS).toFixed(0)} Δsem +${(semS.score-sem.score).toFixed(0)}`);
  }
  // agrégats par corpus + FR/EN + convergence
  const summary:any={tool:'wsd-r2-semantic-rescore.ts',model:MODEL,n:out.length,by_corpus:{}};
  for(const c of ['maitres','alternance','goldens']){const rs=out.filter(o=>o.corpus===c);if(!rs.length)continue;
    const fr=rs.filter(o=>o.lang==='fr'),en=rs.filter(o=>o.lang==='en');
    summary.by_corpus[c]={n:rs.length,
      kw_sensory_FR:mean(fr.map(o=>o.kw_sensory)),kw_sensory_EN:mean(en.map(o=>o.kw_sensory)),
      sem_FR:mean(fr.map(o=>o.sem_focalisation)),sem_EN:mean(en.map(o=>o.sem_focalisation)),
      d_kw_stuff:mean(rs.map(o=>o.d_kw_stuff)),d_sem_stuff:mean(rs.map(o=>o.d_sem_stuff))};
  }
  summary.convergence_check={
    note:'(a) sem FR~EN |Δ|<10 ; (b) Δ_sem_stuff << Δ_kw_stuff ; (c) kw EN<FR + Δ_kw_stuff grand. 3/3 corpus => R2.1 prouvé.',
  };
  mkdirSync(OUT,{recursive:true});
  writeFileSync(path.join(OUT,'WS_D_R2_SEMANTIC_RESCORE.json'),JSON.stringify({summary,rows:out},null,2),'utf8');
  const cols=['corpus','lang','words','kw_sensory','kw_corporeal','sem_focalisation','sem_LLM','kw_sensory_stuffed','sem_stuffed','d_kw_stuff','d_sem_stuff'];
  writeFileSync(path.join(OUT,'WS_D_R2_SEMANTIC_RESCORE.csv'),[cols.join(','),...out.map(r=>cols.map(c=>r[c]).join(','))].join('\n')+'\n','utf8');
  log('\n=== SUMMARY ==='); log(JSON.stringify(summary,null,2));
  log('\nInterpréter : si sem FR~EN (pas de biais langue) ET Δ_sem_stuff~0 (non-gameable) sur les 3 corpus, R2.1 converge 3/3 -> GO code (config rôle). Sinon STOP (EMP-16).');
}
main().catch(e=>{log('FATAL: '+(e?.stack??e));process.exit(1);});
