# WS-D R2.3 — GAMEABILITY @ SCALE : RÉSULTATS & VERDICT DÉCISIF

**Date** : 2026-06-02 · **Branche** : phase-r-dispatcher-v33 · **Run** : terminal Architecte, Ollama qwen3:32b, temp 0
**Échelle** : 30 livres (5/cellule × 6) × 5 tailles (150/300/600/1200/2400) × 3 bras + livre entier = **330 unités, 990 appels LLM**
**Artefacts** : `WS_D_R2_3_GAMEABILITY.{jsonl,json,csv}` (scores+sha+mots only — droits respectés) · script `scripts/metrology/wsd-r2-3-gameability-scale.ts`
**Doctrine** : EMP-16 (triple-preuve), EMP-17 (mesures historiques = preuves)

---

## 0. CORRECTION d'un label auto erroné

Le champ `interpretation` du run brut affichait `GAMEABILITE_REELLE_persistante`. **C'était FAUX** : ma logique
ne testait que le point 2400 (net 8 > 5) et ignorait la tendance + le contrôle neutre + l'absolu. Corrigé dans le
script (valeur absolue + platitude neutre + inversion qualité). Le présent doc fait foi.

## 1. Les chiffres (valeur ABSOLUE = vérité ; le `/100 mots` créait une fausse décroissance)

| taille | sem_base | Δ_salade ABS | Δ_neutre ABS | net /100 (trompeur) |
|---|---|---|---|---|
| 150 | 18.0 | **+49.2** | −1.5 | 190 |
| 300 | 21.4 | **+28.8** | −1.1 | 112 |
| 600 | 24.9 | **+16.9** | 0.0 | 32 |
| 1200 | 24.8 | **+16.9** | +0.0 | 16 |
| 2400 | 24.5 | **+15.0** | +0.1 | 8 |
| livre entier | 24.3 | **+15.3** | +0.0 | 4.8 |

Le `net/100` chutait 190→5 **uniquement** parce qu'on injecte une salade proportionnelle (8 %) : plus de mots de
stuffing aux grandes tailles → dénominateur plus grand. En **absolu**, l'effet salade est **~constant ~15-17 pts dès 600 mots**
(plus fort à 150/300 car la salade y pèse 16 % du texte). Ce n'est PAS une dilution.

## 2. DEUX faits prouvés à 990 mesures (3 familles × 2 langues)

**FAIT A — le sémantique n'est PAS gameable par le PADDING.** Le filler NEUTRE (même longueur, non-sensoriel)
ne bouge le score de **quasi 0 à toutes les tailles** : moyenne `|Δ_neutre|` = **1.33**, sur 330 mesures. Le capteur
répond au **contenu sensoriel**, pas à l'ajout de texte. Le critère (b) de R2.1 (`Δ/100 < 5`) était **mal spécifié** :
il pénalisait un capteur de densité pour avoir mesuré… de la densité ajoutée. Le contrôle neutre tranche : pas d'artefact longueur/récence.

**FAIT B — la densité sensorielle (sémantique comme keyword) est ANTI-CORRÉLÉE à la qualité.**
`sem_base` par famille : **maîtres 17.6 < best-sellers 20.9 < mauvaise-prose 30.2** (idem à taille fixe 600/2400 :
maîtres ~18.7 < best ~22 < badprose ~33). **Le capteur sémantique classe la pulp AU-DESSUS des maîtres**, exactement
comme le keyword (dry-run CALC : badprose FR 70 > maîtres FR 40). La prose commerciale/érotique EST sensoriellement dense.

## 3. Verdict (EMP-16) : toujours AUCUN code moteur — mais la cible est désormais claire

Le run **ne valide PAS** « promouvoir le sémantique comme porte de qualité/immersion » — il prouve l'inverse :
**la densité sensorielle n'est pas de la qualité.** Donc :

- **Aucun capteur de densité (keyword NI sémantique) ne doit GATER la qualité** (min_axis / floor IFI).
  Les deux notent la pulp au-dessus des maîtres → un floor de densité punit Flaubert et récompense la pulp.
- **Comme SIGNAL de densité**, le sémantique est strictement **meilleur** que le keyword :
  agnostique langue (R2.1 v2 : 3/3, |sem_FR−sem_EN|<10) + non gameable par padding (FAIT A) + bilingue natif.

→ Décision soutenue par les données (à RATIFIER Architecte, code en shadow/flag/EMP-10 terminal) :
**R1 + R3** — sortir sensory/corporeal **du min_axis** (advisory), et SI un signal de densité est conservé,
**remplacer keyword par sémantique** en rôle advisory. **PAS** de capteur de densité dans la porte de qualité.

## 4. Convergence triple-preuve (EMP-16) — sur la bonne proposition

La proposition pré-enregistrée « sémantique = bonne porte d'immersion » n'est PAS prouvée (et est réfutée par FAIT B).
La proposition réellement convergente 3/3 (maîtres / best-sellers / mauvaise-prose) est :

| Proposition | maitres | bestsellers | badprose | 3/3 |
|---|---|---|---|---|
| densité sém. anti-corrèle qualité (base bad>maître) | ✅ | ✅ | ✅ (30.2 vs 17.6 global) | **OUI** |
| sémantique non gameable par padding (neutre≈0) | ✅ | ✅ | ✅ | **OUI** |
| sémantique agnostique langue (R2.1 v2 \|Δ\|<10) | ✅ | ✅ | ✅ | **OUI** |

Ces 3/3 soutiennent **R1 (démotion densité du floor)** + **sémantique > keyword comme signal advisory**.
Ils NE soutiennent PAS « densité = gate qualité ». Corroboré par l'historique (EMP-17) : WS-C (0/95, IFI tueur),
triple-preuve R1 (IFI K2-circulaire), inversion « 50 Nuances > Flaubert » du calibrage d'origine.

**Le « gaming » résiduel** (Δ_salade ABS ~+15 dès 600 mots, ~+49 à 150 mots) est le comportement NORMAL d'un
mètre de densité (ajouter du sensoriel réel monte la densité réelle). Il n'invalide pas l'usage advisory ;
il interdit l'usage en gate de qualité — ce que FAIT B impose de toute façon.

## 5. Décision & prochain pas

**HOLD code** (EMP-16 : modif moteur = ratification Architecte + shadow/flag/EMP-10 terminal). Ce qui est prêt :

- **R3 (doc-only, à écrire)** : ADR « split IntrinsicQuality vs SensoryDensity-advisory » + plan de retrait de
  sensory/corporeal du min_axis (reclassement, jamais suppression — cf mandat « REDÉFINIR l'utilisation »).
- **DEC-016 (à proposer)** : densité sensorielle = signal advisory ; si conservée, capteur sémantique (langue-agnostique) ;
  jamais dans la porte de qualité. min_axis quality = axes LLM sains (necessity, metaphor, authenticity, interiority, impact).
- Bench shadow de non-régression AVANT toute promotion.

## 6. Statut NCR

`NCR_KEYWORD_SENSOR_SYSTEMIC_BIAS` → enrichi, cause **CONFIRMÉE à 990 mesures** :
le défaut n'est pas « le sémantique est gameable » (il ne l'est pas par padding), mais **« la densité sensorielle
— quel que soit le capteur — n'est pas de la qualité et ne doit pas gater »**. Reste OPEN_DIAGNOSED jusqu'à R3/DEC-016 ratifiés.
