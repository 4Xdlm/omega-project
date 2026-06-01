/**
 * OMEGA METROLOGY — WS-D R1 SHADOW PRE-CHECK (CALC, READ-ONLY, autonome)
 * ============================================================================
 * Teste sur DONNÉES RÉELLES (WS_C_MEASURES.jsonl, 95 maîtres) l'effet du RECLASSEMENT
 * de l'IFI : min_axis OLD (5 axes, IFI gating) vs NEW (4 axes, IFI ADVISORY hors gate).
 * Philosophie : IFI reste calculé/loggé (advisory), il sort juste du gate bloquant.
 * Montre la récupération des maîtres. (Faux-accepts mauvaise prose = corpus WS-D, terminal.)
 * 0 Ollama. Lit docs/audit/calibration/WS_C_MEASURES.jsonl. Run via node+tsx.
 */
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
const REPO = path.resolve(process.cwd(), process.cwd().endsWith('sovereign-engine') ? '../..' : '.');
const JSONL = path.join(REPO, 'docs', 'audit', 'calibration', 'WS_C_MEASURES.jsonl');
function log(s:string){process.stderr.write(s+'\n');}
function pct(xs:number[],p:number){const s=[...xs].sort((a,b)=>a-b);const i=p/100*(s.length-1),lo=Math.floor(i),hi=Math.ceil(i);return +(lo===hi?s[lo]:s[lo]+(s[hi]-s[lo])*(i-lo)).toFixed(1);}
function main(){
  const rows=readFileSync(JSONL,'utf8').split(/\n/).filter(l=>l.trim()).map(l=>JSON.parse(l));
  const minOld=rows.map(r=>Math.min(r.score.ecc,r.score.rci,r.score.sii,r.score.ifi,r.score.aai));
  const minNew=rows.map(r=>Math.min(r.score.ecc,r.score.rci,r.score.sii,r.score.aai)); // IFI advisory hors gate
  log(`=== WS-D R1 SHADOW PRE-CHECK (n=${rows.length} maîtres) ===`);
  log('\n=== min_axis OLD (5 axes, IFI gating) vs NEW (4 axes, IFI advisory) ===');
  log(`  OLD min_axis : médiane ${pct(minOld,50)} | p10 ${pct(minOld,10)} | p90 ${pct(minOld,90)} | min ${Math.min(...minOld).toFixed(1)}`);
  log(`  NEW min_axis : médiane ${pct(minNew,50)} | p10 ${pct(minNew,10)} | p90 ${pct(minNew,90)} | min ${Math.min(...minNew).toFixed(1)}`);
  log('\n=== taux de passage maîtres au gate min_axis ===');
  for(const thr of [80,76,72,70,65,60]){
    const o=minOld.filter(x=>x>=thr).length, n=minNew.filter(x=>x>=thr).length;
    log(`  min_axis>=${thr} : OLD ${o}/${rows.length} (${(100*o/rows.length).toFixed(0)}%)  ->  NEW ${n}/${rows.length} (${(100*n/rows.length).toFixed(0)}%)`);
  }
  log('\n=== quel axe pilote NEW min_axis (sans IFI) ? ===');
  const drivers:Record<string,number>={ecc:0,rci:0,sii:0,aai:0};
  for(const r of rows){const m={ecc:r.score.ecc,rci:r.score.rci,sii:r.score.sii,aai:r.score.aai};const k=Object.keys(m).reduce((a,b)=>(m as any)[b]<(m as any)[a]?b:a);drivers[k]++;}
  for(const k of Object.keys(drivers)) log(`  ${k} est le min dans ${drivers[k]}/${rows.length} passages`);
  log('\n=== candidats floor min_axis NEW (percentiles maîtres) ===');
  log(`  p10=${pct(minNew,10)}  p25=${pct(minNew,25)}  p50=${pct(minNew,50)}`);
  log('\nLecture : IFI sort du GATE (reste advisory/loggé). Si NEW relève fortement le taux de passage, le 0/95 venait bien du gate IFI keyword. Le floor min_axis NEW se fixera par percentile maître (ex p25) APRÈS shadow bench complet (avec faux-accepts mauvaise prose).');
}
main();
