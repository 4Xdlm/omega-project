# OMEGA — M0.b BENCH REPORT · scribe(weaveLLM) vs sovereign(forge)

> **Framework**: OMEGA_TOTAL_CONTROL_FRAMEWORK_2000 · **Mode**: READ-ONLY engine (harness only)
> **Date**: 2026-05-31 · **HEAD**: `e2092457` · **Author**: Claude Code · **Decision ref**: NCR-M0B-SCRIBE-PRODUCTION-PATH-NO-LLM (Architect GO **Option B**)
> **Gate**: DEC-009 (fusion/destitution). **1 brief = SIGNAL, PAS preuve** — corpus élargi = M4.

---

## 0. VERDICT

**Bench VALIDE — PASS (discrimine).** Sur le brief Golden « Le Gardien » (scène 1), **sovereign-engine > scribe-engine** au composite S-Oracle V2 : **Δ = +3.07** (82.01 vs 78.94, N=5), porté par l'axe **ECC +6.17**. Le signal est **robuste au bruit du juge** (±0.004) **et à la longueur** (CF8 : Δ tient, ~+3.4, à longueur contrôlée).

**MAIS marge faible et distributions chevauchantes** : en tête-à-tête **sovereign ne gagne que 3 runs / 5** (scribe gagne runs 3 et 4) ; la moyenne est tirée par un run scribe faible (74.6). Significativité marginale (Welch t≈2.3, p≈0.06, N=5).

➡️ **Conclusion gate** : M0.b fournit un **signal mesuré, valide, en faveur de sovereign**, mais **n'autorise PAS à lui seul la destitution de scribe/weaveLLM** (1 brief, marge ~3 pts, sovereign plus *régulier* que dominant). **Escalade obligatoire vers M4** (corpus élargi) avant toute décision DEC-009.

---

## 1. Protocole (Option B — même modèle, même tâche, archi différente)

| Élément | Valeur |
|---|---|
| Brief source | `golden/intents/intent_pack_gardien.json` (« Le Gardien », horror) → `createGenesisPlan` → plan 7 scènes |
| Unité comparée | **scène 1** (`SCN-01-001-561a8a`, 11 beats, cible 1250 mots) — plan réduit mono-scène |
| scribe | `weaveLLM` (PAS `runScribe`) + `createScribeProvider({mode:'ollama', forceModel:'qwen3:32b'})` |
| sovereign | `assembleForgePacket(plan, scène1)` → `runSovereignForgeWithPacket` + `createOllamaProvider(qwen3:32b)` |
| Modèle | **qwen3:32b** (identique), keep_alive 24h, **0 API payante** (Ollama only) |
| Génération | temperature 0.8, top_p 0.92, num_predict 2048, num_ctx défaut (égalisés — CF5) |
| Scorer | **S-Oracle V2** `judgeAestheticV3` (composite + ECC/RCI/SII/IFI/AAI), juge temp 0.0, **même instrument pour les 2 proses** (même packet) |
| N | **5 runs / moteur** + variance juge k=3 + probe longueur (CF8) |
| Harness | `scripts/metrology/m0b-bench.ts` (+ `m0b-length-probe.ts`) — gaté EMP-10, aucun code moteur modifié |

---

## 2. Résultats — composite + 5 macro-axes (N=5)

### Par run (composite / min=ECC / mots)
| run | sovereign comp | scribe comp | gagnant | sov mots | scr mots |
|----|---------------:|------------:|:-------:|---------:|---------:|
| 0 | 82.5 | 78.7 | SOV | 1808 | 746 |
| 1 | 80.7 | 77.8 | SOV | 2082 | 783 |
| 2 | 84.5 | 74.6 | SOV | 2137 | 822 |
| 3 | 81.0 | **81.9** | **SCR** | 1808 | 1194 |
| 4 | 81.4 | **81.6** | **SCR** | 2138 | 594 |

