# RAPPORT PVI — chunk_01
Langue : FR | Date : 2026-03-30 | Modele : MINIMAL v2 (cultural_FR)

## SCORES

| Variable | Score | Methode | Seuil critique | Statut |
|----------|-------|---------|----------------|--------|
| I | 0.1197 | PROXY-NLP-v3 | >= 0.65 | GOULOT |
| FL | 0.3688 | NLP-ROBUSTE-v2 | <= 0.25 | GOULOT |
| Omega | 0.0000 | ASSISTE | >= 0.72 | GOULOT |
| T | 0.5977 | proxy(1-DR) | >= 0.75 | GOULOT |
| MS | 0.7298 | NLP-ROBUSTE-v3 | >= 0.85 | GOULOT |
| N_rev | 7 | semi-auto | >= 2 | OK |
| S | 0.8006 | NLP-PARTIEL | — | — |
| U | 0.6500 | ASSISTE | — | — |

## CALCULS

E_emo = 0.3621 | E_cog = 0.2724 | CE = 1.3290

R = 0.4005 | W = 0.1126 | Arc_rev = 1.20

Score etouffement FL x (1-Omega) = 0.3688 **ATTENTION: > 0.08 — risque abandon lecteur**

**PVI = 0.0189 | SP = 0.4/100**

## VERDICT

**Phase 1 : mort organique**

**Probabilite bestseller : 7.0% -> FAIL — pas de potentiel bestseller intrinseque**

## GOULOTS ACTIFS

- **GOULOT-I** : Protagoniste insuffisamment identifiable (actuel=0.12, seuil=0.55)
- **GOULOT-Omega** : Fin ne declenche pas la recommandation (actuel=0.00, seuil=0.45)
- **GOULOT-R** : Lecteur n'atteint probablement pas la fin (actuel=0.40, seuil=0.5)
- **GOULOT-W** : Transmissibilite nulle (actuel=0.11, seuil=0.5)

## TOP 3 LEVIERS

1. **FL** -0.10 -> PVI +0.0212 (+112.2%)
2. **Omega** +0.10 -> PVI +0.0099 (+52.4%)
3. **I** +0.10 -> PVI +0.0085 (+45.0%)

## DISTANCE ZONE OMEGA

| Variable | Actuel | Cible | Delta manquant | Statut |
|----------|--------|-------|----------------|--------|
| FL | 0.3688 | 0.25 | **-0.12** | MANQUE |
| MS | 0.7298 | 0.85 | **-0.12** | MANQUE |
| Omega | 0.0000 | 0.72 | **-0.72** | MANQUE |
| I | 0.1197 | 0.65 | **-0.53** | MANQUE |
| T_proxy | 0.5977 | 0.75 | **-0.15** | MANQUE |
| N_rev | 7.0000 | 2 | OK | OK |

Reference Zone OMEGA: Hemingway PVI=2.441 / Fitzgerald PVI=1.699
