# WS-C — MASTER COMPOSITE CALIBRATION : PROTOCOLE (méthode avant mesure)

**Date** : 2026-06-01 · **Statut** : PROTOCOLE (doc-only) — 1 décision Architecte bloquante (§3). NO CODE avant décision.
**But** : recalibrer TOUS les paliers du juge sur une vérité mathématique mesurée (corpus maître large × composite complet), pas sur l'ancrage mince/arbitraire d'origine (cf. `JUDGE_SCALE_CALIBRATION_TRUTH_AUDIT.md`). Demande Architecte : « mesures ultra-précises et nombreuses, vérité mathématique ».
**Gate** : shadow only ; aucun seuil production touché ; provenance DEC-014 obligatoire ; règle INVALID_PACKET (DEC-013) ; pas de contrat dérivé de la prose scorée (anti-circularité).

## 1. Réalité technique des axes (vérifiée, macro-axes.ts)

| Axe | poids composite | méthode | exécution |
|---|---|---|---|
| ECC | 0.33 | **LLM** (interiority + impact via provider ; tension_14d CALC ; emotion_coherence) | Ollama |
| AAI | 0.25 | **LLM** (adversarial) | Ollama |
| RCI | 0.17 | **CALC** déterministe | autonome DC |
| SII | 0.15 | **LLM** | Ollama |
| IFI | 0.10 | **LLM** | Ollama |

→ **83 % du poids composite est LLM.** WS-C **ne peut PAS tourner en shell Desktop Commander** (blocage nested-`node -e` de l'ollama-provider). **Exécution = terminal Architecte** (où Ollama répond), comme WS-B0c. Le juge LLM est **déterministe à temp 0** (prouvé WS-B0c, std 0) → reproductible à 100 %, condition de la « vérité mathématique ».

## 2. Corpus (« nombreuses »)

- **Maîtres** : tout `omega-autopsie/gutenberg_cache` (~19 œuvres FR+EN déjà utilisées) + `corpus_r/txt` (extensions), **par CATÉGORIE** (registre/genre : roman psychologique, action, description, etc.).
- **Multi-passages** : N passages par œuvre (≥3, viser 5-8 pour densité), tailles ARC (~1400w) — méthode `extractPassages` de minaxis (mêmes frontières → comparable).
- **Références moteur** (pour le contraste) : goldens OMEGA, high-quality rejects, K2 récents, M0.b. (BOOK_FULL exclu : prose non préservée.)
- Cible : **plusieurs centaines de mesures** (œuvres × passages × catégories), pas 3.

## 3. ⚠️ DÉCISION BLOQUANTE — quel CONTRAT pour mesurer un maître ?

ECC/AAI/SII/IFI dépendent d'un **contrat** (cible dramatique). Un maître n'a pas de contrat OMEGA. Lui en assigner un = choix méthodologique qui DÉTERMINE la validité. **Ne pas trancher = refaire l'arbitraire d'origine.** Options :

- **Option A — contrat dérivé du contenu réel de l'œuvre (non circulaire)** : dériver le contrat 14D depuis l'arc émotionnel mesuré au niveau de l'ŒUVRE entière (pas du passage scoré), puis scorer chaque passage. ⚠️ partiellement circulaire pour tension_14d (le passage tend à matcher l'arc de son œuvre). Mesure « le maître contre sa propre intention globale ».
- **Option B — contrat littéraire de référence UNIFORME** : un seul contrat « littéraire neutre » documenté, appliqué à TOUS les maîtres. Non circulaire, comparaison à yardstick constant ; les paliers dérivés sont relatifs à ce yardstick (cohérent pour fixer un seuil). Mais pénalise les œuvres dont l'émotion diverge du yardstick.
- **Option C — séparer axes intrinsèques vs conformité** : calibrer séparément (i) les axes intrinsèques (RCI rhythm/euphony, parts non-contractuelles) qui mesurent la qualité SANS contrat, et (ii) les axes de conformité (tension_14d, ECC) qui mesurent l'obéissance au contrat. Paliers distincts. Le plus honnête physiquement, le plus lourd.
- **Option D — contrat = celui du moteur (HAND représentatif par catégorie)** : réutiliser des contrats scène-type documentés (comme WS-B0c menace/revelation) par catégorie. Mesure « un maître jouerait-il le rôle qu'on demande au moteur ? ».

