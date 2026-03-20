# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — PHASE R : REFONDATION MÉTROLOGIQUE
# "Réparer le tribunal avant de juger la prose"
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date         : 2026-03-21
# Statut       : PLAN APPROUVÉ — EN ATTENTE D'EXÉCUTION
# Prérequis    : Phase S0 scellée (tag s0-language-calibration-complete)
# HEAD         : 48bf23cf (phase-w-mixer)
# Déclencheur  : Test décisif P5 — le scorer met GPT au-dessus de Flaubert
# Standard     : NASA-Grade L4 / DO-178C Level A
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# 1. POURQUOI ON EN EST LÀ

## Le fait brut

| Source | R6 composite moyen (extraits 500 mots) |
|--------|----------------------------------------|
| **GPT 5.4 P5** | **61.56** |
| **Riviera** (LLM sans consigne) | **53.45** |
| **FLAUBERT** | **50.52** |

Le scorer dit que GPT 5.4 écrit mieux que Flaubert. C'est faux. Donc le scorer
est invalide comme juge de qualité littéraire.

## La cause racine

Le composite R6 mesure la **distance au profil moyen** des classiques.
Il récompense la CONFORMITÉ au centre, pas la QUALITÉ.

- Flaubert fait des phrases de 19.9 mots → le profil moyen est à 14 → PÉNALISÉ
- GPT fait des phrases de 12.4 mots → pile sur la moyenne → RÉCOMPENSÉ
- Le LLM est le champion du monde de la normalité statistique
- Le génie est aux extrêmes, pas au centre

## Ce qui est CASSÉ

L'agrégation. La formule du composite. Les poids. La philosophie "distance au centre".

## Ce qui N'EST PAS cassé

Les 49 capteurs individuels fonctionnent :
- f17 détecte correctement les phrases-couteau
- f29d mesure correctement le TTR
- f24e mesure correctement le contraste
- f15b mesure correctement la compression
- Les 400+ œuvres analysées restent la fondation

## La consigne originale de Francky (rappel)

"Mesurer et se servir du classement des auteurs en fonction des prix littéraires
et du classement mondial des chefs-d'œuvre pour créer une échelle et comprendre
POURQUOI les livres de ces auteurs sont placés à tel endroit et comprendre la
mécanique pour avoir des outils justes."

Le scorer actuel ne fait PAS ça. Il calcule une moyenne et récompense qui s'en
approche. La Phase R corrige cette erreur fondamentale.

---

# 2. L'OBJECTIF DE LA PHASE R

**Construire un scorer qui CLASSE les œuvres dans le bon ordre.**

Pas "Flaubert = 85". Pas de score arbitraire.
Un scorer où : Chef-d'œuvre > Bon roman > Prose LLM promptée > Prose LLM brute > Navet

Le critère de victoire est SIMPLE :
**Le classement du scorer doit correspondre au classement humain.**

---

# 3. LE CORPUS : 665+ ŒUVRES

## Sources disponibles

| Source | Format | Quantité | Contenu |
|--------|--------|----------|---------|
| `gutenberg_cache/` | .txt | 200 | Classiques domaine public (Flaubert, Hugo, Zola, Austen, Dickens, Dostoïevski, Cervantes, etc.) |
| `Downloads/livre/` | .epub | 255 | Mix complet : classiques + contemporain + romance + thriller + SF + navet |
| `Downloads/livre/` | .pdf | 209 | Idem |
| P5 test | .txt | 6 | Prose LLM promptée (Claude, GPT, Gemini, DeepSeek, Perplexity) |
| Riviera | .txt | 1 | Prose LLM sans consigne (82K mots) |

**Total : 665+ œuvres** couvrant le spectre complet du génie au navet.

## Classification en TIERS (à faire — Étape 1)

Chaque œuvre reçoit un TIER basé sur la reconnaissance littéraire mondiale :

| Tier | Critère | Exemples corpus |
|------|---------|-----------------|
| **S — GÉNIE** | Prix Nobel, unanimité critique mondiale, canon littéraire | Flaubert, Dostoïevski, Hugo, Camus, García Márquez, Proust, Yourcenar |
| **A — EXCELLENCE** | Prix majeurs (Goncourt, Pulitzer), classiques reconnus | Zola, Maupassant, Stendhal, Balzac, Austen, Dickens, Sartre |
| **B — QUALITÉ** | Littérature publiée de qualité, bonne réputation | Chamoiseau, NDiaye, Robbe-Grillet, Malraux, Echenoz |
| **C — COMMERCIAL** | Best-sellers, genre bien exécuté | Kristin Hannah, Guillaume Musso, Rebecca Yarros, Danielle Steel |
| **D — FAIBLE** | Self-published, romance formulaïque, LitRPG générique | Les titres "Milked by...", "Cheating With...", "Dirty Daddy", etc. |
| **LLM-P** | Prose LLM avec prompt P5 éduqué | GPT 5.4, Claude Code, Gemini, DeepSeek, Perplexity |
| **LLM-B** | Prose LLM sans consigne | Riviera |

