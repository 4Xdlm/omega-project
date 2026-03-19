# OMEGA — RAPPORT PHASE R0 : PREPARATION CORPUS
# Date : 2026-03-19
# Statut : PASS
# Standard : NASA-Grade L4 / DO-178C Level A

---

## 1. OBJECTIF

Preparer le corpus et les outils d'analyse pour la Phase R (Refondation Metrologique).
Lever les limites de taille, ajouter le corpus espagnol, identifier les sagas,
produire full_work_analyzer_v5.py pret a executer.

## 2. LIVRABLES

| Livrable | Fichier | Statut |
|----------|---------|--------|
| Analyseur v5 | `omega-autopsie/full_work_analyzer_v5.py` | PRET |
| Module config | `omega-autopsie/v5_config.py` | PRET |
| Module features | `omega-autopsie/v5_features.py` | PRET |
| Module extraction | `omega-autopsie/v5_extraction.py` | PRET |
| Inventaire corpus | `omega-autopsie/OMEGA_CORPUS_R0.json` | PRET |
| Rapport | `docs/OMEGA_R0_REPORT.md` | CE FICHIER |
| Session save | `docs/SESSION_SAVE_R0.md` | PRET |

## 3. CRITERES PASS

| Critere | Cible | Resultat | Statut |
|---------|-------|----------|--------|
| Corpus FR originaux | >= 70 | **87** (57 FR-ORIG + 30 PD-FR) | PASS |
| Corpus EN originaux | >= 50 | **60** (31 EN-ORIG + 23 PD-EN + 6 BONUS) | PASS |
| Corpus ES originaux | >= 15 | **17** (PD-ES Gutenberg) | PASS |
| Sagas identifiees | oui | **10 sagas** | PASS |
| CHAPTER_MAX_WORDS supprime | oui | **Supprime** | PASS |
| v5 teste sur 3 oeuvres | oui | **3/3 PASS** | PASS |
| Plan extraction valide | oui | **12 fenetres multi-echelle** | PASS |

## 4. CHANGEMENTS v4 -> v5

### 4.1 Limites supprimees/modifiees

| Parametre | v4 | v5 | Justification |
|-----------|----|----|---------------|
| GATE_MIN_WORDS | 15,000 | **8,000** | Inclure oeuvres courtes (Ernaux, Beckett, nouvelles) |
| CHAPTER_MAX_WORDS | 7,000 | **SUPPRIME** | Analyser tous les chapitres reels sans troncature |
| N_CHAPTERS | 5 | **ILLIMITE** | Tous les chapitres reels de l'oeuvre |
| N_RANDOM | 10 fixe | **proportionnel** (1/5000 mots, min 5, max 30) | Couverture adaptee a la taille |
| CHAPTER_MIN_WORDS | 1,500 | **500** | Inclure chapitres courts |

### 4.2 Nouvelles fonctionnalites

- **Multi-fenetre** : 12 tailles d'analyse (30, 150, 300, 600, 1000, 1500, 2500, 5000, 10000, 20000, chapitre reel, oeuvre complete)
- **Classification passage** : DESCRIPTION | DIALOGUE | ACTION | INTROSPECTION | TRANSITION
- **P_rel** : position relative (mots_precedents / mots_totaux) sur chaque extrait
- **Hooks/Cliffhangers** : 100 premiers/derniers mots de chaque chapitre
- **Corpus ES** : 17 oeuvres espagnoles (Gutenberg domaine public)
- **SAGAS** : 10 ensembles multi-tomes identifies

### 4.3 Nouvelles features (F31-F38)

| ID | Feature | Description |
|----|---------|-------------|
| F31 | Chapter length distribution | mean, stdev, CV, min, max des longueurs de chapitres |
| F33 | Punctuation ratio | points/virgules — staccato vs legato |
| F34 | Paragraph density | paragraphes par 1000 mots — vitesse de lecture |
| F35 | Hook strength | tension sur 100 premiers mots |
| F36 | Cliffhanger strength | tension sur 100 derniers mots |
| F38 | Typographic speed | combinaison ponctuation + longueur paragraphes |

