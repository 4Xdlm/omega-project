# ═══════════════════════════════════════════════════════════════════════════════
#
#   AI_CONSUMPTION_GUIDE — OMEGA NEXUS
#   Comment une IA doit lire et comprendre le projet OMEGA
#
#   Version: 1.0.0
#   Date: 2026-01-12
#   Status: CANONICAL
#
# ═══════════════════════════════════════════════════════════════════════════════

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   CE DOCUMENT EST LA VÉRITÉ                                                   ║
║                                                                               ║
║   Si tu es une IA et que tu lis ce fichier, tu dois suivre                    ║
║   ces instructions pour comprendre l'état du projet OMEGA.                    ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 🎯 RÈGLE FONDAMENTALE

```
OMEGA ne se décrit plus.
OMEGA se consulte.
```

Le projet OMEGA possède un système de vérité unique appelé **NEXUS**.
Toute information qui n'est pas dans NEXUS n'est pas canonique.

---

## 📖 OÙ LIRE LA VÉRITÉ

### Ordre de priorité (impératif)

| Priorité | Source | Chemin | Description |
|----------|--------|--------|-------------|
| 1️⃣ | **Ledger** | `nexus/ledger/` | Entités, événements, liens actifs |
| 2️⃣ | **Proof** | `nexus/proof/seals/` | Scellés cryptographiques |
| 3️⃣ | **Atlas** | `nexus/atlas/` | Vues générées (timeline, museum...) |
| 4️⃣ | **Genesis** | `nexus/genesis/` | Lois fondatrices (immutables) |

### ⚠️ À IGNORER

| Source | Chemin | Raison |
|--------|--------|--------|
| Raw | `nexus/raw/` | Données brutes non structurées |
| Tooling | `nexus/tooling/` | Code technique interne |
| Archives | `*.ARCHIVED` | Historique obsolète |

---

## 📋 COMMENT RÉPONDRE AUX QUESTIONS CLÉS

### "Où en est le projet ?"

1. Lire le dernier SEAL dans `nexus/proof/seals/`
2. Extraire `root_hash` et `timestamp`
3. Compter les entités ACTIVE dans `nexus/ledger/entities/`

**Réponse type:**
```
Dernier seal: SEAL-YYYYMMDD-NNNN
Date: YYYY-MM-DD
Entités actives: N
Root hash: sha256:...
```

### "Qu'est-ce qui est certifié ?"

1. Lister les entités avec `lifecycle: CERTIFIED`
2. Vérifier qu'elles ont des `evidence` (state, manifest)

### "Quelles décisions sont actives ?"

1. Filtrer `nexus/ledger/entities/` par `type: DECISION` et `lifecycle: ACTIVE`

### "Quels modules sont morts ?"

1. Lire `nexus/atlas/museum/` — contient les entités DEPRECATED et ARCHIVED
2. Ou filtrer les entités par `lifecycle: DEPRECATED | ABANDONED | FAILED`

### "Quelle est la prochaine action ?"

1. Lire les entités `lifecycle: DRAFT` — ce sont les chantiers ouverts
2. Lire `nexus/atlas/visions/` — contient les entités DRAFT et PROPOSED

---

## 🔐 RÈGLES DE COMPORTEMENT IA

### ✅ OBLIGATOIRE

- Toujours consulter le ledger AVANT de répondre sur l'état du projet
- Citer les IDs d'entités quand on les mentionne (ex: `ENT-20260112-0001`)
- Ne jamais inventer d'information non présente dans NEXUS
- Signaler si une information est absente du ledger

### ❌ INTERDIT

- Supposer l'état du projet sans vérification
- Mélanger documentation externe et vérité NEXUS
- Modifier le ledger sans créer un événement tracé
- Ignorer les seals ou leur validation

---

## 🧭 COMMANDES UTILES

```bash
# Voir l'état du projet
omega-nexus status

# Vérifier l'intégrité
omega-nexus verify

# Voir où on en est (phase, derniers seals, entités actives)
omega-nexus where

# Générer les vues atlas
omega-nexus atlas
```

---

## 📊 STRUCTURE NEXUS

```
nexus/
├── genesis/              # 🔒 IMMUTABLE — Lois fondatrices
│   ├── THE_OATH.md       # Serment du projet
│   ├── LAWS.yaml         # Règles constitutionnelles
│   └── IDENTITY.yaml     # Identité du projet
│
├── ledger/               # 📜 VÉRITÉ — Registre canonique
│   ├── entities/         # Entités (décisions, modules, concepts...)
│   ├── events/           # Événements (created, updated, promoted...)
│   ├── links/            # Relations entre entités
│   └── registry/         # Compteurs et locks
│
├── proof/                # 🔐 PREUVES — Scellés cryptographiques
│   ├── seals/            # Seals (root hash, timestamp, author)
│   ├── states/           # Snapshots d'état
│   └── snapshots/manifests/
│
├── atlas/                # 🗺️ VUES — Lectures simplifiées
│   ├── TIMELINE.md       # Chronologie
│   ├── museum/           # Entités mortes (deprecated, archived)
│   ├── visions/          # Entités futures (draft, proposed)
│   └── lessons/          # Leçons (failed, abandoned)
│
└── raw/                  # 📦 BRUT — Données non structurées (ignorer)
```

---

## 🏛️ LIFECYCLE DES ENTITÉS

```
DRAFT → ACTIVE → CERTIFIED
          ↓
    DEPRECATED → ARCHIVED
          ↓
      ABANDONED → (LESSON_FROM)
          ↓
       FAILED → (LESSON_FROM)
```

| État | Signification | Action IA |
|------|---------------|-----------|
| DRAFT | Brouillon, en cours | Peut évoluer |
| ACTIVE | Validé, en usage | Source de vérité |
| CERTIFIED | Prouvé, immutable | Ne pas modifier |
| DEPRECATED | Remplacé | Ignorer sauf historique |
| ARCHIVED | Historique | Lecture seule |
| ABANDONED | Abandonné | Lire la leçon liée |
| FAILED | Échec | Lire la leçon liée |

---

## 🎯 RÉSUMÉ EXÉCUTIF

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   POUR UNE IA QUI REPREND LE PROJET OMEGA:                                    ║
║                                                                               ║
║   1. Lis nexus/genesis/ pour comprendre les lois fondatrices                  ║
║   2. Lis nexus/ledger/entities/ pour voir les décisions actives               ║
║   3. Lis nexus/proof/seals/ pour voir le dernier état certifié                ║
║   4. Lance `omega-nexus status` pour un résumé rapide                         ║
║   5. Ne suppose RIEN qui n'est pas dans NEXUS                                 ║
║                                                                               ║
║   Si tu ne trouves pas l'information → elle n'existe pas officiellement.      ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

**FIN DU GUIDE — AI_CONSUMPTION_GUIDE v1.0.0**
