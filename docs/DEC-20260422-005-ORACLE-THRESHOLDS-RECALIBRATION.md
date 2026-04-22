# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — DÉCISION ARCHITECTURALE SCELLÉE
# DEC-20260422-005 : ORACLE DÉDALE — RECALIBRATION SEUILS POST-PHASE S
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date        : 2026-04-22
# Statut      : 🟡 PROPOSED (rév. 2, post-audit mathématique ChatGPT)
# Autorité    : Francky (Architecte Suprême)
# Participants: Francky + Claude + ChatGPT (2 passes) + Gemini
# Severity    : HIGH (touche règle de décision cœur de Dédale v0.55)
# Prérequis   : Phase S scellée (BENCH_DEDALE_NIGHT_20260422, 120/120 runs OK)
# Supersede   : aucun (première ADR Dédale, n'invalide pas DEC-003/004)
# Révisions   : r1 2026-04-22 rédaction initiale
#               r2 2026-04-22 correction critère mini-bench (audit ChatGPT)
#                             + §VALIDATION EMPIRIQUE normative ajoutée
#
# Artefacts Phase S référencés (SHA256) :
#   - DEDALE_BENCH_NIGHT_REPORT_v1.md  ea04b004…
#   - runs_S.jsonl                      5195a337…
#   - chunks_S.csv                      3a58d117…
#   - hard_fails_trigrams.csv           6114705f…
#
# ═══════════════════════════════════════════════════════════════════════════════

## CONTEXTE — CE QUI A PROVOQUÉ CETTE DÉCISION

Dédale v0.55 RESET-FIRST (commit `9e69be42`) introduit un oracle binaire à
3 critères actifs (C1 trigramme, C2 répétition, C4 unique_ratio) déclenchant
un `hard_fail` via un `OR` sur les dépassements de seuils initiaux :

```
hard_fail_initial = (C1 > 0.15) OR (C2 > 0.85) OR (C4 < 0.30)
```

Ces seuils étaient issus d'une calibration théorique sur 12 scènes synthétiques
(8 TRIGGER + 4 NEUTRAL). La Phase S (bench shadow 120 runs, `qwen3:32b`, 3h46)
a fourni la première mesure empirique à grande échelle et révèle deux
anomalies structurelles convergentes :

**Anomalie A — Corpus T/N invalidé empiriquement**
- NEUTRAL : 21.6 % des chunks en hard_fail, 40 % des runs affectés
- TRIGGER : 15.1 % des chunks en hard_fail, 41.2 % des runs affectés
- La scène N02 (étiquetée NEUTRAL) est la plus toxique : 60 % runs HF
- Inversion du signal : le label T/N est décorrélé de l'adversarialité réelle

**Anomalie B — Oracle C1 miscalibré en zone grise**
- 94 événements de hard_fail parsés de `log_S.txt` (worst_trigram + ratio)
- ~78 % sont de vraies boucles (ratio ≥ 0.20) : "il est là." ×205 à 0.795,
  "il est. il" ×382/event à 0.55, "un mur qui" ×40 à 0.28
- ~14 % sont en zone limite (ratio 0.17–0.20) : vraies boucles stylistiques
- ~8 % sont des faux positifs probables (ratio 0.15–0.17) sur syntagmes
  français communs ("il a une" ×16 à 0.163, "le silence est" ×8 à 0.158)

**Anomalie C — C2 non discriminant**
- C2 ne déclenche JAMAIS seul sur les 99 hard_fails observés
- C2 co-occurrent avec C1 ou C4 dans 11/99 HF uniquement (11 %)
- En tant que branche du `OR` principal, C2 n'ajoute aucune valeur diagnostique

**Anomalie D — C1+C4 = combinaison dominante**
- 54 % des HF activent C1 ET C4 simultanément
- C4 sans C1 : 13 % des HF (prose ultra-répétitive mais sans trigramme toxique)
- C1 sans C4 : 33 % des HF (boucle nucléaire sur prose par ailleurs variée)