Note : F32 (P_rel), F37 (naturalite coupure), F39 (arc tensionnel), F40 (transition inter-chapitres)
seront implementees en R2 car elles necessitent les donnees de R1.

### 4.4 Architecture modulaire

v5 decoupe en 4 fichiers (vs 1 monolithe de 1906 lignes en v4) :
- `v5_config.py` : constantes, catalogues, sagas (~580 lignes)
- `v5_features.py` : calculs F24-F30 + F31-F38 (~480 lignes)
- `v5_extraction.py` : extraction, chapitres, classification (~330 lignes)
- `full_work_analyzer_v5.py` : orchestration, main (~300 lignes)

## 5. CORPUS DETAILLE

### 5.1 Par source

| Source | Count |
|--------|-------|
| FR-ORIG (PDF) | 57 |
| PD-FR (Gutenberg) | 30 |
| TR-FR (traductions FR) | 14 |
| EN-ORIG (PDF) | 31 |
| PD-EN (Gutenberg) | 23 |
| TR-EN (traductions EN) | 9 |
| PD-ES (Gutenberg) | 17 |
| BONUS-GENRE | 5 |
| BONUS-THEATRE | 1 |
| **TOTAL** | **187** |

### 5.2 Sagas identifiees

| Saga | Auteur | Langue | Tomes en corpus |
|------|--------|--------|-----------------|
| Les Rougon-Macquart | Zola | fr | 4/20 |
| La Comedie Humaine | Balzac | fr | 3/90+ |
| Recherche du temps perdu | Proust | fr | 1/7 |
| Les Miserables | Hugo | fr | 1/5 |
| Le Labyrinthe du Monde | Yourcenar | fr | 1/3 |
| Oeuvres Maupassant | Maupassant | fr | 3 |
| La Regenta | Clarin | es | 2/2 |
| Fortunata y Jacinta | Galdos | es | 1 |
| L'Amie prodigieuse | Ferrante | it->fr | 1/4 |
| Border/Southern Gothic | McCarthy | en | 4 |

### 5.3 Auteurs espagnols (nouveau)

Cervantes, Clarin, Galdos, Unamuno, Baroja, Azorin, Alarcon,
Becquer, Pardo Bazan, Quiroga, Valle-Inclan, Blasco Ibanez, Anonimo (Lazarillo).

## 6. TESTS DE VALIDATION

| Oeuvre | Langue | Source | Mots | Chapitres | Extraits | Multi-fen | Gate |
|--------|--------|--------|------|-----------|----------|-----------|------|
| Madame Bovary | fr | PDF | 144,247 | 40 | 34 | 10 | PASS |
| Heart of Darkness | en | Gutenberg | ~38k | 19 | ~20 | 10 | PASS |
| Niebla | es | Gutenberg | ~55k | 28 | ~16 | 10 | PASS |

## 7. WARNING — PREREQUIS R1

### W-01 : F1-F23 DESACTIVEES (Python 3.14 / spaCy incompatible)

autopsie_v4.py utilise spaCy qui depend de Pydantic V1, incompatible Python 3.14.
**Consequence** : seules F24-F30 + F31-F38 sont actives dans les tests v5.
**Action R1** : installer Python 3.12 ou 3.13 dans un venv dedie pour executer
l'analyse complete avec F1-F23.

### W-02 : EPUB extraction non testee

ebooklib/BeautifulSoup necessaires pour les .epub (Texaco, Yourcenar, Malraux...).
A verifier en R1 avant run complet.

## 8. DONNEES CHIFFREES

- Regex chapitre v5 : strict (keyword + numero ou [N]) — 40 chapitres sur Bovary vs 13954 faux positifs avec regex v4 sans CHAPTER_MAX
- Temps d'analyse Bovary : ~1.5s (F24-F30 seules, sans spaCy)
- Estimation run complet 187 oeuvres : ~5-10 min (sans spaCy), ~2-4h (avec spaCy)

---

*Rapport genere le 2026-03-19 — Standard NASA-Grade L4 / DO-178C Level A*
*Phase R0 : PASS — Pret pour R1*
