# OMEGA — CLAUDE CODE PROMPT : ForgePacket Adapter pour V-RECAL-1
# Objectif : Permettre à engine.ts d'accepter un ForgePacket pré-construit

## CONTEXTE

runSovereignForge() prend un ForgePacketInput (plan + scene + style_profile)
et appelle assembleForgePacket() pour construire le ForgePacket.

Notre script V-RECAL-1 a déjà un ForgePacket complet (comme MINIMAL_FORGE_PACKET
dans les fixtures de test). Il faut pouvoir injecter ce ForgePacket directement
dans le pipeline engine.ts SANS passer par assembleForgePacket().

## CE QU'IL FAUT FAIRE

### Option A (recommandée) : Nouvelle fonction runSovereignForgeWithPacket()

Dans engine.ts, créer une variante qui accepte un ForgePacket pré-construit :

```typescript
export async function runSovereignForgeWithPacket(
  packet: ForgePacket,
  provider: SovereignProvider,
): Promise<SovereignForgeResult>
```

Cette fonction :
1. Saute assembleForgePacket() et validateForgePacket() — le packet est déjà validé
2. Exécute TOUT le reste du pipeline identiquement :
   - SymbolMap generation
   - bridgeSignatureFromSymbolMap
   - buildEmotionBriefFromPacket
   - Prompt V4 ou chunked generation
   - SemanticSlicer
   - PhysicsAudit
   - SovereignLoop
   - Duel
   - MicroSurgery
   - judgeAestheticV3
   - TargetedPatch
   - QualityReport

### Implémentation

Le plus simple : extraire le corps de runSovereignForge() après la ligne
`const packet = assembleForgePacket(input)` dans une fonction interne :

```typescript
// Fonction interne qui fait le vrai travail
async function executePipeline(
  packet: ForgePacket,
  provider: SovereignProvider,
  cdeInput?: CDEInput,
): Promise<SovereignForgeResult> {
  // ... tout le code existant après assembleForgePacket ...
}

// Existant — inchangé
export async function runSovereignForge(
  input: ForgePacketInput,
  provider: SovereignProvider,
  cdeInput?: CDEInput,
): Promise<SovereignForgeResult> {
  const packet = assembleForgePacket(input);
  const validation = validateForgePacket(packet);
  if (!validation.valid) throw new Error(...);
  return executePipeline(packet, provider, cdeInput);
}

// NOUVEAU — accepte un ForgePacket pré-construit
export async function runSovereignForgeWithPacket(
  packet: ForgePacket,
  provider: SovereignProvider,
  cdeInput?: CDEInput,
): Promise<SovereignForgeResult> {
  return executePipeline(packet, provider, cdeInput);
}
```

### Tests

- Vérifier que runSovereignForge() continue de fonctionner (régression)
- Vérifier que runSovereignForgeWithPacket() existe et est exportée
- npm test → tous les tests existants restent GREEN

### Commit

```
feat(engine): runSovereignForgeWithPacket() — accepte ForgePacket pre-construit

Permet le benchmark V-RECAL-1 avec ForgePacket direct sans GenesisPlan.
Refactoring interne: extraction executePipeline() comme fonction commune.
runSovereignForge() inchange (backward compatible).
```

## CONTRAINTES

- NE PAS modifier le comportement de runSovereignForge()
- NE PAS toucher aux étapes du pipeline
- Le refactoring est purement structurel (extraction de fonction)
- Tous les tests existants (1966) doivent rester GREEN
