# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT : V-ENGINE-BRIDGE
# Sprint 2 : Intégrer le moteur chunké v4 dans engine.ts
# ═══════════════════════════════════════════════════════════════════════════════
#
# Standard : NASA-Grade L4 / DO-178C Level A
# Branche : phase-r-metrology-rebuild
# Tests avant : 1911 + 31 doctrine = 1942 PASS
# Auteur : Claude (IA Principal)
# Autorité : Francky (Architecte Suprême)
#
# ═══════════════════════════════════════════════════════════════════════════════

## CONTEXTE

Le moteur PF_base_Duras_correcteur_K2_v4 est scellé (tag moteur-production-v1).
Il produit de la prose V2=100, GB=4.07 via un pipeline chunké autonome (4×750w).

PROBLÈME : ce moteur vit en dehors de engine.ts. Il n'utilise que 2/19 étages
du pipeline canonique OMEGA. Le MacroSScore (SAGA_READY) ne peut pas être
mesuré tant que le moteur n'est pas intégré dans engine.ts.

OBJECTIF : Créer un mode de génération chunké dans engine.ts, activé par flag,
qui utilise l'architecture K2 (PF+Duras) tout en bénéficiant de l'ensemble
du pipeline OMEGA (ForgePacket, SymbolMap, PhysicsAudit, SovereignLoop, etc.)

## ARCHITECTURE CIBLE

```
engine.ts (existant)
  │
  ├── Étapes 1-7 : ForgePacket, validation, SymbolMap, EmotionBrief, prompt
  │
  ├── Étape 8 : NOUVEAU — conditional
  │   │
  │   ├── Si OMEGA_CHUNKED_V4=1 :
  │   │   └── generateChunkedDraft(enrichedPacket, provider)
  │   │       → 4 appels LLM × ~750w = ~3000w assemblés
  │   │       → Utilise PF_PERSONA + RAPPEL_CHUNKS12/34_V4
  │   │       → Intègre SceneBrief du ForgePacket
  │   │       → Intègre les signature_words du SymbolMap enrichi
  │   │
  │   └── Sinon (mode actuel) :
  │       └── provider.generateDraft(prompt, mode, seed)
  │
  ├── Étapes 9-17 : SemanticSlicer, PhysicsAudit, SovereignLoop, etc.
  │   → S'appliquent sur la prose assemblée complète
  │
  └── Scoring : judgeAestheticV3 avec vrais juges LLM
```

## FICHIERS À CRÉER

### 1. `src/generation/chunked-generator.ts` (NOUVEAU)

Ce module encapsule toute la logique du moteur v4 chunké.

```typescript
/**
 * OMEGA — Chunked Generator K2 (Moteur v4)
 * 
 * Génère de la prose en 4 chunks de ~750 mots chacun.
 * Architecture K2 : PF_PERSONA (Flaubert+Proust) + correcteur Duras externe.
 * Lore-coding pur : zéro chiffre prescriptif (Loi L3).
 *
 * RAPPEL_CHUNKS12 : Souffle de Flaubert + Murmure de Duras (chunks 1-2)
 * RAPPEL_CHUNKS34_V4 : Correcteur Duras externe + nappe phrastique (chunks 3-4)
 */

export interface ChunkedGenerationResult {
  readonly prose: string;           // Prose assemblée (4 chunks concaténés)
  readonly chunks: readonly string[]; // Les 4 chunks individuels
  readonly words_per_chunk: readonly number[];
  readonly total_words: number;
  readonly api_calls: number;       // Toujours 4
}

export interface ChunkedGenerationInput {
  readonly sceneBrief: string;      // Brief de la scène (du ForgePacket/CDE)
  readonly signatureWords: readonly string[]; // Du SymbolMap enrichi
  readonly language: 'fr' | 'en';
}

export async function generateChunkedDraft(
  input: ChunkedGenerationInput,
  provider: SovereignProvider,
): Promise<ChunkedGenerationResult>
```

**Contenu des constantes (SCELLÉES — lore-coding L3) :**

```
PF_PERSONA = `Tu es un duo d'écrivains : Gustave Flaubert et Marcel Proust.

