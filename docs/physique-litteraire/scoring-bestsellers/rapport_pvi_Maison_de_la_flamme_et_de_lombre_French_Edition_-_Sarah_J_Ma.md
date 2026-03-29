# RAPPORT PVI — Maison_de_la_flamme_et_de_lombre_French_Edition_-_Sarah_J_Maas
Langue : FR | Date : 2026-03-29 | Modele : MINIMAL v2 (cultural_FR)

## SCORES

| Variable | Score | Methode | Seuil critique | Statut |
|----------|-------|---------|----------------|--------|
| I | 0.1762 | PROXY-NLP | >= 0.65 | GOULOT |
| FL | 0.3028 | NLP-ROBUSTE-v2 | <= 0.25 | GOULOT |
| Omega | 0.7200 | SEMI-AUTO | >= 0.72 | OK |
| T | 0.3440 | proxy(1-DR) | >= 0.75 | GOULOT |
| MS | 0.7802 | NLP-ROBUSTE-v2 | >= 0.85 | GOULOT |
| N_rev | 3 | semi-auto | >= 2 | OK |
| S | 0.9190 | NLP-PARTIEL | — | — |
| U | 0.6500 | SEMI-AUTO | — | — |

## CALCULS

E_emo = 0.3321 | E_cog = 0.3031 | CE = 1.0959

R = 0.3051 | W = 0.3722 | Arc_rev = 1.00

Score etouffement FL x (1-Omega) = 0.0848 **ATTENTION: > 0.08 — risque abandon lecteur**

**PVI = 0.1034 | SP = 2.1/100**

## VERDICT

**Phase 1 : mort organique**

**Probabilite bestseller : 33.3% -> FAIL — pas de potentiel bestseller intrinseque**

## GOULOTS ACTIFS

- **GOULOT-I** : Protagoniste insuffisamment identifiable (actuel=0.18, seuil=0.55)
- **GOULOT-R** : Lecteur n'atteint probablement pas la fin (actuel=0.31, seuil=0.5)
- **GOULOT-W** : Transmissibilite nulle (actuel=0.37, seuil=0.5)

## TOP 3 LEVIERS

1. **I** +0.10 -> PVI +0.0416 (+40.2%)
2. **FL** -0.10 -> PVI +0.0264 (+25.5%)
3. **Omega** +0.10 -> PVI +0.0217 (+21.0%)

## DISTANCE ZONE OMEGA

| Variable | Actuel | Cible | Delta manquant | Statut |
|----------|--------|-------|----------------|--------|
| FL | 0.3028 | 0.25 | **-0.05** | MANQUE |
| MS | 0.7802 | 0.85 | **-0.07** | MANQUE |
| Omega | 0.7200 | 0.72 | OK | OK |
| I | 0.1762 | 0.65 | **-0.47** | MANQUE |
| T_proxy | 0.3440 | 0.75 | **-0.41** | MANQUE |
| N_rev | 3.0000 | 2 | OK | OK |

Reference Zone OMEGA: Hemingway PVI=2.441 / Fitzgerald PVI=1.699
