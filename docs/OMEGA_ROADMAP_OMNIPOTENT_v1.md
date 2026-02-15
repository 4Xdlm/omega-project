# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#
#   OMEGA OMNIPOTENT — ROADMAP TECHNIQUE COMPLÈTE
#   "100% des données exploitées — zéro perte — zéro approximation"
#
#   Date: 2026-02-15
#   Architecte Suprême: Francky
#   IA Principal: Claude (Anthropic)
#   Audit Hostile: ChatGPT
#   Standard: NASA-Grade L4 / DO-178C / MIL-STD
#
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

STATUS: PRÊT À EXÉCUTER
VERSION: 1.1
CONTEXTE: Phase S — Sovereign Style Engine (ACTIVE)
PARENT: OMEGA_SUPREME_ROADMAP v5.0
TESTS ACTUELS: 471/471 PASS (304 omega-forge, 167 sovereign)
BEST SCORE: 91.41 composite (PITCH, 0.59 sous SEAL)

---

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#                    RÈGLE CARDINALE — VERROUILLAGE ROADMAP
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   RULE-ROADMAP-01 — OBLIGATION DE SUIVI (NON NÉGOCIABLE)                             ║
║                                                                                       ║
║   Tant que cette roadmap n'est pas terminée (Sprint 1 → Sprint 4) :                 ║
║                                                                                       ║
║   1. À CHAQUE DÉBUT DE PHASE/COMMIT :                                                ║
║      → L'IA consulte ce document                                                     ║
║      → L'IA affiche l'avancement actuel (où on en est)                               ║
║      → L'IA identifie le prochain commit à exécuter                                  ║
║                                                                                       ║
║   2. AUCUNE DÉVIATION AUTORISÉE :                                                    ║
║      → On suit les sprints dans l'ordre (1 → 2 → 3 → 4)                             ║
║      → On suit les commits dans l'ordre (1.1 → 1.2 → ... → 1.8)                    ║
║      → Aucun saut, aucun raccourci, aucune "optimisation" du plan                   ║
║                                                                                       ║
║   3. BILAN OBLIGATOIRE À CHAQUE REPRISE DE SESSION :                                 ║
║      → Lire ce document EN PREMIER                                                   ║
║      → Afficher : Sprint X — Commit Y.Z — Status [DONE/EN COURS/TODO]               ║
║      → Afficher la checklist de fin de sprint si on termine un sprint                ║
║                                                                                       ║
║   4. MODIFICATION DE LA ROADMAP :                                                    ║
║      → Uniquement sur décision explicite de l'Architecte Suprême                     ║
║      → Toute modification = nouvelle version (v1.1, v2.0, etc.)                      ║
║      → L'IA ne peut PAS modifier ce plan de sa propre initiative                     ║
║                                                                                       ║
║   VIOLATION = CORRUPTION SILENCIEUSE DU PROJET                                       ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

## Format de suivi obligatoire (à chaque début de travail)

```markdown
## 📍 AVANCEMENT ROADMAP OMNIPOTENT

| Sprint | Commit | Description | Status |
|--------|--------|-------------|--------|
| 1 | 1.1 | @omega/signal-registry | ⬜ TODO |
| 1 | 1.2 | omega-forge : factorisation trajectory | ⬜ TODO |
| 1 | 1.3 | omega-forge : ForgeEmotionBrief + Producer Gate | ⬜ TODO |
| 1 | 1.4 | sovereign : suppression doublon + Consumer Gate | ⬜ TODO |
| 1 | 1.5 | Fix language propagation (5 fichiers) | ⬜ TODO |
| 1 | 1.6 | Golden vectors + invariant tests | ⬜ TODO |
| 1 | 1.7 | CI Gates (No Shadow + Build Stale) | ⬜ TODO |
| 1 | 1.8 | ADR documentation | ⬜ TODO |
| 2 | 2.1 | Constraint Compiler | ⬜ TODO |
| 2 | 2.2 | Prompt assembler + section physique | ⬜ TODO |
| 2 | 2.3 | LIVE run comparatif | ⬜ TODO |
| 3 | 3.1 | Physics Audit (post-gen) | ⬜ TODO |
| 3 | 3.2 | Delta enrichi (4→6 dimensions) | ⬜ TODO |
| 3 | 3.3 | Prescriptions dans sovereign loop | ⬜ TODO |
| 3 | 3.4 | physics_compliance sous-axe | ⬜ TODO |
| — | — | 20 LIVE runs calibration | ⬜ TODO |
| 4 | 4.1 | Quality M1-M12 rapport annexe | ⬜ TODO |
| 4 | 4.2 | Activation physics_compliance | ⬜ TODO |
| 4 | 4.3 | IDL + codegen (optionnel) | ⬜ TODO |
| 4 | 4.4 | Compat contrôlée v1/v2 | ⬜ TODO |

Prochain : Sprint X — Commit Y.Z
```

---

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#                    PARTIE 0 — POURQUOI CE DOCUMENT
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

## Problème identifié (Audit S3)

sovereign-engine utilise ~12% des capacités de omega-forge.
Le moteur d'écriture PERD :
- Espace XYZ (3D émotionnel)
- Canonical Table (physique des émotions : M, R, λ, κ)
- 6 lois physiques émotionnelles
- Quality M1-M12 (12 métriques indépendantes)
- Diagnostic (dead zones, prescriptions chirurgicales)
- Modèle de décroissance (Law 2)
- Mélange émotionnel (Law 6)
- Conservation d'énergie (Law 5)

Bug critique : `analyzeEmotionFromText()` reçoit `'auto'` au lieu de `packet.language`.
Duplication critique : `buildPrescribedTrajectory` réimplémenté dans sovereign (sans XYZ).

## Décisions verrouillées (Francky + Claude + ChatGPT — UNANIMES)

