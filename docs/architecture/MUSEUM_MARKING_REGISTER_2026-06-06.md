# REGISTRE DE MARQUAGE MUSEUM — 2026-06-06 (EMP-15, doc-only, ADDITIF)

**Règle** : ce registre EST le marquage. AUCUN fichier des modules listés n'est modifié, déplacé ou supprimé (EMP-15 : muséifier ≠ supprimer ; un doc muséé explique POURQUOI OMEGA est devenu ainsi, pas ce qu'il EST). Statut opposable dès commit (terminal Architecte). Autorité : D1-D5 signés + ADR R2 §19 C0 + GO Gemini/ChatGPT 2026-06-06.

| Module / chemin | Nouveau statut | Justification (preuve forensic) | Interdits |
|---|---|---|---|
| `gateway/src/gates/canon_engine.ts` | **MUSEUM** | ORPHAN (0 importeur, V1 ✓✓) ; NCR_CANON_ENGINE_JUNCTION_ORPHAN préexistante ; remplacé par canon-kernel (BF-04) | ne pas muter ; ne pas importer ; lire le modèle FactType librement |
| `src/canon/` | **MUSEUM-RÉFÉRENCE** | modèle le plus riche (DISPUTED+supersession) mais confiné ; idées à PORTER vers canon-kernel (table finale #21) | ne pas câbler ; porter les concepts via specs uniquement |
| `OMEGA_PHASE18_MEMORY/` · `OMEGA_PHASE20_INTEGRATION/` · `OMEGA_PHASE20_1_MEMORY_HOOK/` | **MUSEUM (SNAPSHOT ancêtre)** | canon-stores ancêtres (lignée 03_CANON_TRUTH_LINEAGE CC) | ne pas muter ; ne pas importer |
| `packages/decision-engine/` | **MUSEUM-RÉFÉRENCE** (D2 signé) | ORPHAN total (0 importeur) ; valeur = logique verdict/escalade/trace (inspire GateReport) | pas de runtime R6 V1 ; pas de suppression |
| `src/runner/` | **MUSEUM (mock)** | pipeline echo + PASS systématique (V5 corroboré ✓✓) — ne JAMAIS confondre avec un moteur | ne pas étendre ; ne pas citer comme moteur |
| Rappel (déjà muséifiés, inchangés) | — | `docs/archive/museum/*` selon MUSEUM_CATALOG.md (fait foi) | EMP-15 |

**Modules DORMANTS (PAS muséifiés — réveil prévu via ACL)** : `gateway/src/memory/memory_layer_nasa/` (D1 : ADAPT-via-ACL C3), `gateway/src/profiles.ts` SKEPTIC (G6, C6), `gateway/src/gates/ripple_engine.ts` (V2), `packages/truth-gate` (gardien rails, actif via book-factory), `integration-nexus-dep` (si dispatch requis), `src/oracle/muse/` (V2, câblage à vérifier).