**Conclusion contextuelle** : Activer Dédale en mode `on` avec les seuils
actuels massacrerait la génération sur toute prose française dense à cadence
basse (notamment N02 où 60 % des runs seraient réinitialisés sans
justification littéraire), tout en laissant passer des scènes TRIGGER plus
superficielles. La Phase R est formellement SUSPENDUE (cas R.c, unanime
2/2 IA externes) en attendant cette recalibration.

---

## OPTIONS

### Option A — Status quo (aucun changement)
- **Description** : Conserver `(C1 > 0.15) OR (C2 > 0.85) OR (C4 < 0.30)`.
- **Pros** :
  - Zéro code touché, zéro risque régression
  - Préserve la sensibilité maximale (détection toutes boucles potentielles)
- **Cons** :
  - Massacre algorithmique N02 (60 % resets non justifiés)
  - ~8 % faux positifs zone grise sur prose française dense légitime
  - C2 inert (11/99 co-occurrence, 0 déclenchement seul) = bruit pur
- **Effort** : NUL
- **Verdict** : REJETÉ — prouvé inopérant par Phase S

### Option B — Élévation simple C1 → 0.20
- **Description** : `(C1 > 0.20) OR (C2 > 0.85) OR (C4 < 0.30)`.
- **Pros** :
  - Élimine la zone grise 0.15–0.17 (~8 % faux positifs)
  - Changement minimal (une constante)
- **Cons** :
  - Perd les vraies boucles stylistiques en zone 0.17–0.20 (~14 % des HF légitimes)
  - Conserve C2 inert
  - Ignore la combinaison discriminante C1+C4 observée empiriquement
- **Effort** : LOW
- **Verdict** : REJETÉ — simplification insuffisante, perte de signal

### Option C — Règle composite (CHOISIE)
- **Description** :
  ```
  hard_fail = (C1 > 0.20) OR (C1 > 0.15 AND C4 < 0.30)
  C2 retiré du OR principal (conservé en tag info uniquement)
  ```
- **Pros** :
  - Branche 1 (`C1 > 0.20`) : capture les boucles nucléaires sans ambiguïté
  - Branche 2 (`C1 > 0.15 AND C4 < 0.30`) : exploite la combinaison dominante
    pour désambiguïser la zone grise 0.15–0.20 (seule la prose à la fois
    répétitive en trigrammes ET pauvre en lexique unique déclenche)
  - Retrait C2 du OR : élimine le bruit, préserve l'info via tag
  - Aligné sur la structure empirique C1+C4 = 54 % des HF
- **Cons** :
  - Règle plus complexe à documenter et tester
  - Perd la détection des boucles stylistiques isolées en 0.15–0.20
    (celles qui avaient C4 ≥ 0.30) — acceptable car le bruit coûte plus
    que cette sensibilité résiduelle sur prose française
  - Validation empirique reportée au mini-bench 30 runs
- **Effort** : LOW (2 lignes dans `oracle.ts` + tests unitaires)
- **Verdict** : **CHOISIE**

---

## DÉCISION

**Option retenue** : **Option C — Règle composite avec C2 dégradé en tag info**

**Rationnel technique** :

1. **Preuve empirique directe** : 54 % des hard_fails Phase S activent C1+C4,
   contre 11 % pour C2 co-occurrent et 0 % pour C2 seul. Le poids diagnostique
   de la combinaison C1+C4 est 5× supérieur à C2.

2. **Séparation lexique/syntagme** : C1 mesure la répétition de trigrammes
   (niveau syntagmatique), C4 mesure la diversité lexicale (niveau paradigmatique).
   Une prose française dense peut avoir un C1 élevé (syntagmes communs "il a une")
   sans pour autant être une boucle pathologique — son C4 reste sain (> 0.30).
   La règle composite exige la dégradation SIMULTANÉE des deux axes pour
   déclencher en zone grise, conformément à la définition d'une vraie boucle.

3. **Seuil C1 > 0.20 en branche 1** : calibré sur la distribution Phase S
   — toutes les boucles nucléaires observées dépassent 0.20 (ratio médian
   des vrais positifs ≈ 0.35). Pas de faux positifs observés au-dessus de 0.20.