| Décision | Choix | Tranché par |
|----------|-------|-------------|
| SSOT émotion | Option A : omega-forge = source, sovereign = consommateur | Unanime |
| `persistence_ceiling` | Obligatoire dans contract, FAIL si absent | Francky |
| Version inconnue | FAIL strict, compat contrôlée via flag + fenêtre bornée | Francky |
| Sprints | Séparés (1 sprint = 1 périmètre = 1 mesure d'impact) | Francky |
| Signal Registry | Package neutre `@omega/signal-registry` | ChatGPT + Francky |
| Registry format | Source TS directe (Sprint 1). IDL+codegen = P4 | Claude + ChatGPT |
| Budget prompt physique | 800 tokens max (configurable via contract) | Claude + ChatGPT |
| Fail mode | Hybride : fail-closed (required) + degrade-explicit (optional) | Claude + ChatGPT |

---

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#                    PARTIE I — ARCHITECTURE CIBLE
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

## Nouveaux packages

```
omega-project/packages/
├── signal-registry/          ← NOUVEAU — gouvernance des signaux
│   ├── src/
│   │   ├── registry.ts       ← OMEGA_SIGNAL_REGISTRY (tableau immutable)
│   │   ├── types.ts          ← SignalDescriptor, SignalId (union type)
│   │   ├── validators.ts     ← validateProducerOutputs, validateConsumerRequirements
│   │   └── index.ts          ← exports publics + registry_hash
│   ├── __tests__/
│   │   └── registry.test.ts  ← REG-01 à REG-05
│   ├── package.json          ← @omega/signal-registry
│   └── tsconfig.json
│
├── omega-forge/              ← EXISTANT — SSOT émotion
│   ├── src/
│   │   ├── physics/
│   │   │   ├── trajectory-analyzer.ts  ← MODIFIÉ (factorisation core)
│   │   │   ├── emotion-brief.ts        ← NOUVEAU (ForgeEmotionBrief)
│   │   │   └── ... (existants inchangés)
│   │   ├── index.ts                    ← MODIFIÉ (nouveaux exports)
│   │   └── config.ts                   ← MODIFIÉ (DEFAULT_PERSISTENCE_CEILING)
│   └── package.json                    ← MODIFIÉ (dépend de signal-registry)
│
├── sovereign-engine/         ← EXISTANT — moteur d'écriture
│   ├── src/
│   │   ├── input/
│   │   │   ├── forge-packet-assembler.ts  ← MODIFIÉ (suppression doublon + brief)
│   │   │   ├── prompt-assembler-v2.ts     ← MODIFIÉ (section physique compilée)
│   │   │   └── constraint-compiler.ts     ← NOUVEAU
│   │   ├── oracle/
│   │   │   ├── physics-audit.ts           ← NOUVEAU (post-gen)
│   │   │   ├── axes/physics-compliance.ts ← NOUVEAU (sous-axe informatif)
│   │   │   └── macro-axes.ts             ← MODIFIÉ (intégration physics)
│   │   ├── delta/
│   │   │   ├── delta-physics.ts           ← NOUVEAU (6ème dimension)
│   │   │   └── delta-report.ts           ← MODIFIÉ (4→6 dimensions)
│   │   ├── types.ts                      ← MODIFIÉ (ForgeEmotionBrief, etc.)
│   │   └── engine.ts                     ← MODIFIÉ (pipeline enrichi)
│   └── package.json                      ← MODIFIÉ (dépend de signal-registry)
│
└── canon-kernel/             ← EXISTANT — canonicalize, sha256 (INCHANGÉ)
```

## 5 Gates

| Gate | Quoi | Où | Quand |
|------|------|----|-------|
| GATE-1 Producer | Brief valide, hashable, capabilities correctes | omega-forge sortie | Chaque run |
| GATE-2 Consumer | Signaux required présents, version reconnue | sovereign entrée | Chaque run |
| GATE-3 Exhaustiveness | Outputs déclarés = outputs produits, language propagé | Pipeline | Chaque run |
| GATE-4 No Shadow | Regex + allowlist : sovereign n'implémente rien de forge | CI | Chaque commit |
| GATE-5 Build Stale | dist timestamp >= src timestamp | Pre-test | Chaque LIVE run |

## 12 Invariants

| ID | Description | Gate | Sprint |
|----|-------------|------|--------|
| SSOT-EMO-01 | Sovereign n'exporte aucun symbole trajectory/XYZ/canonical/law | GATE-4 | 1 |
| SSOT-EMO-02 | Golden vectors : 10 contrats → hash stable (14D + XYZ) | Test | 1 |
| LANG-01 | Tout scoring texte utilise `packet.language`, jamais `'auto'` | GATE-3 | 1 |
| NO-MAGIC-01 | `persistence_ceiling` jamais inline, toujours injecté | GATE-3 | 1 |
| NO-MAGIC-02 | Tout seuil physique paramétré via contract, optionnel si non calibré | GATE-3 | 2 |
| BRIEF-01 | `brief_hash === sha256(canonicalize(brief sans brief_hash))` | GATE-1 | 1 |
| BRIEF-02 | `capabilities[]` = champs réellement présents | GATE-1 | 1 |
| BRIEF-03 | `schema_version` reconnu par consumer | GATE-2 | 1 |
| EXH-01 | Tout signal required du consumer présent dans capabilities | GATE-3 | 1 |
| BUILD-01 | dist timestamp >= src timestamp avant LIVE run | GATE-5 | 1 |
| COMPILE-01 | Section physique prompt ≤ budget tokens | Compiler | 2 |
| COMPILE-02 | Même brief → même prompt compilé (déterminisme) | Test | 2 |
| REG-01 | Tout signal_id unique dans registry | Test | 1 |
| REG-02 | Tout producer déclaré existe (allowlist) | Test | 1 |
| REG-03 | `dimensions` cohérentes (si définies, ex: 14 pour 14D) | Test | 1 |
| REG-04 | `required_params` non vides si signal critique | Test | 1 |
| REG-05 | `registry_hash` stable (canon) | Test | 1 |

---

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#                    PARTIE II — SPRINTS DÉTAILLÉS
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
#  SPRINT 1 — FONDATION : SSOT + BRIEF + REGISTRY + GATES
#  Périmètre : sécuriser les données, éliminer duplication et perte
#  Risque : MEDIUM (touche au cœur du pipeline)
#  Critère de sortie : 0 duplication, 0 perte, 0 magic number, 0 'auto'
# ─────────────────────────────────────────────────────────────────────────────

## Commit 1.1 — @omega/signal-registry (NOUVEAU PACKAGE)

### Fichiers à créer

**`packages/signal-registry/package.json`**
```json
{
  "name": "@omega/signal-registry",
  "version": "1.0.0",
  "type": "module",
  "main": "src/index.ts",
  "dependencies": {
    "@omega/canon-kernel": "workspace:*"
  }
}
```

**`packages/signal-registry/src/types.ts`**
```
SignalDescriptor {
  signal_id: string
  producer: string                           // 'omega-forge' | 'sovereign-engine' | 'config'
  stability: 'stable' | 'experimental' | 'deprecated'
  required_params: string[]
  dimensions?: number
  description: string
}
SignalId = union type de tous les signal_id
```

**`packages/signal-registry/src/registry.ts`**
```
OMEGA_SIGNAL_REGISTRY: readonly SignalDescriptor[]
  Contenu (22 signaux) :
  ── EMOTION (producer: omega-forge) ──
  emotion.trajectory.prescribed.14d      stable    [persistence_ceiling]            dim=14
  emotion.trajectory.prescribed.xyz      stable    [persistence_ceiling, canonical_table]
  emotion.physics_profile                stable    [canonical_table]
  emotion.transition_map                 stable    [canonical_table]
  emotion.decay_expectations             stable    [canonical_table]
  emotion.blend_zones                    stable    []
  emotion.energy_budget                  stable    []
  emotion.forbidden_transitions          stable    [canonical_table]
  emotion.laws.compliance                experimental [canonical_table]
  emotion.dead_zones                     experimental [persistence_ceiling]
  emotion.prescriptions                  experimental []
  emotion.quality.m1_m12                 experimental []

  ── TENSION (producer: sovereign-engine) ──
  tension.curve                          stable    []
  tension.rupture                        stable    []

  ── NARRATIVE (producer: sovereign-engine) ──
  beats.coverage                         stable    []
  style.genome                           stable    []
  symbol.map                             stable    [language]

  ── SCORING (producer: sovereign-engine) ──
  scoring.ecc                            stable    []
  scoring.rci                            stable    []
  scoring.sii                            stable    []
  scoring.ifi                            stable    []

  ── META (producer: config) ──
  meta.language                          stable    []
```

**`packages/signal-registry/src/validators.ts`**
```
validateProducerOutputs(producer, capabilities[], params) → ValidationResult
  - Vérifie que chaque capability est dans le registry
  - Vérifie que le producer correspond
  - Vérifie que les required_params sont présents dans params
  - FAIL si un capability déclaré n'existe pas dans le registry

validateConsumerRequirements(required[], optional[], capabilities[]) → ValidationResult
  - Vérifie que tous les required sont dans capabilities
  - Log WARNING pour les optional manquants
  - Retourne degraded_signals[] pour les optionnels absents
  - FAIL si un required manque
```

**`packages/signal-registry/src/index.ts`**
```
export { OMEGA_SIGNAL_REGISTRY, REGISTRY_HASH }
export type { SignalDescriptor, SignalId }
export { validateProducerOutputs, validateConsumerRequirements }
```

### Tests (REG-01 → REG-05)
- REG-01 : tous signal_id uniques
- REG-02 : tous producers dans allowlist ['omega-forge', 'sovereign-engine', 'config']
- REG-03 : dimensions cohérentes (emotion.trajectory.prescribed.14d → dim=14)
- REG-04 : required_params non vides si stability='stable'
- REG-05 : REGISTRY_HASH = sha256(canonicalize(OMEGA_SIGNAL_REGISTRY)) stable

### Commit message
```
feat(signal-registry): create @omega/signal-registry package [REG-01..05]
```

---

## Commit 1.2 — omega-forge : factorisation trajectory core

### Fichier modifié : `packages/omega-forge/src/physics/trajectory-analyzer.ts`

**Action :**
1. Extraire une fonction PRIVÉE `buildTrajectoryCore(params)` contenant l'algorithme commun
   - params: { waypoints, totalParagraphs, scopeFn, table, C }
   - scopeFn: (position: number) => number  // identity pour global, lerp pour scene
2. Refactorer `buildPrescribedTrajectory()` pour appeler core avec scopeFn = identity
3. Ajouter `buildScenePrescribedTrajectory(waypoints, sceneStartPct, sceneEndPct, totalParagraphs, table, C)`
   - scopeFn = lerp(sceneStart, sceneEnd)
4. Les deux wrappers appellent LE MÊME core → zéro duplication interne

**Tests :**
- Vérifier que `buildPrescribedTrajectory` produit les mêmes résultats qu'avant (régression)
- Vérifier que `buildScenePrescribedTrajectory` produit des résultats dans le scope scene
- Golden hash : même inputs → même output → même hash

### Commit message
```
feat(omega-forge): factorize trajectory core + buildScenePrescribedTrajectory [SSOT-EMO-01]
```

---

## Commit 1.3 — omega-forge : ForgeEmotionBrief + Producer Gate

### Fichier nouveau : `packages/omega-forge/src/physics/emotion-brief.ts`

**Fonctions à implémenter :**

```
computeForgeEmotionBrief(params: BriefParams) → ForgeEmotionBrief

Avec BriefParams :
  waypoints: EmotionWaypoint[]
  sceneStartPct: number
  sceneEndPct: number
  totalParagraphs: number
  canonicalTable: CanonicalEmotionTable
  persistenceCeiling: number           // OBLIGATOIRE
  language: 'fr' | 'en'               // OBLIGATOIRE
  producerBuildHash: string

Sous-fonctions (privées) :
  computePhysicsProfiles(activeEmotions, table) → EmotionPhysicsProfile[]
    - Pour chaque émotion active dans la scène
    - Lit M, lambda, kappa depuis canonical table
    - Calcule decay_half_life = ln(2) / lambda × scaling factor
    - Génère behavior_fr (texte narratif)

  computeTransitionMap(quartileTargets, table) → TransitionConstraint[]
    - Pour chaque paire de quartiles consécutifs
    - Calcule required_force via Law 1 (M × R)
    - Vérifie feasibility via Law 3
    - Génère narrative_hint_fr

  computeForbiddenTransitions(table) → ForbiddenTransition[]
    - Paires d'émotions dont la transition directe viole Law 3
    - Pre-calculé : évite recalcul à chaque run

  computeDecayExpectations(trajectory, table) → DecayExpectation[]
    - Identifie les pics émotionnels dans la trajectoire
    - Calcule la décroissance attendue (Law 2: e^(-lambda * Δt))
    - Génère instruction_fr

  detectBlendZones(trajectory) → BlendZone[]
    - Identifie les paragraphes où 2+ émotions sont > 20% d'intensité
    - Calcule la distribution normalisée
    - Génère instruction_fr

  computeEnergyBudget(trajectory) → EnergyBudget
    - Calcule total_in (somme intensités montantes)
    - Calcule total_out (somme intensités descendantes + dissipation)
    - Vérifie Law 5 (conservation)
    - Génère constraint_fr
```

**behavior_fr — table de traduction (intégrée, pas magic) :**
```
La traduction est DÉTERMINISTE, basée sur M et lambda :
  M < 4 → "légère, mobile"
  M 4-6 → "modérée, mesurée"
  M > 6 → "lourde, s'installe lentement"

  lambda > 0.15 → "arrive vite, repart vite"
  lambda 0.08-0.15 → "rythme modéré"
  lambda < 0.08 → "persiste longtemps une fois installée"

  kappa > 1.5 → "fortement couplée aux émotions voisines"
  kappa < 0.7 → "indépendante, résiste à la contamination"

Les seuils sont configurables via BriefConfig (pas inline).
```

**Producer Gate (validation avant retour) :**
```
validateBrief(brief) :
  ✓ schema_version === 'forge.emotion.v1'
  ✓ persistence_ceiling > 0
  ✓ language ∈ {'fr', 'en'}
  ✓ trajectory.length > 0
  ✓ chaque PrescribedState a target_14d (14 dimensions exactes)
  ✓ chaque PrescribedState a target_omega (XYZ)
  ✓ quartile_targets.length === 4
  ✓ capabilities[] contient tout ce qui est réellement rempli
  ✓ brief_hash === sha256(canonicalize(brief sans brief_hash))
  ✓ canonical_table_hash === sha256(canonicalize(table))
  ✓ Aucun champ volatil dans le hash (pas de timestamp, pas de path)
  FAIL → exception avec diagnostic
```

**Canonicalization spec (piège #2 ChatGPT) :**
```
- Utilise canonicalize() de @omega/canon-kernel (déjà testé)
- Tri des clés alphabétique
- Floats avec toFixed(6) pour stabilité
- Pas de NaN/Infinity
- Pas de timestamps dans le brief hashé
- Pas de chemins machine
```

### Fichier modifié : `packages/omega-forge/src/config.ts`
- Ajouter `DEFAULT_PERSISTENCE_CEILING = 100` avec commentaire + version
- Ajouter `DEFAULT_BEHAVIOR_THRESHOLDS` (M, lambda, kappa seuils)
- Documenter : "ces defaults sont des fallbacks de config, pas des valeurs contract"

### Fichier modifié : `packages/omega-forge/src/index.ts`
- Exporter `computeForgeEmotionBrief`
- Exporter `buildScenePrescribedTrajectory`
- Exporter `DEFAULT_CANONICAL_TABLE`
- Exporter `DEFAULT_PERSISTENCE_CEILING`
- Exporter types : `ForgeEmotionBrief`, `EmotionPhysicsProfile`, etc.

### Fichier nouveau : `packages/omega-forge/src/physics/emotion-brief-types.ts`
- Toutes les interfaces du brief (ForgeEmotionBrief, EmotionPhysicsProfile, etc.)

### Tests
- BRIEF-01 : hash stable
- BRIEF-02 : capabilities = champs réels
- BRIEF-03 : schema_version vérifié
- Régression : les 304 tests existants passent toujours

### Commit message
```
feat(omega-forge): ForgeEmotionBrief + Producer Gate [BRIEF-01..03]
```

---

## Commit 1.4 — sovereign-engine : suppression doublon + Consumer Gate

### Fichier modifié : `packages/sovereign-engine/src/input/forge-packet-assembler.ts`

**Action :**
1. **SUPPRIMER** lignes ~140-210 (local `buildScenePrescribedTrajectory`) — hard delete
2. Importer depuis omega-forge :
   ```typescript
   import {
     buildScenePrescribedTrajectory,
     computeForgeEmotionBrief,
     DEFAULT_CANONICAL_TABLE,
   } from '@omega/omega-forge';
   ```
3. Importer depuis signal-registry :
   ```typescript
   import { validateConsumerRequirements } from '@omega/signal-registry';
   ```
4. Dans `assembleForgePacket()` :
   - Appeler `computeForgeEmotionBrief()` avec les paramètres du packet
   - Stocker le brief complet dans le ForgePacket
   - Appeler `validateConsumerRequirements()` (Consumer Gate)
   - Stocker `degraded_signals[]` si optionnels manquants
   - `persistence_ceiling` depuis contract (FAIL si absent)
   - `language` depuis contract (FAIL si absent ou 'auto')
5. Convertir `PrescribedState → PrescribedParagraph` pour backward compat

**Required Signals (fail-closed) :**
```
emotion.trajectory.prescribed.14d
emotion.trajectory.prescribed.xyz
emotion.physics_profile
emotion.transition_map
meta.language
```

**Optional Signals (degrade-explicit) :**
```
emotion.decay_expectations
emotion.blend_zones
emotion.energy_budget
emotion.forbidden_transitions
emotion.laws.compliance    (experimental)
emotion.dead_zones         (experimental)
emotion.prescriptions      (experimental)
emotion.quality.m1_m12     (experimental)
```

### Fichier modifié : `packages/sovereign-engine/src/types.ts`

Ajouter :
```typescript
// Dans ForgePacket
forge_brief: ForgeEmotionBrief;        // Brief complet SSOT
degraded_signals: readonly string[];    // Signaux optionnels manquants
capabilities: readonly string[];        // Signaux réellement disponibles

// Dans PrescribedParagraph
target_omega?: OmegaState;              // XYZ depuis le brief (optionnel backward compat)
```

### Fichier modifié : `packages/sovereign-engine/package.json`
- Ajouter dépendance `@omega/signal-registry`

### Tests
- SSOT-EMO-01 : grep sovereign-engine → 0 match sur trajectory/canonical/xyz
- EXH-01 : required absent → FAIL
- Régression : 167 tests sovereign passent toujours

### Commit message
```
feat(sovereign): replace local trajectory with omega-forge SSOT + Consumer Gate [SSOT-EMO-01, EXH-01]
```

---

## Commit 1.5 — Fix language propagation (5 fichiers)

### Fichiers modifiés :

| Fichier | Ligne | Avant | Après |
|---------|-------|-------|-------|
| `oracle/axes/tension-14d.ts` | ~48 + rupture | `analyzeEmotionFromText(text)` | `analyzeEmotionFromText(text, packet.language)` |
| `oracle/axes/emotion-coherence.ts` | scoring | `analyzeEmotionFromText(text)` | `analyzeEmotionFromText(text, packet.language)` |
| `oracle/macro-axes.ts` | entropy + open_loop | `analyzeEmotionFromText(text)` | `analyzeEmotionFromText(text, packet.language)` |
| `delta/delta-emotion.ts` | all calls | `analyzeEmotionFromText(text)` | `analyzeEmotionFromText(text, packet.language)` |
| `delta/delta-tension.ts` | all calls | `analyzeEmotionFromText(text)` | `analyzeEmotionFromText(text, packet.language)` |

**Vérification :** grep complet du monorepo
```
grep -rn "analyzeEmotionFromText(" packages/sovereign-engine/src/ | grep -v "packet.language"
→ DOIT retourner 0 résultats
```

### Tests
- LANG-01 : test unitaire vérifiant que FR text + FR language → FR keywords utilisés
- Régression

### Commit message
```
fix(sovereign): propagate packet.language to all scoring calls [LANG-01]
```

---

## Commit 1.6 — Golden vectors + invariant tests

### Fichier nouveau : `packages/omega-forge/__tests__/golden-vectors.test.ts`

**Contenu :**
- 10 contrats d'émotion prédéfinis (variés : transitions douces, violentes, etc.)
- Pour chaque contrat : golden hash de la trajectoire (14D + XYZ)
- Test : computeForgeEmotionBrief(contrat) → hash === golden_hash
- Si le hash change → régression détectée

### Fichier nouveau : `packages/sovereign-engine/__tests__/ssot-invariants.test.ts`

**Contenu :**
- SSOT-EMO-01 : grep sovereign → 0 match sur patterns interdits
- SSOT-EMO-02 : appel via sovereign → même hash que via forge directe
- NO-MAGIC-01 : grep sovereign → 0 match sur `C = ` ou `ceiling = ` inline
- BRIEF-01/02/03 : validation du brief produit par forge

### Commit message
```
test: golden vectors + SSOT invariant tests [SSOT-EMO-02, NO-MAGIC-01]
```

---

## Commit 1.7 — CI Gates (No Shadow + Build Stale)

### Fichier nouveau : `scripts/gate-no-shadow.ps1`
```powershell
# GATE-4 : No Shadow Implementations
# Vérifie que sovereign-engine n'implémente aucun algo SSOT

$forbidden = @(
  'buildPrescribedTrajectory',
  'buildTrajectoryCore',
  'canonicalTable',
  'toOmegaState',
  'fromOmegaState',
  'verifyLaw[1-6]',
  'checkInertia',
  'checkFeasibility',
  'EMOTION_KEYWORDS'
)

$violations = @()
foreach ($pattern in $forbidden) {
  $matches = Select-String -Path "packages\sovereign-engine\src\**\*.ts" -Pattern $pattern -Recurse
  # Exclure les imports depuis @omega/omega-forge
  $real = $matches | Where-Object { $_.Line -notmatch "from\s+['""]@omega/" }
  if ($real) { $violations += $real }
}

if ($violations.Count -gt 0) {
  Write-Error "GATE-4 FAIL: Shadow implementations detected"
  $violations | ForEach-Object { Write-Error $_.ToString() }
  exit 1
}
Write-Host "GATE-4 PASS: No shadow implementations"
```

### Fichier nouveau : `scripts/gate-build-stale.ps1`
```powershell
# GATE-5 : Build Stale Detection
$packages = @('omega-forge', 'signal-registry')
foreach ($pkg in $packages) {
  $src = Get-ChildItem "packages\$pkg\src" -Recurse -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  $dist = Get-ChildItem "packages\$pkg\dist" -Recurse -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($dist -and $src.LastWriteTime -gt $dist.LastWriteTime) {
    Write-Error "GATE-5 FAIL: $pkg dist is stale (src: $($src.LastWriteTime), dist: $($dist.LastWriteTime))"
    exit 1
  }
}
Write-Host "GATE-5 PASS: All builds fresh"
```

### Commit message
```
ci: No Shadow Implementations gate + Build Stale gate [GATE-4, GATE-5]
```

---

## Commit 1.8 — ADR documentation

### Fichier nouveau : `docs/adr/ADR-001-SSOT-EMOTION.md`

**Contenu :**
- Contexte : pourquoi SSOT
- Décision : Option A (omega-forge = source)
- Conséquences : sovereign = consommateur pur
- Invariants liés
- Signatures (Claude, ChatGPT, Francky)

### Commit message
```
docs: ADR-001 SSOT emotion architecture
```

---

## CHECKLIST FIN SPRINT 1

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   SPRINT 1 — FONDATION                                                               ║
║                                                                                       ║
║   □ @omega/signal-registry créé et testé (REG-01..05)                                ║
║   □ buildTrajectoryCore factorisé (0 duplication interne)                             ║
║   □ buildScenePrescribedTrajectory exporté                                           ║
║   □ ForgeEmotionBrief implémenté + Producer Gate                                     ║
║   □ BRIEF-01 : hash stable vérifié                                                  ║
║   □ BRIEF-02 : capabilities = réalité vérifié                                       ║
║   □ BRIEF-03 : schema_version vérifié                                                ║
║   □ Doublon sovereign SUPPRIMÉ (hard delete)                                         ║
║   □ Consumer Gate implémentée                                                        ║
║   □ EXH-01 : required absent → FAIL vérifié                                         ║
║   □ language propagé dans 5 fichiers                                                 ║
║   □ LANG-01 : grep → 0 'auto' dans scoring vérifié                                  ║
║   □ NO-MAGIC-01 : persistence_ceiling jamais inline vérifié                          ║
║   □ Golden vectors : 10 contrats → hash stable                                       ║
║   □ GATE-4 : No Shadow → PASS                                                       ║
║   □ GATE-5 : Build Stale → PASS                                                     ║
║   □ ALL TESTS PASS (forge + sovereign + registry)                                    ║
║   □ ADR-001 documenté                                                                ║
║   □ Git commit + tag v?.?.?                                                          ║
║                                                                                       ║
║   Verdict: PASS / FAIL                                                               ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

# ─────────────────────────────────────────────────────────────────────────────
#  SPRINT 2 — IMPACT PROSE : Constraint Compiler + Physics Prompt
#  Périmètre : le LLM reçoit les contraintes physiques et écrit mieux
#  Risque : LOW (ajout pur, pas de modification des mécanismes existants)
#  Critère de sortie : prose mesurée meilleure (même seed, même scénario)
#  Pré-requis : Sprint 1 terminé et validé
# ─────────────────────────────────────────────────────────────────────────────

## Commit 2.1 — Constraint Compiler

### Fichier nouveau : `packages/sovereign-engine/src/input/constraint-compiler.ts`

**Interface :**
```typescript
interface ConstraintCompilerConfig {
  budget_tokens: number;          // Default 800, configurable
  tokenizer_id: string;           // Ex: 'char_estimate_4' (4 chars ≈ 1 token)
  priority_order: ('critical' | 'high' | 'medium')[];
}

function compileConstraints(
  brief: ForgeEmotionBrief,
  config: ConstraintCompilerConfig,
): CompiledPhysicsSection

interface CompiledPhysicsSection {
  content: string;                // Le texte compilé pour le prompt
  token_count: number;            // Tokens estimés
  included_signals: string[];     // source_signal_ids inclus
  excluded_signals: string[];     // Ce qui n'a pas tenu dans le budget
  section_priority: 'critical';
}
```

**Algorithme de compilation :**
```
1. CRITIQUE (~300 tokens, toujours inclus) :
   a. Sélectionner les 2-3 émotions dominantes (celles dans quartile_targets)
   b. Pour chacune : 1 phrase behavior_fr
   c. Transitions inter-quartiles : from→to + narrative_hint_fr
   d. Forbidden transitions : 1 ligne par interdiction

2. HAUTE (~300 tokens, si budget restant) :
   a. Decay expectations après pics : instruction_fr condensée
   b. Blend zones : quartile + distribution + instruction_fr
   c. Energy conservation : 1 phrase (constraint_fr)

3. MOYENNE (~200 tokens, si budget restant) :
   a. Anti dead zone : 1 phrase
   b. Top-3 prescriptions (si disponibles via physics audit)

4. Token counting :
   Estimation conservative : len(text) / 4 (fr ≈ 4 chars/token)
   Configurable via tokenizer_id

5. Traçabilité :
   Chaque paragraphe porte un commentaire invisible <!-- signal:xxx -->
```

**Piège #3 ChatGPT (compteur tokens) :**
```
Le compteur est DÉTERMINISTE :
- tokenizer_id = 'char_estimate_4' → len(text) / 4
- Pas de vrai tokenizer LLM (dépendance externe non déterministe)
- Si on veut tiktoken plus tard, c'est un changement de config, pas de code
- compiler_tokenizer_id stocké dans le output pour traçabilité
```

### Tests
- COMPILE-01 : output.token_count <= config.budget_tokens (toujours)
- COMPILE-02 : même brief → même output compilé (hash stable)
- Test avec brief vide → section critique minimale
- Test avec brief complet → toutes les sections incluses

### Commit message
```
feat(sovereign): Constraint Compiler budgeté [COMPILE-01, COMPILE-02]
```

---

## Commit 2.2 — Prompt assembler intègre section physique

### Fichier modifié : `packages/sovereign-engine/src/input/prompt-assembler-v2.ts`

**Action :**
1. Importer `compileConstraints`
2. Dans `buildSovereignPrompt()` :
   ```typescript
   // Après les sections existantes, avant Symbol Map
   if (packet.forge_brief) {
     const physicsSection = compileConstraints(
       packet.forge_brief,
       { budget_tokens: 800, tokenizer_id: 'char_estimate_4', priority_order: ['critical', 'high', 'medium'] }
     );
     sections.push({
       section_id: 'physics_constraints',
       title: 'Physics Constraints',
       content: physicsSection.content,
       priority: 'critical',
     });
   }
   ```
3. Budget 800 configurable via `SOVEREIGN_CONFIG.PHYSICS_PROMPT_BUDGET`

### Tests
- Vérifier que le prompt contient la section physics
- Vérifier que le prompt total ne dépasse pas un seuil raisonnable
- Régression : tous tests existants passent

### Commit message
```
feat(sovereign): prompt-assembler integrates compiled physics section [NO-MAGIC-02]
```

---

## Commit 2.3 — LIVE run comparatif

### Protocole :
```
1. Choisir 1 scénario de référence (ex: Léna/Cendreville)
2. Fixer le seed LLM
3. Run AVANT (code actuel, sans physics prompt)
4. Run APRÈS (avec physics prompt)
5. Comparer :
   - S-Score composite
   - ECC score
   - Nombre de transitions motivées (lecture humaine)
   - Nombre de zones mortes (lecture humaine)
   - Verdict SEAL/PITCH/REJECT
6. Documenter les résultats
```

### Commit message
```
docs: LIVE run comparatif Sprint 2 — impact physics prompt
```

---

## CHECKLIST FIN SPRINT 2

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   SPRINT 2 — IMPACT PROSE                                                            ║
║                                                                                       ║
║   □ Constraint Compiler implémenté et testé                                          ║
║   □ COMPILE-01 : budget respecté                                                     ║
║   □ COMPILE-02 : déterminisme vérifié                                                ║
║   □ Prompt assembler intègre section physique                                        ║
║   □ Budget 800 tokens configurable                                                   ║
║   □ LIVE run comparatif documenté                                                    ║
║   □ ALL TESTS PASS                                                                   ║
║   □ Git commit + tag                                                                 ║
║                                                                                       ║
║   Verdict: PASS / FAIL                                                               ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

# ─────────────────────────────────────────────────────────────────────────────
#  SPRINT 3 — PHYSICS AUDIT + PRESCRIPTIONS + DELTA ENRICHI
#  Périmètre : la boucle de correction utilise les lois physiques
#  Risque : MEDIUM (nouveau module dans le pipeline actif)
#  Critère de sortie : violations détectées, prescriptions générées, corrections ciblées
#  Pré-requis : Sprint 2 terminé et validé
# ─────────────────────────────────────────────────────────────────────────────

## Commit 3.1 — Physics Audit (post-generation)

### Fichier nouveau : `packages/sovereign-engine/src/oracle/physics-audit.ts`

**Interface :**
```typescript
interface PhysicsAuditResult {
  readonly trajectory_compliance: TrajectoryAnalysis;   // Depuis omega-forge
  readonly law_compliance: LawComplianceReport;         // Depuis omega-forge
  readonly dead_zones: readonly DeadZone[];             // Depuis omega-forge
  readonly forced_transitions: number;
  readonly feasibility_failures: number;
  readonly physics_score: number;                       // 0-100, INFORMATIF
  readonly audit_hash: string;
}

function runPhysicsAudit(
  prose: string,
  brief: ForgeEmotionBrief,
  canonicalTable: CanonicalEmotionTable,
  C: number,
  config: F5Config,
): PhysicsAuditResult
```

**Implémentation :**
```
1. buildActualTrajectory(prose, table, C, packet.language)  ← omega-forge SSOT
2. computeDeviations(brief.trajectory, actual, config)       ← omega-forge SSOT
3. buildLawComplianceReport(actual, plan, table, config)     ← omega-forge SSOT
4. detectDeadZones(actual, config, C)                        ← omega-forge SSOT
5. Calculer physics_score = weighted(trajectory, laws, dead_zones)

MODE : INFORMATIF
- physics_score logué dans output
- NE MODIFIE PAS le verdict S-Oracle
- Influence la boucle de repair (prescriptions)
```

**Feature flag (piège #6 ChatGPT) :**
```
SOVEREIGN_CONFIG.PHYSICS_AUDIT_ENABLED = true   // Activé par défaut (informatif)
SOVEREIGN_CONFIG.PHYSICS_AUDIT_GATE = false      // Pas gate avant calibration
```

### Tests
- Prose avec transition forcée → audit détecte
- Prose avec dead zone → audit détecte
- Prose parfaite → physics_score > 90
- Performance : audit < 50ms (pas de LLM call)

### Commit message
```
feat(sovereign): physics-audit post-generation informatif [experimental]
```

---

## Commit 3.2 — Delta enrichi (4 → 6 dimensions)

### Fichier nouveau : `packages/sovereign-engine/src/delta/delta-physics.ts`

```typescript
interface PhysicsDelta {
  readonly law_violations: readonly LawViolation[];   // Localisées par paragraphe
  readonly dead_zones: readonly DeadZone[];
  readonly forced_transitions: readonly ForcedTransition[];
  readonly trajectory_deviations: readonly TrajectoryDeviation[];  // Cosinus + euclidien
  readonly physics_distance: number;                  // 0-1 distance globale
}

function computePhysicsDelta(
  auditResult: PhysicsAuditResult,
): PhysicsDelta
```

### Fichier modifié : `packages/sovereign-engine/src/delta/delta-report.ts`

```
AVANT: emotion + tension + style + cliché (4 dimensions)
APRÈS: emotion + tension + style + cliché + physics + prescriptions (6 dimensions)

computeGlobalDistance() :
  emotionWeight = 0.30  (était 0.40)
  tensionWeight = 0.25  (était 0.30)
  styleWeight   = 0.15  (était 0.20)
  clicheWeight  = 0.10  (était 0.10)
  physicsWeight = 0.15  (NOUVEAU)
  prescWeight   = 0.05  (NOUVEAU)
```

### Tests
- Delta avec violations physiques → physics_distance > 0
- Delta sans violations → physics_distance ≈ 0
- Régression : global_distance ne change pas dramatiquement

### Commit message
```
feat(sovereign): delta enrichi 6 dimensions + physics delta [experimental]
```

---

## Commit 3.3 — Prescriptions dans la boucle de correction

### Fichier modifié : `packages/sovereign-engine/src/pitch/triple-pitch.ts`

**Action :**
- Si physics audit disponible, appeler `generatePrescriptions()` (omega-forge)
- Top-3 prescriptions → intégrées dans le pitch prompt
- Le LLM reçoit "Paragraphe 7→8 : transition forcée, ajouter catalyseur"

### Fichier modifié : `packages/sovereign-engine/src/pitch/patch-engine.ts`

**Action :**
- Le patch prompt inclut les prescriptions top-K
- Format : "CORRECTION REQUISE: [prescription.action]"

### Tests
- Prose avec violation → prescription générée → patch appliqué → violation réduite
- Régression

### Commit message
```
feat(sovereign): prescriptions chirurgicales dans sovereign loop [experimental]
```

---

## Commit 3.4 — physics_compliance sous-axe informatif

### Fichier nouveau : `packages/sovereign-engine/src/oracle/axes/physics-compliance.ts`

```typescript
function scorePhysicsCompliance(
  auditResult: PhysicsAuditResult,
): AxisScore
// Retourne 0-100
// INFORMATIF : logué mais NE MODIFIE PAS ECC
```

### Fichier modifié : `packages/sovereign-engine/src/oracle/macro-axes.ts`

```
computeECC() :
  AVANT: tension_14d + emotion_coherence + interiority + impact
  APRÈS: tension_14d + emotion_coherence + interiority + impact
         + physics_compliance (LOGUÉ, poids=0 dans le score ECC)

  Après calibration (20 runs) : décision bonus/malus
```

### Fichier modifié : `packages/sovereign-engine/src/engine.ts`

```
runSovereignForge() :
  1. assembleForgePacket (avec brief)
  2. validateForgePacket
  3. simulateSceneBattle
  4. generateSymbolMap
  5. bridgeSignature
  6. compileConstraints + buildSovereignPrompt (avec physics)
  7. generateDraft
  8. ★ runPhysicsAudit (NOUVEAU, informatif)
  9. runSovereignLoop (avec delta enrichi + prescriptions)
  10. [duel si nécessaire]
  11. polish
  12. judgeAestheticV3 (avec physics_compliance logué)
  13. Output enrichi :
      + physics_audit
      + prescriptions
      + forge_brief_hash
      + degraded_signals
      + capabilities_used
```

### Tests
- Pipeline complet avec physics audit → output contient physics_audit
- Feature flag false → physics audit sauté

### Commit message
```
feat(sovereign): physics_compliance sous-axe informatif + pipeline enrichi
```

---

## CHECKLIST FIN SPRINT 3

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   SPRINT 3 — PHYSICS AUDIT + PRESCRIPTIONS                                          ║
║                                                                                       ║
║   □ physics-audit.ts implémenté et testé                                             ║
║   □ Violations détectées sur prose connue                                            ║
║   □ delta-physics.ts implémenté (6 dimensions)                                       ║
║   □ Prescriptions dans la boucle de correction                                       ║
║   □ physics_compliance sous-axe (informatif, poids=0)                                ║
║   □ Pipeline engine.ts enrichi                                                       ║
║   □ Feature flags fonctionnels                                                       ║
║   □ Performance OK (audit < 50ms sans LLM)                                           ║
║   □ ALL TESTS PASS                                                                   ║
║   □ Git commit + tag                                                                 ║
║                                                                                       ║
║   Verdict: PASS / FAIL                                                               ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 20 LIVE RUNS (entre Sprint 3 et Sprint 4)

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   CALIBRATION PHYSICS COMPLIANCE                                                      ║
║                                                                                       ║
║   Protocole :                                                                         ║
║   - 20 runs avec physics_compliance en mode informatif                               ║
║   - Mesurer corrélation entre physics_score et qualité prose                         ║
║   - Mesurer corrélation entre physics_score et S-Score                               ║
║   - Identifier les seuils pertinents                                                 ║
║                                                                                       ║
║   Décision après calibration :                                                       ║
║   A) physics_score corrèle fortement → ACTIVER comme bonus/malus ECC                ║
║   B) physics_score corrèle faiblement → GARDER informatif                            ║
║   C) physics_score corrèle inversement → REVOIR le modèle                           ║
║                                                                                       ║
║   Francky TRANCHE après analyse des 20 runs.                                         ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

