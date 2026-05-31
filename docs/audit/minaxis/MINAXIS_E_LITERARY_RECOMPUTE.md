# OMEGA — MINAXIS_E LITERARY RECOMPUTE (RCI floor reachability probe)

> **Framework**: OMEGA_TOTAL_CONTROL_FRAMEWORK_2000 · **Mode**: READ-ONLY (0 patch, 0 recalibration, 0 changement de floor)
> **Date**: 2026-05-31 · **HEAD**: `579e8cde` · **Author**: Claude Code
> **Question**: le floor RCI 85 est-il **mathématiquement atteignable** par de la VRAIE littérature ? (test bloqué en M0.b car `results_v4` = features-only ; ici on recompute `computeRCI` sur de la **PROSE réelle**).
> **Outillage**: `computeRCI` (100% CALC, 0 Ollama) sur `omega-autopsie/gutenberg_cache/` (textes domaine public locaux).

---

## 0. VERDICT

**Floor RCI 85 atteignable par la littérature réelle : NON.**

**0 / 57** passages de chefs-d'œuvre (Flaubert, Hugo, Proust, Maupassant, Zola, Stendhal, Balzac, Dickens, Brontë, Austen, Melville) n'atteignent RCI 85. **Maximum mesuré = 76.6** (Melville), médiane **68.4**. Même en neutralisant les axes structurels/contrat (signature=hook=100 → `RCI_ceiling`), seuls **28/57 (49 %)** franchissent 85 — la moitié échoue sur rythme+euphonie seuls.

➡️ Alimente **`NCR_RCI_SENSOR_DEFECT`** (option 2) : le floor 85 est posé **au-dessus de ce que produit la littérature qu'il prétend certifier**. Conjugué au constat antérieur (sortie moteur RCI médian 82.6, 73 % < 85), **le floor n'est atteignable ni par le moteur ni par les maîtres**.

> **BIAIS (impératif directive)** : ceci est une **SONDE de reachability**, pas un tribunal de beauté. Un RCI bas sur Hugo ne prouve pas que Hugo écrit mal — il prouve que le couple capteur+floor **ne peut pas certifier Hugo**. S-Oracle juge la conformité à un EmotionContract ; ici le contrat est **neutre/permissif** (cf. §4).

---

## 1. Méthode

| Élément | Valeur |
|---|---|
| Corpus | `omega-autopsie/gutenberg_cache/` (224 textes domaine public locaux) — reproductible, 0 réseau |
| Sélection | 19 livres, **57 passages** ~1400 mots (frontières de paragraphe, milieu 80 % du texte, front/back-matter Gutenberg strippé) |
| Auteurs | 11 : Flaubert, Hugo, Maupassant, Proust, Zola, Stendhal, Balzac (FR) ; Dickens, Brontë, Austen, Melville (EN). *(McCarthy/Hemingway absents = sous copyright, non domaine public.)* |
| Capteur | `computeRCI(packet, prose)` — **100 % CALC, 0 Ollama** (voice_conformity = CALC poids 0) |
| Packet | **permissif** : `signature_words=[]`, `forbidden_words=[]`, `abstraction_max_ratio=0.95`, pas de hooks (cf. §4 biais) |
| Floor testé | 85 (cert SEAL min_axis) |

Repro : `npx tsx scripts/metrology/minaxis-literary-recompute.ts` → `MINAXIS_E_LITERARY_RECOMPUTE.csv` + `minaxis_E_summary.json`.

## 2. Résultats — distribution RCI réel-littérature

| Métrique | RCI réel-lit | RCI_ceiling (sig=hook=100) | sortie MOTEUR (réf) |
|---|---:|---:|---:|
| n | 57 | 57 | (51, MINAXIS_DISTRIBUTION) |
| moyenne | **68.12** | 81.x | **82.6** |
| médiane | 68.37 | — | 82.4 |
| p10 / p90 | 63.1 / 72.4 | — | 78.4 / 87.6 |
| min / max | 59.8 / **76.6** | — | 70.9 / 91.6 |
| **≥ floor 85** | **0 / 57 (0 %)** | **28 / 57 (49 %)** | 14/51 (27 %) |

**Constat-choc** : la sortie du **moteur K2 (82.6)** score **plus haut** que les maîtres littéraires (**68.1**) sur l'axe même censé mesurer la qualité rythmique. Le capteur **rate la littérature qu'il devrait imiter** *(caveat contrat §4)*.

## 3. Décomposition par sous-axe (réel-lit, n=57)

