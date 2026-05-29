# Design P0 — deriveEmotionContractFromSegment (V2.3-A)
Date: 2026-05-29
Statut: DESIGN (doc-only) — attend GO_CODE Tribunal
Parent: ADR_V2_3 (ACCEPTED Option B §11) + dossier M0
Périmètre: **doc-only · zéro code · zéro génération · zéro qwen · zéro bench · aucun changement pipeline**
But: spécifier le composant d'ANALYSE qui traduit un segment de texte source en `EmotionContract` candidat, AVANT toute implémentation. Le Tribunal donne GO_CODE si la mécanique causale est robuste et auditable.

---

## 0. Position dans le pipeline (rappel)
`texte source → chunkAdaptive (Scalpel) → [P0] deriveEmotionContractFromSegment(segment) → ForgePacket → forgePacketToSceneBrief → generateChunkedDraft`. P0 est **analyse pure** : il ne génère rien, n'appelle aucun LLM, ne touche pas le pipeline ex-nihilo (chemin additif, feature flag `OMEGA_V2_3_CHUNK_COUPLING`).

## 1. Interfaces (I/O)

```
deriveEmotionContractFromSegment(
  segment: string,                       // prose source d'UN segment (sortie chunkAdaptive)
  opts?: {
    lang?: 'fr' | 'en';                  // défaut: détecté/fallback 'fr'
    boundary_context?: { prev_tail?: string; next_head?: string }; // optionnel, non requis P0
    quartile_bins?: number;              // défaut 4 (Q1-Q4)
  }
): EmotionContractCandidate
```

