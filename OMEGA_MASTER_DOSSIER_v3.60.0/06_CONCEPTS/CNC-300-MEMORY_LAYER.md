# ═══════════════════════════════════════════════════════════════════════════════════════
#
#   ███╗   ███╗███████╗███╗   ███╗ ██████╗ ██████╗ ██╗   ██╗    ██╗      █████╗ ██╗   ██╗███████╗██████╗ 
#   ████╗ ████║██╔════╝████╗ ████║██╔═══██╗██╔══██╗╚██╗ ██╔╝    ██║     ██╔══██╗╚██╗ ██╔╝██╔════╝██╔══██╗
#   ██╔████╔██║█████╗  ██╔████╔██║██║   ██║██████╔╝ ╚████╔╝     ██║     ███████║ ╚████╔╝ █████╗  ██████╔╝
#   ██║╚██╔╝██║██╔══╝  ██║╚██╔╝██║██║   ██║██╔══██╗  ╚██╔╝      ██║     ██╔══██║  ╚██╔╝  ██╔══╝  ██╔══██╗
#   ██║ ╚═╝ ██║███████╗██║ ╚═╝ ██║╚██████╔╝██║  ██║   ██║       ███████╗██║  ██║   ██║   ███████╗██║  ██║
#   ╚═╝     ╚═╝╚══════╝╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝       ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝
#
#   OMEGA — CNC-300 — MEMORY_LAYER
#   Phase 8A — Spécification Conceptuelle
#   Standard: NASA-Grade AS9100D / DO-178C Level A
#
# ═══════════════════════════════════════════════════════════════════════════════════════

---

## 1. IDENTIFICATION

| Attribut | Valeur |
|----------|--------|
| **Document ID** | CNC-300 |
| **Nom** | MEMORY_LAYER |
| **Type** | Concept Parent (Phase 8) |
| **Statut** | 🟢 READY_FOR_IMPL |
| **Version Spec** | 1.0.1 |
| **Date** | 2026-01-03 |
| **Auteur** | Claude OPUS 4.5 (IA Principal) |
| **Autorité** | Francky (Architecte Suprême) |
| **Standard** | NASA-Grade L4 / OUTP v2.0.0 |
| **Phase** | 8A — Spécification uniquement |

### 1.1 Historique des versions

| Version | Date | Changements |
|---------|------|-------------|
| 1.0.0-DRAFT | 2026-01-03 | Version initiale |
| **1.0.1** | **2026-01-03** | **NCR-01/02/03 corrigées** |

### 1.2 NCR Résolues

| NCR | Description | Résolution |
|-----|-------------|------------|
| NCR-01 | Champs mutables dans MemoryEntry | Entrées 100% immutables + événements séparés |
| NCR-02 | Hash non déterministe | CANONICAL_ENCODE défini + chain_hash par key |
| NCR-03 | INV-MEM-07 tautologique | Déterminisme via snapshot_id/version |

---

## 2. DÉCLARATION ONTOLOGIQUE

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   "La MEMORY ne pense pas. Elle ne décide pas. Elle ne juge pas.                      ║
║    Elle se souvient. Point."                                                          ║
║                                                                                       ║
║   La MEMORY_LAYER est le GARDIEN PASSIF du réel validé.                               ║
║   Elle conserve ce que les GATES ont approuvé.                                        ║
║   Elle n'a aucune autorité sur le contenu — seulement sur la conservation.            ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 3. POSITION DANS L'ARCHITECTURE

### 3.1 Chaîne de Souveraineté

