# CODEX OMEGA — Lois, Contraintes LLM et Physique Littéraire
**Version** : V1.1 | **Date** : 2026-04-12
**Auteur** : Claude Opus (synthèse croisée Gemini + ChatGPT + repo OMEGA)
**Revue** : Corrections ChatGPT (6 points) + vérification code source
**Standard** : NASA-Grade L4 — chaque loi sourcée [SSOT] ou marquée [BENCH]

---

## AVERTISSEMENT MÉTHODOLOGIQUE

Ce document compile les lois empiriques, contraintes du LLM, et règles d'ingénierie
découvertes au cours du projet OMEGA. Chaque entrée a été vérifiée contre le code source
et les fichiers du repo. Les synthèses Gemini et ChatGPT ont été croisées et complétées.

**Règle fondamentale** (ChatGPT) : "On n'optimise jamais OMEGA comme s'il n'y avait que
le corpus. On n'optimise jamais OMEGA comme s'il n'y avait que le LLM."

**Structure** : ce Codex distingue trois strates temporelles :
- **[SEALED]** — loi ou règle scellée, vérifiée, non négociable
- **[OPERATIONAL]** — règle active en production, validée empiriquement
- **[ACTIVE INVESTIGATION]** — résultat en cours d'interprétation, non figé

---

# PARTIE I — LOIS SCELLÉES

## PILIER 1 — PHYSIQUE LITTÉRAIRE (La Vérité Terrain)

### 1.1 Lois causales scellées

**L37 — Chaîne causale universelle** [SEALED]
`sub_per_sentence → f26b_long_sent_rate → Tier_qualité`
Médiation FR=136% (amplification), EN=95%. Seule loi causale bilingue prouvée.
La subordination syntaxique CAUSE les phrases longues, qui CAUSENT la qualité.
SSOT: `docs/irm/09_LAW_REGISTRY_TOTAL.md`, MANUEL_v1.0 I.6
⚠️ **NE PAS CONFONDRE** avec CI_L37 = ancien composant/module de mesure,
saturé à 100 intra-OMEGA, REJETÉ et listé dans les rejets (5.3).
L37 la LOI reste un pilier ; CI_L37 le MODULE est mort.

**L35 — sub_per_sentence = méga-levier FR** [SEALED]
Quand sub double (P25→P75) : f26b +205%, mean_sent +56%, f17_knife -67%.
SSOT: MANUEL_v1.0 I.6, équation C2

**L31 — Monopole ponctuel FR** [SEALED]
Le point-virgule est 7.15× plus discriminant en FR qu'en EN.
`A_semi = Imp_FR / Imp_EN = 0.4157 / 0.0581 = 7.15`
SSOT: MANUEL_v1.0 I.3, Random Forest 200 arbres, 638K fenêtres FR

**L33 — Interaction ponctuelle FR-only** [SEALED]
`ρ_FR(semi, dash) = 0.231 ; ρ_EN(semi, dash) = 0.056`
Le signal ponctuel est un bloc corrélé en FR uniquement.
SSOT: MANUEL_v1.0 I.9

**L38 — Mur sémantique EN maximaliste** [SEALED]
Pour la prose EN maximaliste (Faulkner, Wallace, DFW), le modèle structurel 42 features
prédit à l'ENVERS : R²=-0.187. La structure syntaxique est condition nécessaire non discriminante.
SSOT: MANUEL_v1.0 I.8

### 1.2 Lois de scaling

**S1 — Scaling linéaire du couteau narratif** [SEALED, R²=1.000]
`f17_knife_count(size) = 0.01167 × size − 0.1136`
Ce n'est pas un choix stylistique, c'est une constante proportionnelle.

**S2 — Scaling logarithmique de la variance rythmique** [SEALED, R²=0.999]
`cv_sent(size) = 0.0259 × ln(size) + 0.5355`
Le rythme se diversifie avec la longueur.

