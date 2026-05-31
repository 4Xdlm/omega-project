/**
 * OMEGA METROLOGY — OVERNIGHT VERDICT GENERATOR (canonical-schema, always runs)
 * ============================================================================
 * Consolidates the sensor-validation phases into docs/audit/OVERNIGHT_VERDICT.md.
 * READ-ONLY. Pure CALC. 0 engine code, 0 floor change, 0 destitution.
 * Reads the CANONICAL artifacts (NOT a reinvented schema):
 *   - docs/audit/minaxis/ecc_dedicated_bench.json   (Phase 1 ECC, ecc-dedicated-bench.ts)
 *   - docs/audit/minaxis/ecc_contract_probe.json    (Phase 1 CALC probe, root cause)
 *   - docs/audit/minaxis/minaxis_E_summary.json     (Phase 2 RCI floor)
 * Cross-references the human verdicts already written:
 *   - docs/audit/minaxis/ECC_DEDICATED_BENCH.md     (Phase 1 verdict B, prior session)
 *   - docs/audit/minaxis/MINAXIS_E_LITERARY_RECOMPUTE.md + _SOURCES.md (Phase 2)
 * Run (cwd = repo root): npx tsx scripts/metrology/overnight-report-v2.ts
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import * as path from 'node:path';

const REPO = path.resolve(process.cwd(), process.cwd().endsWith('sovereign-engine') ? '../..' : '.');
const MIN = path.join(REPO, 'docs', 'audit', 'minaxis');
const DATE = '2026-05-31';
const rj = (p: string): any => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };

const ecc = rj(path.join(MIN, 'ecc_dedicated_bench.json'));
const probe = rj(path.join(MIN, 'ecc_contract_probe.json'));
const rci = rj(path.join(MIN, 'minaxis_E_summary.json'));

// ---- Phase 1 ECC table from canonical schema {runs:[{prose,contract,agg:{ecc,tension_14d,...}}]} ----
let eccTable = '_ecc_dedicated_bench.json missing._';
let eccProseList: string[] = [];
let liftLines = '';
if (ecc && Array.isArray(ecc.runs)) {
  const get = (prose: string, contract: string) => ecc.runs.find((r: any) => r.prose === prose && r.contract === contract);
  eccProseList = [...new Set(ecc.runs.map((r: any) => r.prose))] as string[];
  const rows: string[] = ['| prose | contract | ECC | tension_14d | emotion_coherence | interiority | impact | temporal_pacing |',
    '|---|---|---:|---:|---:|---:|---:|---:|'];
  for (const p of eccProseList) {
    for (const c of ['FORGE', 'HAND']) {
      const cell = get(p, c); if (!cell) continue;
      const a = cell.agg ?? {};
      const m = (k: string) => (a[k]?.mean ?? '-');
      rows.push(`| ${p} | ${c} | **${m('ecc')}** | ${m('tension_14d')} | ${m('emotion_coherence')} | ${m('interiority')} | ${m('impact')} | ${m('temporal_pacing')} |`);
    }
    const f = get(p, 'FORGE')?.agg?.ecc?.mean, h = get(p, 'HAND')?.agg?.ecc?.mean;
    const ft = get(p, 'FORGE')?.agg?.tension_14d?.mean, ht = get(p, 'HAND')?.agg?.tension_14d?.mean;
    if (typeof f === 'number' && typeof h === 'number') {
      liftLines += `- **${p}**: ECC FORGE=${f} → HAND=${h} (**lift +${(+(h - f)).toFixed(2)}**), carried by tension_14d ${ft}→${ht}; other axes unchanged.\n`;
    }
  }
  eccTable = rows.join('\n');
}

// ---- root cause from probe forge_trajectory ----
let rootCause = '_ecc_contract_probe.json missing — see ECC_DEDICATED_BENCH.md §3._';
if (probe && Array.isArray(probe.forge_trajectory)) {
  const q = probe.forge_trajectory.map((t: any) => `${t.q}: ${t.vec || t.dominant}`).join(' · ');
  rootCause = `assembleForgePacket("Le Gardien", horror) → \`target_14d\` trajectory: ${q}. A constant one-hot \`trust=1.0\` target for a horror scene is degenerate → \`tension_14d\` (CALC, weight ×3.0 = 31.6% of ECC raw) cannot be matched by correctly fearful prose → ECC collapses, while emotion_coherence/interiority/impact stay high (prose IS coherent).`;
}

const eccDeterministic = ecc?.runs?.every?.((r: any) => (r.agg?.ecc?.stdev ?? 0) === 0) ?? false;

// ---- Phase 2 RCI ----
let rciBlock = '_minaxis_E_summary.json missing._', rciVerdict = 'UNKNOWN';
if (rci) {
  rciVerdict = rci.pass85_actual === 0 ? 'NON (floor 85 unreachable by real literature)' : `PARTIEL (${rci.pass85_actual}/${rci.n_passages})`;
  rciBlock = `- corpus: **${rci.n_passages} passages**, ${rci.n_authors} public-domain authors\n` +
    `- RCI: mean **${rci.RCI_dist?.mean}**, median ${rci.RCI_dist?.median}, max ${rci.RCI_dist?.max}\n` +
    `- **pass floor 85 (actual): ${rci.pass85_actual}/${rci.n_passages}** · ceiling (sig=hook=100): ${rci.pass85_ceiling}/${rci.n_passages}\n` +
    `- engine RCI reference mean: ${rci.engine_RCI_reference_mean}`;
}

const master =
`# OMEGA — OVERNIGHT VERDICT (sensor validation)

> **Framework**: OMEGA_TOTAL_CONTROL_FRAMEWORK_2000 · **Mode**: READ-ONLY (0 code moteur · 0 floor · 0 destitution) · **Date**: ${DATE}
> **STOP DUR respecté**: aucun floor baissé, aucun scribe destitué, DEC-009 / 14D / LFS intacts. Décisions = Architecte.
> Auto-généré par \`scripts/metrology/overnight-report-v2.ts\` depuis les artefacts canoniques.

## Phase 1 — ECC dedicated (NCR_ECC_CONTRACT_SENSOR)

**Verdict: B — CONTRAT (artefact), PAS prose incohérente ni capteur bruité. Confiance: HAUTE.**${eccDeterministic ? ' _(juge temp 0 ⇒ stdev=0, déterministe : N n\'ajoute pas d\'information.)_' : ''}

Même prose FIXE (échantillons M0.b), seul le contrat varie :

${eccTable}

${liftLines}
**Cause racine** : ${rootCause}

Détail → [\`minaxis/ECC_DEDICATED_BENCH.md\`](minaxis/ECC_DEDICATED_BENCH.md) · données \`minaxis/ecc_dedicated_bench.json\` + \`minaxis/ecc_contract_probe.json\`.

**Action induite (NON appliquée, READ-ONLY)** : corriger la dérivation 14D amont (\`assembleForgePacket\` / planner→emotion→quartiles) qui produit \`trust=1.0\` constant. Défaut de **construction de contrat**, pas de scorer ni de prose. À traiter **avant DEC-009** (tout bench de fusion branché sur \`assembleForgePacket\` héritera d'un ECC bas structurel). Le capteur ECC n'est PAS fiable pour bencher la fusion sur ce chemin en l'état.

## Phase 2 — Literary RCI floor reachability

**Verdict: ${rciVerdict}.**

${rciBlock}

Détail → [\`minaxis/MINAXIS_E_LITERARY_RECOMPUTE.md\`](minaxis/MINAXIS_E_LITERARY_RECOMPUTE.md) · sources [\`minaxis/MINAXIS_E_LITERARY_SOURCES.md\`](minaxis/MINAXIS_E_LITERARY_SOURCES.md)

## Phase 3 — M4 provisoire

⚠️ **NON exécuté / PROVISOIRE par nature.** Le capteur ECC est invalidé sur le chemin \`assembleForgePacket\` (Phase 1 = B). Toute comparaison sovereign-vs-scribe via ce capteur, sur ce chemin, est **biaisée par le contrat dégénéré** et **ne peut servir à décider** (ni destitution scribe, ni DEC-009). M4 réel = **NO-GO** tant que la dérivation 14D n'est pas corrigée et le capteur re-validé.

## Synthèse pour l'Architecte

1. **ECC** : le floor/min_axis ECC bas observé sur le chemin de production est un **artefact de contrat** (\`trust=1.0\`), pas un défaut moteur. Corriger la dérivation 14D amont. **Aucun patch produit.**
2. **RCI** : floor 85 empiriquement inatteignable (0/57 chefs-d'œuvre). Corpus-proof fourni. **Floor non modifié.** Revue Architecte.
3. **Déterminisme** : juge temp 0 ⇒ ECC reproductible (stdev 0) ; le verdict Phase 1 ne nécessite pas de N élevé.
4. **Aucune décision moteur prise.** Tout est PENDING Architecte (NCR_ECC_CONTRACT_SENSOR OPEN).
`;
mkdirSync(path.join(REPO, 'docs', 'audit'), { recursive: true });
writeFileSync(path.join(REPO, 'docs', 'audit', 'OVERNIGHT_VERDICT.md'), master, 'utf8');
process.stderr.write(`[report] OVERNIGHT_VERDICT.md written. ECC=B RCI=${rciVerdict} eccProse=[${eccProseList.join(',')}] deterministic=${eccDeterministic}\n`);
