import fs from 'fs';
const packDir = 'validation/ValidationPack_phase-s_real_20260227_26387e9';
for (const exp of ['E1_continuity_impossible','E3_absolute_necessity']) {
  const s = JSON.parse(fs.readFileSync(packDir+'/reports/'+exp+'_summary.json','utf8'));
  const reasons: Record<string,number> = {};
  for (const r of s.runs) {
    const reason = (r as any).s_score_initial?.rejection_reason ?? 'unknown';
    const comp = (r as any).s_score_initial?.composite ?? 0;
    reasons[reason] = (reasons[reason]??0)+1;
  }
  console.log('\n=== '+exp+' ===');
  for (const [k,v] of Object.entries(reasons).sort((a,b)=>b[1]-a[1])) console.log(' ',v+'x',k);
  const r0 = (s.runs[0] as any);
  console.log('run0 composite:', r0.s_score_initial?.composite?.toFixed(1));
  for (const ax of (r0.s_score_initial?.axes??[])) {
    if (ax.raw < 0.75) console.log('  LOW:', ax.name+'='+ax.raw);
  }
}
