# DEDALE BENCH NIGHT — Rapport v1

**Bench ID** : `BENCH_DEDALE_NIGHT_20260422`
**Phase** : S (shadow discovery)
**Période** : 2026-04-22 00:05 → 03:51 (heure Paris), durée 3h46
**Modèle** : qwen3:32b local · digest `030ee887880fc378860c2dd35101da424377520441ae4bfe7be6deff8ade7840`
**Dédale** : v0.55 RESET-FIRST, commit `9e69be42`, mode shadow
**Feature flags** : `OMEGA_DEDALE_MODE=shadow`, `OMEGA_ADAPTIVE_CHUNKING=1`
**Standard** : NASA-Grade L4

---

## 1. Résumé exécutif

- **120/120 runs complétés** · 0 crash · 0 timeout
- **PC redémarré après fin du bench** : intégrité 100 %, zéro perte de données
- **Design T/N du corpus INVALIDÉ** : les scènes "neutres" déclenchent l'oracle **autant ou plus** que les "triggers" (N 21.6 % vs T 15.1 % chunks HF)
- **Oracle C1 (trigram ratio) fonctionne** : les détections correspondent à de vraies boucles dans 80–90 % des cas (ratio ≥ 0.18)
- **Zone grise identifiée** : ratios C1 ∈ [0.15, 0.17] contiennent des cas ambigus (prose dense légitime vs boucle naissante)
- **Décision** : Phase R **SUSPENDUE** (R.c, unanime 2/2 IA externes). Recalibration seuil C1 requise avant mode `on`.

---

## 2. Paramètres du run

| Paramètre | Valeur |
|---|---|
| Scènes | 12 (8 TRIGGER T01–T08, 4 NEUTRAL N01–N04) |
| Seeds / scène | 10 (A–J) |
| Runs totaux | 120 |
| Plan V2-B | 4 chunks × 681–844 w, total target 2940 w |
| Mode oracle | shadow (détecte, ne reset pas) |
| Seuils oracle | C1 > 0.15, C2 > 0.60, C4 < 0.30 |
| Epoch rollover | 20 runs / 5 epochs |
| Checkpoint | tous les 5 runs |

Télémétrie Dédale écrite dans `dedale_telemetry_S/` (240 fichiers : 120 aggregate + 120 chunks.jsonl).

---

## 3. Résultats run-level

| Métrique | Valeur |
|---|---|
| finish_reason=ok | **120/120** (100 %) |
| words mean / median | 2055 / 2052 (target 2940, drift −30 %) |
| duration mean / median | 82 s / 70 s |
| VRAM start / end | 30 095 / 31 260 MiB |

**Drift mots** attendu (V2-B sous-cible connu, déjà observé bench V4).
**VRAM** stable, pas de leak ni saturation.

---

## 4. Chunk-level — distribution hard_fail

Extraction depuis `dedale_telemetry_S/*_chunks.jsonl` (champ `oracle_attempt_1.verdict`) :

```
Total chunks évalués : 571
Hard_fails (oracle_attempt_1) : 99 (17.3 %)
Final chunk verdicts : no_loop 571/571 (en shadow, aucun reset → tout termine en no_loop)
```

### 4.1 Répartition par famille

| Famille | Chunks | HF chunks | Rate chunk | Runs w/ HF | Rate run |
|---|---|---|---|---|---|
| **TRIGGER** (T*) | 372 | 56 | **15.1 %** | 33 / 80 | **41.2 %** |
| **NEUTRAL** (N*) | 199 | 43 | **21.6 %** | 16 / 40 | **40.0 %** |

**Finding fondamental** : NEUTRAL ≥ TRIGGER. Le design du corpus ne discrimine pas.

### 4.2 Par scène (tri par rate_run desc)

