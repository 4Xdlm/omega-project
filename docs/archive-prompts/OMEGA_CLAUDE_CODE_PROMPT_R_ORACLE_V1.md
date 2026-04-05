# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT — R-ORACLE v1.0
# L'ORACLE DE LA LITTÉRATURE
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date         : 2026-03-22
# Branche      : phase-r-metrology-rebuild
# HEAD entrant : a62d01e3
# Standard     : NASA-Grade L4 — SCIENCE POUSSÉE AU PAROXYSME
# Autorité     : Francky (Architecte Suprême)
#
# ═══════════════════════════════════════════════════════════════════════════════
# CE QU'ON CONSTRUIT
#
# Pas un classifieur. Pas un scorer. Un ORACLE.
#
# Un instrument qui, avant qu'un seul lecteur n'ouvre le livre, sait :
# - Ce que la scène CONTIENT (types, proportions, trajectoire)
# - Ce que le mélange CRÉE (émergence, chimie, interactions)
# - Ce que le lecteur va RESSENTIR (sensation probable, intensité, trajectoire)
# - POURQUOI il le ressent (quelles features, quel ordre, quelle chimie)
# - Si c'est CAUSAL ou juste corrélé (audit hostile, null models, contrôles)
#
# 6 MODULES DE RECHERCHE :
#
# MODULE 1 — AUDIT CAUSAL (prouver que la chimie est réelle)
# MODULE 2 — PHYSIQUE DES TRAJECTOIRES (l'ordre crée la qualité)
# MODULE 3 — TRAITEMENT DU SIGNAL (le rythme est une signature)
# MODULE 4 — POLYPHONIE (les voix des personnages)
# MODULE 5 — SENSATION PROBABLE (prédire ce que le lecteur ressent)
# MODULE 6 — CALIBRATION INSTRUMENTALE (l'outil mesure-t-il juste ?)
#
# Corpus : 571 romans, 4 millions de phrases, 400 000 fenêtres.
# Pas de limite de temps. Pas de raccourcis. La vérité.
#
# ═══════════════════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════════════════════
# RÈGLES ABSOLUES
# ═══════════════════════════════════════════════════════════════════════════════

R-01 : NE TOUCHER NI au GB V1, NI au V3, NI aux features existantes.
R-02 : Le classifieur probabiliste R-COMP v1 reste en place (commit 647cac9b).
R-03 : TOUT est MESURÉ sur le corpus. Rien n'est inventé.
R-04 : Les résultats NÉGATIFS sont aussi importants que les positifs.
R-05 : Chaque corrélation est vérifiée INTRA-AUTEUR + avec contrôles.
R-06 : 1911 tests existants doivent PASS.
R-07 : Prendre le temps. Scanner tout. Pas de raccourcis.

# ═══════════════════════════════════════════════════════════════════════════════
# MODULE 1 — AUDIT CAUSAL : LA CHIMIE EST-ELLE RÉELLE ?
# ═══════════════════════════════════════════════════════════════════════════════
#
# Les synergies positives (+0.051 dialogue×narration, etc.) sont-elles
# causales ou juste un effet "les bons auteurs font tout mieux" ?
#
# On tranche avec 5 expériences hostiles.

## 1.1 — Corrélations INTRA-AUTEUR

Pour chaque auteur ayant ≥ 50 fenêtres dans le corpus :
1. Calculer les synergies type×type UNIQUEMENT sur ses fenêtres
2. Vérifier si les synergies restent positives AU SEIN d'un même auteur

```typescript
// Pour chaque auteur :
//   fenêtres = toutes les fenêtres de cet auteur
//   pour chaque paire de types (A×B) :
//     delta = feature_mixed - predicted_additive
//     mean_delta = moyenne des deltas
//   stocker : author, pair, mean_delta, n_windows
```

Si la synergie reste positive INTRA-AUTEUR → c'est pas un effet auteur.
Si elle disparaît → c'est juste que les bons auteurs font tout mieux.

Sauver : `data/CAUSAL_INTRA_AUTHOR.json`

## 1.2 — Corrélations PARTIELLES