**S3 — Scaling logarithmique de l'entropie syntaxique** [SEALED, R²=0.999]
`f19a_entropy(size) = −0.0261 × ln(size) + 0.8187`
La syntaxe se régularise avec la longueur. INVERSE de S2.

### 1.3 Noyau structurel robuste (CALC V3.4) [SEALED]

5 features stables multi-niveaux, bilingues (noms exacts du code source) :
- `f24c_contrast_delta` — contraste delta entre paragraphes
- `f33b_commas_count` — comptage de virgules (quantité, pas densité)
- `f1a_rhythm_variance` — variance rythmique des phrases
- `f33c_dot_comma_ratio` — ratio points/virgules (⚠️ PAS "densité de tirets")
- `f12_tense_switches` — nombre de changements de temps verbaux

SSOT UNIQUE : `src/scoring/dispatcher/coefficients-v3-4.ts`
Modèle Ridge α=1.0, 3 modèles séparés FR/EN/FALLBACK, ρ_dispatch=0.6138.
1334 œuvres (FR: 788, EN: 546), holdout V2 264 œuvres.

**PLATEAU CALC scellé** : toute future feature CALC doit prouver un MÉCANISME NOUVEAU,
pas juste "une feature de plus". Kill-switch +0.02 INCHANGÉ — interdit de baisser le seuil post-hoc.

### 1.4 Features rejetées (registre des rejets) [SEALED]

| Feature | Raison du rejet | Date |
|---------|----------------|------|
| f9a | Kill-switch FAIL, VIF 4.46 | 2026-04-10 |
| body_binding | Δρ +0.012 < seuil +0.02 (shadow) | 2026-04-11 |
| coverage | Redondant, collinéarité 0.85-0.99 | 2026-04-11 |
| density | Redondant, collinéarité 0.85-0.99 | 2026-04-11 |
| concreteness | Redondant, collinéarité 0.85-0.99 | 2026-04-11 |
| emotion_14d keyword | Δ Spearman +0.021 < seuil +0.030 | 2026-04-08 |

### 1.5 Asymétries FR/EN [SEALED]

Gemini : "FR et EN n'ont pas la même physique."

- Le FR est rythmiquement plus riche (subordination + ponctuation)
- L'EN est nativement plus dense en capteurs sensoriels et plus court
- Un modèle unifié FR/EN dilue le signal → dispatch OBLIGATOIRE
- Certaines features sont françaises (semicolons), d'autres anglaises
- Le scoring discrimine mieux en FR qu'en EN

### 1.6 Le paradoxe sensoriel [SEALED]

La grande littérature (Tier S) n'est PAS saturée de descriptions physiques corporelles.
body_binding montre que le Tier S utilise MOINS d'ancrages corporels bruts que les Tiers B/C.
Le Tier S excelle dans la suggestion et la distance, pas dans le listing sensoriel.
Source : Bench capteurs V2, Gemini

### 1.7 Statut de l'émotion [SEALED]

**MORTE** : émotion lexicale CALC par mots-clés
- emotion_14d keyword extraction : Δ Spearman +0.021 < seuil +0.030 → kill-switch
- Aucune feature émotionnelle n'a survécu au kill-switch CALC
- Les dictionnaires émotionnels ne prédisent PAS la qualité littéraire

**ACTIVE** : émotion comme axe de jugement et de trajectoire
- ECC (Emotional Coherence & Curve) : macro-axe S-Oracle, inclut tension_14d, coherence, interiority, impact
- Contrat émotionnel (curve_quartiles) : structuré dans ForgePacket, piloté par l'engine
- L'émotion est vivante dans le pipeline — elle est MORTE comme feature CALC

Cette distinction est cardinale. "L'émotion a été débranchée" est FAUX.
"L'émotion CALC par keywords est morte" est VRAI.

---

## PILIER 2 — PSYCHOLOGIE DU LLM (Ce qui casse) [SEALED]

### 2.1 Lois de régime Claude Sonnet (Black-Box)

