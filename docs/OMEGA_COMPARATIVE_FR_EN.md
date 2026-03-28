# OMEGA — DOSSIER COMPARATIF FR vs EN

**Date** : 2026-03-28
**Mode** : CALC PUR — 0 API
**Standard** : NASA-Grade L4 / DO-178C Level A
**Branche** : phase-r-metrology-rebuild
**Objectif** : Valider que les lois L31-L36 sont universelles (pas des artefacts du francais)

---

## 1. Angostura — Feature Importance (500w, Tier S/A/B/C)

| Rang | FR (141 366 fenetres, R2=0.297) | Perm FR | EN (143 653 fenetres, R2=0.020) | Perm EN |
|------|---------------------------------|---------|----------------------------------|---------|
| 1 | **semicolon_count** | 0.4196 | **f16a_bigram_rarity** | 0.1266 |
| 2 | dash_count | 0.2218 | f1a_rhythm_variance | 0.1092 |
| 3 | excl_count | 0.0755 | std_sent_len | 0.0893 |
| 4 | dialogue_ratio | 0.0670 | semicolon_count | 0.0864 |
| 5 | colon_count | 0.0503 | dialogue_ratio | 0.0769 |
| 6 | f16a_bigram_rarity | 0.0487 | excl_count | 0.0694 |
| 7 | ellipsis_count | 0.0474 | dash_count | 0.0626 |
| 8 | std_sent_len | 0.0457 | ellipsis_count | 0.0418 |
| 9 | f1a_rhythm_variance | 0.0396 | longest_sent_words | 0.0375 |
| 10 | sub_per_sentence | 0.0340 | f9a_contradiction_rate | 0.0347 |

