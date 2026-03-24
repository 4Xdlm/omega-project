# OMEGA — Carte des Relations et Metriques v1

# GENERATED 2026-03-24 — SESSION NUIT AUTONOME — OMEGA v1.0

Standard : NASA-Grade L4 / DO-178C Level A

---

## A — Graphe de dependances des modules (scoring)

```
scoreText(text)                          [gb-scorer.ts — EXPORT PRINCIPAL]
  ├── computeAllGBFeatures(text)         [gb-scorer.ts]
  │   ├── computeTextFeatures(text)      [text-features.ts — F1,F5,F9,F12,F15-F19,F21,F24-F38]
  │   ├── computeDepthFeatures(text)     [depth-features.ts — f_subordination_depth, f_pov_*]
  │   ├── computeSemanticDepthFeatures   [semantic-depth-features.ts — f_semantic_*]
  │   └── 3 interactions calculees       [ix_mean_x_subdepth, ix_pov_x_irony, ix_variance_x_longrate]
  └── scoreGB(features)                  [gb-inference.ts — 50 arbres, init=3.9523]

MultiStageScorerV2.score(features, opts) [multi-stage-scorer-v2.ts]
  ├── detectPassageType(features)        [passage-type-detector.ts]
  └── INTERCEPT + 16 weighted features   [standalone Ridge regression]

classifyPassage(text)                    [passage-classifier.ts]
  └── detectPassageType(features)        [passage-type-detector.ts]
```

### Modules engine (generation)

```
prompt-compiler.ts                       [compiler/ — 40 tests]
  ├── static-analyzer.ts                 [compiler/ — 15 tests]
  ├── constraint-pool.ts                 [compiler/ — contraintes]
  ├── partition-profiles.ts              [compiler/ — 8 tests, PARKING]
  └── budget-manager.ts                  [compiler/ — budget tokens]

damage-gate.ts                           [microsurgery/ — 11 tests, ACTIF]
delta-compressor.ts                      [cde/ — 10 tests, ACTIF]

prompt-assembler-v2.ts                   [input/ — assemblage prompt]
prompt-assembler-v4.ts                   [input/ — version V4]
```

---

## B — Table de conversion R-CONVERSION (scellee)

### FR (3 personas x 5 runs = 15 points)

| Dimension | Equation | r | R2 | Verdict |
|-----------|----------|---|----|---------|
| mean_sent_len | produit = 1.727 x declare - 10.848 | 0.963 | 0.927 | CONVERTIBLE |
| f26b | produit = 1.512 x declare - 0.077 | 0.889 | 0.790 | CONVERTIBLE |
| knife_rate | produit = 1.244 x declare + 0.061 | 0.960 | 0.922 | CONVERTIBLE |
| subordinate_per_sentence | produit = 0.717 x declare - 0.093 | 0.921 | 0.848 | CONVERTIBLE |
| cv | produit = -0.367 x declare + 0.920 | 0.000 | 0.000 | IMPREDICTIBLE |

### EN (3 personas x 5 runs = 15 points)

| Dimension | Equation | r | R2 | Verdict |
|-----------|----------|---|----|---------|
| mean_sent_len | produit = 1.951 x declare - 12.538 | 0.956 | 0.914 | CONVERTIBLE |
| f26b | produit = 1.738 x declare - 0.054 | 0.971 | 0.943 | CONVERTIBLE |
| knife_rate | produit = 1.194 x declare + 0.089 | 0.940 | 0.884 | CONVERTIBLE |
| subordinate_per_sentence | produit = 0.935 x declare - 0.025 | 0.864 | 0.746 | CONVERTIBLE |
| cv | produit = non significatif | -0.214 | 0.046 | IMPREDICTIBLE |

### Interpretation

