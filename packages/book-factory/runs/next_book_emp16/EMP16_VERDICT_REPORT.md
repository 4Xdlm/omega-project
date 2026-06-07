# VERDICT EMP-16 — NEXT_BOOK_V1_FULLSTACK_EMP16

**Date** : 2026-06-07 · **Standard** : NASA-Grade L4 · **Instrument** : `src/c7/emp16-verdict.ts`
**Manuscrit V0** : `runs/next_book_emp16/MANUSCRIT.md` (85 107 mots, 50 chapitres, gemma4:31b)
**Canonique** : `MANUSCRIT_CANONICAL.md` — hash `ab4683a0178b0782…` (déterministe, vérifié ×2)
**Hash du rapport** : `3d0c832b6596eb1c…` · **Génome** : `05b23ef1d8427452…` (50 admissions chaînées)

> Le verdict est celui de l'instrument, pas de l'enthousiasme. Tout chiffre ci-dessous
> sort de `buildCanonical` + `runDoctorAudit` + scanners typés, mesurés sur le **texte
> FINAL** (NCR-P0B-001 : le hash et les métriques regardent le même cadavre).

---

## TABLE MAÎTRESSE — 3 livres, mêmes instruments

| Dimension | 18k « Silence » (c7) | 88k (c8) | **EMP-16** | Sens |
|---|---|---|---|---|
| Mots | 18 107 | 86 630 | 84 343 | — |
| Chapitres | 30 | 50 | 50 | — |
| **Tic max /1000 mots** | 5.47 | 3.99 | **1.24** | ↓ plus bas = mieux |
| Incipits **uniques** | 7 / 30 | 19 / 50 | **37 / 50** | ↑ plus haut = mieux |
| Incipits **clones** (≥3 fois) | 26 | 30 | **11** | ↓ |
| Incipits **météo** | 0 | 48 | **0** | ↓ |
| Pacing cv (longueur phrase) | 0.592 | 0.656 | **0.556** | variance rythme |
| σ mots / chapitre | 10 | 27 | 27 | régularité |

Lecture : sur **chaque axe de défaut** que la tour de contrôle a été bâtie pour
attraper, EMP-16 est le meilleur des trois. La seule régression est le `pacing cv`
le plus bas (rythme phrastique légèrement compressé — voir Dim. 5, SHADOW).

---

## VERDICT PAR DIMENSION (10)

### Dim. 1 — Les 5 niveaux de mesure · **PASS (mesure) / 3·5 propres**
Les 5 niveaux typés de `buildCanonical`, mesurés sur le canonique :

| Niveau | État | Détail |
|---|---|---|
| SYNTAX_CLEAN (passage) | ✅ PASS | scaffoldResidual 0 |
| SEAM_CLEAN (jonctions) | ✅ PASS | seamResidual 0, quoteDelta 0 |
| SEMANTIC_CLEAN (sens) | ❌ FAIL | semanticResidual **1** (ch39, voir Dim. 6) |
| NARRATIVE_CLEAN (livre) | ❌ FAIL | incipitClones **11**, maxTic 1.24 OK |
| AUTHOR_LOCKS_INTACT | ✅ n/a | 0 sceau (registre book-scoped, livre neuf) |

L'infrastructure de mesure aux 5 échelles (passage→chapitre→arc→livre→variance) a
tourné sans erreur sur 50 chapitres. **2 niveaux échouent honnêtement** — c'est le
notaire qui refuse de certifier, pas un bug.

### Dim. 2 — Tics vs 88k vs 18k · **PASS**
`maxTicPer1000w = 1.24` ≤ seuil 1.5. Détail des 8 tics surveillés (cooldown 3-usages
→ ban-5-chapitres, PLAN_LOCK) :
`le silence 1.24 · il y a 1.16 · la peur 0.45 · le gardien 0.26 · le village 0.09 · le vent 0.02 · la pluie 0 · la mer 0`.
Densité réduite de **−69 % vs 88k** (3.99) et **−77 % vs 18k** (5.47). Le mécanisme
de bannissement glissant a tenu.

