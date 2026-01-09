# MYCELIUM_INVARIANTS.md
## Sprint 29.0 — Invariants du Module Mycelium

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   DOCUMENT:     MYCELIUM_INVARIANTS.md                                                ║
║   TYPE:         REGISTRE D'INVARIANTS                                                 ║
║   VERSION:      1.0.0                                                                 ║
║   DATE:         2026-01-07                                                            ║
║   STANDARD:     NASA-Grade L4 / OMEGA                                                 ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 1. RÔLE DE MYCELIUM

Mycelium est le **gardien de la frontière** entre le monde extérieur (données brutes, sales, hétérogènes) et le monde intérieur (Genome, déterministe, certifié).

**Responsabilités** :
- Validation des entrées
- Normalisation des formats
- Rejet des données non conformes
- Garantie de déterminisme pour la suite du pipeline

---

## 2. REGISTRE DES INVARIANTS

### INV-MYC-01 — UTF-8 Strict Validation

| Attribut | Valeur |
|----------|--------|
| ID | INV-MYC-01 |
| Nom | UTF-8 Strict Validation |
| Criticité | CRITICAL |
| Catégorie | PURE |

**Énoncé** : Toute entrée contenant des séquences UTF-8 invalides DOIT être rejetée sans traitement.

**Risque mitigé** : R1 — Injection UTF-8 malformé pouvant causer un comportement indéterministe dans l'analyse.

**Preuve requise** : Test avec séquences 0x80-0xFF isolées, overlong encodings, surrogate pairs.

---

### INV-MYC-02 — Size Bound Enforcement

| Attribut | Valeur |
|----------|--------|
| ID | INV-MYC-02 |
| Nom | Size Bound Enforcement |
| Criticité | CRITICAL |
| Catégorie | PURE |

**Énoncé** : Toute entrée dépassant MAX_LENGTH (10 MB) DOIT être rejetée avant lecture complète.

**Risque mitigé** : R2 — Attaque DoS par consommation mémoire/CPU.

**Preuve requise** : Test avec fichier 10MB+1 byte → rejet immédiat, pas d'allocation mémoire complète.

---

### INV-MYC-03 — No Validation Bypass

| Attribut | Valeur |
|----------|--------|
| ID | INV-MYC-03 |
| Nom | No Validation Bypass |
| Criticité | CRITICAL |
| Catégorie | PURE |

**Énoncé** : Aucun paramètre, flag ou configuration ne peut désactiver la validation d'entrée.

**Risque mitigé** : R3 — Contournement des invariants par option cachée.

**Preuve requise** : Audit du code — aucun chemin d'exécution ne skip la validation.

---

### INV-MYC-04 — Line Ending Normalization

| Attribut | Valeur |
|----------|--------|
| ID | INV-MYC-04 |
| Nom | Line Ending Normalization |
| Criticité | HIGH |
| Catégorie | PURE |

**Énoncé** : Tous les line endings (CRLF, CR, LF) DOIVENT être normalisés en LF (\n) avant traitement.

**Risque mitigé** : R4 — Non-déterminisme dû à line endings variants.

**Preuve requise** : Test avec même texte en CRLF/CR/LF → même hash de sortie.

---

### INV-MYC-05 — Binary Detection Guard

| Attribut | Valeur |
|----------|--------|
| ID | INV-MYC-05 |
| Nom | Binary Detection Guard |
| Criticité | HIGH |
| Catégorie | PURE |

**Énoncé** : Tout fichier contenant des null bytes (0x00) ou des magic bytes binaires connus DOIT être rejeté.

**Risque mitigé** : R5 — Fichier binaire déguisé en texte.

**Preuve requise** : Test avec fichier PNG/PDF/ZIP renommé en .txt → rejet.

---

### INV-MYC-06 — Empty Input Rejection

| Attribut | Valeur |
|----------|--------|
| ID | INV-MYC-06 |
| Nom | Empty Input Rejection |
| Criticité | MEDIUM |
| Catégorie | PURE |

**Énoncé** : Une entrée vide (string vide ou whitespace-only) DOIT être rejetée.

**Risque mitigé** : Analyse sur contenu vide → résultat indéfini.

**Preuve requise** : Test avec "", " ", "\n\n" → rejet.

---

### INV-MYC-07 — Control Character Rejection

| Attribut | Valeur |
|----------|--------|
| ID | INV-MYC-07 |
| Nom | Control Character Rejection |
| Criticité | HIGH |
| Catégorie | PURE |

**Énoncé** : Les caractères de contrôle (0x00-0x1F sauf 0x09, 0x0A, 0x0D) DOIVENT provoquer un rejet.

