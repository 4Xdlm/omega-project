import fs from 'fs';
const packDir='validation/ValidationPack_phase-s_real_20260227_309535f';
const s=JSON.parse(fs.readFileSync(packDir+'/reports/E1_continuity_impossible_summary.json','utf8'));
console.log('E1 total:',s.runs.length,'| SEAL:',s.sealed_count,'| REJECT:',s.rejected_count);
const reasons={};
for (const r of s.runs){ const reason=(r.s_score_initial?.rejection_reason ?? 'unknown'); reasons[reason]=(reasons[reason]??0)+1; }
console.log('\n=== REJECTION REASONS E1 ===');
for (const [k,v] of Object.entries(reasons).sort((a,b)=>b[1]-a[1])) console.log(' ',v+'x',k);
