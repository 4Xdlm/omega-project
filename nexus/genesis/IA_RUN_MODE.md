# ═══════════════════════════════════════════════════════════════════════════════
#
#   IA_RUN_MODE — OMEGA NEXUS
#   Protocole d'action IA gouvernée (Human-in-the-Loop)
#
#   Version: 1.0.0
#   Phase: 87
#   Date: 2026-01-12
#   Status: CANONICAL
#
# ═══════════════════════════════════════════════════════════════════════════════

## 0. PRINCIPE FONDATEUR

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   L'IA PROPOSE.                                                               ║
║   L'HUMAIN DISPOSE.                                                           ║
║                                                                               ║
║   Aucune écriture ACTIVE/CERTIFIED sans validation humaine.                   ║
║   Aucune suppression. Aucun SEAL sans ordre explicite.                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 1. ZONES D'ÉCRITURE IA

### 1.1 Structure autorisée

```
nexus/
├── draft/                    # Zone IA (écriture autorisée)
│   ├── entities/             # ENT en DRAFT
│   ├── events/               # EVT en DRAFT
│   └── links/                # LINK en DRAFT
│
├── audit/                    # Rapports d'audit IA
│   └── IA_AUDIT_YYYYMMDD.md
│
├── proposals/                # Synthèses et plans
│   └── IA_SYNTHESIS_YYYYMMDD.md
│
└── seal_candidates/          # Préparation SEAL (jamais exécuté par IA)
    └── SEAL_CANDIDATE_YYYYMMDD.md
```

### 1.2 Règle absolue

| Zone | IA peut écrire | IA peut lire |
|------|----------------|--------------|
| `nexus/draft/` | ✅ OUI | ✅ OUI |
| `nexus/audit/` | ✅ OUI | ✅ OUI |
| `nexus/proposals/` | ✅ OUI | ✅ OUI |
| `nexus/seal_candidates/` | ✅ OUI | ✅ OUI |
| `nexus/ledger/` | ❌ NON | ✅ OUI |
| `nexus/proof/` | ❌ NON | ✅ OUI |
| `nexus/genesis/` | ❌ NON | ✅ OUI |

---

## 2. PERMISSIONS IA

### 2.1 L'IA PEUT

| Action | Description |
|--------|-------------|
| ✅ Lire | Ledger, seals, entities, events, links, atlas |
| ✅ Auditer | Détecter incohérences, collisions, orphelins |
| ✅ Créer DRAFT | ENT/EVT/LINK dans `nexus/draft/` |
| ✅ Préparer SEAL | Manifest + message dans `seal_candidates/` |
| ✅ Générer synthèse | Avec IDs, lifecycle, timestamps |
| ✅ Préparer commandes | PowerShell/bash prêtes à copier |
| ✅ Poser des questions | En cas de doute |

### 2.2 L'IA NE PEUT PAS

| Action | Raison |
|--------|--------|
| ❌ Modifier ledger | Zone canonique |
| ❌ Toucher ACTIVE/CERTIFIED | Immutabilité |
| ❌ Exécuter `seal` | Human-in-the-loop |
| ❌ Supprimer | Append-only |
| ❌ Supposer | Hallucination |
| ❌ Agir sans GO | Gouvernance |

---

## 3. WORKFLOW STANDARD

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   1. SYNC      omega-nexus where                                    │
│      ↓                                                              │
│   2. VERIFY    omega-nexus verify                                   │
│      ↓         (si FAIL → STOP)                                     │
│   3. READ      Ledger selon la mission                              │
│      ↓                                                              │
│   4. PROPOSE   Fichiers DRAFT + audit + commandes                   │
│      ↓                                                              │
│   5. WAIT      Attente validation humaine                           │
│      ↓                                                              │
│   6. EXECUTE   Humain déplace + scelle                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. FORMAT DES LIVRABLES IA

### 4.1 Audit (`IA_AUDIT_YYYYMMDD.md`)

