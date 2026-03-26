# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT : MÉGA-AUDIT DES INTERACTIONS FEATURES ↔ FORMULE ÉMOTION
# Autopsie mathématique complète — Zéro intuition, 100% calcul
# ═══════════════════════════════════════════════════════════════════════════════
#
# Standard : NASA-Grade L4 / DO-178C Level A
# Branche : phase-r-metrology-rebuild
#
# EXIGENCE ARCHITECTE :
#   "Ce n'est pas parce qu'une donnée dans la formule émotion
#    n'est pas appelée exactement comme une feature que les
#    modifications de l'un n'influencent pas la totalité
#    ou une partie de l'autre."
#
#   "Les idées c'est bien mais les chiffres font apparaître
#    d'autres choses que nous n'avions pas perçu."
#
# RÈGLE : Aucune modification de code. Lecture + calcul + rapport.
# Budget : 0 API (analyse pure sur données existantes + code source)
# ═══════════════════════════════════════════════════════════════════════════════

## MISSION

7 blocs d'analyse. 3 livrables. Zéro API.

## ═══════════════════════════════════════════════════════════════════════
## BLOC 1 — EXTRACTION COMPLÈTE DES FORMULES (Code Audit)
## ═══════════════════════════════════════════════════════════════════════

### 1a. Formule MacroSScore (composite)

Ouvrir `src/oracle/macro-axes.ts`. Extraire la formule EXACTE :

```
COMPOSITE = ECC × 0.33 + RCI × 0.17 + SII × 0.15 + IFI × 0.10 + AAI × 0.25
```

Pour CHAQUE macro-axe, extraire la formule des sub-scores avec poids :

```
ECC = weighted_mean(
  tension_14d × 3.0,
  emotion_coherence × 2.5,
  interiority × 2.0,
  impact × 2.0,
  temporal_pacing × 1.0,
  [physics_compliance × 0 — informatif]
)

RCI = weighted_mean(
  rhythm × conf,
  signature × 1.0,
  hook_presence × 0.2,
  euphony_basic × 0.5,
  voice_conformity × 0 [désactivé]
)

SII = weighted_mean(
  anti_cliche × 1.0,
  necessity × 1.0,
  metaphor_novelty × 1.0
)

IFI = weighted_mean(
  sensory_richness × 0.25,
  corporeal_anchoring × 0.25,
  focalisation × 0.25,
  attention_sustain × 1.0,
  fatigue_management × 1.0,
  [+ bonus distribution quartile]
)

AAI = weighted_mean(
  show_dont_tell × 3.0,
  authenticity × 2.0
)
```

Vérifier ces formules dans le code EXACT. Corriger si différent.

### 1b. Formule tension_14d (la plus critique)

Ouvrir `src/oracle/axes/tension-14d.ts`. Extraire :

1. Comment le texte est découpé en 4 quartiles
2. Comment l'émotion est analysée PAR quartile (LLM Plutchik via semantic-analyzer)
3. La cosine similarity entre target et actual par quartile
4. La courbe de mapping : similarity → score
5. Les bonus/pénalités (rupture timing, monotonie)
6. Le prompt exact du semantic analyzer (`semantic-prompts.ts`)

### 1c. Formule emotion_coherence

Ouvrir `src/oracle/axes/emotion-coherence.ts`. Extraire :

1. Comment les transitions inter-paragraphes sont mesurées
2. Le seuil `MAX_PARAGRAPH_DISTANCE` pour les "brutal jumps"
3. La table de scoring (0 jumps=100, 1=70, 2=50, 3+=0)

### 1d. Toutes les constantes cachées

Ouvrir `src/config.ts`. Extraire TOUTES les constantes qui influencent
le scoring : seuils, poids, floors, penalties, bonus, tolerances.
Les lister dans un tableau exhaustif.

### Livrable Bloc 1

Un fichier `FORMULES_COMPLETES.md` avec chaque formule, chaque constante,
chaque seuil, documenté avec le fichier:ligne exact.

## ═══════════════════════════════════════════════════════════════════════
## BLOC 2 — CARTOGRAPHIE DES INFLUENCES CROISÉES (Analyse de code)
## ═══════════════════════════════════════════════════════════════════════

### 2a. Quelles propriétés du TEXTE influencent CHAQUE sub-score ?

Pour chaque sub-score, identifier quelles propriétés du texte le modifient :

