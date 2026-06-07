/**
 * OMEGA — PHASE 18 BUILD DU WRITING STUDIO (script BF-08) — bundle esbuild du
 * MOTEUR RÉEL (studio-main) + données réelles embarquées (ch.5 éditable,
 * candidats persistés du ch.1, cast validé, graines) → WRITING_STUDIO.html
 * autonome. Les lois produit sont AFFICHÉES et IMPOSÉES (router dans le bundle).
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { buildSync } from 'esbuild';

const RUN = process.env['STUDIO_RUN'] ?? 'runs/c8_book60k';

function main(): void {
  /* ── 1. Bundle du moteur réel ────────────────────────────────────────── */
  const bundle = buildSync({
    entryPoints: ['src/studio/studio-main.ts'],
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'OMEGA_STUDIO',
    platform: 'browser',
    target: 'es2020',
    minify: false,
  });
  const js = bundle.outputFiles[0]?.text ?? '';
  if (js.length === 0 || /node:|require\(/u.test(js)) {
    throw new Error('bundle non browser-safe — un import node a fui');
  }

  /* ── 2. Données réelles ──────────────────────────────────────────────── */
  const manuscript = readFileSync(`${RUN}/DOCTOR_V1.md`, 'utf8');
  const parts = manuscript.split(/^## Chapitre (\d+)/mu);
  const chapters: { chapter: number; prose: string }[] = [];
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const n = Number(parts[i]);
    const body = (parts[i + 1] ?? '').replace(/^[^\n]*\n/u, '').trim();
    if (Number.isFinite(n) && body.length > 0) chapters.push({ chapter: n, prose: body });
  }
  const ch5 = chapters.find((c) => c.chapter === 5)?.prose ?? '';
  const history = chapters.filter((c) => c.chapter < 5).map((c) => ({ chapter: c.chapter, prose: c.prose }));

  const candDir = `${RUN}/chap_001`;
  const adm = JSON.parse(readFileSync(`${candDir}/admission.json`, 'utf8')) as {
    candidates: readonly { profile: string; eligible: boolean; expScore: number }[];
  };
  const candidates = adm.candidates
    .filter((c) => existsSync(`${candDir}/candidate_${c.profile}.txt`))
    .map((c) => ({ id: c.profile, prose: readFileSync(`${candDir}/candidate_${c.profile}.txt`, 'utf8'), baseScore: c.expScore, eligible: c.eligible }));

  const data = {
    ch5: ch5.split(/\s+/u).slice(0, 600).join(' '), // début éditable (performance textarea)
    history: history.map((h) => ({ chapter: h.chapter, prose: h.prose })),
    knownCharacters: ['Léna', 'Garcia', 'Gaspard', 'Yvon', 'Henri'],
    seeds: ['naufrage', 'dette', 'lettre', 'carnet', 'registre'],
    candidates,
  };

  /* ── 3. Page ─────────────────────────────────────────────────────────── */
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>OMEGA WRITING STUDIO (phase 18 V1)</title>
<style>
body{font-family:system-ui;background:#0d1117;color:#e6edf3;margin:0;display:grid;grid-template-columns:1fr 420px;grid-template-rows:auto 1fr 300px;height:100vh}
header{grid-column:1/3;padding:10px 16px;background:#161b22;border-bottom:1px solid #30363d}h1{font-size:15px;margin:0}
.laws{font-size:11px;color:#8b949e;margin-top:4px}
#editor{grid-row:2;padding:12px;border:none;background:#0d1117;color:#e6edf3;font-family:Georgia,serif;font-size:15px;line-height:1.6;resize:none;outline:none}
#gps{grid-row:2;background:#161b22;border-left:1px solid #30363d;padding:12px;overflow-y:auto;font-size:12px}
#mixer{grid-column:1/3;grid-row:3;background:#10141a;border-top:1px solid #30363d;padding:10px 16px;overflow-y:auto;font-size:12px}
h2{font-size:12px;color:#7ee787;margin:10px 0 4px}.danger{color:#f85149}.route{margin:6px 0;padding:6px;background:#0d1117;border-radius:6px}.route b{color:#a371f7}
.risk{color:#8b949e;font-size:11px}.knob{display:inline-block;margin-right:18px}.knob label{display:block;font-size:11px;color:#8b949e}
table{border-collapse:collapse;margin-top:6px}td,th{padding:2px 10px;text-align:left;font-size:12px}tr.winner td{color:#7ee787;font-weight:600}
.weather span{display:inline-block;margin-right:10px}
</style></head><body>
<header><h1>OMEGA WRITING STUDIO — phase 18 V1 (moteur réel embarqué : radar C14 + routes + mixer C13)</h1>
<div class="laws" id="laws"></div></header>
<textarea id="editor" spellcheck="false"></textarea>
<div id="gps"><h2>GPS — tape pour mesurer…</h2></div>
<div id="mixer"><h2>POTARDS (re-sélection des 7 candidats réels du ch.1 — étage A inviolable)</h2><div id="knobs"></div><div id="ranking"></div></div>
<script>${js}</script>
<script>
const DATA = ${JSON.stringify(data)};
const E = document.getElementById('editor'); E.value = DATA.ch5;
document.getElementById('laws').textContent = OMEGA_STUDIO.STUDIO_LAWS.join('  ·  ');
let t = null;
function refreshGps(){
  const r = OMEGA_STUDIO.analyze(E.value, 5, DATA.history, DATA.knownCharacters, DATA.seeds);
  const el = document.getElementById('gps');
  if(!r.ok){ el.innerHTML = '<h2>GPS</h2><p>'+(r.error??'')+'</p>'; return; }
  const p = r.position; const w = p.emotionalWeather;
  el.innerHTML = '<h2>OÙ TU ES</h2>'
    + '<p>'+p.words+' mots · en scène : '+(p.charactersInScene.map(c=>c.name+(c.speaking?' (parle)':'')).join(', ')||'personne')+'</p>'
    + '<div class="weather"><span>TEN '+w.TENSION.toFixed(1)+'</span><span>MYS '+w.MYSTERE.toFixed(1)+'</span><span>ESP '+w.ESPOIR.toFixed(1)+'</span><span>ROM '+w.ROMANCE.toFixed(1)+'</span><span>VIO '+w.VIOLENCE.toFixed(1)+'</span></div>'
    + '<h2>DANGERS ('+p.dangers.length+')</h2>'
    + p.dangers.slice(0,6).map(d=>'<p class="danger">'+d.kind+' — '+d.detail.slice(0,90)+'</p>').join('')
    + '<h2>CHEMINS POSSIBLES (ordre alphabétique — à toi de choisir)</h2>'
    + (r.trajectories??[]).map(tr=>'<div class="route"><b>['+tr.type+']</b> '+tr.premise+'<div class="risk">risques : '+tr.risks.join(' ; ')+'</div></div>').join('');
}
E.addEventListener('input', ()=>{ clearTimeout(t); t = setTimeout(refreshGps, 600); });
refreshGps();
const knobsDiv = document.getElementById('knobs');
const settings = {};
for(const k of OMEGA_STUDIO.KNOB_IDS){
  const w = document.createElement('div'); w.className='knob';
  w.innerHTML = '<label>'+k+' <span id="v_'+k+'">0</span></label><input type="range" min="-100" max="100" value="0" id="k_'+k+'">';
  knobsDiv.appendChild(w);
  document.getElementById('k_'+k).addEventListener('input', (ev)=>{
    settings[k] = Number(ev.target.value)/100;
    document.getElementById('v_'+k).textContent = settings[k].toFixed(2);
    refreshMixer();
  });
}
function refreshMixer(){
  const r = OMEGA_STUDIO.remix(DATA.candidates, settings);
  const el = document.getElementById('ranking');
  if(r.error){ el.innerHTML = '<p>'+r.error+'</p>'; return; }
  el.innerHTML = '<table><tr><th>#</th><th>profil</th><th>base</th><th>ajusté</th><th>contributions</th></tr>'
    + r.ranked.map((c,i)=>'<tr class="'+(i===0?'winner':'')+'"><td>'+(i+1)+'</td><td>'+c.id+'</td><td>'+c.baseScore+'</td><td>'+c.adjustedScore+'</td><td>'+c.contributions.map(x=>x.knob+(x.delta>=0?'+':'')+x.delta.toFixed(1)).join(' ')+'</td></tr>').join('')
    + '</table><p style="color:#8b949e">changedWinner='+r.changedWinner+' · le gagnant reste un candidat ÉLIGIBLE (gates durs déjà passés)</p>';
}
refreshMixer();
</script></body></html>`;
  writeFileSync(`${RUN}/WRITING_STUDIO.html`, html, 'utf8');
  process.stdout.write(`STUDIO OK — bundle ${(js.length / 1024).toFixed(0)} Ko · candidats ${candidates.length} · history ${history.length} chap · html ${(html.length / 1024).toFixed(0)} Ko\n`);
}

main();