**L'ORDRE OBLIGATOIRE** : S > A > B > C > D. Les LLM se placent où ils se placent.

---

# 4. LE PLAN EN 6 ÉTAPES

## ÉTAPE R-1 : EXTRACTION ET NORMALISATION DU CORPUS (jour 1)

### Objectif
Convertir les 665+ œuvres en texte brut analysable.

### Actions
1. Les 200 .txt de gutenberg_cache sont déjà prêts
2. Convertir les 255 .epub en .txt (outil : Calibre CLI ou Python ebooklib)
3. Convertir les 209 .pdf en .txt (outil : Python pdfplumber ou PyMuPDF)
4. Nettoyer : retirer en-têtes Gutenberg, tables des matières, notes de fin
5. Stocker dans `omega-autopsie/corpus_r/txt/` — un fichier par œuvre

### Livrable
`corpus_r/txt/` — 665+ fichiers .txt propres, encodage UTF-8

### Script
`scripts/r1-extract-corpus.py` — conversion batch epub/pdf → txt

---

## ÉTAPE R-2 : CLASSIFICATION DES ŒUVRES (jour 1)

### Objectif
Attribuer un TIER (S/A/B/C/D) à chaque œuvre.

### Méthode
1. Créer `corpus_r/CORPUS_TIERS.json` avec la structure :
   ```json
   {
     "flaubert_bovary": { "tier": "S", "author": "Flaubert", "lang": "fr", "period": "19e" },
     "dirty_daddy_spanish": { "tier": "D", "author": "Samantha Barrat", "lang": "es", "period": "21e" }
   }
   ```
2. Classification par Francky (Architecte Suprême) avec assistance IA :
   - Tier S : auteurs avec prix Nobel ou reconnaissance unanime → automatisable
   - Tier A : classiques avec prix littéraires majeurs → semi-auto
   - Tier B : littérature de qualité reconnue → semi-auto
   - Tier C : best-sellers commerciaux → semi-auto par éditeur/collection
   - Tier D : self-published, formulaïque → semi-auto par titre/éditeur
3. Francky valide le classement avant passage à R-3

### Livrable
`corpus_r/CORPUS_TIERS.json` — 665+ entrées classées

---

## ÉTAPE R-3 : MESURE MASSIVE (jour 2)

### Objectif
Passer les 49 capteurs sur TOUTES les œuvres.

### Méthode
Pour chaque œuvre :
1. Extraire 5 passages de 500 mots à des positions régulières (10%, 25%, 50%, 75%, 90%)
2. Calculer `computeTextFeatures()` sur chaque passage
3. Calculer la MOYENNE des 5 passages = profil de l'œuvre
4. Stocker dans `corpus_r/features/NOM_OEUVRE.json`

### Pourquoi des extraits et pas le texte entier ?
Le test décisif a prouvé que la longueur biaise les résultats (f15b s'effondre
sur les textes longs). En mesurant des extraits de 500 mots, on compare des
longueurs identiques.

### Script
`scripts/r3-measure-corpus.ts` — batch de mesure sur tout le corpus

### Livrable
`corpus_r/features/` — 665+ fichiers JSON de features
`corpus_r/CORPUS_FEATURES_MASTER.json` — table complète consolidée

---

## ÉTAPE R-4 : AUDIT DES FEATURES (jour 2-3)

### Objectif
Identifier quelles features SÉPARENT les tiers et lesquelles TROMPENT.

### Méthode
Pour chaque feature des 49 :

1. **Calcul de la moyenne par tier** :
   - Moyenne S, Moyenne A, Moyenne B, Moyenne C, Moyenne D

2. **Test de SÉPARATION** :
   - La feature sépare-t-elle S de D ? (écart > 1 écart-type)
   - La feature respecte-t-elle l'ordre S > A > B > C > D ?
   - Corrélation de Spearman entre la feature et le rang du tier

3. **Détection de TROMPERIE** :
   - Si Tier D > Tier S sur une feature → TROMPEUSE
   - Si LLM > Tier S sur une feature → TROMPEUSE (biais LLM)

4. **Classification des features** :

| Catégorie | Critère | Action |
|-----------|---------|--------|
| **DISCRIMINANTE** | Sépare S de D, respecte l'ordre | Garder, poids FORT |
| **FAIBLEMENT DISC.** | Sépare S de D mais pas les tiers intermédiaires | Garder, poids MOYEN |
| **NEUTRE** | Ne sépare pas | Garder, poids FAIBLE |
| **TROMPEUSE** | Inverse l'ordre (D > S ou LLM > S) | Garder le capteur, INVERSER la logique |

