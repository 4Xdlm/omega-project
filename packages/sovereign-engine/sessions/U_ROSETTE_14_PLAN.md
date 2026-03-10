# U-ROSETTE-14 — PLAN FUSIONNÉ (3 IAs)
# AUDIT GÉNÉRATION AMONT — PLAN DE VOL COMPLET

```
╔══════════════════════════════════════════════════════════════════════════╗
║  Document ID  : U_ROSETTE_14_PLAN                                        ║
║  Date         : 2026-03-10                                               ║
║  Sources      : ChatGPT (audit) + Gemini (hypothèse) + Claude (arch.)   ║
║  Statut       : PLAN VALIDÉ — EN ATTENTE D'EXÉCUTION                    ║
║  Standard     : NASA-Grade L4 / DO-178C                                  ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## MISSION

Transformer une succession de quasi-miracles en procédé reproductible.

Passer de :
> "parfois un quasi-SEAL, parfois composite=75 inexplicable"

à :
> "des candidats amont systématiquement dans la zone polishable (composite 89–92.5)"

**Contrainte absolue :** ne pas corriger pendant l'audit.
Observer → Mesurer → Corréler → Classer → ALORS seulement proposer 3 patches max.

---

## CONTEXTE — POURQUOI MAINTENANT

| Signal | Valeur |
|--------|--------|
| Polish Engine | FINALISÉ — INV-PE-01..13 ✅ |
| Taux survie Top-K actuel | 1/8 (voire 0/8) |
| Runs catastrophiques observés | `metaphor_novelty=44`, `RCI=83.2`, `IFI=84.5` |
| Quasi-SEAL atteint | composite=93.3 (U-ROSETTE-07) — prouve que c'est possible |

Le chirurgien est prêt. Les patients arrivent trop irréguliers.

---

## RÈGLE D'OR (ChatGPT — inviolable)

```
╔══════════════════════════════════════════════════════════════════════════╗
║  NE PAS CORRIGER PENDANT L'AUDIT.                                        ║
║  D'abord : observer — mesurer — corréler — classer.                      ║
║  Ensuite seulement : proposer les patches.                               ║
║  Sinon : on patche un symptôme, pas la cause.                            ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## PHASE 1 — AUDIT PUR (zéro modification de code)

### Les 5 hypothèses à tester (fusion ChatGPT + Gemini + Claude)

#### H1 — Surcharge cognitive par contraintes concurrentes (Gemini — priorité 1)

**Hypothèse :** Le prompt amont assemble trop de contraintes co-égales. Le LLM les compresse en un compromis instable. Il optimise simultanément :
- voix Camus-adjacent
- syncopes / rythme
- hooks variés
- image non banale (SII)
- anti-cliché
- nécessité
- émotion
- cohérence narrative (ECC)

**Signal attendu :**
- quand SII monte → ECC ou RCI tombent
- metaphor_novelty=44 corrèle avec ECC élevé
- metaphor_novelty=82 corrèle avec ECC <90

**Conséquence si confirmée :** retirer la contrainte SII du prompt global → la confier exclusivement au Polish Engine.

---

#### H2 — Absence de hiérarchie des contraintes (ChatGPT)

**Hypothèse :** Le prompt présente toutes les consignes comme co-égales. Le LLM ne sait pas que `ECC > RCI > SII` en termes de priorité absolue.

**Signal attendu :**
- sorties qui respectent parfaitement une contrainte secondaire (ex: metaphor = 82) tout en cassant une primaire (ECC = 83)
- ECC haut corrèle avec prompts où la contrainte narrative vient en premier

**Conséquence si confirmée :** restructurer le prompt en blocs hiérarchisés explicites (CONTRAINTES ABSOLUES / PRIORITAIRES / SECONDAIRES / OPPORTUNISTES).

---

#### H3 — Sous-axes ultra-sensibles non pilotés (ChatGPT)

**Hypothèse :** 2-3 sous-axes (`metaphor_novelty`, `voice_conformity`, `euphony_basic`) ont une variance naturelle très haute et ruinent des runs globalement bons.

**Signal attendu :**
- runs où tout est ≥85 sauf un seul sous-axe qui s'effondre isolément
- `metaphor_novelty` bimodal (souvent 44 OU 82, rarement intermédiaire)
- `euphony_basic` entre 69-80 sans corrélation claire avec le reste

