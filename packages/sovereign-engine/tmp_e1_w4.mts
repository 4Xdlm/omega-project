import fs from 'fs';
const packDir = 'validation/ValidationPack_phase-s_real_20260228_8a1103b';
const s = JSON.parse(fs.readFileSync(packDir+'/reports/E1_continuity_impossible_summary.json','utf8'));
const reasons: Record<string,number> = {};
for (const r of s.runs) {
  const reason = (r as any).s_score_initial?.rejection_reason ?? 'unknown';
  const comp = (r as any).s_score_initial?.composite ?? 0;
  reasons[reason] = (reasons[reason]??0)+1;
}
console.log('=== E1 FORENSIC ===');
for (const [k,v] of Object.entries(reasons).sort((a,b)=>b[1]-a[1])) console.log(v+'x', k);
const r0 = (s.runs[0] as any);
const axes = r0.s_score_initial?.axes ?? [];
console.log('\nrun0 axes <0.8:');
for (const ax of axes) { if ((ax.raw??ax.score??0) < 0.8) console.log(' ', ax.name+'='+(ax.raw??ax.score)); }
