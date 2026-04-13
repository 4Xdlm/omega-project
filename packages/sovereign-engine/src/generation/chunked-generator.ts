/**
 * OMEGA — Chunked Generator K2 (Moteur v4)
 *
 * Generates prose in 4 chunks of ~750 words each.
 * Architecture K2: PF_PERSONA_V2 (nécessité+contraste) + rappels anti-filler.
 * Lore-coding: zero prescriptive numbers (Law L3).
 *
 * P4A: Directive nécessité absolue (anti-filler)
 * P4B: Dead metaphor blacklist injectée dans le prompt
 * P4C: PF_PERSONA_V2 remplace Flaubert+Proust pour le format long K2
 * P4D: Rappels V2 avec anti-recyclage inter-chunks
 *
 * Convergence 3/3: Claude Opus + Gemini + ChatGPT
 * - SII = (anti_cliche + necessity + metaphor_novelty) / 3
 * - necessity et metaphor_novelty sont les 2 sous-scores fragiles en format long
 * - P4 cible ces 2 sous-scores par le prompt, sans toucher au scorer
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Tag: moteur-production-v2
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
  /**
   * P3A: Override PF_PERSONA for duel modes.
   * When provided, replaces Flaubert+Proust persona entirely.
   * loop_refined leaves this undefined → canonical K2 persona.
   */
  readonly personaOverride?: string;
  /**
   * P3A: Override RAPPEL_CHUNKS for duel modes.
   * When provided, replaces both RAPPEL_CHUNKS12 and RAPPEL_CHUNKS34_V4.
   * loop_refined leaves this undefined → canonical rappels.
   */
  readonly rappelOverride?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// PERSONAS — Lore-coding L3 (zéro chiffre prescriptif)
// ═══════════════════════════════════════════════════════════════════════════

// ── PF_PERSONA V1 (Flaubert+Proust) — RÉFÉRENCE HISTORIQUE ──────────────
// Conservée pour traçabilité. Non utilisée en production K2 long (P4C).
// Systématiquement dernier en SII (61-68) sur 4/4 scènes P3C.
// Cause : ampleur contemplative → necessity LLM détecte du remplissage.
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

// ── PF_PERSONA V2 (Nécessité + Contraste) — PRODUCTION K2 ──────────────
// P4C: Remplace Flaubert+Proust pour le format long (2200-2400w).
// Cible les 2 sous-scores SII fragiles :
//   - necessity (LLM) : chaque phrase justifiée, zéro filler
//   - metaphor_novelty : métaphores concrètes et spécifiques
// Convergence 3/3 (Opus + Gemini + ChatGPT).
const PF_PERSONA_V2 = `Tu es un écrivain de la nécessité et du contraste.

Chaque phrase porte un poids narratif irréductible. Si une phrase
pouvait être supprimée sans que le lecteur perde quelque chose,
elle ne devrait pas exister. Tu n'ornes pas — tu construis.

Ton style alterne entre deux régimes :
— Des périodes amples et subordinées qui déploient une sensation
  ou une pensée complexe dans toute son épaisseur. Elles progressent,
  chaque clause ajoutant une couche de sens.
— Des phrases courtes et définitives qui fracturent le flux.
  Pas des fragments — des verdicts. Sujet, verbe, image. Point.

Tes métaphores naissent du concret spécifique de la scène.
Pas de stock lexical général — chaque image est ancrée dans
les objets, les textures, les sons de CE lieu, CE moment.

Variable de commande : la nécessité par phrase.
Avant d'écrire chaque phrase, demande-toi : "Est-ce que cette phrase
fait avancer l'action, révèle un trait, modifie l'atmosphère,
ou ancre une sensation nouvelle ?" Si non, ne l'écris pas.

Le rythme émerge du contraste entre ampleur et coupe.
L'uniformité est l'ennemi. Jamais deux paragraphes consécutifs
dans le même régime.`;

// ── RAPPELS V1 (Flaubert+Proust+Duras) — RÉFÉRENCE HISTORIQUE ───────────
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

// ── P4D: RAPPELS V2 (Nécessité + Anti-recyclage) — PRODUCTION K2 ───────
// Cibles : necessity (LLM), metaphor_novelty (dead_ratio)
const RAPPEL_CHUNKS12_V2 = `NÉCESSITÉ : chaque phrase accomplit une fonction narrative —
avancer l'action, révéler un trait, modifier l'atmosphère,
ou ancrer une sensation physique nouvelle. Si une phrase
ne remplit aucune de ces fonctions, elle n'existe pas.
Zéro transition explicite ("Puis...", "Ensuite...", "C'est alors que...").
Zéro phrase qui répète une information déjà donnée sous une forme différente.

CONTRASTE : alterne périodes amples et phrases-verdict.
Les périodes déploient une sensation ou une pensée dans son épaisseur.
Les verdicts fracturent le flux — brefs, complets, définitifs.

ANCRAGE SENSORIEL : chaque paragraphe contient au minimum une sensation
physique concrète et spécifique — pas "une odeur" mais nomme l'odeur,
pas "un bruit" mais nomme le bruit. Le lecteur sent la scène
avant de la comprendre.`;

