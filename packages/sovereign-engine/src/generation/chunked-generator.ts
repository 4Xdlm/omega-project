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

import type { SovereignProvider, EmotionContract } from '../types.js';
import {
  getAdaptiveMode,
  getAdaptiveVariant,
  loadAdaptiveConfigFromEnv,
  planAdaptive,
  type ChunkPlan,
  type AdaptiveMode,
} from './adaptive-chunker.js';
import {
  resolveDedaleConfig,
  buildDefaultDependencies,
  createDedale,
  DedaleResetFailedError,
  type Dedale,
  type RunContext as DedaleRunContext,
} from '../dedale/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ChunkedGenerationResult {
  readonly prose: string;
  readonly chunks: readonly string[];
  readonly words_per_chunk: readonly number[];
  readonly total_words: number;
  readonly api_calls: number;
  /**
   * V2-B: adaptive plan used for generation (undefined in legacy mode).
   * Logged in both shadow and active modes for traceability.
   */
  readonly adaptive_plan?: readonly ChunkPlan[];
  /**
   * V2-B: adaptive mode active at runtime.
   * '0' = legacy 4×750w | 'shadow' = plan computed but not used | '1' = plan active.
   */
  readonly adaptive_mode?: AdaptiveMode;
  /**
   * V2-B: if true, adaptive mode was requested but fallback to legacy
   * was triggered (e.g. plan failure, no emotion_contract).
   */
  readonly adaptive_fallback_triggered?: boolean;
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
  /**
   * V2-B: EmotionContract required to compute the adaptive chunking plan.
   * When omitted, adaptive mode degrades to legacy 4×750w silently
   * (non-breaking for callers who don't pass it).
   *
   * Status: PROVISIONAL_WINNER_V2B (α=0.3, β=0.3, γ=0.2) — scellé
   * après bench A/B V1 vs V2-B (P5).
   */
  readonly emotionContract?: EmotionContract;
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

// ── P8-BIS: GRAVITY LEXICON CAP — combat monotonie atmosphérique ──────
// Les mots les plus sur-utilisés dans les générations qwen3:32b.
// Injectés dans le prompt pour forcer la diversification lexicale.
const GRAVITY_LEXICON_PROMPT = `MOTS ATMOSPHÉRIQUES À USAGE LIMITÉ (max 3 fois par chapitre entier) :
"silence", "vide", "pierre", "souffle", "ombre", "cendre",
"linceul", "tombeau", "froid", "mur", "fissure", "poussière".
Ces mots sont AUTORISÉS mais RATIONNÉS. Au-delà de 3 occurrences,
ils deviennent du bruit. Trouve des SYNONYMES CONCRETS ou des ANGLES
DIFFÉRENTS. Le monde a plus de 12 mots pour dire l'absence.
"Silence" → le tintement de la pendule arrêtée, le bourdonnement
du réfrigérateur, le craquement du parquet sous aucun pied.
"Froid" → la chair de poule sur l'avant-bras, la buée du souffle,
les doigts gourds qui ne serrent plus.`;

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTED CONSTANTS (for tests)
// ═══════════════════════════════════════════════════════════════════════════

