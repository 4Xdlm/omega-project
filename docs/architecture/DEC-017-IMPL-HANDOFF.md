# DEC-017 — HANDOFF d'implémentation (module shadow + atelier best-of-N)

**Date** : 2026-06-02 · **Statut** : handoff (doc-only) · **Gate** : EMP-10 (code = terminal Architecte, flag, shadow, wrapper test)
**Réfs** : DEC-017 (ACCEPTED), R5/R5-large verdicts, prompts dans `scripts/metrology/wsd-r5-large-fr-quality.ts`.

---

## A) Module shadow `IntrinsicQualityScore` (GO ratifié — terminal)

**But** : produire de la TÉLÉMÉTRIE (logs), zéro impact production. Flag `OMEGA_INTRINSIC_QUALITY` ∈ {`'0'` (défaut), `'shadow'`}.

**Module** (nouveau fichier, extension — ne touche AUCUN module figé) :
- 3 prompts LLM = profondeur / style / voix (reprendre `ABS_DIMS` + `ABS_PROMPT` de `wsd-r5-large-fr-quality.ts`,
  cadrage critique + consigne « oser les notes basses »).
- `scoreIntrinsicQuality(prose, lang) -> { profondeur, style, voix, mean }`, via `provider.generateStructuredJSON`.
- **Amendement A2** : ne s'active que sur scènes ~1200-1800 mots ; hors plage → flag `weak`/diagnostic, pas de mean fiable.
- Sélecteur pairwise `pickBest(candidats[], lang)` : tournoi choix forcé, **Amendement A1** : chaque comparaison jouée
  dans les 2 ordres (A/B puis B/A), agrégation par taux de victoire. **Amendement A3** : pairwise prioritaire pour la sélection.
- En `'shadow'` : loguer `{profondeur, style, voix, mean, pairwise_win, position_bias, model, prompt_hash, scene_hash}`.
  NE change AUCUN verdict, n'entre PAS dans min_axis/composite/SEAL.

**Procédure terminal** : créer le module → wirer en shadow dans le scoring (log only) → `commit-with-tests.ps1` (EMP-10).
**Interdits** : `'1'`/floor/gate, min_axis, seuil prod. (Gate dur = DEC futur, n≥30.)

## B) Test génération best-of-N « atelier » (prochain chantier — où le travail Flaubert revient au centre)

**But** : prouver que (1) le sélecteur pairwise choisit bien la meilleure variante, (2) les passes d'atelier améliorent profondeur/style/voix.

**Protocole proposé** :
1. 1 scène (contrat émotionnel riche, micro-trajectoire — cf DEC-011), **générer N=5 variantes** (seeds différents) via le moteur Sovereign/K2.
2. Passes de réécriture successives sur chaque variante : voix → euphonie → rythme → sous-texte → style flaubertien
   (réutiliser le travail historique comme MODULES de réécriture, pas comme seuils).
3. **Sélection pairwise** (module A) : tournoi sur les variantes → meilleure version.
4. **Mesure advisory** profondeur/style/voix AVANT/APRÈS chaque passe → le score monte-t-il ?
5. Verdict : le sélecteur est-il cohérent (choisit-il ce qu'un humain choisirait) ? les passes ajoutent-elles de la qualité mesurée ?

**Gate** : génération + Ollama = terminal Architecte ; le moteur reste figé (on l'utilise, on ne le modifie pas) ; advisory only.
C'est le pivot Phase 2 (Génération) de la synthèse : OMEGA devient un **atelier itératif** (générer → réécrire → sélectionner),
le juge en **sélectionneur**, pas en dictateur.

## C) Backlog (différé, gaté)

- Durcissement gate dur : n≥30 livres/cellule (DEC futur, éventuel modèle > qwen3:32b).
- Réduction biais position FR (prompt / calibrage).
- O2 flip `'1'` : seulement après recalibration paliers (DEC-015) + chantier contrat/packet ECC (R4 caveat C1).
- DEC-011 (genesis micro-trajectoire) à coder (terminal) — pré-requis matière première de qualité pour B.
- Nettoyage dette typage Sovereign avant fusion V3.

## D) État de fin de phase (résumé exécutif)

Enquête métrologique R1→R5 close. **Capteurs malades débranchés** (densité/keyword/necessity hors porte qualité, O2 shadow),
**ECC reclassé** conformité-contrat, **paliers SEAL 93 invalidés** (DEC-015), **nouveau juge qualité FR** établi en advisory+sélecteur
(DEC-017, AUC ~0.85 @scène, pairwise 0.81). Zéro code moteur modifié cette session ; tout gaté EMP-16/EMP-10, tracé docs+commits.
**Prochaine phase = Génération (atelier best-of-N).**
