# OMEGA — LLM Local via Ollama

> **Date** : 2026-03-31
> **Statut** : ✅ Opérationnel — Intégration validée
> **Package** : `packages/scribe-engine/src/providers/ollama-provider.ts`

---

## Résumé

OMEGA peut maintenant générer de la prose littéraire française **en local**,
sans appel API cloud, via Ollama et des modèles open-weight.
Le coût par appel local est de **0 €**.

Le provider Ollama s'intègre dans l'architecture existante du `scribe-engine`
avec la même interface `ScribeProvider` que les providers Claude et mock.

---

## Infrastructure

### Matériel requis

| Composant | Minimum recommandé | Config de référence |
|-----------|--------------------|---------------------|
| GPU | NVIDIA RTX avec ≥16 Go VRAM | RTX 5090 (32 Go VRAM) |
| RAM | 32 Go | 64 Go DDR5 |
| Stockage | 80 Go libres (modèles) | SSD NVMe |
| OS | Windows 10/11 ou Linux | Windows 11 |

### Logiciel

| Composant | Version | Installation |
|-----------|---------|-------------|
| Ollama | ≥ 0.19.0 | `https://ollama.com/download/windows` |
| Node.js | ≥ 20 | Déjà dans le monorepo |

### Variables d'environnement Ollama

```powershell
setx OLLAMA_MODELS "C:\ollama-models"     # Dossier de stockage des modèles
setx OLLAMA_ORIGINS "*"                    # Autoriser les appels cross-origin
setx OLLAMA_FLASH_ATTENTION "1"            # Boost de performance GPU
```

Redémarrer Ollama après modification des variables.

---

## Modèles

### Résultats du benchmark OMEGA (2026-03-31)

Benchmark exécuté avec 6 tests littéraires (prose courte, moyenne, longue,
correction anti-cliché, contraintes strictes, continuité stylistique)
évalués sur 9 critères pondérés (densité sensorielle ×3, intériorité ×3,
anti-cliché ×3, registre ×2, rythme ×2, tenue ×2, consignes ×2,
cohérence ×1, lexique ×1). Score max : 95 points.

| Modèle | Score moyen | Vitesse | VRAM | Verdict |
|--------|-------------|---------|------|---------|
| **qwen3.5:35b-a3b** | **67.3 /95** | **143 t/s** | ~22 Go | 🏆 Moteur principal |
| qwen3:32b | 61.5 /95 | 34 t/s | ~20 Go | ✅ Backup |
| mistral-small:24b | 42.2 /95 | 85 t/s | ~14 Go | ❌ Éliminé |

### Installation des modèles

```powershell
# Obligatoire — moteur principal
ollama pull qwen3.5:35b-a3b    # 23 Go

# Recommandé — backup / second avis
ollama pull qwen3:32b           # 20 Go
```

### Pourquoi qwen3.5:35b-a3b

Ce modèle utilise une architecture MoE (Mixture of Experts) qui n'active
que 3B de paramètres par token sur 35B au total. Résultat :

- **4× plus rapide** que qwen3:32b (143 vs 34 t/s)
- **Meilleure prose** sur les tests OMEGA (67.3 vs 61.5)
- Tient entièrement en VRAM (22 Go < 32 Go disponibles)
- Laisse 10 Go de VRAM pour le KV Cache → chapitres longs OK

Sur les tests du bench, il a produit :
- De meilleures métaphores (moins de clichés que qwen3:32b)
- Une meilleure tenue sur la longueur (1500+ mots sans effondrement)
- Un meilleur respect des contraintes (continuité stylistique quasi parfaite)
- Des corrections anti-cliché plus précises et plus sobres

### Pourquoi PAS mistral-small:24b

Malgré sa réputation de "bon en français natif", il a produit une prose
trop plate et journalistique pour les exigences OMEGA : clichés récurrents
("danse incessante entre l'homme et la mer"), intériorité nommée au lieu
de montrée ("il se sentait triste"), et incapacité à tenir le registre
soutenu sur la longueur. Éliminé du pipeline.

---

## Paramètre critique : `think: false`

Les modèles Qwen (qwen3, qwen3.5) activent par défaut un mode
"thinking" qui consomme 100% des tokens en réflexion interne.
**Sans `think: false`, le modèle produit 0 mot de prose visible.**

