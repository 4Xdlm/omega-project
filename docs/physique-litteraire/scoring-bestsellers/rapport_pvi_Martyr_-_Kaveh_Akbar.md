# RAPPORT PVI — Martyr_-_Kaveh_Akbar
Langue : EN | Date : 2026-03-30 | Modele : MINIMAL v2 (cultural_EN)

## SCORES

| Variable | Score | Methode | Seuil critique | Statut |
|----------|-------|---------|----------------|--------|
| I | 0.6524 | PROXY-NLP-v3 | >= 0.65 | OK |
| FL | 0.2108 | NLP-ROBUSTE-v2 | <= 0.25 | OK |
| Omega | 0.5200 | SEMI-AUTO | >= 0.72 | GOULOT |
| T | 0.3304 | proxy(1-DR) | >= 0.75 | GOULOT |
| MS | 0.8549 | NLP-ROBUSTE-v3 | >= 0.85 | OK |
| N_rev | 3 | semi-auto | >= 2 | OK |
| S | 1.0000 | NLP-PARTIEL | — | — |
| U | 0.6500 | SEMI-AUTO | — | — |

## CALCULS

E_emo = 0.5558 | E_cog = 0.2610 | CE = 2.1295

R = 0.4688 | W = 0.4836 | Arc_rev = 1.00

Score etouffement FL x (1-Omega) = 0.1012 **ATTENTION: > 0.08 — risque abandon lecteur**

**PVI = 0.3851 | SP = 7.7/100**

## VERDICT

**Phase 2 : niche viable**

**Probabilite bestseller : 40.3% -> FAIL — pas de potentiel bestseller intrinseque**

## GOULOTS ACTIFS

- **GOULOT-R** : Lecteur n'atteint probablement pas la fin (actuel=0.47, seuil=0.5)
- **GOULOT-W** : Transmissibilite nulle (actuel=0.48, seuil=0.5)

## TOP 3 LEVIERS

1. **FL** -0.10 -> PVI +0.1329 (+34.5%)
2. **I** +0.10 -> PVI +0.1062 (+27.6%)
3. **Omega** +0.10 -> PVI +0.0622 (+16.2%)

## DISTANCE ZONE OMEGA

| Variable | Actuel | Cible | Delta manquant | Statut |
|----------|--------|-------|----------------|--------|
| FL | 0.2108 | 0.25 | OK | OK |
| MS | 0.8549 | 0.85 | OK | OK |
| Omega | 0.5200 | 0.72 | **-0.20** | MANQUE |
| I | 0.6524 | 0.65 | OK | OK |
| T_proxy | 0.3304 | 0.75 | **-0.42** | MANQUE |
| N_rev | 3.0000 | 2 | OK | OK |

Reference Zone OMEGA: Hemingway PVI=2.441 / Fitzgerald PVI=1.699
