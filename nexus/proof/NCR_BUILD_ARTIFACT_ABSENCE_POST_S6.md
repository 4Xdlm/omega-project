# NCR_BUILD_ARTIFACT_ABSENCE_POST_S6

**ID** : NCR_BUILD_ARTIFACT_ABSENCE_POST_S6
**Title** : 4 packages listés BUILT en S6.P2 absents de dist/ aujourd'hui (cause non tranchée)
**Status** : **OPEN_DIAGNOSED**
**Severity** : **P0_PROOF_INTEGRITY** (preuve CI/build cassée — Tribunal 3 IA 2026-05-01)
**Runtime severity** : **UNKNOWN** (impact runtime non encore prouvé)
**Disposition** : **DEFERRED_TO_S9** (capture S8, fix Sprint S9 dédié)
**Priority** : P0_PROVISIONAL
**Opened** : 2026-05-01 (Sprint S8 Vague 2 — découverte forensics F2)
**Refined** : 2026-05-01 (Sprint S8 V3 Étape 0 — Tribunal 3 IA convergence)
**Owner** : Francky + Claude

---

## 1. Résumé

Sprint S8 Vague 2 audit (post-classification NCR_BUILD_CASCADE_INCOMPLETE)
a découvert empiriquement que 4 packages listés comme BUILT pendant
Sprint S6.P2 (Build Cascade) sont actuellement SANS répertoire `dist/`.

## 2. Évidence empirique observée 2026-05-01

- 16/41 packages avec `dist/` présent (39%)
- 4 packages affectés :
  - `packages/contracts-canon/`
  - `packages/hardening/`
  - `packages/integration-nexus-dep/`
  - `packages/omega-segment-engine/`
- Ces 4 packages étaient revendiqués BUILT en S6.P2 documentation
- Tag `phase-s-s6-engine-runtime-restored-2026-04-27` (aca0f393) revendiquait
  cascade complète restaurée

## 3. Ce qui est PROUVÉ empiriquement

- Absence actuelle de `dist/` dans 4 packages (vérification Get-ChildItem)
- Référence S6.P2 ces 4 packages comme BUILT [À VÉRIFIER chemin doc exact]
- Cumul commits post-S6 : tags S6.1 + S7 + Sprint S8 Phase 0 + Vagues 1+2

## 4. Ce qui N'EST PAS prouvé (à investiguer)

- Cause racine de l'absence
- Caractère réversible ou non
- Impact runtime réel sur sovereign-engine (dépendances ?)
- Régression VS jamais commitée VS cleanup intentionnel

## 5. Hypothèses sur cause racine (NON tranchées)

- **H1** : `dist/` non versionné, généré pendant S6.P2 puis supprimé par cleanup ultérieur
- **H2** : Claim "BUILT" en S6.P2 trop large ou mal documentée
- **H3** : Build outputs présents en worktree/quarantaine puis perdus
- **H4** : Packages réellement non buildables aujourd'hui (régression code)
- **H5** : Packages non requis runtime, build incomplet volontaire post-S6.P2

## 6. Risques identifiés

- R1 : Runtime import futur sur ces packages → ERR_MODULE_NOT_FOUND
- R2 : CI false confidence (tag S6 revendique restauration complète)
- R3 : Tag `phase-s-s6-engine-runtime-restored-2026-04-27` potentiellement overclaimed
- R4 : Effet domino si autres packages dépendent de ces 4
- R5 : Régression silencieuse non détectée pendant 4+ jours

## 7. Tests requis pour trancher (Sprint S9+)

1. `git log --all -- "packages/<name>/dist/**"` pour chacun des 4 — vérifier traçabilité
2. Vérifier `.gitignore` pour pattern `dist/` (versionné ou non ?)
3. Lecture S6.P2 evidence pack (logs install + smoke runtime)
4. Rebuild ciblé `npm run build` sur les 4 packages — réussite ou échec ?
5. Test import runtime de chaque package depuis sovereign-engine
6. Audit dépendances cross-packages (qui importe quoi)

## 8. Décision actuelle

- **AUCUN fix dans cette vague** (Sprint S8 Vague 2)
- Investigation dédiée Sprint S9+ après Tribunal 3 IA (demain 2026-05-02)
- Statut maintenu OPEN_DIAGNOSED tant que cause racine non tranchée
- Sévérité POTENTIAL_P0 maintenue par précaution (downgrade autorisé après tests §7)