# ─────────────────────────────────────────────────────────────────────────────
#  SPRINT 4 — MATURATION : Quality M1-M12 + IDL + Activation gate
#  Périmètre : double perspective qualité + stabilisation long terme
#  Risque : LOW
#  Pré-requis : Sprint 3 + 20 runs calibration
# ─────────────────────────────────────────────────────────────────────────────

## 4.1 — Quality M1-M12 rapport annexe
- Appeler `buildQualityEnvelope()` depuis omega-forge
- Ajouter `quality_m12` dans SovereignForgeResult
- Mode informatif (rapport annexe, pas dans scoring)

## 4.2 — Activation physics_compliance (si calibration OK)
- Si corrélation forte : ajouter poids dans ECC (ex: 10%)
- Ajuster les poids des autres sous-axes
- Revalider S-Score sur 10 scénarios

## 4.3 — IDL + codegen pour signal-registry (optionnel)
- `signal-registry.idl.json` → génération TS types + validators
- Zéro erreur humaine sur SignalId
- Seulement si la registry est stabilisée

## 4.4 — Compat contrôlée v1/v2
- Feature flag `forge.emotion.compat_window` avec date de fin
- v1 et v2 coexistent pendant la fenêtre
- Après la date : v1 = FAIL strict

---

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#                    PARTIE III — TABLEAU RÉCAPITULATIF FICHIERS
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

