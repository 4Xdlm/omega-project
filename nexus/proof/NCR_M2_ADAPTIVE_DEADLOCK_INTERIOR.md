# NCR_M2_ADAPTIVE_DEADLOCK_INTERIOR

**ID** : NCR_M2_ADAPTIVE_DEADLOCK_INTERIOR
**Title** : Mode M2_adaptive provoque 11/24 (45.8%) timeouts 600s sur scènes INTERIOR (qwen3:32b)
**Status** : OPEN
**Severity** : HIGH (empêche toute mesure fiable du baseline adaptive sur scènes INTERIOR méditatives)
**Priority** : **P0** (promu 2026-04-19 matin après consensus 3-IA post-bench v3 : bloque tout mini-rebench d'effet-size tant que non corrigé)
**Opened** : 2026-04-19 matin (post-bench v3)
**Owner** : Claude (autonome) + Francky (décisionnaire)
**Promotion P1→P0** : 2026-04-19 matin — consensus ChatGPT+Gemini+Claude : "tant que 11/24 timeouts sur une branche clé, tout bench d'effet est semi-pourri" (ChatGPT)

---

## 1. Issue

Lors du bench P1 v3 (144 runs, 6 scènes × 4 modes × 6 seeds, qwen3:32b local
via Ollama), le mode `M2_adaptive` a échoué sur 11 des 24 runs prévus sur les
scènes INTERIOR avec des **timeouts de 600 secondes par chunk** au lieu
d'atteindre un succès en ~40-60 secondes nominal.

### 1.1 Distribution des échecs par cellule (M2_adaptive uniquement)

| Scène | n prévu | n réussi | n timeout | Taux échec |
|---|---|---|---|---|
| fr_interior_maison_enfance (REPRO) | 6 | 0 | 6 | **100%** |
| fr_interior_veillee_funebre (DEEP_1) | 6 | 1 | 5 | **83%** |
| fr_interior_meditation_aube (DEEP_3) | 6 | 6 | 0 | 0% |
| fr_interior_dialogue_interieur (DEEP_2) | 6 | 6 | 0 | 0% |
| fr_cathedral_silence_nef (CTRL_1) | 6 | 6 | 0 | 0% |
| fr_action_poursuite (CTRL_2) | 6 | 6 | 0 | 0% |

**Total M2_adaptive INTERIOR : 11/24 timeouts (45.8%)**
**Total M2_adaptive global : 11/36 timeouts (30.5%)**

### 1.2 Distribution des échecs global (144 runs)

- **Runs total** : 144
- **Runs OK** : 127
- **Runs erreur** : 17 (tous timeouts 600s sur un chunk)
  - M2_adaptive × REPRO : 6
  - M2_adaptive × veillee_funebre : 5
  - M1_baseline × fr_action_poursuite : 6 (cas à part, voir §5)

### 1.3 Impact direct sur G1 (gate reproductibilité R-D.1)

Le gate G1 scellé ex-ante du design v3 exigeait :

```
G1 = μ(M3_gated_A_inline, REPRO) − μ(M2_adaptive, REPRO) ≥ +3.0
```

Avec M2_adaptive × REPRO = n=0 (6/6 timeouts), **G1 est non calculable**.
Le gate est marqué FAIL mécaniquement faute de donnée au dénominateur.

→ Conséquence : impossible de statuer sur la reproductibilité du +5.379 mesuré
en bench R-D.1 (n=3, 2026-04-18 matin).

---

## 2. Preuves

### 2.1 Runs M2_adaptive × REPRO : 6 timeouts consécutifs

Tous les 6 seeds (42, 43, 44, 45, 46, 47) ont produit un timeout sur le chunk 0
(souvent) ou chunk 1/2/3. Logs `_full_bench_v3_stdout.txt` révèlent :

```
[bench-p1-robustness-v3] RUN M2_adaptive × fr_interior_maison_enfance × seed=42
  chunk 0 generation timeout after 600s (model=qwen3:32b)
  STATUS: ERROR
```

Pattern répété pour les seeds 43, 44, 45, 46, 47.

### 2.2 Runs M2_adaptive × veillee_funebre : 5/6 timeouts + 1 succès

Un seul seed a complété (seed=44, μ=5.818) après ~7min. Les 5 autres ont
timed-out sur un chunk.

### 2.3 Contraste avec M2_adaptive × autres scènes

- `dialogue_interieur` : 6/6 OK (μ=2.337)
- `meditation_aube` : 6/6 OK (μ=3.189)
- `cathedral_silence_nef` : 6/6 OK (μ=0.341)
- `action_poursuite` : 6/6 OK (μ=−0.019)

→ **Le deadlock est localisé** sur 2 scènes INTERIOR spécifiques
(`maison_enfance`, `veillee_funebre`), PAS sur toutes les INTERIOR.

---

## 3. Hypothèses mécaniques

### 3.1 H1 — Directive adaptive provoque runaway generation

Le mode M2_adaptive active le `registerPromptBuilder` qui ajoute une directive
"adaptive" à la directive de base. Sur certaines scènes INTERIOR spécifiques
(maison_enfance, veillee_funebre), cette directive combinée au contrat
émotionnel (registre `litteraire`, enjeu méditatif, souvenirs enfance/mort)
peut provoquer un pattern génératif runaway : le modèle génère en boucle
sans atteindre un token EOS, consommant les 600s timeout.

**Preuve indirecte** : les directives SHA256 M3_gated_A_inline sur les mêmes
scènes (qui incluent directive **inline** gated variant) ne déclenchent PAS
le deadlock (6/6 OK sur maison_enfance, veillee_funebre).

→ La composition directive adaptive + contrat INTERIOR méditatif déclenche
un mode de défaillance spécifique du LLM.

### 3.2 H2 — Contexte (scène + registre) déclenche un attracteur génératif

La scène `maison_enfance` et `veillee_funebre` ont une spécificité : registre
littéraire + souvenirs/mort + densité sensorielle élevée. L'hypothèse est
qu'un attracteur dans l'espace latent du qwen3:32b (correspondant à des
descriptions longues méditatives) est déclenché par la combinaison scène +
directive adaptive, produisant un flux quasi-infini.

**Testabilité** : reproduire avec un modèle différent (qwen3:72b, Mistral Large)
pour voir si le deadlock suit ou est spécifique à qwen3:32b.

### 3.3 H3 — Bug de parse côté pipeline (rejeté)

L'hypothèse d'un bug parsing qui interprète incorrectement un token comme
un signal "continue to generate" est écartée : les mêmes scènes en M1_baseline
et M3/M_prod (qui partagent le même pipeline, sauf registerPromptBuilder
différent) réussissent correctement. Seule la combinaison M2_adaptive × scène
déclenche le timeout.

### 3.4 H4 — Tokens d'arrêt / max_tokens insuffisant côté config

Possibilité que la config Ollama pour M2_adaptive ait un `num_predict` trop
élevé ou un `stop_token` manquant. À vérifier dans `packages/sovereign-engine/src/gate/bench-p1-robustness-v3.ts`.

---

## 4. Impact sur bench v3

### 4.1 Gates affectés

- **G1 FAIL (non calculable)** : cellule M2_adaptive × REPRO = n=0
- **G2 partiellement affecté** : M2_adaptive × veillee_funebre = n=1 → écart-type σ=0 (1 seul point), moyenne 5.818 biaisée par la sélection du seul run complet
- **Autres gates (G3, G4, G5, G6) non affectés** : ils ne dépendent pas de M2_adaptive sur REPRO/veillee

### 4.2 Décision branche B (design §6) tenable

Malgré la défaillance G1, le design v3 a correctement identifié la branche B
(WIRING OK, GAIN DILUÉ) via G3 PASS + G4 PASS + G5 PASS + G6 PASS.

→ La méthode du bench v3 a tenu. Seul l'effet de R-D.1 reste mesurable à
travers le proxy G2 (gain DEEP engineered = +0.595, sous-seuil mais non-nul).

---

## 5. Note annexe — M1_baseline × fr_action_poursuite (6 timeouts)

Indépendamment du pattern M2_adaptive, la cellule `M1_baseline × fr_action_poursuite`
a produit 6/6 timeouts. Cette scène CTRL_2 (action haute, combat/poursuite)
avec mode baseline (pas de directive adaptive) montre un pattern distinct :
le contrat émotionnel action intense combiné au plan V1 static 4×750w
(sans variation registre) produirait également un runaway.

→ **Hypothèse séparée** : la combinaison `action_poursuite` + `baseline`
pourrait nécessiter une configuration de stopping criteria adaptée. À traiter
en NCR distincte si confirmé par reproduction.

**Pour l'instant** : pas de gate affecté (M1_baseline × action_poursuite
n'est impliqué dans aucune formule de gate v3). Documenté ici pour mémoire.

---

## 6. Options de résolution

### Option A — Investigation pipeline M2_adaptive (non bloquante)

**Description** : isoler la directive adaptive exacte envoyée au LLM sur
une scène problématique (maison_enfance seed 42) via logs verbeux + dump
du prompt complet. Comparer byte-par-byte avec la directive M3_gated_A_inline
qui ne timeout pas.

**Effort** : 2-4h dev.
**Output** : hypothèse H1/H2 tranchée.

### Option B — Stopping criteria explicite côté Ollama

**Description** : ajouter un `num_predict` explicite (p.ex. 1200 tokens pour
un chunk de 750 mots, soit marge 60%) et/ou `stop` tokens explicites dans
la config Ollama pour éviter le runaway.

**Effort** : 1h dev + re-test bench partiel.
**Risque** : altère la méthode v3 scellée — nécessite v4 ou bench d'ablation
dédié.

### Option C — Retirer M2_adaptive du bench v3, redéfinir baseline

**Description** : reconnaître que M2_adaptive est un mode instable sur qwen3:32b
et utiliser `M1_baseline` comme référence de comparaison (au lieu de
M2_adaptive) pour G1 et G2. Le bench v3 permet de recalculer les gates avec
M1_baseline en comparateur.

**Post-hoc recalcul** (exploratoire — à valider avant publication) :
- G1' = μ(M3_gated_A_inline, REPRO) − μ(M1_baseline, REPRO) = 3.860 − 5.911 = **−2.05**
  → FAIL dans le sens opposé (M1 > M3 !)
- G2' = mean DEEP (μ(M_prod_p1) − μ(M1_baseline)) = ...
  → à calculer

**Observation critique** : sur REPRO, le baseline `M1_baseline` obtient une
**meilleure** moyenne que M3_gated_A_inline (+2.05). Ceci contredit
l'hypothèse initiale de R-D.1 (+5.379 gain).

→ **C'est une piste majeure** : M2_adaptive n'était pas seulement "toxique"
en R-D.1, il était peut-être **artificiellement bas** (ou déjà symptomatique
du deadlock, censuré).

**Effort** : 1h recalcul + rédaction amendement.

### Option D — Tester qwen3:72b sur scènes problématiques (budget)

**Description** : relancer M2_adaptive × maison_enfance avec qwen3:72b (4-6×
compute). Si deadlock persiste → confirmé mécanique directive ; si disparaît
→ confirmé idiosyncrasie qwen3:32b.

**Effort** : 3-5h compute nuit.

---

## 7. Recommandation

**Court terme (avant scellement V1-R-D.1-PROD)** :
1. **Option C** : recalculer gates v3 avec M1_baseline comme référence. Si G1' confirme que M3 n'améliore pas M1 sur REPRO, alors **R-D.1 +5.379 était un artefact de sampling sur M2 déficient** (scellé par NCR_GATING_EFFECT_SIZE_UNSTABLE §9 Option F).
2. **Option A** : investigation 2h du prompt adaptive envoyé sur scènes problématiques — déterminer si H1 (directive runaway) ou H4 (stopping criteria config).

**Moyen terme (avant bench v4 s'il a lieu)** :
3. **Option B** : ajouter `num_predict` + `stop` tokens explicites en config Ollama. Doit être fait avant toute exécution de bench v4 pour éviter les 600s de coût par run cassé.

**Long terme** :
4. Documenter dans `OMEGA_V1_SEAL_CERTIFICATE.md` que M2_adaptive est un mode
SHADOW instable sur qwen3:32b et ne doit pas être utilisé en baseline
production sans stopping criteria explicites.

---

## 8. Plan d'action

| # | Action | Owner | Deadline | État |
|---|---|---|---|---|
| 1 | Recalcul post-hoc G1'/G2' avec M1_baseline référence | Claude | 2026-04-19 soir | TODO |
| 2 | Dump prompt adaptive seed 42 maison_enfance + diff vs inline | Claude | 2026-04-19 soir | TODO |
| 3 | Décision Francky : Option A/B/C/D ou combinaison | Francky | après #1 #2 | PENDING |
| 4 | Si Option B retenue : PR config Ollama stopping | Claude | après #3 | BLOCKED |
| 5 | Mise à jour `OMEGA_V1_SEAL_CERTIFICATE.md` | Claude | après #3 | BLOCKED |

---

## 9. Impact sur décisions précédentes

- **P1 commit `7e89f95f`** : NE PAS ROLLBACK. R-D.1 ADOPT_A reste scellé code-side.
  La question est la **claimability** du gain, pas le wiring.
- **R-D.1 scellement méthodologique** : requalifié. Le gain +5.379 mesuré à n=3
  pouvait être dû en partie au **déficit pathologique de M2_adaptive** (deadlocks
  masquant silencieusement des runs au bénéfice d'un subset "chanceux"). À
  documenter dans une révision de l'autopsie R-D.1.
- **V1 production** : ACL critique — vérifier que `registerPromptBuilder` M2_adaptive
  n'est jamais utilisé en production sans stopping criteria renforcés (grep
  `adaptive` dans les configs prod).

---

**Références** :
- `outputs/BENCH_P1_V3_AUTOPSY.md` (§3.3 actions, §8 post-hoc delta)
- `outputs/BENCH_P1_V3_DESIGN.md` (§6 decision tree branche B)
- `packages/sovereign-engine/bench-p1-robustness-v3-results.json` (SHA256 7DA99121...DC0FE89)
- `nexus/proof/NCR_BENCH_METHOD_DRIFT.md` (§9 closure)
- `nexus/proof/NCR_GATING_EFFECT_SIZE_UNSTABLE.md` (§9 amendement post-v3)
- `outputs/_full_bench_v3_stdout.txt` (logs bruts timeouts)
