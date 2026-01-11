# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA ARCHITECTURE GLOBALE
# Document: DOC-ARCH-001
# ═══════════════════════════════════════════════════════════════════════════════

---

## 📋 EN-TÊTE

| Attribut | Valeur |
|----------|--------|
| **Date** | 2026-01-03 |
| **Heure UTC** | 04:25:00 |
| **Version OMEGA** | v3.11.0-HARDENED |
| **Hash référence** | 1a30b6e6c01cf89ae33edc2713d76d0c727c393bd7a47a8174ebd6733390fc00 |
| **Auteur** | Claude (Architecte & Documentaliste) |
| **Autorité** | Francky (Architecte Suprême) |
| **Status** | 🔒 OFFICIEL |

---

# 🏗️ VUE D'ENSEMBLE

## Schéma Global

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                              OMEGA ARCHITECTURE v3.3.0                                ║
╠═══════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                       ║
║  ┌─────────────────────────────────────────────────────────────────────────────────┐  ║
║  │                           TAURI DESKTOP (lib.rs)                                │  ║
║  │  ┌───────────────────────────────────────────────────────────────────────────┐  │  ║
║  │  │ INV-TAURI-01: Single IPC | INV-TAURI-02: 15s | INV-TAURI-03: 2MB max     │  │  ║
║  │  └───────────────────────────────────────────────────────────────────────────┘  │  ║
║  └─────────────────────────────────────────────────────────────────────────────────┘  ║
║                                         │ IPC                                         ║
║                                         ▼                                             ║
║  ┌─────────────────────────────────────────────────────────────────────────────────┐  ║
║  │                           TYPESCRIPT CORE LAYER                                 │  ║
║  │                                                                                 │  ║
║  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐          │  ║
║  │  │  SEGMENT    │──▶│  ANALYZE    │──▶│   BRIDGE    │──▶│  AGGREGATE  │          │  ║
║  │  │  ENGINE     │   │  ENGINE     │   │  TA→MYC     │   │  DNA        │          │  ║
║  │  │  (48 tests) │   │  (37 tests) │   │  (22 tests) │   │  (27 tests) │          │  ║
║  │  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘          │  ║
║  │         │                 │                 │                 │                 │  ║
║  │         ▼                 ▼                 ▼                 ▼                 │  ║
║  │  ┌───────────────────────────────────────────────────────────────────────────┐  │  ║
║  │  │                        MYCELIUM BIO (45 tests)                            │  │  ║
║  │  └───────────────────────────────────────────────────────────────────────────┘  │  ║
║  │                                         │                                       │  ║
║  │                                         ▼                                       │  ║
║  │  ┌───────────────────────────────────────────────────────────────────────────┐  │  ║
║  │  │                     rootHash = SHA-256(result)                            │  │  ║
║  │  │                     INV-CORE-03: Hash Chain Integrity                     │  │  ║
║  │  └───────────────────────────────────────────────────────────────────────────┘  │  ║
║  │                                                                                 │  ║
║  │  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │  ║
║  │  │               OBSERVABILITY LAYER (side-channel, read-only)             │  │  ║
║  │  │  • omega-observability (10 tests)                                       │  │  ║
║  │  │  • N'affecte PAS le rootHash (INV-PROG-01 à 04)                         │  │  ║
║  │   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │  ║
║  └─────────────────────────────────────────────────────────────────────────────────┘  ║
║                                                                                       ║
║  ┌─────────────────────────────────────────────────────────────────────────────────┐  ║
║  │                              GATEWAY (16 tests)                                 │  ║
║  │  Point d'entrée API pour intégration externe                                    │  ║
║  └─────────────────────────────────────────────────────────────────────────────────┘  ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

# 📦 REGISTRE DES MODULES

## Module 1: omega-segment-engine

| Attribut | Valeur |
|----------|--------|
| **Nom** | omega-segment-engine |
| **Rôle** | Découpage du texte en segments analysables |
| **Tests** | 48 (segmenter.test.ts) |
| **Localisation** | packages/omega-segment-engine/ |
| **Hashé** | ✅ OUI |

### Entrées/Sorties

