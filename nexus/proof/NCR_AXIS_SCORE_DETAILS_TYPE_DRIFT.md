# NCR_AXIS_SCORE_DETAILS_TYPE_DRIFT

**ID** : NCR_AXIS_SCORE_DETAILS_TYPE_DRIFT
**Title** : `AxisScore.details: string` strict ne matche pas le runtime (objet dans 3+ axes utilisant `@ts-expect-error`)
**Status** : **DRAFT_OPEN**
**Severity** : **MEDIUM**
**Priority** : P2 (S10+)
**Opened** : 2026-05-17 (Phase 3.2 mass-fix)
**Owner** : Francky + Claude

---

## 1. Résumé

Le type `AxisScore.details` est déclaré `: string` strict dans `packages/sovereign-engine/src/types.ts`, mais 3 axes (`authenticity.ts`, `metaphor-novelty.ts`, `show-dont-tell.ts`) construisent `details` comme **objet runtime** :

```ts
details: {
  calc_score: 0.85,
  fraud_score: 0.10,
  pattern_hits: [...]
}
```

Le test `AXE-AUTH-01` (`tests/oracle/axes/authenticity.test.ts:37`) asserte `result.details.calc_score` comme **propriété objet**. Donc le runtime est cohérent (objet partout), mais le type déclaré `string` est faux.

Workaround actuel : `// @ts-expect-error — runtime shape objet, type déclaré string` sur les 3 sites (commit `c906b920` revert P3.1.6.C).

## 2. Évidence empirique observée 2026-05-17

```ts
// [REPO] packages/sovereign-engine/src/types.ts (canonique)
export interface AxisScore {
  readonly name: string;
  readonly score: number;
  readonly weight: number;
  readonly method: 'CALC' | 'LLM' | 'HYBRID';
  readonly details: string;  // ← FAUX : runtime = objet
  readonly axis_id?: string;
  readonly reasons?: { ... };
}

// [REPO] packages/sovereign-engine/src/oracle/axes/authenticity.ts:47-53
// @ts-expect-error — runtime shape objet, type déclaré string. Redesign futur.
details: {
  calc_score: result.calc_score,
  fraud_score: result.fraud_score,
  pattern_hits: result.pattern_hits,
},

// [REPO] packages/sovereign-engine/tests/oracle/axes/authenticity.test.ts:37 (assertion runtime)
expect(result.details.calc_score).toBeDefined();  // ← accès propriété objet
```

## 3. Ce qui est PROUVÉ empiriquement

- Type `AxisScore.details: string` strict (types.ts)
- 3 sites construisent objet : authenticity.ts:47, metaphor-novelty.ts:57, show-dont-tell.ts:44
- Test AXE-AUTH-01 asserte access propriété objet (line 37)
- `@ts-expect-error` suppresse les 3 TS2322 (sinon TSC fail)
- Tentative de réconciliation P3.1.6.C (wrap JSON.stringify) cassait le test AXE-AUTH-01 → revert P3.1.6.C `c906b920`

## 4. Ce qui N'EST PAS prouvé

- Si d'autres consumers de `AxisScore` (notamment `s-oracle-v2.ts`, `macro-axes.ts`) accèdent `details` comme string ou objet
- Si la sérialisation JSON (proofpack, evidence) attend string ou peut prendre objet

## 5. Hypothèses sur cause racine

- **H1** : Refactor initial type strict pour sérialisation. Mais sites de construction non migrés vers `JSON.stringify(...)`.
- **H2** : Design initialement `details: object` puis tightened en string mais oubli de 3 sites.
- **H3** : Compromis non documenté entre "details lisible humain (string)" et "details accessible programmatique (objet)".

## 6. Impact

- **Bug type strict masqué par `@ts-expect-error`** : 3 directives qui devraient être propre design type
- **Risque downstream** : si un consumer fait `result.details.substring(...)` (string ops), runtime crash car objet
- **Test fragile** : AXE-AUTH-01 dépend de l'accès propriété — toute tentative de "réparer" le type strict casse le test

## 7. Recommandation

**Option A — RECOMMANDÉE** : Élargir type
```ts
readonly details: string | Record<string, unknown>;
```
+ helper `getDetailsAsObject(score: AxisScore): Record<string, unknown>` pour usage programmatique typé.

Avantages : élimine les 3 `@ts-expect-error`, runtime cohérent, pas de migration sites.

**Option B** : Forcer wrap JSON.stringify partout + adapter tests pour `JSON.parse(result.details).calc_score`. Plus rigide mais sérialisation propre.

**Option C** : Garder status quo (`@ts-expect-error`) avec NCR documenté. Pas de fix mais pas de dette nouvelle.

## 8. Refs

- Commit revert P3.1.6.C : `c906b920` (restore AXE-AUTH-01)
- Sites `@ts-expect-error` : authenticity.ts:48, metaphor-novelty.ts:58, show-dont-tell.ts:45
- Test fragile : `tests/oracle/axes/authenticity.test.ts:37`
- Pattern auto-mémoire : `feedback_ts_expect_error_vs_ignore.md`

---

**Doctrine** : MINIMIZE IT (élargir type > refactor sites) + NCR OVER HEROICS (documenter avant fixer).
**Standard** : NASA-Grade L4 / DO-178C Level A.
