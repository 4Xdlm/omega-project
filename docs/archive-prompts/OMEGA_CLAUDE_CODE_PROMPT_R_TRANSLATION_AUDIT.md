# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT — R-TRANSLATION-AUDIT
# ORIGINAL vs TRADUCTION — DANS LES DEUX SENS
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date         : 2026-03-23
# Branche      : phase-r-metrology-rebuild
# HEAD entrant : tag r-certify-en-complete (APRÈS certification EN)
# Standard     : NASA-Grade L4
# Autorité     : Francky (Architecte Suprême)
#
# ═══════════════════════════════════════════════════════════════════════════════
# CONTEXTE
#
# L'Architecte demande une vérification dans LES DEUX SENS :
#   A. Original FR → Traduit EN (Hugo, Flaubert, Proust, Camus traduits)
#   B. Original EN → Traduit FR (Woolf, McCarthy, Dickens, Hemingway traduits)
#
# Car ce qui est vrai dans un sens peut ne pas l'être dans l'autre.
# La traduction peut DÉTRUIRE le rythme et la contradiction de l'auteur
# ou les TRANSFORMER en autre chose.
#
# Si OMEGA détecte des pertes de signal en traduction, il devient un
# outil d'audit de fidélité traductive — un cas d'usage majeur.
# ═══════════════════════════════════════════════════════════════════════════════

# RÈGLES
R-01 : NE TOUCHER À RIEN d'existant. Tout est ADDITIF.
R-02 : 1911 tests doivent PASS.
R-03 : Comparer des PAIRES (même œuvre, deux langues).
R-04 : Les adversatifs doivent être adaptés par langue.
R-05 : Minimum 10 paires dans chaque sens.

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 1 — CONSTITUER LES PAIRES
# ═══════════════════════════════════════════════════════════════════════════════

## 1.1 — Paires FR original → EN traduction

Chercher dans le corpus les œuvres françaises qui existent AUSSI
en version anglaise :

```
Hugo : Les Misérables (FR) + The Hunchback / Toilers of the Sea (EN)
Flaubert : Madame Bovary (FR) + Madame Bovary (EN si présent)
Zola : L'Assommoir (FR) + The Drunkard (EN), La Bête Humaine (FR) + The Beast Within (EN),
       La Terre (FR) + The Earth (EN), L'Œuvre (FR) + The Kill (EN)
Camus : L'Étranger (FR) + The Stranger (EN)
Proust : Du côté de chez Swann (FR) — vérifier si version EN dans corpus
Dostoïevski : Crime et Châtiment (FR) — noter que AUCUNE version n'est originale
```

ATTENTION : Dostoïevski n'est ni FR ni EN natif → la version FR et la version EN
sont TOUTES DEUX des traductions du russe. Documenter cela comme cas spécial.

## 1.2 — Paires EN original → FR traduction

```
Woolf : Mrs Dalloway (EN) + Mrs Dalloway (FR si présent)
McCarthy : Blood Meridian (EN) + ? (FR si présent), The Road (EN) + ? (FR)
Hemingway : The Sun Also Rises (EN) + Le Soleil se lève aussi (FR),
            Men Without Women (EN) + ? (FR), The Garden of Eden (EN) + ? (FR),
            The Old Man and the Sea → Le vieil homme et la mer (FR)
Dickens : Two Cities (EN) — vérifier FR
Faulkner : As I Lay Dying (EN) + Le Bruit et la Fureur (FR si présent)
Steinbeck : Des souris et des hommes (FR) + Of Mice and Men (EN si présent)
```

## 1.3 — Documenter les paires trouvées

```json
{
  "fr_to_en": [
    { "author": "Hugo", "fr_file": "hugo_miserables_17489.txt",
      "en_file": "les_miserables_victor_hugo.txt", "confidence": "HIGH" },
    ...
  ],
  "en_to_fr": [
    { "author": "Hemingway", "en_file": "pdf_the_sun_also_rises_ernest_hemingway.txt",
      "fr_file": "pdf_le_soleil_se_leve_aussi_french_edition_hemingway_ernest.txt",
      "confidence": "HIGH" },
    ...
  ]
}
```

Sauver : data/TRANSLATION_PAIRS.json

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 2 — MESURER CHAQUE VERSION
# ═══════════════════════════════════════════════════════════════════════════════

Pour chaque fichier (original ET traduction), calculer :

## Bloc A — Les 2 survivants

