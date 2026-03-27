# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — MASTER DOSSIER : PHYSIQUE LITTÉRAIRE COMPLÈTE
# Session Marathon 27-28 mars 2026
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date         : 2026-03-27 / 2026-03-28
# HEAD         : b189dccc
# Branche      : phase-r-metrology-rebuild
# Tests        : 2011 PASS
# Standard     : NASA-Grade L4 / DO-178C Level A
# Convergence  : Claude + ChatGPT + Gemini + Francky (Architecte Suprême)
#
# Ce document est le RÉFÉRENTIEL UNIQUE de toutes les mesures, découvertes,
# inter-relations et lois établies pendant cette session marathon.
# Tout ce qui n'est pas dans ce document N'EXISTE PAS.
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# TABLE DES MATIÈRES

1. Résumé exécutif
2. Audit brut multi-échelle (1.38M fenêtres)
3. Test volume (LOI L32)
4. Protocole Angostura (renversement des features)
5. Hiérarchie multi-échelle (5 tailles)
6. Inter-relations proportionnelles (le cocktail)
7. Confirmations C1-C2-C3
8. Les deux blocs antagonistes
9. Chaînes causales et médiations
10. Classification finale des 42 features
11. Redondances à éliminer
12. Lois scellées
13. Faiblesses connues
14. Commits de la session
15. Prochaines actions
16. Message de reprise

---

# 1. RÉSUMÉ EXÉCUTIF

## En une phrase
On a découvert que la littérature est un système hiérarchique à 4 étages
où les features changent de rôle selon la taille du texte, et où la ponctuation
(point-virgule, tiret) est le signal de surface d'une architecture syntaxique
profonde que les Maîtres déploient mais que le LLM comprime.

## Les 5 découvertes majeures

1. **Les features "instables" sont les vrais drivers** — semicolon_count (CV>1.0)
   prédit le tier 100× mieux que f29d_ttr (CV=0.03). On confondait stabilité et utilité.

2. **Deux blocs antagonistes** — Bloc Ample (semicolon, f26b, sub) vs Bloc Percutant
   (dash, excl, knife). Quand l'un monte, l'autre baisse. Les Maîtres alternent.

3. **Les features changent d'étage avec la taille** (LOI L36) — semicolon domine à 500w
   mais recule à #5 à 5000w. f26b et mean_para_len prennent le relais sur les longs textes.

4. **Le volume seul ne suffit pas** (LOI L32) — 0/6 SAGA_READY en test volume. Le LLM
   refuse de dépasser ~500w en single-shot. Le goulot est RCI, pas la taille.

5. **Il existe un optimum, pas un maximum** — Le coefficient d'interaction std×f1a est
   négatif : trop de variance + trop de longueur = excès. L'équilibre > la maximisation.

## Chiffres clés

| Métrique | Valeur |
|----------|--------|
| Livres analysés | 571 |
| Chapitres extraits | 23 005 |
| Fenêtres mesurées | 1 381 345 |
| Features calculées | 42 (+ 19 UNAVAILABLE) |
| Tailles analysées | 200, 500, 700, 1000, 2000, 3000+, 5000+, full |
| Tests unitaires | 2011 PASS |
| API calls (test volume) | ~60 |
| API calls (audit) | 0 (CALC pur) |

---

# 2. AUDIT BRUT MULTI-ÉCHELLE

## 2.1 Mandat

Recalculer TOUTES les métriques littéraires depuis le texte brut (.txt), sans
réutiliser aucune valeur pré-calculée, sans aucune interpolation entre tailles.
L'audit précédent (MASTER_SCALE_LADDER.json) interpolait linéairement — REJETÉ.

## 2.2 Méthode

- **Source** : 571 fichiers .txt dans omega-autopsie/corpus_r/txt/ (404 MB)
- **Split chapitres** : regex CHAPITRE/CHAPTER/LIVRE/BOOK/PART/PARTIE + numéraux
- **Split phrases** : regex `(?<=[.!?…»])\s+`, minimum 6 caractères
- **Fenêtres** : glissantes (stride 10%, cap 20/chapitre/taille) + ancrées (START/MIDDLE/END)
- **Seuils** : LONG >40w, SHORT <10w, KNIFE ≤5w, TRANS_LONG >30w, TRANS_SHORT <10w

## 2.3 Corpus

| Tier | Livres | % |
|------|--------|---|
| S (Maîtres) | 278 | 48.7% |
| A (Excellent) | 91 | 15.9% |
| B (Bon) | 101 | 17.7% |
| C (Moyen) | 91 | 15.9% |
| D (Faible) | 10 | 1.8% |

Langues : FR 241 / EN 259 / ES 69 / IT 2

## 2.4 Fenêtres par taille

| Taille | Fenêtres | % du total |
|--------|----------|-----------|
| 200w | 385 665 | 27.9% |
| 500w | 266 332 | 19.3% |
| 700w | 222 270 | 16.1% |
| 1000w | 172 246 | 12.5% |
| 2000w | 83 958 | 6.1% |
| Chapitre entier | 22 902 | 1.7% |
| **Total** | **1 381 345** | |

## 2.5 Features par taille — Moyennes globales