| Type | Format | Description |
|------|--------|-------------|
| **Input** | `string` | Texte brut UTF-8 |
| **Output** | `Segment[]` | Array de segments avec métadonnées |

### Ce qui est hashé

| Élément | Hashé | Raison |
|---------|-------|--------|
| Liste des segments | ✅ OUI | Fait partie du résultat |
| Offset de chaque segment | ✅ OUI | Position déterministe |
| Contenu du segment | ✅ OUI | Données analysées |

### Ce qui n'est PAS hashé

| Élément | Hashé | Raison |
|---------|-------|--------|
| Durée de segmentation | ❌ NON | Variable runtime |
| Métadonnées debug | ❌ NON | Non pertinent |

### Dépendances

- Aucune dépendance externe majeure

### Tests associés

| Test | Description | Invariant |
|------|-------------|-----------|
| segmenter.test.ts | Tests unitaires segmentation | INV-CORE-05 |

---

## Module 2: omega-text-analyzer

| Attribut | Valeur |
|----------|--------|
| **Nom** | omega-text-analyzer |
| **Rôle** | Analyse émotionnelle (modèle Plutchik) |
| **Tests** | 37 (text_analyzer.test.ts) |
| **Localisation** | packages/omega-text-analyzer/ |
| **Hashé** | ✅ OUI |

### Entrées/Sorties

| Type | Format | Description |
|------|--------|-------------|
| **Input** | `Segment` | Segment à analyser |
| **Output** | `EmotionScore` | Scores Plutchik [0,1] |

### Ce qui est hashé

| Élément | Hashé | Raison |
|---------|-------|--------|
| Scores émotionnels | ✅ OUI | Résultat d'analyse |
| Émotion dominante | ✅ OUI | Déterministe |

### Ce qui n'est PAS hashé

| Élément | Hashé | Raison |
|---------|-------|--------|
| Temps de calcul | ❌ NON | Variable |
| Logs intermédiaires | ❌ NON | Debug |

### Dépendances

- emotion_engine.ts

### Tests associés

| Test | Description | Invariant |
|------|-------------|-----------|
| text_analyzer.test.ts | Analyse émotionnelle | INV-EMO-01, INV-EMO-02 |
| emotion_engine_test.ts | Moteur émotionnel | INV-EMO-01, INV-EMO-02 |

---

## Module 3: omega-bridge-ta-mycelium

| Attribut | Valeur |
|----------|--------|
| **Nom** | omega-bridge-ta-mycelium |
| **Rôle** | Transformation Text-Analyzer → Mycelium |
| **Tests** | 22 (bridge.test.ts) |
| **Localisation** | packages/omega-bridge-ta-mycelium/ |
| **Hashé** | ✅ OUI |

### Entrées/Sorties

| Type | Format | Description |
|------|--------|-------------|
| **Input** | `EmotionScore[]` | Array de scores |
| **Output** | `MyceliumInput` | Format Mycelium |

### Ce qui est hashé

| Élément | Hashé | Raison |
|---------|-------|--------|
| Mapping émotions | ✅ OUI | Transformation déterministe |
| Structure Mycelium | ✅ OUI | Données de sortie |

### Dépendances

- omega-text-analyzer
- mycelium-bio

---

## Module 4: omega-aggregate-dna

| Attribut | Valeur |
|----------|--------|
| **Nom** | omega-aggregate-dna |
| **Rôle** | Agrégation et calcul DNA |
| **Tests** | 27 (aggregate.test.ts) + 15 (analysis_to_dna.test.ts) |
| **Localisation** | packages/omega-aggregate-dna/ |
| **Hashé** | ✅ OUI |

### Entrées/Sorties

| Type | Format | Description |
|------|--------|-------------|
| **Input** | `MyceliumOutput[]` | Résultats Mycelium |
| **Output** | `DNA` | Signature émotionnelle |

### Ce qui est hashé

| Élément | Hashé | Raison |
|---------|-------|--------|
| Statistiques agrégées | ✅ OUI | Résultat final |
| Arcs émotionnels | ✅ OUI | Pattern narratif |
| DNA signature | ✅ OUI | Identité du texte |

---

## Module 5: mycelium-bio