```
   ┌─────────────────────────────────────┐
   │         CANON_ENGINE                │  ← SOUVERAIN (définit)
   │           CNC-201                   │
   └──────────────┬──────────────────────┘
                  │
                  ▼
   ┌─────────────────────────────────────┐
   │          TRUTH_GATE                 │  ← SOUVERAIN (juge)
   │           CNC-200                   │
   └──────────────┬──────────────────────┘
                  │
                  ▼
   ┌─────────────────────────────────────┐
   │         EMOTION_GATE                │  ← SOUMISE (qualifie)
   │           CNC-202                   │
   └──────────────┬──────────────────────┘
                  │
                  ▼
   ┌─────────────────────────────────────┐
   │        RIPPLE_ENGINE                │  ← PROPAGATEUR (déclenche)
   │           CNC-203                   │
   └──────────────┬──────────────────────┘
                  │
                  │ SEUL autorisé à écrire
                  ▼
   ┌─────────────────────────────────────┐
   │        MEMORY_LAYER                 │  ← GARDIEN (conserve)
   │           CNC-300                   │
   │                                     │
   │  • Ne crée jamais                   │
   │  • Ne modifie jamais                │
   │  • Ne décide jamais                 │
   │  • Conserve TOUJOURS                │
   └─────────────────────────────────────┘
```

### 3.2 Règle d'Écriture Unique

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   RÈGLE CARDINALE : SEUL RIPPLE_ENGINE PEUT DÉCLENCHER UNE ÉCRITURE MEMORY            ║
║                                                                                       ║
║   • CANON     → n'écrit PAS en MEMORY (il définit le réel)                            ║
║   • TRUTH     → n'écrit PAS en MEMORY (il juge le réel)                               ║
║   • EMOTION   → n'écrit PAS en MEMORY (il qualifie le réel)                           ║
║   • RIPPLE    → SEUL autorisé à déclencher une écriture                               ║
║   • MEMORY    → n'écrit JAMAIS seule                                                  ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 4. SOUS-CONCEPTS INTÉGRÉS

La MEMORY_LAYER (CNC-300) est le **concept parent** qui gouverne les sous-concepts suivants :

```
CNC-300 (MEMORY_LAYER)
 │
 ├─── CNC-053 (MEMORY_HYBRID)
 │         └── Gestion hybride court/long terme
 │
 ├─── CNC-054 (MEMORY_TIERING)
 │         └── Stratification des niveaux de mémoire
 │
 ├─── CNC-055 (MEMORY_DIGEST)
 │         └── Résumés et condensation contextuelle
 │
 └─── CNC-075 (MEMORY_DECAY)
           └── Dégradation temporelle contrôlée
```

### 4.1 CNC-053 — MEMORY_HYBRID

| Attribut | Valeur |
|----------|--------|
| **Parent** | CNC-300 |
| **Rôle** | Gérer la cohabitation mémoire courte / mémoire longue |
| **Principe** | Les faits récents sont en accès rapide, les anciens en archive |
| **Invariant lié** | INV-MEM-03 |

### 4.2 CNC-054 — MEMORY_TIERING

| Attribut | Valeur |
|----------|--------|
| **Parent** | CNC-300 |
| **Rôle** | Organiser la mémoire en niveaux (hot / warm / cold) |
| **Principe** | Promotion/demotion via événements append-only |
| **Invariant lié** | INV-MEM-04 |

### 4.3 CNC-055 — MEMORY_DIGEST

| Attribut | Valeur |
|----------|--------|
| **Parent** | CNC-300 |
| **Rôle** | Produire des résumés condensés du contexte |
| **Principe** | Compression sans perte sémantique |
| **Invariant lié** | INV-MEM-05 |

### 4.4 CNC-075 — MEMORY_DECAY

| Attribut | Valeur |
|----------|--------|
| **Parent** | CNC-300 |
| **Rôle** | Gérer l'oubli contrôlé des faits périmés |
| **Principe** | Dégradation progressive via événements, jamais de suppression |
| **Invariant lié** | INV-MEM-06 |
| **Contrainte** | MEMORY_DECAY émet un événement DECAY_MARKED, ne supprime JAMAIS |

---

## 5. PRINCIPES NON NÉGOCIABLES

