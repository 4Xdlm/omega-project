# ECC DEDICATED BENCH — résolution NCR-ECC-CONTRACT-SENSOR

> **Framework** : OMEGA_TOTAL_CONTROL_FRAMEWORK_2000 · **Mode** : READ-ONLY moteur (harness seul)
> **Date** : 2026-05-31 · **Auteur** : Claude Code · **Étape** : Capteur Chain — étape 3
> **NCR** : `nexus/proof/NCR_ECC_CONTRACT_SENSOR.md` (OPEN) · **Lié** : M0.b (`M0B_BENCH_REPORT.md`), diagnostic 14D path-dependent, DEC-009
> **Doctrine** : PROVE IT · AUDIT BEFORE ACTION · DÉTERMINISME · NO THRESHOLD/CONTRACT CHANGE WITHOUT GO ARCHITECTE

---

## 0. VERDICT

**B — CONTRAT (artefact), PAS prose incohérente (A). Confiance : HAUTE.**

L'effondrement de l'ECC sur le chemin `assembleForgePacket` (« Le Gardien ») est un **artefact de contrat** : la trajectoire 14D dérivée par `assembleForgePacket` est **dégénérée** (`trust = 1.0` constant sur les 4 quartiles, pour une scène d'**horreur**). Le sous-axe `tension_14d` (CALC, cosine, poids ×3.0 = **31.6 % de l'ECC raw**) s'effondre mécaniquement car une prose correctement peureuse ne peut PAS matcher une cible `trust=1.0`. Les autres sous-axes de l'ECC (`emotion_coherence`, `interiority`, `impact`) sont **inchangés et hauts** quand seul le contrat varie → la prose EST émotionnellement cohérente ; seule la conformité à une cible cassée chute.

**Ce n'est ni « capteur fragile » au sens bruit, ni « prose pire ».** C'est une **cible de contrat invalide** produite en amont par la dérivation 14D de `assembleForgePacket`. Le bench est **100 % déterministe** (stdev = 0 à juge temp 0, N=3).

---

## 1. Question (du NCR)

Pourquoi l'ECC (axe le plus lourd, 33 %) chute à **57–71** sur le contrat issu de `assembleForgePacket` (« Le Gardien ») vs **~93** sur contrats hand-built ? Contrat trop dur / cassé (**B**) vs capteur fragile / prose incohérente (**A**) ?

---

## 2. Protocole (isoler le contrat comme seule variable)

| Élément | Valeur |
|---|---|
| Prose | **FIXE** : échantillons M0.b run-0 `sample_sovereign.txt` (1994 mots) et `sample_scribe.txt` — générés une fois, réutilisés tels quels |
| Variable | **UNIQUEMENT le contrat émotionnel** (`emotion_contract` du packet) |
| Contrat FORGE | `assembleForgePacket(plan, scene0)` — chemin de **production / fusion DEC-009** (suspect) |
| Contrat HAND | arc fear→sadness adapté à la scène (style MOCK_PACKET, 3 dims/quartile) — représentant « hand-built » |
| Décomposition | `computeECC(packet, prose, provider)` → log par run : `tension_14d`, `emotion_coherence`, `interiority`, `impact`, `temporal_pacing`, bonus, ECC final |
| Sonde CALC | `scoreTension14D(packet, prose, undefined)` (chemin keyword, **100 % déterministe, 0 token**) — isole l'effet contrat pur sur l'axe CALC |
| Modèle | qwen3:32b, **juge temp 0.0**, Ollama only (0 API payante) |
| N | **3 runs / cellule** (4 cellules = 2 proses × 2 contrats) |
| Harness | `scripts/metrology/ecc-dedicated-bench.ts` + `ecc-contract-probe.ts` — gatés EMP-10, **aucun code moteur modifié** |

---

## 3. Cause racine — trajectoire 14D du contrat FORGE

`assembleForgePacket` (« Le Gardien », horreur) produit :

| Quartile | declared dominant | `target_14d` (dims non-nulles) |
|---|---|---|
| Q1 | trust | **trust:1.00** (1 dim) |
| Q2 | trust | **trust:1.00** (1 dim) |
| Q3 | trust | **trust:1.00** (1 dim) |
| Q4 | trust | **trust:1.00** (1 dim) |

Vecteur **one-hot constant `trust=1.0`** sur toute la scène — émotionnellement **incohérent avec une scène d'horreur** et **plat** (aucune trajectoire). Contrat HAND (comparateur) :

| Quartile | dominant | `target_14d` |
|---|---|---|
| Q1 | fear | fear:0.60 anticipation:0.30 sadness:0.10 |
| Q2 | fear | fear:0.70 surprise:0.20 anticipation:0.10 |
| Q3 | fear | fear:0.60 sadness:0.30 awe:0.10 |
| Q4 | sadness | sadness:0.50 fear:0.30 remorse:0.20 |

---

## 4. Résultats

### 4.1 ECC décomposé (LLM, N=3, juge temp 0, prose FIXE)

