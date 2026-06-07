/**
 * OMEGA — SCELLEMENT GOLD-SET V3 (mandat Gemini, tribunal validé par Architecte).
 * « Scelle la V3 du Gold-Set. Les 5 désaccords sont classés comme SOUS_TEXTE
 *  (hors spectre du proxy). »
 *
 * Principe (anti-Goodhart, déjà acté sur REVELATION_RE V2 plafonné à R=0.75) :
 * le proxy lexical détecte les révélations EXPLICITES. Les révélations
 * IMPLICITES / NÉGATIVES / OBLIQUES (sous-texte) sont HORS SPECTRE par décision —
 * les poursuivre exigerait une compréhension sémantique et sur-ajusterait le
 * proxy. Les 5 désaccords humain↔IA sont donc gelés comme SOUS_TEXTE, exclus
 * de la cible de calibration, et le Gold-Set est scellé avec hash.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { sha256 } from '@omega/canon-kernel';

const RUN = process.env['FINAL_RUN'] ?? 'runs/c8_book60k';

interface HumanLabels { date: string; annotator: string; answers: Record<string, boolean>; }
interface Disagreement { id: string; text: string; ia: boolean; human: boolean; }

const human = JSON.parse(readFileSync(`${RUN}/GOLDSET_V3_HUMAN_LABELS.json`, 'utf8')) as HumanLabels;
const conf = JSON.parse(readFileSync(`${RUN}/GOLDSET_V3_CONFUSION.json`, 'utf8')) as {
  agreementHumanVsIA: number; disagreements: Disagreement[];
};

/* Classification des 5 désaccords en SOUS_TEXTE, avec mécanisme par item. */
const SUBTEXT_RATIONALE: Record<string, string> = {
  P22: "Révélation IMPLICITE : « elle saisit le sens » — compréhension intérieure, aucun marqueur lexical explicite de dévoilement de seed.",
  P29: "Confirmation OBLIQUE en dialogue (« Tout vient de là ») — le seed naufrage est confirmé sans verbe de révélation explicite.",
  N02: "Question rhétorique (« Pourquoi le maire mentait-il ? ») — sous-texte d'un savoir, pas un dévoilement positif.",
  N22: "Révélation NÉGATIVE (« Elle ne sut jamais ») — l'absence de découverte est un beat, hors spectre lexical positif.",
  N31: "Découverte NÉGATIVE (« On ne découvrit rien… ni registre ») — vide signifiant, opposé du marqueur de révélation.",
};

const subtext = conf.disagreements.map((d) => ({
  id: d.id, text: d.text, iaLabel: d.ia, humanLabel: d.human,
  classification: 'SOUS_TEXTE' as const,
  outOfSpectrum: true,
  mechanism: SUBTEXT_RATIONALE[d.id] ?? 'sous-texte (hors spectre lexical du proxy)',
}));

const subtextIds = new Set(subtext.map((s) => s.id));
const inSpectrumIds = Object.keys(human.answers).filter((id) => !subtextIds.has(id));

const sealed = {
  goldSet: 'REVELATION_PROXY_V3',
  status: 'SEALED',
  sealedAt: new Date('2026-06-07T00:00:00Z').toISOString(),
  annotator: human.annotator,
  annotatedAt: human.date,
  authority: 'Francky (Architecte) — labels humains = vérité terrain',
  mandate: 'Gemini (tribunal) : 5 désaccords = SOUS_TEXTE, hors spectre proxy. Scellement V3.',
  totalItems: Object.keys(human.answers).length,
  inSpectrumItems: inSpectrumIds.length,
  subtextItems: subtext.length,
  agreementHumanVsIA: conf.agreementHumanVsIA,
  // Hors les 5 sous-texte (hors spectre), humain et IA concordent à 100%.
  agreementInSpectrum: 1.0,
  principle: "Le proxy lexical cible la révélation EXPLICITE. SOUS_TEXTE (implicite/négative/oblique) = hors spectre par décision anti-Goodhart. REVELATION_RE V2 reste plafonné (P=1.0, R=0.75) — NE PAS chasser le sous-texte au prix d'un sur-ajustement.",
  subtextDisagreements: subtext,
  humanLabels: human.answers,
  // Hash de scellement : labels humains canonicalisés (clé triée) — fige la V3.
  labelsHash: String(sha256(JSON.stringify(human.answers, Object.keys(human.answers).sort()))),
};

writeFileSync(`${RUN}/GOLDSET_V3_SEALED.json`, JSON.stringify(sealed, null, 2), 'utf8');
const sealHash = String(sha256(JSON.stringify(sealed)));
process.stdout.write(`GOLD-SET V3 SCELLÉ\n  items=${sealed.totalItems} inSpectrum=${sealed.inSpectrumItems} subtext=${sealed.subtextItems}\n  agreement global=${sealed.agreementHumanVsIA} in-spectrum=${sealed.agreementInSpectrum}\n  labelsHash=${sealed.labelsHash.slice(0, 16)}\n  sealHash=${sealHash.slice(0, 16)}\n`);
