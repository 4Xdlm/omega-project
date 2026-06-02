/**
 * OMEGA METROLOGY — WS-D R5 FR QUALITY PROBE (Ollama, terminal Architecte)
 * ============================================================================
 * Chantier B (capteur qualité FR). Teste 2 paradigmes SANS toucher le moteur (prompts dans le tooling) :
 *   PISTE 1 — JUGE PAR PAIRES, choix forcé : "lequel de A/B est la prose la plus accomplie ?" (calibration-free).
 *             Chaque paire (maître, pulp) jouée 2 fois (ordres inversés) -> contrôle du biais de position.
 *   PISTE 2 — PROMPTS ABSOLUS candidats (profondeur / style / voix), consigne de noter LARGE (anti-saturation).
 * Mesure FR (problème) + EN (contrôle) avec le MÊME protocole.
 *
 * Métrique pairwise : taux de victoire du maître = AUC. >=0.75 symétrique => le LLM SAIT discriminer la qualité.
 * Appels via provider.generateStructuredJSON (JSON {winner} ou {score}). ZÉRO code moteur.
 * DROITS : sous droits = mesure interne, scores+sha+mots only, aucune prose committée.
 * CRASH-SAFE JSONL. NÉCESSITE OLLAMA -> terminal Architecte.
 * Run (cwd=packages/sovereign-engine) :
 *   $env:ECC_K='1'; npx tsx ..\..\scripts\metrology\wsd-r5-fr-quality-probe.ts
 * Options : $env:R5_SIZE='1500'  $env:R5_LANGS='fr,en'  $env:R5_MAX_PAIRS='0'(all)  $env:R5_ABS='1'  $env:R5_DRYRUN='1'
 */
