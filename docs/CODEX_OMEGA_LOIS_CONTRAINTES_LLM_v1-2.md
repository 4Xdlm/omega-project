# CODEX OMEGA — Lois, Contraintes LLM et Physique Littéraire
**Version** : V1.2 SEALED | **Date** : 2026-05-28
**Status** : `ACTIVE_AFTER_SEAL`
**Auteur v1.2** : Claude (Cowork) — amendement incrémental v1.1 (Claude Opus 2026-04-12)
**Mandate** : Architect "creer un codex de reference canonique" + Tribunal 2/2 IA (Gemini + ChatGPT) convergence Option C+
**Standard** : NASA-Grade L4 — chaque loi sourcée [SSOT] avec `source_file` + `commit/tag` + `scope` + `revalidate_if`
**Lectorat** : IA (Claude, ChatGPT, Gemini, futurs modèles). Version humaine prévue séparément.

---

## AVERTISSEMENT MÉTHODOLOGIQUE v1.2

Ce document est la **mémoire technique canonique** d'OMEGA. Il n'est PAS une référence narrative ; c'est un **moteur de règles impitoyable** destiné à empêcher l'amnésie architecturale des IA collaboratrices.

**Règle suprême ajoutée v1.2 (EMP-12)** : *"On contrôle avant d'écrire."* Toute IA travaillant sur OMEGA DOIT, avant toute action (mesure, calibration, code, conclusion), :
1. Consulter `OMEGA_PREFLIGHT_LOOKUP.md` pour le domaine concerné
2. Produire un bloc `CONTROL_BEFORE_WRITE` (cf. `OMEGA_CODEX_CONTROL_BEFORE_WRITE.md`)
3. Vérifier qu'aucune loi/mesure/NCR existante n'invalide l'action proposée

**Règle fondamentale héritée v1.1** (ChatGPT) : *"On n'optimise jamais OMEGA comme s'il n'y avait que le corpus. On n'optimise jamais OMEGA comme s'il n'y avait que le LLM."*

**Structure** : 3 strates temporelles + 1 ajout v1.2 (status normalisés) :
- **[SEALED]** — loi ou règle scellée, vérifiée empiriquement, non négociable sans preuve neuve
- **[OPERATIONAL]** — règle active production, validée empiriquement
- **[ACTIVE INVESTIGATION]** — résultat en cours d'interprétation, non figé
- **[REFUTED]** *(nouveau v1.2)* — hypothèse testée et invalidée empiriquement
- **[DEFERRED]** *(nouveau v1.2)* — décision reportée à Sprint futur avec mandate explicite

---

# PARTIE I — LOIS SCELLÉES

## PILIER 1 — PHYSIQUE LITTÉRAIRE (La Vérité Terrain)

### 1.1 Lois causales scellées [SEALED v1.1, INCHANGÉ]

**L37 — Chaîne causale universelle** [SEALED]
`sub_per_sentence → f26b_long_sent_rate → Tier_qualité`
- Médiation : FR=136% (amplification), EN=95%
- Seule loi causale bilingue prouvée
- **Interdit** : confondre avec CI_L37 (module rejeté, cf §5.3)
- **Source** : `docs/irm/09_LAW_REGISTRY_TOTAL.md` + `OMEGA_PHYSIQUE_LITTERAIRE_MANUEL_v1.0.md` I.6
- **Scope** : SPLIT_V2 1334 livres FR/EN

**L35 — sub_per_sentence = méga-levier FR** [SEALED]
- Quand sub double (P25→P75) : f26b +205%, mean_sent +56%, f17_knife -67%
- **Source** : `OMEGA_PHYSIQUE_LITTERAIRE_MANUEL_v1.0.md` I.6, équation C2
- **Scope** : FR uniquement

**L31 — Monopole ponctuel FR** [SEALED]
- Le point-virgule est 7.15× plus discriminant en FR qu'en EN
- `A_semi = Imp_FR / Imp_EN = 0.4157 / 0.0581 = 7.15`
- **Source** : `OMEGA_PHYSIQUE_LITTERAIRE_MANUEL_v1.0.md` I.3, Random Forest 200 arbres, 638K fenêtres FR
- **Scope** : FR vs EN comparatif

**L33 — Interaction ponctuelle FR-only** [SEALED]
- `ρ_FR(semi, dash) = 0.231` vs `ρ_EN(semi, dash) = 0.056`
- Signal ponctuel = bloc corrélé en FR uniquement
- **Source** : `OMEGA_PHYSIQUE_LITTERAIRE_MANUEL_v1.0.md` I.9

**L38 — Mur sémantique EN maximaliste** [SEALED]
- Pour prose EN maximaliste (Faulkner, Wallace, DFW), modèle structurel 42 features prédit à l'ENVERS : R²=-0.187
- Structure syntaxique = condition nécessaire NON discriminante en EN extrême
- **Source** : `OMEGA_PHYSIQUE_LITTERAIRE_MANUEL_v1.0.md` I.8

