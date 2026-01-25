# OMEGA - B.1 ORACLE2 (Lexicon + VAD)
# Status: SPECIFIED (non implemente)
# Dependency: PHASE_A_ROOT_HASH = 63cdf1b5fd7df8d60dacfb2b41ad9978f0bbc7d188b8295df0fcc0c2a9c1673e

## Role

Oracle emotion independant de J1.
But: detecter monoculture / derive / hallucination emotionnelle.

## Entrees / Sorties

### Input
- text: UTF-8 non vide
- optional: locale (default: fr)

### Output
- vad: { valence, arousal, dominance } in [-1..+1] (symbolic bounds; calibration runtime)
- e14_proxy: projection vers EmotionV2 (mapping documente, pas d'auteur)
- confidence: c in [0..1]
- evidence: { hits_pos[], hits_neg[], intensifiers[], negations[], sarcasm_flags[] }

## Methode (deterministe)

1. Tokenisation stable (Unicode NFC + lower + trim + collapse spaces)
2. Lookup lexique (hashe, versionne)
3. Regles:
   - Intensifiers x weight
   - Negations inversent polarite locale
   - Punctuation/ALLCAPS/emoji -> arousal hints
   - Sarcasm flags => confidence downscale (jamais up)
4. VAD calcule = somme ponderee / normalisation
5. Projection e14_proxy = mapping fixe (documente) VAD->E14 + lexique->axes

## Invariants Oracle2

### INV-O2-01: Determinism
Same input -> same output. Aucune source d'aleatoire.

### INV-O2-02: No External Calls
Oracle2 est offline. Zero appel reseau.

### INV-O2-03: Evidence Required
Si confidence > 0, evidence non vide.

### INV-O2-04: Sarcasm Decreases Only
Sarcasm peut uniquement diminuer confidence, jamais augmenter.

### INV-O2-05: Disagreement Handling
O2 disagreement avec J1 => FAIL/ESCALADE (per B1-T09).

## Lexique

- Version: 0.0.0-SPEC (placeholder)
- Hash: (a calculer apres implementation)
- Supply chain: lexique doit etre versionne et hashe
- Toute modification du lexique invalide les runs precedents

---

FIN ORACLE2 SPEC v1.0