**Verdict : semicolon est-il #1 en EN ?** NON.
- En FR, semicolon_count domine massivement (#1, importance 0.420, 2x le #2).
- En EN, semicolon_count est #4 (importance 0.086), derriere f16a_bigram_rarity (#1, 0.127).
- Le R2 du modele EN (0.020) est 15x inferieur au FR (0.297) : le tier EN est beaucoup moins predictible par les features structurelles seules.
- Les features rhythmiques (f1a_rhythm_variance, std_sent_len) montent fortement en EN.

---

## 2. Hierarchie multi-echelle

### FR — Top 5 par taille

| Rang | 200w | 500w | 1000w | 2000w | full |
|------|------|------|-------|-------|------|
| 1 | semicolon (0.259) | semicolon (0.419) | semicolon (0.442) | semicolon (0.402) | semicolon (0.297) |
| 2 | dash (0.161) | dash (0.216) | dash (0.279) | dash (0.212) | dash (0.247) |
| 3 | dialogue (0.113) | excl (0.077) | excl (0.094) | excl (0.124) | mean_para (0.159) |
| 4 | excl (0.061) | dialogue (0.072) | dialogue (0.090) | f1a_rhythm (0.078) | dialogue (0.102) |
| 5 | ellipsis (0.052) | colon (0.053) | colon (0.059) | dialogue (0.077) | ellipsis (0.086) |

### EN — Top 5 par taille

| Rang | 200w | 500w | 1000w | 2000w | full |
|------|------|------|-------|-------|------|
| 1 | f16a_bigram (0.082) | f16a_bigram (0.127) | f16a_bigram (0.151) | dash (0.209) | mean_para (0.334) |
| 2 | excl (0.080) | f1a_rhythm (0.109) | dash (0.134) | n_long_sent (0.161) | cv_para (0.140) |
| 3 | dialogue (0.063) | std_sent (0.089) | f1a_rhythm (0.129) | f16a_bigram (0.153) | dialogue (0.130) |
| 4 | mean_sent (0.061) | semicolon (0.086) | semicolon (0.124) | semicolon (0.129) | f26c_period (0.094) |
| 5 | semicolon (0.059) | dialogue (0.077) | std_sent (0.108) | colon (0.107) | sub_per_sent (0.076) |

**Verdict : les etages changent-ils pareil ?** NON.
- En FR, semicolon_count est #1 a TOUTES les echelles (200w a full). Domination absolue.
- En EN, semicolon_count oscille entre #4 et #5. f16a_bigram_rarity domine aux echelles 200-1000w.
- A 2000w EN, dash_count prend le dessus. A full EN, mean_para_len domine.
- Le pattern FR est monotone (semicolon partout), le pattern EN est polyphonique (leaders differents par echelle).

---

## 3. Inter-relations

### Top 10 correlations FR vs EN (Spearman rho)

| Rang | Paire FR | rho FR | Paire EN | rho EN |
|------|----------|--------|----------|--------|
| 1 | std_sent_len / f1a_rhythm_var | 1.000 | std_sent_len / f1a_rhythm_var | 1.000 |
| 2 | cv_sent / f19a_approx_entropy | 1.000 | cv_sent / f19a_approx_entropy | 1.000 |
| 3 | knife_rate / f17_knife_count | 0.973 | knife_rate / f17_knife_count | 0.972 |
| 4 | std_sent_len / longest_sent | 0.949 | std_sent_len / longest_sent | 0.946 |
| 5 | f1a_rhythm / longest_sent | 0.949 | f1a_rhythm / longest_sent | 0.946 |
| 6 | std_sent_len / f24c_contrast | 0.934 | f26b_long / mean_sent | 0.904 |
| 7 | f1a_rhythm / f24c_contrast | 0.934 | std_sent_len / f26b_long | 0.901 |
| 8 | std_sent_len / f26b_long | 0.907 | f1a_rhythm / f26b_long | 0.901 |
| 9 | f1a_rhythm / f26b_long | 0.907 | std_sent_len / f24c_contrast | 0.886 |
| 10 | mean_sent / f17_knife | -0.901 | f1a_rhythm / f24c_contrast | 0.886 |

**Verdict : les correlations structurelles sont IDENTIQUES FR = EN.** Les 5 premieres paires sont les memes avec des rho quasi-identiques. La structure geometrique du feature space est universelle.

### Elasticite — 5 top drivers FR vs EN

| Cible | semicolon FR | semicolon EN | dash FR | dash EN | f1a_rhythm FR | f1a_rhythm EN |
|-------|-------------|-------------|---------|---------|---------------|---------------|
| f26b_long_sent_rate | +0.326 | +0.297 | -0.321 | -0.043 | +0.619 | +0.697 |
| mean_sent_len | +0.299 | +0.277 | -0.355 | -0.071 | +0.850 | +0.842 |
| cv_sent | +0.189 | +0.120 | -0.028 | +0.141 | +0.513 | +0.429 |
| knife_rate | -0.241 | +0.032 | +0.541 | +0.172 | -0.266 | -0.293 |
| f35c_hook_score | -0.192 | -0.117 | +0.386 | +0.118 | -0.337 | -0.334 |
| f36c_cliff_score | -0.114 | -0.159 | +0.072 | +0.021 | -0.286 | -0.378 |

**Verdict : les 2 blocs antagonistes existent en EN ?** PARTIELLEMENT.
- Le bloc "semicolon allonge les phrases" existe en FR ET EN (elasticite +0.33 FR, +0.30 EN sur f26b).
- Le bloc "dash raccourcit/decoupe" est FORT en FR (-0.32 sur f26b, +0.54 sur knife_rate) mais FAIBLE en EN (-0.04 sur f26b, +0.17 sur knife_rate).
- f1a_rhythm_variance a une elasticite quasi-identique dans les deux langues.
- **Divergence majeure** : dash_count a un role structurel tres different en EN vs FR.

---

## 4. Confirmations C1-C2-C3

### C1 — Tailles etendues (3000w+)

| Taille | #1 FR | #1 EN |
|--------|-------|-------|
| 2000w | semicolon (0.398) | dash_count (0.210) |
| 3000w+ | f26b_long_sent_rate (0.247) | mean_para_len (0.227) |
| 5000w+ | mean_para_len (0.229) | mean_para_len (0.324) |

- **FR** : semicolon recule a 3000w+ (passe de #1 a #4 avec 0.153).
- **EN** : semicolon n'est deja plus dans le top 5 a 3000w+ et 5000w+.
- **Convergence** : a 5000w+, mean_para_len domine dans les DEUX langues. La structure paragraphique prend le dessus aux grandes echelles.

### C2 — Controle par auteur

| Metrique | FR | EN |
|----------|----|----|
| semicolon top 3 chez X% auteurs | 0% (MDI, pas perm) | 0% |
| semicolon rang SANS top 3 auteurs | **#1** (0.421) | **#4** (0.085) |
| #1 SANS top auteurs | semicolon_count | f16a_bigram_rarity |
| #2 SANS top auteurs | dash_count (0.253) | f1a_rhythm_variance (0.123) |

- **FR** : semicolon reste #1 meme apres retrait des 3 plus gros auteurs a semicolons. Signal UNIVERSEL en FR.
- **EN** : semicolon tombe a #4 apres retrait des top auteurs. Signal NON-UNIVERSEL en EN.
- **Verdict C2 FR** : UNIVERSEL. **Verdict C2 EN** : CONDITIONNEL.

### C3 — Interactions par taille

| Paire | 200w FR | 200w EN | 500w FR | 500w EN | 1000w FR | 1000w EN | 2000w FR | 2000w EN |
|-------|---------|---------|---------|---------|----------|----------|----------|----------|
| std x f1a (coef) | -0.051 | -0.047 | -0.030 | -0.019 | -0.018 | -0.008 | -0.010 | -0.006 |
| semi x std (coef) | -0.090 | -0.057 | -0.069 | -0.042 | -0.112 | -0.020 | -0.227 | -0.017 |
| semi x sub (coef) | -0.048 | -0.065 | -0.069 | -0.056 | -0.070 | -0.009 | -0.093 | +0.004 |
| semi x dash (coef) | +0.077 | +0.005 | +0.128 | +0.069 | +0.138 | +0.110 | +0.154 | +0.155 |

- **std x f1a** : interaction negative dans les deux langues, meme tendance decroissante avec la taille. CONVERGENT.
- **semi x std** : coefficient beaucoup plus fort en FR qu'en EN. DIVERGENT.
- **semi x dash** : positif dans les deux langues, convergent a 2000w. PARTIELLEMENT CONVERGENT.

---

## 5. Tableau de synthese des 8 questions bilingues

| # | Question | FR | EN | VERDICT |
|---|----------|----|----|---------|
| Q1 | semicolon est-il le #1 driver ? | OUI (#1, 0.420) | NON (#4, 0.086) | **DIVERGENT** |
| Q2 | semicolon domine-t-il a toutes les echelles ? | OUI (#1 partout) | NON (#4-#5) | **DIVERGENT** |
| Q3 | La structure correlationnelle est-elle conservee ? | Top 5 paires identiques | Top 5 paires identiques | **UNIVERSEL** |
| Q4 | Les blocs antagonistes existent-ils ? | OUI (semi+ vs dash-) | PARTIEL (semi+ oui, dash- faible) | **PARTIEL** |
| Q5 | semicolon recule-t-il a 3000w+ ? | OUI (recule a #4) | OUI (absent du top 5) | **UNIVERSEL** |
| Q6 | semicolon est-il universel par auteur ? | OUI (#1 sans top auteurs) | NON (#4 sans top auteurs) | **DIVERGENT** |
| Q7 | Les interactions sont-elles stables par taille ? | std x f1a : oui | std x f1a : oui | **UNIVERSEL** |
| Q8 | Le R2 predictif est-il comparable ? | R2=0.297 | R2=0.020 | **DIVERGENT** |

---

## 6. Lois L31-L36 — Statut bilingue

| Loi | Description | FR | EN | Statut |
|-----|-------------|----|----|--------|
| L31 | semicolon_count est le driver dominant | #1 (0.420) | #4 (0.086) | **FR-ONLY** |
| L32 | dash_count est le #2 driver | #2 (0.222) | #7 (0.063) a 500w, #1 (0.209) a 2000w | **DIVERGENTE** |
| L33 | La hierarchie des features est stable multi-echelle | semicolon #1 partout | leaders differents par echelle | **FR-ONLY** |
| L34 | Les blocs antagonistes (allongement vs decoupage) structurent l'espace | Bloc fort semi+/dash- | Bloc faible, dash peu actif | **PARTIELLE** |
| L35 | Les interactions std x f1a sont negatives et stables | Confirme (-0.05 a -0.01) | Confirme (-0.05 a -0.01) | **UNIVERSELLE** |
| L36 | mean_para_len domine aux tres grandes echelles | Confirme a 5000w+ | Confirme a 3000w+ et 5000w+ | **UNIVERSELLE** |

**Resume** :
- **2 lois UNIVERSELLES** : L35 (interactions std x f1a), L36 (mean_para_len aux grandes echelles)
- **1 loi PARTIELLE** : L34 (blocs antagonistes)
- **1 loi DIVERGENTE** : L32 (role du dash)
- **2 lois FR-ONLY** : L31 (semicolon #1), L33 (hierarchie stable)

---

## 7. Redondances comparees

Les 5 paires redondantes FR (rho > 0.90) :

| Paire | rho FR | rho EN | Tient en EN ? |
|-------|--------|--------|---------------|
| std_sent_len / f1a_rhythm_variance | 1.000 | 1.000 | OUI |
| cv_sent / f19a_approx_entropy | 1.000 | 1.000 | OUI |
| knife_rate / f17_knife_count | 0.973 | 0.972 | OUI |
| std_sent_len / longest_sent_words | 0.949 | 0.946 | OUI |
| std_sent_len / f24c_contrast_delta | 0.934 | 0.886 | OUI (legerement reduit) |

**Verdict** : Les 5 paires redondantes FR tiennent TOUTES en EN avec des correlations quasi-identiques.
C'est une propriete geometrique du feature space, independante de la langue.

---

## 8. Classification comparative des features

### Les 13 DRIVERS FR : combien sont aussi DRIVERS en EN ?

Seuil DRIVER : permutation importance > 0.01

| Feature | Perm FR | Rang FR | Perm EN | Rang EN | DRIVER en EN ? |
|---------|---------|---------|---------|---------|----------------|
| semicolon_count | 0.4196 | 1 | 0.0864 | 4 | OUI |
| dash_count | 0.2218 | 2 | 0.0626 | 7 | OUI |
| excl_count | 0.0755 | 3 | 0.0694 | 6 | OUI |
| dialogue_ratio | 0.0670 | 4 | 0.0769 | 5 | OUI |
| colon_count | 0.0503 | 5 | 0.0256 | 13 | OUI |
| f16a_bigram_rarity | 0.0487 | 6 | 0.1266 | 1 | OUI (promu #1) |
| ellipsis_count | 0.0474 | 7 | 0.0418 | 8 | OUI |
| std_sent_len | 0.0457 | 8 | 0.0893 | 3 | OUI (promu #3) |
| f1a_rhythm_variance | 0.0396 | 9 | 0.1092 | 2 | OUI (promu #2) |
| sub_per_sentence | 0.0340 | 10 | 0.0345 | 11 | OUI |
| longest_sent_words | 0.0235 | 11 | 0.0375 | 9 | OUI |
| f9a_contradiction_rate | 0.0201 | 12 | 0.0347 | 10 | OUI |
| quest_count | 0.0154 | 13 | 0.0179 | 14 | OUI |

**Verdict** : **13/13 DRIVERS FR sont aussi DRIVERS en EN** (tous > 0.01).

La difference n'est pas QUELS features comptent, mais COMBIEN ils comptent.
- En FR, semicolon_count ecrase tout (0.42, soit 4.8x la moyenne des autres).
- En EN, les importances sont plus uniformement distribuees (max 0.127, spread plus plat).

### Interpretation

Le modele litteraire FR est **monocentrique** : le point-virgule est le marqueur de maitrise absolue.
Le modele litteraire EN est **polycentrique** : la rarete lexicale (bigram_rarity), le rythme (f1a_rhythm_variance) et la variance syntaxique (std_sent_len) contribuent a parts plus egales.

Cela reflete une realite stylistique : le point-virgule est un marqueur culturel fort en litterature francaise (de Proust a Flaubert), alors que la litterature anglaise repose davantage sur la diversite rythmique et lexicale.

---

## Conclusion generale

**Les lois L31-L36 ne sont PAS toutes universelles.**

- La **geometrie du feature space** est universelle (correlations, redondances, interactions std x f1a).
- La **hierarchie des drivers** est culturellement specifique : semicolon domine en FR, bigram_rarity/rhythm en EN.
- Les 13 features sont DRIVERS dans les deux langues, mais avec des poids tres differents.
- Le pouvoir predictif global est beaucoup plus fort en FR (R2=0.30) qu'en EN (R2=0.02), suggerant que les criteres de qualite EN sont moins captures par ces features structurelles.

**Recommandation** : Distinguer les lois structurelles universelles (L35, L36) des lois de hierarchie culturellement specifiques (L31, L33). Les lois L31 et L33 devraient etre qualifiees "L31-FR" et "L33-FR" dans la nomenclature OMEGA.
