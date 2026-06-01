# AUDIT — Calibrage initial des paliers du juge : vérité & proportionnalité

**Date** : 2026-06-01 · **Mode** : archéologie + analyse, READ-ONLY. 0 patch, 0 changement de seuil.
**Demande Architecte** : retrouver le calibrage fondateur des paliers (œuvres classiques par catégorie → valeurs max, « Flaubert ~92/93 »), juger s'il fut arbitraire, et **décider** si une recalibration proportionnelle « vérité » s'impose.

## 1. Ce qui a été retrouvé (sources exactes)

**Deux échelles distinctes** :

### (a) Échelle GB 0-5 — tiers S/A/B/C (l'ancrage maîtres d'origine)
- **Source brute** : `packages/sovereign-engine/src/scoring/data/calibration/JUDGE_CALIBRATION_RESULTS.json` (**2026-03-23**) :
  - Flaubert Bovary gb_v1 = **4.09** (tier A) · Proust Swann **4.14** (A) · McCarthy Blood Meridian **3.70** (A). **3 maîtres, 500w.**
  - verdict : `all_s_tier=false`, `all_a_or_s=true`, lowest 3.70, **`judge_calibration: "ACCEPTABLE"`**.
- **Extension multi-taille** : `JUDGE_CALIBRATION_MULTI_SIZE.json` + `docs/OMEGA_MASTER_KNOWLEDGE_BASE.md` PARTIE 3 (7 maîtres × 4 tailles) :
  - MOYENNE MAÎTRES = 3.91 (500w) / 3.93 (1000w) / 4.09 (2000w). Seuil **S = ≥4.5**.
