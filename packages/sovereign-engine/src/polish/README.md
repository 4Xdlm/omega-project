# `src/polish/` — STATUT DES MODULES

**Résolution SSOT 2026-04-24** (audit nuit autonome Claude, post-commit `5351554b`).

Ce dossier regroupe **deux familles de modules distinctes** dont le statut diffère.
Cette page clarifie la contradiction apparente entre `CLAUDE.md` (qui marque
"Polish (NO-OP)" comme REJETÉ) et les imports actifs dans le code production.

---

## Famille 1 — Polish core (NO-OP dans pipeline LLM, ACTIF en pipeline offline)

| Fichier | Exports principaux | Statut `engine.ts` (pipeline LLM) | Statut `sovereign-pipeline.ts` (pipeline offline) |
|---------|---------------------|-----------------------------------|---------------------------------------------------|
| `musical-engine.ts` | `polishRhythm`, `applyMusicalPolishOffline` | **COMMENTÉ** ligne 44 (NO-OP proven delta 0.0) | **ACTIF** (variante Offline consommée) |
| `anti-cliche-sweep.ts` | `sweepCliches`, `sweepClichesOffline` | **COMMENTÉ** ligne 45 | **ACTIF** (variante Offline consommée) |
| `signature-enforcement.ts` | `enforceSignature`, `enforceSignatureOffline` | **COMMENTÉ** ligne 46 | **ACTIF** (variante Offline consommée) |

**Rationale engine.ts ligne 43** :
> `★ Sprint 2: Polish DISABLED — proven NO-OP (delta 0.0 on ALL runs)`

Polish core a été désactivé dans le pipeline LLM principal après mesure empirique :
son application ne changeait pas le score prose (delta 0.0). Les 3 imports sont
commentés pour préserver le code au cas où un futur sprint le réactive.

**Rationale sovereign-pipeline.ts** (ligne 8-12) :
> Full offline E2E pipeline: ForgePacket → DeltaComputer → SovereignLoop →
> SOracle V2 → AntiClicheSweep → MusicalPolish → SignatureEnforcer →
> SOracle V2 final → SEAL or REJECT.
> **0 LLM — 100% deterministic — OFFLINE-HEURISTIC.**

Dans le pipeline **offline** (sans appels LLM, pour validation déterministe), les
variantes `*Offline` des 3 modules Polish restent opérationnelles. Elles sont
consommées par :
- `src/validation/validation-runner.ts` (validation phase S/U)
- `tests/e2e/sovereign-pipeline.test.ts` (tests E2E)
- `tests/gates/gate-phase-s-invariants.test.ts` (gate invariants)

**Conclusion Famille 1** : **NO-OP en production LLM, ACTIF en mode offline**. Ne pas supprimer.

---

## Famille 2 — Modules Polish distincts (ACTIFS en production)

| Fichier | Statut | Consommateur |
|---------|--------|--------------|
| `targeted-patch.ts` (`runTargetedPatch`, `isTargetedPatchActive`) | **ACTIF** | `engine.ts` ligne 650 (P5 pipeline final) |
| `sentence-surgeon.ts` | **ACTIF** | 3 consommateurs (non-polish interne) |
| `paragraph-patch.ts` | **ACTIF** | 2 consommateurs |
| `re-score-guard.ts` | **ACTIF** | 1 consommateur |

Ces modules sont **nommés "polish"** par organisation historique mais ne sont PAS
le Polish core NO-OP. Ils ont leur propre statut (P5 Targeted Patch, etc.) et
sont actifs en production.

---

## Résolution de la contradiction SSOT

**CLAUDE.md (workspace Francky)** dit :
> Composants REJETÉS (ne pas utiliser) :
>   - Polish (NO-OP)

**Interprétation correcte** :
- **Vrai** pour le Polish core en pipeline LLM (`polishRhythm`, `sweepCliches`,
  `enforceSignature` dans `engine.ts`)
- **Faux** pour :
  - Les variantes `*Offline` consommées par `sovereign-pipeline.ts`
  - Les modules Famille 2 (targeted-patch, sentence-surgeon, etc.)

**Action recommandée** : **PAS de suppression de code**. Le dossier `src/polish/`
contient du code encore utilisé même si son cœur LLM est NO-OP.

Si on voulait vraiment nettoyer :
- **Supprimer les 3 imports commentés** dans `engine.ts` (lignes 44-46) — purement cosmétique
- **Ajouter dans CLAUDE.md workspace** la nuance "Polish core = NO-OP LLM, variantes Offline et modules distincts actifs"
- **Décider plus tard** si `sovereign-pipeline.ts` offline reste utile ou doit être archivé

---

## Audit SHA256 des fichiers polish/ (à jour au 2026-04-24)

*Non inclus ici — à générer via `Get-FileHash` si evidence pack requis.*

---

**Auteur** : Claude (audit nuit autonome post-Task #31 scellage r4)
**Parent** : commit `5351554b` (NCR_DEDALE_RESET_HEALTH validated r4)
**Pattern** : **SSOT ne tranche pas, SSOT nuance**. Une étiquette "REJETÉ" sur un dossier
multi-modules doit être raffinée par module. Un label binaire sur une
réalité graduée produit confusion (cas de CLAUDE.md ici).
