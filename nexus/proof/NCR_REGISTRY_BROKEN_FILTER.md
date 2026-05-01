# NCR_REGISTRY_BROKEN_FILTER

**ID** : NCR_REGISTRY_BROKEN_FILTER
**Title** : Script générateur du registry NCR produit faux positifs massifs (~50/85)
**Status** : **OPEN_DIAGNOSED**
**Severity** : MEDIUM
**Priority** : P2
**Opened** : 2026-05-01 (Sprint S8 Phase 0 préflight, Cowork + 3-IA convergence)
**Owner** : Francky + Claude

---

## 1. Issue

Le registre `omega/outputs/NCR_REGISTRY_2026-04-29.csv` (généré 2026-04-29)
liste **85 entrées totales** mais seulement **~21-28 NCRs réels** parmi
elles. Les ~50-60 entrées restantes sont des **faux positifs** issus
d'un filtre de génération trop large :

- Fichiers de SDK Python (anthropic types `encrypted_*.py`, PyPDF2 `_encryption.py`)
- Cache Python (`.pyc` dans `__pycache__/`)
- Corpus narratifs (scènes Modiano `*.txt` avec mot "Encre")
- Features JSON corpus_r

Le script générateur a vraisemblablement scanné les fichiers via un
pattern grossier (filename match sur "encrypt", "ncr", "Encre",
"NCR") sans filtre de chemin ni filtre de contenu.

## 2. Preuves empiriques (collectées Sprint S8 Phase 0 préflight)

### EMP-1 — Volumétrie totale et ratio enrichissement

```powershell
$ Import-Csv omega/outputs/NCR_REGISTRY_2026-04-29.csv | Measure-Object
Count : 85

$ Import-Csv ... | Group-Object Status
71 entries with Status = UNKNOWN  (84%)
14 entries enriched (16%)
```

### EMP-2 — Distribution Status enrichie (14/85)

| Status | Count |
|--------|-------|
| OPEN | 6 |
| DOCUMENTED | 2 |
| DIAGNOSED | 1 |
| OPEN_DIAGNOSED | 1 |
| FIX_VALIDATED_SCOPED | 1 |
| CLOSED_CONFIRMED | 2 |
| RESOLVED | 1 |
| **UNKNOWN** | **71** |

### EMP-3 — Faux positifs identifiés par catégorie

| Catégorie | Pattern matché | Nombre approx. | Exemple |
|-----------|----------------|----------------|---------|
| Anthropic SDK encryption types | `encrypted_*.py` / `.pyc` | ~12 | `omega-autopsie/.venv311/Lib/site-packages/anthropic/types/encrypted_code_execution_result_block_param.py` |
| PyPDF2 encryption | `_encryption.py` / `.pyc` | 2 | `omega-autopsie/.venv311/Lib/site-packages/PyPDF2/_encryption.py` |
| Scènes Modiano (corpus narratif) | `Encre_*.txt` | ~25 | `omega-autopsie/scenes_v3/modiano/Encre Sympathiq_APEX.txt` |
| Features corpus_r | `*encre*.json` / `*encre*.txt` | 4-6 | `omega-autopsie/corpus_r/features/dencre_et_de_sang_french_edition_anna_briac.json` |
| Build artifacts | `dist/orchestrator/runCreate.*` | 4 | `packages/omega-runner/dist/orchestrator/runCreate.d.ts` |

Total faux positifs estimés : **~47-50 / 85**.

### EMP-4 — Vrais NCRs dans le repo

```powershell
$ (Get-ChildItem nexus/proof/ -Recurse -Filter "NCR_*.md").Count
21
```

Plus 3 NCRs hors filtre `*.md` standard :
- `nexus/proof/completeness/NCR-NEXUS-TRACE-001.md`
- `examples/runs/run_hostile_rejected/NCR_HOSTILE_NOT_REJECTED.md`
- `history/NCR_LOG.md`

Total NCRs réels : **~24** (à confirmer Vague 3).

### EMP-5 — Stale du registry (2 jours)

Le CSV est daté 2026-04-29 21:56. Or `NCR_CANON_ENGINE_JUNCTION_ORPHAN`
est passé en RESOLVED le **2026-05-01** (commit `ced89437`).

Le registry CSV affiche encore Status=DOCUMENTED pour cette NCR →
**registry désynchronisé du repo de 2 jours minimum**.

## 3. Impact

### 3.1 Pilotage automatique compromis

Tout outil consommant ce registry (dashboard, alerting, gating CI)
verra 85 entrées dont 84% UNKNOWN. Aucune décision automatisée
fiable possible.

