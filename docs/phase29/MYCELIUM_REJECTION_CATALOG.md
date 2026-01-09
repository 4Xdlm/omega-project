# MYCELIUM_REJECTION_CATALOG.md
## Sprint 29.0 — Catalogue des Rejets Mycelium

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   DOCUMENT:     MYCELIUM_REJECTION_CATALOG.md                                         ║
║   TYPE:         CATALOGUE TECHNIQUE                                                   ║
║   VERSION:      1.0.0                                                                 ║
║   DATE:         2026-01-07                                                            ║
║   STANDARD:     NASA-Grade L4 / OMEGA                                                 ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 1. PRINCIPES DE REJET

### 1.1 Règle Fondamentale

```
TOUT REJET EST DÉTERMINISTE.
Même entrée → Même décision (ACCEPT ou REJECT) → Même code.
```

### 1.2 Caractéristiques d'un Rejet

| Attribut | Description |
|----------|-------------|
| Terminal | Aucune donnée ne passe après rejet |
| Immédiat | Dès détection, pas de traitement supplémentaire |
| Documenté | Code + message explicite |
| Auditable | Log avec contexte |

---

## 2. CODES DE REJET

### 2.1 Format

```
REJ-MYC-XXX

REJ = Rejection
MYC = Mycelium module
XXX = Numéro séquentiel (001-999)
```

### 2.2 Catégories

| Plage | Catégorie |
|-------|-----------|
| 001-099 | Format interdit |
| 100-199 | Encodage invalide |
| 200-299 | Taille/Limite |
| 300-399 | Contenu invalide |
| 400-499 | Paramètres invalides |
| 900-999 | Erreurs système |

---

## 3. REGISTRE DES REJETS

### REJ-MYC-001 — Format PDF

| Attribut | Valeur |
|----------|--------|
| Code | REJ-MYC-001 |
| Catégorie | Format interdit |
| Criticité | HARD |
| Invariant | INV-MYC-05 |

**Condition** : Fichier détecté comme PDF (magic bytes `%PDF`).

**Message** : `Rejected: PDF format not supported. Only plain text (UTF-8) accepted.`

**Action** : Rejet immédiat, aucun parsing tenté.

---

### REJ-MYC-002 — Format DOCX

| Attribut | Valeur |
|----------|--------|
| Code | REJ-MYC-002 |
| Catégorie | Format interdit |
| Criticité | HARD |
| Invariant | INV-MYC-05 |

**Condition** : Fichier détecté comme DOCX (magic bytes `PK` + structure Office).

**Message** : `Rejected: DOCX format not supported. Only plain text (UTF-8) accepted.`

**Action** : Rejet immédiat.

---

### REJ-MYC-003 — Format HTML

| Attribut | Valeur |
|----------|--------|
| Code | REJ-MYC-003 |
| Catégorie | Format interdit |
| Criticité | HARD |
| Invariant | INV-MYC-05 |

**Condition** : Contenu détecté comme HTML (`<!DOCTYPE`, `<html`, `<body`).

**Message** : `Rejected: HTML format not supported. Strip markup before submission.`

**Action** : Rejet immédiat.

---

### REJ-MYC-004 — Format JSON

| Attribut | Valeur |
|----------|--------|
| Code | REJ-MYC-004 |
| Catégorie | Format interdit |
| Criticité | HARD |
| Invariant | INV-MYC-05 |

**Condition** : Contenu est un JSON valide (commence par `{` ou `[`, parse réussit).

**Message** : `Rejected: JSON format not supported. Extract narrative text first.`

**Action** : Rejet immédiat.

---

### REJ-MYC-005 — Format XML

| Attribut | Valeur |
|----------|--------|
| Code | REJ-MYC-005 |
| Catégorie | Format interdit |
| Criticité | HARD |
| Invariant | INV-MYC-05 |

**Condition** : Contenu détecté comme XML (`<?xml`, `<root>`).

**Message** : `Rejected: XML format not supported. Extract text content first.`

**Action** : Rejet immédiat.

---

### REJ-MYC-006 — Format Image

| Attribut | Valeur |
|----------|--------|
| Code | REJ-MYC-006 |
| Catégorie | Format interdit |
| Criticité | HARD |
| Invariant | INV-MYC-05 |

