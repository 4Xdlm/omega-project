# OMEGA BLOC 7 — Pipeline hybride 32 runs
**Date** : 2026-03-31 | **Branch** : phase-r-metrology-rebuild
**Architecture** : Ollama draft + Claude judge (hybrid-provider.ts)
**Runs** : 32 (4 scenes x 8 runs) | **Cout** : ~$0.024/run

---

## 1. Criteres de validation

| Critere | Seuil | Source |
|---------|-------|--------|
| composite_hybride_moyen | >= 86.95 | Claude 88.95 - 2.0 (D-BLOC5) |
| std_hybride | <= 4.30 | Claude 2.15 x 2.0 |
| Erreurs | 0/32 | Fiabilite pipeline |

## 2. Reference Claude (BLOC 2)

| Metrique | Claude (31 runs) |
|----------|-----------------|
| Composite moyen | 88.95 |
| Composite std | 2.15 |
| Min | 83.82 |
| Max | 92.11 |

## 3. Resultats hybride (EN ATTENTE)

Script pret : `npx tsx scripts/collect-bench-hybrid-32.ts`

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
cd C:\Users\elric\omega-project\packages\sovereign-engine
npx tsx scripts/collect-bench-hybrid-32.ts
```

Duree estimee : ~35 min (32 runs x ~65s)

## 4. Verdict (EN ATTENTE)

A completer apres execution.

---

**Standard : OMEGA NASA-Grade L4 / DO-178C Level A**
