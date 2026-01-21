# OMEGA — PHASES 6-17: POST-V4.4 CORE

## Prérequis: V4.4 CORE 🔒 FROZEN (Phase 5 PASS)

---

# PHASE 6: MYCELIUM V1 (CARTE ADN)

## Statut: ❌ ABSENT (bloqué par Phase 5)

### Objectif
Produire la **carte émotionnelle** standardisée d'un texte analysé.

### Modules
- `mycelium-generator` — Extraction ADN
- `mycelium-schema` — Format standardisé
- `mycelium-render` — Rendu visuel

### Livrables
- ADN du livre (branche principale = boussole émotion)
- Branches secondaires (taille = longueur phrases)
- Couleur = tension (vive/sombre)
- Marqueurs "relances" (nouveau champignon)
- Export JSON + image

### Gate 6
- Déterministe (même input → même Mycelium)
- Export JSON valide
- Rendu visuel fonctionnel

### Perf ✅
Rendu, cache, génération batch

---

# PHASE 7: GPS NARRATIF V1

## Statut: ❌ ABSENT (bloqué par Phase 5)

### Objectif
Proposer des **directions** + prédire **conséquences émotionnelles**.
**LE GPS NE GÉNÈRE PAS DE TEXTE.**

### Modules
- `gps-narratif-core` — Moteur de trajectoire
- `potards-engine` — Sliders émotionnels
- `trajectory-predictor` — Prédiction

### Livrables
- 3-5 directions max
- Conséquences prédites
- Alertes incohérence
- Recalcul temps réel

### Gate 7
- GPS ne génère AUCUN texte
- Prédictions traçables
- Potards fonctionnels

### Perf ✅
Latence, recalcul incrémental

---

# PHASE 8: MEMORY & CANON

## Statut: ❌ ABSENT (bloqué par Phase 5)

### Objectif
Mémoire relationnelle + canon pour éviter erreurs de saga.

### Modules
- `canon-manager` — Faits figés
- `memory-store` — Entités/événements
- `continuity-checker` — Détection contradictions
- `retrieval-engine` — RAG interne

### Livrables
- Extraction entités/relations
- Canon "hard facts"
- Détection contradictions
- Injection contexte maîtrisée

### Gate 8
- Tests de continuité PASS
- Détection contradiction fonctionnelle

### Perf ✅
Index, cache, stratégie retrieval

---

# PHASE 9: GENESIS (PLANIFICATION)

## Statut: ❌ ABSENT (bloqué par Phase 8)

### Objectif
Créer **plans, beats, arcs** (zéro prose finale).

### Modules
- `genesis-planner` — Moteur de planification
- `beat-sheet-builder` — Construction beats
- `arc-engine` — Gestion arcs

### Livrables
- Outline complet piloté par V4.4 (60%)
- Choix de trajectoires via GPS
- Checkpoints décisionnels

### Gate 9
- Plan cohérent
- Conformité V4.4 prouvée
- Canon respecté

### Perf ✅
Simulation trajectoires, pruning

---

# PHASE 10: SCRIBE (GÉNÉRATION)

## Statut: ❌ ABSENT (bloqué par Phase 9)

### Objectif
Produire du **texte conforme** aux plans + loi émotionnelle.

### Modules
- `scribe-generator` — Génération
- `style-controller` — Contrôle style
- `constraint-enforcer` — Garde-fous

### Livrables
- Génération chapitre/scène
- Respect plan Genesis
- Respect V4.4 (preuves)
- Anti-dérive

### Gate 10
- Tests cohérence émotionnelle PASS
- Canon respecté
- Traçabilité plan → texte

### Perf ✅
Pipeline, batching, multi-pass

---

# PHASE 11: POLISH (AMÉLIORATION)

## Statut: ❌ ABSENT (bloqué par Phase 10)

### Objectif
Améliorer **sans casser l'ADN**.

### Modules
- `polish-engine` — Amélioration
- `consistency-rewriter` — Cohérence
- `style-refiner` — Style

### Livrables
- Correction continuité
- Resserrage tension
- Optimisation rythme
- Comparaison avant/après

### Gate 11
- Mycelium stable (dans les limites)
- V4.4 toujours conforme

### Perf ✅
Diffs, scoring, multi-iterations

---

