# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT — R-COMP v1.0
# RECHERCHE COMPLÈTE EN PHYSIQUE DE LA COMPOSITION LITTÉRAIRE
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date         : 2026-03-22
# Branche      : phase-r-metrology-rebuild
# HEAD entrant : 5f918e2e
# Standard     : NASA-Grade L4 — RECHERCHE SCIENTIFIQUE POUSSÉE AU PAROXYSME
# Autorité     : Francky (Architecte Suprême)
#
# ═══════════════════════════════════════════════════════════════════════════════
# CONTEXTE : CE QUI A ÉTÉ DÉCOUVERT ET CE QUI EST CASSÉ
#
# Le run R-LAB-TYPE-V2 (571 romans, 4M phrases) a révélé :
#
# DÉCOUVERTES VALIDES :
# - Les interactions entre types sont NÉGATIVES (lissage, pas synergie)
# - Ironie (f28b) et POV shift sont les marqueurs UNIVERSELS de qualité
# - L'exécution interne prime sur le mélange
#
# BUGS CRITIQUES DU CLASSIFIEUR :
# 1. DIALOGUE FR invisible : Hugo 2% dialogue, Dumas 2% → guillemets « » et
#    tirets — non détectés dans le texte LITTÉRAIRE (incises enchâssées,
#    répliques sans changement de ligne, dialogue noyé dans la narration)
# 2. INTROSPECTION trop étroite : Kafka 0%, Dostoïevski 3%, Mrs Dalloway 8%
#    → le détecteur ne capte que les verbes mentaux EXPLICITES, rate le
#    style indirect libre, le flux de conscience, l'incertitude épistémique,
#    la conscience diffuse
# 3. NARRATION = POUBELLE : 99% pour Kafka, 85% pour Hugo → tout ce qui
#    n'est pas détecté par les autres types tombe dans narration par défaut.
#    La narration N'A PAS ses propres critères positifs.
#
# CONSÉQUENCE : les compositions (Niveau 2), interactions (Niveau 4),
# et profils (Niveau 3) sont CONTAMINÉS par des proportions fausses.
# Aucune conclusion n'est scellable tant que le classifieur ne marche pas.
#
# ═══════════════════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════════════════════
# RÈGLES ABSOLUES
# ═══════════════════════════════════════════════════════════════════════════════

R-01 : NE TOUCHER NI au GB V1, NI au V3, NI aux modules de features.
R-02 : Prendre le temps nécessaire. Pas de raccourcis. Tout scanner.
R-03 : Tout est DÉCOUVERT dans le corpus. Rien n'est inventé.
R-04 : Le classifieur passe au PROBABILISTE (vecteur continu, pas hard label).
R-05 : La narration CESSE d'être le type par défaut — elle a ses propres critères.
R-06 : 1911 tests existants doivent PASS.
R-07 : Documenter honnêtement ce qui ne marche pas.

# ═══════════════════════════════════════════════════════════════════════════════
# MODULE A — AUDIT ONTOLOGIQUE : QU'EST-CE QUE CHAQUE TYPE ?
# ═══════════════════════════════════════════════════════════════════════════════

## A.1 — Définitions opérationnelles (CHAQUE TYPE a des critères POSITIFS)

Réécrire les définitions pour que CHAQUE type ait ses propres marqueurs
POSITIFS. Plus de type par défaut. Si une phrase ne matche rien → RÉSIDU
(catégorie explicite, pas "narration").

### DIALOGUE — Définition élargie
Marqueurs positifs :
- Guillemets français « ... » (PAS seulement les anglais "...")
- Tiret cadratin — en début de paragraphe ou après un point
- Tiret demi-cadratin – en début
- Verbe de parole + segment cité (même sans guillemets à la ligne)
- Alternance de locuteurs (changement de pronom entre phrases consécutives
  avec verbes de parole)
- Incises (dit-il, répondit-elle, murmura-t-il) MÊME en milieu de phrase
- Format théâtral : NOM EN MAJUSCULES + ponctuation
- Exclamation directe adressée ("Arrête !", "Viens !")
- Interjections en début de phrase ("Eh bien,", "Mon Dieu,", "Hélas,")

