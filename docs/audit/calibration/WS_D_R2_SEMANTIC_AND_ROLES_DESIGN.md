# WS-D R2 — DESIGN : remplacement sémantique + séparation des rôles (doc-only)

**Date** : 2026-06-01 · **Statut** : DESIGN (doc-only, NO CODE). Soumis à **EMP-16** (triple-preuve 3/3 avant tout code) et **EMP-17** (réutiliser l'acquis, ne jamais reconstruire à l'aveugle).
**Origine** : audit keyword (`KEYWORD_SENSOR_SYSTEMIC_AUDIT.md`) + triple-preuve R1 DIVERGENTE (`WS_D_R1_TRIPLE_PROOF_VERDICT.md` : IFI K2-circulaire, pas universellement bas).

## 1. Principe EMP-17 — l'acquis sémantique EXISTE DÉJÀ (ne pas reconstruire)
Les capteurs keyword défectueux ont **déjà un équivalent sémantique dans le code** :

| Capteur keyword (défectueux) | Équivalent SÉMANTIQUE existant (à réutiliser) | Fichier |
|---|---|---|
| IFI/sensory_richness (FR-only) + corporeal_anchoring | **focalisation = `scoreSensoryDensity`** (HYBRID : CALC + LLM bilingue `provider.scoreSensoryDensity`) — DÉJÀ dans IFI (poids 0.25) | `oracle/axes/sensory-density.ts` |
| ECC/tension_14d keyword-fallback | **`analyzeEmotionSemantic`** (Ollama) | `semantic/semantic-analyzer.ts` |
| SII/anti_cliche (liste FR, inerte) | **embeddings** (similarité cosinus vs banque de clichés) | `embeddings/ollamaEmbedder.ts` + `embeddings/similarity.ts` |

→ R2 = **re-câbler les rôles vers les capteurs sémantiques déjà présents**, PAS écrire de nouveaux capteurs. Les keyword FR-only sont des **doublons redondants** de capacités qu'OMEGA possède (cf. IFI a déjà focalisation sémantique à côté du sensory keyword).

## 2. Séparation des RÔLES par CONTEXTE (le cœur de la leçon triple-preuve)
La triple-preuve a montré : IFI est un goulot pour la **littérature** mais pas pour la **génération OMEGA** (K2-circulaire). Donc un capteur n'a pas un rôle unique — il dépend du CONTEXTE d'usage :

| Contexte | But | Rôle des capteurs keyword/style-circulaires |
|---|---|---|
| **CALIBRATION / scoring littérature** | situer une prose sur l'échelle de vérité (maîtres) | keyword = **ADVISORY** (biaisés langue/littéralité, ne doivent pas pénaliser un maître) ; sémantique = GATING |
| **GATING / génération OMEGA** | bloquer une sortie engine sous le seuil | keyword = **COMPOSITE/ADVISORY** (K2-circulaires, gameable par keyword-stuffing → pas seul gate) ; sémantique + rhythm/euphony = GATING |

Un même capteur (ex. sensory_richness) reste **calculé et loggé partout** (EMP-17, provenance DEC-014) ; seul son RÔLE varie selon le contexte. Aucune mesure supprimée.

## 3. Anti-circularité (verrou)
Les remplacements sémantiques doivent être : (a) **langue-aware** (pas FR-only) ; (b) **non gameable par keyword-stuffing** (sinon on recrée la circularité K2 d'IFI). Le juge LLM sémantique (scoreSensoryDensity) évalue la *qualité/spécificité* sensorielle, pas la présence de mots → robuste au stuffing. Les embeddings comparent le *sens*, pas les tokens. **Interdit** : remplacer un keyword FR par un keyword bilingue (resterait du comptage).

## 4. Plan de preuve (EMP-16, 3/3 AVANT tout code) — pour CHAQUE remplacement
1. Mesurer le capteur sémantique candidat sur **3 corpus indépendants** (maîtres / ALTERNANCE / goldens re-scorés macro), Ollama, déterministe, provenance DEC-014.
2. Vérifier convergence : le sémantique (a) ne pénalise plus les maîtres EN à tort (corrige le biais FR), (b) reste discriminant (ne sature pas comme l'inerte anti_cliche), (c) n'est pas gameable (test adversarial : prose keyword-stuffée ne doit pas monter).
3. 3/3 convergent → GO code (terminal, EMP-10, flag, shadow) ; 1 diverge → STOP.

## 5. Séquence R2 (gatée, rien appliqué)
- **R2.1** : prouver que `focalisation`/scoreSensoryDensity (sémantique, existant) couvre l'immersion sans biais langue → reclasser sensory_richness/corporeal en ADVISORY, focalisation reste/devient le signal gating d'immersion. (triple-preuve requise)
- **R2.2** : prouver `analyzeEmotionSemantic` ≥ keyword pour tension_14d → désactiver le fallback keyword en prod. (triple-preuve)
- **R2.3** : prouver détection cliché par embeddings → anti_cliche advisory + alerte sémantique. (triple-preuve)
- **R2.4** : matrice de rôles par contexte (calibration vs gating) câblée en CONFIG (pas dans les compute*).

## 6. Interdits (EMP-16/EMP-17 + philosophie reclasser)
- Aucun code moteur sans triple-preuve 3/3. Aucune suppression de `compute*`. Aucun keyword bilingue comme « fix ». Aucun seuil changé avant shadow + DEC-016. Toujours croiser les mesures historiques (ALTERNANCE, goldens, benches passés) — elles sont des preuves.

## VERDICT
- Statut : PASS (design conforme EMP-16/EMP-17 + reclasser-pas-supprimer).
- Confiance : Haute (les capteurs sémantiques existent déjà : sensory-density HYBRID, analyzeEmotionSemantic, embeddings).
- Forces : réutilise l'acquis (zéro capteur neuf) ; sépare rôle par contexte (répond à la divergence triple-preuve) ; verrou anti-circularité + anti-stuffing ; chaque pas gaté triple-preuve.
- Faiblesses : (1) exécution = re-score sémantique 3 corpus (Ollama, terminal) + config de rôles (code moteur) → gaté ; (2) le test adversarial keyword-stuffing reste à construire ; (3) goldens à re-scorer macro (3ᵉ corpus).
- Action requise : décision Architecte — lancer R2.1 (preuve focalisation sémantique vs keyword sur 3 corpus, terminal). Aucun code avant triple-preuve 3/3. En autonomie je peux préparer le harnais de re-score sémantique 3-corpus + le test adversarial keyword-stuffing (CALC/structure prêts à brancher Ollama).
