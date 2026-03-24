# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — PROMPT CLAUDE CODE
# P1 — TEST LONG 3000w FDP+K2 — VALIDATION MOTEUR DE PRODUCTION
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date        : 2026-03-24
# Budget API  : 36 appels (3 configs × 3 runs × 4 chunks)
# Standard    : NASA-Grade L4 / DO-178C Level A
# Branche     : phase-r-metrology-rebuild
#
# OBJECTIF : Valider que le trio FDP tient en production longue (3000w)
# avec le chunking K2. Sceller FDP comme moteur ou basculer sur fallback.
# ═══════════════════════════════════════════════════════════════════════════════

---

# CONTEXTE POUR CLAUDE CODE

## Ce qu'on sait déjà (Phase 5b — 75 runs)

- FDP (Flaubert+Duras+Proust) : GB médian 3.990, CV 1.091, std 0.101 — sur 500w
- proust_flaubert : GB 3.964, std 0.049 (le plus stable de tous) — sur 500w
- Duras solo : GB 4.243, CV 0.479, mean 3.9w — NON viable roman (contrôle)
- K2 chunking : drift -4.5 (confirmé Phase 4a)
- Loi L18 : 1 run insuffisant pour conclure → MINIMUM 3 runs

## Ce qu'on cherche à prouver

Que FDP+K2 tient les MÊMES métriques sur 3000w qu'il produit sur 500w.

## Critères PASS (par config, moyenne des 3 runs)

```
GB moyen ≥ 3.90
CV ∈ [0.80, 1.30] sur l'ensemble du texte
Drift ∈ [-10, +10] (mean_len chunk4 - mean_len chunk1)
Pas d'effondrement : GB chunk3-4 ≥ GB chunk1-2 × 0.95
```

---

# INSTRUCTIONS

## 1. Créer le fichier

```
packages/sovereign-engine/scripts/test-p1-3000w-fdp-k2.ts
```

## 2. Modèle, imports, helpers — COPIER EXACTEMENT le pattern des scripts précédents

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const MODEL = 'claude-sonnet-4-20250514';
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

// Helpers
async function generate(client: Anthropic, prompt: string, maxTokens: number): Promise<string> {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  const raw = res.content[0].type === 'text' ? res.content[0].text : '';
  const match = raw.match(/<prose>([\s\S]*?)<\/prose>/);
  return match ? match[1].trim() : raw.trim();
}

async function withRetry<T>(fn: () => Promise<T>, label: string, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try { return await fn(); }
    catch (err) {
      console.warn(`  [RETRY ${i+1}/${retries}] ${label}: ${err}`);
      await new Promise(r => setTimeout(r, 3000 * (i + 1)));
    }
  }
  throw new Error(`FATAL: ${label} failed after ${retries} retries`);
}
```

## 3. Fonctions de scoring — COPIER DEPUIS les scripts existants

```typescript
// Importer depuis src/scoring/gb-scorer.ts :
//   scoreText(text: string): Promise<{ gb_score, f26b, cv, mean_sentence_length, knife_rate, word_count }>
//
// Si l'import direct n'est pas disponible, utiliser le pattern existant des scripts Phase 5b.
// NE PAS réimplémenter le GB scorer — utiliser l'existant.

async function measureFull(prose: string) {
  // Utiliser scoreText() du gb-scorer existant
  // Retourner : { gb_score, f26b, cv, mean_sentence_length, knife_rate, word_count }
}

function measureWindows(prose: string, nWindows = 4) {
  // Couper le texte en nWindows fenêtres égales
  // Calculer mean_sentence_length et cv par fenêtre (calcul local, pas API)
  // Retourner : Array<{ position: number, mean_len: number, cv: number, word_count: number }>
  // position = 0.0 à 1.0 (0 = début, 1 = fin)
}