Flaubert : les périodes classiques, les subordonnées en cascade,
le gueuloir — chaque phrase doit pouvoir être lue à voix haute.
La beauté de la structure est une fin en soi.

Proust : la profondeur, le temps dilaté, chaque sensation dépliée sur
toute surface.

Les deux travaillent ensemble. Flaubert construit, Proust creuse.
Les phrases longues sont bienvenues — c'est leur nature commune.`

RAPPEL_CHUNKS12 = `RAPPEL DUO : Flaubert construit les périodes, Proust creuse chaque sensation.

SOUFFLE DE FLAUBERT : chaque période se déploie jusqu'à épuiser la sensation
ou l'idée — elle prend le temps d'une respiration complète, ni écourtée
ni interminable. Le rythme naturel d'une phrase lue à voix haute
dans le gueuloir.

MURMURE DE DURAS : de loin en loin, une phrase brève et nue coupe le flux
— un verdict, pas un résumé. Elle apparaît comme un silence entre deux
mouvements d'orchestre.`

RAPPEL_CHUNKS34_V4 = `RAPPEL DUO : Flaubert construit les périodes, Proust creuse chaque sensation.

CORRECTEUR DE RYTHME EXTERNE : régulièrement, à intervalles sentis,
brise le flot des longues périodes par une phrase-couteau — sèche,
factuelle, quelques mots à peine. Pas exceptionnellement : souvent.
Flaubert et Proust reprennent aussitôt le contrôle. Duras ponctionne,
disparaît, revient.

ANCRE DE TENUE : la cadence de fin ne s'effondre pas.
Les chunks 3-4 gardent le souffle installé par les chunks 1-2.
Duras frappe par éclairs brefs — elle n'abaisse pas
la nappe phrastique dominante. Même dans le dialogue
ou la confrontation, les répliques s'enchâssent dans
des périodes narratives et descriptives amples.
La lame Duras crée le contraste — elle ne change pas
le registre de fond.

COHÉRENCE DE LONGUEUR : la longueur moyenne des phrases reste dans
la continuité de ce qui précède — ni soudainement plus courte,
ni soudainement plus longue.`
```

**Logique de génération (4 chunks) :**

```
Pour chunk = 1 à 4 :
  rappel = chunk <= 2 ? RAPPEL_CHUNKS12 : RAPPEL_CHUNKS34_V4
  last200 = 200 derniers mots de la prose déjà générée

  Si chunk == 1 :
    prompt = PF_PERSONA + rappel + "Tu écris le DÉBUT de cette scène :\n\n"
             + sceneBrief + "\n\nÉcris les 750 premiers mots. Installe l'atmosphère."
             + "\nPas de préambule. Encadre EXCLUSIVEMENT ta prose entre <prose> et </prose>."
  
  Si chunk == 4 (dernier) :
    prompt = PF_PERSONA + rappel + "Continue et TERMINE cette scène.\n\n"
             + "200 derniers mots :\n\"" + last200 + "\"\n\n"
             + "Écris les 750 derniers mots. Conclus sans résoudre — laisse une ouverture."
             + "\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>."
  
  Sinon (chunks 2-3) :
    prompt = PF_PERSONA + rappel + "Continue cette scène.\n\n"
             + "200 derniers mots :\n\"" + last200 + "\"\n\n"
             + "Écris les 750 mots suivants."
             + "\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>."

  chunkProse = provider.generateDraft(prompt, 'chunked_k2', seed + '_c' + chunk)
  → extraire le contenu entre <prose> et </prose>
  → si pas de balises, prendre tout le texte
  
  fullProse += '\n\n' + chunkProse (sauf chunk 1)
  
  Pause 2s entre chaque chunk (politesse API)

