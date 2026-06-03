# S1C++ — REVUE HISTORIQUE (graveyard/PVI) + DESIGN CONTRÔLE DE CONFUSION + FULL CORPUS

**Date** : 2026-06-02 · **Auteur** : Claude Code · **Déclencheur** : Architecte (« pousser full corpus + vérifier qu'on n'a pas écarté trop vite ; PVI = ventes + époque + facteurs exogènes IA→SF »)
**Doctrine** : EMP-17 (HISTORICAL_WORK_RESPECT — ne jamais déprécier un travail sérieux ; mesures passées = preuves).

---

## 1. VÉRIFICATION « a-t-on écarté trop vite ? » (R-PHYSICS_HYPOTHESES_GRAVEYARD)

| Hypothèse | Statut | Preuve | Verdict reprise |
|---|---|---|---|
| H-EMO-01 émotion 14D prédit qualité | MORT | M1 ρ=−0.177 ; marginal 0.0% (reproduit R4) | Solide — ne pas rouvrir |
| H-EMO-02 marginal 14D > 0 | MORT | M2−M0 = 0.000 ; R4 +0.021 < 0.03 | Solide |
| H-RES-01 uncertainty_drop | RÉFUTÉ | ρ=−0.103 (inversé) | Solide (insight : incertitude = sophistication) |
| H-RES-02 tension_arc_ratio | RÉFUTÉ | ρ=+0.039, p=0.360 | Solide |
| H-RES-03 tension_slope | RÉFUTÉ | ρ=+0.016, p=0.710 | Solide |
| H-CROSS-01 tension=phrases courtes | RÉFUTÉ | r=+0.037, p=0.376 | Solide |
| **H-CROSS-02 mélancolie×subordination** | **RÉFUTÉ (sous seuil)** | **r=+0.079, p=0.061** | **REVISIT — borderline, presque significatif** |
| H-CROSS-03 choc×variance rythmique | RÉFUTÉ | r=−0.000, p=0.993 | Solide (zéro absolu) |
| H-CROSS-04 anti-cliché=anti-keyword | RÉFUTÉ (inversé) | ρ=+0.106 (artefact volume) | Solide |
| **H-PCA-01 émotion en PCA** | **MARGINAL** | **Δ+0.034 (juste > seuil, INSTABLE cross-langue)** | **REVISIT — re-tester avec embeddings/contrôles** |
| H-COMP-01/02 proxies tension/mélancolie | RÉFUTÉ | p=0.127 / sous-seuil | Solide |

**Verdict** : les rejets étaient **rigoureux** (stats + p-values), PAS hâtifs — SAUF **2 candidats à reprise** (H-CROSS-02 p=0.061 ; H-PCA-01 Δ+0.034 instable). Ces deux-là sont sub-threshold, pas nuls → à re-mesurer proprement (n plus grand, contrôles, embeddings) avant enterrement définitif. **Conforme à l'instinct Architecte : reprendre, pas jeter.**

## 2. PVI V2 — ce qu'il était vraiment
PVI V2 = **prédicteur de QUALITÉ** (corrélation au tier) : `PVI_v2 = CE_bell × Q_struct × R × penalty_v2`, Spearman +0.34 (ALL) / +0.49 (FR), Q_struct 12 features CALC. **Lignée directe de M0b** (devenu ρ=0.6138). **Ce n'était PAS un modèle de ventes/commercial.** Le contrôle « époque + facteurs exogènes » n'y figurait pas → c'est une **exigence neuve et justifiée** pour l'axe commercial (§3), pas une mesure « écartée ».

