# ═══════════════════════════════════════════════════════════════════════════════
#
#   IA_CONSUMPTION_FLOW — OMEGA NEXUS
#   Protocole de synchronisation et d'usage pour IA
#
#   Version: 1.0.0
#   Phase: 86
#   Date: 2026-01-12
#   Status: CANONICAL
#
# ═══════════════════════════════════════════════════════════════════════════════

## 0. PRINCIPE FONDAMENTAL

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   UNE IA NE SUPPOSE JAMAIS.                                                   ║
║   UNE IA CONSULTE.                                                            ║
║                                                                               ║
║   Si l'information n'est pas dans le ledger → elle n'existe pas.              ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 1. SYNCHRONISATION

### 1.1 Étape initiale (obligatoire)

À chaque nouvelle session, l'IA DOIT:

```
1. Lire nexus/SESSION_SAVE.md
2. Extraire:
   - Phase courante
   - Dernier SEAL ID
   - Root Hash
3. Exécuter: omega-nexus where
4. Comparer le hash retourné avec le hash attendu
```

### 1.2 Commande de synchronisation

```bash
omega-nexus where -d <chemin_projet>
```

**Sortie attendue:**
```
Last Seal: SEAL-YYYYMMDD-NNNN
Hash: sha256:<64_hex>
Entities: N
Events: N
Seals: N
```

### 1.3 Vérification de cohérence

| Condition | Action |
|-----------|--------|
| Hash correspond | ✅ Continuer |
| Hash différent | ⚠️ Resynchroniser ou signaler |
| Seal plus récent | ⚠️ Mettre à jour SESSION_SAVE |

---

## 2. VÉRIFICATION DE HASH

### 2.1 Vérifier l'intégrité globale

```bash
omega-nexus verify -d <chemin_projet>
```

**Réponse attendue:**
```
✓ Integrity: PASS
✓ Genesis: PASS
✓ Seal chain: PASS
```

### 2.2 Vérifier un seal spécifique

```bash
omega-nexus verify --seal SEAL-YYYYMMDD-NNNN -d <chemin_projet>
```

### 2.3 Interprétation

| Résultat | Signification | Action IA |
|----------|---------------|-----------|
| PASS | État cohérent | Procéder |
| FAIL | Corruption détectée | STOP — signaler à l'humain |
| WARN | Anomalie mineure | Procéder avec prudence |

---

## 3. LECTURE DU LEDGER

### 3.1 Ordre de lecture (priorité décroissante)

```
1. nexus/proof/seals/          → Dernier état certifié
2. nexus/ledger/entities/      → Décisions et modules actifs
3. nexus/ledger/events/        → Historique des changements
4. nexus/ledger/links/         → Relations entre entités
5. nexus/atlas/                → Vues générées (lecture facilitée)
```

### 3.2 Filtres de lecture

**Pour répondre à "Où en est le projet?"**
```
1. Lire le dernier SEAL
2. Compter entités par lifecycle (ACTIVE, DRAFT, CERTIFIED)
3. Identifier les entités DRAFT (travail en cours)
```

**Pour répondre à "Quelles décisions sont actives?"**
```
1. Filtrer nexus/ledger/entities/ par type: DECISION
2. Filtrer par lifecycle: ACTIVE
```

**Pour répondre à "Qu'est-ce qui est figé?"**
```
1. Filtrer par lifecycle: CERTIFIED
2. Ces entités ne peuvent plus être modifiées
```

**Pour répondre à "Quels modules sont morts?"**
```
1. Lire nexus/atlas/museum/
2. Ou filtrer par lifecycle: DEPRECATED | ABANDONED | FAILED
```

### 3.3 Ce qu'il ne faut PAS lire

| Chemin | Raison |
|--------|--------|
| `nexus/raw/` | Données brutes, pas canoniques |
| `nexus/tooling/` | Code interne |
| `*.ARCHIVED` | Obsolète |
| Documentation externe | Informative, pas canonique |

---

## 4. PRODUCTION DE RÉPONSE TRAÇABLE

### 4.1 Format de réponse IA

Toute réponse basée sur le ledger DOIT inclure:

```
Source: [ID de l'entité ou du seal]
État: [lifecycle]
Vérifié: [timestamp de vérification]
```

### 4.2 Exemple de réponse correcte

```
Question: "Où en est OMEGA?"

Réponse:
Dernier seal: SEAL-20260112-0003
Root hash: sha256:243161c5a9762624fa3dd601bcbeeaa8c7741d12d6be1f4dde7ae0441bf931af

Entités actives:
- ENT-20260112-0001: Transition OMEGA → NEXUS (ACTIVE)
- ENT-20260112-0002: OMEGA Projet Phases 1-80 (ACTIVE)

Source: nexus/ledger/entities/
Vérifié: 2026-01-12T12:32:24Z
```

### 4.3 Ce qu'une IA NE DOIT JAMAIS faire

| Interdit | Raison |
|----------|--------|
| ❌ Résumer "de mémoire" | Risque d'hallucination |
| ❌ Inférer un état non lu | Pas de supposition |
| ❌ Citer une source externe | Ledger = seule vérité |
| ❌ Affirmer sans ID | Pas de traçabilité |

---

## 5. WORKFLOW COMPLET

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   1. SYNC         omega-nexus where                                 │
│      ↓                                                              │
│   2. VERIFY       omega-nexus verify                                │
│      ↓                                                              │
│   3. READ         Lire ledger selon la question                     │
│      ↓                                                              │
│   4. RESPOND      Réponse avec source + ID + timestamp              │
│      ↓                                                              │
│   5. SEAL         Si modification: omega-nexus seal -m "..."        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. COMMANDES ESSENTIELLES

| Action | Commande |
|--------|----------|
| État courant | `omega-nexus where` |
| Vérifier intégrité | `omega-nexus verify` |
| Voir entités | `omega-nexus status` |
| Générer vues | `omega-nexus atlas` |
| Sceller après travail | `omega-nexus seal -m "description"` |

---

## 7. RÈGLE D'OR

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   TOUTE AFFIRMATION SANS SOURCE LEDGER = HALLUCINATION                        ║
║                                                                               ║
║   "Je pense que..." → INTERDIT                                                ║
║   "Selon ENT-XXXXXX-NNNN..." → CORRECT                                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 8. CHECKLIST IA (à chaque session)

- [ ] SESSION_SAVE lu
- [ ] `omega-nexus where` exécuté
- [ ] Hash vérifié
- [ ] Ledger consulté (pas supposé)
- [ ] Réponses avec source + ID
- [ ] Seal créé si modification

---

**FIN DU PROTOCOLE — IA_CONSUMPTION_FLOW v1.0.0**

*La vérité est dans le ledger.*
*Synchronise-toi. Vérifie. Consulte. Trace.*
