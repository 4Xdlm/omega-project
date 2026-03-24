# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — SESSION_SAVE
# Date : 2026-03-24
# Session : MARATHON f26b BREAKER + PERSONAS + TEST DU MIROIR
# ═══════════════════════════════════════════════════════════════════════════════
#
# Rédigé par    : Claude (IA Principal)
# Validé par    : Francky (Architecte Suprême)
# Branche       : phase-r-metrology-rebuild
# Tests         : 1911 PASS
# API consommés : ~180+ appels cette session
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# PARTIE 1 — RÉSUMÉ EXÉCUTIF

## Ce qui s'est passé

Marathon de 12+ heures. 7 phases de tests. ~180 appels API.
Objectif : casser le verrou f26b (phrases > 40 mots) et trouver
la configuration de prompt optimale pour dépasser les maîtres humains.

## Résultats principaux

1. **Le verrou f26b est CASSÉ** — de 0.000 (baseline) à 0.534 (F3 Flaubert 3000w)
2. **Le roleplay d'auteur > toute autre consigne** — le NOM active des poids profonds
3. **Le trio Flaubert+Duras+Proust = meilleur combo** — GB 4.087, CV 0.884
4. **Le chunking K2 résout le drift** — drift -4.5 (quasi nul)
5. **Dickens = surprise #1 solo** — GB 4.155, profil le plus équilibré et aligné
6. **Le LLM NE SE CONNAÎT PAS** — écarts E1 massifs (García Márquez : +64.9 mots)
7. **La langue d'origine n'est pas un frein** — auteurs EN/DE/ES performent en FR

## Décision de l'Architecte — prochaine priorité

**R-CONVERSION** : cartographier la transformation entre l'espace déclaratif
du LLM et l'espace métrique OMEGA. Si une régularité existe, construire une
table de conversion pour piloter le LLM dans SA propre langue.

---

# PARTIE 2 — CHRONOLOGIE DES PHASES

| Phase | Tests | API | Résultat clé |
|-------|-------|-----|-------------|
| Phase 1 : f26b Breaker micro | 22 variantes × 4 phrases | 22 | 12/22 à 100% long. Le LLM PEUT écrire long |
| Phase 2 : Validation 500w | 5 variantes × 2 scènes × 2 runs | 20 | F3_flaubert CHAMPION : GB 4.075, f26b 0.568 |
| Phase 3 : Validation 3000w | 3 variantes × 3 scènes × 2 runs | 18 | F3 tient : GB 3.998, f26b 0.534. Drift -15.5 |
| Phase 4a : Anti-drift + Personas | 6 personas + 4 anti-drift | ~20 | Chunking = solution. Duras GB 4.319 |
| Phase 4b : Pulvériser les maîtres | 5 trios + 3 éditeur + 4 anonymes + 3 chunking | ~30 | Trio FDP CHAMPION : GB 4.119, CV 0.937 |
| Phase 4c : Biais langue | 1 fusion + 10 EN + 4 DE/ES | ~30 | Woolf 4.402 (outlier). Langue pas un frein |
| Test du Miroir | 20 personas × 2 (déclaré + produit) | ~40 | Dickens 4.155 #1. LLM ne se connaît pas |
| **TOTAL** | | **~180** | |

---

# PARTIE 3 — LES 11 LOIS DÉCOUVERTES

| # | Loi | Preuve |
|---|-----|--------|
| 1 | f26b = verrou de FORMULATION, pas d'incapacité modèle | 12/22 à 100% long (Phase 1) |
| 2 | Le NOM d'auteur active des poids spécifiques > rôle anonyme | -0.307 GB anonyme (Phase 4b) |
| 3 | Les consignes éditeur/métriques DÉGRADENT la qualité | -0.26 à -0.43 GB (Phase 4b) |
| 4 | Le chunking avec réinjection résout le drift | K2 drift -4.5 (Phase 4b) |
| 5 | Le LLM ne se connaît pas | García Márquez déclare 28.5, produit 93.4 (Miroir) |
| 6 | L'injection > le remplacement | B6 échoue, K2 réussit (Phase 4a) |
| 7 | Le trio > le solo | Trios 4.025 vs solos 3.85 (Miroir) |
| 8 | Le profil ÉQUILIBRÉ (25-45w) est optimal pour le GB | Dickens 30.1w = 4.155 (Miroir) |
| 9 | Le knife% est un levier caché | Céline 97% knife = 4.082 (Miroir) |
| 10 | La langue d'origine n'est PAS un frein | EN moyen 3.889 vs FR 3.820 (Phase 4c/Miroir) |
| 11 | Les auteurs instables sont dangereux | Woolf 4.402 → 3.703 (variance) |

---

# PARTIE 4 — CLASSEMENT FINAL DES CONFIGURATIONS

## Solos (500w)

