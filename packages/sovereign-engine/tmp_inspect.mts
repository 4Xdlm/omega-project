import fs from 'fs';
const packDir = 'validation/ValidationPack_phase-s_real_20260226_6c47438';
console.log('=== DOSSIERS ===');
console.log(fs.readdirSync(packDir));
const reportsDir = packDir + '/reports';
if (fs.existsSync(reportsDir)) {
  const files = fs.readdirSync(reportsDir);
  console.log('=== REPORTS FILES ===');
  console.log(files);
  if (files.length > 0) {
    const r = JSON.parse(fs.readFileSync(reportsDir + '/' + files[0], 'utf8'));
    console.log('=== KEYS FILE 0 ===');
    console.log(Object.keys(r));
    console.log('=== FULL CONTENT (500 chars) ===');
    console.log(JSON.stringify(r).substring(0, 500));
  }
}
