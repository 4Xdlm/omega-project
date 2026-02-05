**Réponse produite sous contrainte OMEGA — NASA-grade — aucune approximation tolérée.**

# 🟥 STANDARD S0 — EMOTIONAL DNA IR v1.0 (FULL) — INDUSTRIAL STANDARD PACK

## 0) Mission
Définir et produire le **STANDARD ADN ÉMOTIONNEL** comme un standard industriel:
- IR (Intermediate Representation) machine-first
- JSON Schema officiel + versioning
- Validator TypeScript (strict, déterministe)
- Contrat légal (licence / usage / limites) + annexes
- Manifest SHA256 + ZIP

## 1) Write-Only Scope
Écriture **UNIQUEMENT** dans:
- `nexus/standards/EMOTIONAL_DNA_v1.0/`
- `tools/standards/` (si nécessaire)
Interdit d’écrire ailleurs.

## 2) Sorties attendues (arbres)
Créer exactement:

- `nexus/standards/EMOTIONAL_DNA_v1.0/IR/EMOTIONAL_DNA_IR_SCHEMA.json`
- `nexus/standards/EMOTIONAL_DNA_v1.0/IR/EMOTIONAL_DNA_IR_SPEC.md`
- `nexus/standards/EMOTIONAL_DNA_v1.0/IR/validator.ts`
- `nexus/standards/EMOTIONAL_DNA_v1.0/IR/validator.test.ts`
- `nexus/standards/EMOTIONAL_DNA_v1.0/LEGAL/EMOTIONAL_DNA_CONTRACT_v1.0.md`
- `nexus/standards/EMOTIONAL_DNA_v1.0/LEGAL/ANNEX_A_MATHEMATICAL_MODEL.md`
- `nexus/standards/EMOTIONAL_DNA_v1.0/LEGAL/ANNEX_B_INVARIANTS.md`
- `nexus/standards/EMOTIONAL_DNA_v1.0/LEGAL/ANNEX_C_CONFORMITY_TESTS.md`
- `nexus/standards/EMOTIONAL_DNA_v1.0/LEGAL/ANNEX_D_COMPATIBILITY_MATRIX.md`
- `nexus/standards/EMOTIONAL_DNA_v1.0/MANIFEST/STANDARD_MANIFEST.sha256`
- `nexus/standards/EMOTIONAL_DNA_STANDARD_v1.0_<commit>.zip`

## 3) Contraintes (non négociables)
- Zéro “magic numbers” non sourcés: toute constante doit être:
  - déclarée comme paramètre, OU
  - définie comme “calibrated at runtime”, OU
  - justifiée dans ANNEX A.
- Déterminisme: même input IR → même output (hashable).
- Non-actuation: le standard ne déclenche aucune action; c’est une description + validation.
- Compatibilité: règles explicites d’évolution (semver ou équivalent) dans ANNEX D.

## 4) IR — exigences minimales
L’IR doit permettre:
- identité d’œuvre (id, title, language, version)
- axes émotionnels (vecteur stable, dimension définie)
- signatures de style (rythme, densité, registre, etc.) si mesurables
- contraintes (tabous, intensités, arcs)
- provenance (source, licence, consentement)
- preuves (hashes des inputs analysés)
- compatibilité (version ranges)

Tous champs doivent être:
- typés
- validables
- JSON-serializable
- triables (ordre stable)

## 5) Tests de conformité (ANNEX C + validator.test.ts)
Inclure:
- cas valides minimaux
- cas invalides (schéma, types, ranges, champs manquants)
- stabilité hash sur canonicalization (si défini)
- compatibilité version (ANNEX D)

## 6) Manifest & ZIP
- SHA256 trié sur paths relatifs
- ZIP reproductible si possible, sinon documenter limites OS

## 7) STOP
STOP quand:
- tous fichiers existent
- tests validator PASS
- manifest présent
- zip présent

## 8) Format de sortie obligatoire
- BILAN DE COMPRÉHENSION
- ACTIONS EFFECTUÉES
- ACTIONS REFUSÉES
- INVARIANTS VÉRIFIÉS
- RISQUES IDENTIFIÉS
- STATUT: PASS ou BLOCKED

--- END S0 ---