# PHASE 12: MODES INDUSTRIELS

## Statut: ❌ ABSENT (bloqué par Phase 11)

### Objectif
Production en boucle avec points de contrôle.

### Modules
- `autonomy-orchestrator` — Orchestration
- `checkpoint-manager` — Validation
- `quality-gates` — Contrôle qualité

### Modes
| Mode | Description |
|------|-------------|
| Assisté | Temps réel + potards |
| Semi-autonome | Validation checkpoints |
| Autonome | Production complète |

### Gate 12
- Logs complets
- Preuve chaque décision

### Perf ✅
Orchestration, parallélisation

---

# PHASE 13: EXTENSION UNIVERS (LICENSE-GATED)

## Statut: ❌ ABSENT (bloqué par Phase 12)

### Objectif
Analyser/étendre univers existant **si droits**.

### Modules
- `license-flag-system` — Blocage machine-level
- `universe-adapter` — Adaptation univers
- `style-universe-model` — Modèle style

### Règle Absolue
```
if (licenseProof === null) {
  mode = 'ANALYSIS_ONLY';
  generation = BLOCKED;
}
```

### Gate 13
- Blocage automatique sans licence
- Génération sous licence uniquement

### Perf ✅
Ingestion corpus, index

---

# PHASE 14: UI COCKPIT

## Statut: ❌ ABSENT (bloqué par Phase 5)

### Objectif
Pilotage sans lire 200 fichiers.
**L'UI NE MODIFIE RIEN, ELLE MONTRE.**

### Écrans
- Boot status (SSOT, version, freeze)
- Pipeline runs + résultats
- Proofs + hashes
- État modules (absent/présent/couvert/prouvé)

### Gate 14
- Lecture seule
- Fidèle à l'état réel

### Perf ✅
UX, chargement, index

---

# PHASE 15: UI MYCELIUM VISUAL

## Statut: ❌ ABSENT (bloqué par Phase 6)

### Objectif
Visualisation ADN du livre + comparaison.

### Gate 15
- Rendu fidèle au générateur
- Comparaison fonctionnelle

### Perf ✅
Rendu, zoom, export

---

# PHASE 16: UI WRITING STUDIO

## Statut: ❌ ABSENT (bloqué par Phase 7 + 10)

### Objectif
Écriture assistée avec potards + GPS + preview mycelium.

### Gate 16
- L'utilisateur pilote
- OMEGA propose/avertit
- Pas de magie cachée

### Perf ✅
Latence temps réel

---

# PHASE 17: BOOT/CALL/SAVE (ANTI-RECONSTRUCTION)

## Statut: ❌ ABSENT (parallèle possible après Phase 5)

### Objectif
Démarrer chaque discussion avec état complet + appels ciblés.
**PLUS JAMAIS DE RE-UPLOAD MASSIF.**

### Scripts
- `OMEGA_BOOT.ps1` — Snapshot canonique
- `OMEGA_CALL.ps1` — Appels ciblés
- `OMEGA_SAVE.ps1` — Clôture session

### Structure
```
omega_internal_save/
└── sessions/
    └── SES-YYYYMMDD-HHMMSS/
        ├── BOOT/
        ├── CALLS/
        ├── NOTES/
        └── HASHES/
```

### Gate 17
- Zéro re-upload massif
- État complet en 1 commande
- Append-only

### Perf ✅
Rapidité BOOT, granularité CALL

---

## RÉSUMÉ DÉPENDANCES

```
V4.4 CORE (Ph 0-5) ────► MYCELIUM (Ph 6) ────► UI MYCELIUM (Ph 15)
         │
         ├──────────────► GPS (Ph 7) ──────────────┐
         │                                          │
         ├──────────────► MEMORY (Ph 8) ───► GENESIS (Ph 9) ───► SCRIBE (Ph 10) ───► POLISH (Ph 11)
         │                                                                                    │
         │                                                                                    ▼
         │                                                              AUTONOMY (Ph 12) ───► LICENSED (Ph 13)
         │
         ├──────────────► UI COCKPIT (Ph 14)
         │
         └──────────────► BOOT/CALL (Ph 17)

UI STUDIO (Ph 16) ◄─── GPS + SCRIBE
```

---

**Tous les fichiers détaillés seront créés au fur et à mesure des phases.**
