# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — DÉCISION ARCHITECTURALE SCELLÉE
# DEC-20260411-003 : R6 REJECTION SAMPLING — HYBRIDATION CALC×LLM
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date        : 2026-04-11
# Statut      : 🔒 SCELLÉE — UNANIMITÉ 4/4 (Francky + Claude + ChatGPT + Gemini)
# Autorité    : Francky (Architecte Suprême)
# Prérequis   : M0b_slim V3.4 scellé (ρ_dispatch=0.6138), CALC plateau confirmé
# Bench       : bench-r6-hybrid.ts — 10 scènes × 3 modes, Ollama Qwen 3.5:35b-a3b
#
# ═══════════════════════════════════════════════════════════════════════════════

## CONTEXTE — CE QUI A PROVOQUÉ CETTE DÉCISION

Le CALC V3.4 a atteint un plateau à ρ_dispatch=0.6138. Tous les candidats de
features supplémentaires sont épuisés (f9a rejeté VIF 4.46, body_binding shadow
Δ+0.012 < seuil +0.02, coverage/density/concreteness rejetés collinéarité 0.85-0.99).

Question ouverte : comment utiliser ce CALC scellé pour améliorer la qualité de
la prose générée ? Trois stratégies testées empiriquement.

---

## RÉSULTATS DU BENCH R6 (V2, gate=4.2, 10 scènes)

| Mode | Nom | Score moyen | Passage gate | Δ vs baseline |
|------|-----|-------------|-------------|---------------|
| A | Roue Libre | 4.255 | 50% | — (baseline) |
| B | Gate Dur (rejection sampling) | 4.600 | 100% | +0.103 |
| C | Laisse Élastique (feedback sémantique) | 3.547 | 10% | -0.264 |

**Mode B = GAGNANT.** Mode C = TOXIQUE, REJETÉ DÉFINITIVEMENT.

---

## LA DÉCISION — 6 POINTS SCELLÉS

### POINT 1 — ARCHITECTURE : REJECTION SAMPLING (MODE B)

Le LLM génère librement via SCRIBE. Le CALC V3.4 score le résultat.
Si le score < seuil → rejet aveugle, nouvelle tentative (max 2 retries).
Le LLM ne reçoit JAMAIS de feedback basé sur le CALC.

**Doctrine** : Le CALC contrôle la **sélection**, pas la génération.
Le CALC est un douanier, pas un coach.

**Pourquoi ça marche** :
Le LLM a une variance naturelle (stochastique). Sur 3 tirages, la probabilité
qu'au moins un dépasse le seuil est 1-(1-p)³. Avec p≈0.5 (bench baseline),
P(≥1 pass) = 87.5%. Avec température progressive, p augmente à chaque retry.

**Conditions d'échec** :
- Scène intrinsèquement difficile (contraintes contradictoires)
- Modèle LLM dont le floor naturel est sous le seuil
- Seuil trop élevé pour le modèle utilisé (→ env var configurable)

### POINT 2 — FEEDBACK SÉMANTIQUE INTERDIT

Le Mode C (traduire les z-scores CALC en directives textuelles) est REJETÉ
sur base empirique :
- Δscore moyen : -0.264 (dégradation)
- 7/9 scènes dégradées
- Passage gate : 10% (vs 50% baseline)

**Mécanisme causal identifié** : les features CALC sont couplées. Corriger
f33b (virgules) via directive "ajoute des virgules" provoque des effets
secondaires sur f1a (rythme) et f24c (contraste). Le LLM surcorrige et
raccourcit la prose sous stress. Cascade de dégradation.

**Règle dure** : Le CALC ne communique JAMAIS avec le LLM. Ni directement
(prompt injection), ni indirectement (traduction sémantique). Cette règle
est NON NÉGOCIABLE et fondée sur preuve empirique.

### POINT 3 — SEUIL CONFIGURABLE

```
Env var : OMEGA_R6_GATE_THRESHOLD
Type    : number (échelle tier ordinal ~[1.5, 6.5])
Default : 4.2 (validé par bench V2)
```

Le seuil est une variable d'environnement, pas un hardcode. Permet l'ajustement
par modèle LLM (Ollama local vs API Anthropic) et par contexte de déploiement
(dev/bench/production).

**Invariant** : le seuil est fixé AVANT le run, jamais modifié pendant. Aucun
ajustement dynamique en cours de pipeline. Le seuil est un filtre, pas une
pâte à modeler.

### POINT 4 — TEMPÉRATURE PROGRESSIVE + SEED VARIATION

```
Attempt 1 : température standard du modèle (pas de override)
Retry 1   : température 0.85 + seed = base_seed + "_r1"
Retry 2   : température 0.90 + seed = base_seed + "_r2"
```

**Pourquoi** : À basse température, le LLM produit des textes quasi-identiques
(retry clone). La progression thermique force l'exploration de l'espace latent.
La variation de seed garantit un point de départ différent.

**Limites** : Température > 0.95 dégrade la cohérence. La progression s'arrête
à 0.90. Au-delà, le risque de dégradation dépasse le gain d'exploration.

