# RAPPORT PVI — Houris_French_Edition_-_Kamel_Daoud
Langue : FR | Date : 2026-03-30 | Modele : MINIMAL v2 (cultural_FR)

## SCORES

| Variable | Score | Methode | Seuil critique | Statut |
|----------|-------|---------|----------------|--------|
| I | 0.4456 | PROXY-NLP-v3 | >= 0.65 | GOULOT |
| FL | 0.2708 | NLP-ROBUSTE-v2 | <= 0.25 | GOULOT |
| Omega | 0.5000 | SEMI-AUTO | >= 0.72 | GOULOT |
| T | 0.5844 | proxy(1-DR) | >= 0.75 | GOULOT |
| MS | 0.8674 | NLP-ROBUSTE-v3 | >= 0.85 | OK |
| N_rev | 3 | semi-auto | >= 2 | OK |
| S | 0.9376 | NLP-PARTIEL | — | — |
| U | 0.6500 | SEMI-AUTO | — | — |

## CALCULS

E_emo = 0.5403 | E_cog = 0.1994 | CE = 2.7093

R = 0.4675 | W = 0.3827 | Arc_rev = 1.00

Score etouffement FL x (1-Omega) = 0.1354 **ATTENTION: > 0.08 — risque abandon lecteur**

**PVI = 0.3535 | SP = 7.1/100**

## VERDICT

**Phase 2 : niche viable**

**Probabilite bestseller : 37.2% -> FAIL — pas de potentiel bestseller intrinseque**

## GOULOTS ACTIFS

- **GOULOT-I** : Protagoniste insuffisamment identifiable (actuel=0.45, seuil=0.55)
- **GOULOT-R** : Lecteur n'atteint probablement pas la fin (actuel=0.47, seuil=0.5)
- **GOULOT-W** : Transmissibilite nulle (actuel=0.38, seuil=0.5)

## TOP 3 LEVIERS

1. **FL** -0.10 -> PVI +0.1600 (+45.3%)
2. **I** +0.10 -> PVI +0.1099 (+31.1%)
3. **Omega** +0.10 -> PVI +0.0741 (+21.0%)

## DISTANCE ZONE OMEGA

| Variable | Actuel | Cible | Delta manquant | Statut |
|----------|--------|-------|----------------|--------|
| FL | 0.2708 | 0.25 | **-0.02** | MANQUE |
| MS | 0.8674 | 0.85 | OK | OK |
| Omega | 0.5000 | 0.72 | **-0.22** | MANQUE |
| I | 0.4456 | 0.65 | **-0.20** | MANQUE |
| T_proxy | 0.5844 | 0.75 | **-0.17** | MANQUE |
| N_rev | 3.0000 | 2 | OK | OK |

Reference Zone OMEGA: Hemingway PVI=2.441 / Fitzgerald PVI=1.699