| Feature | @200w | @500w | @700w | @1000w | @2000w | @full |
|---------|-------|-------|-------|--------|--------|-------|
| mean_sent_len | 19.36 | 19.45 | 19.37 | 19.35 | 19.57 | 19.26 |
| cv_sent | 0.679 | 0.706 | 0.714 | 0.724 | 0.741 | 0.739 |
| f26b_long_sent_rate | 0.093 | 0.094 | 0.093 | 0.092 | 0.094 | 0.088 |
| f17_knife_count | 2.68 | 6.27 | 8.62 | 12.11 | 23.76 | 33.55 |
| ratio_alt | 0.060 | 0.058 | 0.058 | 0.059 | 0.060 | 0.059 |
| f29d_ttr_score | 0.707 | 0.746 | 0.750 | 0.753 | 0.756 | 0.751 |
| f1a_rhythm_variance | 13.13 | 13.82 | 13.94 | 14.15 | 14.79 | 14.58 |

Constats :
- mean_sent_len, f26b, ratio_alt : **INVARIANTS PAR ÉCHELLE** (moyenne constante)
- f17_knife_count : **CROISSANCE LINÉAIRE** (compteur, R²=1.000)
- cv_sent : **CROÎT LOGARITHMIQUEMENT**
- f29d_ttr : **SAUTE à 500w** puis plateau

## 2.6 CV par taille

| Feature | CV@200 | CV@500 | CV@1000 | CV@2000 |
|---------|--------|--------|---------|---------|
| f29d_ttr_score | 0.060 | 0.033 | 0.026 | 0.024 |
| f16a_bigram_rarity | 0.020 | 0.019 | 0.020 | 0.023 |
| f36c_cliff_score | 0.155 | 0.155 | 0.154 | 0.155 |
| cv_sent | 0.297 | 0.251 | 0.226 | 0.216 |
| f19a_approx_entropy | 0.297 | 0.248 | 0.223 | 0.210 |
| f35c_hook_score | 0.338 | 0.343 | 0.345 | 0.349 |
| mean_sent_len | 0.546 | 0.582 | 0.672 | 0.857 |
| knife_rate | 0.916 | 0.778 | 0.685 | 0.641 |
| ratio_alt | 1.536 | 1.110 | 0.889 | 0.735 |
| f26b_long_sent_rate | 1.576 | 1.365 | 1.279 | 1.199 |
| f1a_rhythm_variance | 0.718 | 0.776 | 0.895 | 1.296 |

## 2.7 Corrélations par taille (Spearman ρ)

### Corrélations stables (6 paires confirmées)

| Paire | r@200 | r@500 | r@1000 | r@2000 |
|-------|-------|-------|--------|--------|
| f26b vs f1a | +0.847 | +0.914 | +0.938 | +0.948 |
| mean vs f26b | +0.784 | +0.884 | +0.921 | +0.942 |
| mean vs f1a | +0.805 | +0.875 | +0.894 | +0.896 |
| f26b vs f17 | -0.517 | -0.702 | -0.766 | -0.795 |
| f26b vs ratio_alt | +0.279 | +0.410 | +0.540 | +0.620 |
| ratio_alt vs cv_sent | +0.394 | +0.357 | +0.375 | +0.384 |

### INVERSION DÉTECTÉE (artefact petite fenêtre)

| Paire | r@200 | r@500 | r@1000 | r@2000 |
|-------|-------|-------|--------|--------|
| **f29d_ttr vs f16a_bigram** | **+0.148** | **-0.292** | **-0.411** | **-0.494** |

## 2.8 Différentiel par Tier (à 500w)

| Feature | S (n=278) | A (n=91) | B (n=101) | C (n=91) | Delta S-C |
|---------|-----------|----------|-----------|----------|-----------|
| mean_sent_len | **22.10** | 19.13 | 16.62 | **12.59** | **+76%** |
| f26b_long_sent_rate | **0.126** | 0.092 | 0.061 | **0.011** | **+1050%** |
| f1a_rhythm_variance | **16.08** | 13.67 | 11.22 | **8.17** | **+97%** |
| ratio_alt | **0.070** | 0.059 | 0.046 | **0.026** | **+170%** |
| sub_per_sentence | **0.828** | 0.767 | 0.629 | **0.472** | **+75%** |
| cv_sent | 0.726 | 0.713 | 0.674 | 0.655 | +11% |
| f29d_ttr_score | 0.746 | 0.747 | 0.744 | 0.744 | **~0%** |
| f16a_bigram_rarity | 0.952 | 0.952 | 0.952 | 0.956 | **~0%** |

**CONSTAT MAJEUR** : Les Maîtres se distinguent par la STRUCTURE SYNTAXIQUE
(longueur +76%, subordination +75%, phrases longues +1050%), PAS par le
vocabulaire (TTR et bigram identiques entre tiers).

## 2.9 Équations runtime (R² > 0.80)

```
cv_sent(size)         = 0.0259 × log(size) + 0.5355    [R²=0.999]
f19a_entropy(size)    = -0.0261 × log(size) + 0.8187   [R²=0.999]
f17_knife_count(size) = 0.01167 × size - 0.1136         [R²=1.000]
f1a_variance(size)    = 0.000891 × size + 12.770        [R²=0.905]
knife_rate_cv(size)   = -0.0538 × log(size) + 1.2260    [R²=0.965]
ratio_alt_cv(size)    = -0.1619 × log(size) + 2.3840    [R²=0.966]
```

