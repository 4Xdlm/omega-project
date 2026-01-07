# INTEGRATION_GENOME_TO_SENTINEL.md
## Sprint 28.5 — Contrat d'Intégration

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   DOCUMENT:     INTEGRATION_GENOME_TO_SENTINEL.md                                     ║
║   SCOPE:        PREPARATION ONLY — NO CODE                                            ║
║   PHASE:        28.5 (PREP)                                                           ║
║   STATUS:       READY — WAITING SENTINEL ACCESS                                       ║
║   AUTHORITY:    ARCHITECTE SUPRÊME                                                    ║
║   STANDARD:     OMEGA / NASA-Grade L4                                                 ║
║   DATE:         2026-01-07                                                            ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 1. OBJECTIF DU DOCUMENT

Ce document définit **l'intégration formelle** du module **Genome v1.2.0** dans le système de preuve **Sentinel (Phase 27)**.

**Portée :**
- Aucun code n'est modifié dans cette phase PREP
- Ce document constitue **le contrat d'intégration opposable**
- Toute implémentation future devra **s'y conformer strictement**
- Temps d'implémentation cible : **< 1 heure** une fois l'accès ouvert

**Non-portée :**
- Modification du core Sentinel
- Création de nouveaux invariants Sentinel
- Modification de la chaîne Self-Seal existante

---

## 2. ARCHITECTURE D'INTÉGRATION

### 2.1 Hiérarchie (NON NÉGOCIABLE)

```
┌─────────────────────────────────────────────────────────────────┐
│                     SENTINEL (ROOT / JUDGE)                      │
│                                                                  │
│  ┌──────────────┐  ┌────────────────────┐  ┌──────────────────┐ │
│  │  Inventory   │  │ FalsificationRunner │  │    Self-Seal     │ │
│  │              │  │                     │  │                  │ │
│  │ INV-001..087 │  │   Attaques P27      │  │   v1.0.0         │ │
│  │ INV-GEN-01.. │  │   ATK-GEN-01..      │  │   + GENOME_SEAL  │ │
│  └──────────────┘  └────────────────────┘  └──────────────────┘ │
│         ▲                    ▲                      ▲            │
└─────────┼────────────────────┼──────────────────────┼────────────┘
          │                    │                      │
          │    SOUMISSION      │    FALSIFICATION     │  CERTIFICATION
          │    (INV-GEN-*)     │    (ATK-GEN-*)       │  (SEAL)
          │                    │                      │
┌─────────┴────────────────────┴──────────────────────┴────────────┐
│                     GENOME (CLIENT CERTIFIÉ)                      │
│                                                                   │
│  ┌──────────────┐  ┌────────────────────┐  ┌──────────────────┐  │
│  │   analyze()  │  │    compare()       │  │  GENOME_SEAL     │  │
│  │              │  │                    │  │                  │  │
│  │ 14 invariants│  │  Similarité        │  │  v1.2.0          │  │
│  └──────────────┘  └────────────────────┘  └──────────────────┘  │
│                                                                   │
│                        109 tests PASS                             │
└───────────────────────────────────────────────────────────────────┘
```

### 2.2 Règles absolues

| Règle | Description | Violation = |
|-------|-------------|-------------|
| R1 | Sentinel JUGE | NCR-CRITICAL |
| R2 | Genome SOUMET | NCR-CRITICAL |
| R3 | Flux UNIDIRECTIONNEL (Genome → Sentinel) | NCR-CRITICAL |
| R4 | Aucun accès Genome → Core Sentinel | NCR-CRITICAL |
| R5 | Self-Seal Sentinel reste ROOT | NCR-CRITICAL |

---

## 3. PRÉREQUIS À L'INTÉGRATION (HARD GATE)

### 3.1 Conditions bloquantes

L'intégration réelle (SPRINT 28.5 — CODE) est **INTERDITE** tant que :

| Prérequis | Status actuel | Action requise |
|-----------|---------------|----------------|
| Accès écriture code Sentinel Phase 27 | ❌ INDISPONIBLE | Obtenir accès repo |
| Self-Seal Sentinel vérifiable | ❌ NON VÉRIFIÉ | Valider hash chain |
| Inventory accessible | ❌ NON ACCESSIBLE | Obtenir interface |
| FalsificationRunner accessible | ❌ NON ACCESSIBLE | Obtenir interface |
| Boundary Ledger accessible | ❌ NON ACCESSIBLE | Obtenir interface |

### 3.2 Validation pré-intégration

Avant d'écrire la première ligne de code :

```
[ ] OMEGA_PHASE_27_FINAL.zip extrait et vérifié
[ ] Self-Seal Sentinel v1.0.0 hash validé
[ ] Inventory.ts localisé et analysé
[ ] FalsificationRunner.ts localisé et analysé
[ ] Structure des invariants existants documentée
[ ] Aucun conflit d'ID (INV-GEN-* vs INV-*)
```

