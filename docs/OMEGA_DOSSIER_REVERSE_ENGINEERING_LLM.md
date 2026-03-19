# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — DOSSIER DE CONSULTATION : REVERSE ENGINEERING LLM
# Comprendre comment le LLM écrit avant de lui ordonner comment écrire
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date     : 2026-03-19
# Auteur   : Claude (IA Principal) + directive Francky
# Pour     : ChatGPT + Gemini + Francky
# Statut   : PROPOSITION — décision requise
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# EXPLICATION SIMPLE (pour Francky)

## Le constat de Francky

"On tente de lui ordonner mais pas de le comprendre, et l'erreur vient de là."

Aujourd'hui, le pipeline OMEGA fonctionne comme un chef cuisinier qui crie
des ordres à un apprenti étranger :
- "Fais-moi de la contemplation !" → l'apprenti fait ce qu'il comprend
- On goûte → "C'est pas ça !" → on crie plus fort → même résultat

Le problème n'est pas que l'apprenti est mauvais. C'est qu'on ne parle pas
le même langage. Le mot "contemplation" veut dire quelque chose de précis
pour nous (phrases longues, intériorité, rythme lent) et autre chose pour
le LLM (observation visuelle, phrases courtes, verbes de perception).

## L'expérience proposée

**Phase 1 : Interroger le LLM**

On lui demande directement :
- "Comment décrirais-tu un passage contemplatif en littérature ?"
- "Quels sont les marqueurs stylistiques d'une scène d'action ?"
- "Comment distingues-tu introspection et description ?"
- "Écris-moi 300 mots de pure contemplation, sans aucune action"
- "Écris-moi 300 mots de pure action, sans aucune description"
- Etc. pour les 5 types

**Phase 2 : Mesurer sa production**

On passe chaque texte produit dans nos 49 capteurs. On obtient le PROFIL
de features de chaque type TEL QUE LE LLM LE PRODUIT.

**Phase 3 : Comparer avec les classiques**

On compare ces profils avec les profils des mêmes types chez Flaubert,
Woolf, McCarthy, Proust (données R2 déjà disponibles).

**Phase 4 : Construire la table de correspondance**

On sait maintenant :
- "Quand le LLM fait de la contemplation, ses features ressemblent à X"
- "Quand Woolf fait de la contemplation, ses features ressemblent à Y"
- "L'écart entre X et Y est Z"

Cet écart Z est la CLÉ. Il permet de :
1. Calibrer le détecteur pour reconnaître la contemplation LLM
2. Comprendre ce qu'il faut demander au LLM pour qu'il se rapproche de Y
3. Ajuster les coefficients de mesure en conséquence

## La métaphore finale de Francky

"Comprendre ensuite adapter et étalonner plus justement"

C'est exactement l'approche scientifique :
1. Observer (reverse engineering)
2. Comprendre (comparer avec la référence)
3. Adapter (calibrer les instruments)
4. Vérifier (bench avec les nouveaux réglages)

---

# PROTOCOLE TECHNIQUE (pour ChatGPT + Gemini)

## 1. DESIGN DE L'EXPÉRIENCE

### 1.1 — Interrogation sémantique du LLM

Poser au LLM (Claude Sonnet, même modèle que le Scribe OMEGA) ces questions :

```
QUESTION SET A — Définitions
Pour chaque style littéraire ci-dessous, explique en 3-5 phrases
comment tu le conçois et quels marqueurs stylistiques tu utiliserais
pour le produire :
1. DESCRIPTION (purement sensorielle, immersive)
2. DIALOGUE (échange entre personnages)
3. ACTION (scène de tension, mouvement, urgence)
4. INTROSPECTION (monologue intérieur, pensée du personnage)
5. TRANSITION (passage entre deux scènes, changement de temps/lieu)
6. CONTEMPLATION (observation lente, réflexion philosophique)
7. LYRIQUE (prose poétique, musicalité, rythme)
```

```
QUESTION SET B — Production contrôlée
Pour chaque style ci-dessous, écris EXACTEMENT 300 mots de prose
littéraire en français. Un seul style par texte, pur, sans mélange.
Contexte : un chantier naval au crépuscule, un personnage seul.

1. DESCRIPTION pure (ce qu'il voit, entend, sent — aucune pensée)
2. ACTION pure (mouvement, urgence, gestes — aucune introspection)
3. INTROSPECTION pure (pensées, doutes, souvenirs — aucune action)
4. CONTEMPLATION pure (observation lente, réflexion — aucune urgence)
5. LYRIQUE pure (prose poétique, rythme — aucun souci de l'intrigue)
6. DIALOGUE pur (échange entre 2 personnages — minimum de narration)
7. TRANSITION pure (passage d'un lieu/temps à un autre)
```

### 1.2 — Mesure des 49 features sur chaque production

Pour chaque texte de 300 mots produit (7 textes) :
- Calculer les 49 features via text-features.ts + spacy-bridge
- Enregistrer le profil complet

