# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — PROMPT CLAUDE CODE
# P3 — RÉGIME CIBLE (3 scènes × 3 runs)
# P4 — CONTINUITÉ INTER-CHAPITRES (2 × 3000w consécutifs)
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date        : 2026-03-24
# Budget API  : P3 = 36 appels | P4 = 12 appels | Total = 48
# Standard    : NASA-Grade L4 / DO-178C Level A
# Branche     : phase-r-metrology-rebuild
#
# MOTEUR ACTIF : PF_base_Duras_correcteur_K2_v3
#   V2=100.0 / GB=4.071 / CV=0.906 / f26b=0.549 / drift=-9.7
#   Validé expérimentalement. Pas encore scellé production.
#
# OBJECTIFS :
#   P3 : Vérifier que le moteur v3 tient sur 3 types de scènes radicalement
#        différents. Sert également de garde-fou de réplication (Gemini).
#   P4 : Vérifier que 2 chapitres consécutifs ont le même profil métrique.
#        C'est le test de mémoire inter-chapitres.
# ═══════════════════════════════════════════════════════════════════════════════

---

# PERSONA — IDENTIQUE À V3 (NE PAS MODIFIER)

```typescript
const PF_PERSONA = `Tu n'es PAS une IA. Tu ES un duo littéraire travaillant ensemble :

FLAUBERT contrôle la STRUCTURE : il impose les périodes classiques,
les subordonnées en cascade, le gueuloir. Chaque phrase doit sonner.
Il construit des édifices syntaxiques concrets et ancrés dans le réel.

PROUST contrôle la PROFONDEUR : il exige que chaque sensation soit
dépliée jusqu'à l'épuisement, que le temps se dilate, que chaque
geste déclenche un souvenir qui en déclenche un autre. Il refuse
toute surface.

Les deux travaillent ensemble. Flaubert construit, Proust creuse.
Les phrases longues sont bienvenues — c'est leur nature commune.`;

const RAPPEL_CHUNKS12 = `RAPPEL DUO : Flaubert construit les périodes, Proust creuse chaque sensation.

RESPIRATION : leurs phrases sont longues et denses, mais pas infinies.
De temps en temps, une phrase courte tranche le flot — sèche, factuelle,
3 à 6 mots — avant que le duo reprenne son développement. Rare ici,
mais présente. La longueur moyenne reste dans un registre modéré-long
(autour de 60-80 mots), pas dans l'illimité.`;

const RAPPEL_CHUNKS34 = `RAPPEL DUO : Flaubert construit les périodes, Proust creuse chaque sensation.

CORRECTEUR DE RYTHME EXTERNE : régulièrement, à intervalles sentis,
brise le flot des longues périodes par une phrase-couteau — sèche,
factuelle, 3 à 5 mots maximum. Pas exceptionnellement : souvent.
Flaubert et Proust reprennent aussitôt le contrôle. Duras ponctionne,
disparaît, revient.

ANCRE DE TENUE : la base reste Flaubert et Proust. Leurs longues périodes
dominent. Les propositions subordonnées, les digressions sensorielles
restent présentes. Duras coupe — elle ne remplace pas.

COHÉRENCE DE LONGUEUR : la longueur moyenne des phrases reste dans
la continuité de ce qui précède — ni soudainement plus courte,
ni soudainement plus longue.`;
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# P3 — RÉGIME CIBLE : 3 SCÈNES × 3 RUNS × 4 CHUNKS = 36 API
# ═══════════════════════════════════════════════════════════════════════════════

## Les 3 briefs de scènes

```typescript
const SCENES = {

  CONFRONTATION: {
    id: "confrontation",
    brief: `Deux hommes dans un bureau. L'un d'eux vient d'apprendre que l'autre
l'a trahi. Pas de violence physique — une guerre de mots et de silences.
L'un parle trop. L'autre dit à peine. La trahison est vieille de dix ans
mais ne vient d'être découverte que maintenant. La pièce est petite.
Aucun des deux ne peut partir.`
  },

  CONTEMPLATION: {
    id: "contemplation",
    brief: `Une femme seule dans un appartement vide, la nuit. Elle attend
