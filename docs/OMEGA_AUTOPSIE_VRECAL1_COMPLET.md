# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — AUTOPSIE COMPLÈTE DU TIR V-RECAL-1
# Chaque étape du pipeline, avant/après, chiffres et explications
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date : 2026-03-25
# Run : VRECAL1_ENGINE_2026-03-25T11-54-28
# Moteur : PF_base_Duras_correcteur_K2_v4 dans engine.ts
# ═══════════════════════════════════════════════════════════════════════════════

---

# ÉTAPE 0 — LE POINT DE DÉPART

Le pipeline reçoit un ForgePacket complet :
- Scène : contemplation (femme seule, maison au bord de la mer, hiver)
- Émotion prescrite : sadness dominant, valence négative, arc darkening
- 4 beats : thé → mer → souvenir → nuit
- Cible : 2500 mots, registre soutenu
- Signature words : silence, ombre, souffle, lumière, eau, pierre, froid, vent, sel, vide

---

# ÉTAPE 1 — PROMPT V4 (0 API, CALC pur)

```
[V4] Prompt: 1323t | hash=24b13bcbdc89
```

Le prompt-assembler-v4 construit un prompt narratif de 1323 tokens (~5300 caractères).
Il contient :
- Le persona (PF : Flaubert+Proust)
- La trajectoire émotionnelle par quartile (Q1=anticipation, Q2-Q3=sadness, Q4=résignation)
- Les behaviors physiques : "épaules affaissées, regard dans le vide, gestes au ralenti" (pour sadness)
- Les beats en langage dramatique
- Les directives stylistiques (registre soutenu)
- Les interdictions (kill-lists)
- Les mots signatures à tisser

C'est le contrat complet que le Scribe reçoit. 1323 tokens est sous la cible de 1500t.

---

# ÉTAPE 2 — GÉNÉRATION CHUNKÉE MOTEUR V4 (4 API)

```
[V4-CHUNKED] Moteur v4 K2 activé — 4 chunks × 750w
[V4-CHUNKED] 2427w en 4 API calls
[V4-CHUNKED] Chunks: 576, 622, 628, 601w
```

Le moteur v4 a produit 4 chunks :

| Chunk | Mots | Rappel utilisé | Rôle |
|-------|------|----------------|------|
| 1 | 576w | RAPPEL_CHUNKS12 (Souffle Flaubert + Murmure Duras) | Installation atmosphère |
| 2 | 622w | RAPPEL_CHUNKS12 | Développement |
| 3 | 628w | RAPPEL_CHUNKS34_V4 (correcteur Duras + nappe phrastique) | Approfondissement |
| 4 | 601w | RAPPEL_CHUNKS34_V4 + "conclus" | Conclusion ouverte |

Total : **2427 mots**. Les chunks sont équilibrés (576-628w, écart max 52w).

MAIS : ce draft de 2427w n'est que le POINT DE DÉPART du pipeline.
Il va maintenant traverser tous les étages de correction.

---

# ÉTAPE 3 — SOVEREIGN LOOP : première évaluation (5+ API)

Le SovereignLoop prend le draft de 2427w et le score avec judgeAestheticV3.
Le résultat de cette première évaluation est visible dans le log du Duel :

```
[0] loop_refined | composite=85.5 min_axis=58.3 ECC=90.1 RCI=78.7
```

## VERDICT DU DRAFT INITIAL (2427w)

| Axe | Score | Seuil SAGA_READY | Statut |
|-----|-------|------------------|--------|
| ECC | 90.1 | ≥ 85 | ✅ mais < 92 |
| RCI | 78.7 | ≥ 85 | ❌ FAIL |
| Min_axis | 58.3 | ≥ 85 | ❌ FAIL sévère |
| Composite | 85.5 | ≥ 92 | ❌ FAIL |

**Explication** : Le draft chunké de 2427w est déjà BON (ECC=90.1 = la cohérence
émotionnelle est forte), mais RCI=78.7 (le rythme n'est pas assez varié sur
2427 mots) et min_axis=58.3 (un axe inconnu est très bas — probablement SII ou IFI).

Le composite 85.5 est < 92. Le pipeline DÉTECTE automatiquement l'insuffisance
et déclenche le DUEL.

---

# ÉTAPE 4 — LE DUEL : 4 candidats en compétition (3 API supplémentaires)

Quand le composite est < 92, le pipeline génère 3 drafts alternatifs
avec des stratégies différentes, puis sélectionne le meilleur des 4.

