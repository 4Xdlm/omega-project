# MYCELIUM_VALIDATION_PLAN.md
## Sprint 29.1 — Stratégie Globale de Validation

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   DOCUMENT:     MYCELIUM_VALIDATION_PLAN.md                                           ║
║   TYPE:         STRATÉGIE DE VALIDATION                                               ║
║   VERSION:      1.0.0                                                                 ║
║   DATE:         2026-01-07                                                            ║
║   STANDARD:     NASA-Grade L4 / OMEGA                                                 ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 1. SCOPE & NON-SCOPE

### 1.1 Ce que ce plan couvre (SCOPE)

| Élément | Description |
|---------|-------------|
| Validation d'entrée | Conformité des données au contrat DNA_INPUT_CONTRACT |
| Invariants Mycelium | Preuve des 12 INV-MYC-* |
| Rejets déterministes | Preuve des 20 REJ-MYC-* |
| Frontière | Respect des 4 INV-BOUND-* |
| Normalisation | Line endings, encodage |

### 1.2 Ce que ce plan NE couvre PAS (NON-SCOPE)

| Élément | Raison | Responsable |
|---------|--------|-------------|
| Analyse émotionnelle | Domaine Genome | Genome |
| Fingerprint SHA-256 | Domaine Genome | Genome |
| Falsification Sentinel | Système de preuve distinct | Sentinel |
| Performance | Phase ultérieure | Sprint 29.x |
| Qualité du contenu | Hors scope Mycelium | N/A |

---

## 2. POSITIONNEMENT DANS OMEGA

### 2.1 Hiérarchie des validations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NIVEAUX DE VALIDATION OMEGA                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   NIVEAU 1 — MYCELIUM VALIDATION (ce document)                              │
│   ─────────────────────────────────────────────────────────────────────     │
│   • Gate d'entrée                                                           │
│   • Validation contractuelle                                                │
│   • Rejet déterministe                                                      │
│   • AVANT toute analyse                                                     │
│                                                                             │
│                              ▼                                              │
│                                                                             │
│   NIVEAU 2 — GENOME ANALYSIS                                                │
│   ─────────────────────────────────────────────────────────────────────     │
│   • Analyse émotionnelle                                                    │
│   • Fingerprint déterministe                                                │
│   • Invariants INV-GEN-*                                                    │
│   • APRÈS validation Mycelium                                               │
│                                                                             │
│                              ▼                                              │
│                                                                             │
│   NIVEAU 3 — SENTINEL FALSIFICATION                                         │
│   ─────────────────────────────────────────────────────────────────────     │
│   • Attaques structurées                                                    │
│   • Preuve de survie                                                        │
│   • Certification finale                                                    │
│   • APRÈS production de résultats                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Indépendance des niveaux

| Principe | Description |
|----------|-------------|
| P1 | Mycelium se valide SANS Genome |
| P2 | Mycelium se valide SANS Sentinel |
| P3 | Un échec Mycelium ne déclenche JAMAIS Genome |
| P4 | Sentinel ne juge PAS Mycelium (hors scope) |

---

## 3. DIFFÉRENCE : VALIDATION vs FALSIFICATION

### 3.1 Validation Mycelium

| Attribut | Valeur |
|----------|--------|
| Objectif | Prouver conformité au contrat |
| Méthode | Vérification de propriétés |
| Entrée | Données brutes |
| Sortie | ACCEPT ou REJECT (déterministe) |
| Juge | Mycelium lui-même |
| Moment | AVANT analyse |

### 3.2 Falsification Sentinel

| Attribut | Valeur |
|----------|--------|
| Objectif | Prouver résistance aux attaques |
| Méthode | Attaques structurées (ATK-*) |
| Entrée | Résultats d'analyse |
| Sortie | SURVIVED ou BREACHED |
| Juge | Sentinel externe |
| Moment | APRÈS analyse |

### 3.3 Pourquoi cette distinction est critique

```
Validation Mycelium ≠ Falsification Sentinel

• Validation = "Est-ce que l'entrée est conforme ?"
• Falsification = "Est-ce que le système résiste aux attaques ?"

Confondre les deux mène à :
- Tester Mycelium avec des attaques Sentinel (inapproprié)
- Sauter la validation pour aller direct à Sentinel (dangereux)
- Croire qu'un PASS Sentinel valide les entrées (faux)
```

---

## 4. TYPES DE VALIDATION

### 4.1 Classification

| Type | Description | Exemples |
|------|-------------|----------|
| HARD | Rejet immédiat, aucune exception | UTF-8 invalide, taille > 10MB |
| SOFT | Normalisation silencieuse documentée | Line endings CRLF → LF |
| WARN | Accepté avec avertissement | (réservé, non utilisé v1.0) |

### 4.2 Ordre d'exécution (OBLIGATOIRE)