export {
  PF_PERSONA, RAPPEL_CHUNKS12, RAPPEL_CHUNKS34_V4,
  PF_PERSONA_V2, RAPPEL_CHUNKS12_V2, RAPPEL_CHUNKS34_V2,
  DEAD_METAPHOR_PROMPT, GRAVITY_LEXICON_PROMPT,
  computeTrigramRepeatRatio, countAnaphoraViolations, deduplicateChunk, purgeRepetitionLoops,
  REPEAT_TRIGRAM_THRESHOLD,
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
  // Strategy 1: explicit <prose> tags
  const match = raw.match(/<prose>([\s\S]*?)<\/prose>/);
  if (match) {
    let prose = match[1].trim();
    prose = prose.replace(/<\/?(?:prose|output|response|result|text|content|assistant|system|user|think|thinking)[^>]*>/gi, '');
    return prose.trim();
  }
  // Strategy 2: no tags — strip common LLM wrappers and use raw
  let prose = raw.trim();
  // Strip XML/pipeline tags
  prose = prose.replace(/<\/?(?:prose|output|response|result|text|content|assistant|system|user|think|thinking)[^>]*>/gi, '');
  // Strip markdown code fences
  prose = prose.replace(/```[\s\S]*?```/g, '');
  // Strip markdown headers
  prose = prose.replace(/^#+\s.*$/gm, '');
  // Strip bold-only lines (model commentary)
  prose = prose.replace(/^\*\*[^*]+\*\*\s*$/gm, '');
  // Strip lines that look like model meta-commentary
  prose = prose.replace(/^(?:Here is|Voici|Note:|Nota:).*$/gim, '');
  return prose.trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// P8: REPETITION LOOP DETECTOR (CALC — post-chunk)
// ═══════════════════════════════════════════════════════════════════════════
// Detects pathological repetition loops (e.g. "Elle est la fissure." ×600).
// Mechanism: measures trigram (3-word) repetition ratio.
// If ratio > threshold → chunk is rejected and must be regenerated.
// Threshold calibrated on V2 book failure: healthy prose < 0.08, loops > 0.25.

// ENV override: OMEGA_TRIGRAM_THRESHOLD (default 0.15)
const REPEAT_TRIGRAM_THRESHOLD = parseFloat(process.env.OMEGA_TRIGRAM_THRESHOLD || '0.15');
const MAX_CHUNK_REGEN_ATTEMPTS = 4; // raised from 2 — qwen3:32b needs more attempts to escape loops

function computeTrigramRepeatRatio(text: string): { ratio: number; worst_trigram: string; worst_count: number } {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 10) return { ratio: 0, worst_trigram: '', worst_count: 0 };

  const trigrams = new Map<string, number>();
  for (let i = 0; i <= words.length - 3; i++) {
    const tri = words.slice(i, i + 3).join(' ').toLowerCase();
    trigrams.set(tri, (trigrams.get(tri) || 0) + 1);
  }

  const totalTrigrams = words.length - 2;
  let repeatedCount = 0;
  let worstTrigram = '';
  let worstCount = 0;
  for (const [tri, count] of trigrams) {
    if (count > 2) {
      repeatedCount += count - 1; // excess occurrences
      if (count > worstCount) { worstCount = count; worstTrigram = tri; }
    }
  }

  return { ratio: repeatedCount / totalTrigrams, worst_trigram: worstTrigram, worst_count: worstCount };
}

// ═══════════════════════════════════════════════════════════════════════════
// P8: ANAPHORA DETECTOR (CALC — post-chunk)
// ═══════════════════════════════════════════════════════════════════════════
// Detects pathological anaphora: 4+ consecutive sentences starting with same word.
// Returns count of violations.

function countAnaphoraViolations(text: string): number {
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 3);
  if (sentences.length < 4) return 0;

  let violations = 0;
  let currentStart = '';
  let streak = 0;

  for (const s of sentences) {
    const firstWord = s.split(/\s+/)[0]?.toLowerCase() || '';
    if (firstWord === currentStart) {
      streak++;
      if (streak >= 4) violations++;
    } else {
      currentStart = firstWord;
      streak = 1;
    }
  }
  return violations;
}

// ═══════════════════════════════════════════════════════════════════════════
// P8: INTER-CHUNK DEDUPLICATION
// ═══════════════════════════════════════════════════════════════════════════
// Detects paragraphs in new chunk that are near-duplicates of existing prose.
// Uses Jaccard word-set similarity on paragraphs.

/**
 * P8-FIX: Last-resort purge of repetition loops within a single chunk.
 * Splits into sentences, detects runs of 3+ near-identical sentences,
 * keeps only the first occurrence of each run.
 * This is a DESTRUCTIVE operation — only used when all retries failed.
 */