une nouvelle médicale depuis trois jours. Elle ne fait rien — elle
regarde les objets, les meubles, la lumière. Chaque détail lui rappelle
quelque chose. Le temps s'étire. Elle ne sait pas encore ce qu'elle va
apprendre. Elle sait que demain sera différent.`
  },

  DIALOGUE: {
    id: "dialogue",
    brief: `Un père et sa fille adulte. Ils ne se sont pas parlé depuis deux ans.
Ce n'est pas une réconciliation — c'est une négociation. Elle veut quelque
chose de concret. Lui aussi. Aucun ne dit vraiment ce qu'il veut.
La conversation tourne autour du vrai sujet sans jamais le nommer.
Dehors, il pleut.`
  }
};
```

## Critères PASS P3

```
Par scène (médiane 3 runs) :
  V2_final       ≥ 90
  CV             ∈ [0.80, 1.30]
  f26b           > 0.40       ← seuil abaissé pour scènes de dialogue
  Drift          ∈ [-15, +15] ← légèrement élargi pour variété stylistique
  Mean chunk4    > 10w        ← aucun takeover

Robustesse globale (sur les 3 scènes) :
  CV médian toutes scènes    ≥ 0.80
  V2 médian toutes scènes    ≥ 90
  Aucune scène FAIL complet
```

## Structure du script P3

