# ⚠️ HISTORICAL SNAPSHOT — NE FAIT PAS AUTORITÉ
# Ce document reflète l'état au moment de sa génération (session nuit 2026-03-24).
# Le moteur a évolué depuis (v3 → v4, seuils contextuels, P4 PASS, L28).
# DOCUMENT D'AUTORITÉ : docs/SESSION_SAVE_2026-03-25_SCELLAGE_MOTEUR.md
# Tag de référence : moteur-production-v1

# OMEGA — Blueprint Juge + Scribe v1

# GENERATED 2026-03-24 — SESSION NUIT AUTONOME — OMEGA v1.0

Standard : NASA-Grade L4 / DO-178C Level A
Branche : phase-r-metrology-rebuild

---

## A — Architecture duale des juges

### A1. GB V1 — Pipeline complet

**Source** : `src/scoring/gb-scorer.ts` + `src/scoring/gb-inference.ts`

```
Input  : texte brut (string)
Etage 1 : Extraction 42 features
  - text-features.ts      → F1 (mean/std), F5, F9, F12, F15-F19, F21, F24-F38
  - depth-features.ts     → f_subordination_depth, f_pov_shift_rate, f_pov_stability
  - semantic-depth-features.ts → f_semantic_depth, f_semantic_variance, f_semantic_entropy
  - 3 interactions        → ix_mean_x_subdepth, ix_pov_x_irony, ix_variance_x_longrate
Etage 2 : Foret de 50 arbres (gradient boosting)
  - Init = 3.9523
  - Learning rate = 0.05
  - Prediction = init + lr * sum(tree_predictions)
Etage 3 : Tier mapping
  - S >= 4.5 | A >= 3.5 | B >= 2.5 | C >= 1.5 | D < 1.5
Output : { score: 3.0-5.0, tier: S/A/B/C/D, features: Record, topFeatures: top10 }
```

**Domaine de validite** :
- Valide : mean > 8w, textes 500-2000w
- Invalide : mean < 8w (biais OOD confirme — Duras 3.5w score 4.121)

**Feature importance** (top 5 / 42) :
| Rang | Feature | Poids |
|------|---------|-------|
| 1 | f26b_long_sent_rate | 29% |
| 2 | f1a_rhythm_variance | ~8% |
| 3 | f29d_ttr_score | ~7% |
| 4 | f24c_contrast_delta | ~6% |
| 5 | f19a_approx_entropy | ~5% |

**Exports** : `scoreText(text)`, `computeAllGBFeatures(text)`, `scoreFromFeatures(features)`, `getFeatureNames()`, `getFeatureImportance()`

### A2. Multi-Stage V2 — Pipeline complet

**Source** : `src/scoring/multi-stage-scorer-v2.ts`

```
Input  : features Record<string,number> + { wordCount }
Etage 1 : Ridge regression (16 features, lambda=1.0)
  - INTERCEPT = 5.857
  - 16 features with signed weights (subset of 42)
  - Key weights :
    f26b_long_sent_rate    : +2.477 (POSITIVE — rewards long sentences)
    f29d_ttr_score         : -4.709 (INVERTED — punishes mechanical high TTR)
    f19a_approx_entropy    : +1.583
    f24c_contrast_delta    : +0.020
    f9a_contradiction_rate : -0.283
    f27c_negation_rate     : +0.022
    f35c_hook_score        : -1.515
    f36c_cliff_score       : +0.847
Etage 2 : 3 bonus conditionnels
  - rhythmic_mastery  (+15) : f1_mean > 18 AND f1a_variance > 12
  - controlled_breathing (+12) : f26b > 0.08 AND f24c > 25
  - narrative_depth (+10) : f_semantic_depth > 0.5 AND f_semantic_variance > 0.3
Etage 3 : 1 penalite + normalisation
  - knife_excess (-10) : knife_rate > 0.15
  - Normalisation RAW_MIN/RAW_MAX → score 0-100
  - Final = score100 + sum(bonuses) - sum(penalties), clamp [0, 100]
Output : { raw, score100, bonuses[], penalties[], final, confidence, contributions[] }
```

