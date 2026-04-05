# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT — PHASE P-ASSAULT
# INJECTION DES 3 RÈGLES VALIDÉES DANS LE SCRIBE
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date         : 2026-03-23
# Branche      : phase-r-metrology-rebuild
# HEAD entrant : c2951710
# Standard     : NASA-Grade L4
# Autorité     : Francky (Architecte Suprême)
#
# ═══════════════════════════════════════════════════════════════════════════════
# CONTEXTE CRITIQUE — POURQUOI ÇA VA MARCHER
#
# Le bench API actuel (44dcd7dd) montre :
#   - GB V1 médiane = 3.80 (A-tier, plafond)
#   - f26b_long_sent_rate = 0 sur TOUTES les 8 scènes
#   - f26b est le feature #1 du GB (importance = 0.290)
#   - Le Scribe écrit 100% de phrases 15-25 mots — rythme PLAT
#
# Après la Phase R complète (571 romans, certification FR+EN) :
#   - Rythme CV = +0.225 FR, +0.305 EN (UNIVERSEL, zéro drop)
#   - Contradiction = +0.097 FR (FR-spécifique)
#   - Violence/Propulsion = +0.17 FR, +0.24 EN (UNIVERSEL)
#
# Le problème n'est PAS que le prompt ne parle pas de rythme.
# Law 5 du prompt actuel PARLE de rythme magnifiquement.
# Le problème est que le LLM COMPREND mais N'EXÉCUTE PAS.
# Il faut des CONTRAINTES MÉCANIQUES, pas des descriptions poétiques.
# ═══════════════════════════════════════════════════════════════════════════════

