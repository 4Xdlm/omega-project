/**
 * OMEGA Glossary — Operational vocabulary for LLM prompts.
 * Each term has a definition the LLM MUST use instead of its own interpretation.
 * Injected in prompts to create a shared contract of meaning.
 *
 * Source: OMEGA_GLOSSAIRE.docx (26 terms, 6 categories)
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

export interface GlossaryEntry {
  readonly term: string;
  readonly definition: string;
  readonly example?: string;
}

/**
 * Glossaire RESTREINT pour injection prompt.
 * On n'injecte PAS les 26 termes (trop de tokens).
 * On injecte les 5 termes les plus critiques pour la GÉNÉRATION.
 * Budget cible : ~120 tokens. Les termes de MESURE ne servent pas au Scribe.
 */
export const OMEGA_GLOSSARY: readonly GlossaryEntry[] = [
  {
    term: 'Souffle de Flaubert',
    definition: 'Période ample qui tient dans un souffle de lecture à voix haute. Subordonnées en cascade, mais la phrase respire.',
  },
  {
    term: 'Murmure de Duras',
    definition: 'Phrase nette qui coupe le flux. Brève mais COMPLÈTE : sujet, verbe, image. Jamais un fragment.',
  },
  {
    term: 'Nappe phrastique',
    definition: 'Registre de fond : périodes amples. La lame Duras crée le contraste sans changer le registre.',
  },
  {
    term: 'Incarnation sensorielle',
    definition: 'Émotions par le CORPS : chaleur, poids, goût. On ne NOMME jamais une émotion — on la fait SENTIR.',
  },
  {
    term: 'Dilatation temporelle',
    definition: 'Une seconde peut durer un paragraphe. Le temps intérieur RALENTIT le récit. Chaque sensation dépliée.',
  },
] as const;

/**
 * Compile le glossaire en bloc de prompt injectable.
 * Budget : ~200 tokens
 */
export function compileGlossary(): string {
  const entries = OMEGA_GLOSSARY.map(e => {
    const ex = e.example ? `\n  Ex : « ${e.example} »` : '';
    return `• ${e.term} : ${e.definition}${ex}`;
  });

  return `VOCABULAIRE OMEGA (ces définitions REMPLACENT tes interprétations par défaut) :\n${entries.join('\n')}`;
}
