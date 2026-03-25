# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT : ÉTAPE 8 — INJECTION GLOSSAIRE OPÉRATOIRE
# Le LLM reçoit le vocabulaire OMEGA pour comprendre nos concepts
# ═══════════════════════════════════════════════════════════════════════════════
#
# Standard : NASA-Grade L4 / DO-178C Level A
# Branche : phase-r-metrology-rebuild
#
# CONTEXTE :
# Le Glossaire OMEGA (26 termes, 6 catégories) existe en DOCX mais n'est
# JAMAIS injecté dans les prompts du LLM. Le Scribe et les juges LLM
# interprètent nos termes avec leur propre définition probabiliste.
#
# Exemple : "phrase-couteau" pour nous = proposition asyndétique de 7-12 mots.
# Pour le LLM = n'importe quelle phrase courte qui "coupe".
#
# L'injection du glossaire transforme le lore-coding vague en contrat sémantique.
# ═══════════════════════════════════════════════════════════════════════════════

## MISSION : Créer `src/input/omega-glossary.ts` + injecter dans le prompt V4

### Étape 1 — Créer le module glossaire

Créer `src/input/omega-glossary.ts` :

```typescript
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
  readonly definition: string;       // 1-2 phrases max
  readonly example?: string;         // Optionnel — exemple concret
}

/**
 * Glossaire RESTREINT pour injection prompt.
 * On n'injecte PAS les 26 termes (trop de tokens).
 * On injecte les 8 termes les plus critiques pour la GÉNÉRATION.
 * Les termes de MESURE (CV, f26b, etc.) ne servent pas au Scribe.
 */
export const OMEGA_GLOSSARY: readonly GlossaryEntry[] = [
  {
    term: 'Souffle de Flaubert',
    definition: 'Période ample et majestueuse qui tient dans un souffle de lecture à voix haute. Subordonnées en cascade, mais jamais labyrinthiques. La phrase respire.',
    example: 'Elle versait l\'eau bouillante avec cette lenteur qui s\'installait chaque soir à la même heure, quand les ombres commençaient à ramper le long des murs.',
  },
  {
    term: 'Murmure de Duras',
    definition: 'Phrase nette et définitive qui coupe le flux narratif. Brève mais COMPLÈTE : un sujet, un verbe, une image. Jamais un télégramme ni un fragment. Elle tombe comme une porte qui se ferme.',
    example: 'Un rire brisé. Cristallin.',
  },
  {
    term: 'Respiration maîtrisée',
    definition: 'Alternance organique de phrases longues, moyennes et courtes. Le contraste vient de la variation, pas de l\'excès. Ni mitraillette de phrases courtes, ni tunnel de phrases interminables.',
  },
  {
    term: 'Nappe phrastique',
    definition: 'Le registre de fond du récit : périodes narratives et descriptives amples. Même dans le dialogue ou la confrontation, les répliques s\'enchâssent dans cette nappe. La lame Duras crée le contraste mais ne change pas le registre de fond.',
  },
  {
    term: 'Dilatation temporelle',
    definition: 'Une seconde de vécu peut durer un paragraphe. Le temps intérieur du personnage est différent du temps de l\'action. Chaque sensation dépliée, chaque souvenir qui remonte, RALENTIT le temps du récit.',
  },
  {
    term: 'Incarnation sensorielle',
    definition: 'Les pensées et émotions passent par le CORPS : chaleur sur la peau, poids dans la poitrine, goût métallique. On ne NOMME jamais une émotion — on la fait SENTIR par le corps.',
  },
  {
    term: 'Nécessité narrative',
    definition: 'Chaque phrase apporte quelque chose : émotion, sensation, tension, image. La respiration et l\'atmosphère SONT nécessaires. La redite, les transitions mécaniques et les explications de ce qui est déjà montré ne le sont PAS.',
  },
  {
    term: 'Correcteur externe',
    definition: 'Le style Duras intervient comme chirurgien ponctuel, pas comme co-auteur permanent. Il brise le flux par éclairs brefs. Flaubert et Proust reprennent aussitôt le contrôle.',
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
```

### Étape 2 — Injecter dans prompt-assembler-v4.ts

Dans `src/input/prompt-assembler-v4.ts`, dans la fonction `buildSovereignPrompt_V4()` :

1. Importer : `import { compileGlossary } from './omega-glossary.js';`
2. Ajouter le bloc glossaire dans le tableau `blocks[]`, AVANT les interdictions
   (juste après le RHYTHM_ANCHOR et avant compileInterdictions) :

```typescript
// Bloc Glossaire (~200 tokens)
const glossaryBlock = compileGlossary();
if (glossaryBlock) blocks.push(glossaryBlock);
```

3. Vérifier que le budget total du prompt ne dépasse pas ~1700 tokens
   (1500 cible + marge). Si ça dépasse, réduire le glossaire aux 5 termes
   les plus critiques.

### Étape 3 — Injecter dans les prompts du Duel (si applicable)

Vérifier dans `src/duel/duel-engine.ts` si les candidats single-shot
reçoivent le même prompt V4 (via buildSovereignPrompt_V4) ou un prompt
séparé.

Si les candidats Duel utilisent le prompt V4 → le glossaire est déjà injecté.
Si les candidats utilisent un prompt différent → ajouter le glossaire aussi.

### Étape 4 — Tests

```
it('compileGlossary returns non-empty string')
it('compileGlossary contains all 8 terms')
it('glossary does not contain metrics (CV, f26b, etc.)')
it('prompt V4 contains VOCABULAIRE OMEGA')
it('prompt V4 total tokens <= 1700')
```

### Étape 5 — NE PAS injecter dans les prompts des JUGES

Le glossaire est pour le SCRIBE (génération). Les juges LLM (Necessity V2,
Impact V1, Interiority V1) ont leur propre vocabulaire calibré dans leurs
rubrics. Ne PAS mélanger.

### Commit

```
feat(prompt): injection glossaire OMEGA — 8 termes opératoires

Le Scribe reçoit un vocabulaire partagé OMEGA qui REMPLACE
ses interprétations probabilistes par défaut.

8 termes : Souffle de Flaubert, Murmure de Duras, Respiration
maîtrisée, Nappe phrastique, Dilatation temporelle, Incarnation
sensorielle, Nécessité narrative, Correcteur externe.

Budget : ~200 tokens. Injecté dans prompt V4 après RHYTHM_ANCHOR.
Les juges LLM ne reçoivent PAS le glossaire (rubrics propres).

Module: src/input/omega-glossary.ts
```
