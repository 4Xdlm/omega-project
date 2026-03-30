# RAPPORT PVI — La_Decision_-_Karine_Tuil
Langue : FR | Date : 2026-03-30 | Modele : MINIMAL v2 (cultural_FR)

## SCORES

| Variable | Score | Methode | Seuil critique | Statut |
|----------|-------|---------|----------------|--------|
| I | 0.4014 | PROXY-NLP-v3 | >= 0.65 | GOULOT |
| FL | 0.2243 | NLP-ROBUSTE-v2 | <= 0.25 | OK |
| Omega | 0.6500 | SEMI-AUTO | >= 0.72 | GOULOT |
| T | 0.6976 | proxy(1-DR) | >= 0.75 | GOULOT |
| MS | 0.8843 | NLP-ROBUSTE-v3 | >= 0.85 | OK |
| N_rev | 3 | semi-auto | >= 2 | OK |
| S | 0.9887 | NLP-PARTIEL | — | — |
| U | 0.6500 | SEMI-AUTO | — | — |

## CALCULS

E_emo = 0.5660 | E_cog = 0.2165 | CE = 2.6141

R = 0.4848 | W = 0.4360 | Arc_rev = 1.00

Score etouffement FL x (1-Omega) = 0.0785

**PVI = 0.4658 | SP = 9.3/100**

## VERDICT

**Phase 2 : niche viable**

**Probabilite bestseller : 47.8% -> FAIL — pas de potentiel bestseller intrinseque**

## GOULOTS ACTIFS

- **GOULOT-I** : Protagoniste insuffisamment identifiable (actuel=0.40, seuil=0.55)
- **GOULOT-R** : Lecteur n'atteint probablement pas la fin (actuel=0.48, seuil=0.5)
- **GOULOT-W** : Transmissibilite nulle (actuel=0.44, seuil=0.5)

## TOP 3 LEVIERS

1. **FL** -0.10 -> PVI +0.1633 (+35.1%)
2. **I** +0.10 -> PVI +0.1367 (+29.3%)
3. **Omega** +0.10 -> PVI +0.0806 (+17.3%)

## DISTANCE ZONE OMEGA

| Variable | Actuel | Cible | Delta manquant | Statut |
|----------|--------|-------|----------------|--------|
| FL | 0.2243 | 0.25 | OK | OK |
| MS | 0.8843 | 0.85 | OK | OK |
| Omega | 0.6500 | 0.72 | **-0.07** | MANQUE |
| I | 0.4014 | 0.65 | **-0.25** | MANQUE |
| T_proxy | 0.6976 | 0.75 | **-0.05** | MANQUE |
| N_rev | 3.0000 | 2 | OK | OK |

Reference Zone OMEGA: Hemingway PVI=2.441 / Fitzgerald PVI=1.699
