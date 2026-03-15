/**
 * golden-exemplars.ts — Golden Exemplar Corpus for V4 Prompt
 * Phase V4-2 — Best OMEGA passages for few-shot exemplar injection
 *
 * Source: retro-engineering/B1_omega_best_1.txt (composite 89.35)
 *         retro-engineering/B2_omega_best_2.txt (composite 89.20)
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

export interface GoldenExemplar {
  readonly id: string;
  readonly text: string;
  readonly source: string;
  readonly composite_score: number;
}

export const GOLDEN_EXEMPLARS: readonly GoldenExemplar[] = [
  {
    id: 'GE-01',
    text: 'Pierre posa ses clés sur le comptoir, le métal traça un arc métallique contre la pierre froide. Le silence s\'accrocha aux angles de la cuisine comme un résidu de conversations jamais finies. Elle se tenait près de l\'évier, ses mains sous l\'eau tiède, mais ses épaules gardaient cette tension larvée qui habitait leurs gestes quotidiens depuis des mois. Du sang. Sous ses ongles, Marie grattait les dernières traces de sa garde aux urgences, mais Pierre savait que ce rouge-là n\'expliquait pas tout. L\'ancrage thermique de leurs corps dans l\'espace domestique avait changé — ils évoluaient comme deux aimants de même polarité, se repoussant sans jamais se toucher. « Tu rentres tard. » Les mots sortirent de sa gorge sans qu\'il les ait vraiment choisis. Marie ne se retourna pas, continua de frotter ses paumes contre le savon blanc.',
    source: 'B1_omega_best_1',
    composite_score: 89.35,
  },
  {
    id: 'GE-02',
    text: 'Pierre s\'approcha. Jamais. Jamais il n\'avait ressenti cette distance entre eux, cette membrane percée qui laissait s\'échapper quelque chose d\'essentiel. Il observait la nuque de Marie, ces cheveux châtains qu\'il connaissait par cœur, et ne reconnaissait rien. « Marie. » Le prénom tomba dans l\'air comme un couteau. Elle se figea. Ses mains devinrent blanches sur l\'inox, ses articulations saillant sous la peau. Une anticipation corporelle la traversa, ce frisson qui précède les aveux ou les mensonges. « Quoi ? » Sa voix avait changé. Plus rauque. Défensive. Pierre sentit la chaleur domestique se retirer de la pièce, aspirée par ce froid qui n\'avait rien à voir avec janvier. Il pensa aux racines enchevêtrées sous la terre gelée, à ces réseaux souterrains qui continuent de vivre quand tout semble mort en surface.',
    source: 'B2_omega_best_2',
    composite_score: 89.20,
  },
  {
    id: 'GE-03',
    text: 'Pierre connaissait cette géologie intime de sa voix quand elle préparait un mensonge. Chaque intonation révélait les fractures silencieuses de ce qu\'elle ne disait pas. Dehors, le froid de janvier cognait contre les vitres, mais à l\'intérieur l\'air portait cette croissance secrète que Pierre avait appris à reconnaître — l\'érosion conjugale qui travaillait leur maison comme l\'eau use la pierre. Jamais. Il n\'y avait eu aucun appel. Pierre le savait parce qu\'il était resté dans le couloir pendant qu\'elle téléphonait ce matin, et les mots qu\'elle avait murmurés ne s\'adressaient pas à l\'hôpital. Cette rage contenue qu\'il portait dans sa poitrine depuis des semaines remonta comme une marée silencieuse.',
    source: 'B1_omega_best_1',
    composite_score: 89.35,
  },
] as const;

/**
 * Deterministic exemplar selection — INV-V4-09
 * Same packet_id always yields same exemplar index.
 */
export function selectExemplarDeterministic(packetId: string): GoldenExemplar | null {
  if (GOLDEN_EXEMPLARS.length === 0) return null;
  let hash = 0;
  for (let i = 0; i < packetId.length; i++) {
    hash = ((hash << 5) - hash) + packetId.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % GOLDEN_EXEMPLARS.length;
  return GOLDEN_EXEMPLARS[idx];
}