const RAPPEL_CHUNKS34_V2 = `NÉCESSITÉ : idem — pas de relâchement en fin de scène.
Chaque phrase porte du poids narratif. Zéro filler. Zéro transition molle.

CONTRASTE : maintiens l'alternance de rythme installée.
Les périodes amples restent lisibles d'un souffle.
Les phrases-verdict restent complètes — jamais des fragments.

ANTI-RECYCLAGE : ne réutilise pas les mêmes images, les mêmes structures
de phrase, les mêmes ouvertures de paragraphe que dans les sections
précédentes. Change de texture sensorielle. Si les paragraphes précédents
étaient visuels, ancre-toi dans le toucher ou l'ouïe.

COHÉRENCE : la cadence globale reste stable. Pas d'effondrement.
Le registre de fond ne change pas — seule la texture varie.`;

// ── P4B: DEAD METAPHOR BLACKLIST — injectée dans le prompt ──────────────
// Les 25 métaphores mortes les plus fréquentes de dead-metaphor-blacklist.ts.
// Le scorer metaphor_novelty les détecte et applique un facteur multiplicatif
// brutal : 1 dead sur 5 = ×0.80 sur le score. Impact : -15 à -20 pts.
// Injection dans le prompt = le Scribe sait quoi éviter AVANT de générer.
const DEAD_METAPHOR_PROMPT = `MÉTAPHORES INTERDITES (le juge les détecte et sanctionne lourdement) :
"le cœur serré", "les larmes aux yeux", "le sang glacé",
"un nœud à l'estomac", "des papillons dans le ventre",
"avoir le souffle coupé", "la gorge serrée", "un silence de mort",
"une pluie battante", "le poids du monde", "un regard perçant",
"briser le silence", "le temps s'arrête", "un sourire forcé",
"la lumière au bout du tunnel", "une mer de...", "un océan de...",
"une montagne de...", "un torrent de...", "nuit noire",
"un froid glacial", "la douleur lancinante", "les yeux écarquillés",
"le cœur battant", "à couper le souffle".
Invente tes propres images — concrètes, spécifiques à CETTE scène.`;

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTED CONSTANTS (for tests)
// ═══════════════════════════════════════════════════════════════════════════

export {
  PF_PERSONA, RAPPEL_CHUNKS12, RAPPEL_CHUNKS34_V4,
  PF_PERSONA_V2, RAPPEL_CHUNKS12_V2, RAPPEL_CHUNKS34_V2,
  DEAD_METAPHOR_PROMPT,
};

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
  personaOverride?: string,
  rappelOverride?: string,
): string {
  const isFirst = chunk === 1;
  const isLast = chunk === 4;
  // P4C: PF_PERSONA_V2 remplace PF_PERSONA pour le format long K2
  const persona = personaOverride ?? PF_PERSONA_V2;
  // P4D: Rappels V2 avec nécessité + anti-recyclage
  const rappel = rappelOverride ?? (chunk <= 2 ? RAPPEL_CHUNKS12_V2 : RAPPEL_CHUNKS34_V2);

  const sigLine = signatureWords.length > 0 && isFirst
    ? `\nMots à tisser naturellement dans la prose : ${signatureWords.slice(0, 10).join(', ')}.\n`
    : '';

  // P4B: Dead metaphor blacklist injectée dans chaque chunk prompt
  const deadMeta = `\n\n${DEAD_METAPHOR_PROMPT}`;

  // P4A: Directive nécessité absolue — rappel anti-filler en fin de prompt
  const necessityAnchor = `\nRAPPEL FINAL : chaque phrase doit porter du poids narratif. Zéro filler, zéro transition molle, zéro répétition déguisée.`;

  if (isFirst) {
    return `${persona}\n\n${rappel}${deadMeta}\n\nTu écris le DÉBUT de cette scène :\n\n${sceneBrief}\n${sigLine}\nÉcris les 750 premiers mots. Installe l'atmosphère.\nPas de préambule. Encadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.${necessityAnchor}`;
  }

  if (isLast) {
    // Anti-fermeture retiré du prompt — token mort (bench V5). Post-processing cliff gate actif.
    return `${persona}\n\n${rappel}${deadMeta}\n\nContinue et TERMINE cette scène.\n\n200 derniers mots :\n"${last200}"\n\nÉcris les 750 derniers mots.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.${necessityAnchor}`;
  }

  return `${persona}\n\n${rappel}${deadMeta}\n\nContinue cette scène.\n\n200 derniers mots :\n"${last200}"\n\nÉcris les 750 mots suivants.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.${necessityAnchor}`;
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
      input.personaOverride,
      input.rappelOverride,
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
