# CP-1 — PROTOCOLE PRÉENREGISTRÉ : LE CONTENU DES PÉRIODES
**Gelé le 2026-08-03, AVANT toute génération. Toute déviation = documentée ou invalide.**

## Objet

Le chantier P0 unanime (tour de table 2026-08-03) : la prose du scribe est
conforme en surface (rebaseline F1, M0) mais reste jugée artificielle par les
deux relecteurs externes. Défauts nommés : récapitulation déguisée en pensée ✓(veto),
**clichés empilés, sur-explication, moule de raisonnement abstrait, gain
narratif faible** — non traités. CP-1 attaque ces quatre-là **à sélection
constante de coût** : Candidate Packs gelés, rejeu contrefactuel, zéro
génération supplémentaire après la campagne initiale.

## Design

### Étape 1 — Génération du pack (Windows-side, détaché, ~1 h)
- 10 scènes du livre N9 (mêmes specs, mêmes seeds de base), config **B1c**,
  gemma4:31b (lock), N = 7 candidats, 1 tentative (pas de régénération : on
  veut les bruts, y compris les mauvais).
- `OllamaScribeV2Generator` avec `packSink = jsonlFileSink('runs/cp_pack')`,
  `packId = 'CP1'` → **70 candidats gelés** (prose brute + sha256 + seed).
- Le pack est scellé par un manifest (liste des sha256) au moment du gel.

### Étape 2 — Rejeu contrefactuel (sandbox, coût nul)
Les mêmes 70 candidats passent par CINQ sélecteurs :

| sélecteur | règle |
|---|---|
| `selector_words` | le plus long (= la production historique, r6-core:187) |
| `selector_scribe_v2` | gate actuel (vetos + répulsion, premier éligible) |
| `selector_shape` | gate actuel PUIS `rankByShape` parmi les éligibles |
| `selector_content` | gate actuel PUIS score de contenu (étape 3) minimal |
| `selector_combined` | gate PUIS forme + contenu (pondération à préenregistrer AVANT l'étape 4) |

Sortie : 5 « livres » de 10 chapitres, choisis dans le MÊME pack.

### Étape 3 — Score de contenu (REUSE, audit anti-doublon fait)
Composition de capteurs EXISTANTS, aucun nouveau :
- récap : `measurePlotRecap` (book-factory) — déjà veto, ici en gradation ;
- clichés/IA-smell : `ia-smell-patterns.ts` (sovereign-engine, 15 familles FR :
  OVER_ADJECTIVATION, GENERIC_WISDOM, SAFE_VAGUENESS…) — pont cross-package
  à la manière du splitter (import relatif, précédent établi) ;
- annotation corporelle : `description-density.ts` (défaut lecteur n°2, ×2,27) ;
- confort : `scanComfortSentences` (editorial-scanners).
Le score est DIAGNOSTIC : il classe des candidats déjà éligibles, il ne
vetote pas (les jugements littéraires restent shadow — doctrine inchangée).

### Étape 4 — Lecture aveugle
- Les 5×10 chapitres randomisés (ordre par hash), étiquettes retirées,
  hashes journalisés AVANT lecture.
- Juges : Francky (arbitre suprême) + 2 IA externes SUR TEXTE (jamais les
  métriques — leçon P3 : Gemini avait validé sans ouvrir le fichier).
- Question unique par paire : « lequel continueriez-vous de lire ? »
  (format L2B épuré — nos 3 protocoles granulaires ont raté leur fiabilité).

## Gates préenregistrés

- **GATE-CP1-A (forme)** : PASS si `selector_shape` > `selector_scribe_v2`
  en préférence aveugle sur ≥ 6/10 paires. FAIL → `rankByShape` reste shadow
  définitivement (pas de 2ᵉ chance sans nouveau mécanisme).
- **GATE-CP1-B (contenu)** : PASS si `selector_content` > `selector_words`
  sur ≥ 7/10. FAIL → les capteurs de contenu existants ne capturent PAS le
  défaut lu — il faudra un capteur NOUVEAU (spec avant code, anti-doublon).
- **KILL-SWITCH** : si `selector_scribe_v2` < `selector_words` (le gate
  actuel NUIT), STOP immédiat + NCR — on ne rajoute pas d'étages à une
  fondation qui perd contre le compteur de mots.

## Ce que CP-1 ne prétend PAS

Dix scènes, un univers, un modèle. Un PASS dit « ce sélecteur aide sur ce
livre » ; la généralisation (S6 : 2ᵉ univers, 2ᵉ modèle) reste due. Les
enveloppes de préférence humaine à N=3 juges n'ont pas de puissance
statistique — c'est un signal directionnel, le juge de paix reste S5.

## Statut

- Infrastructure : `candidate-pack.ts` (gel + sinks) ✓ · `opportunity-allocator.ts`
  (P1, hors CP-1 mais livré) ✓ · `rankByShape` ✓ · capteurs REUSE identifiés ✓
- **En attente : lancement Étape 1 côté Windows (Ollama), à la main ou au
  prochain créneau détaché.** Rien d'autre ne bloque.
