# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#
#   OMEGA MASTER PLAN — ANNEXES COMPLÉMENTAIRES
#   Document ID: OMP-001-ANNEX
#
#   Version: 2.1.0
#   Date: 2026-01-23
#
#   Complète OMP-001-MASTER v2.0.0 avec:
#   • ANNEX A — Impact & Coupling Matrix
#   • ANNEX B — Assumptions & Validity Domain
#   • ANNEX C — Sub-classification PHANTOM
#
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

---

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#                              ANNEX A — IMPACT & COUPLING MATRIX
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

# ANNEX A — IMPACT & COUPLING MATRIX

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                                       ║
║   QUESTION CLÉ: "Si ce module change, qu'est-ce que ça casse ailleurs ?"                              ║
║                                                                                                       ║
║   Cette matrice identifie les dépendances CONCEPTUELLES (pas techniques).                             ║
║   Un scan AST ne détecte pas ces couplages.                                                           ║
║                                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝
```

## A.1 Matrice d'Impact — GENESIS FORGE (PROUVÉ)

| Module Source | Modules Impactés | Type d'Impact | Criticité | Notes |
|---------------|------------------|---------------|-----------|-------|
| **EMOTION_BRIDGE** | J1_JUDGE, PRISM, DRAFTER | Vecteurs émotionnels, seuils | 🔴 CRITIQUE | Changement de normalisation → cascade |
| **OMEGA_TYPES** | EMOTION_BRIDGE, OMEGA_CONVERTER, J1_JUDGE | Structures de données | 🔴 CRITIQUE | Interface contracts |
| **OMEGA_CONVERTER** | EMOTION_BRIDGE (indirect) | Mapping bidirectionnel | 🟡 MOYEN | Losslessness critique |
| **PRISM** | J1_JUDGE (peut utiliser scores) | Scoring multi-axes | 🟢 FAIBLE | Faiblement couplé |
| **DRAFTER** | Aucun interne | Génération | 🟢 FAIBLE | Point terminal |
| **J1_JUDGE** | Aucun interne | Verdict | 🟢 FAIBLE | Point terminal |
| **PROVIDERS** | DRAFTER | Exécution LLM | 🟡 MOYEN | Abstraction stable |
| **DeterministicRNG** | PROVIDER_MOCK | Tests only | 🟢 FAIBLE | Isolation OK |

## A.2 Matrice d'Impact — OMEGA 2.0 (SPÉCIFIÉ)

| Module Source | Modules Impactés | Type d'Impact | Criticité | Notes |
|---------------|------------------|---------------|-----------|-------|
| **CANON** | TRUTH_GATE, ORACLE, SCRIBE, MEMORY_* | Source de vérité | 🔴 CRITIQUE | SINGLE POINT OF TRUTH |
| **INTENT_LOCK** | ORACLE, THE_SKEPTIC | Contraintes | 🟡 MOYEN | Protection auteur |
| **COST_LEDGER** | ORACLE, THE_SKEPTIC | Décision | 🟡 MOYEN | Poids des choix |
| **GENESIS (Planner)** | SCRIBE, GPS Narratif | Structure narrative | 🔴 CRITIQUE | Plan → exécution |
| **SCRIBE** | Aucun downstream | Génération finale | 🟢 FAIBLE | Point terminal |
| **ORACLE** | Aucun downstream | Options | 🟢 FAIBLE | Point terminal |
| **TRUTH_GATE** | Feedback vers SCRIBE | Validation | 🟡 MOYEN | Boucle de correction |
| **EMOTION_GATE** | Feedback vers SCRIBE | Validation émotionnelle | 🟡 MOYEN | Utilise J1_JUDGE |

## A.3 Graphe de Couplage Critique

```
                    ┌─────────────────────────────────────────────────────────────┐
                    │                     NIVEAU CRITIQUE                          │
                    │                                                              │
                    │   ┌───────────────┐         ┌───────────────┐               │
                    │   │  OMEGA_TYPES  │◄────────│    CANON      │               │
                    │   │  (structures) │         │   (vérité)    │               │
                    │   └───────┬───────┘         └───────┬───────┘               │
                    │           │                         │                        │
                    └───────────│─────────────────────────│────────────────────────┘
                                │                         │
            ┌───────────────────┼───────────────────┬─────┴─────┬─────────────────┐
            │                   │                   │           │                 │
            ▼                   ▼                   ▼           ▼                 ▼
    ┌───────────────┐   ┌───────────────┐   ┌──────────┐ ┌──────────┐    ┌───────────┐
    │EMOTION_BRIDGE │   │OMEGA_CONVERTER│   │TRUTH_GATE│ │  ORACLE  │    │  GENESIS  │
    │               │   │               │   │          │ │          │    │ (Planner) │
    └───────┬───────┘   └───────────────┘   └──────────┘ └──────────┘    └─────┬─────┘
            │                                                                   │
            │                                                                   │
    ┌───────┴───────────────────────────────────────────────────────────┐      │
    │                                                                   │      │
    ▼                   ▼                   ▼                           │      ▼
