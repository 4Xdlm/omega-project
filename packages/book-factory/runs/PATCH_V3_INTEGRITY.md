# PATCH V3 — INTEGRITY REPORT (run 2026-06-09)
**Base** : V3 gemma4 (3025744d). **Ledger** : rules-only (14, vitalité). **Filet** : applyPatch (splice→guardRegen→buildCanonical→ACCEPT/REVERT).

## Résultat : 3 / 6 chapitres certifiés, STOP sur ch.27 (mandat : ne pas avancer)

| # | Item | Verdict | Détail |
|---|---|---|---|
| 0 | **ch.21 REINFORCE** | ✅ CERTIFIED | seed 7 ; movers 2→3 ; guard ok + re-certif ok |
| 1 | **ch.46 REINFORCE** | ✅ CERTIFIED | seed 7 ; movers 1→1 ; re-certif ok |
| 2 | **ch.49 REINFORCE** | ✅ CERTIFIED | seed 123 (seeds 7/42 rejetés TIC_INCREASED — retry a sauvé) |
| 3 | **ch.27 noMover** | ❌ STOP | 3 seeds `NO_MOVER_GAINED` (movers 0→0) |
| 4-5 | ch.31, ch.33 | ⏸ NON ATTEINTS | mandat : pas d'avance après item non certifié |

`runs/patch_v3/WORKING.md` = V3 + ch.21/46/49 renforcés (85440w). **NON final, NON certifié-final** (27/31/33 + payoffs restent).

## FINDING (1000% vérité) — « noMover » ch.27 = artefact lexical partiel

ch.27 contient Garcia ×23, Yvon ×28 : c'est une scène d'**INTERROGATION** tendue (« Pourquoi mentir maintenant ? Garcia fixa Yvon Squarcioni… »). Mais `guardRegen.movers()` (et le détecteur de défaut) ne comptent qu'un lexique ÉTROIT de ~25 verbes surtout physiques (courut, frappa, saisit, accusa, décida…). Les verbes d'agence par interrogation/regard (**fixa, interrogea, exigea, posa, désigna, scruta**) NE SONT PAS comptés → ch.27 = « 0 mover » alors qu'il y a de l'agence dramatique réelle.

→ Le filet a CORRECTEMENT refusé : forcer « courut/frappa » dans une scène d'interrogation distordrait le polar. Le défaut n'est pas dans gemma4 — il est dans la **définition trop étroite du mover**.

## DÉCISION REQUISE (3-IA / Architecte) — comment traiter 27/31/33

1. **Élargir le lexique mover** (ajouter verbes d'interrogation/confrontation : fixa, interrogea, exigea, scruta, désigna, posa, lança, pressa…) → refonte `LIVE_VERB_RE`/`movers()` = modif d'instrument, **preuve EMP-16 requise** (re-mesurer le défaut sur les 3 + non-régression PE-2). Probable : 27/31/33 ne sont PAS « noMover » mais « action physique faible » — défaut différent.
2. **Accepter l'interrogation comme agence** (le polar admet l'agence par le dialogue/regard) → 27/31/33 restent tels quels, pas de patch.
3. **Regen à verbe d'action imposé** → risque de distordre la scène (rejeté par prudence).

**Reco arbitre** : option 1 (élargir + re-mesurer sous EMP-16) AVANT de conclure que 27/31/33 sont défectueux. Le « noMover » mérite la même méfiance que le CUT de ch.21 et la gate identité : un proxy étroit ne fait pas un défaut.

**Acquis solides** : 3 reinforces certifiés ; le filet a prouvé qu'il refuse une non-correction (NO_MOVER_GAINED) ET une dégradation (TIC_INCREASED) ET protège bit-à-bit. La boucle LLM→guard→certif→revert tourne en production.
