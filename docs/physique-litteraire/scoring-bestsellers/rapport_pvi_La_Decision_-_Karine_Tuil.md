# RAPPORT PVI — La_Decision_-_Karine_Tuil
Langue : FR | Date : 2026-03-29 | Modele : MINIMAL v2 (cultural_FR)

## SCORES

| Variable | Score | Methode | Seuil critique | Statut |
|----------|-------|---------|----------------|--------|
| I | 0.4724 | PROXY-NLP | >= 0.65 | GOULOT |
| FL | 0.2243 | NLP-ROBUSTE-v2 | <= 0.25 | OK |
| Omega | 0.6500 | SEMI-AUTO | >= 0.72 | GOULOT |
| T | 0.6976 | proxy(1-DR) | >= 0.75 | GOULOT |
| MS | 0.8146 | NLP-ROBUSTE-v2 | >= 0.85 | GOULOT |
| N_rev | 3 | semi-auto | >= 2 | OK |
| S | 0.9887 | NLP-PARTIEL | — | — |
| U | 0.6500 | SEMI-AUTO | — | — |

## CALCULS

E_emo = 0.6018 | E_cog = 0.2204 | CE = 2.7303

R = 0.5114 | W = 0.4676 | Arc_rev = 1.00

Score etouffement FL x (1-Omega) = 0.0785

**PVI = 0.5504 | SP = 11.0/100**

## VERDICT

**Phase 2 : niche viable**

**Probabilite bestseller : 51.4% -> BORDERLINE — signal ambigu**

## GOULOTS ACTIFS

- **GOULOT-I** : Protagoniste insuffisamment identifiable (actuel=0.47, seuil=0.55)
- **GOULOT-W** : Transmissibilite nulle (actuel=0.47, seuil=0.5)

## TOP 3 LEVIERS

1. **FL** -0.10 -> PVI +0.1971 (+35.8%)
2. **I** +0.10 -> PVI +0.1513 (+27.5%)
3. **Omega** +0.10 -> PVI +0.0913 (+16.6%)

## DISTANCE ZONE OMEGA

| Variable | Actuel | Cible | Delta manquant | Statut |
|----------|--------|-------|----------------|--------|
| FL | 0.2243 | 0.25 | OK | OK |
| MS | 0.8146 | 0.85 | **-0.04** | MANQUE |
| Omega | 0.6500 | 0.72 | **-0.07** | MANQUE |
| I | 0.4724 | 0.65 | **-0.18** | MANQUE |
| T_proxy | 0.6976 | 0.75 | **-0.05** | MANQUE |
| N_rev | 3.0000 | 2 | OK | OK |

Reference Zone OMEGA: Hemingway PVI=2.441 / Fitzgerald PVI=1.699
