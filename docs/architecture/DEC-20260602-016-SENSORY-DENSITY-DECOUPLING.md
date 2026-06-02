# DEC-20260602-016 — DÉCOUPLAGE DENSITÉ SENSORIELLE ↔ QUALITÉ (R3)

**Statut** : PROPOSED (doc-only) — ratification Architecte requise avant TOUT code moteur (EMP-16 + EMP-10)
**Date** : 2026-06-02 · **Branche** : phase-r-dispatcher-v33 · **Auteur** : Claude Code (IA Principal)
**Convergence externe** : Tribunal 2/2 (Gemini + ChatGPT) + arbitre runtime — interprétation R2.3 validée.
**Lié à** : WS_D_R2_3_RESULTS_VERDICT.md, WS_D_R2_1_V2_RESULTS_VERDICT.md, DEC-015 (SEAL 93 invalidé), NCR_KEYWORD_SENSOR_SYSTEMIC_BIAS, NCR_RCI_SENSOR_DEFECT.

---

## 1. Décision

**La densité sensorielle n'est PAS un critère de qualité et ne doit plus gater l'acceptation.**

Preuve (990 mesures, R2.3, 30 livres × 5 tailles × 3 bras + livre entier, 3 familles × 2 langues) :
`sem_base` (densité sensorielle sémantique, capteur HYBRID) = **maîtres 17.6 < best-sellers 20.9 < mauvaise-prose 30.2**.
Un floor de densité **punit les maîtres et récompense la pulp**. Idem keyword (dry-run CALC : badprose FR 70 > maîtres FR 40).

Deux propriétés établies 3/3 familles :
- le capteur **sémantique** est agnostique de langue (R2.1 v2 : |sem_FR−sem_EN|<10) et **non gameable par padding**
  (filler neutre même longueur → |Δ| moyen 1.33 ≈ 0) → strictement **meilleur que le keyword** (FR-only, gameable) ;
- mais la densité (keyword OU sémantique) **anti-corrèle la qualité** sur ce corpus.

**Conséquences actées** :
1. Les signaux de densité sensorielle (`sensory_richness` keyword, `corporeal_anchoring` keyword + `distribution_bonus`,
   `focalisation` sémantique) **sortent de la porte de qualité** : ni `min_axis`, ni floor, ni poids dans le composite-qualité.
2. Le capteur **sémantique remplace le keyword** comme mesure de densité — **mais en rôle ADVISORY uniquement** (diagnostic
   de texture, jamais cassant). Le keyword FR-only est déclassé.
3. **Reclassement, pas suppression** (mandat Architecte « REDÉFINIR l'utilisation, pas supprimer ») : les sous-capteurs
   restent calculés et reportés en `sub_scores` annotés `advisory`, pour diagnostic et guidage génération.

## 2. Caveat de rigueur (EMP-17 — ne pas sur-vendre)

La décision repose sur le **fait opérationnel** : un floor de densité mésclasse (punit maîtres, récompense pulp).
Elle ne repose PAS sur la thèse causale « l'économie sensorielle = maîtrise littéraire » (plausible mais **non prouvée** :
les maîtres contiennent beaucoup de passages non-sensoriels — digressions, dialogue, exposition — donc leur densité
moyenne plus basse reflète en partie un **mix de contenu/genre**, pas seulement une vertu stylistique). La décision tient
indépendamment de la cause : quelle que soit la raison, un floor de densité produit un classement inverse de la qualité.

## 3. Cartographie de l'axe IFI (fichier+ligne, SSOT)

`packages/sovereign-engine/src/oracle/macro-axes.ts` :
- `computeIFI` (l.628) : `ifi_raw = sensory_richness×0.25 + corporeal_anchoring×0.25 + focalisation×0.25 + attention×0.125 + fatigue×0.125` (l.676-681) + `distribution_bonus` (corporeal par quartile, l.684).
- `computeMacroSScore` (l.863) : `composite = Σ axis×MACRO_WEIGHTS` (ifi 0.10, l.872) ; `min_axis = min(ecc,rci,sii,ifi,aai)` (l.875-881) ; SEAL gâté par composite + min_axis + floors ecc/aai (l.883-892).