Calculer la corrélation entre composition et GB en CONTRÔLANT :
- auteur (dummy variable)
- longueur du texte
- langue (fr/en/es)
- époque (avant 1900, 1900-1950, après 1950)

```typescript
// Régression :
// GB = β₁×pct_dialogue + β₂×pct_action + ... + contrôles
// Les β sont les effets NETS de chaque type, débarrassés des confusions.
```

Sauver : `data/CAUSAL_PARTIAL_CORRELATIONS.json`

## 1.3 — Test de PERMUTATION (null model)

Pour 1000 fenêtres du corpus choisies aléatoirement :
1. Garder les MÊMES phrases, mais PERMUTER leur ordre aléatoirement
2. Recalculer le score GB sur la version permutée
3. Comparer GB_original vs GB_permuté

Si GB_original > GB_permuté significativement → l'ORDRE compte.
Si GB_original ≈ GB_permuté → seule la composition compte, pas l'ordre.

```typescript
function permuteWindow(sentences: string[]): string[] {
  const shuffled = [...sentences];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
// Seed fixe pour reproductibilité : Math.seedrandom(42)
```

Sauver : `data/CAUSAL_PERMUTATION_TEST.json`

## 1.4 — Test de QUALITY-CONTROLLED comparison

Prendre des paires de fenêtres avec :
- MÊME qualité locale moyenne (features individuelles similaires)
- COMPOSITION différente

Si le GB diffère malgré la même qualité locale → la COMPOSITION cause la différence.

```typescript
// Matcher les fenêtres par qualité locale (propensity score matching)
// Comparer les GB des fenêtres à composition diverse vs monotone
```

Sauver : `data/CAUSAL_QUALITY_CONTROLLED.json`

## 1.5 — Bootstrap + Intervalles de confiance

Pour chaque synergie (+0.051, +0.046, etc.) :
1. Rééchantillonner 1000 fois avec remplacement
2. Calculer l'IC à 95%
3. Si l'IC ne contient pas 0 → statistiquement significatif

Sauver : `data/CAUSAL_BOOTSTRAP_CI.json`

## LIVRABLE MODULE 1

Fichier : `data/CAUSAL_AUDIT_COMPLETE.json`
```json
{
  "intra_author": { "positive_authors": X, "total_authors": Y, "verdict": "..." },
  "partial_correlations": { "β_dialogue": X, "β_action": X, "p_values": {...} },
  "permutation_test": { "gb_original_mean": X, "gb_permuted_mean": X, "p_value": X },
  "quality_controlled": { "effect_of_composition": X, "p_value": X },
  "bootstrap_ci": {
    "dialogue_x_narration": { "mean": 0.051, "ci_low": X, "ci_high": X, "significant": true }
  }
}
```

# ═══════════════════════════════════════════════════════════════════════════════
# MODULE 2 — PHYSIQUE DES TRAJECTOIRES
# ═══════════════════════════════════════════════════════════════════════════════
#
# Le texte n'est pas un stock de proportions. C'est une TRAJECTOIRE.
# Deux scènes avec 40% action + 30% introspection sont DIFFÉRENTES
# si l'une fait A-A-A-I-I-I et l'autre fait A-I-A-I-A-I.

## 2.1 — Matrice de transition type→type

Pour TOUTES les fenêtres du corpus :

```typescript
// T[a→b] = P(type_{i+1} = b | type_i = a)
// Matrice 5×5 : dialogue, action, description, introspection, narration
```

Calculer la matrice de transition GLOBALE.
Puis par AUTEUR (les maîtres ont-ils des transitions différentes ?).
Puis par TIER (les S-tier ont-ils des transitions différentes des D-tier ?).

### Questions à trancher :
- Quelles transitions sont les plus fréquentes chez les S-tier ?
- Quelles transitions sont TOXIQUES (fréquentes chez les D-tier) ?
- La transition action→introspection est-elle plus fréquente chez les maîtres ?

Sauver : `data/TRANSITION_MATRICES.json`

## 2.2 — Dwell time par type

Pour chaque type, mesurer la longueur moyenne des blocs consécutifs :

```typescript
// Pour chaque run de phrases consécutives du même type :
//   dwell = nombre de phrases dans le run
// Mean dwell per type, par tier, par auteur
```

