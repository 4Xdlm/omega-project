# DEC-20260531-010 — EMOTION CONTRACT DERIVATION UNIFICATION (ADR)

**Status** : PROPOSED · **Date** : 2026-05-31 · **Owner** : Architecte (Francky) · **Severity** : HIGH
**Doctrine** : NO CODE BEFORE ADR · PROVE IT · AUDIT BEFORE ACTION · FROZEN MODULES RESPECT · NO RECALIBRATION WITHOUT CORPUS PROOF · DÉTERMINISME.
**Mode** : doc-only. AUCUN code dans cet ADR — il définit le comportement cible AVANT tout fix.

## 1. Problem statement
La dérivation du contrat émotionnel (`target_14d` / `target_omega` par quartile) est cassée de **deux façons distinctes** selon le chemin, produisant des `EmotionContract` invalides que le juge ECC pénalise (à juste titre). Aucun fix ne doit être codé avant que cet ADR n'ait défini une **règle de dérivation unique**, sans fallback silencieux.

## 2. Preuve — défaut A : chemin V2.3-A segment → `target_14d = {}`
`deriveEmotionContractFromSegment` (`packages/sovereign-engine/src/chunking/deriveEmotionContract.ts:182,299`) émet `target_14d: {}` (vide) — GARAGE/DORMANT (FORBID-CANON-GARAGE-001). `target_omega` n'est jamais peuplé. → contrat émotionnel **creux** ; consommateurs (axe tension_14d) lisent `{}` → score dégénéré / NaN.

## 3. Preuve — défaut B : chemin assembleForgePacket → `target_14d = {trust:1.0}`
Bench overnight ECC (commit `1283a9d7`, `docs/audit/minaxis/ECC_DEDICATED_BENCH.md`) : `assembleForgePacket("Le Gardien", horror)` émet `target_14d = {trust:1.0}` **constant sur les 4 quartiles** — one-hot dégénéré qu'une scène d'horreur ne peut pas matcher. Sur prose IDENTIQUE, contrat HAND-built → ECC 92.4 (sov) ; contrat FORGE → ECC 68.0. L'écart (100%) est porté par `tension_14d` (9.22 → 86.49) ; `emotion_coherence=100`, interiorité/impact inchangés → **la prose est cohérente, le contrat est cassé.**

## 4. Impact ECC
ECC (axe le plus lourd, 33%) s'effondre 92→68 sur tout chemin utilisant `assembleForgePacket`. Le capteur ECC est SAIN (mesure correctement un contrat dégénéré) — verdict NCR_ECC_CONTRACT_SENSOR = `OPEN_DIAGNOSED / ROOT_CAUSE_UPSTREAM_CONTRACT`. **Ne PAS toucher le capteur ECC.**

## 5. Impact DEC-009 / M4
`assembleForgePacket` est le **chemin cible de la fusion DEC-009**. Tout pipeline fusionné hérite donc d'un ECC structurellement bas → seal inatteignable, M4 biaisé. **Ce défaut bloque la fusion** : DEC-009/M4 gelé jusqu'à résolution.

## 6. Non-goals (cet ADR + le fix qui en découlera)
- PAS de modification du capteur ECC ni recalibration ECC.
- PAS de recalibration RCI (chantier séparé WS-B).
- PAS de modification du `genome` SEALED (Emotion14 canon, V-01).
- PAS de changement DEC-009 / pas de fusion dans ce périmètre.
- PAS de fallback silencieux (`{}` ou one-hot par défaut) — interdit.

## 7. Comportement cible (la règle unique de dérivation)
- **Une seule fonction de dérivation** `scene/genre/tension/arc → target_14d` partagée par les deux chemins (V2.3-A segment ET assembleForgePacket). Aucune duplication divergente.
- **Zéro `target_14d` vide** : tout contrat émis a un vecteur 14D peuplé et normalisé (somme = 1.0).
- **Zéro one-hot constant** : interdiction d'un `{trust:1.0}` (ou tout one-hot) constant sur les quartiles.
- **Vecteur scène-approprié** : une scène d'horreur dérive fear/anticipation/surprise/tension dominants (pas trust).
- **Variation par quartile** : la trajectoire émotionnelle varie sur Q1→Q4 (pas de constante).
- **Compatibilité `target_omega`** : si `target_omega` (XYZ) est l'axe canonique cible, le définir cohéremment avec le 14D (ou trancher la primauté).

## 8. Tests requis AVANT tout code (gate)
1. Scène horreur (« Le Gardien ») → `target_14d` dominé par fear/anticipation, PAS trust=1.0.
2. Variation inter-quartile mesurable (Q1≠Q4, distance > seuil).
3. ECC remonte sur prose appropriée (re-bench ECC : contrat dérivé vs hand-built convergent).
4. Zéro NaN / zéro `{}` sur les deux chemins.
5. Non-régression V2.3-A (le chemin segment ne casse pas ; boundary_hash stable si applicable).
6. Déterminisme (même entrée → même contrat).

## 9. Rollback plan
Fix derrière flag (`OMEGA_EMOTION_DERIV_V2=false` par défaut). Double-run possible (ancien vs nouveau contrat). Si régression ECC ou rupture V2.3-A → flag off + NCR. Aucun déploiement prod sans bench non-régression vert.

## 10. Open questions
- `target_14d` (14 émotions) vs `target_omega` (XYZ) : lequel est l'axe canonique de la dérivation ? (lié au statut 14D garagé, §1.7 Codex).
- La dérivation doit-elle venir du `genre` (label scène) seul, ou de l'analyse de l'`intent`/`arc` ?
- omega-forge (Plutchik wheel) est-il la source de vérité de la dérivation 14D, ou faut-il une couche dédiée ?
- Quel seuil de « variation par quartile » est suffisant (éviter à la fois constante ET chaos) ?

---
**VERDICT** : PROPOSED — décision Architecte requise pour ratifier la règle (§7) + ouvrir le fix gaté (WS-A). NCR_ECC_CONTRACT_SENSOR reste OPEN jusqu'au fix + re-bench. Aucun code écrit. Lié à NCR_RCI_SENSOR_DEFECT (capteur RCI, chantier WS-B distinct).
