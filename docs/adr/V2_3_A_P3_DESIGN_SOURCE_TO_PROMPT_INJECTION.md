# Design P3 — Injection source→prompt + smoke réécriture (V2.3-A)
Date: 2026-05-29
Statut: DESIGN (doc-only) — attend GO_CODE Tribunal (mettra Qwen sous tension)
Parent: ADR_V2_3 (ACCEPTED B) · P0 (528e183e) · P1 (e37c8d04) · P2 (6e00e909)
Périmètre: **doc-only · zéro qwen avant validation · zéro bench n≥6 · aucun claim prose · aucune modif du chemin ex-nihilo**
Origine: finding P2 — `forgePacketToSceneBrief` ne porte PAS le texte source (brief_len=361 figé) → Qwen n'aurait rien à réécrire.

---

## 0. Problème
Le brief assemblé (intent + beat + dominants) ne contient pas le **texte source** du segment. Brancher Qwen sans la source = lui demander de réécrire un fantôme (il hallucinerait ou produirait du générique). P3 définit COMMENT la source entre dans le prompt, AVANT tout appel Qwen.

## 1. Vecteur d'injection (le câblage) — Option B retenue
**RETENU : wrapper de prompt de réécriture DÉDIÉ, isolé.** On NE pollue PAS `beat.action` (champ sémantique = action narrative, pas un conteneur de prose source — anti-pattern ChatGPT). On NE modifie PAS `ForgePacket` / `SceneBrief` / `EmotionContract` (schémas figés). On crée un module expérimental V2.3 :

```
// src/chunking/rewritePrompt.ts (NOUVEAU, isolé)
interface RewritePromptInput {
  scene_brief: string;          // = forgePacketToSceneBrief(packet) (P1)
  source_segment: string;       // LE texte à réécrire (manquant jusqu'ici)
  source_segment_hash: string;  // = candidate.segment_hash (traçabilité)
  emotion_contract: EmotionContract; // = candidate.contract (P0), pour la trajectoire
  rewrite_mode: 'rewrite' | 'expand';
  constraints?: { max_words?: number };
}
buildRewritePrompt(input: RewritePromptInput): string   // pur, déterministe
```

Options écartées : (A) `beat.action = source` → détourne un champ sémantique, dette technique ; (C) modifier `forgePacketToSceneBrief` → altère le chemin ex-nihilo partagé. **B isole V2.3 tant qu'il est expérimental, rollback = supprimer le module.**

## 2. Intention de réécriture (le prompting)
`buildRewritePrompt` compose un prompt explicite, sections balisées non ambiguës :

```
[CONSIGNE SYSTÈME]
Tu RÉÉCRIS (ou ÉTENDS) le SEGMENT SOURCE ci-dessous. Règles inviolables :
- Préserve les FAITS, événements, personnages et lieux du segment source. N'invente PAS d'intrigue nouvelle.
- Applique le CONTRAT ÉMOTIONNEL (trajectoire des dominants Q1->Q4, niveau d'arousal).
- Prose française de qualité publication. Ne commente pas, ne résume pas : produis la prose réécrite.

[SEGMENT SOURCE]
<source_segment>

[CONTRAT ÉMOTIONNEL]
Trajectoire : Q1=<dominant> ... Q4=<dominant> ; arousal max=<x> ; slope=<...> ; rupture@<pct>.

[BRIEF SCÈNE]
<scene_brief>

[SORTIE ATTENDUE]
Prose réécrite uniquement (<= max_words si fourni).
```

L'`intent.scene_goal` (P1) porte déjà la directive macro ; le prompt P3 ajoute la CONSIGNE inviolable + la SOURCE. Mode injecté via `provider.generateDraft(prompt, 'rewrite_v2_3', seed)` — appel **direct** au provider (comme linker/duel/guard le font déjà), **sans** `generateChunkedDraft` (chemin ex-nihilo intact).

## 3. Smoke test (critères d'acceptation, 1 scène)
- Entrée : 1 segment source réel (corpus), candidate P0, packet P1.
- `prompt = buildRewritePrompt(...)` → `provider.generateDraft(prompt, 'rewrite_v2_3', seed)` (qwen3:32b, opt-in flag).
- **PASS si** : (a) le prompt CONTIENT le texte source (assert substring) ; (b) le prompt contient le contrat émotionnel (dominants) ; (c) sortie non vide ; (d) pas de timeout/crash (keep_alive 24h) ; (e) la sortie référence ≥1 entité/événement du source (vérif lâche : ≥1 token significatif partagé) ; (f) runtime + tokens loggés ; (g) chemin ex-nihilo NON modifié (grep + suite verte).
- Coût : 1 appel qwen ~1-3 min (cf MEASURE-OMEGA-V1-SEAL). Détaché si besoin.

## 4. Invariants
- **Déterminisme prompt** : même (source, scene_brief, contract, seed) → même prompt → même `prompt_hash` (SHA256). Aucun aléa/timestamp dans le prompt.
- `source_segment_hash` OBLIGATOIRE (traçabilité ; garde cohérence P0/P1/P3).
- **Feature flag opt-in** `OMEGA_V2_3_CHUNK_COUPLING` : off (défaut) → aucun appel qwen, le smoke ne tourne qu'en opt-in explicite. Zéro impact si off.
- Zéro modification `generateChunkedDraft` / `adaptive-chunker` / pipeline ex-nihilo. Zéro nouveau champ ForgePacket/EmotionContract.

## 5. Tests (CI, ZÉRO qwen)
1. `prompt` contient `source_segment` (substring).
2. `prompt` contient le contrat émotionnel (dominants Q1/Q4).
3. `prompt_hash` déterministe (même entrée → même hash).
4. contrôle vs traitement : prompts diffèrent UNIQUEMENT via les frontières (même builder).
5. `buildRewritePrompt` pur, no global, no réseau.
6. AUCUN qwen en CI — le smoke qwen est **manuel/opt-in** (script séparé, flag).
7. Isolation : `rewritePrompt.ts` n'importe pas `generateChunkedDraft`.

## 6. Critère PASS P3 (pour sceller)
- 1 appel qwen sur 1 segment source (opt-in) ; source réellement présente dans le prompt ; sortie non vide ; aucun crash ; coût/runtime loggé ; **chemin ex-nihilo intact** (suite verte). Module `buildRewritePrompt` + tests CI (sans qwen) PASS via wrapper EMP-10.

## 7. Interdits
- Pas de qwen avant ce design validé. Pas de bench n≥6 (= P4). Pas de claim qualité prose. Pas de génération production. Pas de modif `generateChunkedDraft`. Pas de détournement permanent de `beat.action`. Pas de résurrection 14d.

## 8. Verdict design
Injection propre via wrapper dédié `buildRewritePrompt` (Option B) : la source entre par un module expérimental isolé, `provider.generateDraft(..., 'rewrite_v2_3', ...)` en appel direct, chemin ex-nihilo intact, rollback trivial. Le smoke qwen reste opt-in/manuel ; les tests CI prouvent l'injection SANS qwen. **Demande GO_CODE P3** : module `buildRewritePrompt` + tests CI (zéro qwen), puis smoke qwen 1 scène opt-in séparé.
