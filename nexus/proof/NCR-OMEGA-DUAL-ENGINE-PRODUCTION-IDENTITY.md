# NCR-OMEGA-DUAL-ENGINE-PRODUCTION-IDENTITY

**Status** : OPEN · **Severity** : HIGH · **Date ouverture** : 2026-05-31 · **Date résolution** : pending Architecte
**Découvert via** : scan blueprints + `docs/ENGINE_STATUS.md` (demande Architecte). Corrige DEC-007/008 (prémisse inversée).

## Issue
OMEGA contient **deux moteurs narratifs complets et parallèles**, et les sources de vérité se contredisent sur lequel est « la production ». De plus, le terme **« Scribe » désigne deux choses différentes** (collision de noms).

### Fait 1 — Deux moteurs complets
- **`sovereign-engine`** : contient le **générateur « Scribe » K2** (artiste aveugle, `src/generation/forge-to-brief.ts`, chunked-generator, prompt-assembler-v4) **ET** les **« Juges »** (`src/scoring/gb-scorer.ts`, `multi-stage-scorer-v2.ts`, MacroSScore S-Oracle V2) + R6 + Duel + Dédale. Génère ET juge.
- **`scribe-engine` (package)** : « hérité P.2-A », possède AUSSI des personas K2 (`providers/master-prompt.ts`) + weave/weaveLLM + 7 gates + 6 oracles + rewriteLoop. Génère ET juge (structurel).

### Fait 2 — Contradiction sur l'identité « production »
- **`docs/ENGINE_STATUS.md`** (SSOT auto-déclaré : *« fait autorité… tout doc en contradiction = HISTORICAL SNAPSHOT »*, 2026-03-25) : **moteur actif = K2 « moteur-production-v1 » SCELLÉ PRODUCTION** = machinerie **sovereign-engine**.
- **Code (graphe de dépendances)** : le seul moteur **câblé en librairie production** est **scribe-engine** (`creation-pipeline → stage-scribe → runScribe`). `sovereign-engine` a **0 import librairie** (bench-exercé uniquement).
- → **Le SSOT dit « sovereign = production » ; le câblage dit « scribe-engine = production ». Les deux ne peuvent être vrais.** Selon la propre règle d'ENGINE_STATUS, le câblage creation-pipeline→scribe-engine serait un HISTORICAL SNAPSHOT/drift.

### Fait 3 — Collision de noms « Scribe »
- « SCRIBE » du `CONTRAT_OMEGA_SCRIBE` / blueprint = **rôle générateur aveugle DANS sovereign-engine** (fed by SceneBrief/SovereignPrompt).
- « scribe-engine » = **un package distinct** (P.2-A). Les deux ≠.

## Impact
- **DEC-20260531-007 (frontière) et -008 (câblage) sont fondés sur une prémisse INVERSÉE** (« scribe-engine = production, sovereign = île à brancher en aval »). En réalité le SSOT désigne sovereign comme la production scellée. Les options A/B/C telles que formulées sont **invalides** tant que l'identité du moteur de production n'est pas tranchée.
- Impossible de décider du « câblage scribe→sovereign » avant de savoir **quel moteur est canonique**.

## Options (arbitrage Architecte)
1. **Sovereign = canonique** (conforme ENGINE_STATUS SSOT) : scribe-engine package = legacy à déprécier/archiver ; creation-pipeline à re-router vers sovereign. Gros chantier, mais aligne code sur SSOT.
2. **Scribe-engine = canonique** (conforme câblage actuel) : alors ENGINE_STATUS.md est périmé → le mettre à jour ; sovereign = labo/recherche. Aligne SSOT sur code.
3. **Deux produits distincts assumés** : sovereign = moteur littéraire qualité (K2/R6), scribe-engine = pipeline structurel/draft. Documenter la dualité explicitement, nommer différemment (lever la collision « Scribe »).

## Recommandation (synthèse, NON décision)
Avant toute Option : **Option 3 documentaire** (acter la dualité + lever la collision de noms) PUIS arbitrage 1 vs 2. Ne câbler/dé-câbler aucun code avant cet arbitrage. ENGINE_STATUS.md (SSOT) penche pour sovereign canonique (Option 1), mais c'est une décision Architecte à fort impact.

## Décision
**Pending Francky (Architecte).** Aucune action code. DEC-007/008 gelés jusqu'à résolution de ce NCR.

## Leçon
Les 3 IA + ma propre DEC-007/008 ont déduit « production = scribe-engine » du **graphe de câblage** sans consulter le **SSOT `ENGINE_STATUS.md`**. Classique : prémisse plausible non recoupée avec la source d'autorité. Le scan blueprint demandé par l'Architecte a révélé l'inversion. → Toujours consulter ENGINE_STATUS.md (SSOT runtime) avant toute affirmation sur « le moteur de production ».

## Forensique de genese (2026-05-31) -- AJOUT
Analyse git+session-saves : voir docs/architecture/OMEGA_ENGINE_GENESIS_FORENSIC_AND_REGISTER_2026-05-31.md.
VERDICT genese : ni erreur pure, ni duplication accidentelle, ni separation volontaire propre -> HYBRIDE = derive par accretion + migration inachevee. scribe-engine+creation-pipeline scelles 08/02 (pipeline prod original) ; sovereign cree 15/02 (scorer) puis acquiert sa propre generation K2 le 25/03 (= jour ou ENGINE_STATUS le couronne production-v1) ; mais creation-pipeline n'a JAMAIS ete re-route vers sovereign (git log -S = vide). Bascule prevue jamais executee. Registre d'identite (collision de noms 'Scribe' levee) dans le meme doc.

## Chemin de resolution (2026-05-31) -- AJOUT
Decision Architecte : FUSION (un seul moteur canonique, qualite > temps). Resolution = DEC-20260531-009-CANONICAL-NARRATIVE-ENGINE-FUSION (PROPOSED) + roadmap docs/architecture/OMEGA_NARRATIVE_ENGINE_FUSION_ROADMAP.md. DEC-007/008 SUPERSEDED. NCR reste OPEN jusqu'a ratification DEC-009. Cible: BookOrchestrator(creation-pipeline) -> Adapter Scene->ForgePacket -> SovereignForge(K2) -> S-Oracle V2/R6 -> evidence. Fusion MODULAIRE (pas monolithe), capacite-par-capacite, bench-avant-destitution.