> Tête-à-tête : **SOV 3 — 2 SCR**. La moyenne Δ est sur-pondérée par le run 2 (scribe 74.6, son plancher).

### Agrégats (moyenne ± écart-type)
| Axe (poids) | sovereign | scribe | Δ (sov−scr) |
|---|---:|---:|---:|
| **Composite** | **82.01 ± 1.38** | **78.94 ± 2.68** | **+3.07** |
| ECC — Emotional Coherence (33%) | 67.76 ± 2.35 | 61.59 ± 4.19 | **+6.17** |
| RCI — Rhythmic Craft (17%) | 79.46 ± 4.77 | 78.65 ± 3.98 | +0.81 |
| SII — Signature Integrity (15%) | 91.08 ± 0.77 | 90.60 ± 1.06 | +0.48 |
| IFI — Immersion Force (10%) | 96.79 ± 3.02 | 88.92 ± 11.83 | +7.87 |
| AAI — Authenticity & Art (25%) | 91.20 ± 1.10 | 91.04 ± 0.82 | +0.16 |
| min_axis | 67.76 ± 2.35 | 61.59 ± 4.19 | +6.17 |
| mots générés | 1994.6 ± 153.7 | 827.8 ± 198.7 | ×2.41 |
| temps génération | ~18.5 min | ~24 s | ×46 |

**Lecture** : l'écart se concentre sur **ECC** (cohérence émotionnelle, l'axe le plus lourd) et **IFI** (immersion). **SII / AAI / RCI quasi à égalité** (Δ < 1). scribe est **plus variable** (stdev composite 2.68 vs 1.38) — sovereign gagne surtout en **régularité/plancher**, pas en domination.

---

## 3. Contrôles de validité

### 3.1 Variance du juge (S-Oracle V2 LLM, temp 0)
Juger 3× la **même** prose : sovereign **82.53 ± 0.004**, scribe **78.68 ± 0.008**. **Bruit juge négligeable** (< 0.01) → le Δ=3.07 **n'est pas** un artefact de jitter du juge. (Multishot internes ECC/IFI/Necessity : stdev 0.0 sur tous les runs.)

### 3.2 CF8 — Sensibilité à la longueur (probe dédié)
Même contenu sovereign jugé à longueur décroissante (troncature à la frontière de paragraphe) :
| longueur | composite | ECC | IFI | SII |
|---|---:|---:|---:|---:|
| 1808 mots (plein) | 82.5 | 68.8 | 93.9 | 90.1 |
| 489 mots (≈ longueur scribe, −73%) | 82.3 | 69.8 | 91.8 | 88.0 |

**Chute composite plein→court = −0.2.** ➡️ **S-Oracle V2 est quasi insensible à la longueur.** « Écrire plus » n'explique **pas** l'écart : à longueur comparable, sovereign reste ~82.3 > scribe 78.9 (**Δ contrôlé-longueur ≈ +3.4**, ≥ Δ brut). **CF8 ne sape pas le résultat.**
*Limite* : la troncature rend la scène **incomplète** (premiers 27 %) ; le composite tient quand même (ECC monte même légèrement), ce qui renforce la conclusion mais reste un contrôle imparfait.

---

## 4. Registre des CONFONDS (CF1–CF8)

