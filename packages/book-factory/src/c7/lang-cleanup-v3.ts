/**
 * OMEGA — AP-1 : nettoyage franglais du V3 + re-certification (LANG_CLEAN).
 * Substitution lexicale DÉTERMINISTE (zéro régen, zéro arc touché), chaque
 * source = sous-chaîne unique. Puis buildCanonical → nouveau hash + LANG_CLEAN.
 * Autorisé : « garder le statut V3 patché, avec nouveau hash si correction » (3-IA).
 */

import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

import { AuthorDecisionLedger } from '../identity/author-seal.js';
import { buildCanonical } from './build-canonical.js';
import { scanEnglishResiduals } from '../doctor/lang-purity.js';

const OUT = 'runs/patch_v3';
const WORKING = `${OUT}/WORKING.md`;

/** Corrections FR (source unique → cible), choisies sur le contexte réel. */
const FIXES: ReadonlyArray<readonly [string, string]> = [
  ['carefully pliée', 'soigneusement pliée'],
  ['neutralité bothering', 'neutralité déconcertante'],
  ['volutes lentes, blending avec', 'volutes lentes, se mêlant à'],
  ['porté during des années', 'porté durant des années'],
  ['briser conjugates des secrets', 'briser des secrets'],
  ['ne fait que weighted les gens', 'ne fait que peser sur les gens'],
  ['que when on parle', 'que quand on parle'],
  ['tout would exploser', 'tout allait exploser'],
];

function rulesOnly(): AuthorDecisionLedger {
  const raw = readFileSync('../../nexus/proof/AUTHOR_DECISIONS.json', 'utf8');
  const parsed = JSON.parse(raw) as { decisions: Array<{ anchorExcerpt: string | null }> };
  return AuthorDecisionLedger.fromJson(JSON.stringify({ ledger: 'AUTHOR_DECISIONS', concept: 'CONCEPT-AUTHOR-SEAL-001', decisions: parsed.decisions.filter((d) => d.anchorExcerpt === null) }));
}

async function main(): Promise<void> {
  let text = readFileSync(WORKING, 'utf8');
  const before = scanEnglishResiduals(text);
  const applied: string[] = [];
  const missed: string[] = [];
  for (const [src, dst] of FIXES) {
    if (text.includes(src)) { text = text.split(src).join(dst); applied.push(`${src} → ${dst}`); }
    else missed.push(src);
  }
  writeFileSync(WORKING, text, 'utf8');
  const after = scanEnglishResiduals(text);

  const built = await buildCanonical(text, { authorLocks: rulesOnly(), enforceAuthorRules: true });
  if (!built.ok) { appendFileSync(`${OUT}/lang.log`, `BUILD_FAIL ${built.error.code}\n`, 'utf8'); process.exitCode = 1; return; }
  writeFileSync(`${OUT}/MANUSCRIT_V3_PATCHED.md`, built.value.text, 'utf8');
  const canonResiduals = scanEnglishResiduals(built.value.text);
  const cert = {
    phase: 'CERTIFIED_V3_PATCHED', date: '2026-06-09', revision: 'AP-1 lang-purity',
    CERTIFIED_V3_PATCHED_HASH: built.value.finalHash, supersedes: 'b7b6c036dbeb2a1c', baseHash: '3025744d35ea',
    words: built.value.words, cleanliness: built.value.cleanliness,
    langCleanup: { residualsBefore: before.length, fixesApplied: applied, fixesMissed: missed, residualsAfterCanonical: canonResiduals.length },
    patches: ['ch.21 reinforce', 'ch.46 reinforce', 'ch.49 reinforce', 'ch.16 payoff{clé}', 'ch.32 payoff{clé→registre}', '27/31/33 accepted as-is', 'AP-1 franglais cleanup (6)'],
  };
  writeFileSync(`${OUT}/CERTIFIED_V3_PATCHED.json`, JSON.stringify(cert, null, 2), 'utf8');
  appendFileSync(`${OUT}/lang.log`, `cleaned: before=${before.length} applied=${applied.length} missed=${missed.length} canonAfter=${canonResiduals.length} hash=${built.value.finalHash.slice(0, 16)}\n`, 'utf8');
  console.log(JSON.stringify({
    residualsBefore: before.map((r) => r.word), applied, missed,
    canonResidualsAfter: canonResiduals.map((r) => `${r.word}:${r.context}`),
    LANG_CLEAN: built.value.cleanliness.LANG_CLEAN, NARRATIVE_CLEAN: built.value.cleanliness.NARRATIVE_CLEAN,
    newHash: built.value.finalHash.slice(0, 16), words: built.value.words,
  }, null, 1));
}
main().catch((e: unknown) => { appendFileSync(`${OUT}/lang.log`, `FATAL ${String(e)}\n`, 'utf8'); process.exitCode = 1; });
