import fs from 'fs';
const packDir = 'validation/ValidationPack_phase-s_real_20260227_6bfaf71';
const s = JSON.parse(fs.readFileSync(packDir+'/reports/E3_absolute_necessity_summary.json','utf8'));
for (const r of s.runs.slice(0,3)) {
  const init = (r as any).s_score_initial;
  console.log('run'+r.run_index, '| verdict:', init?.verdict, '| rejection:', init?.rejection_reason, '| composite:', init?.composite, '| composite_without_gate:', init?.composite_without_gate ?? 'NOT FOUND');
}