Ce qui N'EST PAS dialogue :
- Discours indirect : "il dit QUE..." → narration
- Discours indirect libre : "Il fallait partir, certes." → introspection ou narration
  (PAS dialogue — c'est de la pensée rapportée, pas de la parole)

### ACTION — Définition élargie
Marqueurs positifs :
- Verbe d'action physique (liste fermée existante — GARDER)
- Changement d'état physique (il tomba, la porte s'ouvrit, le mur s'écroula)
- Déplacement spatial (il traversa, elle monta, ils quittèrent)
- Impact physique (frappa, brisa, écrasa)
- Causalité physique immédiate (le coup fit tomber, la balle perça)
- Séquence temporelle serrée (puis il..., aussitôt..., d'un bond...)

Contrôle contextuel :
- Position du verbe d'action : dans les 10 premiers mots = fort signal
- Verbe d'action en subordonnée après "qui/que/dont" = signal faible
- Si la phrase est >30 mots et contient 3+ adjectifs = description, pas action

### INTROSPECTION — Définition ÉLARGIE (le plus gros changement)
Marqueurs positifs EXPLICITES :
- Verbe mental (pensait, croyait, se demandait, comprenait, imaginait...)
- Verbe émotionnel avec complément abstrait (sentait la peur, éprouvait du remords)
- Première personne + conditionnel (j'aurais voulu, je pourrais peut-être)

Marqueurs IMPLICITES (style indirect libre, flux de conscience) :
- Conditionnel sans "si" (aurait, serait, pourrait, devrait, voudrait, faudrait)
  dans une phrase NON dialogue → signe de pensée rapportée
- Modalisateurs d'incertitude (peut-être, sans doute, probablement, apparemment,
  comme si, on eût dit, il semblait que, perhaps, probably, apparently, as if)
- Exclamation intérieure (Quelle folie ! Et pourquoi ? Comme c'était étrange !)
  → phrase exclamative/interrogative SANS guillemets ni verbe de parole = pensée
- Question rhétorique sans guillemets ("Pourquoi était-il venu ?") = introspection
- Perception filtrée : verbes sensoriels + subjectivité (il lui semblait voir,
  elle croyait entendre, on aurait dit que)
- Marqueurs de mémoire (se souvenait, se rappelait, autrefois, jadis, naguère,
  dans ce temps-là, remembered, recalled, once, in those days)
- Hésitation narrative (ou bien, à moins que, ou peut-être, or perhaps, unless)

### DESCRIPTION — Définition resserrée
Marqueurs positifs :
- Verbe statique (était, semblait, s'étendait, régnait, se dressait, was, seemed)
  comme verbe PRINCIPAL (pas en subordonnée)
- 2+ adjectifs qualificatifs dans la même phrase
- 1+ mot sensoriel (lumière, ombre, odeur, silence, froid, chaud...)
- Structure spatiale (à gauche, au fond, devant, derrière, au-dessus, plus loin)
- Phrases sans agent humain actif (les arbres, le ciel, la salle, la rue)
- Absence de progression temporelle (pas de "puis", "ensuite", "alors")

### NARRATION — Définition POSITIVE (plus de défaut)
Marqueurs positifs :
- Marqueur temporel de progression (puis, ensuite, le lendemain, trois jours après,
  alors, enfin, d'abord, meanwhile, then, next, afterwards, the next day)
- Troisième personne + verbe au passé simple/imparfait + changement d'état
- Résumé d'événement (il obtint le poste, elle quitta la ville, ils se marièrent)
- Connecteur causal narratif (car, donc, c'est pourquoi, si bien que)
- Transition temporelle (le temps passa, les jours s'écoulèrent, un an plus tard)

### RÉSIDU — Catégorie explicite
Si une phrase ne satisfait AUCUN critère positif des 5 types ci-dessus → RÉSIDU.
Le résidu est tracké et reporté. Il doit rester < 15% du corpus.
Si résidu > 15% → les critères sont trop stricts, il faut les élargir.

## A.2 — Passage au PROBABILISTE

Chaque phrase reçoit un VECTEUR de probabilités, pas un hard label :

```typescript
interface SentenceProfile {
  text: string;
  // Vecteur probabiliste : combien de marqueurs de chaque type trouvés
  scores: {
    dialogue: number;       // 0.0 à 1.0
    action: number;
    introspection: number;
    description: number;
    narration: number;
  };
  // Type dominant (pour compatibilité)
  dominant: SentenceType;
  // Résidu = 1 - sum(scores) si sum < 1.0
  residual: number;
  // Marqueurs détectés
  markers: string[];
  // Confiance
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}
```

Le score de chaque type est calculé comme :
```
score_dialogue = (marqueurs_dialogue_trouvés / marqueurs_dialogue_max) × poids
```

Où les poids sont APPRIS sur le corpus (pas inventés).

Pour la compatibilité, le dominant est toujours fourni.
Mais les compositions (Niveau 2) utilisent les VECTEURS, pas les dominants.

# ═══════════════════════════════════════════════════════════════════════════════
# MODULE B — RÉÉCRITURE DU CLASSIFIEUR
# ═══════════════════════════════════════════════════════════════════════════════

## B.1 — Nouveau passage-classifier.ts

Réécrire COMPLÈTEMENT le fichier pour implémenter :

1. Les définitions élargies du Module A
2. Le scoring probabiliste
3. L'export de SentenceProfile
4. La catégorie RÉSIDU explicite
5. La compatibilité avec PassageClassification (somme = 1.0)

### Structure :

```typescript
function scoreSentence(sentence: string, context?: {
  prevType?: SentenceType;
  nextSentence?: string;
}): SentenceProfile {
  const scores = {
    dialogue: scoreDialogue(sentence),
    action: scoreAction(sentence),
    introspection: scoreIntrospection(sentence, context),
    description: scoreDescription(sentence),
    narration: scoreNarration(sentence),
  };
  // Normaliser
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const residual = total < 0.1 ? 1.0 : 0;
  // ...
}
```

### scoreDialogue(sentence) — ÉLARGI

```typescript
function scoreDialogue(sentence: string): number {
  let score = 0;
  const s = sentence.trim();
  const lower = sentence.toLowerCase();
  
  // Guillemets français « »
  if (s.includes('\u00ab') || s.includes('\u00bb')) score += 0.4;
  // Guillemets anglais " " " "
  if (/[""\u201c\u201d]/.test(s)) score += 0.3;
  // Tiret cadratin en début
  if (s.startsWith('\u2014') || s.startsWith('\u2013') || s.startsWith('- ')) score += 0.4;
  // Format théâtre
  if (/^[A-Z\u00c0-\u00dc][A-Z\u00c0-\u00dc\s]{1,25}[.,:\-]/.test(s)) score += 0.5;
  // Verbe de parole
  const words = s.split(/\s+/).map(w => cleanWord(w));
  const hasSpeech = words.some(w => SPEECH_VERBS.has(w));
  if (hasSpeech) score += 0.2;
  // Incise (dit-il, murmura-t-elle, etc.)
  if (/\b(dit|murmura|cria|demanda|repondit|s'ecria|chuchota)-(il|elle|on|ils|elles|t-il|t-elle)\b/i.test(lower)) score += 0.3;
  // Interjection directe en début
  if (/^(Eh bien|Mon Dieu|Hélas|Oh|Ah|Hé|Allons|Tiens|Voyons|Diable)/i.test(s)) score += 0.2;
  // Exclamation directe courte (< 10 mots) adressée à qqn
  if (s.endsWith('!') && words.length < 10 && /\b(tu|vous|toi)\b/i.test(s)) score += 0.2;
  
  // Pénalité : discours indirect (dit que, répondit que)
  if (hasSpeech && /\b(dit|repondit|declara|demanda)\s+(que|qu')/i.test(lower)) score -= 0.3;
  
  return Math.max(0, Math.min(1, score));
}
```

### scoreIntrospection(sentence) — MASSIVEMENT ÉLARGI

```typescript
function scoreIntrospection(sentence: string, context?: { prevType?: SentenceType }): number {
  let score = 0;
  const lower = sentence.toLowerCase();
  const words = sentence.split(/\s+/).map(w => cleanWord(w));
  
  // A. Verbes mentaux explicites
  if (words.some(w => MENTAL_VERBS.has(w))) score += 0.3;
  
  // B. Verbe émotionnel + complément abstrait
  const emotionVerbs = /\b(sentait|sentais|eprouvait|ressentait|felt|experienced)\b/i;
  const abstractNouns = /\b(peur|joie|tristesse|angoisse|culpabilite|honte|colere|remords|doute|desespoir|solitude|fear|joy|sadness|guilt|shame|anger|regret|doubt|despair|loneliness|anxiety|sorrow)\b/i;
  if (emotionVerbs.test(lower) && abstractNouns.test(lower)) score += 0.35;
  
  // C. Conditionnel SANS "si" et SANS guillemets (= pensée rapportée)
  const conditionals = /\b(aurait|serait|pourrait|devrait|voudrait|faudrait|saurait|would|could|should|might)\b/i;
  const hasConditional = conditionals.test(lower);
  const hasQuotes = /[\u00ab\u00bb""\u201c\u201d\u2014\u2013]/.test(sentence);
  if (hasConditional && !hasQuotes && !/\bsi\b/.test(lower)) score += 0.2;
  
  // D. Modalisateurs d'incertitude
  const modalisateurs = [
    'peut-etre', 'sans doute', 'probablement', 'apparemment',
    'comme si', 'on eut dit', 'on aurait dit', 'il semblait que',
    'il lui semblait', 'a ce qu\'il semblait', 'pour ainsi dire',
    'perhaps', 'probably', 'apparently', 'as if', 'as though',
    'it seemed', 'one might say'
  ];
  if (modalisateurs.some(m => lower.includes(m))) score += 0.25;
  
  // E. Question rhétorique SANS guillemets (= pensée intérieure)
  if (sentence.trim().endsWith('?') && !hasQuotes) score += 0.2;
  
  // F. Exclamation intérieure SANS guillemets
  if (sentence.trim().endsWith('!') && !hasQuotes && words.length < 15) score += 0.15;
  
  // G. Marqueurs de mémoire
  const memoryMarkers = /\b(se souvenait|se souvint|se rappelait|se rappela|autrefois|jadis|naguere|dans ce temps|remembered|recalled|once upon|in those days|long ago)\b/i;
  if (memoryMarkers.test(lower)) score += 0.3;
  
  // H. Hésitation narrative (signe de délibération intérieure)
  const hesitation = /\b(ou bien|a moins que|ou peut-etre|ou plutot|or perhaps|or maybe|unless|or rather)\b/i;
  if (hesitation.test(lower)) score += 0.15;
  
  // I. Perception filtrée (il croyait voir, elle semblait entendre)
  const filteredPerception = /\b(croyait voir|croyait entendre|semblait voir|semblait entendre|cru voir|cru entendre|thought he saw|thought she heard|seemed to see|seemed to hear)\b/i;
  if (filteredPerception.test(lower)) score += 0.3;
  
  // J. Première personne dominante (signal modéré)
  const fpWords = ['je', "j'", 'me', "m'", 'moi', 'mon', 'ma', 'mes', 'i', 'my', 'me', 'mine', 'myself'];
  const fpCount = words.filter(w => fpWords.includes(w)).length;
  if (fpCount >= 3) score += 0.15;
  if (fpCount >= 1 && hasConditional) score += 0.1;
  
  return Math.max(0, Math.min(1, score));
}
```

### scoreNarration(sentence) — CRITÈRES POSITIFS (plus de défaut)

```typescript
function scoreNarration(sentence: string): number {
  let score = 0;
  const lower = sentence.toLowerCase();
  const words = sentence.split(/\s+/).map(w => cleanWord(w));
  
  // A. Marqueurs temporels de progression
  const temporalProgression = /\b(puis|ensuite|le lendemain|trois jours|le soir|le matin|un an|quelques|apres|avant|pendant|des que|aussitot|tout a coup|soudain|enfin|d'abord|meanwhile|then|next|afterwards|the next day|soon|finally|first|immediately|later|eventually)\b/i;
  if (temporalProgression.test(lower)) score += 0.3;
  
  // B. Troisième personne + verbe passé simple/imparfait + progression
  const thirdPerson = /\b(il|elle|ils|elles|on|he|she|they)\b/i;
  const passeSimple = /\b\w+(a|it|ut|int|urent|irent|erent)\b/;
  if (thirdPerson.test(lower) && passeSimple.test(lower)) score += 0.2;
  
  // C. Connecteur causal narratif
  const causalNarrative = /\b(car|donc|c'est pourquoi|si bien que|de sorte que|because|therefore|consequently|as a result|thus|hence)\b/i;
  if (causalNarrative.test(lower)) score += 0.15;
  
  // D. Transition temporelle explicite
  const transition = /\b(le temps pass|les jours|les semaines|les mois|les annees|time passed|days went|weeks later|months passed|years went)\b/i;
  if (transition.test(lower)) score += 0.25;
  
  // E. Résumé d'événement (verbe d'accomplissement + COD)
  const accomplishment = /\b(obtint|quitta|epousa|mourut|naquit|devint|perdit|gagna|trouva|apprit|achieved|left|married|died|became|lost|won|found|learned)\b/i;
  if (accomplishment.test(lower)) score += 0.2;
  
  return Math.max(0, Math.min(1, score));
}
```

## B.2 — Agrégation probabiliste au niveau passage

```typescript
export function classifyPassage(text: string): PassageClassification {
  const sents = splitSentences(text);
  const profiles = sents.map(s => scoreSentence(s));
  
  // Moyenne des vecteurs probabilistes (pas des hard labels)
  const avgScores = { dialogue: 0, action: 0, description: 0, introspection: 0, narration: 0 };
  let totalResidual = 0;
  
  for (const p of profiles) {
    for (const type of Object.keys(avgScores) as SentenceType[]) {
      avgScores[type] += p.scores[type];
    }
    totalResidual += p.residual;
  }
  
  const n = Math.max(profiles.length, 1);
  for (const type of Object.keys(avgScores) as SentenceType[]) {
    avgScores[type] /= n;
  }
  
  // Normaliser pour que la somme = 1.0
  const total = Object.values(avgScores).reduce((a, b) => a + b, 0);
  if (total > 0) {
    for (const type of Object.keys(avgScores) as SentenceType[]) {
      avgScores[type] = r4(avgScores[type] / total);
    }
  }
  
  // Le résidu moyen doit être reporté dans les logs
  const avgResidual = totalResidual / n;
  if (avgResidual > 0.15) {
    // ALERTE : trop de phrases non classées
    console.warn(`[CLASSIFIER] High residual: ${(avgResidual * 100).toFixed(1)}% — criteria may be too strict`);
  }
  
  let maxType: SentenceType = 'narration';
  let maxVal = 0;
  for (const [type, val] of Object.entries(avgScores)) {
    if (val > maxVal) { maxVal = val; maxType = type as SentenceType; }
  }
  
  return {
    narration: avgScores.narration,
    description: avgScores.description,
    dialogue: avgScores.dialogue,
    introspection: avgScores.introspection,
    action: avgScores.action,
    dominant_type: maxType,
  };
}
```

# ═══════════════════════════════════════════════════════════════════════════════
# MODULE C — STRESS TEST : LES AUTEURS CASSEURS DE DÉTECTEURS
# ═══════════════════════════════════════════════════════════════════════════════

## C.1 — Le banc des 7 assassins

Avant de scanner le corpus entier, tester le nouveau classifieur sur les 7 auteurs
qui TUENT les détecteurs. Si le classifieur survit à ces 7, il survivra au reste.

```typescript
const STRESS_AUTHORS = [
  {
    name: 'Kafka — Le Procès',
    file: 'kafka_proces_69327.txt',
    target: 'introspection > 15%',
    why: 'Kafka écrit de l introspection sous forme de narration froide'
  },
  {
    name: 'Hugo — Les Misérables', 
    file: 'hugo_miserables_17489.txt',
    target: 'dialogue > 12%',
    why: 'Hugo utilise « » et tirets dans des paragraphes narratifs longs'
  },
  {
    name: 'Dumas — Monte-Cristo',
    file: 'dumas_monte_cristo_17989.txt',
    target: 'dialogue > 20%',
    why: 'Roman extrêmement dialogué en style XIXe'
  },
  {
    name: 'Dostoïevski — Crime et Châtiment',
    file: 'dostoievski_crime_36034.txt',
    target: 'introspection > 12%',
    why: 'Tourments intérieurs de Raskolnikov'
  },
  {
    name: 'Woolf — Mrs Dalloway',
    file: 'pdf_mrs_dalloway_virginia_woolf.txt',
    target: 'introspection > 20%',
    why: 'Stream of consciousness, flux intérieur constant'
  },
  {
    name: 'Proust — Du côté de chez Swann',
    file: 'proust_swann_2650.txt',
    target: 'introspection > 15% AND description > 15%',
    why: 'Mémoire involontaire + descriptions proustiennes'
  },
  {
    name: 'McCarthy — Blood Meridian',
    file: 'pdf_blood_meridian_cormac_mccarthy.txt',
    target: 'action > 15%',
    why: 'Violence extrême, descriptions de massacres'
  },
];
```

Créer : scripts/stress-test-classifier.ts

Pour chaque auteur :
1. Charger le texte
2. Skip préface/licence Gutenberg
3. Tagger chaque phrase avec le NOUVEAU classifieur probabiliste
4. Afficher la distribution ET les 10 premières phrases de chaque type (pour vérifier visuellement)
5. Afficher le % de résidu
6. Vérifier le target

PASS = les 7 targets sont atteints.
FAIL = corriger le classifieur et relancer.

## C.2 — Diagnostic phrase par phrase sur les échecs

Si un auteur échoue, extraire 20 phrases qui devraient être du type X mais
sont classées comme Y. Pour chaque phrase :
- Afficher le texte
- Afficher les scores probabilistes des 5 types
- Afficher les marqueurs détectés
- Identifier pourquoi le type attendu n'a pas été détecté
- Ajouter le marqueur manquant si justifié

Itérer jusqu'à ce que les 7 passent.

# ═══════════════════════════════════════════════════════════════════════════════
# MODULE D — RESCAN COMPLET DU CORPUS (571 ROMANS)
# ═══════════════════════════════════════════════════════════════════════════════

Après que le Module C est PASS, relancer le scan complet :

## D.1 — Scanner tous les fichiers .txt

Pour chaque fichier dans omega-autopsie/corpus_r/txt/ :
1. Skip le préambule Gutenberg (chercher "START OF" ou les premiers 2000 mots si pas Gutenberg)
2. Tagger chaque phrase avec le profileur probabiliste
3. Calculer la distribution au niveau roman
4. Compter le résidu

## D.2 — Rapport de distribution complète

Sauver : data/CLASSIFIER_CALIBRATION_V3.json

Contenu :
- Pour chaque roman : distribution % des 5 types + % résidu
- Statistiques globales : moyenne, médiane, écart-type de chaque type
- Les 20 romans avec le plus de dialogue, action, description, introspection
- Les 20 romans avec le plus de résidu (signale des cas problématiques)

## D.3 — Sanity checks sur 20 œuvres

Les mêmes checks que R-LAB-TYPE-V2 mais avec des seuils CORRIGÉS.
Kafka DOIT avoir > 15% introspection.
Hugo DOIT avoir > 12% dialogue.
Dumas DOIT avoir > 20% dialogue.
Mrs Dalloway DOIT avoir > 20% introspection.

# ═══════════════════════════════════════════════════════════════════════════════
# MODULE E — ÉTUDE DES TRAJECTOIRES (PAS DES MOYENNES)
# ═══════════════════════════════════════════════════════════════════════════════

## OBJECTIF

ChatGPT a raison : la composition émergente ne vient peut-être pas des
QUANTITÉS de types, mais de l'ORDRE dans lequel ils se succèdent.

Deux passages avec 40% action + 30% introspection + 30% narration sont
DIFFÉRENTS si l'un fait "action-action-action-introspection-narration"
(bloc puis relâche) et l'autre fait "action-intro-narration-action-intro"
(alternance constante).

## MÉTHODE

### E.1 — Séquences de types

Pour chaque fenêtre de 20 phrases, encoder la séquence :
```
"AAINNDDDAAINNAA" (A=action, I=introspection, N=narration, D=description, DI=dialogue)
```

### E.2 — Métriques de trajectoire

Pour chaque fenêtre, calculer :
```typescript
interface TrajectoryMetrics {
  // Taux de transition : combien de changements type / (n-1)
  transition_rate: number;
  // Longueur moyenne des blocs consécutifs du même type
  mean_block_length: number;
  // Longueur max d'un bloc
  max_block_length: number;
  // Nombre de "retours" (A→B→A = 1 retour)
  return_count: number;
  // Entropie de la séquence de bigrams (AB, BN, ND, etc.)
  bigram_entropy: number;
  // Présence de motifs récurrents
  has_pattern: boolean;  // ex: ABAB, AABB, etc.
  // Accélération : les blocs raccourcissent-ils ? (montée de tension)
  block_acceleration: number; // négatif = blocs de plus en plus courts = tension
  // Symétrie : la composition est-elle en miroir ? (ABA, chiasme)
  symmetry_score: number;
}
```

### E.3 — Corréler trajectoires avec GB V1

Pour CHAQUE fenêtre, calculer les métriques de trajectoire + le score GB V1.
Puis :

```
Pour chaque métrique de trajectoire :
  corrélation Spearman avec GB V1
```

HYPOTHÈSE à tester :
- transition_rate élevé + blocs courts = meilleur GB (alternance = richesse)
- block_acceleration négatif = meilleur GB (tension montante)
- max_block > 10 = moins bon GB (monotonie)

### E.4 — Patterns de trajectoire des maîtres vs commerciaux

Comparer les trajectoires des romans S-tier vs D-tier du corpus.
Y a-t-il des motifs récurrents chez les maîtres que les commerciaux n'ont pas ?

## LIVRABLE

```
data/TRAJECTORY_ANALYSIS.json
```

# ═══════════════════════════════════════════════════════════════════════════════
# MODULE F — INTERACTIONS REVISITÉES (AVEC LE BON CLASSIFIEUR)
# ═══════════════════════════════════════════════════════════════════════════════

## OBJECTIF

Refaire les calculs d'interaction de R-LAB-TYPE-V2 avec le classifieur CORRIGÉ.
Les résultats précédents (synergies négatives) sont contaminés par le seau narration.

## F.1 — Features par type atomique (Niveau 3 revisité)

Même méthode que Phase 3 de R-LAB-TYPE-V2, mais avec les VRAIS tags probabilistes.
Pour chaque fenêtre : regrouper les phrases par type DOMINANT, calculer les 42 features
GB sur chaque groupe.

## F.2 — Matrice d'interaction (Niveau 4 revisité)

Même méthode : feature_window - predicted_additive = delta d'interaction.
Avec les proportions CORRIGÉES, les résultats seront différents.

La question centrale : les synergies restent-elles NÉGATIVES avec un classifieur corrigé ?
Ou est-ce que certaines deviennent POSITIVES ?

## F.3 — Matrice de compatibilité revisitée

```
data/TYPE_COMPATIBILITY_MATRIX_V2.json
```

## F.4 — Courbes de réponse

Pour les 3 paires les plus importantes (action×introspection, action×narration,
description×introspection), tracer la courbe :
% de type A → delta GB
par tranches de 5% (0%, 5%, 10%, ..., 100%)

## LIVRABLE

```
data/INTERACTION_MATRIX_V2.json
data/TYPE_COMPATIBILITY_MATRIX_V2.json
data/RESPONSE_CURVES_V2.json
```

# ═══════════════════════════════════════════════════════════════════════════════
# MODULE G — COMPOSITIONS ÉMERGENTES (AVEC TRAJECTOIRES)
# ═══════════════════════════════════════════════════════════════════════════════

## OBJECTIF

Re-découvrir les profils de composition avec :
- Le classifieur CORRIGÉ (vecteurs probabilistes)
- Les métriques de TRAJECTOIRE
- Les features INTERNES par type

## G.1 — Clustering enrichi

Chaque fenêtre de 20 phrases est maintenant décrite par :
```
[pct_dial, pct_action, pct_desc, pct_intro, pct_narr,  // 5 dims composition
 transition_rate, mean_block, max_block, return_count,   // 4 dims trajectoire
 bigram_entropy, block_acceleration]                      // 2 dims dynamique
= 11 dimensions
```

Clustering K-means sur ces 11 dimensions.
Tester K = 6, 8, 10, 12. Choisir le K avec les clusters les plus interprétables.

## G.2 — Nommer les compositions

Pour chaque cluster :
- Composition moyenne
- Trajectoire moyenne
- GB V1 moyen
- Romans dominants
- Nom descriptif

## G.3 — Sweetspots et deadzones

Pour chaque cluster :
- % de fenêtres S-tier vs D-tier
- Features internes moyennes par type

Les clusters avec le plus de S-tier = sweetspots.
Les clusters avec le plus de D-tier = deadzones.

## LIVRABLE

```
data/COMPOSITION_PROFILES_V2.json
```

# ═══════════════════════════════════════════════════════════════════════════════
# MODULE H — TESTS EXISTANTS + BENCH
# ═══════════════════════════════════════════════════════════════════════════════

## H.1 — Tests de régression

```bash
npm test
# 1911 tests PASS, zéro régression
```

Si des tests du classifieur échouent (normal si l'interface a changé),
les ADAPTER au nouveau format.

## H.2 — Bench MOCK

Relancer le bench MOCK et vérifier :
- GB V1 scores IDENTIQUES (le classifieur NE CHANGE PAS le GB)
- V3 scores IDENTIQUES
- Types maintenant VARIÉS et CRÉDIBLES
- Résidu < 15%

## H.3 — 8 proses LLM

Reclasser les 8 proses LLM du bench API avec le NOUVEAU classifieur.
Afficher le détail phrase par phrase pour la prose Panique.

# ═══════════════════════════════════════════════════════════════════════════════
# MODULE I — RAPPORT FINAL OMNIPOTENT
# ═══════════════════════════════════════════════════════════════════════════════

Créer : docs/R_COMP_V1_FINAL_REPORT.md

Ce rapport DOIT contenir :

1. **État du classifieur** : accuracy avant/après, résidu, 7 stress tests
2. **Distributions corrigées** : les 20 œuvres clés avec les VRAIS pourcentages
3. **Trajectoires** : quelles métriques corrèlent avec la qualité
4. **Interactions revisitées** : les synergies sont-elles toujours négatives ?
5. **Compositions émergentes** : les profils découverts avec trajectoires
6. **Features universelles** : confirmation ou infirmation des résultats R-LAB-TYPE-V2
7. **Sweetspots et deadzones** : les recettes des maîtres
8. **Limites honnêtes** : ce qui ne marche pas encore
9. **Recommandations** : que faire ensuite

# ═══════════════════════════════════════════════════════════════════════════════
# ORDRE D'EXÉCUTION
# ═══════════════════════════════════════════════════════════════════════════════

```
MODULE A (ontologie) 
  → MODULE B (réécriture classifieur)
    → MODULE C (stress test 7 auteurs — ITÉRATIF jusqu'à PASS)
      → MODULE D (rescan corpus 571 romans)
        → MODULE E (trajectoires)
          → MODULE F (interactions revisitées)
            → MODULE G (compositions émergentes)
              → MODULE H (tests + bench)
                → MODULE I (rapport final)
```

NE PAS passer au module suivant sans que le précédent soit PASS.
Le Module C est ITÉRATIF : si un auteur échoue, corriger et relancer.

# ═══════════════════════════════════════════════════════════════════════════════
# COMMITS
# ═══════════════════════════════════════════════════════════════════════════════

```bash
# Commit 1 — Classifieur + stress tests
git add src/scoring/passage-classifier.ts
git add scripts/stress-test-classifier.ts
git commit -m "feat(R-COMP): probabilistic classifier + stress test 7 authors PASS"

# Commit 2 — Rescan + trajectoires + interactions
git add src/scoring/data/*.json
git add scripts/calibrate-full.ts
git commit -m "feat(R-COMP): full corpus rescan + trajectories + interactions V2"

# Commit 3 — Rapport final
git add docs/R_COMP_V1_FINAL_REPORT.md
git add tests/art/passage-classifier-v3.test.ts
git commit -m "docs(R-COMP): final report — literary physics complete"
git tag r-comp-v1-complete
```

# ═══════════════════════════════════════════════════════════════════════════════
# CRITÈRES DE SORTIE (TOUS OBLIGATOIRES)
# ═══════════════════════════════════════════════════════════════════════════════

- [ ] Classifieur PROBABILISTE (vecteur, pas hard label)
- [ ] Narration a des critères POSITIFS (plus de défaut)
- [ ] Résidu explicite (catégorie propre, < 15%)
- [ ] 7 stress tests auteurs : TOUS PASS
- [ ] Kafka > 15% introspection
- [ ] Hugo > 12% dialogue
- [ ] Dumas > 20% dialogue
- [ ] Mrs Dalloway > 20% introspection
- [ ] Corpus ENTIER rescanné (~571 romans)
- [ ] Trajectoires calculées (transition rate, block length, acceleration)
- [ ] Interactions REVISITÉES avec classifieur corrigé
- [ ] Compositions émergentes REDÉCOUVERTES (clustering 11 dimensions)
- [ ] Bench MOCK : GB V1 inchangé, types crédibles
- [ ] 1911 tests PASS, zéro régression
- [ ] Rapport final R_COMP_V1
- [ ] Commit + tag r-comp-v1-complete

# ═══════════════════════════════════════════════════════════════════════════════
# FICHIERS INTERDITS DE MODIFICATION
# ═══════════════════════════════════════════════════════════════════════════════

- gb-inference.ts, gb-scorer.ts (le juge est SCELLÉ)
- text-features.ts (les features V3 sont SCELLÉES)
- depth-features.ts, semantic-depth-features.ts (parité Python SCELLÉE)
- data/GB_V1_MODEL.json (le modèle est SCELLÉ)
- engine.ts, config.ts

# ═══════════════════════════════════════════════════════════════════════════════
# FIN — "Ce qui n'est pas prouvé n'existe pas."
# ═══════════════════════════════════════════════════════════════════════════════
#
# Kafka n'est pas bizarre. Notre détecteur est bête.
# Hugo ne manque pas de dialogue. Notre parseur ne lit pas le français.
# La narration n'est pas dominante. C'est la poubelle qui déborde.
#
# On corrige. On mesure. On prouve. On recommence jusqu'à ce que ce soit JUSTE.
#
# ═══════════════════════════════════════════════════════════════════════════════
