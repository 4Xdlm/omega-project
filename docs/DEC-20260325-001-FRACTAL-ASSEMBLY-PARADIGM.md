# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — DÉCISION ARCHITECTURALE SCELLÉE
# DEC-20260325-001 : PARADIGME D'ASSEMBLAGE FRACTAL
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date : 2026-03-25
# Statut : 🔒 SCELLÉE — UNANIMITÉ 4/4 (Francky + Claude + ChatGPT + Gemini)
# Autorité : Francky (Architecte Suprême)
#
# ═══════════════════════════════════════════════════════════════════════════════

## PHRASE FONDATRICE (Francky)

> "On n'est pas obligé de construire des briques de 2500w à chaque fois.
> On peut avoir un assembleur qui assemble les briques quelle que soit leur taille.
> C'est le principe des LEGO — plein de tailles, de couleurs, de formes différentes.
> Les briques, du moment où elles sont belles, elles sont belles, point.
> À nous de les assembler. Ce n'est pas à l'usine de les refondre indéfiniment."

---

## CONTEXTE — CE QUI A PROVOQUÉ CETTE DÉCISION

Le tir V-RECAL-1 (2026-03-25) a produit le premier SAGA_READY canonique :
- Draft chunké moteur v4 : 2427w → composite 85.5
- Le Duel a trouvé un winner de 470w → composite 92.1
- MicroSurgery : +0.2 → composite final 92.3, min_axis 86.0

Le pipeline FONCTIONNE mais il atteint SAGA_READY en COMPRESSANT (2427w → 470w).
470 mots est l'optimum naturel du LLM pour la qualité maximale.

Forcer le LLM à maintenir 92+ sur 2500w d'un bloc est un fantasme technique.
Un roman de 300K mots ne peut pas être construit en blocs monolithiques parfaits.

---

## LA DÉCISION

### CE QUI CHANGE

| Avant | Après |
|-------|-------|
| Forcer des blocs de 2500w | **Briques de taille libre** (400-1200w selon la scène) |
| Scorer le gros bloc | **Scorer chaque brique** + scorer l'assemblage |
| Réécrire tout si échec | **Sceller les briques validées**, ne corriger que le ciment |
| Un seul niveau de scoring | **3 niveaux** : brique, chapitre, livre |
| Taille imposée par target_word_count | **Taille optimale trouvée par le LLM** |

### CE QUI NE CHANGE PAS

- Le moteur v4 (PF+Duras) reste le générateur
- Le MacroSScore reste le juge (composite ≥ 92, min_axis ≥ 85)
- Les 28 lois (L1-L28) restent en vigueur
- Le pipeline engine.ts 19 étages reste actif
- Les invariants (INV-PROMPT-01, L3, etc.) restent en force

---

## ARCHITECTURE CIBLE — 4 NIVEAUX

### Niveau 0 — FORGE ATOMIQUE (briques)

- Générer une brique (taille libre, optimum LLM ~400-1200w)
- Scorer avec MacroSScore canonique (vrais juges LLM)
- Si composite ≥ 92 + min_axis ≥ 85 → SCELLER (hash SHA-256, immuable)
- Si non → Duel + MicroSurgery → rescorer
- **UNE BRIQUE SCELLÉE NE SE RÉÉCRIT PLUS JAMAIS**

### Niveau 1 — CIMENT (transitions)

- Agent "Linker" spécialisé
- Input : fin brique A (200 derniers mots) + début brique B (200 premiers mots) + contexte
- Output : 50-150 mots de transition
- Contraintes : ne JAMAIS réécrire les briques, ne JAMAIS ouvrir/fermer un arc
- Score : continuité émotionnelle, absence de rupture, fluidité

### Niveau 2 — CHAPITRE (assemblage)

- Assemblage : Brique A + Ciment AB + Brique B + Ciment BC + Brique C + ...
- Taille résultante : ~2500-4000w (selon le nombre et la taille des briques)
- Score chapitre : arc narratif, cohérence, rythme macro, P4 continuité
- Si échec → identifier la COUTURE fautive, PAS la brique
- On remplace un ciment ou on réordonne, on ne refond pas les briques

### Niveau 3 — LIVRE (méta-assemblage)