Retourner { prose: fullProse, chunks, words_per_chunk, total_words, api_calls: 4 }
```

**Le sceneBrief doit être extrait du ForgePacket :**
- intent.scene_goal + intent.story_goal
- beats (actions principales)
- emotion_contract (dominant Q1/Q4 pour le ton)
- Formaté en langage dramatique (pas backend)

**Les signatureWords enrichissent le prompt chunk 1 :**
- Ajouter une ligne : "Mots à tisser naturellement dans la prose : [liste]"
- Max 10 mots, issus de style_genome.lexicon.signature_words

### 2. `src/generation/forge-to-brief.ts` (NOUVEAU)

Convertit un ForgePacket en SceneBrief dramatique pour le moteur chunké.

```typescript
export function forgePacketToSceneBrief(packet: ForgePacket): string
```

Logique :
- Extraire intent.scene_goal, intent.story_goal
- Extraire les beats (actions principales, max 4)
- Extraire le dominant émotionnel de Q1 et Q4
- Formater en prose dramatique (pas de JSON, pas d'IDs)
- Résultat ≤ 150 tokens (INV-CDE-01)

Exemple de sortie :
```
Une femme seule dans une maison au bord de la mer, en hiver.
Elle attend quelqu'un qui ne viendra pas. Le vent secoue les volets.
Elle prépare du thé, regarde par la fenêtre. La lumière baisse.
Le ton initial est l'attente ; la scène finit dans la résignation.
```

### 3. Modification de `src/engine.ts`

**ATTENTION : engine.ts est du code sealed Phase W. Les modifications doivent être minimales et non-intrusives.**

Ajouter les imports :
```typescript
import { generateChunkedDraft, isChunkedV4Active } from './generation/chunked-generator.js';
import { forgePacketToSceneBrief } from './generation/forge-to-brief.js';
```

Ajouter le flag :
```typescript
// Dans generation/chunked-generator.ts :
export function isChunkedV4Active(): boolean {
  return process.env.OMEGA_CHUNKED_V4 === '1';
}
```

Modifier la section de génération du draft initial (après la construction du prompt, avant SemanticSlicer) :

```typescript
// AVANT (existant) :
let initialDraft = await provider.generateDraft(
  prompt.sections.map((s) => s.content).join('\n\n'),
  SOVEREIGN_CONFIG.DRAFT_MODES[0],
  enrichedPacket.seeds.llm_seed,
);

// APRÈS (conditionnel) :
let initialDraft: string;

if (isChunkedV4Active()) {
  // MOTEUR V4 CHUNKÉ — K2 architecture (PF+Duras, 4×750w)
  console.log('[V4-CHUNKED] Moteur v4 K2 activé — 4 chunks × 750w');
  const sceneBrief = forgePacketToSceneBrief(enrichedPacket);
  const chunkedResult = await generateChunkedDraft(
    {
      sceneBrief,
      signatureWords: enrichedPacket.style_genome.lexicon.signature_words,
      language: enrichedPacket.language as 'fr' | 'en',
    },
    provider,
  );
  initialDraft = chunkedResult.prose;
  console.log(`[V4-CHUNKED] ${chunkedResult.total_words}w en ${chunkedResult.api_calls} API calls`);
  console.log(`[V4-CHUNKED] Chunks: ${chunkedResult.words_per_chunk.join(', ')}w`);
} else {
  initialDraft = await provider.generateDraft(
    prompt.sections.map((s) => s.content).join('\n\n'),
    SOVEREIGN_CONFIG.DRAFT_MODES[0],
    enrichedPacket.seeds.llm_seed,
  );
}
```

**Le reste du pipeline reste INCHANGÉ.** SemanticSlicer, PhysicsAudit, SovereignLoop, Duel, MicroSurgery, judgeAestheticV3 — tout s'applique sur la prose assemblée.

### 4. `tests/generation/chunked-generator.test.ts` (NOUVEAU)

Tests unitaires :

```
describe('ChunkedGenerator') :

  it('isChunkedV4Active retourne false par défaut')
  it('isChunkedV4Active retourne true quand OMEGA_CHUNKED_V4=1')
  
  it('forgePacketToSceneBrief produit un brief ≤ 150 tokens')
  it('forgePacketToSceneBrief ne contient aucun ID système')
  it('forgePacketToSceneBrief ne contient aucun JSON')
  it('forgePacketToSceneBrief contient le scene_goal')
  
  it('PF_PERSONA ne contient aucun chiffre prescriptif (L3)')
  it('RAPPEL_CHUNKS12 ne contient aucun chiffre prescriptif (L3)')
  it('RAPPEL_CHUNKS34_V4 ne contient aucun chiffre prescriptif (L3)')
  
  it('prompt chunk 1 contient PF_PERSONA + RAPPEL_CHUNKS12 + sceneBrief')
  it('prompt chunks 2-3 contient last200')
  it('prompt chunk 4 contient "TERMINE"')
  it('chunks 1-2 utilisent RAPPEL_CHUNKS12')
  it('chunks 3-4 utilisent RAPPEL_CHUNKS34_V4')
  
  it('aucun prompt ne contient open_threads ou charStates (INV-PROMPT-01)')