- **Tiers** (`docs/OMEGA_ENCYCLOPEDIE_METROLOGIE.md:76,156`) : **S (chef-d'œuvre) = ≥4.5** → Proust, Dostoïevski, Flaubert, Hugo, Woolf.

### (b) Composite 0-100 — où vit « 92/93 »
- `docs/OMEGA_FORMULES_COMPLETES.md:10` (s-score.ts:118-143) :
  `COMPOSITE = ECC·0.33 + RCI·0.17 + SII·0.15 + IFI·0.10 + AAI·0.25`
  **SEAL : composite ≥ 93 ∧ min_axis ≥ 80 ∧ ecc ≥ 88 ∧ aai ≥ 85.** PITCH ≥ 85.
- « Flaubert/Proust ~92/100 » apparaît comme estimation Q_prose dans `OMEGA_PROGRAMME_VERITE_v1.md` (modèle marché), pas comme mesure composite validée.

## 2. La méthodologie d'ancrage (telle que documentée)

Mesurer N œuvres classiques → vérifier qu'elles tombent dans le tier haut → fixer les paliers. Le verdict de calibrage = « les maîtres sont-ils tous A-ou-S ? » (oui → ACCEPTABLE). Les classiques = **l'ancre** (`MASTER_KNOWLEDGE_BASE:191` « Les classiques sont l'ancre, pas le LLM »).

## 3. Était-ce arbitraire ? — OUI, en partie, et les docs le FLAGGENT eux-mêmes

1. **Base mince** : ancrage fondateur sur **3 maîtres @ une seule taille (500w)** (RESULTS.json), étendu à 7. N très faible pour fixer une échelle.
2. **Inversion vérité prouvée** : `MASTER_KNOWLEDGE_BASE:86,303` — **« à 500 mots, 50 Nuances (C-tier commercial) = 4.29 > Flaubert 4.16 »** ; « GB V1 favorise le commercial sur fenêtres courtes ». L'échelle ne classait PAS la vérité correctement.
3. **Palier S irréaliste** : S = ≥4.5 atteint par **1 seul maître** (Woolf @2000w). **Seuil S recommandé = 3.51** — recommandation non adoptée (S=4.5 persiste).
4. **Composite 0-100 jamais validé contre les maîtres avec packets complets** : le SEAL ≥93 est un palier rond élevé ; les maîtres n'ont jamais été mesurés sur le composite complet (5 axes) à packet représentatif. WS-B vient de prouver que les mesures d'axe (RCI 0/57…) étaient **packet-confondues** → les anciens « les maîtres échouent/réussissent » sont non fiables.
5. **« Flaubert 92/93 »** = ancre **aspirationnelle**, pas une proportionnalité dérivée d'un corpus maître large et packet-équitable.

→ **Ton intuition est juste** : les paliers ont été ancrés de façon mince et partiellement arbitraire (et auto-flaggée), pas selon une proportionnalité prouvée vers la vérité.

## 4. VERDICT / DÉCISION

**Une recalibration proportionnelle « vérité » est JUSTIFIÉE** — mais elle ne doit toucher aucun seuil avant une vérité mathématique reproductible à 100 % (principe Architecte). Décision : **ouvrir WS-C (Master Composite Calibration), read-only/CALC + shadow, AVANT toute modif de seuil.**

### Méthode WS-C (reproductible, anti-confound)
1. **Corpus maître large** (≥ les 19 œuvres déjà cachées + extensions, FR/EN, par catégorie/registre), pas 3.
2. **Mesure du COMPOSITE COMPLET** (ECC+RCI+SII+IFI+AAI), pas un seul axe ni le GB 0-5.
3. **Packets représentatifs** (méthode WS-B2 : lexique au niveau de l'œuvre) — JAMAIS packet vide (règle INVALID_PACKET, DEC-013), JAMAIS dérivé de la prose scorée (anti-circularité).
4. **Déterminisme** : juge LLM à temp 0 (reproductibilité prouvée WS-B0c, std 0) + CALC déterministe → 100 % reproductible.
5. **Paliers dérivés par proportionnalité** : percentiles de la distribution maître par catégorie (ex. S = p90 maîtres, A = p50…), au lieu de nombres ronds. Comparer aux anciens (S=4.5 / composite≥93) → quantifier l'écart d'arbitraire.
6. **Provenance persistée** (contrat+packet+sha+version juge) pour rendre l'audit rejouable — cf. ADR provenance à venir.
7. **Shadow only** : aucun changement de SEAL/floor en production avant bench de non-régression (goldens, rejects, K2).

### Ce qu'il ne faut PAS faire
- Garder S=4.5 / composite≥93 comme dogme « parce que c'est ainsi » (non prouvé).
- Recalibrer sur le GB 0-5 (inversé, size-confounded) ou sur 3 œuvres.
- Baisser un seuil pour « faire passer » le moteur (anti-pattern scellé).
- Mesurer les maîtres à packet vide (referait le 0/57).

## VERDICT
- Statut : PASS (calibrage retrouvé, sources citées, arbitraire établi par les docs eux-mêmes).
- Confiance : Haute (RESULTS.json 3 maîtres + MULTI_SIZE + auto-critique 50 Nuances>Flaubert + S=4.5 quasi-inatteignable).
- Forces : répond à la question (oui, partiellement arbitraire + mince) ; relie au confound packet de WS-B ; propose une voie « vérité » reproductible à 100 %.
- Faiblesses : (1) le composite 0-100 maître n'a jamais été mesuré → l'« arbitraire » du SEAL≥93 est déduit, pas chiffré (WS-C le chiffrera) ; (2) le GB 0-5 et le composite 0-100 sont deux échelles à ne pas confondre ; (3) JUDGE_CALIBRATION_MULTI_SIZE.json non relu ligne-à-ligne ici (table prise de MASTER_KNOWLEDGE_BASE PARTIE 3).
- Risques restants : une recalibration mal faite (packet vide / corpus mince) reproduirait l'erreur d'origine → d'où la méthode WS-C stricte.
- Action requise : décision Architecte — GO WS-C (Master Composite Calibration, read-only/CALC + shadow) ? Aucune modif de seuil engagée ici.