┌───────────┐     ┌───────────┐     ┌───────────┐                       │  ┌───────────┐
│   PRISM   │     │ J1_JUDGE  │     │  DRAFTER  │◄──────────────────────┘  │   SCRIBE  │
└───────────┘     └───────────┘     └───────────┘                          └───────────┘
```

## A.4 Règles de Propagation

| Si tu changes... | Tu DOIS vérifier... | Action minimum |
|------------------|---------------------|----------------|
| OMEGA_TYPES | TOUT ce qui importe les types | Tests d'intégration complets |
| CANON | Gates + ORACLE + SCRIBE | Tests de cohérence |
| EMOTION_BRIDGE | J1_JUDGE + PRISM | Tests de distance |
| Threshold τ (J1) | Calibration domaine | Tests d'acceptance |
| DeterministicRNG seed | Tests mock | Hash des outputs mock |

---

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#                              ANNEX B — ASSUMPTIONS & VALIDITY DOMAIN
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

# ANNEX B — ASSUMPTIONS & VALIDITY DOMAIN

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                                       ║
║   DO-178C / Systèmes Critiques: "Toute hypothèse non formalisée = risque latent"                      ║
║                                                                                                       ║
║   Cette annexe formalise les HYPOTHÈSES SILENCIEUSES sur lesquelles repose OMEGA.                     ║
║                                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝
```

## B.1 Hypothèses Fondamentales

### ASM-01: Expressivité Émotionnelle du Langage

| Attribut | Valeur |
|----------|--------|
| **Hypothèse** | Le langage naturel est suffisamment expressif pour porter l'émotion de manière analysable |
| **Justification** | Littérature psycholinguistique (Plutchik, Russell) + observations empiriques |
| **Risque si invalidée** | L'analyse émotionnelle devient non fiable |
| **Domaine de validité** | Textes narratifs, dialogues, descriptions — PAS: code, formules, listes |
| **Mitigation** | Détection de type de contenu + bypass pour contenu non-narratif |

### ASM-02: Stabilité des Modèles LLM

| Attribut | Valeur |
|----------|--------|
| **Hypothèse** | Un même prompt sur un même modèle produit des outputs statistiquement cohérents |
| **Justification** | Temperature = 0 + seed fixe (quand disponible) |
| **Risque si invalidée** | Non-déterminisme de génération |
| **Domaine de validité** | Versions API stables (Claude 3.5, Gemini 1.5) |
| **Mitigation** | Lock de version API + MockProvider pour tests |

### ASM-03: Suffisance de la Vectorisation 14D

| Attribut | Valeur |
|----------|--------|
| **Hypothèse** | 14 dimensions émotionnelles (Plutchik-extended) suffisent pour le jugement narratif |
| **Justification** | Couverture empirique des émotions de base + composées |
| **Risque si invalidée** | Émotions complexes mal capturées |
| **Domaine de validité** | Narratif occidental mainstream |
| **Mitigation** | Extension à N dimensions possible (structure générique) |

### ASM-04: Pertinence des Distances Métriques

| Attribut | Valeur |
|----------|--------|
| **Hypothèse** | Cosine similarity et Euclidean distance sont des métriques appropriées pour comparer des états émotionnels |
| **Justification** | Standard en NLP et psychologie computationnelle |
| **Risque si invalidée** | Jugements J1 biaisés |
| **Domaine de validité** | Vecteurs normalisés, même espace |
| **Mitigation** | Threshold τ calibrable par domaine |

### ASM-05: Transférabilité Cross-Culture

| Attribut | Valeur |
|----------|--------|
| **Hypothèse** | Les émotions de base sont universelles |
| **Justification** | Ekman (1971), controversé mais admis comme baseline |
| **Risque si invalidée** | Biais culturel systémique |
| **Domaine de validité** | Littérature occidentale principalement |
| **Mitigation** | Profils culturels futurs (PHANTOM) |

## B.2 Hypothèses Techniques

### ASM-T01: Déterminisme Build

| Attribut | Valeur |
|----------|--------|
| **Hypothèse** | `npm ci` produit un build identique sur toute machine |
| **Justification** | package-lock.json + --ignore-scripts |
| **Risque si invalidée** | Reproductibilité perdue |
| **Domaine de validité** | Node.js ≥18, npm ≥9 |
| **Mitigation** | CI vérifie double-build hash |
| **Status** | ✅ PROUVÉ (PATCH5) |

### ASM-T02: Date.now() Isolé

