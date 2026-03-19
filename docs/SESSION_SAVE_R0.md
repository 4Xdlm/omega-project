# SESSION_SAVE — PHASE R0 : PREPARATION CORPUS
# Date : 2026-03-19
# Branche : phase-w-mixer
# Statut : PASS — Pret pour R1

---

## CONTEXTE

Phase R0 = premiere etape de la Refondation Metrologique (Phase R).
Objectif : preparer le corpus et les outils d'analyse pour les phases R1-R5.
Precede par : Phase W (Damage Gate) + V-RECAL-1 (5 bench runs, median 90.5-91.8).

La Phase R existe car V-RECAL-1 a prouve que le plafond a 91-92 est un plafond
de la MESURE, pas du moteur. 16/16 features sont instables a 300 mots.

## DECISIONS PRISES

### D-01 : GATE_MIN_WORDS abaisse a 8000 (vs 15000 en v4)
Raison : inclure les oeuvres courtes (Ernaux, Beckett, nouvelles).
Decide par Francky lors de la validation du bilan R0.

### D-02 : CHAPTER_MAX_WORDS supprime
Raison : analyser tous les chapitres reels sans troncature.
Regle R-04 du charter : "Aucune limite de taille d'analyse."

### D-03 : Architecture v5 en 4 modules
Raison : le fichier monolithe v4 (1906 lignes) depassait les limites de tokens.
Decoupe en v5_config.py, v5_features.py, v5_extraction.py, full_work_analyzer_v5.py.

### D-04 : Regex chapitre renforce
Raison : le regex v4 produisait 13954 faux positifs sur Bovary (numeros romains courts I, V).
Solution : matcher uniquement "keyword + numero" (Chapitre X, Part II) ou "[N]".
Resultat : 40 chapitres corrects sur Bovary.

### D-05 : Corpus ES via Gutenberg
Raison : pas de PDF espagnols dans le corpus existant.
17 oeuvres espagnoles domaine public identifiees et testees (Niebla : 28 chapitres).

### D-06 : Marqueurs ES ajoutes aux features F25-F28
Raison : les listes de marqueurs (sensoriels, epistemiques, SIL) etaient FR+EN seulement.
Ajout de marqueurs espagnols pour une mesure equitable 3 langues.

## DISCUSSIONS ET CHOIX

### Classification par filename (PDF) = PROVISOIRE
Les oeuvres PDF sont classees FR-ORIG/EN-ORIG/TR-FR par le nom de fichier
dans CATALOG_PDF. Cette classification est manuelle et provisoire.
En R1, une verification automatique par detection de langue sera necessaire.

### F32, F37, F39, F40 reportees a R2
Ces features topologiques (P_rel, naturalite coupure, arc tensionnel,
transition inter-chapitres) necessitent les donnees empiriques de R1
pour etre calibrees correctement. P_rel est calcule mais pas encore
utilise comme feature de scoring.

### spaCy / Python 3.14 incompatible
autopsie_v4.py depend de spaCy qui depend de Pydantic V1, incompatible
Python 3.14. F1-F23 sont desactivees. Prerequis R1 CRITIQUE : installer
Python 3.12/3.13 dans un venv dedie.

## ETAT DU REPO

- HEAD : (sera mis a jour apres commit)
- Branche : phase-w-mixer
- Tests sovereign-engine : non impactes (v5 = Python, pas TypeScript)
- Fichiers ajoutes :
  - omega-autopsie/v5_config.py
  - omega-autopsie/v5_features.py
  - omega-autopsie/v5_extraction.py
  - omega-autopsie/full_work_analyzer_v5.py
  - omega-autopsie/OMEGA_CORPUS_R0.json
  - omega-autopsie/results_v5/ (3 fichiers test)
  - omega-autopsie/scenes_v5/ (18 extraits test)
  - docs/OMEGA_R0_REPORT.md
  - docs/SESSION_SAVE_R0.md

## RESULTATS

| Critere R0 | Cible | Resultat | PASS/FAIL |
|------------|-------|----------|-----------|
| FR originaux | >= 70 | 87 | PASS |
| EN originaux | >= 50 | 60 | PASS |
| ES originaux | >= 15 | 17 | PASS |
| Total oeuvres | - | 187 | - |
| Sagas identifiees | oui | 10 | PASS |
| CHAPTER_MAX_WORDS supprime | oui | oui | PASS |
| v5 teste 3 oeuvres | oui | 3/3 | PASS |

## WARNING CRITIQUE POUR R1

**W-01** : F1-F23 (autopsie_v4 / spaCy) desactivees sur Python 3.14.
Solution : venv Python 3.12 ou 3.13 pour le run complet R1.
Impact : les features F1-F23 (rhythm, euphony, TTR avance, ritual, literary_index)
ne sont PAS dans les resultats de test v5. Seules F24-F38 sont validees.

**W-02** : EPUB non teste (ebooklib/bs4 necessaires).
Concerne : Texaco, Yourcenar (3 oeuvres), Malraux (2), Echenoz, Robbe-Grillet.

---

## MESSAGE DE REDEMARRAGE POUR R1

```
OMEGA SESSION — PHASE R1 (MESURE MULTI-FENETRE)
Dernier etat : SESSION_SAVE_R0
Corpus : 187 oeuvres / 3 langues (87 FR + 60 EN + 17 ES + 23 traductions)
Objectif : Mesurer F1-F30 a 5 niveaux, deriver les constantes empiriques
Prerequis CRITIQUE : Python 3.12/3.13 venv pour spaCy (F1-F23)
Prerequis : ebooklib + bs4 pour extraction EPUB
Lire : SESSION_SAVE_R0 + OMEGA_R0_REPORT + OMEGA_PHASE_R_PLAN + OMEGA_PHASE_R_ROADMAP
Tag repo : phase-r0-complete
Branche : phase-w-mixer
```

---

*Session save genere le 2026-03-19 — Standard NASA-Grade L4 / DO-178C Level A*
