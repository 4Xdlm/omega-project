# BOUNDARY_MYCELIUM_GENOME.md
## Sprint 29.0 — Frontière Formelle Mycelium → Genome

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   DOCUMENT:     BOUNDARY_MYCELIUM_GENOME.md                                           ║
║   TYPE:         CONTRAT D'INTERFACE                                                   ║
║   VERSION:      1.0.0                                                                 ║
║   DATE:         2026-01-07                                                            ║
║   STANDARD:     NASA-Grade L4 / OMEGA                                                 ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 1. OBJECTIF

Ce document définit la **frontière formelle** entre Mycelium (gardien d'entrée) et Genome (moteur d'analyse certifié). Cette frontière est le point de passage obligatoire pour toute donnée entrant dans OMEGA.

---

## 2. ARCHITECTURE DE LA FRONTIÈRE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MONDE EXTÉRIEUR                                   │
│                    (données brutes, hétérogènes, non fiables)               │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MYCELIUM                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  VALIDATE   │→ │  NORMALIZE  │→ │   CHECK     │→ │   EMIT      │        │
│  │  Format     │  │  Encoding   │  │   Limits    │  │   or REJECT │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                            │                │
│                                                    ┌───────┴───────┐        │
│                                                    │               │        │
│                                                ACCEPT           REJECT      │
│                                                    │               │        │
└────────────────────────────────────────────────────┼───────────────┼────────┘
                                                     │               │
                                    ╔════════════════╧═══════════════╧════════╗
                                    ║         FRONTIÈRE FORMELLE              ║
                                    ║      (ce document la définit)           ║
                                    ╚════════════════╤═══════════════╤════════╝
                                                     │               │
                                                     ▼               ▼
┌────────────────────────────────────────────────────┐   ┌───────────────────┐
│                      GENOME                        │   │    AUDIT LOG      │
│           (analyse déterministe certifiée)         │   │   (rejet tracé)   │
│                                                    │   │                   │
│  • INV-GEN-01 à INV-GEN-14 garantis               │   │  • Code rejet     │
│  • Fingerprint SHA-256 déterministe               │   │  • Timestamp      │
│  • Emotion14 sanctuarisé                          │   │  • Contexte       │
│                                                    │   │                   │
└────────────────────────────────────────────────────┘   └───────────────────┘
```

---

## 3. CE QUE MYCELIUM GARANTIT À GENOME

### 3.1 Garanties de Type

| Garantie | Description | Invariant source |
|----------|-------------|------------------|
| G-TYPE-01 | Entrée est une `string` | Type system |
| G-TYPE-02 | Encodage UTF-8 valide | INV-MYC-01 |
| G-TYPE-03 | Pas de null bytes | INV-MYC-05 |

### 3.2 Garanties de Format

| Garantie | Description | Invariant source |
|----------|-------------|------------------|
| G-FMT-01 | Line endings normalisés (LF) | INV-MYC-04 |
| G-FMT-02 | Pas de caractères de contrôle interdits | INV-MYC-07 |
| G-FMT-03 | Contenu non-vide | INV-MYC-06 |

### 3.3 Garanties de Limites

| Garantie | Description | Invariant source |
|----------|-------------|------------------|
| G-LIM-01 | Taille ≤ 10 MB | INV-MYC-02 |
| G-LIM-02 | Lignes ≤ 1 MB | INV-MYC-02 |
| G-LIM-03 | Segments ≤ 100,000 | INV-MYC-02 |

### 3.4 Garanties de Déterminisme

| Garantie | Description | Invariant source |
|----------|-------------|------------------|
| G-DET-01 | Même entrée → même sortie Mycelium | INV-MYC-08 |
| G-DET-02 | Seed transmis intact | INV-MYC-12 |
| G-DET-03 | Metadata isolées du hash | INV-MYC-11 |

---

## 4. CE QUE GENOME ATTEND DE MYCELIUM

### 4.1 Pré-conditions Genome.analyze()

```typescript
// CONTRAT D'APPEL GENOME
function analyze(input: GenomeInput): GenomeOutput {
  // PRÉ-CONDITIONS (garanties par Mycelium)
  assert(typeof input.content === 'string');
  assert(isValidUTF8(input.content));
  assert(input.content.length > 0);
  assert(input.content.length <= 10_000_000);
  assert(!containsNullBytes(input.content));
  assert(!containsForbiddenControlChars(input.content));
  assert(typeof input.seed === 'number');
  assert(Number.isFinite(input.seed));
  
  // ... analyse
}
```

### 4.2 Format d'Entrée Attendu

```typescript
interface GenomeInput {
  // GARANTI PAR MYCELIUM
  content: string;         // UTF-8 valide, non-vide, ≤10MB
  seed: number;            // Nombre fini, défaut 42
  mode: 'paragraph' | 'sentence';
  