### 1.3 — Comparaison avec les profils corpus R2

Les données R2 (OMEGA_PASSAGE_TYPES.json) contiennent les profils moyens
par type de passage sur les 181 classiques littéraires.

Pour chaque type × chaque feature :
```
ratio_LLM_vs_classique = μ(feature, type, LLM) / μ(feature, type, classique)
```

Si ratio = 1.0 : le LLM produit comme les classiques
Si ratio = 0.5 : le LLM est 2× plus bas que les classiques sur cette feature
Si ratio = 2.0 : le LLM est 2× plus haut

### 1.4 — Bonus : interrogation croisée des langages

Francky propose : "lui dire comment désigne-tu ce style que nous appelons
contemplation, pour comprendre la corrélation de nos langages"

```
QUESTION SET C — Corrélation de langages
Voici les features mesurées sur un passage que nous classons CONTEMPLATION
dans notre corpus littéraire. Dis-nous si tu reconnais ce profil :
- f1_mean (longueur phrase) : 18.5 mots
- f5a_verb_density : 0.04
- f25g_description_score : 0.72
- f28d_sil_score : 0.12
- f38c_speed_score : 0.15

Est-ce que ce profil correspond à ce que tu appelles "contemplation" ?
Si non, comment appellerais-tu ce type de prose ?
Et à quoi ressemblerait TON profil de contemplation ?
```

## 2. OUTPUT ATTENDU

### 2.1 — Table de Rosette LLM ↔ Classiques

```json
{
  "DESCRIPTION": {
    "llm_profile": {"f1_mean": 11.2, "f5a": 0.08, "f25g": 0.55, ...},
    "classic_profile": {"f1_mean": 18.5, "f5a": 0.04, "f25g": 0.72, ...},
    "ratio": {"f1_mean": 0.61, "f5a": 2.00, "f25g": 0.76, ...},
    "interpretation": "Le LLM écrit des descriptions plus courtes et plus actives"
  },
  "INTROSPECTION": {
    "llm_profile": {"f1_mean": 10.8, "f28d": 0.02, "f27d": 0.25, ...},
    "classic_profile": {"f1_mean": 19.2, "f28d": 0.12, "f27d": 0.55, ...},
    "ratio": {"f1_mean": 0.56, "f28d": 0.17, "f27d": 0.45, ...},
    "interpretation": "Le LLM ne produit quasi pas de SIL — son introspection est directe"
  }
}
```

### 2.2 — Diagnostic par type

Pour chaque type, identifier :
- Les features où le LLM DIVERGE le plus des classiques (ratio < 0.50 ou > 2.0)
- Les features où le LLM est ALIGNÉ (ratio 0.80-1.20)
- Les implications pour le détecteur et le scoring

### 2.3 — Recommandations

- Quels seuils du détecteur ajuster (avec les ratios comme facteurs d'échelle)
- Quels prompts modifier pour rapprocher le LLM des classiques
- Quels coefficients de scoring adapter par type

## 3. QUESTIONS POUR LA CONSULTATION

Q1 : Ce protocole de reverse engineering est-il suffisant pour comprendre
     l'interrelation LLM ↔ Classiques, ou faut-il des tests supplémentaires ?

Q2 : Faut-il faire l'expérience avec UN SEUL LLM (Claude Sonnet, le Scribe)
     ou avec PLUSIEURS (Claude + GPT-4 + Gemini) pour voir si le biais est
     spécifique à Claude ou universel aux LLMs ?

Q3 : Les ratios LLM/Classiques devraient-ils devenir des CONSTANTES du système
     (facteurs d'échelle permanents) ou des PARAMÈTRES ajustables par modèle ?

Q4 : Est-ce que comprendre comment le LLM écrit pourrait aussi améliorer
     les PROMPTS de génération (pas seulement la mesure) ? Si le LLM ne sait
     pas produire du SIL naturellement, faut-il lui enseigner via des exemples
     dans le prompt ?

---

# PLAN D'EXÉCUTION

| Étape | Action | Outil | Durée estimée |
|-------|--------|-------|---------------|
| 1 | Interroger le LLM (Question Sets A+B+C) | API Anthropic | 5 min |
| 2 | Mesurer les 49 features sur les 7 textes | text-features.ts + spaCy | 10 min |
| 3 | Charger les profils R2 classiques | OMEGA_PASSAGE_TYPES.json | 1 min |
| 4 | Calculer les ratios LLM/Classiques | Script Python/TS | 5 min |
| 5 | Produire la Table de Rosette | JSON + rapport | 10 min |
| 6 | Diagnostic + recommandations | Analyse | 15 min |

**Total : ~45 minutes pour un changement de paradigme.**

---

*Dossier produit le 2026-03-19 — Standard NASA-Grade L4 / DO-178C Level A*
*Directive : Francky (Architecte Suprême)*
*"Comprendre ensuite adapter et étalonner plus justement"*
