# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT — R-FIX-3
# CORRECTION DES 3 PROBLÈMES DE JUSTESSE
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date         : 2026-03-22
# Branche      : phase-r-metrology-rebuild
# HEAD entrant : b97fb02c (tag r-oracle-v1-complete)
# Standard     : NASA-Grade L4
# Autorité     : Francky (Architecte Suprême)
#
# ═══════════════════════════════════════════════════════════════════════════════
# CONTEXTE : 3 problèmes empoisonnent TOUTES les mesures en aval.
# On ne lance RIEN d'autre tant qu'ils ne sont pas résolus.
# ═══════════════════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════════════════════
# RÈGLES
# ═══════════════════════════════════════════════════════════════════════════════

R-01 : NE TOUCHER NI au GB V1, NI au V3, NI aux features de scoring.
R-02 : Le passage-classifier.ts PEUT être modifié (c'est le sujet).
R-03 : Les 7 stress tests auteurs doivent TOUJOURS PASS après correction.
R-04 : 1911 tests existants doivent PASS.

# ═══════════════════════════════════════════════════════════════════════════════
# FIX 1 — RÉSIDU CLASSIFIEUR (37% → target < 15%)
# ═══════════════════════════════════════════════════════════════════════════════

## DIAGNOSTIC

Le résidu_pct = 0.3693 dans CALIBRATION_METRICS.json.
1 491 967 phrases sur 4 035 518 ne sont pas classées (score max < seuil).

### Étape 1.1 — Extraction de 1000 phrases à haut résidu

Créer : scripts/diagnose-residual.ts

Pour chaque roman du corpus :
1. Tagger chaque phrase avec scoreSentence()
2. Si TOUTES les 5 scores < 0.15 → la phrase est résidu
3. Collecter 1000 phrases résidu (échantillon représentatif)
4. Pour chaque phrase, afficher :
   - le texte (premiers 120 caractères)
   - les 5 scores
   - la langue détectée (FR/EN/autre)
   - la longueur en mots
   - le fichier source

### Étape 1.2 — Classification manuelle des causes

Regrouper les 1000 phrases en catégories de CAUSE :

```typescript
const RESIDUAL_CAUSES = {
  'TOO_SHORT': 0,         // phrase < 5 mots (fragment)
  'NON_LITERARY': 0,      // table des matières, notes, préface, copyright
  'FOREIGN_LANG': 0,      // ni FR ni EN (DE, ES, IT, etc.)
  'TRANSITION': 0,        // liant narratif pur (il y avait, c'était, on voyait)
  'EXPOSITION': 0,        // information factuelle sans marqueur de type
  'MIXED_WEAK': 0,        // plusieurs types à score faible (aucun dominant)
  'SEUIL_TROP_STRICT': 0, // la phrase DEVRAIT être classée mais les seuils sont trop hauts
  'UNKNOWN': 0,           // vraiment inclassable
};
```

Afficher le comptage de chaque cause.

### Étape 1.3 — Corrections selon le diagnostic

SI TOO_SHORT > 20% → filtrer les phrases < 5 mots avant classification
SI NON_LITERARY > 20% → améliorer le skip Gutenberg (chercher aussi "TABLE DES MATIÈRES",
   "CHAPITRE", "NOTES", "FIN", "COPYRIGHT", "TABLE OF CONTENTS", page numbers)
SI FOREIGN_LANG > 10% → ajouter une détection de langue simple et skip non-FR/EN
SI TRANSITION > 20% → ajouter des marqueurs de narration/transition :
   "il y avait", "c'était", "on voyait", "there was", "it was", "one could see"
   → ces phrases deviennent NARRATION (critère positif)
SI SEUIL_TROP_STRICT > 20% → baisser les seuils de détection de 0.15 à 0.10
SI EXPOSITION > 20% → ajouter des marqueurs d'exposition factuelle :
   "en l'an", "dans la ville de", "le pays de", "in the year", "in the city of"
   → ces phrases deviennent NARRATION

### Étape 1.4 — Validation

Après corrections :
1. Relancer la calibration sur le corpus entier
2. Vérifier résidu < 20% (idéal < 15%)
3. Relancer les 7 stress tests → DOIVENT PASS
4. Si un stress test échoue → rollback la correction fautive

### CRITÈRE DE SORTIE FIX 1
- résidu < 20% (PASS minimal)
- résidu < 15% (PASS optimal)
- 7 stress tests toujours PASS
- diagnostic des causes documenté

# ═══════════════════════════════════════════════════════════════════════════════
# FIX 2 — HURST NON-MONOTONE (A > S : 0.722 > 0.706)
# ═══════════════════════════════════════════════════════════════════════════════

## DIAGNOSTIC

Le coefficient de Hurst par tier :
  S = 0.7056 (n=277)
  A = 0.7215 (n=91) ← PLUS ÉLEVÉ que S
  B = 0.6915 (n=101)
  C = 0.6793 (n=91)
  D = 0.6664 (n=10)

### Étape 2.1 — Test statistique

Calculer le t-test S vs A :
```typescript
// H₀ : μ_S = μ_A
// delta = 0.7215 - 0.7056 = 0.0159
// pooled_std ≈ sqrt((0.0514² × 276 + 0.0573² × 90) / (277 + 91 - 2)) ≈ 0.053
// t = 0.0159 / (0.053 × sqrt(1/277 + 1/91)) ≈ 2.3
// p ≈ 0.02 → SIGNIFICATIF
```

Calculer et documenter : t, p, effet (Cohen's d), IC 95%.

### Étape 2.2 — Hurst LOCAL (la vraie mesure)

Le Hurst GLOBAL est une moyenne. Le S-tier pourrait avoir des zones de H=0.8
(structure parfaite) alternant avec des zones de H=0.5 (rupture), ce qui donne
un H moyen de 0.7 — PLUS BAS que le A-tier qui est uniformément à H=0.72.

Pour CHAQUE roman :
1. Calculer le Hurst sur des fenêtres GLISSANTES de 50 phrases, pas de 25
2. Obtenir une SÉRIE de Hurst locaux : [H₁, H₂, H₃, ..., Hₙ]
3. Calculer :
   - H_mean : Hurst moyen (= le global qu'on a déjà)
   - H_std : ÉCART-TYPE des Hurst locaux (la VARIANCE)
   - H_range : max(H) - min(H) (l'amplitude)
   - H_drops : nombre de chutes brutales (H_{i+1} - H_i < -0.05)

### Étape 2.3 — Corréler les nouvelles métriques avec le tier

```
           H_mean   H_std   H_range   H_drops
S-tier     0.706    ???     ???       ???
A-tier     0.722    ???     ???       ???
B-tier     0.692    ???     ???       ???
C-tier     0.679    ???     ???       ???
D-tier     0.666    ???     ???       ???
```

HYPOTHÈSE : H_std du S-tier est PLUS ÉLEVÉ que H_std du A-tier.
Le S-tier alterne structure et rupture. Le A-tier est uniformément structuré.

### Étape 2.4 — Corréler H_std avec GB V1

Spearman(H_std, GB_mean_par_roman) → signe et magnitude.

### CRITÈRE DE SORTIE FIX 2
- Test t S vs A documenté avec p-value
- H_std, H_range, H_drops calculés pour tous les romans
- Tableau par tier documenté
- Corrélation H_std × GB documentée
- VERDICT : "Le S-tier a plus de variance Hurst" → OUI/NON avec preuve

# ═══════════════════════════════════════════════════════════════════════════════
# FIX 3 — SYNERGIES INTRA-AUTEUR = 49.3% (PILE OU FACE)
# ═══════════════════════════════════════════════════════════════════════════════

## DIAGNOSTIC

CAUSAL_AUDIT_COMPLETE.json → intra_author.pct = 0.493 (140/284)
C'est un pile ou face. La chimie positive n'est PAS confirmée.

### Étape 3.1 — Corrélations PARTIELLES

Calculer la corrélation entre chaque paire de types et le GB V1, 
en CONTRÔLANT les variables confondantes :

```typescript
// Variables de contrôle :
// - auteur (dummy variable ou ID)
// - longueur du roman (en phrases)
// - langue (FR=0, EN=1)
//
// Pour chaque paire (type_A × type_B) :
//   Collecter pour chaque fenêtre :
//     x = pct_type_A × pct_type_B (interaction)
//     y = GB_score
//     controls = [author_id, length, language]
//   
//   Régression : y = β₀ + β₁×x + β₂×author + β₃×length + β₄×language
//   Le β₁ est l'effet NET de l'interaction, débarrassé des confusions.
//   Si β₁ > 0 et p < 0.05 → synergie RÉELLE
//   Si β₁ ≈ 0 → biais auteur confirmé
```

### Étape 3.2 — Analyse par sous-groupe de maîtres

Isoler les 20 auteurs du corpus avec le GB V1 moyen le plus élevé.
Pour CHAQUE maître :
1. Prendre toutes ses fenêtres
2. Les diviser en QUINTILES par GB V1 (les 20% meilleures vs 20% pires)
3. Comparer la composition des quintiles hauts vs bas
4. Le mélange est-il PLUS diversifié dans les quintiles hauts ?

```typescript
// Pour chaque maître :
//   top_quintile = fenêtres avec GB > percentile_80
//   bottom_quintile = fenêtres avec GB < percentile_20
//   compare : mean(transition_rate_top) vs mean(transition_rate_bottom)
//   compare : mean(type_entropy_top) vs mean(type_entropy_bottom)
```

Si les fenêtres MEILLEURES d'un maître sont PLUS diversifiées → chimie réelle chez les maîtres.
Si pas de différence → la chimie est un artefact.

### Étape 3.3 — Bootstrap + IC sur les 5 synergies

Pour chaque synergie (dialogue×narration +0.051, etc.) :
1. Rééchantillonner 2000 fois avec remplacement
2. Calculer l'IC à 95%
3. Si IC ne contient pas 0 → statistiquement significatif
4. Même chose INTRA-AUTEUR (sur les 20 maîtres seulement)

### CRITÈRE DE SORTIE FIX 3
- Corrélations partielles calculées pour les 5 synergies principales
- β, erreur standard, p-value pour chaque paire
- Analyse par quintile des 20 meilleurs auteurs
- Bootstrap IC 95% documenté
- VERDICT FINAL : "La chimie est [RÉELLE / ARTEFACT / MIXTE]" avec preuve

# ═══════════════════════════════════════════════════════════════════════════════
# EXÉCUTION
# ═══════════════════════════════════════════════════════════════════════════════

ORDRE : FIX 1 → FIX 2 → FIX 3 (séquentiel, pas parallèle)
FIX 1 modifie le classifieur → FIX 2 et FIX 3 doivent tourner sur les données corrigées.

## Scripts à créer

| Script | Rôle |
|--------|------|
| scripts/diagnose-residual.ts | Diagnostic des 1000 phrases résidu |
| scripts/fix-residual.ts | Corrections du classifieur |
| scripts/hurst-local.ts | Hurst local + variance + drops |
| scripts/causal-deep-audit.ts | Corrélations partielles + quintiles + bootstrap |

## Fichiers de données à produire

| Fichier | Contenu |
|---------|---------|
| data/RESIDUAL_DIAGNOSIS.json | 1000 phrases + causes |
| data/HURST_LOCAL_ANALYSIS.json | H_std, H_range, H_drops par roman |
| data/CAUSAL_DEEP_AUDIT.json | Corrélations partielles + quintiles + bootstrap |

## Commit

```bash
git add -A
git commit -m "fix(R-FIX-3): resolve 3 measurement accuracy problems

FIX 1: Residual reduced from 37% to X% (target <15%)
  - Diagnosed X causes, corrected classifier
  - 7 stress tests still PASS
FIX 2: Hurst non-monotone explained
  - S-tier H_std = X (vs A-tier H_std = X)
  - Verdict: [S-tier breaks rhythm / statistical artifact]
FIX 3: Chemistry causality audited
  - Partial correlations β = X (p = X)
  - Top 20 masters quintile analysis: [diversity helps / no effect]
  - Bootstrap CI: [contains 0 / doesn't contain 0]
  - VERDICT: [REAL / ARTIFACT / MIXED]

1911 tests PASS, 0 regressions"
git tag r-fix-3-complete
```

## CRITÈRES DE SORTIE (TOUS OBLIGATOIRES)

- [ ] Résidu < 20% (idéal < 15%)
- [ ] Diagnostic des causes du résidu documenté
- [ ] 7 stress tests auteurs PASS après correction
- [ ] Hurst H_std, H_range, H_drops calculés pour ≥ 100 romans
- [ ] Test t S vs A documenté avec p-value et Cohen's d
- [ ] Corrélation H_std × GB documentée
- [ ] Corrélations partielles sur 5 synergies (avec contrôle auteur+longueur+langue)
- [ ] Analyse par quintile des 20 meilleurs auteurs
- [ ] Bootstrap IC 95% sur les 5 synergies
- [ ] VERDICTS documentés pour les 3 problèmes
- [ ] 1911 tests PASS, zéro régression
- [ ] Commit + tag r-fix-3-complete

# ═══════════════════════════════════════════════════════════════════════════════
# FIN — On ne mesure rien de nouveau sur un thermomètre cassé.
# ═══════════════════════════════════════════════════════════════════════════════