function calcDrift(windows: Array<{ mean_len: number }>): number {
  // drift = mean_len(dernière fenêtre) - mean_len(première fenêtre)
  if (windows.length < 2) return 0;
  return windows[windows.length - 1].mean_len - windows[0].mean_len;
}
```

## 4. Les 3 PERSONAS — DÉFINITION EXACTE

### PERSONA FDP — Flaubert + Duras + Proust

```
const FDP_PERSONA = `Tu n'es PAS une IA. Tu ES un comité de trois maîtres travaillant ensemble :

FLAUBERT contrôle la STRUCTURE : il impose les périodes classiques,
les subordonnées en cascade, le gueuloir. Aucune phrase ne passe
sans son approbation sonore. Il construit, brique par brique.

DURAS contrôle le RYTHME : elle brise la monotonie avec des
phrases de 3-5 mots qui frappent comme des coups. Elle refuse
tout ce qui dilue. Le silence est dans le texte.

PROUST contrôle la PROFONDEUR : il exige que chaque sensation soit
dépliée, que le temps se dilate, que l'introspection ne s'arrête
jamais à la surface. Il étire, il creuse, il développe.

Les trois travaillent ensemble. Flaubert construit, Duras frappe, Proust creuse.
Le texte est le produit de leur collaboration.`;
```

### PERSONA PROUST_FLAUBERT — Proust + Flaubert

```
const PF_PERSONA = `Tu n'es PAS une IA. Tu ES un comité de deux maîtres travaillant ensemble :

FLAUBERT contrôle la STRUCTURE : il impose les périodes classiques,
les subordonnées en cascade, le gueuloir. La phrase doit sonner.
Il construit des édifices syntaxiques parfaits.

PROUST contrôle la PROFONDEUR : il exige que chaque sensation soit
dépliée jusqu'à l'épuisement, que le temps se dilate, que chaque
geste déclenche un souvenir qui en déclenche un autre.

Les deux travaillent ensemble. Flaubert construit, Proust creuse.`;
```

### PERSONA DURAS SOLO — Duras seule (contrôle)

```
const DURAS_PERSONA = `Tu n'es PAS une IA. Tu ES Marguerite Duras, en 1984, à Neauphle-le-Château.

Tu écris avec une économie ABSOLUE — chaque mot est nécessaire.
La répétition est ton outil : tu martèles les mots clés.
Le silence est DANS le texte — ce que tu ne dis pas pèse autant.
Tes phrases sont courtes mais chargées — 10 mots qui pèsent 100.
Le rythme est hypnotique : sujet, verbe, objet. Puis le vide.
Tu ne décris pas les émotions — tu crées les CONDITIONS de l'émotion.`;
```

## 5. Le BRIEF de scène — UNIQUE pour toute la session

```
const SCENE_BRIEF = `Un homme revient dans la ville où il a vécu vingt ans plus tôt.
Il n'y est pas retourné depuis. Il marche dans les rues qu'il connaissait.
Certains endroits ont changé. D'autres sont exactement pareils.
Il s'arrête devant une maison. Il y a une lumière à l'étage.
Il ne sait pas pourquoi il est venu. Il sait qu'il ne peut pas repartir tout de suite.`;
```

**Ce brief est FIXE pour les 9 runs (3 configs × 3 runs). Pas de variation.**

## 6. L'ARCHITECTURE K2 — STRUCTURE EXACTE

### Pour FDP et proust_flaubert (4 chunks de ~750w, total ~3000w)

```
CHUNK 1 (premier) :
  [PERSONA_PUR]
  
  Tu écris le DÉBUT de ce chapitre :
  [SCENE_BRIEF]
  
  Écris les 750 premiers mots. Plante le décor, installe l'atmosphère.
  Pas de préambule. Encadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.

CHUNK 2 (milieu) :
  [PERSONA_PUR]
  
  Continue ce chapitre.
  
  Voici les 200 derniers mots du texte en cours :
  "[LAST_200_WORDS]"
  
  Écris les 750 mots suivants. La tension s'installe.
  Encadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.