### 1.2 Lois de scaling [SEALED v1.1, INCHANGÉ]

**S1 — Scaling linéaire du couteau narratif** [SEALED, R²=1.000]
`f17_knife_count(size) = 0.01167 × size − 0.1136`
Constante proportionnelle, pas un choix stylistique.

**S2 — Scaling logarithmique de la variance rythmique** [SEALED, R²=0.999]
`cv_sent(size) = 0.0259 × ln(size) + 0.5355`
Le rythme se diversifie avec la longueur.

**S3 — Scaling logarithmique de l'entropie syntaxique** [SEALED, R²=0.999]
`f19a_entropy(size) = −0.0261 × ln(size) + 0.8187`
La syntaxe se régularise avec la longueur. **INVERSE de S2.**

### 1.3 Noyau structurel robuste (CALC V3.4) [SEALED]

5 features stables multi-niveaux, bilingues (noms exacts du code source) :
- `f24c_contrast_delta` — contraste delta entre paragraphes
- `f33b_commas_count` — comptage de virgules (quantité, pas densité)
- `f1a_rhythm_variance` — variance rythmique des phrases
- `f33c_dot_comma_ratio` — ratio points/virgules (⚠️ PAS "densité de tirets")
- `f12_tense_switches` — nombre de changements de temps verbaux

**SSOT** : `packages/sovereign-engine/src/scoring/dispatcher/coefficients-v3-4.ts`
**Modèle** : Ridge α=1.0, 3 modèles séparés FR/EN/FALLBACK
**Performance** : `ρ_dispatch=0.6138` sur HOLDOUT_V2
**Corpus train** : 1334 œuvres (FR: 788, EN: 546), holdout V2 264 œuvres

**SHA256 attendu (CLAUDE.md doctrinal)** : `e75e3bb07d8655c6e0ee1ca99b32a2a043a44cb9c1681ee3d7a3dd305fe8424c`
**SHA256 empirique actuel (2026-05-27)** : `adbf41024d2886bf1c7f50a723eb69e6a9bc8389b1130b7d13406370a0ba441e`
**⚠️ SEAL DRIFT DOCUMENTÉ** : NCR `NCR_V3_4_SEAL_DRIFT` — Sprint V3.5+ forensic requis

**PLATEAU CALC scellé** : toute future feature CALC doit prouver un MÉCANISME NOUVEAU.
**Kill-switch** : `+0.02` INCHANGÉ — interdit de baisser le seuil post-hoc.

### 1.4 Features rejetées (Registre des rejets) [SEALED, ENRICHI v1.2]

| Feature | Raison du rejet | Date | Source |
|---------|----------------|------|--------|
| f9a | Kill-switch FAIL, VIF 4.46 | 2026-04-10 | M0b V3.3 retrain |
| body_binding | Δρ +0.012 < seuil +0.02 (shadow) | 2026-04-11 | M0B_SLIM_V35_RETRAIN_VERDICT.md |
| coverage | Redondant, collinéarité 0.85-0.99 | 2026-04-11 | SENSOR_BENCH_REPORT_V2.md |
| density | Redondant, collinéarité 0.85-0.99 | 2026-04-11 | SENSOR_BENCH_REPORT_V2.md |
| concreteness | Redondant, collinéarité 0.85-0.99 | 2026-04-11 | SENSOR_BENCH_REPORT_V2.md |
| emotion_14d keyword | Δ Spearman +0.021 < seuil +0.030 | 2026-04-08 | R-PHYSICS kill-switch |
| **Option α threshold tuning w3** *(v1.2)* | Max distance 0.077 < threshold min 0.1 | 2026-05-27 | V2_1_4_A_VERDICT_OPTION_ALPHA_FAIL |
| **Calibration weights V2.1 seule** *(v1.2)* | Cosmétique (boundary_hash identique 100%) | 2026-05-27 | V2_1_5_1_behavioral_audit |

### 1.5-1.7 Asymétries FR/EN + Paradoxe sensoriel + Statut émotion [SEALED v1.1, INCHANGÉ]

(Voir CODEX v1.1 §1.5-1.7 — pas de modification v1.2)

### 1.8 NOUVELLES LOIS V2.1 CHUNKING ADAPTATIF *(v1.2)* [SEALED]