## Fichiers NOUVEAUX (à créer)

| Sprint | Fichier | Description |
|--------|---------|-------------|
| 1 | `packages/signal-registry/src/registry.ts` | OMEGA_SIGNAL_REGISTRY |
| 1 | `packages/signal-registry/src/types.ts` | SignalDescriptor, SignalId |
| 1 | `packages/signal-registry/src/validators.ts` | Producer/Consumer gates |
| 1 | `packages/signal-registry/src/index.ts` | Exports |
| 1 | `packages/signal-registry/package.json` | Package config |
| 1 | `packages/signal-registry/__tests__/registry.test.ts` | REG-01..05 |
| 1 | `packages/omega-forge/src/physics/emotion-brief.ts` | ForgeEmotionBrief |
| 1 | `packages/omega-forge/src/physics/emotion-brief-types.ts` | Types du brief |
| 1 | `packages/omega-forge/__tests__/golden-vectors.test.ts` | Golden hashes |
| 1 | `packages/sovereign-engine/__tests__/ssot-invariants.test.ts` | SSOT tests |
| 1 | `scripts/gate-no-shadow.ps1` | GATE-4 CI |
| 1 | `scripts/gate-build-stale.ps1` | GATE-5 CI |
| 1 | `docs/adr/ADR-001-SSOT-EMOTION.md` | Documentation |
| 2 | `packages/sovereign-engine/src/input/constraint-compiler.ts` | Compilateur |
| 3 | `packages/sovereign-engine/src/oracle/physics-audit.ts` | Audit post-gen |
| 3 | `packages/sovereign-engine/src/oracle/axes/physics-compliance.ts` | Sous-axe |
| 3 | `packages/sovereign-engine/src/delta/delta-physics.ts` | 6ème dimension |

