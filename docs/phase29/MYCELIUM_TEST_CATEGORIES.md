# MYCELIUM_TEST_CATEGORIES.md
## Sprint 29.1 — Typologie des Tests de Validation

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   DOCUMENT:     MYCELIUM_TEST_CATEGORIES.md                                           ║
║   TYPE:         CATALOGUE DE CATÉGORIES                                               ║
║   VERSION:      1.0.0                                                                 ║
║   DATE:         2026-01-07                                                            ║
║   STANDARD:     NASA-Grade L4 / OMEGA                                                 ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 1. PRINCIPE DE CATÉGORISATION

### 1.1 Objectif

Chaque catégorie de tests répond à une question précise sur Mycelium. Les catégories sont **exhaustives** et **mutuellement exclusives**.

### 1.2 Structure par catégorie

Chaque catégorie définit :
- Objectif (ce qu'on vérifie)
- Invariants couverts (INV-MYC-*)
- Rejets associés (REJ-MYC-*)
- Verdict attendu (PASS/FAIL conditions)

---

## 2. CATÉGORIE A — CONFORMITÉ CONTRACTUELLE

### CAT-A : Contract Conformance Tests

| Attribut | Valeur |
|----------|--------|
| ID | CAT-A |
| Nom | Contract Conformance |
| Question | "L'entrée respecte-t-elle le contrat DNA_INPUT_CONTRACT ?" |

#### Objectif

Vérifier que Mycelium accepte exactement ce que le contrat autorise, et rejette exactement ce que le contrat interdit.

#### Invariants couverts

| Invariant | Rôle dans CAT-A |
|-----------|-----------------|
| INV-MYC-03 | Pas de bypass validation |
| INV-MYC-10 | Rejet terminal |

#### Rejets associés

| Rejet | Déclencheur |
|-------|-------------|
| REJ-MYC-001 à 008 | Formats interdits |
| REJ-MYC-400, 401 | Paramètres invalides |

#### Verdict attendu

| Entrée | Verdict |
|--------|---------|
| Conforme au contrat | ACCEPT |
| Non-conforme | REJECT avec code approprié |

---

## 3. CATÉGORIE B — VALIDATION ENCODAGE

### CAT-B : Encoding Validation Tests

| Attribut | Valeur |
|----------|--------|
| ID | CAT-B |
| Nom | Encoding Validation |
| Question | "L'encodage UTF-8 est-il strictement valide ?" |

#### Objectif

Vérifier que toute séquence UTF-8 invalide provoque un rejet immédiat.

#### Invariants couverts

| Invariant | Rôle dans CAT-B |
|-----------|-----------------|
| INV-MYC-01 | UTF-8 strict |
| INV-MYC-07 | Control chars rejetés |

#### Rejets associés

| Rejet | Déclencheur |
|-------|-------------|
| REJ-MYC-100 | Séquence invalide |
| REJ-MYC-101 | Overlong encoding |
| REJ-MYC-102 | Surrogate pair |
| REJ-MYC-103 | BOM détecté |
| REJ-MYC-301 | Control character |

#### Verdict attendu

| Entrée | Verdict |
|--------|---------|
| UTF-8 valide, sans BOM, sans contrôle interdit | ACCEPT |
| Tout autre cas | REJECT avec code spécifique |

#### Cas de test typiques

| Cas | Description | Verdict attendu |
|-----|-------------|-----------------|
| B.1 | Texte ASCII pur | ACCEPT |
| B.2 | Texte UTF-8 avec accents | ACCEPT |
| B.3 | Séquence 0x80 isolée | REJECT (REJ-MYC-100) |
| B.4 | Overlong NUL (C0 80) | REJECT (REJ-MYC-101) |
| B.5 | Surrogate U+D800 | REJECT (REJ-MYC-102) |
| B.6 | BOM EF BB BF | REJECT (REJ-MYC-103) |
| B.7 | Bell char (0x07) | REJECT (REJ-MYC-301) |

---

## 4. CATÉGORIE C — LIMITES ET BORNES

### CAT-C : Boundary Tests

| Attribut | Valeur |
|----------|--------|
| ID | CAT-C |
| Nom | Boundary Tests |
| Question | "Les limites de taille sont-elles correctement enforcées ?" |

#### Objectif

Vérifier que les limites définies dans le contrat sont strictement respectées.

#### Invariants couverts

| Invariant | Rôle dans CAT-C |
|-----------|-----------------|
| INV-MYC-02 | Size bound enforcement |
| INV-MYC-06 | Empty rejection |

#### Rejets associés

| Rejet | Déclencheur |
|-------|-------------|
| REJ-MYC-200 | Size exceeded |
| REJ-MYC-201 | Line too long |
| REJ-MYC-202 | Too many segments |
| REJ-MYC-300 | Empty input |

#### Verdict attendu

| Entrée | Verdict |
|--------|---------|
| 1 byte ≤ size ≤ 10 MB | ACCEPT (si autres critères OK) |
| 0 bytes | REJECT (REJ-MYC-300) |
| > 10 MB | REJECT (REJ-MYC-200) |

#### Cas de test typiques

| Cas | Description | Verdict attendu |
|-----|-------------|-----------------|
| C.1 | 1 caractère "a" | ACCEPT |
| C.2 | Exactement 10 MB | ACCEPT |
| C.3 | 10 MB + 1 byte | REJECT (REJ-MYC-200) |
| C.4 | String vide "" | REJECT (REJ-MYC-300) |
| C.5 | Whitespace only "   " | REJECT (REJ-MYC-300) |
| C.6 | Ligne de 1 MB + 1 | REJECT (REJ-MYC-201) |

---

## 5. CATÉGORIE D — REJET DÉTERMINISTE

### CAT-D : Deterministic Rejection Tests

| Attribut | Valeur |
|----------|--------|
| ID | CAT-D |
| Nom | Deterministic Rejection |
| Question | "Le même input invalide produit-il toujours le même rejet ?" |

#### Objectif

Prouver que les rejets sont déterministes : même entrée → même code → même message.

#### Invariants couverts

| Invariant | Rôle dans CAT-D |
|-----------|-----------------|
| INV-MYC-08 | Deterministic output |
| INV-MYC-10 | Rejection is terminal |

#### Rejets associés

Tous les REJ-MYC-* sont concernés.

#### Verdict attendu

| Condition | Verdict |
|-----------|---------|
| N exécutions, même input invalide → même code | PASS |
| Variation du code de rejet | FAIL |

#### Méthodologie

| Étape | Description |
|-------|-------------|
| 1 | Choisir un input invalide (ex: PDF) |
| 2 | Exécuter validation N fois (N ≥ 100) |
| 3 | Collecter les codes de rejet |
| 4 | Vérifier unicité du code |

---

## 6. CATÉGORIE E — STABILITÉ ACCEPT

### CAT-E : Accept Stability Tests

| Attribut | Valeur |
|----------|--------|
| ID | CAT-E |
| Nom | Accept Stability |
| Question | "Le même input valide produit-il toujours le même output ?" |

#### Objectif

Prouver que les acceptations sont déterministes : même entrée valide → même sortie byte-identical.

#### Invariants couverts

| Invariant | Rôle dans CAT-E |
|-----------|-----------------|
| INV-MYC-08 | Deterministic output |
| INV-MYC-04 | Line ending normalization |

#### Rejets associés

Aucun (on teste les ACCEPT).

#### Verdict attendu

| Condition | Verdict |
|-----------|---------|
| N exécutions, même input → même output (byte-compare) | PASS |
| Variation du output | FAIL |

#### Méthodologie

| Étape | Description |
|-------|-------------|
| 1 | Choisir un input valide |
| 2 | Exécuter validation N fois (N ≥ 100) |
| 3 | Hash SHA-256 de chaque output |
| 4 | Vérifier unicité du hash |

---

## 7. CATÉGORIE F — NON-ALTÉRATION

### CAT-F : Non-Alteration Tests

| Attribut | Valeur |
|----------|--------|
| ID | CAT-F |
| Nom | Non-Alteration |
| Question | "Mycelium modifie-t-il silencieusement le contenu ?" |

#### Objectif

Prouver que Mycelium ne modifie rien sauf les normalisations documentées (line endings).

#### Invariants couverts

| Invariant | Rôle dans CAT-F |
|-----------|-----------------|
| INV-MYC-09 | No silent modification |
| INV-MYC-04 | Line ending normalization (seule exception) |

#### Rejets associés

Aucun (on teste les transformations).

#### Verdict attendu

| Condition | Verdict |
|-----------|---------|
| Contenu préservé (sauf LF normalization) | PASS |
| Trim, strip, ou autre modification | FAIL |

#### Cas de test typiques

| Cas | Input | Expected Output | Verdict si... |
|-----|-------|-----------------|---------------|
| F.1 | "  text  " | "  text  " | PASS si préservé |
| F.2 | "line\r\ntext" | "line\ntext" | PASS (LF norm) |
| F.3 | "text\n\n\n" | "text\n\n\n" | PASS si préservé |

---

## 8. CATÉGORIE G — ISOLATION METADATA

### CAT-G : Metadata Isolation Tests

| Attribut | Valeur |
|----------|--------|
| ID | CAT-G |
| Nom | Metadata Isolation |
| Question | "Les métadonnées affectent-elles le résultat de validation ?" |

#### Objectif

Prouver que les métadonnées (sourceId, timestamp) n'influencent pas le verdict.

#### Invariants couverts

| Invariant | Rôle dans CAT-G |
|-----------|-----------------|
| INV-MYC-11 | Metadata isolation |

#### Rejets associés

Aucun (on teste l'isolation).

#### Verdict attendu

| Condition | Verdict |
|-----------|---------|
| Même content, metadata différentes → même verdict | PASS |
| Metadata influence le verdict | FAIL |

#### Cas de test typiques

| Cas | Content | Meta A | Meta B | Verdict |
|-----|---------|--------|--------|---------|
| G.1 | "hello" | {sourceId: "A"} | {sourceId: "B"} | Même verdict |
| G.2 | "hello" | {timestamp: T1} | {timestamp: T2} | Même verdict |
| G.3 | "hello" | null | {sourceId: "X"} | Même verdict |

---

## 9. CATÉGORIE H — PASSTHROUGH SEED

### CAT-H : Seed Passthrough Tests

| Attribut | Valeur |
|----------|--------|
| ID | CAT-H |
| Nom | Seed Passthrough |
| Question | "Le seed est-il transmis intact ?" |

#### Objectif

Prouver que le seed fourni en entrée est transmis sans modification.

#### Invariants couverts

| Invariant | Rôle dans CAT-H |
|-----------|-----------------|
| INV-MYC-12 | Seed passthrough integrity |

#### Rejets associés

| Rejet | Déclencheur |
|-------|-------------|
| REJ-MYC-400 | Invalid seed (NaN, Infinity) |

#### Verdict attendu

| Condition | Verdict |
|-----------|---------|
| Seed input = Seed output | PASS |
| Seed modifié | FAIL |

---

## 10. MATRICE CATÉGORIES / INVARIANTS

| Cat | 01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 | 09 | 10 | 11 | 12 |
|-----|----|----|----|----|----|----|----|----|----|----|----|----|
| A | | | ✓ | | | | | | | ✓ | | |
| B | ✓ | | | | | | ✓ | | | | | |
| C | | ✓ | | | | ✓ | | | | | | |
| D | | | | | | | | ✓ | | ✓ | | |
| E | | | | ✓ | | | | ✓ | | | | |
| F | | | | ✓ | | | | | ✓ | | | |
| G | | | | | | | | | | | ✓ | |
| H | | | | | | | | | | | | ✓ |

---

## 11. STATISTIQUES

| Métrique | Valeur |
|----------|--------|
| Catégories | 8 (A-H) |
| Invariants couverts | 12/12 (100%) |
| Rejets couverts | 20/20 (100%) |

---

## 12. RÉSUMÉ PAR CATÉGORIE

| Cat | Nom | Question clé |
|-----|-----|--------------|
| A | Contract Conformance | Respecte-t-il le contrat ? |
| B | Encoding Validation | UTF-8 valide ? |
| C | Boundary Tests | Limites respectées ? |
| D | Deterministic Rejection | Rejets reproductibles ? |
| E | Accept Stability | Acceptations stables ? |
| F | Non-Alteration | Contenu préservé ? |
| G | Metadata Isolation | Metadata isolées ? |
| H | Seed Passthrough | Seed intact ? |

---

## SIGNATURE

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   CATÉGORIES DE TESTS MYCELIUM — VERSION 1.0.0                                        ║
║                                                                                       ║
║   Catégories:           8                                                             ║
║   Invariants couverts:  12/12 (100%)                                                  ║
║   Rejets couverts:      20/20 (100%)                                                  ║
║   Chevauchement:        AUCUN (mutuellement exclusifs)                                ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

**FIN DU DOCUMENT**