**Conséquence si confirmée :** ces axes sortent du prompt global → deviennent des modules spécialisés (post-traitement ou passes Polish dédiées).

---

#### H4 — Répétitions de moules locaux (ChatGPT)

**Hypothèse :** Sans mémoire formelle locale, le LLM réutilise les mêmes structures sur 10-20 phrases : attaques similaires, même longueur de phrase, même type d'image → oscillation artificielle.

**Signal attendu :**
- fingerprint structurel similaire entre runs différents (même batch)
- variance haute entre batches, variance basse intra-batch
- `voice_conformity` corrèle avec diversité des attaques de phrase

**Conséquence si confirmée :** injecter un "anti-repetition context" avec exemples de structures déjà utilisées.

---

#### H5 — Frontière de Pareto structurelle (Claude — architecture)

**Hypothèse :** Certains axes sont fondamentalement antagonistes sur ce corpus/modèle — pas juste mal promptés. Si `SII ↑ → ECC ↓` est une frontière de Pareto réelle (pas un bug de prompt), il faut changer l'architecture, pas le wording.

**Signal attendu :**
- nuage de points ECC vs metaphor_novelty montre une frontière claire
- aucun run n'est dans le quadrant ECC>92 ET metaphor_novelty>78 simultanément
- le meilleur composite observé (93.3) correspondait à quel équilibre exact ?

**Conséquence si confirmée :** confirme la stratégie Two-Stage (génération ECC+RCI → Polish SII) comme architecturalement nécessaire, pas juste utile.

---

### Table de corrélations à construire

Pour chaque run (one-shot + top-K), loguer :

```jsonl
{
  "run_id": "...",
  "prompt_hash": "...",
  "composite": 90.7,
  "ecc": 92.6,
  "rci": 82.3,
  "sii": 75.3,
  "ifi": 97.3,
  "aai": 97.6,
  "sub_scores": {
    "rhythm": 74.9,
    "signature": 100,
    "hook_presence": 88.3,
    "euphony_basic": 78.7,
    "voice_conformity": 74.4,
    "anti_cliche": 97,
    "necessity": 85,
    "metaphor_novelty": 44
  },
  "fingerprint": {
    "avg_sentence_length": 12.3,
    "sentence_length_variance": 4.1,
    "attack_types": ["participial", "nominal", "verbal"],
    "image_density": 0.23,
    "abstract_ratio": 0.41,
    "parenthetical_count": 2
  },
  "funnel": {
    "is_candidate": true,
    "is_survivor": false,
    "polish_status": "REJECTED_REGRESSION",
    "reject_reason": "ECC_REGRESSION_1.9"
  }
}
```

---

### Les 5 analyses à produire

#### A. Analyse de sensibilité empirique

Questions :
1. Quand composite ≥ 90, quels sous-axes sont presque toujours bons ensemble ?
2. Quels couples sont harmonieux ? Quels couples sont antagonistes ?

Méthode : matrice de corrélation Pearson sur les sous-scores de tous les runs disponibles.

#### B. Carte Pareto réelle

Scatterplots à produire :
- `ECC vs metaphor_novelty` ← critique (H5)
- `RCI vs ECC`
- `voice_conformity vs necessity`
- `metaphor_novelty vs ECC`

Question centrale : y a-t-il une frontière de Pareto ou juste un mauvais prompt ?

#### C. Analyse des champions

Comparer : meilleurs one-shot, meilleurs survivors, candidats polish acceptés, U-ROSETTE-07 (93.3).

