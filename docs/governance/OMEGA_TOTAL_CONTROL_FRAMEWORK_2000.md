# OMEGA — TRAME DE CONTRÔLE TOTAL 2000
**Version** : 1.0 · **Statut** : **RATIFIÉ / ACTIVE** (Architecte Francky, 2026-05-30) · Amendement doctrinal **EMP-14**
**Origine** : fusion Tribunal 2/2 (ChatGPT + Gemini) 2026-05-29, arbitrage Architecte
**Alignement** : exécutable opérationnel de EMP-12 / EMP-12.1 (CONTROL_BEFORE_WRITE) + Codex OMEGA v1.3.1 + EMP-09/10/11/13

> **Ligne d'invocation obligatoire** avant toute action OMEGA significative (code, calibration, mesure, bench, refactor, conclusion, commit) :
> `J'applique OMEGA_TOTAL_CONTROL_FRAMEWORK_2000 avant action.`

---

## OBJECTIF
Empêcher les 4 catastrophes récurrentes prouvées par l'historique OMEGA :
1. Refaire une mesure déjà faite.
2. Brancher un module non relié causalement.
3. Promouvoir un résultat SHADOW / exploratoire en production.
4. Confondre un PASS technique (TSC vert) avec un PASS scientifique.

## 0. VERDICT UNIQUE
Tout travail finit par UN verdict : `PASS · FAIL · PASS_PARTIAL · SHADOW · REJECT · DEFERRED · RESOLVED_BY_DESIGN`.
**Interdits** : « ça a l'air bon », « probablement », « ça devrait passer », « succès encourageant ».

## 1. CONTROL_BEFORE_WRITE (avant toute écriture) — cf EMP-12.1
Bloc obligatoire : domaine · objectif · documents lus (Codex/ADR/NCR/rapports/commits/tags) · lois `LAW-*` · mesures `MEASURE-*` · NCR liées · interdictions `FORBID-*` · **risque de redondance (OUI/NON + justification)** · **risque de mesure vide (module testé causalement relié à la métrique ?)** · verdict `GO_WRITE / GO_READ_MORE / STOP_ARCHITECT_ARBITRATION`. **Aucune action sans ce bloc.**

## 2. ANCHOR_PRE_FLIGHT (avant tout sprint) — cf EMP-1
Git (branch/HEAD/sync origin/dirty/tags) · Runtime (node/tsc/vitest/ollama/modèle) · État doctrinal (Codex version/EMP actifs/ADR/NCR ouvertes) · Baseline (TSC/tests/bench/erreurs connues). Verdict `PASS / FAIL_BLOCKING`. **Si FAIL_BLOCKING → aucun sprint.**

## 3. MATRICE DE PORTÉE
`SCOPE = DOC_ONLY | TOOLING | ANALYSIS_SHADOW | CODE_ISOLATED | PIPELINE_OPT_IN | PRODUCTION`

| Type | Autorisé | Interdit |
|---|---|---|
| DOC_ONLY | docs, ADR, Codex, NCR | code, tests, runtime |
| TOOLING | scripts, wrappers, gates | logique métier |
| ANALYSIS_SHADOW | analyse isolée | branchement pipeline |
| CODE_ISOLATED | composant pur + tests | intégration production |
| PIPELINE_OPT_IN | feature flag + rollback | activation par défaut |
| PRODUCTION | seulement après bench + seal | extrapolation |

## 4. TEST_CAUSAL (avant tout bench)
Ce que je mesure · ce que je prétends prouver · **le module testé influence-t-il vraiment la métrique (OUI/NON) ?** · chemin causal `Entrée → Module → Sortie → Métrique`. Si chemin absent → STOP + ADR/NCR.

## 5. NO_MEASURE_REDUNDANCY (avant toute mesure)
La mesure existe-t-elle déjà (corpus / R-METROLOGY / PVI / Codex / rapports / magic numbers) ? Si oui → réutiliser + citer. Verdict `NEW_MEASURE_JUSTIFIED | EXISTING_MEASURE_REUSE | STOP_DUPLICATE`.

## 6. PROMOTION_GATE (SHADOW → PRODUCTION)
Les 10 obligatoires : bench pré-enregistré · seuils figés avant run · contrôle A/B · n suffisant (≥6, idéal ≥20) · CI95/variance documentée · kill-switch · rollback · feature flag · non-régression · verdict Architecte.
**Interdits** : PASS technique→production · signal exploratoire→loi scellée · métrique secondaire post-hoc→promotion.

