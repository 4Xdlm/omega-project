import fs from 'fs';
const packDir = 'validation/ValidationPack_phase-s_real_20260227_3ff41be';
const s = JSON.parse(fs.readFileSync(packDir+'/reports/E3_absolute_necessity_summary.json','utf8'));
console.log('E3 total:', s.runs.length, '| SEAL:', s.sealed_count, '| REJECT:', s.rejected_count);
const reasons: Record<string,number> = {};
for (const r of s.runs) {
  const reason = (r as any).s_score_initial?.rejection_reason ?? 'unknown';
  reasons[reason] = (reasons[reason]??0)+1;
}
console.log('\n=== REJECTION REASONS E3 ===');
for (const [k,v] of Object.entries(reasons).sort((a,b)=>b[1]-a[1])) {
  console.log(' ', v+'x', k);
}
const run0 = s.runs[0] as any;
console.log('\n=== RUN0 SCORES DETAIL ===');
console.log('composite initial:', run0.s_score_initial?.composite);
for (const ax of (run0.s_score_initial?.axes??[])) {
  console.log(' ', ax.name+':', ax.raw, '(floor check)');
}
