/** OMEGA — sonde : quel ledger pour re-certifier le V3 gemma pendant Patch V3 ?
 *  Les SPAN anchors (bottes, « comme un couvercle ») sont V2/88k-spécifiques → ne
 *  doivent PAS casser le build du V3 gemma. Les RÈGLES (vitalité) si. Prouve le
 *  bon ledger + capture le hash certifié de base V3 (pré-patch). Ne modifie rien. */

import { readFileSync } from 'node:fs';

import { AuthorDecisionLedger } from '../identity/author-seal.js';
import { buildCanonical } from './build-canonical.js';

interface RawDecision { readonly anchorExcerpt: string | null }

async function main(): Promise<void> {
  const raw = readFileSync('../../nexus/proof/AUTHOR_DECISIONS.json', 'utf8');
  const parsed = JSON.parse(raw) as { decisions: RawDecision[] };
  const full = AuthorDecisionLedger.fromJson(raw);
  const rulesOnly = AuthorDecisionLedger.fromJson(JSON.stringify({ ledger: 'AUTHOR_DECISIONS', concept: 'CONCEPT-AUTHOR-SEAL-001', decisions: parsed.decisions.filter((d) => d.anchorExcerpt === null) }));
  const text = readFileSync('runs/duel_gemma/MANUSCRIT.md', 'utf8');

  const a = await buildCanonical(text, { authorLocks: full, enforceAuthorRules: true });
  const b = await buildCanonical(text, { authorLocks: rulesOnly, enforceAuthorRules: true });
  console.log(JSON.stringify({
    fullLedger: a.ok ? 'OK' : a.error.code,
    rulesOnlyLedger: b.ok ? `OK hash=${b.value.finalHash.slice(0, 12)} words=${b.value.words} vitality=PASS` : b.error.code,
    ruleDecisions: parsed.decisions.filter((d) => d.anchorExcerpt === null).length,
    anchorDecisions: parsed.decisions.filter((d) => d.anchorExcerpt !== null).length,
  }, null, 1));
}
main().catch((e: unknown) => { console.error('PROBE_FAIL', String(e)); process.exitCode = 1; });