4. **C2 en tag info** : conservation de la métrique pour audit post-hoc sans
   coût décisionnel. Permettra une re-éligibilité future si un mécanisme
   causal différent émerge (p.ex. pattern de ponctuation sans répétition lexicale).

**Contrainte de cycle** :

Cette décision est **PROVISOIRE-OPÉRATIONNELLE**. Elle ne passera au statut
SCELLÉ qu'après PASS_PROVISOIRE du mini-bench de validation spécifié en
§VALIDATION EMPIRIQUE ci-dessous. Critère initial « < 3 % sur N02 » **corrigé**
post-revue ChatGPT (non-testable avec 10 runs — résolution minimale 10 %).

---

## POINTS VALIDÉS

1. Règle composite `(C1 > 0.20) OR (C1 > 0.15 AND C4 < 0.30)` remplace l'OR simple
2. C2 retiré du OR principal, conservé en tag info pour audit
3. Seuil C1 branche 1 passe de 0.15 à 0.20 (calibration empirique Phase S)
4. Seuil C4 branche 2 reste à 0.30 (non remis en cause par Phase S)
5. Statut PROPOSED jusqu'à PASS_PROVISOIRE mini-bench (critère opérationnel
   binaire spécifié §VALIDATION EMPIRIQUE, PAS de seuil fractionnaire < 3 %)
6. Rétroactivement : les verdicts oracle Phase S restent VALIDES pour diagnostic
   (ils ont révélé le problème) mais NE DOIVENT PAS être utilisés comme golden
   set pour entraîner ou calibrer quoi que ce soit
7. Séquence d'exécution aval : **#1 (cette ADR) → #4 (patch runner v2) → #2
   (mini-bench) → #3 (NCR_CORPUS_TN_INVALID)** — veto Gemini accepté

---

## CONSÉQUENCES

### Ce qui change
- `packages/sovereign-engine/src/dedale/oracle.ts` : logique `OR` remplacée par
  la règle composite. C2 reste calculé mais n'entre plus dans la condition de
  hard_fail.
- `packages/sovereign-engine/src/dedale/types.ts` : `OracleVerdict` gagne un
  champ `c2_info_tag?: boolean` optionnel pour l'audit.
- Tests unitaires `dedale/oracle.test.ts` : mise à jour vecteurs d'entrée pour
  couvrir les 4 combinaisons C1/C4 × seuils.
- Télémétrie schema v1 : ajout champ `c2_info_tag` dans `oracle_attempt_N.metrics`.
  Rétro-compatibilité préservée (champ optionnel).

### Ce qui devient plus facile
- Activation Dédale en mode `on` sur prose française dense sans massacre N02
- Audit post-hoc : distinction claire entre "boucle nucléaire" (branche 1)
  et "prose figée" (branche 2)
- Extension future : ajout conditions sur C2 sans toucher à la règle principale

### Ce qui devient plus difficile / impossible
- Détection des boucles stylistiques isolées en zone C1 ∈ [0.15, 0.20]
  AVEC C4 ≥ 0.30 — trade-off acceptable (volume observé : ~14 % des HF Phase S,
  mais pollués par ~8 % de faux positifs)
- Réutilisation directe de la Phase S comme baseline comparative — les
  verdicts oracle sont rétroactivement invalidés comme golden set

### Risques acceptés
- **Sur-ajustement sur N02** : la recalibration étant dérivée de la distribution
  Phase S, le mini-bench doit impérativement échantillonner AUTRE CHOSE que N02
  seule. D'où le triplet N02+T04+T01 (immobilité + déclencheur méta + contemplation).
- **Régression potentielle sur scènes non testées Phase S** : la couverture
  12 scènes sera étendue à terme via NCR_CORPUS_TN_INVALID (axe CADENCE).
