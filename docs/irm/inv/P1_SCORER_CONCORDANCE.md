# P1-07: SCORER CONCORDANCE
Date: 2026-04-02

## Données disponibles
Les sessions de bench dans packages/sovereign-engine/sessions/ ne contiennent pas de données multi-scorer simultanées (GB V1 + V3 + Ridge V2 sur les mêmes textes).

INV-02 a comparé VATOMIC_RESULTS (GB V1 + V3) sur 5 scènes :
- Concordance : 3/5 (60%)
- Divergences expliquées par le PDP f26b (GB V1 non-linéaire mais globalement POSITIF)

## Verdict
[DONNÉES INSUFFISANTES — bench multi-scorer requis en R5]

## Protocole proposé pour R5
1. Sélectionner 20 textes diversifiés (5 types × 2 langues × 2 tailles)
2. Scorer chaque texte avec : GB V1, Ridge V2, V3 macro-axes, multi-stage-scorer
3. Mesurer : concordance de verdicts, corrélation des composites, divergences par axe
4. Identifier les textes où les scorers divergent → analyser les features discriminantes
5. Produire un rapport SCORER_CONCORDANCE_R5.json