### 3.2 Risque de faux scope

Lors d'un sprint NCR, si le scope est défini "tous les NCRs OPEN du
registry", l'opérateur peut inclure par erreur des fichiers Python SDK
ou corpus narratifs.

### 3.3 Confusion de catégorie

Mélanger fichiers de code (`encrypted_*.py`) et NCRs documentaires
(`NCR_*.md`) dans le même registre est une erreur de typage qui
peut induire en erreur même un humain.

## 4. Required fix (post-S8, Sprint S9+)

### 4.1 Filtre strict

Le script générateur doit utiliser **deux critères cumulatifs** :

```
1. Path glob : nexus/proof/NCR_*.md ∪ nexus/proof/**/NCR-*.md
2. Content match : présence d'un header "**Status** : ..." dans le fichier
```

### 4.2 Exclusions explicites

Liste noire à intégrer (priorité décroissante) :
- `**/.venv*/**` — environnements Python virtuels
- `**/__pycache__/**` — cache Python
- `**/*.pyc` — bytecode Python
- `**/dist/**` — build artifacts
- `**/node_modules/**` — sécurité (ne devrait jamais matcher)
- `omega-autopsie/scenes_*/**` — corpus narratifs
- `omega-autopsie/corpus_r/**` — features dataset
- `omega-autopsie/livre_cache/**` — cache textes

### 4.3 Traitement séparé sous-dossiers spéciaux

Trois sous-dossiers contiennent des "NCR-like" mais avec sémantique
différente :

| Sous-dossier | Sémantique | Traitement registre |
|--------------|------------|---------------------|
| `nexus/proof/completeness/` | NCR de complétude trace matrix | Catégorie `TRACE` séparée |
| `examples/runs/` | Exemples de runs (pas dette technique) | Exclure ou catégorie `EXAMPLE` |
| `history/` | Logs historiques de NCR (pas NCR actuel) | Exclure |

## 5. Hypothèses sur cause racine

### H1 — Glob trop large (le plus probable)

Le script utilise probablement `find` ou `Get-ChildItem -Recurse`
avec un pattern type `*NCR*` ou `*encrypt*` sans contrainte de path.

**Test S9+** : retrouver le script générateur (chercher dans `scripts/`,
`tools/`, ou pipeline CI) et lire son code.

### H2 — Pattern matching sur "encrypt" ou ngram court

Possible : le script accepte tout fichier dont le nom contient les
sous-chaînes `ncr`, `encrypt`, ou `Encre` (ce dernier matche 25+ scènes
Modiano qui parlent de "Encre Sympathique").

### H3 — Indexation oubliée du corpus R-PHYSICS

Possible : le corpus narratif Modiano (Phase R-PHYSICS) a été ajouté
au repo après la dernière calibration du script. Le script n'a jamais
été mis à jour pour exclure les nouveaux dossiers.

## 6. Plan d'action

| # | Action | Owner | Sprint | Statut |
|---|--------|-------|--------|--------|
| 1 | Drafter ce NCR | Claude | S8.V1 | **DONE** |
| 2 | Localiser script générateur du registry | Claude | S9+ | PENDING |
| 3 | Patcher filtre + exclusions §4 | Claude | S9+ | PENDING |
| 4 | Régénérer registry et valider | Claude | S9+ | PENDING |
| 5 | Décision Architecte sur traitement sous-dossiers §4.3 | Francky | S9+ | PENDING |

**Sprint S8 Vague 1 : DOCUMENTATION ONLY. Aucun fix.**

## 7. Traçabilité

- **Source** : Sprint S8 Phase 0 préflight 2026-05-01 (Cowork rapport ÉTAPE 2)
- **Découvert par** : énumération `Import-Csv NCR_REGISTRY_2026-04-29.csv`
- **NCRs liés** :
  - `NCR_CANON_ENGINE_JUNCTION_ORPHAN` (RESOLVED) — exemple de drift de status entre repo et CSV
  - Convention Plan Max v3.1.0 RECOVERY TEST DOCTRINE (à amender pour exiger registry sync)

## 8. Signature

```
NCR-ID    : NCR_REGISTRY_BROKEN_FILTER
OPENED    : 2026-05-01 (Sprint S8 Phase 0 préflight)
STATUS    : OPEN_DIAGNOSED — fix queued Sprint S9+
ARCHITECT : Francky
DRAFTER   : Claude (IA Principal)
STANDARD  : NASA-Grade L4 / DO-178C Level A
```