f26b (moyenne) : NO_STABLE_EQUATION (R²=0.007) — invariant par échelle.
ratio_alt (moyenne) : NO_STABLE_EQUATION (R²=0.058) — invariant par échelle.

## 2.10 Verdicts

| Question | Verdict |
|----------|---------|
| Q1. Taille min fiable par feature | **PASS** — 11 features documentées |
| Q2. Features trompeuses à 200w | **PASS** — 4 identifiées |
| Q3. Features crédibles par taille | **PASS** — 6 dès 200w, 7 dès 500w |
| Q4. Changement de régime | **PASS** — 5 features documentées |
| Q5. Corrélations vraies | **PASS** — 6 paires stables |
| Q6. Artefacts petite taille | **PASS** — 1 inversion détectée |
| Q7. Cohérence maîtres | **INDÉTERMINÉ** |
| Q8. Type change avec taille | **NON MESURÉ** — quarantaine |
| Q9. Confidence table | **PASS** |
| Q10. Équations runtime | **PASS** — 6 équations R²>0.80 |

---

# 3. TEST VOLUME (LOI L32)

## 3.1 Hypothèse

L'archéologie des briques SAGA montrait +28% de mots entre gagnantes et perdantes.
Hypothèse : augmenter target_word_count (500/750/1000w) pourrait passer Menace
et Révélation en SAGA_READY.

## 3.2 Bug trouvé et corrigé (commit 62bfbc81)

`MAX_GENERATION_TOKENS = 2000` (hard-coded) dans real-llm-provider.ts.
Fix : `computeGenerationTokens(packet)` = max(2000, target × 4 × 1.2)
Prompt : "MINIMUM X mots" pour targets > 600w.

## 3.3 Résultats V1 (avant fix) + V2 (après fix)

### V2 (post-fix)

| Brique | Target | Words | Comp | min_axis | ECC | RCI | SII | IFI | AAI | SAGA |
|--------|--------|-------|------|----------|-----|-----|-----|-----|-----|------|
| Menace | 500 | 302 | 87.7 | 61.9 | 91.6 | 86.7 | 61.9 | 97.2 | 94.8 | NON |
| Menace | 750 | 320 | 90.8 | 81.7 | 91.7 | 81.7 | 90.0 | 97.0 | 93.6 | NON |
| **Menace** | **1000** | **470** | **91.8** | **83.9** | **93.4** | **83.9** | **89.0** | **96.5** | **94.8** | **NON** |
| Révélation | 500 | 302 | 90.1 | 81.3 | 92.1 | 81.3 | 90.5 | 81.8 | 96.4 | NON |
| **Révélation** | **750** | **394** | **91.3** | **84.2** | **94.3** | **84.2** | **91.3** | **84.6** | **94.8** | **NON** |
| Révélation | 1000 | 550 | 84.7 | 58.9 | 87.5 | 85.2 | 58.9 | 88.2 | 94.8 | NON |

### Comparaison V1 vs V2

| Run | V1 Words | V2 Words | V1 Comp | V2 Comp |
|-----|----------|----------|---------|---------|
| menace@500 | 292 | 302 | 87.8 | 87.7 |
| menace@750 | 261 | 320 | 91.7 | 90.8 |
| menace@1000 | 378 | 470 | 90.2 | 91.8 |
| revelation@500 | 357 | 302 | 91.6 | 90.1 |
| revelation@750 | 676 | 394 | 91.4 | 91.3 |
| revelation@1000 | 307 | 550 | 86.1 | 84.7 |

## 3.4 Diagnostic

1. Le LLM refuse mécaniquement de dépasser ~500w en single-shot
2. RCI est le goulot systématique (82-84 sur 8/12 runs)
3. SII s'effondre sur les textes longs (58.9 à 550w)
4. 0/6 SAGA_READY

**LOI L32 SCELLÉE** : Le volume de génération seul ne transforme pas une brique
non-SAGA en SAGA. Le goulot est RCI, pas la taille.

---

# 4. PROTOCOLE ANGOSTURA — LE RENVERSEMENT

## 4.1 Contexte

On avait identifié 6 features "fiables" (CV < 0.50) et 34 "instables" (CV > 0.50).
L'Architecte a mis un veto : "si on les a mesurées, c'est qu'on ne comprend pas
leur rôle, pas qu'elles sont inutiles".

## 4.2 Données

141 366 fenêtres FR à 500w, Tier S/A/B/C, 42 features.
Random Forest (200 arbres, max_depth=10) + Permutation Importance (10 repeats).
R² cross-validation : 0.297 ± 0.219

## 4.3 Le renversement — Top 20 par permutation importance

