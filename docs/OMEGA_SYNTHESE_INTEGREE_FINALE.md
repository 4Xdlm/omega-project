# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — SYNTHÈSE FINALE INTÉGRÉE
# Architecture globale + Opération Rosetta + Garde-fous anti-doublon
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date     : 2026-03-19
# Pour     : ChatGPT + Gemini — DERNIÈRE consultation avant exécution
# ═══════════════════════════════════════════════════════════════════════════════

---

# PARTIE 1 — ALERTE DE FRANCKY : NE PAS OUBLIER OMEGA

## Le risque identifié

Francky prévient : "ne faisons pas disparaître le moteur émotionnel
en péchant dans l'optimisation de ce que nous avons devant les yeux."

En clair : le module "style/type de passage" ne doit pas DOUBLER
des fonctions qui existent déjà dans OMEGA. C'est une erreur qui
nous a déjà coûté cher 4 fois dans le projet.

## Ce qui EXISTE DÉJÀ dans OMEGA (audit du code source)

### A. Le pipeline actuel a déjà un "détecteur de style"

Dans engine.ts, la fonction `deriveArchetypeFromPacket()` dérive
l'archétype de la scène à partir de :
- `packet.intent.conflict_type` (type de conflit)
- `packet.emotion_contract.curve_quartiles[2].dominant` (émotion dominante au climax)

Ça produit : BRUTAL, INTERIOR, SENSORY, CATHEDRAL, BALANCED.

**C'est EXACTEMENT la même information que le "type de passage" R6.**

Le JUGE 0 (PROFILEUR) que nous voulons créer ne doit PAS ignorer
l'archétype déjà dérivé par le pipeline. Il doit le COMPARER avec
sa propre analyse du texte produit.

### B. Le scoring existant a déjà des "templates adaptés"

Les archétypes OMEGA pilotent déjà le Damage Gate :
- BRUTAL : multiplicateur ×1.38 sur P05→MUSICALITE
- INTERIOR : multiplicateur ×1.73 sur P05→MUSICALITE
- CATHEDRAL : multiplicateur spécifique sur P03

**Les templates adaptés par archétype EXISTENT DÉJÀ.**
Le module R6 ne doit pas les remplacer mais les COMPLÉTER.

### C. Le ForgePacket contient déjà l'intention stylistique

```typescript
ForgePacket = {
  intent: { conflict_type, scene_goal, pov, tense, target_word_count },
  emotion_contract: { curve_quartiles, tension, valence_arc },
  style_genome: { lexicon, rhythm, tone, imagery, voice },
  beats: [...],
  kill_lists: { banned_words, banned_cliches, banned_ai_patterns }
}
```

Le `style_genome` contient déjà :
- `rhythm.avg_sentence_length_target` → ce qu'on VEUT comme f1_mean
- `rhythm.gini_target` → ce qu'on VEUT comme variance rythmique
- `tone.dominant_register` → le registre demandé
- `imagery.density_target_per_100_words` → la densité sensorielle cible

**L'intention stylistique est DÉJÀ encodée dans le ForgePacket.**
Le reverse engineering du LLM ne part pas de zéro — il part de ce
que le pipeline ENVOIE DÉJÀ au Scribe et compare avec ce que le
Scribe PRODUIT RÉELLEMENT.

### D. Le scoring émotionnel (ECC) mesure déjà l'alignement

L'axe ECC (Emotional Control Core, 33% du composite) contient :
- `tension_14d` : trajectoire émotionnelle 14 dimensions
- `emotion_coherence` : alignement entre l'émotion demandée et produite
- `interiority` : profondeur psychologique (juge LLM)
- `impact` : force narrative (juge LLM)

**L'ECC fait DÉJÀ une mesure de désalignement émotionnel.**
Le concept de "alignment_score" du PROFILEUR doit s'articuler avec
l'ECC, pas le doubler.

## RÈGLE D'OR — ANTI-DOUBLON

