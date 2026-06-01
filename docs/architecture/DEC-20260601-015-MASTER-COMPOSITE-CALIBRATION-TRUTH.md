# DEC-20260601-015 — MASTER COMPOSITE CALIBRATION TRUTH

**Statut** : RATIFIED (vérité scellée, doc-only) — aucune promotion de seuil. Décision de promotion = WS-D + shadow bench.
**Date** : 2026-06-01 · **Standard** : NASA-Grade L4 / DO-178C Level A.
**Preuve** : WS-C (`docs/audit/calibration/WS_C_*`, commit `d133ff9c`), vérifié indépendamment (Tribunal Gemini, interpréteur Python : 0/95, max 90.51, médiane 79.72, p90 84.68 — concordants).

## 1. Vérité scellée

1. **L'ancien SEAL composite ≥ 93 est INVALIDÉ comme dogme de production.** Sur 95 passages / 15 œuvres / 11 maîtres, **0/95** atteignent 93. Max mesuré = **Proust 90.51**. Le seuil était posé **au-dessus de la distribution entière des chefs-d'œuvre** → ancrage aspirationnel, jamais mesuré.
2. Distribution composite maîtres (Option A, packets représentatifs, juge déterministe) : p25 76.5 · **p50 79.7** · p75 82.2 · **p90 84.7** · max 90.5.
3. Tous les anciens floors sont au-dessus des maîtres : composite≥93 (0/95), min_axis≥80 (p90 71.5), ecc≥88 (médiane 72). Seul **aai≥85** est sain (médiane 93.6).
4. **IFI = axe-tueur** (médiane 49.4 → plombe min_axis 49.2). Probable défaut contrat/packet (même classe que RCI/ECC).
5. Cross-validation : RCI mean 84.5 = WS-B2 packet-fair → harnais sain.

## 2. Décisions

- **D1** : SEAL 93 → reclassé **ASPIRATIONAL_SUPERHUMAN_TARGET**, retiré comme seuil de validation production.
- **D2** : paliers candidats composite (percentiles maîtres) = **S 84.7 / A 79.7 / B 76.5**, statut **CANDIDATE_SHADOW_ONLY**, aucune application production.
- **D3** : floors par axe **NON figés** (RCI/ECC/IFI encore suspects de confond contrat/packet). Pas de floor avant diagnostic.
- **D4** : **IFI** = prochain diagnostic (axe-tueur). 
- **D5** : aucune promotion avant **WS-D (OMEGA METROLOGY PRIME)** + shadow bench non-régression (goldens/rejects/K2).

## 3. Caveats (honnêteté)

Option A = contrat arc-œuvre → ECC légèrement optimiste (résidu circulaire) ; conclusion « seuils trop hauts » tient *a fortiori* (ECC médiane 72 ≪ 88). 3-4 parse-fails Ollama AAI (fallback, marginal). k=3 (déterministe).

## 4. Cross-références

- `NCR_RCI_SENSOR_DEFECT` : WS-C confirme RCI packet-fair ~84.5 (cohérent).
- `NCR_ECC_CONTRACT_SENSOR` : ECC maître médiane 72 ≪ floor 88, contrat-dépendant.
- **`NCR_IFI_AXIS_CONTRACT_DEPENDENCY`** (nouveau, OPEN) : IFI médiane 49.4 sur maîtres, axe-tueur, suspect contrat/packet — à diagnostiquer (Passe C / WS-D Phase 1).

## VERDICT
- Statut : RATIFIED (vérité ; aucun seuil promu).
- Confiance : Haute (95 mesures, vérif indépendante Tribunal, juge déterministe, RCI cross-validé).
- Forces : abat le dogme 93 sur preuve ; pose les candidats data-driven ; identifie IFI ; ouvre WS-D.
- Faiblesses : Option A optimiste ECC ; floors par axe non fixables avant diag IFI/ECC ; corpus 15 œuvres (WS-D élargira).
- Action requise : GO WS-D (protocole parfait) + Passe C (IFI). Aucun seuil production avant shadow bench.
