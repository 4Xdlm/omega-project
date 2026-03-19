# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA SESSION — PHASE R0 (PRÉPARATION CORPUS)
# Prompt Claude Code — Version FINALE fusionnée
# Structure : ChatGPT | Contenu technique : Claude | Détails : Gemini
# ═══════════════════════════════════════════════════════════════════════════════
#
# Standard    : NASA-Grade L4 / DO-178C Level A
# Autorité    : Francky (Architecte Suprême)
# Périmètre   : STRICTEMENT Phase R0 — PAS R1, PAS R2
# Convergence : Claude + ChatGPT + Gemini
#
# ═══════════════════════════════════════════════════════════════════════════════

Tu travailles sous autorité absolue de Francky, Architecte Suprême.
Tu opères sous standard OMEGA / NASA-Grade L4 / DO-178C Level A.
Tu dois respecter strictement la CHARTE PHASE R.

═══════════════════════════════════════════════════════════════
0. DOCUMENTS À LIRE AVANT TOUTE ACTION
═══════════════════════════════════════════════════════════════

Lis intégralement et prends en compte, dans cet ordre :

1. `docs/SESSION_SAVE_2026-03-18_VRECAL1_TO_PHASE_R.md`
2. `docs/OMEGA_PHASE_R_ROADMAP.md`
3. `docs/OMEGA_PHASE_R_PLAN.md`
4. `docs/OMEGA_REFONDATION_METROLOGIQUE_DOSSIER.md`