### Dim. 3 — Incipits (diversité) · **CONDITIONNEL**
37 têtes uniques / 50 (**74 %**, vs 38 % au 88k, 23 % au 18k). 0 incipit météo (le
88k en avait 48/50 — défaut éliminé). **Mais** 11 incipits encore clonés (≥3
répétitions de tête à 4 mots) ⇒ NARRATIVE_CLEAN reste faux. Meilleur des trois,
**pas encore zéro**.

### Dim. 4 — Quotas réels (word count + fonctions) · **PASS (mots) / FAIL (fonctions réalisées)**
- **Word count** : moyenne 1 684 mots/chap, σ = 27 (**1.6 %**). Quota de longueur tenu au cordeau. ✅
- **Fonctions dramatiques réalisées** (classifieur Doctor, calibré Gold-Set) :
  TRANSITION 29 (**0.58**) · CONFRONTATION 10 · ACTION 9 · RÉVÉLATION 2.
  Le PLAN passait la gate quotas (TRANSITION ≤ 0.45, ≥1 RÉVÉLATION/acte). La
  **réalisation dérive** : 0.58 > 0.45. L'injection de directives a réduit l'écart
  (88k : 0.72 TRANSITION, 0 RÉVÉLATION → EMP-16 : 0.58, 2 RÉVÉLATION) **sans le
  fermer**. ❌ vs plan. → Prochain levier : gate de fonction **au moment de la
  génération**, pas seulement au plan.

### Dim. 5 — Pacing shadow · **PASS (shadow)** — rythme compressé signalé
cv des longueurs de phrase = 0.556, min chapitre 0.494, **0/50 chapitre plat**
(aucun pathologique). Mais c'est le cv **le plus bas des trois livres** : le rythme
phrastique est marginalement plus uniforme (persona gagnant = `rythme-compresse`).
Mesure SHADOW, non bloquante. Le déficit de rythme vit à d'autres échelles (n-grammes,
cadence de paragraphe) que ce proxy ne capte pas. **Aucune promotion** de
`temporal_pacing` (poids 0, dormant) — cette mesure = preuve 1/3 EMP-16, pas un GO.

### Dim. 6 — NARRATIVE_CLEAN · **FAIL (honnête)**
`NARRATIVE_CLEAN = false`. Deux causes traçées :
1. **11 incipits clones** (Dim. 3).
2. **1 résidu sémantique** ch39 : un dialogue ouvre sur `«` sans `»` fermant
   (« Je sais pour le naufrage… Le prix du sang ne s'efface pas avec le temps. »).
   La gate **refuse de fermer** un guillemet dont elle ne peut prouver la fin — elle
   route en AUTHOR_REVIEW au lieu de maquiller. C'est le comportement conçu :
   *code détecte/borne/refuse ; ne fabrique pas de sens.*

`brokenComparisons = 0`, `functionalRedundancies = 0` (NCR-005 propre). Le livre
n'est **pas** narrativement propre, et l'instrument le dit froidement.

### Dim. 7 — Cohérence personnages · **PASS** (1 entité non planifiée signalée)
- 5 184 mentions, **resolvedRate 0.935**.
- `suspicionsDeadSpeaks = 0` : Henri (DEAD) ne parle jamais après sa mort. ✅
- Aucune dérive de rôle détectée ; chronologie des rappels de graines cohérente.
- **Casting drift honnête** : `Marc Vallet` (×5, « ancien officier… sur le pont au
  naufrage ») — personnage **nommé inventé** par le générateur, **hors PLAN_LOCK**.
  EntityRegistry l'a attrapé comme `IDENTITY_UNDEFINED`. Rôle interne cohérent (pas
  une hallucination), mais échappé au registre : exactement ce que **Studio V2**
  remonterait à l'auteur pour *minter ou rejeter*. (Le déficit brut de 260 est gonflé
  par des pronoms en tête de phrase — Ils/Elle/Celles ; le seul signal réel = Vallet.)

### Dim. 8 — Payoff graph (graines) · **PASS**
**5/5 graines plantées ET récoltées**, `unpaid = []` :
`carnet → ch46 · dette → ch46 · lettre → ch44 · naufrage → ch46 · registre → ch46`.
Chaque promesse narrative est honorée. **Sous-note** : tous les payoffs se groupent
ch44-46 (dernier acte) — back-loading structurellement normal pour un climax, mais à
surveiller si on veut des résolutions intermédiaires.

