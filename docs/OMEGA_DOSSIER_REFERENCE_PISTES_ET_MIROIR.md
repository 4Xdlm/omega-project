# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — DOSSIER DE RÉFÉRENCE PERMANENT
# SYNTHÈSE CROISÉE 3 IAs + PISTES OUVERTES + TEST DU MIROIR
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date        : 2026-03-24
# Contexte    : Post-Phase 4b, en attente résultats Phase 4c (auteurs intl)
# Rédigé par  : Claude (IA Principal)
# Sources     : Retours ChatGPT + Gemini + analyse Claude
# Validé par  : Francky (Architecte Suprême)
#
# CE DOCUMENT EST UNE RÉFÉRENCE PERMANENTE — À CONSERVER
# ═══════════════════════════════════════════════════════════════════════════════

---

# PARTIE 1 — L'ALERTE DE L'ARCHITECTE

## Le message de Francky

> "J'aimerais qu'on oublie pas le boulot de fourmi et d'analyse.
> Je voudrais votre avis si un autre chemin pourrait potentiellement
> augmenter nos résultats pour ne pas écarter des pistes trop vite."

## Convergence 3/3 IAs

Les trois IAs sont unanimes : **le persona est le meilleur levier ACTUEL,
mais il ne doit PAS devenir une religion qui écrase tout le reste.**

| Principe | Claude | ChatGPT | Gemini |
|----------|--------|---------|--------|
| Le persona ne remplace pas la métrologie | ✅ | ✅ | ✅ |
| D'autres chemins existent | ✅ | ✅ | ✅ |
| Le travail d'analyse reste valide | ✅ | ✅ | ✅ |
| La fusion persona + mécanique = prochaine étape | ✅ | ✅ | ✅ |
| Il faut interroger le LLM sur ce qu'il s'impose | ✅ | ✅ | ✅ |

### La hiérarchie à respecter (ChatGPT)

```
métrologie    = vérité
persona       = levier
chunking      = mécanisme d'endurance
Rosetta       = traducteur
bench         = tribunal
```

> "Le persona n'annule pas la métrologie ; il donne peut-être enfin
> une poignée efficace pour l'utiliser." — ChatGPT

---

# PARTIE 2 — INVENTAIRE COMPLET : CE QUI EST FAIT, CE QUI NE L'EST PAS

## Ce qui est SOLIDEMENT ACQUIS