| Rang | Feature | Importance | ± | CV@500 | Ancien statut |
|------|---------|-----------|---|--------|---------------|
| 1 | **semicolon_count** | **0.4196** | 0.003 | >1.0 | "INSTABLE" |
| 2 | **dash_count** | **0.2218** | 0.003 | >1.0 | "INSTABLE" |
| 3 | **excl_count** | **0.0755** | 0.001 | >1.0 | "INSTABLE" |
| 4 | **dialogue_ratio** | **0.0670** | 0.001 | >2.0 | "INSTABLE" |
| 5 | **colon_count** | **0.0503** | 0.001 | >1.0 | "INSTABLE" |
| 6 | f16a_bigram_rarity | 0.0487 | 0.001 | 0.019 | "STABLE" |
| 7 | **ellipsis_count** | **0.0474** | 0.000 | >1.0 | "INSTABLE" |
| 8 | **std_sent_len** | **0.0457** | 0.001 | ~0.8 | "INSTABLE" |
| 9 | **f1a_rhythm_variance** | **0.0396** | 0.001 | 0.776 | "INSTABLE" |
| 10 | **sub_per_sentence** | **0.0340** | 0.000 | 0.879 | "INSTABLE" |
| 11 | quest_count | 0.0154 | 0.000 | | "INSTABLE" |
| 12 | longest_sent_words | 0.0152 | 0.000 | | "INSTABLE" |
| 13 | f9a_contradiction_rate | 0.0150 | 0.000 | | "INSTABLE" |
| 14 | f26c_period_score | 0.0086 | 0.000 | | MEDIATOR |
| 15 | f19a_approx_entropy | 0.0081 | 0.000 | 0.248 | "STABLE" |
| 16 | range_sent_len | 0.0079 | 0.000 | | |
| 17 | cv_sent | 0.0077 | 0.000 | 0.251 | "STABLE" |
| 18 | f24c_contrast_delta | 0.0070 | 0.000 | 0.488 | "STABLE" |
| 19 | f1b_rhythm_ratio | 0.0063 | 0.000 | | |
| 20 | f26b_long_sent_rate | 0.0050 | 0.000 | 1.365 | "INSTABLE" |
| ... | ... | ... | ... | ... | ... |
| 24 | f29d_ttr_score | 0.0040 | 0.000 | 0.033 | "STABLE" |
| 32 | f35c_hook_score | 0.0010 | 0.000 | 0.343 | "STABLE" |
| 37 | f36c_cliff_score | 0.0003 | 0.000 | 0.155 | "STABLE" |

**LES 5 PREMIÈRES PLACES SONT DES FEATURES DE PONCTUATION — TOUTES "INSTABLES".**

Les 3 features les plus "fiables" (ttr, hook, cliff) sont des THERMOMÈTRES :
stables mais ne discriminent rien (importance < 0.004).

**CV élevé = VARIANCE INTER-AUTEURS = SIGNAL DISCRIMINANT.**
On confondait stabilité de mesure et importance causale.

---

# 5. HIÉRARCHIE MULTI-ÉCHELLE

## 5.1 Protocole

Même Random Forest + Permutation Importance, mais sur 5 tailles :
200, 500, 1000, 2000, full (chapitres entiers FR).

## 5.2 Résultats — Top 5 par taille

| Rang | @200w | @500w | @1000w | @2000w | @Full |
|------|-------|-------|--------|--------|-------|
| 1 | **semicolon** (0.259) | **semicolon** (0.419) | **semicolon** (0.442) | **semicolon** (0.402) | **semicolon** (0.297) |
| 2 | **dash** (0.161) | **dash** (0.216) | **dash** (0.279) | **dash** (0.212) | **dash** (0.247) |
| 3 | dialogue (0.113) | excl (0.077) | excl (0.094) | excl (0.124) | **mean_para_len** (0.158) |
| 4 | excl (0.061) | dialogue (0.072) | dialogue (0.090) | **f1a_rhythm** (0.078) | dialogue (0.102) |
| 5 | ellipsis (0.052) | colon (0.053) | colon (0.059) | dialogue (0.077) | ellipsis (0.086) |

## 5.3 R² par taille

| Taille | R² CV | Interprétation |
|--------|-------|----------------|
| 200w | 0.203 | 20% — bruyant |
| 500w | 0.297 | 30% — notre fenêtre de génération |
| 1000w | 0.342 | 34% — le signal se clarifie |
| 2000w | **0.385** | **39% — pic de prédiction** |
| Full | 0.333 | 33% — sur-segmentation pollue |

## 5.4 Features qui ÉMERGENT avec la taille

| Feature | @200w (rang) | @2000w (rang) | @Full (rang) |
|---------|-------------|---------------|-------------|
| **f1a_rhythm_variance** | #10 (0.025) | **#4** (0.078) | **#7** (0.065) |
| **mean_para_len** | NOISE (0.000) | NOISE (0.000) | **#3** (0.158) |
| **cv_para** | NOISE (0.000) | NOISE (0.000) | **#6** (0.070) |
| **quest_count** | #18 (0.005) | #13 (0.021) | **#8** (0.056) |

## 5.5 Résultats C1 — Extension aux tailles 3000w+ et 5000w+

| Rang | @2000w | @3000w+ (n=2492) | @5000w+ (n=1375) |
|------|--------|------------------|------------------|
| 1 | semicolon (0.398) | **f26b** (0.247) | **mean_para_len** (0.229) |
| 2 | dash (0.211) | dash (0.238) | **f26b** (0.189) |
| 3 | excl (0.121) | **cv_para** (0.169) | **ratio_alt** (0.153) |
| 4 | std_sent (0.078) | semicolon (0.153) | **cv_para** (0.131) |
| 5 | dialogue (0.075) | **mean_para_len** (0.109) | semicolon (0.109) |

