# OMEGA — DÉCOUVERTES HORS SCAN SOVEREIGN-ENGINE
## Packages Non Couverts Initialement — Points d'Attention Phase V

**Version** : 1.0 — 2026-03-14
**Contexte** : Le scan architectural initial portait sur `packages/sovereign-engine/`.
Ce document référence les packages découverts lors du contrôle de conformité qui
sont pertinents pour les décisions de Phase V.

---

## 1. MEMORY LAYER NASA — World Model déjà existant

**Localisation :** `gateway/src/memory/memory_layer_nasa/`

**Ce que contient ce package :**
- `memory_engine.ts` — moteur de mémoire complet
- `memory_store.ts` — stockage persistant
- `memory_tiering.ts` — hiérarchie hot/cold/archive
- `memory_decay.ts` — décroissance naturelle (moins utilisé = archivé)
- `memory_query.ts` — requêtes sur la mémoire
- `memory_digest.ts` — compression de mémoire
- `memory_snapshot.ts` — snapshot d'état
- `memory_hybrid.ts` — mémoire hybride
- `memory_index.ts` — indexation
- `MEMORY_LAYER_CERTIFICATION.md` — certifié

**Pertinence Phase V :**
Ce package est une implémentation complète du World Model avec tiering, decay,
query et snapshot. **Avant de construire le PersonaStore, DebtLedger, ArcTracker
from scratch, évaluer si ce package peut être le substrat du World Model Phase V.**

**Question pour l'Architecte :** le World Model Phase V doit-il reposer sur ce
package ou être construit indépendamment ?

---

## 2. FULL WORK ANALYZER v4 — Analyse stylistique déjà opérationnelle

**Localisation :** `omega-autopsie/full_work_analyzer_v4.py`

**Ce que fait ce pipeline Python :**
- Analyse 150+ œuvres du corpus littéraire
- Mesure 30 features stylistiques (F1-F30) :
  - F1-F25 : features existants (rythme, syntaxe, lexique, etc.)
  - F26 : Période syntaxique (profondeur subordination)
  - F27 : Modalité épistémique (incertitude narrative)
  - F28 : Style indirect libre (fusion narrateur/personnage)
  - F29 : Densité lexicale TTR
  - F30 : Signature temporelle (passé simple vs imparfait vs présent)
- Produit des baselines calibrées par auteur (`RANKING_V4.json`)
- Status v4 : 98/99 œuvres analysées (v3 terminé)

**Pertinence Phase V (Voice Genome) :**
Les résultats de full_work_analyzer v4 sont la source de calibration du Voice Genome.
Le Voice Genome n'extrait pas le style d'un auteur en live — il consomme les
métriques F1-F30 déjà calculées. **Phase V Voice Genome doit lire ces résultats,
pas recalculer les 30 features.**

---

## 3. PACKAGES GENOME — ADN Narratif

**Localisation :**
- `packages/genome/` — extraction EmotionAxis, StyleAxis, StructureAxis, TempoAxis
- `omega-narrative-genome/` — fingerprint avancé œuvres narratives (v1.2.0)

**Ce que font ces packages :**
- Extraire l'ADN émotionnel d'une œuvre (distribution 14D, courbe de tension)
- Extraire l'ADN stylistique (longueurs phrases, variance, densité)
- Extraire l'ADN structurel (arcs, beats, transitions)
- Extraire l'ADN temporel (rythme, pacing)

**Pertinence Phase V :**
Ces packages sont le substrat du Voice Genome Phase V. **Ne pas dupliquer.**
Le Voice Genome Phase V = lire les sorties de `genome/` et les compiler en
contraintes injectables dans le SceneBrief (comme métriques, pas comme texte).

---

## 4. MYCELIUM — Carte de l'ADN Narratif

**Localisation :**
- `packages/mycelium/` — structure Mycelium (Merkle-like)
- `omega-aggregate-dna/` — agrégation DNA avec Merkle tree
- `packages/omega-bridge-ta-mycelium/` — bridge analyse ↔ mycelium

**Ce que font ces packages :**
- Construire la "carte Mycelium" : représentation en réseau des connexions
  stylistiques, thématiques et émotionnelles d'une œuvre ou d'un auteur
- Agréger les ADN de plusieurs œuvres en une signature globale
- Calculer des hash Merkle pour vérifier l'intégrité de l'ADN

**Pertinence Phase V :**
La carte Mycelium est l'outil d'analyse de style pour l'assistance auteur.
Elle permet de répondre : "quelle est la signature stylistique de cet auteur ?"
avant de configurer le Voice Genome pour écrire dans ce style.

---

## 5. CRÉATION LAYER + SCRIBE ENGINE

**Localisation :**
- `gateway/src/creation/creation_layer_nasa/` — pipeline création avec template registry
- `packages/scribe-engine/` — moteur alternatif (weaver, segmenter, rewriter)
- `packages/creation-pipeline/` — pipeline avec gates et evidence

**Ce que font ces packages :**
- `creation_layer_nasa/` : orchestration de création avec snapshots de contexte
- `scribe-engine/` : moteur complet avec weaver LLM, segmenter, rewriter
- `creation-pipeline/` : pipeline création avec gates, adversarial, proof-pack

**Point d'attention critique :**
`packages/scribe-engine/` est un deuxième moteur d'écriture complet avec
`weaver.ts`, `weaver-llm.ts`, `rewriter.ts`, `segmenter.ts`, `skeleton.ts`.
Il n'est pas couvert par les 1564 tests du sovereign-engine.

**Question pour l'Architecte :** quelle est la relation entre `sovereign-engine`
(Phase U certifié) et `scribe-engine` ? Sont-ils en concurrence, en complémentarité,
ou l'un remplace-t-il l'autre ?

---

## 6. PASSAGE FULL_WORK_ANALYZER v4 → v5

**Status :** v4 en cours de déploiement (98/99 œuvres, v3 terminé).
Les features F26-F30 de v4 ne sont pas encore déployés sur le corpus complet.

**Recommandation :** finaliser le déploiement v4 (F26-F30 sur corpus complet)
en parallèle de CLEAN-1/2 pour disposer des baselines complètes avant Phase V
Voice Genome.

---

## SYNTHÈSE — QUESTIONS OUVERTES POUR LES 3 IAS

| # | Question | Urgence |
|---|----------|---------|
| WM-1 | Le World Model Phase V réutilise-t-il `gateway/memory/memory_layer_nasa/` ? | Avant V-WORLD-1 |
| VG-1 | Le Voice Genome consomme-t-il `full_work_analyzer_v4` results ? | Avant V-WORLD-1 |
| VG-2 | Le Voice Genome réutilise-t-il `packages/genome/` extractors ? | Avant V-WORLD-1 |
| SE-1 | Relation `sovereign-engine` vs `scribe-engine` ? | Avant Phase V |
| FA-1 | Finaliser full_work_analyzer v4 (F26-F30) en parallèle ? | Dès CLEAN-1 |

---

**FIN DU DOCUMENT COMPLÉMENTAIRE**
*2026-03-14 — OMEGA Project*
*Autorité : Francky (Architecte Suprême)*