```
[DUEL] Candidates:
  [0] loop_refined         | composite=85.5 min_axis=58.3 ECC=90.1 RCI=78.7
  [1] tranchant_minimaliste| composite=89.2 min_axis=75.0 ECC=92.3 RCI=75.0
  [2] sensoriel_dense      | composite=92.1 min_axis=86.0 ECC=94.0 RCI=87.0
  [3] experimental_signature| composite=91.3 min_axis=77.9 ECC=92.5 RCI=77.9
```

## CE QUE CHAQUE CANDIDAT REPRÉSENTE

| # | Stratégie | Composite | Min_axis | Ce qu'il fait |
|---|-----------|-----------|----------|---------------|
| 0 | loop_refined (draft initial corrigé) | 85.5 | 58.3 | Le draft chunké de 2427w, après pitch-patch. Trop long pour maintenir tous les axes hauts. |
| 1 | tranchant_minimaliste | 89.2 | 75.0 | Une version plus courte, plus coupante. ECC monte à 92.3 mais RCI chute à 75 (trop monotone). |
| 2 | **sensoriel_dense** | **92.1** | **86.0** | **LE GAGNANT**. Dense en sensations. ECC=94.0, RCI=87.0. Tous les axes ≥ 86. |
| 3 | experimental_signature | 91.3 | 77.9 | Style marqué, signature forte. Mais RCI=77.9 (le rythme ne suit pas). |

## POURQUOI LE CANDIDAT [2] GAGNE

Le "sensoriel_dense" est le seul candidat qui :
- A un composite ≥ 92 (92.1)
- A un min_axis ≥ 85 (86.0)
- A ECC ≥ 92 ET RCI ≥ 85

Il est sélectionné automatiquement par le Duel Engine.

## LE PRIX : la longueur

Le winner fait **470 mots** (vs 2427w du draft initial).

POURQUOI ? Parce que sur 470 mots, il est plus facile de maintenir :
- Un rythme varié (RCI) — moins de monotonie
- Une densité sensorielle (SII) — chaque phrase est chargée
- Une cohérence émotionnelle (ECC) — pas de "creux"

C'est le pipeline qui fait son travail : trouver le MEILLEUR candidat.
Mais ChatGPT a raison — ce n'est pas encore la preuve que la LONGUE FORME
tient à 92+.

---

# ÉTAPE 5 — MICRO-SURGERY : 2 interventions chirurgicales (2 API)

Le MicroSurgeon analyse la prose gagnante et identifie des faiblesses locales.

```
[MICRO-SURGEON] Archetype derived: INTERIOR (conflict=internal)
[MICRO-SURGEON] Diagnostic (keyword-based):
  Q2 similarity=7.4% target=sadness 🔴 TARGET
  Q0 similarity=37.8% target=anticipation ✅ OK
  Q3 similarity=50.2% target=sadness ✅ OK
  Q1 similarity=59.4% target=sadness ✅ OK
```

## CE QUE LE DIAGNOSTIC DIT

Le scorer mesure la similarité entre l'émotion RÉELLE de chaque quartile
et l'émotion PRESCRITE par le ForgePacket :

| Quartile | Émotion cible | Similarité | Statut |
|----------|---------------|------------|--------|
| Q0 (début) | anticipation | 37.8% | ✅ OK (acceptable) |
| Q1 | sadness | 59.4% | ✅ OK (bon) |
| Q2 | sadness | **7.4%** | 🔴 **CIBLE** — l'émotion ne correspond pas |
| Q3 (fin) | sadness | 50.2% | ✅ OK |

**Q2 est le point faible** : la prose du 2e quartile ne transmet que 7.4%
de l'émotion "sadness" prescrite. Le micro-surgeon va intervenir.

```
[MICRO-SURGEON] Missing hooks: 15/35. Targeting: "silence"
[MICRO-SURGEON] 2 intervention(s) planned (1 tension + 1 hook)
```

## LES 2 INTERVENTIONS

### Intervention 1 — HOOK INJECTION (Q3)

```
[DAMAGE-GATE] PASS | HOOK_INJECTION | amp=0.0588 | arch=INTERIOR
[MICRO-SURGEON] APPLIED Q3: "Mais ce n'était qu'un goéland qui criail..."
  → "Mais ce n'était qu'un goéland qui criail..."
```

Amplitude 0.0588 = intervention très légère (5.88% de modification).
Le Damage Gate vérifie que l'intervention ne casse pas les autres axes
(archétype INTERIOR → seuils de tolérance adaptés).

Le hook "silence" est injecté subtilement dans le quartile 3.

### Intervention 2 — TENSION_14D (Q2)

