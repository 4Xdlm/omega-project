# NCR_OLLAMA_CONSTRAINTS_IGNORED_P3.1.2

**ID** : NCR_OLLAMA_CONSTRAINTS_IGNORED_P3.1.2
**Title** : ollama-provider.applyPatch ignore `_constraints` (canon + beats) — asymétrie vs anthropic-provider
**Status** : **OPEN_DIAGNOSED**
**Severity** : **MEDIUM**
**Priority** : P2
**Opened** : 2026-05-15 (Phase 3.1.1 CorrectionPitch — découverte scope élargi, hors patch atomique)
**Owner** : Francky + Claude
**Référence parent** : commit `847429cb` (P3.1.1 CorrectionPitch fix)

---

## 1. Résumé

Pendant l'audit Phase 3.1.1 du bug `pitch.correction_text` / `pitch.target_axis`
(résolu par commit `847429cb`), une seconde anomalie a été détectée dans
`ollama-provider.ts:240` mais **délibérément laissée hors scope** pour
préserver l'atomicité du commit P3.1.1 (doctrine MINIMIZE IT).

Le paramètre `constraints` (canon + beats) est préfixé `_constraints`
dans la signature, indiquant qu'il est volontairement ignoré. Or
`anthropic-provider.ts:393` utilise activement `constraints.canon` et
`constraints.beats` dans son userPrompt.

→ Asymétrie sémantique entre les 2 providers production : Anthropic
applique les corrections avec contexte canon+beats, Ollama sans.

## 2. Évidence empirique observée 2026-05-15

**Fichier** : [REPO] `packages/sovereign-engine/src/runtime/ollama-provider.ts`

**Lignes 237-241** :
```ts
async applyPatch(
  prose: string,
  pitch: CorrectionPitch,
  _constraints: { readonly canon: readonly string[]; readonly beats: readonly string[] },
): Promise<string> {
```

Le préfixe `_` (TypeScript convention pour paramètre intentionnellement
non utilisé) confirme que canon+beats **ne sont pas joints au prompt
Ollama**. Le `systemPrompt` (L242-243) et le `userPrompt` (L248, post-fix
P3.1.1) ne référencent jamais `_constraints.canon` ni `_constraints.beats`.

**Anthropic-provider.ts:393 (référence asymétrie)** :
```ts
const userPrompt = `Canon:\n${constraints.canon.join('\n')}\n\nBeats:\n${constraints.beats.join('\n')}\n\n...`;
```

## 3. Ce qui est PROUVÉ empiriquement

- `ollama-provider.ts:240` : paramètre préfixé `_constraints` (ignoré)
- `ollama-provider.ts:248` : userPrompt construit sans `constraints.canon`
  ni `constraints.beats`
- `anthropic-provider.ts:393` : utilise `constraints.canon` + `constraints.beats`
  dans userPrompt
- Le contrat `SovereignProvider.applyPatch` (`types.ts:397`) déclare
  `constraints` requis (pas optionnel)

## 4. Ce qui N'EST PAS prouvé (à investiguer)

- Caractère intentionnel ou bug du préfixe `_constraints`
- Impact sémantique runtime : Ollama hallucine-t-il sans contexte canon+beats ?
- Différence de qualité output entre les 2 providers pour patch identique
- Si patch Ollama échoue silencieusement plus souvent que patch Anthropic

## 5. Hypothèses sur cause racine (NON tranchées)

- **H1** : Choix design délibéré — Ollama (qwen3:32b) avait token budget
  plus serré (4096 vs 8192 Anthropic), constraints volontairement omis
- **H2** : Régression historique — version antérieure utilisait constraints,
  préfixe `_` ajouté par refactor automatique TS6133 sans alignement Anthropic
- **H3** : Bug copy-paste — `_constraints` jamais corrigé après ajout
  contrat `constraints` côté types.ts
- **H4** : Asymétrie volontaire — patches Ollama considérés "draft-like",
  Anthropic "production-grade" → guidance différente assumée

## 6. Risques identifiés

- **R1** : Patches Ollama violent canon+beats car non transmis au LLM
  (canon-breaking output silencieux)
- **R2** : Bench comparatif Ollama vs Anthropic biaisé (Ollama sans contexte)
- **R3** : Si livre généré via Ollama applyPatch → drift narratif vs structure
- **R4** : Asymétrie violations Law Conformance (LawComplianceReport
  peut diverger selon provider utilisé)
- **R5** : Documentation OMEGA n'explicite pas cette asymétrie

## 7. Tests requis pour trancher (Sprint S10+)

1. Bench A/B 1-scène : applyPatch via Ollama avec et sans constraints.canon
   joints — mesurer score canon conformance via S-Oracle V2
2. Audit `git log -- packages/sovereign-engine/src/runtime/ollama-provider.ts`
   pour identifier le commit qui a introduit `_constraints`
3. Test sur 5 pitches divers (PITCH_A/B/C) avec et sans constraints —
   mesurer divergence sémantique
4. Vérifier si Ollama qwen3:32b respecte la contrainte token budget si
   on ajoute canon+beats (peut nécessiter `patchMaxTokens` dédié comme
   Anthropic L401)

## 8. Décision actuelle

- **AUCUN fix dans commit P3.1.1** (scope strict respecté, MINIMIZE IT)
- Investigation déférée Sprint S10+ ou Phase 3.1.2-bis dédiée
- Statut maintenu OPEN_DIAGNOSED tant que H1-H4 non tranchées
- Sévérité MEDIUM (asymétrie réelle mais runtime impact non mesuré)

## 9. Décision finale (pending Francky)

3 options :
- (a) **Aligner Ollama sur Anthropic** : joindre canon+beats dans userPrompt
  + introduire `patchMaxTokens` dédié pour Ollama
- (b) **Documenter intentionnalité** : amender commentaire `_constraints`
  pour expliciter le choix design (token budget ou autre)
- (c) **Status quo** : ne rien faire, accepter l'asymétrie

## 10. Refs

- Commit parent : `847429cb` (P3.1.1 CorrectionPitch fix)
- Contrat type : [REPO] `packages/sovereign-engine/src/types.ts:397`
- Provider Ollama : [REPO] `packages/sovereign-engine/src/runtime/ollama-provider.ts:237-251`
- Provider Anthropic : [REPO] `packages/sovereign-engine/src/runtime/anthropic-provider.ts:387-404`

---

**Doctrine** : NCR OVER HEROICS — documenter avant fix.
**Standard** : NASA-Grade L4 / DO-178C Level A.
