# DEC-20260531-013 — RCI PACKET COMPLETENESS + SHADOW FLOOR

**Statut** : RATIFIED (décisions Architecte 2026-05-31, doc-only) — exécution code gatée (terminal Architecte / Phase R).
**Date** : 2026-05-31 · **Standard** : NASA-Grade L4 / DO-178C Level A.
**Scelle** : WS-B0b (`17407947`), WS-B1 (`4fc2c075`), WS-B2 (`1b4624e6`). Remplace l'usage brut de la « preuve 0/57 » de [DEC-012](DEC-20260531-012-RCI-RECALIBRATION-CORPUS-PROOF.md).
**Gate** : DOC_ONLY. Zéro code / patch / changement de floor production / modif computeRCI / recalibration / DEC-009 / M4.

---

## 1. Conclusions scellées (WS-B0 → B2)

1. **`computeRCI` n'a PAS dérivé** dans le temps (WS-B0b : residual −0.68 ≈ 0 ; le −17.14 = artefact probe packet signature=60/hook=85).
2. **« 0/57 maîtres ≥ floor 85 » est INVALIDÉ comme preuve brute** : packet-confondu (MINAXIS_E utilisait le probe packet). À packet-fair, 28/57 passent.
3. **RCI représentatif des maîtres ≈ médiane 84.54** (WS-B2 : deux lexiques d'œuvre indépendants saturent signature=hook=100 → RCI = ceiling). Vrai RCI maîtres ≈ ceiling, pas un intermédiaire.
4. **Le floor 85 est trop sévère** comme seuil universel actuel : ≈ médiane maîtres → rejette ~51 % de la littérature de référence.
5. **`signature` et `hook` sont des capteurs quasi-BINAIRES** (packet vide → 60/85 ; packet peuplé → 100). Ce sont des signaux de **complétude de packet**, PAS des signaux gradués de qualité. Seuls **`rhythm` + `euphony`** discriminent la qualité.
6. **Circularité K2** : non démontrée — à packet égal, maîtres (84.54) ≥ K2 (82.6).

## 2. Décisions ratifiées

### D1 — Floor RCI : candidat SHADOW 81.7
- **Floor candidat = 81.67** (p25 maîtres packet-fair). **SHADOW uniquement, AUCUN changement production.**
- Rationnel : floor 85 ≈ médiane maîtres (rejette ~50 %) ; p25 exige un rythme meilleur que le quart le plus faible des passages de maîtres = exigeant mais ancré dans la réalité littéraire.
- Pré-requis avant production : shadow bench sur goldens + high-quality rejects + BOOK_FULL + PROD_REVELATION + M0.b + sorties K2 récentes. **Aucun patch floor avant ce bench.**

### D2 — Leviers de recalibration (ordre)
1. **Packet completeness** : garantir que le scoring de prod utilise des packets peuplés (signature_words/motifs). C'est le vrai bug de classe (cf. §1.5 + ECC WS-A.2).
2. **Reclasser signature/hook** comme `packet-completeness signals`, PAS `quality signals` → **dé-pondérer** leur poids relatif dans RCI pour ne pas écraser le rythme.
3. **Recalibrer `rhythm`** : pic CV étalonné sur la distribution littéraire (médiane 69.6, p10 56.9, p90 82.2), PAS sur K2.
4. **Réexaminer `euphony`** (lever le ×0.5 défensif) après re-tuning rhythm.
5. **Floor** en dernier (après leviers).
- Tout via **dispatcher Phase R** (kill-switch, jamais cosmétique), jamais patch direct.

### Q1 — Ouverture « Le Gardien » : la prose a raison, le plan a tort
- Cible : **trust de surface + sous-couche mélancolie/awe/fear latent → glissement vers fear/anticipation**. PAS `trust:1.0` plat, PAS fear pur dès l'ouverture.
- L'ECC 68 était CORRECT (il a puni la désobéissance au contrat plat). Le correctif est dans **genesis-planner** (micro-trajectoire, cf. [DEC-011](DEC-20260531-011-GENESIS-PLANNER-SCENE-EMOTION-MICRO-TRAJECTORY.md)), pas dans le capteur.

## 3. Règle nouvelle (doctrine capteurs)

- **`INVALID_PACKET` / `PROBE_ONLY`** : tout scoring RCI (ou ECC) avec un packet vide/dégénéré DOIT être labellisé comme tel et **NE PEUT PAS servir de preuve** de qualité/défaut. *Un score bas ne prouve rien si le contrat envoyé au juge est vide.*
- **Avant de recalibrer un juge, vérifier que son contrat d'entrée est complet.**
- RCI et ECC racontent la même histoire (packet/contrat sous-peuplé) :

| Axe | Ancien diagnostic | Diagnostic corrigé |
|---|---|---|
| RCI | floor impossible / K2 circulaire | packet signature/hook vide |
| ECC | juge émotionnel faible | contrat émotionnel trop pauvre (DEC-010/011) |
| 14D | module mort à arracher | chemin contractuel incomplet / garage à traiter proprement |

## 4. Interdits (jusqu'à shadow bench + décision Architecte)

Aucun code, aucun changement de floor production, aucune recalibration, aucun patch `computeRCI`, aucun DEC-009, aucun M4.

## 5. Suite (code, gatée — terminal Architecte)

- **Front A** : P-A purge dette de typage `as any` sovereign (refactoring, gate EMP-10 vitest+tsc).
- **Front B** : Phase R — coder floor shadow 81.7 + dé-pondération signature/hook + euphony ×1.0, sous flag/shadow, 2517 tests vitest au vert, kill-switch.
- Les deux via wrapper EMP-10 / dispatcher Phase R, PAS via le mount autonome.

---

## VERDICT
- Statut : RATIFIED (doc-only) — scelle WS-B0/B1/B2, ratifie D1-shadow / D2 / Q1.
- Confiance : Haute (3 résultats CALC reproductibles convergents : WS-B0b/B1/B2).
- Forces : transforme l'enquête en décisions ; protège la production (floor en shadow, pas appliqué) ; pose la doctrine INVALID_PACKET ; unifie RCI/ECC sous « contrat d'entrée sous-peuplé » ; recentre les leviers sur les vrais discriminants (rhythm/euphony).
- Faiblesses : (1) le floor 81.7 reste un candidat non bench-shadow-validé ; (2) la politique production de signature_words (nombre/sélection) reste à spécifier ; (3) le re-tuning pic CV demande un corpus rythme dédié.
- Risques restants : appliquer le floor ou dé-pondérer signature/hook sans shadow bench = changement de seal non validé → INTERDIT ici.
- Action requise : Architecte — lancer le shadow bench (Front B) et/ou P-A (Front A) en terminal gaté. Aucune action production engagée par ce DEC.


---
## 6. ADDENDUM (2026-05-31) — vérification then/now du JUGE : CALC fait, LLM préparé, ρ en gap

Question Architecte : a-t-on comparé le juge « valeurs d'alors vs aujourd'hui » sur ce qui a servi au calibrage ? Réponse : **partiellement**.

| Juge | Then/now testé ? | Résultat |
|---|---|---|
| **RCI (CALC)** | OUI (WS-B0b, `17407947`) | **stable** — formule non dérivée (−17 = artefact packet, residual −0.68) |
| **ECC (LLM)** | NON → **WS-B0c préparé** | script `scripts/metrology/wsb0c-ecc-then-now.ts` prêt, **à lancer terminal Architecte** (Ollama bloqué en DC) |
| **M0b_slim ρ=0.6138 (corrélation)** | NON → **HELD** | `HOLDOUT_V2.csv` + `FEATURE_MATRIX_V3.csv` **INTROUVABLES** (repo+workspace) → evidence-gap |

**WS-B0c** (ECC then/now) : re-score les 7 passages ALTERNANCE (ECC historique : A=95.17, B=93.47, C=91.70…) avec `computeECC` d'aujourd'hui, k=3 (variance LLM), contrat scène-type DOCUMENTÉ (menace=arc fear, revelation=surprise/awe→sadness), NON dérivé de la prose (anti-circularité), NON vide (anti-boîte-vide). **Caveat scellé** : le contrat ALTERNANCE original n'étant pas sauvegardé, Δ(hist,now) conflera dérive-juge-LLM + écart-contrat + variance-LLM ; k=3 isole la variance, mais dérive-juge et écart-contrat ne sont PAS séparables sans le contrat d'époque. Verdict par passage : stable / biased_shift / unstable_variance. Harnais validé structurellement (atteint computeECC, bute seulement sur Ollama-DC).

**ρ=0.6138 (HELD)** : ne PAS reconstruire le holdout à la main (« recréer la preuve » = anti-pattern). Tracer comme evidence-gap : `HOLDOUT_V2.csv` / `FEATURE_MATRIX_V3.csv` absents du mount → vérification corrélation différée jusqu'à localisation des fichiers scellés (cf SHA256 holdout 56636e28… + coefficients e75e3bb0… dans CLAUDE.md workspace).

**Principe Architecte réaffirmé** : *on ne touche au seuil (floor) qu'avec une vérité mathématique reproductible et prouvable à 100 %.* → 81.7 reste SHADOW ; M4/DEC-009 restent GELÉS tant que le juge LLM (ECC) n'est pas vérifié then/now (WS-B0c).


---
## 7. ADDENDUM WS-B0c EXÉCUTÉ (2026-06-01) — juge ECC REPRODUCTIBLE, dérive inconclusive

Run Architecte (Ollama qwen3:32b, temp 0, k=3) → `docs/audit/minaxis/JUDGE_DRIFT_ECC_THEN_NOW.md`.

| Conclusion | Verdict |
|---|---|
| **Reproductibilité juge LLM** | ✅ **PROUVÉE** — now_ECC_std=0 sur 7/7 (0 variance LLM à temp 0) |
| Tendance centrale then/now | stable (mean Δ +1.49, median +1.07) |
| Dérive then/now isolée | ⚠️ **INCONCLUSIVE** — 4/7 biased_shift (D +10.59…) = confound contrat (contrat ALTERNANCE original non sauvegardé), PAS du bruit (std 0) |

**Le juge ECC est déterministe/reproductible** (le fait dur, prouvé à 100 %). La **dérire** then/now n'est PAS séparable du match-contrat sans le contrat d'époque — **3ᵉ occurrence du même evidence-gap** (RCI packet WS-B1, holdout ρ, contrat ALTERNANCE). Ne pas conclure « juge dérivé » (faux, confond contrat) ni « juge identique » (non prouvé). Conforme INVALID_PACKET : un score n'est comparable qu'à contrat d'entrée identique.

**Impact** : juge ECC **utilisable car reproductible** ; M4/DEC-009 restent GELÉS tant que le contrat d'entrée n'est pas garanti complet. Aucun seuil touché (principe Architecte : pas de changement floor sans vérité reproductible à 100 % — ici la reproductibilité est prouvée, mais la complétude du contrat d'entrée ne l'est pas).
