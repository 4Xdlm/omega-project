# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT : AUDIT CAUSAL COMPLET DU PIPELINE
# 6 blocs — Mesurer AVANT de corriger — Zéro modification de code de prod
# ═══════════════════════════════════════════════════════════════════════════════
#
# Standard : NASA-Grade L4 / DO-178C Level A
# Branche : phase-r-metrology-rebuild
# Tests avant : 2011 PASS
#
# EXIGENCE ARCHITECTE (non négociable) :
#   "On ne s'arrête pas au premier clou trouvé.
#    On vérifie que tous les clous sont enlevés
#    et si besoin on met un nouveau pneu."
#
#   "Peut-être qu'allonger les premiers jets serait
#    plus productif que les réduire."
#
# RÈGLE ABSOLUE : AUCUNE MODIFICATION DU CODE DE PRODUCTION.
# Ce script est un OBSERVATEUR PUR. Il mesure, il ne change rien.
# Toutes les variations (token budget, ablation) sont faites
# par des wrappers temporaires dans le script, pas dans le code.
#
# Budget total : ~60-80 API calls
# ═══════════════════════════════════════════════════════════════════════════════

## MISSION

Créer `scripts/audit-causal-pipeline.ts`

Ce script exécute 6 blocs d'audit sur 2 briques (Contemplation + Menace)
et produit un rapport JSON + console complet.

IMPORTANT : Le script ne modifie AUCUN fichier source. Il utilise des
wrappers, des copies en mémoire, et des appels directs aux fonctions
internes pour tester les variations.

## ═══════════════════════════════════════════════════════════════════════
## BLOC A — SCORER LE DRAFT K2 COMPLET (sans Loop, sans Duel)
## Budget : ~20 API (2 briques × ~10 API scoring)
## ═══════════════════════════════════════════════════════════════════════

### Objectif
Répondre à : "Le draft K2 de 2300w est-il BON ou MAUVAIS ?"

### Méthode
1. Générer le draft K2 chunké pour Contemplation + Menace
   (utiliser la même méthode que le pipeline : 4 chunks × 750w)
2. NE PAS passer par le SovereignLoop
3. NE PAS passer par le Duel
4. Scorer DIRECTEMENT le draft complet avec MacroSScore
   (judgeAestheticV3 ou équivalent)
5. Capturer : composite, tous les axes, tous les sub-scores,
   le vecteur 14D par quartile, les features texte

### Sortie attendue

```
═══ BLOC A — SCORE DU DRAFT K2 COMPLET ═══

  Brique          Words  Mean   CV    f26b   Comp   min   ECC   RCI   SII   IFI   AAI
  contemplation   2328   55.8   0.65  0.667  XX.X   XX.X  XX.X  XX.X  XX.X  XX.X  XX.X
  menace          2238   47.6   0.51  0.740  XX.X   XX.X  XX.X  XX.X  XX.X  XX.X  XX.X

  VERDICT A : Draft K2 complet est [BON >90 / MOYEN 85-90 / MAUVAIS <85]
```

### Critère PASS/FAIL
- Si composite > 90 : le pipeline AMONT produit de la qualité → la dégradation vient d'APRÈS
- Si composite 85-90 : le draft est moyen → il faut comprendre quels axes sont faibles
- Si composite < 85 : le K2 Chunking ne produit pas de qualité longue

## ═══════════════════════════════════════════════════════════════════════
## BLOC B — FENÊTRES ISOMÉTRIQUES (500w extraites du draft)
## Budget : ~20 API (2 briques × 4 fenêtres × ~2.5 API scoring)
## ═══════════════════════════════════════════════════════════════════════

### Objectif
Répondre à : "Le draft est-il bon LOCALEMENT ou seulement en GLOBAL ?"
Et : "Les single-shots sont-ils meilleurs que les fenêtres du draft ?"

### Méthode
1. Prendre le draft K2 complet de chaque brique (du Bloc A)
2. Le couper en 4 fenêtres de ~500w (aux frontières de paragraphes)
3. Scorer chaque fenêtre avec MacroSScore
4. Comparer les scores des fenêtres avec ceux des single-shots
   du dernier run télémétrie (dans sessions/TELEMETRY5_...)