CHUNK 3 (milieu — INJECTION RAPPEL) :
  [PERSONA_PUR]
  
  Continue ce chapitre.
  
  Voici les 200 derniers mots du texte en cours :
  "[LAST_200_WORDS]"
  
  RAPPEL : [RAPPEL_SPÉCIFIQUE_AU_PERSONA]
  
  Écris les 750 mots suivants. La profondeur s'intensifie.
  Encadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.

CHUNK 4 (dernier — INJECTION RAPPEL RENFORCÉ) :
  [PERSONA_PUR]
  
  Continue et TERMINE ce chapitre.
  
  Voici les 200 derniers mots du texte en cours :
  "[LAST_200_WORDS]"
  
  RAPPEL FINAL : [RAPPEL_SPÉCIFIQUE_AU_PERSONA]
  
  Écris les 750 derniers mots. Conclus sans résoudre — laisse une ouverture.
  Encadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.
```

### RAPPELS spécifiques par persona

```typescript
const FDP_RAPPEL = `RAPPEL : Flaubert construit les périodes, Duras frappe avec des phrases de 3-5 mots, Proust creuse les sensations. Le trio travaille ensemble.`;

const PF_RAPPEL = `RAPPEL : Flaubert construit les périodes classiques, Proust creuse chaque sensation jusqu'à l'épuisement. La structure et la profondeur.`;