| Rang | Persona | GB | f26b | CV | Stabilité E1 |
|------|---------|-----|------|-----|-------------|
| #1 | Dickens | 4.155 | 0.286 | 0.607 | ✅ Excellent (+2.1) |
| #2 | Céline | 4.082 | 0.000 | 0.634 | ✅ Bon (-4.5) |
| #3 | Duras | 4.046 | 0.000 | 0.475 | ✅ Bon (-5.3) |
| #4 | Flaubert | 3.990 | 0.500 | 0.813 | ⚠️ Sur-produit (+14.9) |
| #5 | McCarthy | 3.924 | 0.000 | 0.490 | ⚠️ Sous-estime |
| #6 | Morrison | 3.910 | 0.059 | 0.890 | ⚠️ Sous-estime |

## Trios (500w)

| Rang | Trio | GB | f26b | CV | Spécialité |
|------|------|-----|------|-----|-----------|
| #1 | Flaubert+Duras+Proust | 4.087 | 0.400 | 0.884 | Meilleur GB+CV |
| #2 | Flaubert+Proust+Céline | 4.030 | 0.333 | 1.257 | Meilleur CV |
| #3 | Woolf+Duras+Flaubert | 3.957 | 0.545 | 0.821 | Meilleur f26b |

## Chunking 3000w

| Rang | Config | GB | f26b | CV | Drift |
|------|--------|-----|------|-----|-------|
| #1 | B2 F3+chunking | 4.086 | 0.609 | 0.787 | +35.7 (trop) |
| #2 | K2 Flaubert→Duras | 3.990 | 0.390 | 1.075 | -4.5 ✅ |
| #3 | FDP+K2 deuil | 4.185 | 0.338 | 1.031 | +23.3 |

---

# PARTIE 5 — TEST DU MIROIR — RÉSULTATS CLÉS

## Le LLM ne se connaît pas (confirmation Rosetta)

| Persona | Mean DÉCLARÉ | Mean PRODUIT | Écart |
|---------|-------------|-------------|-------|
| García Márquez | 28.5 | 93.4 | +64.9 (×3.3) |
| Faulkner | 65 | 99.6 | +34.6 |
| Conrad | 28.5 | 58.5 | +30.0 |
| Woolf | 28.5 | 10.5 | -18.0 |
| Hugo | 28 | 12.9 | -15.1 |
| **Dickens** | **28** | **30.1** | **+2.1** ✅ |

## Les personas FIABLES (bon GB + faible écart E1)

1. **Dickens** : E1 mean +2.1 — le plus aligné
2. **Duras** : E1 mean -5.3 — très stable
3. **Proust** : E1 mean +1.4 — bon
4. **Flaubert** : E1 mean +14.9 — sur-produit mais stable

## Les personas DANGEREUX (variance / écart E1 > 15)

1. García Márquez : E1 +64.9 — EMBALLEMENT
2. Faulkner : E1 +34.6 — EMBALLEMENT
3. Conrad : E1 +30.0 — EMBALLEMENT
4. Woolf : E1 -18.0 — INSTABLE (4.402 → 3.703 entre sessions)
5. Hugo : E1 -15.1 — SOUS-PRODUIT

---

# PARTIE 6 — PROCHAINE PRIORITÉ : R-CONVERSION

## L'hypothèse de l'Architecte

> "Est-ce que le LLM n'a tout simplement pas les mêmes visions que nous
> dans les mesures ? Si entre ce qu'il annonce et sa prose de sortie il y a
> une régularité et une logique, nos mesures ne sont peut-être pas adaptées
> au LLM et une table de conversion pourrait être salvatrice."

## Les 3 cas possibles (ChatGPT)

| Cas | Description | Conséquence |
|-----|------------|-------------|
| A | Incohérent — aucune corrélation | Ses déclarations sont inutiles |
| B | Cohérent linéaire — mean_produit = α × mean_déclaré + β | TABLE DE CONVERSION possible |
| C | Cohérent non-linéaire — zones de compression / emballement | TABLE DE CONVERSION PAR FAMILLE |

## Le protocole R-CONVERSION

### Objectif

Cartographier la transformation entre l'espace déclaratif interne du LLM
et l'espace métrique OMEGA. Trouver α, β et la forme de la fonction.

### Phase 1 — 3 personas stables (Flaubert, Dickens, Duras)

Pour CHAQUE persona :
- 5 déclarations indépendantes (profil JSON)
- 5 productions mesurées (500w, scène fixe)
- Calcul de la corrélation déclaré → produit
- Recherche de la fonction de conversion (linéaire / affine / log)

### Phase 2 — 2 personas instables (Woolf, García Márquez)

Même protocole. Vérifier si l'instabilité est :
- Aléatoire (pas de fonction)
- Structurelle (emballement prévisible)

### Phase 3 — Trios

Après les solos. Vérifier si le trio a sa propre fonction de conversion
ou si c'est une combinaison des fonctions solos.

### Métriques à corréler

Pour chaque dimension :
| Dimension | Déclaré (JSON) | Produit (mesuré) |
|-----------|----------------|-----------------|
| mean_sent_len | mean_sent_len_target | mean_sent_len |
| f26b | f26b_target | f26b |
| knife_rate | knife_rate_target | knife_rate |
| cv | cv_target | cv |
| subordinate_density | subordinate_density_target | subordinate_per_sentence |