function purgeRepetitionLoops(text: string): string {
  // Split into sentences (handle French punctuation)
  const sentences = text.split(/(?<=[.!?…])\s+/).filter(s => s.trim().length > 0);
  if (sentences.length < 4) return text;

  const normalize = (s: string): string =>
    s.toLowerCase().replace(/[^a-zàâéèêëïîôùûüÿçœæ\s]/g, '').trim();

  const kept: string[] = [];
  let i = 0;
  while (i < sentences.length) {
    const norm = normalize(sentences[i]);
    // Count consecutive near-identical sentences
    let runLength = 1;
    while (i + runLength < sentences.length) {
      const nextNorm = normalize(sentences[i + runLength]);
      // Levenshtein is too expensive — use simple word overlap ratio
      const wordsA = new Set(norm.split(/\s+/).filter(w => w.length > 2));
      const wordsB = new Set(nextNorm.split(/\s+/).filter(w => w.length > 2));
      if (wordsA.size === 0 || wordsB.size === 0) break;
      const inter = [...wordsA].filter(w => wordsB.has(w)).length;
      const overlap = inter / Math.max(wordsA.size, wordsB.size);
      if (overlap > 0.8) {
        runLength++;
      } else {
        break;
      }
    }
    // Keep first sentence, skip the rest of the run if it's a repetition loop
    kept.push(sentences[i]);
    if (runLength >= 3) {
      console.log(`[K2-PURGE] Removed ${runLength - 1} repeated sentences (overlap > 0.8): "${sentences[i].slice(0, 50)}..."`);
    }
    i += runLength;
  }

  const purged = kept.join(' ');
  if (kept.length < sentences.length) {
    console.log(`[K2-PURGE] ${sentences.length} sentences → ${kept.length} after purge`);
  }
  return purged;
}