### Script
`scripts/r4-audit-features.py` — analyse statistique par tier

### Livrable
`corpus_r/AUDIT_FEATURES.json` — classification des 49 features
`corpus_r/AUDIT_FEATURES_REPORT.md` — rapport détaillé

---

## ÉTAPE R-5 : CONSTRUCTION DU NOUVEAU COMPOSITE (jour 3-4)

### Objectif
Remplacer le R6 "distance au centre" par un scorer qui respecte l'ORDRE.

### Principes fondamentaux

**PRINCIPE 1 — Le scorer mesure le RANG, pas la distance au centre.**
On ne calcule plus "à quel point tu es proche de la moyenne".
On calcule "à quel TIER tu ressembles le plus".

**PRINCIPE 2 — Les poids viennent des DONNÉES, pas du doigt mouillé.**
Le poids de chaque feature est proportionnel à son pouvoir de séparation
mesuré en R-4. Pas de "on met 10× sur f28d parce qu'on aime le SIL".

**PRINCIPE 3 — Les extrêmes maîtrisés sont récompensés.**
Phrases longues + contraste élevé + TTR élevé = MAÎTRISE → bonus
Phrases longues + contraste faible + TTR faible = LOURDEUR → malus
Le scorer capte les COMBINAISONS, pas les valeurs isolées.

**PRINCIPE 4 — Le génie est asymétrique.**
Un chef-d'œuvre n'excelle pas sur TOUS les axes. Il excelle sur quelques-uns
et est correct sur les autres. Le scorer ne doit pas pénaliser les axes
"normaux" d'un texte qui a des pics de génie.

### Architecture possible

```
NOUVEAU COMPOSITE = 
    w_disc × SCORE_DISCRIMINANTES(features discriminantes)
  + w_comb × SCORE_COMBINAISONS(interactions maîtrise)
  + w_depth × SCORE_PROFONDEUR(features de complexité)
  - penalty_LLM × SCORE_TICS_LLM(features trompeuses inversées)
```

Les poids w_* sont CALCULÉS par régression sur le corpus classé, pas choisis
à la main.

### Features manquantes potentielles (à évaluer en R-4)

Si l'audit montre que les 49 capteurs actuels ne suffisent pas à séparer les
tiers, on ajoute des features ciblées :

| Feature candidate | Ce qu'elle mesure | Pourquoi |
|-------------------|-------------------|----------|
| f_syntactic_depth | Profondeur d'emboîtement des subordonnées | Flaubert = profond, LLM = plat |
| f_clause_density | Nombre de propositions par phrase | Complexité syntaxique réelle |
| f_sil_patterns | Patterns de style indirect libre (sans verbe introducteur) | Les classiques le font, les LLM non |
| f_lexical_precision | Rareté contextuelle des mots (pas juste bigrammes) | Mot juste vs mot riche |
| f_rhythm_irregularity | Irrégularité de la variance rythmique sur fenêtres glissantes | Le LLM est trop régulier même quand il varie |

### Script
`scripts/r5-build-composite.ts` — nouvelle formule de scoring

### Livrable
`src/scoring/multi-stage-scorer-v2.ts` — nouveau scorer
`src/scoring/data/OMEGA_COEFFICIENTS_R.json` — nouveaux coefficients

---

## ÉTAPE R-6 : VALIDATION CROISÉE (jour 4)

### Objectif
Vérifier que le nouveau scorer classe les œuvres dans le BON ORDRE.

### Protocole

1. **Test de rang** : Mesurer TOUTES les œuvres avec le nouveau scorer
   - Calculer le rang moyen par tier
   - Vérifier : rang(S) > rang(A) > rang(B) > rang(C) > rang(D)
   - Calculer la corrélation de Spearman entre score et tier

2. **Test de séparation** : Aucun chevauchement entre S et D
   - Le PIRE score du tier S doit être SUPÉRIEUR au MEILLEUR score du tier D
   - Si chevauchement : le scorer n'est pas assez discriminant → retour R-5

3. **Test Flaubert** : Flaubert (extraits 500 mots) score AU-DESSUS de GPT P5
   - Si ce n'est pas le cas → retour R-5

4. **Test anti-triche** : Le scorer ne doit PAS être gameable par un LLM
   - Donner le nouveau scorer comme consigne à un LLM
   - Mesurer le résultat
   - Si le LLM réussit à scorer au-dessus de Tier A → le scorer est encore trompable