- **Performance mini-bench PASS non garantie** : si le critère opérationnel
  défini §VALIDATION EMPIRIQUE tombe en FAIL, cette ADR sera SUPERSEDED par
  une règle encore plus conservatrice (piste : C4 < 0.25 au lieu de 0.30 en
  branche 2).

### Prérequis techniques aval (ordre Gemini validé)

**#4 (PATCH RUNNER v2) AVANT #2 (MINI-BENCH)** — non négociable.

Raison : le mini-bench doit permettre l'**audit humain** de tout chunk classé
`hard_fail` (critère PASS_PROVISOIRE §VALIDATION EMPIRIQUE exige lecture
brute). Le texte chunk est absent de `runs_S.jsonl` (seul `output_hash`
stocké). Sans patch runner stockant le texte, nous reproduirions la cécité
Phase S : audit impossible = invalidation de la validation.

Livrable #4 : modifier `bench-dedale-night.ts` pour stocker
`chunks_text/<run_id>_<chunk_idx>.txt` par chunk généré + ajouter `chunk_text_hash`
dans `_chunks.jsonl`. Taille estimée : ~500 KB pour 30 runs × 4 chunks × ~3 KB.

---

## VALIDATION EMPIRIQUE — MINI-BENCH 30 RUNS

**Origine de cette section** : correction formelle post-revue ChatGPT (2026-04-22).
Le critère initial « faux positifs < 3 % sur N02 » était **mathématiquement
non testable** : avec 10 runs N02, la résolution minimale observable est
`1/10 = 10 %`, il n'existe aucune fréquence non nulle entre 0 % et 3 %.
Critère remplacé par une grille opérationnelle binaire explicite.

### Design figé

- **Scènes** : `N02`, `T04`, `T01` (triplet immobilité + méta + contemplation)
- **Runs** : `10` par scène, total `30`
- **Ordre d'exécution** : **strictement après #4 patch runner v2**
- **Stockage obligatoire** : texte brut chunk + `chunk_text_hash` dans `_chunks.jsonl`
- **Modèle, flags Ollama, infra, seeds** : identiques à la Phase S
  (`qwen3:32b`, `think:false`, temp progressive, mêmes 10 seeds par scène que
  Phase S pour permettre comparaison verdict-à-verdict)
- **Seule variable modifiée** : règle oracle (composite au lieu de OR simple)

### Règle oracle testée (sémantique normative)

```
hard_fail = (C1 > 0.20) OR (C1 > 0.15 AND C4 < 0.30)
C2 = info_tag only
```

**Comparateurs figés** :
- Branche 1 : `C1 > 0.20` — **strictement supérieur**, PAS `>=`
- Branche 2a : `C1 > 0.15` — **strictement supérieur**, PAS `>=`
- Branche 2b : `C4 < 0.30` — **strictement inférieur**, PAS `<=`
- Le cas exact `C1 = 0.20` → PAS hard_fail (appartient à la zone grise gérée
  par la branche composite si C4 < 0.30)

**Calcul des métriques** :
- `C1` : trigram_ratio calculé sur le texte brut du chunk final, après
  génération LLM, AVANT toute normalisation sémantique
- `C4` : unique_ratio calculé sur le texte brut du chunk final, mêmes
  conditions que C1
- `C2` : calculé et logué dans `_chunks.jsonl.oracle_attempt_N.metrics.c2_info_tag`
  mais **n'entre jamais** dans la condition `hard_fail`

**Plancher de validité** :
- Un chunk est éligible au calcul C1/C4 uniquement si `total_tokens >= 200`
- Si `total_tokens < 200` → verdict oracle = `insufficient_length`
- Les chunks `insufficient_length` sont **exclus** du numérateur ET du
  dénominateur des comptages PASS/BORDERLINE/FAIL ci-dessous

**Interdiction** : `c2_info_tag` NE DOIT JAMAIS réinjecter implicitement une
branche décisionnelle. Toute future réintégration de C2 passe par une nouvelle
ADR explicite, pas par une modification silencieuse du pipeline.

### Critère de validation (triage à 3 issues)

