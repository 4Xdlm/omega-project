import fs from 'fs';
const packDir = 'validation/ValidationPack_phase-s_real_20260228_8a1103b';
const s = JSON.parse(fs.readFileSync(packDir+'/reports/E3_absolute_necessity_summary.json','utf8'));
const reasons: Record<string,number> = {};
for (const r of s.runs) {
  const reason = (r as any).s_score_initial?.rejection_reason ?? 'unknown';
  const comp = (r as any).s_score_initial?.composite ?? 0;
  reasons[reason] = (reasons[reason]??0)+1;
  if ((r as any).s_score_initial?.verdict === 'REJECT') {
    const axes = (r as any).s_score_initial?.axes ?? [];
    const low = axes.filter((a:any) => (a.raw??a.score??0) < 0.8).map((a:any) => a.name+'='+(a.raw??a.score)?.toFixed(2));
    console.log('run'+r.run_index+' REJECT | '+reason+' | composite='+comp.toFixed(1)+' | low: '+low.join(', '));
  }
}
console.log('\n=== E3 SUMMARY ===');
for (const [k,v] of Object.entries(reasons).sort((a,b)=>b[1]-a[1])) console.log(v+'x', k);