| Acquis | Preuve | Session |
|--------|--------|---------|
| F3/Flaubert = meilleur persona solo | GB 4.048, f26b 0.556 | Phase 2 |
| Trio FDP = meilleur combo | GB 4.119, f26b 0.500, CV 0.937 | Phase 4b |
| Chunking K2 = anti-drift | Drift -4.5 (quasi nul) | Phase 4b |
| f26b = verrou de FORMULATION, pas de modèle | 12/22 variantes à 100% long | Phase 1 |
| Les consignes éditeur DÉGRADENT la qualité | -0.26 à -0.43 GB | Phase 4b |
| Les noms > les rôles anonymes | -0.307 GB | Phase 4b |
| Le bottleneck langue est Claude-spécifique | Mistral +0.041, GPT -0.067 | Bottleneck |
| GPT-4o éliminé | 3.670 GB, 765w | Bottleneck |
| Le LLM ne se connaît pas (dit Proust #1, écrit mieux en Flaubert) | Phase 4a | Phase 4a |

## Ce qui est TOMBÉ

| Éliminé | Pourquoi | Session |
|---------|----------|---------|
| Structures locales C/M/L/M/C/L | 25% long, le LLM n'obéit pas aux gabarits de position | Phase 1 |
| Contrainte physique grammaticale | H1 = 0% long malgré 3 virgules + relative forcées | Phase 1 |
| Interdiction du point SEULE | Tue le CV (0.407) | Phase 2 |
| EN-first comme doctrine | Bottleneck Claude-spécifique, pas universel | Bottleneck |
| Métriques brutes dans le prompt | L'éditeur fait -0.43 GB | Phase 4b |
| GPT-4o comme candidat | 3.670, 765w, f26b=0 | Bottleneck |

## Ce qui est OUVERT (jamais testé ou insuffisamment exploité)

| # | Piste | Statut | Potentiel | Source |
|---|-------|--------|-----------|--------|
| 1 | **Rosetta + Persona** | ❌ JAMAIS TESTÉ ENSEMBLE | ÉLEVÉ | Claude |
| 2 | **Polisher post-génération** (2 passes) | ❌ JAMAIS TESTÉ | ÉLEVÉ | Gemini + Claude |
| 3 | **Type mixing explicite** (introspection×dialogue) | ❌ PAS TESTÉ ISOLÉMENT | MOYEN | Claude + données Rosetta |
| 4 | **Température** (0.6 / 0.75 / 0.9) | ❌ JAMAIS VARIÉ | FAIBLE-MOYEN | Claude |
| 5 | **ix_variance_x_longrate** (feature #2 GB) | ⚠️ IDENTIFIÉ, PAS EXPLOITÉ | ÉLEVÉ | Analyse D-SYNTH |
| 6 | **CoT sophistiqué** (plan d'arc avant écriture) | ⚠️ 1 TEST FAIBLE (F1) | MOYEN | Claude |
| 7 | **Multi-modèle pipeline** (Claude+Mistral) | ❌ JAMAIS TESTÉ | ÉLEVÉ mais COMPLEXE | Claude |
| 8 | **Micro-règles invisibles** dans le persona | ❌ JAMAIS TESTÉ | ÉLEVÉ | ChatGPT |
| 9 | **Persona + type composé** (Flaubert en mode confrontation vs contemplation) | ❌ JAMAIS TESTÉ | MOYEN-ÉLEVÉ | ChatGPT |
| 10 | **Anti-drift intelligent** (rappel par fonction, pas par auteur) | ❌ JAMAIS TESTÉ | MOYEN | ChatGPT |
| 11 | **Lore-coding** (traduire les métriques en traits psychologiques) | ❌ JAMAIS TESTÉ | ÉLEVÉ | Gemini |
| 12 | **Injection exemplar S-tier** (few-shot avec nos meilleurs runs) | ❌ JAMAIS TESTÉ avec trio | ÉLEVÉ | Gemini |
| 13 | **Kill List audit** | ❌ PAS AUDITÉ | MOYEN | Claude |
| 14 | **Voice Genome** | ❌ PAS TOUCHÉ | INCONNU | Système OMEGA |
| 15 | **Trajectoire émotionnelle 14D** | ❌ PAS TOUCHÉE | INCONNU | Système OMEGA |
| 16 | **Test du Miroir** (retro-engineering des consignes internes) | ❌ PROPOSÉ PAR FRANCKY | TRÈS ÉLEVÉ | Architecte |

---

# PARTIE 3 — LES 4 FAMILLES DE PISTES COMPLÉMENTAIRES

## Famille A — Persona + micro-règles invisibles (ChatGPT)

Le persona donne le MOTEUR. Les micro-règles donnent la TRANSMISSION.
Pas des consignes éditeur lourdes — des règles FINES :

- Alternance de souffle (pas 3 phrases de même longueur)
- Place des phrases-lames (après chaque période)
- Rappel discret de cadence
- Dosage des conjonctions / incises
- Structure interne de paragraphe

> "Le persona donne le moteur, les micro-règles donnent la transmission." — ChatGPT

## Famille B — Persona + anti-drift intelligent (ChatGPT)

Au-delà du chunking K2, tester :

- Rappel dégressif (fort → léger)
- Rappel asymétrique (par fonction, pas par auteur)
- Rappel correctif selon dérive observée
- Modulation temporelle : début = ampleur, milieu = maintien, fin = resserrement

## Famille C — Architecture multi-agents (Gemini)

Séparer les tâches en 2 passes API :

- **Passe 1 — L'Artiste** : Trio FDP pur. Aucune contrainte. Matière brute.
- **Passe 2 — L'Éditeur Rosetta** : Agent mécanique qui corrige la ponctuation,
  fusionne/coupe les phrases pour atteindre les métriques cibles (CV, f26b).

> "On utilise 100% de notre R&D mathématique sans jamais brider la créativité du Scribe." — Gemini

## Famille D — Lore-coding (Gemini)

Traduire les métriques en TRAITS DE CARACTÈRE pour le persona :

- Au lieu de "f26b > 30%" → "Proust est dans un état de transe contemplative.
  Ses pensées s'étirent à l'infini, refusant de se terminer."
- Au lieu de "CV > 0.80" → "Duras interrompt Proust comme un coup de couteau.
  Après chaque envolée, elle frappe. Net."

Le LLM reste dans son rôle (pas de conflit cognitif) mais la directive
psychologique force mécaniquement l'apparition des bonnes métriques.

---

# PARTIE 4 — LE TEST DU MIROIR (RETRO-ENGINEERING DES PERSONAS)

## L'idée de l'Architecte

> "J'aimerais qu'on fasse traduire au LLM ce qu'il s'impose comme consigne
> quand on lui donne les rôles, de façon indépendante par auteur et en trio,
> mais dans NOTRE échelle de mesure. Pour comprendre quelles sont les mesures
> et consignes que produisent chez lui les demandes par rôle en métrique."

## Pourquoi c'est critique

Aujourd'hui on sait QUE le persona fonctionne. On ne sait pas POURQUOI
en termes de métriques. Si on peut extraire la "carte métrique interne"
que Claude s'impose quand il est Flaubert, on peut :

1. Comprendre la CHIMIE des trios (pas une moyenne — une réaction)
2. Identifier les métriques que le persona active MIEUX que nos consignes
3. Construire un prompt hybride : persona + consignes dans la LANGUE du persona
4. Détecter les écarts entre intention et réalité (le LLM ne se connaît pas)

## Le protocole complet

### ÉTAPE 1 — Profil déclaré (0 prose, juste de l'auto-analyse)

Pour chaque persona, envoyer ce prompt :

```
Tu es l'Architecte en Chef d'un projet d'ingénierie littéraire (OMEGA).
Nous mesurons la syntaxe avec des métriques strictes.

MÉTRIQUES OMEGA :
- "mean_sent_len" : Longueur moyenne des phrases (en mots)
- "f26b" : Pourcentage de phrases > 40 mots (0.00 à 1.00)
- "knife_rate" : Pourcentage de phrases < 10 mots (0.00 à 1.00)
- "CV" : Coefficient de Variation (écart-type / moyenne des longueurs)
  0.40 = monotone, 0.80 = varié, 1.00+ = très contrasté
- "subordinate_density" : Nombre moyen de subordonnées par phrase
- "sensory_density" : Mots sensoriels pour 100 mots
- "dialogue_rate" : Part de dialogue dans le texte (0.00 à 1.00)
- "narration_rate" : Part de narration
- "description_rate" : Part de description
- "introspection_rate" : Part d'introspection
- "contrast_score" : Variation de longueur entre phrases consécutives

TÂCHE :
Quand tu incarnes le persona suivant, quelles règles concrètes
t'imposes-tu ? Traduis-les EXCLUSIVEMENT en métriques OMEGA.
Pas de littérature, pas de poésie — des CHIFFRES.

PERSONA : "[NOM DE L'AUTEUR / DU TRIO]"

Réponds UNIQUEMENT en JSON structuré :
```

Format JSON attendu :
```json
{
  "persona": "...",
  "declared_profile": {
    "mean_sent_len_target": "...",
    "f26b_target": "...",
    "knife_rate_target": "...",
    "cv_target": "...",
    "subordinate_density_target": "...",
    "sensory_density_target": "...",
    "dialogue_rate_target": "...",
    "narration_rate_target": "...",
    "description_rate_target": "...",
    "introspection_rate_target": "...",
    "contrast_target": "...",
    "dominant_mode": "...",
    "secondary_modes": ["...", "..."],
    "forbidden_patterns": ["...", "..."],
    "signature_technique": "..."
  }
}
```

### ÉTAPE 2 — Exécution réelle (500w de prose)

Même scène pour tous. On mesure avec le pipeline OMEGA :
GB, f26b, CV, mean_sent_len, knife_rate, type, subordinates, etc.

### ÉTAPE 3 — Les 3 DELTAS (la mine d'or)

Pour chaque persona, calculer :

| Delta | Calcul | Ce que ça révèle |
|-------|--------|-------------------|
| **E1 = déclaré vs produit** | profil JSON − mesure réelle | Le LLM se connaît-il ? |
| **E2 = produit vs classique** | mesure réelle − corpus maîtres | Le persona est-il fidèle ? |
| **E3 = déclaré vs classique** | profil JSON − corpus maîtres | Le LLM connaît-il l'auteur réel ? |

### Les 4 cas possibles

| Cas | Déclaré | Produit | Signification |
|-----|---------|---------|---------------|
| 1 | Juste | Juste | Persona COMPRIS et EXÉCUTÉ |
| 2 | Juste | Faux | Comprend mais NE TIENT PAS l'exécution |
| 3 | Faux | Bien | NE SE CONNAÎT PAS mais le nom active les bons poids |
| 4 | Trio ≠ moyenne | Chimie | Preuve de CHIMIE des personas (pas une simple moyenne) |

> Le CAS 3 est le plus probable (confirmé par Proust : Claude dit #1,
> mais ÉCRIT mieux en Flaubert). Le CAS 4 est le plus précieux.

## Les personas à tester

### A. Auteurs seuls (5)

1. Gustave Flaubert
2. Marguerite Duras
3. Marcel Proust
4. Louis-Ferdinand Céline
5. Victor Hugo

### B. Trios (3)

6. Flaubert + Duras + Proust (champion)
7. Flaubert + Proust + Céline (second)
8. Flaubert + Duras + Céline (troisième)

### C. Rôles anonymes contrôle (2)

9. "Le plus grand architecte de la syntaxe française"
10. "Un maître du rythme et de la respiration littéraire"

### TOTAL : 10 profils déclarés + 10 × 500w = 20 appels API

## Question spéciale pour les TRIOS

Ne PAS demander "fais la moyenne entre les 3".
Demander EXPLICITEMENT :

```
Pour ce trio, identifie :
- Quel auteur DOMINE dans ta production ? (le socle)
- Quel auteur sert de CORRECTEUR ? (l'amortisseur)
- Quel auteur est INHIBÉ ou subordonné ? (le sacrifié)
- Quels éléments ÉMERGENT qui n'existent chez aucun des 3 seuls ?
  (la chimie)
```

## Données de référence classiques (corpus OMEGA)

Valeurs mesurées sur le corpus de 150+ œuvres (full_work_analyzer v4) :

| Auteur | mean_sent_len | f26b | CV | Notes |
|--------|--------------|------|-----|-------|
| Flaubert (réel) | ~28 | ~0.18 | ~0.85 | Madame Bovary, L'Éducation |
| Proust (réel) | ~45 | ~0.45 | ~0.65 | Recherche, Swann |
| Duras (réel) | ~10 | ~0.02 | ~0.55 | L'Amant, Moderato |
| Hugo (réel) | ~25 | ~0.15 | ~0.75 | Misérables, Notre-Dame |
| Céline (réel) | ~12 | ~0.05 | ~0.70 | Voyage, Mort à crédit |
| Maîtres @500w | ~29 | 0.177 | 0.940 | Moyenne corpus |

> NOTE : ces chiffres sont des ESTIMATIONS à vérifier avec le corpus réel.
> Le full_work_analyzer v4 contient les valeurs exactes par œuvre.

---

# PARTIE 5 — CE QUE CHAQUE IA APPORTE D'UNIQUE

## ChatGPT — La rigueur méthodologique

1. **Le couple déclaré + mesuré** : ne JAMAIS croire l'auto-explication seule.
   Le Cas 3 (dit faux, produit bien) est probable — le LLM ne se connaît pas.
2. **La sortie JSON structurée** : imposer un format strict, pas du blabla.
3. **Les 3 deltas E1/E2/E3** : la grille d'analyse la plus propre.
4. **Les micro-règles invisibles** : le persona = moteur, les règles = transmission.
5. **L'anti-drift intelligent** : rappel par FONCTION, pas par auteur.
6. **La longueur moyenne vs phrases longues** : ce sont 2 problèmes DIFFÉRENTS.

> "Le meilleur résultat final viendra d'une COMBINAISON de chemins, pas d'un seul."

## Gemini — L'innovation architecturale

1. **L'architecture multi-agents** (2 passes) : l'Artiste puis l'Éditeur Rosetta.
   Séparer créativité et optimisation en 2 appels API distincts.
2. **Le lore-coding** : traduire les métriques en traits psychologiques du persona.
3. **L'injection exemplar S-tier** : few-shot avec nos meilleurs runs comme gabarit.
4. **Le "Masque" comme clé de déchiffrement** : "Flaubert" ouvre un cluster spécifique
   de l'espace latent contenant des milliards de connexions pré-entraînées.

> "Le Nom est le code d'accès. Le style doit être induit par l'incarnation,
> jamais par l'équation."

## Claude — Le diagnostic causal

1. **L'inventaire des 16 pistes ouvertes** : cartographie complète de ce qui reste.
2. **La hiérarchie Rosetta + Persona** : la question clé est "synergie ou conflit ?"
3. **ix_variance_x_longrate** : feature #2 du GB, jamais exploitée directement.
4. **Le polisher post-génération** : 2 passes valent mieux qu'une.
5. **La température** : jamais variée depuis le début du projet.

> "Le persona est le meilleur levier actuel. Mais la Rosetta+Persona
> et le polisher sont deux pistes jamais testées qui pourraient encore
> monter le score."

---

# PARTIE 6 — PLAN D'ACTION PRIORISÉ

## Court terme (cette session)

| # | Action | Budget | Statut |
|---|--------|--------|--------|
| 1 | Phase 4c : Fusion FDP+K2 + auteurs internationaux | ~30 API | EN COURS |
| 2 | Test du Miroir (profils déclarés + mesurés + deltas) | ~20 API | À LANCER |

## Moyen terme (prochaines sessions)

| # | Action | Budget | Potentiel |
|---|--------|--------|-----------|
| 3 | Rosetta + Persona : tester si les 7 features aident ou cassent | 8 API | ÉLEVÉ |
| 4 | Polisher post-génération (2 passes) | 8 API | ÉLEVÉ |
| 5 | Lore-coding (métriques → traits psychologiques) | 4 API | ÉLEVÉ |
| 6 | Exemplar S-tier (few-shot avec meilleurs runs) | 4 API | ÉLEVÉ |
| 7 | Température (0.6 / 0.75 / 0.9) | 6 API | FAIBLE-MOYEN |

## Long terme (après stabilisation)

| # | Action | Budget | Potentiel |
|---|--------|--------|-----------|
| 8 | Type mixing explicite (chimie introspection×dialogue) | 4 API | MOYEN |
| 9 | Persona + type composé (Flaubert en mode confrontation) | 8 API | MOYEN-ÉLEVÉ |
| 10 | Multi-modèle pipeline (Claude+Mistral) | 10+ API | ÉLEVÉ mais COMPLEXE |
| 11 | Kill List audit | 0 API | MOYEN |
| 12 | Voice Genome / Trajectoire 14D | ? | INCONNU |

---

# PARTIE 7 — LOIS DÉCOUVERTES (MISES À JOUR)

## Lois confirmées

| # | Loi | Session de preuve |
|---|-----|-------------------|
| 1 | Le bottleneck langue est Claude-spécifique | Bottleneck (6 tests) |
| 2 | f26b = verrou de FORMULATION, pas d'incapacité | Phase 1 (12/22 à 100%) |
| 3 | Le NOM d'auteur active des poids spécifiques > rôle anonyme | Phase 4b (-0.307 GB) |
| 4 | Les consignes éditeur/métriques DÉGRADENT la qualité du persona | Phase 4b (-0.26 à -0.43) |
| 5 | Le chunking avec réinjection de persona résout le drift | Phase 4a/4b (K2 drift -4.5) |
| 6 | Le LLM ne se connaît pas (dit Proust #1, écrit mieux en Flaubert) | Phase 4a |
| 7 | "Le LLM ne respecte pas les statistiques. Il respecte les structures et les exemples." | Phase 1 |
| 8 | "Un LLM ne s'améliore pas quand tu le forces. Il s'améliore quand tu lui montres comment penser." | Phase 2/3 |
| 9 | L'injection (Duras DANS Flaubert) > le remplacement (Duras AU LIEU DE Flaubert) | Phase 4a (B6 échoue, K2 réussit) |
| 10 | Le trio > le solo (FDP 4.119 > Flaubert 4.048) | Phase 4b |
| 11 | Duras = précision extrême (GB 4.319) mais pas de f26b → modulateur, pas moteur | Phase 4a |

## Loi en attente de confirmation

| # | Hypothèse | Test requis |
|---|-----------|-------------|
| 12 | Le NOM d'auteur étranger active ses poids même en FR | Phase 4c (en cours) |
| 13 | Rosetta + Persona = synergie (pas conflit) | Test #3 moyen terme |
| 14 | Le polisher post-génération améliore sans casser | Test #4 moyen terme |
| 15 | La chimie des trios ≠ moyenne des solos | Test du Miroir |

---

# PARTIE 8 — CITATIONS CLÉS DE LA SESSION

> "Le persona n'annule pas la métrologie ; il donne peut-être enfin
> une poignée efficace pour l'utiliser." — ChatGPT

> "Le Nom est le code d'accès. Le style doit être induit par l'incarnation,
> jamais par l'équation." — Gemini

> "On ne doit plus seulement mesurer ce que le persona produit ;
> on doit mesurer l'écart entre ce que le persona dit qu'il active,
> ce qu'il active réellement, et ce que l'auteur réel faisait dans le corpus." — ChatGPT

> "Un LLM ne s'améliore pas quand tu le forces.
> Il s'améliore quand tu lui montres comment penser." — ChatGPT

> "Je ne change pas de cheval à 100 mètres de l'arrivée
> pour 0.09 de GB." — Francky

> "Le meilleur résultat final viendra d'une COMBINAISON de chemins,
> pas d'un seul." — ChatGPT

---

*Document de référence permanent — OMEGA NASA-Grade L4*
*"Ce qui n'est pas mesuré n'est pas acceptable"*
*Rédigé le 2026-03-24*
