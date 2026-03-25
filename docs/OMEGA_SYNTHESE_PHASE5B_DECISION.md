# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — SYNTHÈSE CROISÉE PHASE 5b
# DÉCISION STRATÉGIQUE : PRODUCTION vs GB PUR
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date       : 2026-03-24
# Sources    : Phase 5b (75 runs) + Claude + ChatGPT + Gemini
# Statut     : DOCUMENT DE DÉCISION FINALE
# ═══════════════════════════════════════════════════════════════════════════════

---

# 1. CE QUE LES 75 RUNS ONT PROUVÉ MATHÉMATIQUEMENT

## 1.1 — Les 2 lois CONFIRMÉES

### LOI CV-ÉMERGENCE (H3 — PASS 90%)

```
Dans 9 combinaisons sur 10, le CV produit est SUPÉRIEUR
au CV théorique moyen des composants.
```

Le CV n'est pas additif — il est ÉMERGENT. Mélanger un FLEUVE et une LAME
crée une variation rythmique qu'aucun des deux ne possède seul.
C'est la raison d'être des trios et paires : pas le GB, mais le RYTHME.

### LOI CV-OPTIMAL (H4 — PASS)

```
Le GB est maximal quand le CV ≈ 1.07
Zone utile : CV ∈ [0.80, 1.30]
En dessous de 0.50 : trop plat (Duras solo 0.479, Proust solo 0.229)
Au-dessus de 2.00 : trop chaotique (DDP 1.874 → GB 3.655)
```

C'est le NOMBRE D'OR du rythme littéraire selon le juge GB V1.

## 1.2 — Les 3 hypothèses RÉFUTÉES

| Hypothèse | Résultat | Conséquence |
|-----------|----------|-------------|
| H1 : Trios > Solos | ❌ FAIL | Solos 3.918 > Trios 3.812 en GB |
| H2 : Lame domine toujours | ❌ FAIL (57%) | Dépend du couple, pas de la famille |
| DDP champion | ❌ CRASH (4.152 → 3.655) | 1 run ne suffit JAMAIS |

## 1.3 — Le classement STABILISÉ (5 runs)

| Rang | Config | GB médian | GB std | CV | Mean | Viable roman ? |
|------|--------|-----------|--------|-----|------|----------------|
| #1 | Duras solo | 4.243 | 0.186 | 0.479 | 3.9 | ❌ NON |
| #2 | Hemingway solo | 3.995 | 0.201 | 0.480 | 4.2 | ❌ NON |
| #3 | **FDP trio** | **3.990** | **0.101** | **1.091** | 14.4 | **✅ OUI** |
| #4 | faulkner_duras | 3.989 | 0.166 | 1.250 | 21.2 | ⚠️ Moyen |
| #5 | proust_duras | 3.981 | 0.140 | 1.349 | 23.1 | ⚠️ Moyen |
| #6 | proust_flaubert | 3.964 | **0.049** | 0.903 | 25.5 | ✅ OUI |
| #7 | WDF trio | 3.937 | 0.238 | 0.969 | 9.9 | ⚠️ Instable |

---

# 2. LE DILEMME : GB PUR vs PRODUCTION VIABLE

## 2.1 — Ce que dit le GB pur

Duras gagne tout : 4.243, win rate 87%.
Mais Duras = 3.9 mots/phrase, 0% de phrases longues, 0 f26b.

## 2.2 — Ce que dit la réalité littéraire

Un roman de 300K mots à 3.9 mots/phrase :
- N'existe PAS dans la littérature humaine
- Serait illisible sur 3 pages
- N'a aucune variation de rythme (CV 0.479)
- Ne contient aucune phrase complexe, aucune subordination
- Ne permet pas de description, d'introspection longue, de développement

## 2.3 — La Loi de Goodhart (ChatGPT)

> "Lorsqu'une mesure devient un objectif, elle cesse d'être une bonne mesure."

Le GB V1 est hypnotisé par la DENSITÉ sémantique. Duras enlève 100% de la
graisse syntaxique → le GB lui donne le score maximal. C'est un EXPLOIT
(un hack) de la métrique, pas une preuve de qualité littéraire.

## 2.4 — Le double objectif d'OMEGA

OMEGA n'est pas un benchmark. OMEGA doit :

1. **CRÉER de la prose de qualité** sur 300K mots (chapitres entiers)
2. **CONTINUER une histoire** en respectant un style établi entre sessions

Le premier objectif exige de la VARIÉTÉ (f26b > 0, CV > 0.8, types mixtes).
Le second exige de la STABILITÉ (reproductibilité du style d'un chapitre à l'autre).

---

# 3. CONVERGENCE 3/3 IAs : FDP = MOTEUR DE PRODUCTION

## 3.1 — Pourquoi FDP et pas Duras

