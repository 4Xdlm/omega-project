# Design P1 — buildForgePacketFromSegment (V2.3-A)
Date: 2026-05-29
Statut: DESIGN (doc-only) — attend GO_CODE Tribunal
Parent: ADR_V2_3 (ACCEPTED Option B) · P0 scellé (528e183e) · design M0
Périmètre: **doc-only · zéro code · zéro qwen/Ollama · zéro generateChunkedDraft · zéro feature flag runtime · zéro bench · aucun claim prose**
But: spécifier le pont P0→ForgePacket avant code. Verrouiller le mapping, l'injection du contrat dérivé, les interdits.

---

## 0. Position
`segment source → [P0] deriveEmotionContractFromSegment → EmotionContractCandidate → [P1] buildForgePacketFromSegment → ForgePacket → forgePacketToSceneBrief → (P3/P4) generateChunkedDraft`. P1 = construction de paquet, **pas** de génération.

## 1. CONSTAT ARCHITECTURAL BLOQUANT (à arbitrer)
`assembleForgePacket(input: ForgePacketInput)` (input/forge-packet-assembler.ts) prend `{plan: GenesisPlan, scene: Scene, style_profile, kill_lists, canon, continuity, run_id, language}` et **dérive l'emotion_contract EN INTERNE** : `buildScenePrescribedTrajectoryLocal(plan, scene)` + `computeForgeEmotionBrief` (omega-forge SSOT), avec signaux requis `emotion.trajectory.prescribed.14d` (→ **re-dérive le 14d dormant**, cf LAW Emotion14 GARAGE/DORMANT, FORBID-CANON-GARAGE-001).

**Conséquence** : l'assembleur n'est PAS un point d'injection pour le contrat de P0. Il suppose un `GenesisPlan` (planification ex-nihilo) qu'un mode réécriture-de-source n'a pas, et il ignorerait/écraserait le contrat dérivé en re-calculant sa propre trajectoire 14d.