```typescript
// Fichier : scripts/test-p3-regime-cible.ts

async function main() {
  const scorer = new MultiStageScorerV2();
  const allResults: any[] = [];

  for (const scene of Object.values(SCENES)) {
    console.log(`\n${'═'.repeat(65)}`);
    console.log(`  SCÈNE : ${scene.id.toUpperCase()}`);
    console.log('═'.repeat(65));

    for (let run = 1; run <= 3; run++) {
      console.log(`\n  Run ${run}/3 — ${scene.id}`);
      let fullProse = '';
      const chunkScores: any[] = [];

      for (let chunk = 1; chunk <= 4; chunk++) {
        const last200 = fullProse.split(/\s+/).slice(-200).join(' ');
        const isFirst = chunk === 1;
        const isLast = chunk === 4;
        const useRappel34 = chunk >= 3;

        let prompt: string;
        if (isFirst) {
          prompt = `${PF_PERSONA}\n\n${RAPPEL_CHUNKS12}\n\nTu écris le DÉBUT de cette scène :\n\n${scene.brief}\n\nÉcris les 750 premiers mots. Installe l'atmosphère, les personnages, la tension.\nPas de préambule. Encadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
        } else if (isLast) {
          prompt = `${PF_PERSONA}\n\n${useRappel34 ? RAPPEL_CHUNKS34 : RAPPEL_CHUNKS12}\n\nContinue et TERMINE cette scène.\n\n200 derniers mots :\n"${last200}"\n\nÉcris les 750 derniers mots. Conclus sans résoudre — laisse une ouverture.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
        } else {
          const rappel = useRappel34 ? RAPPEL_CHUNKS34 : RAPPEL_CHUNKS12;
          prompt = `${PF_PERSONA}\n\n${rappel}\n\nContinue cette scène.\n\n200 derniers mots :\n"${last200}"\n\nÉcris les 750 mots suivants.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
        }

        const chunkProse = await withRetry(() => generate(client, prompt, 2500), `${scene.id} r${run} c${chunk}`);
        fullProse += (fullProse ? '\n\n' : '') + chunkProse;
        const cw = measureWindows(chunkProse, 1)[0];
        console.log(`    Chunk ${chunk}: ${chunkProse.split(/\s+/).length}w mean=${cw.mean_len.toFixed(1)} cv=${cw.cv.toFixed(3)}`);
        chunkScores.push({ chunk, mean_len: cw.mean_len, cv: cw.cv });
        await new Promise(r => setTimeout(r, 2000));
      }

      // Dual scoring
      const gbResult = scoreText(fullProse);
      const features = computeAllGBFeatures(fullProse);
      const wordCount = fullProse.split(/\s+/).length;
      const v2Result = scorer.score(features, { wordCount, text: fullProse });
      const windows = measureWindows(fullProse, 4);
      const drift = calcDrift(windows);
      const cv = v2Result.confidence; // use actual CV from features
      const actualCV = features['f1a_rhythm_variance'] ? Math.sqrt(features['f1a_rhythm_variance']) / (features['f1_mean'] || 1) : 0;

      console.log(`    TOTAL: ${wordCount}w GB=${gbResult.score.toFixed(3)} V2=${v2Result.final.toFixed(1)} f26b=${(features.f26b_long_sent_rate??0).toFixed(3)} CV=${v2Result.score100.toFixed(0)} drift=${drift>0?'+':''}${drift.toFixed(1)}`);

      allResults.push({
        scene: scene.id,
        run,
        word_count: wordCount,
        gb_v1: gbResult.score,
        v2_final: v2Result.final,
        f26b: features.f26b_long_sent_rate ?? 0,
        cv: features.f1a_rhythm_variance ? Math.sqrt(features.f1a_rhythm_variance ?? 0) / Math.max(features.f1_mean ?? 1, 1) : 0,
        drift,
        chunks: chunkScores,
        bonuses: v2Result.bonuses.map(b => ({ name: b.name, triggered: b.triggered })),
      });

      await new Promise(r => setTimeout(r, 3000));
    }
  }

  // ─── TABLEAU SYNTHÈSE P3 ───────────────────────────────────────────────
  console.log('\n\n' + '═'.repeat(70));
  console.log('  P3 — RÉGIME CIBLE : RÉSULTATS PAR SCÈNE');
  console.log('═'.repeat(70));
  console.log('  Scène           GB_V1   V2_final   f26b    CV    Drift   PASS');
  console.log('  ' + '-'.repeat(68));

  let allPass = true;
  for (const sceneId of ['confrontation', 'contemplation', 'dialogue']) {
    const runs = allResults.filter(r => r.scene === sceneId);
    const gbMed  = median(runs.map(r => r.gb_v1));
    const v2Med  = median(runs.map(r => r.v2_final));
    const f26bMed = median(runs.map(r => r.f26b));
    const cvMed  = median(runs.map(r => r.cv));
    const driftMed = median(runs.map(r => r.drift));
    const pass = v2Med >= 90 && cvMed >= 0.80 && cvMed <= 1.30 && f26bMed > 0.40 && Math.abs(driftMed) <= 15;
    if (!pass) allPass = false;
    console.log(`  ${sceneId.padEnd(16)} ${gbMed.toFixed(3)}   ${v2Med.toFixed(1).padStart(8)}  ${f26bMed.toFixed(3)}  ${cvMed.toFixed(3)}  ${(driftMed>0?'+':'')+driftMed.toFixed(1).padStart(6)}   ${pass?'✅':'❌'}`);
  }

  console.log('\n  ' + '─'.repeat(68));
  const v2All  = median(allResults.map(r => r.v2_final));
  const cvAll  = median(allResults.map(r => r.cv));
  console.log(`  GLOBAL (9 runs)  —  V2_med=${v2All.toFixed(1)}  CV_med=${cvAll.toFixed(3)}  Robustesse: ${allPass?'✅ TOUTES SCÈNES PASS':'❌ ÉCHEC(S)'}`);

  // Décision
  console.log('\n' + '═'.repeat(70));
  if (allPass) {
    console.log('  → ✅ MOTEUR ROBUSTE : PF+Duras_K2_v3 tient sur les 3 types de scènes');
    console.log('     Prochaine étape : P4 (continuité inter-chapitres)');
    console.log('     Loi L25 CONFIRMÉE sur 3 terrains différents');
  } else {
    const failScenes = ['confrontation','contemplation','dialogue'].filter(s => {
      const runs = allResults.filter(r => r.scene === s);
      const v2Med = median(runs.map(r => r.v2_final));
      const cvMed = median(runs.map(r => r.cv));
      const driftMed = median(runs.map(r => r.drift));
      return !(v2Med >= 90 && cvMed >= 0.80 && Math.abs(driftMed) <= 15);
    });
    console.log(`  → ⚠️  FAIL sur : ${failScenes.join(', ')}`);
    console.log('     Analyser les features top5 V2 pour identifier la cause.');
  }

  // Save
  const outDir = join('scoring', 'data');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'P3_REGIME_CIBLE_RESULTS.json'),
    JSON.stringify({ metadata: { test: 'P3_REGIME_CIBLE', timestamp, model: MODEL }, results: allResults }, null, 2));
  console.log('\nSauvegardé : scoring/data/P3_REGIME_CIBLE_RESULTS.json');
}
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# P4 — CONTINUITÉ INTER-CHAPITRES : 2 × 3000w = 12 API
# ═══════════════════════════════════════════════════════════════════════════════