```
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   AVANT DE CRÉER UNE FONCTION DANS LE MODULE STYLE/PROFILEUR :   ║
║                                                                   ║
║   1. Vérifier si elle existe dans engine.ts                       ║
║   2. Vérifier si elle existe dans oracle/macro-axes.ts            ║
║   3. Vérifier si elle existe dans damage-gate.ts                  ║
║   4. Si elle existe : INTERFACER, ne pas dupliquer                ║
║   5. Si elle n'existe pas : créer dans src/scoring/               ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

# PARTIE 2 — ARCHITECTURE INTÉGRÉE (pas un module isolé)

## La vraie architecture OMEGA avec le PROFILEUR

```
ENTRÉE : ForgePacketInput (intention, émotion, style, beats)
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ PIPELINE EXISTANT (GELÉ)                                │
│                                                         │
│ assembleForgePacket() → deriveArchetype() → SCRIBE LLM  │
│   → 4 drafts → DUEL → winner → micro-surgery → prose    │
│                                                         │
│ SCORING LEGACY (V3)                                     │
│   ECC (tension_14d, emotion_coherence, interiority)     │
│   RCI (rhythm, signature, euphony)                      │
│   SII (anti_cliche, necessity, metaphor_novelty)        │
│   IFI (sensory, corporeal, attention, fatigue)           │
│   AAI                                                   │
│   → composite legacy                                    │
└─────────────┬───────────────────────────────────────────┘
              │ prose + ForgePacket (intention connue)
              ▼
┌─────────────────────────────────────────────────────────┐
│ NOUVEAU : JUGE 0 — PROFILEUR                            │
│                                                         │
│ Entrées :                                               │
│   - prose (texte généré)                                │
│   - archetype_legacy (BRUTAL/INTERIOR/etc.) ← RÉUTILISÉ│
│   - style_genome (intention stylistique) ← RÉUTILISÉ   │
│   - features F24-F38 + F1-F23 (49 capteurs)            │
│                                                         │
│ Sorties :                                               │
│   - composition : {DESC: 0.35, ACTION: 0.25, ...}      │
│   - alignment_score : cosine(visé, produit)             │
│   - désalignement_type : s'il y a écart visé/produit   │
│   - template_effectif : calculé par composition         │
│                                                         │
│ NOTE : Le PROFILEUR NE NOTE PAS la prose.               │
│ Il décide dans quel RÉGIME les Juges 1 et 2 la lisent. │
└─────────────┬───────────────────────────────────────────┘
              │ template_effectif + alignment
              ▼
┌─────────────────────────────────────────────────────────┐
│ JUGE 1 (LOCAL) — features à confiance haute @600w       │
│ Template adapté à la composition du PROFILEUR           │
│ → score_LOCAL                                           │
├─────────────────────────────────────────────────────────┤
│ HANDSHAKE : si LOCAL < 30 → skip ARC                    │
├─────────────────────────────────────────────────────────┤
│ JUGE 2 (ARC) — features à confiance haute @2500w        │
│ Template adapté à la composition du PROFILEUR           │
│ → score_ARC                                             │
├─────────────────────────────────────────────────────────┤
│ FUSION : α × LOCAL + β × ARC (α/β = 0.43/0.57)        │
│ + confidence globale                                    │
│ + alignment_score (garde-fou)                           │
│ → composite_R6                                          │
└─────────────────────────────────────────────────────────┘

SORTIE FINALE :
  - composite_legacy (V3) : tel quel, pas touché
  - composite_R6 : nouveau scoring avec template adapté
  - alignment_score : mesure de compréhension du prompt
  - profil_composition : vecteur de types