Si ces fichiers ne sont pas dans `docs/`, chercher dans la racine du repo
`C:\Users\elric\omega-project\` ou dans `omega-autopsie/`.

Ces documents sont la base contractuelle active de la Phase R.

═══════════════════════════════════════════════════════════════
1. RÈGLES NON NÉGOCIABLES (CHARTE PHASE R)
═══════════════════════════════════════════════════════════════

R-01 : CHAQUE PHASE = UNE CONVERSATION DISTINCTE
  → Cette conversation est R0. PAS R1. PAS R2.
  → Tu NE LANCES PAS d'analyse multi-fenêtre ici.

R-02 : DÉBUT = BILAN DE COMPRÉHENSION, FIN = SESSION_SAVE
  → Tu commences par un bilan structuré.
  → Tu termines par SESSION_SAVE + rapport + message de redémarrage R1.

R-03 : ZÉRO APPRÉCIATION — QUE DU CALCUL EMPIRIQUE
  → Chaque valeur sera dérivée du corpus en R1.
  → En R0, les valeurs provisoires sont marquées PROVISOIRE.

R-04 : AUCUNE LIMITE DE TAILLE
  → Œuvres analysées dans leur ENTIÈRETÉ.
  → Chapitres réels complets, quelle que soit la taille.
  → Sagas = analyse multi-tomes avec moyennes.

R-05 : 3 LANGUES — FR + EN + ES (originaux uniquement)
  → Les traductions sont EXCLUES du calcul des constantes.

R-06 : 5 NIVEAUX — Phrase | Scène | Chapitre | Arc | Œuvre

R-07 : RECONNAISSANCE DU TYPE DE TEXTE
  → Description | Dialogue | Action | Introspection | Transition

R-08 : COEFFICIENT DE CONFIANCE SUR CHAQUE SCORE

R-09 : MOTEUR GELÉ — NE PAS MODIFIER :
  engine.ts, damage-gate.ts, micro-surgeon.ts, config.ts

R-10 : COMMIT + TAG À CHAQUE FIN DE PHASE

Si une demande entre en conflit avec ces règles, TU APPLIQUES LES RÈGLES.

═══════════════════════════════════════════════════════════════
2. CONTEXTE — POURQUOI PHASE R EXISTE
═══════════════════════════════════════════════════════════════

La conclusion validée par convergence 3/3 IAs + Francky :

- Le plafond 91-92 n'est PAS un plafond du moteur, c'est un plafond de la MESURE
- 16/16 features sont instables à 300 mots (gain de stabilité 1.7× à 9.6× en chapitre)
- Certaines features changent de valeur MOYENNE entre échelles (+73% f25g, +95% f30d)
- Les coefficients actuels sont fixes alors qu'ils devraient être proportionnels
  à la taille, à la position, et au type de texte
- Phase R remplace une métrologie bench-driven par une métrologie corpus-driven

Tu ne dois PAS contester ce cadrage. Tu dois l'opérationnaliser.

═══════════════════════════════════════════════════════════════
3. MISSION R0 — PÉRIMÈTRE STRICT
═══════════════════════════════════════════════════════════════

R0 prépare le corpus et les outils pour R1.
R0 NE LANCE PAS d'analyse multi-fenêtre.
R0 NE CALCULE PAS de constantes.

R0 doit produire :

1. L'audit et la modification de full_work_analyzer → v5
   (suppression des limites de taille, ajout du support multi-fenêtre)
2. L'inventaire complet du corpus FR + EN + ES avec classification
3. L'identification des sagas / ensembles multi-tomes
4. Le plan d'extraction formalisé pour les 5 niveaux
5. La stratégie de parsing des chapitres réels + topologie (ponctuation, P_rel)
6. Les prérequis techniques pour R1 et R2

═══════════════════════════════════════════════════════════════
4. CE QUE TU FAIS IMMÉDIATEMENT — BILAN DE COMPRÉHENSION
═══════════════════════════════════════════════════════════════

Après lecture des 4 documents, tu produis un BILAN DE COMPRÉHENSION :

A1. Compréhension de la Phase R
  - Objectif général
  - Pourquoi la refondation est nécessaire
  - Différence ancienne logique vs nouvelle logique

A2. Règles gelées
  - Liste des contraintes non négociables
  - Ce que tu n'as pas le droit de modifier

A3. Périmètre exact de R0
  - Ce qui appartient à R0
  - Ce qui n'appartient PAS à R0
  - Dépendances R1, R2, R3, R4, R5

A4. Livrables exacts attendus en fin de R0
  - Fichiers, données, rapport, SESSION_SAVE, message redémarrage

A5. Risques / ambiguïtés à clarifier
  - Uniquement réels, pas de fausse question

Tu termines par :
"EN ATTENTE DE VALIDATION FRANCKY — AUCUNE ACTION LANCÉE"

Puis tu t'arrêtes. Tu n'exécutes RIEN avant validation.

═══════════════════════════════════════════════════════════════
5. APRÈS VALIDATION — EXÉCUTION R0
═══════════════════════════════════════════════════════════════

Une fois validé par Francky, tu exécutes les tâches suivantes :

### R0-1 : AUDIT DU CODE D'ANALYSE

Fichier : `C:\Users\elric\omega-project\omega-autopsie\full_work_analyzer_v4.py`

Localiser et lister TOUTES les limites artificielles :
- CHAPTER_MAX_WORDS = 7000 → SUPPRIMER
- CHAPTER_MIN_WORDS = 1500 → GARDER (un chapitre < 1500 mots = pas un vrai chapitre)
- GATE_MIN_WORDS = 15000 → ÉVALUER (certaines nouvelles longues < 15k sont valides)
- SCENE_WORDS = 300 → GARDER mais ajouter les fenêtres supplémentaires
- N_CHAPTERS = 5 → SUPPRIMER LA LIMITE — analyser TOUS les chapitres
- N_RANDOM = 10 → AUGMENTER proportionnellement à la taille de l'œuvre

Produire `full_work_analyzer_v5.py` avec :
- Chapitres réels complets (aucune troncature)
- Tous les chapitres (pas seulement 5)
- Support des fenêtres multi-échelle pour R1 :
  30 | 150 | 300 | 600 | 1000 | 1500 | 2500 | 5000 | 10000 | 20000 | chapitre réel | œuvre
- Calcul de P_rel pour chaque chapitre
- Extraction hooks (100 premiers mots) et cliffhangers (100 derniers)
- Ratios de ponctuation par chapitre
- Gestion mémoire pour les gros romans (streaming, pas tout en RAM)

NE PAS modifier le code moteur sovereign-engine.

### R0-2 : INVENTAIRE CORPUS

Scanner les sources disponibles :
- PDFs : `C:\Users\elric\Downloads\livre\` (~300+ fichiers)
- Gutenberg cache : `C:\Users\elric\omega-project\omega-autopsie\gutenberg_cache\` (~180+ fichiers)
- Résultats v4 : `C:\Users\elric\omega-project\omega-autopsie\results_v4\` (158 œuvres analysées)

Pour chaque fichier, classifier :
- Langue ORIGINALE (FR / EN / ES)
- Est-ce un original ou une traduction ?
- Est-ce de la littérature exploitable ? (exclure : manuels, essais purs, théâtre pur, poésie pure)

Corpus espagnol existant dans gutenberg_cache :
  cervantes_quijote, galdos_fortunata, galdos_perfecta, galdos_misericordia,
  clarin_regenta_1+2, unamuno_niebla, unamuno_san_manuel, baroja_arbol,
  valle_inclan_sonata, azorin_voluntad, becquer_leyendas, valera_pepita,
  isaacs_maria, quiroga_cuentos, pardo_bazan_pazos, pereda_sotileza,
  alarcon_sombrero, lazarillo

Corpus espagnol dans livre/ (PDFs/EPUBs) :
  pedro_paramo.pdf (Rulfo — ORIGINAL ES)
  + scanner tous les fichiers "Spanish_Edition" pour classifier original vs traduction

Œuvres ES à télécharger depuis Gutenberg (si pas déjà en cache) :
  Galdós œuvres supplémentaires, Blasco Ibáñez, Emilia Pardo Bazán compléments

Produire : `OMEGA_CORPUS_R0.json`
```json
{
  "corpus": [
    {
      "work_id": "flaubert_bovary",
      "title": "Madame Bovary",
      "author": "flaubert",
      "language": "fr",
      "is_original": true,
      "corpus_tag": "FR-ORIG",
      "source": "pdf",
      "source_path": "C:\\Users\\elric\\Downloads\\livre\\Madame_Bovary_-_Gustave_Flaubert.pdf",
      "year": 1857,
      "saga_id": null,
      "word_count": null,
      "chapter_count": null,
      "status": "READY"
    }
  ],
  "summary": {
    "total": 0,
    "fr_original": 0,
    "en_original": 0,
    "es_original": 0,
    "excluded_translations": 0,
    "excluded_non_literary": 0,
    "sagas_identified": 0
  }
}
```

### R0-3 : IDENTIFICATION DES SAGAS

Regrouper les œuvres multi-tomes :

```
PROUST_RECHERCHE : Du côté de chez Swann, À l'ombre des jeunes filles en fleurs, ...
ZOLA_ROUGON : La Fortune des Rougon, La Curée, Le Ventre de Paris, ...
BALZAC_COMEDIE : Le Père Goriot, Eugénie Grandet, Illusions Perdues, ...
HUGO_MISERABLES : Tome 1, Tome 2 (si séparés)
TOLKIEN_LOTR : (si présent dans le corpus)
FERRANTE_NAPLES : L'Amie Prodigieuse, ...
```

### R0-4 : PLAN D'EXTRACTION MULTI-NIVEAUX

Formaliser le protocole pour R1 :

| Niveau | Unité | Taille | Échantillons par œuvre | Méthode |
|--------|-------|--------|----------------------|---------|
| N1 PHRASE | Phrase | 10-40 mots | 100 phrases aléatoires | Split par ponctuation forte |
| N2 SCÈNE | Fenêtre | 300, 600, 1000, 1500 mots | 20 par taille | Fenêtre glissante, distribué |
| N3 CHAPITRE | Chapitre réel | Variable | TOUS les chapitres | split_chapters |
| N4 ARC | Multi-chapitres | 3-5 chapitres consécutifs | 3-5 arcs par œuvre | Regroupement séquentiel |
| N5 ŒUVRE | Texte complet | Variable | 1 | Texte intégral |

Marquer toutes les valeurs de taille comme PROVISOIRE → seront confirmées en R1.

### R0-5 : CLASSIFICATION DES TYPES DE PASSAGE

Définir les heuristiques de détection automatique :

```python
def classify_passage(text, features):
    """
    Heuristiques FR + EN + ES :
    DIALOGUE : ratio guillemets/tirets > 0.05, mots/phrase < 12, ¶ courts
    ACTION : f5a_verb_density > 0.06, f18a_fragment_rate > 0.60, mots/phrase < 14
    DESCRIPTION : f25g > 0.50, mots/phrase > 16, faible densité verbale
    INTROSPECTION : f27d_modal > 0.30 OU f28d_sil > 0.05, 1ère/3ème personne
    TRANSITION : f12b_tense_switch > 0.15, faible tension
    """