### Sortie attendue

```
═══ BLOC B — FENÊTRES ISOMÉTRIQUES ═══

  CONTEMPLATION
  Source              Words  Mean   CV    f26b   Comp   min
  draft_complet       2328   55.8   0.65  0.667  XX.X   XX.X
  fenetre_1 (0-500w)   500   XX.X   XX.X  XX.X   XX.X   XX.X
  fenetre_2 (500-1000)  500   XX.X   XX.X  XX.X   XX.X   XX.X
  fenetre_3 (1000-1500) 500   XX.X   XX.X  XX.X   XX.X   XX.X
  fenetre_4 (1500-2000) 500   XX.X   XX.X  XX.X   XX.X   XX.X
  single_shot_winner    420   32.3   1.02  0.39   86.8   58.9

  MENACE
  [même format]

  VERDICT B : Fenêtres du draft [MEILLEURES / ÉGALES / PIRES] que single-shots
```

### Critère PASS/FAIL
- Si fenêtres > single-shots : le draft est meilleur, le pipeline le détruit
- Si fenêtres ≈ single-shots : pas de différence, le K2 n'apporte rien
- Si fenêtres < single-shots : les single-shots sont meilleurs par design

## ═══════════════════════════════════════════════════════════════════════
## BLOC C — TEST A/B TOKEN BUDGET applyPatch
## Budget : ~8 API (2 briques × 2 conditions × ~2 API patch)
## ═══════════════════════════════════════════════════════════════════════

### Objectif
Répondre à : "Le bug de token budget est-il la cause de la troncature ?"

### Méthode
1. Prendre le draft K2 complet de chaque brique (du Bloc A)
2. Simuler une correction minimale (ex: pitch="améliorer le rythme")
3. Appeler applyPatch DEUX FOIS sur le MÊME draft :
   - Run A : max_tokens = 2000 (config actuelle)
   - Run B : max_tokens = 8000 (budget élargi)

IMPORTANT : NE PAS modifier anthropic-provider.ts.
Au lieu de ça, appeler directement callClaudeSync avec un config modifié :

```typescript
// Run A — config actuelle
const configA = { ...baseConfig, judgeMaxTokens: 2000 };
const resultA = await provider.applyPatch(draft, minimalPitch, constraints);

// Run B — config élargie (wrapper temporaire)
// Il faut soit :
// a) Créer un second provider avec judgeMaxTokens=8000
// b) Ou appeler l'API directement avec le bon budget
```

Si créer un wrapper est trop complexe, utiliser une variable d'environnement :
```typescript
process.env.OMEGA_PATCH_MAX_TOKENS = '8000';
```
Et lire cette variable dans le script.

4. Mesurer pour chaque run :
   - words_input (le draft complet)
   - words_output (le résultat du patch)
   - ratio_conservation (output/input)
   - mean, CV, f26b du résultat
   - Le texte se termine-t-il proprement ? (point final ou phrase coupée)

### Sortie attendue

```
═══ BLOC C — A/B TOKEN BUDGET applyPatch ═══

  CONTEMPLATION
  Condition   Tokens  Input_w  Output_w  Ratio   Mean   CV    f26b  Fin_propre
  A (2000t)    2000    2328      466     20.0%   91.0   0.27  1.00  NON (coupé)
  B (8000t)    8000    2328      ????    ??.?%   ??.?   ?.??  ?.??  ???

  MENACE
  [même format]

  VERDICT C : Bug token budget [CONFIRMÉ / PARTIEL / NON CONFIRMÉ]
  - Si Run B conserve >80% des mots → troncature était la cause
  - Si Run B conserve <50% des mots → le LLM compresse AUSSI volontairement
```

## ═══════════════════════════════════════════════════════════════════════
## BLOC D — ABLATION DU SOVEREIGN LOOP
## Budget : ~10 API (2 briques × 1 run sans loop × ~5 API)
## ═══════════════════════════════════════════════════════════════════════

### Objectif
Répondre à : "Le SovereignLoop aide-t-il ou détruit-il ?"

