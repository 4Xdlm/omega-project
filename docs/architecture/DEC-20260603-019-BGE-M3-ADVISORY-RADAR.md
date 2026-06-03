# DEC-20260603-019 — bge-m3 = Radar géométrique advisory principal

**Statut** : ACCEPTÉ (Tribunal 2/2 IA + Architecte, 2026-06-03) · **Supersede** : composante "radar nomic" de [DEC-20260602-018](DEC-20260602-018-GEMMA-ADVISORY-NOMIC-RADAR.md)
**Standard** : S-1 · **Portée** : métrologie / radar qualité (OBJ1, OBJ4) · **Type** : advisory (PAS gate, PAS SEAL, PAS production gate)

## Contexte
S1D-bge (2026-06-03, commit `775771f8`) a re-mesuré le radar qualité géométrique sur le Gold-Set scellé (150 textes, 5 familles, SHA256 `4388b4b6`) avec bge-m3, même protocole que nomic (LOAO par auteur, AUC, bootstrap 2000 clusterisé auteur, permutation 1000).

## Preuves (mêmes Gold-Set, mêmes contrastes)

| Contraste | nomic AUC [IC95] | bge-m3 AUC [IC95] |
|---|---|---|
| MASTER_FR vs C_formulaic_FR | 0.821 [0.56–0.92] | **0.943 [0.78–0.98]** |
| MASTER_EN vs C_formulaic_EN | 0.860 [0.63–0.96] | 0.889 [0.65–0.96] |
| MASTER_FR vs D_pulp_réel_FR | 0.840 [0.55–0.91] | 0.796 [0.42–0.91] |

perm p=0.001 partout (les deux modèles).

## Décision
1. **bge-m3 = embedding radar géométrique advisory PRINCIPAL.**
2. **nomic-embed-text = comparateur / fallback historique** (conservé, non supprimé — EMP-17).
3. Usage **advisory uniquement** : radar de pré-tri / signal géométrique. **Aucun gate, aucun SEAL, aucune décision de production** fondée seul dessus.

## Justification (mécanisme)
bge-m3 franchit S-1 (AUC≥0.80 ET IC95-bas≥0.70) sur MASTER_FR vs C_formulaic_FR (0.943 [0.78–0.98]) — nomic non (IC-bas 0.56). La géométrie vectorielle multilingue de bge-m3 capture mieux la densité/architecture syntaxique de la haute littérature francophone vs littérature formulaïque.

## Limites (où ça échoue / risques)
- **Plafond mondial** : sur le contraste DUR maître-vs-pulp-publié-réel (D_FR), bge-m3 (0.796) ≤ nomic (0.84), les deux IC larges, plafonnant à ~0.80 — cohérent avec l'état de l'art (Underwood/van Cranenburgh ~0.70–0.77). **bge-m3 n'est PAS un oracle qualité absolu** ; il ne bat pas le plafond mondial sur le pulp réel.
- Mesuré sur fenêtres 1500 mots ; non testé sur œuvres entières.
- Advisory : ne remplace pas le juge gemma4 (DEC-018) pour les cas complexes.

## Conséquences
- Bascule du radar par défaut nomic→bge-m3 dans les futurs travaux métrologie/atelier (advisory).
- À re-tester : bge-m3 comme radar era-robuste (S1E modern-vs-modern tournait sur nomic 0.79).

## VERDICT
- Statut : PASS · Confiance : Haute (formulaic) / Moyenne (pulp réel = plafond)
- Forces : franchit S-1 sur FR formulaic ; bootstrap+permutation ; mêmes Gold-Set scellés.
- Faiblesses : pas supérieur sur le contraste dur ; advisory seulement ; fenêtre 1500w.
- Action requise : aucune (advisory acté). Interdits : pas de gate/SEAL/percentile/router fondés sur bge-m3.