#### LAW-CHUNK-040 — Weights V2.1 cosmétiques (Loi de l'Illusion Cosmétique) [SEALED]
- **Énoncé** : Les weights `(w1, w2, w3)` de `packages/sovereign-engine/src/chunking/optimizer/cost.ts:computeTotalCost()` n'altèrent QUE le score numérique final, PAS les boundaries physiques des chunks produits par `chunkAdaptive()`.
- **Source empirique** : `outputs/V2_1_5_1_behavioral_audit.json` — 30 livres × 6 configs (V2.1.2 baseline + V2.1.5 best brut + V2.1.5 normalisé + 3 variations sum-constant 0.6) → `boundary_hash` SHA256 identique 100% sur 30/30 livres.
- **Cause root code** : (a) `boundary.ts:162` fallback `greedyEvenlySpaced()` weights-blind quand `binomial(candidates, k) > 10000` + (b) `arc_breakage` déterministe (arcs.length=1/livre via L41) + (c) `discontinuity=0` systématique (L41 w3 mort) → 3/3 composantes uniformes → argmin invariant aux weights.
- **Scope** : V2.1 chunking adaptatif sur corpus FR/EN SPLIT_V2.1.1_MATCHED (254 livres 5K-60K mots).
- **Interdit (FORBID-CHUNK-001)** : Calibrer V2.1 weights seuls (w1, w2, w3) sans tester `boundary_hash` AVANT bench bulk.
- **Interdit (FORBID-CHUNK-002)** : Adopter un "best combo" basé uniquement sur `cost` brut.
- **Interdit (FORBID-CHUNK-003)** : Comparer `cost` brute cross-grids avec `sum(w)` différents (artefact mathématique — cf cas V2.1.5).
- **Autorise** : Maintenir `DEFAULT_ADAPTIVE_CONFIG = (0.3, 0.2, 0.1)` par défaut conservateur (cosmétique mais inoffensif).
- **Revalidate_if** : `cost.ts:computeTotalCost` modifié OU `boundary.ts:findBestBoundarySet` refactoré OU greedy threshold (10000) modifié.
- **Tag** : `phase-v2.1.5.1-behavioral-audit-2026-05-27`

#### LAW-CHUNK-041 — w3 inerte by design / featureDistance trop faible [SEALED]
- **Énoncé** : L'axe `w3` (discontinuity weight) est architecturalement inerte sur le corpus FR/EN actuel avec l'implémentation V2.1. `featureDistance(window_i, window_{i+1})` produit des magnitudes intrinsèquement faibles (`max observé = 0.077` sur 4037 windows mesurées, p99=0.017, médian=0.002), inférieures au threshold minimum testé (0.1).
- **Source empirique** : `outputs/V2_1_4_A_VERDICT_OPTION_ALPHA_FAIL_2026-05-27.md` — bench 360 calls + 4037 distances probe sur 5 livres pilot.
- **Cause root** : `EmotionalArcDetector.detect()` (file `packages/sovereign-engine/src/chunking/detector/emotionalArc.ts:62`) avec features VAKOG + body_binding + concreteness + sentiment + punctuation_density — amplitudes effectives concentrées near zero → distances Euclidiennes toujours faibles.
- **Scope** : Corpus FR/EN lexical (Houellebecq, Beckett, Stevenson, Steinbeck, Vonnegut, Mantel, Hardy, Greene, etc.) avec window_size=5.
- **Interdit (FORBID-CHUNK-004)** : Abaisser `intensity_threshold` sous 0.1 (risque sursegmentation catastrophique : à threshold=0.005, >50% windows deviennent change-points).
- **Interdit (FORBID-CHUNK-005)** : Relancer Option α (threshold tuning seul) — empiriquement morte.
- **Autorise** : Explorer Options β (CUSUM/PELT/Bayesian change-point), γ (direct chunk variance cost.ts), ε (threshold relatif quantile), ζ (window_size variations).
- **Revalidate_if** : Implémentation `featureDistance()` modifiée OU corpus change (nouveau type texte avec amplitudes plus élevées) OU `window_size` modifié.
- **Tag** : `phase-v2.1.4-a-option-alpha-fail-2026-05-27`

#### LAW-CHUNK-042 — chunkAdaptive() scaling LINÉAIRE O(N) [SEALED]
- **Énoncé** : L'infrastructure de découpage `chunkAdaptive()` (file `packages/sovereign-engine/src/chunking/adaptive.ts`) traite le texte en complexité strictement linéaire avec un coefficient constant `~6 ms/Kword` sur la plage 10K-80K mots.
- **Source empirique** : `outputs/V2_1_4_B_VERDICT_NO_STALL_REPRODUCED_2026-05-27.md` — 3 phases empiriques (5 livres profile + 5 livres stall hunt + 50 livres consécutive memory cumul).
- **Mesures** :
  - Scaling factor `ratio_runtime / ratio_word_count = 7.72 / 8.12 = 0.95` (1.0 = linéaire pur)
  - Rate constant : ~6 ms/Kword sur tous samples (9854w=68ms, 19439w=127ms, 29878w=169ms, 50088w=304ms, 80008w=525ms)
  - Memory growth : ~2.2 MB/book stable (50 books cumul 9.5 → 117.8 MB, GC fonctionne)
  - Stall reproductibilité : 50/50 livres consécutive = 12s, **0 timeout, 0 crash**
