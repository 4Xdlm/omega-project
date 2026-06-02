/**
 * OMEGA METROLOGY — WS-D R5-LARGE FR QUALITY CONFIRMATION (Ollama, terminal Architecte)
 * ============================================================================
 * Confirme R5 (percée FR) à grande échelle, avec BOOTSTRAP CLUSTERISÉ PAR LIVRE (caveat ChatGPT : les extraits/paires
 * d'un même livre ne sont pas indépendants -> rééchantillonner les LIVRES, pas les paires).
 *   PISTE 1 — Juge PAR PAIRES choix forcé (maître vs pulp, 2 ordres anti-biais), FR + EN.
 *   PISTE 2 — Prompts absolus candidats (profondeur / style / voix), consigne anti-saturation.
 * Corpus : 15 livres/cellule (maîtres/pulp × FR/EN). Tailles pairwise 1500/3000 ; absolu 600/1500/3000.
 *
 * STATS HONNÊTES :
 *   pairwise : master_win_rate + IC95 BOOTSTRAP PAR LIVRE (rééchantillonne maîtres ET pulps) + biais position.
 *   absolu   : AUC maîtres vs pulp + IC95 bootstrap par livre, par dimension × taille.
 * Critère scellement : FR pairwise >=0.75 IC_bas-par-livre >0.65 sur >=2 tailles ; >=2 dims absolues AUC>=0.75 IC_bas>0.65 sur >=2 tailles.
 *
 * ZÉRO code moteur (prompts dans le tooling via generateStructuredJSON). DROITS : scores+sha+mots only.
 * CRASH-SAFE JSONL. NÉCESSITE OLLAMA -> terminal Architecte. ~2300 appels (plusieurs heures) ; reprise = relancer.
 * Run (cwd=packages/sovereign-engine) :
 *   $env:ECC_K='1'; npx tsx ..\..\scripts\metrology\wsd-r5-large-fr-quality.ts
 * Options : $env:R5L_BPC='15'  $env:R5L_PAIR_SIZES='1500,3000'  $env:R5L_ABS_SIZES='600,1500,3000'  $env:R5L_MAX_PAIRS='0'  $env:R5L_DRYRUN='1'
 */
