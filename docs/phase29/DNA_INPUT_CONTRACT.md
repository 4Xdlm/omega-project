# DNA_INPUT_CONTRACT.md
## Sprint 29.0 — Contrat d'Entrée des Données

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   DOCUMENT:     DNA_INPUT_CONTRACT.md                                                 ║
║   TYPE:         CONTRAT TECHNIQUE                                                     ║
║   VERSION:      1.0.0                                                                 ║
║   DATE:         2026-01-07                                                            ║
║   STANDARD:     NASA-Grade L4 / OMEGA                                                 ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 1. OBJET DU CONTRAT

Ce document définit **exhaustivement** ce que le système OMEGA accepte en entrée via Mycelium. Tout ce qui n'est pas explicitement listé est **INTERDIT par défaut**.

---

## 2. TYPES D'ENTRÉE ACCEPTÉS

### 2.1 Type Principal : TEXTE BRUT

| Attribut | Valeur | Obligatoire |
|----------|--------|-------------|
| Format | `string` | OUI |
| Encodage | UTF-8 strict | OUI |
| BOM | Interdit | — |
| Longueur min | 1 caractère | OUI |
| Longueur max | 10 MB | OUI |
| Null bytes | Interdit | — |

### 2.2 Type Secondaire : FICHIER

| Attribut | Valeur | Obligatoire |
|----------|--------|-------------|
| Extension | `.txt`, `.md` | OUI |
| Encodage | UTF-8 strict | OUI |
| Taille max | 10 MB | OUI |
| Binaire | Interdit | — |

---

## 3. FORMATS INTERDITS (EXPLICITE)

| Format | Raison | Code Rejet |
|--------|--------|------------|
| PDF | Non-textuel, extraction non déterministe | REJ-MYC-001 |
| DOCX | Format binaire complexe | REJ-MYC-002 |
| HTML | Markup pollue l'analyse | REJ-MYC-003 |
| JSON | Structuré, pas du texte narratif | REJ-MYC-004 |
| XML | Structuré, pas du texte narratif | REJ-MYC-005 |
| Image | Non-textuel | REJ-MYC-006 |
| Audio | Non-textuel | REJ-MYC-007 |
| Binaire | Non-textuel | REJ-MYC-008 |

---

## 4. VALIDATION ENCODAGE

### 4.1 Règles UTF-8

| Règle | Description | Comportement |
|-------|-------------|--------------|
| Séquences invalides | Bytes non-UTF-8 | REJET |
| Caractères de contrôle | 0x00-0x1F (sauf \n \r \t) | REJET |
| Surrogate pairs | 0xD800-0xDFFF | REJET |
| Overlong encodings | Séquences plus longues que nécessaire | REJET |

### 4.2 Normalisation

| Élément | Action |
|---------|--------|
| Line endings | Normalisé en `\n` (LF) |
| Trailing whitespace | Conservé (fait partie du hash) |
| Leading BOM | REJET (pas de normalisation silencieuse) |

---

## 5. PARAMÈTRES D'ENTRÉE

### 5.1 Paramètres Obligatoires

| Paramètre | Type | Description |
|-----------|------|-------------|
| `content` | `string` | Texte à analyser |

### 5.2 Paramètres Optionnels

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `seed` | `number` | 42 | Graine pour déterminisme |
| `mode` | `'paragraph' \| 'sentence'` | `'paragraph'` | Mode de segmentation |

### 5.3 Paramètres Interdits

| Paramètre | Raison |
|-----------|--------|
| `skipValidation` | Contournerait les invariants |
| `forceAccept` | Contournerait les invariants |
| `unsafe*` | Tout paramètre préfixé `unsafe` |

---

## 6. LIMITES QUANTITATIVES

### 6.1 Taille

| Limite | Valeur | Justification |
|--------|--------|---------------|
| MIN_LENGTH | 1 char | Évite entrée vide |
| MAX_LENGTH | 10 MB | Performance + mémoire |
| MAX_SEGMENTS | 100,000 | Limite scaling |

### 6.2 Caractères

| Limite | Valeur | Justification |
|--------|--------|---------------|
| MAX_LINE_LENGTH | 1 MB | Évite DoS par ligne géante |
| MIN_SEGMENT_LENGTH | 1 char | Segment non-vide |

---

## 7. STRUCTURE D'ENTRÉE CANONIQUE

```typescript
interface DNAInput {
  // OBLIGATOIRE
  content: string;          // UTF-8 strict, 1B-10MB
  
  // OPTIONNEL (défauts appliqués si absent)
  seed?: number;            // Default: 42
  mode?: SegmentMode;       // Default: 'paragraph'
  
  // MÉTADONNÉES (non hashées, traçabilité)
  meta?: {
    sourceId?: string;      // ID source externe
    timestamp?: string;     // ISO8601
  };
}
```

---

## 8. CONTRAT DE SORTIE MYCELIUM

Après validation par Mycelium, le contrat garantit :

| Garantie | Description |
|----------|-------------|
| G1 | Contenu UTF-8 valide |
| G2 | Taille dans les limites |
| G3 | Aucun caractère interdit |
| G4 | Paramètres normalisés |
| G5 | Prêt pour Genome.analyze() |

---

## 9. NON-GARANTIES EXPLICITES

| Non-garantie | Description |
|--------------|-------------|
| NG1 | Qualité littéraire du texte |
| NG2 | Langue du texte |
| NG3 | Pertinence du contenu |
| NG4 | Absence de contenu offensant |
| NG5 | Cohérence narrative |

---

## 10. RISQUES IDENTIFIÉS

| ID | Risque | Mitigation | INV-MYC |
|----|--------|------------|---------|
| R1 | Injection UTF-8 malformé | Validation stricte | INV-MYC-01 |
| R2 | DoS par taille | Limite 10MB | INV-MYC-02 |
| R3 | Bypass validation | Pas de paramètre skip | INV-MYC-03 |
| R4 | Non-déterminisme encodage | Normalisation LF | INV-MYC-04 |
| R5 | Format binaire déguisé | Détection magic bytes | INV-MYC-05 |

---

## 11. VERSIONING DU CONTRAT

| Version | Date | Changement |
|---------|------|------------|
| 1.0.0 | 2026-01-07 | Version initiale |

---

## SIGNATURE

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   CONTRAT D'ENTRÉE DNA — VERSION 1.0.0                                                ║
║                                                                                       ║
║   Ce qui n'est pas explicitement autorisé est INTERDIT.                               ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

**FIN DU DOCUMENT**
