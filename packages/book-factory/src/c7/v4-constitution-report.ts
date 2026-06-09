/** OMEGA — AP-5 : écrit le rapport de readiness de la Constitution V4 (spec). */
import { writeFileSync } from 'node:fs';

import { checkV4Constitution, V4_CONSTITUTION } from './v4-constitution.js';

const r = checkV4Constitution();
const out = { phase: 'CONSTITUTION_V4_READINESS', date: '2026-06-09', ready: r.ready, checks: r.checks, config: V4_CONSTITUTION };
writeFileSync('runs/CONSTITUTION_V4_READINESS.json', JSON.stringify(out, null, 2), 'utf8');

const md = [
  '# CONSTITUTION V4 — readiness (génération HOLD Architecte)',
  `**Prêt : ${r.ready ? 'OUI — V4 peut être dispatché sous Constitution' : 'NON'}**. Aucun octet généré. La GÉNÉRATION attend ton dispatch.`,
  '',
  '| Composant | prêt | détail |',
  '|:--|:--|:--|',
  ...r.checks.map((c) => `| ${c.component} | ${c.ready ? '✅' : '❌'} | ${c.detail} |`),
  '',
  '## Ce que V4 appliquera (config figée)',
  `- **Scribe** : ${V4_CONSTITUTION.scribe} · **Rythme** : ${V4_CONSTITUTION.rhythm.mode} (déciles maîtres FR) · **Escalade** : ${V4_CONSTITUTION.escalation}`,
  `- **Gates de build** : enforceAuthorRules=${String(V4_CONSTITUTION.buildGates.enforceAuthorRules)} ; opposables = ${V4_CONSTITUTION.buildGates.enforceable.join(' + ')} ; propreté = ${V4_CONSTITUTION.buildGates.cleanliness.join('/')}`,
  `- **Filet** : ${V4_CONSTITUTION.filet}`,
  `- **Interdits** : ${V4_CONSTITUTION.interdits.join(' · ')}`,
  '',
  '> Différence avec le V3 (duel brut) : V4 naîtrait DÉJÀ sous les lois — rythme des maîtres, exemplars dramatiques, et 3 gates dures (vitalité + identité + langue) à chaque chapitre via le filet. Le V3 a dû être patché a posteriori ; le V4 préviendrait les défauts à la source. **Mais la décision de lancer reste la tienne** (socle few-shot ? livre neuf ? rien ?).',
].join('\n');
writeFileSync('runs/CONSTITUTION_V4_SPEC.md', md, 'utf8');
console.log(JSON.stringify({ ready: r.ready, components: r.checks.map((c) => `${c.component}:${c.ready ? 'OK' : 'MISSING'}`) }, null, 1));
