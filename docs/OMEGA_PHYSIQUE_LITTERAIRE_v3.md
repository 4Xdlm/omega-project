# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — DOSSIER DE RECHERCHE : PHYSIQUE LITTÉRAIRE v3
# Comment les académies jugent + Comment les maîtres construisent
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date         : 2026-03-21
# Statut       : RÉFÉRENCE — Base de la refondation métrologique
# Source       : Recherche web + retours 4 IAs + résultats R-4 + R-5bis
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# 1. COMMENT LES PRIX LITTÉRAIRES JUGENT

## Fait établi : il n'existe PAS de grille de notation universelle

Aucun prix majeur (Nobel, Goncourt, Booker, Pulitzer) n'utilise de barème
public chiffré. Les jurys fonctionnent par : procédure + jury compétent +
délibération + vote.

- Nobel : "qualité littéraire" + "universalité" (pouvoir au-delà des
  frontières linguistiques). Secret 50 ans. Chaque membre du comité rédige
  une évaluation approfondie de chaque finaliste.
- Goncourt : "le meilleur ouvrage d'imagination en prose". Vote oral,
  majorité absolue. 10 jurés permanents.
- Booker : "the best, in the opinion of the judges, eligible work".
  Jury tournant. Critère 2022 : "the skill with which writers shape and
  sustain those variously imagined worlds, and allow others to inhabit them".

## Critères IMPLICITES convergents (croisement de toutes les sources)

| Critère | Nobel | Goncourt | Booker | MFA/Workshops |
|---------|-------|----------|--------|---------------|
| Qualité de langue / style | OUI | OUI | OUI | OUI |
| Originalité / singularité | OUI | OUI | OUI | OUI |
| Profondeur de réflexion | OUI | OUI | - | OUI |
| Impact / émotion | - | OUI | OUI | OUI |
| Tenue du monde / cohérence | - | - | OUI (2022) | OUI |
| Portée humaine | OUI | - | OUI | OUI |
| Voix narrative | - | - | - | OUI |
| Caractérisation | - | - | - | OUI |
| Structure / architecture | - | - | - | OUI |

---

# 2. LA GRILLE ACADÉMIQUE FORMELLE (VAEZI & REZAEI 2018)

Seule grille FORMELLE validée par technique Delphi avec des experts en
creative writing. Publication : New Writing, Vol 16, No 3.

## Les 9 éléments d'évaluation de la fiction créative

1. VOIX NARRATIVE (Narrative Voice)
2. CARACTÉRISATION (Characterisation)
3. HISTOIRE (Story)
4. CADRE (Setting)
5. ATMOSPHÈRE ET AMBIANCE (Mood and Atmosphere)
6. LANGUE ET MÉCANIQUE (Language and Writing Mechanics)
7. DIALOGUE (Dialogue)
8. INTRIGUE (Plot)
9. IMAGE (Image)

## Mapping sur les features OMEGA

| Critère Vaezi | Feature existante | Feature R-5bis | MANQUANT |
|---------------|-------------------|----------------|----------|
| Voix narrative | f28b_irony (ρ=0.49) | f_pov_shift (×3.6!) | Signature lexicale unique |
| Caractérisation | - | - | Profondeur psychologique |
| Histoire | - | - | Cohérence macro |
| Cadre | f25g_description | - | Précision contextuelle |
| Atmosphère | f25c_time_suspension | - | Densité émotionnelle |
| Langue | f1_mean, f29d | f_subordination_depth (×4.4!) | Mot juste contextuel |
| Dialogue | - | - | Naturalité dialogue |
| Intrigue | f35c_hook, f36c_cliff | - | Arc narratif |
| Image | f25a_description | - | Précision visuelle |

---

# 3. LA MÉTHODE FLAUBERT (CRITIQUE GÉNÉTIQUE)

Sources : BnF, Cambridge Companion, OpenEdition, Gallica.

## Les 5 phases de construction

### Phase 1 : Le "Vieux Plan" (Immersion documentaire)
- Lecture massive (100+ livres pour Salammbô)
- Notes factuelles + notes d'imaginaire
- "Voir" les personnages avant de les nommer

### Phase 2 : Le Scénario (Architecture narrative)
- Variables x, y, z pour lieux/personnages non fixés
- Notes des "articulations" : transitions tension → tension
- Scénarios d'ensemble → partiels → ponctuels

### Phase 3 : Brouillons Étendus (Expansion)
- Écrire "trop" — déployer toutes les possibilités
- Premières tentatives de SIL
- Pages épaisses de corrections et insertions

### Phase 4 : La Condensation (Le cœur du génie)
- "Une page réduite à une phrase"
- Le Mot Juste : pas le mot rare, le mot NÉCESSAIRE
- Suppression, déplacement, compression
- Le détail exact sacrifié si le style l'exige

### Phase 5 : Le Gueuloir (Validation acoustique)
- Chaque phrase lue à voix haute
- Traque des assonances parasites, rimes internes
- Test du rythme respiratoire
- Pas du folklore — un test technique de dissonance

## Techniques spécifiques

### Style Indirect Libre (SIL)
- Suppression des verbes de déclaration ("il pensa que")
- Fusion pensée/narration sans changer de pronom
- Ex: "Elle se repentit. Sans doute, il allait faire des conjectures..."
  ("sans doute" = voix du personnage, structure = narrative)