### POINT 5 — FALLBACK : OPTION A (MEILLEUR JET SOUS SEUIL)

Si les 3 tentatives échouent toutes (aucun jet ≥ seuil) :

```
→ Retourner le meilleur jet parmi les 3
→ Flag : below_threshold = true
→ Inclure : score réel + nombre de tentatives
```

**Priorité de sélection** :
1. Meilleur score CALC (baseline_tier_score le plus élevé)
2. Si égalité : version avec le moins de retries
3. Si égalité : première générée

**Rejeté** :
- Option B (baisser le seuil dynamiquement) — corrompt la règle au moment où
  elle doit tenir. Viole la doctrine du seuil fixe.
- Option C (basculer vers un modèle de fallback) — trop tôt pour V1. Change
  la source de style, la variance, le coût et la traçabilité. Candidat V2.

### POINT 6 — LOGGING OBLIGATOIRE

Chaque passage par le R6 gate DOIT produire un log structuré contenant :

```typescript
interface R6GateLog {
  readonly gate_threshold: number;
  readonly attempt_count: number;
  readonly best_score: number;
  readonly passed_gate: boolean;
  readonly below_threshold: boolean;
  readonly selected_attempt_index: number;
  readonly temperature_schedule: readonly number[];
  readonly seed_schedule: readonly string[];
  readonly all_scores: readonly number[];
  readonly lang_route: 'FR' | 'EN' | 'FALLBACK';
  readonly duration_ms: number;
  readonly model_version: string;       // '3.4'
  readonly calibration_id: string;      // 'M0b_slim_V3_4_2026-04-11'
}
```

Ce log est l'audit trail. Chaque décision de sélection est traçable.

---

## ARCHITECTURE D'INTÉGRATION

### Séparation des responsabilités

```
dispatcher-lang.ts     → SHADOW MODE (INV-NR-01/02/03 intacts)
                         Télémétrie uniquement, jamais de gating.

r6-rejection-gate.ts   → GATING MODE (nouveau module)
                         Réutilise coefficients V3.4 + features.
                         Rôle : accept/reject basé sur CALC score.
                         Pas contraint par shadow mode invariants.
```

Le dispatcher shadow et le R6 gate COEXISTENT. Le dispatcher continue de loguer
en parallèle (shadow). Le R6 gate a autorité de rejet. Pas de conflit.

### Point d'insertion dans le pipeline

```
ForgePacket → Prompt Assembly → [R6 GATE] → Sovereign Loop → Duel → SEAL/REJECT
                                    ↑
                              provider.generateDraft()
                              + CALC V3.4 scoring
                              + retry si < seuil
                              (max 3 tentatives)
```

Le R6 gate encapsule l'appel à `provider.generateDraft()`. Il ne modifie ni
le prompt, ni le ForgePacket, ni le scoring V1/V3 aval. Il garantit seulement
qu'un minimum structurel est atteint avant d'investir les appels LLM coûteux
du scoring V3 (judgeAestheticV3 = ~8 appels LLM par candidat).

### Feature flag

```
Env var : OMEGA_R6_GATE
Values  : '0' (disabled) | 'shadow' (log only) | '1' (active gating)
Default : 'shadow' (safe rollout)
```

Mode shadow : le gate s'exécute, logue les résultats, mais ne rejette rien.
Permet de valider en production avant d'activer le gating réel.

---

## ÉVOLUTION FUTURE (NON INCLUSE DANS V1)

- **Best-of-N** : Générer N jets en parallèle, sélectionner le meilleur par CALC.
  Prévu pour V2. Nécessite infra parallèle (Promise.all ou worker pool).
- **Multi-model fallback** : Si le gate échoue avec modèle A, tenter modèle B.
  Prévu pour V3. Nécessite routing multi-provider.
- **Seuil adaptatif par archétype** : BRUTAL/CATHEDRAL/SENSORY ont des profils
  CALC différents. Seuil par archétype = gain théorique. Non testé, candidat V2.

---

## PREUVES

| Preuve | Fichier |
|--------|---------|
| Bench script | packages/sovereign-engine/scripts/bench-r6-hybrid.ts |
| Bench résultats V2 | bench_r6/BENCH_R6_RESULTS.json |
| Coefficients V3.4 | src/scoring/dispatcher/coefficients-v3-4.ts |
| Features provenance | src/scoring/dispatcher/features-provenance.ts |

---

## SIGNATAIRES

| Rôle | Nom | Verdict |
|------|-----|---------|
| Architecte | Francky | ✅ VALIDÉ — fallback A, 3 corrections intégrées |
| IA Principale | Claude (Opus 4.6) | ✅ VALIDÉ — bilan intégrité OK |
| IA Consultante | ChatGPT | ✅ VALIDÉ — 3 corrections + fallback A |
| IA Consultante | Gemini | ✅ VALIDÉ — fallback A, CALC=douanier confirmé |

**UNANIMITÉ 4/4 — ADR-003 SCELLÉE.**