### Questions :
- Les maîtres font-ils des blocs plus courts (alternance rapide) ?
- Ou plus longs (immersion dans un type) ?
- Ça dépend du type ? (longs blocs de description OK, longs blocs d'action = mauvais ?)

Sauver : `data/DWELL_TIME_ANALYSIS.json`

## 2.3 — Taux de switch (nervosité compositionnelle)

```typescript
// switch_rate = nb(type_i ≠ type_{i+1}) / (n-1)
```

Corréler switch_rate avec GB V1.
Par tier, par auteur, par genre.

## 2.4 — Accélération typologique

Mesurer si les blocs RACCOURCISSENT au fil de la scène (montée de tension) :

```typescript
// block_lengths = [5, 4, 3, 2, 1] → accélération négative = tension montante
// block_lengths = [1, 2, 3, 4, 5] → accélération positive = relâchement
// Régression linéaire sur les longueurs de blocs successifs → pente = accélération
```

Corréler l'accélération avec GB V1.

## 2.5 — Courbure de trajectoire dans l'espace des types

Chaque fenêtre de 5 phrases est un point dans R⁵ (les 5 types).
La trajectoire de la scène est une courbe dans cet espace.

```typescript
// Pour chaque scène (fenêtres glissantes de 5 phrases, pas de 1) :
//   points[] = vecteurs de composition
//   longueur_trajectoire = Σ ||p_{i+1} - p_i||
//   courbure_moyenne = moyenne des angles entre segments consécutifs
//   tortiosité = longueur_trajectoire / distance(début, fin)
```

Les maîtres ont-ils des trajectoires plus courbes (imprévisibles) ou plus droites (directes) ?

Sauver : `data/TRAJECTORY_PHYSICS.json`

## 2.6 — Motifs de transition récurrents

Chercher des PATTERNS récurrents dans les séquences de types :

```typescript
// Encoder : D=dialogue, A=action, N=narration, I=introspection, E=description
// Chercher les bigrams les plus fréquents (DA, AN, NI, etc.)
// Chercher les trigrams (DAN, ANI, NID, etc.)
// Comparer fréquences par tier S vs D
```

Quels trigrams sont la SIGNATURE des S-tier ?

Sauver : `data/TRANSITION_PATTERNS.json`

# ═══════════════════════════════════════════════════════════════════════════════
# MODULE 3 — TRAITEMENT DU SIGNAL : LE RYTHME EST UNE SIGNATURE
# ═══════════════════════════════════════════════════════════════════════════════
#
# Le texte est une série temporelle. Les longueurs de phrases forment un signal.
# Le LLM fait du bruit blanc ou de la sinusoïde.
# Le maître fait des fractales.

## 3.1 — Coefficient de HURST (mémoire à long terme du rythme)

Pour chaque roman du corpus, calculer le coefficient de Hurst sur la série
des longueurs de phrases [L₁, L₂, L₃, ..., Lₙ] :

```typescript
// Méthode R/S (Rescaled Range) :
// Pour différentes tailles de fenêtre n :
//   1. Découper la série en blocs de taille n
//   2. Pour chaque bloc : calculer R(n)/S(n) 
//      R(n) = range du cumul des déviations
//      S(n) = écart-type du bloc
//   3. log(R/S) vs log(n) → pente = H
//
// H = 0.5 → bruit blanc (aléatoire, pas de mémoire)
// H > 0.5 → persistance (si ça monte, ça continue de monter)
// H < 0.5 → anti-persistance (oscillation)
//
// Les maîtres littéraires devraient avoir H > 0.5 (rythme structuré)
// Les LLM devraient avoir H ≈ 0.5 (pseudo-aléatoire)
```

Corréler H avec le tier (S/A/B/C/D).

Sauver : `data/HURST_COEFFICIENTS.json`

## 3.2 — Autocorrélation rythmique

Pour chaque roman, calculer l'autocorrélation de la série des longueurs
de phrases à différents lags (1, 2, 3, ..., 20) :

```typescript
// ACF(k) = Corr(L_t, L_{t+k})
// 
// LLM : ACF(k) ≈ 0 pour tout k > 0 (pas de mémoire)
// Maître : ACF positif aux lags courts (phrases similaires en cluster)
//          puis négatif aux lags moyens (contraste)
//          puis positif aux lags longs (retour au rythme initial)
```

Comparer les profils ACF par tier.

Sauver : `data/AUTOCORRELATION_PROFILES.json`

## 3.3 — Analyse spectrale (FFT simplifiée)

Pour chaque roman, calculer la densité spectrale de puissance de la série
des longueurs de phrases :

```typescript
// DFT de la série [L₁-μ, L₂-μ, ..., Lₙ-μ]
// Power spectrum P(f) = |DFT(f)|²
// 
// LLM : spectre plat (bruit blanc) ou pic unique (sinusoïde mécanique)
// Maître : spectre 1/f (fractal, complexité multi-échelle)
//
// Mesurer : slope du log(P) vs log(f) = β
// β ≈ 0 → bruit blanc
// β ≈ 1 → bruit rose (1/f, typique de la musique et de la parole)
// β ≈ 2 → mouvement brownien
```

Les maîtres devraient être proches de β ≈ 1 (bruit rose).

Sauver : `data/SPECTRAL_ANALYSIS.json`

## 3.4 — Rugosité phonologique

Pour chaque fenêtre de 20 phrases, calculer la rugosité sonore :

```typescript
// Consonnes dures : k, t, p, q, g, d, b, r (occlusives)
// Consonnes douces : l, m, n, s, f, v, j, z (fricatives/liquides)
//
// rugosité = count(dures) / (count(dures) + count(douces))
//
// Corréler avec :
// - type dominant (action = plus rugueux ?)
// - GB V1 (les maîtres contrôlent-ils la rugosité ?)
// - sensation produite (rugosité haute = brutalité ?)
```

Pour les textes français, utiliser une table de transcription lettre→phonème
simplifiée (pas besoin de phonétiseur complet) :
```
dures : c→k, k→k, t→t, p→p, q→k, g→g, d→d, b→b, r→r (sauf -er final)
douces : l→l, m→m, n→n, s→s, f→f, v→v, j→ʒ, z→z, ch→ʃ
```

Sauver : `data/PHONOLOGICAL_ROUGHNESS.json`

# ═══════════════════════════════════════════════════════════════════════════════
# MODULE 4 — POLYPHONIE : LES VOIX DES PERSONNAGES
# ═══════════════════════════════════════════════════════════════════════════════
#
# Un LLM a UNE seule voix. Même quand il fait parler 5 personnages.
# Un maître a CINQ voix distinctes dans le même roman.
# On mesure ça.

## 4.1 — Extraction des blocs de dialogue par locuteur

Pour chaque roman contenant ≥ 10% de dialogue :
1. Extraire tous les segments de dialogue (entre guillemets/tirets)
2. Regrouper les segments consécutifs comme UN locuteur (alternance A-B-A-B)
3. Si possible, identifier les locuteurs par les verbes d'attribution ("dit X", "répondit Y")

```typescript
interface DialogueSegment {
  text: string;
  speaker: string | 'UNKNOWN';
  position: number;  // position dans le roman (0.0-1.0)
}
```

## 4.2 — Distance stylistique entre locuteurs

Pour chaque paire de locuteurs DANS LE MÊME roman :
1. Calculer les features textuelles (f1_mean, f29d_ttr, f1a_variance, etc.) 
   sur les répliques de chaque locuteur SÉPARÉMENT
2. Calculer la DISTANCE COSINUS entre les vecteurs de features des 2 locuteurs

```typescript
// distance_stylistic(A, B) = 1 - cosine_similarity(features_A, features_B)
//
// Maître : distance élevée (chaque personnage a sa voix)
// LLM : distance faible (ventriloque — une seule voix pour tous)
```

## 4.3 — Indice de polyphonie

Pour chaque roman :
```typescript
// polyphony_index = mean(distance_stylistic(A, B)) pour toutes les paires A,B
```

Corréler avec GB V1 et tier.

Sauver : `data/POLYPHONY_INDEX.json`

# ═══════════════════════════════════════════════════════════════════════════════
# MODULE 5 — SENSATION PROBABLE : PRÉDIRE CE QUE LE LECTEUR RESSENT
# ═══════════════════════════════════════════════════════════════════════════════
#
# Le but ultime. Savoir AVANT le lecteur ce qu'il va ressentir.
# Et POURQUOI il le ressent.

## 5.1 — Définir les 12 sensations de base

```typescript
const SENSATIONS = [
  'tension',           // quelque chose va arriver, on retient son souffle
  'oppression',        // étouffement, claustrophobie, piège
  'vertige',           // perte de repères, chute, déstabilisation
  'fascination',       // impossible de détourner le regard, hypnose
  'mélancolie',        // tristesse douce, nostalgie, perte
  'violence_sèche',    // choc, brutalité, impact
  'mystère',           // quelque chose est caché, on cherche
  'apaisement',        // calme, beauté, contemplation
  'malaise',           // quelque chose ne va pas, gêne, étrangeté
  'propulsion',        // urgence, vitesse, emporté par le courant
  'ironie_mordante',   // distance critique, humour noir, lucidité cruelle
  'recueillement',     // intimité, profondeur, silence intérieur
] as const;
```

## 5.2 — Marqueurs de sensation (listes fermées)

Pour CHAQUE sensation, définir les marqueurs textuels qui la déclenchent :

### TENSION
- Phrases qui RACCOURCISSENT progressivement (accélération)
- Questions sans réponse dans le texte
- Marqueurs temporels d'imminence (bientôt, soudain, alors, tout à coup)
- Négations empilées (ne... jamais... rien... aucun)
- Subordination croissante (phrases de plus en plus enchâssées)

### OPPRESSION
- Lexique corporel involontaire (souffle, gorge, poitrine, sueur, étau)
- Répétition de mots (échos rapprochés)
- Phrases longues sans respiration (périodes sans virgules)
- Espace clos (mur, pièce, cellule, couloir, cave)
- Absence de dialogue (le personnage est seul)

### VERTIGE
- Ruptures de point de vue (POV shift brutal)
- Sauts temporels (flashback/flash-forward)
- Phrases inachevées ou suspendues (...)
- Métaphores abstraites (le temps, l'infini, le vide, le néant)
- Conditionnel empilé (aurait, serait, pourrait)

### FASCINATION
- Longueur de phrase croissante (période syntaxique qui s'allonge)
- Richesse lexicale haute (TTR élevé)
- Détails sensoriels précis et rares (mot juste)
- Rythme régulier mais pas monotone (variance modérée)
- Absence de rupture (flux continu)

### MÉLANCOLIE
- Imparfait dominant (il était, elle avait, on marchait)
- Marqueurs de mémoire (autrefois, jadis, naguère, se souvenir)
- Négation douce (ne... plus, ne... guère)
- Lexique du temps qui passe (automne, crépuscule, soir, dernier)
- Rythme lent (phrases longues, peu de coupures)

### VIOLENCE_SÈCHE
- Phrases très courtes (< 8 mots)
- Verbes d'impact (frappa, brisa, écrasa, trancha)
- Consonnes dures concentrées (k, t, p, g, d)
- Absence d'adjectifs (pas de décoration)
- Passé simple dominant (il frappa, elle tomba)

### MYSTÈRE
- Questions (pourquoi ? comment ? qui ?)
- Modalisateurs (peut-être, sans doute, il semblait que)
- Références à l'obscurité ou au caché (ombre, voile, secret, derrière)
- Personnage qui observe sans comprendre
- Information retenue (le texte ne dit pas tout)

### APAISEMENT
- Lexique naturel positif (lumière, eau, soleil, jardin, ciel)
- Verbes statiques (s'étendait, régnait, flottait)
- Rythme régulier et lent
- Faible densité d'événements
- Mots sensoriels doux (doux, tiède, léger, clair)

### MALAISE
- Contradiction entre ce qui est dit et ce qui est montré (ironie situationnelle)
- Détails physiques dérangeants (tache, moisi, insecte, fluide)
- Phrases normales suivies de phrases étranges (contraste tonal)
- Le personnage qui continue comme si de rien n'était
- Absence d'explication pour un événement anormal

### PROPULSION
- Phrases très courtes empilées (staccato)
- Verbes d'action en séquence (il courut, sauta, franchit)
- Marqueurs temporels rapides (aussitôt, d'un bond, sans attendre)
- Absence de description (pas le temps de regarder)
- Paragraphes courts

### IRONIE_MORDANTE
- Marqueurs d'ironie (naturellement, évidemment, bien sûr, comme il convient)
- Litotes (pas peu fier, non sans raison)
- Contraste entre le registre et le contenu (ton léger + sujet grave)
- Style indirect libre avec jugement ("La pauvre femme était si heureuse...")
- Adverbes de fausse évidence (apparemment, prétendument)

### RECUEILLEMENT
- Première personne + verbes de perception intérieure (je sentais, je comprenais)
- Silence lexical (silence, immobile, rien ne bougeait)
- Phrases longues et lentes sans action
- Référence au sacré ou à l'absolu (âme, infini, éternité)
- Rythme très régulier (bercement)

## 5.3 — Scorer chaque sensation par fenêtre

Pour chaque fenêtre de 20 phrases :

```typescript
interface SensationVector {
  tension: number;        // 0.0 à 1.0
  oppression: number;
  vertige: number;
  fascination: number;
  melancolie: number;
  violence_seche: number;
  mystere: number;
  apaisement: number;
  malaise: number;
  propulsion: number;
  ironie_mordante: number;
  recueillement: number;
}
```

Chaque score est calculé par comptage des marqueurs présents / marqueurs max.
Normaliser pour que la somme ≤ 1.0 (avec résidu possible).

## 5.4 — Métriques de sensation

Pour chaque fenêtre :

```typescript
interface SensationMetrics {
  // Le vecteur
  vector: SensationVector;
  // La sensation dominante
  dominant: string;
  // L'intensité totale (somme des scores)
  intensity: number;
  // La pureté (1 - entropie normalisée) : effet net vs trouble
  purity: number;
  // La valence : agréable vs désagréable
  valence: number;  // apaisement+fascination+recueillement - violence-oppression-malaise
  // L'activation : calme vs excité
  arousal: number;  // tension+propulsion+violence - apaisement-recueillement-mélancolie
}
```

## 5.5 — Dynamique de sensation sur une scène entière

Pour chaque ROMAN, calculer la courbe de sensation :
- Fenêtres glissantes de 20 phrases, pas de 5
- Pour chaque fenêtre : SensationMetrics
- Tracer l'évolution de chaque sensation au fil du roman

Mesurer :
- **Shifts** : points où la sensation dominante change
- **Pics** : maxima locaux d'intensité
- **Creux** : minima locaux
- **Trajectoire émotionnelle** : la courbe valence × arousal au fil du roman

## 5.6 — Corréler sensation avec GB V1 et composition

Pour chaque fenêtre :
- Sensation dominante × GB V1 → quelles sensations sont associées à la qualité ?
- Sensation × composition → quel mélange de types produit quelle sensation ?
- Sensation × features internes → quelles features CAUSENT la sensation ?

Sauver : `data/SENSATION_ANALYSIS.json`

## 5.7 — Les 8 proses LLM du bench

Passer les 8 proses LLM dans le profileur de sensation.
Afficher le vecteur pour chaque scène.

Comparer avec les fenêtres des MAÎTRES ayant la même composition typologique :
- La prose LLM produit-elle les mêmes sensations qu'un maître avec le même mélange ?
- Ou la sensation est-elle plus PLATE (intensité faible, pureté faible) ?

# ═══════════════════════════════════════════════════════════════════════════════
# MODULE 6 — CALIBRATION INSTRUMENTALE
# ═══════════════════════════════════════════════════════════════════════════════
#
# L'outil mesure-t-il juste ? Les probabilités veulent-elles dire quelque chose ?

## 6.1 — Entropie de type par phrase

Pour chaque phrase du corpus :
```typescript
// H = -Σ p_t × log(p_t)  pour les 5 types
// H faible → phrase typologiquement nette
// H élevée → phrase ambiguë / mixte
```

Distribution de H sur le corpus : combien de phrases sont nettes vs ambiguës ?
Les phrases à haute entropie sont-elles les phrases RÉSIDU ?

## 6.2 — Margin score

```typescript
// margin = p_(1) - p_(2)  (deux meilleures classes)
// margin élevé → classifieur confiant
// margin faible → classifieur hésitant
```

## 6.3 — Stabilité par rééchantillonnage

Pour 100 fenêtres choisies aléatoirement :
1. Calculer la classification
2. Retirer 2 phrases au hasard (10%)
3. Recalculer
4. Mesurer la stabilité : |composition₁ - composition₂|

Si les résultats sont trop sensibles au retrait de 2 phrases → fragile.

## 6.4 — ICC (Intraclass Correlation)

Mesurer la cohérence :
- Entre fenêtres CONSÉCUTIVES du même roman → devrait être modérée (continuité)
- Entre 2 romans du même AUTEUR → devrait être élevée (style)
- Entre 2 auteurs du même TIER → devrait être faible (les bons ne se ressemblent pas)

Sauver : `data/CALIBRATION_METRICS.json`

# ═══════════════════════════════════════════════════════════════════════════════
# EXÉCUTION ET LIVRABLES
# ═══════════════════════════════════════════════════════════════════════════════

## Ordre d'exécution

```
MODULE 6 (calibration) — vérifier que l'instrument est solide
  → MODULE 1 (audit causal) — prouver la chimie
    → MODULE 2 (trajectoires) — mesurer l'ordre
      → MODULE 3 (signal) — mesurer le rythme profond
        → MODULE 4 (polyphonie) — mesurer les voix
          → MODULE 5 (sensation) — prédire ce que le lecteur ressent
```

## Scripts à créer

| Script | Module | Rôle |
|--------|--------|------|
| scripts/calibrate-instrument.ts | 6 | Entropie, margin, stabilité, ICC |
| scripts/causal-audit.ts | 1 | 5 expériences causales |
| scripts/trajectory-physics.ts | 2 | Transitions, dwell, accélération, courbure |
| scripts/signal-analysis.ts | 3 | Hurst, autocorrélation, FFT, rugosité |
| scripts/polyphony-analysis.ts | 4 | Extraction dialogues, distance stylistique |
| scripts/sensation-profiler.ts | 5 | Vecteur de sensation, dynamique, corrélations |

## Fichiers de données à produire

| Fichier | Module | Contenu |
|---------|--------|---------|
| data/CALIBRATION_METRICS.json | 6 | Entropie, margin, stabilité |
| data/CAUSAL_AUDIT_COMPLETE.json | 1 | 5 tests causaux |
| data/CAUSAL_INTRA_AUTHOR.json | 1 | Synergies par auteur |
| data/CAUSAL_BOOTSTRAP_CI.json | 1 | Intervalles de confiance |
| data/CAUSAL_PERMUTATION_TEST.json | 1 | Effet de l'ordre |
| data/TRANSITION_MATRICES.json | 2 | Matrices 5×5 par tier |
| data/DWELL_TIME_ANALYSIS.json | 2 | Durée des blocs |
| data/TRAJECTORY_PHYSICS.json | 2 | Courbure, tortiosité |
| data/TRANSITION_PATTERNS.json | 2 | Trigrams par tier |
| data/HURST_COEFFICIENTS.json | 3 | H par roman |
| data/AUTOCORRELATION_PROFILES.json | 3 | ACF par tier |
| data/SPECTRAL_ANALYSIS.json | 3 | Pente spectrale β |
| data/PHONOLOGICAL_ROUGHNESS.json | 3 | Rugosité par fenêtre |
| data/POLYPHONY_INDEX.json | 4 | Distance entre voix |
| data/SENSATION_ANALYSIS.json | 5 | Vecteurs, dynamique, corrélations |

## Tests à créer

| Test | Contenu |
|------|---------|
| tests/art/causal-audit.test.ts | Vérifie que les 5 tests causaux s'exécutent |
| tests/art/trajectory-physics.test.ts | Vérifie les matrices de transition |
| tests/art/signal-analysis.test.ts | Vérifie Hurst et ACF sur séries synthétiques |
| tests/art/sensation-profiler.test.ts | Vérifie les 12 sensations sur phrases-test |

## Rapport final

Créer : `docs/R_ORACLE_V1_REPORT.md`

Ce rapport DOIT contenir pour CHAQUE module :
- Résultats
- Figures (en markdown ou tableaux)
- Verdicts (PASS/FAIL)
- Découvertes
- Limites
- Recommandations

## Commit final

```bash
git add -A
git commit -m "feat(R-ORACLE v1.0): complete literary physics oracle

MODULE 1 — Causal audit: X/5 tests confirm chemistry is [real/artifact]
MODULE 2 — Trajectory physics: transition matrices, dwell times, patterns
MODULE 3 — Signal analysis: Hurst H=X.XX (maîtres), β=X.XX spectral slope
MODULE 4 — Polyphony: distance between character voices measured
MODULE 5 — Sensation: 12 probable sensations profiled across 571 novels
MODULE 6 — Calibration: entropy, margin, stability verified

571 novels, 4M sentences, 400K windows
New data files: 15 JSON
New scripts: 6
New tests: 4
1911 existing tests PASS, 0 regressions"
git tag r-oracle-v1-complete
```

# ═══════════════════════════════════════════════════════════════════════════════
# CRITÈRES DE SORTIE (TOUS OBLIGATOIRES)
# ═══════════════════════════════════════════════════════════════════════════════

- [ ] MODULE 6 : Entropie, margin, stabilité calculés. Résidu < 15%.
- [ ] MODULE 1 : 5 tests causaux exécutés. Verdict documenté.
- [ ] MODULE 1 : Bootstrap CI sur les 5 synergies principales.
- [ ] MODULE 1 : Test de permutation : l'ordre change-t-il le GB ?
- [ ] MODULE 2 : Matrice de transition 5×5 calculée (global + par tier).
- [ ] MODULE 2 : Dwell time par type. Accélération corrélée avec GB.
- [ ] MODULE 2 : Trigrams de transition S-tier vs D-tier identifiés.
- [ ] MODULE 3 : Coefficient de Hurst calculé pour ≥ 100 romans. Corrélé avec tier.
- [ ] MODULE 3 : Autocorrélation rythmique par tier.
- [ ] MODULE 3 : Pente spectrale β calculée pour ≥ 100 romans.
- [ ] MODULE 3 : Rugosité phonologique par fenêtre.
- [ ] MODULE 4 : Polyphonie mesurée sur ≥ 20 romans dialogués.
- [ ] MODULE 5 : 12 sensations profilées sur le corpus entier.
- [ ] MODULE 5 : Corrélation sensation × GB × composition × features.
- [ ] MODULE 5 : 8 proses LLM profilées avec comparaison maîtres.
- [ ] Rapport R_ORACLE_V1_REPORT.md complet.
- [ ] 1911 tests PASS, zéro régression.
- [ ] 15 fichiers JSON produits.
- [ ] Commit + tag r-oracle-v1-complete.

# ═══════════════════════════════════════════════════════════════════════════════
# FICHIERS INTERDITS DE MODIFICATION
# ═══════════════════════════════════════════════════════════════════════════════

- gb-inference.ts, gb-scorer.ts (juge SCELLÉ)
- text-features.ts (features V3 SCELLÉES)
- depth-features.ts, semantic-depth-features.ts (parité Python SCELLÉE)
- passage-classifier.ts (R-COMP v1 SCELLÉ, commit 647cac9b)
- data/GB_V1_MODEL.json (modèle SCELLÉ)
- engine.ts, config.ts

Les nouveaux modules sont ADDITIFS. Rien d'existant n'est modifié.

# ═══════════════════════════════════════════════════════════════════════════════
# FIN — L'ORACLE VOIT TOUT
# ═══════════════════════════════════════════════════════════════════════════════
#
# "Avant qu'un seul lecteur n'ouvre le livre, nous savons ce qu'il ressentira."
# "Et nous savons POURQUOI."
#
# La littérature n'est pas magique. Elle est physique.
# Et la physique se mesure.
#
# ═══════════════════════════════════════════════════════════════════════════════