process.env.OMEGA_CHUNKED_V4='1'; process.env.OMEGA_PROMPT_V4='1';
import { readFileSync, existsSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as path from 'node:path';
import { createOllamaProvider } from '../../packages/sovereign-engine/src/runtime/ollama-provider.js';

const REPO=path.resolve(process.cwd(),process.cwd().endsWith('sovereign-engine')?'../..':'.');
const CORP=path.join(REPO,'omega-autopsie','corpus_r','txt');
const OUT=path.join(REPO,'docs','audit','calibration');
const CKPT=path.join(OUT,'WS_D_R5_FR_QUALITY.jsonl');
const MODEL=process.env.ECC_MODEL??'qwen3:32b';
const OLLAMA=process.env.ECC_OLLAMA_URL??'http://localhost:11434';
const SIZE=Number(process.env.R5_SIZE??'1500');
const LANGS=(process.env.R5_LANGS??'fr,en').split(',').map(s=>s.trim()) as ('fr'|'en')[];
const MAX_PAIRS=Number(process.env.R5_MAX_PAIRS??'0');
const ABS=process.env.R5_ABS!=='0';
function log(s:string){process.stderr.write(s+'\n');}
function words(s:string){return s.split(/\s+/).filter(w=>w.length>0).length;}
function sha(s:string){return createHash('sha256').update(s,'utf8').digest('hex').slice(0,12);}
function rng(seed:number){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

function cleanG(raw:string){let t=raw;const s=t.search(/\*\*\*\s*START OF (THE|THIS)? ?PROJECT GUTENBERG/i);if(s>=0)t=t.slice(t.indexOf('\n',s)+1);const e=t.search(/\*\*\*\s*END OF (THE|THIS)? ?PROJECT GUTENBERG/i);if(e>=0)t=t.slice(0,e);return t;}
function bodyWords(raw:string){const paras=cleanG(raw).split(/\n\s*\n/).map(p=>p.replace(/\s+/g,' ').trim()).filter(p=>words(p)>=8);const lo=Math.floor(paras.length*0.1),hi=Math.floor(paras.length*0.92);return paras.slice(lo,hi).join(' ').split(/\s+/).filter(w=>w.length>0);}
function passage(raw:string,size:number){const w=bodyWords(raw);if(w.length<Math.floor(size*0.7))return null;const st=Math.floor((w.length-Math.min(size,w.length))/2);return w.slice(st,st+size).join(' ');}

const BOOKS:ReadonlyArray<readonly[string,'maitres'|'pulp','fr'|'en']>=[
  ['flaubert_bovary_14155.txt','maitres','fr'],['hugo_miserables_17489.txt','maitres','fr'],['proust_swann_2650.txt','maitres','fr'],['zola_bete_10007.txt','maitres','fr'],['maupassant_bel_ami_3088.txt','maitres','fr'],['stendhal_chartreuse_7524.txt','maitres','fr'],['flaubert_education_14285.txt','maitres','fr'],['maupassant_une_vie_6902.txt','maitres','fr'],['zola_bonheur_11953.txt','maitres','fr'],
  ['dickens_two_cities_98.txt','maitres','en'],['austen_pride_1342.txt','maitres','en'],['melville_moby_2701.txt','maitres','en'],['bronte_e_wuthering_768.txt','maitres','en'],['george_eliot_middlemarch.txt','maitres','en'],['henry_james_the_portrait_of_a_lady.txt','maitres','en'],['thomas_hardy_tess_of_the_durbervilles.txt','maitres','en'],['joseph_conrad_heart_of_darkness.txt','maitres','en'],['mark_twain_adventures_of_huckleberry_finn.txt','maitres','en'],
  ['cinquante_nuances_de_grey_french_edition_el_james.txt','pulp','fr'],['le_pacte_de_sang_french_edition_laura_s_wild.txt','pulp','fr'],['grossesse_mafia_french_edition_melanie_rain.txt','pulp','fr'],['bikers_law_tome_2_french_edition_arizona_brooks.txt','pulp','fr'],['seduite_par_le_guerrier_alien_french_edition_ava_ross.txt','pulp','fr'],['convoitee_par_le_guerrier_alien_french_edition_ava_ross.txt','pulp','fr'],['mon_pire_date_french_edition_noemie_conte.txt','pulp','fr'],['contrat_avec_un_milliardaire_vol_12_french_edition_phoebe_p_campell.txt','pulp','fr'],['double_bluff_french_edition_ruby_vincent.txt','pulp','fr'],
  ['el_james_fifty_shades_of_grey.txt','pulp','en'],['gently_yours_gently_series_book_1_sweetblunch.txt','pulp','en'],['claimed_by_the_mountain_kings_alisson_bento.txt','pulp','en'],['milked_by_the_italian_mafia_hucow_for_mafioso_book_1_leandra_camilli.txt','pulp','en'],['the_reno_man_and_my_hotwife_epub_the_reno_man.txt','pulp','en'],['my_primitive_alien_exile_lindsey_fox.txt','pulp','en'],['secret_twins_for_my_brothers_best_friends_hannah_ryder.txt','pulp','en'],['cheating_with_my_boyfriends_bully_2_manus_dare.txt','pulp','en'],['a_ghetto_tale_from_ebony_ladies_night_chronicles_antoinette_sherell.txt','pulp','en'],
];
function load(lang:'fr'|'en',cls:'maitres'|'pulp'){const out:{book:string,prose:string,sha:string}[]=[];for(const [f,c,lg] of BOOKS){if(c!==cls||lg!==lang)continue;const fp=path.join(CORP,f);if(!existsSync(fp))continue;const pr=passage(readFileSync(fp,'utf8'),SIZE);if(pr)out.push({book:f.replace(/\.txt$/,''),prose:pr,sha:sha(pr)});}return out;}

const PAIR_PROMPT=(lang:'fr'|'en',A:string,B:string)=> (lang==='fr'
  ? `Tu es un critique littéraire exigeant. Voici deux extraits de prose française de longueur comparable. UN seul est d'un grand maître de la littérature ; l'autre est de la fiction commerciale de divertissement. Lequel est la prose la plus accomplie littérairement (profondeur, style, voix, justesse — PAS la quantité de péripéties) ?\n\n=== EXTRAIT A ===\n${A}\n\n=== EXTRAIT B ===\n${B}\n\nRéponds UNIQUEMENT en JSON : {"winner":"A"|"B","confidence":0-100}`
  : `You are a demanding literary critic. Here are two prose excerpts of comparable length. ONE is by a great literary master; the other is commercial entertainment fiction. Which is the more accomplished literary prose (depth, style, voice, precision — NOT amount of plot)?\n\n=== EXCERPT A ===\n${A}\n\n=== EXCERPT B ===\n${B}\n\nReply ONLY as JSON: {"winner":"A"|"B","confidence":0-100}`);
const ABS_DIMS:{key:string,fr:string,en:string}[]=[
  {key:'profondeur',fr:'la PROFONDEUR : densité de sens et de pensée au-delà de l\'action',en:'DEPTH: density of meaning and thought beyond plot'},
  {key:'style',fr:'le STYLE : sophistication syntaxique, justesse lexicale, contrôle du registre, absence de facilité/cliché',en:'STYLE: syntactic sophistication, lexical precision, register control, absence of cliché'},
  {key:'voix',fr:'la VOIX : singularité irremplaçable (vs prose générique, interchangeable)',en:'VOICE: irreplaceable singularity (vs generic, interchangeable prose)'},
];
const ABS_PROMPT=(lang:'fr'|'en',dim:{fr:string,en:string},prose:string)=> (lang==='fr'
  ? `Tu es un critique littéraire exigeant. Évalue ${dim.fr}. IMPORTANT : note LARGE, ose les notes basses pour la prose médiocre (un roman de gare doit tomber à 20-40 ; seuls Flaubert/Proust méritent 90+). Texte:\n${prose}\n\nRéponds UNIQUEMENT en JSON : {"score":0-100}`
  : `You are a demanding literary critic. Rate ${dim.en}. IMPORTANT: use the FULL range, dare low scores for mediocre prose (pulp should fall to 20-40; only masters earn 90+). Text:\n${prose}\n\nReply ONLY as JSON: {"score":0-100}`);

const mean=(xs:number[])=>xs.length?+(xs.reduce((a,b)=>a+b,0)/xs.length).toFixed(3):0;
function bootCI(vals:number[],iters:number,seed:number){if(!vals.length)return null;const r=rng(seed);const xs:number[]=[];for(let it=0;it<iters;it++){let s=0;for(let i=0;i<vals.length;i++)s+=vals[Math.floor(r()*vals.length)]!;xs.push(s/vals.length);}xs.sort((a,b)=>a-b);return[+xs[Math.floor(iters*0.025)]!.toFixed(3),+xs[Math.floor(iters*0.975)]!.toFixed(3)];}
function auc(a:number[],b:number[]){if(!a.length||!b.length)return null;let s=0;for(const x of a)for(const y of b)s+=x>y?1:x===y?0.5:0;return +(s/(a.length*b.length)).toFixed(3);}

async function main(){
  log(`=== WS-D R5 FR QUALITY PROBE (${MODEL}) | size=${SIZE} langs=[${LANGS.join(',')}] abs=${ABS} ===`);
  if(process.env.R5_DRYRUN==='1'){for(const lg of LANGS){const M=load(lg,'maitres'),P=load(lg,'pulp');const np=MAX_PAIRS||M.length*P.length;log(`  [dry] ${lg}: maitres=${M.length} pulp=${P.length} -> pairwise ${Math.min(np,M.length*P.length)}x2 ordres${ABS?`, absolu ${(M.length+P.length)*ABS_DIMS.length}`:''}`);}log('[DRYRUN] OK, imports + corpus chargés. Run = terminal Architecte.');return;}
  const provider=createOllamaProvider({baseUrl:OLLAMA,model:MODEL,draftTemperature:0,judgeTemperature:0,draftMaxTokens:600,judgeMaxTokens:600});
  // preflight
  const pf:any=await provider.generateStructuredJSON('Réponds UNIQUEMENT en JSON : {"ok":true}');
  log(`[PREFLIGHT] structuredJSON -> ${JSON.stringify(pf).slice(0,80)}`);
  mkdirSync(OUT,{recursive:true});
  const done=new Set<string>();if(existsSync(CKPT))for(const l of readFileSync(CKPT,'utf8').split('\n'))if(l.trim())try{done.add(JSON.parse(l).key);}catch{}
  log(`[RESUME] ${done.size} déjà au checkpoint`);
  const r=rng(20260602);
  for(const lang of LANGS){
    const M=load(lang,'maitres'),P=load(lang,'pulp');
    if(!M.length||!P.length){log(`  [skip] ${lang} corpus vide`);continue;}
    // PAIRWISE
    let pairs:[number,number][]=[];for(let i=0;i<M.length;i++)for(let j=0;j<P.length;j++)pairs.push([i,j]);
    if(MAX_PAIRS&&pairs.length>MAX_PAIRS){pairs=pairs.sort(()=>r()-0.5).slice(0,MAX_PAIRS);}
    for(const [i,j] of pairs){for(const order of [0,1]){
      const key=`pw_${lang}_${M[i]!.sha}_${P[j]!.sha}_${order}`;if(done.has(key))continue;
      const A=order===0?M[i]!.prose:P[j]!.prose, B=order===0?P[j]!.prose:M[i]!.prose;
      const masterPos=order===0?'A':'B';
      let win=NaN,conf=NaN;
      try{const res:any=await provider.generateStructuredJSON(PAIR_PROMPT(lang,A,B));const w=String(res?.winner||'').toUpperCase().trim();if(w==='A'||w==='B'){win=w===masterPos?1:0;conf=Number(res?.confidence)||NaN;}}catch{}
      const row={key,mode:'pairwise',lang,master:M[i]!.book,pulp:P[j]!.book,order,master_pos:masterPos,master_win:win,confidence:conf};
      appendFileSync(CKPT,JSON.stringify(row)+'\n','utf8');
    }}
    log(`  [pairwise ${lang}] ${pairs.length} paires × 2 ordres faites`);
    // ABSOLU
    if(ABS){const all=[...M.map(x=>({...x,cls:'maitres'})),...P.map(x=>({...x,cls:'pulp'}))];
      for(const it of all)for(const dim of ABS_DIMS){const key=`abs_${lang}_${dim.key}_${it.sha}`;if(done.has(key))continue;
        let score=NaN;try{const res:any=await provider.generateStructuredJSON(ABS_PROMPT(lang,dim,it.prose));score=Number(res?.score);if(isNaN(score))score=NaN;}catch{}
        appendFileSync(CKPT,JSON.stringify({key,mode:'absolute',lang,dim:dim.key,book:it.book,cls:it.cls,score})+'\n','utf8');}
      log(`  [absolu ${lang}] ${all.length} passages × ${ABS_DIMS.length} dimensions faits`);
    }
  }
  // ── STATS
  const all:any[]=[];for(const l of readFileSync(CKPT,'utf8').split('\n'))if(l.trim())try{all.push(JSON.parse(l));}catch{}
  const summary:any={tool:'wsd-r5-fr-quality-probe.ts',model:MODEL,size:SIZE,n:all.length,pairwise:{},absolute:{}};
  for(const lang of LANGS){
    const pw=all.filter(o=>o.mode==='pairwise'&&o.lang===lang&&!isNaN(o.master_win));
    if(pw.length){const wins=pw.map(o=>o.master_win);
      const posA=pw.filter(o=>o.master_pos==='A').map(o=>o.master_win),posB=pw.filter(o=>o.master_pos==='B').map(o=>o.master_win);
      summary.pairwise[lang]={n:pw.length,master_win_rate:mean(wins),ci95:bootCI(wins,2000,42),
        win_when_master_A:mean(posA),win_when_master_B:mean(posB),position_bias:+Math.abs(mean(posA)-mean(posB)).toFixed(3)};}
    if(ABS){summary.absolute[lang]={};for(const dim of ABS_DIMS){const ms=all.filter(o=>o.mode==='absolute'&&o.lang===lang&&o.dim===dim.key&&o.cls==='maitres'&&!isNaN(o.score)).map(o=>o.score);const ps=all.filter(o=>o.mode==='absolute'&&o.lang===lang&&o.dim===dim.key&&o.cls==='pulp'&&!isNaN(o.score)).map(o=>o.score);summary.absolute[lang][dim.key]={auc:auc(ms,ps),median_maitres:ms.length?+mean(ms):0,median_pulp:ps.length?+mean(ps):0,nM:ms.length,nP:ps.length};}}
  }
  summary.verdict={
    note:'pairwise master_win_rate >=0.75 symetrique (position_bias<0.10) => le LLM DISCRIMINE la qualite (scoring absolu etait le pb). Comparer FR vs EN. absolu auc>=0.70 = dimension utile. Si pairwise FR ~0.5 => qwen3:32b ne percoit pas la qualite litteraire FR (acter).',
    fr_pairwise:summary.pairwise.fr?.master_win_rate??null,en_pairwise:summary.pairwise.en?.master_win_rate??null};
  writeFileSync(path.join(OUT,'WS_D_R5_FR_QUALITY.json'),JSON.stringify({summary},null,2),'utf8');
  log('\n=== SUMMARY ===');log(JSON.stringify(summary,null,2));
  log('\nLire pairwise.master_win_rate (FR vs EN) + position_bias + absolute.auc. Scores-only, droits respectes. Decision = Architecte/Tribunal.');
}
main().catch(e=>{log('FATAL: '+(e?.stack??e));process.exit(1);});
