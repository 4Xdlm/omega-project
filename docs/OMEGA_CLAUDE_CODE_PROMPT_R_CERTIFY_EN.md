# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT — R-CERTIFY-EN
# CERTIFICATION ANGLAIS NATIF DES 2 SURVIVANTS
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date         : 2026-03-23
# Branche      : phase-r-metrology-rebuild
# HEAD entrant : e8ffd44b (tag r-audit-deep-complete)
# Standard     : NASA-Grade L4
# Autorité     : Francky (Architecte Suprême)
#
# ═══════════════════════════════════════════════════════════════════════════════
# CONTEXTE
#
# R-AUDIT-DEEP a montré que seules 2 mesures survivent à TOUS les contrôles :
#   1. Rythme CV (variation rythmique des longueurs de phrases) : +0.225
#   2. Contradiction (densité d'adversatifs) : +0.198
#
# Ces résultats viennent d'un corpus dominé par le français.
# Avant de les considérer comme des lois universelles de la littérature,
# il faut les tester sur un corpus ANGLAIS NATIF (pas des traductions).
#
# Si les corrélations tiennent en anglais → candidats loi universelle.
# Si elles tombent → propriétés du français littéraire.
# ═══════════════════════════════════════════════════════════════════════════════

# RÈGLES
R-01 : NE TOUCHER À RIEN d'existant. Tout est ADDITIF.
R-02 : 1911 tests doivent PASS.
R-03 : Seuls les textes ÉCRITS en anglais comptent (pas les traductions).
R-04 : Minimum 20 romans anglais natifs pour que le test ait du sens.

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 1 — ISOLER LE SOUS-CORPUS ANGLAIS NATIF
# ═══════════════════════════════════════════════════════════════════════════════

## 1.1 — Identifier les textes anglais NATIFS dans le corpus

En utilisant EPOCH_REQUALIFICATION.json + noms de fichiers :

Auteurs anglais natifs connus dans le corpus :
```
Woolf (Mrs Dalloway, To the Lighthouse, Orlando, The Waves, A Haunted House)
McCarthy (Blood Meridian, No Country, The Road, Suttree)
Hemingway (The Sun Also Rises, The Garden of Eden, Men Without Women)
Dickens (David Copperfield, Oliver Twist, A Tale of Two Cities)
Brontë E (Wuthering Heights)
Brontë C (Jane Eyre)
Austen (Pride, Sense, Persuasion, Northanger)
Faulkner (As I Lay Dying)
Poe (Tales)
Melville (Moby Dick)
Twain (Tom Sawyer)
Stevenson (Jekyll, Treasure Island)
Orwell (Animal Farm)
Fitzgerald (Gatsby)
DeLillo (End Zone, White Noise, Underworld)
Morrison (Song of Solomon, Beloved)
Steinbeck (Burning Bright, Sweet Thursday, To a God Unknown)
James (Portrait of a Lady, The Ambassadors)
Forster (Howards End, Room with a View)
Hardy (Far from the Madding Crowd)
Hawthorne (Scarlet Letter)
Lawrence (Sons and Lovers)
Wharton (House of Mirth, Ethan Frome)
Nabokov EN (Lolita, Pale Fire, Bend Sinister)
```

Lister TOUS les fichiers correspondants.
EXCLURE toute traduction (ex: Camus traduit en anglais, Zola traduit en anglais).

## 1.2 — Vérifier la taille du sous-corpus

Documenter :
  - Nombre de romans anglais natifs trouvés
  - Nombre total de fenêtres de 20 phrases
  - Minimum requis : 20 romans, 5000 fenêtres

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 2 — CALCULER LES 2 SURVIVANTS EN ANGLAIS
# ═══════════════════════════════════════════════════════════════════════════════

## 2.1 — M6.5 Rythme CV en anglais

Pour chaque fenêtre de 20 phrases du sous-corpus EN :
  rhythm_cv = std(longueurs_phrases) / mean(longueurs_phrases)

Puis :
  corr_gb_en = Spearman(rhythm_cv, GB_V1) sur TOUTES les fenêtres EN
  mean_by_tier_en = moyenne par tier (S/A/B/C/D) sur le sous-corpus EN

## 2.2 — M4.3 Contradiction en anglais

ADAPTER les marqueurs au français ET à l'anglais :
```typescript
const ADVERSATIFS_EN = [
  'but', 'however', 'yet', 'nevertheless', 'nonetheless', 'although',
  'though', 'whereas', 'while', 'despite', 'in spite of', 'on the contrary',
  'conversely', 'still', 'even so', 'all the same', 'notwithstanding'
];

const ADVERSATIFS_FR = [
  'mais', 'cependant', 'pourtant', 'néanmoins', 'toutefois',
  'or', 'malgré', 'en dépit de', 'bien que', 'quoique',
  'au contraire', 'en revanche', 'par contre'
];
```

