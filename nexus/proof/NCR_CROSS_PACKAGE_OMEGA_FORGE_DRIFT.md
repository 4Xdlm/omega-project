# NCR_CROSS_PACKAGE_OMEGA_FORGE_DRIFT

**ID** : NCR_CROSS_PACKAGE_OMEGA_FORGE_DRIFT
**Title** : Signatures `detectForcedTransitions` / `detectFeasibilityFailures` divergentes entre `omega-forge` (canonique 1 arg) et `sovereign-engine` (usage 2 args)
**Status** : **DRAFT_OPEN**
**Severity** : **HIGH**
**Priority** : P1 (S10+)
**Opened** : 2026-05-17 (Phase 3.2 cold restart verification)
**Owner** : Francky + Claude

---

## 1. Résumé

`packages/sovereign-engine/src/oracle/physics-audit.ts:167-178` appelle `detectForcedTransitions(actualTrajectory, canonicalTable)` et `detectFeasibilityFailures(actualTrajectory, canonicalTable)` avec **2 arguments**, alors que les fonctions canoniques exportées par `packages/omega-forge/src/diagnosis/forced-transitions.ts:9-19` n'attendent **qu'1 argument** (`transitions: readonly EmotionTransition[]`).

Le commit `741f88c1` (hotfix cold restart) a appliqué un **cast structurel `as unknown as (a, b) => readonly unknown[]`** pour suppress TS2554 sans refactorer le runtime. La divergence sémantique cross-package persiste.

## 2. Évidence empirique observée 2026-05-17

```ts
// [REPO] packages/omega-forge/src/diagnosis/forced-transitions.ts:9-12 (SIGNATURE CANONIQUE)
export function detectForcedTransitions(
  transitions: readonly EmotionTransition[],
): readonly EmotionTransition[] {
  return transitions.filter((t) => t.forced_transition);
}

// [REPO] packages/sovereign-engine/src/oracle/physics-audit.ts:166-168 (USAGE DIVERGENT)
const detectForcedTransitionsRaw = detectForcedTransitions as unknown as (a: unknown, b: unknown) => readonly unknown[];
const forcedTransitions = detectForcedTransitionsRaw(actualTrajectory, canonicalTable);
```

`actualTrajectory` (sovereign-engine) n'est PAS `EmotionTransition[]` (omega-forge). `canonicalTable` est un 2e arg jamais consommé par la fonction. Au runtime, omega-forge fait `.filter(t => t.forced_transition)` sur le 1er arg uniquement — le 2e arg est silencieusement ignoré.

## 3. Ce qui est PROUVÉ empiriquement

- 2 sites d'appel avec 2 args dans `physics-audit.ts:167-168` et `physics-audit.ts:174-175`
- Signature canonique omega-forge = 1 arg (`EmotionTransition[]`)
- Cast `as unknown as (a, b) => unknown[]` compile clean (TSC 0 errors post-hotfix)
- Tests passent (2324 PASS) — le bug est silencieux au runtime
- Le résultat `.length` est utilisé pour `forced_transitions` et `feasibility_failures` dans le rapport physique

## 4. Ce qui N'EST PAS prouvé

- Si `actualTrajectory` (probablement `ParagraphEmotionState[]`) a des éléments avec `.forced_transition` / `.feasibility_fail` properties → le filter peut retourner sensiblement n'importe quoi (silencieux)
- Si la métrique `forced_transitions: forcedTransitions.length` est consommée downstream avec une interprétation valide ou contaminée

## 5. Hypothèses sur cause racine

- **H1** : Refactor omega-forge a changé la signature après que sovereign-engine soit écrit. Sovereign-engine n'a jamais été migré (drift cross-package).
- **H2** : Sovereign-engine voulait passer un contexte (canonicalTable) pensant que omega-forge l'accepterait. Mauvaise communication inter-package.
- **H3** : Pattern toxique "cross-package simplified shadow" — cf. NCR_CROSS_PACKAGE_SIMPLIFIED_SHADOW_PATTERN umbrella.

## 6. Impact

- **Pipeline physics_score** : `forced_transitions` et `feasibility_failures` retournent probablement des valeurs sans rapport avec la sémantique attendue (filter sur le mauvais type d'objet)
- **Score composite physics** : potentiellement contaminé par ces 2 métriques fausses
- **Risque silencieux** : aucune alerte runtime, juste un calcul faux

## 7. Recommandation

**Court terme (FAIT P3.2 hotfix `741f88c1`)** : Cast structurel pour débloquer build/test. NCR à formaliser pour traçabilité.

**Moyen terme (S10+)** : Refactor coordonné :
1. Investiguer le type runtime de `actualTrajectory` (probablement `ParagraphEmotionState[]`)
2. Décider : soit convertir `actualTrajectory` → `EmotionTransition[]` AVANT l'appel, soit modifier omega-forge signature pour accepter un 2e arg `canonicalTable: TrajectoryRule[]` et l'utiliser réellement
3. Supprimer le cast `as unknown as` une fois le fix appliqué

**Long terme** : Audit générique de tous les casts `as unknown as` dans `sovereign-engine` pour identifier d'autres drift cross-package similaires.

## 8. Refs

- Commit hotfix : `741f88c1` (cast structurel cross-package)
- Site canonique omega-forge : `packages/omega-forge/src/diagnosis/forced-transitions.ts:9-19`
- Site divergent sovereign-engine : `packages/sovereign-engine/src/oracle/physics-audit.ts:166-178`
- NCR umbrella connexe : `NCR_CROSS_PACKAGE_SIMPLIFIED_SHADOW_PATTERN.md` (P3.1.2/P3.1.3 même pattern)

---

**Doctrine** : NCR OVER HEROICS + AUDIT BEFORE ACTION + PROVE IT empiriquement avant refactor cross-package.
**Standard** : NASA-Grade L4 / DO-178C Level A.
