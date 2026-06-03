# S1C+ — EXTERNAL RECEPTION DOSSIER — SCHÉMA & RUBRIQUE

**Date** : 2026-06-02 · **Auteur** : Claude Code · **Statut** : EN COURS · **Convergence** : Tribunal 3-IA (Gemini + ChatGPT + Claude)
**Mandat Architecte** : classifier les œuvres sur preuves externes, ne pas faire d'erreur de jugement. **Avant S1D.**

> **Loi cardinale (Gemini + ChatGPT) : NE JAMAIS fondre les signaux en un score unique.** Deux axes ORTHOGONAUX, séparés à jamais.

---

## 1. DEUX AXES ORTHOGONAUX (jamais mélangés)

### AXE A — PRESTIGE LITTÉRAIRE (vérité-terrain OBJ1 / qualité)
Signaux **non corrélés à la popularité** :
- `canonical_status` 0-5 : reconnaissance dans l'histoire littéraire (encyclopédies, programmes scolaires/universitaires, anthologies, Pléiade, bibliothèques nationales).
- `award_signal` 0-5 / null : prix majeurs (Nobel, Goncourt, Renaudot, Femina, Pulitzer, Booker…). **null si œuvre ancienne pré-prix — ne JAMAIS pénaliser** (Flaubert n'a pas de Goncourt).
- `academic_signal` 0-5 : volume d'études universitaires (thèses, articles, Google Scholar/JSTOR), analyses de style.
- `critical_reception` -2..+2 : presse littéraire sérieuse (Le Monde des Livres, NYT Books, NRF…).
- `longevity_signal` 0-5 : survie historique (toujours lu/réédité après décennies).
→ **PRESTIGE_SCORE** = agrégat pondéré (canonical + academic + longevity dominants ; award bonus, jamais malus).

### AXE B — IMPACT COMMERCIAL (vérité-terrain OBJ1bis / succès)
Signaux **de popularité — JAMAIS utilisés pour définir une cellule MASTER** :
- `commercial_impact` 0-5 : ventes, semaines en listes best-sellers (NYT/Figaro), tirages.
- `public_rating` (note moyenne Goodreads/Babelio) + `public_volume` (nb d'avis) + `polarization` (écart-type/division).
→ **COMMERCIAL_SCORE** = agrégat (volume × note, pondéré par fiabilité de la source).

**Règle d'or** : `PRESTIGE_SCORE` et `COMMERCIAL_SCORE` sont stockés et utilisés SÉPARÉMENT. Un Musso = COMMERCIAL haut / PRESTIGE bas. Flaubert = PRESTIGE max / COMMERCIAL variable. Carrère = les deux hauts. **Le placement MASTER dépend EXCLUSIVEMENT de l'axe A.**

---

## 2. FICHE ŒUVRE (JSON, par entrée du Gold-Set)
```json
{
  "work_id": "...", "author": "...", "title": "...",
  "language_original": "fr|en|...", "publication_year": 0,
  "translated": true|false, "genre": "...",
  "family_candidate": "MASTER_NATIVE_FR|...", "text_sha256": "...",
  "prestige": {"canonical_status":0,"award_signal":null,"academic_signal":0,
               "critical_reception":0,"longevity_signal":0,"PRESTIGE_SCORE":0.0},
  "commercial": {"commercial_impact":0,"public_rating":null,"public_volume":null,
                 "polarization":null,"COMMERCIAL_SCORE":0.0},
  "external_classification": "MASTER_CANON|MASTER_MODERN|MASTER_TRANSLATED|BEST_SELLER_LITERARY|BEST_SELLER_COMMERCIAL|GENRE_FORMULAIC|PULP_PUBLISHED|AMBIGUOUS|EXCLUDE",
  "confidence": "CERTAIN|PROBABLE|AMBIGUOUS|EXCLUDE",
  "evidence_notes": "...",
  "sources": [{"type":"wikidata|googlebooks|openlibrary|academic|press","ref":"URL/ID","claim":"...","confidence":"HIGH|MED|LOW"}]
}
```

## 3. TAXONOMIE DE FAMILLES (ChatGPT, adoptée)
`MASTER_CANON` · `MASTER_MODERN` · `MASTER_TRANSLATED` · `BEST_SELLER_LITERARY` · `BEST_SELLER_COMMERCIAL` · `GENRE_FORMULAIC` · `PULP_PUBLISHED` · `D_SYNTHETIC_CONTROL` (evidence-gap) · `OMEGA_OUTPUT` (futur) · `AMBIGUOUS` · `EXCLUDE`.

## 4. SOURCES & MÉTHODE (Gemini : APIs publiques > scraping)
- **Wikidata API** (`www.wikidata.org/w/api.php`, JSON public) : prix (P166), date publication, nationalité auteur, statut canon. Déterministe, traçable.
- **Google Books API** : catégories, ratingsCount, publishedDate.
- **Open Library API** : éditions, sujets.
- **WebSearch** : réception critique, prix, études (résumés sourcés) pour les cas non couverts par API.
- **Goodreads/Babelio** : notes publiques — fetch ciblé SI accessible, sinon `public_*`=null (non bloquant ; commercial peut rester partiel).
- Récupération via `web_fetch`/`WebSearch` uniquement (jamais python/bash pour fetch — doctrine).

## 5. RÈGLES (anti-pollution)
- Ventes/notes publiques → **interdites** comme preuve de qualité (axe A).
- Popularité → **interdite** comme preuve canonique.
- Familles jamais mélangées (MASTER / BEST_SELLER / GENRE / PULP / D).
- Œuvre `AMBIGUOUS` ou preuve externe faible → **hors Gold-Set fondateur** (reste PROBABLE pour usage futur).
- **Gold-Set scellé = CERTAIN uniquement.**
- `livres_payants` modernes = `MODERN_MASTER_HOLDOUT` (sauf décision Architecte).
- Copyright : aucune prose reproduite ; uniquement métadonnées/scores/sources.

## 6. CRITÈRE PASS S1C+
Chaque œuvre du Gold-Set porte une **justification externe traçable** (≥1 source). Seules les `CERTAIN` restent scellées. Reclassements et exclusions consignés. **STOP avant embeddings (S1D).**

## 7. EFFORT (honnêteté)
150 œuvres × multi-sources = collecte par BATCHS (par cellule). Signaux fiables et rapides : prix/canon/longévité (Wikidata + connaissance établie vérifiée). Signaux partiels : ventes exactes (souvent indisponibles → estimation/null). Le dossier est **best-effort horodaté avec provenance + confiance par source**, pas une prétention d'exhaustivité commerciale.