- **Scope** : sandbox Linux + chunkAdaptive() V2.1 (commit `5f918761` post-fix costScore=0).
- **Interdit (FORBID-CHUNK-006)** : Invoquer complexité O(N²) cachée pour expliquer un ralentissement `chunkAdaptive()` sans nouvelle preuve empirique post-2026-05-27.
- **Interdit (FORBID-CHUNK-007)** : Refactor "optimisation perf O(N²)" sans benchmark before/after démontrant scaling factor > 1.5.
- **Autorise** : Bulk run 254 livres × 9 combos = 11 min Windows-side validé (V2.1.5).
- **Autorise** : Option A timeout/book défensive (env `OMEGA_V2_1_CHUNK_TIMEOUT_MS`) pour bulks longs Windows-side (memory peak 1.76 GB observé V2.1.5).
- **Revalidate_if** : `chunkAdaptive()` modifié OU `ChunkBoundaryOptimizer.findBestBoundarySet()` modifié OU sentences>4000 testées.
- **Tag** : `phase-v2.1.4-b-no-stall-2026-05-27`

---

## PILIER 2 — PSYCHOLOGIE DU LLM (Ce qui casse) [SEALED v1.1, INCHANGÉ]

(Voir CODEX v1.1 §2.1-2.7 : BB-01 semicolons non pilotables, BB-02 plancher 35w, BB-03 conflits améliorants, BB-C01 sub constante, BB-P06 composite stable / features instables, hiérarchie obéissance, puits gravitationnel L01, facteurs conversion, illusion f17 L02, micro-chirurgie échec L11, premier tir > itération)

**Source supplémentaire indexée v1.2** : `docs/CLAUDE_OBSERVABLE_LAWS.md` — 15 lois L01-L15 (157 lignes, Phase A+B baselines 30 runs × 10 scènes)

---

## PILIER 3 — DOGME DE L'HYBRIDATION (CALC vs LLM) [SEALED v1.1, INCHANGÉ]

(Voir CODEX v1.1 §3.1-3.5 : Contrat SCRIBE/OMEGA, CALC=Douanier ADR-003, toxicité feedback sémantique Mode C Δ-0.264, rejection sampling Mode B Δ+0.103, labels vs contraintes mécaniques)

---

## PILIER 4 — BIAIS DE SÉLECTION ET SCORING [SEALED v1.1, INCHANGÉ]

(Voir CODEX v1.1 §4.1-4.3 : Composite insensible au style L13, scène conditionne plafond L14, asymptote prompt engineering)

---

## PILIER 5 — CIMETIÈRE DES HALLUCINATIONS IA *(NOUVEAU v1.2)* [SEALED]

> **Objet** : L'IA n'est pas omnisciente. Ses biais statistiques par défaut la conduisent vers des pièges récurrents. Ce pilier documente le **mécanisme cognitif** de chaque hallucination pour vacciner les futurs modèles. Format : registre structuré (pas prose) avec ID stable, mécanisme, source, statut, leçon.

### HALLU-IA-001 — Hypothèse Dispatch FR/EN à faire (Phase 3A)
- **Statut** : RÉFUTÉ
- **Date** : 2026-04-11
- **Hallucination** : 3 IA (Claude + ChatGPT + Gemini) ont validé unanimement "dispatch FR/EN séparé" comme prochain chantier
- **Réalité** : Le code montrait que le dispatch était DÉJÀ séparé (3 modèles Ridge indépendants depuis V3.1, vérifié `coefficients-v3-4.ts`)
- **Mécanisme** : Consensus multi-IA amplifie les erreurs quand personne ne vérifie la prémisse factuelle
- **Source** : Mémoire `feedback_3ia_hallucination.md`
- **Leçon** : TOUJOURS lire le code source AVANT de proposer une option architecturale

### HALLU-IA-002 — Cowork provider unverified
- **Statut** : RÉFUTÉ
- **Date** : 2026 (multiple)
- **Hallucination** : Tribunal IA a validé une prémisse sur infrastructure Cowork non vérifiable
- **Réalité** : Sandbox ne peut PAS confirmer provider/imports d'un script (cf `feedback_cowork_provider_assumption.md`)
- **Mécanisme** : IA assume connaissance d'infrastructure non observable
- **Leçon** : Marquer HYPOTHÈSE toute affirmation infrastructure jusqu'à vérification runtime Claude Code

### HALLU-IA-003 — Option α threshold w3 tuning
- **Statut** : RÉFUTÉ EMPIRIQUEMENT
- **Date** : 2026-05-27
- **Hallucination** : Gemini + ChatGPT prescrivaient "Abaisser intensity_threshold à 0.10 ou 0.15"
- **Réalité** : V2.1.4-A — 0/4037 distances measurées > 0.1 ; max observé = 0.077
- **Mécanisme** : IA assume que threshold tuning est solution générique sans probe distance distribution
- **Source** : `V2_1_4_A_VERDICT_OPTION_ALPHA_FAIL_2026-05-27.md`
- **Leçon** : Probe direct distribution distances AVANT tester thresholds