### Dim. 9 — ADN Mycelium · **PASS**
Génome narratif déterministe construit : `genomeHash 05b23ef1d8427452…`, **50 hash
d'admission** chaînés (un par chapitre, depuis `progress.log`). Identique au re-run
⇒ reproductible. Le livre a une empreinte ADN unique et vérifiable.

### Dim. 10 — Comparaison 18k « Le Silence du Phare » · **PASS**
Voir Table Maîtresse. EMP-16 vs le 18k (c7_book, 30 chap) : tics **−77 %**, incipits
uniques **×5.3** (37 vs 7), clones **−58 %**. Le 18k était le plus répétitif des trois
en tête de chapitre (7 ouvertures distinctes sur 30). Amélioration générationnelle
**mesurée**, pas affirmée.

---

## SYNTHÈSE PASS/FAIL

| # | Dimension | Verdict |
|---|---|---|
| 1 | 5 niveaux de mesure | ⚠️ 3/5 propres (mesure PASS) |
| 2 | Tics vs 88k vs 18k | ✅ PASS |
| 3 | Incipits diversité | ⚠️ CONDITIONNEL (meilleur, pas zéro) |
| 4 | Quotas réels | ✅ mots / ❌ fonctions réalisées |
| 5 | Pacing shadow | ✅ PASS (rythme compressé signalé) |
| 6 | NARRATIVE_CLEAN | ❌ FAIL (honnête) |
| 7 | Cohérence personnages | ✅ PASS (Vallet à arbitrer) |
| 8 | Payoff graph | ✅ PASS (5/5) |
| 9 | ADN Mycelium | ✅ PASS |
| 10 | Comparaison 18k | ✅ PASS |

---

## VERDICT GLOBAL

- **Statut** : **PASS CONDITIONNEL**
- **Confiance** : Haute (instruments calibrés, mesure sur texte final, déterminisme ×2)
- **Forces** :
  - La tour de contrôle a **fait son travail** : EMP-16 bat les deux livres antérieurs
    sur tous les défauts-cibles (tics, incipits, météo, anémie dramatique).
  - Quotas de longueur tenus à 1.6 %, 5/5 graines récoltées, 0 mort-qui-parle, génome
    reproductible.
  - Les échecs sont **détectés et nommés**, jamais maquillés.
- **Faiblesses** (≥2, activement cherchées) :
  1. **NARRATIVE_CLEAN faux** : 11 incipits clones + 1 résidu sémantique ch39 → le
     livre n'est **pas certifiable** en l'état.
  2. **Réalisation dramatique dérive du plan** : TRANSITION 0.58 (plan ≤ 0.45). La
     gate de plan ne contraint pas la génération — il manque une gate de fonction au
     runtime.
  3. **Rythme phrastique le plus plat des trois** (cv 0.556) — la prose « déchire tous
     les auteurs humains » reste un objectif, pas un acquis.
  4. **1 personnage nommé hors-registre** (Vallet) — cohérent mais non planifié,
     à minter ou rejeter par l'auteur.
- **Risques restants** :
  - Le classifieur de fonctions est un proxy CALC (calibré Gold-Set) : 0.58 a une barre
    d'erreur. Ne pas sur-interpréter ±0.05.
  - Payoffs back-loadés ch44-46 : si un lecteur décroche avant l'acte final, peu de
    résolutions intermédiaires.
- **Action requise** :
  - **Arbitrage auteur** (Studio V2) : 11 incipits clones, résidu ch39, entité Vallet.
  - **Décision Architecte** : faut-il une **gate de fonction dramatique au runtime**
    (R6) pour fermer l'écart plan→réalisation ? (preuve EMP-16 = 1/3 si modif moteur).
  - `temporal_pacing` reste **SHADOW** (pas de promotion, EMP-16 = preuve 1/3).

> **Conclusion froide** : l'instrument a généré le meilleur des trois livres OMEGA et a
> simultanément **refusé de le certifier propre**. Les deux faits sont vrais en même
> temps. C'est précisément ce qu'on demande à un contrôle intraitable et non myope.