### 5.1 Les 7 Commandements de la MEMORY

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   LES 7 COMMANDEMENTS DE LA MEMORY_LAYER                                              ║
║                                                                                       ║
║   1. APPEND-ONLY ABSOLU                                                               ║
║      → Aucun overwrite. Aucun delete. AUCUN champ mutable.                            ║
║      → Une entrée écrite est FIGÉE pour l'éternité.                                   ║
║                                                                                       ║
║   2. VERSIONNEMENT EXPLICITE                                                          ║
║      → Chaque écriture crée une nouvelle entrée.                                      ║
║      → L'historique est intégralement conservé.                                       ║
║                                                                                       ║
║   3. INDEXATION PAR LE CANON                                                          ║
║      → Toute entrée mémoire est indexée par une clé canonique.                        ║
║      → Pas de clé "libre" ou implicite.                                               ║
║                                                                                       ║
║   4. TRAÇABILITÉ COMPLÈTE                                                             ║
║      → Qui a écrit (source)                                                           ║
║      → Quand (timestamp_utc fourni par RIPPLE)                                        ║
║      → Quand ingéré (ingested_at_utc généré par MEMORY)                               ║
║      → Pourquoi (event_type)                                                          ║
║      → Depuis quel état (previous_entry_id)                                           ║
║      → Hash de vérification (CANONICAL_ENCODE)                                        ║
║                                                                                       ║
║   5. LECTURE SANS MUTATION                                                            ║
║      → Toute lecture ne modifie rien.                                                 ║
║      → Toute lecture est déterministe via snapshot_id ou version.                     ║
║                                                                                       ║
║   6. SOUMISSION AU CANON                                                              ║
║      → La MEMORY ne contredit JAMAIS le CANON.                                        ║
║      → Elle conserve ce qui a été validé.                                             ║
║                                                                                       ║
║   7. PASSIVITÉ ABSOLUE                                                                ║
║      → La MEMORY ne décide pas.                                                       ║
║      → La MEMORY ne crée pas.                                                         ║
║      → La MEMORY ne juge pas.                                                         ║
║      → La MEMORY conserve. Point.                                                     ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 6. MODÈLE DE DONNÉES CONCEPTUEL

### 6.1 Structure d'une Entrée Mémoire (100% IMMUTABLE)

```typescript
// MODÈLE CONCEPTUEL — PAS UNE IMPLÉMENTATION
// ⚠️ NCR-01 FIX : Aucun champ mutable. Entrée figée à l'écriture.

interface MemoryEntry {
  // === IDENTITÉ (immutable) ===
  readonly id: string;                    // UUID unique, généré à l'écriture
  readonly canonical_key: string;         // Clé indexée par CANON
  readonly version: number;               // Numéro de version pour cette clé
  
  // === CONTENU (immutable) ===
  readonly payload: unknown;              // Données mémorisées (agnostique)
  readonly payload_type: MemoryPayloadType;
  
  // === TRAÇABILITÉ (immutable) ===
  readonly source: "RIPPLE_ENGINE";       // Seule source autorisée
  readonly event_type: RippleEventType;   // Type d'événement déclencheur
  readonly timestamp_utc: string;         // ISO 8601 — fourni par RIPPLE
  readonly ingested_at_utc: string;       // ISO 8601 — généré par MEMORY
  readonly previous_entry_id: string | null; // Lien vers entrée précédente
  
  // === INTÉGRITÉ (immutable) ===
  readonly hash: string;                  // SHA-256 de CANONICAL_ENCODE(payload)
  readonly chain_hash: string;            // Hash chaîné par canonical_key
  
  // === ÉTAT INITIAL (immutable, capturé à l'écriture) ===
  readonly initial_tier: MemoryTier;      // Tier assigné à la création
}
```

### 6.2 Événements de Métadonnées (Append-Only Séparés)

