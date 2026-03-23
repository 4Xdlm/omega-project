# ═══════════════════════════════════════════════════════════════════════════════
# SESSION_SAVE ERRATA — 2026-03-23
# R-AUDIT-DEEP — LE BIAIS DE LONGUEUR
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date          : 2026-03-23
# Branche       : phase-r-metrology-rebuild
# HEAD entrant  : 3c28fd9d (tag r-verify-final-complete)
# HEAD sortant  : e8ffd44b (tag r-audit-deep-complete)
# Tests         : 1911 PASS, 0 régressions
# Standard      : NASA-Grade L4 / DO-178C Level A
# Auteur        : Claude (Opus 4.6, IA Principal)
# Validé par    : Francky (Architecte Suprême)
# Consultants   : ChatGPT (Auditeur), Gemini (Guardian)
#
# ═══════════════════════════════════════════════════════════════════════════════
# NATURE DU DOCUMENT : ERRATA MAJEUR
#
# Ce document CORRIGE des conclusions du SESSION_SAVE précédent
# (SESSION_SAVE_2026-03-23_R_VERIFY_FINAL.md).
# L'audit hostile R-AUDIT-DEEP a révélé un biais systémique de longueur
# qui contaminait la majorité des mesures précédemment classées TRUSTED.
# Le système a fonctionné : l'erreur a été détectée par nos propres contrôles.
# ═══════════════════════════════════════════════════════════════════════════════

---

# 1. RÉSUMÉ EXÉCUTIF

L'audit R-AUDIT-DEEP, lancé après que les 3 IAs aient identifié
278 paires de mesures avec une similarité > 0.95, a révélé que la
quasi-totalité des corrélations avec le GB V1 étaient partiellement
confondues avec la longueur moyenne des phrases.

Les maîtres littéraires écrivent des phrases plus longues. Les phrases
longues contiennent mécaniquement plus de marqueurs (malaise, ironie,
silence, etc.). Après contrôle de cette variable confondante, seules
2 mesures survivent avec leur pouvoir intact. 2 autres, précédemment
jugées nulles, remontent comme signaux masqués.

Le PCA précédemment annoncé à 0.82 (niveau roman) descend à 0.317
au niveau fenêtre. Il y a 5 dimensions réelles, pas 1.

Ce n'est pas une honte. C'est la preuve que l'audit hostile fonctionne.

---

# 2. ÉTAT FINAL

| Attribut | Valeur |
|----------|--------|
| HEAD | `e8ffd44b` |
| Tag | `r-audit-deep-complete` |
| Branche | `phase-r-metrology-rebuild` |
| Tests | 1911 PASS, 0 régressions |
| Mesures SURVIVES_ALL_CONTROLS | **2** (Rythme CV, Contradiction) |
| Mesures MASKED_BY_LENGTH | **2** (Violence, Propulsion) |
| Mesures LENGTH_CONFOUNDED | **7** (ex-TRUSTED) |
| PCA PC1 (niveau fenêtre) | **31.7%** (corrigé de 82%) |
| Dimensions réelles | **5** (pas 1) |

---

# 3. L'ERRATA — CE QUI CHANGE

## 3.1 — Le biais identifié

Toutes les mesures M1-M4 et la plupart des sensations M9 divisent un
comptage de marqueurs par le nombre de phrases. Quand les fenêtres
contiennent des phrases plus longues (plus de mots), TOUTES ces mesures
montent mécaniquement — plus de mots = plus de chances de trouver
n'importe quel marqueur.

Les maîtres littéraires (S-tier) écrivent des phrases structurellement
plus longues et plus complexes que les auteurs commerciaux. Cette
différence de longueur explique une grande partie des corrélations
précédemment observées.

## 3.2 — Les corrélations AVANT et APRÈS contrôle de longueur