## Fichiers MODIFIÉS

| Sprint | Fichier | Action |
|--------|---------|--------|
| 1 | `omega-forge/src/physics/trajectory-analyzer.ts` | Factoriser core |
| 1 | `omega-forge/src/config.ts` | DEFAULT_PERSISTENCE_CEILING |
| 1 | `omega-forge/src/index.ts` | Nouveaux exports |
| 1 | `omega-forge/package.json` | Dépendance signal-registry |
| 1 | `sovereign/src/input/forge-packet-assembler.ts` | Supprimer doublon + brief |
| 1 | `sovereign/src/types.ts` | ForgeEmotionBrief, degraded_signals |
| 1 | `sovereign/package.json` | Dépendance signal-registry |
| 1 | `sovereign/src/oracle/axes/tension-14d.ts` | packet.language |
| 1 | `sovereign/src/oracle/axes/emotion-coherence.ts` | packet.language |
| 1 | `sovereign/src/oracle/macro-axes.ts` | packet.language |
| 1 | `sovereign/src/delta/delta-emotion.ts` | packet.language |
| 1 | `sovereign/src/delta/delta-tension.ts` | packet.language |
| 2 | `sovereign/src/input/prompt-assembler-v2.ts` | Section physique compilée |
| 2 | `sovereign/src/config.ts` | PHYSICS_PROMPT_BUDGET |
| 3 | `sovereign/src/delta/delta-report.ts` | 4→6 dimensions |
| 3 | `sovereign/src/pitch/triple-pitch.ts` | Prescriptions |
| 3 | `sovereign/src/pitch/patch-engine.ts` | Prescriptions dans patch |
| 3 | `sovereign/src/oracle/macro-axes.ts` | physics_compliance logué |
| 3 | `sovereign/src/engine.ts` | Pipeline enrichi |

