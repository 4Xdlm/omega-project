# NCR_AXIS_SCORE_4_DEFINITIONS_FRAGMENTED

**ID** : NCR_AXIS_SCORE_4_DEFINITIONS_FRAGMENTED
**Title** : 4 définitions concurrentes `AxisScore` dans le repo OMEGA — nommage confus, risque future ambiguïté
**Status** : **OPEN_DIAGNOSED** (fix P3.1.4 a étendu la canonique avec 2 props, mais les 3 autres défs concurrentes restent)
**Severity** : **MEDIUM**
**Priority** : P2
**Opened** : 2026-05-16 (audit nuit autonome)
**Owner** : Francky + Claude

---

## 1. Résumé

Pendant l'audit nuit autonome 2026-05-15→16, découverte de **4 définitions concurrentes** d'interface `AxisScore` dans le repo OMEGA, avec **shapes incompatibles**. Le compilateur résout `AxisScore` au type local importé, ce qui peut créer ambiguïté ou bugs cross-package.

## 2. Évidence empirique observée 2026-05-16

| # | Localisation | Shape (5 props chacune environ) |
|---|---|---|
| 1 | `omega-p0/src/phonetic/genius-scorer.ts:54` | `{ name, score, weight, contribution, confidence }` |
| 2 | `sovereign-engine/src/oracle/s-oracle-v2.ts:43` | `{ name, weight, raw, weighted }` — renommé `AxisScoreV2` |
| 3 | `sovereign-engine/src/validation/phase-u/greatness-judge.ts:33` | `{ axis: GreatnessAxis, score, reason, weight }` |
| 4 | `sovereign-engine/src/types.ts:339` (**CANONIQUE**) | `{ name, score, weight, method, details, axis_id?, reasons? }` — extension P3.1.4 commit `8b29db69` |

→ **Toutes ces définitions sont concurrentes** : `axis` (enum) vs `name` (string), `reason` (singular string) vs `reasons` (plural object), props uniques chacune.

## 3. Ce qui est PROUVÉ empiriquement

- 4 définitions exportées toutes nommées `AxisScore`
- Tous les 15 axes dans `sovereign-engine/src/oracle/axes/*.ts` + `macro-axes.ts` importent depuis `sovereign-engine/src/types.ts` (définition #4 canonique)
- Les 3 autres définitions sont locales à leur fichier ou renommées (`AxisScoreV2`)
- Risque ambiguïté : un dev qui fait `import { AxisScore } from '@omega/omega-p0'` aurait un type différent

## 4. Ce qui N'EST PAS prouvé

- Combien de consumers de chaque définition concurrente
- Si les définitions sont restes "historiques" (legacy) ou si elles ont des cas d'usage actifs distincts

## 5. Hypothèses sur cause racine

- **H1** : Refactor incrémental sans renommage. Plusieurs sprints ont créé leur propre AxisScore sans coordination.
- **H2** : Concept "score sur un axe" est générique → plusieurs implémentations indépendantes naturelles
- **H3** : `AxisScoreV2` (s-oracle-v2.ts) tentait d'être canonique mais migration incomplète

## 6. Risques identifiés

- **R1** : Nouveau dev importe la mauvaise `AxisScore` → bugs runtime silencieux (TS détecte si différentes shapes utilisées dans même contexte, mais pas si pas de contact direct)
- **R2** : Refactor futur peut consolider mais difficile sans audit complet
- **R3** : Documentation / debugging confus

## 7. Recommandation

- **Court terme (résolu P3.1.4)** : Étendre la canonique (types.ts:339) avec `axis_id?` + `reasons?` (FAIT commit `8b29db69`)
- **Moyen terme** : Renommer les 3 défs concurrentes pour disambiguation :
  - `omega-p0/genius-scorer.AxisScore` → `AxisScorePhonetic`
  - `sovereign-engine/s-oracle-v2.AxisScoreV2` (déjà renommé)
  - `sovereign-engine/greatness-judge.AxisScore` → `AxisScoreGreatness`
- **Long terme** : Unifier en une définition centrale dans contracts-canon ou similaire si pertinent

## 8. Décision actuelle

- **AUCUN fix immediate** : la canonique types.ts:339 est suffisante pour résoudre les 4 TS errors P3.1.4
- Renommage des 3 autres définitions reporté Sprint S10+ (effort + risque cross-package)

## 9. Refs

- Commit fix P3.1.4 : `8b29db69` (AxisScore extension + 2 props optionnelles)
- Audit nuit : `outputs/p311_audit/AUDIT_P3.1.3_TO_P3.1.6_CONSOLIDE.md` §P3.1.4
- Doctrine : NCR OVER HEROICS

---

**Standard** : NASA-Grade L4 / DO-178C Level A.
