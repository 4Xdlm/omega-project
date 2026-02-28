import fs from 'fs';
const packDir = 'validation/ValidationPack_phase-s_real_20260226_6c47438';
const s = JSON.parse(fs.readFileSync(packDir+'/reports/E1_continuity_impossible_summary.json','utf8'));
const run0 = s.runs[0];
console.log('=== KEYS RUN[0] ===');
console.log(Object.keys(run0));
console.log('=== FULL RUN[0] ===');
console.log(JSON.stringify(run0, null, 2).substring(0, 800));
const run1 = s.runs[1];
console.log('\n=== KEYS RUN[1] ===');
console.log(Object.keys(run1));
console.log('verdict-like fields:');
for (const k of Object.keys(run1)) {
  const v = String((run1 as any)[k]);
  if (v.includes('SEAL') || v.includes('REJECT') || v.includes('PASS') || v.includes('FAIL')) {
    console.log(' ', k, ':', v.substring(0,80));
  }
}
