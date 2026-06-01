# OMEGA — INTERCONNEXIONS INTER-AXES (matrice de corrélation, 95 mesures maîtres)

**Date** : 2026-06-01 · CALC autonome depuis `WS_C_MEASURES.jsonl`. Outil : `scripts/metrology/wsd-axis-correlation.ts`.
**Point Architecte** : « interconnexions dans les mesures si elles existent dans la vérité ».

## 1. Matrice Pearson (axes)
```
        ecc   rci   sii   ifi   aai
ecc    1.00  0.09  0.48  0.27  0.08
rci    0.09  1.00  0.10 -0.16  0.15
sii    0.48  0.10  1.00  0.06  0.11
ifi    0.27 -0.16  0.06  1.00 -0.35
aai    0.08  0.15  0.11 -0.35  1.00
```

## 2. Findings
1. **Aucune redondance forte axe-axe** (max |r| = ecc↔sii 0.48 ; tout le reste < 0.5). → Les 5 axes sont **quasi orthogonaux** : le composite **ne double-compte PAS**. Le design multi-axes est sain au niveau structurel.
2. **composite ≈ ECC** : r(ecc, composite) = **0.96**. Le composite est, en variance, un quasi-thermomètre de l'ECC (poids 0.33 + variance dominante). Les autres : sii 0.54, ifi 0.36, aai 0.21, rci 0.20.
3. **min_axis ≈ IFI** : r(ifi, min_axis) = **0.92**. L'IFI est presque toujours l'axe minimum → le gate `min_axis≥80` est en réalité un gate **`IFI≥80`**.
4. **Légère anti-corrélation ifi ↔ aai = −0.35** : immersion-force et authenticité s'opposent un peu (à creuser : un texte très « immersif keyword » paraît-il moins authentique ?).
5. **rci quasi-indépendant** (0.04-0.20 partout) : axe orthogonal.

## 3. Le câble critique (analyse « vis-à-vis »)
```
SEAL.min_axis  ← (r0.92) IFI  ← sensory_richness (keyword FR-only) + corporeal_anchoring (keyword)
SEAL.composite ← (r0.96) ECC  ← tension_14d (contrat-dépendant)
```
Les **deux portes du SEAL** sont chacune dominées par un seul axe, et ce sont les deux axes de la classe « dépendante/malade » (IFI keyword, ECC contrat). → **Mécanisme structurel** du 0/95 : `min_axis≥80` = `IFI≥80`, inatteignable car IFI mesure un lexique sensoriel FR ; et le composite suit l'ECC contrat-dépendant.

## 4. Implication reconstruction
- Assainir IFI (R1) **change directement le min_axis** (puisque min_axis≈IFI) → priorité haute.
- Le composite étant ECC-dominé, fiabiliser le contrat ECC (DEC-011) **fiabilise le composite**.
- Orthogonalité confirmée → garder 5 axes distincts (pas de fusion), mais **repondérer** selon l'information réelle (rci peu corrélé au composite r0.20 → sous-pesé ? à décider en WS-D Phase 5).

## VERDICT
- Statut : PASS (matrice calculée, câbles tracés).
- Confiance : Haute (95 mesures, Pearson+Spearman concordants).
- Forces : prouve l'orthogonalité (pas de double-compte) ET identifie les 2 axes-pivots (ECC→composite, IFI→min_axis) ; relie le 0/95 à un mécanisme structurel.
- Faiblesses : (1) n=95, Option A (ECC optimiste) → corrélations à reconfirmer sur corpus WS-D élargi + Option B ; (2) anti-corrélation ifi↔aai à investiguer.
- Action requise : intégrer à WS-D Phase 5 (repondération informée). Assainir IFI = levier direct du min_axis.