| Critère | Duras solo | FDP trio |
|---------|-----------|---------|
| GB médian | 4.243 (meilleur) | 3.990 |
| Stabilité (std) | 0.186 | **0.101** (meilleur) |
| CV | 0.479 (PLAT) | **1.091** (OPTIMAL ≈ 1.07) |
| f26b | 0.000 | 0.067 |
| Mean | 3.9w (télégraphe) | 14.4w (viable) |
| Variation types | Impossible | Possible |
| Viable roman 300K | ❌ | ✅ |
| Reproductible entre sessions | ✅ | ✅ |

**Les 3 IAs convergent :**

- **Gemini** : "FDP est le seul assemblage qui produit nativement un CV parfait
  de 1.09 sans disloquer la syntaxe."
- **ChatGPT** : "Le trio 1 FLEUVE + 1 LAME + 1 ARCHITECTE est une très bonne
  règle de départ."
- **Claude** : "FDP (3.990, CV 1.091, std 0.101) est le meilleur compromis :
  GB, CV, stabilité, reproductibilité."

## 3.2 — Le rôle de chaque composant dans FDP

```
FLAUBERT = L'ARCHITECTE
  → Périodes classiques, subordonnées en cascade
  → Ancrage dans le concret, structure narrative
  → Empêche Proust de dériver dans l'abstraction
  → ROM : mean ~38w solo, f26b ~0.52

DURAS = LA LAME
  → Phrases de 3-5 mots qui brisent le rythme
  → Force le CV à monter (émergence rythmique)
  → Empêche les séquences monotones de phrases longues
  → ROM : mean ~4w solo, knife ~100%

PROUST = LE FLEUVE
  → Profondeur introspective, sensation, mémoire
  → Étire les phrases quand la scène le demande
  → Apporte le f26b et la subordination
  → ROM : mean ~130w solo, f26b 1.0
```

Le trio produit un profil DIFFÉRENT de la moyenne des 3 :
- mean 14.4 (pas (38+4+130)/3 = 57)
- CV 1.091 (pas (0.81+0.48+0.23)/3 = 0.51)
- Le résultat est ÉMERGENT, pas une moyenne

## 3.3 — Pourquoi FDP tient en continuité de style

Pour continuer une histoire en respectant un style :

| Exigence | FDP | Duras solo |
|----------|-----|-----------|
| Style reproductible entre sessions | ✅ std 0.101 | ✅ std 0.186 |
| Signature reconnaissable | ✅ CV ~1.0, alternance long/court | ⚠️ Monotone court |
| Permet tous les types de scène | ✅ (confrontation, deuil, action, description) | ❌ Un seul mode |
| Chunking K2 compatible | ✅ (injection Duras aux chunks 3-4) | Non nécessaire |
| Drift gérable | ✅ (K2 testé à drift -4.5) | Pas de drift (tout est court) |

Le FDP avec chunking K2 peut écrire N'IMPORTE quelle scène (dialogue, introspection,
action, description) tout en MAINTENANT un rythme reconnaissable (CV ~1.0).
Duras ne peut écrire qu'un seul type de prose.

---

# 4. L'ARCHITECTURE FINALE RECOMMANDÉE

## 4.1 — Le moteur de production

```
╔═══════════════════════════════════════════════════════════════╗
║  OMEGA — ARCHITECTURE DE PRODUCTION LITTÉRAIRE                ║
║                                                               ║
║  PROMPT = Trio FDP (Flaubert + Duras + Proust)                ║
║  → ZÉRO consigne métrique dans le prompt                      ║
║  → Uniquement du roleplay pur                                 ║
║                                                               ║
║  CHUNKING = K2 (4 blocs de ~750w)                             ║
║  → Blocs 1-2 : Trio FDP pur                                   ║
║  → Blocs 3-4 : Trio FDP + injection rappel Duras              ║
║  → Anti-drift confirmé (drift -4.5)                           ║
║                                                               ║
║  CV CIBLE = ~1.07 (Nombre d'Or confirmé par H4)               ║
║  → Piloté par le chunking, pas par consigne                   ║
║  → Zone utile : [0.80, 1.30]                                  ║
║                                                               ║
║  STABILITÉ = std 0.101 (la meilleure de tous les trios)       ║
║  → Reproductible entre sessions pour continuité de style      ║
║                                                               ║
║  PRODUCTION CIBLE :                                           ║
║  → GB ≥ 3.90 (zone maîtres humains)                          ║
║  → CV ∈ [0.80, 1.30]                                          ║
║  → f26b > 0 (phrases complexes présentes)                     ║
║  → Drift ∈ [-10, +10]                                         ║
╚═══════════════════════════════════════════════════════════════╝
```

## 4.2 — La continuité de style entre chapitres

Pour qu'OMEGA puisse CONTINUER une histoire en respectant le style :

1. **Fingerprint de style** : Mesurer le GB, CV, mean, f26b de chaque chapitre produit.
   Le prochain chapitre doit rester dans la BANDE du précédent (±0.15 GB, ±0.2 CV).

2. **Injection du contexte** : Les 200 derniers mots du chapitre précédent sont
   injectés dans le prompt du chapitre suivant (déjà fait par le chunking K2).

3. **Persona FIXE** : Le trio FDP ne change pas entre les chapitres. La ROM est stable
   (cv déclaratif = 0.000). Le LLM reproduira le même profil à chaque session.

