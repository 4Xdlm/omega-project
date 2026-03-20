# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — ROADMAP PHASE S0 : L'ÉPREUVE DE VÉRITÉ DU LANGAGE LLM
# "Sortir la vérité mathématique — millimétrée"
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date     : 2026-03-20
# Standard : NASA-Grade L4 / DO-178C Level A
# Objectif : Prouver ou réfuter CHAQUE instruction Rosetta par 300+ tests
# Budget   : ~400-500 appels API total
# Durée    : 2-3 sessions Claude Code
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# VUE D'ENSEMBLE

```
S0.1 — AUDIT f5c (bug ou réel ?)                    [0 API, 30 min]
  │
  ▼
S0.2 — BENCH FEATURES PILOTABLES (100 tests × 4)    [~100 API, 2h]
  │
  ▼
S0.3 — BENCH CONTRADICTOIRE Principe #6             [~200 API, 3h]
       (instructions LLM vs variations vs hybrides)
  │
  ▼
S0.4 — BENCH FEATURES CONTOURNABLES (50 tests × 3)  [~50 API, 1h]
  │
  ▼
S0.5 — BENCH MICRO-CHIRURGIE BORNÉE (30 tests)      [~30 API, 1h]
  │
  ▼
S0.6 — CLASSIFICATION DES RÈGLES                    [0 API, 1h]
       SOLIDE / PROMETTEUSE / EXPÉRIMENTALE / ILLUSION
  │
  ▼
S0.7 — MATRICE ROSETTA VERSIONNÉE v1                [0 API, 1h]
       rosetta_claude-sonnet-4-20250514_v1.json
  │
  ▼
S0.8 — RAPPORT FINAL + SESSION_SAVE                 [0 API, 30 min]
```

---

# S0.1 — AUDIT f5c (30 min, 0 API)

## Objectif
Rosetta P3 Bloc D a mesuré f5c_action_verb_ratio passant de 0.193 à 3.5.
Un ratio normalement entre 0 et 1 qui atteint 3.5 est SUSPECT.
Il faut lire le texte et vérifier.

## Méthode
1. Lire le texte brut généré dans Bloc D pour f5c
   (results_rosetta/phase3/bloc_d_recomposition.json → section f5c → le prompt a
   généré un texte de 300 mots)
2. Compter MANUELLEMENT les verbes d'action physique
3. Compter MANUELLEMENT le nombre total de verbes
4. Calculer le vrai ratio
5. Vérifier le code de text-features.ts pour f5c_action_verb_ratio :
   comment est-il calculé ? divisé par quoi ? normalisé ?

## Livrable
- `results_rosetta/s0/s01_audit_f5c.json` :
  ```json
  {
    "texte_audite": "...",
    "verbes_action_manuels": 12,
    "verbes_total_manuels": 35,
    "ratio_manuel": 0.34,
    "ratio_script": 3.5,
    "diagnostic": "BUG_NORMALISATION | REEL",
    "action": "corriger le calcul | valider"
  }
  ```

---

# S0.2 — BENCH FEATURES PILOTABLES (2h, ~100 API)

## Objectif
Tester les 4 features CORE V1 (f29d, f24e, f15b, f16a) sur un volume
suffisant pour PROUVER leur pilotabilité.

## Protocole

### Pour CHAQUE feature (4 features) :
### Pour CHAQUE style (5 styles : DESC, ACTION, INTRO, CONTEMP, LYRIQUE) :
### Générer 5 textes de 500 mots avec la contrainte de cette feature

Total : 4 features × 5 styles × 5 textes = **100 tests**

### Prompt template
```
Écris 500 mots de prose littéraire française.
Style : [STYLE]
Thème : Un personnage seul dans un lieu chargé d'histoire au crépuscule.

CONTRAINTE PRINCIPALE à respecter absolument :
[CONTRAINTE_FEATURE]

Contraintes par feature :
- f29d : "Vocabulaire EXTRÊMEMENT varié. Jamais deux fois le même mot
  substantif ou adjectif. Richesse lexicale maximale."
- f24e : "Alterner BRUTALEMENT entre phrases très courtes (3-8 mots)
  et phrases très longues (25-40 mots). Contraste maximum."
- f15b : "AUCUNE répétition de formulation. Chaque phrase doit être
  structurellement différente de la précédente."
- f16a : "Combinaisons de mots ORIGINALES et inattendues. Éviter
  toute tournure courante ou prévisible."

Écris directement, sans préambule.
```

