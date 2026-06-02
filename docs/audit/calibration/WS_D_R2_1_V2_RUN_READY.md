# WS-D R2.1 v2 — Triple-preuve sémantique sur 3 corpus distincts (RUN-READY)

**Date** : 2026-06-02 · **Branche** : phase-r-dispatcher-v33 · **Doctrine** : EMP-16 (triple-preuve), EMP-17 (respect historique)
**Statut** : CALC-side PROUVÉ (autonome) · Sémantique EN ATTENTE run terminal Architecte (Ollama)

---

## 1. Contexte & correction du trou v1

Le verdict `WS_D_R2_1_VERDICT.md` (v1, commit `c6725986`) a conclu **STOP — triple-preuve PAS 3/3** non pour une
divergence, mais pour un **trou de protocole** : 2ᵉ corpus (ALTERNANCE) dégénéré (0 passage EN, keyword saturé,
artefact de longueur sur passages courts) + 3ᵉ corpus (goldens) vide (`R2_GOLDENS_DIR` non fourni).

Décision Architecte : refaire la triple-preuve sur **3 familles vraiment distinctes** — **maîtres + best-sellers + mauvaise-prose**,
FR+EN chacune. EMP-17 : ces 3 familles existent DÉJÀ dans le repo (`omega-autopsie/corpus_r/txt`, 881 livres) — rien à sourcer.

## 2. Corpus figé (manifest, 18 livres, 36 passages normalisés à 600 mots)

| Famille | FR (3) | EN (3) |
|---|---|---|
| **maitres** | flaubert_bovary, hugo_miserables, proust_swann | dickens_two_cities, austen_pride, melville_moby |
| **bestsellers** | projet_derniere_chance (Weir), le_crime_du_paradis (Musso), mille_petits_riens (Picoult) | andy_weir_the_martian, colleen_hoover_it_ends_with_us, dan_brown_origin |
| **badprose** | cinquante_nuances_de_grey, le_pacte_de_sang, grossesse_mafia | el_james_fifty_shades_of_grey, gently_yours, claimed_by_the_mountain_kings |

**DROITS** : best-sellers + mauvaise-prose = sous droits. **Mesure interne uniquement.** Le script ne sort QUE
scores + sha256(prose, 16 car.) + nombre de mots. Aucun extrait de prose n'est écrit dans les outputs ni committé.
Les `.txt` sources ne sont jamais copiés ni versionnés.

## 3. Corrections protocole v2 (vs v1)

1. **Normalisation longueur** : chaque passage tronqué à `NORM_WORDS=600` mots → familles longueur-comparables,
   élimine l'artefact « passages courts sur-réagissent au stuffing » qui avait pollué ALTERNANCE en v1.
2. **Adversarial proportionnel + apparié langue** : stuffing = salade de mots-clés sensoriels creux, en FR pour passages FR,
   en EN pour passages EN, dosée à `STUFF_RATIO=0.08` de la base. Δ rapporté **par 100 mots de stuffing** (`d_*_per100`).
3. **3 familles** au lieu de maitres/ALTERNANCE/goldens.

## 4. Preuve CALC-side (AUTONOME, sans Ollama) — critère (c) PROUVÉ 3/3

Dry-run `R2_DRYRUN=1` (CALC pur, pas d'Ollama). Le sous-capteur keyword `sensory_richness` (marqueurs FR-only) +
`corporeal_anchoring` mesurés sur les 36 passages :

| Famille | kw_sensory FR | kw_sensory EN | kw_corporeal FR | kw_corporeal EN | Δ_kw / 100 mots (gameabilité) |
|---|---|---|---|---|---|
| maitres | 40 | **10** | 33.3 | 16.7 | **+73.1** |
| bestsellers | 50 | **6.7** | 52.8 | 16.7 | **+66.6** |
| badprose | 70 | **20** | 69.4 | 16.7 | **+41.2** |

**Conclusions CALC (3/3 familles)** :
- **Biais langue systématique** : keyword note l'EN **3 à 10× plus bas** que le FR, dans CHAQUE famille,
  indépendamment de la qualité réelle. Pur artefact lexical FR-only.
- **Gameabilité massive** : insérer 100 mots de salade de mots-clés déplace le capteur de **+41 à +73 points**.
- **Inversion qualité** : la **mauvaise prose FR (70) score AU-DESSUS des maîtres FR (40)** sur le keyword
  → le capteur récompense la densité lexicale brute, pas la qualité (K2-circularité en miniature, cohérent WS-C/IFI).

→ **Critère (c) du protocole EMP-16 est prouvé sur les 3 corpus** par la mesure CALC seule. Artefact `WS_D_R2_SEMANTIC_RESCORE_V2_DRYRUN.json`.

## 5. Ce qui RESTE (sémantique) — run terminal Architecte (Ollama obligatoire)

Le capteur sémantique `scoreSensoryDensity` (HYBRID CALC+LLM, qwen3:32b temp 0) ne peut PAS tourner depuis le shell
Cowork/Desktop Commander : son `execSync('node -e ...')` imbriqué ne résout pas `node` (PATH) → fallback keyword
silencieux (confirmé de nouveau ce run). **La partie sémantique DOIT tourner dans le terminal Architecte.**

### Commande exacte (cwd = `packages/sovereign-engine`)

```powershell
cd C:\Users\elric\omega-project\packages\sovereign-engine
$env:ECC_K='1'
npx tsx ..\..\scripts\metrology\wsd-r2-semantic-rescore-v2.ts
```

Optionnel : `$env:R2_NORM_WORDS='600'` (défaut), `$env:R2_STUFF_RATIO='0.08'` (défaut), `$env:ECC_MODEL='qwen3:32b'`.
Sorties : `docs/audit/calibration/WS_D_R2_SEMANTIC_RESCORE_V2.{json,csv}` (scores only).

## 6. Critères de convergence (EMP-16, jugés automatiquement par le script)

Pour CHAQUE famille (maitres, bestsellers, badprose) :
- **(a) non-biaisé** : `|sem_FR − sem_EN| < 10` (le sémantique ne pénalise pas l'EN comme le keyword).
- **(b) non-gameable** : `|Δ_sem/100| < |Δ_kw/100| / 2` ET `|Δ_sem/100| < 5` (le stuffing ne le déplace quasi pas).
- **(c)** déjà prouvé CALC ci-dessus.

**Verdict** : `triple_proof.result` = `CONVERGE_3_3_GO_CODE` si les 3 familles passent (a)+(b) ; sinon `NOT_3_3_STOP`.

- **3/3 CONVERGE** → GO code R2 (couche RÔLE : sortir sensory/corporeal du min_axis, leur donner rôle advisory,
  promouvoir le sémantique pour l'immersion ; flag dédié, shadow, wrapper EMP-10, terminal Architecte). **Aucun seuil prod touché.**
- **1 diverge** → STOP, aucune modif moteur, ouverture NCR + reformulation. (EMP-16 inviolable.)

## 7. Garde-fous

- **EMP-16** : aucune ligne de code moteur tant que le run sémantique n'a pas rendu 3/3. Ce run est une PREUVE, pas un patch.
- **EMP-17** : corpus historique réutilisé (corpus_r), inversion keyword cohérente avec WS-C (0/95) et l'autopsie IFI.
- **Droits** : zéro prose en sortie/commit. Scores + sha + mots seulement.
- **Reproductibilité** : temp 0, NORM_WORDS fixe, manifest figé, sha par passage.