**Constructeur** : `new MultiStageScorerV2()` — sans parametres (standalone)

### A3. Tableau comparatif V1 vs V2 (mesures reelles P1+C3)

| Config | GB_V1 | V2_final | f26b | f1_mean | Interpretation |
|--------|-------|----------|------|---------|----------------|
| Duras solo ctrl (r1) | 4.160 | 25.7 | 0.000 | 3.3 | Faux positif V1, puni par V2 |
| Duras solo ctrl (r2) | 4.082 | 17.9 | 0.000 | 3.7 | Idem |
| Duras solo ctrl (r3) | 4.121 | 21.0 | 0.000 | 3.5 | Idem |
| PF K2 (r1) | 3.779 | 100.0 | 0.852 | 88.0 | Sous-evalue par V1, max V2 |
| PF K2 (r2) | 3.737 | 100.0 | 0.900 | 115.7 | Idem |
| FDP K2 (r1) | 3.786 | 100.0 | 0.176 | 22.8 | V2 rehabilite malgre f26b bas |
| FDP K2 (r2) | 3.793 | 71.6 | 0.083 | 15.8 | Takeover Duras = V2 penalise |
| PF+Duras v3 (r1) | 4.071 | 100.0 | 0.549 | 44.7 | Moteur valide candidat |

**Classement inverse confirme** : V1 classe Duras #1 (4.121), V2 classe Duras dernier (21.0)

### A4. Regle de routing judiciaire

| Contexte | Juge | Raison |
|----------|------|--------|
| Microbench 500w, mean > 8w | GB V1 | Domaine calibre, rapide |
| Decision moteur longue forme | Multi-Stage V2 | Corrige biais OOD |
| Score production chapitre | V2 (seuil >= 90) | Verdict decision |
| Comparaison historique | Les deux | Tracabilite |

---

## B — Architecture du Scribe

### B1. Principe fondamental (CONTRAT_OMEGA_SCRIBE)

```
Scribe = artiste aveugle — genere uniquement, pas d'acces aux metriques
OMEGA  = gardien verite — verifie tout, scoring dual post-generation
Contamination interdite : aucun etat narratif (open_threads, charStates)
                          dans le prompt Scribe
```

### B2. Pipeline de generation v3 (PF+Duras_K2)

```
Input  : SceneBrief (<=150 tokens, INV-CDE-01)

Etape 1 : Construction chunks (4 x 750w = ~3000w)
  Chunk 1 : PF_PERSONA + RAPPEL_CHUNKS12 + SceneBrief
  Chunk 2 : PF_PERSONA + RAPPEL_CHUNKS12 + last200w
  Chunk 3 : PF_PERSONA + RAPPEL_CHUNKS34_V4 + last200w
  Chunk 4 : PF_PERSONA + RAPPEL_CHUNKS34_V4 + last200w + "conclus"

Etape 2 : Appel LLM (claude-sonnet-4-20250514, temp=0.75)
  - max_tokens = 2500 par chunk
  - Extraction <prose></prose>
  - withRetry (3 tentatives, backoff exponentiel)

Etape 3 : Assemblage prose complete
  fullProse = chunk1 + "\n\n" + chunk2 + "\n\n" + chunk3 + "\n\n" + chunk4

Etape 4 : Scoring dual
  - GB V1 : scoreText(fullProse)
  - MS V2 : scorer.score(computeAllGBFeatures(fullProse), { wordCount })

Output : prose 2200-2500w + metriques completes
```

### B3. Les 3 personas actifs

**PF_PERSONA** (present 4/4 chunks) :
- Flaubert : structure, periodes classiques, gueuloir, subordonnees en cascade
- Proust : profondeur, temps dilate, chaque sensation depliee
- Phrase longue = nature commune des deux

**RAPPEL_CHUNKS12** (chunks 1-2) :
- Ancre mean ~60-80w, pas l'illimite
- Mini-correcteur doux : phrase courte 3-6 mots, rare mais presente

