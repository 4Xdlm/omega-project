# NCR-DEDALE-RESET-HEALTH-NOT-ENFORCED

**Opened**: 2026-04-22 (post mini-bench R2 — analyse chunk-level 60 runs)
**Severity**: HIGH (P1) — 33 % des runs bench Dédale perdus, impact toute future campagne
**Status**: **OPEN** (2026-04-22)
**Owner**: Claude Code (IA Principal) → fix requis avant prochain bench Dédale

---

## Issue

La séquence RESET-FIRST de Dédale v0.55 (implémentée dans
`packages/sovereign-engine/src/dedale/reset-session.ts`) **tue correctement**
le daemon `ollama serve` mais **ne garantit pas qu'il redémarre avec succès**
avant que l'orchestrateur V2-B-LOOP ne tente une régénération.

Conséquence : sur mini-bench R2 ADR-005 r2 du 2026-04-22 (60 runs
qwen3:32b), **20/60 runs (33.3 %) ont terminé en erreur** avec
`finish_reason=error, words=0`.

---

## Preuve empirique

### Bench ID : BENCH_DEDALE_NIGHT_20260422, phase R2 (60 runs, 42 min)

| Scene | Runs | OK | Error | Error rate |
|---|---:|---:|---:|---:|
| N02 | 20 | 11 | 9 | 45.0 % |
| T01 | 20 | 15 | 5 | 25.0 % |
| T04 | 20 | 14 | 6 | 30.0 % |
| **Total** | **60** | **40** | **20** | **33.3 %** |

### Pattern de log observé

1. Chunk précédent (ou scène précédente) déclenche `resetSession()`
   (après `hard_fail` oracle OU en fallback cross-chunk).
2. `reset-session.ts` séquence :
   - `kill_serve` : `killed_serve: true` → OK, process tué
   - health check post-kill : `TypeError: fetch failed`
   - verdict reset : **`reset_failed`**
3. Orchestrateur V2-B-LOOP enchaîne retry génération :
   - `[OLLAMA] Failed after 4 attempts` (daemon toujours mort)
4. Run record : `finish_reason=error, words=0, dedale=n/a`.

---

## Mécanisme causal identifié (hypothèse prioritaire)

`reset-session.ts` exécute un **kill** sans garantir un **restart** ni
bloquer sur health probe stable avant de rendre la main. L'orchestrateur
V2-B-LOOP reprend immédiatement, envoie une requête à `:11434` qui
ne répond plus, épuise son budget retry (4 tentatives), puis échoue.

Le bug n'est **pas** dans le kill (succès observé : `killed_serve: true`).
Le bug est dans **l'absence d'enforcement restart + health probe stable**
post-kill.

---

## Impact sur validation bench

### R2 (2026-04-22) — surface de mesure réduite
- 20/60 runs perdus → seulement 164 chunks parsés au lieu de ~240 attendus
  (60 runs × ~4 chunks moyens post-finalisation).
- Les verdicts ADR-005 r2 restent solides (N02 FP=0/47 robuste, T04
  c1_max=0.130 robuste), mais **l'estimation TP sur T01** (la scène la
  plus sensible) est fragilisée.

### Phase S (2026-04-21→22) — déjà observé
Revoir logs Phase S : rechercher taux d'erreur équivalent. Probable que
la même cause expliquait une partie de la variance intra-session.

---

## Plan de remédiation proposé

### Option 1 (recommandée) — Enforcement restart + health probe

Dans `reset-session.ts`, après `kill_serve` :
1. Spawn explicite `ollama serve` (ou équivalent plateforme).
2. Poll health endpoint (`GET :11434/` ou `GET :11434/api/tags`) avec
   retry exponentiel : 500 ms, 1 s, 2 s, 4 s, 8 s, 16 s (max ~32 s total).
3. Si health OK avant timeout : verdict `reset_effective`.
4. Si timeout atteint sans health : verdict `reset_failed`, mais
   **bloquer V2-B-LOOP** plutôt que laisser enchaîner sur daemon mort
   (ex : throw explicite ou flag `orchestrator_blocked`).

### Option 2 — Circuit breaker V2-B-LOOP

Dans l'orchestrateur V2-B-LOOP, **avant** chaque retry génération,
vérifier health Ollama. Si KO, abandonner rapidement (flag run-level
`fail_reason=ollama_unavailable`) plutôt qu'épuiser 4 retries silencieusement.

### Option 3 — Externaliser reset au runner bench

Laisser `reset-session.ts` se contenter du kill (contrat scellé v0.55),
mais côté runner bench (`bench-dedale-night.ts`), ajouter une étape
`ensureOllamaHealthy()` entre chaque run qui fait le vrai restart.

**Recommandation IA** : Option 1 en priorité (cohérence avec v0.55
RESET-FIRST design), Option 2 en défense en profondeur.

---

## Critère d'acceptance fix

- Prochain bench Dédale (30+ runs minimum) : **error rate < 5 %**.
- Aucune ligne `[OLLAMA] Failed after 4 attempts` suivant un
  `killed_serve: true` dans les logs.
- `reset_failed` verdicts : si observés, doivent **bloquer** la suite
  du run plutôt que laisser V2-B-LOOP boucler à vide.

---

## Actions

- [ ] Fix `reset-session.ts` (Option 1) avec tests unitaires mock.
- [ ] Re-bench mini 30 runs sur même corpus R2 pour valider critère
      d'acceptance.
- [ ] Si fix OK : re-mesurer TP/FP ADR-005 r2 sur surface complète
      (240 chunks attendus) pour verdict empirique consolidé.

---

## Lien vers contextes amont

- Bench source : `outputs/bench_dedale_night/BENCH_DEDALE_NIGHT_20260422/`
- Verdict R2 : `DEDALE_BENCH_R2_ADR005_VERDICT_v1.md` §6
- Module impacté : `packages/sovereign-engine/src/dedale/reset-session.ts`
- Orchestrateur consumer : `packages/sovereign-engine/src/dedale/orchestrator.ts`
  + `packages/sovereign-engine/src/generation/chunked-generator.ts` (V2-B-LOOP
  branch Dédale-enabled)
