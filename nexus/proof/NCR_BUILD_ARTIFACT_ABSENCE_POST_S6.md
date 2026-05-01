# NCR_BUILD_ARTIFACT_ABSENCE_POST_S6

**ID** : NCR_BUILD_ARTIFACT_ABSENCE_POST_S6
**Title** : 4 packages listés BUILT en S6.P2 absents de dist/ aujourd'hui (cause non tranchée)
**Status** : **OPEN_DIAGNOSED**
**Severity** : **POTENTIAL_P0** (à confirmer ou downgrader Sprint S9+)
**Priority** : P0_PROVISIONAL
**Opened** : 2026-05-01 (Sprint S8 Vague 2 — découverte forensics F2)
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