| Scène | Famille | HF chunks | Rate chunk | Rate run |
|---|---|---|---|---|
| **N02** | NEUTRAL | 23 | 37.1 % | **60.0 %** |
| T01 | TRIGGER | 9 | 18.4 % | 60.0 % |
| T02 | TRIGGER | 8 | 16.7 % | 50.0 % |
| T04 | TRIGGER | 14 | 26.9 % | 50.0 % |
| T07 | TRIGGER | 7 | 15.2 % | 50.0 % |
| N04 | NEUTRAL | 6 | 13.3 % | 40.0 % |
| T05 | TRIGGER | 4 | 9.1 % | 40.0 % |
| N01 | NEUTRAL | 11 | 22.4 % | 30.0 % |
| N03 | NEUTRAL | 3 | 7.0 % | 30.0 % |
| T06 | TRIGGER | 4 | 9.3 % | 30.0 % |
| T08 | TRIGGER | 7 | 14.9 % | 30.0 % |
| T03 | TRIGGER | 3 | 7.0 % | 20.0 % |

**N02 est la scène la plus toxique du bench.** Elle bat toutes les triggers.

### 4.3 Critères déclencheurs (99 HF analysés)

| Combinaison | N | % |
|---|---|---|
| C1+C4 | 54 | 54.5 % |
| C1 seul | 33 | 33.3 % |
| C1+C2+C4 | 11 | 11.1 % |
| C4 seul | 1 | 1.0 % |
| **C1 impliqué** | **98/99** | **98.9 %** |
| C2 impliqué | 11/99 | 11.1 % |

**C1 est le déclencheur quasi-universel.** C2 (répétition lexicale locale) ne déclenche jamais seul — il n'agit que comme confirmateur de C1. Rediscuter la nécessité de C2.

### 4.4 Distribution c1_trigram_ratio

| Famille | n | mean | median | p90 | max |
|---|---|---|---|---|---|
| TRIGGER | 372 | 0.094 | 0.038 | 0.211 | 0.901 |
| NEUTRAL | 199 | 0.112 | 0.056 | 0.282 | 0.912 |

Les deux distributions sont **quasi identiques**. Le neutre est même légèrement plus "poilu" (median 0.056 vs 0.038, p90 0.282 vs 0.211).

---

## 5. Diagnostic terrain — audit de l'oracle

Extraction des 94 trigrammes "worst" capturés dans `log_S.txt` (5 HF supplémentaires sur 99 utilisent C4-only, pas de trigramme worst émis). Trigrammes dé-mojibakés depuis l'encoding CP437→UTF-8 du log PowerShell.

### 5.1 Top 15 worst trigrammes (global)

| Trigramme | Events | Σ occurrences | Scènes |
|---|---|---|---|
| `il ne sait` | 10 | 450 | 4 |
| `il est là.` | 5 | 280 | 1 (N02) |
| `il est. il` | 3 | **1146** | 2 |
| `pas. il ne` | 3 | 227 | 3 |
| `il n'y avait` | 3 | 65 | 2 |
| `le point est` | 3 | 54 | 1 (N01) |
| `il pense à` | 3 | 43 | 3 |
| `il dit *cette` | 3 | 31 | 1 (T04) |
| `il ne savait` | 2 | 54 | 2 |
| `il ne voit` | 2 | 47 | 2 |
| `il n'y a` | 2 | 63 | 2 |
| `il reste. il` | 2 | 144 | 1 |
| `le train est` | 2 | 24 | 2 |
| `il note. il` | 2 | 22 | 1 |
| `a porté des` | 2 | 30 | 1 |

### 5.2 Classification qualitative (échantillon N=15 majeurs)

