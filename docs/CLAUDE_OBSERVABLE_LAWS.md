# OMEGA — LOIS OBSERVABLES DE CLAUDE SONNET EN ECRITURE LITTERAIRE
**Date** : 2026-03-28
**Source** : Phase A (consolidation) + Phase B (95 API runs)
**Modele** : claude-sonnet-4-20250514
**Standard** : OMEGA / NASA-Grade L4

---

## BASELINE SPONTANEE (30 runs, 10 types de scenes)

| Metrique | Moyenne | Std | Min | Max | CV |
|----------|---------|-----|-----|-----|-----|
| mean_sent_len | **42.0** | 13.0 | 23.6 | 90.2 | 0.31 |
| cv_sent | **0.875** | 0.18 | 0.56 | 1.52 | 0.20 |
| f26b_long_sent_rate | **0.482** | 0.13 | 0.19 | 0.80 | 0.27 |
| f17_knife_count | **3.0** | 2.3 | 0 | 8 | 0.75 |
| ratio_alt | **12.6%** | 7.0% | 0% | 26.3% | 0.56 |
| semicolon_count | **0.17** | 0.75 | 0 | 4 | 4.48 |
| dash_count | **2.17** | 2.9 | 0 | 13 | 1.34 |
| composite | **89.6** | 2.5 | 83.5 | 92.9 | 0.03 |

**Profil spontane** : phrases longues (~42 mots), haute variance (cv=0.875), pres de la moitie des phrases > 40 mots (48%), quasi-zero semicolons (0.17/texte), ~3 couteaux par texte.

---

## 15 LOIS EMERGENTES

### LOI L01 — PUITS D'INTROSPECTION [OBSERVE, Phase A]
Claude produit de l'INTROSPECTION quel que soit le mode demande (7/7).
**Phase B confirme** : le composite varie peu entre scenes (83.5-92.9) mais le STYLE ne change pas — mean_sent_len = 36-55 sur toutes les scenes.

### LOI L02 — ILLUSION DECLARATIVE f17 [OBSERVE, Phase A+B]
f17 (phrases-couteau <=5 mots) : moyenne = 3.0 sur 30 runs baseline.
Le CV inter-run est 0.75 — haute variabilite. Claude en produit parfois 0, parfois 8, sans rapport avec la consigne.

### LOI L03 — SEMICOLON NON PILOTABLE [OBSERVE, Phase B]
**Decouverte majeure Phase B** : sur 15 runs de gradient semicolons (5 niveaux de 0 a "minimum 8 ;") :
- 11/15 runs = 0 semicolons
- 2/15 runs = 4-7 semicolons (stochastique)
- 2/15 runs = 0 malgre consigne "REGLE ABSOLUE PRIORITAIRE"
- **Taux de respect de la consigne forte : ~13%**

Le semicolon est le marqueur #1 de qualite des maitres (Angostura imp=0.42) mais Claude est INCAPABLE d'en produire sur demande. C'est le plus gros gap observable.

### LOI L04 — PLANCHER DE LONGUEUR DE PHRASE [OBSERVE, Phase B]
Gradient mean_sent_len (5 targets : 12, 18, 25, 35, 50 mots) :

| Demande | Produit | Facteur |
|---------|---------|---------|
| 12 | 35.8 | x3.0 |
| 18 | 34.8 | x1.9 |
| 25 | 38.1 | x1.5 |
| 35 | 42.2 | x1.2 |
| 50 | 39.4 | x0.8 |

**Plancher incompressible : ~35 mots/phrase.** Claude ne sait PAS ecrire court (< 30 mots en moyenne). La demande "12 mots/phrase" produit 36 mots/phrase (x3).
**Plafond : ~42 mots/phrase.** Au-dela de 35 demandes, il ne monte plus.
**Zone de reponse : 35-42 mots** quel que soit le target.

### LOI L05 — COMPRESSION DE VOLUME [OBSERVE, Phase A+B]
Baseline : 501-1140 mots (target 2500). Claude produit ~20-45% du volume demande.
Le Duel compresse encore via selection de modes courts.

### LOI L06 — COMPOSITE STABLE, FEATURES INSTABLES [OBSERVE, Phase B]
Stabilite (10 runs x 2 scenes) :

| Metrique | CV contemplation | CV menace |
|----------|-----------------|-----------|
| composite | **0.013** | **0.020** |
| words | 0.366 | 0.828 |
| mean_sent_len | 0.213 | 0.233 |
| f17_knife_count | 0.429 | 0.631 |
| semicolon_count | 3.162 | 0.000 |
| ratio_alt | 0.622 | 0.585 |

