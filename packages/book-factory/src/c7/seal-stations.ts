/**
 * OMEGA — Scellement des 8 STATIONS de relecture (GO Francky 2026-06-09, « sceller
 * maintenant »). Charge le ledger existant, scelle les 8 SealInput stagés dans
 * STATION_SEALS_READY.json (append-only, INV-AUTHOR-SEAL-004), réécrit
 * nexus/proof/AUTHOR_DECISIONS.json. Les 9 décisions existantes sont préservées.
 * Le seal() n'est appelé QUE sur réponse humaine (loi author-seal) — obtenue.
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { AuthorDecisionLedger } from '../identity/author-seal.js';
import type { SealInput } from '../identity/author-seal.js';

const LEDGER = '../../nexus/proof/AUTHOR_DECISIONS.json';
const STAGE = '../../nexus/proof/STATION_SEALS_READY.json';

const ledger = AuthorDecisionLedger.fromJson(readFileSync(LEDGER, 'utf8'));
const before = ledger.all().length;
const stage = JSON.parse(readFileSync(STAGE, 'utf8')) as { readonly pending_seals: ReadonlyArray<{ readonly station: string; readonly sealInput: SealInput }> };

const sealed: string[] = [];
const failed: string[] = [];
for (const p of stage.pending_seals) {
  const r = ledger.seal({ ...p.sealInput, decidedAt: '2026-06-09' });
  if (r.ok) sealed.push(`${p.station}=${r.value.decisionId}`);
  else { failed.push(`${p.station}:${r.error.code}`); process.exitCode = 1; }
}

if (failed.length === 0) writeFileSync(LEDGER, `${ledger.toJson()}\n`, 'utf8');
console.log(JSON.stringify({ before, after: ledger.all().length, expectedAfter: before + stage.pending_seals.length, sealed, failed }, null, 1));