| Mesure | Corr GB brute | Corr avec longueur | Corr GB APRÈS contrôle | Drop | Nouveau statut |
|--------|-------------|-------------------|----------------------|------|---------------|
| **M6.5 Rythme CV** | **+0.229** | +0.14 | **+0.225** | **0%** | **SURVIVES_ALL_CONTROLS** |
| **M4.3 Contradiction** | **+0.226** | +0.49 | **+0.198** | **12%** | **SURVIVES_ALL_CONTROLS** |
| M9 Violence | +0.047 | -0.82 | **+0.171** | **×3.6** | **MASKED_BY_LENGTH** |
| M9 Propulsion | +0.045 | -0.82 | **+0.160** | **×3.6** | **MASKED_BY_LENGTH** |
| M2.1 Suggestion | +0.272 | +0.32 | +0.123 | 55% | PARTIAL_SIGNAL |
| M3.1 Irréversibilité | +0.290 | +0.44 | +0.118 | 59% | PARTIAL_SIGNAL |
| M2.2 Négation | +0.370 | +0.43 | +0.112 | 70% | PARTIAL_SIGNAL |
| M9 Ironie | +0.423 | +0.47 | +0.083 | 80% | LENGTH_CONFOUNDED |
| M3.4 Compression | +0.440 | +0.49 | +0.085 | 81% | LENGTH_CONFOUNDED |
| M9 Mélancolie | +0.373 | +0.45 | +0.079 | 79% | LENGTH_CONFOUNDED |
| M9 Malaise | +0.450 | +0.47 | +0.053 | 88% | LENGTH_CONFOUNDED |
| M2.7 Silence | +0.384 | +0.40 | +0.045 | 88% | LENGTH_CONFOUNDED |
| M1.1 SDT | +0.345 | +0.34 | +0.046 | 87% | LENGTH_CONFOUNDED |
| M9 Vertige | +0.454 | +0.47 | -0.028 | 106% | LENGTH_CONFOUNDED |

## 3.3 — Corrélations PARTIELLES (contrôle des 10 autres TRUSTED)

| Mesure | Corr brute | Corr partielle | Drop | Verdict |
|--------|-----------|----------------|------|---------|
| **M6.5 Rythme CV** | +0.229 | **+0.231** | **0%** | **INDÉPENDANT** |
| **M4.3 Contradiction** | +0.226 | **+0.191** | 15% | **QUASI-INDÉPENDANT** |
| M3.1 Irréversibilité | +0.290 | +0.044 | 85% | Redondant |
| M2.2 Négation | +0.370 | +0.036 | 90% | Redondant |
| M9 Malaise | +0.450 | -0.007 | 101% | **Zéro pouvoir propre** |
| M9 Ironie | +0.423 | +0.014 | 97% | Zéro pouvoir propre |
| M9 Vertige | +0.454 | -0.026 | 106% | Zéro pouvoir propre |

## 3.4 — PCA corrigé (niveau fenêtre, 382K points)

| PC | Variance | Cumulée | Ancien PCA (roman) |
|----|---------|---------|-------------------|
| PC1 | **31.7%** | 31.7% | 82% ← artefact d'agrégation |
| PC2 | 18.3% | 50.0% | — |
| PC3 | 17.4% | 67.4% | — |
| PC4 | 16.7% | 84.1% | — |
| PC5 | 15.9% | 100% | — |

**5 dimensions réelles.** Pas 1 force unique sous 38 noms.

---

# 4. NOUVELLE TAXONOMIE DES MESURES

## 4.1 — Statuts de confiance (révisés)

