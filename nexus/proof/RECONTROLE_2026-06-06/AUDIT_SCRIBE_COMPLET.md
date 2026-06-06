# AUDIT SCRIBE COMPLET — état réel, conformité Codex, interactions (2026-06-06)
**Méthode : mesures fraîches (suites relancées, greps d'imports réels) + ledgers Livre Maître. Zéro chiffre de mémoire.**

## 1. LA VÉRITÉ D'ARCHITECTURE (mesurée, pas supposée)
**Il existe DEUX chemins de génération distincts et le mot « Scribe » les recouvre tous les deux — source de confusion à trancher :**

| | `packages/scribe-engine` | Book-Factory ChapterGenerator |
|---|---|---|
| Nature | Moteur autonome complet (34 fichiers) | Générateur du pipeline livre (C7) |
| Importé par | **PERSONNE** (grep : zéro import externe) | book-orchestrator / c7-runner |
| Génération | `weave()` DÉTERMINISTE (engine.ts:145) ; `weaveLLM()` EXISTE (weaver-llm.ts:73) mais HORS chemin | Deterministic (tests) + **Ollama réel** (qwen3.5 — 2 romans produits) |
| Tests | **347/347** (relancés ce jour) | dans les 224 book-factory |
| Statut | **AUTONOME ISOLÉ** (comme omega-ui) | ACTIVE_RUNTIME prouvé (88k) |

## 2. STRUCTURE RÉELLE DE scribe-engine (34 fichiers, inventaire complet)
- **Cœur** : engine.ts (orchestration), weaver.ts (déterministe — chemin runtime), weaver-llm.ts (LLM, NON câblé — NCR-M0B OPEN confirmée PAR LE CODE), skeleton.ts, segmenter.ts, rewriter.ts, normalizer.ts, sensory.ts, intent-artifact.ts (validation des intrants REQUIS — fail-fast propre).
- **7 gates** : banality, discomfort, emotion, necessity, quality, style, truth.
- **6 oracles** : banality, crossref, emotion, necessity, style, truth.
- **Providers** : ollama-provider, llm-provider, mock-provider, master-prompt, prompt-builder, factory, atomic-cache.
- **Robustesse** : proofpack, budget-tracker, chaos-provider, retry-provider, variance-envelope, evidence, report, config.

## 3. CONFORMITÉ CODEX (module par module, verdicts)
| Règle | Verdict | Preuve |
|---|---|---|
| BF-07 Scribe aveugle (pipeline LIVRE) | **CONFORME** | le ChapterGenerator ne reçoit que digest+previousTail+directives ; la Bible n'entre jamais (RecallPacks bornés en amont) |
| BF-07 côté scribe-engine/weaveLLM | **NUANCE À TRANCHER** | weaver-llm consomme `intent.canon.entries` (entrées canon SÉLECTIONNÉES dans le prompt) — pas la Bible brute, mais pas le modèle RecallPack non plus. Sans impact runtime (weaveLLM hors chemin) ; **si câblage un jour : harmoniser sur le contrat RecallPack AVANT (à inscrire dans NCR-M0B)** |
| FORBID-006/N3 anti-coaching | CONFORME (pipeline livre) | directives auditées à la construction (r6-core, n2-retry, extender, style-gen) |
| Déterminisme/seed | CONFORME scribe-engine (weave pur) ; pipeline livre = LLM assumé non-déterministe avec admissions HASHÉES (replay = preuve d'intégrité, pas de régénération) | INV-REPLAY-BOOK-001 |
| EMP-19 juges | CONFORME | 2 profils PAIRWISE_APPROVED + Power-On Self-Test |
| BF-04 épine canon unique | CONFORME | scribe-engine importe canonicalize/sha256 de @omega/canon-kernel (pas de canon parallèle) |

## 4. CE QUI FONCTIONNE vs CE QUI MANQUE
**Fonctionne (prouvé)** : la chaîne livre complète C0→C15+ (2 romans, 80 admissions) ; scribe-engine en tant que moteur déterministe testé 347/347 ; les 7 gates/6 oracles du scribe (testés unitairement).
**Manque/dort** : (1) weaveLLM jamais câblé (NCR-M0B OPEN — décision : câbler en harmonisant BF-07, ou acter scribe-engine comme moteur de RÉÉCRITURE déterministe au service du Doctor) ; (2) AUCUNE jonction scribe-engine↔book-factory (deux mondes) ; (3) les 6 oracles scribe ≠ les gates R6 (deux familles de contrôle non réconciliées — richesse ou doublon selon l'angle : à arbitrer V2) ; (4) SURGICAL Doctor non exécuté (gated) ; (5) gateway pré-ESM (ACL en service, câblage direct gaté C3-W1).
**Recommandation d'architecte (à valider)** : déclarer scribe-engine = **moteur de micro-réécriture/qualité au service du REWRITE_DOCTOR** (ses 7 gates+rewriter sont exactement l'outillage SURGICAL manquant) plutôt que de le câbler en concurrent du chemin livre. Un chantier, deux dettes soldées.

## 5. NCR-M0B — état précis
OPEN. weaveLLM : code présent, testé, consommateurs = CLI scribe-llm + tests uniquement. Blocage = décision d'architecture (pas technique). Options consignées : (A) câbler au chemin livre (exige refonte RecallPack), (B) réorienter vers Doctor/SURGICAL (recommandé ci-dessus), (C) MUSEUM si redondant. Décision Architecte requise — aucun défaut de qualité interne (347 verts).