**Risque mitigé** : Caractères invisibles pouvant polluer l'analyse.

**Preuve requise** : Test avec 0x01, 0x07, 0x1B → rejet.

---

### INV-MYC-08 — Deterministic Output

| Attribut | Valeur |
|----------|--------|
| ID | INV-MYC-08 |
| Nom | Deterministic Output |
| Criticité | CRITICAL |
| Catégorie | PURE |

**Énoncé** : Pour une entrée identique, Mycelium DOIT produire une sortie byte-identical.

**Risque mitigé** : Non-déterminisme propagé à Genome.

**Preuve requise** : 100 exécutions avec même input → même output (byte-compare).

---

### INV-MYC-09 — No Silent Modification

| Attribut | Valeur |
|----------|--------|
| ID | INV-MYC-09 |
| Nom | No Silent Modification |
| Criticité | HIGH |
| Catégorie | PURE |

**Énoncé** : Mycelium NE DOIT PAS modifier silencieusement le contenu (trim, strip, etc.) sauf normalisation LF documentée.

**Risque mitigé** : Perte d'information sans traçabilité.

**Preuve requise** : Leading/trailing spaces conservés après passage Mycelium.

---

### INV-MYC-10 — Rejection Is Terminal

| Attribut | Valeur |
|----------|--------|
| ID | INV-MYC-10 |
| Nom | Rejection Is Terminal |
| Criticité | CRITICAL |
| Catégorie | PURE |

**Énoncé** : Un rejet Mycelium est FINAL. Aucune donnée partielle ne passe vers Genome.

**Risque mitigé** : Données partiellement valides contaminant le pipeline.

**Preuve requise** : Après rejet, aucun appel à Genome.analyze().

---

### INV-MYC-11 — Metadata Isolation

| Attribut | Valeur |
|----------|--------|
| ID | INV-MYC-11 |
| Nom | Metadata Isolation |
| Criticité | HIGH |
| Catégorie | PURE |

**Énoncé** : Les métadonnées d'entrée (sourceId, timestamp) NE DOIVENT PAS affecter le hash de sortie.

**Risque mitigé** : Métadonnées polluant le fingerprint.

**Preuve requise** : Même contenu avec metadata différents → même hash Genome.

---

### INV-MYC-12 — Seed Passthrough Integrity

| Attribut | Valeur |
|----------|--------|
| ID | INV-MYC-12 |
| Nom | Seed Passthrough Integrity |
| Criticité | HIGH |
| Catégorie | PURE |

**Énoncé** : Le seed fourni DOIT être transmis intact à Genome sans modification.

**Risque mitigé** : Seed altéré → résultat indéterministe.

**Preuve requise** : seed=12345 en entrée → seed=12345 reçu par Genome.

---

## 3. MATRICE INVARIANTS / RISQUES

| Invariant | R1 | R2 | R3 | R4 | R5 |
|-----------|----|----|----|----|-----|
| INV-MYC-01 | ✓ | | | | |
| INV-MYC-02 | | ✓ | | | |
| INV-MYC-03 | | | ✓ | | |
| INV-MYC-04 | | | | ✓ | |
| INV-MYC-05 | | | | | ✓ |
| INV-MYC-06 | ✓ | | | | |
| INV-MYC-07 | ✓ | | | | |
| INV-MYC-08 | | | | ✓ | |
| INV-MYC-09 | | | | ✓ | |
| INV-MYC-10 | | | ✓ | | |
| INV-MYC-11 | | | | ✓ | |
| INV-MYC-12 | | | | ✓ | |

---

## 4. RÉPARTITION PAR CRITICITÉ

| Criticité | Invariants | Count |
|-----------|------------|-------|
| CRITICAL | INV-MYC-01, 02, 03, 08, 10 | 5 |
| HIGH | INV-MYC-04, 05, 07, 09, 11, 12 | 6 |
| MEDIUM | INV-MYC-06 | 1 |

**Total** : 12 invariants

---

## 5. DÉPENDANCES

| Invariant | Dépend de |
|-----------|-----------|
| INV-MYC-08 | INV-MYC-04 (normalisation requise pour déterminisme) |
| INV-MYC-10 | INV-MYC-01 à 07 (rejet déclenché par validation) |
| INV-MYC-11 | INV-GEN-11 (Genome metadata exclusion) |

---

## SIGNATURE

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   REGISTRE INVARIANTS MYCELIUM — VERSION 1.0.0                                        ║
║                                                                                       ║
║   Invariants:    12                                                                   ║
║   CRITICAL:      5                                                                    ║
║   HIGH:          6                                                                    ║
║   MEDIUM:        1                                                                    ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

**FIN DU DOCUMENT**
