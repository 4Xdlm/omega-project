# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT — R-LAB-TYPE
# Recalibration Nucléaire du Classifieur de Passage
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date         : 2026-03-22
# Branche      : phase-r-metrology-rebuild
# HEAD entrant : 53c7e399
# Standard     : NASA-Grade L4 / DO-178C Level A
# Autorité     : Francky (Architecte Suprême)
#
# CONTEXTE CRITIQUE :
# Le classifieur passage-classifier.ts est CASSÉ.
# Molière (théâtre pur) → "description 78%, dialogue 0%" 
# Flaubert Salammbô (bataille) → "description 42%, action 19%"
# Flaubert Bovary (paysage) → "narration 40%, description 29%"
# Le radar ne sait pas distinguer les 5 types de passage.
# TOUTE la couche R-8 dépendante du type est INVALIDÉE.
#
# MISSION : Reconstruire le classifieur à partir de vérité terrain.
#
# ═══════════════════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 0 — RÈGLES ABSOLUES
# ═══════════════════════════════════════════════════════════════════════════════

R-01 : NE PAS toucher à gb-inference.ts, gb-scorer.ts, text-features.ts (VALIDES)
R-02 : NE PAS toucher à depth-features.ts, semantic-depth-features.ts (CORRIGÉS en P0-BIS)
R-03 : Le GB V1 et V3 restent intacts — seul le classifieur est refondu
R-04 : TOUTE constante du classifieur doit être APPRISE, pas inventée
R-05 : Validation sur HOLDOUT (pas sur les mêmes données d'entraînement)
R-06 : Tests existants (1904) doivent PASS après refonte
R-07 : Le bench unifié doit toujours fonctionner (juste avec un classifieur corrigé)

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — PHASE 1 : CONSTRUIRE LE GOLD SET (VÉRITÉ TERRAIN)
# ═══════════════════════════════════════════════════════════════════════════════

## OBJECTIF

Créer un corpus annoté de ~200 passages avec leur TYPE DOMINANT connu.
Sources : 25 romans du corpus omega-autopsie/corpus_r/txt/

## MÉTHODOLOGIE

Pour chaque roman, extraire des FENÊTRES DE 500 MOTS à des positions connues
pour contenir un type dominant identifiable. La position dans le roman est 
donnée en ratio (0.0 = début, 1.0 = fin) ou en mots absolus.

L'annotation est basée sur la NATURE DU TEXTE, pas sur ce que le classifieur dit.

## LES 25 ROMANS ET LEURS EXTRAITS

### GROUPE A — DIALOGUE PUR (théâtre, >= 50% de répliques)

```
# A1 — Molière, Dom Juan (théâtre en prose)
FILE: moliere_dom_juan_16679.txt
EXTRAITS:
  - pos=0.10 size=500 → DIALOGUE (acte I scène 1, Sganarelle parle)
  - pos=0.30 size=500 → DIALOGUE (acte II, échange Dom Juan/paysans)
  - pos=0.50 size=500 → DIALOGUE (acte III, scène du Pauvre)
  - pos=0.70 size=500 → DIALOGUE (acte IV, scène du souper)
  - pos=0.90 size=500 → DIALOGUE (acte V, dénouement)

# A2 — Molière, Tartuffe
FILE: moliere_tartuffe_4438.txt
EXTRAITS:
  - pos=0.20 size=500 → DIALOGUE
  - pos=0.50 size=500 → DIALOGUE
  - pos=0.80 size=500 → DIALOGUE

# A3 — Molière, L'Avare
FILE: moliere_avare_5710.txt
EXTRAITS:
  - pos=0.25 size=500 → DIALOGUE
  - pos=0.50 size=500 → DIALOGUE
  - pos=0.75 size=500 → DIALOGUE

# A4 — Beaumarchais, Le Mariage de Figaro
FILE: beaumarchais_mariage_17160.txt
EXTRAITS:
  - pos=0.20 size=500 → DIALOGUE
  - pos=0.50 size=500 → DIALOGUE
  - pos=0.80 size=500 → DIALOGUE

# A5 — Racine, Phèdre (théâtre en vers — dialogue versifié)
FILE: racine_phedre_14701.txt
EXTRAITS:
  - pos=0.25 size=500 → DIALOGUE
  - pos=0.50 size=500 → DIALOGUE
  - pos=0.75 size=500 → DIALOGUE
```

### GROUPE B — ACTION / BRUTAL (combats, poursuites, violence physique)

```
# B1 — Flaubert, Salammbô (bataille de Carthage)
FILE: flaubert_salammbo_10884.txt
EXTRAITS:
  — Chercher dans le texte des passages contenant des séquences de verbes 
    d'action physique (frappa, bondit, tomba, s'élança, etc.)
  — Extraire 3 fenêtres de 500 mots identifiées comme ACTION

# B2 — Hugo, Les Misérables (barricades, Waterloo, évasions)
FILE: hugo_miserables_17489.txt
EXTRAITS:
  — Chercher "barricade", "Waterloo", "combat", "fusil"
  — Extraire 3 fenêtres de 500 mots = ACTION

# B3 — Dumas, Le Comte de Monte-Cristo (évasion, duels)
FILE: dumas_monte_cristo_17989.txt
EXTRAITS:
  — Chercher "épée", "poignard", "s'élança", "combat"
  — Extraire 3 fenêtres de 500 mots = ACTION

# B4 — Dostoïevski, Crime et Châtiment (le meurtre)
FILE: dostoievski_crime_36034.txt
EXTRAITS:
  — Chercher "hache", "frappa", "sang", "coup"
  — Extraire 2 fenêtres de 500 mots = ACTION

# B5 — Cormac McCarthy, Blood Meridian (EN — violence pure)
FILE: pdf_blood_meridian_cormac_mccarthy.txt
EXTRAITS:
  — Chercher "scalp", "rode", "fired", "killed", "blood"
  — Extraire 2 fenêtres de 500 mots = ACTION

# B6 — Zola, La Bête Humaine (accidents, meurtres)
FILE: zola_bete_10007.txt
EXTRAITS:
  — Chercher "locomotive", "écrasa", "sang", "couteau"
  — Extraire 2 fenêtres de 500 mots = ACTION
```

### GROUPE C — DESCRIPTION PURE (paysages, lieux, objets, atmosphères)

```
# C1 — Flaubert, Madame Bovary (descriptions de Yonville, comices)
FILE: flaubert_bovary_14155.txt
EXTRAITS:
  — Chercher des passages SANS dialogue ("—" ou "«") et AVEC forte
    densité d'adjectifs et de verbes statiques (était, semblait, s'étendait)
  — Extraire 3 fenêtres de 500 mots = DESCRIPTION

# C2 — Hugo, Notre-Dame de Paris (description de la cathédrale)
FILE: notre_dame_de_paris_victor_hugo.txt
EXTRAITS:
  — Chercher "cathédrale", "pierre", "ogive", "façade", "tour"
  — Extraire 3 fenêtres de 500 mots = DESCRIPTION

# C3 — Flaubert, L'Éducation sentimentale (Paris, quartiers)
FILE: flaubert_education_14285.txt
EXTRAITS:
  — Chercher des passages descriptifs (sans dialogue, adjectifs denses)
  — Extraire 2 fenêtres de 500 mots = DESCRIPTION

# C4 — Zola, Au Bonheur des Dames (description du magasin)
FILE: zola_bonheur_11953.txt
EXTRAITS:
  — Chercher "étalage", "soie", "rayons", "lumière", "vitrine"
  — Extraire 2 fenêtres de 500 mots = DESCRIPTION

# C5 — Proust, Du côté de chez Swann (Combray, paysages)
FILE: proust_swann_2650.txt
EXTRAITS:
  — Chercher des passages purement descriptifs (pas d'introspection)
  — Extraire 2 fenêtres de 500 mots = DESCRIPTION
```

### GROUPE D — INTROSPECTION (monologue intérieur, pensées, réflexions)

```
# D1 — Proust, Du côté de chez Swann (mémoire involontaire)
FILE: proust_swann_2650.txt
EXTRAITS:
  — Chercher "je me souviens", "je pensais", "il me semblait"
  — Extraire 3 fenêtres de 500 mots = INTROSPECTION

# D2 — Camus, L'Étranger (pensées de Meursault)
FILE: letranger_french_edition_albert_camus.txt
EXTRAITS:
  — Chercher "je pensais", "j'ai compris", "il m'a semblé"
  — Extraire 2 fenêtres de 500 mots = INTROSPECTION

# D3 — Dostoïevski, Crime et Châtiment (tourments de Raskolnikov)
FILE: dostoievski_crime_36034.txt
EXTRAITS:
  — Chercher "il pensait", "il se disait", "conscience", "tourment"
  — Extraire 2 fenêtres de 500 mots = INTROSPECTION

# D4 — Kafka, Le Procès (angoisse intérieure)
FILE: kafka_proces_69327.txt
EXTRAITS:
  — Chercher "il réfléchit", "pensait", "inquiétude"
  — Extraire 2 fenêtres de 500 mots = INTROSPECTION

# D5 — Virginia Woolf, Mrs Dalloway (EN — stream of consciousness)
FILE: pdf_mrs_dalloway_virginia_woolf.txt
EXTRAITS:
  — Chercher "she thought", "she felt", "remembered"
  — Extraire 2 fenêtres de 500 mots = INTROSPECTION
```

### GROUPE E — NARRATION PURE (enchaînement d'événements, récit factuel)

```
# E1 — Stendhal, La Chartreuse de Parme (Waterloo raconté)
FILE: stendhal_chartreuse_7524.txt
EXTRAITS:
  — Chercher des passages narratifs factuels (il fit, il alla, puis)
  — Extraire 3 fenêtres de 500 mots = NARRATION

# E2 — Maupassant, Bel-Ami (ascension sociale, enchaînement)
FILE: maupassant_bel_ami_3088.txt
EXTRAITS:
  — Chercher des passages narratifs (événements successifs, pas de dialogue)
  — Extraire 2 fenêtres de 500 mots = NARRATION

# E3 — Camus, La Peste (récit de la peste, faits)
FILE: la_peste_french_edition_albert_camus.txt
EXTRAITS:
  — Chercher des passages factuels de narration
  — Extraire 2 fenêtres de 500 mots = NARRATION

# E4 — Balzac, Illusions perdues (récit, narration balzacienne)
FILE: balzac_illusions_13141.txt
EXTRAITS:
  — Extraire 2 fenêtres de 500 mots = NARRATION

# E5 — Hemingway, The Sun Also Rises (EN — narration sèche)
FILE: pdf_the_sun_also_rises_ernest_hemingway.txt
EXTRAITS:
  — Extraire 2 fenêtres de 500 mots = NARRATION
```

### GROUPE F — ROMANS ENTIERS (15 romans découpés en chapitres)

Pour ces 15 romans, découper le texte en FENÊTRES DE 2000 MOTS consécutives.
Pour chaque fenêtre, le classifieur doit produire un vecteur de type.
On analyse ensuite la DISTRIBUTION sur le roman entier.

```
ROMANS ENTIERS (fenêtres de 2000 mots) :
  1.  flaubert_bovary_14155.txt
  2.  flaubert_salammbo_10884.txt
  3.  hugo_miserables_17489.txt
  4.  dostoievski_crime_36034.txt
  5.  proust_swann_2650.txt
  6.  la_peste_french_edition_albert_camus.txt
  7.  letranger_french_edition_albert_camus.txt
  8.  stendhal_chartreuse_7524.txt
  9.  maupassant_bel_ami_3088.txt
  10. dumas_monte_cristo_17989.txt
  11. zola_bete_10007.txt
  12. moliere_dom_juan_16679.txt
  13. dickens_two_cities_98.txt
  14. pdf_blood_meridian_cormac_mccarthy.txt
  15. kafka_proces_69327.txt
```

## PROCÉDURE D'EXTRACTION

### Pour les passages ciblés (Groupes A-E) :

```typescript
// Pseudo-code — adapter en vrai TS
function extractGoldPassage(filePath: string, position: number, size: number): string {
  const text = fs.readFileSync(filePath, 'utf-8');
  const words = text.split(/\s+/);
  const start = Math.floor(words.length * position);
  return words.slice(start, start + size).join(' ');
}
```

Pour les recherches par mot-clé (Groupes B-E), chercher la première occurrence
du mot-clé, puis extraire 500 mots centrés sur cette position.

### Pour les romans entiers (Groupe F) :

```typescript
function extractAllWindows(filePath: string, windowSize: number = 2000): string[] {
  const text = fs.readFileSync(filePath, 'utf-8');
  const words = text.split(/\s+/);
  const windows: string[] = [];
  for (let i = 0; i < words.length - windowSize; i += windowSize) {
    windows.push(words.slice(i, i + windowSize).join(' '));
  }
  return windows;
}
```

## LIVRABLE PHASE 1

Fichier : packages/sovereign-engine/src/scoring/data/GOLD_SET_PASSAGES.json

```json
{
  "version": "1.0",
  "created": "2026-03-22",
  "passages": [
    {
      "id": "A1_moliere_domjuan_010",
      "source": "moliere_dom_juan_16679.txt",
      "position": 0.10,
      "size": 500,
      "expected_type": "dialogue",
      "confidence": "HIGH",
      "group": "A",
      "language": "fr",
      "text_hash": "sha256...",
      "notes": "Acte I scène 1, Sganarelle"
    },
    // ... ~200 passages
  ],
  "novels": [
    {
      "id": "F1_bovary",
      "source": "flaubert_bovary_14155.txt",
      "window_size": 2000,
      "window_count": 56,
      "language": "fr"
    },
    // ... 15 romans
  ]
}
```

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — PHASE 2 : AUDIT DU CLASSIFIEUR ACTUEL
# ═══════════════════════════════════════════════════════════════════════════════

## OBJECTIF

Passer CHAQUE passage du gold set dans le classifieur actuel (passage-classifier.ts)
et mesurer l'accuracy.

## SCRIPT D'AUDIT

Créer : packages/sovereign-engine/scripts/audit-classifier.ts

Ce script DOIT :

1. Charger le GOLD_SET_PASSAGES.json
2. Pour chaque passage ciblé (Groupes A-E) :
   a. Extraire le texte depuis le fichier source
   b. Passer dans classifyPassage()
   c. Comparer le type dominant retourné vs expected_type
   d. Stocker le vecteur complet + delta

3. Pour chaque roman entier (Groupe F) :
   a. Découper en fenêtres de 2000 mots
   b. Classer chaque fenêtre
   c. Calculer la distribution globale des types sur le roman
   d. Identifier les anomalies (ex: Molière Dom Juan devrait avoir >50% dialogue)

4. Produire un rapport :

```
═══════════════════════════════════════════════════════
  CLASSIFIER AUDIT — GOLD SET
═══════════════════════════════════════════════════════

  PASSAGES CIBLÉS (Groupes A-E)
  ─────────────────────────────────────────────────────
  Type         Total   Correct   Accuracy
  DIALOGUE       18        ?       ?%
  ACTION         15        ?       ?%
  DESCRIPTION    12        ?       ?%
  INTROSPECTION  11        ?       ?%
  NARRATION      11        ?       ?%
  ─────────────────────────────────────────────────────
  GLOBAL         67        ?       ?%

  CONFUSION MATRIX
  ────────────────────────────────────────────────────
  Predicted →    NAR   DESC   DIA   INTRO  ACT
  Expected ↓
  DIALOGUE       ?     ?      ?     ?      ?
  ACTION         ?     ?      ?     ?      ?
  DESCRIPTION    ?     ?      ?     ?      ?
  INTROSPECTION  ?     ?      ?     ?      ?
  NARRATION      ?     ?      ?     ?      ?

  ROMANS ENTIERS (Groupe F)
  ─────────────────────────────────────────────────────
  Roman                  NAR%  DESC%  DIA%  INTRO%  ACT%
  Molière Dom Juan       ?     ?      ?     ?       ?
  Flaubert Salammbô      ?     ?      ?     ?       ?
  Hugo Misérables        ?     ?      ?     ?       ?
  ...
═══════════════════════════════════════════════════════
```

5. Sauver le rapport en JSON :
   packages/sovereign-engine/src/scoring/data/CLASSIFIER_AUDIT_RESULTS.json

## CRITÈRES DE DÉCISION

- Si accuracy globale < 50% → CLASSIFIEUR À REFAIRE (cas probable)
- Si accuracy globale 50-70% → CLASSIFIEUR À CORRIGER (recalibrer les poids)
- Si accuracy globale > 70% → CLASSIFIEUR CORRECT (le Scribe est le problème)

## ANALYSES SUPPLÉMENTAIRES

Pour CHAQUE passage FAUX, lister les marqueurs qui ont causé l'erreur :
- Combien d'adjectifs ? (→ score description)
- Combien de verbes d'action ? (→ score action)
- Combien de lignes avec "—" ou "«" ? (→ score dialogue)
- Combien de pronoms 1ère personne ? (→ score introspection)
- Combien de verbes au passé simple ? (→ score narration)

Cela permettra d'identifier QUELS marqueurs sont sur-pondérés ou sous-pondérés.

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — PHASE 3 : RECONSTRUIRE LE CLASSIFIEUR
# ═══════════════════════════════════════════════════════════════════════════════

## OBJECTIF

Réécrire passage-classifier.ts pour atteindre >80% d'accuracy sur le gold set.

## STRATÉGIE

### Option A — Corriger les poids (si le problème est les pondérations)

Le classifieur actuel utilise des scores bruts puis normalise :
```
dialogueScore = dialogueRatio * 1.5 + speechVerbRate * 10
descriptionScore = adjRate * 8 + sensoryRate * 15 + staticRate * 10
actionScore = actionVerbRate * 20 + psRate * 2 + shortSentRate * 0.5
```

Ces coefficients (1.5, 10, 8, 15, 20, etc.) sont INVENTÉS, pas appris.
La correction consiste à APPRENDRE les poids optimaux sur le gold set.

### Option B — Refaire le classifieur (si le problème est les marqueurs)

Si les marqueurs eux-mêmes sont mauvais (ex: les adjectifs ne distinguent pas
description de narration), il faut :
1. Revoir la liste des marqueurs par type
2. Ajouter des marqueurs discriminants manquants
3. Supprimer les marqueurs qui créent du bruit

### Option C — Classifieur appris (si le problème est structurel)

Utiliser le gold set comme données d'entraînement pour un classifieur
statistique simple (ex: régression logistique multinomiale sur les
compteurs de marqueurs). Pas de ML lourd — juste des poids appris.

## PROCÉDURE

1. Analyser les résultats de l'audit (Phase 2)
2. Identifier la cause : poids / marqueurs / structure
3. Implémenter la correction
4. Valider sur le gold set avec HOLDOUT :
   - 70% train (pour apprendre les poids si Option C)
   - 30% test (pour mesurer l'accuracy)
5. Si Option A ou B : valider sur 100% du gold set (pas d'apprentissage)

## CONTRAINTES

- Le classifieur doit rester RAPIDE (pas de ML coûteux)
- Il doit fonctionner en TS pur (pas de Python, pas de modèle externe)
- Il doit produire le MÊME format de sortie (PassageClassification)
- Les interfaces ne changent PAS
- Le bench unifié doit fonctionner sans modification

## CRITÈRES DE SORTIE PHASE 3

- Accuracy > 80% sur le gold set (passages ciblés)
- Molière Dom Juan : dominant = DIALOGUE (pas description)
- Flaubert Salammbô (bataille) : dominant = ACTION (pas description)
- Flaubert Bovary (paysage) : dominant = DESCRIPTION
- Proust (mémoire) : dominant = INTROSPECTION
- Stendhal (récit) : dominant = NARRATION
- Matrice de confusion : aucune cellule hors-diagonale > 30%

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 4 — PHASE 4 : REVALIDATION COMPLÈTE
# ═══════════════════════════════════════════════════════════════════════════════

## OBJECTIF

Valider que le nouveau classifieur ne casse rien et améliore tout.

## TESTS

### 4.1 — Gold set accuracy

```
Accuracy globale > 80%
Accuracy par type : chacun > 60%
Matrice de confusion : diagonale dominante
```

### 4.2 — Romans entiers

Vérifier que les distributions font sens :
```
Molière Dom Juan       → dialogue > 40%
Flaubert Salammbô      → action > 20%, description > 25%
Hugo Misérables        → narration > 25%, action > 15%
Proust Swann           → introspection > 25%
Camus L'Étranger       → narration > 30%
Hemingway Sun Also     → dialogue > 25%
```

### 4.3 — Bench unifié (mode MOCK)

Relancer le bench MOCK et vérifier :
- GB V1 scores IDENTIQUES (le classifieur ne change pas le GB)
- V3 scores IDENTIQUES
- Colonne "Type" maintenant CRÉDIBLE
- Aucun crash

### 4.4 — Les 8 proses LLM du bench API

Reclasser les 8 proses LLM sauvegardées du dernier run :
```
sessions/UnifiedBench_API_2026-03-22T13-38-05_44dcd7dd/prose/*.txt
```

Vérifier si les types sont maintenant plus variés et crédibles.

### 4.5 — Tests existants

```bash
npm test
# 1904 tests PASS, ZÉRO régression
```

### 4.6 — Tests de normalisation typologique

Vérifier que le typological-normalizer.ts fonctionne toujours
avec les nouveaux vecteurs de type. Si les vecteurs sont maintenant
plus variés (pas tout "description"), les diagnostics R-8 seront
plus précis.

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 5 — LIVRABLES ET COMMITS
# ═══════════════════════════════════════════════════════════════════════════════

## Fichiers à créer

| Fichier | Rôle |
|---------|------|
| src/scoring/data/GOLD_SET_PASSAGES.json | Gold set annoté (~200 passages + 15 romans) |
| src/scoring/data/CLASSIFIER_AUDIT_RESULTS.json | Résultats audit classifieur actuel |
| scripts/build-gold-set.ts | Script extraction gold set |
| scripts/audit-classifier.ts | Script audit classifieur |
| scripts/classify-test.ts | Script test unitaire classifieur |
| tests/art/passage-classifier-gold.test.ts | Tests de régression gold set |

## Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| src/scoring/passage-classifier.ts | REFONTE : marqueurs + poids recalibrés |

## Commits

```bash
# Commit 1 — Gold set + audit
git add src/scoring/data/GOLD_SET_PASSAGES.json
git add src/scoring/data/CLASSIFIER_AUDIT_RESULTS.json
git add scripts/build-gold-set.ts scripts/audit-classifier.ts
git commit -m "feat(R-LAB-TYPE): gold set 200+ passages + classifier audit

- 25 novels, 5 groups (dialogue/action/description/introspection/narration)
- ~67 targeted passages with expected types
- 15 novels sliced into 2000w windows (~800+ windows)
- Audit results: current classifier accuracy = X%
- Confusion matrix reveals: [diagnosis]"

# Commit 2 — Classifieur refondu
git add src/scoring/passage-classifier.ts
git add tests/art/passage-classifier-gold.test.ts
git commit -m "fix(R-LAB-TYPE): rebuild passage classifier — accuracy X% → Y%

- [describe what changed: markers / weights / structure]
- Gold set validation: Y% accuracy (>80% target)
- Molière Dom Juan = DIALOGUE (was description)
- Flaubert Salammbô = ACTION (was description)
- 15 novels distribution: credible
- 1904 tests PASS, zero regressions"
git tag r-lab-type-complete
```

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 6 — RÈGLES D'EXÉCUTION
# ═══════════════════════════════════════════════════════════════════════════════

## ORDRE D'EXÉCUTION

Phase 1 (gold set) → Phase 2 (audit) → Phase 3 (rebuild) → Phase 4 (validation)
NE PAS sauter de phase. NE PAS reconstruire avant d'avoir mesuré.

## FICHIERS INTERDITS

- packages/sovereign-engine/src/scoring/gb-inference.ts
- packages/sovereign-engine/src/scoring/gb-scorer.ts
- packages/sovereign-engine/src/scoring/text-features.ts
- packages/sovereign-engine/src/scoring/depth-features.ts
- packages/sovereign-engine/src/scoring/semantic-depth-features.ts
- packages/sovereign-engine/src/scoring/data/GB_V1_MODEL.json
- packages/sovereign-engine/src/engine.ts

## CHEMINS

| Quoi | Chemin |
|------|--------|
| Corpus textes | omega-autopsie/corpus_r/txt/ |
| Classifieur | packages/sovereign-engine/src/scoring/passage-classifier.ts |
| Normalizer | packages/sovereign-engine/src/scoring/typological-normalizer.ts |
| Data | packages/sovereign-engine/src/scoring/data/ |
| Scripts | packages/sovereign-engine/scripts/ |
| Tests | packages/sovereign-engine/tests/art/ |
| Bench proses LLM | packages/sovereign-engine/sessions/UnifiedBench_API_2026-03-22T13-38-05_44dcd7dd/prose/ |

## TOLÉRANCE

- Accuracy gold set (passages ciblés) : > 80%
- Accuracy par type : > 60% chacun
- Molière = DIALOGUE : OBLIGATOIRE
- Salammbô bataille = ACTION : OBLIGATOIRE
- Tests existants : 1904 PASS
- GB V1 scores : IDENTIQUES (le classifieur NE DOIT PAS changer le GB)

## SI BLOCAGE

- Si un texte du corpus est illisible (encodage, préface trop longue) : SKIP et documenter
- Si un type est impossible à atteindre à >60% : documenter pourquoi et proposer une solution
- Si le classifieur appris (Option C) donne de meilleurs résultats : l'utiliser

## NOTE SUR LES TEXTES GUTENBERG

Certains textes du corpus commencent par des préfaces/licences Gutenberg.
Toujours chercher le VRAI début du texte (après "START OF" ou après la première
ligne de prose narrative). Les positions données en ratio (0.1, 0.5, etc.)
sont après le début du texte littéraire, pas du fichier.

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 7 — CRITÈRES DE SORTIE GLOBAUX
# ═══════════════════════════════════════════════════════════════════════════════

TOUS OBLIGATOIRES :

- [ ] Gold set créé (200+ passages, 15 romans entiers)
- [ ] Audit du classifieur actuel documenté (accuracy, confusion matrix)
- [ ] Classifieur refondu (accuracy > 80%)
- [ ] Molière = DIALOGUE, Salammbô = ACTION, Bovary = DESCRIPTION
- [ ] 15 romans entiers : distributions crédibles
- [ ] Bench MOCK : fonctionne, GB inchangé, types crédibles
- [ ] 8 proses LLM reclassées : types plus variés
- [ ] Tests 1904 PASS, zéro régression
- [ ] Normalisation typologique : fonctionne avec les nouveaux vecteurs
- [ ] Commits + tag r-lab-type-complete

# ═══════════════════════════════════════════════════════════════════════════════
# FIN DU PROMPT — R-LAB-TYPE RECALIBRATION NUCLÉAIRE
# ═══════════════════════════════════════════════════════════════════════════════
#
# Le classifieur est cassé. La vérité terrain va le reconstruire.
# "Ce qui n'est pas mesuré n'est pas acceptable."
# "Ce qui n'est pas prouvé n'existe pas."
# "Un radar qui ment est pire que pas de radar."
#
# ═══════════════════════════════════════════════════════════════════════════════