**⚠️ Ce mini-bench est une validation opérationnelle LOCALE du triplet
N02+T04+T01, pas une preuve de généralité de l'oracle recalibré.**

#### PASS_PROVISOIRE
Toutes les conditions ci-dessous simultanément :
- `N02` : **0/10** hard_fail
- `T04 + T01` : **≥ 4/20** hard_fail combinés (sensibilité conservée)
- Audit humain des chunks N02 : aucun faux positif manifeste détecté
  (lecture brute, pas de boucle clairement pathologique classée non-HF par erreur)
- Taux `insufficient_length` : **≤ 10 %** des runs totaux (≤ 3/30)

→ ADR passe au statut **PROPOSED-OPERATIONAL**, autorisation de procéder aux
étapes aval (activation Dédale mode `on` en intégration, préparation Phase R′).

#### BORDERLINE
- `N02` : exactement **1/10** hard_fail
- `T04 + T01` : **≥ 4/20** hard_fail combinés
- Audit humain du hard_fail N02 : classé boucle RÉELLE (pas faux positif)

→ ADR reste **PROPOSED**, bench asymétrique de confirmation OBLIGATOIRE
avant scellement :
- `N02` : +20 runs supplémentaires (total N02 = 30 runs, résolution 3.3 %)
- `T04` : +10 runs (total 20)
- `T01` : +10 runs (total 20)
- Objectif : convertir l'incertitude binaire en verdict statistiquement
  discriminable avant scellement final.

#### FAIL
Au moins une des conditions ci-dessous :
- `N02` : **≥ 2/10** hard_fail
- `T04 + T01` : **< 4/20** hard_fail combinés (perte de sensibilité)
- Audit humain impossible (texte brut manquant → patch runner v2 défaillant)
- Taux `insufficient_length` : **> 10 %** des runs totaux

→ ADR **SUPERSEDED** par une nouvelle règle plus conservatrice. Pistes de
redesign :
1. C4 < 0.25 au lieu de 0.30 en branche 2
2. Ajout d'un 3ᵉ prédicat sur la longueur moyenne des phrases
3. Re-test avec modèle alternatif (si `qwen3:32b` identifié comme source biais)

### Sémantique d'interprétation

- `N02` joue le rôle de **sentinelle faux positifs** (scène prose française
  dense, Phase S a montré 60 % HF avec ancien oracle)
- `T04` + `T01` jouent le rôle de **sentinelles sensibilité** (scènes
  TRIGGER confirmées, doivent continuer à déclencher)
- Le mini-bench ne prouve PAS la généralité du nouvel oracle — il prouve
  uniquement qu'il est **déployable** sans régression manifeste sur ce triplet

### Rattachement au cycle ADR

| Verdict mini-bench | Statut ADR post-bench | Action |
|---|---|---|
| PASS_PROVISOIRE | PROPOSED-OPERATIONAL | Go étape aval (Phase R′ redesign corpus) |
| BORDERLINE | PROPOSED (inchangé) | Bench asymétrique 60 runs requis |
| FAIL | SUPERSEDED par nouvelle ADR | Redesign règle + nouveau mini-bench |

---

## CORRECTIONS INTÉGRÉES

**ChatGPT (cadrage initial)** :
- "Acter noir sur blanc que C2 sort du OR principal" → Point validé #2
- "Inclure le rationnel anti-faux-positifs issu de Phase S" → §CONTEXTE Anomalie B
- "Décision provisoire-opérationnelle tant que #2 n'a pas PASS" → Statut PROPOSED
- "Validation empirique reportée au mini-bench" → §DÉCISION Contrainte de cycle

**Gemini (veto architecte ordre exécution)** :
- "Le patch du runner est un prérequis technique strict au mini-bench" → §CONSÉQUENCES
  Prérequis techniques aval : séquence 1→4→2→3 substituée à 1→2→3→4
- "Invalide les résultats de l'Oracle de la Phase S rétroactivement" → Point validé #6
- Référence explicite N02 dans Contexte → §CONTEXTE Anomalie A