# RÈGLES
R-01 : NE PAS réécrire le prompt entier. Modifier CHIRURGICALEMENT.
R-02 : Conserver TOUT ce qui fonctionne (show don't tell, sensory, subtext).
R-03 : AJOUTER les 3 contraintes mécaniques validées par la Phase R.
R-04 : 1911 tests doivent PASS.
R-05 : Lancer un bench API AVANT et APRÈS pour mesurer le delta.

# ═══════════════════════════════════════════════════════════════════════════════
# CE QUI NE VA PAS DANS LE PROMPT ACTUEL
# ═══════════════════════════════════════════════════════════════════════════════

## Problème 1 — Le rythme est DÉCRIT, pas IMPOSÉ

Le prompt actuel (Law 5) dit :
  "Short sentences hit. They wound."
  "Longer sentences carry the reader forward..."
  "Master this rhythm."

C'est BEAU mais le LLM ne le FAIT PAS. Résultat :
  f26b_long_sent_rate = 0 sur 8/8 scènes
  → Pas une seule phrase de 40+ mots
  → Le feature #1 du GB (importance 0.29) est à zéro

## Problème 2 — La contradiction est ABSENTE

Le prompt ne mentionne JAMAIS la dialectique, les adversatifs,
la contradiction interne. Or c'est le 2ème survivant de la Phase R.
Le Scribe écrit de façon LINÉAIRE : A → B → C.
Le maître écrit : A → mais B → cependant C.

## Problème 3 — La propulsion est trop uniforme

Le prompt encourage les phrases courtes violentes mais ne les SITUE pas.
Le Scribe fait des phrases courtes AU MILIEU des paragraphes.
Le maître les place aux POINTS D'IMPACT : fin de paragraphe, après une
longue phrase contemplative, au moment du changement irréversible.

# ═══════════════════════════════════════════════════════════════════════════════
# LES 3 MODIFICATIONS À FAIRE
# ═══════════════════════════════════════════════════════════════════════════════

## MODIFICATION 1 — Remplacer Law 5 (Rhythm is Architecture)

L'ancienne Law 5 est poétique mais inefficace.
La remplacer par des CONTRAINTES MÉCANIQUES QUANTIFIÉES.

### Nouveau texte pour Law 5 :

```
5. RHYTHM IS PHYSICS — QUANTIFIED CONSTRAINTS

   THE SINGLE MOST IMPORTANT LAW. This alone separates literature from text.

   MANDATORY MECHANICAL RULES (not guidelines — RULES):

   A. LONG SENTENCES (40+ words): At least 20% of your sentences must exceed 
      40 words. These are the architectural arches — subordinated, layered, 
      carrying the reader through currents of thought and sensation. They allow 
      complexity, nuance, contradiction. WITHOUT THEM, YOUR PROSE IS FLAT.

   B. SHORT SENTENCES (under 8 words): At least 15% of your sentences must be 
      under 8 words. These are the blows. The irreversible moments. The silence 
      after the explosion.

   C. VARIATION (CV > 0.65): The standard deviation of your sentence lengths 
      divided by their mean MUST exceed 0.65. If your sentences are all 
      15-25 words, you have FAILED. The rhythm must breathe — slow arches 
      alternating with sharp strikes.

   D. PLACEMENT: Short sentences go at IMPACT POINTS:
      - End of paragraphs (the last word lingers)
      - After a 40+ word sentence (the contrast creates vertigo)
      - At moments of irreversible change (the blow that cannot be undone)

   E. NEVER: Three consecutive sentences of similar length (within 5 words 
      of each other). This creates the mechanical drone that readers feel 
      as boredom.

   EXAMPLE (correct rhythm):
   "La pluie tombait sur le zinc du comptoir avec cette régularité de 
   métronome que seuls les après-midi d'automne dans les cafés du bord 
   de mer savent produire, goutte après goutte, comme un décompte vers 
   quelque chose que personne n'attendait plus." [43 mots — arche]
   
   "Personne ne leva les yeux." [5 mots — frappe]
   
   "Le patron essuya un verre déjà propre, le reposa à sa place exacte 
   sur l'étagère, puis en prit un autre, identique, qu'il entreprit 
   d'essuyer avec le même geste circulaire, comme si la répétition du 
   mouvement pouvait conjurer ce qui venait de se dire." [47 mots — arche]
   
   "La porte resta ouverte." [4 mots — frappe irréversible]
```

## MODIFICATION 2 — Ajouter Law 8 (Dialectique — FR uniquement)

### Nouveau texte à ajouter APRÈS les lois existantes :

```
8. DIALECTICAL THINKING — THE FRENCH TRADITION (FR prose only)

   Great French prose thinks against itself. Every assertion contains 
   the seed of its own contradiction.

   MANDATORY: Each paragraph of 3+ sentences must contain at least ONE 
   adversative turn — a moment where the text reverses, nuances, or 
   complicates what it just established.

   ADVERSATIVES TO USE: mais, cependant, pourtant, néanmoins, toutefois, 
   or, en revanche, bien que, quoique, malgré.

   HOW IT WORKS:
   "Il marchait vite, le col relevé contre le vent qui charriait 
   une odeur de sel et de mazout. Cependant, chaque pas le 
   rapprochait moins du port qu'il ne l'éloignait de la certitude 
   qui l'avait fait partir."

   The first sentence establishes direction. The adversative DESTROYS 
   the certainty of that direction. The reader's brain must rebuild 
   understanding. THIS is what separates Flaubert from a chatbot.

   WARNING: Do NOT use adversatives as decoration. Each one must create 
   a genuine reversal of meaning, perspective, or emotional direction.
```

## MODIFICATION 3 — Ajouter Law 9 (Propulsion Irréversible)

### Nouveau texte à ajouter :

```
9. IRREVERSIBLE IMPACT — THE SHORT SENTENCE THAT CHANGES EVERYTHING

   When a short sentence appears (under 8 words), it must CHANGE 
   something permanently. Not describe. Not observe. CHANGE.

   GOOD (irreversible):
   × "Le verre se brisa." → the glass is now broken forever
   × "Elle ne revint pas." → the absence is permanent  
   × "Il mentit." → trust is now destroyed
   × "Le sang sécha." → violence has been committed

   BAD (decorative):
   × "Il faisait froid." → describes, changes nothing
   × "Le silence régnait." → atmosphere, not action
   × "Elle sourit." → reaction, not transformation

   Each short sentence is a bullet. Bullets change what they hit.
   If your short sentence could be removed without changing the story, 
   it is not a bullet. It is noise. Delete it.
```

# ═══════════════════════════════════════════════════════════════════════════════
# MODIFICATION DU buildMasterScenePrompt
# ═══════════════════════════════════════════════════════════════════════════════

## Ajouter un paramètre de langue

```typescript
// Dans l'interface params, ajouter :
language: 'fr' | 'en';
```

## Dans le Style Genome section, ajouter :

```typescript
// Après "Sentence rhythm: avg X words, burstiness Y"
lines.push(`MANDATORY RHYTHM: CV > 0.65 — at least 20% sentences > 40 words, 15% < 8 words`);
if (p.language === 'fr') {
  lines.push(`DIALECTIQUE: Each paragraph (3+ sentences) must contain ≥1 adversative (mais/cependant/pourtant)`);
}
lines.push(`IMPACT: Short sentences (<8 words) must be IRREVERSIBLE — they change the world, not describe it`);
```

# ═══════════════════════════════════════════════════════════════════════════════
# BENCH COMPARATIF — AVANT / APRÈS
# ═══════════════════════════════════════════════════════════════════════════════

## Étape 1 — Bench AVANT (baseline)

Le bench actuel (44dcd7dd) existe déjà. Ses résultats :
  Médiane GB : 3.80
  f26b_long_sent_rate : 0 sur 8/8 scènes
  Distribution : 6A / 2B

## Étape 2 — Appliquer les modifications au master-prompt.ts

Modifier le fichier selon les 3 modifications ci-dessus.
Le fichier est dans : packages/sovereign-engine/src/providers/master-prompt.ts
(ou l'emplacement réel — chercher avec find)

## Étape 3 — Bench APRÈS (avec les nouvelles lois)

Lancer le bench API sur les MÊMES 8 scènes avec le prompt modifié.
Utiliser le même modèle (claude-sonnet-4-20250514), même température (0.75).

```bash
npx tsx scripts/run-benchmark-dual.ts --api
```

## Étape 4 — Comparer

```
═══════════════════════════════════════════════════════════════════
PHASE P — COMPARAISON AVANT / APRÈS
═══════════════════════════════════════════════════════════════════
                    AVANT (44dcd7dd)    APRÈS (Phase P)    DELTA
GB V1 médiane       3.80               ???                ???
f26b_long_sent_rate 0.000              ???                ???
rhythm_cv           ???                ???                ???
contradiction_rate  ???                ???                ???
Nb scènes S-tier    0                  ???                ???
Nb scènes A-tier    6                  ???                ???
═══════════════════════════════════════════════════════════════════
```

## Étape 5 — Diagnostic R-COMP par scène

Pour chaque scène APRÈS :
  - Calculer les 42 features GB
  - Calculer le profil R-COMP (% par type)
  - Calculer les mesures R-MEASURE (rythme CV, contradiction, violence)
  - Identifier les features qui ont BOUGÉ vs le bench AVANT

## Étape 6 — Si le GB ne monte PAS

Analyser POURQUOI :
  a) Le Scribe a-t-il obéi aux contraintes mécaniques ?
     - A-t-il produit des phrases de 40+ mots ? (compter)
     - A-t-il produit des phrases de < 8 mots ? (compter)
     - Le CV est-il > 0.65 ?
     - Y a-t-il des adversatifs ?
  
  b) Si les contraintes sont respectées mais le GB ne monte pas :
     - Le GB V1 a peut-être atteint son plafond structurel
     - Les features non-rythmiques (ironie, POV shift) dominent le delta
     - Documenter honnêtement

  c) Si les contraintes ne sont PAS respectées :
     - Le prompt n'est pas assez fort → renforcer les contraintes
     - Le LLM ignore les instructions quantifiées → ajouter des exemples
     - Réitérer avec un prompt plus contraignant