4. **SceneBrief adaptatif** : Seul le brief de scène change entre les chapitres.
   Le persona reste identique → le style reste identique.

## 4.3 — Le rôle de Duras dans les deux modes

| Mode OMEGA | Rôle de Duras |
|------------|---------------|
| **CRÉATION** (nouveau chapitre) | Membre du trio FDP — crée le contraste CV |
| **CONTINUATION** (suite d'un chapitre) | Injection K2 aux chunks 3-4 — maintient le rythme |
| **CORRECTION** (polisher post-génération) | Agent séparé — coupe les phrases trop longues |

Duras n'est pas le moteur. Duras est le RÉGULATEUR.

---

# 5. CE QUI RESTE OUVERT (après cette session)

## Priorité 1 — Test 3000w FDP+K2 avec cette stabilité

Le FDP à 3.990 ± 0.101 sur 500w doit être validé en 3000w.
On sait que K2 fonctionne (drift -4.5 confirmé en Phase 4a).
Mais il faut vérifier que la STABILITÉ tient à grande échelle.

## Priorité 2 — Audit du GB V1

Les résultats posent la question : le GB V1 a-t-il un biais minimaliste ?
Si Duras à 3.9 mots/phrase score 4.243, le juge récompense-t-il la densité
plus que la structure ? Un audit des features GB (ix_variance_x_longrate,
f26b, knife_rate) pourrait révéler ce biais.

## Priorité 3 — proust_flaubert comme backup

proust_flaubert est la PAIRE la plus stable (std 0.049 — deux fois plus stable
que FDP). Son GB médian est 3.964, son CV est 0.903 (dans la zone utile).
Si le FDP montre des faiblesses en 3000w, cette paire est le backup immédiat.

## Priorité 4 — Rosetta + Persona

Jamais testé. Si Rosetta améliore le FDP sans casser sa ROM, c'est un gain gratuit.

## Priorité 5 — Polisher post-génération (2 passes)

Passe 1 = FDP crée. Passe 2 = agent qui ajuste le CV vers 1.07.
Si le CV du FDP dérive au-delà de 1.3 sur un chapitre, le polisher le ramène.

---

# 6. LES 15 LOIS MISES À JOUR

| # | Loi | Statut Phase 5b |
|---|-----|-----------------|
| L1 | f26b = verrou de formulation, pas d'incapacité | CONFIRMÉ |
| L2 | Le NOM d'auteur active des poids > anonyme | CONFIRMÉ |
| L3 | Les consignes éditeur dégradent le GB | CONFIRMÉ |
| L4 | Le LLM ne se connaît pas | CONFIRMÉ (R-CONVERSION) |
| L5 | Les personas sont des ROM stables | CONFIRMÉ (cv déclaratif = 0.000) |
| L6 | Décalage déclaré→produit = cognitif | CONFIRMÉ (EN slope > FR) |
| L7 | Le CV est impredictible par le LLM | CONFIRMÉ (r ≈ 0 FR et EN) |
| L8 | ~~Trio > solo~~ | **RÉFUTÉ** (solos 3.918 > trios 3.812) |
| L9 | Le profil équilibré est optimal | NUANCÉ (Duras bat tout en GB pur) |
| L10 | Le knife% est un levier caché | CONFIRMÉ |
| L11 | L'injection > le remplacement | CONFIRMÉ |
| L12 | Le chunking K2 résout le drift | CONFIRMÉ |
| L13 | La langue d'origine n'est pas un frein | CONFIRMÉ |
| L14 | Les auteurs instables sont dangereux | CONFIRMÉ (DDP 4.152 → 3.655) |
| L15 | La table R-CONVERSION est descriptive | CONFIRMÉ |

## Nouvelles lois Phase 5b

| # | Nouvelle loi | Preuve |
|---|-------------|--------|
| L16 | **Le CV est ÉMERGENT dans les combos** | H3 PASS 90% |
| L17 | **Le CV optimal ≈ 1.07** | H4 fenêtre glissante |
| L18 | **1 run est INSUFFISANT pour conclure** | DDP 4.152 → 3.655 |
| L19 | **Le GB V1 a un biais de densité/minimalisme** | Duras 4.243 > tout |
| L20 | **FDP = meilleur compromis PRODUCTION** | GB 3.990, CV 1.091, std 0.101 |

---

# 7. PHRASE DE CLÔTURE

> **Le meilleur score n'est pas le meilleur moteur.**
> **Le meilleur moteur est celui qui tient 300K mots en gardant son style.**
>
> FDP (Flaubert+Duras+Proust) avec chunking K2 est ce moteur.
> GB 3.990. CV 1.091. Std 0.101. Zéro consigne métrique.
> Le rythme littéraire se pilote par l'incarnation, pas par l'équation.

---

*Document de décision — OMEGA Phase 5b*
*75 runs, 5 hypothèses testées, 20 lois*
*"Ce qui n'est pas répliqué n'est pas prouvé."*
*2026-03-24*