```

Les seuils sont PROVISOIRES et seront recalibrés en R1.

### R0-6 : PRÉREQUIS TECHNIQUES R1/R2

Vérifier que l'environnement est prêt :
- Python 3.10+ disponible
- PyMuPDF ou pdfplumber pour les PDFs
- ebooklib pour les EPUBs
- Assez d'espace disque pour les résultats (~500 MB estimés)
- Gestion mémoire : les romans de 350k+ mots (War and Peace, 2666) doivent
  être traitables sans OOM — utiliser du streaming si nécessaire

═══════════════════════════════════════════════════════════════
6. FORMAT DU RAPPORT R0
═══════════════════════════════════════════════════════════════

À la fin de R0, produire un rapport avec exactement ces sections :

1. Résumé exécutif R0
2. Modifications apportées au code d'analyse (diff résumé)
3. Corpus final retenu (FR / EN / ES — comptes)
4. Sagas identifiées (liste)
5. Limites supprimées (avant → après)
6. Plan d'extraction multi-niveaux formalisé
7. Heuristiques de classification de passages
8. Prérequis R1 validés / manquants
9. Points PROVISOIRE à confirmer en R1
10. Décisions prises et justifications
11. Livrables produits (avec chemins)
12. Message de redémarrage exact pour R1

═══════════════════════════════════════════════════════════════
7. LIVRABLES OBLIGATOIRES R0
═══════════════════════════════════════════════════════════════

À la fin de R0, les fichiers suivants doivent exister :

- [ ] `omega-autopsie/full_work_analyzer_v5.py`
- [ ] `omega-autopsie/OMEGA_CORPUS_R0.json`
- [ ] `docs/SESSION_SAVE_R0.md`
- [ ] `docs/OMEGA_R0_REPORT.md`
- [ ] Commit + tag `phase-r0-complete` dans le repo

Si un livrable n'est pas prêt → le signaler explicitement.

═══════════════════════════════════════════════════════════════
8. STYLE ET DISCIPLINE
═══════════════════════════════════════════════════════════════

- Pas de flatterie, pas de storytelling
- Pas d'approximation verbale
- Toute hypothèse = HYPOTHÈSE
- Toute valeur non démontrée = PROVISOIRE ou UNPROVEN
- Toute modification = minimale, motivée, localisée
- Toute sortie = exploitable par Francky sans réinterprétation

═══════════════════════════════════════════════════════════════
9. INSTRUCTION — COMMENCE MAINTENANT
═══════════════════════════════════════════════════════════════

1. Lis les 4 documents
2. Produis le BILAN DE COMPRÉHENSION (sections A1 à A5)
3. Termine par : "EN ATTENTE DE VALIDATION FRANCKY — AUCUNE ACTION LANCÉE"
4. STOP — n'exécute RIEN avant validation