process.env.OMEGA_CHUNKED_V4='1'; process.env.OMEGA_PROMPT_V4='1';
import { readFileSync, existsSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as path from 'node:path';
import { createOllamaProvider } from '../../packages/sovereign-engine/src/runtime/ollama-provider.js';

const REPO=path.resolve(process.cwd(),process.cwd().endsWith('sovereign-engine')?'../..':'.');
const CORP=path.join(REPO,'omega-autopsie','corpus_r','txt');
const OUT=path.join(REPO,'docs','audit','calibration');
const CKPT=path.join(OUT,'WS_D_R5_LARGE.jsonl');
const MODEL=process.env.ECC_MODEL??'qwen3:32b';
const OLLAMA=process.env.ECC_OLLAMA_URL??'http://localhost:11434';
const BPC=Number(process.env.R5L_BPC??'15');
const PAIR_SIZES=(process.env.R5L_PAIR_SIZES??'1500,3000').split(',').map(s=>+s.trim()).filter(n=>n>0);
const ABS_SIZES=(process.env.R5L_ABS_SIZES??'600,1500,3000').split(',').map(s=>+s.trim()).filter(n=>n>0);
const MAX_PAIRS=Number(process.env.R5L_MAX_PAIRS??'0');
const BOOT=Number(process.env.R5L_BOOT??'2000');
function log(s:string){process.stderr.write(s+'\n');}
function words(s:string){return s.split(/\s+/).filter(w=>w.length>0).length;}
function sha(s:string){return createHash('sha256').update(s,'utf8').digest('hex').slice(0,12);}
function rng(seed:number){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

function cleanG(raw:string){let t=raw;const s=t.search(/\*\*\*\s*START OF (THE|THIS)? ?PROJECT GUTENBERG/i);if(s>=0)t=t.slice(t.indexOf('\n',s)+1);const e=t.search(/\*\*\*\s*END OF (THE|THIS)? ?PROJECT GUTENBERG/i);if(e>=0)t=t.slice(0,e);return t;}
function bodyWords(raw:string){const paras=cleanG(raw).split(/\n\s*\n/).map(p=>p.replace(/\s+/g,' ').trim()).filter(p=>words(p)>=8);const lo=Math.floor(paras.length*0.1),hi=Math.floor(paras.length*0.92);return paras.slice(lo,hi).join(' ').split(/\s+/).filter(w=>w.length>0);}
function passageAt(raw:string,size:number){const w=bodyWords(raw);if(w.length<Math.floor(size*0.7))return null;const st=Math.floor((w.length-Math.min(size,w.length))/2);return w.slice(st,st+size).join(' ');}

const BOOKS:ReadonlyArray<readonly[string,'maitres'|'pulp','fr'|'en']>=[
  // MAÎTRES FR (15)
  ['flaubert_bovary_14155.txt','maitres','fr'],['hugo_miserables_17489.txt','maitres','fr'],['proust_swann_2650.txt','maitres','fr'],['zola_bete_10007.txt','maitres','fr'],['maupassant_bel_ami_3088.txt','maitres','fr'],['stendhal_chartreuse_7524.txt','maitres','fr'],['flaubert_education_14285.txt','maitres','fr'],['maupassant_une_vie_6902.txt','maitres','fr'],['zola_bonheur_11953.txt','maitres','fr'],['balzac_lys_1237.txt','maitres','fr'],['balzac_eugenie_1715.txt','maitres','fr'],['sand_mare_14254.txt','maitres','fr'],['chateaubriand_rene_18074.txt','maitres','fr'],['laclos_liaisons_6329.txt','maitres','fr'],['merimee_carmen_14115.txt','maitres','fr'],
  // MAÎTRES EN (15)
  ['dickens_two_cities_98.txt','maitres','en'],['austen_pride_1342.txt','maitres','en'],['melville_moby_2701.txt','maitres','en'],['bronte_e_wuthering_768.txt','maitres','en'],['george_eliot_middlemarch.txt','maitres','en'],['henry_james_the_portrait_of_a_lady.txt','maitres','en'],['thomas_hardy_tess_of_the_durbervilles.txt','maitres','en'],['joseph_conrad_heart_of_darkness.txt','maitres','en'],['mark_twain_adventures_of_huckleberry_finn.txt','maitres','en'],['edith_wharton_the_house_of_mirth.txt','maitres','en'],['nathaniel_hawthorne_the_scarlet_letter.txt','maitres','en'],['dh_lawrence_sons_and_lovers.txt','maitres','en'],['jack_london_martin_eden.txt','maitres','en'],['willa_cather_my_antonia.txt','maitres','en'],['ralph_ellison_invisible_man.txt','maitres','en'],
  // PULP FR (15)
  ['cinquante_nuances_de_grey_french_edition_el_james.txt','pulp','fr'],['le_pacte_de_sang_french_edition_laura_s_wild.txt','pulp','fr'],['grossesse_mafia_french_edition_melanie_rain.txt','pulp','fr'],['bikers_law_tome_2_french_edition_arizona_brooks.txt','pulp','fr'],['seduite_par_le_guerrier_alien_french_edition_ava_ross.txt','pulp','fr'],['convoitee_par_le_guerrier_alien_french_edition_ava_ross.txt','pulp','fr'],['mon_pire_date_french_edition_noemie_conte.txt','pulp','fr'],['contrat_avec_un_milliardaire_vol_12_french_edition_phoebe_p_campell.txt','pulp','fr'],['double_bluff_french_edition_ruby_vincent.txt','pulp','fr'],['de_sable_et_decailles_french_edition_alix_keybell.txt','pulp','fr'],['dencre_et_de_sang_french_edition_anna_briac.txt','pulp','fr'],['jusqua_ce_que_tu_mappartienne_french_edition_claire_contreras.txt','pulp','fr'],['our_vicious_lies_french_edition_lyla_mars.txt','pulp','fr'],['ugly_rooney_french_edition_sandra_kiss.txt','pulp','fr'],['le_clan_de_montreal_french_edition_sunny_taj.txt','pulp','fr'],
  // PULP EN (15)
  ['el_james_fifty_shades_of_grey.txt','pulp','en'],['gently_yours_gently_series_book_1_sweetblunch.txt','pulp','en'],['claimed_by_the_mountain_kings_alisson_bento.txt','pulp','en'],['milked_by_the_italian_mafia_hucow_for_mafioso_book_1_leandra_camilli.txt','pulp','en'],['the_reno_man_and_my_hotwife_epub_the_reno_man.txt','pulp','en'],['my_primitive_alien_exile_lindsey_fox.txt','pulp','en'],['secret_twins_for_my_brothers_best_friends_hannah_ryder.txt','pulp','en'],['cheating_with_my_boyfriends_bully_2_manus_dare.txt','pulp','en'],['a_ghetto_tale_from_ebony_ladies_night_chronicles_antoinette_sherell.txt','pulp','en'],['shifted_a_fated_mates_paranormal_romanc_kelly_king.txt','pulp','en'],['honey_and_harm_devan_barlow.txt','pulp','en'],['the_never_list_mk_lewis.txt','pulp','en'],['the_gangalee_girl_priya_white.txt','pulp','en'],['living_next_to_the_grump_living_next_to_the_grump.txt','pulp','en'],['recall_andy_holmes.txt','pulp','en'],
];
function load(lang:'fr'|'en',cls:'maitres'|'pulp',size:number){const out:{book:string,prose:string}[]=[];let k=0;for(const [f,c,lg] of BOOKS){if(c!==cls||lg!==lang)continue;if(k>=BPC)break;k++;const fp=path.join(CORP,f);if(!existsSync(fp))continue;const pr=passageAt(readFileSync(fp,'utf8'),size);if(pr)out.push({book:f.replace(/\.txt$/,''),prose:pr});}return out;}

const PAIR_PROMPT=(lang:'fr'|'en',A:string,B:string)=> (lang==='fr'
  ? `Tu es un critique littéraire exigeant. Voici deux extraits de prose française de longueur comparable. UN seul est d'un grand maître ; l'autre est de la fiction commerciale de divertissement. Lequel est la prose la plus accomplie littérairement (profondeur, style, voix, justesse — PAS la quantité de péripéties) ?\n\n=== EXTRAIT A ===\n${A}\n\n=== EXTRAIT B ===\n${B}\n\nRéponds UNIQUEMENT en JSON : {"winner":"A"|"B"}`
  : `You are a demanding literary critic. Two prose excerpts of comparable length. ONE is by a great literary master; the other is commercial entertainment. Which is the more accomplished literary prose (depth, style, voice, precision — NOT amount of plot)?\n\n=== EXCERPT A ===\n${A}\n\n=== EXCERPT B ===\n${B}\n\nReply ONLY as JSON: {"winner":"A"|"B"}`);
const ABS_DIMS:{key:string,fr:string,en:string}[]=[
  {key:'profondeur',fr:'la PROFONDEUR : densité de sens et de pensée au-delà de l\'action',en:'DEPTH: density of meaning and thought beyond plot'},
  {key:'style',fr:'le STYLE : sophistication syntaxique, justesse lexicale, contrôle du registre, absence de facilité/cliché',en:'STYLE: syntactic sophistication, lexical precision, register control, absence of cliché'},
  {key:'voix',fr:'la VOIX : singularité irremplaçable (vs prose générique)',en:'VOICE: irreplaceable singularity (vs generic prose)'},
];
const ABS_PROMPT=(lang:'fr'|'en',dim:{fr:string,en:string},prose:string)=> (lang==='fr'
  ? `Tu es un critique littéraire exigeant. Évalue ${dim.fr}. IMPORTANT : note LARGE, ose les notes basses pour la prose médiocre (un roman de gare doit tomber à 20-40 ; seuls Flaubert/Proust méritent 90+). Texte:\n${prose}\n\nRéponds UNIQUEMENT en JSON : {"score":0-100}`
  : `You are a demanding literary critic. Rate ${dim.en}. IMPORTANT: use the FULL range, dare low scores for mediocre prose (pulp 20-40; only masters earn 90+). Text:\n${prose}\n\nReply ONLY as JSON: {"score":0-100}`);

const mean=(xs:number[])=>xs.length?+(xs.reduce((a,b)=>a+b,0)/xs.length).toFixed(3):0;
function aucRaw(a:number[],b:number[]){let s=0;for(const x of a)for(const y of b)s+=x>y?1:x===y?0.5:0;return s/(a.length*b.length);}
// bootstrap CLUSTER par livre : rééchantillonne maitres-books et pulp-books (clés), recompose la stat
function clusterCI_pairwise(W:Record<string,Record<string,number>>,mKeys:string[],pKeys:string[],iters:number,seed:number){
  if(!mKeys.length||!pKeys.length)return null;const r=rng(seed);const xs:number[]=[];
  for(let it=0;it<iters;it++){const mm=Array.from({length:mKeys.length},()=>mKeys[Math.floor(r()*mKeys.length)]!);const pp=Array.from({length:pKeys.length},()=>pKeys[Math.floor(r()*pKeys.length)]!);
    let s=0,n=0;for(const m of mm)for(const p of pp){const v=W[m]?.[p];if(v!=null){s+=v;n++;}}if(n)xs.push(s/n);}
  xs.sort((a,b)=>a-b);return[+xs[Math.floor(iters*0.025)]!.toFixed(3),+xs[Math.floor(iters*0.975)]!.toFixed(3)];}
function clusterCI_auc(M:Record<string,number>,P:Record<string,number>,iters:number,seed:number){
  const mk=Object.keys(M),pk=Object.keys(P);if(!mk.length||!pk.length)return null;const r=rng(seed);const xs:number[]=[];
  for(let it=0;it<iters;it++){const a=Array.from({length:mk.length},()=>M[mk[Math.floor(r()*mk.length)]!]!);const b=Array.from({length:pk.length},()=>P[pk[Math.floor(r()*pk.length)]!]!);xs.push(aucRaw(a,b));}
  xs.sort((a,b)=>a-b);return[+xs[Math.floor(iters*0.025)]!.toFixed(3),+xs[Math.floor(iters*0.975)]!.toFixed(3)];}

async function main(){
  log(`=== WS-D R5-LARGE (${MODEL}) | bpc=${BPC} pair_sizes=[${PAIR_SIZES}] abs_sizes=[${ABS_SIZES}] ===`);
  if(process.env.R5L_DRYRUN==='1'){for(const lg of ['fr','en'] as const){const M=load(lg,'maitres',Math.min(...PAIR_SIZES)),P=load(lg,'pulp',Math.min(...PAIR_SIZES));const np=MAX_PAIRS||M.length*P.length;log(`  [dry] ${lg}: maitres=${M.length} pulp=${P.length} -> pairwise ${Math.min(np,M.length*P.length)}×2×${PAIR_SIZES.length}tailles, absolu ${(M.length+P.length)*ABS_DIMS.length*ABS_SIZES.length}`);}
    const tot=(['fr','en'] as const).reduce((acc,lg)=>{const M=load(lg,'maitres',Math.min(...PAIR_SIZES)).length,P=load(lg,'pulp',Math.min(...PAIR_SIZES)).length;return acc+(MAX_PAIRS||M*P)*2*PAIR_SIZES.length+(M+P)*ABS_DIMS.length*ABS_SIZES.length;},0);
    log(`[DRYRUN] ~${tot} appels LLM. Imports + corpus OK.`);return;}
  const provider=createOllamaProvider({baseUrl:OLLAMA,model:MODEL,draftTemperature:0,judgeTemperature:0,draftMaxTokens:400,judgeMaxTokens:400});
  const pf:any=await provider.generateStructuredJSON('Réponds UNIQUEMENT en JSON : {"ok":true}');log(`[PREFLIGHT] ${JSON.stringify(pf).slice(0,60)}`);
  mkdirSync(OUT,{recursive:true});
  const done=new Set<string>();if(existsSync(CKPT))for(const l of readFileSync(CKPT,'utf8').split('\n'))if(l.trim())try{done.add(JSON.parse(l).key);}catch{}
  log(`[RESUME] ${done.size} déjà au checkpoint`);
  const r=rng(20260602);
  for(const lang of ['fr','en'] as const){
    for(const size of PAIR_SIZES){
      const M=load(lang,'maitres',size),P=load(lang,'pulp',size);if(!M.length||!P.length)continue;
      let pairs:[number,number][]=[];for(let i=0;i<M.length;i++)for(let j=0;j<P.length;j++)pairs.push([i,j]);
      if(MAX_PAIRS&&pairs.length>MAX_PAIRS)pairs=pairs.sort(()=>r()-0.5).slice(0,MAX_PAIRS);
      for(const [i,j] of pairs)for(const order of [0,1]){
        const key=`pw_${lang}_${size}_${sha(M[i]!.prose)}_${sha(P[j]!.prose)}_${order}`;if(done.has(key))continue;
        const A=order===0?M[i]!.prose:P[j]!.prose,B=order===0?P[j]!.prose:M[i]!.prose,mpos=order===0?'A':'B';
        let win=NaN;try{const res:any=await provider.generateStructuredJSON(PAIR_PROMPT(lang,A,B));const w=String(res?.winner||'').toUpperCase().trim();if(w==='A'||w==='B')win=w===mpos?1:0;}catch{}
        appendFileSync(CKPT,JSON.stringify({key,mode:'pairwise',lang,size,master:M[i]!.book,pulp:P[j]!.book,order,master_pos:mpos,master_win:win})+'\n','utf8');
      }
      log(`  [pairwise ${lang} sz${size}] ${pairs.length}×2 faits`);
    }
    for(const size of ABS_SIZES){
      const M=load(lang,'maitres',size),P=load(lang,'pulp',size);
      const all=[...M.map(x=>({...x,cls:'maitres'})),...P.map(x=>({...x,cls:'pulp'}))];
      for(const it of all)for(const dim of ABS_DIMS){const key=`abs_${lang}_${size}_${dim.key}_${sha(it.prose)}`;if(done.has(key))continue;
        let sc=NaN;try{const res:any=await provider.generateStructuredJSON(ABS_PROMPT(lang,dim,it.prose));sc=Number(res?.score);}catch{}
        appendFileSync(CKPT,JSON.stringify({key,mode:'absolute',lang,size,dim:dim.key,book:it.book,cls:it.cls,score:isNaN(sc)?null:sc})+'\n','utf8');}
      log(`  [absolu ${lang} sz${size}] ${all.length}×${ABS_DIMS.length} faits`);
    }
  }
  // ── STATS (cluster par livre)
  const all:any[]=[];for(const l of readFileSync(CKPT,'utf8').split('\n'))if(l.trim())try{all.push(JSON.parse(l));}catch{}
  const summary:any={tool:'wsd-r5-large-fr-quality.ts',model:MODEL,bpc:BPC,boot:BOOT,n:all.length,pairwise:{},absolute:{}};
  let seed=11;
  for(const lang of ['fr','en'] as const){summary.pairwise[lang]={};summary.absolute[lang]={};
    for(const size of PAIR_SIZES){const rs=all.filter(o=>o.mode==='pairwise'&&o.lang===lang&&o.size===size&&o.master_win!=null&&!isNaN(o.master_win));
      if(!rs.length)continue;
      const W:Record<string,Record<string,number>>={};const cnt:Record<string,Record<string,number[]>>={};
      for(const o of rs){(cnt[o.master]??={});(cnt[o.master]![o.pulp]??=[]).push(o.master_win);}
      const mKeys=Object.keys(cnt);const pKeys=[...new Set(rs.map(o=>o.pulp))];
      for(const m of mKeys){W[m]={};for(const p of pKeys){const a=cnt[m]?.[p];if(a&&a.length)W[m]![p]=a.reduce((x,y)=>x+y,0)/a.length;}}
      const wins=rs.map(o=>o.master_win);const posA=rs.filter(o=>o.master_pos==='A').map(o=>o.master_win),posB=rs.filter(o=>o.master_pos==='B').map(o=>o.master_win);
      summary.pairwise[lang][size]={n:rs.length,n_master_books:mKeys.length,n_pulp_books:pKeys.length,master_win_rate:mean(wins),
        ci95_by_book:clusterCI_pairwise(W,mKeys,pKeys,BOOT,seed++),position_bias:+Math.abs(mean(posA)-mean(posB)).toFixed(3)};}
    for(const size of ABS_SIZES){summary.absolute[lang][size]={};for(const dim of ABS_DIMS){
      const ms:Record<string,number>={},ps:Record<string,number>={};
      for(const o of all.filter(o=>o.mode==='absolute'&&o.lang===lang&&o.size===size&&o.dim===dim.key&&o.score!=null)){if(o.cls==='maitres')ms[o.book]=o.score;else ps[o.book]=o.score;}
      const mv=Object.values(ms),pv=Object.values(ps);
      summary.absolute[lang][size][dim.key]={auc:mv.length&&pv.length?+aucRaw(mv,pv).toFixed(3):null,ci95_by_book:clusterCI_auc(ms,ps,BOOT,seed++),median_m:mean(mv),median_p:mean(pv),nM:mv.length,nP:pv.length};}}
  }
  // verdict
  const frPW=PAIR_SIZES.map(s=>summary.pairwise.fr?.[s]).filter(Boolean);
  const frPWok=frPW.filter((c:any)=>c.master_win_rate>=0.75&&c.ci95_by_book&&c.ci95_by_book[0]>0.65).length;
  const frAbsDims=ABS_DIMS.map(d=>d.key).filter(k=>ABS_SIZES.filter(s=>{const c=summary.absolute.fr?.[s]?.[k];return c&&c.auc!=null&&c.auc>=0.75&&c.ci95_by_book&&c.ci95_by_book[0]>0.65;}).length>=2);
  summary.verdict={fr_pairwise_sizes_ok:frPWok,fr_pairwise_total:frPW.length,fr_abs_dims_valid:frAbsDims,
    SEALABLE: frPWok>=2 && frAbsDims.length>=2,
    note:'SEALABLE si FR pairwise >=0.75 (IC_bas par livre >0.65) sur >=2 tailles ET >=2 dimensions absolues AUC>=0.75 (IC_bas>0.65) sur >=2 tailles. Sinon affiner.'};
  writeFileSync(path.join(OUT,'WS_D_R5_LARGE.json'),JSON.stringify({summary},null,2),'utf8');
  log('\n=== SUMMARY ===');log(JSON.stringify(summary,null,2));
  log('\nIC95 CLUSTERISE PAR LIVRE (honnete). Decision ADR IntrinsicQualityScore = Architecte si SEALABLE. Scores-only.');
}
main().catch(e=>{log('FATAL: '+(e?.stack??e));process.exit(1);});
