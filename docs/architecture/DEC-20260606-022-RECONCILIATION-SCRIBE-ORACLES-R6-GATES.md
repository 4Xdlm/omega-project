# DEC-20260606-022 — RÉCONCILIATION DES JUGES : oracles-scribe ↔ gates-R6
**Statut : PROPOSED — décision Architecte requise (option par option). Mandat : tribunal 2/2 (« deux tribunaux parallèles dans la même République » — ADR obligatoire avant toute ligne de code supplémentaire).**
**Contexte mesuré (AUDIT_SCRIBE_COMPLET, 2026-06-06)** : scribe-engine porte 7 gates + 6 oracles (347 tests, importé par personne) ; la boucle R6 porte ses gates durs G1-G8 + préséance + étage B juges calibrés (prouvés sur 88k). Deux familles de contrôle jugent potentiellement le même texte avec deux lois.

## ANALYSE PRÉALABLE — ce que chaque famille JUGE réellement (pas le même objet)
| | Oracles/gates SCRIBE | Gates R6 |
|---|---|---|
| Objet jugé | la PROSE en cours de tissage (qualité intrinsèque : banalité, nécessité, style, inconfort, émotion) | le CANDIDAT face au CANON (format, recall, fidélité-locks, diff canon, vérité) |
| Moment | à la génération (intra-moteur) | post-génération (sélection) |
| Autorité actuelle | aucune en production (moteur isolé) | VETO prouvé (rejet ch.46 réel, préséance) |
| Famille de loi | qualité littéraire | vérité narrative |
**Constat : ce ne sont PAS deux tribunaux redondants — ce sont deux JURIDICTIONS différentes qui n'ont jamais été articulées.** Le danger n'est pas le doublon actuel (le scribe ne juge rien en prod) mais le FUTUR : câbler les deux sans hiérarchie = conflits de verdicts.

## LES 6 QUESTIONS (ChatGPT) — RÉPONSES PAR OPTION
### Q1-Q2 : scribe gates = préfiltre local ? R6 = tribunal final ?
- **Option A — Fusion** : porter les 7 gates scribe DANS R6 (G9-G15). Coût : refonte des deux ; risque : R6 devient juge de goût (dérive N3 — un gate « style » dur frôle le coaching par sélection punitive).
- **Option B — SPÉCIALISATION DES JURIDICTIONS (RECOMMANDÉE)** : R6 = tribunal de la VÉRITÉ, autorité FINALE et seule détentrice du VETO (canon/recall/format — rien ne change, prouvé sur 88k). Oracles scribe = capteurs de QUALITÉ au service du REWRITE_DOCTOR via le pont V2 (ProseDoc) : ils n'opinent que sur les SEGMENTS RÉÉCRITS (SURGICAL) et en ADVISORY+garde-fou (oracle FAIL ⇒ no-op sûr, jamais d'imposition). Cohérence totale avec la décision M0B déjà tranchée (« scribe au service du Doctor »).
- **Option C — Purge** : oracles scribe → MUSEUM. Perte sèche de 347 tests d'outillage qualité sans remplaçant — contraire à EMP-17 (jamais déprécier un travail sérieux).
### Q3 : oracles scribe = museum / adapt / merge ?
Option B ⇒ **ADAPT** (consommés par le pont V2, zéro mutation — le moteur reste intact et autonome pour ses propres usages).
### Q4 : ProseDoc = format pivot unique ?
**OUI pour la juridiction qualité** (le pont V2 construit des ProseDoc propres via segmentPlan→buildSkeleton — chantier dédié déjà tracé). **NON pour la juridiction vérité** : R6 garde ses structures (AdmissionRecord, RecallPack) — imposer ProseDoc partout serait une refonte sans gain causal.
### Q5 : qui a droit de veto ?
**R6 SEUL** (gates durs + préséance — inchangé). Les oracles scribe n'ont JAMAIS de veto sur un candidat ; sur un segment SURGICAL ils ont un droit de REFUS-LOCAL dont l'issue est le no-op sûr (le segment original reste — personne ne casse rien).
### Q6 : qui est advisory ?
Tout le reste : C9 (3 niveaux), tics, implication, oracles scribe, juges étage B (re-rank des éligibles seulement). La hiérarchie complète tient en une ligne : **VÉRITÉ (veto R6) > QUALITÉ-SÛRETÉ (refus-local no-op) > CONSEIL (advisory pur)**.

## DÉCISION DEMANDÉE
Ratifier l'option B (et Q3-Q6 qui en découlent), ou arbitrer A/C. Si B : le pont V2 (ProseDoc) devient LE chantier d'exécution de cette ADR — un seul chantier solde l'ADR ET la dette pont.
**Conséquences si B** : zéro mutation scribe-engine ; zéro changement R6 ; le Doctor gagne 6 capteurs de qualité bornés ; aucune nouvelle famille de juges (anti-inflation) ; FORBID-006 intact (les oracles ne pilotent jamais la génération, ils contrôlent des réécritures FACTUELLES).
**Ce qui casserait** : donner un veto qualité à n'importe quel étage (retour du coaching par la porte de derrière) ; câbler weaveLLM au chemin livre sans cette hiérarchie.