## Fichiers INCHANGÉS (confirmation explicite)

- `canon-kernel/` — INCHANGÉ (déjà SSOT)
- `omega-forge/src/physics/law-*.ts` — INCHANGÉS (appelés via brief, pas modifiés)
- `omega-forge/src/diagnosis/` — INCHANGÉ (appelé via physics-audit)
- `omega-forge/src/quality/` — INCHANGÉ (appelé en Sprint 4)
- `sovereign/src/duel/` — INCHANGÉ
- `sovereign/src/polish/` — INCHANGÉ
- `sovereign/src/symbol/` — INCHANGÉ

---

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#                    PARTIE IV — PIÈGES IDENTIFIÉS (ChatGPT)
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

## 6 Pièges ChatGPT — Statut

| # | Piège | Solution intégrée | Sprint |
|---|-------|-------------------|--------|
| 1 | Signal Registry : où vit-il | Package neutre `@omega/signal-registry` | 1 |
| 2 | canonicalize(brief) flou | Spec canon : tri clés, float toFixed(6), 0 volatils | 1 |
| 3 | 800 tokens sans compteur | `char_estimate_4` déterministe + `tokenizer_id` tracé | 2 |
| 4 | Regex = faux positifs | Regex quick + allowlist imports (AST lint = P4) | 1 |
| 5 | Required/Optional figé | Consumer déclare par stage (assembly/prompt/audit/scoring) | 1 |
| 6 | Performance / coût | Brief calculé 1 fois + physics audit feature flag + perf < 50ms | 3 |