```typescript
rhythm_cv = std(sentence_lengths) / mean(sentence_lengths)
contradiction = count(adversatifs_LANGUE) / sentence_count
// Utiliser ADVERSATIFS_FR pour les textes FR
// Utiliser ADVERSATIFS_EN pour les textes EN
```

## Bloc B — Mesures de rythme détaillées

```typescript
mean_sentence_length   // longueur moyenne des phrases
std_sentence_length    // écart-type
min_sentence_length    // phrase la plus courte
max_sentence_length    // phrase la plus longue
range_sentence_length  // max - min
short_ratio            // % phrases < 10 mots
long_ratio             // % phrases > 40 mots
```

## Bloc C — Composition typologique

```typescript
pct_dialogue
pct_action
pct_description
pct_introspection
pct_narration
residual_pct
```

## Bloc D — Sensations (les 12)

```typescript
tension, oppression, vertige, fascination, melancolie,
violence_seche, mystere, apaisement, malaise, propulsion,
ironie_mordante, recueillement
```

## Bloc E — Mesures structurelles

```typescript
show_dont_tell
silence_narratif
negation_creatrice
suggestion
irreversibilite
compression_causale
richesse_poly_type
```

## Bloc F — GB V1

```typescript
gb_mean // score GB moyen sur toutes les fenêtres
gb_std  // variabilité du GB dans le roman
gb_max  // meilleur passage
gb_min  // pire passage
```

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 3 — CALCULER LES DELTAS
# ═══════════════════════════════════════════════════════════════════════════════

Pour chaque paire (original, traduction) :

## 3.1 — Delta brut

```typescript
delta_rhythm = rhythm_cv_traduction - rhythm_cv_original
delta_contradiction = contradiction_traduction - contradiction_original
delta_gb = gb_mean_traduction - gb_mean_original
// ...pour chaque mesure
```

## 3.2 — Delta relatif (en pourcentage)

```typescript
delta_rel_rhythm = (rhythm_cv_trad - rhythm_cv_orig) / (rhythm_cv_orig + 0.001)
// Positif = la traduction AMPLIFIE le rythme
// Négatif = la traduction APLATIT le rythme
// ~0 = la traduction CONSERVE le rythme
```

## 3.3 — Distance de profil typologique

```typescript
// Vecteur composition original : [dia, act, desc, intro, nar]
// Vecteur composition traduction : [dia, act, desc, intro, nar]
// distance_type = distance euclidienne normalisée
```

## 3.4 — Distance de profil sensoriel

```typescript
// Vecteur sensation original : [tension, oppression, ..., recueillement]
// Vecteur sensation traduction : idem
// distance_sensation = distance euclidienne normalisée
```

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 4 — SCORE DE FIDÉLITÉ PHYSIQUE
# ═══════════════════════════════════════════════════════════════════════════════

Pour chaque paire, calculer un SCORE DE FIDÉLITÉ :

```typescript
fidelity = 1 - (
  w1 * |delta_rel_rhythm| +      // le rythme est-il conservé ?
  w2 * |delta_rel_contradiction| + // la dialectique est-il conservée ?
  w3 * distance_type +             // la composition est-elle conservée ?
  w4 * distance_sensation +        // les sensations sont-elles conservées ?
  w5 * |delta_rel_gb|              // la qualité globale est-elle conservée ?
) / (w1 + w2 + w3 + w4 + w5)

// w1=w2=w3=w4=w5=1 pour commencer (poids égaux)
// fidelity ≈ 1.0 → traduction physiquement fidèle
// fidelity ≈ 0.5 → traduction partiellement fidèle
// fidelity < 0.3 → traduction physiquement infidèle
```

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 5 — ANALYSER PAR SENS DE TRADUCTION
# ═══════════════════════════════════════════════════════════════════════════════

## 5.1 — FR → EN : qu'est-ce que la traduction anglaise DÉTRUIT ?

Pour les paires FR original → EN traduit :
```
mean_delta_rhythm_fr_to_en = moyenne des delta_rhythm
mean_delta_contradiction_fr_to_en = moyenne des delta_contradiction
mean_fidelity_fr_to_en = moyenne des scores de fidélité
```

La traduction anglaise aplatit-elle le rythme français ?
Supprime-t-elle les adversatifs ? Lisse-t-elle les sensations ?

## 5.2 — EN → FR : qu'est-ce que la traduction française DÉTRUIT ?

