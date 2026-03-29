# RAPPORT PVI — Sauve_French_Edition_-_Musso_Guillaume
Langue : FR | Date : 2026-03-29 | Modele : MINIMAL v2 (cultural_FR)

## SCORES

| Variable | Score | Methode | Seuil critique | Statut |
|----------|-------|---------|----------------|--------|
| I | 0.2231 | PROXY-NLP | >= 0.65 | GOULOT |
| FL | 0.2784 | NLP-ROBUSTE-v2 | <= 0.25 | GOULOT |
| Omega | 0.7200 | SEMI-AUTO | >= 0.72 | OK |
| T | 0.5105 | proxy(1-DR) | >= 0.75 | GOULOT |
| MS | 0.7972 | NLP-ROBUSTE-v2 | >= 0.85 | GOULOT |
| N_rev | 3 | semi-auto | >= 2 | OK |
| S | 1.0000 | NLP-PARTIEL | — | — |
| U | 0.6500 | SEMI-AUTO | — | — |

## CALCULS

E_emo = 0.4193 | E_cog = 0.2685 | CE = 1.5617

R = 0.3652 | W = 0.3921 | Arc_rev = 1.00

Score etouffement FL x (1-Omega) = 0.0780

**PVI = 0.1888 | SP = 3.8/100**

## VERDICT

**Phase 1 : mort organique**

**Probabilite bestseller : 38.9% -> FAIL — pas de potentiel bestseller intrinseque**

## GOULOTS ACTIFS

- **GOULOT-I** : Protagoniste insuffisamment identifiable (actuel=0.22, seuil=0.55)
- **GOULOT-R** : Lecteur n'atteint probablement pas la fin (actuel=0.37, seuil=0.5)
- **GOULOT-W** : Transmissibilite nulle (actuel=0.39, seuil=0.5)

## TOP 3 LEVIERS

1. **I** +0.10 -> PVI +0.0675 (+35.8%)
2. **FL** -0.10 -> PVI +0.0531 (+28.1%)
3. **Omega** +0.10 -> PVI +0.0374 (+19.8%)

## DISTANCE ZONE OMEGA

| Variable | Actuel | Cible | Delta manquant | Statut |
|----------|--------|-------|----------------|--------|
| FL | 0.2784 | 0.25 | **-0.03** | MANQUE |
| MS | 0.7972 | 0.85 | **-0.05** | MANQUE |
| Omega | 0.7200 | 0.72 | OK | OK |
| I | 0.2231 | 0.65 | **-0.43** | MANQUE |
| T_proxy | 0.5105 | 0.75 | **-0.24** | MANQUE |
| N_rev | 3.0000 | 2 | OK | OK |

Reference Zone OMEGA: Hemingway PVI=2.441 / Fitzgerald PVI=1.699
