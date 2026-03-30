# RAPPORT PVI — Sauve_French_Edition_-_Musso_Guillaume
Langue : FR | Date : 2026-03-30 | Modele : MINIMAL v2 (cultural_FR)

## SCORES

| Variable | Score | Methode | Seuil critique | Statut |
|----------|-------|---------|----------------|--------|
| I | 0.1305 | PROXY-NLP-v3 | >= 0.65 | GOULOT |
| FL | 0.2784 | NLP-ROBUSTE-v2 | <= 0.25 | GOULOT |
| Omega | 0.7200 | SEMI-AUTO | >= 0.72 | OK |
| T | 0.7342 | proxy(1-DR) | >= 0.75 | GOULOT |
| MS | 0.8654 | NLP-ROBUSTE-v3 | >= 0.85 | OK |
| N_rev | 3 | semi-auto | >= 2 | OK |
| S | 1.0000 | NLP-PARTIEL | — | — |
| U | 0.6500 | SEMI-AUTO | — | — |

## CALCULS

E_emo = 0.4421 | E_cog = 0.2637 | CE = 1.6766

R = 0.3957 | W = 0.3532 | Arc_rev = 1.00

Score etouffement FL x (1-Omega) = 0.0780

**PVI = 0.1978 | SP = 4.0/100**

## VERDICT

**Phase 1 : mort organique**

**Probabilite bestseller : 38.5% -> FAIL — pas de potentiel bestseller intrinseque**

## GOULOTS ACTIFS

- **GOULOT-I** : Protagoniste insuffisamment identifiable (actuel=0.13, seuil=0.55)
- **GOULOT-R** : Lecteur n'atteint probablement pas la fin (actuel=0.40, seuil=0.5)
- **GOULOT-W** : Transmissibilite nulle (actuel=0.35, seuil=0.5)

## TOP 3 LEVIERS

1. **I** +0.10 -> PVI +0.0718 (+36.3%)
2. **FL** -0.10 -> PVI +0.0546 (+27.6%)
3. **Omega** +0.10 -> PVI +0.0411 (+20.8%)

## DISTANCE ZONE OMEGA

| Variable | Actuel | Cible | Delta manquant | Statut |
|----------|--------|-------|----------------|--------|
| FL | 0.2784 | 0.25 | **-0.03** | MANQUE |
| MS | 0.8654 | 0.85 | OK | OK |
| Omega | 0.7200 | 0.72 | OK | OK |
| I | 0.1305 | 0.65 | **-0.52** | MANQUE |
| T_proxy | 0.7342 | 0.75 | **-0.02** | MANQUE |
| N_rev | 3.0000 | 2 | OK | OK |

Reference Zone OMEGA: Hemingway PVI=2.441 / Fitzgerald PVI=1.699