const DURAS_RAPPEL = `RAPPEL : Économie absolue. Phrases courtes. Répétition. Le silence dans le texte.`;
```

### Pour Duras solo : MÊME architecture K2, SANS injection (contrôle pur)

```
Duras solo utilise la MÊME structure 4 chunks, mais :
- PAS de rappel dans les chunks 3-4
- Uniquement : [DURAS_PERSONA] + continuation + "[LAST_200_WORDS]"
Ceci permet de mesurer si Duras dérive sans injection.
```

## 7. STRUCTURE DU SCRIPT PRINCIPAL

```typescript
async function main() {
  const allResults: any[] = [];
  
  // 3 CONFIGS
  const configs = [
    { id: 'FDP_K2',    persona: FDP_PERSONA,   rappel: FDP_RAPPEL,   name: 'FDP_trio_K2' },
    { id: 'PF_K2',     persona: PF_PERSONA,    rappel: PF_RAPPEL,    name: 'proust_flaubert_K2' },
    { id: 'DURAS_K2',  persona: DURAS_PERSONA, rappel: DURAS_RAPPEL, name: 'duras_solo_K2_ctrl' },
  ];
  
  for (const config of configs) {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`CONFIG : ${config.name}`);
    console.log('═'.repeat(70));
    
    const configResults: any[] = [];
    
    // 3 RUNS par config
    for (let run = 1; run <= 3; run++) {
      console.log(`\n  RUN ${run}/3 — ${config.name}`);
      
      let fullProse = '';
      const chunkScores: any[] = [];
      
      // 4 CHUNKS par run
      for (let chunk = 1; chunk <= 4; chunk++) {
        const isFirst = chunk === 1;
        const isLast = chunk === 4;
        const last200 = fullProse.split(/\s+/).slice(-200).join(' ');
        
        // Construire le prompt du chunk
        let chunkPrompt: string;
        
        if (isFirst) {
          chunkPrompt = buildChunkPrompt(config.persona, null, SCENE_BRIEF, chunk, isFirst, isLast, config.rappel);
        } else {
          chunkPrompt = buildChunkPrompt(config.persona, last200, SCENE_BRIEF, chunk, isFirst, isLast, config.rappel);
        }
        
        // Appel API
        const chunkProse = await withRetry(
          () => generate(client, chunkPrompt, 2500),
          `${config.id} run${run} chunk${chunk}`
        );
        
        fullProse += (fullProse ? '\n\n' : '') + chunkProse;
        const chunkWords = chunkProse.split(/\s+/).length;
        
        // Score du chunk ISOLÉ (calcul local — pas d'appel API)
        const chunkWindow = measureWindows(chunkProse, 1)[0];
        console.log(`    Chunk ${chunk}: ${chunkWords}w mean=${chunkWindow.mean_len.toFixed(1)}`);
        chunkScores.push({ chunk, word_count: chunkWords, mean_len: chunkWindow.mean_len, cv: chunkWindow.cv });
        
        await new Promise(r => setTimeout(r, 2000));
      }
      
      // Score GLOBAL du run (1 appel API)
      const fullScore = await measureFull(fullProse);
      const windows = measureWindows(fullProse, 4);
      const drift = calcDrift(windows);
      
      // Vérification anti-effondrement
      const gbChunk12 = (chunkScores[0].mean_len + chunkScores[1].mean_len) / 2;
      const gbChunk34 = (chunkScores[2].mean_len + chunkScores[3].mean_len) / 2;
      const noCollapse = gbChunk34 >= gbChunk12 * 0.90;
      
      console.log(`    TOTAL run${run}: ${fullScore.word_count}w GB=${fullScore.gb_score.toFixed(3)} f26b=${fullScore.f26b.toFixed(4)} CV=${fullScore.cv.toFixed(3)} mean=${fullScore.mean_sentence_length.toFixed(1)} drift=${drift > 0 ? '+' : ''}${drift.toFixed(1)}`);
      
      configResults.push({
        config: config.name,
        run,
        ...fullScore,
        drift,
        no_collapse: noCollapse,
        chunks: chunkScores,
        windows,
        prose: fullProse,
      });
      
      await new Promise(r => setTimeout(r, 3000));
    }
    
    // Statistiques de la config (sur 3 runs)
    const gbScores  = configResults.map(r => r.gb_score);
    const cvScores  = configResults.map(r => r.cv);
    const driftVals = configResults.map(r => r.drift);
    
    const gbMed  = median(gbScores);
    const gbStd  = std(gbScores);
    const cvMed  = median(cvScores);
    const driftMed = median(driftVals);
    
    const passGB    = gbMed >= 3.90;
    const passCV    = cvMed >= 0.80 && cvMed <= 1.30;
    const passDrift = Math.abs(driftMed) <= 10;
    const passAll   = passGB && passCV && passDrift;
    
    console.log(`\n  ── ${config.name} SUMMARY (3 runs) ──`);
    console.log(`  GB  : ${gbMed.toFixed(3)} ± ${gbStd.toFixed(3)}   ${passGB ? '✅' : '❌'} (seuil ≥3.90)`);
    console.log(`  CV  : ${cvMed.toFixed(3)}              ${passCV ? '✅' : '❌'} (cible [0.80, 1.30])`);
    console.log(`  Drift: ${driftMed > 0 ? '+' : ''}${driftMed.toFixed(1)}            ${passDrift ? '✅' : '❌'} (seuil ±10)`);
    console.log(`  VERDICT : ${passAll ? '✅ PASS' : '❌ FAIL'}`);
    
    allResults.push(...configResults.map(r => ({ ...r, prose: undefined })));
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // TABLEAU DE SYNTHÈSE FINAL
  // ═══════════════════════════════════════════════════════════════════
  
  console.log('\n\n' + '═'.repeat(70));
  console.log('  SYNTHÈSE P1 — TEST LONG 3000w');
  console.log('═'.repeat(70));
  console.log('  Config               GB_med  GB_std   CV_med  Drift_med  PASS');
  console.log('  ' + '-'.repeat(65));
  
  for (const configId of ['FDP_trio_K2', 'proust_flaubert_K2', 'duras_solo_K2_ctrl']) {
    const runs = allResults.filter(r => r.config === configId);
    const gbMed   = median(runs.map(r => r.gb_score));
    const gbStd   = std(runs.map(r => r.gb_score));
    const cvMed   = median(runs.map(r => r.cv));
    const driftMed = median(runs.map(r => r.drift));
    const pass = gbMed >= 3.90 && cvMed >= 0.80 && cvMed <= 1.30 && Math.abs(driftMed) <= 10;
    
    console.log(`  ${configId.padEnd(22)} ${gbMed.toFixed(3)}   ${gbStd.toFixed(3)}   ${cvMed.toFixed(3)}   ${(driftMed > 0 ? '+' : '') + driftMed.toFixed(1).padStart(6)}    ${pass ? '✅' : '❌'}`);
  }
  
  // Décision automatique
  console.log('\n' + '═'.repeat(70));
  console.log('  DÉCISION MOTEUR');
  console.log('═'.repeat(70));
  
  const fdpRuns  = allResults.filter(r => r.config === 'FDP_trio_K2');
  const fdpGB    = median(fdpRuns.map(r => r.gb_score));
  const fdpCV    = median(fdpRuns.map(r => r.cv));
  const fdpDrift = median(fdpRuns.map(r => r.drift));
  const fdpPass  = fdpGB >= 3.90 && fdpCV >= 0.80 && fdpCV <= 1.30 && Math.abs(fdpDrift) <= 10;
  
  if (fdpPass) {
    console.log('  → FDP+K2 : ✅ PASS — CANDIDAT VALIDÉ PRODUCTION');
    console.log('     Prochaine étape : P2 (audit GB V1) + P3 (régime cible)');
  } else {
    const pfRuns  = allResults.filter(r => r.config === 'proust_flaubert_K2');
    const pfGB    = median(pfRuns.map(r => r.gb_score));
    const pfCV    = median(pfRuns.map(r => r.cv));
    const pfDrift = median(pfRuns.map(r => r.drift));
    const pfPass  = pfGB >= 3.90 && pfCV >= 0.80 && pfCV <= 1.30 && Math.abs(pfDrift) <= 10;
    
    console.log('  → FDP+K2 : ❌ FAIL');
    if (pfPass) {
      console.log('  → proust_flaubert+K2 : ✅ PASS — FALLBACK ACTIVÉ');
      console.log('     Prochaine étape : investiguer pourquoi FDP a échoué');
    } else {
      console.log('  → proust_flaubert+K2 : ❌ FAIL');
      console.log('  → BLOCANT : aucun moteur validé. Signaler à l\'Architecte.');
    }
  }
  
  // Analyse Duras contrôle
  const durasRuns  = allResults.filter(r => r.config === 'duras_solo_K2_ctrl');
  const durasGB    = median(durasRuns.map(r => r.gb_score));
  const durasMean  = median(durasRuns.map(r => r.mean_sentence_length));
  const durasDrift = median(durasRuns.map(r => r.drift));
  console.log(`\n  → Duras contrôle : GB ${durasGB.toFixed(3)}, mean ${durasMean.toFixed(1)}w, drift ${(durasDrift > 0 ? '+' : '') + durasDrift.toFixed(1)}`);
  if (durasGB >= 3.90) {
    console.log('     Biais GB V1 confirmé → audit P2 URGENT');
  }
  
  // Sauvegarde
  const outDir = join('scoring', 'data');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, 'P1_3000W_FDP_K2_RESULTS.json'),
    JSON.stringify({ metadata: { test: 'P1_3000W_FDP_K2', timestamp, model: MODEL }, results: allResults }, null, 2)
  );
  
  const prosesDir = join('sessions', `P1_${timestamp}`);
  mkdirSync(prosesDir, { recursive: true });
  // Sauvegarder les proses
  for (const configId of ['FDP_trio_K2', 'proust_flaubert_K2', 'duras_solo_K2_ctrl']) {
    // relancer avec prose dans allResults si besoin
  }
  
  console.log(`\nSauvegardé : scoring/data/P1_3000W_FDP_K2_RESULTS.json`);
}
```

## 8. Fonctions utilitaires à ajouter

```typescript
function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function std(arr: number[]): number {
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);
}