**ChatGPT (2e passe — audit mathématique du critère)** :
- "Critère < 3 % sur N02 avec 10 runs est non testable (résolution 10 %)" →
  §VALIDATION EMPIRIQUE créée, critère binaire 0/10 PASS, 1/10 BORDERLINE,
  ≥ 2/10 FAIL substitué au pourcentage fractionnaire non mesurable
- "Sémantique exacte des seuils à figer : `>` strict vs `>=`, C4 sur brut
  ou normalisé, plancher tokens" → §VALIDATION EMPIRIQUE → Règle oracle
  testée (sémantique normative) : comparateurs strictement `>` et `<`, C4
  sur texte brut sans normalisation, plancher `total_tokens >= 200`,
  `insufficient_length` exclu des comptages
- "c2_info_tag ne doit jamais réinjecter une branche implicite" →
  §VALIDATION EMPIRIQUE → Interdiction explicite, modification silencieuse
  du pipeline bannie, nouvelle ADR requise pour toute ré-intégration C2
- "Mini-bench = validation locale, pas preuve générale" → §VALIDATION
  EMPIRIQUE → Sémantique d'interprétation explicite, N02 sentinelle FP,
  T04+T01 sentinelles sensibilité, généralité non revendiquée
- "Escalade asymétrique si BORDERLINE" → §VALIDATION EMPIRIQUE →
  BORDERLINE déclenche bench 60 runs (N02=30, T04=20, T01=20) avec
  résolution statistique 3.3 % sur N02 avant scellement final

**Correction Francky** (en attente — ADR PROPOSED).

---

## VERDICT OMEGA

- **Statut** : PASS (ADR produite selon format projet, traçable, rationale
  technique, critère de validation mathématiquement cohérent post-revue ChatGPT)
- **Confiance** : Haute
- **Forces** :
  - Décision fondée sur 120 runs empiriques avec SHA256 référencés
  - 3 options comparées honnêtement (pas de strawman)
  - Cycle de validation explicite (PROPOSED → mini-bench → SCELLÉ)
  - Veto Gemini intégré (1→4→2→3) plutôt que classé sans suite
  - Critère mini-bench corrigé post-revue mathématique ChatGPT : grille
    binaire 0/10 PASS, 1/10 BORDERLINE, ≥ 2/10 FAIL testable avec 10 runs
    N02 au lieu d'un seuil fractionnaire non mesurable
  - Sémantique des seuils normative : `>` strict documenté, C4 sur texte
    brut, plancher 200 tokens, `insufficient_length` isolé
  - Escalade BORDERLINE → bench asymétrique 60 runs avec résolution 3.3 %
    sur N02 — pas de scellement sur incertitude
- **Faiblesses** :
  1. Règle composite dérivée d'UNE session Phase S (120 runs, 1 modèle `qwen3:32b`)
     — pas de validation cross-model ni cross-seed élargie
  2. Trade-off branche 2 non quantifié rigoureusement (hypothèse : 8 % FP >
     14 % VP en coût opérationnel, mais ratio exact non mesuré)
  3. La décision "C2 en tag info" suppose qu'il redeviendra utile — justification
     spéculative, pourrait être plus propre de le retirer complètement
  4. Critère PASS_PROVISOIRE repose partiellement sur audit humain subjectif
     (« aucun faux positif manifeste ») — la reproductibilité inter-lecteur
     n'est pas quantifiée, pourrait être complétée par une grille de
     classification écrite
- **Risques restants** : mini-bench PASS non garanti → cette ADR pourrait
  être SUPERSEDED dans 24–48h si N02 résiste à la recalibration (`≥ 2/10 HF`)
  ou si les faux positifs persistent à l'audit humain
- **Action requise** : Francky valide l'ADR-005 PROPOSED (version patchée
  post-audit mathématique) → lancement #4 (patch runner v2) avant le mini-bench

---

# ═══════════════════════════════════════════════════════════════════════════════
# Fin DEC-20260422-005
# Prochaine étape : Francky valide → #4 patch runner v2 (texte chunk brut)
# ═══════════════════════════════════════════════════════════════════════════════

