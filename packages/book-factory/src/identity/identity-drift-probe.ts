/** OMEGA — AP-2 preuve : le détecteur coref-grade sur le V3 réel doit donner ZÉRO
 *  dérive (Francky a lu le livre comme unifié ; l'ancien co-occurrence hallucinait). */
import { readFileSync } from 'node:fs';

import { detectIdentityDrift } from './identity-drift.js';

const t = readFileSync('runs/patch_v3/MANUSCRIT_V3_PATCHED.md', 'utf8');
const d = detectIdentityDrift(t);
console.log(JSON.stringify({ driftCount: d.length, drifts: d, verdict: d.length === 0 ? 'PASS (zéro faux-positif sur V3)' : 'DRIFT DÉTECTÉ — investiguer' }, null, 1));