---

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#                    PARTIE V — EXPLOITATION MESURÉE
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

## Avant / Après par famille omega-forge

| Famille | Fonctions | Sprint 0 (avant) | Sprint 1 | Sprint 2 | Sprint 3 | Sprint 4 |
|---------|-----------|-------------------|----------|----------|----------|----------|
| Primitives R14 | 9 | 8/9 | 9/9 | 9/9 | 9/9 | 9/9 |
| Espace XYZ | 4 | 0/4 | 4/4 | 4/4 | 4/4 | 4/4 |
| Canonical Table | 4 | 0/4 | 4/4 | 4/4 | 4/4 | 4/4 |
| 6 Lois | 18 | 0/18 | 0/18 | 0/18 | 18/18 | 18/18 |
| Trajectory SSOT | 4 | 0/4 | 4/4 | 4/4 | 4/4 | 4/4 |
| Quality M1-M12 | 15 | 0/15 | 0/15 | 0/15 | 0/15 | 15/15 |
| Diagnosis | 7 | 0/7 | 0/7 | 0/7 | 7/7 | 7/7 |
| Engine/Report | 4 | 0/4 | 0/4 | 0/4 | 0/4 | 4/4 |
| **TOTAL** | **~65** | **8 (12%)** | **21 (32%)** | **21 (32%)** | **42 (65%)** | **~65 (100%)** |