---

## 4. MAPPING DES INVARIANTS (Genome → Sentinel.Inventory)

### 4.1 Table exhaustive

| ID | Description | Source | Cible Sentinel | Criticité | Mode | Version | Tests |
|----|-------------|--------|----------------|-----------|------|---------|-------|
| INV-GEN-01 | Déterminisme (même input → même output) | Genome | Inventory | CRITICAL | STATIC | v1.2.0 | 2 |
| INV-GEN-02 | Fingerprint = SHA256(canonical payload) | Genome | Inventory | CRITICAL | STATIC | v1.2.0 | 4 |
| INV-GEN-03 | Axes bornés [0,1] ou [-1,1] | Genome | Inventory | HIGH | DYNAMIC | v1.2.0 | 3 |
| INV-GEN-04 | Distribution émotionnelle somme = 1.0 | Genome | Inventory | HIGH | DYNAMIC | v1.2.0 | 5 |
| INV-GEN-05 | Similarité symétrique sim(A,B) = sim(B,A) | Genome | Inventory | HIGH | DYNAMIC | v1.2.0 | 2 |
| INV-GEN-06 | Similarité bornée [0,1] | Genome | Inventory | HIGH | DYNAMIC | v1.2.0 | 2 |
| INV-GEN-07 | Auto-similarité sim(A,A) = 1.0 | Genome | Inventory | MEDIUM | DYNAMIC | v1.2.0 | 2 |
| INV-GEN-08 | Version tracée dans genome.version | Genome | Inventory | MEDIUM | STATIC | v1.2.0 | 1 |
| INV-GEN-09 | Source tracée via genome.sourceHash | Genome | Inventory | HIGH | STATIC | v1.2.0 | 1 |
| INV-GEN-10 | Read-only (extraction n'affecte pas source) | Genome | Inventory | CRITICAL | STATIC | v1.2.0 | 1 |
| INV-GEN-11 | Metadata exclue du fingerprint | Genome | Inventory | CRITICAL | STATIC | v1.2.0 | 4 |
| INV-GEN-12 | Emotion14 sanctuarisé (14 émotions, ordre fixe) | Genome | Inventory | CRITICAL | STATIC | v1.2.0 | 6 |
| INV-GEN-13 | Sérialisation canonique (clés triées, UTF-8) | Genome | Inventory | CRITICAL | STATIC | v1.2.0 | 3 |
| INV-GEN-14 | Float quantifié à 1e-6 avant hash | Genome | Inventory | CRITICAL | STATIC | v1.2.0 | 3 |

**Total : 14 invariants, 39 tests directs**

### 4.2 Définitions des modes

| Mode | Description | Évaluation |
|------|-------------|------------|
| STATIC | Invariant structurel, déclaré une fois | À l'enregistrement |
| DYNAMIC | Invariant comportemental, évalué à chaque run | Par FalsificationRunner |

### 4.3 Format d'enregistrement Sentinel (pseudo-code)

```typescript
// À adapter selon interface réelle Sentinel.Inventory
const GENOME_INVARIANTS: InvariantDeclaration[] = [
  {
    id: "INV-GEN-01",
    module: "genome",
    version: "1.2.0",
    description: "Déterminisme: même input + seed → même fingerprint",
    criticality: "CRITICAL",
    mode: "STATIC",
    testCount: 2,
    proofHash: "<hash_du_test_file>",
  },
  // ... 13 autres
];
```

---

## 5. MAPPING DES ATTAQUES (Genome → FalsificationRunner)

### 5.1 Table exhaustive

| Attack ID | Description | Mutation appliquée | Invariant ciblé | Input type | Verdict attendu |
|-----------|-------------|-------------------|-----------------|------------|-----------------|
| ATK-GEN-01 | Permutation clés JSON | Réordonne les clés avant hash | INV-GEN-13 | payload | REJECT |
| ATK-GEN-02 | Float drift (1e-7) | Ajoute epsilon < 1e-6 à un float | INV-GEN-14 | axes.style.burstiness | REJECT |
| ATK-GEN-03 | Float drift (1e-5) | Ajoute epsilon > 1e-6 à un float | INV-GEN-14 | axes.style.burstiness | REJECT* |
| ATK-GEN-04 | Metadata injection | Ajoute champ metadata | INV-GEN-11 | payload | REJECT |
| ATK-GEN-05 | Metadata modification | Modifie timestamp | INV-GEN-11 | payload.metadata | ACCEPT** |
| ATK-GEN-06 | Emotion14 length (13) | Supprime une émotion | INV-GEN-12 | distribution | REJECT |
| ATK-GEN-07 | Emotion14 length (15) | Ajoute une émotion | INV-GEN-12 | distribution | REJECT |
| ATK-GEN-08 | Emotion14 order | Permute l'ordre des émotions | INV-GEN-12 | distribution | REJECT |
| ATK-GEN-09 | Similarité asymétrique | Modifie compare() pour A≠B | INV-GEN-05 | function | REJECT |
| ATK-GEN-10 | Distribution ≠ 1.0 | Somme = 0.99 ou 1.01 | INV-GEN-04 | distribution | REJECT |
| ATK-GEN-11 | NaN injection | Injecte NaN dans un axe | INV-GEN-14 | axes | REJECT |
| ATK-GEN-12 | Infinity injection | Injecte Infinity | INV-GEN-14 | axes | REJECT |
| ATK-GEN-13 | Seed tampering | Change seed sans changer fingerprint | INV-GEN-01 | options | REJECT |
| ATK-GEN-14 | Version spoof | Change version sans recalcul | INV-GEN-08 | genome.version | REJECT |
| ATK-GEN-15 | SourceHash tampering | Modifie sourceHash post-extraction | INV-GEN-09 | genome.sourceHash | REJECT |

**Notes :**
- `*` ATK-GEN-03 : Si epsilon > 1e-6, le fingerprint DOIT changer → différent = REJECT si on prétend identique
- `**` ATK-GEN-05 : Metadata modifiée ne doit PAS changer le fingerprint → ACCEPT (fingerprint identique)

### 5.2 Règles d'exécution

| Règle | Description |
|-------|-------------|
| SEEDED | Chaque attaque utilise un seed fixe pour reproductibilité |
| LOGGED | Chaque attaque génère un log horodaté |
| ISOLATED | Chaque attaque s'exécute dans un contexte propre |
| VERDICT | Chaque attaque produit un verdict unique |

### 5.3 Format d'attaque FalsificationRunner (pseudo-code)

```typescript
// À adapter selon interface réelle FalsificationRunner
const GENOME_ATTACKS: AttackDeclaration[] = [
  {
    id: "ATK-GEN-01",
    module: "genome",
    target: "INV-GEN-13",
    description: "Permutation clés JSON",
    mutator: (payload) => shuffleKeys(payload),
    expectedVerdict: "REJECT",
    seed: 42,
  },
  // ... 14 autres
];
```

---

## 6. PREUVES ATTENDUES (SENTINEL-SIDE)

### 6.1 Checklist de preuves

Une intégration est **INVALIDE** si une seule preuve manque.

| Preuve | Format | Obligatoire | Description |
|--------|--------|-------------|-------------|
| P1 | JSON | ✅ | Log FalsificationRunner complet |
| P2 | JSON | ✅ | Verdict par attaque (ACCEPT/REJECT/QUARANTINE) |
| P3 | SHA-256 | ✅ | Snapshot hash Sentinel post-intégration |
| P4 | JSON | ✅ | Mapping invariant ↔ attaque ↔ verdict |
| P5 | SHA-256 | ✅ | Hash GENOME_SEAL.json |
| P6 | TXT | ✅ | Diff Sentinel (avant/après) |
| P7 | JSON | ⚠️ | Self-Seal Sentinel mis à jour (si applicable) |

### 6.2 Structure du rapport d'intégration

```json
{
  "integration": {
    "module": "genome",
    "version": "1.2.0",
    "date": "YYYY-MM-DD",
    "sentinel_version": "Phase 27"
  },
  "invariants": {
    "registered": 14,
    "verified": 14,
    "failed": 0
  },
  "attacks": {
    "executed": 15,
    "passed": 15,
    "failed": 0,
    "results": [
      { "id": "ATK-GEN-01", "verdict": "REJECT", "expected": "REJECT", "status": "PASS" },
      // ...
    ]
  },
  "hashes": {
    "genome_seal": "<hash>",
    "sentinel_snapshot_before": "<hash>",
    "sentinel_snapshot_after": "<hash>"
  },
  "verdict": "INTEGRATION_VALID"
}
```

---

## 7. CRITÈRES D'ACCEPTATION — SPRINT 28.5 (CODE)

### 7.1 Conditions nécessaires et suffisantes

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   SPRINT 28.5 — CODE ACCEPTED IF AND ONLY IF:                                         ║
║                                                                                       ║
║   ✅ Tous les 14 invariants Genome apparaissent dans Sentinel.Inventory               ║
║   ✅ Toutes les 15 attaques ATK-GEN-* sont exécutées par FalsificationRunner          ║
║   ✅ Les verdicts sont 100% conformes aux attendus                                    ║
║   ✅ Aucun invariant Sentinel existant (INV-001 à INV-087) n'est modifié              ║
║   ✅ Self-Seal Sentinel reste valide (ou est mis à jour proprement)                   ║
║   ✅ Rapport d'intégration complet généré                                             ║
║   ✅ Diff Sentinel documenté                                                          ║
║   ✅ Tests Sentinel existants toujours PASS (898/898)                                 ║
║   ✅ Tests Genome toujours PASS (109/109)                                             ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

### 7.2 Conditions d'échec

| Condition | Résultat |
|-----------|----------|
| Un invariant non enregistré | FAIL |
| Une attaque non exécutée | FAIL |
| Un verdict non conforme | FAIL |
| Un test Sentinel cassé | FAIL |
| Self-Seal Sentinel invalide | FAIL |
| Rapport incomplet | FAIL |

---

## 8. INTERDICTIONS EXPLICITES

### 8.1 Liste des interdictions

| ID | Interdiction | Raison | Sanction |
|----|--------------|--------|----------|
| INT-01 | Modification du core Sentinel | Corruption chaîne de confiance | NCR-CRITICAL + ROLLBACK |
| INT-02 | Bypass Inventory | Invariant non traçable | NCR-CRITICAL |
| INT-03 | Bypass FalsificationRunner | Attaque non prouvée | NCR-CRITICAL |
| INT-04 | Exception "temporaire" | Dette technique | NCR-HIGH |
| INT-05 | Mock ou simulation | Preuve invalide | NCR-HIGH |
| INT-06 | Intégration partielle | État inconsistant | NCR-HIGH |
| INT-07 | Modification Self-Seal sans procédure | Rupture chaîne | NCR-CRITICAL |
| INT-08 | Ajout d'invariant Sentinel non documenté | Traçabilité perdue | NCR-MEDIUM |

### 8.2 Clause de protection

Ce document protège contre :
- Les "optimisations" futures non autorisées
- Les raccourcis sous pression
- Les intégrations "rapides" non prouvées
- Les modifications silencieuses

Toute dérogation nécessite :
1. Approbation écrite Architecte Suprême
2. Nouveau document NCR
3. Justification technique complète

---

## 9. PROCÉDURE D'INTÉGRATION (STEP-BY-STEP)

### 9.1 Phase PREP (ce document) ✅

```
[✅] 1. Créer INTEGRATION_GENOME_TO_SENTINEL.md
[✅] 2. Mapper tous les invariants
[✅] 3. Mapper toutes les attaques
[✅] 4. Définir critères d'acceptation
[✅] 5. Documenter interdictions
[✅] 6. Valider avec Architecte
```

### 9.2 Phase CODE (futur)

```
[ ] 1. Obtenir accès write Sentinel
[ ] 2. Extraire et vérifier OMEGA_PHASE_27_FINAL.zip
[ ] 3. Valider Self-Seal Sentinel existant
[ ] 4. Snapshot Sentinel BEFORE
[ ] 5. Implémenter registration invariants (Inventory)
[ ] 6. Implémenter attacks (FalsificationRunner)
[ ] 7. Exécuter tous les tests Sentinel (898)
[ ] 8. Exécuter tous les tests Genome (109)
[ ] 9. Exécuter toutes les attaques (15)
[ ] 10. Snapshot Sentinel AFTER
[ ] 11. Générer rapport d'intégration
[ ] 12. Mettre à jour Self-Seal si nécessaire
[ ] 13. Validation finale Architecte
```

---

## 10. STATUT ACTUEL

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   SPRINT 28.5 — PREP:  ✅ READY                                                       ║
║   SPRINT 28.5 — CODE:  ⏸️ WAITING                                                     ║
║                                                                                       ║
║   Blocage:     Sentinel Phase 27 write-access unavailable                             ║
║   Dès accès:   Implémentation < 1 heure (tout est préparé)                            ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 11. RÉFÉRENCES

| Document | Hash | Status |
|----------|------|--------|
| OMEGA_GENOME_PHASE28_FINAL.zip | `6bc5433ac9d3936aa13a899afeb3387f6921c56191539a6f544a09c5f7087d86` | SEALED |
| GENOME_SEAL.json | (inclus dans ZIP) | SEALED |
| SESSION_SAVE_PHASE_28.md | (archivé) | FROZEN |
| OMEGA_PHASE_27_FINAL.zip | (Phase 27) | FROZEN |

---

## 12. SIGNATURE

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   Document:        INTEGRATION_GENOME_TO_SENTINEL.md                                  ║
║   Date:            2026-01-07                                                         ║
║   Rédigé par:      Claude (IA Principal)                                              ║
║   Autorisé par:    Francky (Architecte Suprême)                                       ║
║   Standard:        OMEGA / NASA-Grade L4                                              ║
║                                                                                       ║
║   Status:          PREP COMPLETE — READY FOR CODE PHASE                               ║
║                                                                                       ║
║   Ce document est un contrat d'intégration opposable.                                 ║
║   Toute implémentation doit s'y conformer strictement.                                ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

**FIN DU DOCUMENT**