Le composite est TRES stable (CV 1-2%). Mais les features individuelles sont TRES instables (CV 20-80%). Le scorer compense — la qualite globale est reproductible, pas la forme.

### LOI L07 — LES CONFLITS N'ENDOMMAGENT PAS [OBSERVE, Phase B]
5 paires de conflits testees. Delta composite vs baseline :

| Conflit | Delta comp |
|---------|-----------|
| long_vs_hook | **+2.2** |
| dialogue_vs_prose | **+2.1** |
| noirceur_vs_sobriete | **+1.8** |
| oral_vs_litteraire | +0.4 |
| ampleur_vs_secheresse | -1.3 |

Les conflits AMELIORENT le composite dans 4/5 cas. La contrainte double semble forcer Claude hors de son attracteur moyen, produisant un texte plus contrastE.
**Seul echec** : ampleur_vs_secheresse (-1.3), ou Claude ne sait pas alterner.

### LOI L08 — MENACE = SCENE LA PLUS DIFFICILE [OBSERVE, Phase B]
Composites par scene (baseline 30 runs) :

| Scene | Composite moyen |
|-------|----------------|
| souvenir | **91.9** |
| contemplation | **91.3** |
| description_pure | **91.2** |
| sensoriel | 90.3 |
| interieur | 90.0 |
| dialogue_pur | 89.6 |
| action_pure | 88.9 |
| confrontation | 88.1 |
| revelation | **87.0** |
| menace | **87.3** |

Menace et revelation sont systematiquement les plus basses. Confirmation de l'observation BESTOF3.

### LOI L09 — PONCTUATION = SIGNAL NON EXPLOITE [OBSERVE, Phase A+B]
Baseline : 0.17 semicolons, 2.17 dashes, 0.67 colons, 0.03 exclamations.
Claude ecrit presque sans ponctuation haute. Or Angostura montre que semicolon+dash = 64% du signal de qualite chez les maitres.

### LOI L10 — f24e (CONTRASTE) = SEULE FEATURE 100% PILOTABLE [OBSERVE, Phase A]
Rosetta : pilotability = 1.0, taux_respect = 100%.

### LOI L11 — MICRO-CHIRURGIE = ECHEC [OBSERVE, Phase A]
Taux de succes phrase-par-phrase = 0%.

### LOI L12 — CONFLIT ECC/SII vs IFI = STRUCTUREL [OBSERVE, Phase A]
26 features en conflit. Phrases longues (ECC+SII) tuent hooks (IFI).

### LOI L13 — LE COMPOSITE EST INSENSIBLE AU STYLE [OBSERVE, Phase B]
Les conflits n'endommagent pas le composite. Les styles extremes produisent des scores similaires (~88-92). Le scorer ne MESURE PAS le style — il mesure la coherence.

### LOI L14 — LA SCENE CONDITIONNE LE PLAFOND, PAS LE STYLE [OBSERVE, Phase B]
Souvenir/contemplation/description atteignent 91-92. Menace/revelation plafonnent a 87-88.
Le type de scene est le premier determinant du score, pas la consigne stylistique.

### LOI L15 — LES FEATURES A FORTE VARIANCE SONT LES PLUS INFORMATIVES [OBSERVE, Phase A]
Angostura : les features a CV>1 (semicolon, dash, excl) sont les meilleurs predicteurs.
Phase B confirme : les features stables (TTR, bigram) ne discriminent RIEN.

---

## FACTEURS DE CONVERSION

| Demande | Produit reel | Facteur | Fiabilite |
|---------|-------------|---------|-----------|
| "12 mots/phrase" | 36 | x3.0 | Toujours ignore |
| "18 mots/phrase" | 35 | x1.9 | Toujours ignore |
| "25 mots/phrase" | 38 | x1.5 | Proche mais amplifie |
| "35 mots/phrase" | 42 | x1.2 | Zone naturelle |
| "50 mots/phrase" | 39 | x0.8 | Compresse |
| "N semicolons" | 0-7 (moy 0.7) | ~13% respect | Non pilotable |
| "500w" | 302 | x0.6 | Compresse |
| "1000w" | 470-550 | x0.5 | Compresse |

---

## HIERARCHIE D'OBEISSANCE

1. **OBEIT TOUJOURS** : f24e_contrast, f15b_redundancy, f16a_bigram, f36c_cliff
2. **OBEIT SOUVENT** : f29d_ttr (80%), f35c_hook (90%)
3. **FAIT TOUJOURS MEME SANS DEMANDE** : introspection, phrases longues, faible ponctuation
4. **IGNORE SYSTEMATIQUEMENT** : semicolons, phrases courtes (<30w), f17 knife
5. **COMPRESSE VERS SA ZONE** : mean_sent_len 35-42, volume 300-600w
