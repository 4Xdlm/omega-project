# OMEGA — Roadmap de fusion du moteur narratif canonique (support DEC-009)

**Statut** : PROPOSED (suit ratification DEC-009) · **Date** : 2026-05-31 · **Doctrine** : capacité-par-capacité, gaté, réversible, bench-avant-destitution, pipeline produit jamais cassé.

> Principe : on ne « refait pas tout ». On **migre une capacité à la fois**, chaque phase gatée (TSC+vitest), le pipeline produit actuel restant vivant jusqu'à preuve que le chemin fusionné le surpasse.

## Phase M0 — Cartographie + bench fondateur (read-only / design, AUCUN code de fusion)
- **M0.a Adaptateur** : cartographier l'interface `Scene` (genesis-planner / creation-pipeline) vs `ForgePacket` (sovereign). Lister **chaque champ manquant** pour qu'une `Scene` devienne un `ForgePacket` complet (contrat émotionnel, contraintes, SceneBrief ≤150t). Livrable : spec adaptateur.
- **M0.b Bench comparatif** : même brief → (1) sortie ScribeEngine-P2A, (2) sortie SovereignForge (K2). Scorer les deux par **S-Oracle V2 + R6**. → **preuve mesurée** de l'écart de qualité (fonde la destitution de weaveLLM). Read-only (Ollama).
- Gate de sortie M0 : spec adaptateur + rapport de bench chiffré. **Décision Architecte de poursuivre.**

## Phase M1 — Adaptateur Scene→ForgePacket (code, gaté)
- Implémenter l'adaptateur (module dédié, testé), **sans le brancher** dans le pipeline produit. Tests de contrat (round-trip, champs requis, fail-closed sur gaps).
- Gate : TSC+vitest verts, adaptateur testé isolément.

## Phase M2 — Sovereign en ADVISORY (code, flag, non bloquant)
- `creation-pipeline` appelle `SovereignForge`/S-Oracle V2 sur la sortie (via adaptateur), **logue le verdict, ne bloque pas**. Flag `OMEGA_SOVEREIGN_ADVISORY=false` par défaut.
- Gate : 0 régression du pipeline produit ; logs de désaccord scribe↔sovereign collectés.

## Phase M3 — Génération SovereignForge par scène (code, flag)
- Remplacer la génération scribe par `SovereignForge` (K2) **derrière flag** `OMEGA_SOVEREIGN_GEN=false`. Double-run possible.
- Gate : bench avant/après (qualité S-Oracle V2 ≥ baseline scribe), déterminisme préservé.

## Phase M4 — Bench comparatif décisionnel (3 voies)
- Comparer : ScribeEngine actuel vs SovereignForge scène vs prototype fusionné, sur corpus. Juges : S-Oracle V2, R6, métriques structurelles, cohérence inter-chapitres.
- Gate : preuve nette de supériorité du chemin fusionné → autorise M5.

## Phase M5 — Fusion progressive + déclassement (code, gaté, par capacité)
- Migrer capacité par capacité (matrice DEC-009 §3). Quand le moteur unifié passe les gates de production :
  - `ScribeEngine-P2A` génération (weaveLLM) → **destituée/archivée** (cf precedent `@omega/oracle`).
  - gates structurels scribe utiles → **réintégrés** proprement.
  - `creation-pipeline` → **devient la couche orchestration du moteur fusionné** (BookOrchestrator).
  - `SovereignEngine` → **cœur du moteur fusionné**.
- Gate final : pipeline produit re-routé, tests verts, bench supérieur, evidence pack, ENGINE_STATUS mis à jour pour refléter le moteur fusionné (fin de la contradiction doc↔code).

## No-go transverses (toutes phases)
- Pipeline produit cassé → STOP + rollback.
- Régression déterminisme → STOP + NCR.
- Destitution sans bench prouvant la supériorité → INTERDIT.
- Couplage monolithe (orchestration codée en dur avec Oracle) → INTERDIT (modules à interfaces pures).
- Toute phase sans gate vert → non mergée.

## Effort / risque (honnête)
- Chantier **pluri-sprint**, le plus risqué du projet (moteur scellé V1 + pipeline produit câblé touchés). Réversibilité par flags + double-run obligatoire. La qualité prime sur la vitesse (directive Architecte) — mais la sécurité runtime prime sur la qualité (on ne casse jamais le produit en cours de route).