```

## Points de SYMBIOSE avec OMEGA existant

| Élément OMEGA existant | Comment le PROFILEUR l'utilise | Pas de doublon |
|------------------------|-------------------------------|----------------|
| `deriveArchetypeFromPacket()` | Reçoit l'archétype comme "type_visé" | Le PROFILEUR ne redérive pas l'archétype |
| `style_genome` du ForgePacket | Lit les cibles (sentence_length_target, gini_target) pour calculer le désalignement | Le PROFILEUR ne redéfinit pas les cibles |
| `emotion_contract` | Compare la trajectoire émotionnelle visée vs produite (complète l'ECC, ne le remplace pas) | L'ECC reste le juge émotionnel, le PROFILEUR fait le juge stylistique |
| `damage-gate.ts` (archetype multipliers) | Les multipliers du Damage Gate opèrent sur la micro-chirurgie. Le PROFILEUR opère sur le SCORING. Pas de conflit. | Deux couches différentes |
| `kill_lists` | Le PROFILEUR peut vérifier que les anti-patterns du style sont respectés | Complémentaire, pas doublon |

---

# PARTIE 3 — CONVERGENCE COMPLÈTE (Claude + ChatGPT + Gemini + Francky)

## Décisions verrouillées

| # | Décision | Source | Unanime |
|---|----------|--------|---------|
| D1 | Le détecteur actuel binaire est désactivé pour le bench | 3/3 IAs | ✅ |
| D2 | Le PROFILEUR sera probabiliste (composition, pas catégorie) | 3/3 IAs + Francky | ✅ |
| D3 | Reverse engineering du LLM AVANT toute calibration | Francky + 3/3 | ✅ |
| D4 | Classiques = ancre de référence. LLM = espace à cartographier | 3/3 IAs | ✅ |
| D5 | Dictionnaire OMEGA ↔ LLM versionné par modèle | ChatGPT + Gemini | ✅ |
| D6 | Désalignement = WARNING en V1, pas blocage | ChatGPT + Gemini | ✅ |
| D7 | Architecture 3 Juges (Profileur + LOCAL + ARC), pas 4 | Gemini | ✅ |
| D8 | Template par composition (top-2 en V1, pas mix total) | ChatGPT | ✅ |
| D9 | Le PROFILEUR réutilise archetype + style_genome d'OMEGA | Francky (anti-doublon) | ✅ |
| D10 | Le scoring legacy V3 reste INTACT et parallèle | Tous | ✅ |

## Points NON encore tranchés (pour la prochaine session)

| # | Point ouvert | Options |
|---|-------------|---------|
| P1 | "Contemplation" et "Lyrique" sont-ils des types à part ou des sous-types ? | ChatGPT dit "à trancher" |
| P2 | Combien de passages pour le test d'amélioration ? | Gemini dit 5×5=25, ChatGPT dit 3×3=9 |
| P3 | Le "+20 points" est-il réaliste ? | ChatGPT dit "hypothèse, pas prouvé". Gemini dit "mathématiquement certain" |
| P4 | La matrice de confusion sémantique (ChatGPT) est-elle V1 ou V2 ? | À trancher |

---

# PARTIE 4 — PLAN D'EXÉCUTION RÉVISÉ

## IMMÉDIAT (ce soir) — Chemin A

1. Désactiver type_modifiers dans le scorer
2. Commiter
3. Lancer bench API 49/49 propre (baseline sans bruit)
4. Archiver les résultats

## PROCHAINE SESSION — Chemin B : Opération Rosetta

1. Reverse engineering LLM (Question Sets A+B+C)
2. Mesure des 49 features sur les 7 productions
3. Comparaison LLM vs Classiques R2
4. Table de Rosette + dictionnaire OMEGA ↔ LLM
5. Test d'amélioration sur passages classiques

## SESSION SUIVANTE — Implémentation PROFILEUR

1. Créer le PROFILEUR (Juge 0) avec sortie probabiliste
2. Brancher sur archetype + style_genome existants (symbiose)
3. Templates par composition (top-2 en V1)
4. Mesure de désalignement (warning, pas blocage)
5. Bench avec PROFILEUR actif

---

# QUESTIONS FINALES POUR CHATGPT ET GEMINI

Q1 : L'audit du code source montre que OMEGA a déjà deriveArchetype(),
     style_genome, et emotion_coherence. Le plan de symbiose (Partie 2)
     est-il suffisant pour éviter les doublons, ou manque-t-il quelque chose ?

Q2 : ChatGPT a proposé de séparer "type de passage", "profil esthétique",
     et "intention de commande" comme 3 couches distinctes. Le ForgePacket
     contient déjà l'intention (intent + style_genome). Le PROFILEUR
     analyse le type produit. Où se situe le "profil esthétique" ?
     Est-ce les 6 profils R4 (STRATOSPHERIQUE, THRILLER, etc.) ?

Q3 : Francky dit "on peut même prendre un passage d'un auteur très connu
     et voir comment l'améliorer en poussant certaines features".
     Le style_genome d'OMEGA a déjà des CIBLES (avg_sentence_length_target,
     gini_target, density_target). Le PROFILEUR devrait-il calculer l'écart
     entre ces cibles et les features mesurées pour guider l'amélioration ?

Q4 : Le Damage Gate utilise les archétypes pour moduler la micro-chirurgie.
     Le PROFILEUR utilisera la composition pour moduler le scoring.
     Ces deux systèmes doivent-ils partager un MÊME archétype/composition,
     ou peuvent-ils avoir des visions indépendantes ?

---

*Synthèse finale intégrée — 2026-03-19*
*Standard NASA-Grade L4 / DO-178C Level A*
*Convergence : Claude + ChatGPT + Gemini + Francky (Architecte Suprême)*
*"Ne faisons pas disparaître le moteur émotionnel" — Francky*