## 9. Lien Tribunal 3 IA prévu

Discussion stratégique demain :
- Sévérité réelle (P0 vs P1 vs P2 selon impact runtime confirmé)
- Action corrective (rebuild ciblé vs investigation profonde)
- Portée Sprint (urgence S9 immédiat vs S9+)

## 10. Doctrine

NCR OVER HEROICS — régression empirique capturée ouvertement, sans
panique ni minimisation. PROVE IT — observation factuelle, pas
conclusion forcée.

---

## 11. Tribunal 3 IA arbitrage (2026-05-01)

### 11.1 Convergence atteinte

Convergence Tribunal 3 IA (2026-05-01, post-capture C18) :
- **Gemini** : "P0_PROOF_INTEGRITY — preuve cassée, runtime non prouvé"
- **ChatGPT** : "Severity refined, deferred S9, capture suffit S8"
- **Cowork** : "Stratégie OPT_HYBRID — capture immédiate, investigation S9"

### 11.2 Refinement de sévérité

| Champ | Valeur initiale C18 | Valeur refinée Étape 0 | Justification |
|-------|---------------------|------------------------|---------------|
| Severity | POTENTIAL_P0 | **P0_PROOF_INTEGRITY** | Preuve CI/build empiriquement cassée (vérifiable), distincte d'un P0 brut |
| Runtime severity | (implicite POTENTIAL) | **UNKNOWN** | Impact runtime non encore mesuré (pas de bench prouvant les casses runtime) |
| Disposition | (implicite "S9+") | **DEFERRED_TO_S9** | Capture S8 = suffisante, fix nécessite sprint dédié S9 |

### 11.3 Distinction P0 vs P0_PROOF_INTEGRITY

P0 brut impliquerait : runtime production cassé, perte de fonctionnalité
critique, action immédiate.

P0_PROOF_INTEGRITY (nouvelle catégorie OMEGA) implique :
- Preuve CI ou build empiriquement cassée
- Confiance dans la documentation/scellage compromise
- Runtime peut être OK (UNKNOWN) ou KO — non discriminé
- Action : capture immédiate + investigation dédiée, **pas hotfix**

Cette distinction permet de capturer la gravité **doctrinale** (PROVE IT
violé par overclaim S6) sans déclencher un branle-bas runtime non justifié
empiriquement.

### 11.4 Action S8

**Aucun fix dans Sprint S8.**

- S8 V2 : capture C18 (déjà fait)
- S8 V3 Étape 0 : refinement sévérité (présent commit C19a)
- S8 V3 Étape 1+ : continue Vague 3 sur autres NCRs (F2 hors scope V3A-D)

### 11.5 Action S9 (déférée)

Tests §7 du présent NCR seront exécutés en Sprint S9 dédié :
1. `git log --all -- "packages/<name>/dist/**"` (4 packages)
2. `.gitignore` audit pour `dist/`
3. Lecture S6.P2 evidence pack
4. Rebuild ciblé (réussite ou échec)
5. Test import runtime depuis sovereign-engine
6. Audit dépendances cross-packages

### 11.6 Tag potentiel overclaimed (R3 reconfirmé)

Le tag `phase-s-s6-engine-runtime-restored-2026-04-27` reste **potentiellement
overclaimed**. Décision Tribunal 3 IA : ne PAS retirer ni modifier le tag
(immutabilité Phase Q), mais documenter explicitement l'overclaim post-fix
S9 dans un rider tag-side ou amendement NCR_S6_TAG_PREMATURE §11 si
confirmé.

### 11.7 Closure officielle Étape 0

```
REFINEMENT ÉTAPE 0 NCR_BUILD_ARTIFACT_ABSENCE_POST_S6
======================================================
Date            : 2026-05-01 (Sprint S8 V3 Étape 0)
Status          : OPEN_DIAGNOSED (inchangé)
Severity        : POTENTIAL_P0 → P0_PROOF_INTEGRITY (refined)
Runtime         : UNKNOWN (explicit)
Disposition     : DEFERRED_TO_S9 (explicit)
Authority       : Tribunal 3 IA convergence (Gemini + ChatGPT + Cowork)
                  + Architecte Francky
Action S8       : NONE (capture refinement only)
Action S9       : tests §7 (6 actions)
```
