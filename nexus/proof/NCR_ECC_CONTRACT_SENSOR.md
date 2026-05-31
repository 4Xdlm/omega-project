# NCR-ECC-CONTRACT-SENSOR: L'ECC s'effondre selon le CHEMIN de contrat — bench dédié requis

**Status**: OPEN · **Severity**: HIGH · **Date**: 2026-05-31 · **Origine**: MIN_AXIS FLOOR AUDIT (`9f37b3aa`) + bench M0.b (`d007c1db`).
**Doctrine**: PROVE IT · AUDIT BEFORE ACTION · DÉTERMINISME.

## Issue
L'ECC (Emotional Coherence/Control, axe le plus lourd 33 %) bascule en `min_axis` de façon **binaire selon le CHEMIN de construction du contrat émotionnel**, pas selon la qualité de la prose ni l'architecture du moteur :
- Contrats **hand-built** (troves goldens/MINI) → ECC **~93** (haut).
- Contrat issu de **`assembleForgePacket`** sur le Golden « Le Gardien » → ECC **57-71** sur **LES DEUX moteurs** (sovereign ET scribe). Le facteur commun est la **scène/le contrat**, pas le moteur. (réf : `MINAXIS_FLOOR_AUDIT.md`, bench M0.b `M0B_BENCH_REPORT.md`).
- L'ECC raw est **100 % composé de sous-axes LLM** (`tension_14d`, `emotion_coherence`…), **non décomposés** dans le dataset M0.b → impossible de trancher entre « prose réellement incohérente émotionnellement » (A) et « artefact de contrat/capteur » (B). **Verdict actuel : E (données insuffisantes).**

## Mécanisme (hypothèse causale)
Le contrat émotionnel produit par `assembleForgePacket` (trajectoire omega-forge prescrite, quartiles) impose probablement une cible émotionnelle plus stricte/exigeante que les contrats hand-built des troves. L'ECC mesurant la CONFORMITÉ au contrat, un contrat plus dur fait chuter l'ECC mécaniquement — sans que la prose soit « pire ». Lien avec le scar 14D (path-dependent, cf diagnostic corrigé) : le contrat assemblé peuple le 14D (14 clés) et resserre la cible.

## Conditions d'échec / risques
Si l'ECC est laissé tel quel, tout pipeline branché sur `assembleForgePacket` (le chemin de la fusion DEC-009 !) héritera d'un ECC bas structurel → seal inatteignable. Or DEC-009 vise précisément ce chemin → **bloquant pour la fusion**.

## Options
1. **Statu quo** : ne rien faire. Risque : ECC bas structurel sur le chemin de production cible (fusion).
2. **Bench ECC dédié (recommandé)** : logger `tension_14d` + `emotion_coherence` + sous-axes ECC **par run**, sur le même brief, contrats hand-built vs assembleForgePacket, pour isoler la cause (contrat trop dur vs capteur). Read-only, Ollama. Pré-requis avant tout verdict ECC.
3. **Toucher le floor/contrat ECC** : INTERDIT avant le bench (données insuffisantes, doctrine).

## Decision
**PENDING Architecte.** Action requise : **bench ECC dédié** (décomposer les sous-axes LLM par run) avant tout verdict A/B. Ne PAS toucher au floor ECC ni au contrat émotionnel tant que ce NCR est OPEN. Lié au diagnostic 14D path-dependent (R1 = compléter le chemin V2.3-A) et à DEC-009 (le chemin assembleForgePacket est la cible de fusion).

## Verdict
- Statut : OPEN · Confiance : Haute (sur la dépendance au chemin de contrat), Basse (sur A vs B — d'où le bench).
- Action requise : bench ECC dédié → décision Architecte.
