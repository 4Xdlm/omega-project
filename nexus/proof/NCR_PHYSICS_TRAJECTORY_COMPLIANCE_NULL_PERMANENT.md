# NCR_PHYSICS_TRAJECTORY_COMPLIANCE_NULL_PERMANENT

**ID** : NCR_PHYSICS_TRAJECTORY_COMPLIANCE_NULL_PERMANENT
**Title** : Bug runtime silencieux — `trajectory_compliance: {cosine_avg: 0, euclidean_avg: 0}` permanent depuis commit non identifié
**Status** : **RESOLVED** (commit P3.1.2 post-mass-fix 2026-05-16)
**Severity** : **HIGH** (impact pipeline physics_score depuis commit délinquant)
**Priority** : P0 (silencieux mais corrigible)
**Opened** : 2026-05-16 (audit nuit autonome a confirmé empirique)
**Resolved** : 2026-05-16 (P3.1.2 patch)
**Owner** : Francky + Claude

---

## 1. Résumé

Le code `sovereign-engine/src/delta/delta-physics.ts:30-33` accédait à `audit.trajectory_analysis.deviations.average_cosine` et `.average_euclidean` qui **N'EXISTAIENT NULLE PART** (ni dans le type officiel `omega-forge.TrajectoryAnalysis`, ni dans la shape construite runtime). Au runtime : `undefined` → `Number.isFinite(undefined) = false` → fallback `0` → **`trajectory_compliance: {cosine_avg: 0, euclidean_avg: 0}` permanent**.

Le commit HEAD `16629707` avait prédit ce risque : "ÉLEVÉ pour TrajectoryDeviation[]: Number.isFinite(undefined)=false masquait probablement un bug runtime silencieux (trajectory_compliance: {0, 0} permanent)".

## 2. Évidence empirique observée 2026-05-16

```ts
// AVANT FIX — delta-physics.ts:30-33
trajectory_compliance: {
  cosine_avg: Number.isFinite(audit.trajectory_analysis.deviations.average_cosine)
    ? audit.trajectory_analysis.deviations.average_cosine : 0,  // ← undefined → 0
  euclidean_avg: Number.isFinite(audit.trajectory_analysis.deviations.average_euclidean)
    ? audit.trajectory_analysis.deviations.average_euclidean : 0,  // ← undefined → 0
},
```

`audit.trajectory_analysis.deviations` est en réalité (au runtime) une instance de `omega-forge.TrajectoryAnalysis` qui expose `avg_cosine_distance` et `avg_euclidean_distance` (vrais noms), pas `average_cosine`/`average_euclidean`.

## 3. Impact

- **Pipeline physics_score** : depuis commit délinquant non identifié, `trajectory_compliance` est **toujours {0,0}** quelle que soit la qualité réelle de la trajectoire émotionnelle
- **Score composite physics** : `cosineScore=100` et `euclideanScore=100` constants (puisque distance=0) → trajectory contribution maximale toujours → score gonflé artificiellement
- **Faux signal positif** : aucune alerte sur trajectoires émotionnelles drift réelles

## 4. Résolution (RESOLVED 2026-05-16)

Patch P3.1.2 (commit post mass-fix `8b29db69`) :

1. **Type wrapper local** : `TrajectoryAnalysisWrapper` dans `physics-audit.ts` matche la shape construite runtime (`{ prescribed, actual, deviations: TrajectoryAnalysis }`)
2. **PhysicsAuditResult.trajectory_analysis** : type changé `TrajectoryAnalysis` → `TrajectoryAnalysisWrapper`
3. **Code fix** : `delta-physics.ts:30-33` utilise désormais `audit.trajectory_analysis.deviations.avg_cosine_distance` (vrai nom officiel `omega-forge.TrajectoryAnalysis`)
4. **Tests** : `delta-physics.test.ts` et `generate-prescriptions.test.ts` mocks alignés (`average_cosine` → `avg_cosine_distance`)

## 5. Cause racine (post-investigation)

Pattern méta "cross-package simplified shadow" — voir `NCR_CROSS_PACKAGE_SIMPLIFIED_SHADOW_PATTERN.md` umbrella.

Le bug a probablement été introduit lors d'un refactor partial où :
- sovereign-engine a été écrit avec une shape locale custom (`average_cosine`)
- omega-forge a évolué vers `avg_cosine_distance`
- Le cast `trajectory_analysis: TrajectoryAnalysis` est devenu faux silencieusement
- TS strict a détecté seulement quand un autre fix a forcé un recompile complet

## 6. Forensique optionnelle

`git log -p -- packages/sovereign-engine/src/delta/delta-physics.ts` pour identifier le commit qui a introduit `average_cosine`. À faire en Sprint S10+ si pertinent pour amélioration process.

## 7. Refs

- Commit fix : (commit post mass-fix Phase B3 2026-05-16)
- Audit nuit : `outputs/p311_audit/AUDIT_P3.1.2_TRAJECTORY_DEVIATION.md`
- HEAD prédiction : commit `16629707` §"TS mask-and-reveal ÉLEVÉ TrajectoryDeviation[]"
- NCR umbrella : `NCR_CROSS_PACKAGE_SIMPLIFIED_SHADOW_PATTERN.md`

---

**Doctrine** : NCR OVER HEROICS + PROVE IT + bug runtime audit-first.
**Standard** : NASA-Grade L4 / DO-178C Level A.