```typescript
// ⚠️ NCR-01 FIX : Les changements d'état sont des ÉVÉNEMENTS séparés
// Ils ne modifient PAS MemoryEntry — ils s'ajoutent au journal

interface MemoryMetaEvent {
  readonly id: string;                    // UUID unique
  readonly target_entry_id: string;       // Référence à MemoryEntry.id
  readonly event_type: MetaEventType;
  readonly timestamp_utc: string;         // ISO 8601
  readonly payload: MetaEventPayload;
}

type MetaEventType =
  | "ACCESS_LOGGED"      // Lecture enregistrée (pour tiering)
  | "TIER_CHANGED"       // Promotion/demotion
  | "DECAY_MARKED"       // Marqué comme en dégradation
  | "DECAY_COMPLETED";   // Dégradation terminée

interface AccessLoggedPayload {
  readonly accessor: string;              // Qui a lu
  readonly context: string;               // Pourquoi
}

interface TierChangedPayload {
  readonly from_tier: MemoryTier;
  readonly to_tier: MemoryTier;
  readonly reason: string;
}

interface DecayMarkedPayload {
  readonly decay_reason: string;
  readonly decay_level: "DECAYING" | "DECAYED";
}

type MetaEventPayload =
  | AccessLoggedPayload
  | TierChangedPayload
  | DecayMarkedPayload;
```

### 6.3 Types de Payload

```typescript
type MemoryPayloadType =
  | "FACT"              // Fait canonique persisté
  | "RIPPLE_EFFECT"     // Effet de propagation
  | "EMOTION_STATE"     // État émotionnel capturé
  | "TIMELINE_MARKER"   // Point de repère chronologique
  | "RELATION_DELTA"    // Changement de relation
  | "PROMISE_STATE"     // État d'une promesse narrative
  | "DIGEST_CHUNK";     // Résumé condensé
```

### 6.4 Types d'Événements RIPPLE

```typescript
type RippleEventType =
  | "FACT_ESTABLISHED"      // Nouveau fait établi
  | "FACT_PROPAGATED"       // Fait propagé
  | "EMOTION_SHIFTED"       // Changement émotionnel
  | "RELATION_CHANGED"      // Relation modifiée
  | "PROMISE_CREATED"       // Promesse créée
  | "PROMISE_RESOLVED"      // Promesse tenue
  | "PROMISE_BROKEN"        // Promesse brisée
  | "TIMELINE_ADVANCED";    // Avancée temporelle
```

### 6.5 Niveaux de Mémoire (Tiering)

```typescript
type MemoryTier =
  | "HOT"    // Accès immédiat, données récentes/fréquentes
  | "WARM"   // Accès rapide, données moyennement récentes
  | "COLD";  // Accès lent, données historiques/rarement utilisées
```

---

## 7. SÉRIALISATION CANONIQUE (NCR-02 FIX)

