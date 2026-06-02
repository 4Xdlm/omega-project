# WS-D R3 — SHADOW DECOUPLE BENCH (O2) : RÉSULTATS & VERDICT

**Date** : 2026-06-02 · **Run** : terminal Architecte, qwen3:32b, 18 passages (maitres/badprose/bestsellers × FR/EN × 3 livres, 600 mots)
**Artefacts** : `WS_D_R3_SHADOW_DECOUPLE.{jsonl,json,csv}` · script `scripts/metrology/wsd-r3-shadow-decouple-bench.ts`
**Méthode** : 5 axes scorés via pipeline ; min_axis/composite/verdict recalculés legacy vs O2 (IFI=attention×0.5+fatigue×0.5), SANS patch moteur.

---

## 1. Résultats par famille

| famille | IFI binding % | IFI legacy→O2 | min_axis legacy→O2 (Δ) | composite legacy→O2 | SEAL legacy→O2 |
|---|---|---|---|---|---|
| maitres | 100 % | 44→100 | 44.1 → **56.4 (+12.3)** | 70.8 → 76.4 | 0 → 0 |
| badprose | 100 % | 47→100 | 47.5 → 59.5 (+12.0) | 72.1 → 77.3 | 0 → 0 |
| bestsellers | 67 % | 45→100 | 42.5 → 50.7 (+8.2) | 68.9 → 74.5 | 0 → 0 |

## 2. Verdict O2 (sur sa question étroite) : PASS

- **IFI était l'axe contraignant 100 % chez maîtres ET badprose** → floor de densité **universel** (pas un biais anti-maîtres),
  confirme WS-C (IFI médiane 49 = axe-tueur). Le retirer relève le min_axis de **+8 à +12** sur les 3 familles.
- **La mauvaise prose ne gagne AUCUN SEAL** (0→0) : O2 n'ouvre pas la porte à la pulp.
- → **O2 est un découplage SÛR.** Health-check `maitres_min_axis_rises=true`, `badprose_no_new_seal=true`.

## 3. Caveats de rigueur (METRIC_HONESTY — ne pas survendre)

**C1 — O2 nécessaire mais NON suffisant.** Après O2, l'axe contraignant devient **ECC** (maîtres min_axis_o2 56 ≈ leur ECC
44-63). Cet ECC est bas à cause du **packet gardien (contrat target_14d plat)** = confound WS-A.2. Donc O2 seul **ne fait pas
passer les maîtres** (restent REJECT). O2 déplace le tueur d'IFI → ECC.

**C2 — ce bench ne prouve PAS le classement qualité.** Sous ce packet, **badprose composite_o2 (77.3) ≥ maîtres (76.4)** et
badprose min_axis_o2 (59.5) > maîtres (56.4). Aucun axe ne sépare ici la pulp des maîtres → confound de packet dégénéré
(probe 600 mots hors-contrat, cf WS-A.2/WS-B), **distinct de la question O2**. Le scorer global, sous ce packet, ne classe
pas la qualité — ce n'est ni prouvé ni réfuté par ce run, c'est hors de sa portée.

## 4. Ce que ça change / ne change pas

- **CHANGE** : valide que sensory-density (axe IFII tel quel) est un floor défectueux universel à retirer du min_axis (O2).
  Décision DEC-016 §1 confortée empiriquement (3 familles).
- **NE CHANGE PAS** : la capacité du scorer à classer la qualité (bloquée par le confound packet ECC/contrat — chantiers
  DEC-011 contrat + WS-B2 packets représentatifs + DEC-015 paliers, séparés de DEC-016).

## 5. Décision (Architecte)

O2 est prêt à être codé en **shadow flag-gaté** (`OMEGA_SENSORY_DECOUPLE='shadow'` défaut, jamais cassant), patch fourni
en `.patch` pour terminal Architecte (wrapper test, EMP-10). Deux voies :

- **(A) GO patch O2 maintenant** (shadow default) — le découplage est prouvé sûr sur 3 familles ; le shadow en prod loguera
  le delta sans rien casser, en vue d'un flip ultérieur.
- **(B) D'abord re-bencher O2 avec packets REPRÉSENTATIFS** (WS-B2 : signature_words réels + contrat correct) pour confirmer
  sous conditions réalistes avant le patch — lève le confound C1/C2 mais ne conditionne PAS la sûreté de O2 (déjà établie).

**Recommandation** : **(A)** pour le patch O2 (sa sûreté est prouvée, shadow = zéro risque) **+** ouvrir en parallèle le
chantier « packets représentatifs / contrat » (C1/C2) qui est la VRAIE cause restante du REJECT des maîtres — mais qui
relève de DEC-011/WS-B2/DEC-015, pas de DEC-016.

## 6. Gates

EMP-16/EMP-10 : aucun code moteur tant que pas de patch ratifié + wrapper test terminal. Le shadow ne change aucun verdict
prod. Seuils inchangés (DEC-015). Reclassement, pas suppression (sensory/corporeal/focalisation restent calculés, advisory).
