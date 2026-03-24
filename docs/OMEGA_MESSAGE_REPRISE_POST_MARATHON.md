# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — MESSAGE DE REPRISE DE SESSION
# Pour : Prochaine session Claude (même projet)
# Date de rédaction : 2026-03-24
# ═══════════════════════════════════════════════════════════════════════════════
#
# CE DOCUMENT CONTIENT TOUT CE QU'IL FAUT POUR REPRENDRE SANS PERTE.
# Lire INTÉGRALEMENT avant toute action.
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# 🚀 COMMANDE DE LANCEMENT

```
OMEGA SESSION — REPRISE POST-MARATHON 2026-03-24

Version: HEAD (après phase5b-validate-v1)
Dernier état: SESSION_SAVE_2026-03-24_MARATHON_COMPLET.md
Branche: phase-r-metrology-rebuild
Tests système: 1911 PASS
API consommés session précédente: ~300

Architecte Suprême: Francky
IA Principal: Claude
Consultants: ChatGPT (auditeur), Gemini (gardien architectural)

Objectif: Exécuter le PLAN P1-P5 (voir ci-dessous)
```

---

# CONTEXTE — QU'EST-CE QUE OMEGA ?

OMEGA est un système de génération littéraire haute performance visant un roman/saga
de ~300K mots. Le juge principal est le GB V1 (Gradient Boosting, 42 features).
Le LLM principal est Claude Sonnet. L'objectif est d'atteindre une prose de qualité
comparable aux maîtres littéraires humains (GB ≥ 3.910, CV ≈ 0.940).

Le projet est un monorepo TypeScript à `C:\Users\elric\omega-project`,
branche `phase-r-metrology-rebuild`. Les scripts de test sont dans
`packages/sovereign-engine/scripts/`. Les données JSON dans
`packages/sovereign-engine/src/scoring/data/`.

---

# CE QUI A ÉTÉ FAIT — MARATHON DU 2026-03-24

## ~300 appels API, 11 phases, 20+ personas testés

### Phase 1-3 : f26b BREAKER
- Le verrou f26b (phrases > 40 mots) est CASSÉ
- 22 variantes testées, 12/22 à 100% phrases longues
- F3_flaubert = champion 500w (GB 4.075, f26b 0.568)
- Validation 3000w : GB 3.998, f26b 0.534, drift -15.5

### Phase 4a : Anti-drift + 6 Personas
- Chunking K2 = solution au drift (drift -4.5)
- 6 personas testés : Duras record solo à GB 4.319
- Découverte : le persona > toute consigne technique

### Phase 4b : Pulvériser les maîtres
- Trio FDP (Flaubert+Duras+Proust) : GB 4.119, CV 0.937
- Les consignes éditeur/métriques DÉGRADENT le GB (-0.26 à -0.43)
- Les noms d'auteurs > les rôles anonymes

### Phase 4c : Biais langue (14 auteurs internationaux)
- Woolf 4.402 (outlier stochastique, instable)
- La langue d'origine n'est PAS un frein (EN moyen 3.889 vs FR 3.820)
- Auteurs anglais performent en prose française

### Test du Miroir : Retro-engineering 20 personas
- 20 personas : profil DÉCLARÉ (JSON) + PRODUIT (500w prose) + DELTA E1
- Dickens = #1 solo à 4.155, le mieux aligné (E1 +2.1)
- Le LLM NE SE CONNAÎT PAS : García Márquez déclare 28.5 mots, produit 93.4
- Les trios battent les solos en MOYENNE (4.025 vs 3.85) — mais single run
- 3 familles identifiées : LAME (<15w), ARCHITECTE (20-40w), FLEUVE (>40w)

### R-CONVERSION FR : Table de conversion déclaré→produit
- 3 personas × 5 runs × 2 (déclaré + produit) = 30 appels
- CAS B CONFIRMÉ : transformation LINÉAIRE, r > 0.88 sur 4/5 dimensions
- mean_produit = 1.727 × mean_déclaré - 10.848
- Le CV est IMPREDICTIBLE (r = 0.000) — seul angle mort
- Les personas sont des ROM stables (cv_déclaratif = 0.000)