- **Pente FR (1.727) > pente EN (1.951)** sur mean : le LLM surestime en toute langue, mais le ratio est similaire → biais COGNITIF, pas tokenization pure
- **CV impredictible** dans les deux langues (r ~ 0) → le CV est une propriete emergente, pas declarable
- **LOI L3** : ne jamais injecter de consignes metriques chiffrees dans le prompt (le LLM ne peut pas s'auto-calibrer)

---

## C — Classement Phase 5b (75 runs — 15 configs x 5 scenes)

### Top 15 par GB median

| Rank | Config | Type | GB_med | GB_std | f26b | CV | knife |
|------|--------|------|--------|--------|------|----|-------|
| 1 | solo_duras | SOLO | 4.243 | 0.186 | 0.000 | 0.479 | 0.987 |
| 2 | solo_hemingway | SOLO | 3.995 | 0.201 | 0.000 | 0.480 | 0.988 |
| 3 | fdp | TRIO | 3.990 | 0.101 | 0.067 | 1.091 | 0.561 |
| 4 | faulkner_duras | PAIR | 3.989 | 0.166 | 0.236 | 1.250 | 0.619 |
| 5 | proust_duras | PAIR | 3.981 | 0.140 | 0.249 | 1.349 | 0.688 |
| 6 | proust_flaubert | PAIR | 3.964 | 0.049 | 0.257 | 0.903 | 0.367 |
| 7 | wdf | TRIO | 3.937 | 0.238 | 0.015 | 0.969 | 0.654 |
| 8 | solo_dickens | SOLO | 3.936 | 0.247 | 0.043 | 0.641 | 0.302 |
| 9 | celine_flaubert | PAIR | 3.810 | 0.185 | 0.010 | 0.762 | 0.542 |
| 10 | mann_hemingway | PAIR | 3.798 | 0.170 | 0.023 | 0.800 | 0.583 |
| 11 | fpc | TRIO | 3.763 | 0.078 | 0.038 | 1.647 | 0.649 |
| 12 | solo_proust | SOLO | 3.758 | 0.341 | 0.933 | 0.229 | 0.000 |
| 13 | ddc | TRIO | 3.713 | 0.226 | 0.016 | 0.905 | 0.667 |
| 14 | solo_flaubert | SOLO | 3.659 | 0.204 | 0.581 | 0.805 | 0.297 |
| 15 | ddp | TRIO | 3.655 | 0.168 | 0.074 | 1.874 | 0.700 |

### Tests d'hypotheses (Phase 5b)

| Test | Resultat | Detail |
|------|----------|--------|
| H1 : Trio > Solo > Pair | FAIL | Solo GB=3.918, Pair GB=3.908, Trio GB=3.811 |
| H2 : Dominance LAME >= 75% | FAIL | 57% (4/7) |
| H3 : CV emergent >= 70% | PASS | 90% (9/10) |
| H4 : CV optimal | CV=1.069 → GB=3.973 | Zone optimale |
| Win rate champion >= 70% | PASS | solo_duras 87% (biais V1) |

### Lecons Phase 5b

- **Biais GB V1** : Duras et Hemingway en tete = faux positifs (mean < 5w)
- **CV emergent** (L23 confirmee) : 90% des combos ont CV > moyenne des solos
- **proust_flaubert** : le plus STABLE (std=0.049) — base ideale pour moteur longue forme
- **fdp** : meilleur trio (GB=3.990, CV=1.091) — confirme Phase 4 findings

---

## D — Lois scellees (L1-L25)

| Loi | Description | Phase de decouverte |
|-----|-------------|---------------------|
| L1 | Le persona active des poids reels dans l'espace latent du LLM | Phase 4a (6 personas bench) |
| L2 | Les trios produisent une chimie emergente (CV > moyenne solos) | Phase 4b (5 trios) |
| L3 | Aucune consigne metrique chiffree dans le prompt (le LLM ne s'auto-calibre pas) | R-CONVERSION (r_cv=0.000) |
| L4 | Le nom d'un auteur etranger active ses poids meme en FR | Phase 4c (10 EN + 4 DE/ES) |
| L5 | Le CV est une propriete emergente, pas declarable | R-CONVERSION (cv impredictible) |
| L6 | La pente declaration→production est COGNITIVE (~1.7x), pas linguistique | R-CONVERSION EN vs FR |
| L7 | Le LLM surestime systematiquement ses propres metriques declarees | Miroir (E1 positif partout) |
| L8 | Les auteurs nommes produisent des GB superieurs aux anonymes | Miroir (named vs anon) |
| L9 | Duras active un regime hors-distribution pour GB V1 | Phase 5b + C3 (V1=4.24, V2=21) |
| L10 | proust_flaubert est la base la plus stable (std=0.049) | Phase 5b validation |
| L11 | Le chunking K2 (rappel chunks 3-4) contient le drift | Phase 4a (B2) |
| L12 | La famille LAME domine le mean en paire (57-75%) | Phase 5 Assembly |
| L13 | CV emergent dans 90% des combos multi-auteurs | Phase 5b (H3 PASS) |
| L14 | Le CV optimal pour GB maximal est ~1.07 | Phase 5b (H4) |
| L15 | GB V1 invalide pour mean < 8w (biais OOD) | C3 audit |
| L16 | Multi-Stage V2 corrige le biais V1 sur tous les regimes | C3 rescore |
| L17 | Le classement V1 vs V2 est INVERSE pour Duras | C3 (V1 #1 → V2 derniere) |
| L18 | 1 run insuffisant pour conclure — minimum 3 runs | Phase 5b (variance observee) |
| L19 | FDP avec takeover Duras = V2 chute (run2: 71.6 vs 100.0) | C3 FDP analysis |
| L20 | PF base (V2=100 constant) + Duras correcteur externe = architecture optimale | P1-REDESIGN decision |
| L21 | Le correcteur Duras doit etre EXTERNE (pas co-auteur) | P1-REDESIGN v1→v3 |
| L22 | Le mini-correcteur precoce (chunks 1-2) ancre le mean ~60-80w | P1-REDESIGN-v3 |
| L23 | Le rappel "souvent" (pas "exceptionnellement") active le correcteur | P1-REDESIGN-v2 |
| L24 | L'ancre "coherence de longueur" reduit le drift stochastique | P1-REDESIGN-v3 |
| L25 | Le mini-correcteur precoce stabilise toute la trajectoire | P1-REDESIGN-v3 (validated) |

---

*Carte generee depuis les donnees mesurees : R_CONVERSION_RESULTS.json, PHASE5B_VALIDATION_RESULTS.json, P2_RESCORE_V2_RESULTS.json, P1_REDESIGN_V3_RESULTS.json*
