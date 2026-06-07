/**
 * OMEGA — GOLD-SET V3 : OUTIL D'ANNOTATION EN DOUBLE AVEUGLE (script BF-08).
 * Protocole tribunal 2/2 : l'Architecte annote les 64 extraits SANS voir les
 * labels IA (masqués, ordre mélangé par LCG seedé = reproductible), export JSON
 * → dépouillement par annotation-confusion.ts (matrice humain-vs-IA, scellement V3).
 */

import { writeFileSync } from 'node:fs';

import { PROXY_GOLDSET } from '../goldset/proxy-goldset.js';

const RUN = process.env['ANNOT_RUN'] ?? 'runs/c8_book60k';

/** Mélange déterministe (LCG seedé — reproductible, ordre ≠ ordre du fichier source). */
function shuffled<T>(items: readonly T[], seed: number): readonly T[] {
  let s = seed >>> 0;
  const rnd = (): number => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000; };
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = a[i] as T; a[i] = a[j] as T; a[j] = tmp;
  }
  return a;
}

function main(): void {
  const items = shuffled(PROXY_GOLDSET, 20260606).map((e, i) => ({ n: i + 1, id: e.id, text: e.text }));
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>OMEGA — Annotation Gold-Set V3 (double aveugle)</title>
<style>body{font-family:system-ui;background:#0d1117;color:#e6edf3;margin:24px;max-width:900px}h1{font-size:16px}
.card{background:#161b22;border-radius:8px;padding:12px 16px;margin:10px 0}.q{font-size:15px;font-family:Georgia,serif;line-height:1.5}
.btns{margin-top:8px}button{background:#21262d;color:#e6edf3;border:1px solid #30363d;border-radius:6px;padding:6px 18px;margin-right:8px;cursor:pointer;font-size:13px}
button.sel-oui{background:#1f6f3f}button.sel-non{background:#8b2f2f}#export{position:fixed;top:12px;right:16px;background:#1f6feb}
#progress{position:fixed;top:12px;left:16px;color:#8b949e;font-size:13px}.hint{font-size:11px;color:#8b949e}</style></head>
<body><h1>Gold-Set V3 — « Ce passage CONTIENT-il une révélation narrative ? » (64 extraits, labels IA masqués, ordre mélangé)</h1>
<p class="hint">Révélation = une information cachée DEVIENT connue dans le passage (aveu, confirmation, découverte, compréhension, démasquage, identification). Une question, un mystère affiché, une révélation promise-mais-différée n'en sont PAS.</p>
<div id="progress">0 / ${items.length}</div><button id="export">EXPORTER (JSON)</button>
<div id="list"></div>
<script>
const ITEMS = ${JSON.stringify(items)};
const answers = {};
const list = document.getElementById('list');
for(const it of ITEMS){
  const d = document.createElement('div'); d.className='card';
  d.innerHTML = '<div class="q">'+it.n+'. '+it.text+'</div><div class="btns"><button data-v="oui">OUI — révélation</button><button data-v="non">NON</button></div>';
  for(const b of d.querySelectorAll('button')) b.addEventListener('click', ()=>{
    answers[it.id] = b.dataset.v === 'oui';
    for(const x of d.querySelectorAll('button')) x.className='';
    b.className = 'sel-'+b.dataset.v;
    document.getElementById('progress').textContent = Object.keys(answers).length+' / '+ITEMS.length;
  });
  list.appendChild(d);
}
document.getElementById('export').addEventListener('click', ()=>{
  if(Object.keys(answers).length < ITEMS.length && !confirm('Annotation incomplète ('+Object.keys(answers).length+'/'+ITEMS.length+'). Exporter quand même ?')) return;
  const blob = new Blob([JSON.stringify({date:new Date().toISOString(), annotator:'Francky', answers}, null, 2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'GOLDSET_V3_HUMAN_LABELS.json'; a.click();
});
</script></body></html>`;
  writeFileSync(`${RUN}/ANNOTATION_GOLDSET_V3.html`, html, 'utf8');
  process.stdout.write(`ANNOTATION TOOL OK — ${items.length} extraits, ordre mélangé seed=20260606, labels masqués\n`);
}

main();
