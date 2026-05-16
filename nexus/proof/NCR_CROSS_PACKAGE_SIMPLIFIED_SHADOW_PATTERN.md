# NCR_CROSS_PACKAGE_SIMPLIFIED_SHADOW_PATTERN

**ID** : NCR_CROSS_PACKAGE_SIMPLIFIED_SHADOW_PATTERN
**Title** : Pattern méta umbrella — sovereign-engine cast shapes simplifiées sur types officiels omega-forge, créant drift type/runtime + bugs silencieux
**Status** : **RESOLVED_FOR_2_CASES_PATTERN_DOCUMENTED**
**Severity** : **HIGH** (pattern récurrent, risque bugs runtime silencieux)
**Priority** : P1
**Opened** : 2026-05-16 (audit nuit autonome post-P3.1.1)
**Resolved partial** : 2026-05-16 commit `8b29db69` (P3.1.3 LawComplianceSimplified) + commit suivant (P3.1.2 TrajectoryAnalysisWrapper)
**Owner** : Francky + Claude

---

## 1. Résumé

Pattern méta identifié pendant audit nuit autonome 2026-05-15→16 sur 2 cas du Mini-Tribunal Phase 3.1 :

- **P3.1.2 TrajectoryDeviation** : `sovereign-engine.PhysicsAuditResult.trajectory_analysis` était typé `TrajectoryAnalysis` (omega-forge direct), mais le runtime construisait un wrapper `{ prescribed, actual, deviations: TrajectoryAnalysis }`. Cast `: TrajectoryAnalysis` faux mais toléré. Bug runtime silencieux : code accédait `.average_cosine` (faux nom) → `undefined` → `Number.isFinite(undefined)=false` → fallback `0` → **`trajectory_compliance: {cosine_avg: 0, euclidean_avg: 0}` permanent depuis commit non identifié.**

- **P3.1.3 LawComplianceReport** : `sovereign-engine` construisait `{ violations, total_checks, compliance_ratio }` (3 props) mais castait `: LawComplianceReport` (10 props omega-forge). 0% overlap entre shape construite et type déclaré.

Les 2 cas partagent un **anti-pattern identique** : sovereign-engine veut une shape simplifiée pour son usage interne mais réutilise le nom du type officiel d'omega-forge.

## 2. Évidence empirique observée 2026-05-16

### Cas P3.1.2 (root cause runtime bug)

```ts
// [REPO] sovereign-engine/src/oracle/physics-audit.ts:43 (avant fix)
export interface PhysicsAuditResult {
  readonly trajectory_analysis: TrajectoryAnalysis;  // ← FAUX
  // ...
}

// Runtime construit (L195-199) :
trajectory_analysis: {
  prescribed: brief.trajectory,
  actual: actualTrajectory,
  deviations,  // = TrajectoryAnalysis omega-forge inner
}

// Code accède (delta-physics.ts:30) :
audit.trajectory_analysis.deviations.average_cosine
// ← propriété 'average_cosine' n'existe NULLE PART (vrai nom: avg_cosine_distance)
// → undefined → Number.isFinite(undefined) = false → fallback 0
// → trajectory_compliance.cosine_avg = 0 PERMANENT
```

### Cas P3.1.3

```ts
// [REPO] sovereign-engine/src/oracle/physics-audit.ts:151-155 (avant fix)
const lawCompliance: LawComplianceReport = {  // ← FAUX
  violations: [],
  total_checks: 0,
  compliance_ratio: 1.0,
};
// omega-forge.LawComplianceReport a 10 props complètement différentes
// (transitions, organic_decay_segments, flux_conservation, total_transitions, ...)
```

## 3. Ce qui est PROUVÉ empiriquement

- 2 sites de pattern identique (P3.1.2 + P3.1.3) dans `physics-audit.ts`
- Bug runtime `trajectory_compliance: {0, 0}` permanent confirmé par lecture du code (cf. HEAD `16629707` prédit "ÉLEVÉ pour TrajectoryDeviation")
- TS strict détecte les TS2339 sur l'accès aux propriétés inexistantes
- Tests passent grâce aux mocks alignés sur les faux noms (cohérence interne mock+bug)

## 4. Hypothèses sur cause racine

- **H1** : Refactor omega-forge a changé la shape de `TrajectoryAnalysis` / `LawComplianceReport` après que sovereign-engine ait été écrit. Sovereign-engine n'a jamais été migré (drift cross-package).
- **H2** : Sovereign-engine voulait une shape "lite" pour son usage Sprint 3.1 et a réutilisé le nom omega-forge par paresse de nommage.
- **H3** : Refactor partial : type officiel + shape simplifié coexistent sans alignement explicite.

## 5. Résolution (RESOLVED_FOR_2_CASES)

### Cas P3.1.3 — Commit `8b29db69` (2026-05-16)
Création type local `LawComplianceSimplified` distinct de `omega-forge.LawComplianceReport`.

### Cas P3.1.2 — Commit suivant (2026-05-16, post mass-fix Phase 1-6)
Création type local `TrajectoryAnalysisWrapper { prescribed, actual, deviations: TrajectoryAnalysis }` qui matche runtime shape réelle. Plus fix `delta-physics.ts` pour utiliser `avg_cosine_distance` / `avg_euclidean_distance` (noms officiels omega-forge.TrajectoryAnalysis).

**Bug runtime physics audit RÉSOLU** : `trajectory_compliance` reflète maintenant les vraies distances.

## 6. Pattern doctrinal — Comment éviter à l'avenir

- **AVANT** de cast `: TypeOfficielExterne` sur un object literal, vérifier que toutes les propriétés requises sont présentes ET du bon type
- Si shape simplifiée nécessaire → **DÉFINIR UN TYPE LOCAL DISTINCT** avec nom clair (ex. `LawComplianceSimplified`, `TrajectoryAnalysisWrapper`)
- Pattern de fix uniforme : type local + cast disparaît + code accède aux vrais noms
- Détection : `tsc --strict` strict révèle quand shapes ne matchent pas — toujours runner sur tous les packages cross-référencés

## 7. Trous résiduels (à investiguer S10+)

- Audit complet : grep tous les `: TrajectoryAnalysis` et `: LawComplianceReport` dans `packages/` pour vérifier qu'aucun autre site n'utilise ce pattern toxique
- Audit générique : tous types importés d'omega-forge utilisés dans sovereign-engine — vérifier qu'aucune shape divergente n'est castée

## 8. Refs

- Pattern auto-mémoire : `feedback_cross_package_simplified_shadow.md`
- Audit nuit : `outputs/p311_audit/AUDIT_P3.1.2_TRAJECTORY_DEVIATION.md` (4 options A/B/C/D, Option B retenue)
- Commit fix P3.1.3 : `8b29db69` (LawComplianceSimplified)
- Commit fix P3.1.2 : (post-mass-fix)
- HEAD prédiction : commit `16629707` §"ÉLEVÉ pour TrajectoryDeviation"

---

**Doctrine** : NCR OVER HEROICS + AUDIT BEFORE ACTION + PROVE IT.
**Standard** : NASA-Grade L4 / DO-178C Level A.