| sous-axe | poids effectif | moyenne | nature |
|---|---|---:|---|
| `rhythm` | 1.0 × conf(longueur) | **69.6** (41-92) | **PURE PROSE** — pic CV calibré 0.60 *pour K2* (pas pour la littérature, cf. `rhythm.ts:16`) |
| `euphony_basic` | **0.5** | **74.9** (47-89) | PURE PROSE mais **biais structurel auto-documenté** (cf. §5) |
| `signature` | ~1.0 | **60.0 (constant)** | **ARTEFACT CONTRAT** : `signature_words=[]` → hit-rate 0 → perd 40 pts (signature.ts:34-38) |
| `hook_presence` | 0.20 | **85.0 (constant)** | neutre (pas de hooks) |
| `voice_conformity` | **0** | — | neutralisé (n'affecte pas RCI) |

**Pourquoi RCI réel-lit plafonne ~68-77** : (a) `rhythm` ~70 — la littérature réelle a une variance de phrase que le pic CV-0.60 (tuné sur la prose K2 2200w) ne récompense pas pleinement ; (b) `signature` cloué à 60 par l'absence de contrat (artefact, voir biais) ; (c) `euphony` ×0.5 plafonné par un heuristique biaisé. La moyenne pondérée ne peut structurellement pas atteindre 85.

## 4. BIAIS DOCUMENTÉS (la sonde n'est pas un verdict de beauté)

1. **`signature=60` = artefact de contrat**, pas un défaut de Hugo. `signature_words=[]` → 0 % hit-rate → perte des 40 pts « signature ». La vraie littérature ne matche aucune liste de mots-signature arbitraire. → c'est exactement le biais « conformité à un contrat » signalé par la directive. **Borne haute corrigée** : `RCI_ceiling` (signature=hook=100) = la reachability *si le contrat était parfaitement matché* → **49 % seulement** passent 85. Donc même contrat parfait, la moitié des maîtres échoue (sur rythme+euphonie).
2. **Packet permissif** (Golden « Le Gardien » + style neutralisé) — l'EmotionContract 14D n'affecte PAS RCI (il alimente ECC). RCI ne dépend que de `style_genome` + symbol_map.
3. **Comparaison moteur vs réel-lit confondue par le contrat** : la sortie moteur (82.6) avait `signature` matché à son propre contrat (pas cloué à 60). À contrat égal, comparer plutôt `rhythm` brut (moteur vs réel-lit) — laissé pour un sous-bench dédié.
4. **Passages, pas œuvres entières** ; 57 extraits ~1400 mots ; rythme/euphonie locaux.

## 5. Aveu du code lui-même (preuve interne convergente)

`euphony-basic.ts:60-67` (commentaire de l'axe, verbatim) :
> *« euphony_basic is not Phase W calibrated. BRUTAL/action prose physically requires hard consonants (plosives /p/,/t/,/k/, fricatives /f/,/s/) for impact — these score as "cacophony" under this heuristic. **Systemic floor 68-70 on ALL scene types = structural bias, not real literary signal.** »* → poids abaissé 1.0→0.5.

`rhythm.ts:16,50-54` : pic CV recalibré **0.75→0.60 « pour la prose K2 2200w »** (auto-calibration sur la sortie moteur, pas sur la littérature).

→ Le repo **reconnaît déjà** que 2 des 4 sous-axes RCI sont calibrés sur le moteur / structurellement biaisés. Cette sonde le **quantifie** : 0/57 maîtres ≥ 85.

## 6. Verdict & action induite (AUCUNE appliquée)

- **Reachability floor 85 = NON** (0/57 actual ; 49 % au plafond contrat-parfait).
- **`NCR_RCI_SENSOR_DEFECT` confirmé empiriquement** (option 2 = défaut de métrique). Le floor 85 n'est atteignable ni par le moteur (73 % < 85) ni par la littérature réelle (100 % < 85).
- **Recommandation (NON appliquée — READ-ONLY)** : recalibration RCI **seulement** sur corpus-proof (cette sonde + Phase W = base), via le dispatcher Phase R, **jamais** par patch direct des `compute*` ni par baisse cosmétique du floor sans bench multi-corpus. `voice_conformity` (w=0) et `hook` (75/85 neutre constant) et `signature` (40 pts conditionnés au contrat) sont les leviers structurels à réexaminer.

## 7. Limites

- McCarthy/Hemingway absents (copyright) → pas d'archétype BRUTAL anglophone testé (or c'est précisément la prose que `euphony_basic` pénalise — biais probablement **sous-estimé** ici, corpus surtout « littéraire fluide »).
- `signature=60` artefact contrat (corrigé par `RCI_ceiling`).
- Sonde de reachability, **pas** un classement de qualité littéraire.

---
*Livrables : ce rapport + `MINAXIS_E_LITERARY_RECOMPUTE.csv` (57 lignes) + `minaxis_E_summary.json`. Capteur : `packages/sovereign-engine/src/oracle/macro-axes.ts:computeRCI` (non modifié). Corpus : `omega-autopsie/gutenberg_cache/` (domaine public). Cf. `MINAXIS_FLOOR_AUDIT.md`, `MINAXIS_LITERARY_CALIBRATION.md`.*
