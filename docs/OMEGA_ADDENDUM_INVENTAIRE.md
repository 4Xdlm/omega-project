# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — ADDENDUM À L'INVENTAIRE EXHAUSTIF
# Données extraites des DOCX et fichiers ignorés par le scan automatique
# ═══════════════════════════════════════════════════════════════════════════════
#
# Le scan Claude Code (commit 08a25a20) a ignoré :
# - 4 fichiers .docx (pas de lecture DOCX native)
# - Plusieurs .md volumineux (30KB+)
# - Le fichier .jsx du Manifeste
#
# Ce document COMPLÈTE l'inventaire avec les observations manquantes.
# ═══════════════════════════════════════════════════════════════════════════════

## FICHIERS LUS DANS CET ADDENDUM

| Fichier | Taille | Contenu |
|---|---|---|
| OMEGA_GLOSSAIRE.docx | 16 KB | 26 termes, 6 catégories |
| OMEGA_BILAN_PERSONAS.docx | 16 KB | 30+ personas, 350+ API, 24 lois |
| OMEGA_DOSSIER_TECHNIQUE_SESSION_NUIT.docx | 31 KB | 7 dossiers compilés, carte repo, blueprint |
| OMEGA_SCHEMAS_TECHNIQUES.docx | 390 KB | Schémas architecture (le plus gros doc) |

---

## F. GLOSSAIRE OPÉRATOIRE (26 termes)

### F.1 Termes JUGE

| Terme | Catégorie | Définition clé |
|---|---|---|
| GB V1 | JUGE | Score [3.0-5.0], 42 features, 50 arbres. BIAIS : hypnotisé par densité sémantique |
| Multi-Stage V2 | JUGE | Successeur GB V1, 571 œuvres, pénalise knife_rate élevé |
| Biais OOD | JUGE | Duras GB=4.121 / V2=21. Hors-distribution = juge invalide |
| SAGA_READY | JUGE | composite ≥ 92.0 + min_axis ≥ 85 |

### F.2 Termes MÉTRIQUE

