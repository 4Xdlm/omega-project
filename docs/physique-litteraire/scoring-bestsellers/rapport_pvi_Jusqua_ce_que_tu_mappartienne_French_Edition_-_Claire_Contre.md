# RAPPORT PVI — Jusqua_ce_que_tu_mappartienne_French_Edition_-_Claire_Contreras
Langue : FR | Date : 2026-03-30 | Modele : MINIMAL v2 (cultural_FR)

## SCORES

| Variable | Score | Methode | Seuil critique | Statut |
|----------|-------|---------|----------------|--------|
| I | 0.4416 | PROXY-NLP-v3 | >= 0.65 | GOULOT |
| FL | 0.2243 | NLP-ROBUSTE-v2 | <= 0.25 | OK |
| Omega | 0.6800 | SEMI-AUTO | >= 0.72 | GOULOT |
| T | 0.6143 | proxy(1-DR) | >= 0.75 | GOULOT |
| MS | 0.8280 | NLP-ROBUSTE-v3 | >= 0.85 | GOULOT |
| N_rev | 3 | semi-auto | >= 2 | OK |
| S | 0.9965 | NLP-PARTIEL | — | — |
| U | 0.6500 | SEMI-AUTO | — | — |

## CALCULS

E_emo = 0.5587 | E_cog = 0.1811 | CE = 3.0845

R = 0.4749 | W = 0.4688 | Arc_rev = 1.00

Score etouffement FL x (1-Omega) = 0.0718

**PVI = 0.5881 | SP = 11.8/100**

## VERDICT

**Phase 2 : niche viable**

**Probabilite bestseller : 50.2% -> BORDERLINE — signal ambigu**

## GOULOTS ACTIFS

- **GOULOT-I** : Protagoniste insuffisamment identifiable (actuel=0.44, seuil=0.55)
- **GOULOT-R** : Lecteur n'atteint probablement pas la fin (actuel=0.47, seuil=0.5)
- **GOULOT-W** : Transmissibilite nulle (actuel=0.47, seuil=0.5)

## TOP 3 LEVIERS

1. **FL** -0.10 -> PVI +0.2486 (+42.3%)
2. **I** +0.10 -> PVI +0.1685 (+28.7%)
3. **Omega** +0.10 -> PVI +0.0967 (+16.4%)

## DISTANCE ZONE OMEGA

| Variable | Actuel | Cible | Delta manquant | Statut |
|----------|--------|-------|----------------|--------|
| FL | 0.2243 | 0.25 | OK | OK |
| MS | 0.8280 | 0.85 | **-0.02** | MANQUE |
| Omega | 0.6800 | 0.72 | **-0.04** | MANQUE |
| I | 0.4416 | 0.65 | **-0.21** | MANQUE |
| T_proxy | 0.6143 | 0.75 | **-0.14** | MANQUE |
| N_rev | 3.0000 | 2 | OK | OK |

Reference Zone OMEGA: Hemingway PVI=2.441 / Fitzgerald PVI=1.699