## 3. DESIGN — CONTRÔLE DE CONFUSION DE L'AXE COMMERCIAL (nouveau, OBJ1bis)
Les ventes brutes sont **confondues** par le temps et le marché. Un best-seller SF 2024 (boom IA) ≠ un best-seller 1990 à ventes égales. Modèle proposé :
- **Variables brutes** : `sales_total`, `sales_per_year_since_pub`, `review_volume` (PRIORITÉ — volume d'avis > note moyenne, cf. Gemini : un obscur 4.9/12 avis ≠ un best-seller 4.1/2.5M avis), `weeks_on_bestseller_list`, `translations_count`.
- **Variables de contrôle (confounds)** : `publication_year`, `era_bucket` (pré-1950 / 1950-1990 / 1990-2010 / 2010+), `exogenous_tags` ∈ {AI_SF_BOOM, BOOKTOK, SCREEN_ADAPTATION, PRIZE_BUMP, SERIES_FRANCHISE, PANDEMIC_READING}.
- **Cible dérivée** : `COMMERCIAL_POTENTIAL_norm` = percentile des ventes **dans la cohorte d'époque/genre**, et un flag `exogenous_driven` quand le succès est attribuable à un choc externe plutôt qu'au texte. → on isole le **potentiel commercial PORTÉ PAR LE TEXTE** du **bruit de marché**.
- **Usage** : carburant du futur Textual Commercial Potential (S4) — JAMAIS mélangé à l'axe prestige.

### 3bis. BASELINE DE MARCHÉ PAR DÉCENNIE (ajout Architecte — indispensable)
Les ventes ne sont PAS comparables d'une décennie à l'autre : le marché du livre lui-même change (alphabétisation, taille de la population lectrice, concurrence d'autres médias). Normaliser contre le **marché de l'époque** :
- **Variables de baseline par décennie/pays** : taux d'**alphabétisation/illettrisme**, **population lectrice** (taille du lectorat potentiel), **taille du marché du livre** (titres publiés/an, exemplaires/habitant), **concurrence média** (avènement TV ~1950s, **Internet ~1995**, smartphone ~2010, streaming ~2015, BookTok ~2020, IA générative ~2023).
- **Principe** : `sales_normalized = sales / market_baseline(decade, country, genre)`. Vendre 100k ex. en 1960 (petit marché, forte lecture, peu de concurrence) ≠ vendre 100k en 2024 (marché saturé, concurrence écrans). Un best-seller se mesure en **part du marché atteignable de son temps**, pas en chiffre brut.
- **Sources baseline** : UNESCO (alphabétisation historique), syndicats d'éditeurs (SNE France, AAP US — titres/ventes par an), données historiques de tirage. Collecte séparée (table `era_market_baseline.csv`), réutilisable pour toutes les œuvres.
- **Conséquence** : l'axe commercial sort 3 niveaux — `sales_raw` (brut), `sales_norm_era` (corrigé marché d'époque), `text_borne_potential` (corrigé marché ET chocs exogènes). Seul le 3ᵉ approche « ce que le TEXTE porte ».

## 4. SOURCE-HARDENING (corrections ChatGPT, adoptées)
- Toute fiche `CERTAIN` doit porter **≥1 source attachée** (ref + type + claim + date_checked). Sans source → statut `EXPERT_PRESELECTION` (pas CERTAIN).
- « absence d'empreinte » → `NO_EXTERNAL_PRESTIGE_SIGNAL_FOUND` (PROBABLE_LOW), **jamais** « prestige nul prouvé ».
- `COMMERCIAL_SCORE=ESTIMATED` → **interdit pour mesure fondatrice** ; RESEARCHED seulement.
- Couverture à rapporter : % prestige sourcé, % commercial sourcé, gaps.

## 5. FULL CORPUS — plan d'extension (réutilise l'existant)
- Dataset historique **réutilisable** : `OMEGA/outputs/corpus-analysis/per-work/<lang>/<tier|bestseller>/<id>_analysis.json` (1698 œuvres : text_features, depth_features, emotion_14d, pvi). + `CORPUS_FEATURES_MASTER.json`, `FULL_CORPUS_MANIFEST.json` (1334).
- Étendre le dossier 2-axes des 150 → **corpus complet** en joignant : (a) features texte historiques, (b) prestige sourcé (par auteur, batché), (c) commercial avec contrôle d'époque/exogène (§3).
- Batché, crash-safe, source_status explicite. Réutiliser plutôt que ré-extraire.

## VERDICT
- **Statut** : revue historique PASS (graveyard vérifié) ; 2 mesures à reprendre (H-CROSS-02, H-PCA-01) ; design confound commercial posé ; source-hardening adopté ; plan full-corpus défini.
- **Confiance** : Haute (graveyard + PVI lus en source).
- **Forces** : respecte EMP-17 (rien jeté à tort) ; corrige le naïf commercial (époque/exogène) ; réutilise 1698 fiches existantes.
- **Faiblesses** : (1) collecte sales/era/exogène = gros effort web (sources ventes peu fiables) ; (2) re-mesure H-CROSS-02/H-PCA-01 = bench à recoder ; (3) source-hardening rétroactif sur 96 fiches CERTAIN = travail.
- **Action requise** : dispatch — j'exécute en autonomie (full corpus + confound + hardening) par batchs, ou tu priorises un volet (commercial RESEARCHED d'abord ? reprise H-CROSS-02/PCA d'abord ? extension corpus d'abord ?).