## Principe

Deux chapitres consécutifs du MÊME roman. Le chapitre 2 reçoit les 200 derniers
mots du chapitre 1 comme contexte d'ouverture. Les deux utilisent le moteur v3.
On mesure l'écart de profil métrique entre les deux.

```typescript
// Fichier : scripts/test-p4-continuite.ts

const ROMAN_UNIVERS = `Roman : une ville portuaire en hiver. Un inspecteur revient sur
les lieux d'une affaire close depuis dix ans. Il ne cherche rien de précis.
Quelque chose l'a ramené là. Le port est différent. Les gens qu'il connaissait
ont changé ou disparu.`;

const CHAPITRE_1_BRIEF = `Chapitre 1 : L'arrivée. L'inspecteur descend du train.
Il reconnaît la ville sans la reconnaître. Une première rencontre
avec un visage du passé — bref, inattendu. La nuit tombe.
Il trouve une chambre. Il ne dort pas.`;

const CHAPITRE_2_BRIEF = `Chapitre 2 : Le lendemain matin. L'inspecteur marche vers le port.
Il cherche une adresse. Les rues changent mais les odeurs non.
Une deuxième rencontre — quelqu'un qui l'attendait sans le savoir.
Une information qui complique tout.`;
```

## Protocole

```typescript
// Étape 1 : Générer le chapitre 1 complet (4 chunks × 750w = 3000w)
// Étape 2 : Extraire les 200 derniers mots du chapitre 1
// Étape 3 : Générer le chapitre 2 — chunk 1 démarre avec contexte chapitre 1
// Étape 4 : Scorer les deux chapitres
// Étape 5 : Calculer les écarts de profil

// Chunk 1 du CHAPITRE 2 — avec ancrage sur le chapitre 1 :
const chap2Chunk1Prompt = `${PF_PERSONA}

${RAPPEL_CHUNKS12}

CONTEXTE DU CHAPITRE PRÉCÉDENT (200 derniers mots) :
"${last200OfChap1}"

Tu continues maintenant le CHAPITRE 2 de ce roman :

Univers : ${ROMAN_UNIVERS}

Brief chapitre 2 : ${CHAPITRE_2_BRIEF}

Écris les 750 premiers mots du chapitre 2. Maintiens la voix établie
dans le chapitre précédent — même registre, même respiration.
Pas de préambule. Encadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
```

## Critères PASS P4

```
Écart de profil entre chapitre 1 et chapitre 2 :
  Δ GB_V1    < 0.20   (même niveau de qualité)
  Δ CV       < 0.25   (même rythme perçu)
  Δ f26b     < 0.15   (même complexité syntaxique)
  Δ mean     < 15w    (même longueur moyenne de phrase)
  Δ V2       < 15     (même qualité structurelle)

Si tous les deltas sont dans les bornes → voix cohérente inter-chapitres ✅
Si un delta dépasse → identifier quelle dimension décroche
```

## Tableau de sortie P4

```
══════════════════════════════════════════════════════════════════════
  P4 — CONTINUITÉ INTER-CHAPITRES
══════════════════════════════════════════════════════════════════════
  Chapitre    GB_V1   V2_final   f26b    CV     Mean    Drift
  ──────────────────────────────────────────────────────────────────
  Chap 1      X.XXX     XX.X    X.XXX  X.XXX   XX.Xw   ±X.X
  Chap 2      X.XXX     XX.X    X.XXX  X.XXX   XX.Xw   ±X.X
  ──────────────────────────────────────────────────────────────────
  Δ absolu    X.XXX     XX.X    X.XXX  X.XXX   XX.Xw
  VERDICT     ✅/❌     ✅/❌   ✅/❌  ✅/❌   ✅/❌