| ID | Confond | État | Effet sur le verdict |
|----|---------|------|----------------------|
| **CF1** | scribe = `weaveLLM` substitué à `runScribe` (no-LLM) | acté (NCR) | nécessaire — sinon comparaison invalide |
| **CF2** | 2 implémentations Ollama distinctes (scribe vs sovereign) | non corrigeable (no-touch moteur) | parité au niveau **modèle** (qwen3:32b), pas du harness |
| **CF3** | asymétrie d'intake générer-vs-réécrire | **résolu** par Option B (même tâche : générer-depuis-plan) | éliminé |
| **CF4** | seed Ollama non passé à l'API (prompt-only) | mitigé par N=5 | variance gén capturée (stdev composite 1.38 / 2.68) |
| **CF5** | params génération : temp/top_p(0.92)/num_predict/num_ctx **égalisés** ; repeat_penalty/frequency_penalty/repeat_last_n **hardcodés différents** (sov 1.4/0.6/256 vs scribe défauts Ollama) | documenté, **non forcé** (forcer 1.1 saboterait l'anti-loop sovereign) | avantage anti-répétition côté sovereign — favorable à sovereign, à noter |
| **CF6** | 14D creux (`target_14d={}`) du chemin V2.3-A | **MESURÉ → mitigé** : sous Option B (`assembleForgePacket`), Q1 `target_14d` = **14 clés peuplées** | contrat émotionnel **plein** ce bench ; pas de scar 14D ici |
| **CF7** | asymétrie coût/temps : sovereign **~18.5 min** vs scribe **~24 s** (×46) | observé | dimension **coût** réelle ; non pénalisante pour la qualité, mais critique pour un usage produit |
| **CF8** | asymétrie de longueur **×2.41** (1995 vs 828 mots) | **MESURÉ** : S-Oracle ~insensible (−0.2 à −73 %) ; Δ tient à longueur contrôlée | **n'explique pas** l'écart qualité |

---

## 5. Limites & cadrage

- **1 brief, 1 scène, N=5** → **SIGNAL, pas preuve**. Marge ~3 pts, distributions chevauchantes, sovereign gagne 3/5 en tête-à-tête. Significativité marginale (p≈0.06).
- **CF2/CF5** laissent sovereign avec un harness Ollama plus « durci » (anti-répétition) — avantage structurel **en faveur de sovereign**, à recroiser.
- **CF7** : le coût ×46 de sovereign n'entre pas dans S-Oracle ; c'est un facteur de décision produit distinct.
- **Déterminisme** : Ollama seed prompt-only (CF4) → reproductibilité statistique (N runs), pas hash-stable. Juge, lui, quasi déterministe (temp 0).

## 6. Recommandation (gate DEC-009)

1. **NE PAS destituer** scribe/weaveLLM sur M0.b seul (signal faible, 1 brief). Conforme au cadrage Architecte.
2. **Escalader M4** : corpus élargi (≥ N briefs × genres « Le Gardien »/« Le Choix » + autres, plusieurs scènes), test statistique formel, pour confirmer/infirmer le Δ ECC/IFI.
3. **Recroiser CF2/CF5** en M4 : harnais Ollama équivalent (ou documenter l'avantage structurel sovereign).
4. **Post-excision 14D** : re-mesurer (ici CF6 était plein, donc base saine — mais V2.3-A reste à benchmarker séparément).

---

## 7. Reproductibilité & artefacts

```powershell
# bench complet
$env:M0B_N='5'; $env:M0B_MAXTOK='2048'; $env:M0B_TEMP='0.8'; $env:M0B_JUDGE_VAR_K='3'
npx tsx scripts/metrology/m0b-bench.ts
# probe sensibilité longueur (CF8) — APRES le bench (GPU mono)
npx tsx scripts/metrology/m0b-length-probe.ts
```
Artefacts : `docs/audit/metrology/m0b-runs/` → `m0b_runs.json` (config+cf6+5 runs+agrégats+variance juge+Δ), `m0b_length_probe.json` (CF8), `sample_sovereign.txt`, `sample_scribe.txt`. Harness : `scripts/metrology/m0b-bench.ts`, `m0b-length-probe.ts`.
**0 API payante. 0 code moteur modifié. Ollama qwen3:32b local.**

---
*Suite débloquée par ce bench (séparément, hors-biais overhead) : métrologie dynamique **D3 runtime** + **D10 ressources** (instrumentation latence/payload/mémoire sur les mêmes frontières). D9 prose = absorbée ici (scoring S-Oracle fait).*