Ce comportement a été découvert et résolu pendant le benchmark.
Le provider `ollama-provider.ts` détecte automatiquement les modèles
Qwen et injecte `think: false` dans chaque appel. Ce paramètre est
câblé en dur et ne doit jamais être retiré.

```typescript
// Dans callOllamaSync() — ollama-provider.ts
const isQwen = model.toLowerCase().includes('qwen');
// ...
body: JSON.stringify({
  model,
  messages: [...],
  stream: false,
  ...(isQwen ? { think: false } : {}),  // OBLIGATOIRE
  options: { temperature, num_predict, top_p },
})
```

---

## Architecture

### Fichiers

```
packages/scribe-engine/src/providers/
├── ollama-provider.ts    ← Provider Ollama local (NOUVEAU)
├── llm-provider.ts       ← Provider Claude API (existant)
├── mock-provider.ts      ← Provider mock pour tests (existant)
├── master-prompt.ts      ← SCRIBE MASTER PROMPT (partagé)
├── factory.ts            ← Factory — route selon le mode
├── types.ts              ← Types — mode 'ollama' ajouté
└── index.ts              ← Exports
```

### Routing automatique par tâche

Le provider Ollama route automatiquement vers le bon modèle
selon le type de tâche demandé :

| Tâche | Modèle | Vitesse | Usage |
|-------|--------|---------|-------|
| `prose` | qwen3.5:35b-a3b | ~143 t/s | Génération de scènes |
| `continuation` | qwen3.5:35b-a3b | ~143 t/s | Suite d'un texte existant |
| `correction` | qwen3.5:35b-a3b | ~143 t/s | Corrections anti-cliché |
| `repair` | qwen3.5:35b-a3b | ~143 t/s | Auto-repair ProsePack |
| `rewrite` | qwen3.5:35b-a3b | ~143 t/s | Réécriture de passages |

Le modèle peut être forcé via `forceModel` pour utiliser
`qwen3:32b` (second avis) ou un futur `qwen3:72b` (rendu de nuit).

### Pipeline OMEGA complet

```
┌─────────────────────────────────────────────┐
│            OMEGA PROSE PIPELINE              │
├─────────────────────────────────────────────┤
│                                              │
│  PHASE 1 — Itérations / Auto-repair         │
│  → mode: 'ollama', task: 'repair'           │
│  → qwen3.5:35b-a3b (~143 t/s)              │
│  → Coût : 0 €                               │
│                                              │
│  PHASE 2 — Génération de prose              │
│  → mode: 'ollama', task: 'prose'            │
│  → qwen3.5:35b-a3b (~143 t/s)              │
│  → Coût : 0 €                               │
│                                              │
│  PHASE 3 — Second avis (optionnel)          │
│  → mode: 'ollama', forceModel: 'qwen3:32b' │
│  → qwen3:32b (~34 t/s)                     │
│  → Coût : 0 €                               │
│                                              │
│  PHASE 4 — Validation finale                │
│  → mode: 'llm' (Claude Sonnet API)         │
│  → Coût : ~0.003-0.015 € / chapitre        │
│                                              │
└─────────────────────────────────────────────┘
```

---

## Usage

### Créer un provider

```typescript
import { createScribeProvider } from '@omega/scribe-engine';
import type { OllamaProviderConfig } from '@omega/scribe-engine';

// Génération de prose — routing automatique
const prose = createScribeProvider({ mode: 'ollama' }, 'prose');

// Corrections rapides
const corrector = createScribeProvider({ mode: 'ollama' }, 'correction');

// Continuation de texte
const cont = createScribeProvider({ mode: 'ollama' }, 'continuation');

// Auto-repair ProsePack
const repair = createScribeProvider({ mode: 'ollama' }, 'repair');

// Forcer un modèle spécifique (second avis)
const backup = createScribeProvider({
  mode: 'ollama',
  forceModel: 'qwen3:32b',
} as OllamaProviderConfig, 'prose');

// Validation finale via Claude (inchangé)
const validator = createScribeProvider({
  mode: 'llm',
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

### Appeler le provider

```typescript
const result = prose.generateSceneProse(prompt, {
  sceneId: 'ch01-scene-003',
  arcId: 'arc-traversee',
  skeletonHash: sha256(skeleton),
  seed: 'golden-run-42',
});

