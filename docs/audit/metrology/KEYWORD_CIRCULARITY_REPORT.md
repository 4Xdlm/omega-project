# OMEGA — K2-CIRCULARITÉ DES CAPTEURS KEYWORD (quantifiée)

**Date** : 2026-06-01 (nuit) · CALC autonome, READ-ONLY, 0 Ollama. Outil : `scripts/metrology/wsd-keyword-circularity.ts`.
**Question** : les capteurs keyword récompensent-ils le STYLE de l'engine (circularité) plutôt que la qualité ? Comparaison maîtres (gutenberg) vs sortie OMEGA (ALTERNANCE prose).

## Résultat
| Capteur | maîtres-FR (n=14) | maîtres-EN (n=8) | sortie OMEGA (n=9) | Δ (OMEGA − maîtres) | verdict |
|---|---|---|---|---|---|
| sensory_richness | 47.1 | 35.0 | **84.4** | **+41.7** | CIRCULAIRE |
| corporeal_anchoring | 28.6 | 20.8 | **92.6** | **+66.8** | CIRCULAIRE |
| anti_cliche | 100 | 100 | 100 | 0 | INERTE |
| rhythm | 71.8 | 67.8 | 65.8 | −4.5 | NEUTRE (VALID) |
| euphony | 77.8 | 77.8 | 77.9 | +0.1 | NEUTRE (VALID) |

## Lecture
- **sensory/corporeal = K2-circulaires** : la sortie OMEGA les sature (84/92) bien au-dessus des maîtres (47/35, 29/21). La prose K2 est promptée à inclure des mots sensoriels/corps → elle « réussit » des capteurs que les chefs-d'œuvre (immersion indirecte, anglais) ratent. **Ces capteurs récompensent le style-keyword de l'engine, pas la qualité littéraire absolue.** C'est la cause mécanique du « 0/95 maîtres au SEAL » + du « IFI non-bottleneck pour OMEGA » (triple-preuve R1).
- **rhythm/euphony = VALID** : OMEGA y est au niveau des maîtres voire LÉGÈREMENT en-dessous (rhythm 66 vs 70) — **mesure honnête, zéro inflation**. Ce sont les capteurs structurels à garder en gating.
- **anti_cliche = inerte** (100 partout).

## Conséquence (confirme R2)
La séparation des rôles par contexte est mathématiquement fondée : sensory/corporeal doivent être **ADVISORY** (gameable + circulaires, pas un floor de qualité) ; rhythm/euphony restent **GATING** (honnêtes). Le remplacement sémantique (R2) doit produire une mesure d'immersion que l'engine ne peut pas saturer par keyword-stuffing (juge LLM de qualité, non de présence).

## VERDICT
- Statut : PASS (circularité quantifiée sur 3 groupes, CALC reproductible).
- Confiance : Haute (Δ massif +42/+67 sur sensory/corporeal ; rhythm/euphony neutres comme attendu).
- Forces : preuve directe que keyword = circulaire et structurel = valide ; explique 0/95 + divergence R1 d'un seul mécanisme.
- Faiblesses : (1) OMEGA-output = ALTERNANCE (FR seulement, n=9) ; (2) anti_cliche/signature non re-mesurés ici hors saturation ; (3) le contre-test sémantique (l'engine ne sature PAS le LLM) = Ollama, terminal (R2.1).
- Action : intègre la table de circularité au dossier R2 ; renforce EMP-16 (un capteur circulaire passe sur OMEGA mais échoue sur maîtres → toute preuve mono-corpus OMEGA est trompeuse).
