# OMEGA CONSCIOUSNESS — Templates & Tools

## 📦 Contenu du Pack

Ce pack contient tout le nécessaire pour implémenter OMEGA CONSCIOUSNESS:

```
omega_templates/
├── OMEGA_CONSCIOUSNESS_SUPREME_CONCEPTION.md   # La conception complète (7 couches)
├── invariants.yaml                              # 42 invariants organisés par catégorie
├── gates.yaml                                   # 12 gates (P0 à P3) avec checks
├── kb_schema.json                               # Schéma JSON de la Knowledge Base
├── omega-consciousness.ps1                      # Script PowerShell unifié
└── README.md                                    # Ce fichier
```

## 🚀 Installation Rapide

```powershell
# 1. Extraire le ZIP dans votre repo OMEGA
Expand-Archive -Path "omega_templates.zip" -DestinationPath "C:\Users\elric\omega-project\" -Force

# 2. Copier les templates vers le bon emplacement
cd C:\Users\elric\omega-project\omega
New-Item -ItemType Directory -Force -Path "tools/omega-consciousness"
Copy-Item -Path "omega_templates\*" -Destination "tools/omega-consciousness\" -Recurse

# 3. Premier run (Quick mode)
.\tools\omega-consciousness\omega-consciousness.ps1 -Mode Quick

# 4. Run complet (Full mode)
.\tools\omega-consciousness\omega-consciousness.ps1 -Mode Full -Title "Premier snapshot"
```

## 📋 Les 7 Couches d'OMEGA CONSCIOUSNESS

| # | Couche | Description | Auto-généré |
|---|--------|-------------|-------------|
| 1 | **FACTUELLE** | Ce qui EST (code, tests, métriques) | 95% |
| 2 | **RELATIONNELLE** | Comment ça INTERAGIT (graphes, flux) | 80% |
| 3 | **CONTRACTUELLE** | Ce qui DOIT être vrai (invariants) | 20% |
| 4 | **COGNITIVE** | Le POURQUOI (mission, morale) | 0% |
| 5 | **IMMUNITAIRE** | Le GARDIEN (détection, correction) | 90% |
| 6 | **TEMPORELLE** | Mémoire & Prédiction | 70% |
| 7 | **GÉNÉTIQUE** | Réplication pour autres projets | 60% |

## 🎚️ Les Gates (Barrières de Protection)

### P0 — STOP SHIP (Bloquantes)
- `GATE-P0-TRUTH-SYNC` — Version doc = version code
- `GATE-P0-BUILD-DETERMINISM` — Build reproductible
- `GATE-P0-SECURITY-BASELINE` — Pas de faille critique

### P1 — CRITIQUES
- `GATE-P1-ARCH-INTEGRITY` — Architecture cohérente
- `GATE-P1-ROBUSTNESS` — Code robuste
- `GATE-P1-KNOWLEDGE-SYNC` — KB à jour

### P2 — MAJEURES
- `GATE-P2-QUALITY` — Qualité code
- `GATE-P2-SECURITY-ADVANCED` — Sécurité avancée
- `GATE-P2-CROSS-PLATFORM` — Windows/Linux
- `GATE-P2-TEMPORAL` — Pas de dégradation

### P3 — MODÉRÉES
- `GATE-P3-OBSERVABILITY` — Logs et diagnostics
- `GATE-P3-DOCUMENTATION` — Doc complète

## 📊 Les 42 Invariants

Organisés en 8 catégories:

| Catégorie | Invariants | Exemples |
|-----------|------------|----------|
| TRUTH | 5 | Version sync, test count, hash |
| ARCHITECTURE | 5 | Cycles, layers, exports |
| ROBUSTNESS | 7 | Input validation, determinism |
| SECURITY | 6 | Secrets, vulns, injection |
| TESTS | 5 | Flaky, coverage, regression |
| KNOWLEDGE | 5 | Module fiches, catalog |
| OBSERVABILITY | 3 | Logs, exit codes |
| TEMPORAL | 2 | Trends, predictions |

## 🔧 Commandes du Script

```powershell
# Aide
.\omega-consciousness.ps1 -Help

# Quick snapshot (Facts + Gates)
.\omega-consciousness.ps1 -Mode Quick

# Full snapshot (7 couches)
.\omega-consciousness.ps1 -Mode Full

# Audit complet avec findings
.\omega-consciousness.ps1 -Mode Audit

# Options
-Title "description"   # Titre personnalisé
-SkipTests            # Sauter les tests (plus rapide)
-Push                 # Push vers remote après
-Verbose              # Sortie détaillée
```

## 📁 Structure d'un Snapshot

```
OMEGA_SNAPSHOTS/SNAP_<timestamp>_<sha>/
├── 00_IDENTITY/          # Qui suis-je?
│   ├── IDENTITY.json     # SHA, versions, métadonnées
│   └── ROOT_HASH.txt     # Hash global
├── 10_EVIDENCE/          # Preuves brutes
│   ├── commands.log      # Toutes les commandes
│   └── reports/          # Lint, tests, coverage, audit
├── 20_FACTS/             # Couche 1 — Ce qui EST
│   ├── dependency_graph.json
│   ├── module_inventory.json
│   └── test_inventory.json
├── 30_RELATIONS/         # Couche 2 — Interactions
├── 40_CONTRACTS/         # Couche 3 — Invariants
├── 50_COGNITION/         # Couche 4 — Pourquoi
├── 60_IMMUNITY/          # Couche 5 — Gardien
│   └── gate_results.json # Résultats des gates
├── 70_TEMPORAL/          # Couche 6 — Temps
├── 80_GENETICS/          # Couche 7 — Réplication
├── 90_FINDINGS/          # Tous les problèmes
│   └── GATES.md          # Rapport des gates
├── A0_KNOWLEDGE_BASE/    # La Bible complète
├── B0_REMEDIATION/       # Plan de correction
└── Z0_META/              # Checksums
    └── ROOT_HASH.txt     # Hash intégrité
```

## 🔗 Intégration avec le Save Vivant Existant

Le script `omega-consciousness.ps1` est conçu pour s'intégrer avec le système de save vivant OMEGA existant. Vous pouvez:

1. L'appeler depuis `omega-save.ps1` existant
2. L'utiliser en parallèle
3. Le fusionner avec vos scripts existants

## 📈 Prochaines Étapes

1. **Phase 1** — Exécuter un premier snapshot Quick
2. **Phase 2** — Corriger les gates P0 qui échouent
3. **Phase 3** — Ajouter les fiches modules (A0_KNOWLEDGE_BASE)
4. **Phase 4** — Enrichir la couche cognitive (50_COGNITION)
5. **Phase 5** — Activer les gates P1/P2

## 🆘 Support

Si vous avez des questions, demandez à Claude!

---

**OMEGA CONSCIOUSNESS v1.0.0**
*"Ce qui se comprend soi-même ne peut pas mourir."*