**BB-01 — Semicolons non pilotables** [SEALED]
P(respect consigne semicolons) = 13%. 11/15 runs = 0 semicolons.
La voie PROMPT est FERMÉE. Toute mention semicolon purgée des prompts Scribe.
SSOT: DECISIONS_LOCK_v1, OBSERVABLE_LAWS L03

**BB-02 / BB-P04 — Plancher mean_sent ≈ 35w** [SEALED, CONSTANTE_RÉGIME]
Claude ne produit pas de prose < 35 mots/phrase en régime OMEGA.
Zone de réponse : 35-42 mots quel que soit le target.
Note : pas universel — en B3 extrême pur (sans contexte OMEGA) : 18.2w produits.
SSOT: DECISIONS_LOCK_v1, Phase B gradient 15 runs

**BB-03 — Conflits améliorants** [SEALED]
Les instructions contradictoires AMÉLIORENT le composite dans 4/5 cas (+0.4 à +2.2 pts).
Le conflit force Claude hors de son attracteur moyen.
Exception : ampleur_vs_sécheresse (-1.3) → ne sait pas alterner.
SSOT: DECISIONS_LOCK_v1, Phase B Bloc 4, confirmé Phase I1

**BB-C01 — sub_per_sentence ≈ 0.099 constante** [SEALED]
Claude produit une densité de subordination quasi-constante. Non pilotable.

**BB-P06 / M_BB5 — Composite stable, features instables** [SEALED]
CV(composite) = 1-2% ; CV(features) = 20-80%.
Plusieurs micro-états convergent vers la même énergie globale.
La qualité globale est reproductible, PAS la forme.

### 2.2 Hiérarchie d'obéissance [SEALED]

| Niveau | Features | Taux |
|--------|----------|------|
| OBÉIT TOUJOURS | f24e_contrast, f15b_redundancy, f16a_bigram, f36c_cliff | 100% |
| OBÉIT SOUVENT | f29d_ttr (80%), f35c_hook (90%) | 80-90% |
| FAIT SANS DEMANDE | introspection, phrases longues, faible ponctuation | Toujours |
| IGNORE SYSTÉMATIQUEMENT | semicolons, phrases <30w, f17_knife | ≤20% |
| COMPRESSE VERS SA ZONE | mean_sent 35-42w, volume 300-600w | Toujours |

SSOT: CLAUDE_OBSERVABLE_LAWS.md, Rosetta Phase A

### 2.3 Puits gravitationnel d'introspection (L01) [SEALED]

Matrice de confusion 7×7 : quel que soit le mode demandé, Claude produit de l'INTROSPECTION.
7/7 modes → introspection. Seul INTROSPECTION est un MATCH.
**Conséquence** : les labels littéraires ne pilotent PAS le LLM.
SSOT: `results_rosetta/07_confusion_matrix.json`

### 2.4 Facteurs de conversion [SEALED]

Ce que le LLM produit réellement vs ce qu'on demande :

| Demande | Produit réel | Facteur |
|---------|-------------|---------|
| "12 mots/phrase" | 36 | ×3.0 (ignore) |
| "18 mots/phrase" | 35 | ×1.9 (ignore) |
| "25 mots/phrase" | 38 | ×1.5 |
| "35 mots/phrase" | 42 | ×1.2 |
| "50 mots/phrase" | 39 | ×0.8 |
| "N semicolons" | 0-7 (moy 0.7) | ~13% respect |
| "500w" | 302 | ×0.6 |
| "1000w" | 470-550 | ×0.5 |
| "2500w" | 400-600 | ×0.2 (single-shot) |

SSOT: CLAUDE_OBSERVABLE_LAWS.md

### 2.5 Illusion déclarative f17 (L02) [SEALED]

Claude PRÉTEND ajouter des phrases-couteau (≤5 mots) mais ne le fait pas.
Pilotabilité Rosetta = 0.0 ; catégorie = ILLUSION_DECLARATIVE ; respect réel = 20%.
SSOT: Rosetta Phase A

### 2.6 Micro-chirurgie phrase-par-phrase = ÉCHEC (L11) [SEALED]