| Statut | Définition | N | Mesures |
|--------|-----------|---|---------|
| **SURVIVES_ALL_CONTROLS** | Résiste au contrôle de longueur ET aux corrélations partielles | **2** | Rythme CV, Contradiction |
| **MASKED_BY_LENGTH** | Signal réel masqué par corrélation négative avec la longueur | **2** | Violence, Propulsion |
| **PARTIAL_SIGNAL** | Résidu faible (+0.10 à +0.13) après contrôle, à confirmer | **3** | Suggestion, Irréversibilité, Négation |
| **LENGTH_CONFOUNDED** | Signal réel dans le texte mais indissociable de la longueur | **7** | Malaise, Vertige, Ironie, Compression, Silence, Mélancolie, SDT |
| **EPOCH_CONTAMINATED** | Artefact d'époque | **2** | Clichés, Adverbes évaluatifs |
| **MEASURABLE_BUT_DOMAIN_INACTIVE** | Calculable mais non active pour la prose littéraire — en réserve pour scénario, film, jeu, autre langue | **Toutes les LEGACY** | Tension, Mystère, Arousal, Valence, etc. |

## 4.2 — Rôles fonctionnels (révisés)

| Rôle | Définition | Mesures principales |
|------|-----------|-------------------|
| **ACTIVE_LITERARY** | Utilisable pour la création de prose | Rythme CV, Contradiction |
| **SUPPORT_LITERARY** | Diagnostic utile, pas pilotage direct | Violence corrigée, Propulsion corrigée |
| **DOMAIN_CANDIDATE** | Prometteuse pour scénario/film/théâtre | Propulsion, Violence, Arousal, Tension |
| **LENGTH_VEHICLE** | Le signal existe mais PASSE par la longueur | Malaise, Ironie, Silence, etc. |

## 4.3 — Note cruciale sur LENGTH_CONFOUNDED

Le statut LENGTH_CONFOUNDED ne signifie PAS "faux" ou "illusion".

La longueur n'est pas qu'un artefact — c'est possiblement le VÉHICULE
par lequel le malaise et l'ironie opèrent. Une phrase longue permet
plus de subordination, plus de contradiction interne, plus de nuance.
La longueur est peut-être la condition physique de la complexité.

Le modèle causal est possiblement :

```
Maîtrise → Phrases longues complexes → Malaise/Ironie possible
                                     → Rythme CV ÉLEVÉ (variation)
                                     → Contradiction (dialectique)
```

Le malaise et l'ironie ne sont pas faux. Ils sont MÉDIATISÉS par la
longueur. Le protocole actuel ne peut pas les séparer. Un futur
protocole avec normalisation par mot (pas par phrase) pourrait y arriver.

---

# 5. LES 2 SURVIVANTS — OBSERVATIONS ROBUSTES

## 5.1 — M6.5 Rythme CV (Variation Rythmique)

| Attribut | Valeur |
|----------|--------|
| Formule | std(longueurs_phrases) / mean(longueurs_phrases) |
| Corr GB brute | +0.229 |
| Corr avec longueur | +0.14 (faible) |
| Corr après contrôle longueur | **+0.225 (zéro drop)** |
| Corr partielle (10 autres) | **+0.231 (zéro drop)** |
| S-tier mean | 0.686 |
| D-tier mean | 0.632 |
| Statut | **SURVIVES_ALL_CONTROLS** |

**Interprétation** : Le maître VARIE son rythme. Il alterne phrases longues
contemplatives et phrases courtes percutantes. Le LLM fait du rythme
plat ou mécanique. C'est le signal le plus robuste de tout le projet.

## 5.2 — M4.3 Contradiction (Densité d'adversatifs)

| Attribut | Valeur |
|----------|--------|
| Formule | count("mais","cependant","pourtant","néanmoins") / phrases |
| Corr GB brute | +0.226 |
| Corr avec longueur | +0.49 (forte — les phrases longues contredisent plus) |
| Corr après contrôle longueur | **+0.198 (drop 12%)** |
| Corr partielle (10 autres) | **+0.191 (drop 15%)** |
| S-tier mean | 0.151 |
| D-tier mean | 0.057 |
| Statut | **SURVIVES_ALL_CONTROLS** |

**Interprétation** : Le maître pense dialectiquement. Il affirme puis
contredit. Il nuance, complique, retourne. Le LLM aligne, résout, confirme.
La contradiction est la signature de la pensée complexe.