function deduplicateChunk(newChunk: string, existingProse: string): string {
  if (!existingProse) return newChunk;
  // Only dedup when there's enough prose to compare (skip short mock outputs)
  if (existingProse.split(/\s+/).length < 50) return newChunk;

  const existingParas = existingProse.split(/\n\n+/).filter(p => p.trim().length > 50);
  const newParas = newChunk.split(/\n\n+/).filter(p => p.trim().length > 0);

  const getWordSet = (text: string): Set<string> =>
    new Set(text.toLowerCase().split(/\s+/).filter(w => w.length > 2));

  const jaccard = (a: Set<string>, b: Set<string>): number => {
    const intersection = new Set([...a].filter(x => b.has(x)));
    const union = new Set([...a, ...b]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  };

  const existingSets = existingParas.map(getWordSet);

  const keptParas = newParas.filter(para => {
    const paraSet = getWordSet(para);
    if (paraSet.size < 5) return true; // too short to judge
    for (const existing of existingSets) {
      if (jaccard(paraSet, existing) > 0.75) {
        console.log(`[K2-DEDUP] Removed duplicate paragraph (Jaccard > 0.75): "${para.slice(0, 60)}..."`);
        return false;
      }
    }
    return true;
  });

  return keptParas.join('\n\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// V2-B: ADAPTIVE CHUNK PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════════════
// Same shape as buildChunkPrompt but takes word_target from plan + pacing
// directive injection. Used when OMEGA_ADAPTIVE_CHUNKING='1'.

function buildAdaptiveChunkPrompt(
  sceneBrief: string,
  signatureWords: readonly string[],
  last200: string | null,
  plan: ChunkPlan,
  isFirst: boolean,
  isLast: boolean,
  personaOverride?: string,
  rappelOverride?: string,
): string {
  const persona = personaOverride ?? PF_PERSONA_V2;
  // Rappel selection follows legacy convention: chunks in first half → CHUNKS12, else CHUNKS34.
  const halfIndex = Math.ceil((plan.index + 1) / 2);
  const rappel = rappelOverride ?? (halfIndex <= 1 ? RAPPEL_CHUNKS12_V2 : RAPPEL_CHUNKS34_V2);

  const sigLine = signatureWords.length > 0 && isFirst
    ? `\nMots à tisser naturellement dans la prose : ${signatureWords.slice(0, 10).join(', ')}.\n`
    : '';

  const deadMeta = `\n\n${DEAD_METAPHOR_PROMPT}`;
  const useGravity = process.env.OMEGA_GRAVITY_LEXICON !== '0';
  const gravityLex = useGravity ? '\n\n' + GRAVITY_LEXICON_PROMPT : '';
  const necessityAnchor = `\nRAPPEL FINAL : chaque phrase doit porter du poids narratif. Zéro filler, zéro transition molle, zéro répétition déguisée.`;

  // V2-B: Adaptive pacing directive + word target injected as a structural instruction.
  // The pacing directive carries the register-specific formulation (litteraire/technique/…).
  const pacingBlock = `\n\nRYTHME DE CE SEGMENT : ${plan.pacing_directive}`
    + `\nETAT PROSODIQUE : ${plan.pacing_state}${plan.is_pivot ? ' (PIVOT structurel — bascule de régime)' : ''}`
    + `\nQUARTILE NARRATIF : ${plan.quartile} (arousal=${plan.arousal.toFixed(2)})`;

  const wordTarget = plan.word_target;

  if (isFirst) {
    return `${persona}\n\n${rappel}${deadMeta}${gravityLex}${pacingBlock}\n\nTu écris le DÉBUT de cette scène :\n\n${sceneBrief}\n${sigLine}\nÉcris les ${wordTarget} premiers mots. Installe l'atmosphère.\nPas de préambule. Encadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.${necessityAnchor}`;
  }

  if (isLast) {
    return `${persona}\n\n${rappel}${deadMeta}${gravityLex}${pacingBlock}\n\nContinue et TERMINE cette scène.\n\n200 derniers mots :\n"${last200 ?? ''}"\n\nÉcris les ${wordTarget} derniers mots.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.${necessityAnchor}`;
  }

  return `${persona}\n\n${rappel}${deadMeta}${gravityLex}${pacingBlock}\n\nContinue cette scène.\n\n200 derniers mots :\n"${last200 ?? ''}"\n\nÉcris les ${wordTarget} mots suivants.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.${necessityAnchor}`;
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
  // P8-bis: Gravity lexicon cap — conditionnel via env var
  // Activé par défaut pour API (70B+). Désactivable via OMEGA_GRAVITY_LEXICON=0 (32B local).
  const useGravity = process.env.OMEGA_GRAVITY_LEXICON !== '0';
  const gravityLex = useGravity ? '\n\n' + GRAVITY_LEXICON_PROMPT : '';

  // P4A: Directive nécessité absolue — rappel anti-filler en fin de prompt
  const necessityAnchor = `\nRAPPEL FINAL : chaque phrase doit porter du poids narratif. Zéro filler, zéro transition molle, zéro répétition déguisée.`;

  if (isFirst) {
    return `${persona}\n\n${rappel}${deadMeta}${gravityLex}\n\nTu écris le DÉBUT de cette scène :\n\n${sceneBrief}\n${sigLine}\nÉcris les 750 premiers mots. Installe l'atmosphère.\nPas de préambule. Encadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.${necessityAnchor}`;
  }

  if (isLast) {
    // Anti-fermeture retiré du prompt — token mort (bench V5). Post-processing cliff gate actif.
    return `${persona}\n\n${rappel}${deadMeta}${gravityLex}\n\nContinue et TERMINE cette scène.\n\n200 derniers mots :\n"${last200}"\n\nÉcris les 750 derniers mots.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.${necessityAnchor}`;
  }

  return `${persona}\n\n${rappel}${deadMeta}${gravityLex}\n\nContinue cette scène.\n\n200 derniers mots :\n"${last200}"\n\nÉcris les 750 mots suivants.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.${necessityAnchor}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// V2-B: ADAPTIVE DRAFT GENERATOR (internal)
// ═══════════════════════════════════════════════════════════════════════════
// Reuses legacy helpers (extractProse, trigram detector, dedup, purge) with
// plan-driven chunk loop: N chunks variables according to ChunkPlan[].
// Active only when OMEGA_ADAPTIVE_CHUNKING='1' AND emotionContract provided.

/**
 * Dédale v0.55 : numeric seed stable (FNV-1a 32-bit) depuis la string seed V2-B.
 * Utilisé uniquement pour DedaleChunkTelemetry.seed_used (audit/trace).
 * Le seed réel qui pilote le LLM reste la string V2-B capturée par closure.
 */
function hashSeedToNumber(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

async function generateAdaptiveDraftInternal(
  input: ChunkedGenerationInput,
  provider: SovereignProvider,
  plan: readonly ChunkPlan[],
): Promise<ChunkedGenerationResult> {
  const chunks: string[] = [];
  let fullProse = '';

  console.log(`[V2-B] Adaptive generation: ${plan.length} chunks, total target=${plan.reduce((s, p) => s + p.word_target, 0)}w`);

  // ── Dédale v0.55 — opt-in via OMEGA_DEDALE_MODE ──────────────────────────
  // Mode 'off' (default)  → bypass complet, zéro overhead, byte-identical path.
  // Mode 'shadow'         → oracle évalue + télémétrie, jamais de reset.
  // Mode 'on'             → arbre reset-first complet (budget=1 reset/run).
  const dedaleConfig = resolveDedaleConfig();
  let dedale: Dedale | undefined;
  let dedaleRunCtx: DedaleRunContext | undefined;
  if (dedaleConfig.mode !== 'off') {
    dedale = createDedale(dedaleConfig, buildDefaultDependencies());
    dedaleRunCtx = dedale.telemetry.startRun(dedaleConfig.mode, dedaleConfig.telemetry_dir);
    console.log(`[DEDALE] mode=${dedaleConfig.mode} run_id=${dedaleRunCtx.run_id} telemetry_dir=${dedaleConfig.telemetry_dir}`);
  }

  for (let i = 0; i < plan.length; i++) {
    const chunkPlan = plan[i];
    const isFirst = i === 0;
    const isLast = i === plan.length - 1;
    const chunkIdx1 = i + 1;
    const WORD_MAX = Math.round(chunkPlan.word_target * 1.6);
    const last200 = fullProse.split(/\s+/).slice(-200).join(' ');

    let chunkProse = '';
    let bestAttemptProse = '';
    let bestAttemptRatio = Infinity;

    for (let attempt = 0; attempt <= MAX_CHUNK_REGEN_ATTEMPTS; attempt++) {
      const seed = attempt === 0
        ? `${input.seed}_c${chunkIdx1}`
        : `${input.seed}_c${chunkIdx1}_regen${attempt}`;

      const prompt = buildAdaptiveChunkPrompt(
        input.sceneBrief,
        input.signatureWords,
        isFirst ? null : last200,
        chunkPlan,
        isFirst,
        isLast,
        input.personaOverride,
        input.rappelOverride,
      );

      let raw: string;
      if (dedale !== undefined && dedaleRunCtx !== undefined) {
        // Dédale actif (shadow|on) — wrap LLM call. La string seed reste captée
        // par closure (seed réel du LLM) ; le numeric seed n'est qu'une trace.
        const capturedSeed = seed;
        const capturedPrompt = prompt;
        const chunkFn: (n: number) => Promise<string> = async () => {
          return provider.generateDraft(capturedPrompt, 'chunked_k2', capturedSeed);
        };
        const res = await dedale.orchestrator.runChunkWithDedale({
          chunkFn,
          seed: hashSeedToNumber(seed),
          chunk_index: chunkIdx1,
          trigger_path: 'v2b',
          runCtx: dedaleRunCtx,
          state: dedale.state,
          config: dedaleConfig,
        });
        raw = res.text;
        if (res.verdict !== 'no_loop') {
          console.log(`[DEDALE] chunk=${chunkIdx1} attempt=${attempt} verdict=${res.verdict} resets_used=${dedale.state.resets_used}`);
        }
        // Δ v1.2 §8 D7 / Brique C Point 1 (NCR_DEDALE_RESET_HEALTH étape 5).
        // Quand l'orchestrator signale reset_failed, on REFUSE de continuer
        // silencieusement sur Ollama mort. On throw une classe dédiée que le
        // catch générique `generateChunkedDraft` (ligne ~799-803) doit re-throw
        // (étape 6) pour atteindre `orchestrator.ts:273-293` côté appelant qui
        // matérialise `outcome='failed'`. Sans ce throw, le run continuait
        // silencieusement avec `text1` sur daemon mort (bug NCR originel).
        if (res.verdict === 'reset_failed') {
          throw new DedaleResetFailedError('reset_outcome_failed', {
            run_id: dedaleRunCtx.run_id,
            chunk_index: chunkIdx1,
            attempt,
            seed,
            mode: dedaleConfig.mode,
            trigger_path: 'v2b',
            resets_used: dedale.state.resets_used,
          });
        }
      } else {
        raw = await provider.generateDraft(prompt, 'chunked_k2', seed);
      }
      chunkProse = extractProse(raw);

      if (!chunkProse) {
        console.log(`[V2-B] DEBUG Chunk ${chunkIdx1} raw (first 500 chars): ${raw.slice(0, 500)}`);
        console.log(`[V2-B] DEBUG Chunk ${chunkIdx1} raw length: ${raw.length}`);
        const fallback = raw
          .replace(/^```[\s\S]*?```$/gm, '')
          .replace(/^#+\s.*$/gm, '')
          .replace(/^\*\*.*\*\*$/gm, '')
          .trim();
        if (fallback && fallback.split(/\s+/).length > 20) {
          console.log(`[V2-B] Chunk ${chunkIdx1}: <prose> tags missing, using fallback extraction (${fallback.split(/\s+/).length}w)`);
          chunkProse = fallback;
        } else {
          throw new Error(`[V2-B] Chunk ${chunkIdx1} returned empty prose — fail-closed (raw=${raw.length} chars)`);
        }
      }

      const words = chunkProse.split(/\s+/).filter((w: string) => w.length > 0);
      if (words.length > WORD_MAX) {
        const paras = chunkProse.split(/\n\n+/);
        let truncated = '';
        let wc = 0;
        for (const p of paras) {
          const pw = p.split(/\s+/).filter((w: string) => w.length > 0).length;
          if (wc + pw > WORD_MAX) break;
          truncated += (truncated ? '\n\n' : '') + p;
          wc += pw;
        }
        console.log(`[V2-B-GUARD] Chunk ${chunkIdx1} truncated: ${words.length}w → ${wc}w (cap ${WORD_MAX}w, target ${chunkPlan.word_target}w)`);
        chunkProse = truncated || chunkProse.split(/\s+/).slice(0, WORD_MAX).join(' ');
      }

      const { ratio, worst_trigram, worst_count } = computeTrigramRepeatRatio(chunkProse);
      const anaphoraViolations = countAnaphoraViolations(chunkProse);

      if (ratio < bestAttemptRatio) {
        bestAttemptRatio = ratio;
        bestAttemptProse = chunkProse;
      }

      if (ratio > REPEAT_TRIGRAM_THRESHOLD) {
        console.log(`[V2-B-LOOP] Chunk ${chunkIdx1} attempt ${attempt}: trigram ratio=${ratio.toFixed(3)} > ${REPEAT_TRIGRAM_THRESHOLD} (worst: "${worst_trigram}" ×${worst_count})`);
        if (attempt < MAX_CHUNK_REGEN_ATTEMPTS) {
          console.log(`[V2-B-LOOP] Regenerating chunk ${chunkIdx1} with new seed...`);
          continue;
        }
        console.log(`[V2-B-LOOP] WARNING: Chunk ${chunkIdx1} still looping after ${MAX_CHUNK_REGEN_ATTEMPTS} retries — using best attempt (ratio=${bestAttemptRatio.toFixed(3)})`);
        chunkProse = bestAttemptProse;
        chunkProse = purgeRepetitionLoops(chunkProse);
      }

      if (anaphoraViolations > 3) {
        console.log(`[V2-B-ANAPHORA] Chunk ${chunkIdx1}: ${anaphoraViolations} anaphora violations detected`);
      }

      break;
    }

    chunkProse = deduplicateChunk(chunkProse, fullProse);

    if (!chunkProse.trim()) {
      throw new Error(`[V2-B] Chunk ${chunkIdx1} empty after deduplication — fail-closed`);
    }

    const producedWords = chunkProse.split(/\s+/).length;
    console.log(`[V2-B] Chunk ${chunkIdx1}/${plan.length}: target=${chunkPlan.word_target}w produced=${producedWords}w drift=${((producedWords - chunkPlan.word_target) / chunkPlan.word_target * 100).toFixed(1)}% [${chunkPlan.pacing_state}${chunkPlan.is_pivot ? '+pivot' : ''}]`);

    chunks.push(chunkProse);
    fullProse += (fullProse ? '\n\n' : '') + chunkProse;
  }

  // Telemetry: CHUNKED_DRAFT snapshot (same channel as legacy for continuity)
  try {
    const { telemetry } = await import('../telemetry/pipeline-telemetry.js');
    telemetry.recordFromProse('CHUNKED_DRAFT', fullProse, undefined, {
      chunks_words: chunks.map(c => c.split(/\s+/).length),
      adaptive_mode: '1',
      plan_length: plan.length,
      plan_targets: plan.map(p => p.word_target),
      plan_states: plan.map(p => p.pacing_state),
      plan_total_target: plan.reduce((s, p) => s + p.word_target, 0),
    });
  } catch { /* telemetry is optional */ }

  // Dédale finalize — agrège + flush atomique (non-bloquant si échec, CI-4).
  if (dedale !== undefined && dedaleRunCtx !== undefined) {
    try {
      const agg = await dedale.telemetry.finalizeRun(dedaleRunCtx);
      console.log(`[DEDALE] finalized run_id=${dedaleRunCtx.run_id} chunks=${agg.chunks_total} counts=${JSON.stringify(agg.counts)} ratio_effective=${agg.ratio_effective}`);
    } catch (err) {
      console.warn('[DEDALE] finalizeRun failed (non-fatal):', err);
    }
  }

  return {
    prose: fullProse,
    chunks,
    words_per_chunk: chunks.map(c => c.split(/\s+/).length),
    total_words: fullProse.split(/\s+/).length,
    api_calls: plan.length,
    adaptive_plan: plan,
    adaptive_mode: '1',
    adaptive_fallback_triggered: false,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

export async function generateChunkedDraft(
  input: ChunkedGenerationInput,
  provider: SovereignProvider,
): Promise<ChunkedGenerationResult> {
  // ── V2-B: Adaptive dispatcher ─────────────────────────────────────────
  // Mode '1' + emotionContract present → adaptive loop (N chunks variables)
  // Mode 'shadow' + emotionContract present → compute + log plan, run legacy
  // Mode '0' OR no emotionContract → legacy 4×750w (unchanged)
  const adaptiveMode = getAdaptiveMode();
  const hasContract = input.emotionContract !== undefined;
  let shadowPlan: readonly ChunkPlan[] | undefined = undefined;
  let fallbackTriggered = false;

  if (adaptiveMode !== '0') {
    if (!hasContract) {
      // Requested adaptive but no contract → silent fallback to legacy (non-breaking)
      console.log(`[V2-B] mode=${adaptiveMode} but no emotionContract provided — fallback to legacy 4×750w`);
      fallbackTriggered = true;
    } else {
      try {
        const config = loadAdaptiveConfigFromEnv();
        const variant = getAdaptiveVariant();
        const plan = planAdaptive(input.emotionContract!, config, variant);
        // Structured log (P3 requirement — variant exposed for traceability)
        const totalTarget = plan.reduce((s, p) => s + p.word_target, 0);
        const archetypeSummary = plan.map(p => `${p.word_target}w[${p.pacing_state[0]}${p.is_pivot ? '*' : ''}]`).join(',');
        console.log(`[V2-B] mode=${adaptiveMode} variant=${variant} plan=${plan.length}chunks total=${totalTarget}w α=${config.alpha} β=${config.beta} γ=${config.gamma} δ=${config.delta}`);
        console.log(`[V2-B] plan: ${archetypeSummary}`);

        if (adaptiveMode === '1') {
          // Active mode → delegate to adaptive loop
          return await generateAdaptiveDraftInternal(input, provider, plan);
        }
        // Shadow mode → plan logged, keep plan for result, fall through to legacy
        shadowPlan = plan;
      } catch (err) {
        // Δ v1.2 §8 D7 / Brique C Point 2 (NCR_DEDALE_RESET_HEALTH étape 6).
        // Coupe-circuit Dédale : le catch générique fallbackait silencieusement
        // en legacy 4×750w même sur reset_failed (bug NCR originel). On
        // re-throw explicitement les DedaleResetFailedError pour qu'elles
        // atteignent `orchestrator.ts:273-293` via l'appelant (engine.ts:316
        // ou duel-engine.ts:151, F3 CLOSED) qui les traduit en outcome='failed'.
        // Les autres erreurs (plan compute fail, module load fail, etc.)
        // conservent le fallback legacy historique — ne pas régresser ce
        // comportement hors-scope Dédale.
        if (err instanceof DedaleResetFailedError) {
          throw err;
        }
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`[V2-B] FALLBACK: adaptive plan computation failed (${msg}) — using legacy 4×750w`);
        fallbackTriggered = true;
      }
    }
  }

  // ── Legacy 4×750w loop (unchanged behavior) ───────────────────────────
  const chunks: string[] = [];
  let fullProse = '';
  const WORD_TARGET_PER_CHUNK = 750;
  const WORD_MAX_PER_CHUNK = Math.round(WORD_TARGET_PER_CHUNK * 1.6); // 1200w hard cap

  for (let chunk = 1; chunk <= 4; chunk++) {
    const last200 = fullProse.split(/\s+/).slice(-200).join(' ');

    let chunkProse = '';
    // P8-FIX: Track best attempt across retries (lowest trigram ratio wins)
    let bestAttemptProse = '';
    let bestAttemptRatio = Infinity;

    for (let attempt = 0; attempt <= MAX_CHUNK_REGEN_ATTEMPTS; attempt++) {
      const seed = attempt === 0
        ? `${input.seed}_c${chunk}`
        : `${input.seed}_c${chunk}_regen${attempt}`;

      const prompt = buildChunkPrompt(
        input.sceneBrief,
        input.signatureWords,
        chunk === 1 ? null : last200,
        chunk,
        input.personaOverride,
        input.rappelOverride,
      );

      const raw = await provider.generateDraft(prompt, 'chunked_k2', seed);
      chunkProse = extractProse(raw);

      if (!chunkProse) {
        // Debug: log raw output to help diagnose model-specific formatting
        console.log(`[V4-CHUNKED] DEBUG Chunk ${chunk} raw (first 500 chars): ${raw.slice(0, 500)}`);
        console.log(`[V4-CHUNKED] DEBUG Chunk ${chunk} raw length: ${raw.length}`);
        // Fallback: if model didn't use <prose> tags, use raw directly (stripped of common wrappers)
        const fallback = raw
          .replace(/^```[\s\S]*?```$/gm, '')  // strip code fences
          .replace(/^#+\s.*$/gm, '')           // strip markdown headers
          .replace(/^\*\*.*\*\*$/gm, '')       // strip bold-only lines
          .trim();
        if (fallback && fallback.split(/\s+/).length > 20) {
          console.log(`[V4-CHUNKED] Chunk ${chunk}: <prose> tags missing, using fallback extraction (${fallback.split(/\s+/).length}w)`);
          chunkProse = fallback;
        } else {
          throw new Error(`[V4-CHUNKED] Chunk ${chunk} returned empty prose — fail-closed (raw=${raw.length} chars)`);
        }
      }

      // P8-FIX: Word count guard — truncate at last paragraph before cap
      const words = chunkProse.split(/\s+/).filter((w: string) => w.length > 0);
      if (words.length > WORD_MAX_PER_CHUNK) {
        const paras = chunkProse.split(/\n\n+/);
        let truncated = '';
        let wc = 0;
        for (const p of paras) {
          const pw = p.split(/\s+/).filter((w: string) => w.length > 0).length;
          if (wc + pw > WORD_MAX_PER_CHUNK) break;
          truncated += (truncated ? '\n\n' : '') + p;
          wc += pw;
        }
        console.log(`[K2-GUARD] Chunk ${chunk} truncated: ${words.length}w → ${wc}w (cap ${WORD_MAX_PER_CHUNK}w)`);
        chunkProse = truncated || chunkProse.split(/\s+/).slice(0, WORD_MAX_PER_CHUNK).join(' ');
      }

      // P8-FIX: Repetition loop detector
      const { ratio, worst_trigram, worst_count } = computeTrigramRepeatRatio(chunkProse);
      const anaphoraViolations = countAnaphoraViolations(chunkProse);

      // Track best attempt (lowest trigram ratio)
      if (ratio < bestAttemptRatio) {
        bestAttemptRatio = ratio;
        bestAttemptProse = chunkProse;
      }

      if (ratio > REPEAT_TRIGRAM_THRESHOLD) {
        console.log(`[K2-LOOP] Chunk ${chunk} attempt ${attempt}: trigram ratio=${ratio.toFixed(3)} > ${REPEAT_TRIGRAM_THRESHOLD} (worst: "${worst_trigram}" ×${worst_count})`);
        if (attempt < MAX_CHUNK_REGEN_ATTEMPTS) {
          console.log(`[K2-LOOP] Regenerating chunk ${chunk} with new seed...`);
          continue;
        }
        // All retries exhausted — use best attempt, not last
        console.log(`[K2-LOOP] WARNING: Chunk ${chunk} still looping after ${MAX_CHUNK_REGEN_ATTEMPTS} retries — using best attempt (ratio=${bestAttemptRatio.toFixed(3)})`);
        chunkProse = bestAttemptProse;
        // P8-FIX: Purge repetition loops from best attempt as last resort
        chunkProse = purgeRepetitionLoops(chunkProse);
      }

      if (anaphoraViolations > 3) {
        console.log(`[K2-ANAPHORA] Chunk ${chunk}: ${anaphoraViolations} anaphora violations detected`);
      }

      break;
    }

    // P8-FIX: Inter-chunk deduplication
    chunkProse = deduplicateChunk(chunkProse, fullProse);

    if (!chunkProse.trim()) {
      throw new Error(`[V4-CHUNKED] Chunk ${chunk} empty after deduplication — fail-closed`);
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
    // V2-B observability — propagated even in legacy path
    adaptive_mode: adaptiveMode,
    adaptive_plan: shadowPlan,
    adaptive_fallback_triggered: fallbackTriggered,
  };
}