```

**Utiliser un mock provider qui capture les prompts pour vérifier la structure.**

## INVARIANTS À RESPECTER

| Invariant | Vérification |
|-----------|-------------|
| INV-PROMPT-01 | Aucun open_threads/charStates dans les prompts chunkés |
| LOI-L3 | Zéro chiffre prescriptif dans PF_PERSONA, RAPPEL_CHUNKS12, RAPPEL_CHUNKS34_V4 |
| INV-CDE-01 | SceneBrief issu de forgePacketToSceneBrief ≤ 150 tokens |
| L27 | Les seuils contextuels sont respectés (vérifié en aval par le scoring existant) |
| Fail-closed | Si un chunk échoue (pas de <prose>), throw Error — pas de prose partielle |

## COMMANDES D'EXÉCUTION

```bash
# 1. Créer les fichiers
# (Claude Code crée directement)

# 2. Vérifier la compilation
cd packages/sovereign-engine
npx tsc --noEmit

# 3. Lancer les tests existants (régression)
npm test

# 4. Lancer les nouveaux tests
npx vitest run tests/generation/chunked-generator.test.ts

# 5. Test d'intégration rapide (optionnel si API dispo)
OMEGA_CHUNKED_V4=1 npx tsx scripts/test-vrecal1-b0-pilot.ts

# 6. Commit
git add -A
git commit -m "feat(engine): V-ENGINE-BRIDGE — moteur chunké v4 intégré dans engine.ts

- Nouveau module: src/generation/chunked-generator.ts (K2 architecture)
- Nouveau module: src/generation/forge-to-brief.ts (ForgePacket → SceneBrief)
- engine.ts: conditional chunked generation (OMEGA_CHUNKED_V4=1)
- Tests: chunked-generator.test.ts (15+ assertions)
- Lore-coding L3: zéro chiffre prescriptif
- INV-PROMPT-01: non-contamination vérifiée
- Pipeline complet: SymbolMap, PhysicsAudit, SovereignLoop, Duel, MicroSurgery
  tous actifs sur la prose chunked assemblée

Moteur v4 devient citoyen natif de engine.ts
V-RECAL-1 réel désormais possible"
git push origin phase-r-metrology-rebuild
```

## CE QUI NE DOIT PAS CHANGER

- Le pipeline post-génération (étapes 9-17) reste INTOUCHÉ
- Le mode non-chunké (par défaut) continue de fonctionner exactement comme avant
- Les 1942 tests existants doivent rester GREEN
- Le flag OMEGA_CHUNKED_V4 est OFF par défaut — activation explicite uniquement
- Le Duel dans engine.ts : quand le moteur chunké est actif, le duel génère
  3 drafts × 4 chunks = 12 API. C'est acceptable et documenté.

## VÉRIFICATION POST-EXÉCUTION

Après exécution, vérifier :

1. `npm test` → 1942+ PASS (zéro régression)
2. Les nouveaux tests → tous GREEN
3. `npx tsc --noEmit` → zéro erreur TypeScript
4. Grep "60-80 mots" dans src/ → 0 résultats (L3)
5. Grep "3 à 6 mots" dans src/ → 0 résultats (L3)
6. Grep "open_threads" dans src/generation/ → 0 résultats (INV-PROMPT-01)

## BUDGET

- 0 API pour la construction + tests unitaires (tout mock)
- 4 API pour un test d'intégration optionnel (1 run chunké)

---

*Prompt Claude Code — V-ENGINE-BRIDGE*
*Standard NASA-Grade L4 / DO-178C Level A*
*"Le moteur est bon. Le pipeline est bon. Il faut les marier."*