---

# 6. LES 2 SIGNAUX MASQUÉS — VIOLENCE ET PROPULSION

| Mesure | Corr brute | Corr longueur | Corr APRÈS contrôle | Ce qui s'est passé |
|--------|-----------|--------------|--------------------|--------------------|
| Violence | +0.047 | **-0.82** | **+0.171** | Le signal était MASQUÉ par la corrélation négative avec la longueur |
| Propulsion | +0.045 | **-0.82** | **+0.160** | Idem |

**Interprétation** : La violence et la propulsion apparaissent dans les
phrases COURTES. Comme les maîtres écrivent en moyenne des phrases plus
longues, ces signaux étaient ÉCRASÉS en brut. Une fois le biais retiré,
ils triplent. Le maître utilise des phrases courtes chirurgicales pour
frapper sec au milieu de la prose contemplative.

C'est COHÉRENT avec la Loi 1 (variation rythmique) : le maître alterne
longues (contemplation) et courtes (impact).

---

# 7. LE PCA — CORRECTION D'AGRÉGATION

## Ancien résultat (SESSION_SAVE précédent)

> "PC1 capture rho = 0.82 de la corrélation avec le GB V1"

## Nouveau résultat (R-AUDIT-DEEP, niveau fenêtre)

> PC1 capture 31.7% de la variance. 5 composantes sont nécessaires pour 100%.

**Explication** : L'ancien PCA était probablement calculé sur des moyennes
par roman (571 points), où l'effet auteur/époque/longueur écrase tout
et crée une corrélation artificielle entre toutes les mesures.
Au niveau fenêtre (382K points), les mesures sont BEAUCOUP moins corrélées.

**Loadings PC1** (au niveau fenêtre) :
- Irréversibilité : 0.528
- Contradiction : 0.480
- Négation créatrice : 0.408
- Compression causale : 0.388
- Mélancolie : 0.250
- Ironie : 0.243
- Rythme CV : 0.102
- Malaise : 0.127

PC1 au niveau fenêtre capture surtout l'irréversibilité et la contradiction,
PAS le malaise ni le vertige.

---

# 8. LE RATIO DENSITÉ/INTENSITÉ

Le ratio proposé par ChatGPT :
```
densité = (malaise + ironie + compression + silence) / 4
intensité = (tension + propulsion + violence + arousal) / 4
ratio = densité / intensité
```

Corrélation avec GB : **+0.291** — signal MODÉRÉ mais réel.

Interprétation : "La littérature forte densifie ; la littérature moyenne
intensifie" — c'est une formule composite qui tient partiellement,
même après les corrections. Mais elle utilise des mesures LENGTH_CONFOUNDED,
donc son pouvoir propre réel est incertain.

---

# 9. CE QUI ÉTAIT VRAI ET RESTE VRAI

| Conclusion | Preuve | Statut |
|-----------|--------|--------|
| Le classifieur probabiliste R-COMP V1 fonctionne | 7/7 stress tests | ✅ INTACT |
| La parité Python/TS est parfaite | 0.0000, Spearman 1.0 | ✅ INTACT |
| La chimie positive est robuste (bootstrap) | 4/4 CI ne contient pas 0, 65% maîtres | ✅ INTACT |
| M8.6 clichés est un artefact d'époque | EPOCH_REQUALIFICATION | ✅ INTACT |
| Le GB V1 est aveugle à l'ordre | Permutation delta ≈ 0 | ✅ INTACT |
| 0 mesure est INVALID | Toutes ont un rôle fonctionnel | ✅ INTACT (reclassées) |
| L'ancien résultat "synergies négatives" est un artefact | Classifieur cassé | ✅ INTACT |

---

# 10. CE QUI TOMBE OU EST RECLASSÉ

