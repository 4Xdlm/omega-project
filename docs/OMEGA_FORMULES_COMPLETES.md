# OMEGA — FORMULES COMPLETES DU SCORER
## Extraction exhaustive du code source — 2026-03-26

### COMPOSITE (s-score.ts:118-143)

```
COMPOSITE = ECC × 0.33 + RCI × 0.17 + SII × 0.15 + IFI × 0.10 + AAI × 0.25
MIN_AXIS  = MIN(ECC, RCI, SII, IFI, AAI)

SEAL   : composite >= 93 AND min_axis >= 80 AND ecc >= 88 AND aai >= 85
PITCH  : composite >= 85 AND min_axis >= 75
REJECT : else
```

---

### ECC — Emotional Control Core (macro-axes.ts:98-182, weight=0.33, floor=88)

```
ECC_raw = (tension_14d × 3.0 + emotion_coherence × 2.5 + interiority × 2.0 + impact × 2.0) / 9.5

BONUSES (CALC) :
  ENTROPY   : stddev(arousal_per_quartile) > 0.15 → +3, == 0 → -5
  PROJECTION: interiority > 70 AND terminal_dominant in [sadness,fear,guilt,remorse] → +2
  OPEN_LOOP : avgArousal(last 2 paras) > 0.5 → +3
  CAP total bonus : 3.0

ECC = CLAMP(ECC_raw + MIN(bonus_total, 3), 0, 100)
```

Sub-scores :
| Sub-score | Poids | Methode | Fichier |
|-----------|-------|---------|---------|
| tension_14d | 3.0 | CALC (cosine 14D) | oracle/axes/tension-14d.ts |
| emotion_coherence | 2.5 | CALC (euclidean jumps) | oracle/axes/emotion-coherence.ts |
| interiority | 2.0 | HYBRID (LLM) | oracle/axes/interiority.ts |
| impact | 2.0 | HYBRID (LLM) | oracle/axes/impact.ts |
| physics_compliance | 0 (informatif) | CALC | oracle/axes/physics-compliance.ts |
| temporal_pacing | 1.0 | CALC | oracle/axes/temporal-pacing.ts |

---

### RCI — Rhythmic Control Index (macro-axes.ts:379-473, weight=0.17, floor=85)

```
rhythm_eff_weight = rhythm.weight × rhythmConfidence(wordCount)

  Confidence (rhythm.ts:166-189) :
    100w → 0.30, 300w → 0.65, 600w → 0.80, 1500w → 0.95, 3000w → 1.0

RCI_raw = weighted_mean(rhythm_weighted, signature, hook_presence, euphony, voice_conformity)

  Anti-metronomic penalty :
    IF gini == 0.45 AND syncopes == 2 AND compressions == 1 EXACTLY → -5

RCI = CLAMP(RCI_raw + penalty, 0, 100)
```

Sub-scores :
| Sub-score | Poids | Methode | Fichier |
|-----------|-------|---------|---------|
| rhythm | 1.0 × conf | CALC (CV sent+para) | oracle/axes/rhythm.ts |
| signature | 1.0 | CALC | oracle/axes/signature.ts |
| hook_presence | 0.20 | CALC | macro-axes.ts:494 |
| euphony_basic | 0.50 | CALC | oracle/axes/euphony.ts |
| voice_conformity | 0 (neutralise) | CALC | oracle/axes/voice-conformity.ts |

Rhythm (rhythm.ts:44-133) — 6 composantes sur 100 pts :
1. CV phrases (35 pts) : peak 0.75, range [0.30, 1.30]
2. CV paragraphes (15 pts) : peak 0.60, range [0.15, 1.20]
3. Range longueurs (15 pts) : max-min >= 15 → 15 pts
4. Anti-monotonie (15 pts) : 0 sequences → 15, <=2 → 9, <=4 → 4
5. Ouverture variee (10 pts) : repetition < 0.10 → 10
6. Respiration (10 pts) : has_long AND has_short → 10

---

### SII — Signature Integrity Index (macro-axes.ts:565-614, weight=0.15, floor=80)

```
SII = (anti_cliche × 1.0 + necessity × 1.0 + metaphor_novelty × 1.0) / 3.0
```

| Sub-score | Poids | Methode | Fichier |
|-----------|-------|---------|---------|
| anti_cliche | 1.0 | CALC | oracle/axes/anti-cliche.ts |
| necessity | 1.0 | HYBRID (LLM) | oracle/axes/necessity.ts |
| metaphor_novelty | 1.0 | HYBRID (LLM) | oracle/axes/metaphor.ts |

