# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE : ÉTUDE TECHNIQUE INJECTION LOI D'ALTERNANCE (v2 FINALE)
# Corrigé avec retours ChatGPT + Gemini + Architecte
# ═══════════════════════════════════════════════════════════════════════════════
#
# Standard : NASA-Grade L4 / DO-178C Level A
# Branche : phase-r-metrology-rebuild
#
# CORRECTIONS INTÉGRÉES :
#   ChatGPT : aligner métriques (r(f26b,f1a) sur OMEGA aussi)
#   ChatGPT : L3 = PAS de chiffres métriques dans les prompts actifs
#   ChatGPT : hiérarchiser les variantes (B > D > C, pas à égalité)
#   Gemini  : skeleton prompting + rhythm mask exemplar
#   Architecte : assemblage LONG+COURT séparé (plan B)
#
# DONNÉES MOBILISÉES :
#   - Rosetta P1/P2/P3 (facteurs conversion, dictionnaires v2/v3)
#   - R-CONVERSION (CV émergent, non déclarable)
#   - Corpus Maîtres (r=+0.840, champions, zone optimale)
#   - Prompt V4.3 actuel (4 tentatives qui échouent)
#   - Golden Exemplars (GE-SAGA-01/02)
#   - Principe #6 : tester par VARIATIONS, pas au feeling
#   - LOI L3 : pas de métriques chiffrées dans le prompt
#
# Budget : ~40-60 API calls
# ═══════════════════════════════════════════════════════════════════════════════

## ═══════════════════════════════════════════════════════════════════════
## BLOC 0 — ALIGNEMENT DES MÉTRIQUES (ChatGPT exige)
## Budget : 0 API (calcul sur données existantes)
## ═══════════════════════════════════════════════════════════════════════

### Objectif

Avant tout test, vérifier que le conflit existe AUSSI sur f26b↔f1a
(pas seulement f26b↔RCI). RCI est un axe COMPOSITE qui agrège
plusieurs sous-effets — il faut comparer les mêmes métriques
des deux côtés.

### Méthode

Sur les données OMEGA existantes (télémétrie 5 briques, V-ATOMIC,
Best-of-3 — toutes les sessions dans sessions/) :

1. Calculer r(f26b, f1a_rhythm_variance) sur les sorties OMEGA
2. Calculer r(f26b, RCI) sur les sorties OMEGA (déjà fait = -0.802)
3. Calculer r(f26b, rhythm_score) sur les sorties OMEGA

### Critère

```
SI r(f26b, f1a) < -0.3 sur OMEGA :
  → Le conflit est dans le TEXTE produit (confirmé)
  → L'étude d'injection est justifiée

SI r(f26b, f1a) > -0.3 sur OMEGA mais r(f26b, RCI) < -0.3 :
  → Le conflit est dans le SCORER (RCI agrège mal)
  → L'étude d'injection ne résoudra pas le problème
  → Il faut plutôt recalibrer RCI
```

## ═══════════════════════════════════════════════════════════════════════
## BLOC 1 — DIAGNOSTIC DU PROMPT ACTUEL
## Budget : 0 API
## ═══════════════════════════════════════════════════════════════════════

1. Ouvrir `src/input/prompt-assembler-v4.ts`
2. Construire le prompt EXACT envoyé au LLM pour Contemplation
3. Identifier TOUTES les instructions liées au rythme/alternance
4. Pour CHACUNE, noter le facteur Rosetta et pourquoi elle échoue
5. Lire le system prompt de generateDraft (anthropic-provider.ts:347)
   et noter ce qui MANQUE
6. Sauver dans `docs/PROMPT_DIAGNOSTIC.md`

## ═══════════════════════════════════════════════════════════════════════
## BLOC 2 — INVENTAIRE DES TECHNIQUES (Rosetta + Gemini + Architecte)
## Budget : 0 API
## ═══════════════════════════════════════════════════════════════════════

Lire les fichiers Rosetta :
- `omega-autopsie/results_rosetta/phase2/dictionnaire_v2_calibre.json`
- `omega-autopsie/results_rosetta/phase3/dictionnaire_v3_llm_driven.json`
- `omega-autopsie/results_rosetta/phase3/bloc_a_reverse_micro.json`

Produire un tableau des techniques disponibles avec leur efficacité prouvée.

## ═══════════════════════════════════════════════════════════════════════
## BLOC 3 — CONCEPTION DES 8 VARIANTES (hiérarchisées)
## Budget : 0 API
## ═══════════════════════════════════════════════════════════════════════

### IMPORTANT — LOI L3

NE PAS mettre de métriques chiffrées DIRECTES dans les prompts actifs.
R-CONVERSION a prouvé que le CV est émergent et non déclarable.
Les variantes doivent utiliser des IMAGES, des MOUVEMENTS, des EXEMPLES.
PAS "40-80 mots puis 3-10 mots".

Les chiffres ne sont autorisés que dans les variantes C et H
qui sont explicitement des BENCH expérimentaux, pas des prompts de prod.

