# WS-D R2.1 v2 — RÉSULTATS du run sémantique (VERDICT)

**Date** : 2026-06-02 · **Branche** : phase-r-dispatcher-v33 · **Run** : terminal Architecte, Ollama qwen3:32b, temp 0
**Artefacts** : `WS_D_R2_SEMANTIC_RESCORE_V2.{json,csv}` (36 passages, scores only) · script `scripts/metrology/wsd-r2-semantic-rescore-v2.ts`
**Doctrine** : EMP-16 (triple-preuve), EMP-17 (respect historique)

---

## 0. Validité du run

Le sémantique a **réellement tourné** : tags `LLM:` variés (10, 15, 20, 25, 35, 45, 65, 72, 88, 92) sur les 36 passages
→ ce ne sont PAS des constantes de fallback keyword. qwen3:32b confirmé. **Run VALIDE.**

## 1. Verdict EMP-16 : `NOT_3_3_STOP` — AUCUN code moteur

| Famille | sem_FR | sem_EN | (a) \|Δ\|<10 | d_kw/100 | d_sem/100 | (b) robuste & <5 | converge |
|---|---|---|---|---|---|---|---|
| maitres | 19.0 | 15.8 | ✅ 3.2 | 73.1 | **31.9** | ❌ | ❌ |
| bestsellers | 26.7 | 17.7 | ✅ 9.0 | 66.6 | **32.6** | ❌ | ❌ |
| badprose | 29.4 | 36.3 | ✅ 6.9 | 41.2 | **31.3** | ❌ | ❌ |

**0/3 familles convergent → STOP. Zéro modification de code moteur.** (EMP-16 inviolable, appliqué.)

## 2. Ce qui est PROUVÉ 3/3 — critère (a) : agnosticisme de langue

Le capteur **sémantique n'a PAS de biais langue** : `|sem_FR − sem_EN|` = 3.2 / 9.0 / 6.9, tous < 10.
**C'est le défaut central du keyword (FR-only, EN 3-10× plus bas) qui est ÉLIMINÉ.** Gain réel, indépendant du verdict (b).
Comparaison directe sur les mêmes 36 passages : keyword FR/EN = 40/10, 50/6.7, 70/20 (biais massif) vs sémantique quasi-symétrique.

## 3. Ce qui ÉCHOUE 3/3 — critère (b) : non-gameabilité

Le sémantique se déplace de **~31 points / 100 mots** de salade de mots-clés, sur les 3 familles.
- Seulement ~2× mieux que keyword sur maitres/bestsellers (31.9 vs 36.5 ; 32.6 vs 33.3) ;
- **même pas 2× mieux sur badprose** (31.3 vs 20.6 = d_kw/2). Loin du seuil <5.

→ AS-IS, le sémantique reste sensible à l'injection de vocabulaire sensoriel. Promotion INTERDITE en l'état.

## 4. Diagnostic (EMP-17 — ne pas conclure binaire sans recoupage) : signature de décalage CONSTANT

`d_sem_per100` est **quasi-invariant** sur les 36 passages : min 22.5, max 42.5, **médiane ≈ 31**, indépendant de
la famille, de la langue et du score de base. Or :
- une vraie **gameabilité de qualité** varierait avec le contenu (certains textes plus dupes que d'autres) ;
- un **décalage additif constant par 100 mots de stuffing** est la signature d'un capteur de **DENSITÉ qui répond
  à la densité réellement ajoutée**. On ajoute ~48 mots 100 % sensoriels à 600 mots → la densité sensorielle DU TEXTE
  monte mécaniquement → un capteur nommé `sensory_density` la voit monter. **C'est arguablement le comportement CORRECT.**

**Hypothèse** : le critère (b) tel que posé confond deux choses —
(i) « la densité monte car on a ajouté du sensoriel réel » (légitime pour un capteur de densité) et
(ii) « le capteur est berné sur l'IMMERSION/qualité » (le vrai défaut à traquer).
Le seuil `<5` peut être **mal spécifié pour un capteur de densité**.

**On ne tranche pas ici.** Le test qui désambiguïse = **contrôle à filler NEUTRE** (R2.2).

## 5. Autres observations (à garder, non décisives)

- `badprose/en claimed_by_the_mountain_kings` : semFoc 71 (LLM 92), `el_james` EN bas (13-16), `colleen_hoover` d_sem +42.
  → le sémantique ne classe PAS proprement la qualité (normal : c'est un capteur de **densité/immersion**, pas de qualité ;
  l'axe qualité = necessity/metaphor/authenticity, LLM, sains). Ne pas confondre densité et qualité.
- Le keyword garde son inversion (badprose FR 70 > maîtres FR 40) déjà scellée au dry-run CALC.

## 6. Décision & prochain pas gaté (R2.2, doc+tooling, ZÉRO code moteur)

**HOLD total** : pas de code R2, pas de méga-bench WS-D tant que (b) n'est pas élucidé.

**R2.2 — adversarial 3 bras (longueur-contrôlée)** sur les mêmes 36 passages :
1. **base** (référence) ;
2. **+ salade sensorielle** (comme R2.1, INCOHÉRENTE) ;
3. **+ filler NEUTRE** non-sensoriel de longueur IDENTIQUE (texte plat administratif/logistique).

Lecture :
- si **filler neutre décale AUSSI ~31/100** → c'est un **artefact longueur/récence** (le LLM réagit à tout ajout, pas
  au sensoriel) → le critère (b) est mal posé, il faut le re-dériver (mesurer Δ_salade − Δ_neutre = gameabilité NETTE) ;
- si **seul le sensoriel décale (~31) et le neutre ~0** → le capteur tracke spécifiquement la densité sensorielle ;
  pour un capteur de **densité** c'est correct, mais alors il ne mesure pas l'**immersion-qualité** → re-cadrer le rôle
  (densité = signal brut advisory ; immersion-qualité = autre sonde) ;
- gameabilité NETTE = `Δ_salade/100 − Δ_neutre/100`. Nouveau critère (b') : `gameabilité_nette < 5` ET `< d_kw_nette/2`.

R2.2 ne touche aucun code moteur : c'est une PREUVE supplémentaire pour décider du rôle. Toute promotion reste gatée
par une convergence 3/3 sous critère re-spécifié, puis code en shadow/flag/EMP-10 terminal Architecte.

## 7. Statut NCR

`NCR_KEYWORD_SENSOR_SYSTEMIC_BIAS` reste **OPEN_DIAGNOSED**, enrichi :
- keyword : biais langue + gameable + inversion = CONFIRMÉ (CALC + sémantique comparés).
- sémantique candidat : **(a) agnostique langue = PROUVÉ 3/3** ; **(b) gameabilité = NON RÉSOLUE** (artefact densité vs
  immersion à départager par R2.2). Aucun remplacement moteur tant que (b') non prouvé 3/3.