| Sub-score | Propriété textuelle | Comment elle influence | Fichier:ligne |
|---|---|---|---|
| tension_14d | Longueur des phrases | Quartiles découpés par paragraphes → phrases courtes = quartile émotionnel différent | tension-14d.ts:XX |
| tension_14d | Vocabulaire émotionnel | Le LLM Plutchik détecte les mots → influence le vecteur 14D | semantic-prompts.ts:XX |
| tension_14d | Ponctuation | Points d'exclamation / suspens influencent le LLM | implicite LLM |
| tension_14d | Densité sensorielle | Les détails corporels = incarnation émotionnelle | implicite LLM |
| emotion_coherence | Transitions entre paragraphes | Distance euclidienne 14D → saut brutal | emotion-coherence.ts:XX |
| rhythm | Longueur des phrases | CV des longueurs → score rhythm | rhythm.ts:XX |
| rhythm | Nombre de paragraphes | CV des longueurs de paragraphes | rhythm.ts:XX |
| hook_presence | Premiers/derniers mots | Présence de mots hooks | hooks.ts:XX |
| necessity | Tout le texte | LLM juge la nécessité narrative | anthropic-provider.ts:XX |
| sensory_richness | Détails sensoriels | Comptage par catégorie | sensory.ts:XX |
| etc. | | | |

### 2b. Quelles propriétés du texte sont PARTAGÉES entre sub-scores ?

Identifier les VARIABLES PROXY — propriétés qui influencent 2+ sub-scores :

| Propriété textuelle | Sub-scores influencés | Direction | Conflit ? |
|---|---|---|---|
| Phrases courtes | rhythm (+), tension_14d (?), emotion_coherence (?) | ? | À mesurer |
| Détails sensoriels | sensory_richness (+), necessity (?), tension_14d (?) | ? | À mesurer |
| Métaphores | metaphor_novelty (+), necessity (?), interiority (?) | ? | À mesurer |
| Transitions fortes | tension_14d (+), emotion_coherence (-) | OPPOSÉ | CONFLIT PROBABLE |
| Phrases longues | rhythm (variable), f26b (dans GB), tension_14d (?) | ? | À mesurer |
| Vocabulaire émotionnel | interiority (?), tension_14d (+), show_dont_tell (?) | ? | À mesurer |

### 2c. Le prompt du semantic analyzer comprend-il l'incarnation ?

Lire `src/semantic/semantic-prompts.ts` (DÉJÀ LU — je fournis le contenu).

Le prompt dit :
```
"Analyse les émotions dans ce texte selon le modèle Plutchik 14D."
```

Il NE dit PAS :
- Que les phrases courtes SONT de l'urgence/fear
- Que l'ancrage sensoriel (froid, poids, souffle) EST de l'émotion incarnée
- Que le silence narratif EST du fear
- Que la dilatation temporelle EST de l'anticipation
- Que le rythme cassé EST de l'anger/urgence

DOCUMENTER cette lacune.

## ═══════════════════════════════════════════════════════════════════════
## BLOC 3 — PREUVE PAR LES DONNÉES (Corrélations réelles)
## ═══════════════════════════════════════════════════════════════════════

### 3a. Sources de données

Charger les données des sessions existantes. Chercher dans :
- `src/scoring/data/VATOMIC_RESULTS.json` (5 briques × scores détaillés)
- `sessions/BESTOF3_2026-03-26T13-39-57/` (5 briques × 1-3 tentatives × scores)
- `sessions/TELEMETRY5_2026-03-26T17-45-50/` (5 briques × tous les sub-scores)
- `sessions/FACTORIAL_2026-03-26T09-27-02/` (8 runs × scores)
- `sessions/VATOMIC_2026-03-25T22-40-57/` (V-ATOMIC v4 — 5 briques)
- `sessions/VATOMIC_2026-03-26T07-07-28/` (V-ATOMIC v5 — 5 briques)

Aussi charger les sub-scores détaillés depuis les AUTOPSY logs dans
les fichiers de session si disponibles.

### 3b. Matrice de corrélation sub-scores

Créer un script `scripts/analyze-judge-conflicts.ts` qui :

1. Charge TOUS les sub-scores disponibles (de toutes les sessions ci-dessus)
2. Calcule la matrice de corrélation Pearson entre TOUS les sub-scores :

```
          tension  emo_coh  interior  impact  rhythm  nec   MN    sensory  hook  euphony  AAI
tension   1.000    ???      ???       ???     ???     ???   ???   ???      ???   ???      ???
emo_coh   ???      1.000    ???       ???     ???     ???   ???   ???      ???   ???      ???
interior  ???      ???      1.000     ???     ???     ???   ???   ???      ???   ???      ???
...
```

3. Identifie les CORRÉLATIONS FORTES (|r| > 0.5) — synergies ou conflits
4. Identifie les CORRÉLATIONS NÉGATIVES (r < -0.3) — conflits probables

### 3c. Analyse par TYPE DE SCÈNE

Séparer les données par type de scène (Contemplation, Confrontation, Souvenir,
Menace, Révélation) et calculer les mêmes corrélations PAR TYPE.

Question : les conflits sont-ils différents selon le type de scène ?
Ex : tension_14d vs emotion_coherence est-il plus conflictuel sur Menace
que sur Contemplation ?

