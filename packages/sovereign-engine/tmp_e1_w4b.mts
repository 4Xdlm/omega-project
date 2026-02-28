import fs from 'fs';
const packDir = 'validation/ValidationPack_phase-s_real_20260228_a79d6ea';
const s = JSON.parse(fs.readFileSync(packDir+'/reports/E1_continuity_impossible_summary.json','utf8'));
const reasons: Record<string,number> = {};
for (const r of s.runs) {
  const reason = (r as any).s_score_initial?.rejection_reason ?? 'unknown';
  reasons[reason] = (reasons[reason]??0)+1;
  if ((r as any).verdict === 'REJECT' || (r as any).s_score_initial?.verdict === 'REJECT') {
    const axes = (r as any).s_score_initial?.axes ?? [];
    const low = axes.filter((a:any) => (a.raw??a.score??0) < 0.8).map((a:any) => a.name+'='+(+(a.raw??a.score)).toFixed(2));
    console.log('run'+(r as any).run_index+' | '+(r as any).verdict+' | '+reason+' | low: '+low.join(', '));
  }
}
console.log('\n=== E1 TUEURS ===');
for (const [k,v] of Object.entries(reasons).sort((a,b)=>b[1]-a[1])) console.log(v+'x', k);
