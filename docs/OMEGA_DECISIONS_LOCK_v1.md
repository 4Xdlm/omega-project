# OMEGA — DECISIONS LOCK v1
**Date** : 2026-03-28
**Statut** : SCELLE
**Autorite** : Francky (Architecte) + Claude Code (IA Principal)
**Source** : Audit Black-Box Phase A+B (95 API runs + consolidation Rosetta/Angostura)
**Standard** : NASA-Grade L4 / DO-178C Level A

---

## DEC-20260328-BB-01 — SEMICOLONS IRREDUCTIBLES PAR PROMPT

**Enonce** : Le point-virgule est NON PILOTABLE par instruction au Scribe. Toute tentative d'injection par prompt est vouee a l'echec (taux observe : 13%, n=15 runs, 5 niveaux de consigne).

**Evidence** :
- Gradient semicolons Phase B : 11/15 runs = 0 semicolons
- Consigne maximale ("REGLE ABSOLUE PRIORITAIRE minimum 8 ;, style Proust") : 0 semicolons produits
- Angostura : semicolon_count = marqueur #1 de qualite (importance permutation 0.42 sur 141K fenetres)
- Baseline : 0.17 semicolons/texte en moyenne (n=30)

**Decision** : La voie PROMPT est fermee pour les semicolons. Seul le POST-PROCESSING (injection apres generation) est autorise comme strategie.

**Portee** : S'applique a claude-sonnet-4-20250514. A re-tester si le modele change.

---

## DEC-20260328-BB-02 — PLANCHER MEAN_SENT=35w IRREDUCTIBLE

**Enonce** : Claude Sonnet ne produit pas de prose avec une moyenne de phrase inferieure a ~35 mots, quel que soit le prompt. Le plancher est structurel.

**Evidence** :
- Gradient sentlen Phase B (n=15, 5 targets) :
  - Target 12w -> produit 35.8w (facteur x3.0)
  - Target 18w -> produit 34.8w (facteur x1.9)
  - Target 25w -> produit 38.1w (facteur x1.5)
  - Target 35w -> produit 42.2w (facteur x1.2)
  - Target 50w -> produit 39.4w (facteur x0.8)
- Baseline 30 runs : mean_sent_len = 42.0 +/- 13.0, minimum observe = 23.6 (outlier)
- Zone de reponse effective : 35-42 mots/phrase

**Decision** : Retirer toutes les cibles mean_sent_len < 35w des prompts Scribe. Toute consigne "phrases courtes" ou "style sec" est reinterpretee par le modele et n'atteint pas la cible. Les cibles dans la zone 35-42 sont les seules respectees.

**Impact** : Le parametre `avg_sentence_length_target` dans `style_genome.rhythm` ne doit jamais etre inferieur a 35. La valeur actuelle (18) est ignoree par le modele.

---

## DEC-20260328-BB-03 — CONFLITS AMELIORANTS — TESTER DANS V-ATOMIC

**Enonce** : Les instructions contradictoires (conflits de style) AMELIORENT le composite dans 4/5 cas testes (+1.8 a +2.2 points vs baseline).

**Evidence** :
- Phase B Bloc 4 (n=15, 5 paires de conflits) :
  - long_vs_hook : +2.2 (comp=91.8 vs baseline 89.6)
  - dialogue_vs_prose : +2.1 (comp=91.7)
  - noirceur_vs_sobriete : +1.8 (comp=91.4)
  - oral_vs_litteraire : +0.4 (comp=89.9)
  - ampleur_vs_secheresse : -1.3 (comp=88.3) — seul echec

**Hypothese** : Le conflit force Claude hors de son attracteur INTROSPECTION moyen, produisant un texte plus contraste et donc mieux note.

**Decision** : Tester l'injection de paires contradictoires dans le moteur V-ATOMIC comme strategie de generation. Les paires candidates prioritaires :
1. long_vs_hook (+"ecris des phrases longues ET des phrases-couteau")
2. noirceur_vs_sobriete (+"noirceur de fond + retenue de forme")
3. dialogue_vs_prose (+"dialogue brut + description sensorielle")

**Portee** : Experimental. A valider sur best-of-3 avant integration production.

---

## SIGNATURES

```
Decision          | Statut  | Autorite
DEC-20260328-BB-01 | SCELLE  | Francky + Claude Code
DEC-20260328-BB-02 | SCELLE  | Francky + Claude Code
DEC-20260328-BB-03 | SCELLE  | Francky + Claude Code
```

**Hash de reference** : commit a7ad1367 (data blackbox Phase B)
