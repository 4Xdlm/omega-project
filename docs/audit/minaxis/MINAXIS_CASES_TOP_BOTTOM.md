# OMEGA — MINAXIS CASES (top/bottom par axe) — READ-ONLY

> 2026-05-31 · HEAD `d007c1db` · cas extraits de `MINAXIS_DISTRIBUTION.csv` (51 runs full-5-axes). Jugements subjectifs = **[HYPOTHÈSE]**.

Format : `source | scène | mots | comp | ECC | RCI | SII | IFI | AAI | MIN`.

## 1. RCI — BOTTOM 5 (RCI le plus bas)
```
m0b/scribe    | Le Gardien sc1 |  822 | 74.6 | 57.7 | 72.8 | 92.3 | 66.4 | 90.8 | MIN=ecc
m0b/sovereign | Le Gardien sc1 | 1808 | 81.0 | 68.8 | 74.2 | 91.2 | 92.7 | 90.8 | MIN=ecc
BOOK_V3       | Le Frère       | 1907 | 80.9 | 73.9 | 75.6 | 78.0 | 89.8 | 92.0 | MIN=ecc
m0b/sovereign | Le Gardien sc1 | 2082 | 80.7 | 64.5 | 76.2 | 91.5 | 97.3 | 92.0 | MIN=ecc
m0b/scribe    | Le Gardien sc1 | 1194 | 81.9 | 67.7 | 76.7 | 90.3 |100.0 | 92.0 | MIN=ecc
```
**[HYPOTHÈSE]** Les RCI les plus bas coïncident avec les ECC effondrés (« Le Gardien ») → quand le contrat émotionnel casse, le rythme/la signature en pâtissent aussi (prose désorganisée). Le bas-RCI n'est pas isolé ici.

## 2. RCI — TOP 5 (RCI le plus haut) — mais souvent RCI reste min_axis
```
BESTOF3       | confrontation  |  483 | 85.9 | 87.8 | 87.9 | 83.0 | 82.7 | 85.2 | MIN=ifi
BESTOF3       | contemplation  |  597 | 92.4 | 93.8 | 87.7 | 90.6 | 92.5 | 94.8 | MIN=rci
P311          | revelation     | 1985 | 89.2 | 84.7 | 87.7 | 91.5 |100.0 | 90.4 | MIN=ecc
m0b/sovereign | Le Gardien sc1 | 2137 | 84.5 | 71.0 | 87.6 | 92.2 |100.0 | 89.2 | MIN=ecc
BESTOF3       | confrontation  |  647 | 89.3 | 85.2 | 87.4 | 86.7 | 99.5 | 93.6 | MIN=ecc
```
**Fait** : même au **plus haut**, RCI plafonne à ~87.9 (jamais ≥88), et reste le min_axis dans plusieurs cas à ECC élevé. → confirme un **plafond structurel RCI** (capteur), pas une variation de qualité.

## 3. ECC — BOTTOM 5 = TOUS « Le Gardien » (pivot)
```
m0b/scribe    | Le Gardien sc1 |  783 | 77.8 | 57.3 | 79.0 | 91.2 | 92.2 | 90.4 | MIN=ecc
m0b/scribe    | Le Gardien sc1 |  822 | 74.6 | 57.7 | 72.8 | 92.3 | 66.4 | 90.8 | MIN=ecc
m0b/scribe    | Le Gardien sc1 |  746 | 78.7 | 59.9 | 79.8 | 89.5 | 89.4 | 92.0 | MIN=ecc
m0b/sovereign | Le Gardien sc1 | 2082 | 80.7 | 64.5 | 76.2 | 91.5 | 97.3 | 92.0 | MIN=ecc
m0b/scribe    | Le Gardien sc1 |  594 | 81.6 | 65.3 | 85.0 | 89.7 | 96.6 | 90.0 | MIN=ecc
```

## 4. ECC — TOP 5 = TOUS troves (contrats hand-built), RCI devient le min
```
BESTOF3       | contemplation  |  597 | 92.4 | 93.8 | 87.7 | 90.6 | 92.5 | 94.8 | MIN=rci
P311          | contemplation  | 1965 | 91.8 | 93.7 | 83.9 | 90.5 |100.0 | 92.0 | MIN=rci
BESTOF3       | menace         |  637 | 89.9 | 93.7 | 80.7 | 86.7 | 91.1 | 92.8 | MIN=rci
BOOK_V3       | La Clef        | 2073 | 90.1 | 93.4 | 79.0 | 88.2 |100.0 | 90.4 | MIN=rci
BESTOF3       | revelation     |  617 | 92.3 | 93.2 | 85.6 | 88.3 |100.0 | 94.8 | MIN=rci
```

**Constat décisif** : **BOTTOM-ECC = 100 % « Le Gardien » ; TOP-ECC = 100 % troves**. Le basculement ECC↔RCI est **binaire selon la scène/contrat**, pas un continuum de qualité. Les **deux moteurs** (sovereign+scribe) s'effondrent sur « Le Gardien » → facteur = scène/contrat (cf. `MINAXIS_FLOOR_AUDIT.md §3`).

## 5. Cas de référence demandés
- **5 runs M0.b** : ci-dessus (tous min=ECC). Prose : `docs/audit/metrology/m0b-runs/sample_sovereign.txt` (1808w, ECC 68.8), `sample_scribe.txt` (746w, ECC 59.9).
- **golden 93.2 / PROD_REVELATION / BOOK qwen / gemma** : non disponibles en full-5-axes (PROD_REVELATION = ECC-only ; goldens E2E = autre jeu d'axes 9-dim ; BOOK_FULL = axes à 0). → **données per-axe insuffisantes** pour ces cas (verdict E partiel, cf. traceability).

## 6. Lecture subjective [HYPOTHÈSE]
À longueur égale et contrat hand-built, RCI plafonne ~85-88 (capteur), pas par faiblesse de prose. Sur « Le Gardien », l'effondrement ECC simultané sur deux moteurs suggère un **contrat assemblé exigeant/mal-apparié** plutôt qu'une prose ratée — à confirmer par décomposition sous-axes (bench ECC dédié).

---
*Données brutes : `MINAXIS_DISTRIBUTION.csv`. Prose : `docs/audit/metrology/m0b-runs/`.*