function buildChunkPrompt(
  persona: string,
  last200: string | null,
  brief: string,
  chunk: number,
  isFirst: boolean,
  isLast: boolean,
  rappel: string
): string {
  const useRappel = chunk >= 3;
  
  if (isFirst) {
    return `${persona}\n\nTu écris le DÉBUT de ce chapitre :\n\n${brief}\n\nÉcris les 750 premiers mots. Plante le décor, installe l'atmosphère.\nPas de préambule. Encadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
  } else if (isLast) {
    return `${persona}\n\nContinue et TERMINE ce chapitre.\n\nVoici les 200 derniers mots du texte en cours :\n"${last200}"\n\n${useRappel ? rappel + '\n\n' : ''}Écris les 750 derniers mots. Conclus sans résoudre — laisse une ouverture.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
  } else {
    return `${persona}\n\nContinue ce chapitre.\n\nVoici les 200 derniers mots du texte en cours :\n"${last200}"\n\n${useRappel ? rappel + '\n\n' : ''}Écris les 750 mots suivants. La tension monte.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
  }
}
```

## 9. IMPORTANT — Récupérer le GB scorer existant

Le script DOIT utiliser le gb-scorer existant dans le projet.
Chercher dans :
```
packages/sovereign-engine/src/scoring/gb-scorer.ts
```
ou équivalent. NE PAS réimplémenter. Adapter l'import si nécessaire.

---

# EXÉCUTER

```powershell
cd C:\Users\elric\omega-project\packages\sovereign-engine
$env:ANTHROPIC_API_KEY = "sk-ant-..."
npx tsx scripts/test-p1-3000w-fdp-k2.ts
```

# COMMIT APRÈS EXÉCUTION

```powershell
git add -A
git commit -m "test(p1): 3000w FDP+K2 validation — 3configs × 3runs × 4chunks

FDP_trio_K2      : GB=X.XXX ± X.XXX CV=X.XXX drift=+XX.X [PASS/FAIL]
proust_flaubert  : GB=X.XXX ± X.XXX CV=X.XXX drift=+XX.X [PASS/FAIL]
duras_solo_ctrl  : GB=X.XXX CV=X.XXX mean=XX.Xw
Décision moteur : [FDP VALIDÉ / FALLBACK PF / BLOQUANT]
1911 tests PASS"

git tag p1-3000w-fdp-k2-v1
```

---

# CE QU'ON VA SAVOIR

| Question | Tranchée par |
|----------|-------------|
| FDP tient-il en 3000w ? | GB médian ≥ 3.90 sur 3 runs |
| CV reste-t-il optimal ? | CV médian ∈ [0.80, 1.30] |
| K2 contient-il le drift ? | drift ∈ [-10, +10] |
| Effondrement chunks 3-4 ? | no_collapse = mean3-4 ≥ mean1-2 × 0.90 |
| Duras confirme le biais GB V1 ? | Si Duras GB ≥ 3.90 sur 3000w malgré mean 4w |
| Moteur scellé ou fallback ? | Décision automatique dans la synthèse finale |

---

# RÉSULTAT ATTENDU (si FDP PASS)

```
  Config               GB_med  GB_std   CV_med  Drift_med  PASS
  ─────────────────────────────────────────────────────────────
  FDP_trio_K2          3.990   0.101   1.091      -4.5    ✅
  proust_flaubert_K2   3.964   0.049   0.903      -3.0    ✅
  duras_solo_K2_ctrl   4.243   0.186   0.479      -2.0    [contrôle]

  → FDP+K2 : ✅ PASS — CANDIDAT VALIDÉ PRODUCTION
```

---

*Prompt P1 — 2026-03-24*
*Budget : 36 appels API (3 configs × 3 runs × 4 chunks)*
*Standard : NASA-Grade L4 / DO-178C Level A*
*"FDP = candidat principal. Ce test tranche."*