### Méthode
1. Prendre le draft K2 complet de chaque brique (du Bloc A)
2. SAUTER le SovereignLoop
3. Passer directement au Duel :
   - Candidat [0] = draft K2 COMPLET (pas le loop_refined mutilé)
   - Candidats [1-3] = single-shots normaux (3 modes)
4. Le Duel sélectionne le meilleur candidat

COMMENT : Appeler runDuel() directement avec existingProse = draft K2 complet.
Le Duel va scorer les 4 candidats normalement.

5. Capturer :
   - Quel candidat gagne ? (draft complet ou single-shot ?)
   - Si le draft complet gagne → le Loop le détruisait pour rien
   - Si un single-shot gagne → le draft complet est réellement inférieur

### Sortie attendue

```
═══ BLOC D — ABLATION DU SOVEREIGN LOOP ═══

  CONTEMPLATION (sans loop, draft K2 complet en candidat [0])
  Candidate         Words  Comp   min   selection_score
  [0] draft_complet  2328  XX.X   XX.X  XX.X
  [1] tranchant       500  XX.X   XX.X  XX.X
  [2] sensoriel       500  XX.X   XX.X  XX.X
  [3] experimental    500  XX.X   XX.X  XX.X
  Winner: [?] ??????

  MENACE (sans loop)
  [même format]

  VERDICT D : Sans Loop, le draft complet [GAGNE / PERD] contre les single-shots
```

### Critère PASS/FAIL
- Si draft gagne → le Loop est un destructeur net → le désactiver
- Si single-shot gagne → le draft long est réellement inférieur à taille comparable → investiguer plus

### NOTE IMPORTANTE
Le MacroSScore a probablement un biais de longueur (4 quartiles sur 2300w vs 500w
= des quartiles de taille très différente). Si le draft perd avec un min_axis bas
mais un composite élevé, ça peut être ce biais.

## ═══════════════════════════════════════════════════════════════════════
## BLOC E — TEST DE FIDÉLITÉ DU PATCH (ChatGPT Q6)
## Budget : ~4 API (1 brique × 2 runs patch)
## ═══════════════════════════════════════════════════════════════════════

### Objectif
Répondre à : "Même avec un budget suffisant, applyPatch résume-t-il ?"

### Méthode
1. Prendre le draft K2 complet de Contemplation
2. Créer un pitch MINIMAL qui ne demande PAS de compression :
   pitch = "Améliore légèrement la musicalité des 3 premières phrases.
   NE CHANGE RIEN D'AUTRE. Retourne le texte INTÉGRALEMENT."
3. Appeler applyPatch avec max_tokens = 8000
4. Mesurer :
   - ratio conservation mots (output/input)
   - conservation des phrases (combien de phrases originales sont préservées)
   - conservation des paragraphes
   - le LLM a-t-il ajouté ou retiré du contenu ?

### Sortie attendue

```
═══ BLOC E — FIDÉLITÉ DU PATCH ═══

  Input:  2328 mots, 42 phrases, 24 paragraphes
  Output: ???? mots, ?? phrases, ?? paragraphes
  Conservation mots:    ??.?%
  Conservation phrases: ??.?%
  Conservation paras:   ??.?%
  Phrases ajoutées:     ?
  Phrases supprimées:   ?

  VERDICT E : applyPatch [FIDÈLE / COMPRESSE PARTIELLEMENT / RÉSUME]
```

## ═══════════════════════════════════════════════════════════════════════
## BLOC F — ANALYSE DU BIAIS DE LONGUEUR DU SCORER
## Budget : 0 API (re-calcul sur données existantes)
## ═══════════════════════════════════════════════════════════════════════

### Objectif
Répondre à : "Le MacroSScore pénalise-t-il mécaniquement les textes longs ?"

### Méthode
Analyser les scores du Bloc A (draft complet) vs Bloc B (fenêtres) vs single-shots.

Pour chaque axe, calculer la CORRÉLATION entre le nombre de mots et le score :

