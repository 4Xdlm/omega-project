/** OMEGA — preuve EMP-16 du lexique mover élargi. Re-mesure 27/31/33 (cibles
 *  noMover) + 21/46/49 (renforcés) + 25 (contrôle KEEP) : agence PHYSIQUE vs
 *  CONFRONTATION. Contrôle de spécificité : un chapitre mort reste à 0. Distingue
 *  NO_MOVER_PHYSICAL de AGENCY_BY_CONFRONTATION (mandat ChatGPT). Ne modifie rien. */

import { readFileSync, writeFileSync } from 'node:fs';

import { importManuscript } from '../doctor/manuscript-import.js';
import { moverBreakdown } from './targeted-regen-guard.js';

const CAST = ['Léna', 'Garcia', 'Gaspard', 'Yvon', 'Henri', 'Squarcioni', 'Marchetti', 'Ker-Morvan', 'Thomas'];
const TARGETS = [21, 25, 27, 31, 33, 46, 49];
const DEAD = 'Le bureau se trouvait au fond du couloir. La table avait quatre pieds. Garcia se tenait là sans bouger. Léna occupait le coin gauche. La porte demeurait close. La pièce servait de réserve.';

function verdict(b: { physical: number; confrontation: number; total: number }): string {
  if (b.total === 0) return 'NO_AGENCY (vrai noMover → regen requis)';
  if (b.physical === 0) return 'AGENCY_BY_CONFRONTATION (faux noMover physique → ACCEPTER tel quel)';
  return 'HAS_PHYSICAL_AGENCY (déjà moteur)';
}

const imp = importManuscript(readFileSync('runs/duel_gemma/MANUSCRIT.md', 'utf8'));
if (!imp.ok) { console.error('IMPORT_FAIL'); process.exitCode = 1; }
else {
  const rows = TARGETS.map((ch) => {
    const prose = imp.value.chapters.find((c) => c.chapter === ch)?.prose ?? '';
    const b = moverBreakdown(prose, CAST);
    return { chapter: ch, ...b, verdict: verdict(b) };
  });
  const deadB = moverBreakdown(DEAD, CAST);
  const out = {
    phase: 'EMP-16 MOVERS_REMEASURE', date: '2026-06-09',
    rows,
    specificityControl: { ...deadB, pass: deadB.total === 0, note: 'chapitre mort doit rester total=0 (le lexique élargi reste spécifique)' },
    reading: 'physical = agence par verbe physique (ancien lexique) ; confrontation = agence par interrogation/regard/décision (ajout EMP-16). total=0 = vrai noMover.',
  };
  writeFileSync('runs/MOVERS_REMEASURE.json', JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify({ rows, specificityControl: out.specificityControl }, null, 1));
}
