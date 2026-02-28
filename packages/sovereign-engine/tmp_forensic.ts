const fs = require('fs'), path = require('path');
const packDir = 'validation/ValidationPack_phase-s_real_20260226_6c47438';
const reportsDir = path.join(packDir, 'reports');
const files = fs.readdirSync(reportsDir).filter(f => f.endsWith('.json') && !f.includes('summary'));
let paradox=0, soma=0, budget=0, other=0, total=0;
for (const f of files) {
  const r = JSON.parse(fs.readFileSync(path.join(reportsDir, f), 'utf8'));
  if (r.verdict !== 'REJECTED') continue;
  total++;
  const reason = r.rejection_reason ?? r.forensic?.rejection_reason ?? JSON.stringify(r.forensic ?? '');
  if (reason.includes('paradox')) paradox++;
  else if (reason.includes('soma')) soma++;
  else if (reason.includes('budget')) budget++;
  else other++;
  if (total <= 3) console.log('SAMPLE:', f, '|', reason.substring(0,120));
}
console.log('=== FORENSIC REJETS ===');
console.log('Total REJECTED:', total);
console.log('paradox_gate:', paradox);
console.log('soma_gate:', soma);
console.log('budget_gate:', budget);
console.log('other (score/axis):', other);
