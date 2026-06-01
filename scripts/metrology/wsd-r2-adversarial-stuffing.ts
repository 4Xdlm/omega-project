/**
 * OMEGA METROLOGY — WS-D R2 ADVERSARIAL KEYWORD-STUFFING TEST (CALC, autonome)
 * ============================================================================
 * Prouve que les capteurs CALC keyword (sensory_richness, corporeal_anchoring) sont
 * GAMEABLE : injecter une phrase bourrée de mots sensoriels/corporels FR fait BONDIR
 * le score sans améliorer la prose. => justifie R2 (remplacement sémantique non-gameable).
 * Le contre-test sémantique (focalisation/scoreSensoryDensity ne doit PAS bondir) = Ollama,
 * terminal Architecte (squelette à brancher). Ici on prouve la faille keyword en CALC.
 * 0 Ollama, 0 patch. Run via node+tsx.
 */
import { readFileSync, existsSync } from 'node:fs';
import * as path from 'node:path';
import { SOVEREIGN_CONFIG } from '../../packages/sovereign-engine/src/config.js';
const REPO = path.resolve(process.cwd(), process.cwd().endsWith('sovereign-engine') ? '../..' : '.');
const CACHE = path.join(REPO,'omega-autopsie','gutenberg_cache');
function log(s:string){process.stderr.write(s+'\n');}
function words(s:string){return s.split(/\s+/).filter(w=>w.length>0).length;}
const SENSORY:Record<string,string[]>={sight:['voir','regard','yeux','lumière','ombre','couleur'],sound:['entendre','bruit','voix','silence','écho','murmure'],touch:['toucher','peau','contact','texture','caresser'],smell:['odeur','parfum','sentir','arôme'],temperature:['chaud','froid','glacé','brûlant','chaleur']};
function sensory(p:string){const lp=p.toLowerCase();let n=0;for(const c of Object.keys(SENSORY))if(SENSORY[c].some(m=>lp.includes(m)))n++;return n/5*100;}
function corporeal(p:string){const lp=p.toLowerCase();let c=0;for(const m of (SOVEREIGN_CONFIG as any).CORPOREAL_MARKERS)if(lp.includes(m))c++;return Math.min(c/(SOVEREIGN_CONFIG as any).CORPOREAL_TARGET,1)*100;}
function cleanG(raw:string){let t=raw;const s=t.search(/\*\*\*\s*START OF (THE|THIS)? ?PROJECT GUTENBERG/i);if(s>=0)t=t.slice(t.indexOf('\n',s)+1);return t;}
// phrase de STUFFING : sémantiquement creuse mais bourrée de mots-clés capteur
const STUFF = " La lumière, l'ombre, la couleur, le bruit, la voix, l'odeur, le parfum, le chaud, le froid : peau, main, doigts, souffle, regard, chaleur glacée, texture brûlante.";
function main(){
  log('=== WS-D R2 ADVERSARIAL KEYWORD-STUFFING (CALC) ===');
  const books=['flaubert_bovary_14155.txt','melville_moby_2701.txt','austen_pride_1342.txt'];
  log('\npassage | sensory base->stuffé | corporeal base->stuffé');
  for(const b of books){ const fp=path.join(CACHE,b); if(!existsSync(fp))continue;
    const text=cleanG(readFileSync(fp,'utf8')); const para=text.split(/\n\s*\n/).map(p=>p.replace(/\s+/g,' ').trim()).filter(p=>words(p)>=200)[5]||''; if(!para)continue;
    const sB=sensory(para),cB=corporeal(para); const stuffed=para+STUFF; const sS=sensory(stuffed),cS=corporeal(stuffed);
    log(`  ${b.split('_')[0].padEnd(10)} sensory ${sB.toFixed(0)}->${sS.toFixed(0)} (+${(sS-sB).toFixed(0)}) | corporeal ${cB.toFixed(0)}->${cS.toFixed(0)} (+${(cS-cB).toFixed(0)})`);
  }
  log('\nVERDICT : une seule phrase de mots-clés (sémantiquement creuse) gonfle sensory/corporeal.');
  log('=> capteurs keyword GAMEABLE par stuffing -> inaptes en gating qualité. R2 doit utiliser');
  log('   un juge sémantique (scoreSensoryDensity LLM : note la QUALITÉ/spécificité, pas la présence)');
  log('   qui ne bondit PAS sur du stuffing. Contre-test sémantique = terminal Ollama (EMP-16 triple-preuve).');
}
main();