Chercher : constantes de réussite (structure, densité, type d'attaque, ratio abstrait/concret).

#### D. Analyse des effondrements

Comparer : runs avec `metaphor_novelty=44`, `voice=71`, `ECC=83`.

Chercher : cause typique de crash (prompt trop prescriptif ? image trop démonstrative ? surcontrainte locale ?).

#### E. Audit hiérarchie du prompt

Découper le prompt assemblé en blocs :
- quel bloc vient en premier ?
- quel bloc est le plus long ?
- quel bloc contient des injonctions incompatibles ?
- quel bloc a le plus de chances d'écraser les autres ?

---

## PHASE 2 — DÉCISIONS (après audit)

**Règle :** 3 décisions maximum. Pas 12 patchs.

Critères de sélection :
1. le plus rentable (impact composite sur le plus grand nombre de runs)
2. le plus robuste (ne casse rien d'existant)
3. le moins destructeur (pas de régression ECC)

### Décisions probables selon hypothèses confirmées

| Si H confirmée | Décision |
|----------------|----------|
| H1 ✅ (surcharge SII) | **Prompt Downgrade SII** : retirer contrainte métaphore du prompt global → confier au Polish Engine (Gemini) |
| H2 ✅ (pas de hiérarchie) | **Restructurer prompt** en blocs explicites : ABSOLU / PRIORITAIRE / SECONDAIRE / OPPORTUNISTE |
| H3 ✅ (sous-axes ultra-sensibles) | **Extraction en modules** : `metaphor_novelty` → Polish SII exclusivement ; `euphony_basic` → post-traitement dédié |
| H4 ✅ (répétitions moules) | **Anti-repetition context** : injecter liste de structures déjà utilisées dans le contexte |
| H5 ✅ (Pareto structurelle) | **Confirmer Two-Stage** comme architecture définitive — ne plus chercher SII ≥ 85 en one-shot |

### Nouvelle matrice de succès cible (si H1+H5 confirmées) — Gemini

| Axe | Cible one-shot | Responsable |
|-----|----------------|-------------|
| composite | 89–92.5 | Générateur |
| ECC | > 90 | Générateur ← primaire |
| RCI | > 85 | Générateur ← primaire |
| SII | 75–82 acceptable | Polish Engine ← secondaire |
| IFI | > 85 | Générateur |
| AAI | > 85 | Générateur |

---

## LIVRABLES U-ROSETTE-14

| Livrable | Description |
|----------|-------------|
| `generation-audit-report.md` | Hypothèses, résultats, corrélations, carte Pareto, top causes d'échec, top facteurs de réussite |
| `generation-run-registry.jsonl` | Registry de tous les runs avec prompt hash, fingerprint, sous-scores, verdict, reason code |
| `prompt-conflict-matrix.md` | Matrice : bloc A × bloc B → interaction (conflit / synergie / neutre) avec preuve observée |
| `U_ROSETTE_15_DECISIONS.md` | 3 décisions structurées : à retirer / à hiérarchiser / à transformer en post-traitement |

---

## CRITÈRES DE SUCCÈS U-ROSETTE-14

U-ROSETTE-14 est réussi si, à la fin, on peut répondre sans flou à ces 4 questions :

1. **Qu'est-ce qui fait monter un bon candidat ?**
2. **Qu'est-ce qui fait tomber un bon candidat ?**
3. **Quelles contraintes doivent être globales dans le prompt ?**
4. **Quelles contraintes doivent sortir du prompt et devenir des modules spécialisés ?**

Si ces 4 réponses existent avec preuves → U-ROSETTE-15 sera chirurgical, pas spéculatif.

---

## ORDRE D'EXÉCUTION

```
PHASE 1A : Instrumenter le runner (logguer sous-scores + fingerprint)
           → Zéro modification de logique métier
           → Zéro API calls supplémentaires (réutilise les logs existants)

PHASE 1B : Corpus de runs (micro-bench x3 minimum)
           → Constituer un registre de 15-25 runs documentés
           → Inclure runs récents U-ROSETTE-12 (déjà disponibles)

PHASE 1C : Analyses A→E
           → Produire les 4 livrables

PHASE 2  : 3 décisions architecturales
           → Validation Architecte avant implémentation
           → TDD strict : tests écrits avant tout patch
```

---

## NOTE STRATÉGIQUE FINALE (convergence 3 IAs)

> Le générateur zero-shot n'a pas vocation à atteindre SEAL directement.
> Il a vocation à produire des candidats **dans la zone de portée du Polish Engine**.
> Le SEAL est le résultat du système bifasique — pas du générateur seul.

Cette division du travail est l'architecture cible. U-ROSETTE-14 doit la confirmer empiriquement et dimensionner chaque étage correctement.

---

*U_ROSETTE_14_PLAN — Fusion ChatGPT (audit) + Gemini (hypothèse Prompt Downgrade) + Claude (architecture Pareto)*
*Standard NASA-Grade L4 / DO-178C | Architecte Suprême : Francky*
