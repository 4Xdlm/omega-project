/**
 * OMEGA METROLOGY — WS-D AXIS INTERCONNECTION MATRIX (CALC, READ-ONLY, autonome)
 * ============================================================================
 * Point Architecte : « interconnexions dans les différentes mesures si elles existent
 * dans la vérité des mesures ». Calcule Pearson + Spearman entre les 5 macro-axes
 * (ECC/RCI/SII/IFI/AAI) + composite + min_axis sur les 95 mesures maîtres WS-C.
 * Révèle : redondance (axes co-variant -> composite double-compte) vs orthogonalité.
 * Lit docs/audit/calibration/WS_C_MEASURES.jsonl. 0 Ollama, 0 patch. Run via node+tsx.
 */
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
const REPO = path.resolve(process.cwd(), process.cwd().endsWith('sovereign-engine') ? '../..' : '.');
const JSONL = path.join(REPO, 'docs', 'audit', 'calibration', 'WS_C_MEASURES.jsonl');
function log(s:string){process.stderr.write(s+'\n');}
const KEYS=['ecc','rci','sii','ifi','aai','composite','min_axis'];
function pearson(a:number[],b:number[]){const n=a.length;const ma=a.reduce((x,y)=>x+y,0)/n,mb=b.reduce((x,y)=>x+y,0)/n;let num=0,da=0,db=0;for(let i=0;i<n;i++){num+=(a[i]-ma)*(b[i]-mb);da+=(a[i]-ma)**2;db+=(b[i]-mb)**2;}return da&&db?num/Math.sqrt(da*db):0;}
function rank(a:number[]){const idx=a.map((v,i)=>[v,i]).sort((x,y)=>x[0]-y[0]);const r=new Array(a.length);for(let i=0;i<idx.length;i++)r[idx[i][1]]=i+1;return r;}
function spearman(a:number[],b:number[]){return pearson(rank(a),rank(b));}
function main(){
  const rows=readFileSync(JSONL,'utf8').split(/\n/).filter(l=>l.trim()).map(l=>JSON.parse(l));
  const cols:Record<string,number[]>={};for(const k of KEYS)cols[k]=rows.map(r=>r.score[k]).filter((x:number)=>Number.isFinite(x));
  log(`=== WS-D AXIS INTERCONNECTION MATRIX (n=${rows.length} mesures maîtres) ===`);
  log('\n=== PEARSON (linéaire) ===');
  log('        '+KEYS.map(k=>k.slice(0,6).padStart(7)).join(''));
  for(const ki of KEYS){ let line=ki.padEnd(8); for(const kj of KEYS) line+=(pearson(cols[ki],cols[kj])).toFixed(2).padStart(7); log(line); }
  log('\n=== SPEARMAN (rang/monotone) ===');
  log('        '+KEYS.map(k=>k.slice(0,6).padStart(7)).join(''));
  for(const ki of KEYS){ let line=ki.padEnd(8); for(const kj of KEYS) line+=(spearman(cols[ki],cols[kj])).toFixed(2).padStart(7); log(line); }
  // lecture : redondances axe-axe (|r|>0.7) hors composite/min_axis
  const axes=['ecc','rci','sii','ifi','aai'];
  log('\n=== INTERCONNEXIONS fortes axe-axe (|Pearson|>=0.5) ===');
  for(let i=0;i<axes.length;i++)for(let j=i+1;j<axes.length;j++){const r=pearson(cols[axes[i]],cols[axes[j]]);if(Math.abs(r)>=0.5)log(`  ${axes[i]} <-> ${axes[j]} : r=${r.toFixed(2)} (redondance potentielle)`);}
  log('\n=== quel axe DRIVE le composite (Pearson axe~composite) ===');
  for(const a of axes) log(`  ${a.padEnd(5)} ~ composite : r=${pearson(cols[a],cols['composite']).toFixed(2)}`);
  log('\n=== quel axe DRIVE le min_axis ===');
  for(const a of axes) log(`  ${a.padEnd(5)} ~ min_axis : r=${pearson(cols[a],cols['min_axis']).toFixed(2)}`);
}
main();