---

### IFI — Immersion Force Index (macro-axes.ts:624-703, weight=0.10, floor=85)

```
IFI_raw = (sensory_richness × 0.25 + corporeal_anchoring × 0.25 +
           focalisation × 0.25 + attention_sustain × 0.125 + fatigue_mgmt × 0.125)

Distribution bonus :
  4/4 quartiles with corporeal markers → +10
  3/4 → +5, <=2/4 → 0

IFI = CLAMP(IFI_raw + bonus, 0, 100)
```

Corporeal markers (config.ts:483-491) : 31 mots FR (souffle, gorge, mains, poitrine, ventre, sueur, tremblement, machoire, epaules, nuque, doigts, respiration, coeur, estomac, tempes, peau, frisson, vertige, nausee, chaleur, paumes, colonne, cotes, poumons, pouls, os, muscle, poignet, phalanges, crane, bassin)

---

### AAI — Authenticity & Art Index (macro-axes.ts:327-357, weight=0.25, floor=85)

```
AAI = show_dont_tell × 0.60 + authenticity × 0.40

authenticity = CALC(ia_smell_15_patterns) × 0.60 + LLM(adversarial_judge.fraud_score) × 0.40
  Si LLM indisponible : authenticity = CALC seul
```

---

### TENSION 14D (tension-14d.ts:73-193, weight=3.0 dans ECC)

```
Pour chaque quartile i in [0,3] :
  quartileText = prose[startIdx..endIdx] (par paragraphes)
  actualState = analyzeEmotion(quartileText) → vecteur 14D
  similarity[i] = cosineSimilarity(target_14d[i], actualState)

avgSim = mean(similarity[0..3])

Score mapping :
  avgSim < 0.3 : score = avgSim × 80
  0.3 <= avgSim <= 0.6 : score = 24 + (avgSim - 0.3) × 200
  avgSim > 0.6 : score = 84 + (avgSim - 0.6) × 40

Bonus rupture : si timing error < 0.15 → +10
Penalty monotonie : si toutes similarities similaires ET trajectoire variee → -20
Bonus monotonie : si trajectoire prescrite plate → +5
```

---

### EMOTION COHERENCE (emotion-coherence.ts:67-119, weight=2.5 dans ECC)

```
Pour chaque paire de paragraphes consecutifs :
  distance[i] = euclideanDistance14D(emotion[i], emotion[i+1])

brutalJumps = COUNT(distance > 2.0)

Score : 0 jumps → 100, 1 → 70, 2 → 50, 3+ → 0
```

---

### CONSTANTES CRITIQUES (config.ts)

| Constante | Valeur | Fichier:ligne |
|-----------|--------|---------------|
| SOVEREIGN_THRESHOLD | 93 | config.ts |
| MACRO_WEIGHTS | {ecc:0.33, rci:0.17, sii:0.15, ifi:0.10, aai:0.25} | config.ts |
| MACRO_FLOORS | {ecc:88, rci:85, sii:80, ifi:85, aai:85} | config.ts |
| MAX_PARAGRAPH_DISTANCE | 2.0 | config.ts |
| TIMING_TOLERANCE | 0.15 | config.ts |
| CV_GATE_REJECT | 1.05 | duel-engine.ts |
| CV_GATE_MAX_RETRIES | 2 | duel-engine.ts |
| ECC_MAX_TOTAL_BONUS | 3 | config.ts |
| ECC_ENTROPY_STDDEV | 0.15 | config.ts |
| RHYTHM_CV_PEAK | 0.75 | rhythm.ts |
| OPENING_REPETITION_MAX | 0.10 | config.ts |
| CORPOREAL_TARGET | 6 | config.ts |

### PROMPT SEMANTIC ANALYZER (semantic-prompts.ts:24-94)

```
"Analyse les emotions dans ce texte selon le modele Plutchik 14D.
 Retourne UNIQUEMENT un JSON strict avec exactement 14 cles,
 chaque valeur entre 0.0 et 1.0."

LACUNE IDENTIFIEE : Le prompt NE dit PAS que :
- Les phrases courtes SONT de l'urgence/fear
- L'ancrage sensoriel (froid, poids, souffle) EST de l'emotion incarnee
- Le silence narratif EST du fear
- La dilatation temporelle EST de l'anticipation
- Le rythme casse EST de l'anger/urgence
```