### 7.1 Définition de CANONICAL_ENCODE

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   CANONICAL_ENCODE — Règles de Sérialisation Déterministe                             ║
║                                                                                       ║
║   Pour garantir que SHA256(payload) soit identique pour des payloads                  ║
║   logiquement équivalents, CANONICAL_ENCODE applique les règles suivantes :           ║
║                                                                                       ║
║   1. FORMAT : JSON (UTF-8, pas de BOM)                                                ║
║                                                                                       ║
║   2. CLÉS : Triées alphabétiquement (récursif sur tous les niveaux)                   ║
║                                                                                       ║
║   3. ESPACES : Aucun (JSON compact, pas de pretty-print)                              ║
║                                                                                       ║
║   4. NOMBRES :                                                                        ║
║      • Entiers : représentation décimale sans zéros inutiles                          ║
║      • Floats : représentation décimale, max 15 chiffres significatifs                ║
║      • Pas de notation scientifique sauf si > 10^15 ou < 10^-15                       ║
║                                                                                       ║
║   5. STRINGS : Échappement JSON standard (\n, \t, \", \\, \uXXXX)                     ║
║                                                                                       ║
║   6. BOOLEANS : true / false (lowercase)                                              ║
║                                                                                       ║
║   7. NULL : null (lowercase)                                                          ║
║                                                                                       ║
║   8. ARRAYS : Ordre préservé (pas de tri)                                             ║
║                                                                                       ║
║   9. DATES : ISO 8601 (string), toujours UTC, format YYYY-MM-DDTHH:MM:SSZ             ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

### 7.2 Formule de Hash

```
hash = SHA256( CANONICAL_ENCODE(payload) )
```

### 7.3 Chaînage de Hash (chain_hash)

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   CHAIN_HASH — Chaînage par canonical_key (pas global)                                ║
║                                                                                       ║
║   Chaque canonical_key maintient son propre journal chaîné.                           ║
║   Cela évite un goulot d'étranglement global.                                         ║
║                                                                                       ║
║   Formule :                                                                           ║
║                                                                                       ║
║   Si version = 1 (première entrée pour cette clé) :                                   ║
║       chain_hash = SHA256( canonical_key + ":" + hash )                               ║
║                                                                                       ║
║   Si version > 1 :                                                                    ║
║       chain_hash = SHA256( previous_entry.chain_hash + ":" + hash )                   ║
║                                                                                       ║
║   Cela crée une chaîne de preuves par entité, vérifiable indépendamment.              ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

### 7.4 Exemple de Chaînage

```
canonical_key = "character:marie:state"

Entrée v1:
  hash = SHA256(payload_v1) = "abc123..."
  chain_hash = SHA256("character:marie:state:abc123...") = "def456..."

Entrée v2:
  hash = SHA256(payload_v2) = "ghi789..."
  chain_hash = SHA256("def456...:ghi789...") = "jkl012..."

Entrée v3:
  hash = SHA256(payload_v3) = "mno345..."
  chain_hash = SHA256("jkl012...:mno345...") = "pqr678..."
```

---

## 8. FLUX D'ÉCRITURE

### 8.1 Séquence Normale

```
   RIPPLE_ENGINE
        │
        │ 1. Déclenche événement
        ▼
   ┌─────────────────────────────────────┐
   │         MEMORY_LAYER                │
   │                                     │
   │  2. Valide que source = RIPPLE      │
   │  3. Génère id (UUID)                │
   │  4. Détermine version (N+1)         │
   │  5. Génère ingested_at_utc          │
   │  6. Calcule hash via CANONICAL_ENCODE│
   │  7. Calcule chain_hash (par key)    │
   │  8. Assigne initial_tier            │
   │  9. Persiste (append-only)          │
   │ 10. Retourne confirmation           │
   │                                     │
   └─────────────────────────────────────┘
```

### 8.2 Validation à l'Entrée

```
AVANT toute écriture, MEMORY vérifie :

✅ source === "RIPPLE_ENGINE"     → sinon REJECT
✅ canonical_key est valide        → sinon REJECT
✅ event_type est reconnu          → sinon REJECT
✅ payload est non-null            → sinon REJECT
✅ timestamp_utc est ISO 8601      → sinon REJECT

Si une seule condition échoue → ÉCRITURE REFUSÉE
```

### 8.3 Gestion du timestamp

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   POLITIQUE DE TIMESTAMP                                                              ║
║                                                                                       ║
║   • timestamp_utc : fourni par RIPPLE, mémorisé tel quel                              ║
║     → La MEMORY n'interprète pas, elle conserve                                       ║
║     → Pas de validation de monotonie (RIPPLE en est responsable)                      ║
║                                                                                       ║
║   • ingested_at_utc : généré par MEMORY au moment de l'écriture                       ║
║     → Horodatage système de la MEMORY                                                 ║
║     → Permet de distinguer "quand l'événement s'est produit" vs "quand on l'a su"     ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

### 8.4 Ce que MEMORY ne fait JAMAIS

```
❌ Écrire sans source RIPPLE
❌ Modifier une entrée existante
❌ Supprimer une entrée
❌ Créer un fait de son initiative
❌ Contredire le CANON
❌ Interpréter le contenu
❌ Décider de la validité
❌ Modifier un champ après écriture
```

---

## 9. FLUX DE LECTURE

### 9.1 Types de Requêtes

| Type | Description | Exemple |
|------|-------------|---------|
| **BY_KEY** | Par clé canonique | `get("character:marie:state")` |
| **BY_VERSION** | Par version spécifique | `get("...", version=3)` |
| **BY_SNAPSHOT** | Par snapshot_id | `get("...", snapshot_id="snap_123")` |
| **BY_RANGE** | Par plage temporelle | `getRange(after, before)` |
| **BY_TYPE** | Par type de payload | `getByType("FACT")` |
| **LATEST** | Dernière version | `getLatest("...")` |
| **HISTORY** | Historique complet | `getHistory("...")` |

### 9.2 Garanties de Lecture

```
✅ Lecture sans mutation (aucune modification de l'état)
✅ Lecture déterministe via snapshot_id ou version explicite
✅ Lecture versionnée (accès à n'importe quelle version)
✅ Accès traçable (via événement ACCESS_LOGGED si besoin)
```

### 9.3 Snapshots

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   SNAPSHOT — Point de lecture déterministe                                            ║
║                                                                                       ║
║   Un snapshot_id représente un état figé de la MEMORY à un instant T.                 ║
║                                                                                       ║
║   Propriétés :                                                                        ║
║   • Immutable : un snapshot ne change jamais après création                           ║
║   • Déterministe : read(query, snapshot_id) retourne TOUJOURS le même résultat        ║
║   • Vérifiable : un snapshot a son propre hash de preuve                              ║
║                                                                                       ║
║   Usage :                                                                             ║
║   • Tests reproductibles                                                              ║
║   • Audit historique                                                                  ║
║   • Comparaison d'états                                                               ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 10. INVARIANTS MEMORY (INV-MEM)

### 10.1 INV-MEM-01 — Append-Only Strict

| Attribut | Valeur |
|----------|--------|
| **ID** | INV-MEM-01 |
| **Nom** | Append-Only Strict |
| **Sévérité** | CRITICAL |
| **Description** | Aucune entrée mémoire ne peut être modifiée ou supprimée après création. Aucun champ n'est mutable. |
| **Formule** | `∀ entry: write(entry) → ∀ field ∈ entry: field.readonly = true` |
| **Preuve requise** | Test de tentative de modification de champ → FAIL |

### 10.2 INV-MEM-02 — Source Unique

| Attribut | Valeur |
|----------|--------|
| **ID** | INV-MEM-02 |
| **Nom** | Source Unique |
| **Sévérité** | CRITICAL |
| **Description** | Seul RIPPLE_ENGINE peut déclencher une écriture. |
| **Formule** | `∀ write: source ≠ "RIPPLE_ENGINE" → REJECT` |
| **Preuve requise** | Test avec source incorrecte → REJECT |

### 10.3 INV-MEM-03 — Versionnement Obligatoire

| Attribut | Valeur |
|----------|--------|
| **ID** | INV-MEM-03 |
| **Nom** | Versionnement Obligatoire |
| **Sévérité** | HIGH |
| **Description** | Chaque écriture crée une nouvelle entrée avec version incrémentée. L'historique est conservé. |
| **Formule** | `write(key, payload) → new_entry.version = max(versions(key)) + 1` |
| **Preuve requise** | Test de 10 écritures successives → versions 1 à 10, toutes accessibles |

### 10.4 INV-MEM-04 — Indexation Canonique

| Attribut | Valeur |
|----------|--------|
| **ID** | INV-MEM-04 |
| **Nom** | Indexation Canonique |
| **Sévérité** | HIGH |
| **Description** | Toute entrée est indexée par une clé canonique valide. |
| **Formule** | `∀ entry: isValidCanonicalKey(entry.canonical_key) = true` |
| **Preuve requise** | Test avec clé invalide → REJECT |

### 10.5 INV-MEM-05 — Intégrité Hash Déterministe

| Attribut | Valeur |
|----------|--------|
| **ID** | INV-MEM-05 |
| **Nom** | Intégrité Hash Déterministe |
| **Sévérité** | CRITICAL |
| **Description** | Toute entrée possède un hash calculé via CANONICAL_ENCODE et un chain_hash chaîné par canonical_key. |
| **Formule** | `entry.hash = SHA256(CANONICAL_ENCODE(entry.payload))` |
| **Preuve requise** | Test : même payload → même hash ; payload différent → hash différent |

### 10.6 INV-MEM-06 — Decay Non-Destructif

| Attribut | Valeur |
|----------|--------|
| **ID** | INV-MEM-06 |
| **Nom** | Decay Non-Destructif |
| **Sévérité** | HIGH |
| **Description** | MEMORY_DECAY émet un événement DECAY_MARKED mais ne supprime JAMAIS. L'entrée originale reste intacte et accessible. |
| **Formule** | `decay(entry_id) → emit(DECAY_MARKED) ∧ entry.exists = true` |
| **Preuve requise** | Test de decay → entrée toujours récupérable par id et version |

### 10.7 INV-MEM-07 — Déterminisme Lecture (CORRIGÉ)

| Attribut | Valeur |
|----------|--------|
| **ID** | INV-MEM-07 |
| **Nom** | Déterminisme Lecture |
| **Sévérité** | HIGH |
| **Description** | Une lecture paramétrée par snapshot_id ou version retourne TOUJOURS le même résultat. |
| **Formule** | `read(query, snapshot_id=S) = read(query, snapshot_id=S)` ET `read(key, version=V) = read(key, version=V)` |
| **Preuve requise** | 100 lectures avec même (query, snapshot_id) → résultats identiques |
| **Note** | Le déterminisme est garanti par le paramètre explicite, pas par un "t" abstrait |

---

## 11. REGISTRE DES INVARIANTS

| ID | Nom | Sévérité | CNC lié | Status |
|----|-----|----------|---------|--------|
| INV-MEM-01 | Append-Only Strict | CRITICAL | CNC-300 | 🔴 À PROUVER |
| INV-MEM-02 | Source Unique (RIPPLE only) | CRITICAL | CNC-300 | 🔴 À PROUVER |
| INV-MEM-03 | Versionnement Obligatoire | HIGH | CNC-053 | 🔴 À PROUVER |
| INV-MEM-04 | Indexation Canonique | HIGH | CNC-300 | 🔴 À PROUVER |
| INV-MEM-05 | Intégrité Hash Déterministe | CRITICAL | CNC-300 | 🔴 À PROUVER |
| INV-MEM-06 | Decay Non-Destructif | HIGH | CNC-075 | 🔴 À PROUVER |
| INV-MEM-07 | Déterminisme Lecture | HIGH | CNC-300 | 🔴 À PROUVER |

---

## 12. CE QUE MEMORY NE FAIT JAMAIS

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   INTERDICTIONS ABSOLUES DE LA MEMORY_LAYER                                           ║
║                                                                                       ║
║   ❌ CRÉER un fait                                                                    ║
║   ❌ MODIFIER un fait                                                                 ║
║   ❌ MODIFIER un champ d'une entrée                                                   ║
║   ❌ SUPPRIMER un fait                                                                ║
║   ❌ CORRIGER un fait                                                                 ║
║   ❌ CONTREDIRE le CANON                                                              ║
║   ❌ CONTOURNER TRUTH ou EMOTION                                                      ║
║   ❌ "OPTIMISER" l'histoire                                                           ║
║   ❌ DÉCIDER de ce qui est vrai                                                       ║
║   ❌ ÉCRIRE sans ordre de RIPPLE                                                      ║
║   ❌ INTERPRÉTER le contenu                                                           ║
║                                                                                       ║
║   La MEMORY se souvient. Elle ne décide pas.                                          ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 13. INTERACTIONS AVEC RIPPLE_ENGINE

### 13.1 Contrat d'Interface

```typescript
// INTERFACE CONCEPTUELLE — PAS UNE IMPLÉMENTATION

interface MemoryWriteRequest {
  source: "RIPPLE_ENGINE";        // OBLIGATOIRE
  canonical_key: string;          // Clé canonique
  event_type: RippleEventType;    // Type d'événement
  payload: unknown;               // Données à mémoriser
  timestamp_utc: string;          // Horodatage (fourni par RIPPLE)
}

interface MemoryWriteResponse {
  success: boolean;
  entry_id: string;               // ID de l'entrée créée
  version: number;                // Version assignée
  hash: string;                   // Hash calculé (CANONICAL_ENCODE)
  chain_hash: string;             // Hash chaîné
  ingested_at_utc: string;        // Timestamp d'ingestion MEMORY
  error?: MemoryError;            // Si échec
}

type MemoryError =
  | "INVALID_SOURCE"              // Source != RIPPLE_ENGINE
  | "INVALID_KEY"                 // Clé canonique invalide
  | "INVALID_EVENT_TYPE"          // Type d'événement inconnu
  | "INVALID_PAYLOAD"             // Payload null ou malformé
  | "INVALID_TIMESTAMP"           // Timestamp non ISO 8601
  | "INTEGRITY_FAILURE";          // Échec de calcul hash
```

### 13.2 Séquence d'Appel

```
RIPPLE_ENGINE                          MEMORY_LAYER
     │                                      │
     │──── MemoryWriteRequest ─────────────▶│
     │                                      │
     │                                      │─── Valide source
     │                                      │─── Valide clé
     │                                      │─── Génère id, version
     │                                      │─── Génère ingested_at_utc
     │                                      │─── Calcule hash (CANONICAL_ENCODE)
     │                                      │─── Calcule chain_hash
     │                                      │─── Persiste (append-only)
     │                                      │
     │◀──── MemoryWriteResponse ────────────│
     │                                      │
```

---

## 14. PHASES D'IMPLÉMENTATION FUTURES

| Phase | Focus | Contenu | Status |
|-------|-------|---------|--------|
| **8A** | SPEC | CNC-300 + invariants | 🟢 TERMINÉ |
| **8B** | CORE | memory_store.ts (base) | ⚪ À VENIR |
| **8C** | HYBRID | CNC-053 implémentation | ⚪ À VENIR |
| **8D** | TIERING | CNC-054 implémentation | ⚪ À VENIR |
| **8E** | DIGEST | CNC-055 implémentation | ⚪ À VENIR |
| **8F** | DECAY | CNC-075 implémentation | ⚪ À VENIR |

---

## 15. DÉCISIONS REPORTÉES (PHASE 8B+)

| Décision | Raison du report |
|----------|------------------|
| Choix du backend (JSON/SQLite/autre) | Agnosticisme requis en 8A |
| Stratégie de promotion/demotion (tiering) | Dépend de l'usage réel |
| Algorithme de decay | Dépend des métriques |
| Optimisations de performance | Prématuré sans implémentation |
| Format exact des snapshots | Dépend du backend |

---

## 16. SIGNATURES

| Rôle | Nom | Status |
|------|-----|--------|
| Architecte Suprême | Francky | ✅ VALIDÉ (sous réserve NCR) |
| IA Principal | Claude OPUS 4.5 | ✅ RÉDIGÉ + NCR CORRIGÉES |

---

## 17. DÉCLARATION DE CONFORMITÉ

Ce document :

1. ✅ Respecte le standard NASA-Grade L4
2. ✅ Définit le concept sans implémentation
3. ✅ Intègre les sous-concepts existants (CNC-053/054/055/075)
4. ✅ Établit 7 invariants à prouver
5. ✅ Clarifie l'interaction avec RIPPLE_ENGINE
6. ✅ Reste agnostique du backend
7. ✅ Prépare les phases suivantes
8. ✅ **NCR-01 CORRIGÉE** : Entrées 100% immutables + événements séparés
9. ✅ **NCR-02 CORRIGÉE** : CANONICAL_ENCODE défini + chain_hash par key
10. ✅ **NCR-03 CORRIGÉE** : Déterminisme via snapshot_id/version explicite

---

**FIN DU DOCUMENT CNC-300 — MEMORY_LAYER v1.0.1**
**Document généré le 2026-01-03**
**OMEGA Project — NASA-Grade L4 — Phase 8A — READY_FOR_IMPL**
