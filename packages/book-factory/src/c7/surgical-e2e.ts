import { ScribeGatedRepairPort } from '../doctor/scribe-bridge.js';
const seg = "Elle avance pieds nus, la semelle de ses bottes restée accrochée à la porte.";
const directive = "[FAIT CANONIQUE] Léna portait ses bottes deux phrases plus tôt. [OBSERVÉ] « pieds nus, la semelle de ses bottes restée accrochée » — transition impossible. [ORDRE] Corrige cette violation physique (retrait explicite ou cohérence). N'altère rien d'autre.";
const port = new ScribeGatedRepairPort({ knownEntities: ['Léna', 'Garcia', 'Gaspard', 'Yvon', 'Henri'] });
const out = await port.rewriteSegment(directive, seg);
console.log(JSON.stringify({ changed: out !== seg, before: seg, after: out }, null, 2));