| Attribut | Valeur |
|----------|--------|
| **Hypothèse** | Aucun Date.now() n'affecte les outputs déterministes |
| **Justification** | Classification des 27 occurrences |
| **Risque si invalidée** | Outputs non reproductibles |
| **Domaine de validité** | Code scanné v1.2.1 |
| **Mitigation** | Scan automatique à chaque PR |
| **Status** | ✅ PROUVÉ (PATCH2) |

### ASM-T03: Supply Chain Sécurisée

| Attribut | Valeur |
|----------|--------|
| **Hypothèse** | Les dépendances production n'introduisent pas de vulnérabilité critique |
| **Justification** | npm audit + SBOM |
| **Risque si invalidée** | Faille de sécurité |
| **Domaine de validité** | Versions lockées actuelles |
| **Mitigation** | Audit régulier + Dependabot |
| **Status** | ✅ PROUVÉ (PATCH6) |

## B.3 Limites Connues

| Limite | Description | Impact | Contournement |
|--------|-------------|--------|---------------|
| **LIM-01** | Pas de support multi-langue | Français/Anglais only | Futur: profils i18n |
| **LIM-02** | Pas de mémoire persistante | Session-only | Futur: CANON |
| **LIM-03** | Pas de planification saga | Génération courte only | Futur: GENESIS Planner |
| **LIM-04** | Dépendance LLM externe | Latence + coût | MockProvider pour dev |

---

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#                              ANNEX C — PHANTOM SUB-CLASSIFICATION
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

# ANNEX C — PHANTOM SUB-CLASSIFICATION

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                                       ║
║   PHANTOM n'est plus binaire. Trois niveaux pour prioriser intelligemment.                            ║
║                                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝
```

## C.1 Définitions

| Type | Nom | Définition | Priorisation |
|------|-----|------------|--------------|
| **PH-A** | Vague | Concept mentionné, non formalisé | BASSE — clarifier d'abord |
| **PH-B** | Formalisé | Spécification existe, non planifié | MOYENNE — prêt à planifier |
| **PH-C** | Planifié | Dans le backlog, jamais commencé | HAUTE — prêt à coder |

## C.2 Classification Actuelle

| Concept | Type | Source | Justification |
|---------|------|--------|---------------|
| **UI Auteur** | PH-A | Discussions | Aucune spec, juste une idée |
| **GPS Narratif** | PH-B | OMEGA_2.0 docs | Spécifié mais pas dans backlog P0/P1 |
| **Multi-language** | PH-A | Discussions | Aucune spec i18n |
| **LOGIC module** | PH-B | OMEGA_2.0 docs | Spécifié, dépend de CANON |
| **DYNAMICS module** | PH-B | OMEGA_2.0 docs | Spécifié, dépend de CANON |
| **CANON persistence** | PH-C | Backlog P0-01 | Planifié, prêt à commencer |
| **GENESIS Planner** | PH-C | Backlog P0-02 | Planifié, après CANON |
| **SCRIBE integration** | PH-C | Backlog P0-03 | Planifié, après Planner |
| **ORACLE** | PH-B | OMEGA_2.0 docs | Spécifié, P1 |
| **MUSE** | PH-B | OMEGA_2.0 docs | Spécifié, non planifié |
| **THE_SKEPTIC** | PH-B | OMEGA_2.0 docs | Spécifié, non planifié |
| **MIMESIS+ advanced** | PH-B | OMEGA_2.0 docs | Spécifié, P2 |
| **TRUTH_GATE** | PH-C | Backlog P1 | Planifié |
| **EMOTION_GATE** | PH-B | OMEGA_2.0 docs | Spécifié, utilise J1 |
| **Profils culturels** | PH-A | Discussions | Vague |
| **Enforcement invariants Core** | PH-C | Implied | Nécessaire pour CANON |

## C.3 Statistiques

| Type | Count | % |
|------|-------|---|
| PH-A (Vague) | 4 | 25% |
| PH-B (Formalisé) | 7 | 44% |
| PH-C (Planifié) | 5 | 31% |

---

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#                              HASH & SEAL
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                                       ║
║   OMEGA MASTER PLAN — ANNEXES v2.1.0                                                                 ║
║                                                                                                       ║
║   Complète OMP-001-MASTER v2.0.0 avec:                                                               ║
║   ✅ ANNEX A — Impact & Coupling Matrix (dépendances conceptuelles)                                  ║
║   ✅ ANNEX B — Assumptions & Validity Domain (5 ASM + 3 ASM-T + 4 LIM)                               ║
║   ✅ ANNEX C — Phantom Sub-classification (PH-A/B/C)                                                 ║
║                                                                                                       ║
║   Date: 2026-01-23                                                                                    ║
║   Authority: Francky (Architecte Suprême)                                                            ║
║                                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝
```

---

**END OF ANNEXES OMP-001-ANNEX v2.1.0**
