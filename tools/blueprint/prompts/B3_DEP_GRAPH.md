**Réponse produite sous contrainte OMEGA — NASA-grade — aucune approximation tolérée.**

# 🔷 BLUEPRINT B3 — DEPENDENCY GRAPH (FULL) — TEXT-ONLY / DETERMINISTIC

## 0) Rôle / Autorité
Tu es **Claude Code** en mode **exécutant**.
- Autorité finale: **Francky**
- BUILD (A→C→Q) : **IMMUTABLE**
- GOUVERNANCE (D→J) : **OBSERVATION UNIQUEMENT**

## 1) Mission (B3)
Générer un **graphe complet des dépendances** du repo OMEGA, au format **texte uniquement** (Mermaid + JSON),
puis produire un **rapport de violations de couches** (layering/boundary).

Objectif: rendre le système **reconstructible comme une fusée** (structure + dépendances + frontières).

## 2) Write-Only Scope (OBLIGATOIRE)
Tu n’écris **QUE** dans:
- `nexus/blueprint/OMEGA_BLUEPRINT_PACK/`
- `tools/blueprint/`
Interdit d’écrire ailleurs.

## 3) Entrées autorisées (Read-Only)
- Tout le repo (read-only)
- Exclure: `node_modules/`, `dist/`, `coverage/`, `.git/`, outputs générés.

## 4) Sorties attendues (artefacts)
### 4.1 Graph global (Mermaid)
- `nexus/blueprint/OMEGA_BLUEPRINT_PACK/GRAPHS/repo_deps.mmd`

### 4.2 Graph par module (Mermaid)
- `nexus/blueprint/OMEGA_BLUEPRINT_PACK/GRAPHS/module_deps/<module_id>.mmd`

### 4.3 Rapport layering
- `nexus/blueprint/OMEGA_BLUEPRINT_PACK/GRAPHS/layering_report.json`

### 4.4 Index enrichi
- `nexus/blueprint/OMEGA_BLUEPRINT_PACK/BLUEPRINT_INDEX.json`
  - ajouter:
    - `graphs.repo_deps_path`
    - `graphs.module_deps_dir`
    - `graphs.layering_report_path`
    - `layering.boundary_rules[]`
    - `layering.violations[]`

### 4.5 Tests blueprint (déterminisme + invariants)
- `tools/blueprint/src/__tests__/b3-deps.test.ts`

## 5) Méthode (déterministe)
1. Utiliser un outil d’analyse de dépendances (ex: dependency-cruiser) pour générer une sortie JSON brute.
2. Construire un graphe normalisé:
   - nœuds triés alpha
   - arêtes triées alpha
   - suppression des doublons
   - exclusion des fichiers ignorés
3. Générer Mermaid:
   - `graph TD`
   - un identifiant stable par nœud (hash court ou slug)
   - labels lisibles (path relatif)
4. Découper par module:
   - module_id = règle stable (ex: préfixes `governance/`, `src/`, `packages/`, `nexus/`, `tools/`, etc.)
5. Évaluer les frontières et produire `layering_report.json`.

## 6) Boundary Rules (NON NÉGOCIABLE)
Les règles ci-dessous doivent être codées et évaluées; toute violation = finding.

- **RULE-BUILD-IMMUTABLE**:
  - Aucun fichier sous `governance/` ne doit dépendre (import runtime) d’un fichier sous BUILD certifié
  - Sauf **type-only import** explicitement détecté (`import type {...}`) si et seulement si le contrat l’autorise.
- **RULE-NON-ACTUATION-SURFACE**:
  - Aucun module governance ne doit importer des modules d’exécution/runner susceptibles d’actuer (process spawn, FS write)
  - Si import: flag CRITICAL.
- **RULE-TOOLS-ISOLATION**:
  - `tools/` peut lire, analyser, générer des artefacts, mais ne doit pas être dépendance runtime de `src/` ou `governance/`.

## 7) Invariants B3
- **INV-BP-05**: Text-only (Mermaid `.mmd` + JSON uniquement). **Aucun PNG/SVG/PDF.**
- **INV-BP-01**: Déterminisme (même commit → mêmes graphes/rapport → mêmes hashes).
- **INV-BP-08**: Frontière BUILD↔GOV vérifiée (violations listées et classées).

## 8) FAIL conditions
FAIL immédiat si:
- écriture hors scope write-only
- graph non déterministe (ordre non stable)
- binaire généré
- violation boundary détectée et non reportée

## 9) STOP conditions
STOP quand:
- tous les artefacts B3 existent
- tests B3 PASS
- `BLUEPRINT_INDEX.json` référencie les artefacts B3
- `layering_report.json` contient:
  - règles
  - liste violations (peut être vide)
  - métriques (nb nodes/edges/modules)

## 10) Format de sortie obligatoire
Ta réponse doit contenir:
- BILAN DE COMPRÉHENSION
- ACTIONS EFFECTUÉES
- ACTIONS REFUSÉES
- INVARIANTS VÉRIFIÉS
- RISQUES IDENTIFIÉS
- STATUT: PASS ou BLOCKED

--- END B3 ---
