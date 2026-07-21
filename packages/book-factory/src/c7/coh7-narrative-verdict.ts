/**
 * OMEGA — REPLAY_BUILDCANONICAL_COH7_FULL (ordre tribunal 2/2, 2026-07-19).
 * Requalification COMPLÈTE de MANUSCRIT_V4_COH7 par buildCanonical 5 niveaux :
 * SYNTAX/SEAM/SEMANTIC/NARRATIVE/LANG + AUTHOR_LOCKS + règles d'auteur ENFORCÉES
 * (config production). Verdict honnête + diff vs référence V2 b438250e
 * (seul NARRATIVE_CLEAN=TRUE historique : clones 0, tics 1.23, résidu 0).
 * Lecture seule — AUCUNE modification du manuscrit.
 *   tsx src/c7/coh7-narrative-verdict.ts   (cwd = book-factory)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { AuthorDecisionLedger } from '../identity/author-seal.js';
import { buildCanonical } from './build-canonical.js';

const INPUT = 'runs/atlas/MANUSCRIT_V4_COH7.md';
const OUT = 'runs/atlas/COH7_NARRATIVE_CLEAN_VERDICT.json';

// Référence historique (Decision Ledger V2-LANDED, hash b438250e) — chiffres consignés.
const V2_REF = { hash: 'b438250e', narrativeClean: true, ticPer1000w: 1.23, incipitClones: 0, semanticResidual: 0 };

interface RawDecision { readonly anchorExcerpt: string | null }
function ledgers(): { full: AuthorDecisionLedger; rulesOnly: AuthorDecisionLedger; anchored: number } {
  const raw = readFileSync('../../nexus/proof/AUTHOR_DECISIONS.json', 'utf8');
  const parsed = JSON.parse(raw) as { decisions: RawDecision[] };
  const mk = (ds: RawDecision[]): AuthorDecisionLedger => AuthorDecisionLedger.fromJson(JSON.stringify({ ledger: 'AUTHOR_DECISIONS', concept: 'CONCEPT-AUTHOR-SEAL-001', decisions: ds }));
  const anchored = parsed.decisions.filter((d) => d.anchorExcerpt !== null);
  return { full: mk(parsed.decisions), rulesOnly: mk(parsed.decisions.filter((d) => d.anchorExcerpt === null)), anchored: anchored.length };
}
// Combien d'ancres V3 survivent textuellement dans COH7 (informatif : le V4 est restructuré).
function anchorsResolved(text: string): { resolved: number; total: number; missing: string[] } {
  const raw = readFileSync('../../nexus/proof/AUTHOR_DECISIONS.json', 'utf8');
  const parsed = JSON.parse(raw) as { decisions: Array<{ anchorExcerpt: string | null }> };
  const anchors = parsed.decisions.map((d) => d.anchorExcerpt).filter((a): a is string => a !== null);
  const missing = anchors.filter((a) => !text.includes(a));
  return { resolved: anchors.length - missing.length, total: anchors.length, missing: missing.map((m) => m.slice(0, 60)) };
}

async function main(): Promise<void> {
  const text = readFileSync(INPUT, 'utf8');
  const { rulesOnly, anchored } = ledgers();
  const anchorState = anchorsResolved(text);

  // BUILD PRODUCTION V4 : règles d'auteur ENFORCÉES ; locks = rules-only (les ancres V3
  // ne peuvent pas être opposées à un texte restructuré — état reporté honnêtement à part).
  const build = await buildCanonical(text, { authorLocks: rulesOnly, enforceAuthorRules: true });

  if (!build.ok) {
    const out = { verdict: 'BUILD_FAIL', error: build.error, anchorState, anchoredDecisionsExcluded: anchored };
    writeFileSync(OUT, JSON.stringify(out, null, 1), 'utf8');
    console.log(`COH7_VERDICT BUILD_FAIL code=${build.error.code} detail=${build.error.detail.slice(0, 200)}`);
    return;
  }
  const r = build.value;
  const c = r.cleanliness;
  const ticOk = c.detail.maxTicPer1000w <= (V2_REF.ticPer1000w * 2); // contexte, pas gate
  const out = {
    input: INPUT,
    finalHash: r.finalHash,
    words: r.words,
    cleanliness: c,
    authorRules: 'ENFORCED (aucune violation sinon BUILD_FAIL)',
    anchoredDecisionsV3: { excludedFromLocks: anchored, textuallyPresentInCoh7: anchorState.resolved, of: anchorState.total, missingSample: anchorState.missing.slice(0, 10) },
    vsV2Reference: {
      ref: V2_REF,
      narrativeClean: `${c.NARRATIVE_CLEAN} (V2: ${V2_REF.narrativeClean})`,
      incipitClones: `${c.detail.incipitClones} (V2: ${V2_REF.incipitClones})`,
      maxTicPer1000w: `${c.detail.maxTicPer1000w.toFixed(2)} (V2: ${V2_REF.ticPer1000w})`,
      semanticResidual: `${c.detail.semanticResidual} (V2: ${V2_REF.semanticResidual})`,
      ticWithinContext: ticOk,
    },
    statuses: {
      COH7_STYLE_CLEAN: 'PASS (chaîne COH5-7 mesurée)',
      COH7_LANG_CLEAN: c.LANG_CLEAN ? 'PASS' : 'FAIL',
      COH7_SYNTAX_CLEAN: c.SYNTAX_CLEAN ? 'PASS' : 'FAIL',
      COH7_SEAM_CLEAN: c.SEAM_CLEAN ? 'PASS' : 'FAIL',
      COH7_SEMANTIC_CLEAN: c.SEMANTIC_CLEAN ? 'PASS' : 'FAIL',
      COH7_NARRATIVE_CLEAN: c.NARRATIVE_CLEAN ? 'PASS' : 'FAIL',
      COH7_AUTHOR_LOCKS: c.AUTHOR_LOCKS_INTACT ? 'INTACT' : 'BROKEN',
      COH7_PUBLISH_READY: 'HOLD (oreille auteur)',
    },
  };
  writeFileSync(OUT, JSON.stringify(out, null, 1), 'utf8');
  console.log(`COH7_VERDICT hash=${r.finalHash.slice(0, 12)} words=${r.words} | SYNTAX=${c.SYNTAX_CLEAN} SEAM=${c.SEAM_CLEAN} SEMANTIC=${c.SEMANTIC_CLEAN} NARRATIVE=${c.NARRATIVE_CLEAN} LANG=${c.LANG_CLEAN} LOCKS=${c.AUTHOR_LOCKS_INTACT}`);
  console.log(`detail: incipitClones=${c.detail.incipitClones} maxTic=${c.detail.maxTicPer1000w.toFixed(2)}/1000w semRes=${c.detail.semanticResidual} brokenComp=${c.detail.brokenComparisons} funcRedund=${c.detail.functionalRedundancies} english=${c.detail.englishResiduals} seamRes=${c.detail.seamResidual} scaffold=${c.detail.scaffoldResidual} quoteDelta=${c.detail.quoteDelta} endComplete=${c.detail.bookEndComplete}`);
  console.log(`locks: active=${c.detail.activeLocksTotal} span=${c.detail.spanLocksIntact} pending=${c.detail.decisionLocksPendingExecution} unresolved=${c.detail.unresolvedLocks} | anchored V3 present in COH7: ${anchorState.resolved}/${anchorState.total}`);
}
main().catch((e: unknown) => { console.error('FATAL', e); process.exitCode = 1; });
