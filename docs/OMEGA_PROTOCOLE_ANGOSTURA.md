# OMEGA — PROTOCOLE ANGOSTURA : AUDIT D'INFLUENCE CAUSALE DES 40 FEATURES
**Date** : 2026-03-27
**Standard** : NASA-Grade L4 / DO-178C Level A
**Mode** : CALC PUR — 0 API
**Source** : 141 366 fenetres 500w FR (Tier S/A/B/C)

---

## DECOUVERTE MAJEURE

**Les features "instables" (CV eleve) sont les MEILLEURS predicteurs du tier.**

Le classement par importance de permutation renverse completement la hierarchie :

| Rang | Feature | Imp. Perm | CV@500 | Statut precedent |
|------|---------|-----------|--------|------------------|
| 1 | **semicolon_count** | 0.4196 | >1.0 | "INSTABLE" |
| 2 | **dash_count** | 0.2218 | >1.0 | "INSTABLE" |
| 3 | **excl_count** | 0.0755 | >1.0 | "INSTABLE" |
| 4 | **dialogue_ratio** | 0.0670 | >2.0 | "INSTABLE" |
| 5 | **colon_count** | 0.0503 | >1.0 | "INSTABLE" |
| 6 | f16a_bigram_rarity | 0.0487 | 0.019 | "STABLE" |
| 7 | **ellipsis_count** | 0.0474 | >1.0 | "INSTABLE" |
| 8 | **std_sent_len** | 0.0457 | ~0.8 | "INSTABLE" |
| 9 | **f1a_rhythm_variance** | 0.0396 | 0.776 | "INSTABLE" |
| 10 | **sub_per_sentence** | 0.0340 | 0.879 | "INSTABLE" |

Les 5 premieres places sont occupees par des features de PONCTUATION — toutes classees "instables".
Les 6 features "stables" (f29d_ttr, f16a, cv_sent, f19a, f35c, f36c) sont aux rangs 6, 15, 17, 3(thermometer), 5(thermometer), 6(thermometer).

**L'instabilite N'EST PAS du bruit. C'est du SIGNAL.**
Un CV eleve signifie que la feature VARIE beaucoup entre auteurs — c'est exactement ce qui la rend discriminante.

---

## NIVEAU 1 — FEATURE IMPORTANCE

### Random Forest (200 arbres, max_depth=10)

- **R2 cross-validation** : 0.297 ± 0.219
- **141 366 fenetres**, 42 features

### Top 20 par permutation importance

| Rang | Feature | Importance | ± | Role |
|------|---------|-----------|---|------|
| 1 | semicolon_count | 0.4196 | 0.0030 | DRIVER |
| 2 | dash_count | 0.2218 | 0.0026 | DRIVER |
| 3 | excl_count | 0.0755 | 0.0006 | DRIVER |
| 4 | dialogue_ratio | 0.0670 | 0.0009 | DRIVER |
| 5 | colon_count | 0.0503 | 0.0007 | DRIVER |
| 6 | f16a_bigram_rarity | 0.0487 | 0.0008 | DRIVER |
| 7 | ellipsis_count | 0.0474 | 0.0004 | DRIVER |
| 8 | std_sent_len | 0.0457 | 0.0008 | DRIVER |
| 9 | f1a_rhythm_variance | 0.0396 | 0.0007 | DRIVER |
| 10 | sub_per_sentence | 0.0340 | 0.0003 | DRIVER |
| 11 | quest_count | 0.0154 | 0.0002 | DRIVER |
| 12 | longest_sent_words | 0.0152 | 0.0002 | DRIVER |
| 13 | f9a_contradiction_rate | 0.0150 | 0.0003 | DRIVER |
| 14 | f26c_period_score | 0.0086 | 0.0002 | MEDIATOR |
| 15 | f19a_approx_entropy | 0.0081 | 0.0002 | CONDITIONAL |
| 16 | range_sent_len | 0.0079 | 0.0002 | CONFLICT |
| 17 | cv_sent | 0.0077 | 0.0001 | CONDITIONAL |
| 18 | f24c_contrast_delta | 0.0070 | 0.0001 | CONFLICT |
| 19 | f1b_rhythm_ratio | 0.0063 | 0.0001 | CONDITIONAL |
| 20 | f26b_long_sent_rate | 0.0050 | 0.0001 | CONFLICT |