### Sortie attendue

Pour chaque persona × chaque dimension :
- Pearson r (corrélation)
- Slope α, intercept β
- R² (qualité du fit)
- Résidus (zones de compression / emballement)
- Verdict : CONVERTIBLE / NON-CONVERTIBLE

### Ce que ça change si ça marche

Si pour Dickens : mean_produit = 1.1 × mean_déclaré + 2.1
Alors pour obtenir mean 40 produit, on demande 34 déclaré.

> On pilote le LLM dans SA propre langue, pas dans la nôtre.

---

# PARTIE 7 — PISTES OUVERTES (NON FERMÉES)

| # | Piste | Statut | Priorité |
|---|-------|--------|----------|
| 1 | **R-CONVERSION** | À LANCER | **#1 IMMÉDIAT** |
| 2 | Trio avec Dickens (DDP, DDC) | À TESTER | #2 |
| 3 | Rosetta + Persona | JAMAIS TESTÉ | #3 |
| 4 | Polisher post-génération | JAMAIS TESTÉ | #4 |
| 5 | Lore-coding (métriques → psychologie) | JAMAIS TESTÉ | #5 |
| 6 | Exemplar S-tier few-shot | JAMAIS TESTÉ avec trio | #6 |
| 7 | Température (0.6/0.75/0.9) | JAMAIS VARIÉ | #7 |
| 8 | Multi-modèle pipeline | JAMAIS TESTÉ | #8 (après stabilis.) |

---

# PARTIE 8 — FICHIERS PRODUITS

## Scripts créés

| Fichier | Contenu |
|---------|---------|
| scripts/test-f26b-breaker.ts | 22 variantes micro-test f26b |
| scripts/test-f26b-phase2.ts | Validation 500w top 5 |
| scripts/test-f26b-phase3.ts | Validation 3000w F3+D3+baseline |
| scripts/test-phase4-antidrift.ts | 6 personas + 4 anti-drift |
| scripts/test-phase4b-pulverize.ts | 5 trios + éditeur + anonymes + chunking |
| scripts/test-phase4c-fusion-intl.ts | Fusion FDP+K2 + 14 auteurs internationaux |
| scripts/test-mirror.ts | Test du Miroir : 20 personas déclaré + produit |

## Données

| Fichier | Contenu |
|---------|---------|
| scoring/data/F26B_BREAKER_RESULTS.json | Phase 1 micro-tests |
| scoring/data/F26B_PHASE2_RESULTS.json | Phase 2 validation 500w |
| scoring/data/F26B_PHASE3_RESULTS.json | Phase 3 validation 3000w |
| scoring/data/PHASE4_ANTIDRIFT_RESULTS.json | Phase 4a anti-drift |
| scoring/data/PHASE4B_PULVERIZE_RESULTS.json | Phase 4b trios + éditeur |
| scoring/data/PHASE4C_FUSION_INTL_RESULTS.json | Phase 4c internationaux |
| scoring/data/MIRROR_TEST_RESULTS.json | Test du Miroir complet |

---

# PARTIE 9 — MESSAGE DE REPRISE

```
OMEGA SESSION — REPRISE POST-MIROIR

Version: HEAD (après mirror-test-v1)
Dernier état: SESSION_SAVE_2026-03-24_MARATHON_F26B_PERSONAS_MIROIR
Branche: phase-r-metrology-rebuild
Tests: 1911 PASS

CONTEXTE:
  f26b CASSÉ : de 0.000 à 0.534 sur 3000w
  Trio FDP = champion : GB 4.087, f26b 0.400, CV 0.884
  K2 chunking = anti-drift : drift -4.5
  Dickens = surprise solo : GB 4.155, E1 +2.1 (le plus aligné)
  Le LLM NE SE CONNAÎT PAS : García Márquez déclare 28.5, produit 93.4
  La langue d'origine n'est PAS un frein : EN moyen 3.889

LOIS CONFIRMÉES: 11 (voir PARTIE 3)

PROCHAINE PRIORITÉ:
  #1: R-CONVERSION — table de conversion déclaré→produit
      3 personas stables (Flaubert/Dickens/Duras) × 5 runs
  #2: Trios avec Dickens (DDP, DDC)
  #3: Rosetta + Persona (synergie ou conflit ?)
  #4: Polisher post-génération (2 passes)

DOCUMENTS CLÉS:
  scoring/data/MIRROR_TEST_RESULTS.json
  scoring/data/PHASE4B_PULVERIZE_RESULTS.json
  OMEGA_DOSSIER_REFERENCE_PISTES_ET_MIROIR.md

Architecte Suprême: Francky
IA Principal: Claude
```

---

*SESSION_SAVE rédigé le 2026-03-24*
*Standard NASA-Grade L4 / DO-178C Level A*
*~180 appels API, 7 phases, 20 personas, 11 lois*
*"Le LLM ne se connaît pas. Seul le couple déclaré + mesuré est fiable."*