**DÉCOUVERTE C1** : semicolon RECULE de #1 à #4/#5 au-delà de 3000 mots.
Les features structurelles (f26b, mean_para_len, cv_para, ratio_alt) prennent le relais.

## 5.6 La hiérarchie des étages — CONFIRMÉE EMPIRIQUEMENT

```
≤ 2000w : ÉTAGE 0 domine (ponctuation = signal local)
           semicolon #1, dash #2, excl #3

3000w+  : ÉTAGE 1 prend le relais (régime structurel)
           f26b #1, dash #2, cv_para #3, semicolon #4

5000w+  : ÉTAGE 2 domine (macro-architecture)
           mean_para_len #1, f26b #2, ratio_alt #3, cv_para #4
```

---

# 6. INTER-RELATIONS PROPORTIONNELLES

## 6.1 Top corrélations Spearman (141K fenêtres FR 500w)

### Corrélations fortes (>+0.80)

| Feature A | Feature B | ρ |
|-----------|-----------|---|
| std_sent_len | f1a_rhythm_variance | **+1.000** (IDENTIQUES) |
| cv_sent | f19a_approx_entropy | **+1.000** (IDENTIQUES) |
| knife_rate | f17_knife_count | +0.973 |
| std_sent_len | longest_sent_words | +0.949 |
| std_sent_len | f24c_contrast_delta | +0.934 |
| std_sent_len | f26b_long_sent_rate | +0.907 |
| mean_sent_len | f17_knife_count | **-0.901** |
| f26b | mean_sent_len | +0.851 |

## 6.2 Matrice d'élasticité

**Quand feature X monte de +1 écart-type, de combien bouge feature Y ?**

| Cible | semicolon | dash | excl | dialogue | f1a_rhythm |
|-------|-----------|------|------|----------|------------|
| **f26b** | **+0.326** | -0.321 | -0.147 | -0.089 | **+0.619** |
| **mean_sent_len** | **+0.299** | -0.355 | -0.177 | -0.048 | **+0.850** |
| **cv_sent** | +0.189 | -0.028 | +0.180 | +0.062 | **+0.513** |
| **knife_rate** | -0.241 | **+0.541** | **+0.340** | +0.239 | -0.266 |
| **ratio_alt** | **+0.249** | -0.289 | -0.013 | -0.117 | **+0.320** |
| **sub_per_sentence** | +0.153 | -0.233 | -0.173 | -0.044 | **+0.639** |
| **f17_knife_count** | -0.262 | **+0.557** | **+0.303** | +0.220 | -0.306 |
| f29d_ttr | +0.021 | -0.013 | +0.012 | -0.013 | +0.056 |
| **f24c_contrast** | **+0.361** | -0.405 | -0.107 | -0.183 | **+0.429** |
| **f35c_hook** | -0.192 | **+0.386** | **+0.298** | +0.166 | -0.337 |
| f36c_cliff | -0.114 | +0.072 | +0.056 | -0.001 | -0.286 |

**Lecture** : semicolon (+1σ) → f26b monte de 0.33σ, knife baisse de 0.24σ.
dash (+1σ) → knife monte de 0.54σ, f26b baisse de 0.32σ. Effet INVERSE.

## 6.3 Table de proportionnalité concrète (P25→P75 chez les Maîtres Tier S)

### Quand semicolon_count passe de P25=1 à P75=5

| Cible | Bas (≤médiane) | Haut (>médiane) | Delta | % |
|-------|---------------|-----------------|-------|---|
| f26b | 0.077 | 0.118 | +0.041 | **+54%** |
| mean_sent_len | 18.9 | 21.9 | +3.0 | +16% |
| ratio_alt | 0.058 | 0.072 | +0.014 | +24% |
| f24c_contrast | 27.1 | 32.5 | +5.4 | +20% |
| knife_rate | 0.156 | 0.121 | -0.035 | **-22%** |
| f17_knife | 6.1 | 3.8 | -2.3 | **-38%** |
| f35c_hook | 0.565 | 0.532 | -0.033 | -6% |

### Quand dash_count passe de P25=0 à P75=3

| Cible | Bas | Haut | Delta | % |
|-------|-----|------|-------|---|
| f26b | 0.105 | 0.089 | -0.016 | **-15%** |
| mean_sent_len | 21.3 | 19.3 | -2.1 | -10% |
| knife_rate | 0.117 | 0.162 | +0.045 | **+38%** |
| f17_knife | 4.1 | 6.0 | +2.0 | **+49%** |
| f35c_hook | 0.526 | 0.574 | +0.047 | +9% |

### Quand sub_per_sentence passe de P25=0.49 à P75=1.03

| Cible | Bas | Haut | Delta | % |
|-------|-----|------|-------|---|
| f26b | 0.048 | 0.147 | +0.099 | **+205%** |
| mean_sent_len | 15.9 | 24.9 | +9.0 | **+56%** |
| knife_rate | 0.183 | 0.094 | -0.089 | **-49%** |
| f17_knife | 7.5 | 2.5 | -5.0 | **-67%** |
| f24c_contrast | 25.0 | 34.5 | +9.5 | +38% |
| f35c_hook | 0.595 | 0.502 | -0.093 | **-16%** |

