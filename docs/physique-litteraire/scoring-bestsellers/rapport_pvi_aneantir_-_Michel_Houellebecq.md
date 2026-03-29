# RAPPORT PVI — aneantir_-_Michel_Houellebecq
Langue : FR | Date : 2026-03-29 | Modele : MINIMAL v2 (cultural_FR)

## SCORES

| Variable | Score | Methode | Seuil critique | Statut |
|----------|-------|---------|----------------|--------|
| I | 0.1943 | PROXY-NLP | >= 0.65 | GOULOT |
| FL | 0.2550 | NLP-ROBUSTE-v2 | <= 0.25 | GOULOT |
| Omega | 0.5800 | SEMI-AUTO | >= 0.72 | GOULOT |
| T | 0.5738 | proxy(1-DR) | >= 0.75 | GOULOT |
| MS | 0.8164 | NLP-ROBUSTE-v2 | >= 0.85 | GOULOT |
| N_rev | 3 | semi-auto | >= 2 | OK |
| S | 0.9944 | NLP-PARTIEL | — | — |
| U | 0.6500 | SEMI-AUTO | — | — |

## CALCULS

E_emo = 0.4242 | E_cog = 0.2613 | CE = 1.6232

R = 0.3729 | W = 0.3164 | Arc_rev = 1.00

Score etouffement FL x (1-Omega) = 0.1071 **ATTENTION: > 0.08 — risque abandon lecteur**

**PVI = 0.1505 | SP = 3.0/100**

## VERDICT

**Phase 1 : mort organique**

**Probabilite bestseller : 30.7% -> FAIL — pas de potentiel bestseller intrinseque**

## GOULOTS ACTIFS

- **GOULOT-I** : Protagoniste insuffisamment identifiable (actuel=0.19, seuil=0.55)
- **GOULOT-R** : Lecteur n'atteint probablement pas la fin (actuel=0.37, seuil=0.5)
- **GOULOT-W** : Transmissibilite nulle (actuel=0.32, seuil=0.5)

## TOP 3 LEVIERS

1. **I** +0.10 -> PVI +0.0566 (+37.6%)
2. **FL** -0.10 -> PVI +0.0503 (+33.4%)
3. **Omega** +0.10 -> PVI +0.0324 (+21.5%)

## DISTANCE ZONE OMEGA

| Variable | Actuel | Cible | Delta manquant | Statut |
|----------|--------|-------|----------------|--------|
| FL | 0.2550 | 0.25 | **-0.01** | MANQUE |
| MS | 0.8164 | 0.85 | **-0.03** | MANQUE |
| Omega | 0.5800 | 0.72 | **-0.14** | MANQUE |
| I | 0.1943 | 0.65 | **-0.46** | MANQUE |
| T_proxy | 0.5738 | 0.75 | **-0.18** | MANQUE |
| N_rev | 3.0000 | 2 | OK | OK |

Reference Zone OMEGA: Hemingway PVI=2.441 / Fitzgerald PVI=1.699
