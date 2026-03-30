# RAPPORT PVI — Jacaranda_French_Edition_-_Gael_faye
Langue : FR | Date : 2026-03-30 | Modele : MINIMAL v2 (cultural_FR)

## SCORES

| Variable | Score | Methode | Seuil critique | Statut |
|----------|-------|---------|----------------|--------|
| I | 0.3803 | PROXY-NLP-v3 | >= 0.65 | GOULOT |
| FL | 0.2745 | NLP-ROBUSTE-v2 | <= 0.25 | GOULOT |
| Omega | 0.6500 | SEMI-AUTO | >= 0.72 | GOULOT |
| T | 0.6342 | proxy(1-DR) | >= 0.75 | GOULOT |
| MS | 0.8592 | NLP-ROBUSTE-v3 | >= 0.85 | OK |
| N_rev | 3 | semi-auto | >= 2 | OK |
| S | 0.9798 | NLP-PARTIEL | — | — |
| U | 0.6500 | SEMI-AUTO | — | — |

## CALCULS

E_emo = 0.5324 | E_cog = 0.2406 | CE = 2.2126

R = 0.4580 | W = 0.4267 | Arc_rev = 1.00

Score etouffement FL x (1-Omega) = 0.0961 **ATTENTION: > 0.08 — risque abandon lecteur**

**PVI = 0.3493 | SP = 7.0/100**

## VERDICT

**Phase 2 : niche viable**

**Probabilite bestseller : 44.5% -> FAIL — pas de potentiel bestseller intrinseque**

## GOULOTS ACTIFS

- **GOULOT-I** : Protagoniste insuffisamment identifiable (actuel=0.38, seuil=0.55)
- **GOULOT-R** : Lecteur n'atteint probablement pas la fin (actuel=0.46, seuil=0.5)
- **GOULOT-W** : Transmissibilite nulle (actuel=0.43, seuil=0.5)

## TOP 3 LEVIERS

1. **FL** -0.10 -> PVI +0.1140 (+32.6%)
2. **I** +0.10 -> PVI +0.1067 (+30.5%)
3. **Omega** +0.10 -> PVI +0.0670 (+19.2%)

## DISTANCE ZONE OMEGA

| Variable | Actuel | Cible | Delta manquant | Statut |
|----------|--------|-------|----------------|--------|
| FL | 0.2745 | 0.25 | **-0.02** | MANQUE |
| MS | 0.8592 | 0.85 | OK | OK |
| Omega | 0.6500 | 0.72 | **-0.07** | MANQUE |
| I | 0.3803 | 0.65 | **-0.27** | MANQUE |
| T_proxy | 0.6342 | 0.75 | **-0.12** | MANQUE |
| N_rev | 3.0000 | 2 | OK | OK |

Reference Zone OMEGA: Hemingway PVI=2.441 / Fitzgerald PVI=1.699
