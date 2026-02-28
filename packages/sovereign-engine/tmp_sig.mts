import fs from 'fs';
const packs = fs.readdirSync('validation').filter(d => d.startsWith('ValidationPack_phase-s_real'));
const scores: number[] = [];
for (const pack of packs) {
  for (const exp of ['E1','E2','E3']) {
    const files = fs.readdirSync('validation/'+pack+'/reports').filter(f => f.includes(exp) && f.includes('summary'));
    for (const f of files) {
      const s = JSON.parse(fs.readFileSync('validation/'+pack+'/reports/'+f,'utf8'));
      for (const r of s.runs) {
        const axes = (r as any).s_score_initial?.axes ?? [];
        const sig = axes.find((a: any) => a.name === 'signature' || a.id === 'signature');
        if (sig) scores.push(sig.raw ?? sig.score ?? sig.value);
      }
    }
  }
}
scores.sort((a,b)=>a-b);
const mean = scores.reduce((a,b)=>a+b,0)/scores.length;
const floor = scores.filter(s=>s<0.8).length;
console.log('N='+scores.length+' | mean='+mean.toFixed(3)+' | <0.8: '+floor+'/'+scores.length);
console.log('Distribution:', [0,0.5,0.6,0.7,0.75,0.8,0.85,0.9,1.0].map(t=>t+'→'+scores.filter(s=>s>=t).length));