### HALLU-IA-004 — Scaling O(N²) caché dans chunkAdaptive()
- **Statut** : RÉFUTÉ EMPIRIQUEMENT
- **Date** : 2026-05-27
- **Hallucination** : Gemini a suspecté "opération O(N²) cachée dans calcul limites/distances matricielles"
- **Réalité** : V2.1.4-B — scaling factor empirique 0.95 (linéaire pur sur 10K-80K mots, ~6 ms/Kword)
- **Mécanisme** : IA assume effondrement asymptotique pour expliquer ralentissement sans profiler. Ignore gestion mémoire Node.js V8 (Garbage Collector ~2.2 MB/book stable)
- **Source** : `V2_1_4_B_VERDICT_NO_STALL_REPRODUCED_2026-05-27.md`
- **Leçon** : Profiler empirique 5 samples calibrés AVANT diagnostic complexité algorithmique

### HALLU-IA-005 — Grid {0.1, 0.2, 0.3} artefact mathématique
- **Statut** : RÉFUTÉ EMPIRIQUEMENT
- **Date** : 2026-05-27
- **Hallucination** : ChatGPT a prescrit grille `w1/w2 ∈ {0.1, 0.2, 0.3}` pour V2.1.5 bulk 254
- **Réalité** : Best combo brut résultant `(0.1, 0.1, 0.1)` = ARTEFACT mathématique pur (sum=0.3 trivialement plus bas que sum V2.1.2=0.6, donc cost mécaniquement plus bas). Après normalisation `cost/sum`, V2.1.2 reste meilleur (0.174 vs 0.268)
- **Mécanisme** : IA propose grille exploratoire sans imposer contrainte mathématique de somme constante. Optimiseur "triche" en minimisant trivialement
- **Source** : `V2_1_5_BULK_VERDICT_2026-05-27.md`
- **Leçon** : Toute grille de pondération doit fixer `sum(w) = constant` OU normaliser explicitement par sum AVANT comparaison

### HALLU-IA-006 — Calibration weights V2.1 = signal réel (3 sprints consécutifs)
- **Statut** : RÉFUTÉ EMPIRIQUEMENT
- **Date** : 2026-05-27
- **Hallucination** : Tribunal × 3 sprints (V2.1.2 pilot 30 + V2.1.3 partial 32 + V2.1.5 bulk 254) ont accepté que "best combo (0.3, 0.2, 0.1) gain -36.25%" était calibration empirique valide
- **Réalité** : V2.1.5.1 BEHAVIORAL AUDIT — 30/30 livres × 6 configs → `boundary_hash` identique 100%. Toute la chaîne calibration weights = COSMÉTIQUE (cf LAW-CHUNK-040)
- **Mécanisme** : Aucune IA ni la doctrine PROVE IT n'a testé `boundary_hash` AVANT 3 sprints calibration. Le test (30 livres × 6 configs = 16s, zero infrastructure cost) aurait évité ~10-12h de "calibration" cosmétique
- **Source** : `NCR_V2_1_WEIGHTS_SCORE_ONLY_NO_DECISION_EFFECT_2026-05-27.md`
- **Leçon** : Test `boundary_hash` OBLIGATOIRE avant toute calibration weights en chunking/scoring

### HALLU-IA-007 — Création nouveau Codex en ignorant v1.1 existant
- **Statut** : ÉVITÉ DE JUSTESSE (Architect a posé la question critique 2026-05-27)
- **Date** : 2026-05-27
- **Hallucination** : Tribunal IA proposait création `OMEGA_CODEX_MASTER.md` + 4 couches sans avoir vérifié que `CODEX_OMEGA_LOIS_CONTRAINTES_LLM_v1-1.md` existait depuis 2026-04-12
- **Réalité** : Codex v1.1 existant + 1075 lignes MANUEL_v1.0 + 150 magic numbers index + 1698 analyses corpus per-work + 42 bestsellers + 3 rapports physique-littéraire
- **Mécanisme** : Aucune IA n'a appliqué règle prioritaire CLAUDE.md "vérifier précédents avant action". Tribunal a applaudi création nouveau document = amnésie architecturale collective
- **Leçon mère (origine EMP-12)** : `CONTROL_BEFORE_WRITE` doit devenir PROTOCOLE OBLIGATOIRE et auditable pour toute IA OMEGA

### Bilan cimetière (cumul sessions)
- ≥7 hallucinations IA documentées (3 antérieures + 6 session 2026-05-27)
- Tribunal multi-IA convergent ≠ vérité empirique
- PROVE IT empirique + audit code post-empirie = bouclier obligatoire

---

# PARTIE II — RÈGLES OPÉRATIONNELLES SCELLÉES

## 5.1 Checklist Architecte (avant chaque nouveau module) [ENRICHIE v1.2]