### Impersonnalité
- "L'auteur doit être comme Dieu : présent partout, visible nulle part"
- Pas d'opinion du narrateur, pas de commentaire

### Architecture par compression
- Pas "écrire beau" mais couper, déplacer, condenser, réordonner
- L'effet fort n'est pas "une belle phrase" mais "un déclenchement
  préparé par structure"

---

# 4. CE QUE R-4 ET R-5bis ONT PROUVÉ

## Features qui SÉPARENT le génie du LLM (R-4 + R-5bis)

### Profondeur syntaxique (R-5bis — NOUVELLE)
| Feature | Flaubert | Riviera | GPT | Ratio F/R |
|---------|----------|---------|-----|-----------|
| f_subordination_depth | 0.83 | 0.19 | 0.42 | ×4.4 |
| f_pov_shift_rate | 0.36 | 0.10 | 0.15 | ×3.6 |
| f_clause_per_sentence | 1.61 | 1.16 | 1.43 | ×1.39 |

### Profondeur narrative (R-4)
| Feature | Tier S | Tier C | Ratio S/C |
|---------|--------|--------|-----------|
| f26b_long_sent_rate | 0.123 | 0.013 | ×9.5 |
| f28b_irony_density | 0.120 | 0.026 | ×4.6 |
| f27a_epistemic_rate | 11.47 | 4.74 | ×2.4 |
| f9a_contradiction | 0.982 | 0.467 | ×2.1 |
| f1a_rhythm_variance | 16.68 | 8.30 | ×2.0 |

### Features TROMPEUSES (R-4 — le LLM score PLUS HAUT)
| Feature | Tier S | Tier C | Direction |
|---------|--------|--------|-----------|
| f17_knife_count | 6.17 | 10.96 | C > S |
| f29d_ttr_score | 0.710 | 0.726 | C > S |
| f35c_hook_score | 0.531 | 0.649 | C > S |
| f36c_cliff_score | 0.631 | 0.667 | C > S |

---

# 5. LA CORRESPONDANCE TECHNIQUE FLAUBERT → FEATURES OMEGA

| Technique Flaubert | Ce que ça produit | Feature qui le capte |
|--------------------|-------------------|----------------------|
| Gueuloir | Musicalité, euphonie | f1a_rhythm_variance ✅ |
| SIL (glissement POV) | Distance narrative | **f_pov_shift** ✅ (×3.6) |
| Condensation ("page→phrase") | Densité | f_clause_per_sentence ✅ |
| Mot Juste | Précision contextuelle | MANQUANT (pas le TTR) |
| Emboîtement syntaxique | Subordination profonde | **f_subordination_depth** ✅ (×4.4) |
| Impersonnalité | Absence de commentaire | f28b_irony ✅ (distance) |
| Architecture dramaturgique | Tension préparée | f9a_contradiction ✅ |
| Phrases longues maîtrisées | Souffle | f26b_long_sent_rate ✅ (×9.5) |

**7 techniques sur 8 sont captées par nos features actuelles + R-5bis.**

---

# 6. LES 3 COUCHES DU SCORER OMEGA

## Couche 1 — MICRO-PHYSIQUE DE PROSE (largement couverte)
- Rythme, longueur, contraste, répétition, ponctuation
- Features : f1_*, f15b, f16a, f17, f24*, f29d, f33*

## Couche 2 — PHYSIQUE ROMANESQUE (partiellement couverte après R-5bis)
- Subordination, POV shifts, clauses, variance locale
- Features : f_subordination_depth, f_pov_shift, f_clause_per_sentence
- MANQUANT : structure de scène, gestion désir/obstacle, rapport scène/résumé

## Couche 3 — VALEUR LITTÉRAIRE HAUTE (non couverte)
- Singularité, profondeur morale, épaisseur humaine, nécessité du livre
- NON RÉDUCTIBLE à des métriques simples
- Approchable par : combinaisons de features + évaluation experte

---

# 7. FEATURES À CRÉER (PRIORITÉ)

| Feature | Ce qu'elle mesure | Justification |
|---------|-------------------|---------------|
| f_semantic_density | Ratio mots sémantiques / mots outils | "L'anti-gras" de Flaubert |
| f_register_divergence | Variation de registre inter-paragraphe | Polyphonie (Cohen, Joyce) |
| f_phonetic_collision | Rimes internes involontaires | Le gueuloir automatisé |
| f_subtext_gap | Écart sémantique dialogue / narration | Le "plan caché" de Iowa |
| f_necessity_index | Perte de sens par retrait de mots | Le test du "mot juste" |

---

# 8. DÉCISIONS

| # | Décision | Statut |
|---|----------|--------|
| 1 | Le scorer doit mesurer la PROFONDEUR, pas la SURFACE | VERROUILLÉ |
| 2 | Les techniques de Flaubert sont traduisibles en features | PROUVÉ |
| 3 | f_pov_shift et f_subordination_depth sont les features les plus discriminantes | PROUVÉ |
| 4 | Le TTR, le hook et le cliff sont des features TROMPEUSES | PROUVÉ |
| 5 | La grille Vaezi (9 éléments) est le référentiel académique formel | ADOPTÉ |
| 6 | Les 3 couches (micro-prose / romanesque / valeur haute) structurent le scorer | ADOPTÉ |

---

*OMEGA — Dossier de Recherche Physique Littéraire v3*
*2026-03-21 — Phase R*
*"On ne mesure plus la banalité bien répartie. On mesure la maîtrise."*
