# RAPPORT PVI — Everyone_In_My_Family_Has_Killed_Someone_-_Benjamin_Stevenson
Langue : EN | Date : 2026-03-30 | Modele : MINIMAL v2 (cultural_EN)

## SCORES

| Variable | Score | Methode | Seuil critique | Statut |
|----------|-------|---------|----------------|--------|
| I | 0.8107 | PROXY-NLP-v3 | >= 0.65 | OK |
| FL | 0.1872 | NLP-ROBUSTE-v2 | <= 0.25 | OK |
| Omega | 0.8200 | SEMI-AUTO | >= 0.72 | OK |
| T | 0.4051 | proxy(1-DR) | >= 0.75 | GOULOT |
| MS | 0.8373 | NLP-ROBUSTE-v3 | >= 0.85 | GOULOT |
| N_rev | 4 | semi-auto | >= 2 | OK |
| S | 1.0000 | NLP-PARTIEL | — | — |
| U | 0.6500 | SEMI-AUTO | — | — |

## CALCULS

E_emo = 0.6570 | E_cog = 0.2067 | CE = 3.1780

R = 0.5992 | W = 0.6941 | Arc_rev = 1.20

Score etouffement FL x (1-Omega) = 0.0337

**PVI = 1.4792 | SP = 29.6/100**

## VERDICT

**Phase 3 : succes solide**

**Probabilite bestseller : 76.0% -> PASS — potentiel bestseller detecte**

## GOULOTS ACTIFS

Aucun goulot critique detecte.

## TOP 3 LEVIERS

1. **FL** -0.10 -> PVI +0.4733 (+32.0%)
2. **I** +0.10 -> PVI +0.2863 (+19.4%)
3. **Omega** +0.10 -> PVI +0.1497 (+10.1%)

## DISTANCE ZONE OMEGA

| Variable | Actuel | Cible | Delta manquant | Statut |
|----------|--------|-------|----------------|--------|
| FL | 0.1872 | 0.25 | OK | OK |
| MS | 0.8373 | 0.85 | **-0.01** | MANQUE |
| Omega | 0.8200 | 0.72 | OK | OK |
| I | 0.8107 | 0.65 | OK | OK |
| T_proxy | 0.4051 | 0.75 | **-0.34** | MANQUE |
| N_rev | 4.0000 | 2 | OK | OK |

Reference Zone OMEGA: Hemingway PVI=2.441 / Fitzgerald PVI=1.699