### Mesure
Pour chaque texte : calculer les 49 features + score R6.
Pour la feature ciblée : est-elle dans la zone 0.80-1.20 du profil classique ?

### Sortie
- `results_rosetta/s0/s02_bench_pilotables.json` :
  ```json
  {
    "f29d": {
      "tests": [
        {"style": "DESCRIPTION", "idx": 1, "f29d_value": 0.78, "aligned": true, "r6": 48.5},
        ...
      ],
      "taux_respect_global": 0.92,
      "taux_par_style": {"DESCRIPTION": 0.80, "ACTION": 1.00, ...},
      "verdict": "SOLIDE"
    },
    ...
  }
  ```

---

# S0.3 — BENCH CONTRADICTOIRE PRINCIPE #6 (3h, ~200 API)

## Objectif
C'est LE test central. Pour chaque feature pilotable, tester 3 VARIANTES
d'instructions et garder celle qui marche le MIEUX.

## Les 3 variantes

### Variante A — Instructions LLM (Dictionnaire v3)
Les instructions exactes que le LLM a demandées dans le reverse prompting.
Exemple pour INTROSPECTION :
"Construire des phrases de 80-150 mots minimum avec au moins 3 niveaux d'emboîtement"

### Variante B — Instructions humaines reformulées
Même objectif mais formulé par NOUS, pas par le LLM.
Exemple pour INTROSPECTION :
"Phrases longues de 20-30 mots. Utilise des subordonnées (qui, dont, lorsque).
Évite les phrases courtes de moins de 10 mots."

### Variante C — Instructions hybrides (humain + métriques)
Nos instructions + des contraintes métriques chiffrées.
Exemple pour INTROSPECTION :
"Phrases longues. CONTRAINTE MÉTRIQUE : la longueur moyenne des phrases
doit être EXACTEMENT entre 18 et 25 mots. Compte mentalement."

## Protocole

### Pour CHAQUE feature testable (8 features : les 4 CORE + f25g, f17, f35c, f36c) :
### Pour CHAQUE variante (A, B, C) :
### Pour CHAQUE style (5 styles) :
### Générer 2 textes de 500 mots

Total : 8 features × 3 variantes × 5 styles × 2 textes = **240 tests**
(plafonner à 200 API calls en réduisant à 4 features si nécessaire)

### TABLE DES INSTRUCTIONS PAR FEATURE × VARIANTE

#### f29d_ttr_score (richesse lexicale)

| Variante | Instruction |
|----------|-------------|
| A (LLM) | "Varie le vocabulaire. Remplace les mots répétés par des synonymes ou des périphrases." |
| B (Humain) | "Aucun nom ou adjectif ne doit apparaître deux fois. Synonymes obligatoires à chaque occurrence." |
| C (Hybride) | "Vocabulaire varié. MÉTRIQUE : le ratio types/tokens doit dépasser 0.75 sur chaque fenêtre de 100 mots." |

#### f24e_contrast_score (contraste syntaxique)

| Variante | Instruction |
|----------|-------------|
| A (LLM) | "Alterne plus brutalement entre phrases courtes et phrases longues." |
| B (Humain) | "Une phrase sur trois doit faire moins de 8 mots. Une phrase sur trois doit dépasser 25 mots." |
| C (Hybride) | "Contraste syntaxique fort. MÉTRIQUE : la plus longue phrase doit faire 3× la plus courte au minimum." |

#### f15b_redundancy_compression (anti-répétition)

| Variante | Instruction |
|----------|-------------|
| A (LLM) | "Réduis les répétitions de bigrammes. Varie les formulations." |
| B (Humain) | "Jamais deux phrases qui commencent par le même mot. Jamais deux adjectifs du même champ sémantique consécutifs." |
| C (Hybride) | "Zéro redondance. MÉTRIQUE : aucun bigramme ne doit apparaître plus de 2 fois dans le texte entier." |

#### f16a_bigram_rarity (originalité)

