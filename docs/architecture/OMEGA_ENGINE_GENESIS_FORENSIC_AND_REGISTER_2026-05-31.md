# OMEGA — Forensique de genèse des moteurs + Registre d'identité (2026-05-31)

**Auteur** : Claude Code · **Mode** : read-only (git archéologie + session-saves + ENGINE_STATUS) · **HEAD** : `682f1d10`.
**Objet** : répondre à la question Architecte — *dater les moteurs, leur conception, et POURQUOI le doublon (erreur / duplication / séparation volontaire ?)*. Support du NCR-OMEGA-DUAL-ENGINE-PRODUCTION-IDENTITY.

---

## 1. Chronologie de genèse (git, dates de commit de création)
| Date | Événement | Source git |
|---|---|---|
| **2026-02-08 18:16** | `scribe-engine` créé — *« phase-c2: scribe++ governed writing engine (skeleton→rewrite→gates) »* | `ac6f6b7d` |
| **2026-02-08 22:17** | `creation-pipeline` **SCELLÉ** — E2E orchestrator (318 tests, 12 invariants, 8 gates), **câblé sur scribe-engine** | phase-c4 |
| **2026-02-15 12:12** | `sovereign-engine` créé — *« feat(S3): FR emotion keywords + scoring »* (= moteur de **scoring/émotion**) | `f7f845cf` |
| **2026-03-22 02:41** | GB V1 scorer intégré dans sovereign (TS parity Python) | scoring mûrit |
| **2026-03-25 11:59** | *« V-ENGINE-BRIDGE — moteur chunké v4 intégré dans engine.ts »* → sovereign acquiert sa **PROPRE génération K2** | feat(engine) |
| **2026-03-25** | `ENGINE_STATUS.md` déclare K2 = **« moteur-production-v1 » SCELLÉ PRODUCTION** (le même jour) | SSOT |
| **jamais** | `creation-pipeline` n'a **jamais** importé `@omega/sovereign-engine` (`git log -S` = ∅) | — |
| **2026-05-30/31** | les DEUX encore activement modifiés (P3) | session courante |

## 2. Verdict sur le « pourquoi du doublon »
**Ni erreur pure, ni duplication accidentelle, ni séparation d'autorité volontaire propre → HYBRIDE : dérive de conception par accrétion + migration inachevée.**
1. **Séparation volontaire initiale** (février) : scribe-engine = l'écrivain (governed writing), sovereign-engine = le scorer/émotion. Légitime.
2. **Glissement en duplication** (25 mars) : sovereign s'est doté de sa **propre génération K2** (chunked v4) — dupliquant le rôle d'écriture de scribe — et a été couronné « production-v1 » par ENGINE_STATUS le même jour.
3. **Persistance par migration inachevée** : la bascule `creation-pipeline` scribe→sovereign **n'a jamais été codée**. Le SSOT a déclaré sovereign « production », mais le câble est resté sur scribe. = **échafaudage oublié / fork non réconcilié** (pas une décision, une dérive).

➡️ Ce n'est donc PAS « un vieux prototype vs le vrai moteur » (récit trop simple). C'est : **un pipeline de prod légitime (scribe+creation-pipeline, scellé 8 fév) qu'on n'a jamais re-routé vers le successeur prévu (sovereign K2, couronné 25 mars).**

## 3. Registre d'identité moteur (lève la collision de noms)
> Règle : le mot nu **« Scribe »** est INTERDIT dans les décisions d'architecture. Utiliser les noms désambiguïsés ci-dessous.

| Entité (nom désambiguïsé) | Réalité | Statut normatif (doc) | Statut runtime (code) | Date | Note |
|---|---|---|---|---|---|
| **SovereignEngine** (`@omega/sovereign-engine`) | moteur complet : K2-gen + Juges GB/V2 + S-Oracle V2 + R6 + Duel + Dédale | **production-v1 SCELLÉ** (ENGINE_STATUS 25/03) | **0 import librairie** ; bench-exercé (scripts benchmark:*) | 15/02 → K2 le 25/03 | « le vrai OMEGA » selon SSOT, mais non câblé prod |
| **ScribeEngine-P2A** (`@omega/scribe-engine`) | governed writing : weave/weaveLLM + 7 gates + 6 oracles + rewriteLoop | « hérité P.2-A » (docs) | **câblé prod** via `creation-pipeline → runScribe` | 08/02 | pipeline de prod réel actuel |
| **K2-ScribePersona** (rôle) | générateur aveugle PF+Duras, `sovereign/src/generation/forge-to-brief.ts` | « SCRIBE » du CONTRAT_OMEGA_SCRIBE | interne sovereign | 25/03 | ≠ le package ScribeEngine-P2A (collision de noms) |
| **CreationPipeline** (`@omega/creation-pipeline`) | orchestrateur E2E | pipeline prod (8 gates) | câblé sur ScribeEngine-P2A | 08/02 | source runtime actuelle |
| **ENGINE_STATUS.md** | SSOT runtime auto-déclaré | autorité | désigne SovereignEngine | 25/03 | en contradiction avec le câblage |

## 4. Conséquence pour la décision (NCR)
Le forensique **renforce Option 1** (SovereignEngine canonique) sur le plan de l'**intention** (sovereign = successeur prévu, couronné par le SSOT) — c'est la lecture de Gemini. MAIS la migration n'a jamais été faite et ScribeEngine-P2A est le seul **runtime prouvé** — c'est la prudence de ChatGPT (ne pas jeter le seul pipeline qui tourne). 
**Recommandation fusionnée** : avant tout code, **audit comparatif court** (quel pipeline produit réellement un texte final aujourd'hui ? tests prouvant SovereignEngine en génération complète E2E ? prouvant CreationPipeline+ScribeEngine-P2A en prod ?) → puis arbitrage 1 vs 2. Option 3 (documenter la dualité, fait par ce registre) est l'état immédiat.

## VERDICT
- Statut : **PASS** (forensique livré, registre établi, collision de noms levée).
- Confiance : Haute (dates git = preuve directe).
- Forces : répond précisément à la question (hybride dérive+migration inachevée, pas erreur simple) ; registre désambiguïse définitivement « Scribe » ; chronologie sourcée commit par commit.
- Faiblesses : (1) l'« intention » (sovereign successeur) est déduite de la coïncidence K2+ENGINE_STATUS le 25/03 — forte mais pas un doc explicite « on remplace scribe » ; (2) le gain réel de migrer reste à prouver par bench (audit comparatif).
- Action requise : décision Architecte 1/2/3 APRÈS audit comparatif court (5 questions §4). DEC-007/008 restent GELÉS. Aucun code.
