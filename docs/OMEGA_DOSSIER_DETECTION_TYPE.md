# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — DOSSIER DE CONSULTATION : PROBLÈME DE RECONNAISSANCE DES TYPES DE PASSAGE
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date    : 2026-03-19
# Auteur  : Claude (IA Principal) — auto-audit
# Pour    : ChatGPT + Gemini + Francky
# Statut  : PROBLÈME OUVERT — décision requise avant bench final
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# EXPLICATION SIMPLE (pour Francky)

## Le problème en une phrase

Le système OMEGA doit reconnaître automatiquement le TYPE de texte qu'il analyse
(description, dialogue, action, introspection, transition) pour adapter sa notation.
Mais en pratique, **il classe presque tout comme ACTION**, même quand c'est de la
contemplation ou un monologue intérieur.

## Pourquoi c'est important

Imagine un prof de sport et un prof de français qui notent la même copie.
Le prof de sport va chercher du rythme, de la tension, de l'efficacité.
Le prof de français va chercher de la profondeur, du style, de l'émotion.

Si le système croit que TOUT est de l'action, il applique les critères du
"prof de sport" à tous les textes. Un monologue de Woolf sera noté sur sa
vitesse au lieu de sa profondeur psychologique. Résultat : mauvaise note
pour un texte qui est en réalité excellent.

## Ce qu'on a observé

Sur les 8 scènes du bench (vraie prose générée par le moteur OMEGA) :
- Confrontation → classée **DIALOGUE** (correct, il y a des guillemets)
- **Les 7 autres → classées ACTION** (faux pour Élégie, Contemplation, Lyrique, Monologue)

Le détecteur voit des verbes d'action (densité > 0.06) et des phrases courtes
(< 12 mots) partout → il dit "ACTION". Mais la prose OMEGA génère naturellement
des phrases variées avec un mix de description et d'action, même dans un monologue.

## Les 3 options possibles

**Option A** : Rendre le détecteur plus fin (meilleurs seuils, plus de critères)
**Option B** : Laisser l'archétype du bench dicter le type (BRUTAL=ACTION, INTERIOR=INTROSPECTION)
**Option C** : Supprimer les type_modifiers pour l'instant (impact prouvé mineur par l'ablation)

---

# EXPLICATION TECHNIQUE (pour ChatGPT + Gemini)

## 1. Architecture actuelle du détecteur

Fichier : `passage-type-detector.ts`

Logique en cascade (priorité décroissante) :
```
1. DIALOGUE si f34b > 5.0 ET f33a > 50 ET dialogue_markers > 40%
2. INTROSPECTION si f28d > 0.08 ET f27d > 0.45
3. ACTION si f5a > 0.06 ET f38c > 0.28 ET f1_mean < 12
4. TRANSITION si f12b > 0.12 (et pas d'autre signal fort)
5. DESCRIPTION par défaut
```

## 2. Données du bench API (prose OMEGA réelle)

Les features mesurées sur les 8 scènes générées par le moteur :

| Scène | f5a verb | f38c speed | f1_mean | f28d SIL | f27d modal | Type détecté |
|-------|----------|------------|---------|----------|------------|-------------|
| Confrontation | >0.06 | >0.28 | <12 | <0.08 | <0.45 | **DIALOGUE** (markers 35%) |
| Élégie | >0.06 | >0.28 | <12 | <0.08 | <0.45 | **ACTION** (faux) |
| Panique | >0.06 | >0.28 | <12 | <0.08 | <0.45 | ACTION (discutable) |
| Contemplation | >0.06 | >0.28 | <12 | <0.08 | <0.45 | **ACTION** (faux) |
| Dialogue tendu | >0.06 | >0.28 | <12 | <0.08 | <0.45 | **ACTION** (faux) |
| Description lyrique | >0.06 | >0.28 | <12 | <0.08 | <0.45 | **ACTION** (faux) |
| Action pure | >0.06 | >0.28 | <12 | <0.08 | <0.45 | ACTION (correct) |
| Monologue | >0.06 | >0.28 | <12 | <0.08 | <0.45 | **ACTION** (faux) |

## 3. Pourquoi tout tombe en ACTION

La prose OMEGA a un profil de features UNIFORMÉMENT "action-like" :
- **f5a_verb_density toujours > 0.06** : le moteur génère de la prose active, pas de la prose passive
- **f38c_speed_score toujours > 0.28** : le formatage avec paragraphes courts crée une "vitesse" artificielle
- **f1_mean toujours < 12** : les phrases générées sont relativement courtes (caractéristique du LLM)