## 2. Options P1 (arbitrage requis)
- **P1-a — Construction directe minimale (RECOMMANDÉE)** : bâtir un `ForgePacket` minimal valide où `emotion_contract = candidate.contract` (P0), `intent` = directive de réécriture dérivée du segment, et les autres champs = défauts neutres réutilisés. **N'appelle PAS** `assembleForgePacket` (évite le couplage genesis + la re-dérivation 14d dormant). Le plus propre pour le mode réécriture.
- **P1-b — Genesis synthétique + override** : fabriquer un `GenesisPlan`/`Scene` factices depuis le segment → `assembleForgePacket` → puis écraser `packet.emotion_contract` par celui de P0. Lourd, re-dérive le 14d (gaspillage + viole l'esprit FORBID-CANON-GARAGE), override fragile. **NON recommandé.**

## 3. I/O (P1-a)
```
buildForgePacketFromSegment(
  segment: string,
  candidate: EmotionContractCandidate,   // sortie P0
  opts?: { language?: 'fr'|'en'; run_id?: string; quality_tier?: QualityTier }
): ForgePacketCandidate
```
```
interface ForgePacketCandidate {
  packet: ForgePacket;                 // structure canonique EXISTANTE (types.ts:22), non modifiée
  confidence: number;                  // hérité de candidate.confidence
  warning_codes: readonly WarningCode[]; // propagés de P0 + codes P1
  evidence: Readonly<Record<string, number|string>>;
  source_segment_hash: string;         // = candidate.segment_hash (détermine packet_id/hash)
}
```

## 4. Mapping des 18 champs ForgePacket (no-ghost-field)
| Champ | Source | Provenance |
|---|---|---|
| `emotion_contract` | **candidate.contract (P0)** | DERIVED (injection directe — cœur de P1) |
| `intent` (ForgeIntent) | directive réécriture : scene_goal=`"Réécrire/étendre ce segment"`, story_goal templaté, conflict_type/pov/tense=défauts neutres, target_word_count=f(longueur segment) | DEFAULT/DERIVED |
| `language` | opts.language ?? candidate (fallback 'fr') | DERIVED |
| `packet_id`/`packet_hash`/`scene_id`/`run_id` | déterministes depuis source_segment_hash | DERIVED (déterminisme) |
| `quality_tier` | opts.quality_tier ?? défaut | DEFAULT |
| `beats` | `[]` (vide) OU dérivé minimal du segment — **à trancher** (défaut: `[]`, la génération s'appuie sur emotion_contract+brief) | DEFAULT |
| `subtext`/`sensory`/`style_genome`/`kill_lists`/`canon`/`continuity`/`seeds`/`generation` | défauts neutres réutilisés (constantes/fixtures dédiées) | DEFAULT |

`emotion_contract.curve_quartiles[].target_14d` reste `{}` (DORMANT) — **non re-dérivé** (avantage clé de P1-a vs assembleForgePacket).

## 5. Invariants
- Déterministe : même (segment, candidate) → même packet → mêmes ids (depuis segment_hash). Pas d'aléa, pas de timestamp.
- Fonction pure, no global, zéro LLM/Ollama/réseau.
- `emotion_contract` du packet === `candidate.contract` (égalité stricte, pas de re-dérivation).
- Ne modifie PAS ForgePacket/EmotionContract (schémas figés). Aucun champ fantôme.

## 6. Interdits (FORBID)
- Appeler `assembleForgePacket` si cela re-dérive le 14d dormant (P1-a l'évite).
- Toucher `generateChunkedDraft`, `adaptive-chunker`, modules sealed/FROZEN.
- qwen/Ollama/réseau, feature flag runtime, bench, claim prose.
- Inventer un champ ForgePacket/EmotionContract. Mélanger scoring V3.4.

## 7. Confidence / fallback
- `packet.confidence = candidate.confidence`. Si < seuil (réutiliser MAX_DEFAULT_FIELD_RATIO logique P0) → propager `LOW_CONFIDENCE` ; ne PAS bloquer (le bench A/B P4 jugera). Warnings P0 propagés + éventuels codes P1 (ex `BEATS_EMPTY_DEFAULT`).

## 8. Tests prévus (mock, zéro qwen)
1. ForgePacket structurellement valide : 18 champs canoniques exacts (no-ghost-field).
2. `packet.emotion_contract` === `candidate.contract` (injection, pas de re-dérivation).
3. `target_14d` reste `{}` (14d dormant non ressuscité).
4. Déterminisme : même (segment, candidate) → même packet_id/packet_hash.
5. `forgePacketToSceneBrief(packet)` retourne un brief non vide exploitable.
6. warning_codes P0 propagés + stables.
7. Pas d'import generation/generateChunkedDraft (test statique/grep en CI ou revue).
8. Fallback confidence basse → LOW_CONFIDENCE propagé, packet quand même produit.

## 9. Critères PASS pour GO_CODE
- Arbitrage P1-a vs P1-b tranché (recommandation P1-a).
- I/O `ForgePacketCandidate` clair, 18 champs mappés sans fantôme.
- Injection emotion_contract P0 (pas de re-dérivation 14d) confirmée.
- Invariants déterministes + interdits explicites.
- Tests définis (dont no-ghost-field + injection + déterminisme).

## 10. Verdict design
Le pont P1 est faisable proprement **via construction directe (P1-a)**, qui injecte le contrat de P0 et évite le couplage genesis + la re-dérivation du 14d dormant. Le point d'arbitrage = confirmer P1-a (vs P1-b) + le défaut `beats=[]`. **Demande GO_CODE** pour P1-a (composant isolé + 8 tests, zéro génération). Le seul risque : si la génération exige des `beats` non vides pour une prose de qualité, P2/P3 le révélera (à surveiller, pas bloquant pour P1).
