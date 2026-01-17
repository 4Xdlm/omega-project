# GENESIS CHARTER — OMEGA v4.x

## 1. Mission v4.x
OMEGA v4.x a pour mission de **préserver la fiabilité, la lisibilité et la gouvernance**
d'un système certifié, tout en permettant des évolutions maîtrisées, auditables et réversibles.

OMEGA n'est plus en phase de construction.
OMEGA est en phase de **pérennisation**.

## 2. Anti-Mission (Interdits Absolus)
OMEGA v4.x ne doit JAMAIS :
- Réécrire ou "améliorer" un coeur certifié sans processus v2
- Introduire de la magie implicite ou des comportements non documentés
- Sacrifier la traçabilité au profit de la vitesse
- Ajouter une feature sans preuve d'utilité mesurable
- Dégrader la compréhension globale au profit d'un gain local

## 3. Axes d'évolution AUTORISÉS
| Axe | Exemple |
|-----|---------|
| Observabilité | Events opt-in, métriques |
| Tooling DX | Scripts, ergonomie |
| Performance | Bench + baseline obligatoire |
| Documentation | Gouvernance, audit |
| Extensions | Modules périphériques non intrusifs |

## 4. Axes d'évolution INTERDITS
| Interdit | Raison |
|----------|--------|
| Refactor massif du coeur | Risque certification |
| Changement paradigme implicite | Perte traçabilité |
| Fusion de responsabilités | Couplage |
| Optimisations non mesurées | Dette invisible |
| "On verra plus tard" | Dette explicite |

## 5. Principe Directeur
```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   OMEGA doit pouvoir être compris, audité et maintenu                         ║
║   dans 5 ans par une autre équipe.                                            ║
║                                                                               ║
║   Ce principe prévaut sur toute autre considération.                          ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```
