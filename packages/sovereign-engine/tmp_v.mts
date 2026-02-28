import fs from 'fs';
const packDir = 'validation/ValidationPack_phase-s_real_20260226_6c47438';
const exps = ['E1_continuity_impossible','E2_non_classifiable','E3_absolute_necessity'];
for (const exp of exps) {
  const s = JSON.parse(fs.readFileSync(packDir+'/reports/'+exp+'_summary.json','utf8'));
  console.log('\n=== '+exp+' ===');
  for (const run of s.runs) {
    const r = (run as any);
    const keys = Object.keys(r);
    const rejectKey = keys.find(k=>k.toLowerCase().includes('reject')||k.toLowerCase().includes('reason')||k.toLowerCase().includes('gate'));
    console.log('run'+r.run_index+' verdict='+r.verdict+' | '+rejectKey+'='+String(r[rejectKey??'']).substring(0,80));
  }
}
