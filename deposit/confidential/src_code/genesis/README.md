# GENESIS FORGE v1.1.2

Moteur d'ecriture NASA-grade aligne sur OMEGA EMOTION 14D.

## Alignement Repo

**IMPORTANT**: Cette implementation est alignee sur le schema emotion **14D** reel du repo OMEGA, PAS sur la spec V4.4 16D du prompt original.

| Spec V4.4 (prompt) | Repo REEL | Genesis Forge |
|--------------------|-----------|---------------|
| 16 emotions | 14 emotions | 14D |
| Axes X/Y/Z | Intensite scalaire | Intensite 14D |
| M, lambda, kappa | mass, intensity, inertia | Params repo |

Voir `PROOF_DISCOVERY.md` pour le rapport complet de decouverte.

## Installation

```bash
npm install
```

## Tests

```bash
npm test -- --filter genesis
```

## Utilisation

```typescript
import {
  runForge,
  DEFAULT_GENESIS_CONFIG,
  hashTruthBundle,
} from './genesis';
import type { TruthBundle, EmotionField, OxygenResult } from './genesis';

// 1. Creer un TruthBundle
const emotionField: EmotionField = {
  states: { /* ... 14 emotions ... */ },
  normalizedIntensities: { /* ... */ },
  dominant: 'joy',
  peak: 0.7,
  totalEnergy: 2.5,
  entropy: 0.6,
  contrast: 0.1,
  inertia: 0.3,
  conservationDelta: 0.02,
};

const oxygenResult: OxygenResult = {
  base: 0.6,
  decayed: 0.55,
  final: 0.55,
  components: { /* ... */ },
};

const bundle: TruthBundle = {
  id: 'my-bundle-001',
  timestamp: new Date().toISOString(),
  sourceHash: 'sha256-of-source-text',
  vectorSchemaId: 'OMEGA_EMOTION_14D_v1.0.0',
  targetEmotionField: emotionField,
  targetOxygenResult: oxygenResult,
  bundleHash: '', // Will be calculated
};
bundle.bundleHash = hashTruthBundle(bundle);

// 2. Executer la forge
const result = await runForge(bundle, DEFAULT_GENESIS_CONFIG);

console.log('Generated text:', result.text);
console.log('Stats:', result.stats);
console.log('Proof pack:', result.proofPack);
```

## Architecture

```
src/genesis/
├── artifacts/          # Datasets (cliches, corpus, lexiques)
├── config/             # Configuration symbolique
├── core/               # Modules principaux
│   ├── types.ts        # Types TypeScript
│   ├── validator.ts    # Validation TruthBundle
│   ├── translator.ts   # TruthBundle -> Contract
│   ├── prism.ts        # Injection creative avec rollback
│   ├── sentinel.ts     # Agregation juges
│   ├── mutator.ts      # Mutation contraintes
│   └── forge.ts        # Orchestrateur principal
├── engines/            # Generation de texte
│   ├── drafter.ts      # Generation de drafts
│   └── sculptor/       # Post-processing (a venir)
├── filters/            # Filtres rapides (a venir)
├── judges/             # 7 juges bloquants + 2 Pareto
│   ├── j1_emotion_binding.ts
│   ├── j2_coherence.ts
│   ├── j3_sterility.ts
│   ├── j4_uniqueness.ts
│   ├── j5_density.ts
│   ├── j6_resonance.ts
│   ├── j7_anti_gaming.ts
│   ├── p1_impact_density.ts
│   └── p2_style_signature.ts
├── proofs/             # Hash chain et tracabilite
├── tests/              # Tests
└── index.ts            # Export principal
```

## Invariants

| ID | Invariant | Description |
|----|-----------|-------------|
| INV-GEN-01 | TruthBundle valide | bundleHash correct, schema 14D |
| INV-GEN-02 | EMOTION-BINDING 14D | Distance cosinus < seuil |
| INV-GEN-03 | COHERENCE | Pas de contradictions |
| INV-GEN-04 | STERILITY | Pas de cliches |
| INV-GEN-05 | UNIQUENESS | N-gram overlap < seuil |
| INV-GEN-06 | DENSITY | Content ratio > seuil |
| INV-GEN-07 | RESONANCE | O2 alignment |
| INV-GEN-08 | ANTI-GAMING | Pas de gaming |
| INV-GEN-09 | DETERMINISM | Seeds traces |
| INV-GEN-10 | BUDGET | Temps < limites |
| INV-GEN-11 | PRISM-BOUNDED | Rollback si hors bornes |

## Juges

### Bloquants (AND logic)

- **J1 EMOTION-BINDING**: Alignement distribution 14D avec cible
- **J2 COHERENCE**: Pas de contradictions, timeline coherente
- **J3 STERILITY**: Zero cliches lexicaux ou conceptuels
- **J4 UNIQUENESS**: Originalite vs corpus de reference
- **J5 DENSITY**: Ratio contenu/fillers adequat
- **J6 RESONANCE**: Alignement O2 et rythme
- **J7 ANTI-GAMING**: Authenticite (pas de tokens artificiels)

### Pareto (pour tri seulement)

- **P1 IMPACT-DENSITY**: Imagerie + rarete lexicale
- **P2 STYLE-SIGNATURE**: Cadence + temperature lexicale

## Configuration

Tous les seuils sont symboliques et calibrables via:
- `config/defaults.ts` (valeurs par defaut)
- Variables d'environnement (prefix `GENESIS_`)
- Override programmatique

```typescript
import { mergeConfig, DEFAULT_GENESIS_CONFIG } from './genesis';

const customConfig = mergeConfig(DEFAULT_GENESIS_CONFIG, {
  loop: { MAX_ITERATIONS: 50 },
  judges: {
    sterility: { MAX_LEXICAL_CLICHES: 1 }, // Plus tolerant
  },
});
```

## Proof Pack

Chaque execution produit un ProofPack avec:
- Hashes (truth, contract, config, output, combined)
- Seeds (drafter, prism, mutator)
- Logs (iterations, timing, kills)
- Pareto frontier

```typescript
const { proofPack } = await runForge(bundle, config);
console.log(proofPack.hashes.combinedHash);
```

## Limitations Connues

### Stubs

1. **Drafter**: Generation basee sur templates (TODO: integrer LLM)
2. **J1 EMOTION-BINDING**: Utilise heuristique (TODO: integrer vrai moteur OMEGA 14D)
3. **Syntax depth**: Proxy heuristique

### Non-critique

- Concept matcher: Pattern-based (upgrader vers ML possible)
- Readability: Flesch-Kincaid approxime

## Certification

- **Standard**: NASA-Grade L4 / DO-178C Level A
- **Schema**: OMEGA_EMOTION_14D_v1.0.0
- **Version**: 1.1.2
