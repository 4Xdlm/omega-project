import fs from 'fs';
const packDir = 'validation/ValidationPack_phase-s_real_20260227_c9ef46f';
const s = JSON.parse(fs.readFileSync(packDir+'/reports/E3_absolute_necessity_summary.json','utf8'));
const r0 = (s.runs[0] as any);
console.log('experiment_id exact:', JSON.stringify(r0.packet?.experiment_id ?? r0.experiment_id ?? 'NOT FOUND'));
console.log('rejection_reasons:');
const reasons: Record<string,number> = {};
for (const r of s.runs) { const k = (r as any).s_score_initial?.rejection_reason ?? 'unknown'; reasons[k]=(reasons[k]??0)+1; }
for (const [k,v] of Object.entries(reasons)) console.log(' ',v+'x',k);