### R-CONVERSION EN : Miroir anglais
- Même protocole en anglais, 30 appels
- Pente EN (1.951) > pente FR (1.727) → décalage COGNITIF, pas linguistique
- L'hypothèse tokenization (BPE) est RÉFUTÉE
- La table est universelle (fonctionne dans les 2 langues)

### Phase 5 : Author Assembly (15 solos + 20 paires + 8 trios)
- 43 appels, 1 run par config
- DDP (Dickens+Duras+Proust) à 4.152 (faux positif — single run)
- Découverte : FLEUVE×LAME crée une synergie CV massive (×3-5 théorique)
- Règle : 1 FLEUVE + 1 LAME + 1 ARCHITECTE = meilleur design de trio

### Phase 5b : Validation statistique (15 configs × 5 runs = 75 appels)
- H1 FAIL : les trios NE BATTENT PAS les solos en GB (solos 3.918 > trios 3.812)
- H2 FAIL : la LAME ne domine la longueur que dans 57% des cas (seuil 75%)
- H3 PASS (90%) : le CV EST ÉMERGENT dans les combos
- H4 PASS : CV optimal ≈ 1.07 (fenêtre glissante)
- Champion : Duras solo GB 4.243, win rate 87%
- MAIS : Duras solo = 3.9 mots/phrase, non viable en production longue
- FDP = meilleur compromis production : GB 3.990, CV 1.091, std 0.101

---

# LES 20 LOIS DÉCOUVERTES

| # | Loi | Statut |
|---|-----|--------|
| L1 | f26b = verrou de formulation | CONFIRMÉ |
| L2 | NOM d'auteur > anonyme | CONFIRMÉ |
| L3 | Consignes métriques dégradent | CONFIRMÉ |
| L4 | Le LLM ne se connaît pas | CONFIRMÉ |
| L5 | Personas = ROM stables | CONFIRMÉ |
| L6 | Décalage = cognitif, pas linguistique | CONFIRMÉ |
| L7 | CV impredictible par le LLM | CONFIRMÉ |
| L8 | ~~Trio > solo~~ | RÉFUTÉ |
| L9 | ~~Profil équilibré optimal~~ | NUANCÉ |
| L10 | Knife% = levier caché | CONFIRMÉ |
| L11 | Injection > remplacement | CONFIRMÉ |
| L12 | Chunking K2 résout le drift | CONFIRMÉ |
| L13 | Langue d'origine pas un frein | CONFIRMÉ |
| L14 | Auteurs instables = dangereux | CONFIRMÉ |
| L15 | Table R-CONV = descriptive, pas prescriptive | CONFIRMÉ |
| L16 | CV ÉMERGENT dans les combos | CONFIRMÉ (90%) |
| L17 | CV optimal ≈ 1.07 | CONFIRMÉ |
| L18 | 1 run insuffisant | CONFIRMÉ |
| L19 | GB V1 a un biais minimaliste | SUSPECTÉ |
| L20 | Incarnation guidée + vérification métrique | DOCTRINE |

---

# DÉCISIONS EN VIGUEUR

| Décision | Statut |
|----------|--------|
| Claude+Rosetta = moteur principal | VERROUILLÉE |
| Mistral = benchmark | VERROUILLÉE |
| GPT-4o = éliminé | VERROUILLÉE |
| Consignes métriques = INTERDIT dans le prompt | VERROUILLÉE |
| CV piloté par chunking | VERROUILLÉE |
| Duras = régulateur/calibration, pas moteur principal | VERROUILLÉE |
| FDP = CANDIDAT principal production | EN ATTENTE test long |

---

# LE PLAN — 5 PRIORITÉS DANS L'ORDRE

## P1 — Test long 3000w FDP+K2 (PRIORITÉ IMMÉDIATE)

### Objectif
Valider que le FDP tient en production longue avec le chunking K2.