| Variante | Instruction |
|----------|-------------|
| A (LLM) | "Utilise des combinaisons de mots plus originales et rares." |
| B (Humain) | "Évite les tournures courantes. Chaque association nom-adjectif doit être surprenante ou inédite." |
| C (Hybride) | "Associations originales. MÉTRIQUE : plus de 90% des bigrammes du texte doivent être uniques." |

#### f25g_description_score (description sensorielle)

| Variante | Instruction |
|----------|-------------|
| A (LLM) | "Enrichis les descriptions sensorielles : couleurs précises, textures, sons, odeurs spécifiques." |
| B (Humain) | "Chaque paragraphe utilise AU MOINS 3 des 5 sens (vue, ouïe, odorat, toucher, goût). Nommer les sensations explicitement." |
| C (Hybride) | "Description sensorielle dense. MÉTRIQUE : au moins 8 mots sensoriels (couleur, son, texture, odeur, goût) pour 100 mots." |

#### f17_knife_count (mots percutants)

| Variante | Instruction |
|----------|-------------|
| A (LLM) | "Ajoute des mots percutants, des images vives, des contrastes forts." |
| B (Humain) | "Intègre au moins 5 mots rares ou percutants dans le texte (exemples : vertige, étincelle, fracas, tumulte, abîme)." |
| C (Hybride) | "Mots puissants. MÉTRIQUE : au moins 1 mot rare ou percutant toutes les 100 mots." |

#### f35c_hook_score (accroche)

| Variante | Instruction |
|----------|-------------|
| A (LLM) | "Commence par une phrase d'accroche qui crée de la tension." |
| B (Humain) | "La première phrase doit intriguer, choquer ou questionner. Pas de description plate pour commencer." |
| C (Hybride) | "Accroche forte. MÉTRIQUE : la première phrase doit contenir une tension (conflit, question, image forte) en moins de 15 mots." |

#### f36c_cliff_score (suspense de fin)

| Variante | Instruction |
|----------|-------------|
| A (LLM) | "Termine sur une note de suspense ou d'incomplétude." |
| B (Humain) | "La dernière phrase doit laisser une question ouverte ou un sentiment d'attente. Ne PAS conclure proprement." |
| C (Hybride) | "Fin en suspens. MÉTRIQUE : les 20 derniers mots doivent contenir une image ouverte, une question implicite, ou un verbe au conditionnel." |

### Mesure et comparaison
Pour chaque test : features + R6.
Pour chaque feature × style : quelle variante produit le meilleur taux de respect ?

### Sortie
- `results_rosetta/s0/s03_bench_contradictoire.json` :
  ```json
  {
    "f29d": {
      "variante_A": {"taux_global": 0.88, "r6_moyen": 47.2},
      "variante_B": {"taux_global": 0.92, "r6_moyen": 48.1},
      "variante_C": {"taux_global": 0.95, "r6_moyen": 49.3},
      "gagnant": "C",
      "verdict": "L'hybride bat l'instruction LLM de +7%"
    },
    ...
  }
  ```

---

# S0.4 — BENCH FEATURES CONTOURNABLES (1h, ~50 API)

## Objectif
Tester les 2 features contournables (f27d_modal, f5c_action si audit OK)
avec les stratégies de substitution de P3 Bloc D.

## Protocole

### Pour CHAQUE feature contournable (2-3) :
### Pour CHAQUE style (5 styles) :
### Avec 3 variantes de stratégie de substitution :
### Générer 2 textes de 500 mots

Variantes de substitution :
- S1 : Stratégie LLM (du Bloc D)
- S2 : Stratégie humaine allégée
- S3 : Stratégie hybride (LLM + contraintes métriques)

Total : 3 features × 5 styles × 3 variantes × 2 textes = ~90 tests
(plafonner à 50 API calls)

### Sortie
- `results_rosetta/s0/s04_bench_contournables.json`

---

# S0.5 — BENCH MICRO-CHIRURGIE BORNÉE (1h, ~30 API)

## Objectif
Consolider le résultat P3 Bloc E (Proust +1.95) sur un volume plus grand.

## Protocole

### Prendre 10 passages de P2 (les 20 extraits classiques)
### Pour chaque passage :
### Identifier les 3 phrases les plus faibles (features les plus éloignées)
### Demander au LLM de réécrire UNIQUEMENT ces 3 phrases