Taux de succès = 0%. Delta_r6 = +0.
SSOT: `results_rosetta/s0/s05_bench_micro_chirurgie.json`
Note : la micro-chirurgie BORNÉE du micro-surgeon actuel (hook injection, tension 14D)
fonctionne car elle est locale et ne réécrit pas des phrases entières.

### 2.7 Premier tir > itération [SEALED]

La convergence itérative globale a échoué. Les boucles de correction successives
empirent le résultat. Le rejection sampling (re-tirer) bat la correction (re-écrire).
SSOT: Bench R6 Mode B vs Mode C

---

## PILIER 3 — DOGME DE L'HYBRIDATION (CALC vs LLM) [SEALED]

### 3.1 Contrat SCRIBE / OMEGA [SEALED]

```
SCRIBE écrit.
OMEGA contrôle.
```

SCRIBE (le LLM via prompt-assembler) est le GÉNÉRATEUR de prose.
OMEGA (le pipeline sovereign-engine) est le CONTRÔLEUR : mesure, sélection, gate, micro-surgery.
SCRIBE n'a AUCUNE fonction de vérification, cohérence, ou auto-correction système.
Ce contrat interdit de donner au LLM les résultats de ses propres évaluations CALC.

### 3.2 CALC = Douanier, PAS Coach [SEALED, ADR-003]

Le CALC contrôle la SÉLECTION, pas la GÉNÉRATION (formulation scellée ADR-003).
- Le LLM génère librement (sans feedback CALC)
- Le CALC mesure en sortie
- Si sous le seuil → rejection sampling (re-tirer avec temp+ et nouvelle seed)
- Si 3 échecs → fallback : meilleur jet + flag `below_threshold: true`

SSOT: `docs/adr/DEC-20260411-003-R6-REJECTION-SAMPLING.md`, unanimité 4/4

### 3.3 Toxicité du feedback sémantique [SEALED, BENCH R6]

Mode C (Laisse Élastique / feedback CALC→LLM) : score 3.547, passage 10%, Δ-0.264.
7/9 scènes avec Δ négatif. f33b_commas dominant dans les déficits → surcorrection en cascade.

**Mécanisme** : traduire un échec mathématique en directive textuelle ("Ajoute des virgules")
provoque une spirale destructrice. Le LLM surcompense, détruit le rythme, perd le contraste.
Les features CALC sont couplées : corriger 1 en dérègle 3.
SSOT: bench_r6/BENCH_R6_RESULTS.json

### 3.4 Rejection sampling = seule approche valide [SEALED]

Mode B (Gate Dur) : score 4.600, passage 100%, Δ+0.103 vs roue libre.
Retry avec : hausse température (0.85→0.90→0.95), nouvelle seed.
Le seuil est un FILTRE, pas une cible. On ne baisse pas le seuil pour faire passer un texte.
SSOT: ADR-003

### 3.5 Les labels ne pilotent pas le LLM ; les contraintes mécaniques oui [SEALED]

"contemplation", "lyrique", "sensoriel" = interprétés librement par Claude.
Contraintes mécaniques (structure, token budget, volume floor) = respectées.
OMEGA garde SA langue ; on traduit vers le LLM, pas l'inverse.
SSOT: Rosetta confusion matrix + CLAUDE_BLACKBOX_ARCHAEOLOGY.md

---

## PILIER 4 — BIAIS DE SÉLECTION ET SCORING [SEALED]

### 4.1 Composite insensible au style (L13) [SEALED]

Les conflits n'endommagent pas le composite. Les styles extrêmes produisent des scores
similaires (~88-92). Le scorer ne MESURE PAS le style — il mesure la cohérence.
SSOT: OBSERVABLE_LAWS L13

### 4.2 La scène conditionne le plafond (L14) [SEALED]

| Catégorie | Composite moyen |
|-----------|----------------|
| Souvenir/contemplation/description | 91-92 |
| Sensoriel/intérieur | 90 |
| Dialogue/action | 88-89 |
| **Menace/révélation** | **87-88** |

