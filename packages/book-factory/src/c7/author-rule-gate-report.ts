/** OMEGA — preuve sur DONNÉES RÉELLES : oppose le ledger AUTHOR_DECISIONS.json
 *  (16 décisions, dont les 7 stations) au manuscrit V3 gemma4. Répond à « est-ce
 *  que le gate gate vraiment le livre de prod, et sans faux-positif ? ». Écrit
 *  runs/AUTHOR_RULE_GATE_V3.json. Ne modifie rien. */

import { readFileSync, writeFileSync } from 'node:fs';

import { AuthorDecisionLedger } from '../identity/author-seal.js';
import { importManuscript } from '../doctor/manuscript-import.js';
import { enforceAuthorRules } from './author-rule-gate.js';

const ledger = AuthorDecisionLedger.fromJson(readFileSync('../../nexus/proof/AUTHOR_DECISIONS.json', 'utf8'));
const imp = importManuscript(readFileSync('runs/duel_gemma/MANUSCRIT.md', 'utf8'));
if (!imp.ok) { console.error('IMPORT_FAIL', JSON.stringify(imp.error)); process.exitCode = 1; }
else {
  const chapters = imp.value.chapters.map((c) => ({ chapter: c.chapter, prose: c.prose }));
  const report = enforceAuthorRules(ledger.activeLocks(), chapters);
  const out = {
    phase: 'AUTHOR_RULE_GATE on V3 gemma4', date: '2026-06-09',
    activeDecisions: ledger.activeLocks().length, chapters: chapters.length,
    classifications: report.classifications.map((c) => ({ decisionId: c.decisionId, chapter: c.chapter, enforcement: c.enforcement, checker: c.checker, reason: c.reason })),
    enforceable: report.enforceable, advisories: report.advisories,
    violations: report.violations, passed: report.passed,
    reading: report.passed
      ? 'V3 PASSE les règles ENFORCEABLE — cohérent avec la relecture humaine (S7 « zéro butée »). Gate non-faux-positif sur le livre réel.'
      : 'V3 ÉCHOUE ≥1 règle ENFORCEABLE — le gate mord sur le livre réel (à corriger avant certification, ou faux-positif à investiguer).',
  };
  writeFileSync('runs/AUTHOR_RULE_GATE_V3.json', JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify({ passed: report.passed, enforceable: report.enforceable, advisories: report.advisories, violationCount: report.violations.length, violations: report.violations.slice(0, 8) }, null, 1));
}
