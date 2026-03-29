# RAPPORT PVI — Serge_-_Yasmina_Reza
Langue : FR | Date : 2026-03-29 | Modele : MINIMAL v2 (cultural_FR)

## SCORES

| Variable | Score | Methode | Seuil critique | Statut |
|----------|-------|---------|----------------|--------|
| I | 0.4437 | PROXY-NLP | >= 0.65 | GOULOT |
| FL | 0.8952 | NLP-ROBUSTE-v2 | <= 0.25 | GOULOT |
| Omega | 0.6000 | SEMI-AUTO | >= 0.72 | GOULOT |
| T | 0.3178 | proxy(1-DR) | >= 0.75 | GOULOT |
| MS | 0.6452 | NLP-ROBUSTE-v2 | >= 0.85 | GOULOT |
| N_rev | 3 | semi-auto | >= 2 | OK |
| S | 1.0000 | NLP-PARTIEL | — | — |
| U | 0.6500 | SEMI-AUTO | — | — |

## CALCULS

E_emo = 0.4576 | E_cog = 0.5826 | CE = 0.7855

R = 0.3886 | W = 0.4301 | Arc_rev = 1.00

Score etouffement FL x (1-Omega) = 0.3581 **ATTENTION: > 0.08 — risque abandon lecteur**

**PVI = 0.0373 | SP = 0.8/100**

## VERDICT

**Phase 1 : mort organique**

**Probabilite bestseller : 27.6% -> FAIL — pas de potentiel bestseller intrinseque**

## GOULOTS ACTIFS

- **GOULOT-I** : Protagoniste insuffisamment identifiable (actuel=0.44, seuil=0.55)
- **GOULOT-FL** : Friction lexicale bloque la retention (actuel=0.90, seuil=0.65)
- **GOULOT-R** : Lecteur n'atteint probablement pas la fin (actuel=0.39, seuil=0.5)
- **GOULOT-W** : Transmissibilite nulle (actuel=0.43, seuil=0.5)

## TOP 3 LEVIERS

1. **Omega** +0.10 -> PVI +0.0305 (+81.8%)
2. **FL** -0.10 -> PVI +0.0148 (+39.7%)
3. **I** +0.10 -> PVI +0.0121 (+32.4%)

## DISTANCE ZONE OMEGA

| Variable | Actuel | Cible | Delta manquant | Statut |
|----------|--------|-------|----------------|--------|
| FL | 0.8952 | 0.25 | **-0.65** | MANQUE |
| MS | 0.6452 | 0.85 | **-0.20** | MANQUE |
| Omega | 0.6000 | 0.72 | **-0.12** | MANQUE |
| I | 0.4437 | 0.65 | **-0.21** | MANQUE |
| T_proxy | 0.3178 | 0.75 | **-0.43** | MANQUE |
| N_rev | 3.0000 | 2 | OK | OK |

Reference Zone OMEGA: Hemingway PVI=2.441 / Fitzgerald PVI=1.699