### Protocole
3 configs × 3 runs × 4 chunks = 36 appels API

| Config | Rôle |
|--------|------|
| **FDP + K2** | Candidat principal (GB 3.990, CV 1.091, std 0.101) |
| **proust_flaubert + K2** | Backup stable (GB 3.964, std 0.049) |
| **Duras solo** (pas de K2) | Contrôle — vérifier si elle tient ou s'effondre en 3000w |

### Architecture K2 (déjà validée en Phase 4a)
- Chunks 1-2 : Trio/Paire PUR (750w chaque)
- Chunks 3-4 : Trio/Paire + injection rappel Duras renforcé

### Mesures PAR CHUNK
GB, CV, mean, f26b, knife, drift fenêtre par fenêtre

### Critères PASS
```
GB moyen ≥ 3.90
CV ∈ [0.80, 1.30] sur l'ensemble
Drift ∈ [-10, +10]
Pas d'effondrement chunk 3-4
```

### Conséquences
- FDP passe → CANDIDAT VALIDÉ production → on scelle
- FDP échoue → proust_flaubert prend le relais
- Duras tient en 3000w → biais GB V1 confirmé → P2 devient urgent

---

## P2 — Audit rapide du GB V1 (0 API)

### Objectif
Vérifier si le GB V1 a un biais pro-minimalisme/pro-densité.

