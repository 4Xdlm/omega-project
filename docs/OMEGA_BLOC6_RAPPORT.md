# OMEGA BLOC 6 — Architecture hybride Ollama + Claude
**Date** : 2026-03-31 | **Branch** : phase-r-metrology-rebuild
**Decision source** : D-BLOC5-HYBRIDE

---

## 1. Architecture implementee

### hybrid-provider.ts

Provider drop-in compatible `SovereignProvider` qui route automatiquement :

| Methode | Destination | Cout |
|---------|-------------|------|
| `generateDraft()` | **Ollama** (qwen3.5:35b-a3b) | 0€ |
| `scoreInteriority()` | Claude Sonnet | ~$0.003 |
| `scoreSensoryDensity()` | Claude Sonnet | ~$0.003 |
| `scoreNecessity()` | Claude Sonnet | ~$0.003 |
| `scoreImpact()` | Claude Sonnet | ~$0.003 |
| `applyPatch()` | Claude Sonnet | ~$0.003 |
| `generateStructuredJSON()` | Claude Sonnet | ~$0.003 |
| `rewriteSentence()` | Claude Sonnet | ~$0.003 |

### Usage

```typescript
import { createHybridProvider } from '../src/runtime/hybrid-provider.js';

const provider = createHybridProvider({
  claudeApiKey: process.env.ANTHROPIC_API_KEY,
  ollamaModel: 'qwen3.5:35b-a3b',   // default
  claudeModel: 'claude-sonnet-4-20250514',  // default
});

// Drop-in — meme interface que createAnthropicProvider()
const result = await runSovereignForgeWithPacket(packet, provider);
```

### Retrocompatibilite

- `createAnthropicProvider()` inchange — tout-Claude
- `createHybridProvider()` nouveau — Ollama draft + Claude judge
- Engine.ts non modifie — le provider est injecte par l'appelant
- Tests : 2022 GREEN (0 regression)

---

## 2. Validation (en attente)

Script pret : `npx tsx scripts/validate-hybrid.ts`
Necessite `ANTHROPIC_API_KEY` pour le Claude judge.

### Criteres de validation

| Critere | Seuil | Statut |
|---------|-------|--------|
| Runs complets | 4/4 | EN ATTENTE |
| Composite moyen | >= 87 | EN ATTENTE |
| Logs [HYBRID] draft → ollama | Present | EN ATTENTE |
| Logs [HYBRID] judge → claude | Present | EN ATTENTE |

### Commande de validation

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
cd C:\Users\elric\omega-project\packages\sovereign-engine
npx tsx scripts/validate-hybrid.ts
```

---

## 3. Cout estime

### Par run complet (1 scene)

| Composant | Appels | Moteur | Cout |
|-----------|--------|--------|------|
| Draft generation | 4-8 (chunked) | Ollama | 0€ |
| Duel (3 candidats) | 3 | Ollama | 0€ |
| V3 Judge scoring | 4-6 | Claude | ~$0.015 |
| Micro-surgery | 1-3 | Claude | ~$0.009 |
| **Total** | | | **~$0.024** |

### Comparaison

| Architecture | Cout/run | Cout/chapitre (4 scenes) | Reduction |
|-------------|----------|--------------------------|-----------|
| Tout-Claude (actuel) | ~$0.15 | ~$0.60 | reference |
| **Hybride** | **~$0.024** | **~$0.10** | **-83%** |
| Tout-Ollama (sans V3) | $0.00 | $0.00 | -100% (qualite non garantie) |

---

## 4. Fichiers

| Fichier | Description |
|---------|-------------|
| `src/runtime/hybrid-provider.ts` | Provider hybride Ollama+Claude |
| `scripts/validate-hybrid.ts` | Script de validation 4 runs |
| `docs/OMEGA_BLOC6_RAPPORT.md` | Ce rapport |

---

## 5. Prochaines etapes

1. **Executer validate-hybrid.ts** avec API key Claude
2. Si composite >= 87 : BLOC 6 VALIDE
3. Si composite < 87 : diagnostiquer la difference Ollama draft vs Claude draft
4. Optionnel : bench 32 runs hybride pour comparaison directe avec BLOC 2

---

**Standard : OMEGA NASA-Grade L4 / DO-178C Level A**