- [ ] FR et EN séparés ?
- [ ] Instruction de volume explicite dans le prompt ?
- [ ] Single-shot > 800 mots attendus ? → K2 Chunking obligatoire
- [ ] Le CALC donne-t-il des conseils d'écriture au LLM ? → INTERDIT (§3.2)
- [ ] Le retry modifie-t-il température + seed ?
- [ ] Les budgets token API (judge vs draft vs patch) sont-ils isolés ?
- [ ] La feature candidate a-t-elle un mécanisme NOUVEAU (pas "une de plus") ?
- [ ] Le bench pilote a-t-il été vérifié à l'échelle du corpus entier ?
- [ ] SCRIBE écrit, OMEGA contrôle — les rôles sont-ils respectés ? (§3.1)
- [ ] **NOUVEAU v1.2** : `CONTROL_BEFORE_WRITE` bloc produit + lu `OMEGA_PREFLIGHT_LOOKUP.md` ?
- [ ] **NOUVEAU v1.2** : Si calibration chunking → `boundary_hash` testé sur 6 configs AVANT bench bulk ?
- [ ] **NOUVEAU v1.2** : Le sujet a-t-il été vérifié contre Pilier 5 (Cimetière) pour éviter re-test d'hallucination connue ?
- [ ] **NOUVEAU v1.2** : Source `source_file:line` + `commit/tag` + `scope` cités pour chaque claim empirique ?

## 5.2 Les 12 Règles d'Or (ChatGPT) [OPERATIONAL v1.1, INCHANGÉ]

```
R1   Ne jamais confondre physique du corpus et physique du LLM.
R2   Ne jamais transformer une corrélation pilote en loi.
R3   Toujours tester FR et EN séparément.
R4   Les labels littéraires ne pilotent pas le LLM ; les contraintes mécaniques oui.
R5   Le LLM libre + sélection bat le LLM coaché par CALC.
R6   Premier tir > convergence itérative.
R7   Micro-chirurgie locale > réécriture globale.
R8   Toute feature doit survivre à l'échelle, pas juste à 500 mots.
R9   Toute innovation CALC doit prouver un mécanisme nouveau.
R10  OMEGA garde sa langue ; on traduit vers le LLM, pas l'inverse.
R11  CALC mesure et filtre ; il ne doit pas devenir un pseudo-prof de style.
R12  Une reprise sans checkpoint mémoire est interdite.
```

### 5.2.bis — Les 3 Règles d'Or v1.2 (CODEX OMEGA)

```
R13  CONTROL_BEFORE_WRITE obligatoire avant toute action (EMP-12.1).
R14  Test boundary_hash AVANT toute calibration weights en chunking.
R15  Cimetière des hallucinations IA = lecture obligatoire avant suggérer option architecturale.
```

## 5.3 Ce qui est définitivement rejeté [SEALED — JAMAIS rouvrir sans preuve neuve, ENRICHI v1.2]

| Rejet | Raison | Date | ID |
|-------|--------|------|----|
| Feedback sémantique CALC → LLM | Bench R6 : Δ-0.264, toxique | 2026-04-11 | FORBID-LLM-001 |
| Itération globale de correction | Premier tir > convergence | 2026-04-11 | FORBID-LLM-002 |
| Émotion keyword CALC | Δ Spearman +0.021, kill-switch | 2026-04-08 | FORBID-CALC-001 |
| CI_L37 (module, PAS la loi L37) | Saturé à 100 intra-OMEGA | Phase R | FORBID-CALC-002 |
| Language Profiles | r négatif vs qualité | Phase R | FORBID-CALC-003 |
| Genius Engine G=(D×S×I×R×V) | r≈0 vs Tier | Phase R | FORBID-CALC-004 |
| Polish | Sprint 2, NO-OP prouvé | Phase R | FORBID-CALC-005 |
| Modèle unifié FR/EN | Dilue le signal | 2026-04-10 | FORBID-SCORING-001 |
| Abaissement post-hoc du kill-switch | Interdit par doctrine | 2026-04-11 | FORBID-SCORING-002 |
| **Option α threshold w3 tuning** *(v1.2)* | Empiriquement impossible (max distance 0.077) | 2026-05-27 | FORBID-CHUNK-005 (cf LAW-CHUNK-041) |
| **Calibration weights V2.1 seule** *(v1.2)* | Cosmétique (boundary_hash identique) | 2026-05-27 | FORBID-CHUNK-001 (cf LAW-CHUNK-040) |
| **Bulk V2.1 sans test boundary_hash préalable** *(v1.2)* | Risque calibration cosmétique x N sprints | 2026-05-27 | FORBID-CHUNK-001 |
| **Hypothèse O(N²) chunkAdaptive() sans preuve nouvelle** *(v1.2)* | Réfuté V2.1.4-B (factor 0.95) | 2026-05-27 | FORBID-CHUNK-006 (cf LAW-CHUNK-042) |

## 5.4 Leçon méta-cognitive : consensus multi-IA ≠ vérité [OPERATIONAL, RENFORCÉE v1.2]

3 IA (Claude + ChatGPT + Gemini) ont validé unanimement "dispatch FR/EN séparé" comme prochain chantier (Phase 3A, 2026-04-11). Le code montrait que le dispatch était DÉJÀ séparé. **Cumul session 2026-05-27** : 6 hallucinations consécutives 2/2 IA documentées (cf Pilier 5).

