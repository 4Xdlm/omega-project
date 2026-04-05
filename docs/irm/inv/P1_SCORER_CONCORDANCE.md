# P1-07: SCORER CONCORDANCE
Date: 2026-04-02 | Scan: P1-07 rebuild

## Scan executed
```bash
find packages/sovereign-engine/sessions/ -name "*.json" | head -20
grep -rl "scorer" packages/sovereign-engine/sessions/ --include="*.json"
grep -rl "multi.scorer|scorer.*concordance|inter.rater" packages/sovereign-engine/sessions/ -r
```

## Donnees disponibles
Session files found: BenchW_gate-ON (multiple runs), Ablation, ALTERNANCE_STUDY, AUDIT_CAUSAL, BLOC6_HYBRID, BLOC7_HYBRID.

None contain multi-scorer simultaneous data (GB V1 + V3 + Ridge V2 on same texts).
grep for "scorer" across all session JSON files: 0 results.

INV-02 reference: compared VATOMIC_RESULTS (GB V1 + V3) on 5 scenes, concordance 3/5 (60%).
Divergences explained by PDP f26b (GB V1 non-linear but globally POSITIVE).

## Verdict
[DONNEES INSUFFISANTES -- bench multi-scorer requis]

## Protocole propose
1. Selectionner 20 textes diversifies (5 types x 2 langues x 2 tailles)
2. Scorer chaque texte avec: GB V1, Ridge V2, V3 macro-axes, multi-stage-scorer
3. Mesurer: concordance de verdicts, correlation des composites, divergences par axe
4. Identifier les textes ou les scorers divergent -> analyser les features discriminantes
5. Produire un rapport SCORER_CONCORDANCE_FULL.json
6. Seuil d'acceptation: concordance >= 80% sur verdicts PASS/FAIL

## Priorite
MEDIUM -- ne bloque pas P2/R5 mais requis avant certification finale.
Les 4 scorers existent dans le code, seul le protocole d'execution manque.