**Constat** : l'axe IFI est **intégralement** un axe de texture/densité. Décomposition par classe (cf SENSOR_CABLE_MAP) :
- `sensory_richness` (CALC keyword FR-only) — densité, **à démettre du floor** ;
- `corporeal_anchoring` + `distribution_bonus` (CALC keyword) — densité, **à démettre du floor** ;
- `focalisation` (HYBRID sémantique) — densité, **advisory** ;
- `attention_sustain` + `fatigue_management` (CALC structurel, langue-neutres, sains) — **PACING/qualité-de-lecture**, légitimes.

## 4. Options de redesign IFI (Architecte tranche)

| # | Option | min_axis / composite | Blast radius | Reco |
|---|---|---|---|---|
| **O1** | **IFI retiré** de min_axis ET du composite ; densité = score advisory séparé | min_axis = min(ecc,rci,sii,aai) ; re-normaliser MACRO_WEIGHTS sur 4 axes | Élevé (repondération composite → re-dérivation seuils) | possible |
| **O2** ★ | **IFI redéfini = PACING** : `ifi_quality = attention×0.5 + fatigue×0.5` ; sensory/corporeal/focalisation → `sub_scores` advisory (poids 0) ; distribution_bonus retiré du score | Structure 5-axes INCHANGÉE ; IFI mesure désormais le pacing, plus la densité | **Faible** (formule interne `ifi_raw` seulement ; pas de changement de signature/forme de retour) | **RECOMMANDÉ** |
| **O3** | **Shadow d'abord** : calculer IFI_legacy ET IFI_pacing, loguer le delta, NE PAS changer le verdict | Aucun (observation) | Nul | **1er pas obligatoire** |

★ O2 garde les 5 axes (zéro changement de forme → pas de crash orchestrateur), transforme IFI d'« indice de densité »
en « indice de pacing/fidélité de lecture » (attention soutenue + gestion de fatigue, tous deux CALC structurels sains,
langue-neutres). La densité (sémantique advisory + keyword diagnostic) survit dans `sub_scores`, sans gater.

**Recommandation** : **O3 (shadow) → O2 (après bench shadow concluant)**. O1 en réserve si l'Architecte veut purger
totalement IFI (mais impose une re-dérivation des seuils composite, donc plus lourd et gaté par DEC-015/WS-C).

## 5. Plan d'implémentation (POUR LE TERMINAL ARCHITECTE — EMP-10, flag, shadow, ZÉRO ici)

Flag `OMEGA_SENSORY_DECOUPLE` ∈ {`'0'` legacy (défaut), `'shadow'`, `'1'` actif}.

1. **computeIFI (l.628)** — derrière le flag, calculer `ifi_pacing = attention.score×0.5 + fatigue.score×0.5`.
   - `'0'` : comportement actuel (legacy) — rien ne change.
   - `'shadow'` : retourner `score = ifi_legacy` (inchangé) MAIS ajouter dans le retour un champ diagnostic
     `advisory: { ifi_pacing, focalisation, sensory_richness, corporeal_anchoring, delta: ifi_pacing - ifi_legacy }`
     + log. Verdict INCHANGÉ. → permet le bench shadow sans risque.
   - `'1'` : `score_final = ifi_pacing` ; sensory/corporeal/focalisation/distribution_bonus passent en `sub_scores`
     annotés `method:'ADVISORY'`, `weight:0`. La forme de retour `MacroAxisScore` reste identique (pas de crash).
2. **Aucune** modification de `computeMacroSScore` (l.863) : min_axis/composite gardent les 5 axes ; seule la *valeur*
   d'IFI change quand le flag = `'1'`. Pas de repondération (≠ O1).
3. **Seuils production INCHANGÉS** tant que le bench shadow + DEC-015 (paliers vérité) n'ont pas tranché les nouveaux floors.
4. Tests : smoke + non-régression (forme de retour, déterminisme), bench shadow masters+goldens (vérifier min_axis maîtres
   remonte — IFI cessant d'être l'axe-tueur, cf WS-C médiane IFI 49 → plombait min_axis), zéro régression sur axes sains.