Pour les paires EN original → FR traduit :
```
mean_delta_rhythm_en_to_fr = moyenne des delta_rhythm
mean_delta_contradiction_en_to_fr = moyenne des delta_contradiction
mean_fidelity_en_to_fr = moyenne des scores de fidélité
```

La traduction française allonge-t-elle les phrases (le français est
naturellement plus verbeux) ? Cela change-t-il le rythme CV ?

## 5.3 — Comparaison des DEUX sens

```
═══════════════════════════════════════════════════════════════════
TRADUCTION : FR → EN vs EN → FR
═══════════════════════════════════════════════════════════════════
                          FR→EN        EN→FR       VERDICT
Δ Rythme CV               +0.??        +0.??       [CONSERVÉ/DÉTRUIT]
Δ Contradiction            +0.??        +0.??       [CONSERVÉ/DÉTRUIT]
Δ GB moyen                 +0.??        +0.??       [CONSERVÉ/DÉTRUIT]
Distance typologique       0.??         0.??        [STABLE/DÉRIVÉ]
Distance sensorielle       0.??         0.??        [STABLE/DÉRIVÉ]
Fidélité moyenne           0.??         0.??        [FIDÈLE/INFIDÈLE]
═══════════════════════════════════════════════════════════════════
```

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 6 — VERDICTS
# ═══════════════════════════════════════════════════════════════════════════════

## 6.1 — Par mesure

Pour chaque mesure principale :
  TRANSLATION_STABLE → delta < 10% dans les deux sens
  TRANSLATION_FRAGILE → delta > 20% dans au moins un sens
  TRANSLATION_CRITICAL → très utile pour DÉTECTER les infidélités

## 6.2 — Par sens

  FR_TO_EN_SAFE → fidélité > 0.7 en moyenne
  FR_TO_EN_LOSSY → fidélité < 0.5
  EN_TO_FR_SAFE → fidélité > 0.7
  EN_TO_FR_LOSSY → fidélité < 0.5

## 6.3 — Sur l'universalité

Pour les 2 survivants (rythme CV, contradiction) :
  Si le score GB de la traduction est similaire à l'original ET que
  les mesures sont similaires → la loi est probablement UNIVERSELLE
  Si le rythme change drastiquement en traduction mais que le GB reste →
  le rythme est LANGUE-DÉPENDANT

# ═══════════════════════════════════════════════════════════════════════════════
# LIVRABLES
# ═══════════════════════════════════════════════════════════════════════════════

| Fichier | Contenu |
|---------|---------|
| data/TRANSLATION_PAIRS.json | Liste des paires identifiées |
| data/TRANSLATION_MEASURES_FR_TO_EN.json | Mesures complètes pour chaque paire FR→EN |
| data/TRANSLATION_MEASURES_EN_TO_FR.json | Mesures complètes pour chaque paire EN→FR |
| data/TRANSLATION_DELTAS.json | Tous les deltas bruts et relatifs |
| data/TRANSLATION_FIDELITY.json | Scores de fidélité par paire |
| docs/R_TRANSLATION_AUDIT_REPORT.md | Rapport complet avec verdicts |

## Commit

```bash
git add -A
git commit -m "feat(R-TRANSLATION-AUDIT): original vs translation FR↔EN

Pairs found: X FR→EN, Y EN→FR
FR→EN fidelity: X.XX (rythme: [CONSERVÉ/DÉTRUIT], contradiction: [C/D])
EN→FR fidelity: X.XX (rythme: [C/D], contradiction: [C/D])
Key finding: [translations destroy/conserve rhythm and contradiction]
1911 tests PASS"
git tag r-translation-audit-complete
```

# CRITÈRES DE SORTIE

- [ ] ≥ 10 paires FR→EN identifiées et mesurées
- [ ] ≥ 10 paires EN→FR identifiées et mesurées
- [ ] 6 blocs de mesures calculés par fichier (rythme, type, sensation, structure, GB)
- [ ] Deltas bruts et relatifs pour chaque paire
- [ ] Distance typologique et sensorielle par paire
- [ ] Score de fidélité physique par paire
- [ ] Tableau comparatif FR→EN vs EN→FR
- [ ] Verdicts par mesure (STABLE / FRAGILE / CRITICAL)
- [ ] Verdicts par sens (SAFE / LOSSY)
- [ ] Conclusion sur l'universalité des 2 survivants
- [ ] Rapport complet
- [ ] 1911 tests PASS
- [ ] Commit + tag