Pour chaque fenêtre EN :
  contradiction_en = count(ADVERSATIFS_EN) / sentence_count

Puis :
  corr_gb_en = Spearman(contradiction_en, GB_V1) sur les fenêtres EN

## 2.3 — Contrôle de longueur EN

Même audit que R-AUDIT-DEEP mais sur le sous-corpus EN :
  corr_rhythm_length_en = Spearman(rhythm_cv, avg_sentence_length)
  corr_contra_length_en = Spearman(contradiction, avg_sentence_length)
  partial_rhythm_en = corr(rhythm_cv, GB | contrôle longueur)
  partial_contra_en = corr(contradiction, GB | contrôle longueur)

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 3 — CALCULER TOUTES LES MESURES EN ANGLAIS (pour comparaison)
# ═══════════════════════════════════════════════════════════════════════════════

Pas seulement les 2 survivants. Calculer les 38 mesures R-MEASURE-TOTAL
sur le sous-corpus EN pour voir si le PATTERN GÉNÉRAL est le même.

En particulier, est-ce que les mesures LENGTH_CONFOUNDED en français
(malaise, ironie, etc.) sont AUSSI length-confounded en anglais ?

Et est-ce que violence/propulsion REMONTENT aussi en anglais après contrôle ?

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 4 — COMPARER FR vs EN
# ═══════════════════════════════════════════════════════════════════════════════

## 4.1 — Tableau de comparaison principal

```
MESURE               CORR_GB_FR   CORR_GB_EN   PARTIAL_FR   PARTIAL_EN   VERDICT
M6.5 Rythme CV       +0.225       +0.???       +0.225       +0.???       UNIVERSEL / FR_ONLY
M4.3 Contradiction   +0.198       +0.???       +0.198       +0.???       UNIVERSEL / FR_ONLY
M9 Violence          +0.171       +0.???       +0.171       +0.???       UNIVERSEL / FR_ONLY
M9 Propulsion        +0.160       +0.???       +0.160       +0.???       UNIVERSEL / FR_ONLY
M9 Malaise           +0.053       +0.???       +0.053       +0.???       ...
```

## 4.2 — Verdicts par mesure

Pour chaque mesure :
  Si corr_en ≈ corr_fr (delta < 0.05) → UNIVERSAL_CANDIDATE
  Si corr_en > 0 mais < corr_fr × 0.5 → LANGUAGE_MODULATED
  Si corr_en ≈ 0 ou inversé → FR_SPECIFIC

## 4.3 — Profils par type en anglais

Calculer les profils typologiques (% dialogue, action, etc.) du sous-corpus EN.
Comparer avec le sous-corpus FR.
Les maîtres anglais ont-ils la même composition que les maîtres français ?

# ═══════════════════════════════════════════════════════════════════════════════
# LIVRABLES
# ═══════════════════════════════════════════════════════════════════════════════

| Fichier | Contenu |
|---------|---------|
| data/EN_NATIVE_CORPUS.json | Liste des fichiers EN natifs, nb fenêtres |
| data/EN_MEASURES.json | 38 mesures × 6 axes sur le sous-corpus EN |
| data/FR_VS_EN_COMPARISON.json | Tableau comparatif FR vs EN |
| docs/R_CERTIFY_EN_REPORT.md | Rapport avec verdicts UNIVERSEL/FR_ONLY |

## Commit

```bash
git add -A
git commit -m "feat(R-CERTIFY-EN): test surviving measures on native English corpus

EN corpus: X novels, X windows
Rythme CV: FR +0.225 → EN +0.??? [UNIVERSAL / FR_ONLY]
Contradiction: FR +0.198 → EN +0.??? [UNIVERSAL / FR_ONLY]
Violence: FR +0.171 → EN +0.??? [UNIVERSAL / FR_ONLY]
Full 38-measure comparison included
1911 tests PASS"
git tag r-certify-en-complete
```

# CRITÈRES DE SORTIE

- [ ] ≥ 20 romans anglais natifs identifiés (pas de traductions)
- [ ] ≥ 5000 fenêtres EN
- [ ] Rythme CV calculé en EN + corrélation GB + contrôle longueur
- [ ] Contradiction calculée en EN (avec ADVERSATIFS_EN) + corr + contrôle
- [ ] 38 mesures calculées en EN pour comparaison
- [ ] Tableau FR vs EN avec verdicts
- [ ] Profils typologiques EN vs FR
- [ ] Rapport R_CERTIFY_EN_REPORT.md
- [ ] 1911 tests PASS
- [ ] Commit + tag
