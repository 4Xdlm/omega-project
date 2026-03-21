# ═══════════════════════════════════════════════════════════════════════════════
# 🚀 OMEGA SESSION — PHASE R-8 : PHYSIQUE LITTÉRAIRE
# ═══════════════════════════════════════════════════════════════════════════════

Version: post v1.0-phase-r-sealed
Dernier état: SESSION_SAVE_PHASE_R_FINAL.md
Branche: phase-r-metrology-rebuild
Objectif: DÉMARRER LA PHASE R-8 (Normalisation Typologique Pondérée)

Architecte Suprême: Francky
IA Principal: Claude

# CONTEXTE CRITIQUE — LIS AVANT TOUTE ACTION

La Phase R (Refondation Métrologique) vient d'être SCELLÉE (tag v1.0-phase-r-sealed).

## CE QUI S'EST PASSÉ
Le scorer R6 original mettait GPT (61.56) au-dessus de Flaubert (50.52).
En 20h de travail, on a :
- Analysé 611 œuvres (67M+ mots)
- Identifié 15 features TROMPEUSES (le LLM scorait plus haut que les classiques)
- Créé 5 features de profondeur (f_pov_shift ×3.6, f_subordination ×4.4)
- Créé 21 features sémantiques
- Construit un Gradient Boosting à 42 features (Spearman 0.79, 19/2780 inversions)
- PROUVÉ le Principe d'Endurance : 11/11 maîtres montent avec l'échelle, tous les LLM chutent
- Le gap Opus-Flaubert S'INVERSE à 2000 mots

## LE TRIBUNAL OMEGA v1 (OPÉRATIONNEL)
- Scorer : GB 42 features à 2000 mots (Spearman 0.79)
- Pente d'endurance : flag diagnostique (maîtres +0.45, LLM -0.28)
- Classifieur de passage : 5 types vectorisés (action/narration/description/dialogue/introspection)
- Score de confiance : VERIFIED_STRONG / VERIFIED / NON_VERIFIABLE
- Corpus : 611 œuvres classées en tiers S/A/B/C/D

## CE QUI MANQUE (POURQUOI R-8)
Le scorer compare les textes à une MOYENNE GLOBALE. Il devrait comparer chaque 
texte à ce qu'un MAÎTRE ferait avec CE MIX EXACT de types de passages.

Exemple : un passage 42% action / 28% narration / 17% description / 13% dialogue 
devrait être comparé à la CIBLE pour ce mix, pas à la moyenne de tout le corpus.

# ═══════════════════════════════════════════════════════════════════════════════
# DOCUMENTS À LIRE — ORDRE DE PRIORITÉ
# ═══════════════════════════════════════════════════════════════════════════════

## PRIORITÉ 1 — OBLIGATOIRE AVANT TOUTE ACTION
1. docs/OMEGA_PROTOCOLE_ANALYSE_COMPLET.md
   → LE guide permanent. Explique TOUT : features, scorer, endurance, formules,
   procédures, ce qui est interdit. ~500 lignes. LIS TOUT.

2. docs/OMEGA_REFONDATION_METROLOGIQUE_DOSSIER.md
   → Synthèse des 5 visions + PLAN R-8 COMPLET en 7 étapes.
   → Contient L'ÉQUATION CIBLE et les 6 principes fondateurs.

3. docs/SESSION_SAVE_PHASE_R_FINAL.md
   → État exact au scellement. Commits, scores, limites, prochaines phases.

## PRIORITÉ 2 — CONTEXTE TECHNIQUE
4. docs/OMEGA_PHASE_R7_ENDURANCE_REPORT.md
   → Courbes d'endurance 18 sources × 6 échelles. La PREUVE.

5. docs/OMEGA_PHASE_R_R6B_TRIBUNAL_DE_CONTREFACON.md
   → Rapport R-6b. GB vs Ridge. Features sémantiques.

6. docs/OMEGA_PHYSIQUE_LITTERAIRE_v3.md
   → Recherche académique : comment les prix littéraires jugent,
   méthode Flaubert, grille Vaezi & Rezaei.

## PRIORITÉ 3 — DONNÉES
7. omega-autopsie/results_phase_r/R4_FEATURE_AUDIT_REPORT.md
   → Quelles features discriminent, lesquelles trompent.

8. omega-autopsie/results_phase_r/R7_ENDURANCE_CURVES.json
   → Données brutes des courbes d'endurance.

9. omega-autopsie/results_phase_r/R7_PRESEAL_AUDIT.json
   → 5 audits pré-scellement (corrélation longueur, tier D, etc.)

# ═══════════════════════════════════════════════════════════════════════════════
# MISSION : PHASE R-8 — NORMALISATION TYPOLOGIQUE PONDÉRÉE
# ═══════════════════════════════════════════════════════════════════════════════

## L'ÉQUATION À IMPLÉMENTER

```
f_attendu = Σ(pi × λi,f × Ci,f) + Σ(pi × pj × γij,f) + Σ(Tk)
```

Où :
- pi = proportion du type i dans la scène (vecteur du classifieur)
- Ci,f = constante du type pur i pour la feature f (MESURÉE)
- λi,f = coefficient d'influence du type i sur la feature f (APPRIS)
- γij,f = terme d'interaction entre types i et j (APPRIS)
- Tk = effets de seuils de basculement

## LES 7 ÉTAPES DE R-8

| Étape | Quoi | Effort |
|-------|------|--------|
| R-8.1 | Profils purs par type (constantes Ci,f) | 1h |
| R-8.2 | Validation de l'additivité | 30min |
| R-8.3 | Coefficients d'influence λi,f | 1h |
| R-8.4 | Matrice d'interactions γij,f | 1h |
| R-8.5 | Seuils de basculement Tk | 30min |
| R-8.6 | Score d'assemblage (Loi des LEGO) | 2h |
| R-8.7 | Scorer final intégré | 1h |

## PRINCIPES FONDATEURS (SCELLÉS)

1. "Les coefficients sont APPRIS, JAMAIS inventés à la main."
2. "Chaque score vient avec son niveau de confiance et son échelle."
3. "Une scène ne se juge pas seule mais par sa contribution à la structure."
4. "Les features de RELATION comptent plus que les features ISOLÉES."
5. "On ne juge plus par la surface locale mais par la tenue dans la durée."
6. "La valeur d'une feature dépend de l'écosystème de la scène."

## INTERDICTIONS ABSOLUES
- Fixer des poids à la main
- Fixer des seuils arbitraires  
- Coder une conclusion
- Calibrer pour "faire gagner" un auteur
- Ignorer le holdout
- Accepter un Spearman < 0.5

# ═══════════════════════════════════════════════════════════════════════════════

RAPPEL:
- Lire les docs minutieusement AVANT d'agir
- Présenter un bilan de compréhension
- Attendre ma validation

Let's go! 🚀