---

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#                    PARTIE VI — COMMANDES POWERSHELL
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

## Commandes Sprint 1 (Francky exécute après livraison ZIP)

```powershell
# 1 — Extraire le livrable
Expand-Archive -Path "C:\Users\elric\Downloads\OMEGA_OMNIPOTENT_SPRINT1.zip" `
  -DestinationPath "C:\Users\elric\omega-project\" -Force
```

```powershell
# 2 — Installer les dépendances (nouveau package signal-registry)
cd C:\Users\elric\omega-project
npm install
```

```powershell
# 3 — Lancer TOUS les tests
npm test
```

```powershell
# 4 — Vérifier le hash du ZIP
Get-FileHash -Algorithm SHA256 "C:\Users\elric\Downloads\OMEGA_OMNIPOTENT_SPRINT1.zip"
```

---

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#                    GOUVERNANCE DU DOCUMENT
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

| Version | Date | Changement |
|---------|------|------------|
| v1.0 | 2026-02-15 | Création — vision fusionnée Claude × ChatGPT × Francky |
| **v1.1** | **2026-02-15** | **Ajout RULE-ROADMAP-01 : obligation de suivi à chaque phase + tableau d'avancement** |

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   OMEGA OMNIPOTENT ROADMAP v1.1                                                      ║
║                                                                                       ║
║   Date:            2026-02-15                                                        ║
║   Status:          PRÊT À EXÉCUTER                                                   ║
║   Sprints:         4 (séquentiels)                                                   ║
║   Fichiers nouveaux: 17                                                              ║
║   Fichiers modifiés: 19                                                              ║
║   Invariants:      17                                                                ║
║   Gates:           5                                                                 ║
║   Packages:        3 (signal-registry NEW + omega-forge MOD + sovereign MOD)         ║
║                                                                                       ║
║   Vision: 12% → 100% exploitation omega-forge                                       ║
║   Objectif: zéro perte, zéro duplication, zéro approximation                         ║
║                                                                                       ║
║   Standard: NASA-Grade L4 / DO-178C / MIL-STD                                       ║
║   Validé par: Claude + ChatGPT + Francky                                             ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

**FIN DU DOCUMENT OMEGA_ROADMAP_OMNIPOTENT v1.0**