| Attribut | Valeur |
|----------|--------|
| **Nom** | mycelium-bio |
| **Rôle** | Moteur bio-inspiré de visualisation |
| **Tests** | 45 (mycelium_invariants.test.ts) |
| **Localisation** | packages/mycelium-bio/ |
| **Hashé** | ✅ OUI |

### Entrées/Sorties

| Type | Format | Description |
|------|--------|-------------|
| **Input** | `MyceliumInput` | Données émotionnelles |
| **Output** | `MyceliumStructure` | Structure visualisable |

### Ce qui est hashé

| Élément | Hashé | Raison |
|---------|-------|--------|
| Structure L-systems | ✅ OUI | Algorithme déterministe |
| Nodes et connexions | ✅ OUI | Topologie |

---

## Module 6: omega-observability

| Attribut | Valeur |
|----------|--------|
| **Nom** | omega-observability |
| **Rôle** | Progress callbacks et métriques |
| **Tests** | 10 (progress_invariants.test.ts) |
| **Localisation** | packages/omega-observability/ |
| **Hashé** | ❌ NON |

### Entrées/Sorties

| Type | Format | Description |
|------|--------|-------------|
| **Input** | `PipelineEvent` | Événements du pipeline |
| **Output** | `string` | Formaté CLI/JSONL |

### Ce qui est hashé

| Élément | Hashé | Raison |
|---------|-------|--------|
| Rien | ❌ NON | Side-channel only |

### Ce qui n'est PAS hashé

| Élément | Hashé | Raison |
|---------|-------|--------|
| Progress events | ❌ NON | INV-PROG-01 |
| Format output | ❌ NON | INV-PROG-02 |
| Throttle timing | ❌ NON | INV-PROG-03 |

### Invariants critiques

| Invariant | Description |
|-----------|-------------|
| INV-PROG-01 | Progress ON/OFF ne change pas rootHash |
| INV-PROG-02 | Format CLI/JSONL ne change pas rootHash |
| INV-PROG-03 | Throttle ne change pas rootHash |
| INV-PROG-04 | Streaming + Progress ne change pas rootHash |

---

## Module 7: gateway

| Attribut | Valeur |
|----------|--------|
| **Nom** | gateway |
| **Rôle** | Point d'entrée API |
| **Tests** | 16 (gateway.test.ts) |
| **Localisation** | gateway/ |
| **Hashé** | ✅ OUI (résultats) |

### Entrées/Sorties

| Type | Format | Description |
|------|--------|-------------|
| **Input** | `Request` | Requête API |
| **Output** | `Response` | Réponse avec résultat |

---

# 📊 MATRICE DES TESTS

| Module | Tests | Fichier | Invariants |
|--------|-------|---------|------------|
| segment-engine | 48 | segmenter.test.ts | INV-CORE-05 |
| text-analyzer | 37 | text_analyzer.test.ts | INV-EMO-01, INV-EMO-02 |
| bridge | 22 | bridge.test.ts | INV-BRIDGE-xx |
| aggregate-dna | 42 | aggregate.test.ts, analysis_to_dna.test.ts | INV-CORE-03 |
| mycelium-bio | 45 | mycelium_invariants.test.ts | INV-CORE-05 |
| observability | 10 | progress_invariants.test.ts | INV-PROG-01 à 07 |
| gateway | 16 | gateway.test.ts | INV-CORE-xx |
| core invariants | 45 | invariants.test.ts | ALL CORE |
| scale | 14 | scale_invariants.test.ts | INV-SCALE-xx |
| stream | 15 | streaming_invariants.test.ts | INV-STR-xx |
| **TOTAL** | **294** | | |

---

# 🔒 SCEAU

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   OMEGA ARCHITECTURE GLOBALE — OFFICIEL                                               ║
║                                                                                       ║
║   Modules documentés:      7                                                          ║
║   Tests total:             294                                                        ║
║   Invariants applicables:  ~37                                                        ║
║                                                                                       ║
║   Vérifié 3x: ✅ Modules | ✅ I/O | ✅ Hash/Non-Hash                                  ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

**FIN DU DOCUMENT DOC-ARCH-001**

*Document généré le 2026-01-03 04:25 UTC*
*Projet OMEGA — NASA-Grade L4*