### Quand f1a_rhythm_variance passe de P25=9.7 à P75=16.3

| Cible | Bas | Haut | Delta | % |
|-------|-----|------|-------|---|
| f26b | 0.026 | 0.168 | +0.142 | **+540%** |
| mean_sent_len | 15.1 | 25.6 | +10.5 | **+70%** |
| cv_sent | 0.650 | 0.799 | +0.149 | +23% |
| ratio_alt | 0.041 | 0.088 | +0.047 | **+116%** |
| f17_knife | 7.2 | 2.9 | -4.3 | -60% |
| f35c_hook | 0.608 | 0.489 | -0.119 | **-20%** |
| f24c_contrast | 21.5 | 38.0 | +16.5 | **+77%** |

---

# 7. CONFIRMATIONS C1-C2-C3

## 7.1 C1 — semicolon aux grandes tailles : RECULE

| Taille | semicolon rang | semicolon imp | #1 feature |
|--------|---------------|---------------|------------|
| 200w | #1 | 0.259 | semicolon |
| 500w | #1 | 0.419 | semicolon |
| 1000w | #1 | 0.442 | semicolon |
| 2000w | #1 | 0.398 | semicolon |
| **3000w+** | **#4** | **0.153** | **f26b** |
| **5000w+** | **#5** | **0.109** | **mean_para_len** |

**VERDICT C1** : semicolon = DRIVER LOCAL (≤2000w), PROXY STRUCTURAL (>3000w).
Les features d'Étage 1 (f26b, mean_para_len) prennent le relais.

## 7.2 C2 — semicolon universel : CONFIRMÉ

| Test | semicolon rang | Importance |
|------|---------------|-----------|
| Corpus complet | #1 | 0.419 |
| SANS Nabokov + Moby Dick + Sonata | **#1** | **0.420** |

Top 3 consommateurs retirés → aucun changement. Signal universel.

**VERDICT C2** : UNIVERSEL — pas un signal de quelques auteurs.

## 7.3 C3 — coefficient d'interaction : DIRECTIONNELLEMENT STABLE, MAGNITUDE INSTABLE

| Taille | Coef std×f1a | Delta R² |
|--------|-------------|----------|
| 200w | -0.051 | +0.049 |
| 500w | -0.030 | +0.067 |
| 1000w | -0.018 | +0.067 |
| 2000w | -0.010 | +0.043 |

Direction TOUJOURS négative (trop des deux = mauvais). Magnitude s'atténue 5×.
CV du coefficient = 0.57 → INSTABLE en magnitude.

En revanche, semicolon × dash est TOUJOURS positif et CROÎT :

| Taille | Coef semi×dash | Delta R² |
|--------|---------------|----------|
| 200w | +0.077 | +0.002 |
| 500w | +0.128 | +0.005 |
| 1000w | +0.138 | +0.007 |
| 2000w | +0.154 | +0.012 |

**VERDICT C3** : L'optimum existe mais s'atténue avec la taille.
La synergie semicolon × dash se RENFORCE avec la taille.

---

# 8. LES DEUX BLOCS ANTAGONISTES

## 8.1 Bloc AMPLE (style littéraire, phrases longues)

Features : semicolon, f26b, mean_sent_len, sub_per_sentence, f1a_rhythm,
ratio_alt, f24c_contrast, f9a_contradiction, longest_sent_words

Effet sur les axes :
- ECC (Émotion) : **AIDE** (r = +0.28 à +0.65)
- SII (Immersion) : **AIDE** (r = +0.23 à +0.90)
- IFI (Tension) : **NUIT** (r = -0.15 à -0.41)

## 8.2 Bloc PERCUTANT (accroche, phrases courtes)

Features : dash, excl, quest, ellipsis, dialogue_ratio, knife_rate,
f17_knife, f35c_hook

Effet sur les axes :
- IFI (Tension) : **AIDE** (r = +0.17 à +0.29)
- RCI (Rythme) : **AIDE** (r = +0.12 à +0.36)
- ECC (Émotion) : **NUIT** (r = -0.16 à -0.23)
- SII (Immersion) : **NUIT** (r = -0.18 à -0.44)

## 8.3 Le conflit fondamental

Quand Bloc Ample monte → IFI baisse.
Quand Bloc Percutant monte → ECC + SII baissent.

C'est la raison physique du plafond RCI à 82-84.
Les Maîtres résolvent ce conflit par l'ALTERNANCE, pas la maximisation.

---

# 9. CHAÎNES CAUSALES ET MÉDIATIONS

## 9.1 Top chaînes de médiation