console.log(result.prose);       // Le texte généré
console.log(result.model);       // 'qwen3.5:35b-a3b'
console.log(result.proseHash);   // SHA256 de la prose
console.log(result.cached);      // true si lu depuis le cache
```

### Configuration avancée

```typescript
const config: OllamaProviderConfig = {
  mode: 'ollama',
  ollamaUrl: 'http://localhost:11434',  // URL du serveur Ollama
  modelProse: 'qwen3.5:35b-a3b',       // Modèle pour prose
  modelFast: 'qwen3.5:35b-a3b',        // Modèle pour corrections
  modelHeavy: 'qwen3:72b',             // Modèle pour rendu final
  forceModel: undefined,                 // Override global (optionnel)
  temperature: 0.8,                      // Créativité
  maxTokens: 8192,                       // Longueur max de sortie
  cacheDir: './cache/ollama',            // Dossier de cache (optionnel)
};
```

---

## Gestion du contexte long (chapitres 3000-5000 mots)

Un chapitre OMEGA de 4000 mots + system prompt SCRIBE + contexte de scène
représente environ 10 000 à 18 000 tokens en entrée. Le KV Cache (mémoire
interne du modèle pendant la génération) consomme de la VRAM en proportion.

### Budget VRAM sur RTX 5090 (32 Go)

| Modèle | Poids | KV Cache libre | Contexte max confortable |
|--------|-------|----------------|--------------------------|
| qwen3.5:35b-a3b | ~22 Go | ~10 Go | ~32k tokens ✅ |
| qwen3:32b | ~20 Go | ~12 Go | ~32k tokens ✅ |
| qwen3:72b (Q4) | ~42 Go | Spillover RAM | ~8k tokens ⚠️ |

Le qwen3.5:35b-a3b tient un chapitre complet en VRAM sans problème.
Le qwen3:72b déborde sur la RAM (spillover) et tombe à 3-10 t/s —
à réserver pour le rendu de nuit asynchrone si nécessaire.

---

## API Ollama

Le provider utilise l'API native Ollama (`/api/chat`), pas l'API
compatible OpenAI (`/v1/chat/completions`), pour pouvoir contrôler
le paramètre `think`.

### Endpoint utilisé

```
POST http://localhost:11434/api/chat
```

### Corps de la requête

```json
{
  "model": "qwen3.5:35b-a3b",
  "messages": [
    { "role": "system", "content": "<SCRIBE_SYSTEM_PROMPT>" },
    { "role": "user", "content": "<scene prompt>" }
  ],
  "stream": false,
  "think": false,
  "options": {
    "temperature": 0.8,
    "num_predict": 8192,
    "top_p": 0.92
  }
}
```

---

## Vérification et diagnostic

### Vérifier qu'Ollama tourne

```powershell
curl http://localhost:11434/api/tags
```

Réponse attendue : JSON avec la liste des modèles installés.

### Lancer Ollama si arrêté

```powershell
Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
```

### Lister les modèles

```powershell
ollama list
```

### Test d'intégration OMEGA

```powershell
cd C:\Users\elric\omega-project\packages\scribe-engine
npx tsx tests/ollama-integration.test.ts
```

Résultat attendu : 3 tests ✅ (prose, correction, force model).

### Test rapide en ligne de commande

```powershell
# Vérifier que think:false fonctionne
curl http://localhost:11434/api/chat -d '{
  "model": "qwen3.5:35b-a3b",
  "messages": [{"role":"user","content":"Écris une phrase."}],
  "stream": false,
  "think": false
}'
```

---

## Historique des décisions

| Date | Décision | Justification |
|------|----------|---------------|
| 2026-03-31 | Ollama comme serveur local | API REST compatible, simple, gratuit |
| 2026-03-31 | qwen3.5:35b-a3b comme moteur principal | Bench winner : 67.3/95, 143 t/s |
| 2026-03-31 | qwen3:32b comme backup | Dense, tous params actifs, bon en structuration |
| 2026-03-31 | mistral-small:24b éliminé | Prose trop plate, clichés, intériorité explicite |
| 2026-03-31 | think: false obligatoire | Sans ça, Qwen produit 0 mot de prose |
| 2026-03-31 | API native Ollama (pas OpenAI-compat) | Seule API supportant le param `think` |
| 2026-03-31 | Prompts dynamiques (pas de Modelfile) | Le modèle reste vanille, toute l'intelligence est dans le code TypeScript |
