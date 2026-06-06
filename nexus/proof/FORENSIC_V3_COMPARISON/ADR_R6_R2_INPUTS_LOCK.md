# ADR R6 R2 — INPUTS LOCK (verrouillage des intrants avant réécriture)

**Date** : 2026-06-06 · **Objet** : figer la liste CLOSE des intrants de la réécriture de DEC-20260606-021 (R6 Writer Loop) en **R2**, fondée sur l'existant prouvé (forensic V3, 2 instruments + closeout). Toute conception hors de cette liste = retour forensic d'abord.

## 1. CAPACITÉS (table finale REUSE/ADAPT/EXTEND/CREATE — fichier frère)
CREATE limité à : Recall Bus · Double-Bible (extracteur passes + diff + MapProjection) · CharacterRegistry mint-once+alias. Tout le reste = REUSE/ADAPT/EXTEND.

## 2. INTRANTS DOCTRINE (nommés, sourcés — ne plus jamais omettre)
| Intrant | Source | Usage dans R2 |
|---|---|---|
| 10 organes ACTÉS | `GOVERNANCE/DECISIONS/DEC-20260121-001` 🔒 | mapping organe→composant : QUANTUM_TRUTH↔rails/branches ; READER_MODEL↔readerState ; INTENT_LAYER↔BookIntent ; SENTINEL sous-juges↔jury gates ; NARRATIVE_FLOW↔pacing/branches mortes ; TOKEN_METER↔budget ; EXECUTION_MODE↔OFF/SEMI/BOOST ; STYLE_DEVIATION↔dérogations style ; PLUGIN_CONTRACT↔plugin-sdk ; SESSION_SAVE↔appliqué |
| Assemblage fractal L3 (4/4 scellé) | `DEC-20260325-001:90,138` (« Canon Lock, World Model, Bible, CDE ») | vocabulaire cible des couches |
| Contrat Scribe AVEUGLE R1-R7 | `docs/contracts/CONTRAT_OMEGA_SCRIBE_v1.md` art.5 | le generator ne voit JAMAIS canon brut/dettes/métriques ; gates POST-génération |
| Boucle interdite D4 + N1/N2/N3 | DEC-20260531-007 D4 (repris 009/021), ADR-003 scellé | N1 ✅, N2 🟡 ratification, N3 ❌ |
| Lois génération | BB-01 (semicolons non pilotables), BB-02 (plancher 35w), M1 (cliff 0.50), L37/L35 (sub=méga-levier), L06 (piloter par composite) | contraintes dures des prompts/gates |
| EMP-16/17/19 | CLAUDE.md §H | triple-preuve avant modif moteur ; historique=preuve ; calibration COUPLE modèle+prompt (gemma4 seul juge ; 2ᵉ persona = recalibration) |
| Durcissements tribunaux (à intégrer au texte R2) | retours ChatGPT 2026-06-06 | §14 seuils=EXPERIMENTAL_DEFAULTS ; N2 borné G2/G3/G4 max-2-retries citant fait canon+diff ; repeat sémantique=SHADOW ; persona-reader=HOLD EMP-19 ; diff modes UNCERTAIN ; R6-Lite=observabilité d'abord ; §15 BIBLE_MESH ; §16 RECALL_BUS+invariant ; §17 ENTITY_MARKERS ; §18 PASS_REGISTRY (passes configurables, pas 5 figé) |
| Vocabulaire specs jamais codées | MASTER_PLAN v2 §8.3 (✓ lignes 822-828) : INTENT_LOCK, ACTIVE_INVENTORY, CONTEXT_RESOLUTION, COST_LEDGER, SAGA_CONTRACT, GARBAGE_COLLECTOR (+MIMESIS+ §8.5) — 0 .ts confirmé | nommer les composants R2 avec CE vocabulaire quand la fonction correspond (continuité 4000h) |
| Vision scellée | `GOVERNANCE/VISION_FINALE_SCELLEE.md` (X/Y/Z, 6 lois, 16 émotions M+λ) | référence émotionnelle ; tension Emotion14/Plutchik → traiter via NCR_EMOTION14_CANON_DRIFT existante, PAS dans R2 |
| État scribe | NCR-M0B OPEN (runScribe zéro LLM), ACTION_PLAN R6 conçu-pas-construit, DEC-009 fusion PROPOSED | R2 doit dire où la boucle vit (book-factory) et sa relation à scribe/sovereign SANS trancher DEC-009 à sa place |

## 3. ARBITRAGES REQUIS AVANT RÉDACTION (bloquants)
D1-D5 (fichier frère, PROPOSED) + **Q-A** : repo `genesis-forge` séparé existe-t-il sur le PC ? (cité « source de vérité » KNOWLEDGE_BASE, absent des disques montés) + **Q-B** : archives privées multi-IA à verser ? + périmètre V1 (mensonge=V1 ✓ ; rêve/hallucination=V2 ✓ — déjà tranché tribunal).

## 4. INTERDITS JUSQU'À RATIFICATION R2 (« on grave la carte des greffes avant d'ouvrir le bloc »)
Zéro code · zéro adapter · zéro nouveau module · zéro marquage MUSEUM sans GO · zéro modification gateway/canon-kernel/FROZEN · commits = terminal Architecte.

## 5. CRITÈRE DE COMPLÉTUDE R2
L'ADR R2 est complet ssi : chaque capacité de la table finale y a une section ; chaque organe D4 y est mappé ou explicitement différé ; chaque durcissement tribunal intégré ou rejeté avec raison ; D1-D5 signés cités ; plan de phases avec gates de preuve (tests+bench) par phase.
