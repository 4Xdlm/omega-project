# OMEGA — DISCUSSION ARCHITECTURALE PHASE V
# Context Distillation Engine (CDE) + Voice Genome

**Date**: 2026-03-11
**Session**: Pendant attente full bench U-ROSETTE-17
**Participants**: Francky (Architecte Suprême) + Claude + ChatGPT + Gemini
**Statut**: 📋 SPÉCIFIÉ — Backlog Phase V P0

---

## 1. QUESTION DE L'ARCHITECTE

> "Faudrait-il créer un autre module pour alléger la création LLM
> et optimiser la continuité de l'écriture ?"

Contexte : OMEGA vise à écrire mieux que tous les auteurs du monde,
non pas sur une scène, mais sur un roman entier — voire une saga.

---

## 2. CONSTAT DE DÉPART — CE QUI EXISTE DÉJÀ

La conception OMEGA couvre déjà la continuité longue portée :

| Composant | Rôle | Phase |
|-----------|------|-------|
| Persona Store | Psychologie profonde + contradictions + tics | V |
| Arc Tracker | Position personnage dans son arc | V |
| Debt Ledger | Graines plantées non résolues | V |
| Canon Lock | Faits établis — non modifiables | V |
| RAG Index | Chapitres indexables par personnage/thème | V |
| Drift Detector | Personnage incohérent → REJECT | V |
| Hot/Cold Memory | Hot = 5-10 éléments actifs / Cold = historique | V |
| Fractal Judge | SceneJudge + TransitionJudge + ArcJudge | W |
| Philosophical Genome | Filtre de vision du narrateur (pas texte) | V |
| Soul Layer | 1 phrase incarnée par scène, human_warmth ≥ 0.20 | V |
| Showrunner Engine | Bible + Writers Room Virtuel | X |

**Conclusion** : la mémoire longue est spécifiée. Le gap identifié
est dans la COUCHE D'INTERFACE entre mémoire et prompt de génération.

---

## 3. LE GAP RÉEL — COMPRESSION MANQUANTE

| Étape | Conçu ? | Module |
|-------|---------|--------|
| Sélectionner 5-10 éléments pertinents du World Model | ✅ | Relevance Filter |
| **Comprimer ces éléments avant injection LLM** | ❌ GAP | — |
| Mettre à jour le World Model après génération | ✅ (implicite) | World Model |
| **Extraire le delta d'état (ce qui a changé)** | ❌ GAP | — |

**Mur structurel identifié par Gemini** :
Sans compression, 5-10 éléments Hot × 200-500 tokens bruts = 1000-5000
tokens de contexte narratif brut. Le LLM noie sa capacité stylistique.
Prouvé par Phase U : U-ROSETTE-06, 500 tokens RÈGLE D'UNIFICATION → régression.

---

## 4. MODULE PROPOSÉ — CONTEXT DISTILLATION ENGINE (CDE)

### Architecture

```
[World Model Hot Elements — brut]
         ↓ COMPRESSION
[Scene Brief — 100-150 tokens max]
         ↓ INJECTION
[Prompt LLM — charge allégée]
         ↓ GÉNÉRATION
[Prose produite]
         ↓ EXTRACTION
[State Delta — faits nouveaux, arcs bougés, dettes soldées/créées]
         ↓ MISE À JOUR
[World Model — état suivant]
```

### Invariants INV-CDE-01..06

| ID | Règle |
|----|-------|
| INV-CDE-01 | Scene Brief ≤ 150 tokens mesurés (char_estimate_4) |
| INV-CDE-02 | Même Hot elements → même Scene Brief (déterminisme) |
| INV-CDE-03 | State Delta : 0 fait contradictoire avec Canon Lock |
| INV-CDE-04 | Toute dette ouverte dans la scène → Debt Ledger +1 |
| INV-CDE-05 | Toute dette soldée → Debt Ledger -1 avec preuve |
| INV-CDE-06 | Aucun élément du brief n'est purement décoratif (ChatGPT) |

### Entrées

- Hot elements sélectionnés
- Canon facts pertinents
- Dettes ouvertes pertinentes
- État d'arc local
- Objectif de scène

### Sortie 1 — Scene Brief (≤ 150 tokens)

Contient uniquement :
- Ce qui doit rester vrai
- Ce qui est en tension
- Ce qui doit bouger
- Ce qu'il est interdit de casser

### Sortie 2 — State Delta (post-génération)

- Nouveaux faits
- Faits modifiés
- Dettes ouvertes
- Dettes résolues
- Mouvement d'arc
- Incohérences potentielles

---

## 5. CONVERGENCE 3 IAs — Q1 : CDE JUSTIFIÉ ?

| IA | Verdict | Nuance |
|----|---------|--------|
| Claude | ✅ Phase V P0 | Gap compression confirmé |
| ChatGPT | ✅ Phase V + **CDE-lite maintenant** | Proto 2-3 scènes dès maintenant |
| Gemini | ✅ **Step-down transformer obligatoire** | Mur structurel à 30-40 chapitres |

**Convergence 3/3.** Module non redondant avec Constraint Compiler et Relevance Filter.