5. **Test de stabilité** : Le scorer doit être cohérent sur des extraits différents
   - 5 extraits de la même œuvre doivent scorer dans un intervalle de ±5 points
   - Si variance intra-œuvre > 10 points → instabilité → ajuster

### Critères de PASS

| Critère | Seuil | Obligatoire |
|---------|-------|-------------|
| Corrélation Spearman score-tier | > 0.70 | OUI |
| Séparation S vs D | Zéro chevauchement | OUI |
| Flaubert > GPT P5 (extraits 500 mots) | Oui | OUI |
| Variance intra-œuvre | < 10 points | OUI |
| LLM ne peut pas gamer le scorer | Score < Tier A | OUI |

### Livrable
`corpus_r/VALIDATION_CROISEE.json` — résultats complets
`corpus_r/VALIDATION_REPORT.md` — rapport PASS/FAIL
Si PASS : tag `r-refondation-complete` + nouveau scorer en production

---

# 5. PLANNING

| Étape | Travail | Durée | Qui |
|-------|---------|-------|-----|
| R-1 | Extraction epub/pdf → txt | 4-6h (script batch) | Claude Code |
| R-2 | Classification en tiers | 2-3h | Francky + Claude |
| R-3 | Mesure massive 665 œuvres × 5 extraits | 2-3h (script batch) | Claude Code |
| R-4 | Audit statistique des features | 1-2h (script) | Claude |
| R-5 | Construction nouveau composite | 1 jour | Claude + Francky |
| R-6 | Validation croisée | 2-3h (script) | Claude Code |

**Total estimé : 3-4 jours de travail effectif.**

---

# 6. DÉCISIONS VERROUILLÉES

| # | Décision | Statut |
|---|----------|--------|
| R-D1 | Le composite R6 actuel est GELÉ — plus aucune décision basée dessus | VERROUILLÉ |
| R-D2 | Les 49 capteurs individuels sont CONSERVÉS sous audit | VERROUILLÉ |
| R-D3 | Le corpus de 665+ œuvres est la base de recalibration | VERROUILLÉ |
| R-D4 | La classification en tiers est faite par l'humain (Francky), pas par l'IA | VERROUILLÉ |
| R-D5 | Les poids du nouveau scorer sont calculés par régression, pas par intuition | VERROUILLÉ |
| R-D6 | Le critère de victoire est le CLASSEMENT correct, pas un score cible | VERROUILLÉ |
| R-D7 | Aucun prompt engineering ni campagne API avant que le scorer soit validé | VERROUILLÉ |

---

# 7. MESSAGE DE REDÉMARRAGE (pour session suivante)

```
OMEGA SESSION — PHASE R (REFONDATION MÉTROLOGIQUE)

HEAD : (post-commit de ce document)
Branche : phase-w-mixer
Tests : 1859 GREEN (scorer v1 gelé, v2 en construction)

CONTEXTE :
  Le test décisif P5 a révélé que le composite R6 met GPT au-dessus de Flaubert.
  CAUSE : le scorer mesure la conformité au centre, pas la qualité littéraire.
  DÉCISION : refondation complète de l'agrégation. Features conservées.

ÉTAT :
  R-1 (extraction corpus) : [EN COURS / FAIT]
  R-2 (classification tiers) : [EN COURS / FAIT]
  R-3 (mesure massive) : [EN ATTENTE]
  R-4 (audit features) : [EN ATTENTE]
  R-5 (nouveau composite) : [EN ATTENTE]
  R-6 (validation croisée) : [EN ATTENTE]

DOCUMENTS À LIRE :
  docs/OMEGA_PHASE_R_PLAN.md (ce fichier)
  docs/OMEGA_S0_CALIBRATION_REPORT.md
  omega-autopsie/results_rosetta/s0/p5_test/scorer_diagnostic.json

RÈGLE ABSOLUE :
  AUCUNE campagne API, AUCUN prompt engineering, AUCUNE décision produit
  tant que R-6 n'est pas PASS.

Architecte Suprême : Francky
IA Principal : Claude
```

---

# 8. CE QUI CHANGE POUR LA SUITE D'OMEGA

**Avant Phase R** : on cherchait à faire écrire le LLM mieux → plafond 54-56.
**Après Phase R** : on aura un instrument qui SAIT mesurer "mieux".
Ensuite seulement, on pourra :
1. Relancer le Profileur V1 (avec un scorer juste)
2. Relancer l'architecture modulaire (avec une mesure de succès fiable)
3. Relancer les campagnes de prompt (en sachant si ça MARCHE ou pas)

**Sans instrument juste, tout le reste est de l'alchimie.**

---

*Phase R — Refondation Métrologique*
*"Réparer le tribunal avant de juger la prose"*
*2026-03-21 — OMEGA NASA-Grade L4*
*Architecte Suprême : Francky*