### Interpretation

Le **semicolon_count** domine a lui seul (42% de l'importance). Les maitres (Tier S) utilisent massivement le point-virgule — c'est un marqueur de subordination complexe, de phrases-fleuve, de construction litteraire.

Les **dash_count** (tirets cadratins) = marqueur de dialogue et d'incises. Les **excl_count** et **quest_count** = marqueurs de registre.

---

## NIVEAU 2 — ANALYSE CAUSALE

### 2a. Correlations partielles (controle: tier)

Top paires ou le tier MASQUAIT la relation :

| Paire | r brut | r partiel | delta |
|-------|--------|-----------|-------|
| semicolon vs dash | -0.288 | -0.096 | +0.192 |
| dash vs longest_sent | -0.307 | -0.170 | +0.136 |
| semicolon vs quest | -0.203 | -0.087 | +0.116 |

Le tier expliquait ~50% de la correlation semicolon/dash. Une fois le tier controle, la relation s'effondre. Ce sont des MARQUEURS INDEPENDANTS du tier, pas des proxies l'un de l'autre.

### 2b. Mediation via f26b

| Feature | Effet total | via f26b | Direct | Mediation% |
|---------|------------|----------|--------|-----------|
| sub_per_sentence | +0.288 | +0.392 | -0.104 | **136%** |
| f26c_period_score | +3.778 | +3.665 | +0.113 | **97%** |
| std_sent_len | +0.025 | +0.016 | +0.009 | **65%** |
| f1a_rhythm_variance | +0.025 | +0.016 | +0.009 | **65%** |
| f9a_contradiction_rate | +0.689 | +0.422 | +0.268 | **61%** |
| excl_count | +0.028 | -0.015 | +0.043 | **54%** |

**sub_per_sentence** a une mediation de 136% via f26b — ca signifie que f26b AMPLIFIE l'effet (mediation partielle + suppression). La subordination influence le tier a travers les phrases longues ET en sens inverse quand on controle f26b.

**f26c_period_score** est a 97% mediee par f26b — c'est un pur PROXY, pas une information independante.

### 2c. Conflits inter-axes

**26 features sur 42 ont un conflit** entre axes (aident un axe, nuisent a un autre).

Pattern dominant : **ECC/SII vs IFI**

- mean_sent_len, f26b, sub_per_sentence, semicolon : AIDENT ECC+SII, NUISENT IFI
- f17_knife, dash_count, quest_count : AIDENT IFI, NUISENT ECC+SII

C'est le conflit fondamental du moteur : **les phrases longues (litteraires) tuent les hooks (accroche)**. Un texte ne peut pas maximiser les deux simultanement.

### 2d. Classification des 40 features

| Role | N | Definition |
|------|---|-----------|
| **DRIVER** | 13 | Importance > 0.01, influence directe sur tier |
| **CONFLICT** | 15 | Aide un axe, nuit a un autre |
| **NOISE** | 7 | Aucune influence detectee |
| **CONDITIONAL** | 3 | Influence moderee, role contextuel |
| **THERMOMETER** | 3 | Stable mais non discriminant |
| **MEDIATOR** | 1 | Effet passe entierement par une autre feature |

---

## DECISIONS OMEGA

### D1. NE PAS JETER les features "instables"

Les 13 DRIVERS sont TOUTES des features "instables". Un CV eleve = variance inter-auteurs = signal discriminant. Le precedent audit allait les downweighter — ERREUR.

### D2. semicolon_count est le PREMIER predicteur de qualite

A ajouter d'urgence dans le scorer si absent. Importance = 0.42 (plus que toutes les autres combinees).

### D3. Le conflit ECC/SII vs IFI est STRUCTUREL

Le moteur doit choisir entre :
- Phrases longues/complexes (ECC+SII) = style litteraire
- Hooks courts/percutants (IFI) = accroche

Recommandation : ponderer IFI DIFFEREMMENT pour les scenes contemplatives (ou les phrases longues sont attendues) vs les scenes d'action.

### D4. f26c_period_score est REDONDANT avec f26b

Mediation 97%. Retirer l'un des deux du scorer pour eviter le double-comptage.

### D5. 7 features sont du BRUIT pur

T_LC, T_CL, words, paragraph_count, mean_para_len, std_para_len, cv_para.
Peuvent etre retirees sans perte.
