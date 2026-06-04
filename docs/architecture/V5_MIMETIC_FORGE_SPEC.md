# V5_MIMETIC_FORGE_SPEC — Forge mimétique / référentielle (brouillon conceptuel)

**Statut** : DRAFT conceptuel (doc-only, aucune implémentation moteur) · **Date** : 2026-06-04 · **Origine** : clôture du cycle d'ingénierie paramétrique (Forge Chirurgicale = NULL RESULT scellé, commit `996de446`) · **Famille** : EMP-16 (preuve avant moteur), EMP-19 (calibration per-LLM), advisory/shadow.

## 1. Pourquoi ce pivot (le constat empirique)
La Forge Chirurgicale a testé, à longueur constante (thermostat de masse, 12/12 OK) et avec un juge calibré non biaisé (gemma4 `ecfb32d6`), **4 leviers Rosetta structurels/lexicaux** isolés (TTR, compression, contraste, rareté des bigrammes). Résultat dur : **0/12 victoire au juge**, Δradar tous **sous le seuil maître (+0.0044)** et instables en signe. Conclusion mécanique :

> Les métriques paramétriques gèrent la **plomberie** (nettoyer un mauvais texte) ; elles ne **créent pas** la qualité maître. L'écart pulp→maître n'est pas principalement lexical/métrique — il est sémantique : sous-texte, nécessité interne, focalisation, densité de pensée, voix.

Une directive chiffrée (« TTR 0.8 », « plus longue phrase 3× la plus courte ») ne peut pas injecter de la profondeur sémantique à la volée. **L'empilement (fusion combinée) est formellement interdit** : quatre micro-effets instables → sur-correction (« salade lexicale », précédent Mode C TOXIQUE).

## 2. Principe de la forge mimétique
Plutôt que de **décrire** mathématiquement la grandeur au LLM, on la lui **montre** par exemplaire (mimétisme few-shot / RAG littéraire) :

> « Voici un extrait que tu as généré. Voici un extrait de tonalité comparable écrit par un Maître. Analyse l'implicite et la densité sémantique de l'extrait humain, et élève ta prose à ce standard — sans copier ni changer ton histoire. »

Le LLM est un moteur de mimétisme : il a appris la grandeur par exposition, pas par formule. On rebranche cette capacité au lieu de la contraindre par paramètres.

### Ressource existante
`packages/omega-p0/corpus/human/*-style.txt` : 10 exemplaires de style (Flaubert, Modiano, Proust, Camus, Duras, NDiaye, Gracq, Tournier, Echenoz, Ernaux). Pastiches originaux courts (~70-90 mots), déjà versionnés, couvrant un spectre tonal (plat/factuel Ernaux ↔ ample/sensoriel Proust). Servent de banque de références mimétiques.

## 3. Architecture cible (référentielle, non paramétrique)
1. **Sélection de l'exemplaire** : matcher la tonalité de la scène OMEGA à un exemplaire maître (par radar bge-m3 / proximité d'embedding, ou par tag tonal). Évite de prescrire du Proust à une scène d'action sèche.
2. **Prompt mimétique** : prose OMEGA + exemplaire maître + consigne d'élévation (analyse de l'implicite, pas de copie, même événements, longueur tenue).
3. **Garde-fous** (hérités) : thermostat de masse ±10 %, pas de résumé, pas de changement d'événements, best-of-N, juge calibré + radar avant/après.
4. **Advisory only** : aucun gate, aucun SEAL, aucune modif moteur. Sélection, pas génération forcée.

## 4. Fork stratégique LAISSÉ OUVERT (décision Architecte après N7)
Deux voies pour « élever durablement » la prose vers le maître :

| Voie | Mécanisme | Coût | Réversibilité | Calibration |
|---|---|---|---|---|
| **A — Mimétisme contextuel (RAG few-shot)** | exemplaire maître injecté **en contexte** à la génération ; poids du LLM inchangés | faible (pas d'entraînement) | totale | profil EMP-19 inchangé (même modèle/poids) |
| **B — Adaptateur LoRA sur corpus maîtres** | petit adaptateur entraîné → modifie **les poids** du générateur vers le style maître | élevé (data + train + eval) | partielle (adapter détachable) | **recalibration EMP-19 complète** (nouveau couple modèle+poids) |

**Décision repoussée** : on tranche A vs B **après** avoir vu les résultats de **N7 (forge sémantique causale)**. Si un levier sémantique en contexte (dont le few-shot mimétique) franchit le mur maître de façon stable, la voie A suffit et B devient optionnelle. Sinon, B (modification profonde des poids) devient le candidat sérieux.

## 5. Lien avec N7 (test empirique immédiat)
Le few-shot mimétique n'est pas qu'un concept : il est **testé dès N7** comme l'un des leviers sémantiques isolés (cf `scripts/metrology/n7_forge_semantique.py`). N7 décide si « montrer un maître » bat « régler des métriques ». Ce spec sera mis à jour avec le verdict N7.

## VERDICT
- Statut : DRAFT (conceptuel, non décisionnel). Confiance : Haute sur le diagnostic (null result paramétrique prouvé), Moyenne sur l'efficacité mimétique (à prouver en N7).
- Forces : pivot fondé sur une preuve empirique propre ; réutilise une ressource existante (10 exemplaires) ; advisory/réversible ; fork A/B explicite et non tranchée prématurément.
- Faiblesses : (1) sélection d'exemplaire par tonalité non encore spécifiée formellement ; (2) risque de mimétisme de surface (le LLM copie le lexique du maître sans la profondeur) — à surveiller au juge en N7 ; (3) coût/calibration de la voie B non chiffrés.
- Risques restants : few-shot peut induire copie/plagiat de tournures → garde-fou « ne copie pas, élève » + contrôle répétitions ; tonalité mal matchée → dégradation.
- Action requise : exécuter N7 ; revenir trancher la fork A/B sur données. Aucune implémentation moteur tant que N7 n'a pas montré un levier sémantique qui passe.