Les seuils INTROSPECTION (f28d > 0.08 ET f27d > 0.45) ne sont JAMAIS atteints
car la prose OMEGA n'a pas assez de style indirect libre ni de modalité épistémique
mesurables par nos features. Le SIL (f28d) a une confiance de 0.0 @600 mots — c'est
du bruit. Le modal (f27d) a confiance 0.38 — faible.

## 4. Le problème fondamental

Les seuils du détecteur sont calibrés sur les **extraits littéraires Gutenberg**
(181 œuvres, 3 siècles de littérature). La prose OMEGA générée par Claude Sonnet
a un profil stylistique DIFFÉRENT des classiques littéraires :

| Caractéristique | Classiques littéraires | Prose OMEGA |
|----------------|----------------------|-------------|
| Longueur phrase moyenne | 15-25 mots | 8-14 mots |
| Densité verbale | 0.03-0.08 (variable) | 0.06-0.10 (uniformément haute) |
| Style indirect libre | 0-0.15 (variable) | ~0 (le LLM ne produit pas de SIL naturellement) |
| Paragraphes | Longs (3-8 phrases) | Courts (1-3 phrases) |
| Vitesse typographique | Variable | Uniformément rapide |

Le LLM produit de la prose qui est INTRINSÈQUEMENT plus "action-like" que les
classiques, même quand le prompt demande de la contemplation.

## 5. Impact sur le scoring

L'ablation (Tâche 4 de l'audit) a montré que les type_modifiers ont un impact MINEUR :
- Avec type_modifiers : médiane 45.98
- Sans type_modifiers : médiane 46.04 (quasi-identique)

Cela signifie que MÊME si le détecteur était parfait, l'impact sur les scores
serait faible. Les type_modifiers ajustent les poids de ±10-20%, mais les
features les plus lourdes (f24e contraste, f29b TTR) ne sont pas très sensibles
au type de passage.

## 6. Les 3 options de solution

### Option A : Affiner le détecteur (seuils + critères supplémentaires)

Recalibrer les seuils sur la prose OMEGA, pas sur les classiques.
Ajouter des critères comme :
- INTROSPECTION : f27d > 0.30 (au lieu de 0.45) OU présence de verbes cognitifs
- DESCRIPTION : f25g > 0.55 ET f1_mean > 14
- Utiliser un score de confiance du type (pas binaire)

**Avantage** : le détecteur serait correct sur la prose OMEGA
**Risque** : overfitting sur le style du LLM actuel, pas généralisable

### Option B : Mapper archétype → type (fallback par le bench)

Quand le bench connaît l'archétype (BRUTAL, INTERIOR, SENSORY, CATHEDRAL, BALANCED),
utiliser une table de correspondance :
```
BRUTAL → ACTION
INTERIOR → INTROSPECTION
SENSORY → DESCRIPTION
CATHEDRAL → DESCRIPTION
BALANCED → DESCRIPTION
```

**Avantage** : correct par construction pour le bench
**Risque** : ne fonctionne QUE dans le bench (pas en production où l'archétype n'est pas connu)

### Option C : Désactiver les type_modifiers (ablation prouvée mineure)

L'ablation a montré un impact de +0.06 pts quand on retire les type_modifiers.
On peut les désactiver proprement et les réactiver quand le détecteur sera fiable.

**Avantage** : simple, propre, pas de bruit
**Risque** : on perd un axe de différenciation (mineur selon l'ablation)

### Option D (NOUVELLE) : Score de confiance du type

Au lieu de retourner UN type, retourner un vecteur de probabilités :
```
{ DESCRIPTION: 0.35, ACTION: 0.30, INTROSPECTION: 0.20, DIALOGUE: 0.10, TRANSITION: 0.05 }
```

Appliquer les type_modifiers PROPORTIONNELLEMENT aux probabilités.
Si le détecteur hésite entre ACTION et DESCRIPTION, les deux jeux de modifiers
s'appliquent en proportion.

**Avantage** : élimine la décision binaire, le scoring est plus nuancé
**Risque** : plus complexe à implémenter

## 7. Questions pour la consultation

Q1 : Quelle option (A, B, C, D) est la meilleure pour le bench immédiat ?
Q2 : Quelle option est la meilleure pour la production future ?
Q3 : Le fait que le LLM produise une prose uniformément "action-like" est-il
     un problème du détecteur ou un problème du moteur de génération ?
Q4 : Faut-il recalibrer les baselines du détecteur sur la prose OMEGA
     (risque d'overfitting) ou garder les baselines Gutenberg (référence littéraire) ?

---

*Dossier produit le 2026-03-19 — Standard NASA-Grade L4 / DO-178C Level A*
*Données : bench API dual-scoring 8 scènes, 49/49 features, prose OMEGA réelle*