**Condition** : Magic bytes image (PNG, JPEG, GIF, WebP, BMP).

**Message** : `Rejected: Image format not supported. Text only.`

**Action** : Rejet immédiat.

---

### REJ-MYC-007 — Format Audio

| Attribut | Valeur |
|----------|--------|
| Code | REJ-MYC-007 |
| Catégorie | Format interdit |
| Criticité | HARD |
| Invariant | INV-MYC-05 |

**Condition** : Magic bytes audio (MP3, WAV, OGG, FLAC).

**Message** : `Rejected: Audio format not supported. Text only.`

**Action** : Rejet immédiat.

---

### REJ-MYC-008 — Format Binaire Générique

| Attribut | Valeur |
|----------|--------|
| Code | REJ-MYC-008 |
| Catégorie | Format interdit |
| Criticité | HARD |
| Invariant | INV-MYC-05 |

**Condition** : Null bytes (0x00) détectés dans le contenu.

**Message** : `Rejected: Binary content detected. Text only.`

**Action** : Rejet immédiat.

---

### REJ-MYC-100 — UTF-8 Invalid Sequence

| Attribut | Valeur |
|----------|--------|
| Code | REJ-MYC-100 |
| Catégorie | Encodage invalide |
| Criticité | HARD |
| Invariant | INV-MYC-01 |

**Condition** : Séquence de bytes ne formant pas un caractère UTF-8 valide.

**Message** : `Rejected: Invalid UTF-8 sequence at byte offset {offset}.`

**Action** : Rejet immédiat, position de l'erreur fournie.

---

### REJ-MYC-101 — UTF-8 Overlong Encoding

| Attribut | Valeur |
|----------|--------|
| Code | REJ-MYC-101 |
| Catégorie | Encodage invalide |
| Criticité | HARD |
| Invariant | INV-MYC-01 |

**Condition** : Caractère encodé avec plus de bytes que nécessaire.

**Message** : `Rejected: Overlong UTF-8 encoding detected.`

**Action** : Rejet immédiat.

---

### REJ-MYC-102 — UTF-8 Surrogate Pair

| Attribut | Valeur |
|----------|--------|
| Code | REJ-MYC-102 |
| Catégorie | Encodage invalide |
| Criticité | HARD |
| Invariant | INV-MYC-01 |

**Condition** : Codepoints U+D800 à U+DFFF (surrogates).

**Message** : `Rejected: UTF-8 surrogate pair not allowed.`

**Action** : Rejet immédiat.

---

### REJ-MYC-103 — BOM Detected

| Attribut | Valeur |
|----------|--------|
| Code | REJ-MYC-103 |
| Catégorie | Encodage invalide |
| Criticité | HARD |
| Invariant | INV-MYC-01, INV-MYC-09 |

**Condition** : Byte Order Mark (EF BB BF) en début de fichier.

**Message** : `Rejected: UTF-8 BOM not allowed. Remove BOM and resubmit.`

**Action** : Rejet immédiat (pas de strip silencieux).

---

### REJ-MYC-200 — Size Exceeded

| Attribut | Valeur |
|----------|--------|
| Code | REJ-MYC-200 |
| Catégorie | Taille/Limite |
| Criticité | HARD |
| Invariant | INV-MYC-02 |

**Condition** : Taille > MAX_LENGTH (10 MB).

**Message** : `Rejected: Input size {size} exceeds maximum {MAX_LENGTH}.`

**Action** : Rejet avant lecture complète.

---

### REJ-MYC-201 — Line Too Long

| Attribut | Valeur |
|----------|--------|
| Code | REJ-MYC-201 |
| Catégorie | Taille/Limite |
| Criticité | HARD |
| Invariant | INV-MYC-02 |

**Condition** : Une ligne dépasse MAX_LINE_LENGTH (1 MB).

**Message** : `Rejected: Line {lineNumber} exceeds maximum length.`

**Action** : Rejet immédiat.

---

### REJ-MYC-202 — Too Many Segments

| Attribut | Valeur |
|----------|--------|
| Code | REJ-MYC-202 |
| Catégorie | Taille/Limite |
| Criticité | HARD |
| Invariant | INV-MYC-02 |

**Condition** : Nombre de segments > MAX_SEGMENTS (100,000).

**Message** : `Rejected: Segment count {count} exceeds maximum {MAX_SEGMENTS}.`