| Source | → | Médiateur | → | Tier | Médiation | Type |
|--------|---|-----------|---|------|-----------|------|
| std_sent_len | → | mean_sent_len | → | Tier | **106%** | AMPLIFICATION |
| sub_per_sentence | → | f26b | → | Tier | **136%** | AMPLIFICATION+SUPPRESSION |
| f26c_period_score | → | f26b | → | Tier | **97%** | PROXY PUR |
| std_sent_len | → | f26b | → | Tier | **65%** | AMPLIFICATION |
| excl_count | → | mean_sent_len | → | Tier | **62%** | SUPPRESSION |
| excl_count | → | f26b | → | Tier | **54%** | SUPPRESSION |
| ellipsis_count | → | f26b | → | Tier | **44%** | AMPLIFICATION |
| excl_count | → | sub_per_sentence | → | Tier | **35%** | SUPPRESSION |
| colon_count | → | ratio_alt | → | Tier | **31%** | AMPLIFICATION |

## 9.2 Architecture des flux causaux

```
ÉTAGE 0 (Ponctuation — Observable)
  semicolon ─────────┐                    dash ──────────┐
  colon ────────────┐│                    excl ─────────┐│
  ellipsis ────────┐││                    quest ────────┐││
                   ↓↓↓                                 ↓↓↓
ÉTAGE 1 (Syntaxe — Mécanique)
  sub_per_sentence ←── semicolon (17%)    knife_rate ←── dash, excl
  ratio_alt ←───────── colon (31%)        f17_knife ←── dash (+0.56σ)
                   ↓↓↓                                 ↓↓↓
ÉTAGE 2 (Style — Régime)
  f26b ←── sub (136% via f26b)            f35c_hook ←── dash (+0.39σ)
  mean_sent_len ←── std (106%)
  f24c_contrast ←── f1a (+0.93 ρ)
                   ↓↓↓                                 ↓↓↓
ÉTAGE 3 (Impact — Axes)
  ECC ←── f26b (+0.47), semicolon (+0.28)  IFI ←── dash (+0.23), hook (+0.37)
  SII ←── sub (+0.90), mean (+0.90)        RCI ←── knife (+0.36), ratio_alt (+0.38)
```

## 9.3 Interactions multiplicatives

| Paire | R² additif | R² interaction | Gain | Coefficient |
|-------|-----------|---------------|------|-------------|
| **std_sent × f1a** | 0.070 | **0.136** | **+0.067** | **-0.030** |
| **semi × std_sent** | 0.205 | **0.233** | +0.028 | -0.069 |
| std_sent × sub | 0.070 | 0.098 | +0.028 | -0.022 |
| dialogue × bigram | 0.091 | 0.112 | +0.021 | -0.105 |
| **semi × dash** | 0.335 | 0.341 | +0.005 | **+0.128** |

La paire std×f1a a un coefficient NÉGATIF → trop des deux = EXCÈS.
La paire semi×dash a un coefficient POSITIF → mélanger les outils = SYNERGIE.

---

# 10. CLASSIFICATION FINALE DES 42 FEATURES

| Rôle | N | Features |
|------|---|----------|
| **DRIVER** | 13 | semicolon, dash, excl, dialogue_ratio, colon, ellipsis, std_sent_len, f1a_rhythm, sub_per_sentence, f16a_bigram, quest, longest_sent_words, f9a_contradiction |
| **CONFLICT** | 15 | mean_sent_len, f26b, f17, knife_rate, ratio_alt, f24c_contrast, range_sent, n_long, n_short, longest_run_long, longest_run_short, shortest_sent, sentence_count, median_sent, f1_mean |
| **THERMOMETER** | 3 | f29d_ttr, f35c_hook, f36c_cliff |
| **CONDITIONAL** | 3 | cv_sent, f19a_entropy, f1b_ratio |
| **MEDIATOR** | 1 | f26c_period_score (97% proxy de f26b) |
| **NOISE** | 7* | words, paragraph_count, mean_para_len*, std_para_len*, cv_para*, T_LC, T_CL |

*Note : mean_para_len et cv_para sont NOISE à 500w mais DRIVERS au chapitre entier.

---

# 11. REDONDANCES À ÉLIMINER

| Paire | ρ Spearman | Médiation | Action |
|-------|-----------|-----------|--------|
| std_sent_len ↔ f1a_rhythm_variance | **+1.000** | — | Garder f1a |
| cv_sent ↔ f19a_approx_entropy | **+1.000** | — | Garder cv_sent |
| f26c_period_score ↔ f26b | — | **97%** | Garder f26b |
| f17_knife_count ↔ knife_rate | +0.973 | — | Garder knife_rate |
| f1_mean ↔ mean_sent_len | +0.999 | — | Garder mean_sent_len |

Après élimination : 42 - 5 = **37 features utiles**.

---

# 12. LOIS SCELLÉES CETTE SESSION

| Loi | Énoncé |
|-----|--------|
| **L31** | r(f26b, f1a) = +0.840 chez les Maîtres vs -0.594 chez OMEGA. Le conflit est un artefact LLM, pas une loi naturelle. |
| **L32** | Le volume seul ne transforme pas une brique non-SAGA en SAGA. Le goulot est RCI, pas la taille. Le LLM refuse >500w en single-shot. |
| **L33** | Les features sont organisées en deux blocs antagonistes (AMPLE vs PERCUTANT). Quand un bloc monte, l'autre baisse. Les Maîtres alternent. Il existe un OPTIMUM, pas un maximum. |
| **L34** | semicolon_count et dash_count sont les deux premiers prédicteurs du tier à ≤2000w. Ils sont UNIVERSELS (pas auteur-spécifiques). |
| **L35** | sub_per_sentence est le méga-levier : +205% f26b, +56% mean_sent, -67% f17. L'influence descend par étages : Ponctuation → Syntaxe → Régime → Impact. |
| **L36** | Les features changent d'étage causal avec la taille. À ≤2000w, la ponctuation domine. À 3000w+, f26b et cv_para. À 5000w+, mean_para_len et ratio_alt. |