### Variante A — BASELINE (contrôle)

Prompt V4.3.0 inchangé. Le contrôle.

### Variante B — EXEMPLAR ALTERNANT (PRIORITÉ 1 — ChatGPT recommande)

Remplacer GE-SAGA-01/02 par un exemplar qui DÉMONTRE l'alternance.
L'exemplar doit montrer : période ample → COUPE SÈCHE → période ample
→ COUPE → reprise. Le LLM doit COPIER le pattern, pas l'interpréter.

Créer l'exemplar en extrayant un passage RÉEL d'une brique SAGA_READY
qui avait un bon f17+f26b, OU en composant un exemplar qui respecte
le pattern. L'exemplar doit contenir :
- Au moins 2 phrases > 40 mots (périodes)
- Au moins 2 phrases < 8 mots (coupes)
- Alternance visible : LONG → COURT → LONG → COURT

### Variante C — SYSTEM PROMPT ENRICHI (PRIORITÉ 2)

Modifier UNIQUEMENT le system prompt de generateDraft.
PAS de chiffres. Des IMAGES et du MOUVEMENT :

```
"Tu es un écrivain de fiction littéraire française, héritier de
Flaubert et Claude Simon. Ta signature : l'ALTERNANCE entre
la nappe ample qui déroule ses incises et subordonnées, et
la coupe nette qui tombe comme une porte. Tu ne laisses JAMAIS
une série de phrases longues sans y intercaler un verdict bref.
Tu ne laisses JAMAIS une rafale de phrases courtes sans y glisser
une respiration ample. Chaque paragraphe contient les deux."
```

### Variante D — ANTI-MONOTONIE (ChatGPT Famille 3)

Ajouter dans le BLOC 9 (Interdictions) une 4e règle :

```
"4. Pas de chapelet de phrases de même longueur — si trois phrases
consécutives ont un rythme similaire, casse le pattern avec une
phrase radicalement différente (très courte après du long, ou
très longue après du haché)."
```

Ne dit PAS quels chiffres. Dit ce qu'il ne faut PAS faire.

### Variante E — SKELETON PROMPTING (Gemini Vecteur 1)

Ajouter dans la FINAL INSTRUCTION :

```
"Avant d'écrire, conçois mentalement le rythme de chaque paragraphe :
un mouvement d'onde — montée ample, coupe, reprise, retombée.
Chaque paragraphe doit contenir au moins un changement radical
de longueur de phrase."
```

L'idée est de forcer le "System 2" (planification) avant la génération.

### Variante F — RHYTHM MASK (Gemini Vecteur 4)

Au lieu de texte exemplar, donner le MASQUE RYTHMIQUE pur :

```
"Calque le rythme de tes phrases sur ce patron :
  Paragraphe 1 : [ample — bref — ample — bref — moyen]
  Paragraphe 2 : [bref — très ample — bref — ample]
  Paragraphe 3 : [bref — bref — ample — bref]
  Paragraphe 4 : [ample — bref — ample — moyen — bref]"
```

PAS de chiffres. Des QUALIFICATIFS (bref/ample/moyen/très ample).

### Variante G — COMBINAISON B + C + D

Appliquer les 3 meilleures techniques ensemble :
- Exemplar alternant (B)
- System prompt enrichi (C)
- Anti-monotonie (D)

SEULEMENT si B, C, D ont été testées individuellement d'abord.

### Variante H — ASSEMBLAGE SÉPARÉ (Plan B Architecte)

Si AUCUNE technique ne force le LLM à alterner dans un seul tir :

1. Générer UNE phrase longue (40-60 mots) via un prompt dédié :
   "Écris UNE SEULE phrase ample de prose littéraire française (une
    période avec subordonnées et incises). Sujet : [le beat en cours]"
2. Générer UNE phrase courte (3-8 mots) via un prompt dédié :
   "Écris UN verdict sec de 3 à 8 mots. Une porte qui se ferme."
3. Assembler en alternance : LONG, COURT, LONG, COURT...
4. Scorer l'assemblage

C'est le plan B radical — si le LLM ne sait pas alterner,
on lui fait faire UNE chose à la fois et on assemble nous-mêmes.

## ═══════════════════════════════════════════════════════════════════════
## BLOC 4 — TEST CONTRÔLÉ DES VARIANTES
## Budget : ~30-40 API
## ═══════════════════════════════════════════════════════════════════════

### Ordre de test (ChatGPT : hiérarchiser, pas à égalité)

```
Phase 1 : A (baseline) + B (exemplar) + C (system prompt)
  → 3 runs × 1 brique (Menace) = ~15 API
  → Mesurer : f26b, f1a, f17_knife, cv_sent, mean, words
  → Identifier le meilleur levier

Phase 2 : D (anti-mono) + E (skeleton) + F (mask)
  → 3 runs × 1 brique (Menace) = ~15 API
  → SEULEMENT si Phase 1 n'a pas trouvé de gagnant clair

Phase 3 : G (combo) ou H (assemblage)
  → 1-2 runs × 1 brique = ~5-10 API
  → SEULEMENT après identification des meilleurs leviers
```