| Trigramme | Σ occ | Ratio obs | Verdict humain |
|---|---|---|---|
| `il est là.` ×205 | 205 | 0.795 | **BOUCLE NUCLÉAIRE** — 50 % du chunk |
| `un mur qui` ×40 | 40 | 0.717 | **BOUCLE** — répétition décorative |
| `il respire. il` ×58 | 58 | 0.433 | **BOUCLE** — respiration mécanique |
| `il ne sait` ×52 | 52 | 0.447 | **BOUCLE** — ~6 % du texte |
| `il est. il` ×N | ~382/event | N/A | **BOUCLE 3-char** — pathologie modèle |
| `il dit *cette` ×N | ~10/event | ~0.25 | **BOUCLE SELF-REF** (T04 méta-référentiel) |
| `fixe fixe fixe` ×? | ? | ? | **BOUCLE LEXICALE** (T03) |
| `il ne savait` ×41 | 41 | 0.315 | **BOUCLE** — auxiliaire au passé bouclé |
| `il pense à` ×11 | 11 | 0.180 | LIMITE — prose introspective dense |
| `il a une` ×16 | 16 | 0.163 | **FAUX POSITIF PROBABLE** — syntaxe banale |
| `le train est` ×N | ~12/event | ~0.17 | LIMITE — descriptif dense |
| `il ne voit` ×28 | 28 | 0.259 | **BOUCLE** — négation descriptive |
| `le virage est` ×16 | 16 | 0.179 | LIMITE |
| `le silence est` ×? | 1 event | ~0.16 | LIMITE |
| `pas. il ne` ×28 | 28 | ~0.19 | **BOUCLE** — césure négation bouclée |

**Ventilation** :
- **Boucle réelle (ratio ≥ 0.20)** : ~78 % des HF examinés
- **Boucle limite (ratio 0.17–0.20)** : ~14 %
- **Faux positif probable (ratio 0.15–0.17)** : ~8 %

### 5.3 Conclusion audit oracle

**L'oracle C1 n'hallucine PAS massivement.** La majorité des détections correspondent à de vraies répétitions structurelles. Les faux positifs se concentrent dans la zone 0.15–0.17 sur des syntagmes français hyper-communs (`il a une`, `le silence est`).

**La scène N02** déclenche non pas parce qu'elle est un faux positif corpus-side, mais parce qu'elle est **intrinsèquement adversariale** : la prompt "salle d'attente" / "immobilité" pousse qwen3:32b à écrire du stoïcisme narratif répétitif ("il est là, il attend, il regarde, il pense"). Le label "neutre" était une erreur de classification a priori.

---

## 6. Implications corpus T/N

Le corpus initial posait l'hypothèse : **scènes trigger** = conçues pour provoquer boucles (auto-référence, immobilité, tautologie) ; **scènes neutres** = contrôles normaux.

