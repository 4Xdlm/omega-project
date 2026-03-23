# AUDIT D-SYNTH-1 — MASTER PROMPT

**Date** : 2026-03-23
**Fichier** : `packages/sovereign-engine/src/input/prompt-assembler-v4.ts`
**Version** : V4.3.0 (Asymmetric paragraphing + organic prose)
**Lignes** : 319

---

## 1. Structure du prompt (10 blocs, ~800-1000 tokens)

| Bloc | Contenu | Tokens | Suspect |
|------|---------|--------|---------|
| 1. Persona | "ecrivain contemporaine, maitre sensoriels + sous-texte" | ~30 | OUI — "contemporaine" |
| 2. Context | POV, tense, goal, conflict, subtext, word count | ~100 | Non |
| 3. Trajectory | 4 paragraphes asymetriques + arc emotionnel | ~200 | OUI — "TRES COURT" + "COURT ET HACHE" |
| 4. Beats | Points de passage narratifs | ~130 | Non |
| 5. Directives | Style, rythme, registre | ~120 | **OUI — SUSPECT PRINCIPAL** |
| 6. Voice Anchor | Ancre vocale par type de conflit | ~25 | Non |
| 7. Symbols | Mots-palette, motifs, accroches | ~80 | Non |
| 8. Exemplar | Exemple qualite | ~150 | Non |
| 9. Interdictions | 3 regles interdites | ~40 | **OUI — "soudain, alors, puis, ensuite"** |
| 10. Final | "4 paragraphes, varie tailles, commence par sensation" | ~30 | Non |

---

## 2. SUSPECTS IDENTIFIES

### SUSPECT 1 (CRITIQUE) — Bloc 5 Directives, lignes 229-236

```typescript
const target = genome.rhythm.avg_sentence_length_target;
if (target <= 12) {
  directives.push('Phrases courtes et sèches dominantes, syncopes fréquentes.');
} else if (target <= 18) {
  directives.push('Alterne phrases courtes percutantes et périodes plus amples.');
} else {
  directives.push('Phrases longues et sinueuses, rythme méditatif.');
}
```

**Effet** : Si `avg_sentence_length_target ≤ 18` (probable pour la majorite des scenes), le LLM recoit "Alterne phrases courtes percutantes et periodes plus amples" — ce qui encourage des phrases MOYENNES, pas les longues arches de 40+ mots que les maitres produisent (mean_sent_len = 28.8 mots).

**Les maitres ont mean_sent_len = 28.8** → le target devrait etre > 18 pour declencher "Phrases longues et sinueuses".

### SUSPECT 2 (MODERE) — Bloc 3 Trajectory, lignes 165-169

```
— Paragraphe 1 : TRÈS COURT (2-3 phrases, incisif, coup de poing).
— Paragraphe 3 : COURT ET HACHÉ (rupture de rythme, phrases sèches).
```

**Effet** : 2/4 paragraphes sont forces a etre courts. Le LLM a peu de place pour les longues periodes syntaxiques.

### SUSPECT 3 (BLOQUANT) — Bloc 9 Interdictions, ligne 308

```
2. Pas de transitions mécaniques (soudain, alors, puis, ensuite, tout à coup).
```

**Effet** : "soudain", "alors", "puis", "ensuite", "tout à coup" sont exactement les marqueurs temporels qui nourrissent `f_temporal_anchor_rate` et `scoreNarration()`. **Le prompt INTERDIT les marqueurs de narration.**

### SUSPECT 4 (MINEUR) — Bloc 1 Persona, ligne 120

```
"contemporaine"
```

**Effet** : Oriente vers un style moderne (phrases courtes, directes) plutot que classique (periodes longues, subordination).

---

## 3. Laws Phase P (commit 2d996523)

Les Laws Phase P ont ete injectees dans le V2 assembler (`prompt-assembler-v2.ts`), PAS dans le V4. Le V4 est le prompt actif en production. **Les Laws Phase P ne sont PAS envoyees au Scribe quand V4 est actif.**

Verification : le V4 est active par `process.env.OMEGA_PROMPT_V4 === '1'`. Si cette variable est definie, le V2 avec les Laws Phase P est **ignore**.

---

## 4. Rosetta dans le prompt

**ABSENTE.** Aucune reference a Rosetta, dictionnaire, table_rosette, ou facteurs_conversion dans le V4 assembler.

---

## 5. ix_variance_x_longrate — Le feature #2 du GB

Le GB V1 utilise `ix_variance_x_longrate` (importance 0.0555, rang #3).
C'est le produit `f1a_rhythm_variance × f26b_long_sent_rate`.

Pour que ce feature soit non-nul, il faut :
- f1a_rhythm_variance > 0 (variation des longueurs)
- f26b_long_sent_rate > 0 (au moins UNE phrase > 40 mots)

Si f26b = 0 (comme dans le bench), ix_variance = 0 automatiquement.
Le Scribe perd le signal du feature #2 ET #3 du GB en ne faisant aucune phrase > 40 mots.

---

## 6. RECOMMANDATIONS

| Action | Impact | Priorite |
|--------|--------|----------|
| Retirer "contemporaine" du Persona | Libere le style classique | FAIBLE |
| Augmenter avg_sentence_length_target a 25+ | Declenche "phrases longues" | **CRITIQUE** |
| Permettre "soudain", "alors", "puis" | Restaure les marqueurs de narration | **CRITIQUE** |
| Permettre au P1 d'etre long (pas "TRES COURT") | Plus de place pour les periodes | MODERE |
| Injecter Rosetta constraints dans V4 | Utilise les features SOLIDE | MOYEN |
| Verifier si V4 est actif (env var) | Si V2 actif, Laws Phase P marchent | URGENT |

### Le fix le plus impactant (2 lignes)

```typescript
// Dans compileDirectives, remplacer le seuil :
if (target <= 12) {
  directives.push('Phrases courtes et sèches dominantes, syncopes fréquentes.');
} else {
  // TOUJOURS donner la directive longue sauf pour les scenes d'action pure
  directives.push('Phrases longues et sinueuses alternant avec des frappes courtes. Au moins 3 phrases de 40+ mots par paragraphe.');
}
```

```typescript
// Dans compileInterdictions, RETIRER "alors, puis, ensuite" :
return `Interdits (3 règles) :
1. Ne nomme jamais une émotion directement.
2. Pas de lyrisme décoratif — chaque image doit servir l'histoire.
3. Pas de résumé d'action — montre, ne raconte pas.`;
```