### Scène de test : MENACE (la plus résistante)

Menace est le cas le plus dur (ECC=89.5, tension_14d=84.7).
Si l'alternance aide sur Menace, elle aidera partout.

### Métriques obligatoires par variante

```
  Variante  f26b   f17   f1a    cv     mean   words  ECC   RCI   comp   min
  A (base)  ???    ???   ???    ???    ???    ???    ???   ???   ???    ???
  B (exemp) ???    ???   ???    ???    ???    ???    ???   ???   ???    ???
  C (syspr) ???    ???   ???    ???    ???    ???    ???   ???   ???    ???
  ...
```

+ Pour chaque variante, noter qualitativement :
  "Alternance réellement observée dans le texte ? OUI/NON/PARTIEL"

### Critère de succès (ChatGPT corrige)

```
  Succès = f17 >= 4 ET f26b tient (>= baseline)
           ET f1a >= baseline
           ET RCI ne s'effondre pas (>= baseline - 2)
           ET ECC tient (>= baseline)
           ET alternance RÉELLEMENT OBSERVÉE dans le texte
```

Le vrai critère n'est pas juste "composite +1".
C'est : les deux montent ENSEMBLE et le texte montre des reprises + coupes.

## ═══════════════════════════════════════════════════════════════════════
## BLOC 5 — SCORING MACROSCORE DES 2 MEILLEURES
## Budget : ~12 API
## ═══════════════════════════════════════════════════════════════════════

Prendre les 2 variantes avec le meilleur profil f17+f26b+f1a.
Les scorer avec MacroSScore complet sur Menace.
Puis scorer sur Révélation (2e brique résistante).

## ═══════════════════════════════════════════════════════════════════════
## BLOC 6 — ANALYSE DES ÉCHECS + PLAN B (si nécessaire)
## Budget : variable
## ═══════════════════════════════════════════════════════════════════════

Si AUCUNE variante ne produit f17 >= 4 ET f26b tient :

1. Lire les textes et identifier POURQUOI
2. Tester la Variante H (assemblage séparé)
3. Si H fonctionne → le LLM ne sait pas alterner dans un tir
   → l'architecture doit séparer génération de phrases longues
   et phrases courtes, puis assembler

## ═══════════════════════════════════════════════════════════════════════
## BLOC 7 — RAPPORT FINAL
## ═══════════════════════════════════════════════════════════════════════

### Livrable

`docs/OMEGA_ETUDE_ALTERNANCE.md` avec :

1. Bloc 0 : r(f26b, f1a) sur OMEGA — confirmation du conflit
2. Diagnostic du prompt actuel (pourquoi ça échoue)
3. Les 8 variantes et leurs résultats mesurés
4. Scoring des 2 meilleures sur Menace + Révélation
5. Recommandation technique finale avec arbre de décision

### Arbre de décision

```
SI Bloc 0 : r(f26b, f1a) > -0.3 sur OMEGA :
  → Le conflit est dans le SCORER, pas le texte
  → STOP — recalibrer RCI au lieu d'injecter l'alternance

SI variante B (exemplar) gagne seule :
  → Remplacer les golden exemplars — le levier le plus simple
  → Relancer Best-of-3 sur 5 briques

SI variante C (system prompt) gagne seule :
  → Enrichir le system prompt de generateDraft
  → Impact global sur TOUS les modes

SI variante G (combo) gagne :
  → Implémenter B + C + D ensemble
  → Test Best-of-3 sur 5 briques

SI variante H (assemblage séparé) gagne :
  → Architecture de micro-assemblage phrase par phrase
  → Plus complexe mais plus déterministe

SI RIEN ne gagne :
  → Le LLM est structurellement incapable d'alternance
  → Accepter les briques actuelles + Best-of-3
  → Concentrer l'effort sur les prompts de CONTENU (pas de rythme)
```

### Données sauvegardées

Tous les textes + features dans :
`sessions/ALTERNANCE_STUDY_[date]/`

## COMMIT

```
test(alternance): etude technique injection loi alternance v2 — 8 variantes

Corrections ChatGPT: alignement metriques (Bloc 0), L3 pas de chiffres,
  hierarchisation B>C>D, critere de succes corrige
Corrections Gemini: skeleton prompting (E), rhythm mask (F)
Correction Architecte: assemblage separe LONG+COURT (H)

8 variantes: A baseline, B exemplar, C system prompt, D anti-monotonie,
E skeleton, F rhythm mask, G combo, H assemblage separe
Test hierarchise: Phase 1 (A+B+C) puis Phase 2 (D+E+F) puis Phase 3 (G/H)
Principes Rosetta appliques: #2 mecanique, #3 premier tir, #6 variations
LOI L3 respectee: pas de metriques chiffrees dans les prompts actifs
```