### 3d. Analyse de l'influence des features texte sur les sub-scores

Si les données télémétrie contiennent les features texte (mean, CV, f26b,
paragraph_count, etc.), calculer leur corrélation avec chaque sub-score :

```
          tension  emo_coh  rhythm  nec    sensory  impact  MN
mean      ???      ???      ???     ???    ???      ???     ???
CV        ???      ???      ???     ???    ???      ???     ???
f26b      ???      ???      ???     ???    ???      ???     ???
knife     ???      ???      ???     ???    ???      ???     ???
para_cnt  ???      ???      ???     ???    ???      ???     ???
```

Question : quand CV monte (phrases plus variées), que fait tension_14d ?
Quand f26b monte (plus de phrases longues), que fait rhythm ?

## ═══════════════════════════════════════════════════════════════════════
## BLOC 4 — PREUVE DU CONFLIT TENSION vs COHÉRENCE
## ═══════════════════════════════════════════════════════════════════════

### Objectif
Prouver ou réfuter le conflit le plus dangereux du système.

### Méthode

Pour CHAQUE brique / candidat dans les données :

1. Extraire tension_14d et emotion_coherence
2. Extraire les distances émotionnelles inter-quartiles (si disponibles
   dans les détails)
3. Calculer : quand tension_14d est ÉLEVÉ (>80), emotion_coherence
   est-il systématiquement BAS (<80) ?

### Critère de conflit

```
Si r(tension_14d, emotion_coherence) < -0.3 :
  CONFLIT CONFIRMÉ — les deux s'annulent

Si r(tension_14d, emotion_coherence) > +0.3 :
  PAS DE CONFLIT — ils montent ensemble

Si |r| < 0.3 :
  PAS DE LIEN — ils sont indépendants
```

### Analyse par type de scène

Le conflit peut exister SEULEMENT sur les scènes BRUTAL (Menace/Confrontation)
où la trajectoire prescrite exige un SAUT émotionnel.
Sur les scènes INTERIOR (Contemplation/Souvenir), la trajectoire est plus
douce → pas de conflit attendu.

## ═══════════════════════════════════════════════════════════════════════
## BLOC 5 — SIMULATION DE REWEIGHTING PAR TYPE DE SCÈNE
## ═══════════════════════════════════════════════════════════════════════

### Objectif
Sans modifier le code, recalculer les composites avec des poids ADAPTÉS
au type de scène et voir si les verdicts deviennent plus cohérents.

### Profils de poids à simuler

```typescript
const PROFILES = {
  INTERIOR: {  // Contemplation, Souvenir, Révélation
    ecc: 0.30,  // Légèrement moins (tension moins critique)
    rci: 0.20,  // Plus (musicalité = qualité contemplation)
    sii: 0.15,  // Inchangé
    ifi: 0.15,  // Plus (immersion sensorielle = clé)
    aai: 0.20,  // Légèrement moins
    // Sub-poids ECC :
    interiority_boost: 1.3,  // +30% interiority dans ECC
    tension_reduce: 0.8,     // -20% tension dans ECC
  },
  BRUTAL: {  // Confrontation, Menace
    ecc: 0.35,  // Plus (tension = moteur action)
    rci: 0.20,  // Plus (rythme percutant = qualité action)
    sii: 0.12,  // Moins (la scène prime sur la sophistication)
    ifi: 0.08,  // Moins
    aai: 0.25,  // Inchangé
    // Sub-poids ECC :
    tension_boost: 1.2,      // +20% tension dans ECC
    coherence_reduce: 0.7,   // -30% cohérence (sauts autorisés)
  },
};
```

### Méthode

Pour CHAQUE brique dans TOUTES les données :

1. Recalculer le composite avec les POIDS ACTUELS (baseline)
2. Recalculer le composite avec le PROFIL correspondant au type de scène
3. Comparer :
   - Le composite change-t-il significativement ?
   - Le min_axis change-t-il ?
   - Des briques qui échouaient passent-elles SAGA_READY avec le profil ?
   - Des briques qui passaient échouent-elles ?

### Sortie attendue

```
═══ SIMULATION REWEIGHTING PAR TYPE ═══

  Brique         Type      Comp_actuel  Comp_reweighted  Δ    min_a  min_r  SAGA_a  SAGA_r
  contemplation  INTERIOR  90.0         XX.X             +X.X XX.X   XX.X   NO      ???
  confrontation  BRUTAL    88.3         XX.X             +X.X XX.X   XX.X   NO      ???
  souvenir       INTERIOR  90.4         XX.X             +X.X XX.X   XX.X   NO      ???
  menace         BRUTAL    90.8         XX.X             +X.X XX.X   XX.X   NO      ???
  revelation     INTERIOR  88.9         XX.X             +X.X XX.X   XX.X   NO      ???

  VERDICT : Reweighting [AIDE / N'AIDE PAS / AIDE PARTIELLEMENT]
```