**RAPPEL_CHUNKS34_V4** (chunks 3-4) :
- Correcteur Duras externe : regulierement, souvent, pas exceptionnellement
- Ancre nappe phrastique : "la cadence de fin ne s'effondre pas"
- Ancre dialogue : "meme dans le dialogue, les repliques s'enchassent dans des periodes amples"
- Coherence de longueur : continuity avec ce qui precede

### B4. Invariants actifs

| Invariant | Description | Source |
|-----------|-------------|--------|
| INV-PROMPT-01 | Aucun open_threads / charStates dans prompt Scribe | CONTRAT_OMEGA_SCRIBE |
| INV-CDE-01 | SceneBrief <= 150 tokens | Architecture CDE |
| LOI-L3 | Aucune consigne metrique chiffree dans le prompt | Phase 4 — R-CONVERSION |
| LOI-L25 | Mini-correcteur precoce (chunks 1-2) stabilise toute la trajectoire | P1-REDESIGN-v3 |

---

## C — Metriques cibles validees

### Regime de production cible (valide experimentalement v3)

| Metrique | Seuil | Source validation |
|----------|-------|-------------------|
| V2_final | >= 90 | P1-REDESIGN-v3 (3 runs, median 100.0) |
| GB_V1 | >= 3.90 (info) | P1-REDESIGN-v3 (median 4.071) |
| CV | [0.80, 1.30] | P1-REDESIGN-v3 (median 0.906) |
| f26b | > 0.50 | P1-REDESIGN-v3 (median 0.549) |
| Drift | [-15, +15] | P1-REDESIGN-v3 (median -9.7) |
| Mean chunk4 | > 10w | P1-REDESIGN-v3 (min 38.0w) |
| Mean global | [35, 75]w | P1-REDESIGN-v3 (median 44.7w) |

### Seuils par type de scene (P3)

| Scene | V2 | CV | f26b | Drift seuil |
|-------|----|----|------|-------------|
| Contemplation | >= 90 | [0.80, 1.30] | > 0.40 | [-15, +15] |
| Confrontation | >= 90 | [0.80, 1.30] | > 0.40 | [-15, +15] |
| Dialogue | >= 90 | [0.80, 1.30] | > 0.40 | [-15, +15] |

---

## D — Etat au 2026-03-24

### P1-REDESIGN-v3 : VALIDE

| Run | V2 | GB | f26b | CV | Drift | chunk1 | chunk4 |
|-----|----|----|------|----|-------|--------|--------|
| r1 | 100.0 | 4.071 | 0.549 | 0.870 | -13.2 | 54.6w | 43.7w |
| r2 | 100.0 | 4.109 | 0.571 | 0.906 | -9.7 | 77.0w | 38.0w |
| r3 | 100.0 | 3.935 | 0.625 | 1.026 | 16.1 | 42.8w | 53.3w |

### P3 (v3) : 1/3 PASS — drift confrontation et dialogue hors ±15

| Scene | V2 | CV | f26b | Drift | PASS |
|-------|----|----|------|-------|------|
| contemplation | 100.0 | 0.895 | 0.490 | -11.3 | PASS |
| confrontation | 100.0 | 1.031 | 0.490 | -15.3 | FAIL (borderline) |
| dialogue | 100.0 | 0.950 | 0.438 | -17.6 | FAIL |

### P3-v4 : ANCRE RENFORCEE — resultats en attente

### P4 : DISCONTINUITE Deltaf26b=0.172 (seuil <0.15) — 1 run

| Chapitre | V2 | GB | f26b | CV | Mean | Drift |
|----------|----|----|------|----|------|-------|
| Chap 1 | 100.0 | 4.002 | 0.393 | 1.023 | 39.5w | +17.5 |
| Chap 2 | 100.0 | 4.071 | 0.565 | 0.789 | 49.8w | -14.0 |
| Delta | 0 | 0.069 | 0.172 | 0.234 | 10.4w | — |

---

*Blueprint genere automatiquement depuis le code source et les donnees mesurees.*
*Aucune metrique inventee — toutes les valeurs proviennent des JSON de resultats.*
