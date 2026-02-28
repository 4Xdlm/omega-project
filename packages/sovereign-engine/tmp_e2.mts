import fs from 'fs';
const packDir = 'validation/ValidationPack_phase-s_real_20260227_14414a6';
const s = JSON.parse(fs.readFileSync(packDir+'/reports/E2_non_classifiable_summary.json','utf8'));
const rejected = s.runs.filter((r:any) => r.verdict === 'REJECT');
console.log('E2 REJECTED:', rejected.length);
for (const r of rejected) {
  console.log('\n--- run'+r.run_index+' ---');
  console.log('s_score_initial rejection_reason:', r.s_score_initial?.rejection_reason ?? 'none');
  console.log('s_score_final rejection_reason:', r.s_score_final?.rejection_reason ?? 'none');
  console.log('s_score_initial composite:', r.s_score_initial?.composite);
  if (r.s_score_initial?.rejection_reason?.includes('paradox')) {
    const loop = r.sovereign_loop as any;
    const prose = loop?.final_prose ?? '';
    console.log('prose snippet (200c):', prose.substring(0,200));
  }
}