## ═══════════════════════════════════════════════════════════════════════
## BLOC 6 — AUDIT DU SEMANTIC ANALYZER PLUTCHIK
## ═══════════════════════════════════════════════════════════════════════

### Objectif
Déterminer si le LLM Plutchik reconnaît les émotions INCARNÉES.

### Méthode

Créer 3 passages de test (en français, ~100 mots chacun) :

**Passage A — Émotion NOMMÉE (contrôle positif) :**
"La peur l'envahissait. Elle tremblait de terreur. L'angoisse montait
dans sa poitrine. Elle était pétrifiée de frayeur."

**Passage B — Émotion INCARNÉE (le vrai test) :**
"Le sentier se rétrécissait. Ses doigts agrippaient l'écorce sans raison.
L'air pesait contre sa nuque, épais comme du linge mouillé. Quelque chose
craqua derrière elle — un son trop net pour n'être qu'une branche."

**Passage C — Description NEUTRE (contrôle négatif) :**
"Le sentier traversait la forêt. Les arbres bordaient le chemin de chaque côté.
L'air était frais. Elle marchait d'un pas régulier vers la sortie."

### Ce qu'il faut mesurer

Pour chaque passage, appeler `analyzeEmotionSemantic()` et capturer
le vecteur 14D complet.

```
Passage   fear   anticipation   sadness   anger   [toutes les 14 dims]
A (nommé) ???    ???            ???       ???
B (incarné) ???  ???            ???       ???
C (neutre) ???   ???            ???       ???
```

### Critère de diagnostic

```
Si B.fear ≈ A.fear (±0.15) : Le LLM RECONNAÎT l'incarnation → PAS de lacune
Si B.fear << A.fear (écart > 0.3) : Le LLM rate l'incarnation → LACUNE CONFIRMÉE
Si C.fear ≈ 0 : Le contrôle négatif est propre
```

Budget : 3 API calls (1 par passage)

## ═══════════════════════════════════════════════════════════════════════
## BLOC 7 — MATRICE DE CONFLITS FINALE
## ═══════════════════════════════════════════════════════════════════════

### Objectif
Produire le document de synthèse qui répond à TOUTES les questions.

### Format

```
═══════════════════════════════════════════════════════════════════════
  OMEGA — MATRICE DE CONFLITS JUGES / FEATURES / ÉMOTION
═══════════════════════════════════════════════════════════════════════

  CONFLITS PROUVÉS (r < -0.3 sur les données) :
    [liste avec r, p-value, exemples]

  CONFLITS PROBABLES (conceptuels mais pas encore mesurés) :
    [liste avec raison théorique]

  FAUX CONFLITS (hypothèse réfutée par les données) :
    [liste]

  SYNERGIES DÉCOUVERTES (r > +0.5) :
    [liste — features qui s'aident mutuellement]

  LACUNES DU SEMANTIC ANALYZER :
    [résultats du Bloc 6]

  REWEIGHTING PAR TYPE :
    [résultats du Bloc 5 — aide ou pas]

  RECOMMANDATIONS :
    [classées par priorité, avec preuve exigée avant implémentation]
═══════════════════════════════════════════════════════════════════════
```

## ═══════════════════════════════════════════════════════════════════════
## LIVRABLES
## ═══════════════════════════════════════════════════════════════════════

3 fichiers dans `docs/` :

1. `OMEGA_FORMULES_COMPLETES.md` — Toutes les formules du scorer (Bloc 1)
2. `OMEGA_MATRICE_CONFLITS_JUGES.md` — Conflits, corrélations, lacunes (Blocs 2-4, 6-7)
3. `OMEGA_REWEIGHTING_SIMULATION.md` — Simulation des poids par type (Bloc 5)

+ Le script `scripts/analyze-judge-conflicts.ts` qui calcule les corrélations.

## COMMIT

```
chore(audit): mega-audit interactions features ↔ formule emotion narrative

7 blocs d'analyse (0 API sauf 3 pour le test Plutchik) :
  Bloc 1: Extraction complète des formules
  Bloc 2: Cartographie des influences croisées
  Bloc 3: Matrice de corrélation sub-scores (données existantes)
  Bloc 4: Preuve du conflit tension_14d vs emotion_coherence
  Bloc 5: Simulation reweighting par type de scène
  Bloc 6: Audit du semantic analyzer (incarné vs nommé)
  Bloc 7: Matrice de conflits finale

Livrables: 3 rapports + 1 script d'analyse
Zéro modification de code de production.
```

## CE QUI NE DOIT PAS CHANGER

RIEN. Ce méga-audit est un OBSERVATEUR PUR.
Il lit le code, calcule sur les données existantes, et rapporte.
Aucun poids, aucune formule, aucun prompt n'est modifié.
