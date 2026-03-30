# RAPPORT PVI — Linstant_present_-_Guillaume_Musso
Langue : FR | Date : 2026-03-30 | Modele : MINIMAL v2 (cultural_FR)

## SCORES

| Variable | Score | Methode | Seuil critique | Statut |
|----------|-------|---------|----------------|--------|
| I | 0.4057 | PROXY-NLP-v3 | >= 0.65 | GOULOT |
| FL | 0.3235 | NLP-ROBUSTE-v2 | <= 0.25 | GOULOT |
| Omega | 0.7500 | SEMI-AUTO | >= 0.72 | OK |
| T | 0.6769 | proxy(1-DR) | >= 0.75 | GOULOT |
| MS | 0.8622 | NLP-ROBUSTE-v3 | >= 0.85 | OK |
| N_rev | 3 | semi-auto | >= 2 | OK |
| S | 1.0000 | NLP-PARTIEL | — | — |
| U | 0.6500 | SEMI-AUTO | — | — |

## CALCULS

E_emo = 0.5630 | E_cog = 0.2422 | CE = 2.3244

R = 0.4802 | W = 0.4876 | Arc_rev = 1.00

Score etouffement FL x (1-Omega) = 0.0809 **ATTENTION: > 0.08 — risque abandon lecteur**

**PVI = 0.4562 | SP = 9.1/100**

## VERDICT

**Phase 2 : niche viable**

**Probabilite bestseller : 52.3% -> BORDERLINE — signal ambigu**

## GOULOTS ACTIFS

- **GOULOT-I** : Protagoniste insuffisamment identifiable (actuel=0.41, seuil=0.55)
- **GOULOT-R** : Lecteur n'atteint probablement pas la fin (actuel=0.48, seuil=0.5)
- **GOULOT-W** : Transmissibilite nulle (actuel=0.49, seuil=0.5)

## TOP 3 LEVIERS

1. **FL** -0.10 -> PVI +0.1329 (+29.1%)
2. **I** +0.10 -> PVI +0.1288 (+28.2%)
3. **Omega** +0.10 -> PVI +0.0855 (+18.7%)

## DISTANCE ZONE OMEGA

| Variable | Actuel | Cible | Delta manquant | Statut |
|----------|--------|-------|----------------|--------|
| FL | 0.3235 | 0.25 | **-0.07** | MANQUE |
| MS | 0.8622 | 0.85 | OK | OK |
| Omega | 0.7500 | 0.72 | OK | OK |
| I | 0.4057 | 0.65 | **-0.24** | MANQUE |
| T_proxy | 0.6769 | 0.75 | **-0.07** | MANQUE |
| N_rev | 3.0000 | 2 | OK | OK |

Reference Zone OMEGA: Hemingway PVI=2.441 / Fitzgerald PVI=1.699