La scène est le premier déterminant du score, pas la consigne stylistique.
SSOT: OBSERVABLE_LAWS L14, Phase B 30 runs baseline

### 4.3 Asymptote prompt engineering [SEALED]

Composite plafonne à 88.5-89.6. Au-delà, les gains prompt sont marginaux.
La mesure déterministe (CALC) est un levier plus puissant que le prompt.
SSOT: frameworks-valides.md, découvertes Phase R

---

# PARTIE II — RÈGLES OPÉRATIONNELLES SCELLÉES

### 5.1 Checklist architecte (avant chaque nouveau module)

- [ ] FR et EN séparés ?
- [ ] Instruction de volume explicite dans le prompt ?
- [ ] Single-shot > 800 mots attendus ? → K2 Chunking obligatoire
- [ ] Le CALC donne-t-il des conseils d'écriture au LLM ? → INTERDIT (§3.2)
- [ ] Le retry modifie-t-il température + seed ?
- [ ] Les budgets token API (judge vs draft vs patch) sont-ils isolés ?
- [ ] La feature candidate a-t-elle un mécanisme NOUVEAU (pas "une de plus") ?
- [ ] Le bench pilote a-t-il été vérifié à l'échelle du corpus entier ?
- [ ] SCRIBE écrit, OMEGA contrôle — les rôles sont-ils respectés ? (§3.1)

### 5.2 Les 12 Règles d'Or (ChatGPT) [OPERATIONAL]

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

### 5.3 Ce qui est définitivement rejeté [SEALED — JAMAIS rouvrir sans preuve neuve]

| Rejet | Raison | Date |
|-------|--------|------|
| Feedback sémantique CALC → LLM | Bench R6 : Δ-0.264, toxique | 2026-04-11 |
| Itération globale de correction | Premier tir > convergence | 2026-04-11 |
| Émotion keyword CALC | Δ Spearman +0.021, kill-switch | 2026-04-08 |
| CI_L37 (module, PAS la loi L37) | Saturé à 100 intra-OMEGA | Phase R |
| Language Profiles | r négatif vs qualité | Phase R |
| Genius Engine G=(D×S×I×R×V) | r≈0 vs Tier | Phase R |
| Polish | Sprint 2, NO-OP prouvé | Phase R |
| Modèle unifié FR/EN | Dilue le signal | 2026-04-10 |
| Abaissement post-hoc du kill-switch | Interdit par doctrine | 2026-04-11 |

### 5.4 Leçon méta-cognitive : consensus multi-IA ≠ vérité [OPERATIONAL]

3 IA (Claude + ChatGPT + Gemini) ont validé unanimement "dispatch FR/EN séparé"
comme prochain chantier. Le code montrait que le dispatch était DÉJÀ séparé (3 modèles
Ridge indépendants depuis V3.1). Le consensus multi-IA amplifie les erreurs quand
personne ne vérifie la prémisse factuelle.
**Règle** : TOUJOURS lire le code source AVANT de proposer une option architecturale.

---

# PARTIE III — INVESTIGATIONS ACTIVES (non figées)

### 6.1 Le Plafond d'Asphyxie — Règle des 500 mots [ACTIVE INVESTIGATION]

Un LLM est structurellement incapable de générer ~2500 mots de prose littéraire dense
en un seul appel (single-shot). Sans découpage, il s'épuise à 400-800 mots.
Lever le plafond token (P0 fix : judgeMaxTokens → draftMaxTokens) est NÉCESSAIRE mais
PAS SUFFISANT — le LLM s'arrête de lui-même.
**Corollaire** : K2 Chunking (4 × 750w) est OBLIGATOIRE pour la forme longue.

[BENCH P0 2026-04-12 : 4 scènes, words: 482/445/389/456 malgré 8192 tokens]
[BENCH P0+P1+P2 2026-04-12 : scène 1 = 1438 mots — plafond brisé par P2 injection volume]