# ═══════════════════════════════════════════════════════════════════════════════
# LIVRABLES
# ═══════════════════════════════════════════════════════════════════════════════

| Fichier | Contenu |
|---------|---------|
| src/providers/master-prompt.ts | MODIFIÉ avec les 3 nouvelles lois |
| sessions/PhaseP_bench_BEFORE/ | Bench baseline (copie du 44dcd7dd) |
| sessions/PhaseP_bench_AFTER/ | Bench avec les nouvelles lois |
| docs/PHASE_P_COMPARISON.md | Tableau comparatif + diagnostic |

## Commit

```bash
git add -A
git commit -m "feat(Phase-P): inject 3 validated rules into master-prompt

Law 5 REPLACED: rhythm quantified — 20% sentences >40w, 15% <8w, CV>0.65
Law 8 ADDED: dialectical contradiction (FR) — adversatives mandatory
Law 9 ADDED: irreversible impact — short sentences must change the world

BENCH COMPARISON:
  BEFORE: GB median 3.80, f26b=0, rhythm_cv=X
  AFTER:  GB median ???, f26b=???, rhythm_cv=???
  DELTA:  ???

1911 tests PASS"
git tag phase-p-assault-v1
```

# ═══════════════════════════════════════════════════════════════════════════════
# CRITÈRES DE SORTIE (TOUS OBLIGATOIRES)
# ═══════════════════════════════════════════════════════════════════════════════