| Terme | Formule | Note |
|---|---|---|
| CV | std(longueurs)/mean(longueurs) | Zone optimale [0.80, 1.30], Nombre d'Or ≈ 1.07 |
| f26b | % phrases > 40 mots | Maîtres : d=+1.054 (Cohen's d) |
| knife_rate | % phrases < 10 mots | Duras=99%, Flaubert=35% |
| Drift | mean(chunk4) - mean(chunk1) | Cible ±15, confrontation ±35 autorisé |
| E1 Delta | produit - déclaré | Dickens +2.1 (meilleur), Faulkner +34.6 (pire) |

### F.3 Termes MODÈLE LLM

| Terme | Valeur clé | Implication OMEGA |
|---|---|---|
| ROM | cv_déclaratif = 0.000 | Personas = mémoire figée, pas ajustable par consigne |
| Table R-CONV | produit = 1.727×déclaré - 10.85 (FR) | Le LLM ne produit PAS ce qu'il déclare |
| Duras Takeover | chunk1=39w → chunk4=19w | FDP trio → Duras prend le contrôle progressivement |

### F.4 Termes ARCHITECTURE

| Terme | Détails |
|---|---|
| K2 Chunking | 4×750w + last 200w entre chunks. Drift ×7 meilleur |
| Lore-coding | Comportemental > numérique. Consignes chiffrées = -0.26 à -0.43 GB |
| Correcteur Duras | Chunks 3-4 uniquement. Externe, pas co-auteur (LOI L21) |

---

## G. BILAN PERSONAS (350+ API, 30+ personas)

### G.1 Les 3 familles

| Famille | Auteurs | Mean produit | Rôle OMEGA |
|---|---|---|---|
| LAME (2-6w) | Duras, Céline, Hemingway, McCarthy | 3.5-4.2w | Correcteur/contraste |
| ARCHITECTE (20-45w) | Flaubert, Dickens, Zola | 28-38w | Structure/rythme |
| FLEUVE (40-150w) | Proust, Faulkner, Woolf | 99-130w (solo) | Profondeur/temps |

### G.2 Données ROM scellées (production FR)

| Persona | Mean FR | f26b | knife | CV | GB V1 | Stabilité |
|---|---|---|---|---|---|---|
| Flaubert | 37.9±6.6 | 0.52 | 0.35 | 0.81 | 3.909 | E1=+14.9 |
| Dickens | 28.3±2.7 | 0.21 | 0.14 | 0.55 | 3.681 | E1=+2.1 ✅ |
| Duras | 3.8±0.6 | 0.000 | 0.99 | 0.46 | 3.909 | E1=-5.3 |
| Proust | ~130 (solo) | 1.000 | — | 0.23 | 3.758 | Stable en duo |
| Woolf | 10.5 (PARADOXE) | 0.2 | — | — | 4.402→3.703 | INSTABLE ❌ |

### G.3 Progression CV (fil rouge documenté)

| Version | CV | Delta | Problème restant |
|---|---|---|---|
| FDP 500w (réf) | 1.091 ✅ | — | Takeover en 3000w |
| PF pur (ctrl) | 0.454 ❌ | — | Mort rythmique |
| PF + correcteur v1 | 0.625 ❌ | +0.171 | CV < 0.80 |
| PF + correcteur v2 | 0.702 ❌ | +0.077 | CV < 0.80, drift -47 |
| PF + correcteur v3 | 0.906 ✅ | +0.204 | Drift -9.7 |
| PF + correcteur v4 | 0.85-0.99 | contextuel | **3 scènes validées** |

### G.4 Chemins ABANDONNÉS (documentés avec raisons)

1. Consignes métriques dans le prompt → GB -0.26 à -0.43 (LOI L3)
2. Personas anonymes → -0.307 GB vs nom propre
3. Duras solo moteur → V2=21/100
4. FDP trio à voix égales → Duras Takeover
5. Correcteur "quand ça déborde" → trop rare (CV 0.625)
6. Correcteur "souvent" sans ancre → drift -47.4
7. Consigne "8-10 phrases" → réactive comptage cognitif

---

## H. DOSSIER TECHNIQUE SESSION NUIT (7 dossiers compilés)

### H.1 Seuils contextuels SCELLÉS (LOI L27)

| Type scène | Drift | CV min | f26b min | Condition |
|---|---|---|---|---|
| Contemplation | ±15 | ≥ 0.80 | > 0.40 | standard |
| Dialogue | ±15 | ≥ 0.65 | > 0.40 | V2 ≥ 90 requis |
| Confrontation | ±35 | ≥ 0.80 | > 0.40 | V2 ≥ 90 requis |

### H.2 Métriques moteur v4 SCELLÉES

| Métrique | Contemplation | Confrontation | Dialogue |
|---|---|---|---|
| GB V1 | 4.124 | 4.258 | 3.903 |
| V2 | 100.0 | 100.0 | 100.0 |
| CV | 0.850 | 0.985 | 0.690 |
| Drift | -11.1 | -31.3 | +0.2 |
| f26b | 0.600 | 0.509 | 0.508 |

### H.3 Architecture Scribe v3 — Pipeline détaillé

```
Input  : SceneBrief ≤ 150 tokens (INV-CDE-01)
Chunk 1: PF_PERSONA + RAPPEL_CHUNKS12 + SceneBrief
Chunk 2: PF_PERSONA + RAPPEL_CHUNKS12 + last200w
Chunk 3: PF_PERSONA + RAPPEL_CHUNKS34_V4 + last200w
Chunk 4: PF_PERSONA + RAPPEL_CHUNKS34_V4 + last200w + "conclus"
LLM    : claude-sonnet-4-20250514, temp=0.75, max_tokens=2500/chunk
Scoring: GB V1 + MS V2
```

### H.4 Blueprint GB V1 complet

- 42 features → 50 arbres (Gradient Boosting)
- Init = 3.9523, LR = 0.05
- Top 5 : f26b (29%), f1a (8%), f29d (7%), f24c (6%), f19a (5%)
- Tier mapping : S≥4.5, A≥3.5, B≥2.5, C≥1.5, D<1.5

### H.5 Blueprint Multi-Stage V2 complet

- Ridge regression, 16 features, lambda=1.0, INTERCEPT=5.857
- Top poids : f26b(+2.477), f29d(-4.709), f19a(+1.583), f35c(-1.515)
- 3 bonus conditionnels : rhythmic_mastery(+15), controlled_breathing(+12), narrative_depth(+10)
- 1 pénalité : knife_excess(-10 si knife>0.15)
- Normalisation 0-100

### H.6 Tech Debt identifiée

| Module | Type | Impact |
|---|---|---|
| s-score.ts | @deprecated non supprimé | Confusion API |
| polish-engine.ts | @deprecated | Faible |
| 34 fichiers avec `any` | Typage faible | Maintenabilité |
| 95 scripts bench | Accumulation | Navigation |

### H.7 Décisions SCELLÉES (session nuit)

1. GB V1 = juge microbench uniquement
2. Multi-Stage V2 = juge décision longue forme
3. PF = moteur de base (Proust+Flaubert)
4. Duras = correcteur externe uniquement
5. Lore-coding comportemental = obligatoire
6. Seuils contextuels par type (L27)
7. Drift ±35 confrontation = forme dramatique, pas dérive
8. CV ≥ 0.65 dialogue = compression vocale naturelle

### H.8 Les 25 lois complètes (L1-L25) — DOCUMENTÉES

L1-L8 : Personas et prompts (nom > anonyme, ROM, zéro chiffre)
L9-L18 : Métriques et combos (OOD, émergence CV, Nombre d'Or, min 3 runs)
L19-L25 : Moteur (takeover, correcteur externe, mini-correcteur, ancre, cohérence)

### H.9 Continuité inter-chapitres (P4 critères)

| Critère | Seuil |
|---|---|
| ΔGB V1 | < 0.200 |
| ΔCV | < 0.250 |
| Δf26b | < 0.150 |
| ΔMean | < 15w |
| ΔV2 | < 15 |

---

## I. PISTES TROUVÉES DANS LES DOCX (non listées dans le scan)

### I.1 Pistes critiques OUBLIÉES

1. **V2=100 constant pour PF** : Le moteur PF pur score V2=100.0 TOUJOURS. Mais CV=0.454 et drift=-38.6. Le scorer V2 ne voit pas le problème rythmique. **V2 est aveugle au rythme.**

2. **Woolf paradoxe** : ROM déclare phrases longues, produit mean=10.5w. Instabilité 4.402→3.703. **Persona dangereuse — ne jamais utiliser.**

3. **Run 3 de v2 avait drift=0.0** car chunk1=62w. Quand les premiers chunks sont ancrés, le reste suit naturellement.

4. **Scribe = artiste AVEUGLE** (blueprint) : le Scribe ne doit JAMAIS avoir accès aux métriques. OMEGA vérifie post-génération.

5. **SCHEMAS_TECHNIQUES.docx = 390 KB** — probablement les schémas d'architecture visuels du pipeline. Non lisible en texte mais potentiellement critique pour la compréhension globale.

---

## J. CONTRADICTIONS SUPPLÉMENTAIRES TROUVÉES

| # | Source A | Source B | Nature |
|---|---|---|---|
| 8 | Glossaire : CV optimal ≈ 1.07 | Étalonnage maîtres : max Duras = 1.031 | CV Gate à 1.05 vs "Nombre d'Or" 1.07 |
| 9 | Bilan Personas : V2=100.0 pour PF | V-ATOMIC v3 : pas de score V2 mesuré | V2 absent du pipeline MacroSScore actuel |
| 10 | Session nuit : moteur = PF+Duras_K2_v3 | Session jour : moteur = PF+Duras_K2_v4 | Version moteur évoluée entre sessions |

---

*Addendum produit manuellement — lecture DOCX via Desktop Commander*
*3 fichiers DOCX + 1 MD lus en intégralité*