```markdown
# IA AUDIT — YYYY-MM-DD

## État du ledger
- Entities: N (ACTIVE: X, DRAFT: Y, CERTIFIED: Z)
- Events: N
- Seals: N
- Dernier hash: sha256:...

## Anomalies détectées
| ID | Type | Description | Sévérité |
|----|------|-------------|----------|
| ... | ... | ... | ... |

## Propositions
1. [Action avec ID cible]
2. [Action avec ID cible]

Source: nexus/ledger/
Vérifié: YYYY-MM-DDTHH:MM:SSZ
```

### 4.2 Synthèse (`IA_SYNTHESIS_YYYYMMDD.md`)

```markdown
# IA SYNTHESIS — YYYY-MM-DD

## Où on en est
- Phase: XX
- Dernier SEAL: SEAL-YYYYMMDD-NNNN

## Ce qui est figé (CERTIFIED)
- [Liste avec IDs]

## Ce qui est actif (ACTIVE)
- [Liste avec IDs]

## Ce qui est en cours (DRAFT)
- [Liste avec IDs]

## Ce qui manque
- [Observations sourcées]

## Risques identifiés
- [Avec IDs si applicable]
```

### 4.3 SEAL Candidat (`SEAL_CANDIDATE_YYYYMMDD.md`)

```markdown
# SEAL CANDIDATE — YYYY-MM-DD

## Message proposé
"Description du seal"

## Fichiers concernés
- nexus/ledger/entities/ENT-...
- nexus/ledger/events/EVT-...

## Commande (à exécuter par l'humain)
```powershell
omega-nexus seal -m "Message" -d C:\Users\elric\omega-project
```

## Root hash attendu
(Sera calculé au moment du seal)

⚠️ CE FICHIER EST UNE PROPOSITION — NE PAS EXÉCUTER SANS VALIDATION
```

---

## 5. TEMPLATE DE MISSION IA

Quand l'humain veut activer l'IA en Phase 87:

```
MODE: PHASE 87 — IA RUN (GOUVERNÉ)

Objectif:
[Description claire de la mission]

Contraintes:
- Lecture seule du ledger
- Écriture uniquement dans nexus/draft/, audit/, proposals/
- Aucune supposition
- IDs obligatoires dans toute affirmation

Livrables attendus:
- [ ] IA_AUDIT
- [ ] IA_SYNTHESIS
- [ ] DRAFT ENT/EVT (si nécessaire)
- [ ] SEAL_CANDIDATE (si nécessaire)
- [ ] Commandes préparées
```

---

## 6. GARDE-FOUS

### 6.1 Conditions d'arrêt immédiat

| Condition | Action |
|-----------|--------|
| `verify` = FAIL | STOP — signaler corruption |
| Info absente du ledger | Dire "information non disponible" |
| Doute sur l'action | Question à l'humain |
| Demande hors scope | Refuser poliment |

### 6.2 Traçabilité obligatoire

Toute affirmation IA doit inclure:
- Source (ID entité/seal/event)
- État (lifecycle)
- Timestamp de vérification

```
❌ "Le projet avance bien"
✅ "Selon ENT-20260112-0002, le projet OMEGA (Phases 1-80) est ACTIVE"
```

---

## 7. COMMANDES DE RÉFÉRENCE

| Action | Commande |
|--------|----------|
| État courant | `omega-nexus where` |
| Vérifier intégrité | `omega-nexus verify` |
| Générer atlas | `omega-nexus atlas` |
| Préparer seal | `omega-nexus seal -m "..." --dry-run` |
| Sceller (humain) | `omega-nexus seal -m "..."` |

---

## 8. RÈGLE D'OR

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   L'IA NE FAIT RIEN.                                                          ║
║   L'IA PRÉPARE TOUT.                                                          ║
║                                                                               ║
║   Zéro improvisation. Zéro action silencieuse.                                ║
║   Tout est traçable ou n'existe pas.                                          ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

**FIN DU PROTOCOLE — IA_RUN_MODE v1.0.0**

*L'IA propose. L'humain dispose.*