| Ancienne conclusion | Ancien statut | Nouveau statut | Raison |
|-------------------|-------------|---------------|--------|
| "7 mesures TRUSTED propres" | TRUSTED | **2 SURVIVES + 2 MASKED + 3 PARTIAL** | Biais longueur |
| "La grande prose DÉRANGE" | Observation | **LENGTH_CONFOUNDED** | Malaise = proxy longueur |
| "PCA PC1 = 0.82" | Fort signal | **31.7% (niveau fenêtre)** | Artefact d'agrégation |
| "Malaise TOP 1" | TRUSTED | **LENGTH_CONFOUNDED** | Corr partielle ≈ 0 |
| "Ironie TOP 3" | TRUSTED | **LENGTH_CONFOUNDED** | Corr partielle ≈ 0 |
| "Compression TOP 4" | TRUSTED | **LENGTH_CONFOUNDED** | Corr partielle ≈ 0 |
| "Silence TOP 5" | TRUSTED | **LENGTH_CONFOUNDED** | Corr partielle ≈ 0 |
| "Violence ne prédit rien" | LEGACY | **MASKED_BY_LENGTH +0.171** | Signal masqué |
| "Propulsion ne prédit rien" | LEGACY | **MASKED_BY_LENGTH +0.160** | Signal masqué |

---

# 11. DÉCISIONS VERROUILLÉES (CETTE SESSION)

| # | Décision |
|---|----------|
| D1 | Biais de longueur = correction majeure, pas réécriture |
| D2 | LENGTH_CONFOUNDED ≠ "faux", = "indissociable de la longueur dans le protocole actuel" |
| D3 | 2 survivants : Rythme CV et Contradiction = observations robustes (pas "lois éternelles") |
| D4 | Violence et Propulsion = signaux masqués, remontés après correction |
| D5 | PCA corrigé : 5 dimensions au niveau fenêtre, pas 1 |
| D6 | Toutes les mesures dormantes = MEASURABLE_BUT_DOMAIN_INACTIVE (pas jetées) |
| D7 | Phase P GELÉE tant que FR/EN pas certifié |
| D8 | Prochaine étape : certification EN natif sur les 2 survivants |
| D9 | Chantier original vs traduction (FR→EN et EN→FR) = ouvert |

---

# 12. QUARANTAINES ACTIVES (MISES À JOUR)

