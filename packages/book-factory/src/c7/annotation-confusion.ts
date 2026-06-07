/**
 * OMEGA — GOLD-SET V3 : DÉPOUILLEMENT (script BF-08) — matrice de confusion
 * HUMAIN vs LABELS-IA vs REGEX-V2. Entrée : GOLDSET_V3_HUMAN_LABELS.json
 * (exporté par l'outil d'annotation). Si accord humain-IA élevé → labels gelés
 * avec hash = Gold-Set V3 SCELLÉ ; désaccords listés pour arbitrage.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

import { sha256, canonicalize } from '@omega/canon-kernel';

import { PROXY_GOLDSET, benchRevelationProxy } from '../goldset/proxy-goldset.js';
import { REVELATION_RE } from '../coherence/arc-coherence.js';

const RUN = process.env['ANNOT_RUN'] ?? 'runs/c8_book60k';
const HUMAN_FILE = process.env['HUMAN_LABELS'] ?? `${RUN}/GOLDSET_V3_HUMAN_LABELS.json`;

function main(): void {
  if (!existsSync(HUMAN_FILE)) {
    process.stdout.write(`EN ATTENTE : ${HUMAN_FILE} absent — l'Architecte n'a pas encore annoté (ANNOTATION_GOLDSET_V3.html).\n`);
    return;
  }
  const human = JSON.parse(readFileSync(HUMAN_FILE, 'utf8')) as { annotator: string; answers: Record<string, boolean> };

  let agree = 0;
  const disagreements: { id: string; text: string; ia: boolean; human: boolean }[] = [];
  for (const ex of PROXY_GOLDSET) {
    const h = human.answers[ex.id];
    if (h === undefined) continue;
    if (h === ex.revelation) agree += 1;
    else disagreements.push({ id: ex.id, text: ex.text, ia: ex.revelation, human: h });
  }
  const total = Object.keys(human.answers).length;
  const agreementRate = total > 0 ? agree / total : 0;

  // Bench de la regex V2 contre les labels HUMAINS (la vraie V3).
  const humanTruth = new Map(Object.entries(human.answers));
  const v2VsHuman = benchRevelationProxy((t) => REVELATION_RE.test(t)); // vs labels IA (référence)
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (const ex of PROXY_GOLDSET) {
    const h = humanTruth.get(ex.id);
    if (h === undefined) continue;
    const hit = REVELATION_RE.test(ex.text);
    if (h && hit) tp += 1; else if (h && !hit) fn += 1; else if (!h && hit) fp += 1; else tn += 1;
  }
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);

  const sealed = disagreements.length === 0
    ? { status: 'V3_SEALED', labelsHash: String(sha256(canonicalize(human.answers))) }
    : { status: 'ARBITRATION_REQUIRED', disagreements };

  const report = {
    annotator: human.annotator,
    annotated: total,
    agreementHumanVsIA: Number(agreementRate.toFixed(3)),
    regexV2_vsHumanLabels: { precision: Number(precision.toFixed(3)), recall: Number(recall.toFixed(3)) },
    regexV2_vsIALabels: { precision: v2VsHuman.precision, recall: v2VsHuman.recall },
    ...sealed,
  };
  writeFileSync(`${RUN}/GOLDSET_V3_CONFUSION.json`, JSON.stringify(report, null, 2), 'utf8');
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