**Recommandation Claude** : **C en cible long terme** (sépare qualité intrinsèque de conformité — la vraie physique), **A pour la passe immédiate** (donne la distribution maître « contre sa propre intention », la plus proche de « niveau chef-d'œuvre intrinsèque ») avec **report explicite du résidu circulaire** sur tension_14d. **B** comme contrôle croisé. **Décision = Architecte.**

## 4. Mesure (par passage) + provenance DEC-014

Pour chaque passage : ECC, RCI, SII, IFI, AAI → composite + min_axis, k=3 (variance), packet **représentatif** (WS-B2), + bloc provenance complet (sha prose, contrat, signature_words, engine_version, coefficients_sha, model, temp, k, packet_completeness). Sortie **JSONL append-only** (crash-safe/resumable : skip sha+contrat déjà fait). Aucun score `INVALID_PACKET` ne calibre.

## 5. Dérivation des paliers (par PROPORTIONNALITÉ, pas nombres ronds)

- Distribution maître par catégorie + globale, par axe ET composite.
- Paliers candidats = **percentiles** : ex. **S = p90 maîtres**, A = p50, B = p25 ; **SEAL composite = p? maîtres** (à choisir : viser « niveau publié haut »). min_axis/ecc/aai floors = percentiles par axe.
- Comparer aux anciens (S=4.5 GB / composite≥93 / ecc≥88 / aai≥85 / min≥80) → **chiffrer l'écart d'arbitraire**.
- Faux rejets (maîtres sous le nouveau seuil) / faux accepts (commercial au-dessus).

## 6. Sorties & gate

`docs/audit/calibration/WS_C_*.{md,csv,jsonl}` : distributions, candidats paliers, comparaison ancien↔neuf, provenance index. **STOP au rapport. Aucun seuil changé. Promotion = décision Architecte après bench non-régression shadow.**

## 7. Émotion 14D — note (intuition Architecte confirmée)

L'Architecte note que Emotion14 a fini au garage car « estimé/calculé mais pas vraiment mesuré avec rigueur ». WS-C est précisément la mesure rigoureuse manquante. Si la recalibration redonne au 14D (ou à ses sous-signaux) un pouvoir discriminant **mesuré** sur le corpus maître, son statut garage pourra être ré-examiné — sous Tribunal, sans ressusciter le canon genome SEALED (FORBID-CANON-GARAGE-001 intact).

## VERDICT
- Statut : PASS (protocole rigoureux ; réalité axes établie ; point dur contrat explicité, pas escamoté).
- Confiance : Haute sur la méthode ; la validité finale dépend de la décision §3 (contrat).
- Forces : empêche de refaire l'arbitraire (méthode avant mesure) ; impose provenance + représentativité + percentiles ; sépare exécution CALC (DC) vs LLM (terminal Architecte) honnêtement.
- Faiblesses : (1) 83 % du composite = LLM → run lourd terminal Architecte (heures, d'où JSONL resumable) ; (2) la contract-dépendance n'a pas de solution « zéro hypothèse » → choix §3 à assumer ; (3) corpus maître = échantillon, pas exhaustif.
- Risques restants : choisir Option A sans reporter le résidu circulaire tension_14d = biais ; mesurer à packet vide = refaire 0/57. Garde-fous posés.
- Action requise : **décision Architecte §3 (A/B/C/D)**. Ensuite je code le bench WS-C (resumable, provenance DEC-014) et tu le lances dans ton terminal. RCI-only (CALC) peut être pré-mesuré en autonomie immédiatement si tu veux un premier signal.
