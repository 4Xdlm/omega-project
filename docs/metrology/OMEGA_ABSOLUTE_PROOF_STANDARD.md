# OMEGA — NORME DE PREUVE ABSOLUE (S-1)

**Version** : 1.0 · **Date** : 2026-06-02 · **Statut** : PROPOSÉ (ratification Architecte)
**Standard** : NASA-Grade L4 / DO-178C-like · **Doctrine liée** : EMP-12 (METRIC_HONESTY), EMP-16 (triple-preuve), DEC-011 (anti-circularité), DEC-015 (SEAL 93 invalidé)

> **Principe fondateur** : « OMEGA ne doit plus chercher un score qui l'arrange. OMEGA doit construire un instrument qui pourrait le condamner. »
> Une mesure n'est *vraie* que si elle survit à : (1) la répétition, (2) la contre-mesure, (3) le corpus adverse, (4) le juge indépendant, (5) l'incertitude statistique, (6) la tentative de triche.

Ce document définit **ce qui constitue une preuve** en métrologie littéraire OMEGA. Toute mesure produite après ratification et non conforme à cette norme est **INVALIDE** et ne peut fonder aucune décision (architecture, seuil, SEAL, classement, modification moteur).

---

## 1. CHAMPS OBLIGATOIRES D'UNE PREUVE

Toute mesure consignée DOIT porter le bloc de provenance complet :

| Champ | Description |
|---|---|
| `corpus_id` | identifiant du corpus exact utilisé |
| `text_sha256` | hash de chaque texte mesuré (par extrait) |
| `source` | provenance du texte (titre, auteur, édition/URL domaine public) |
| `length_words` | longueur de l'extrait en mots |
| `lang` | langue (`fr`/`en`/…) — autorité `lang_corrected` |
| `genre` | genre littéraire |
| `family` | famille (maître / best-seller / pulp / OMEGA-ancien / OMEGA-nouveau / adversarial) |
| `contract` | contrat émotionnel utilisé (si génération) |
| `packet` | packet de scoring utilisé (si scoring) |
| `model` | modèle exact (ex. `qwen3:32b`, `gemma4:31b`, `nomic-embed-text`) |
| `prompt_sha256` | hash du prompt exact |
| `temperature` | température (0 = déterministe pour scoring) |
| `seed` | graine |
| `scorer_version` | version du scorer/extracteur |
| `code_commit` | commit hash du repo au moment de la mesure |
| `date` | horodatage ISO |
| `raw_output` | sortie brute (avant parsing) |
| `parsed_output` | sortie parsée |
| `score` | score numérique |
| `ci95` | intervalle de confiance à 95 % |
| `verdict` | PASS / FAIL / ADVISORY |

**Stockage** : versionné dans le repo (`docs/audit/` ou `evidence/`), JAMAIS uniquement dans le workspace volatile. Une preuve qui ne vit que dans le scratchpad = **evidence-gap** (cf. cas M0b V3.4, §registre).

---

## 2. SEUILS STATISTIQUES (military-grade, adoptés du Tribunal 3-IA)

1. **n ≥ 100 / cellule** (cible). Minimum absolu **30**. En deçà de 30 : statut `ANECDOTE`, jamais `PREUVE`.
2. **Bootstrap 10 000 itérations, CLUSTERISÉ PAR LIVRE** (jamais par extrait) → IC95. Le cluster-par-livre garantit qu'on mesure un style global, pas un motif répété intra-chapitre.
3. **Test de permutation (≥ 1000×)** : mélanger les étiquettes ; si le score reste élevé sur étiquettes mélangées → hallucination, signal RÉFUTÉ.
4. **Validation croisée K-Fold spatiale PAR AUTEUR** : 80 % train / 20 % test, **aucun auteur partagé** entre train et test. Aucune sortie OMEGA dans le corpus de référence maître.
5. **VIF < 2.0** pour toute dimension d'un espace (ADN, modèle multi-features). Orthogonalité stricte (PCA).
6. **Mann-Whitney U** + rapport de stabilité FR/EN + stabilité par longueur (600/1500/3000/entier) + par genre.
7. **position_bias < 0.10** pour tout juge pairwise (double ordre A-vs-B et B-vs-A obligatoire).
8. **Critère PASS discrimination** (ex. embeddings/juge) : AUC maître/pulp **≥ 0.80**, borne basse IC95 **≥ 0.70**, stable FR ET EN.

---

## 3. INTERDITS (toute violation = mesure INVALIDE)

- Score sans bloc de provenance.
- Seuil sans corpus de dérivation (ex. SEAL 93 = dogme, DEC-015).
- Corpus sans hash.
- Score sans incertitude (IC absent).
- Juge sans test adversarial (permutation).
- Métrique sans domaine de validité explicite (langue/longueur/genre).
- Conclusion POSITIVE sur n=1 (P4/P5 = faisabilité, PAS preuve).
- Promotion en production sur **same-judge** (générateur = juge = circularité, DEC-011).
- Dériver un contrat/cible depuis une prose déjà scorée (circularité, DEC-011).
- Fonder une décision sur un chiffre [REGISTRE] non re-vérifié runtime.

---

## 4. HIÉRARCHIE DES STATUTS DE PREUVE

| Statut | Définition |
|---|---|
| `PROUVÉ` | n≥100 (ou ≥30 min), IC95 exploitable, permutation passée, K-fold par auteur, multi-instruments convergents, reproductible. |
| `THIN` | signal présent mais n<30 OU IC95 traverse le seuil. Directionnel, non décisionnel. |
| `ANECDOTE` | n=1 à quelques unités. Illustratif. Jamais décisionnel. |
| `REGISTRE` | chiffre historique consigné, non re-vérifié dans la session courante. Piste, pas fondation. |
| `EVIDENCE_GAP` | preuve attendue mais artefact/donnée absent ou non reproductible. À combler ou marquer ROUGE. |
| `RÉFUTÉ` | n'a pas survécu à la contre-mesure (permutation, corpus adverse, juge indépendant). |

**Règle EMP-16** : aucune modification de code MOTEUR sans **3 preuves indépendantes convergentes sur corpus distincts**. Une divergence → STOP + NCR.

---

## 5. CONDITIONS NO-GO GLOBALES (STOP + NCR)

Le protocole métrologique s'arrête si l'un de ces états est détecté :
corpus non hashé · artefact manquant non marqué · juge same-model seul comme preuve finale · IC95 trop large · AUC non significative · biais langue non contrôlé · position_bias > 0.10 · embedding non discriminant · panel humain contradictoire · score non reproductible · conclusion positive sur n=1.

---

## 6. EXIGENCE PHYSIQUE (héritée doctrine OMEGA)

Chaque mesure doit pouvoir répondre :
- **Pourquoi ça marche ?** (mécanisme causal, pas corrélation nue)
- **Dans quelles conditions ça échoue ?** (domaine de validité : langue, longueur, genre)
- **Qu'est-ce qui pourrait casser ?** (risques, confounds, fuites)

---

*Cette norme est le préalable de toute phase S0→S6. Ratification Architecte requise pour la sceller comme loi métrologique OMEGA.*