## 7. METRIC_HONESTY
`TECHNICAL_PASS` (ex. TSC 0) · `BEHAVIORAL_SIGNAL` (ex. boundary_hash diff) · `SCIENTIFIC_EVIDENCE` (bench A/B pré-enregistré) · `PRODUCTION_GATE` · `EXPLORATORY_ONLY` (ex. min_axis non prévu). Un `EXPLORATORY_ONLY` ne décide jamais.

## 8. MASK_REVEAL_AUDIT (avant noEmitOnError / fix racine massif) — cf EMP-09
Baseline erreurs · erreur bloquante · erreurs masquées · dry-run après fix · delta. Nouvelles erreurs révélées → PAS une régression : classer mask-and-reveal → patch / rollback / NCR.

## 9. TEST_BEFORE_COMMIT (aucun commit sans preuve) — cf EMP-10
Type commit (DOC_ONLY/TOOLING/CODE/PIPELINE) · commandes (TSC/Vitest/ciblés/bench mock/NUL-check) · résultat PASS/FAIL. Si FAIL → aucun commit. Wrapper `commit-with-tests.ps1`, jugement sur exit code.

## 10. ORACLE_COMPATIBILITY_CHECK (avant d'utiliser un Oracle/scorer)
Oracle utilisé · dépendances (14d ? EmotionContract ? ForgePacket ? provider LLM ? macro-axes ?) · entrées disponibles vs absentes · champ dormant/garage. Verdict `ORACLE_COMPATIBLE | ORACLE_REWRITE_SCOPED | ORACLE_INCOMPATIBLE`. **Interdit : forcer un champ dormant avec une fausse valeur pour faire passer l'Oracle** (leçon NCR_V2_3_ORACLE_ECC_14D_INCOMPATIBLE).

## 11. BENCH_PROTOCOL
Hypothèse · contrôle · traitement · variable unique · n · seeds · métrique · seuils GO/SHADOW/REJECT (figés AVANT) · coût · mode (mock/smoke/detached/production) · reprise crash · JSONL · verdict attendu.

## 12. POST_RUN_AUDIT (après tout bench)
Résultat brut · seuil atteint ? · CI95 · variance · axes secondaires · signaux exploratoires · **post-hoc détecté ?** · verdict `GO/SHADOW/REJECT/FAIL_INFRA/FAIL_METRIC`. **Règle absolue : un signal post-hoc ne change jamais le verdict — il devient une hypothèse pour un futur sprint.**

## 13. CODEX_UPDATE (après sprint significatif)
Nouvelle loi / mesure / FORBID / hallucination IA / NCR ? Statut `PROPOSED/SEALED/OPEN/RESOLVED`. Si rien → `NO_CODEX_UPDATE_REQUIRED` justifié.

## 14. ADR / NCR
**ADR si** : changement archi · nouveau couplage · pipeline génération touché · métrique modifiée · feature flag · décision réversible non évidente.
**NCR si** : dette découverte · module incompatible · test faux positif · champ dormant bloquant · mesure invalide · contradiction Codex.

## 15. FINAL_REPORT (fin de sprint)
Objectif · livrables · commits · tags · tests · bench · résultats · verdict · **ce qui est prouvé** / **ce qui n'est PAS prouvé** · risques restants · NCR/ADR · suite recommandée · STOP ou GO.

## 16. RÈGLES D'OR 2000
1. Jamais mesurer un module non câblé. 2. Jamais refaire une mesure historique sans justification. 3. Jamais promouvoir un signal exploratoire. 4. Jamais patcher un champ dormant pour satisfaire un Oracle. 5. TSC PASS ≠ vérité scientifique. 6. SHADOW ≠ succès production. 7. Jamais commit sur FAIL. 8. Jamais oublier le Codex avant action. 9. Jamais mélanger scoring/chunking/génération sans ADR. 10. Jamais croire une IA qui dit « ça devrait marcher ».

## 17. VERDICT DE CONTRÔLE TOTAL
Sprint valide SEULEMENT si :
`CONTROL_BEFORE_WRITE=PASS · ANCHOR_PRE_FLIGHT=PASS · TEST_CAUSAL=PASS · NO_MEASURE_REDUNDANCY=PASS · TEST_BEFORE_COMMIT=PASS · POST_RUN_AUDIT=PASS · CODEX_UPDATE=DONE|JUSTIFIED_NONE · FINAL_REPORT=DONE`. Sinon → `SPRINT_INVALID`.

---
**Historique** : DRAFT 2026-05-29 (Tribunal 2/2) → RATIFIÉ 2026-05-30 (Architecte). Phase 2 possible : extension wrapper `commit-with-tests.ps1 --control-2000`.