| prose | contrat | **ECC** | tension_14d | emotion_coherence | interiority | impact | temporal_pacing | bonus |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| sovereign | **FORGE** | **68.83** | **9.13** | 100 | 92 | 82 | 75 | +3 |
| sovereign | **HAND** | **93.13** | **86.08** | 100 | 92 | 82 | 75 | +5 |
| scribe | **FORGE** | **59.82** | **9.25** | 100 | 87 | 82 | 75 | −5 |
| scribe | **HAND** | **86.25** | **86.63** | 100 | 87 | 82 | 75 | −3 |

*(stdev = 0 sur les 3 runs de chaque cellule — déterminisme total à juge temp 0)*

- **Δ ECC (HAND − FORGE)** : sovereign **+24.3**, scribe **+26.4** — sur prose **identique**, seul le contrat change.
- **Δ porté à 100 % par `tension_14d`** : 9.13→86.08 (sov), 9.25→86.63 (scr).
- **`emotion_coherence` = 100, `interiority` = 92/87, `impact` = 82, `temporal_pacing` = 75** : **identiques** sous les 2 contrats → contract-independent, prose-intrinsèques, **hauts**.

### 4.2 Sonde CALC déterministe (tension_14d, keyword, 0 token)

| prose | contrat | tension_14d | détail (cosine moyenne, Q-scores) |
|---|---|---:|---|
| sovereign | FORGE | 11.67 | 8.3 % · 16, 0, 17, 0 |
| sovereign | HAND | 76.81 | 56.4 % · 56, 39, 97, 34 |
| scribe | FORGE | 20.26 | 25.3 % · 32, 41, 0, 29 |
| scribe | HAND | 26.12 | 31.1 % · 14, 0, 40, 70 |

La sonde CALC (analyseur keyword, reproductible à l'identique) confirme le mécanisme indépendamment du chemin sémantique LLM : la cosine prose-vs-cible chute à ~8–25 % contre `trust=1.0`. L'écart sov FORGE→HAND (+65) est massif ; sur scribe il est plus faible/bruité (prose plus courte, analyseur keyword bruité) — mais le chemin LLM (§4.1) tranche nettement sur les 2 proses.

---

## 5. Mécanisme prouvé

```
assembleForgePacket → emotion_contract.curve_quartiles[*].target_14d = {trust:1.0}   ← cible dégénérée
scoreTension14D : cosine( prose_14d[fear-dominant] , target[trust=1.0] ) ≈ 0          ← mismatch structurel
  → tension_14d ≈ 9   (poids ×3.0 / 9.5 = 31.6 % de l'ECC raw)
  → ECC raw effondré, NON compensé par emotion_coherence(100)/interiority(92)/impact(82)
  → ECC ≈ 57–71   (= plage observée NCR + M0.b)
```

Bascule **binaire selon le chemin de contrat**, indépendante du moteur (sovereign ET scribe), conforme à l'observation M0.b. Le facteur commun est **le contrat**, pas la prose ni l'archi.

---

## 6. Lien 14D path-dependent & DEC-009

- Confirme le **diagnostic 14D path-dependent** : la cible 14D est peuplée par `assembleForgePacket` ; ici elle est peuplée **mais dégénérée** (`trust=1.0`), pas « creuse » — variante du même axe de risque.
- **Bloquant pour DEC-009** : le chemin de fusion cible précisément `assembleForgePacket`. Tout pipeline branché dessus héritera d'un ECC bas **structurel** (artefact contrat), faussant tout bench de fusion tant que la dérivation 14D n'est pas corrigée. **Le scorer ECC n'est PAS fiable pour bencher la fusion sur ce chemin en l'état.**

---

## 7. Limites / honnêteté méthodologique

- Le contrat HAND est construit par l'auditeur (style MOCK_PACKET) — il pourrait être jugé « favorable ». **Mais la preuve décisive ne dépend PAS du comparateur** : (a) la cible FORGE `trust=1.0` pour une scène d'horreur est **intrinsèquement invalide** ; (b) `emotion_coherence = 100` prouve que la prose **est** cohérente. HAND ne sert qu'à quantifier l'écart.
- 1 scène (« Le Gardien »). La **dégénérescence** de la dérivation 14D doit être vérifiée sur d'autres intents avant généralisation (recommandation M4).
- Sonde CALC keyword ≠ chemin sémantique runtime (`SEMANTIC_CORTEX_ENABLED`) ; les deux convergent ici, mais la sonde est un minorant déterministe, pas la valeur runtime exacte.

---

## 8. Décision

**PENDING Architecte.** Conformément au NCR et à la doctrine :
- **INTERDIT** de toucher le floor ECC ou le contrat émotionnel sans GO Architecte.
- **Action recommandée (hors scope de cette chaîne)** : investiguer la dérivation 14D dans `assembleForgePacket` / amont (planner → emotion → quartiles) qui produit `trust=1.0` constant. C'est un **défaut de construction de contrat**, pas un défaut de scorer ni de prose. À traiter avant DEC-009.
- Aucun patch produit. READ-ONLY.

**Livrables** : ce rapport · `ecc_dedicated_bench.json` (LLM N=3) · `ecc_contract_probe.json` (CALC déterministe) · `ecc_bench_n3.log`.