Avec 2 variantes de consigne chirurgicale :
- V1 : "Améliore la qualité littéraire de cette phrase sans changer son sens."
  (consigne vague — baseline)
- V2 : "Dans cette phrase, remplace les verbes abstraits par des verbes
  physiques concrets. Ne change PAS les mots avant le mot X et après le mot Y.
  Garde exactement le même sens."
  (consigne bornée — verrous de graphe)

Total : 10 passages × 3 phrases × 2 variantes = **60 réécritures** (30 API calls)

### Mesure
Pour chaque passage :
- R6 avant modifications
- R6 après 3 modifications (V1)
- R6 après 3 modifications (V2)
- Delta R6 V1 vs V2
- Features améliorées vs dégradées

### Sortie
- `results_rosetta/s0/s05_bench_micro_chirurgie.json`
- Réponse : la chirurgie bornée (V2) est-elle MIEUX que la chirurgie vague (V1) ?

---

# S0.6 — CLASSIFICATION DES RÈGLES (1h, 0 API)

## Objectif
Basé sur S0.2 + S0.3 + S0.4 + S0.5, classifier CHAQUE règle.

## Critères

| Catégorie | Critère | Action |
|-----------|---------|--------|
| **SOLIDE** | Taux respect > 80% sur 100+ tests, aucune variante ne la bat de >10% | → CORE prompt-assembler |
| **PROMETTEUSE** | Taux 60-80%, ou variante humaine nettement meilleure | → EXP, flag contrôlé |
| **EXPÉRIMENTALE** | Taux 40-60%, résultats variables selon le style | → Hors pipeline, monitoring |
| **ILLUSION DÉCLARATIVE** | Taux < 40% OU variante humaine bat l'instruction LLM de >20% | → REJETÉE, le LLM se trompe sur lui-même |

## Sortie
- `results_rosetta/s0/s06_classification_regles.json` :
  ```json
  {
    "regles": [
      {
        "feature": "f29d",
        "instruction_gagnante": "variante C hybride",
        "taux_respect": 0.95,
        "categorie": "SOLIDE",
        "instruction_exacte": "Vocabulaire varié. MÉTRIQUE : ratio types/tokens > 0.75 par fenêtre 100 mots."
      },
      ...
    ],
    "stats": {
      "SOLIDE": 5,
      "PROMETTEUSE": 3,
      "EXPERIMENTALE": 2,
      "ILLUSION": 1
    }
  }
  ```

---

# S0.7 — MATRICE ROSETTA VERSIONNÉE v1 (1h, 0 API)

## Objectif
Construire le fichier de traduction officiel, avec les 3 couches ChatGPT.

## Structure

```json
{
  "matrix_id": "rosetta_claude-sonnet-4-20250514_v1",
  "model": "claude-sonnet-4-20250514",
  "calibration_date": "2026-03-20",
  "calibration_tests": 400,
  "principles": ["P1..P6"],

  "features": {
    "f29d_ttr_score": {
      "pilotability": 1.0,
      "category": "SOLIDE",
      "declared_instruction": "...",
      "validated_instruction": "...",
      "optimized_instruction": "...",
      "taux_respect_declared": 0.88,
      "taux_respect_optimized": 0.95,
      "facteur_conversion": 1.03,
      "couplage": [],
      "notes": ""
    },
    "f28d_sil_score": {
      "pilotability": 0.0,
      "category": "BLOQUEE",
      "declared_instruction": "...",
      "validated_instruction": null,
      "optimized_instruction": null,
      "taux_respect_declared": 0.0,
      "facteur_conversion": 0.21,
      "substitution_strategy": "...",
      "substitution_taux": 0.0,
      "notes": "Irréductible - mur structurel confirmé P1+P2+P3"
    },
    ...
  },

  "styles": {
    "DESCRIPTION": {
      "omega_label": "DESCRIPTION",
      "llm_label": "Prose narrative psychologique du XIXe siècle",
      "label_status": "QUARANTAINE",
      "core_instructions": ["instruction solide 1", "instruction solide 2"],
      "experimental_instructions": ["..."],
      "features_pilotables": ["f29d", "f24e", "f15b", "f16a"],
      "features_bloquees": ["f28d", "f1b"],
      "features_contournables": ["f27d"],
      "meilleur_r6_atteint": 54.52,
      "distance_min_classique": 0.59
    },
    ...
  },

  "micro_surgery": {
    "validated": true,
    "method": "phrase_par_phrase",
    "max_phrases_par_passe": 3,
    "consigne_type": "bornee",
    "delta_r6_moyen": "+0.65",
    "taux_succes": 0.78
  },

  "validation_sentinel": {
    "protocol": "20 phrases de référence",
    "seuil_compatibilite": 0.70,
    "phrases_hash": "sha256..."
  }
}
```