**Règle renforcée v1.2** : TOUJOURS lire le code source ET tester empiriquement AVANT de proposer une option architecturale. **AUCUN consensus 2/2 IA n'est suffisant** pour court-circuiter PROVE IT empirique.

---

# PARTIE III — INVESTIGATIONS ACTIVES (non figées)

### 6.1 Le Plafond d'Asphyxie — Règle des 500 mots [SEALED v1.2 — DEPUIS V1 OMEGA 2026-04-13]
*(Mise à jour status)* : Plafond brisé par K2 Chunking 4×750w. V1 SCELLÉ. Closure : OMEGA_V1_SEAL_CERTIFICATE.md (2026-04-13).

### 6.2 Biais de sélection hostile [SEALED v1.2 — RÉSOLU R7]
*(Mise à jour status)* : R7 Best-of-N (N=7, hostile selection composite - 1.5 × max(0, 85-min_axis)) + R7-B micro-fixes (3-shot median) ont mitigé. V1 SCELLÉ. avg=90.07, best=91.74.

### 6.3 Facteur de conversion P2 [DEFERRED v1.2]
*(Mise à jour status)* : Mesures partielles uniquement (1 scène = 1438 mots × 0.58 facteur). Pas de mandate session active. Re-ouverture conditionnée à reprise scribe V5.

### 6.4 NOUVEAU v1.2 — Vrais leviers comportementaux chunking V2.1 [ACTIVE INVESTIGATION]
- **Question** : Quels paramètres affectent RÉELLEMENT les boundaries (puisque weights = cosmétique per LAW-CHUNK-040) ?
- **Hypothèses à tester (Sprint V2.1.6+ recommandé)** :
  | Levier | Action probe | Effort | Risque |
  |---|---|---|---|
  | `target_size` | Tester 500/750/1000 mots | 30 min | Faible |
  | `max_chunks` | Tester 3/5/7/10 | 30 min | Faible |
  | `min_chunks` | Tester 2/3/4 | 15 min | Faible |
  | `greedy threshold` (10000) | Tester 1000/100000/Infinity | 30 min | Faible |
  | `window_size` detector | Tester 1/3/5/10 (Option ζ Gemini) | 30 min | Faible |
  | Refonte algorithme | Beam search / DP / refonte cost weights | 1-2j | HAUT |
- **Méthode obligatoire** : Test `boundary_hash` AVANT bench bulk (cf R14).
- **Statut** : ACTIVE INVESTIGATION, Sprint V2.1.6+ pending Architect mandate.

### 6.5 NOUVEAU v1.2 — V3.4 SEAL DRIFT forensic [DEFERRED]
- **Issue** : SHA256 empirique `coefficients-v3-4.ts` = `adbf4102...` ≠ doctrinal CLAUDE.md `e75e3bb...`
- **NCR existant** : `NCR_V3_4_SEAL_DRIFT` (Sprint V2.1.1 P1 doctrinal)
- **Mandate** : forensic Sprint V3.5+ (git log investigation 30 min)
- **Statut** : DEFERRED — non bloquant V2.1, mais doit être résolu avant tout commit code scoring

---

## PARTIE IV — AMENDEMENTS DOCTRINAUX *(NOUVEAU v1.2)*

### EMP-12 — CODEX_OMEGA_PREFLIGHT_MANDATORY [ACTIVE_AFTER_SEAL]

**Énoncé** : Avant TOUT Sprint significatif (≥1 mesure, ≥1 calibration, ≥1 commit code production, ≥1 conclusion empirique nouvelle), l'IA et l'Architecte DOIVENT :

1. **Identifier le domaine** concerné (chunking / scoring / PVI / doctrine / TypeScript / frontend)
2. **Consulter `OMEGA_PREFLIGHT_LOOKUP.md`** pour les entrées obligatoires du domaine
3. **Lire les documents prescrits** (CODEX v1.X + NCRs + rapports historiques pertinents)
4. **Vérifier qu'aucune loi/mesure/NCR/interdiction existante** n'invalide l'action proposée
5. **Produire un bloc `CONTROL_BEFORE_WRITE`** (format strict cf `OMEGA_CODEX_CONTROL_BEFORE_WRITE.md`)
6. **Attendre validation Architecte** si :
   - Loi existante impactée
   - Mesure déjà documentée
   - Seal concerné
   - NCR ouverte liée
   - Contradiction détectée
7. **Écrire UNIQUEMENT après ce contrôle**

**État FAIL_BLOCKING** : Toute écriture/mesure/calibration produite sans `CONTROL_BEFORE_WRITE` validé est invalide. STOP immédiat + NCR ouvert + arbitrage Architecte requis.

**Extension Phase 2 (Sprint S13+)** : Wrapper `commit-with-tests.ps1 --codex-preflight` qui vérifie présence du bloc `CONTROL_BEFORE_WRITE` dans le commit message.

### EMP-12.1 — CONTROL_BEFORE_WRITE PROTOCOL [ACTIVE_AFTER_SEAL]