5. Wrapper `commit-with-tests.ps1` (TSC + Vitest empirique) obligatoire (EMP-10) — terminal Architecte.

## 6. Définition cible : porte de Qualité Intrinsèque vs signaux advisory

- **IntrinsicQualityScore (gate)** : axes LLM sains — `necessity`, `metaphor_novelty` (SII), `authenticity`, `show_dont_tell`
  (AAI), `interiority`, `impact`, `emotion_coherence` (ECC) + composants RCI sains (rhythm, euphony — CALC structurels)
  + IFI-pacing (attention+fatigue). C'est ce qui doit gater min_axis/SEAL.
- **SensoryDensityScore (advisory)** : focalisation sémantique (bilingue) — reporté, jamais gâtant. keyword = diagnostic legacy.
- **ContractConformityScore (séparé)** : ECC vs target_14d, signature/hook vs packet (cf DEC-013, WS-A.2) — conformité au
  contrat, distincte de la qualité intrinsèque. (Hors scope DEC-016 ; mentionné pour la cohérence du split R3.)

## 7. Gates & garde-fous

- **EMP-16** : aucune ligne moteur tant que DEC-016 n'est pas ratifié par l'Architecte ET que le bench shadow (O3) n'a pas
  confirmé l'absence de régression sur les axes sains. Le run R2.3 prouve la PRÉMISSE (densité ≠ qualité), pas l'implémentation.
- **EMP-10** : code uniquement via wrapper test, terminal Architecte, flag, shadow d'abord.
- **DEC-015** : aucun nouveau floor/palier chiffré ici — les seuils restent ceux de la vérité WS-C, à re-dériver séparément.
- **Reclassement, pas suppression** : sensory/corporeal/focalisation restent calculés et exposés (advisory).
- **NCR** : `NCR_KEYWORD_SENSOR_SYSTEMIC_BIAS` reste OPEN jusqu'à ratification + shadow ; passera RESOLVED à l'activation `'1'` validée.

## 8. Question à l'Architecte

1. Valides-tu la **décision §1** (densité hors porte de qualité ; sémantique advisory > keyword) ?
2. Choix de redesign IFI : **O2 (recommandé)**, O1 (purge totale), ou autre ?
3. GO pour le **shadow O3** (1er pas : observer le delta IFI_pacing vs legacy, zéro impact verdict) avant tout flip `'1'` ?

## 9. Ratification & avancement (2026-06-02)

- **Tribunal 2/2** (Gemini + ChatGPT) : interprétation R2.3 validée, **aucune objection méthodologique** au retrait de
  sensory/corporeal du min_axis qualité. Phrase scellée : « Un texte peut sentir fort et penser pauvrement. La densité
  sensorielle n'est pas la qualité. »
- **Architecte** : décision §1 **validée avec réserve** ; réserve couverte par §2 (caveat causal), §7 (gates : aucun seuil
  prod sans bench, reclassement pas suppression) et §1.3 (keyword conservé en diagnostic). Redesign retenu : **O2**.
  Premier pas : **shadow + bench, PUIS décision de flip par l'Architecte**.
- **Bench shadow O2 livré (tooling, ZÉRO code moteur)** : scripts/metrology/wsd-r3-shadow-decouple-bench.ts.
  Score les 5 axes (Ollama) puis recalcule min_axis/composite/verdict legacy vs O2 (IFI=pacing reconstruit depuis
  attention+fatigue des sub_scores — sans patcher le moteur). Health-check : (1) IFI était-il l'axe contraignant chez les
  maîtres, (2) min_axis maîtres remonte-t-il, (3) la mauvaise prose gagne-t-elle un SEAL (ne doit PAS). Dry-run validé
  (18 livres, imports moteur résolus). Run = terminal Architecte. Sortie scores+sha+mots only.
- **EMP-16/EMP-10** : aucun code moteur tant que le bench n'a pas confirmé + ratification flip Architecte. Le patch O2
  flag-gaté sera fourni en .patch doc pour application terminal (wrapper test).
