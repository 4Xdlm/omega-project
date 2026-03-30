# RAPPORT PVI — chunk_02
Langue : FR | Date : 2026-03-30 | Modele : MINIMAL v2 (cultural_FR)

## SCORES

| Variable | Score | Methode | Seuil critique | Statut |
|----------|-------|---------|----------------|--------|
| I | 0.0983 | PROXY-NLP-v3 | >= 0.65 | GOULOT |
| FL | 0.4418 | NLP-ROBUSTE-v2 | <= 0.25 | GOULOT |
| Omega | 0.0000 | ASSISTE | >= 0.72 | GOULOT |
| T | 0.5954 | proxy(1-DR) | >= 0.75 | GOULOT |
| MS | 0.7389 | NLP-ROBUSTE-v3 | >= 0.85 | GOULOT |
| N_rev | 3 | semi-auto | >= 2 | OK |
| S | 0.4753 | NLP-PARTIEL | — | — |
| U | 0.6500 | ASSISTE | — | — |

## CALCULS

E_emo = 0.2956 | E_cog = 0.3438 | CE = 0.8599

R = 0.3457 | W = 0.1088 | Arc_rev = 1.00

Score etouffement FL x (1-Omega) = 0.4418 **ATTENTION: > 0.08 — risque abandon lecteur**

**PVI = 0.0038 | SP = 0.1/100**

## VERDICT

**Phase 1 : mort organique**

**Probabilite bestseller : 6.3% -> FAIL — pas de potentiel bestseller intrinseque**

## GOULOTS ACTIFS

- **GOULOT-I** : Protagoniste insuffisamment identifiable (actuel=0.10, seuil=0.55)
- **GOULOT-Omega** : Fin ne declenche pas la recommandation (actuel=0.00, seuil=0.45)
- **GOULOT-R** : Lecteur n'atteint probablement pas la fin (actuel=0.35, seuil=0.5)
- **GOULOT-W** : Transmissibilite nulle (actuel=0.11, seuil=0.5)

## TOP 3 LEVIERS

1. **FL** -0.10 -> PVI +0.0080 (+210.5%)
2. **Omega** +0.10 -> PVI +0.0041 (+107.9%)
3. **I** +0.10 -> PVI +0.0019 (+50.0%)

## DISTANCE ZONE OMEGA

| Variable | Actuel | Cible | Delta manquant | Statut |
|----------|--------|-------|----------------|--------|
| FL | 0.4418 | 0.25 | **-0.19** | MANQUE |
| MS | 0.7389 | 0.85 | **-0.11** | MANQUE |
| Omega | 0.0000 | 0.72 | **-0.72** | MANQUE |
| I | 0.0983 | 0.65 | **-0.55** | MANQUE |
| T_proxy | 0.5954 | 0.75 | **-0.15** | MANQUE |
| N_rev | 3.0000 | 2 | OK | OK |

Reference Zone OMEGA: Hemingway PVI=2.441 / Fitzgerald PVI=1.699
