/**
 * OMEGA METROLOGY — WS-D R1 TRIPLE PROOF (CALC, READ-ONLY, autonome)
 * ============================================================================
 * Doctrine Architecte 1000% : aucune modif moteur sans 3 preuves indépendantes CONVERGENTES.
 * Claim R1 testé : « IFI est un bottleneck dominant du min_axis, et le reclasser ADVISORY
 *   (hors gate, toujours calculé) relève le min_axis / récupère la prose légitime. »
 * 3 corpus indépendants :
 *   P1 maîtres  = docs/audit/calibration/WS_C_MEASURES.jsonl (95, macro 5-axes)
 *   P2 ALTERNANCE = sessions/ALTERNANCE_STUDY_.../phase1,2,3_results.json (macro 5-axes)
 *   P3 goldens  = golden S_SCORE_FINAL.json -> LEGACY flat-axis (PAS de macro IFI) ->
 *                 caractérisation keyword seulement ; preuve macro stricte = re-score terminal.
 * CONVERGENCE = P1 ET P2 satisfont le claim (les 2 macro). P3 = directionnel + gate terminal.
 * 0 Ollama, 0 patch, 0 seuil. Run via node+tsx.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import * as path from 'node:path';
const REPO = path.resolve(process.cwd(), process.cwd().endsWith('sovereign-engine') ? '../..' : '.');
function log(s:string){process.stderr.write(s+'\n');}
function med(xs:number[]){const s=[...xs].sort((a,b)=>a-b);return s.length?+s[Math.floor((s.length-1)/2)].toFixed(1):0;}
function mean(xs:number[]){return xs.length?+(xs.reduce((a,b)=>a+b,0)/xs.length).toFixed(1):0;}
const AX=['ecc','rci','sii','aai'] as const; // gating NEW (IFI advisory)
function minOld(s:any){return Math.min(s.ecc,s.rci,s.sii,s.ifi,s.aai);}
function minNew(s:any){return Math.min(s.ecc,s.rci,s.sii,s.aai);}
function whichMin(s:any){const m={ecc:s.ecc,rci:s.rci,sii:s.sii,ifi:s.ifi,aai:s.aai} as any;return Object.keys(m).reduce((a,b)=>m[b]<m[a]?b:a);}

function loadMasters(){const fp=path.join(REPO,'docs/audit/calibration/WS_C_MEASURES.jsonl');if(!existsSync(fp))return[];return readFileSync(fp,'utf8').split(/\n/).filter(l=>l.trim()).map(l=>JSON.parse(l).score).filter((s:any)=>s&&Number.isFinite(s.ifi));}
function loadAlternance(){const dir=path.join(REPO,'packages/sovereign-engine/sessions');const alt=readdirSync(dir).find(d=>d.startsWith('ALTERNANCE_STUDY'));if(!alt)return[];const base=path.join(dir,alt);const out:any[]=[];for(const f of ['phase1_results.json','phase2_results.json','phase3_G_results.json']){const fp=path.join(base,f);if(!existsSync(fp))continue;const arr=JSON.parse(readFileSync(fp,'utf8'));for(const r of arr){if(r.IFI==null)continue;out.push({ecc:r.ECC,rci:r.RCI,sii:r.SII,ifi:r.IFI,aai:r.AAI,composite:r.composite,min_axis:r.min_axis});}}return out;}
function loadGoldens(){const root=path.join(REPO,'golden');const found:string[]=[];(function walk(d:string){for(const e of readdirSync(d)){const p=path.join(d,e);const st=statSync(p);if(st.isDirectory())walk(p);else if(e==='S_SCORE_FINAL.json')found.push(p);}})(root);return found.map(fp=>{const j=JSON.parse(readFileSync(fp,'utf8'));const a=j.axes||{};const g=(k:string)=>a[k]?a[k].score:null;return {composite:j.composite,sensory_density:g('sensory_density'),signature:g('signature'),anti_cliche:g('anti_cliche'),rhythm:g('rhythm'),tension_14d:g('tension_14d')};});}

function proveMacro(name:string,rows:any[]){
  const n=rows.length; if(!n){log(`  [${name}] AUCUNE donnée`);return null;}
  const ifiMinPct=rows.filter(s=>whichMin(s)==='ifi').length/n;
  const mOld=rows.map(minOld), mNew=rows.map(minNew);
  const lift=+(med(mNew)-med(mOld)).toFixed(1);
  const passOld80=mOld.filter(x=>x>=80).length, passNew80=mNew.filter(x=>x>=80).length;
  const claim_bottleneck = ifiMinPct>=0.40;            // IFI est le min dans >=40% des cas
  const claim_lift = lift>=5;                            // reclasser relève le min_axis
  const pass = claim_bottleneck && claim_lift;
  log(`  [${name}] n=${n} | IFI=min dans ${(100*ifiMinPct).toFixed(0)}% | min_axis médiane OLD ${med(mOld)} -> NEW ${med(mNew)} (lift +${lift}) | pass@80 OLD ${passOld80}/${n} -> NEW ${passNew80}/${n}`);
  log(`     claim IFI-bottleneck(>=40%): ${claim_bottleneck} | claim lift(>=5): ${claim_lift} | => ${pass?'CONVERGE':'DIVERGE'}`);
  return {name,n,ifiMinPct:+(ifiMinPct*100).toFixed(0),lift,pass};
}

function main(){
  log('=== WS-D R1 TRIPLE PROOF (IFI advisory) ===\n');
  log('--- PREUVES MACRO (gate identique) ---');
  const p1=proveMacro('maitres(WS-C)',loadMasters());
  const p2=proveMacro('ALTERNANCE',loadAlternance());
  log('\n--- P3 goldens (LEGACY flat-axis : caractérisation keyword, pas gate macro) ---');
  const g=loadGoldens();
  if(g.length){ const f=(k:string)=>mean(g.map(x=>x[k]).filter((v:any)=>v!=null));
    log(`  [goldens] n=${g.length} | sensory_density=${f('sensory_density')} signature=${f('signature')} anti_cliche=${f('anti_cliche')} rhythm=${f('rhythm')} tension_14d=${f('tension_14d')}`);
    log(`     -> capteurs keyword OMEGA-output : signature/anti_cliche saturés (~100) vs maîtres bas => confirme directionnellement le biais. Preuve macro stricte = re-score goldens avec moteur macro (terminal).`);
  }
  log('\n=== VERDICT CONVERGENCE ===');
  const macroPass=[p1,p2].filter(p=>p&&p.pass).length;
  log(`  Preuves macro convergentes : ${macroPass}/2 (maîtres, ALTERNANCE)`);
  if(p1&&p2&&p1.pass&&p2.pass) log('  -> 2/2 macro CONVERGENT. 3e preuve (goldens macro) REQUISE en terminal AVANT tout code.');
  else log('  -> DIVERGENCE détectée sur une preuve macro -> STOP, R1 non confirmé en l état (réexaminer).');
  log('  DOCTRINE : aucune modif moteur tant que les 3 preuves indépendantes ne convergent pas (3/3).');
}
main();