**Énoncé** : Le bloc `CONTROL_BEFORE_WRITE` (format détaillé dans `OMEGA_CODEX_CONTROL_BEFORE_WRITE.md`) doit précéder toute action OMEGA. Il sert de preuve auditable que l'IA a appliqué la règle "on contrôle avant d'écrire".

**Format obligatoire** (minimal) :
```
CONTROL_BEFORE_WRITE
- Domaine          : [chunking/scoring/PVI/doctrine/typescript/frontend/autre]
- Documents lus    : [fichiers + lignes pertinentes]
- Lois applicables : [IDs LAW-* + statuts]
- Mesures historiques concernées : [IDs MEASURE-*]
- NCRs liées       : [IDs NCR-*]
- Interdictions applicables : [IDs FORBID-*]
- Hallucinations à éviter : [IDs HALLU-IA-*]
- Conflits détectés : [oui/non + détails]
- Verdict          : GO_WRITE | GO_READ_MORE | STOP_ARCHITECT_ARBITRATION
```

**État FAIL_BLOCKING** : Bloc absent OU verdict ≠ GO_WRITE → STOP.

---

## CONCLUSION v1.2

Ce Codex consolide la mémoire technique OMEGA accumulée depuis février 2026. Sa raison d'être : **empêcher l'amnésie architecturale des IA collaboratrices**.

**Chiffres clés v1.2** :
- 4 piliers v1.1 maintenus intacts (38 lois L01-L38 + S1-S3 + BB-xx + paradoxe sensoriel + asymétries FR/EN + statuts émotion)
- 3 nouvelles lois SEALED ajoutées (LAW-CHUNK-040/041/042)
- 1 nouveau pilier (Pilier 5 — Cimetière des hallucinations IA, 7 cas documentés)
- 4 nouvelles interdictions Registre rejets (FORBID-CHUNK-001/005/006 + ancrage 002/003/004)
- 3 nouvelles Règles d'Or (R13/R14/R15)
- 4 nouveaux items Checklist Architecte
- 2 amendements doctrinaux (EMP-12 + EMP-12.1)

**Changelog V1.1 → V1.2** :
1. Ajout LAW-CHUNK-040 (weights cosmétiques empirique V2.1.5.1)
2. Ajout LAW-CHUNK-041 (w3 inerte by design empirique V2.1.4-A)
3. Ajout LAW-CHUNK-042 (scaling linéaire O(N) empirique V2.1.4-B)
4. Nouveau Pilier 5 — Cimetière des hallucinations IA (7 cas + leçons)
5. Registre des rejets enrichi (4 nouvelles entrées IDs FORBID-CHUNK-001/005/006 + ancrage IDs antérieurs)
6. Checklist Architecte enrichie (4 nouveaux items obligatoires)
7. 3 nouvelles Règles d'Or v1.2 (R13/R14/R15)
8. EMP-12 CODEX_OMEGA_PREFLIGHT_MANDATORY + EMP-12.1 CONTROL_BEFORE_WRITE
9. Status normalisés enrichis (REFUTED + DEFERRED ajoutés)
10. SHA256 V3.4 actuel documenté (drift vs doctrinal CLAUDE.md référencé)
11. Investigation actives mise à jour (6.1-6.3 closures + 6.4-6.5 nouvelles)
12. Source `source_file:line` + `commit/tag` + `scope` + `revalidate_if` obligatoires pour lois v1.2

**Documents companion (à créer Phase 1 post-ratification)** :
- `OMEGA_PREFLIGHT_LOOKUP.md` (sas obligatoire pré-action par domaine)
- `OMEGA_CODEX_CONTROL_BEFORE_WRITE.md` (protocole strict CBW)
- `OMEGA_LAWS_REGISTRY.yaml` (machine-readable, IDs stables LAW-*)
- `OMEGA_MEASURES_REGISTRY.yaml` (mesures historiques scellées)
- `OMEGA_NCR_INDEX.yaml` (NCRs ouverts/résolus/différés)

**Action requise Architecte** :
1. Ratification statut `ACTIVE_AFTER_SEAL → ACTIVE_AFTER_SEAL`
2. Validation 5 documents companion (création workspace draft puis review)
3. Approbation EMP-12 + EMP-12.1 dans `omega-project/CLAUDE.md` (v3.158.0 → v3.159.0)
4. Sceller v1.2 dans `omega-project/docs/CODEX_OMEGA_LOIS_CONTRAINTES_LLM_v1-2.md`
5. Tag `phase-codex-v1.2-sealed-2026-MM-DD`

---

_CODEX OMEGA v1.2 DRAFT produit par Claude (Cowork) — 2026-05-27 — Tribunal 2/2 IA convergence Option C+ — Amendement INCRÉMENTAL v1.1 (Claude Opus 2026-04-12) — Vérification précédents CLAUDE.md règle prioritaire appliquée — Standard NASA-Grade L4 / DO-178C Level A — Lectorat IA (humain plus tard)_

**STATUT FINAL** : `ACTIVE_AFTER_SEAL`