### Actions
1. Extraire les 42 features du GB V1 et leurs coefficients
2. Identifier les features qui favorisent le court (knife_rate, densité)
3. Vérifier la pondération de ix_variance_x_longrate (feature #2)
4. Scorer 3 textes humains connus : un Duras, un Flaubert, un Proust
5. Verdict : biais confirmé ou réfuté

### Conséquence
Si biais confirmé → réviser les coefficients ou ajouter un correctif avant production.

---

## P3 — Formaliser le régime cible de production

### Objectif
Passer de "quel auteur gagne" à "quel régime métrique viser".

### Régime provisoire
```
GB     : ≥ 3.90
CV     : 0.90 — 1.20 (centré sur 1.07)
f26b   : > 0.05
knife  : 0.30 — 0.60
mean   : 12 — 25 mots
drift  : ±10 sur 3000w
```

Les auteurs deviennent des PORTES D'ENTRÉE vers ce régime, pas le régime lui-même.

---

## P4 — Test continuité inter-chapitres

### Objectif
Vérifier que 2 chapitres FDP+K2 consécutifs ont le MÊME profil.

### Protocole
2 × 3000w FDP+K2 consécutifs, même univers narratif.
Mesurer l'écart de profil entre les 2.

### Critères
```
Écart GB < 0.15
Écart CV < 0.20
Écart mean < 5 mots
```

---

## P5 — Pistes différées (après validation production)

| Piste | Budget | Priorité |
|-------|--------|----------|
| Rosetta + Persona (synergie ?) | 8 API | HAUTE |
| Polisher post-génération (2 passes) | 8 API | HAUTE |
| Lore-coding (métriques → psychologie) | 4 API | MOYENNE |
| Température (0.6/0.75/0.9) | 6 API | FAIBLE |
| Traducteur inter-LLM | — | APRÈS P1-P4 |

---

# DONNÉES ET FICHIERS CLÉS

## Pour retrouver les résultats

| Données | Chemin |
|---------|--------|
| Tous les JSON de résultats | `packages/sovereign-engine/src/scoring/data/` |
| Phase 5b (75 runs) | `PHASE5B_VALIDATION_RESULTS.json` |
| Miroir (20 personas) | `MIRROR_TEST_RESULTS.json` |
| R-CONVERSION FR | `R_CONVERSION_RESULTS.json` |
| R-CONVERSION EN | `R_CONVERSION_EN_RESULTS.json` |
| Phase 5 Assembly | `PHASE5_ASSEMBLY_RESULTS.json` |

## Pour retrouver les scripts

| Script | Phase |
|--------|-------|
| `scripts/test-phase5b-validate.ts` | Phase 5b (dernier exécuté) |
| `scripts/test-phase5-assembly.ts` | Phase 5 |
| `scripts/test-mirror.ts` | Miroir |
| `scripts/test-r-conversion.ts` | R-CONV FR |
| `scripts/test-r-conversion-en.ts` | R-CONV EN |

## Pour retrouver les documents de référence

Chercher dans les fichiers du projet Claude.ai :
- `SESSION_SAVE_2026-03-24_MARATHON_COMPLET.md` — CE document
- `OMEGA_TABLE_CONVERSION_R_CONVERSION.md` — Table R-CONV détaillée
- `OMEGA_SYNTHESE_PHASE5B_DECISION.md` — Décision FDP vs Duras
- `OMEGA_DOSSIER_REFERENCE_PISTES_ET_MIROIR.md` — Pistes ouvertes

---

# ERREURS À NE PAS RÉPÉTER

1. **Ne JAMAIS conclure sur 1 run** — DDP 4.152 → 3.655 sur 5 runs
2. **Ne JAMAIS mettre de consignes métriques dans le prompt** — ça DÉGRADE le GB
3. **Ne JAMAIS confondre score GB et qualité de production** — Duras solo hacke le juge
4. **Ne JAMAIS croire l'auto-explication du LLM** — il ne se connaît pas
5. **Ne JAMAIS forcer un persona hors de sa ROM** — les consignes chiffrées sont ignorées
6. **Ne JAMAIS piloter le CV par consigne** — il est impredictible (r=0.000)

---

# VOCABULAIRE OMEGA À CONNAÎTRE

| Terme | Définition |
|-------|-----------|
| **GB V1** | Gradient Boosting scorer, 42 features, juge principal |
| **f26b** | Taux de phrases > 40 mots (0.00 à 1.00) |
| **CV** | Coefficient de Variation = std/mean des longueurs de phrases. Mesure le contraste |
| **knife** | Taux de phrases < 10 mots |
| **Trio FDP** | Flaubert+Duras+Proust — candidat principal de production |
| **K2 chunking** | Découpage en 4 blocs de 750w. Blocs 3-4 = injection rappel Duras |
| **ROM** | Read-Only Memory — le profil FIGÉ d'un persona dans les poids du LLM |
| **R-CONVERSION** | Table de conversion entre ce que le LLM déclare et ce qu'il produit |
| **E1 delta** | Écart entre profil déclaré et profil produit |
| **LAME** | Famille d'auteurs à phrases courtes (Duras, Céline, Hemingway) |
| **ARCHITECTE** | Famille d'auteurs à phrases moyennes (Flaubert, Dickens, Zola) |
| **FLEUVE** | Famille d'auteurs à phrases longues (Proust, Woolf, Faulkner) |
| **Maîtres @500w** | Référence corpus humain : GB 3.910, f26b 0.177, CV 0.940 |

---

# INSTRUCTION DE REPRISE

```
1. Lire CE document en entier
2. Lire OMEGA_TABLE_CONVERSION_R_CONVERSION.md (table de conversion)
3. Lire OMEGA_SYNTHESE_PHASE5B_DECISION.md (décision FDP vs Duras)
4. Vérifier les fichiers JSON dans src/scoring/data/
5. Présenter un BILAN DE COMPRÉHENSION à l'Architecte
6. Attendre validation AVANT d'agir
7. Commencer par P1 (test long 3000w FDP+K2)
```

---

# PHRASE DE CLÔTURE

> **"FDP = candidat principal de production. Pas encore moteur scellé.
> Le prochain test (P1 — 3000w K2) tranchera.
> Le CV optimal est ≈ 1.07 — c'est la vraie constante découverte.
> Le meilleur score n'est pas le meilleur moteur."**

---

*Message de reprise rédigé le 2026-03-24*
*Prochaine action : P1 — Test long 3000w FDP+K2 (36 API)*
*Architecte Suprême : Francky*
*IA Principal : Claude*