```
Données : 
  - draft complet (2300w) : scores de chaque axe
  - 4 fenêtres (500w chacune) : scores de chaque axe
  - 3-4 single-shots (400-600w) : scores de chaque axe
  
Total : ~8-10 points de données par brique

Pour chaque axe (ECC, RCI, SII, IFI, AAI) :
  r = correlation(words, score)
  Si r < -0.5 : biais anti-long confirmé
  Si r > +0.5 : biais anti-court confirmé
  Si |r| < 0.3 : pas de biais de longueur
```

### Sortie attendue

```
═══ BLOC F — BIAIS DE LONGUEUR DU SCORER ═══

  Axe     r(words,score)  Biais
  ECC     XX.XX           [anti-long / anti-court / neutre]
  RCI     XX.XX           [anti-long / anti-court / neutre]
  SII     XX.XX           [anti-long / anti-court / neutre]
  IFI     XX.XX           [anti-long / anti-court / neutre]
  AAI     XX.XX           [anti-long / anti-court / neutre]
  COMP    XX.XX           [anti-long / anti-court / neutre]

  VERDICT F : Le scorer [EST / N'EST PAS] biaisé par la longueur
```

## ═══════════════════════════════════════════════════════════════════════
## RAPPORT FINAL — ARBRE DE DÉCISION
## ═══════════════════════════════════════════════════════════════════════

À la fin des 6 blocs, afficher l'arbre de décision :

```
═══════════════════════════════════════════════════════════════════════
  OMEGA — AUDIT CAUSAL PIPELINE — VERDICTS
═══════════════════════════════════════════════════════════════════════

  BLOC A : Draft K2 complet = [BON/MOYEN/MAUVAIS] (composite=XX.X)
  BLOC B : Fenêtres vs single-shots = [MEILLEURES/ÉGALES/PIRES]
  BLOC C : Bug token budget = [CONFIRMÉ/PARTIEL/NON CONFIRMÉ]
  BLOC D : Sans Loop, draft = [GAGNE/PERD]
  BLOC E : applyPatch = [FIDÈLE/COMPRESSE/RÉSUME]
  BLOC F : Biais longueur scorer = [OUI/NON]

  ═══ ARBRE DE DÉCISION ═══

  SI A=BON ET C=CONFIRMÉ ET D=GAGNE :
    → Le pipeline long est viable. Le bug token détruisait la qualité.
    → FIX : augmenter le budget applyPatch.
    → Le draft K2 complet devrait être le winner.

  SI A=BON ET D=PERD ET F=BIAIS :
    → Le draft est bon mais le scorer le pénalise.
    → FIX : recalibrer le scorer pour les textes longs.

  SI A=MOYEN ET B=PIRES :
    → Les single-shots sont meilleurs par design.
    → DÉCISION : architecture brique courte + Linker.

  SI A=BON ET D=PERD ET F=NEUTRE :
    → Le draft est bon localement mais pas globalement.
    → INVESTIGATION : pourquoi la cohérence globale chute ?

  SI C=NON CONFIRMÉ ET E=RÉSUME :
    → Le LLM compresse volontairement, pas par manque de tokens.
    → FIX : modifier le prompt de patch.

═══════════════════════════════════════════════════════════════════════
```

## EXPORT JSON

Sauvegarder le rapport complet dans :
`sessions/AUDIT_CAUSAL_[date]/audit_results.json`

Avec TOUS les scores bruts, features, textes hashés.

## COMMIT

```
test(audit): audit causal pipeline — 6 blocs sans modification de code

Bloc A: Score du draft K2 complet (2300w) — qualité amont
Bloc B: Fenêtres isométriques 500w — comparaison à taille égale
Bloc C: A/B token budget applyPatch 2000 vs 8000
Bloc D: Ablation SovereignLoop — draft complet dans le Duel
Bloc E: Fidélité du patch — le LLM résume-t-il volontairement ?
Bloc F: Biais de longueur du scorer — corrélation words vs score

Observateur PUR — zéro modification du code de production.
Arbre de décision architecture long vs court.
```

## CE QUI NE DOIT PAS CHANGER

RIEN. Ce script ne modifie AUCUN fichier du repo.
Il lit, il appelle, il mesure, il rapporte.