```
[DAMAGE-GATE] PASS | TENSION_14D | amp=0.0588 | arch=INTERIOR
[MICRO-SURGEON] APPLIED Q2 (sadness): "Un rire...." → "Un rire brisé...."
```

"Un rire" → "Un rire brisé" — ajout d'un seul mot qui injecte de la tristesse
dans le quartile Q2 (celui qui n'avait que 7.4% de sadness).

Le mot "brisé" est un marqueur sémantique de sadness que l'analyseur
émotionnel va reconnaître. C'est de la micro-chirurgie au sens littéral.

**RÉSULTAT MICRO-SURGERY : 2 appliquées, 0 rejetées.**

---

# ÉTAPE 6 — SCORING FINAL : judgeAestheticV3 (5 API)

Le scoring final est le verdict canonique. 5 macro-axes, chacun composé
de sous-scores spécialisés. Tous les juges LLM sont actifs.

## ECC — Emotional Control Core = 93.0 (poids 0.33 = 33% du composite)

C'est l'axe ROI. Il pèse le plus dans le composite.

| Sous-score | Score | Poids | Méthode | Ce qu'il mesure |
|------------|-------|-------|---------|-----------------|
| tension_14d | 86.9 | 3.0 | CALC | La prose suit-elle la trajectoire émotionnelle 14D prescrite ? |
| emotion_coherence | 100.0 | 2.5 | CALC | Les transitions émotionnelles entre paragraphes sont-elles fluides ? |
| interiority | 87.0 | 2.0 | LLM | Y a-t-il de la pensée intérieure, du subtext ? |
| impact | 85.0 | 2.0 | LLM | L'ouverture accroche-t-elle ? La fin résonne-t-elle ? |
| physics_compliance | 81.0 | 0 | CALC | La trajectoire émotionnelle suit-elle les lois physiques ? (informatif) |
| temporal_pacing | 75.0 | 1.0 | CALC | Le rythme temporel est-il bien dosé ? |

**Pourquoi ECC = 93.0 ?**
- emotion_coherence = 100 → pas de saut émotionnel brutal entre paragraphes
- interiority = 87 → "elle trouva cette paix amère qu'elle avait cessé d'espérer"
- tension_14d = 86.9 → la trajectoire suit l'arc prescrit (anticipation → sadness → résignation)
- Les bonus ECC (entropy, projection, open_loop) ont probablement poussé le score au-dessus de 92

**C'est l'axe qui a le plus bénéficié de la micro-chirurgie** (Q2 corrigé : "rire brisé").

## RCI — Rhythmic Control Index = 86.9 (poids 0.17 = 17%)

| Sous-score | Score | Poids | Méthode | Ce qu'il mesure |
|------------|-------|-------|---------|-----------------|
| rhythm | 82.2 | 1.0 | CALC | Variation de longueur des phrases (CV, entropie) |
| signature | 100.0 | 1.0 | CALC | Les mots signatures sont-ils présents ? |
| hook_presence | 100.0 | 0.2 | CALC | Y a-t-il des accroches ? |
| euphony_basic | 65.0 | 0.5 | CALC | L'euphonie (sonorité agréable) du texte |
| voice_conformity | 70.0 | 0 | CALC | La voix correspond-elle au profil demandé ? (informatif) |

**Pourquoi RCI = 86.9 ?**
- signature = 100 → les 10 mots signatures (silence, ombre, souffle, lumière, eau, pierre, froid, vent, sel, vide) sont TOUS présents dans la prose de 470 mots. Vérifiable dans le texte.
- rhythm = 82.2 → bon mais pas parfait. La prose mélange des phrases très longues (la phrase du thé fait ~150 mots) et des phrases très courtes ("Un rire brisé. Cristallin."). Le CV est élevé.
- euphony = 65 → point faible. Certaines sonorités ne sont pas optimales.

**Ce qui tire RCI vers le bas** : euphony_basic (65) pèse 0.5. C'est le sous-score le plus bas de l'axe.

## SII — Signature Integrity Index = 86.0 (poids 0.15 = 15%)

| Sous-score | Score | Poids | Méthode | Ce qu'il mesure |
|------------|-------|-------|---------|-----------------|
| anti_cliche | 100.0 | 1.0 | CALC | Aucun cliché détecté dans la prose |
| necessity | 85.0 | 1.0 | LLM | Chaque phrase est-elle nécessaire ? Pas de filler ? |
| metaphor_novelty | 73.0 | 1.0 | HYBRID | Les métaphores sont-elles originales ? |

**Pourquoi SII = 86.0 ?**
- anti_cliche = 100 → la prose ne contient aucun des clichés interdits
- necessity = 85 → le juge LLM considère que presque chaque phrase apporte quelque chose
- metaphor_novelty = 73 → le point faible. Les métaphores ("miroir déformant de ses propres espoirs", "patience minérale des falaises") sont bonnes mais pas exceptionnelles selon le juge

**Ce qui tire SII vers le bas** : metaphor_novelty. C'est la frontière entre A et S.

## IFI — Immersion Force Index = 100.0 (poids 0.10 = 10%)

| Sous-score | Score | Poids | Méthode | Ce qu'il mesure |
|------------|-------|-------|---------|-----------------|
| sensory_richness | 100.0 | 0.25 | CALC | Densité sensorielle (vue, son, toucher, goût, odorat) |
| corporeal_anchoring | 100.0 | 0.25 | CALC | Présence du corps physique dans le texte |
| focalisation | 62.7 | 0.25 | HYBRID | Le point de vue est-il maintenu de façon cohérente ? |
| attention_sustain | 100.0 | 1.0 | CALC | Le lecteur reste-t-il engagé ? |
| fatigue_management | 100.0 | 1.0 | CALC | Pas de fatigue cognitive ? |

**Pourquoi IFI = 100.0 ?**
- BONUS ENTROPY (+10) : "All 4 quartiles have corporeal markers" — le corps est présent dans chaque quartile
- sensory_richness = 100 → la prose est saturée de sensations :
  - Vue : "surface plombée", "horizon brouillé", "arabesques fragiles", "aquarium doré"
  - Son : "goéland qui criaillait", "ressac", "litanie éternelle"
  - Toucher : "théière tremblait contre ses doigts", "paumes épousaient la chaleur", "fraîcheur montante"
  - Goût : "amertume se répandre sur sa langue"
  - Odorat : "bergamote", "effluves salés"
- Le score atteint 100 grâce au bonus entropy (+10) qui pousse au-delà du plafond

**C'est l'axe star du moteur PF+Duras** : la prose produite par Flaubert+Proust est naturellement riche en sensations.

## AAI — Authenticity & Art Index = 95.6 (poids 0.25 = 25%)

| Sous-score | Score | Poids | Méthode | Ce qu'il mesure |
|------------|-------|-------|---------|-----------------|
| (show_dont_tell) | 100.0 | 3.0 | HYBRID | Montre vs raconte. Score maximal. |
| (authenticity) | 89.0 | 2.0 | HYBRID | La prose semble-t-elle écrite par un humain ? |

**Pourquoi AAI = 95.6 ?**
- show_dont_tell = 100 → la prose MONTRE tout, ne RACONTE rien :
  - "La théière tremblait contre ses doigts" (pas "elle était nerveuse")
  - "ses épaules se contractèrent" (pas "elle était surprise")
  - "elle laissa retomber sa nuque" (pas "elle se résigna")
- authenticity = 89 → la prose ne "sent" pas l'IA. Le juge LLM lui donne 89/100 en authenticité. C'est excellent.

**C'est le deuxième meilleur axe (95.6).** Le moteur PF+Duras produit naturellement du "show don't tell" parce que Flaubert et Proust écrivent par les sensations, pas par les concepts.

---

# ÉTAPE 7 — CALCUL COMPOSITE FINAL

```
COMPOSITE = ECC × 0.33 + RCI × 0.17 + SII × 0.15 + IFI × 0.10 + AAI × 0.25

= 93.0 × 0.33 + 86.9 × 0.17 + 86.0 × 0.15 + 100.0 × 0.10 + 95.6 × 0.25
= 30.69      + 14.77      + 12.90      + 10.00      + 23.90
= 92.26 ≈ 92.3
```

**MIN_AXIS = min(93.0, 86.9, 86.0, 100.0, 95.6) = 86.0** (SII)

## CRITÈRES SAGA_READY

| Critère | Seuil | Valeur | Statut |
|---------|-------|--------|--------|
| Composite | ≥ 92.0 | 92.3 | ✅ PASS (marge +0.3) |
| Min_axis | ≥ 85.0 | 86.0 | ✅ PASS (marge +1.0) |

**VERDICT : SAGA_READY = OUI**

Mais le verdict OMEGA est "PITCH" (pas "SEAL") parce que :
- SEAL requiert composite ≥ 93.0 (SEAL_ATOMIC)
- Le composite est 92.3 — au-dessus de SAGA_READY (92) mais en-dessous de SEAL_ATOMIC (93)

---

# ÉTAPE 8 — LE TEXTE FINAL (470 mots)

La prose finale est un texte de 7 paragraphes / 470 mots :

**Paragraphe 1 (ouverture — 13 mots)** :
"La théière tremblait contre ses doigts. Dans la cuisine aux carreaux disjoints, l'eau refusait de bouillir."
→ Phrase courte, sensorielle. Le corps est immédiatement présent. C'est du SHOW.

**Paragraphe 2 (le cœur — ~260 mots, 1 seule phrase)** :
La grande période proustienne. Du thé à la mer, de la mer aux souvenirs.
Densité sensorielle maximale : bergamote, chaleur, sel, vagues, horizon.
C'est Flaubert (structure) + Proust (profondeur) en action.

**Paragraphe 3 (le coup — 14 mots)** :
"Un rire brisé. Cristallin. Porté par la brise d'été. Ses épaules se contractèrent. Le passé venait de la gifler."
→ C'est le MURMURE DE DURAS. Phrases-couteaux. Après 260 mots de flux proustien, 5 phrases de 2-5 mots. Le contraste est violent.
→ "brisé" est le mot injecté par la micro-chirurgie (intervention TENSION_14D Q2).

**Paragraphe 4 (la chute — ~140 mots)** :
Le retour au réel (goéland), puis la résignation lente.
La "patience minérale des falaises" — métaphore signature.
La nuit tombe, "aquarium doré".

**Paragraphe 5 (la fin — ~45 mots)** :
"il fallait apprendre à aimer le vide lui-même" — le mot "vide" est un des signature_words.
Fin ouverte, pas de résolution. Exactement ce que le brief demandait.

---

# RÉSUMÉ DU TRAJET COMPLET

| Étape | Ce qui entre | Ce qui sort | Score | Gain |
|-------|-------------|-------------|-------|------|
| Draft chunké | ForgePacket + brief | 2427w longue forme | 85.5 | — |
| SovereignLoop | Draft 2427w | Draft corrigé | 85.5 → ~85.5 | ~0 (pas assez pour franchir 92) |
| Duel | 4 candidats | Winner "sensoriel_dense" 470w | 92.1 | **+6.6** |
| MicroSurgery | Prose 470w | Prose corrigée (2 mots) | 92.1 → 92.3 | **+0.2** |
| **FINAL** | | **470w, 7 paragraphes** | **92.3** | **+6.8 total** |

---

# CE QUE CHAQUE ÉTAGE A APPORTÉ

| Étage | Contribution | Valeur |
|-------|-------------|--------|
| Moteur v4 chunké | Draft initial solide (ECC=90.1) | Point de départ |
| SymbolMap | Mots signatures injectés → signature=100 | RCI boost |
| EmotionBrief | Contrat émotionnel → tension_14d calibré | ECC calibré |
| SovereignLoop | Première évaluation + tentative correction | Diagnostic |
| **Duel** | **Sélection du meilleur candidat (92.1 vs 85.5)** | **+6.6 pts = 78% du gain** |
| MicroSurgery | "rire" → "rire brisé" | +0.2 pts |
| PhysicsAudit | Vérification trajectoire (informatif) | Monitoring |
| judgeAestheticV3 | Score canonique final | Verdict |

**LE DUEL EST L'ÉTAGE CLÉ.** Il apporte 78% du gain total (6.6 pts sur 6.8).

---

# CE QUE ÇA VEUT DIRE POUR L'ARCHITECTE

## Ce qui MARCHE

1. Le pipeline complet fonctionne end-to-end
2. Le moteur v4 produit un draft initial ECC=90.1 (très bon pour un brut)
3. Le Duel sait trouver un candidat SAGA_READY
4. La micro-chirurgie est précise (1 mot change le score)
5. IFI=100 et AAI=95.6 : la prose est sensorielle et authentique
6. Composite 92.3 > seuil 92.0

## Ce qui reste à prouver

1. Le winner fait 470w, pas 2427w — la longue forme pure ne passe pas encore
2. Le Duel "sauve" en compressant — est-ce acceptable pour un roman ?
3. Un seul run — L18 dit minimum 3 runs
4. Marge très faible : 92.3 vs seuil 92.0 (seulement +0.3)
5. SII=86.0 = le min_axis. C'est la métaphore qui tire vers le bas

## La vraie question

Le Duel produit 470w au lieu de 2427w. Pour un roman de 300K mots,
le pipeline doit produire des chapitres de 2500w+ à 92+.

Deux voies :
- **Améliorer le draft long** pour qu'il passe directement (sans Duel)
- **Adapter le Duel** pour qu'il produise des candidats longs (pas compressés)

---

*Autopsie complète — 2026-03-25*
*"La théière tremblait contre ses doigts. Le pipeline a tenu."*
