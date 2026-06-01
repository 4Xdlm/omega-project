/**
 * OMEGA METROLOGY — WS-D SHADOW DOUBLE-VERDICT (CALC, READ-ONLY, squelette réutilisable)
 * ============================================================================
 * Émet DEUX verdicts par passage (sans rien changer en prod, sans supprimer aucune mesure) :
 *   verdict_OLD : gate actuel (min_axis sur 5 axes ; SEAL composite>=93 & min>=80 & ecc>=88 & aai>=85)
 *   verdict_NEW : gate RECLASSÉ (IFI advisory -> min_axis sur axes GATING seulement ; seuils
 *                 candidats data-driven WS-C). IFI reste calculé/loggé (rôle ADVISORY).
 * Philosophie Architecte : RECLASSER, jamais supprimer. Les rôles sont une CONFIG, pas du code
 * de mesure. Tout reste dans la provenance (DEC-014).
 *
 * Entrée : un ou plusieurs JSONL de mesures (champ score.{ecc,rci,sii,ifi,aai,composite,min_axis}
 *          + champ optionnel `family` : master|golden|reject|bad|commercial|omega).
 *   Défaut : docs/audit/calibration/WS_C_MEASURES.jsonl (family=master implicite).
 *   Env MEASURES="a.jsonl,b.jsonl" pour brancher goldens/rejects/mauvaise-prose/best-sellers
 *   (mesurés au format WS-C dans le terminal Architecte).
 *
 * Sorties : matrice OLD vs NEW par famille (SEAL/PITCH/REJECT) + faux-rejets (maîtres) +
 *           faux-accepts (bad/commercial). docs/audit/calibration/WS_D_SHADOW_DOUBLE_VERDICT.{md,csv}
 * 0 Ollama, 0 patch, 0 seuil prod. Run via node+tsx.
 *
 * NOTE HONNÊTE : ce squelette reclasse au niveau MACRO (IFI hors min_axis). Le reclassement
 * INTRA-IFI (sensory/corporeal advisory dans le sous-score IFI) = code moteur (couche de rôles
 * dans le scorer, terminal Architecte) ; il affinerait IFI_advisory sans le supprimer.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import * as path from 'node:path';
const REPO = path.resolve(process.cwd(), process.cwd().endsWith('sovereign-engine') ? '../..' : '.');
const OUT = path.join(REPO, 'docs', 'audit', 'calibration');
function log(s:string){process.stderr.write(s+'\n');}

// ─── CONFIG DES RÔLES (reclasser, pas supprimer) ─────────────────────────────
const GATING_OLD = ['ecc','rci','sii','ifi','aai'] as const;       // min_axis actuel
const GATING_NEW = ['ecc','rci','sii','aai'] as const;             // IFI reclassé ADVISORY (hors gate)
const ADVISORY_NEW = ['ifi'] as const;                             // calculé/loggé, hors gate

// ─── CONFIG DES SEUILS ───────────────────────────────────────────────────────
// OLD = dogme actuel (INVALIDÉ DEC-015, conservé pour comparaison)
const THR_OLD = { composite:93, min_axis:80, ecc:88, aai:85 };
// NEW = CANDIDATS SHADOW data-driven (percentiles maîtres WS-C). Paramétrables.
// composite p50=79.7 (SEAL «niveau maître médian») ; min_axis_NEW p25=64 ; ecc/aai p25.
const THR_NEW = {
  composite: parseFloat(process.env.NEW_COMPOSITE ?? '79.7'),
  min_axis:  parseFloat(process.env.NEW_MIN_AXIS  ?? '64'),
  ecc:       parseFloat(process.env.NEW_ECC       ?? '64'),
  aai:       parseFloat(process.env.NEW_AAI       ?? '85'),
};

function minAxis(score:any, axes:readonly string[]){ return Math.min(...axes.map(a=>score[a])); }
function verdict(score:any, gating:readonly string[], thr:any){
  const ma = minAxis(score, gating);
  if (score.composite>=thr.composite && ma>=thr.min_axis && score.ecc>=thr.ecc && score.aai>=thr.aai) return 'SEAL';
  if (score.composite>=85 && ma>=75) return 'PITCH';
  return 'REJECT';
}

function loadMeasures():any[]{
  const files = (process.env.MEASURES ?? path.join(OUT,'WS_C_MEASURES.jsonl')).split(',').map(s=>s.trim());
  const rows:any[]=[];
  for(const f of files){ const fp=path.isAbsolute(f)?f:path.join(REPO,f); if(!existsSync(fp)){log(`WARN missing ${fp}`);continue;}
    for(const l of readFileSync(fp,'utf8').split(/\n/)){ if(!l.trim())continue; try{const r=JSON.parse(l); if(r.score){ r.family=r.family??r.category_family??'master'; rows.push(r);} }catch{} } }
  return rows;
}

function main(){
  const rows=loadMeasures();
  log(`=== WS-D SHADOW DOUBLE-VERDICT (n=${rows.length}) ===`);
  log(`OLD thr ${JSON.stringify(THR_OLD)} | gating ${GATING_OLD.join('+')}`);
  log(`NEW thr ${JSON.stringify(THR_NEW)} | gating ${GATING_NEW.join('+')} | advisory ${ADVISORY_NEW.join('+')}`);
  const fams=[...new Set(rows.map(r=>r.family))];
  const tbl:any[]=[];
  for(const fam of fams){ const rs=rows.filter(r=>r.family===fam); const n=rs.length;
    const cnt=(verd:string,fn:(r:any)=>string)=>rs.filter(r=>fn(r)===verd).length;
    const oldV=(r:any)=>verdict(r.score,GATING_OLD,THR_OLD), newV=(r:any)=>verdict(r.score,GATING_NEW,THR_NEW);
    const o={SEAL:cnt('SEAL',oldV),PITCH:cnt('PITCH',oldV),REJECT:cnt('REJECT',oldV)};
    const nw={SEAL:cnt('SEAL',newV),PITCH:cnt('PITCH',newV),REJECT:cnt('REJECT',newV)};
    tbl.push({family:fam,n,old_SEAL:o.SEAL,old_PITCH:o.PITCH,old_REJECT:o.REJECT,new_SEAL:nw.SEAL,new_PITCH:nw.PITCH,new_REJECT:nw.REJECT});
    log(`\n[${fam}] n=${n}`);
    log(`  OLD : SEAL ${o.SEAL} | PITCH ${o.PITCH} | REJECT ${o.REJECT}`);
    log(`  NEW : SEAL ${nw.SEAL} | PITCH ${nw.PITCH} | REJECT ${nw.REJECT}`);
    if(fam==='master'){ const passOld=o.SEAL+o.PITCH, passNew=nw.SEAL+nw.PITCH;
      log(`  -> faux-REJET maîtres (REJECT) : OLD ${o.REJECT}/${n} (${(100*o.REJECT/n).toFixed(0)}%)  NEW ${nw.REJECT}/${n} (${(100*nw.REJECT/n).toFixed(0)}%)  [moins = mieux]`); }
    if(fam==='bad'||fam==='commercial'){ log(`  -> faux-ACCEPT (SEAL+PITCH) : OLD ${o.SEAL+o.PITCH}/${n}  NEW ${nw.SEAL+nw.PITCH}/${n}  [moins = mieux]`); }
  }
  mkdirSync(OUT,{recursive:true});
  const cols=['family','n','old_SEAL','old_PITCH','old_REJECT','new_SEAL','new_PITCH','new_REJECT'];
  writeFileSync(path.join(OUT,'WS_D_SHADOW_DOUBLE_VERDICT.csv'),[cols.join(','),...tbl.map(r=>cols.map(c=>r[c]).join(','))].join('\n')+'\n','utf8');
  writeFileSync(path.join(OUT,'WS_D_SHADOW_DOUBLE_VERDICT.json'),JSON.stringify({THR_OLD,THR_NEW,GATING_OLD,GATING_NEW,ADVISORY_NEW,families:tbl,note:'Squelette : reclassement MACRO (IFI hors min_axis). Seuils NEW=candidats shadow (percentiles maîtres WS-C), paramétrables via env. Brancher goldens/rejects/bad/best-sellers via MEASURES=. Aucun changement prod.'},null,2),'utf8');
  log('\n=== livrables : WS_D_SHADOW_DOUBLE_VERDICT.{csv,json} ===');
  log('Pour bench complet : mesurer goldens/rejects/mauvaise-prose/best-sellers au format WS-C (terminal),');
  log('puis MEASURES="docs/audit/calibration/WS_C_MEASURES.jsonl,...goldens.jsonl,...bad.jsonl" pour faux-accepts/faux-rejets croisés.');
}
main();
