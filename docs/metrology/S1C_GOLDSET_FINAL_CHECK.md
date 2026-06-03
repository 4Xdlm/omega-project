# S1C — GOLD-SET FINAL CHECK

Seal SHA256 manifest: `4388b4b6e5b91d4d2494c22b1036ac0c53c0ae1d6aa5f90655e5f929590c45b4`

| Famille | n | auteurs |
|---|---|---|
| C_FORMULAIC_EN | 30 | 30 |
| C_FORMULAIC_FR | 30 | 26 |
| D_SOURCE_REAL_FR | 30 | 15 |
| MASTER_NATIVE_EN | 30 | 17 |
| MASTER_NATIVE_FR | 30 | 18 |

## Critères PASS S1C

- [x] 150 entrées
- [x] 0 multi-clé auteur
- [x] 0 fuite inter-cellules
- [x] 0 word_count hors plage

## Aucune issue — SCELLABLE

## Décisions actées (Tribunal)
- n=30/cellule (pas 50).
- pas de cellule D anglaise (D_EN réel absent) -> bas EN = C_FORMULAIC_EN.
- livres_payants = MODERN_MASTER_HOLDOUT (hors Gold-Set principal, test externe S1E).
- Contraste FR = maître vs pulp publié réel (fort). Contraste EN = maître vs genre mid (subtil).
- Aucune prose reproduite (copyright).