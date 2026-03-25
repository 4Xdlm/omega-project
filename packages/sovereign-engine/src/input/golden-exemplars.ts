/**
 * golden-exemplars.ts — Golden Exemplar Corpus for V4 Prompt
 * Phase V4-2 → SAGA_READY upgrade (Phase R)
 *
 * Source: VRECAL1_ENGINE_2026-03-25 (composite 92.3)
 *         VATOMIC_2026-03-25 (composite 91.9)
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
    id: 'GE-SAGA-01',
    text: `La théière tremblait contre ses doigts. Dans la cuisine aux carreaux disjoints, l'eau refusait de bouillir.\n\nL'odeur de bergamote montait par vagues tièdes tandis qu'elle versait l'eau fumante sur les feuilles noires, ses gestes ralentis par cette pesanteur qui s'installait chaque soir à la même heure, quand les ombres commençaient à ramper le long des murs écaillés et que le vent marin portait jusqu'à sa fenêtre ces effluves salés qui lui rappelaient d'autres automnes, d'autres attentes. Le thé infusait dans la porcelaine ébréchée — celle qu'elle gardait pour les occasions qui n'arrivaient plus — et ses paumes épousaient la chaleur de la tasse comme pour y puiser une consolation que les mots ne savaient plus offrir. Par la baie vitrée aux joints rongés par l'humidité, la mer étendait sa surface plombée jusqu'à l'horizon brouillé, ses vagues léchant la grève avec cette régularité hypnotique qui berçait ses journées vides depuis qu'elle avait appris à ne plus compter les heures.\n\nUn rire brisé. Cristallin. Porté par la brise d'été. Ses épaules se contractèrent. Le passé venait de la gifler.\n\nMais ce n'était qu'un goéland qui criaillait au-dessus des rochers noirs, et elle laissa retomber sa nuque contre le dossier de la chaise cannée, acceptant enfin que cette journée s'achève comme toutes les autres, dans ce silence peuplé qu'elle avait appris à habiter avec la patience minérale des falaises qui encadraient sa maison.`,
    source: 'VRECAL1_ENGINE_2026-03-25_winner_92.3',
    composite_score: 92.3,
  },
  {
    id: 'GE-SAGA-02',
    text: `Les rosiers de septembre exigeaient cette attention méticuleuse que seules les mains vieillies savent dispenser, et Henri, courbé sur les tiges encore gorgées de la chaleur estivale, maniait le sécateur avec cette précision d'horloger qu'avaient acquise ses doigts au fil des décennies passées dans ce même jardin. Chaque coup sec qui tranchait les tiges mortes résonnait dans l'air immobile avec cette netteté particulière aux fins d'été, quand la terre commence à exhaler ses parfums concentrés.\n\nL'épine qui venait de lui percer l'index droit ne lui arracha qu'un paisible tressaillement. Il porta machinalement le doigt à ses lèvres, goûtant cette saveur métallique qui se mêlait aux effluves de la Rosa Mundi qu'il venait de tailler.\n\n— Tu vois, Henri, les roses galliques ont une âme que n'ont pas les hybrides modernes.\n\nIl parlait maintenant à voix haute, comme si cette habitude prise depuis qu'elle n'était plus là pouvait conjurer l'absence qui s'étalait dans chaque recoin du jardin.\n\nElle n'était plus là.\n\nLe parfum du Zéphirine Drouhin continuait de monter vers lui par vagues successives, et chacune de ces vagues portait avec elle un fragment de leur histoire commune.`,
    source: 'VATOMIC_2026-03-25_souvenir_91.9',
    composite_score: 91.9,
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