- Assemblage de chapitres
- Score inter-chapitres : arcs, mémoire longue, motifs, progression enjeux
- Outils existants : Canon Lock, World Model, Bible, CDE
- Si écart → localiser le chapitre problématique, pas le livre entier

---

## PRINCIPE DE GEL (IMMUTABILITÉ)

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║   TOUTE BRIQUE VALIDÉE AU NIVEAU N DEVIENT IMMUABLE.                     ║
║   On ne la réécrit plus.                                                  ║
║   On ne travaille plus que sur :                                          ║
║     - les LIAISONS (ciment)                                               ║
║     - les CONNECTEURS EXTERNES (phrases-ponts aux bords)                  ║
║     - les MÉTADONNÉES de pilotage                                         ║
║   Jamais sur le contenu interne de la brique.                             ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

Nuance (ChatGPT) : on autorise une "zone de couture" aux bords (premières
et dernières phrases) pour des micro-ajustements de raccordement.
Le CŒUR de la brique est gelé à 100%.

---

## TAILLE DES BRIQUES — PAS DE CONTRAINTE FIXE

La taille n'est PAS prescrite. Le LLM trouve son optimum.

Plages observées :
- Transition courte : 150-300 mots
- Scène dense : 400-800 mots (optimum IFI/AAI)
- Scène ample : 800-1200 mots
- Scène pivot : 1200-2000 mots (rare, si le LLM tient le score)

La seule contrainte : **composite ≥ 92 + min_axis ≥ 85 → SCELLABLE**.
Quelle que soit la taille.

---

## OUTILS OMEGA EXISTANTS RÉUTILISÉS

| Outil | Rôle dans le nouveau paradigme |
|-------|-------------------------------|
| engine.ts + Duel + MicroSurgery | Forge Atomique (niveau 0) |
| judgeAestheticV3 (MacroSScore) | Score des briques |
| CDE (delta-compressor, scene-chain) | Proto-assembleur |
| Canon Lock + World Model | Cohérence inter-chapitres (niveau 3) |
| omega-segment-engine | Segmentation — cœur d'assemblage potentiel |
| ProofPack + hash SHA-256 | Scellement des briques (immuabilité) |
| P4 continuité | Proto-score niveau 2 |

---

## SPRINTS PLANIFIÉS

### Sprint V-ATOMIC (prochain)
- Configurer engine.ts pour briques de taille libre
- Retirer target_word_count rigide du ForgePacket
- Scorer chaque brique individuellement → composite ≥ 92
- Valider sur 5 briques de tailles variées

### Sprint V-CEMENT
- Créer src/assembly/linker.ts
- Scorer les coutures
- Valider sur 3 assemblages brique+ciment+brique

### Sprint V-CHAPTER
- Assembler 4-6 briques → 1 chapitre
- Score chapitre + P4 continuité
- Identifier coutures vs briques si échec

---

## PREUVE DE FAISABILITÉ

Le tir V-RECAL-1 du 2026-03-25 prouve :

| Fait | Valeur | Statut |
|------|--------|--------|
| Pipeline canonique end-to-end | 19 étages actifs | ✅ PROUVÉ |
| Brique SAGA_READY produite | composite=92.3 min_axis=86.0 | ✅ PROUVÉ |
| Winner optimal du Duel | 470w (taille libre, non contrainte) | ✅ PROUVÉ |
| Pouvoir du pipeline de correction | 85.5 → 92.3 (+6.8 pts) | ✅ PROUVÉ |
| Robustesse multi-runs | | ❌ PAS ENCORE |
| Assemblage chapitre | | ❌ PAS ENCORE |
| Score livre | | ❌ PAS ENCORE |

---

## SIGNATURES

- **Francky** (Architecte Suprême) : DÉCISION INITIALE + VALIDATION
- **Claude** (IA Principal) : EXÉCUTION + DOCUMENTATION
- **ChatGPT** (Consultant) : VALIDATION + alerte circularité + score de jointure
- **Gemini** (Guardian) : VALIDATION + Forge Atomique + Linker concept

---

*"La vraie difficulté n'est pas d'écrire les pierres.*
*C'est de faire croire au lecteur qu'il n'y a jamais eu de maçon."*

*— Décision scellée le 2026-03-25*
*— Standard NASA-Grade L4 / DO-178C Level A*