  // OPTIONNEL (non utilisé par Genome pour le hash)
  meta?: {
    sourceId?: string;
    processedAt?: string;
  };
}
```

---

## 5. CE QUE GENOME NE VÉRIFIE PAS

| Élément | Raison |
|---------|--------|
| Validité UTF-8 | Garantie par Mycelium (INV-MYC-01) |
| Taille limite | Garantie par Mycelium (INV-MYC-02) |
| Format binaire | Garantie par Mycelium (INV-MYC-05) |
| Contenu vide | Garantie par Mycelium (INV-MYC-06) |
| Caractères de contrôle | Garantie par Mycelium (INV-MYC-07) |

**Principe** : Genome fait confiance à Mycelium pour les validations d'entrée. Cette confiance est **conditionnelle** aux invariants INV-MYC-* prouvés.

---

## 6. RESPONSABILITÉS EXPLICITES

### 6.1 Responsabilité de Mycelium

| Responsabilité | Description |
|----------------|-------------|
| R-MYC-01 | Valider l'encodage UTF-8 |
| R-MYC-02 | Rejeter les formats interdits |
| R-MYC-03 | Enforcer les limites de taille |
| R-MYC-04 | Normaliser les line endings |
| R-MYC-05 | Transmettre le seed intact |
| R-MYC-06 | Isoler les métadonnées |
| R-MYC-07 | Logger les rejets |

### 6.2 Responsabilité de Genome

| Responsabilité | Description |
|----------------|-------------|
| R-GEN-01 | Analyser le contenu validé |
| R-GEN-02 | Produire un fingerprint déterministe |
| R-GEN-03 | Respecter le seed fourni |
| R-GEN-04 | Exclure les métadonnées du hash |
| R-GEN-05 | Garantir Emotion14 sanctuarisé |

### 6.3 Responsabilités NON PARTAGÉES

| Élément | Responsable unique |
|---------|-------------------|
| Validation UTF-8 | Mycelium SEUL |
| Fingerprint SHA-256 | Genome SEUL |
| Décision de rejet | Mycelium SEUL |
| Analyse émotionnelle | Genome SEUL |

---

## 7. FLUX DE DONNÉES

### 7.1 Cas Nominal (ACCEPT)

```
1. Mycelium reçoit DNAInput
2. Mycelium.validate() → PASS
3. Mycelium.normalize() → line endings LF
4. Mycelium.emit(GenomeInput)
5. Genome.analyze(GenomeInput)
6. Genome.fingerprint() → SHA-256
7. Return GenomeOutput
```

### 7.2 Cas Rejet (REJECT)

```
1. Mycelium reçoit DNAInput
2. Mycelium.validate() → FAIL (REJ-MYC-XXX)
3. Mycelium.reject(code, message)
4. Log rejection
5. Return RejectionResponse
6. [STOP - Genome jamais appelé]
```

---

## 8. INVARIANTS DE FRONTIÈRE

### INV-BOUND-01 — No Bypass

| Attribut | Valeur |
|----------|--------|
| ID | INV-BOUND-01 |
| Énoncé | Toute donnée atteignant Genome DOIT avoir passé Mycelium |
| Criticité | CRITICAL |

### INV-BOUND-02 — Single Entry Point

| Attribut | Valeur |
|----------|--------|
| ID | INV-BOUND-02 |
| Énoncé | Mycelium est le SEUL point d'entrée vers Genome |
| Criticité | CRITICAL |

### INV-BOUND-03 — Trust Boundary

| Attribut | Valeur |
|----------|--------|
| ID | INV-BOUND-03 |
| Énoncé | Genome fait confiance aux garanties Mycelium sans re-vérification |
| Criticité | HIGH |

### INV-BOUND-04 — Rejection Isolation

| Attribut | Valeur |
|----------|--------|
| ID | INV-BOUND-04 |
| Énoncé | Un rejet Mycelium ne déclenche AUCUN appel Genome |
| Criticité | CRITICAL |

---

## 9. LECTURE EN 5 MINUTES (RÉSUMÉ EXÉCUTIF)

### Pour un auditeur hostile :

1. **Mycelium** = gardien. Valide, normalise, rejette. Aucune analyse.

2. **Genome** = analyste. Fait confiance à Mycelium. Aucune validation d'entrée.

3. **Frontière** = point unique de passage. Pas de contournement possible.

4. **Rejet** = terminal. Genome n'est jamais appelé si Mycelium rejette.

5. **Garanties** = 12 INV-MYC-* prouvent que Mycelium fait son travail.

6. **Confiance** = conditionnelle. Si INV-MYC-* échouent, Genome est exposé.

---

## 10. QUESTIONS FRÉQUENTES

### Q1 : Pourquoi Genome ne valide-t-il pas lui-même ?

**R** : Séparation des responsabilités. Genome est certifié pour l'analyse, pas pour la validation. Doubler la validation créerait de la dette et des incohérences.

### Q2 : Que se passe-t-il si Mycelium a un bug ?

**R** : Les invariants INV-MYC-* sont testés. Un bug serait détecté par les tests. Si un bug passe, Genome pourrait recevoir des données invalides → comportement indéfini. C'est pourquoi les tests Mycelium sont CRITIQUES.

### Q3 : Peut-on appeler Genome directement ?

**R** : NON. INV-BOUND-01 et INV-BOUND-02 l'interdisent. L'architecture doit rendre cet appel impossible (encapsulation).

### Q4 : Qui loggue les rejets ?

**R** : Mycelium. Genome ne voit jamais les données rejetées.

---

## SIGNATURE

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   FRONTIÈRE MYCELIUM → GENOME — VERSION 1.0.0                                         ║
║                                                                                       ║
║   Garanties Mycelium:    12 (G-TYPE, G-FMT, G-LIM, G-DET)                              ║
║   Invariants frontière:  4 (INV-BOUND-01 à 04)                                        ║
║   Responsabilités:       7 Mycelium, 5 Genome                                         ║
║                                                                                       ║
║   Lisible par tiers hostile en 5 minutes: OUI                                         ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

**FIN DU DOCUMENT**