```
ÉTAPE 1 — HARD validations (rejet immédiat)
    │
    ├── Format binaire détecté? → REJECT
    ├── Taille > MAX? → REJECT
    ├── UTF-8 invalide? → REJECT
    ├── Caractères interdits? → REJECT
    └── Contenu vide? → REJECT
    │
    ▼
ÉTAPE 2 — SOFT normalisations (modification documentée)
    │
    ├── Line endings → LF
    └── (autres normalisations futures)
    │
    ▼
ÉTAPE 3 — EMIT (données validées vers sortie)
```

### 4.3 Justification de l'ordre

| Règle | Raison |
|-------|--------|
| HARD avant SOFT | Ne pas normaliser ce qui sera rejeté |
| Pas de SOFT sur rejeté | Économie de ressources |
| EMIT en dernier | Garantit que tout est validé |

---

## 5. GATES BLOQUANTS

### 5.1 Définition

Un **gate bloquant** est une condition qui, si échouée, empêche TOUTE progression.

### 5.2 Liste des gates

| Gate ID | Condition | Échec = |
|---------|-----------|---------|
| GATE-MYC-01 | UTF-8 valide | REJECT immédiat |
| GATE-MYC-02 | Taille ≤ MAX | REJECT immédiat |
| GATE-MYC-03 | Pas de binaire | REJECT immédiat |
| GATE-MYC-04 | Contenu non-vide | REJECT immédiat |
| GATE-MYC-05 | Pas de contrôle interdit | REJECT immédiat |

### 5.3 Aucun contournement

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   UN GATE ÉCHOUÉ = ARRÊT TOTAL                                                ║
║                                                                               ║
║   • Pas de "mode dégradé"                                                     ║
║   • Pas de "skip pour debug"                                                  ║
║   • Pas de "override administrateur"                                          ║
║                                                                               ║
║   Si un gate échoue, RIEN ne passe. Point.                                    ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 6. LIEN AVEC SPRINT 29.0

### 6.1 Documents source

| Document Sprint 29.0 | Utilisation ici |
|----------------------|-----------------|
| DNA_INPUT_CONTRACT.md | Définit ce qui est validé |
| MYCELIUM_INVARIANTS.md | Définit les propriétés à prouver |
| MYCELIUM_REJECTION_CATALOG.md | Définit les codes de sortie |
| BOUNDARY_MYCELIUM_GENOME.md | Définit la portée de la validation |

### 6.2 Traçabilité

| Invariant (29.0) | Gate (29.1) | Validation |
|------------------|-------------|------------|
| INV-MYC-01 | GATE-MYC-01 | UTF-8 strict |
| INV-MYC-02 | GATE-MYC-02 | Taille limite |
| INV-MYC-05 | GATE-MYC-03 | Détection binaire |
| INV-MYC-06 | GATE-MYC-04 | Non-vide |
| INV-MYC-07 | GATE-MYC-05 | Contrôle chars |

---

## 7. CONDITIONS D'ÉCHEC GLOBAL

### 7.1 Quand Mycelium est-il considéré NON VALIDE ?

| Condition | Impact |
|-----------|--------|
| Un invariant INV-MYC-* non prouvé | Mycelium NON VALIDE |
| Un gate GATE-MYC-* contournable | Mycelium NON VALIDE |
| Un rejet REJ-MYC-* non déterministe | Mycelium NON VALIDE |
| Une normalisation non documentée | Mycelium NON VALIDE |

### 7.2 Conséquence d'un Mycelium NON VALIDE

```
MYCELIUM NON VALIDE = GENOME INUTILISABLE

Si Mycelium ne garantit pas ses contrats,
Genome reçoit des données non fiables,
donc ses résultats sont non fiables,
donc Sentinel ne peut pas juger correctement.

Toute la chaîne s'effondre.
```

---

## 8. RÉSUMÉ EXÉCUTIF (5 MINUTES)

### Pour un auditeur hostile :

1. **Mycelium se valide seul** — Pas de dépendance Genome/Sentinel.

2. **Validation ≠ Falsification** — On vérifie des contrats, on n'attaque pas.

3. **HARD avant SOFT** — Rejeter d'abord, normaliser ensuite.

4. **5 gates bloquants** — Échec = arrêt total, sans exception.

5. **Échec global** — Un seul invariant non prouvé invalide tout Mycelium.

6. **Traçabilité** — Chaque validation mappe à un invariant 29.0.

---

## SIGNATURE

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   PLAN DE VALIDATION MYCELIUM — VERSION 1.0.0                                         ║
║                                                                                       ║
║   Gates bloquants:      5                                                             ║
║   Types validation:     HARD, SOFT                                                    ║
║   Ordre:                HARD → SOFT → EMIT                                            ║
║   Contournement:        INTERDIT                                                      ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

**FIN DU DOCUMENT**
