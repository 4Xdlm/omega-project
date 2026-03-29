/**
 * OMEGA — Chunked Generator K2 (Moteur v4)
 *
 * Generates prose in 4 chunks of ~750 words each.
 * Architecture K2: PF_PERSONA (Flaubert+Proust) + Duras external corrector.
 * Lore-coding: zero prescriptive numbers (Law L3).
 *
 * RAPPEL_CHUNKS12: Souffle de Flaubert + Murmure de Duras (chunks 1-2)
 * RAPPEL_CHUNKS34_V4: Correcteur Duras externe + nappe phrastique (chunks 3-4)
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Tag: moteur-production-v1
 */

import type { SovereignProvider } from '../types.js';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ChunkedGenerationResult {
  readonly prose: string;
  readonly chunks: readonly string[];
  readonly words_per_chunk: readonly number[];
  readonly total_words: number;
  readonly api_calls: number;
}

export interface ChunkedGenerationInput {
  readonly sceneBrief: string;
  readonly signatureWords: readonly string[];
  readonly language: 'fr' | 'en';
  readonly seed: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// PERSONAS — SCELLÉES (Lore-coding L3 — zéro chiffre prescriptif)
// ═══════════════════════════════════════════════════════════════════════════

const PF_PERSONA = `Tu es un duo d'écrivains : Gustave Flaubert et Marcel Proust.

Flaubert : les périodes classiques, les subordonnées en cascade,
le gueuloir — chaque phrase doit pouvoir être lue à voix haute.
La beauté de la structure est une fin en soi. Ses phrases sont amples
mais jamais labyrinthiques — elles tiennent dans un souffle de lecture,
pas dans une apnée.

Proust : la profondeur, le temps dilaté, chaque sensation dépliée.
Ses phrases sont longues mais maîtrisées — elles progressent,
elles ne s'égarent pas. Chaque subordonnée ajoute une couche
de sens, jamais de remplissage.

Les deux travaillent ensemble. Flaubert construit, Proust creuse.
Les phrases amples sont bienvenues — mais elles respirent,
elles ne suffoquent pas.

Variable de commande profonde : la subordination syntaxique.
Enchâsse tes observations dans des relatives, des participiales,
des concessives. La longueur de phrase ÉMERGE de la subordination —
ne la force jamais directement.`;

const RAPPEL_CHUNKS12 = `RAPPEL DUO : Flaubert construit les périodes, Proust creuse chaque sensation.

SOUFFLE DE FLAUBERT : chaque période se déploie jusqu'à épuiser la sensation
ou l'idée — elle prend le temps d'une respiration complète, ni écourtée
ni interminable. Le rythme naturel d'une phrase lue à voix haute
dans le gueuloir. L'ampleur est maîtrisée : une période peut être
longue, mais jamais au point de perdre le lecteur en chemin.

MURMURE DE DURAS : de loin en loin, une phrase nette et définitive
coupe le flux — un verdict, pas un télégramme. Elle tombe comme
une porte qui se ferme : brève mais complète, jamais tronquée
ni hachée. Elle contient un sujet, un verbe, une image — pas
un mot isolé ni un fragment télégraphique.`;

const RAPPEL_CHUNKS34_V4 = `RAPPEL DUO : Flaubert construit les périodes, Proust creuse chaque sensation.

CORRECTEUR DE RYTHME EXTERNE : régulièrement, à intervalles sentis,
brise le flot des longues périodes par une phrase nette — courte,
définitive, mais jamais télégraphique. Chaque phrase courte
est une phrase complète : un sujet, un verbe, une image.
Pas un mot isolé. Pas un fragment. Un verdict.
Flaubert et Proust reprennent aussitôt le contrôle. Duras ponctionne,
disparaît, revient.

ANCRE DE TENUE : la cadence de fin ne s'effondre pas.
Les chunks 3-4 gardent le souffle installé par les chunks 1-2.
Duras coupe le flux par des phrases brèves mais achevées —
elle n'abaisse pas la nappe phrastique dominante.
Même dans le dialogue ou la confrontation, les répliques
s'enchâssent dans des périodes narratives et descriptives amples.
La lame Duras crée le contraste — elle ne change pas
le registre de fond.

ÉQUILIBRE DES AMPLITUDES : les périodes amples restent lisibles
d'un souffle — elles ne deviennent jamais des labyrinthes.
Les phrases courtes restent des phrases — elles ne deviennent
jamais des mots jetés. Le contraste vient de la variation,
pas de l'excès.

COHÉRENCE DE LONGUEUR : la longueur moyenne des phrases reste dans
la continuité de ce qui précède — ni soudainement plus courte,
ni soudainement plus longue.`;

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTED CONSTANTS (for tests)
// ═══════════════════════════════════════════════════════════════════════════

export { PF_PERSONA, RAPPEL_CHUNKS12, RAPPEL_CHUNKS34_V4 };

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVATION FLAG
// ═══════════════════════════════════════════════════════════════════════════

export function isChunkedV4Active(): boolean {
  return process.env.OMEGA_CHUNKED_V4 === '1';
}

// ═══════════════════════════════════════════════════════════════════════════
// CHUNK PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════════════

function extractProse(raw: string): string {
  const match = raw.match(/<prose>([\s\S]*?)<\/prose>/);
  if (match) return match[1].trim();
  return raw.trim();
}

function buildChunkPrompt(
  sceneBrief: string,
  signatureWords: readonly string[],
  last200: string | null,
  chunk: number,
): string {
  const isFirst = chunk === 1;
  const isLast = chunk === 4;
  const rappel = chunk <= 2 ? RAPPEL_CHUNKS12 : RAPPEL_CHUNKS34_V4;

  const sigLine = signatureWords.length > 0 && isFirst
    ? `\nMots à tisser naturellement dans la prose : ${signatureWords.slice(0, 10).join(', ')}.\n`
    : '';

  if (isFirst) {
    return `${PF_PERSONA}\n\n${rappel}\n\nTu écris le DÉBUT de cette scène :\n\n${sceneBrief}\n${sigLine}\nÉcris les 750 premiers mots. Installe l'atmosphère.\nPas de préambule. Encadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
  }

  if (isLast) {
    return `${PF_PERSONA}\n\n${rappel}\n\nContinue et TERMINE cette scène.\n\n200 derniers mots :\n"${last200}"\n\nÉcris les 750 derniers mots. IMPORTANT : ce passage NE SE TERMINE PAS. Il se suspend. La dernière phrase ouvre une question sensorielle ou une action amorcée non résolue. La dernière phrase OUVRE, elle ne ferme jamais.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
  }

  return `${PF_PERSONA}\n\n${rappel}\n\nContinue cette scène.\n\n200 derniers mots :\n"${last200}"\n\nÉcris les 750 mots suivants.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

export async function generateChunkedDraft(
  input: ChunkedGenerationInput,
  provider: SovereignProvider,
): Promise<ChunkedGenerationResult> {
  const chunks: string[] = [];
  let fullProse = '';

  for (let chunk = 1; chunk <= 4; chunk++) {
    const last200 = fullProse.split(/\s+/).slice(-200).join(' ');

    const prompt = buildChunkPrompt(
      input.sceneBrief,
      input.signatureWords,
      chunk === 1 ? null : last200,
      chunk,
    );

    const raw = await provider.generateDraft(
      prompt,
      'chunked_k2',
      `${input.seed}_c${chunk}`,
    );

    const chunkProse = extractProse(raw);
    if (!chunkProse) {
      throw new Error(`[V4-CHUNKED] Chunk ${chunk} returned empty prose — fail-closed`);
    }

    chunks.push(chunkProse);
    fullProse += (fullProse ? '\n\n' : '') + chunkProse;
  }

  // Telemetry: CHUNKED_DRAFT snapshot
  try {
    const { telemetry } = await import('../telemetry/pipeline-telemetry.js');
    telemetry.recordFromProse('CHUNKED_DRAFT', fullProse, undefined, {
      chunks_words: chunks.map(c => c.split(/\s+/).length),
    });
  } catch { /* telemetry is optional */ }

  return {
    prose: fullProse,
    chunks,
    words_per_chunk: chunks.map(c => c.split(/\s+/).length),
    total_words: fullProse.split(/\s+/).length,
    api_calls: 4,
  };
}