---

## ═══════════════════════════════════════════════════════════════════════════════
## AMENDEMENT r3 — POST MINI-BENCH R2 (2026-04-22)
## ═══════════════════════════════════════════════════════════════════════════════

**Révision** : r3 — clôture cycle PROPOSED après mini-bench empirique
**Date**     : 2026-04-22 (soir)
**Participants** : Francky + Claude (analyse R2) + Gemini (arbitrage option a) + ChatGPT (formulation stricte)
**Transition statut** : PROPOSED → **PROPOSED-OPERATIONAL** (safety-based, not TP-validated)

### Contexte du mini-bench R2

- Runner v2 déployé (sha256 `941a9eb0…`), phase R2 ajoutée au bench
  (`bench-dedale-night.ts`, branche `else if (PHASE === 'R2')`).
- Corpus testé : N02 (neutral) + T04 (trigger nominal) + T01 (trigger nominal).
- Volumétrie effective : 60 runs (2 epochs × 30), 164 chunks parsés via
  `dedale_telemetry_R2/*_chunks.jsonl`.
- Modèle : qwen3:32b (digest `030ee887880fc378860c2dd35101da424377520441ae4bfe7be6deff8ade7840`).
- Mode : Dédale v0.55 RESET-FIRST, `OMEGA_DEDALE_MODE=on`, shadow.
- Durée : 42 minutes.

### Résultats chunk-level

| Critère | Cible ADR r2 | Mesuré R2 | Verdict |
|---|---|---|---|
| N02 FP rate (neutral, chunk-level) | ≤ 10 % | 0.00 % (0/47) | **PASS** |
| T04+T01 TP rate (trigger, chunk-level) | ≥ 50 % | 0.85 % (1/117) | **FAIL** |

Unique hard_fail observé : `R2_T01_G` chunk 4, c1=0.791 c2=0.867 c4=0.076,
`reason='c1_trigram_ratio'` — **vrai positif propre**.

Bras composite `c1_c4_composite` : 4 chunks éligibles (c1 ∈ (0.15, 0.20]),
0 avec c4 < 0.30 → **jamais exercé empiriquement**. Non nocif (0 FP sur N02),
non démontré utile.

Démotion C2 info-tag : 1 événement (le hard_fail T01_G ci-dessus),
sans FP additionnel. Démotion valide.

### Décisions post-bench (consensus 3/3 IA : Claude + Gemini + ChatGPT)

**Verdicts dissociés** (NASA-Grade OMEGA — séparer les dettes) :

| Axe | Verdict |
|---|---|
| **R2 bench verdict** | **FAIL** (TP 0.85 % vs cible 50 %) |
| **Oracle recalibration decision** | **COMMIT** (safety-based : N02 FP éradiquée, 0 nuisance) |
| **Corpus T04/T01 verdict** | **INVALID / CONFIRMED** → NCR_CORPUS_TN_INVALID clôturé CONFIRMED |
| **Reset health verdict** | **OPEN NCR P1** → NCR_DEDALE_RESET_HEALTH_NOT_ENFORCED ouverte |

**Justification du COMMIT malgré FAIL bench** :
1. La règle recalibrée est *techniquement correcte* : N02 FP=0 démontre
   qu'elle ne sur-déclenche pas sur prose française dense.
2. Le seul fire observé est un vrai positif propre (c1=0.791, collapse
   lexical manifeste).
3. Le corpus T04/T01 s'est révélé *inerte* sur qwen3:32b + pipeline OMEGA
   v0.55 (max c1 sur T04 = 0.130, jamais proche du seuil bas 0.15).
   Cette défaillance est **distincte** de la question oracle.
4. Mélanger dette oracle (résolue) et dette corpus (découverte) violerait
   la séparation des préoccupations (Gemini, verbatim) et la traçabilité
   causale (ChatGPT, verbatim).

**Limites explicites de cette décision** :
- Statut **PROPOSED-OPERATIONAL**, pas SCELLÉ VALIDÉ TP.
- **Non revendiqué** : « ADR-005 r2 empiriquement validée » — la règle
  est acceptée pour sûreté (réduction du risque FP) mais la sensibilité
  TP n'a pas été démontrée.
