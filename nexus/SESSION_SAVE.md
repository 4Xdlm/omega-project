# ═══════════════════════════════════════════════════════════════════════════════
#
#   SESSION_SAVE — OMEGA PROJECT
#   Guide de synchronisation (humain + IA)
#
#   Version: v3.85.0-GOVERNANCE
#   Date: 2026-01-12
#   Status: SOURCE DE VÉRITÉ UNIQUE
#
# ═══════════════════════════════════════════════════════════════════════════════

## 1. STATUT OFFICIEL

| Attribut | Valeur |
|----------|--------|
| **Phase courante** | 85 — Gouvernance |
| **Dernier SEAL** | SEAL-20260112-0002 |
| **Root Hash** | `sha256:a633dabefe341536c85e8cc43333a349fd72a65e705f5eb9ff378cf84a8735bb` |
| **Tag Git** | v3.85.0-GOVERNANCE |
| **Commit** | 9913037 |
| **Repository** | https://github.com/4Xdlm/omega-project |

---

## 2. CARTE MENTALE DU PROJET

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   PHASES 1–80        PHASES 80–84       PHASE 85+                   │
│   ────────────       ────────────       ────────                    │
│   Historique         Transition         Gouvernance                 │
│   FIGÉ               SCELLÉ             ACTIVE                      │
│                                                                     │
│   • CANON_LAYER      • OMEGA NEXUS      • Ledger vivant             │
│   • TRUTH_LAYER      • 339 tests        • Seals continus            │
│   • EMOTION_LAYER    • 11 modules       • Atlas généré              │
│   • RIPPLE_LAYER     • CLI complet      • AI-consumable             │
│   • MEMORY_LAYER                                                    │
│   • CREATION_LAYER                                                  │
│   • HARDENING                                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Entités enregistrées:**
- `ENT-20260112-0001` — Transition OMEGA → NEXUS (Phases 80-84)
- `ENT-20260112-0002` — OMEGA Projet (Phases 1-80)

---

## 3. MODE D'EMPLOI IA

### ⚠️ RÈGLES ABSOLUES

1. **Ne pas inférer depuis la documentation externe**
   - Les fichiers Markdown hors NEXUS sont informatifs, pas canoniques

2. **Toujours vérifier dans le ledger**
   - Source de vérité: `nexus/ledger/`
   - Preuves: `nexus/proof/seals/`

3. **Utiliser Atlas pour la vision**
   - Timeline: `nexus/atlas/TIMELINE.md`
   - Entités mortes: `nexus/atlas/museum/`
   - Entités futures: `nexus/atlas/visions/`

4. **Consulter avant d'affirmer**
   - `omega-nexus where` → état courant
   - `omega-nexus verify` → intégrité

### 📖 OÙ LIRE LA VÉRITÉ

| Priorité | Chemin | Contenu |
|----------|--------|---------|
| 1️⃣ | `nexus/ledger/entities/` | Décisions, modules, concepts |
| 2️⃣ | `nexus/ledger/events/` | Historique des changements |
| 3️⃣ | `nexus/proof/seals/` | États certifiés |
| 4️⃣ | `nexus/genesis/` | Lois fondatrices (immutables) |

### ❌ À IGNORER

- `nexus/raw/` — données brutes
- `nexus/tooling/` — code technique
- `*.ARCHIVED` — historique obsolète

---

## 4. COMMANDES DE BASE

```bash
# État courant (phase, seals, entités)
omega-nexus where

# Vérifier l'intégrité
omega-nexus verify

# Générer les vues Atlas
omega-nexus atlas

# Voir le status
omega-nexus status

# Créer un seal après travail
omega-nexus seal -m "Description"

# Exporter pour audit
omega-nexus export -o ./audit/
```

---

## 5. RÈGLE D'OR

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   TOUTE INFORMATION NON PRÉSENTE DANS LE LEDGER                               ║
║   EST CONSIDÉRÉE COMME NON FIABLE.                                            ║
║                                                                               ║
║   OMEGA ne se décrit plus.                                                    ║
║   OMEGA se consulte.                                                          ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 6. POUR REPRENDRE LE PROJET

### En tant qu'humain:
1. `cd C:\Users\elric\omega-project\nexus\tooling`
2. `omega-nexus where`
3. Lire le dernier SEAL

### En tant qu'IA:
1. Lire `nexus/genesis/AI_CONSUMPTION_GUIDE.md`
2. Lire `nexus/ledger/entities/` (entités ACTIVE)
3. Lire `nexus/proof/seals/` (dernier seal)
4. Ne rien supposer qui n'est pas dans le ledger

---

## 7. PROCHAINE PHASE (86)

**Objectif:** IA Consumption Flow
- Comment une IA se met à jour
- Comment elle vérifie
- Comment elle raisonne sans halluciner

---

**Signature:** Claude (IA Principal)  
**Date:** 2026-01-12  
**Standard:** NASA-Grade L4 / DO-178C

---

*Ce document est un guide de synchronisation, pas une archive.*
*La vérité est dans le ledger.*