| Élément | Raison | Condition de sortie |
|---------|--------|-------------------|
| Malaise comme signal indépendant | LENGTH_CONFOUNDED | Normalisation par mot + réplication |
| Ironie comme signal indépendant | LENGTH_CONFOUNDED | Idem |
| Silence comme signal indépendant | LENGTH_CONFOUNDED | Idem |
| "La grande prose dérange" comme loi | Médiatisé par longueur | Futur protocole normalisé |
| Rythme CV comme loi universelle | Seulement testé en corpus FR-dominant | Test EN natif |
| Contradiction comme loi universelle | Idem | Test EN natif |
| Image rémanente | Jamais mesuré | — |
| Phase P (pilotage Scribe) | Gelée | Après certification EN |
| Scorer V2 (intégrer l'ordre) | Le GB V1 est aveugle | R&D futur |

---

# 13. LEÇONS APPRISES (ERRATA)

| # | Leçon |
|---|-------|
| 1 | **278 paires à >0.95 = alarme critique** — quand tout corrèle avec tout, chercher la variable cachée |
| 2 | **La longueur est le confondant universel** des mesures par comptage de marqueurs |
| 3 | **Un PCA au niveau roman ≠ un PCA au niveau fenêtre** — l'agrégation crée des artefacts |
| 4 | **Les corrélations partielles sont OBLIGATOIRES** avant de conclure quoi que ce soit |
| 5 | **Un résultat séduisant ("la grande prose dérange") est le plus dangereux** — il résiste à la critique parce qu'il plaît |
| 6 | **Les mesures "nulles" peuvent cacher des signaux masqués** — violence et propulsion triplent après correction |
| 7 | **L'audit hostile FONCTIONNE** — le système a détecté sa propre erreur |
| 8 | **La longueur est peut-être un véhicule, pas juste un biais** — médiation ≠ illusion |
| 9 | **Ne pas remplacer un récit séduisant détruit par un nouveau récit séduisant** — vérifier d'abord |
| 10 | **Les 3 IAs ensemble voient plus qu'une seule** — Gemini a trouvé le dénominateur, ChatGPT le niveau d'agrégation, Claude les ratios proportionnels |

---

# 14. PROCHAINES ÉTAPES

## Priorité 0 — Certification EN natif

Tester Rythme CV et Contradiction sur un sous-corpus 100% anglophone natif
(Woolf, McCarthy, Hemingway, Dickens, Brontë, Faulkner, etc.).
Si les corrélations tiennent en anglais → candidats loi universelle.
Si elles tombent → propriétés du français littéraire.

## Priorité 1 — Audit original vs traduction

Comparer les mêmes œuvres en version originale et en traduction.
FR→EN : Hugo, Flaubert, Proust, Camus traduits en anglais.
EN→FR : Woolf, McCarthy, Dickens, Hemingway traduits en français.
Mesurer si la traduction conserve le rythme et la contradiction.

## Priorité 2 — Phase P (APRÈS certification)

Seulement si les 2 survivants tiennent en anglais ET résistent à la
comparaison traduction, on peut envisager de les injecter dans le
master-prompt.ts pour forcer le Scribe à varier son rythme et
contredire dans la même fenêtre.

---

# 15. MESSAGE DE REDÉMARRAGE

```
# 🚀 OMEGA SESSION — POST R-AUDIT-DEEP (ERRATA)

Version: post-r-audit-deep
HEAD: e8ffd44b (tag r-audit-deep-complete)
Branche: phase-r-metrology-rebuild
Tests: 1911 PASS

ERRATA MAJEUR : biais de longueur identifié et corrigé.
La majorité des anciennes mesures TRUSTED étaient partiellement
confondues avec la longueur des phrases.

2 SURVIVANTS CONFIRMÉS :
  1. Rythme CV (+0.225, zéro drop)
  2. Contradiction (+0.198, drop 12%)

2 SIGNAUX MASQUÉS RÉHABILITÉS :
  3. Violence (+0.171, masquée par corr négative longueur)
  4. Propulsion (+0.160, idem)

7 EX-TRUSTED → LENGTH_CONFOUNDED :
  Malaise, Vertige, Ironie, Compression, Silence, Mélancolie, SDT
  (Signal réel mais indissociable de la longueur)

PCA CORRIGÉ : 31.7% (pas 82%), 5 dimensions réelles
Phase P : GELÉE — certification EN natif d'abord

PROCHAINES ÉTAPES :
  A. Certification EN natif (Rythme CV + Contradiction en anglais)
  B. Audit original vs traduction (FR→EN et EN→FR)
  C. Phase P (après A et B seulement)

Architecte Suprême: Francky
IA Principal: Claude
```

---

# 16. PHRASE DE CLÔTURE

> **R-AUDIT-DEEP corrige une erreur majeure de la Phase R :
> le biais de longueur contaminait les mesures TRUSTED.
> Après correction, deux observations robustes survivent
> (variation rythmique et contradiction dialectique), deux signaux
> masqués remontent (violence et propulsion), et le récit précédent
> est reclassé comme partiellement médiatisé par la longueur.
> Le système a détecté sa propre erreur. C'est une victoire
> de la méthode, pas une défaite du projet.**

---

*SESSION_SAVE ERRATA — R-AUDIT-DEEP*
*2026-03-23*
*"Un résultat séduisant est le plus dangereux — il résiste à la critique parce qu'il plaît."*
*"La longueur est peut-être un véhicule, pas juste un biais."*
*"L'audit hostile fonctionne : le système a détecté sa propre erreur."*