**Action** : Rejet immédiat.

---

### REJ-MYC-300 — Empty Input

| Attribut | Valeur |
|----------|--------|
| Code | REJ-MYC-300 |
| Catégorie | Contenu invalide |
| Criticité | HARD |
| Invariant | INV-MYC-06 |

**Condition** : Entrée vide ou whitespace-only.

**Message** : `Rejected: Empty or whitespace-only input.`

**Action** : Rejet immédiat.

---

### REJ-MYC-301 — Control Character

| Attribut | Valeur |
|----------|--------|
| Code | REJ-MYC-301 |
| Catégorie | Contenu invalide |
| Criticité | HARD |
| Invariant | INV-MYC-07 |

**Condition** : Caractère de contrôle (0x00-0x1F sauf tab/LF/CR).

**Message** : `Rejected: Invalid control character 0x{hex} at offset {offset}.`

**Action** : Rejet immédiat.

---

### REJ-MYC-400 — Invalid Seed

| Attribut | Valeur |
|----------|--------|
| Code | REJ-MYC-400 |
| Catégorie | Paramètres invalides |
| Criticité | HARD |
| Invariant | INV-MYC-12 |

**Condition** : Seed non-numérique, NaN, ou Infinity.

**Message** : `Rejected: Invalid seed value. Must be finite number.`

**Action** : Rejet immédiat.

---

### REJ-MYC-401 — Invalid Mode

| Attribut | Valeur |
|----------|--------|
| Code | REJ-MYC-401 |
| Catégorie | Paramètres invalides |
| Criticité | HARD |
| Invariant | INV-MYC-03 |

**Condition** : Mode non reconnu (ni 'paragraph' ni 'sentence').

**Message** : `Rejected: Invalid mode '{mode}'. Use 'paragraph' or 'sentence'.`

**Action** : Rejet immédiat.

---

### REJ-MYC-900 — System Error

| Attribut | Valeur |
|----------|--------|
| Code | REJ-MYC-900 |
| Catégorie | Erreurs système |
| Criticité | HARD |
| Invariant | INV-MYC-10 |

**Condition** : Erreur système inattendue pendant validation.

**Message** : `Rejected: System error during validation. Contact support.`

**Action** : Rejet, erreur loggée pour investigation.

---

## 4. MATRICE REJETS / INVARIANTS

| Rejet | INV-MYC-01 | 02 | 03 | 05 | 06 | 07 | 09 | 10 | 12 |
|-------|------------|----|----|----|----|----|----|----|----|
| REJ-MYC-001-008 | | | | ✓ | | | | ✓ | |
| REJ-MYC-100-103 | ✓ | | | | | | ✓ | ✓ | |
| REJ-MYC-200-202 | | ✓ | | | | | | ✓ | |
| REJ-MYC-300 | | | | | ✓ | | | ✓ | |
| REJ-MYC-301 | | | | | | ✓ | | ✓ | |
| REJ-MYC-400-401 | | | ✓ | | | | | ✓ | ✓ |
| REJ-MYC-900 | | | | | | | | ✓ | |

---

## 5. STRUCTURE DE RÉPONSE REJET

```typescript
interface RejectionResponse {
  accepted: false;
  rejection: {
    code: string;          // REJ-MYC-XXX
    category: string;      // Format | Encoding | Size | Content | Params | System
    message: string;       // Human-readable
    details?: {
      offset?: number;     // Position de l'erreur si applicable
      expected?: string;   // Ce qui était attendu
      received?: string;   // Ce qui a été reçu
    };
    timestamp: string;     // ISO8601
  };
}
```

---

## 6. STATISTIQUES

| Catégorie | Count |
|-----------|-------|
| Format interdit | 8 |
| Encodage invalide | 4 |
| Taille/Limite | 3 |
| Contenu invalide | 2 |
| Paramètres invalides | 2 |
| Erreurs système | 1 |
| **TOTAL** | **20** |

---

## SIGNATURE

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   CATALOGUE REJETS MYCELIUM — VERSION 1.0.0                                           ║
║                                                                                       ║
║   Codes de rejet:    20                                                               ║
║   Criticité:         ALL HARD (déterministe)                                          ║
║   Soft reject:       INTERDIT                                                         ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

**FIN DU DOCUMENT**