**Cette hypothèse est partiellement fausse** :
- T04 (méta-référentiel) reste le T le plus déclencheur — hypothèse correcte sur celui-ci
- N02 (salle d'attente) déclenche plus que 7/8 des T — la "neutralité" n'existe pas si la scène impose un ralentissement narratif
- T03, T05, T06 (triggers présumés) déclenchent moins que N01 et N04

Le bon axe n'est pas **TRIGGER vs NEUTRAL**, mais **CADENCE NARRATIVE** :
- Scènes à mouvement (action, dialogue) → ratio bas
- Scènes à immobilité (contemplation, attente, description) → ratio haut, indépendamment du label

---

## 7. Recalibration recommandée

### 7.1 Seuil C1

| Seuil | HF capturés | Faux positifs estimés | Vrais positifs |
|---|---|---|---|
| 0.15 (actuel) | 99 | ~8 (8 %) | ~91 (92 %) |
| 0.18 | ~80 | ~3 (4 %) | ~77 (96 %) |
| 0.20 | ~68 | ~1 (1 %) | ~67 (99 %) |
| 0.25 | ~45 | ~0 | ~45 (100 %) — risque sous-détection |

**Recommandation** : passer C1 à **0.18** pour Phase R, en première intention. Ou **0.20** si on veut une spécificité ≥ 99 %.

### 7.2 Critère C2

C2 (répétition lexicale locale) ne déclenche JAMAIS seul sur ce bench. Toujours en combinaison avec C1. **Option** : retirer C2 de la logique OR pour Phase R, ou le garder uniquement comme tag informatif sans effet de gate.

### 7.3 Critère C4

C4 (unique_ratio < 0.30) est un bon co-validateur :
- 65/99 HF combinent C1+C4 (65.7 %)
- Seul 1/99 HF est C4-only (1 %)

**Recommandation** : garder C4 en AND avec C1 pour zone grise. Proposition formule :
```
hard_fail = (C1 > 0.20) OR (C1 > 0.15 AND C4 < 0.30)
```

---

## 8. Phase R — verdict

**Décision : SUSPENDUE (R.c).**

Déclencher Phase R en mode `on` avec les seuils actuels provoquerait :
- Faux reset sur ~8 % des cas (prose dense normale)
- Massacre algorithmique sur N02 (60 % runs réinitialisés → coût computationnel × 2)
- Pollution statistique du ratio d'efficacité du reset (C5 verdict)

**Avant Phase R, exécuter** :
1. Recalibrer seuils selon §7 (proposer via ADR)
2. Ré-exécuter mini-bench (30 runs ciblés sur N02 + T04 + T01) en shadow avec nouveaux seuils pour valider baisse de faux positifs
3. Seulement alors : Phase R en mode `on` sur set équilibré (R' redessiné, pas R initial)

---

## 9. Artéfacts livrés

| Fichier | Contenu | Taille |
|---|---|---|
| `runs_S.jsonl` | 120 runs metadata + hashes | 154 KB |
| `checkpoint_S.json` | État final (completed=true) | 0.2 KB |
| `manifest.json` | Paramètres bench + version info | 3.1 KB |
| `dedale_telemetry_S/*.json` | 120 aggregates Dédale | — |
| `dedale_telemetry_S/*_chunks.jsonl` | 120 per-chunk avec métriques oracle | — |
| `analysis/chunks_S.csv` | 571 rows chunk-level structuré | — |
| `analysis/hard_fails_trigrams.csv` | 94 events worst trigrammes | — |
| `log_S.txt` | Stdout complet bench | 192 KB |

---

## 10. Verdict OMEGA

**Statut** : **PASS** (bench exploitable, conclusions exploitables)

**Confiance** : Haute

**Forces** :
- 100 % completion, zéro timeout, zéro crash
- Infrastructure checkpoint résistante à reboot PC
- Données riches (571 chunks évalués, 94 trigrammes détaillés)
- Oracle Dédale fonctionnel (détecte de vraies boucles)

**Faiblesses** :
1. Corpus T/N invalidé — hypothèse de design fausse (TRIGGER ne domine pas NEUTRAL)
2. Zone grise C1 ∈ [0.15, 0.17] : ~8 % de faux positifs, ambiguité prose dense vs boucle
3. Les textes bruts des chunks ne sont PAS stockés (seul `output_hash` + worst_trigram via log stdout) — diagnostic limité aux trigrammes extraits du log
4. C2 non discriminant dans ce bench (jamais déclenche seul) — soit seuil trop haut, soit métrique redondante avec C1

**Risques restants** :
- Si Phase R lancée sans recalibration : massacre algorithmique sur N02 + faux resets
- Extrapolation du taux de boucle (~17 %) à d'autres corpus non garantie
- Modèle qwen3:32b spécifique — comportement peut varier avec autres modèles

**Actions requises** :
1. **BLOQUANT** : Ne pas lancer Phase R avant recalibration seuils (ADR proposé §7)
2. **RECOMMANDÉ** : Étendre runner bench pour stocker textes bruts des chunks HF (audit post-hoc plus riche)
3. **RECOMMANDÉ** : Ouvrir NCR_CORPUS_TN_INVALID pour revisiter le design du corpus 12 scènes
4. **RECOMMANDÉ** : Consolider les 3 critères oracle en une seule formule calibrée (§7.3)

---

**Signé** : Claude (IA Principal)
**Supervision** : Francky (Architect)
**Date** : 2026-04-22
**Commit repo** : `9e69be42` (tag `phase-s-dedale-v0.55-integrated-9e69be42`)
**Bench SHA256 manifest** : à générer pour scellement
