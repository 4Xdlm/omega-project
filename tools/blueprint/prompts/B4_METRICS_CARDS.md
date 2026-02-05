**Réponse produite sous contrainte OMEGA — NASA-grade — aucune approximation tolérée.**

# 🔷 BLUEPRINT B4 — METRICS & MODULE CARDS (FULL) — FACTUAL / NO-SPECULATION

## 0) Rôle / Autorité
Tu es **Claude Code** en mode exécutant.
- BUILD : immuable (SEALED)
- GOUVERNANCE : observation uniquement
- Décision finale: Francky

## 1) Mission (B4)
Produire les **métriques complètes** par module et finaliser les **module cards** comme un dossier avionique:
- Mesures: LOC, bytes, nb fichiers, nb exports, nb types, nb fonctions, nb tests, densité tests, dépendances
- Zéro spéculation: uniquement des faits calculés ou extraits du repo.

## 2) Write-Only Scope
Écriture **UNIQUEMENT** dans:
- `nexus/blueprint/OMEGA_BLUEPRINT_PACK/`
- `tools/blueprint/`

## 3) Sorties attendues
### 3.1 Metrics par module
- `nexus/blueprint/OMEGA_BLUEPRINT_PACK/MODULES/<module_id>/metrics.json` (enrichi)
Champs minimaux:
- files_count
- bytes_total
- loc_total (code/comment/blank si dispo)
- exports_count
- types_count
- functions_count
- tests_count
- test_files_count
- deps_in_count / deps_out_count
- governance_flag (bool)
- build_flag (bool)

### 3.2 Module cards finalisées (FACT ONLY)
- `nexus/blueprint/OMEGA_BLUEPRINT_PACK/MODULES/<module_id>/module_card.md`
Sections obligatoires:
- Scope (paths)
- Purpose (déduit uniquement via noms/exports/docs existants)
- Public API summary (liste exports)
- Constraints (ex: non-actuation si governance)
- Limits (déduit via absence/presence de fonctions, pas d’invention)
- Evidence (liens vers artefacts: api_surface/types/functions/tests/invariants)

Interdiction lexicale:
- Interdit: “peut-être”, “probablement”, “on pourrait”, “idéalement”
- Autorisé: “Présent dans le repo”, “Exporté”, “Testé par”, “Référencé par”

### 3.3 Hotspots + Overview
- `nexus/blueprint/OMEGA_BLUEPRINT_PACK/GRAPHS/hotspots.json`
Contenu:
- top N modules par LOC
- top N par deps_out
- top N par tests_count (densité)
- outliers (modules très gros sans tests)

### 3.4 Index enrichi
- `nexus/blueprint/OMEGA_BLUEPRINT_PACK/BLUEPRINT_INDEX.json`
  - ajouter `metrics.hotspots_path`
  - ajouter pour chaque module les counts clés et chemins

### 3.5 Tests
- `tools/blueprint/src/__tests__/b4-metrics.test.ts`
Tests minimaux:
- output trié/déterministe
- metrics présents pour tous modules
- module_card.md sans mots interdits (regex)
- hotspots.json stable

## 4) Invariants B4
- INV-BP-01 Déterminisme (ordre stable)
- INV-BP-06 Métriques sourcées (aucune valeur inventée)
- INV-BP-04 Index reconstructible (tous chemins existent)

## 5) FAIL conditions
- Toute spéculation textuelle détectée dans module_card.md → FAIL
- metrics absentes ou non cohérentes → FAIL
- écriture hors write-only scope → FAIL

## 6) STOP conditions
- Tous `metrics.json` + `module_card.md` présents
- `hotspots.json` présent
- tests B4 PASS
- index enrichi OK

## 7) Format de sortie obligatoire
- BILAN DE COMPRÉHENSION
- ACTIONS EFFECTUÉES
- ACTIONS REFUSÉES
- INVARIANTS VÉRIFIÉS
- RISQUES IDENTIFIÉS
- STATUT: PASS ou BLOCKED

--- END B4 ---
