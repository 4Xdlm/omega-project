# DEC-20260602-018 — Gemma4 juge ADVISORY + Nomic radar géométrique (clôture S1D/S1E)

**Statut** : RATIFIÉ (Tribunal 3-IA + Architecte, 2026-06-02) · **Domaine** : métrologie / scoring / OBJ1 + OBJ4
**Preuves** : `docs/metrology/S1D_*`, `S1E_A_VERDICT.md`, `S1E_B_CALIBRATION_VERDICT.md` · Gold-Set v4 scellé SHA256 `4388b4b6`

## Contexte
Campagne S1 (norme de preuve S-1 → Gold-Set scellé → S1D Choc des Titans → S1E anti-confond/calibration). Question : OMEGA a-t-il un juge de qualité, ou un détecteur de raccourci ?

## Preuves retenues
- **gemma4:31b** : maître-vs-pulp 0.99-1.00 ; survit à **MODERN-vs-MODERN source-blind** (0.99) → époque réfutée comme confond unique ; **calibré** (biais position 0.50 ; tie 12,5% maîtres / 29,2% pulps).
- **embeddings nomic** : 0.79 AUC modern-vs-modern (era-robust), au plafond mondial qualité (~0.70-0.80).
- **qwen3** (biais 0.71) et **mistral-small** (biais 0.93-0.98) DISQUALIFIÉS comme juges pairwise.
- Ancre mondiale : qualité ~0.70-0.77 ; commercial ~80% (Archer&Jockers).

## Décision (usage en 3 niveaux)
### Niveau 1 — AUTORISÉ maintenant
- `gemma4:31b` = **juge ADVISORY OBJ1** : sélection best-of-N, départage de variantes, détection de version faible, guidage de passe de réécriture, audit de prose.
- `nomic-embed-text` = **radar géométrique OBJ4** : empreinte ADN exploratoire, pré-classement dans l'espace, clustering, distance aux centroïdes.

### Niveau 2 — INTERDIT maintenant
Gate dur · SEAL · min_axis · score de production · claim « qualité pure prouvée » · jury multi-LLM local · fusion prestige/commercial.

### Niveau 3 — REQUIS pour promotion future (V4)
Corpus genre-tagué + **SAME_GENRE** (lever le confond genre) · challenger embedding (bge-m3/e5) · **2ᵉ juge non biaisé** (Phi-4/Command-R/Llama3.3 à tester) · gold-set humain/multi-source.

## Limites assumées (documentées, non bloquantes pour l'advisory)
- **Confond GENRE OPEN** : gemma sépare peut-être littéraire-vs-fiction-de-genre, pas qualité pure à genre égal. `SAME_GENRE` = EVIDENCE_GAP (Gold-Set sans paires appariées-genre).
- **Juge unique** (gemma) = pas de redondance anti-circularité locale (jury non viable).
- n modéré ; embeddings non confirmés vs challenger.

## Conséquences
- L'atelier de génération peut reprendre **avec gemma comme arbitre advisory** (best-of-N + forge-langue validée P5) — **bandeau « advisory only »**.
- Aucune promotion en gate/production avant Niveau 3 (V4).

## Mécanisme causal
La discrimination survit à la neutralisation d'époque + source-blind ⇒ signal réel (pas artefact temporel/métadonnée) ; calibration (tie gradient maîtres<pulps, biais position nul) ⇒ jugement, pas tirage. Le résiduel genre n'est pas isolé faute de corpus apparié ⇒ statut advisory, pas final.
