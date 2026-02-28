import fs from 'fs';
const packDir = 'validation/ValidationPack_phase-s_real_20260226_6c47438';
const reportsDir = packDir + '/reports';
const summaries = ['E1_continuity_impossible_summary.json','E2_non_classifiable_summary.json','E3_absolute_necessity_summary.json'];
let paradox=0, soma=0, budget=0, axis=0, total=0;
for (const sf of summaries) {
  const s = JSON.parse(fs.readFileSync(reportsDir+'/'+sf,'utf8'));
  console.log('\n=== '+s.experiment_id+' ===');
  for (const run of s.runs) {
    if (run.verdict !== 'REJECTED') continue;
    total++;
    const reason = run.rejection_reason ?? run.reject_reason ?? JSON.stringify(run.forensic ?? run.score_details ?? '').substring(0,80);
    if (reason.includes('paradox')) paradox++;
    else if (reason.includes('soma')) soma++;
    else if (reason.includes('budget')) budget++;
    else axis++;
    console.log('  run'+run.run_index+' | '+String(reason).substring(0,100));
  }
}
console.log('\n=== TOTAL REJETS: '+total+' ===');
console.log('paradox_gate: '+paradox);
console.log('soma_gate: '+soma);
console.log('budget_gate: '+budget);
console.log('axis_floor / other: '+axis);
