# S1 — DESIGN MASTER (chemin rigueur maximale)

**Date** : 2026-06-02 · **Auteur** : Claude Code · **Statut** : EN COURS (S1A) · **Doctrine** : `OMEGA_ABSOLUTE_PROOF_STANDARD.md`
**Mandat Architecte** : « pas de mesure à la va-vite ; tout extraire/reclassifier/reconstruire si nécessaire ; vérité finale, mesures exploitables à 100000 %. »
**Convergence Tribunal 3-IA** : commit S-1/S0 fait → **S1 découpé**, STOP avant embeddings tant que le Gold-Set n'est pas scellé.

---

## PRINCIPE
On ne mesure rien tant que (1) le texte n'est pas extrait proprement et (2) la vérité-terrain n'est pas curée et scellée. Mesurer sur de la bouillie PDF ou des labels keyword = « prouver précisément une connerie ». On construit l'instrument avant de l'utiliser.

## DÉCOMPOSITION

### S1A — Pipeline d'extraction (verrou critique nouveau)
- **Entrée** : `Downloads/livre/{FR,ENG,ESP,IT}/{S,A,B,C,D,Best Seller}/*.{epub,pdf,txt}` + `Downloads/livres_payants/*.pdf`.
- **Extraction** : epub via `ebooklib`+`bs4` (HTML→texte) ; pdf natif via `fitz`(PyMuPDF) avec fallback `pdfplumber` ; txt normalisé.
- **Nettoyage** : retrait césures (`-\n`), normalisation espaces/quotes, suppression front-matter (préface/table/copyright/remerciements) et back-matter par heuristique de position + motifs.
- **Échantillonnage** : segments continus de **1500 mots** pris au **milieu** de l'ouvrage (évite préface/index). Plusieurs fenêtres par livre permises (pour densité de mesure).
- **Métadonnées par texte** (norme S-1) : `source_path, source_format, extractor, extractor_version, sha_source, sha_text, word_count, char_count, lang_folder, lang_detected, front_matter_removed, quality_flags, duplicate_key`.
- **Quality flags** : `OK | TOO_SHORT | OCR_SUSPECT | BROKEN_LAYOUT | MIXED_LANGUAGE | DUPLICATE | FRONT_MATTER_HEAVY | EXCLUDE`.
- **Quarantine** : tout texte non-`OK` → CSV quarantine, jamais en Gold-Set.
- **Sortie** : `outputs/metrology/extracted_corpus/` (texte) + `S1A_EXTRACTION_MANIFEST.csv` + `S1A_QUARANTINE.csv` + `S1A_EXTRACTION_REPORT.md`.
- **Critère PASS** : extraction `OK` reproductible (sha stable) ; PDFs bruités en quarantine ; doublons epub/pdf repérés (`duplicate_key`=auteur+titre normalisés).
- **Interdits** : zéro embedding, zéro LLM, zéro décision archi à ce stade.

### S1B — Gold-Set extrême CERTAIN
- **Cellules** (cible 50, minimum 30, sinon 20 parfaitement propres) : Maîtres FR, Pulp/faible FR, Maîtres EN, Pulp/faible EN. Best Seller = **séparé** (jamais mélangé au pulp).
- **Source labels** : dossiers experts (réputation auteur). `tier_suggestion` JSON = **hint de recherche uniquement**, jamais vérité.
- **Confiance par entrée** : `CERTAIN | PROBABLE | AMBIGU | EXCLUDE`. **Seul CERTAIN** entre dans la mesure fondatrice.
- **Anti-fuite** : **split par AUTEUR** obligatoire (un auteur jamais à la fois train et test) — sinon le modèle apprend la signature d'auteur, pas la qualité.
- **Sortie** : `S1B_GOLDSET_MANIFEST.jsonl` (hashé, scellé SHA256) + `S1B_CURATION_REPORT.md` + `S1B_EXCLUDED_AMBIGUOUS.csv`.

### S1C — Contrôle ciblé (humain léger, Gold-Set seulement)
Vérifier sur chaque entrée Gold-Set : langue correcte, titre/auteur exacts, extrait 1500 mots lisible (pas de front-matter, pas d'OCR cassé). Reclasser en `CERTAIN` ou écarter. **STOP avant embeddings.**

### S1D — Mesure (après Gold-Set scellé)
- **Instruments** : embeddings `nomic-embed-text` (+ challenger `bge-m3`/`multilingual-e5` si FR faible) ; juge LLM `qwen3:32b` (pairwise double-ordre) ; **juge indépendant `gemma4:31b`** (anti-circularité).
- **Mesures** : distance cosinus aux centroïdes maître/pulp ; AUC maître vs pulp ; pairwise master-win-rate ; position_bias.
- **Stats (norme S-1)** : IC95 bootstrap **10 000× cluster par livre** ; test de permutation 1000× ; **K-fold par auteur** (centroïdes sur auteurs train, test sur auteurs inconnus) ; FR et EN séparés ; longueurs 1500/3000.
- **GATE FORK** : si embeddings AUC_FR ≥ juge LLM AUC_FR (IC séparés, permutation passée, pas de fuite auteur) → **pivot géométrique autorisé** (preuve 1/3 EMP-16). Sinon → embeddings = diagnostic, poursuite multi-juges/pairwise/IRT.

---

## NUANCES SCELLÉES (apports Tribunal)
1. **Label par auteur ≠ vérité passage-par-passage.** Même Flaubert a des pages faibles ; le pulp a de bons paragraphes. L'AUC mesure « la géométrie sépare-t-elle du texte d'auteur-maître de texte d'auteur-pulp » — proxy défendable, PAS qualité absolue d'un passage. À énoncer dans tout verdict.
2. **Maîtres modernes obligatoires** : `livres_payants` (Carrère, McCarthy, Duras, Rulfo, Morrison) DOIVENT entrer dans la cellule Maîtres pour éviter que « grande prose » = « style XIXe + domaine public ».
3. **Copyright** : `livres_payants` (et tout texte sous droits) = **usage interne uniquement**. Dans les rapports : titre/auteur/hash/scores/features OK ; **AUCUN passage de prose reproduit**.
4. **nomic possiblement trop anglais** : mesurer explicitement l'écart FR/EN ; si FR faible, puller `bge-m3` comme challenger (pas comme vérité automatique).
5. **Mieux vaut 20 textes parfaitement propres que 50 douteux** pour le premier PASS.

---

## ORDRE D'EXÉCUTION
S1A (extraction + quarantine) → S1B (Gold-Set CERTAIN scellé) → S1C (contrôle ciblé) → **checkpoint Architecte** → S1D (mesure). Aucun embedding avant le scellement du Gold-Set.
