/**
 * OMEGA — C8+ — RE-SÉLECTION JUGÉE OFFLINE (script BF-08) — l'étage B VIVANT sur
 * candidats RÉELS persistés : tournoi pairwise double-ordre (juge APPROVED gemma4)
 * sur les candidats d'un chapitre du run 60k, puis judgedSelect vs gagnant d'origine.
 * AUCUNE régénération, AUCUNE mutation du run : sortie = rapport séparé.
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

import { openJudgePort, runTournament, judgedSelect } from '../loop/judge-port.js';
import type { CoreProfileId } from '../loop/r6-core.js';
import type { AdmissionRecord } from '../loop/r6-core.js';
import { OllamaPairwiseJudge } from './ollama-judge.js';
import { PERSONA_PROMPT_EXPECTED_SHA256 } from './persona-prompt.js';
import type { Sha256Hex } from '../identity/identity-types.js';

const RUN = process.env['RESELECT_RUN'] ?? 'runs/c8_book60k';
const CHAP = process.env['RESELECT_CHAP'] ?? '001';
const MODEL = process.env['RESELECT_MODEL'] ?? 'gemma4:31b';

async function main(): Promise<void> {
  // Port gaté : profil APPROVED signé (registre persona_judge_gemma4, 2026-06-06).
  const port = openJudgePort({
    status: 'APPROVED',
    model: MODEL,
    promptSha256: PERSONA_PROMPT_EXPECTED_SHA256 as Sha256Hex,
    temperature: 0,
    approvedBy: 'Francky (Architecte), signature dispatch 2026-06-06',
  });
  if (!port.ok) throw new Error(`port refusé: ${port.error.code}`);

  const dir = `${RUN}/chap_${CHAP}`;
  const record = JSON.parse(readFileSync(`${dir}/admission.json`, 'utf8')) as AdmissionRecord;
  const eligible = readdirSync(dir)
    .filter((f) => f.startsWith('candidate_') && f.endsWith('.txt'))
    .map((f) => ({
      profile: f.replace('candidate_', '').replace('.txt', '') as CoreProfileId,
      prose: readFileSync(`${dir}/${f}`, 'utf8'),
    }))
    .filter((c) => record.candidates.some((rc) => rc.profile === c.profile && rc.eligible));

  const judge = new OllamaPairwiseJudge(MODEL); // Power-On Self-Test inclus
  const t0 = Date.now();
  const tournament = await runTournament(judge, eligible);
  const sel = judgedSelect(record, tournament);

  const report = {
    run: RUN, chapter: CHAP, judge: MODEL, eligibleCount: eligible.length,
    duels: tournament.duels, calls: tournament.duels * 2, ms: Date.now() - t0,
    points: Object.fromEntries(tournament.points),
    originalWinner: record.winner, judgedWinner: sel.winner, changedWinner: sel.changedWinner,
    adjusted: sel.adjusted, tournamentHash: String(sel.tournamentHash),
  };
  writeFileSync(`${RUN}/JUDGED_RESELECT_ch${CHAP}.json`, JSON.stringify(report, null, 2), 'utf8');
  process.stdout.write(`${JSON.stringify({ changed: sel.changedWinner, original: record.winner, judged: sel.winner, points: report.points })}\n`);
}

main().catch((e: unknown) => {
  process.stderr.write(`FATAL ${String(e)}\n`);
  process.exitCode = 1;
});
