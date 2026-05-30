# P3-SCRIBE — Cartographie des contrats (19 casts) — LECTURE SEULE

**Date** : 2026-05-30 · **Auteur** : Claude Code · **Mandat** : Tribunal (Gemini+ChatGPT) — recon read-only, ZÉRO code production, draft interface avant `GO_CODE`.
**HEAD** : `ad8a3d69` (sync 0/0, tree clean). **Aucun `.ts` de `src/` touché.**

---

## 1. Inventaire — 19 casts `scribe-engine/src`, 4 groupes

| Groupe | Casts | Fichiers | Nature |
|---|---|---|---|
| **A — Contrat Intent** | 7 | `weaver-llm.ts:38,39,158`, `cli/scribe-llm.ts:69,74,75,76` | sous-typage faible (`Record<string,unknown>`) lu via `.intent/.canon/.constraints/.genome/.emotion` |
| **B — Contrat Scene.subtext** | 5 | `weaver-llm.ts:114,121,122,123,124` | `(scene.subtext as any)?.X` |
| **C — Enums prosepack** | 6 | `prosepack/normalize.ts:288,289`, `prosepack/repair.ts:438,439,496,497` | `pov_detected/tense_detected as any` (cast littéral) |
| **D — Dynamique** | 1 | `pr/budget-tracker.ts:87` | `limits as any` |

---

## 2. Groupe B — Scene.subtext : **FAUX contrat fantôme (cruft)**, bas risque

**Preuve** : `weaver-llm.ts` importe `Scene` de `@omega/genesis-planner` (l.9). La `SubtextLayer` de genesis (`genesis-planner/src/types.ts:92`) **déclare déjà** les 4 champs, tous `readonly` non-optionnels :
```ts
interface SubtextLayer { character_thinks: string; reader_knows: string; tension_type: SubtextTensionType; implied_emotion: string; }
```
Et `subtext-modeler.ts:34` les **peuple réellement** (jamais vides). Donc `(scene.subtext as any)?.character_thinks ?? ''` :
- le `as any` est **inutile** (le champ existe et est typé),
- le `?.` et le `?? ''` sont **morts** (champ requis, non-nullable).

➡️ **Le contrat est HONORÉ par l'émetteur ; le cast le masque.** Ce n'est PAS un champ halluciné. Suppression sûre des 5 casts.

**Reco B** : `(scene.subtext as any)?.X ?? '<def>'` → `scene.subtext.X`.
- Risque : **bas**. Zéro changement runtime (les valeurs sont identiques, fallback jamais déclenché car champs requis non vides).
- ⚠️ Réserve : confirmer qu'aucun appelant ne passe un `Scene` partiellement construit (subtext absent) — `scene-generator.ts:108` initialise `subtext: EMPTY_SUBTEXT`, donc subtext toujours présent. À re-vérifier que `EMPTY_SUBTEXT` a bien les 4 champs avant de retirer le `?.` (sinon garder `?.` + retirer juste le `as any`).

---

## 3. Groupe A — Intent : **VRAI contrat faible**, risque moyen

`extractIntentMetadata(intent: Record<string, unknown>)` (weaver-llm.ts:31) lit `(intent as any).intent ?? {}`, `.canon ?? {}` ; `scribe-llm.ts` lit `.intent/.constraints/.genome/.emotion`. Le paramètre est **volontairement** `Record<string,unknown>` → l'objet réel est un **composite** (probablement `GenesisPlan` ou un IntentPack) avec blocs imbriqués `.intent`, `.canon`, `.constraints`, `.genome`, `.emotion`.

Note : la `Intent` de genesis (`types.ts:18`) est PLATE (`title/premise/themes/core_emotion/...`) et n'a NI `.intent` NI `.canon`. Donc l'objet passé n'est PAS un `Intent` genesis mais un **wrapper** dont la forme exacte reste à confirmer (WP2).

**Reco A** : définir une interface de vue `PlanIntentView` (ou réutiliser `GenesisPlan`/`IntentPack` si c'est ce qui est passé) couvrant `{ intent: Intent; canon: Canon; constraints: Constraints; genome?: StyleGenomeInput; emotion?: EmotionTarget }`, typer le paramètre, retirer les `as any`.
- Risque : **moyen**. Dépend de la forme réelle passée → **WP2 doit tracer l'appelant** avant tout `GO_CODE`. Tant que non tracé : **ne pas patcher** (règle de défaut 6).

---

## 4. Groupes C & D — hors contrat narratif
- **C (6, pov/tense_detected)** : casts littéraux d'enum sur résultats d'analyse prose. À traiter comme "type drift enum" (resserrer le type de retour de l'analyseur). Indépendant du contrat narratif. Cluster séparé.
- **D (1, budget-tracker)** : accès dynamique `limits as any`. Frontière/legacy. KEEP probable.

---

## 5. Draft d'interface (proposition, NON appliquée)
```ts
// Groupe B : aucun nouveau type — aligner sur genesis SubtextLayer (déjà correct).
//   scene.subtext.character_thinks (sans cast). Vérifier EMPTY_SUBTEXT couvre les 4 champs.

// Groupe A : vue typée du composite passé aux weaver/scribe (forme à CONFIRMER en WP2)
import type { Intent, Canon, Constraints, StyleGenomeInput, EmotionTarget } from '@omega/genesis-planner';
interface PlanIntentView {
  readonly intent: Intent;
  readonly canon: Canon;
  readonly constraints: Constraints;
  readonly genome?: StyleGenomeInput;
  readonly emotion?: EmotionTarget;
}
// extractIntentMetadata(intent: PlanIntentView)  → supprime les 4 (intent as any).X
```

---

## 6. Tests requis AVANT tout patch (par groupe)
- **B** : test que `weaver` produit le même `subtext` (characterThinks/impliedEmotion/readerKnows/tensionType) avant/après retrait du cast, sur un plan réel + un plan à subtext minimal. Snapshot prompt assembler inchangé.
- **A** : test que `extractIntentMetadata` retourne les mêmes title/premise/message/coreEmotion/canonEntries avant/après typage, sur le composite réel (forme WP2). Non-régression Prompt Assembler (le risque "lobotomie contexte LLM" de Gemini).
- **C** : test que pov/tense_detected gardent les mêmes valeurs littérales.

---

## VERDICT
- Statut : **PASS** (cartographie read-only livrée) / **DEFERRED** (rewrite → `GO_CODE` après WP2 pour le groupe A).
- Confiance : Haute sur B (preuve type+émetteur) ; Moyenne sur A (forme du composite à confirmer WP2).
- Forces : 19 casts classés par mécanisme ; correction étayée du cadrage (B = cruft, pas fantôme) ; interface draftée ; tests-avant-patch listés ; zéro code touché.
- Faiblesses : (1) forme exacte du composite Intent non encore tracée (WP2) ; (2) `EMPTY_SUBTEXT` à vérifier (4 champs) avant de retirer le `?.` du groupe B.
- Risques restants : aucun (lecture seule).
- Action requise : `GO_CODE B` possible dès maintenant (bas risque) ; `GO_CODE A` seulement après WP2. Par défaut, je n'exécute aucun rewrite — j'enchaîne WP2.