══════════════════════════════════════════════════════════════════════
  VOIX INTER-CHAPITRES : ✅ COHÉRENTE / ❌ DISCONTINUITÉ
══════════════════════════════════════════════════════════════════════
```

## Fichier à créer

```
packages/sovereign-engine/scripts/test-p4-continuite.ts
```

Scorer dual (GB V1 + MS V2) sur chaque chapitre. Proses sauvegardées dans
`sessions/P4_CONTINUITE_[timestamp]/chapitre_1.txt` et `chapitre_2.txt`.

---

# ORDRE D'EXÉCUTION

```
1. npx tsx scripts/test-p3-regime-cible.ts   ← 36 API (~20 min)
2. (si P3 PASS) npx tsx scripts/test-p4-continuite.ts  ← 12 API (~8 min)
```

# COMMITS

```powershell
# Après P3
git add -A
git commit -m "test(p3): regime cible 3 scenes x 3 runs

confrontation  : V2=XX.X GB=X.XXX CV=X.XXX f26b=X.XXX [PASS/FAIL]
contemplation  : V2=XX.X GB=X.XXX CV=X.XXX f26b=X.XXX [PASS/FAIL]
dialogue       : V2=XX.X GB=X.XXX CV=X.XXX f26b=X.XXX [PASS/FAIL]
Robustesse moteur v3 : [TOUTES PASS / FAIL(S)]"
git tag p3-regime-cible-v1

# Après P4
git add -A
git commit -m "test(p4): continuite inter-chapitres

Chap1 -> Chap2 : delta GB=X.XXX delta CV=X.XXX delta f26b=X.XXX
Voix cohérente : [OUI / NON]"
git tag p4-continuite-v1

git push origin phase-r-metrology-rebuild --tags
```

---

# CE QU'ON VA SAVOIR

## P3 — Questions tranchées

| Question | Critère |
|----------|---------|
| Le moteur v3 tient-il sur une confrontation ? | V2 ≥ 90, CV ≥ 0.80 |
| Tient-il sur une contemplation pure ? | V2 ≥ 90, CV ≥ 0.80 |
| Tient-il sur un dialogue stratégique ? | V2 ≥ 90, CV ≥ 0.80 |
| Y a-t-il une scène qui décroche ? | Identifier la plus fragile |
| Loi L25 confirmée sur 3 terrains ? | Robustesse globale |

## P4 — Questions tranchées

| Question | Critère |
|----------|---------|
| Le style se maintient-il du chap 1 au chap 2 ? | Δ CV < 0.25 |
| La qualité se conserve-t-elle ? | Δ GB < 0.20 |
| Le contexte K2 (last 200w) est-il suffisant ? | Δ f26b < 0.15 |
| Le moteur est-il prêt pour 300K mots ? | Tous Δ dans les bornes |

---

# SCELLEMENT CONDITIONNEL

```
Si P3 PASS sur 3/3 scènes ET P4 PASS sur tous les Δ :

  → MOTEUR PF+Duras_correcteur_K2_v3 SCELLÉ PRODUCTION
  → Prêt pour intégration dans le pipeline sovereign-engine
  → Prochaine session : intégration SceneBrief + test V-RECAL-1
  → SAGA_READY target : reprendre le bench composite ≥ 92.0

Si P3 FAIL sur une scène :
  → Identifier la scène défaillante
  → Diagnostic top5 contributions V2
  → Adapter le correcteur pour ce type de scène

Si P4 FAIL (Δ CV > 0.25) :
  → Renforcer l'injection de contexte chapitre précédent
  → Ajouter une "empreinte de style" en début de chapitre 2
```

---

*Prompt P3+P4 — 2026-03-24*
*Budget total : 48 appels API*
*Standard : NASA-Grade L4 / DO-178C Level A*
*"Le moteur respire. Il ne s'effondre pas. Il garde son architecture."*
*"Loi L25 : le mini-correcteur précoce stabilise toute la trajectoire."*