- **Non revendiqué** : « T04/T01 corpus de preuve » — corpus déclaré
  invalide par le bench même.
- Escalade BORDERLINE §VALIDATION EMPIRIQUE inapplicable (le corpus
  d'escalade lui-même est invalide) → report à corpus T' adversarial.

### Conditions pour passer à SCELLÉ (future r4 potentielle)

1. Corpus T' adversarial *empiriquement déclencheur* sur qwen3:32b +
   pipeline OMEGA v0.55+ (tâche successeur : 3–5 scènes avec c1_max ≥ 0.20
   sur ≥ 30 % des chunks, reproductible sur ≥ 2 seeds indépendants).
2. Re-bench sur corpus T' avec TP ≥ 50 % ET maintien FP N02 ≤ 10 %.
3. Fix `NCR_DEDALE_RESET_HEALTH_NOT_ENFORCED` pour éliminer les 33 %
   de runs perdus (surface de mesure insuffisante tant qu'ouvert).

### Artefacts scellés R2

- `outputs/bench_dedale_night/BENCH_DEDALE_NIGHT_20260422/runs_R2.jsonl`
- `outputs/bench_dedale_night/BENCH_DEDALE_NIGHT_20260422/dedale_telemetry_R2/`
- `outputs/bench_dedale_night/BENCH_DEDALE_NIGHT_20260422/chunks_text_R2/`
- `outputs/bench_dedale_night/BENCH_DEDALE_NIGHT_20260422/checkpoint_R2.json`
- `outputs/bench_dedale_night/BENCH_DEDALE_NIGHT_20260422/DEDALE_BENCH_R2_ADR005_VERDICT_v1.md`
- `outputs/bench_dedale_night/BENCH_DEDALE_NIGHT_20260422/analysis/r2_adr005_analysis.json`
- `nexus/proof/NCR_CORPUS_TN_INVALID.md` (CLOSED_CONFIRMED)
- `nexus/proof/NCR_DEDALE_RESET_HEALTH_NOT_ENFORCED.md` (OPEN P1)

### Arbitrage textuel Gemini (verbatim, 2026-04-22)

> "DÉCISION ARCHITECTE : OPTION (a) — COMMIT ATOMIQUE TOTAL. Je valide
> formellement l'Option (a). On ne prend pas un correctif fonctionnel
> en otage sous prétexte que le jeu de données d'évaluation est défectueux.
> L'ADR-005 r2 a rempli son contrat prioritaire : éradiquer le massacre
> algorithmique (False Positives) sur la prose française dense sans
> introduire de régression sur la base de code. Mélanger la dette de
> l'Oracle (résolue) avec la dette du Corpus (découverte) ou celle de
> l'infrastructure Ollama (le problème de restart) serait une violation
> flagrante du principe de séparation des préoccupations."

### Arbitrage textuel ChatGPT (verbatim, 2026-04-22)

> "Le mini-bench R2 = FAIL au sens validation ADR-005 r2. Le patch
> oracle = commitable au sens sûreté opérationnelle. Donc je choisirais (a),
> mais pas en le racontant comme un PASS. […] ADR-005 r2 = ACCEPTED FOR
> SAFETY / PROVISIONAL, validation TP = FAIL due to corpus invalidity,
> corpus T' adversarial = requis pour validation complète. […] On commit
> la règle parce qu'elle réduit le risque réel, mais on déclare
> explicitement que le bench de validation TP a FAIL et que le corpus
> de trigger est invalide."

### Nouveau statut

**PROPOSED-OPERATIONAL** (ACCEPTED FOR SAFETY / PROVISIONAL).
Commit atomique autorisé. Revalidation TP pending corpus T' + reset fix.

---

# ═══════════════════════════════════════════════════════════════════════════════
# Fin amendement r3 DEC-20260422-005
# ═══════════════════════════════════════════════════════════════════════════════