**Sortie — wrapper auditable** (NE remplace PAS `EmotionContract`, l'enrobe) :
```
interface EmotionContractCandidate {
  contract: EmotionContract;             // structure canonique EXISTANTE (src/types.ts:56) — non modifiée
  confidence: number;                    // [0,1] global
  field_provenance: Record<string,'DERIVED'|'DEFAULT'|'LOW_CONFIDENCE'>; // par champ
  evidence: Record<string, number|string>; // métriques source (intensity curve, sentiment, etc.)
  warnings: readonly string[];           // ex: "segment court", "14d non dérivable CALC"
  segment_hash: string;                  // SHA256(segment normalisé) → déterminisme
}
```

## 2. Mécanique de dérivation (heuristiques → fonctions EXISTANTES + lois)

OMEGA possède déjà la machinerie CALC requise (`chunking/detector/features.ts` + `emotionalArc.ts`). P0 **réutilise**, n'invente pas :

| Champ EmotionContract | Source CALC existante | Loi / note |
|---|---|---|
| `intensity_range {min,max}` | `featureIntensity(extractFeatures(phrase))` sur chaque phrase → min/max | physics intensité (M0a) |
| `curve_quartiles[Q].arousal` | moyenne `featureIntensity` des phrases du quartile | EmotionalArcDetector déjà scale [0,1] |
| `curve_quartiles[Q].valence` | moyenne `extractSentiment` du quartile | — |
| `curve_quartiles[Q].dominant` | `determineDominantEmotion(features quartile)` | fonction existante |
| `tension.slope_target` | forme de la courbe intensité Q1→Q4 (asc/desc/arc/reverse_arc) | dérivé courbe |
| `tension.pic_position_pct` | argmax de la courbe intensité (position %) | — |
| `tension.faille_position_pct` | argmin / plus forte chute valence (change-point) | EmotionalArcDetector |
| `tension.silence_zones[]` | spans contigus à intensité < seuil bas (ex < p25) | L-silence (proxy) |
| `rupture {exists,position_pct,…}` | change-point principal `EmotionalArcDetector.detect()` (distance > seuil) | mécanique existante |
| `valence_arc {start,end,direction}` | `extractSentiment` Q1 vs Q4 → direction | — |
| `terminal_state {valence,arousal,dominant}` | features de la dernière fenêtre du segment | — |
| `curve_quartiles[Q].target_14d` | **ABANDONNÉ** — Emotion14 au garage (Architecte 2026-05-29). NON dérivé par P0, **non consommé par `generation/`** (grep generation/ = 0 occurrence). Émis en default neutre `{}` (structurel uniquement) | champ legacy, hors scope |
| `curve_quartiles[Q].narrative_instruction` | **DEFAULT** : gabarit déterministe (slope+dominant) ; texte libre non CALC | ⚠ seul champ soft restant |
| `terminal_state.reader_state` | **DEFAULT** templaté depuis terminal dominant | ⚠ champ soft |
| `archetype` (via detectArchetype) | **réutilise `detectArchetype(contract dérivé)`** (arousal moyen + silence_total) | fonction existante |

Ancrage lois : ponctuation/rythme via `extractPunctuationDensity` (L31 semicolons FR discriminants), variance phrase (S1-S3 scaling), intensité (physics M0a). Toute heuristique est **CALC déterministe**, jamais d'inférence LLM.

## 3. Champs DÉRIVÉS vs DEFAULT (honnêteté causale)
- **DERIVED (robuste, majorité)** : intensity_range, arousal/valence/dominant par quartile, tension (slope/pic/faille/silence), rupture, valence_arc, terminal valence/arousal/dominant, archetype.
- **ABANDONNÉ (hors scope)** : `target_14d` — Emotion14 au garage, non consommé par génération → default neutre `{}`, pas de fidélité à prouver.
- **DEFAULT (soft, résiduel)** : `narrative_instruction`, `reader_state` (texte libre, gabarit déterministe). Émis `field_provenance='DEFAULT'` + warning. **Risque résiduel** : ces champs nourrissent la richesse du prompt → fidélité faible possible (P4 le mesurera). Le retrait du 14d réduit nettement la surface soft initiale.

## 4. Invariants (durs)
1. **Déterminisme total** : même `segment` (normalisé) → même `EmotionContractCandidate` → même `segment_hash`. Aucun aléa, aucun timestamp dans la sortie.
2. **Zéro LLM / zéro Ollama / zéro réseau.** CALC pur.
3. **Zéro état global** : fonction pure (entrée → sortie).
4. **Ne modifie PAS `EmotionContract`** (structure canonique inchangée) ni le pipeline génération.
5. **Ne mélange PAS scoring V3.4** (features f24c/f33b/… de scoring ≠ features émotion ; cloison stricte, cf LAW-CHUNK-048).

## 5. Interdictions (FORBID)
- Inventer un champ `EmotionContract` (schéma figé src/types.ts).
- Écraser un `EmotionContract` produit en amont (P0 produit un *candidat* étiqueté, ne remplace rien dans le chemin ex-nihilo).
- Toucher `generateChunkedDraft` / `adaptive-chunker` / modules sealed RC1 / FROZEN.
- Prétendre une qualité de prose (P0 ne génère pas ; claim prose = P4 only, FORBID-PIPELINE-003).
- Appeler un modèle pour combler les champs soft (ce serait P-ultérieur, hors P0 isolé).

## 6. Défauts / fallback (segment pauvre)
- Segment < N mots (ex < 50) : `confidence` bas, `warnings += "segment court"`, quartiles dégénérés → contrat plat (slope 'arc' neutre, silence_zones []), provenance DEFAULT massif.
- Segment mono-ton (variance intensité ≈ 0) : slope 'ascending' par défaut documenté, pic au centre, warning "courbe plate".
- Langue indéterminée : fallback 'fr' + warning.

## 7. Tests prévus (fixtures déterministes, mock — pas de qwen)
1. Segment **calme** (basse intensité, peu ponctuation) → arousal bas, archetype INTERIOR/SENSORY.
2. Segment **tension haute** (intensité montante, ponctuation dense) → slope ascending, pic tardif, archetype ACTION.
3. Segment **dialogué** → dominant dialogue-driven, valence variable.
4. Segment **descriptif** → arousal stable, silence_zones étendues.
5. Segment **trop court** (< 50 mots) → fallback, confidence bas, warnings.
6. Segment **bruité** (caractères parasites) → robustesse tokenize, pas de crash.
7. **Stabilité hash** : 2 appels même segment → segment_hash identique + contrat identique.
8. **Fallback unknown** : champs soft → field_provenance DEFAULT, warnings présents.

## 8. Protocole de validation de FIDÉLITÉ (avant de nourrir le LLM)
Le contrat dérivé est « fidèle » s'il **reflète les dynamiques émotionnelles mesurables** du segment (cohérence interne, pas vérité absolue) :
1. **Cohérence courbe** : la courbe arousal des quartiles reproduit la courbe `featureIntensity` agrégée (corrélation rang ≥ 0.8 attendue) — auto-vérifiable.
2. **Cohérence rupture** : `rupture.position_pct` coïncide avec le change-point principal de `EmotionalArcDetector` (±1 quartile).
3. **Spot-check fixtures** : sur les 8 fixtures, le `dominant`/`slope`/`archetype` dérivés correspondent à l'attendu annoté manuellement (table de vérité dans le test).
4. **Garde soft** : tout champ DEFAULT/LOW_CONFIDENCE est listé ; si > seuil (ex 30% des champs en DEFAULT) → `confidence` global < 0.5 → **flag pour revue** (et signal que P0 ne suffit pas → champ soft à traiter en phase ultérieure avant bench A/B fiable).
Note : la fidélité « absolue » (le contrat capte-t-il l'intention émotionnelle réelle ?) ne peut être prouvée par P0 seul — elle sera jugée *in fine* par le bench A/B prose (P4). P0 prouve la **cohérence mesurable**, pas l'intention.

## 9. Critères PASS pour GO_CODE (Tribunal)
- [x] Schéma I/O clair, `EmotionContractCandidate` défini.
- [x] Champs `EmotionContract` existants confirmés (src/types.ts:56), zéro champ fantôme.
- [x] Mapping champ→fonction CALC existante explicite (§2).
- [x] DERIVED vs DEFAULT séparés honnêtement (§3), risque soft nommé.
- [x] Invariants déterminisme/no-LLM/no-global (§4) + interdictions (§5).
- [x] Fixtures + protocole fidélité définis (§7-8).
- [x] Rollback évident : composant isolé, aucun consommateur tant que flag=0.

## 10. Risques résiduels
1. **Champ soft résiduel (narrative_instruction)** : texte libre non CALC, gabarit déterministe → fidélité limitée, possible goulot du gain prose. Si revue P0 montre confidence < 0.5 récurrent → **STOP avant P4**, décider si une brique d'inférence (phase séparée) est nécessaire (≠ P0 isolé). NB : `target_14d` (Emotion14) est ABANDONNÉ et non consommé par génération → retiré du scope P0, ce qui supprime le principal champ soft initial.
2. **Cohérence ≠ intention** : P0 valide la cohérence interne ; seul le bench A/B prouve l'utilité générative.
3. **Drift features** : `featureIntensity`/`extractSentiment` calibrés corpus — re-vérifier amplitude sur prose source réelle (cf LAW-CHUNK-041 amplitudes faibles).

## 11. Verdict design
Mécanique causale **ancrée sur fonctions OMEGA existantes** (réutilise, n'invente pas), déterministe, auditable, isolée. Le point d'honnêteté : ~20% de champs soft non-CALC, traités en DEFAULT flaggé + garde-fou confidence. **Demande GO_CODE** pour P0 (composant + 8 tests fixtures, zéro touche génération). Si confidence soft trop basse à l'implémentation → remonter avant P4.
