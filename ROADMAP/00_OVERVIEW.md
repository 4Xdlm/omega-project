# ═══════════════════════════════════════════════════════════════════════════════════════════
#
#   OMEGA — ROADMAP OFFICIELLE
#   00_OVERVIEW — Vue Macro (v2.0 - Post-Conception)
#
#   🔒 FROZEN après validation
#
# ═══════════════════════════════════════════════════════════════════════════════════════════

## RÈGLE MÈRE

```
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║   TANT QUE V4.4 CORE N'EST PAS 🔒 PROUVÉ,                                                ║
║   LE RESTE EST INTERDIT.                                                                  ║
║                                                                                           ║
║   Pas de Mycelium. Pas de GPS. Pas d'écriture. Pas d'UI.                                 ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
```

---

## PHASES — VUE MACRO (v2.0)

| Phase | Nom | Objectif | Gate | Perf |
|-------|-----|----------|------|------|
| **0** | BASELINE | Figer état réel | Proof pack | ❌ |
| **1** | V4.4 CONTRACT | Schémas + tests | Tests existent | ✅ Design |
| **2** | V4.4 CORE | Moteur mathématique | 100% tests pass | ✅ Stabilité |
| **3** | INTEGRATION | 60% réel | Pipeline prouvé | ✅ Cache |
| **4** | CLI PROOFS | Reproductible | Hash outputs | ✅ Latence |
| **5** | FREEZE | V4.4 intouchable | Non-régression | ✅ SLA |
| **6** | SENTINEL | Gouvernance machine-level | Juges actifs | ✅ Latence |
| **7** | INTENT | Intention auteur | Couche active | ✅ — |
| **8** | MYCELIUM + FLOW | ADN + flux sanguin | Déterministe | ✅ Rendu |
| **9** | GPS + QUANTUM | Guidage + multi-vérités | Pas de génération | ✅ Temps réel |
| **10** | MEMORY | Canon + continuité | Détection erreurs | ✅ Index |
| **11** | GENESIS | Planification | Plan conforme V4.4 | ✅ Simu |
| **12** | SCRIBE | Génération | Texte conforme | ✅ Pipeline |
| **13** | POLISH | Amélioration + déviation style | ADN stable | ✅ Diffs |
| **14** | AUTONOMY | Modes industriels | Logs complets | ✅ Parallel |
| **15** | LICENSED | Extension univers | Blocage sans licence | ✅ Ingestion |
| **16** | UI COCKPIT | Pilotage + Reader Model | Lecture seule | ✅ UX |
| **17** | UI MYCELIUM | Visualisation | Fidèle | ✅ Rendu |
| **18** | UI STUDIO | Écriture assistée | Humain pilote | ✅ Temps réel |
| **19** | BOOT/CALL | Anti-reconstruction + Token Meter | Zéro re-upload | ✅ Rapidité |

---

## MODULES TRANSVERSAUX (Déclarés dès Phase 1)

### EXECUTION_MODE

| Mode | Description | Tokens |
|------|-------------|--------|
| **OFF** | Local/règles/heuristiques sans IA | ~0 |
| **SEMI_OFF** | IA sur étapes clés uniquement | Limités |
| **BOOST** | 100% IA, vitesse/qualité max | Budgétés |

Chaque module DOIT déclarer:
- Ce qu'il peut faire en OFF
- Ce qu'il nécessite en BOOST

### TOKEN_METER

Compteur de ressources transversal:
- Compteur réel (usage)
- Estimation (avant exécution)
- Budget (limites)
- Audit (logs hashés)

Politique dépassement:
- DOWNGRADE (BOOST → SEMI_OFF)
- STOP (bloque)
- ASK (validation humaine)

### PLUGIN_CONTRACT

Interface pour modules externes:
- Contrat IO standardisé
- NEXUS_DEP = bus d'intégration
- Évolutivité (manga, scénario, poésie...)

---

## NOUVEAUX ORGANES INTERNES (DEC-20260121-001)

