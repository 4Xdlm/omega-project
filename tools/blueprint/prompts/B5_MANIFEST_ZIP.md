**Réponse produite sous contrainte OMEGA — NASA-grade — aucune approximation tolérée.**

# 🔷 BLUEPRINT B5 — MANIFEST & ZIP (FULL) — SEAL / REPRODUCIBLE

## 0) Rôle / Autorité
Exécutant Claude Code. Aucun pouvoir décisionnel.

## 1) Mission (B5)
Sceller le BLUEPRINT PACK:
- produire un manifest SHA256 exhaustif (trié)
- produire les preuves légales (méthode + scope + exclusions)
- produire un ZIP reproductible du pack
- vérifier reproductibilité par double build (hash identique)

## 2) Write-Only Scope
Écriture **UNIQUEMENT** dans:
- `nexus/blueprint/`
- `tools/blueprint/`

## 3) Sorties attendues
- `nexus/blueprint/OMEGA_BLUEPRINT_PACK/MANIFEST/BLUEPRINT_MANIFEST.sha256`
  - format: `sha256  relative_path`
  - tri alpha strict sur `relative_path`
  - newline `\n` final

- `nexus/blueprint/OMEGA_BLUEPRINT_PACK/MANIFEST/LEGAL_EVIDENCE.md` (final)
  Inclure:
  - commit id
  - méthode de génération
  - exclusions (node_modules/dist/coverage/.git)
  - déterminisme (tri + normalisation)
  - limites (structure snapshot ≠ transfert de droits)

- `nexus/blueprint/OMEGA_BLUEPRINT_PACK_<commit>.zip`
  - ZIP des contenus de `OMEGA_BLUEPRINT_PACK/`
  - entries triées
  - timestamps neutralisés si possible (ou déclarés)
  - pas de fichiers temporaires

- `tools/blueprint/src/__tests__/b5-manifest.test.ts`
  Tests:
  - manifest complet (référence tous fichiers pack)
  - tri strict
  - double run: ZIP_SHA256 identique (ou BLOCKED si OS empêche)
  - index + manifest hash imprimables

## 4) Invariants B5
- INV-BP-09: SHA256 pour chaque fichier du pack
- INV-BP-10: ZIP reproductible (double build)
- INV-BP-01: déterminisme ordre/format

## 5) FAIL conditions
- manifest non trié
- manifest incomplet
- zip non stable sans justification technique documentée
- écriture hors scope

## 6) STOP conditions
- manifest OK
- legal evidence final
- zip produit
- tests B5 PASS

## 7) Format de sortie obligatoire
- BILAN DE COMPRÉHENSION
- ACTIONS EFFECTUÉES
- ACTIONS REFUSÉES
- INVARIANTS VÉRIFIÉS
- RISQUES IDENTIFIÉS
- STATUT: PASS ou BLOCKED

--- END B5 ---