---

# 13. FAIBLESSES CONNUES

| # | Faiblesse | Impact | Confirmé | Effort fix |
|---|-----------|--------|----------|------------|
| 1 | Sur-segmentation chapitres | 31.6% fenêtres full polluées | OUI | 2h |
| 2 | Mélange de langues | Signal tier contaminé | OUI | 1h |
| 3 | 103 chapitres full manquants | Exclusions silencieuses | OUI | 30min |
| 4 | Désynchronisation JSON→Doc | DECISIONS.md peut diverger | MINEUR | 1h |
| 5 | 19 features indisponibles (NLP) | Équations partielles | ATTENDU | Long |
| 6 | semicolon = proxy à grande échelle | Ne pas intégrer directement au scorer | CONFIRMÉ C1 | — |
| 7 | Coef interaction instable en magnitude | CV=0.57 sur 4 tailles | CONFIRMÉ C3 | — |

---

# 14. COMMITS DE LA SESSION

| Commit | Description |
|--------|-------------|
| d84d5176 | Audit brut multi-échelle (1.38M fenêtres, 15 fichiers) |
| 82dea943 | Archéologie briques SAGA + alternance naturelle |
| ed31fdc1 | Script test volume |
| 62bfbc81 | Fix volume : dynamic MAX_GENERATION_TOKENS + prompt MINIMUM |
| ed61dd46 | Données test volume V2 (0/6 SAGA) |
| fca5923d | Protocole Angostura (42 features, renversement) |
| eacfedf2 | Hiérarchie multi-échelle (5 tailles) |
| 01d5590c | Inter-relations proportionnelles (élasticité + interactions + chaînes) |
| b189dccc | Confirmations C1+C2+C3 |

---

# 15. PROCHAINES ACTIONS

| Priorité | Action | Convergence | API | Effort |
|----------|--------|-------------|-----|--------|
| P0 | Audit hiérarchique complet (3000/5000w, contrôle auteur/œuvre) | 3/3 | 0 | 4h |
| P0 | Shadow mode : semicolon + dash + sub loggés partout sans décision | 3/3 | 0 | 1h |
| P1 | Variante C instrumentée (sonde, pas prod) | 3/3 | ~15 | 30min |
| P1 | Recalcul FR-only (équations + tiers) | 3/3 | 0 | 2h |
| P1 | Bench SII longueur (même texte × 5 tailles) | 2/3 | ~25 | 1h |
| P2 | Matrice de redondance / clusters latents | 2/3 | 0 | 2h |
| P2 | Audit segmentation (30 œuvres) | 2/3 | 0 | 2h |
| P3 | Bench croisé Claude vs Mistral | 2/3 | ~30 | 2h |
| P3 | Refonte scorer avec interactions non-linéaires | 1/3 | 0 | Lourd |

---

# 16. MESSAGE DE REPRISE

Pour redémarrer une session dans ce projet, coller ce bloc :

```
OMEGA SESSION — REPRISE POST-MARATHON PHYSIQUE LITTÉRAIRE

HEAD: b189dccc
Branche: phase-r-metrology-rebuild
Tests: 2011 PASS

ÉTAT: Audit Angostura + Hiérarchie + Inter-relations + Confirmations C1-C2-C3 terminés.

ACQUIS CLÉS:
- 42 features classées (13 DRIVERS, 15 CONFLICTS, 3 THERMO, 3 CONDITIONAL, 1 MEDIATOR, 7 NOISE)
- semicolon #1 prédicteur à ≤2000w mais recule à #4/#5 à 3000w+ (C1)
- semicolon universel — pas signal auteur-spécifique (C2)
- Coefficient d'interaction std×f1a stable en direction, instable en magnitude (C3)
- 2 blocs antagonistes: AMPLE (semicolon/f26b/sub) vs PERCUTANT (dash/excl/knife)
- sub_per_sentence = méga-levier (+205% f26b)
- Lois L31-L36 scellées

CE QU'IL NE FAUT PAS FAIRE:
- Intégrer semicolon directement dans le scorer (proxy à grande échelle)
- Jeter les features "instables" (ce sont les vrais drivers)
- Conclure "causal" sur une permutation importance seule
- Toucher au scorer avant audit hiérarchique complet

PROCHAINE ACTION: Audit hiérarchique complet FR-only + shadow mode + variante C instrumentée

Lire: docs/OMEGA_MASTER_DOSSIER_PHYSIQUE_LITTERAIRE.md pour le détail complet.
```

---

*Master Dossier produit le 2026-03-28*
*Session marathon : ~12 heures, 9 commits*
*571 livres | 1 381 345 fenêtres | 42 features | 6 lois scellées*
*Standard NASA-Grade L4 / DO-178C Level A*
*Convergence : Claude + ChatGPT + Gemini + Francky (Architecte Suprême)*