Statut : en cours de validation. Le fix P2 (injection mode + volume) semble briser le
plafond single-shot, mais seul le bench complet le confirmera.

### 6.2 Biais de sélection hostile [ACTIVE INVESTIGATION]

L'Oracle pénalise les défauts. Un texte de 500 mots a 5× moins de surface d'erreur
qu'un texte de 2500 mots. Dans un Duel, l'Oracle préfère systématiquement le texte court.

[BENCH P0 2026-04-12 : 4/4 scènes le duel winner est ~500w, jamais loop_refined ~2200w]
[BENCH P0+P1+P2 scène 1 : winner sensoriel_dense à 1438w — biais possiblement résolu par volume]

**Risque non résolu** : la sélection hostile favorise structure courte + équilibrée
à prose longue + plus vivante. C'est un biais structurel du scorer, pas un bug.

Scénarios Gemini :
- **Scénario A** : P2 pousse le volume mais l'Oracle préfère encore les courts
  → Remède : normalisation par volume ou Volume Risk Bonus
- **Scénario B** : le LLM s'arrête quand même à ~500w
  → Remède : K2 chunking généralisé à tous les modes duel

### 6.3 Facteur de conversion P2 [ACTIVE INVESTIGATION]

| Demande | Produit réel | Facteur |
|---------|-------------|---------|
| "MINIMUM 2500w" (P2 renforcé) | 1438 (scène 1) | ×0.58 |

À confirmer sur les 3 scènes restantes.

### 6.4 Données bench en cours

**Bench P0 seul (token budget fix) — 4 scènes**
| Scene | Words | Winner | Composite | Min_axis |
|-------|-------|--------|-----------|----------|
| contemplation | 482 | experimental_sig | 88.1 | 78.7 |
| menace | 445 | sensoriel_dense | 89.5 | 80.1 |
| revelation | 389 | experimental_sig | 83.3 | 61.9 |
| confrontation | 456 | sensoriel_dense | 84.1 | 59.7 |

**Bench P0+P1+P2 combiné — EN COURS (scène 1/4 terminée)**
| Scene | Words | Winner | Composite | Min_axis | AAI |
|-------|-------|--------|-----------|----------|-----|
| contemplation | 1438 | sensoriel_dense | 90.3 | 83.9 | 94.8 |
| menace | ? | ? | ? | ? | ? |
| revelation | ? | ? | ? | ? | ? |
| confrontation | ? | ? | ? | ? | ? |

---

## CONCLUSION

Aucune loi oubliée critique n'a été détectée dans le périmètre relu (3 IA × repo complet).
Les synthèses Gemini et ChatGPT convergent avec le repo OMEGA. Les rares divergences
ont été résolues :
- Gemini : "paradoxe sensoriel" (body_binding inversé) → confirmé par bench V3.5
- ChatGPT : "les deux physiques S1/S2" → confirmé par architecture dispatcher
- Les 12 règles ChatGPT couvrent les contraintes opérationnelles

Questions ouvertes (Partie III) :
1. Le biais de sélection hostile est-il résolu par P2 ? → bench en cours
2. Le plafond des 500w est-il définitivement brisé ? → 1/4 scènes confirment (1438w)
3. Le facteur de conversion P2 "MINIMUM Nw" est-il stable ? → 3 scènes restantes

**Changelog V1 → V1.1** :
1. f33c corrigé : "densité de tirets" → "ratio points/virgules" (vérifié `coefficients-v3-4.ts`)
2. f33b précisé : "densité" → "comptage" de virgules
3. L37 (loi) vs CI_L37 (module) : distinction explicite, CI_L37 dans registre rejets
4. Structure 3 strates : SEALED / OPERATIONAL / ACTIVE INVESTIGATION
5. Contrat SCRIBE/OMEGA ajouté (§3.1)
6. Statut émotion clarifié : MORTE (keyword CALC) vs ACTIVE (axe ECC + contrat)
7. "Aucune loi oubliée" → formulation tempérée