---

## 6. QUESTION DE L'ARCHITECTE — Q2 : PLUME

> "Vaut-il mieux copier le style parfait sorti par le LLM et grâce à
> OMEGA écrire le reste avec la même qualité de plume et de style en
> gardant la cohérence grâce à nos outils, ou encadrer le LLM pour
> qu'il garde la cohérence tout en gardant sa qualité d'écriture ?"

---

## 7. CONVERGENCE 3 IAs — Q2 : TROISIÈME VOIE

**ChatGPT** : Ni copie brute, ni encadrement vague.
→ **Distiller l'ADN, pas cloner le texte.**
→ Nom proposé : **Style Genome / Exemplar Distillation Engine**

**Gemini** : Option A — capturer + encoder en contraintes métriques.
→ **Voice Genome + injection mécanique.**
→ "On capture les éclairs de génie (OS27), on les transforme en
équations, OMEGA force le LLM à cloner cette perfection à l'infini."

**Convergence 2/2 sur la troisième voie :**

```
Sortie parfaite (ex. OS27)
        ↓ DISTILLATION
Voice Genome (métriques, pas texte)
        ↓ INJECTION
Prompt LLM allégé → génération libre dans l'enveloppe
        ↓ CONTRÔLE
OMEGA vérifie canon + arcs + dettes
```

### Ce qu'on extrait d'une sortie parfaite (Voice Genome)

- Longueur moyenne des phrases, variance rythmique
- Densité concrète/abstraite
- Degré d'obliquité métaphorique
- Température, niveau de sécheresse
- Types d'attaque (pas les attaques exactes)
- Forme de progression, cadence

### Ce qu'on ne clone JAMAIS

- Les métaphores exactes
- Les tournures identiques
- Les gimmicks visibles
→ Raison : rigidité, caricature, auto-plagiat

### Analogie ChatGPT

> "Tu ne demandes pas au maçon de refaire exactement cette pierre
> 10 000 fois. Tu lui demandes : comprends pourquoi cette pierre est
> belle, et reconstruis le mur avec la même noblesse."

---

## 8. DÉCISIONS ARCHITECTURALES GRAVÉES

| # | Décision | Statut |
|---|----------|--------|
| D1 | CDE = module distinct Phase V P0 | ✅ 3/3 |
| D2 | INV-CDE-01..06 formalisés | ✅ adopté |
| D3 | Voice Genome = ADN distillé, pas texte cloné | ✅ 2/2 |
| D4 | CDE-lite proto à valider sur 2-3 scènes (ChatGPT) | 📋 Backlog Phase V |
| D5 | LLM génère libre dans l'enveloppe distillée | ✅ 3/3 |
| D6 | Division du travail : CDE (Data) / Zero-Shot (Art) / Polish (Chirurgie) | ✅ Gemini |

---

## 9. ARCHITECTURE COMPLÈTE — SAGA / ROMAN

### Niveau 1 — Scène atomique (Phase U — en cours)
**SEAL requis avant tout.** Sans scène parfaite, la saga ne tient pas.

### Niveau 2 — Mémoire narrative (Phase V)
World Model + CDE + Philosophical Genome + Soul Layer

### Niveau 3 — Jugement fractal (Phase W)
SceneJudge + TransitionJudge + ArcJudge + Agrégateur

### Niveau 4 — Saga / Série TV (Phase X+)
Showrunner Engine + Writers Room Virtuel + Bible Builder

---

## 10. AVANTAGE OMEGA SUR L'HUMAIN (OMEGA_VALIDATION_EXPERIMENTS)

| Axe | Limite humaine | Capacité OMEGA |
|-----|----------------|----------------|
| Continuité | ~50-100k mots maximum | Mémoire infinie via World Model |
| Originalité | Style = prison | Voice Genome = émergent |
| Nécessité | Décoration inévitable | Irréductibilité |

L'humain est OBLIGÉ de : simplifier, oublier, tricher, répéter,
abandonner. OMEGA avec CDE + World Model n'a pas ces contraintes.

---

## 11. ÉTAT COURANT — FULL BENCH PENDING

| Attribut | Valeur |
|----------|--------|
| Branch | phase-u-transcendence |
| Commit actif | f137f235 (U-ROSETTE-17) |
| Tests | 1515 pass / 0 fail |
| Full bench 30+30 | 🔄 EN COURS |
| NEAR_SEAL_THRESHOLD | 92.0 (abaissé U-ROSETTE-17) |
| D3 forcing participial | ❌ Supprimé définitivement |

---

## 12. PRIORITÉ

1. 🔴 **Attendre résultats full bench U-ROSETTE-17**
2. 🔴 **Évaluer SEAL rate** (composite ≥ 93 + tous floors ≥ seuils)
3. 📋 Formaliser CDE en Phase V backlog si SEAL confirmé
4. 📋 Formaliser Voice Genome en Phase V backlog

---

*Document créé le 2026-03-11 — Session discussion architecturale*
*Standard : NASA-Grade L4 / DO-178C*
*Architecte Suprême : Francky | IA Principal : Claude*