- [ ] master-prompt.ts modifié avec les 3 lois
- [ ] Law 5 remplacée par contraintes QUANTIFIÉES
- [ ] Law 8 ajoutée (dialectique FR)
- [ ] Law 9 ajoutée (propulsion irréversible)
- [ ] buildMasterScenePrompt modifié (rhythm mandatory line + dialectique si FR)
- [ ] Bench API lancé avec le nouveau prompt
- [ ] Tableau comparatif AVANT/APRÈS avec deltas
- [ ] f26b_long_sent_rate mesuré par scène APRÈS
- [ ] rhythm_cv mesuré par scène APRÈS
- [ ] contradiction_rate mesuré par scène APRÈS
- [ ] Diagnostic par scène (features qui bougent)
- [ ] Si GB ne monte pas → analyse documentée
- [ ] 1911 tests PASS
- [ ] Commit + tag

# ═══════════════════════════════════════════════════════════════════════════════
# POURQUOI ÇA VA MARCHER CETTE FOIS
# ═══════════════════════════════════════════════════════════════════════════════
#
# 1. Le problème est IDENTIFIÉ : f26b_long_sent_rate = 0 est le feature #1
#    du GB (importance 0.29) et le Scribe le zero sur 8/8 scènes
#
# 2. La solution est VALIDÉE : le rythme CV est le seul candidat universel
#    fort, confirmé par 571 romans, certification EN, et audit de traduction
#
# 3. Les contraintes sont MÉCANIQUES, pas poétiques : "20% > 40 mots" est
#    vérifiable. "Master this rhythm" ne l'est pas.
#
# 4. Le bench comparatif mesure EXACTEMENT le delta : mêmes scènes,
#    même modèle, même température, prompt différent
#
# 5. Si ça ne marche pas, on saura POURQUOI : le Scribe a-t-il obéi ?
#    Les features ont-elles bougé ? Le GB est-il plafonné ?
#
# On ne brûle pas 10 heures d'API dans le vent parce que :
# - Le problème est chirurgical (f26b = 0)
# - La solution est validée (rythme CV universel)
# - La mesure est automatique (bench comparatif)
# - Le diagnostic est immédiat (features + R-COMP)
#
# ═══════════════════════════════════════════════════════════════════════════════