| Module | Rôle | Phase |
|--------|------|-------|
| **SENTINEL** | Gouvernance, juges, audit, requêtes | 6 |
| **QUANTUM_TRUTH_MANAGER** | Multi-vérités | 9 |
| **NARRATIVE_FLOW_CONTROLLER** | Flux sanguin, greffes | 8 |
| **INTENT_LAYER** | Intention auteur | 7 |
| **READER_MODEL** | Profil lecteur (faible poids) | 16 |
| **STYLE_DEVIATION_MANAGER** | Mauvais style assumé | 13 |
| **TOKEN_METER** | Compteur ressources | 19 (transversal) |

---

## STATUTS

| Symbole | Signification |
|---------|---------------|
| ❌ ABSENT | Pas commencé |
| 📦 PRÉSENT | Code existe |
| 🧪 COUVERT | Tests existent |
| 🔒 PROUVÉ | Gate passé, figé |

---

## ÉTAT ACTUEL

| Phase | Statut |
|-------|--------|
| 0 | 🔒 PASS |
| 1-19 | ❌ ABSENT |

---

## DÉPENDANCES STRICTES (v2.0)

```
PHASE 0 ─────► PHASE 1 ─────► PHASE 2 ─────► PHASE 3 ─────► PHASE 4 ─────► PHASE 5
                                                                              │
                                                                              ▼
                                                          ┌─────────────────────────────┐
                                                          │ V4.4 CORE 🔒 FROZEN         │
                                                          └─────────────────────────────┘
                                                                              │
                                                                              ▼
                                                                         PHASE 6
                                                                         SENTINEL
                                                                              │
                                                                              ▼
                                                                         PHASE 7
                                                                         INTENT
                                                                              │
                    ┌──────────────┬──────────────────────────────────────────┤
                    ▼              ▼                                          │
                 PHASE 8       PHASE 9                                        │
                 MYCELIUM      GPS + QUANTUM                                  │
                 + FLOW                                                       │
                    │              │                                          │
                    └──────────────┴──────────────┐                           │
                                                  ▼                           │
                                             PHASE 10                         │
                                             MEMORY                           │
                                                  │                           │
                                                  ▼                           │
                                             PHASE 11                         │
                                             GENESIS                          │
                                                  │                           │
                                                  ▼                           │
                                             PHASE 12                         │
                                             SCRIBE                           │
                                                  │                           │
                                                  ▼                           │
                                             PHASE 13                         │
                                             POLISH + STYLE_DEV               │
                                                  │                           │
                                                  ▼                           │
                                             PHASE 14                         │
                                             AUTONOMY                         │
                                                  │                           │
                                                  ▼                           │
                                             PHASE 15                         │
                                             LICENSED                         │
                                                  │                           │
                    ┌──────────────┬──────────────┤                           │
                    ▼              ▼              ▼                           │
                 PHASE 16     PHASE 17       PHASE 18                         │
                 UI COCKPIT   UI MYCELIUM    UI STUDIO                        │
                 + READER                                                     │
                                                                              │
                                                                              │
                 PHASE 19 (parallèle après Phase 5) ◄─────────────────────────┘
                 BOOT/CALL/SAVE + TOKEN_METER
```

---

## RÈGLES

1. **Une phase n'existe que dans ce dossier ROADMAP/**
2. **Aucun plan externe n'est valide**
3. **Chaque phase a son fichier dédié**
4. **Pas de discussion sans référence au fichier**
5. **Gate PASS = seule condition pour avancer**
6. **Fin de discussion = décision écrite dans GOVERNANCE/DECISIONS/**

---

## RESOURCE GOVERNANCE

### Token Metering

Unités trackées:
- `token_input`
- `token_output`
- `token_total`
- `cost_estimate`
- `latency_estimate`

Granularité:
- Par module
- Par fonction
- Par commande CLI
- Par session
- Par jour (rolling)

Budgets:
- Budget session
- Budget jour
- Budget mode BOOST
- Budget par module (Scribe coûteux, analyse moins)

---

**Document mis à jour:** 21 janvier 2026
**Version:** 2.0 (Post-conception)
**Référence:** DEC-20260121-001
