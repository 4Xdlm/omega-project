# C2→C6 — CHAÎNE R6 « L'ÉCRIVAIN SOUVERAIN » — EVIDENCE PACK CONSOLIDÉ (BF-08)

**Date** : 2026-06-06 · **Session** : autonomie GO Architecte (« Enchaîne C2→C6 sans t'arrêter ») · **HEAD base** : 4f7fa2ab · **ADR** : DEC-20260606-021-R2 (signée A) · **C1** : pack séparé `C1_CHARACTER_REGISTRY_EVIDENCE/`.

## VERDICT GLOBAL : **PASS — chaîne complète construite, prouvée, revue**
**Batterie finale (post-correctifs de revue)** : `tsc --noEmit` EXIT 0 · book-factory **118/118 ×2** (`f1.log`,`f2.log`) · non-régression canon-kernel **67/67** (`fck.log`) + truth-gate **217/217** (`ftg.log`) = **402 verts, zéro régression**. Intégration gateway memory (suite scellée du gateway) : **32/32** (`gwmem.log`).

## LIVRÉ PAR PHASE (additif strict, zéro mutation hors book-factory)
| Phase | Modules src | Tests | Loi centrale prouvée |
|---|---|---|---|
| **C2 Recall Bus** | recall/{recall-types, mention-scanner, recall-pack, recall-invariant} | +14 | **BF-02** : mention canonique sans RecallPack ⇒ INVALID (double filet pré/post-prose) ; délestage à seuil tracé, critique JAMAIS élagué ; échec budget = typé |
| **C3 MemoryLayerACL** | acl/{acl-types, memory-layer-acl} | +6 | **D1/BF-05** : read-only PAR ABSENCE de méthodes d'écriture ; era-pin typé ; requêtes hashées déterministes ; digest borné au mot, troncature déclarée |
| **C4 Double-Bible** | extraction/{extraction-types, pass-registry} + diff/{bible-diff, map-projection} | +10 | **BF-03** : catalogue de fautes 100% attrapé (MUTATED lieu/statut, MISSING perso/bloom, EXTRA fantôme=hallucination, TEMPORAL jour, EPISTEMIC « révèle sans savoir ») ; **FORBID-011** prouvé (low-conf ⇒ jamais hardViolations) ; symétrie carte |
| **C5 R6-Lite** | loop/{r6-lite, persistence} | +6 | N=3, G2 réutilise l'extracteur (dérive de verrou EXTRAITE puis confrontée), **FORBID-007** (3×3+1 fichiers persistés), fallback ADR-003 flaggé, G5 OBSERVE ne rejette jamais |
| **C6 R6-Core** | loop/r6-core | +8 | N=7, préséance durs>advisory, G3 diff câblé, G6=AGRÉGATEUR de verdicts existants (PAS un nouveau juge — FORBID-002), **INV-REPLAY-BOOK-001** (admission rejouée + falsification de score DÉTECTÉE), **FORBID-006 audité par test** (zéro coaching dans ce que voit le générateur), **N2 ABSENT PAR CONSTRUCTION** (ratification 3-IA pendante) |

## DÉCOUVERTE D'ÈRE (forensic-grade, documentée acl-types.ts)
`gateway/` importe SANS extensions (`from "./memory_store"`, memory_hybrid.ts:25) = pré-ESM ⇒ **inimportable depuis un paquet nodenext sans build dédié**. C'est l'explication MÉCANIQUE du « zéro importeur » (forensic V1 ✓✓). Conséquence : ACL = port structurel épinglé sur signatures réelles (citations file:line) + adaptateur miroir ; conformité gateway prouvée par SA suite scellée. **Câblage direct = C3-W1, décision Architecte (build ESM d'un module FROZEN).**

## JOURNAL DES ÉCHECS & DU CYCLE QUALITÉ (rien n'est caché)
1. C2 : monde de test trop maigre → le budget serré tombait SOUS le noyau (échec typé CORRECT du code) → test ré-armé avec monde riche + marge anti-arrondi.
2. C2 test : contournement `as never` sur un événement RELATIONSHIP mal formé → auto-attrapé, corrigé (l'événement n'a pas de champ id).
3. **C4 : `localeCompare` RÉINTRODUIT dans runExtraction — le P0 exact de C1 — auto-attrapé en relecture immédiate**, corrigé avant tout run.
4. C5 : `spec.chapter` n'existe pas (`index`) → corrigé avant run.
5. C6 : 3 erreurs tsc d'union étroite GateReport → généralisé `GateReport<G>` (défaut Lite inchangé) ; 118/118 dès le run suivant.
6. **Revue adverse B (C4-C6) : SOUND avec 5 correctifs appliqués et re-prouvés** — (a) `localeCompare` HISTORIQUE dans story-state.ts (P1.A, antérieur à la doctrine !) → comparateur unités-de-code, hash inchangé prouvé par suite ; (b) G2/G3 : exclusion par CLÉ (subject|field), plus par identité d'objet (double-mutation de verrous correctement attribuée) ; (c) constantes de confiance via smart-constructor (zéro cast nu) ; (d) asymétrie MISSING-in-Core DOCUMENTÉE (pré-ensemencement = choix : l'absence de mention n'est pas une faute, la présence requise se gate ailleurs) ; (e) hypothèse run-id de persistance documentée.
7. Revue adverse A (C2+C3) : **SOUND, zéro bug** — 4 notes de doc intégrées (pronoms hors heuristique inconnus ; packId inclut degraded par sémantique ; UNKNOWN_CANDIDATE non-bloquant V1 signalé ; digest JSON note).

## LIMITES DÉCLARÉES (honnêteté)
1. Passes d'extraction = CALC à rappel partiel ASSUMÉ (formulations canoniques) ; l'instrument LLM calibré (EMP-19) = mode typé NOT_WIRED, jamais simulé.
2. G6 V1 = agrégateur de signaux prouvés ; pont vers gateway profiles.ts (SKEPTIC FROZEN) = C6-W1 (même barrière d'ère que C3).
3. Sélecteurs Lite/Core = CALC EXPERIMENTAL_DEFAULTS loggés — JAMAIS juges esthétiques (N3 interdit) ; gemma4 calibré s'ajoute à l'étage B en C7.
4. Bench LLM réel 3 chapitres (PASS R6-Lite « gagnant ≥ direct sur 2/3 ») = C7 avec gemma4 — non couru ici (générateurs déterministes + fautifs injectés = la preuve MÉCANIQUE ; la preuve LITTÉRAIRE attend le run gaté).
5. NFC requis en entrée de prose (offsets) — documenté.

## INVARIANTS PROUVÉS (cumul chaîne)
BF-01 (mint-once, C1) · BF-02 (recall-or-invalid) · BF-03 (double-bible diff) · BF-05 (ACL read-only) · FORBID-006/007/011 · INV-RECALL-001..005 · INV-MEM-ACL-001..005 · INV-XTR/DIFF (exhaustivité par property) · INV-REPLAY-BOOK-001 · préséance §12.3 · fallback ADR-003.