## Sortie
- `omega-autopsie/results_rosetta/rosetta_claude-sonnet-4-20250514_v1.json`

---

# S0.8 — RAPPORT FINAL + SESSION_SAVE (30 min, 0 API)

## Contenu du rapport

| Section | Contenu |
|---------|---------|
| 1 | Résumé exécutif (1 paragraphe) |
| 2 | Audit f5c : résultat |
| 3 | Bench pilotables : taux par feature × style |
| 4 | Bench contradictoire : gagnant par feature (A/B/C) |
| 5 | Bench contournables : stratégies qui marchent |
| 6 | Bench micro-chirurgie : V1 vs V2, delta R6 |
| 7 | Classification : tableau SOLIDE / PROMETTEUSE / EXPÉRIMENTALE / ILLUSION |
| 8 | Matrice Rosetta v1 : résumé |
| 9 | Réponse finale : "Comment lui parler pour qu'il comprenne ?" |
| 10 | Recommandations pour Phase S1 (profileur + injection) |
| 11 | Message de redémarrage |

## Commit + tags
```
git tag s0-language-calibration-complete
git tag rosetta-matrix-v1
```

---

# ESTIMATION TOTALE

| Phase | API calls | Durée | Données produites |
|-------|-----------|-------|-------------------|
| S0.1 (audit f5c) | 0 | 30 min | 1 JSON |
| S0.2 (bench pilotables) | ~100 | 2h | 100 tests |
| S0.3 (bench contradictoire) | ~200 | 3h | 240 tests, gagnants par feature |
| S0.4 (bench contournables) | ~50 | 1h | 50 tests |
| S0.5 (bench micro-chirurgie) | ~30 | 1h | 60 réécritures |
| S0.6 (classification) | 0 | 1h | Classification complète |
| S0.7 (matrice versionnée) | 0 | 1h | rosetta_matrix_v1.json |
| S0.8 (rapport) | 0 | 30 min | Rapport + SESSION_SAVE |
| **TOTAL** | **~380** | **~10h** | **~450 tests + matrice** |

---

# DÉCOUPAGE EN SESSIONS CLAUDE CODE

## Session 1 (autonome, ~3h)
- S0.1 (audit f5c)
- S0.2 (bench pilotables — 100 tests)
- S0.3a (bench contradictoire — features CORE 4 × 3 variantes = ~120 tests)

## Session 2 (autonome, ~3h)
- S0.3b (bench contradictoire — features EXP 4 × 3 variantes = ~120 tests)
- S0.4 (bench contournables — 50 tests)

## Session 3 (autonome, ~2h)
- S0.5 (bench micro-chirurgie — 30 tests)
- S0.6 (classification)
- S0.7 (matrice versionnée)
- S0.8 (rapport + commit)

---

# CRITÈRES DE SUCCÈS

| Critère | Seuil | Action si FAIL |
|---------|-------|----------------|
| Au moins 4 features avec taux > 80% | > 4 | Si < 4 : les features ne sont pas pilotables |
| Au moins 1 variante bat l'instruction LLM (Principe #6) | > 0 | Si 0 : le LLM se connaît bien (improbable) |
| Micro-chirurgie V2 > V1 | V2 > V1 | Si non : la chirurgie bornée n'est pas meilleure |
| Aucune feature "ILLUSION DÉCLARATIVE" parmi les CORE | 0 illusion | Si > 0 : revoir la sélection CORE |
| f5c_action_verb_ratio audité | Bug ou réel | Si bug : corriger text-features.ts |

---

*Roadmap Phase S0 — 2026-03-20*
*Standard NASA-Grade L4 / DO-178C Level A*
*"On met le paquet — vérité mathématique" — Francky*
