# OMEGA — GENERATION AUDIT REPORT
## U-ROSETTE-14 — Audit Génération Amont

**Date** : 2026-03-10  
**Commit** : 87294b2e  
**ValidationPack** : `ValidationPack_phase-u_real_2026-03-10_87294b2e`  
**Standard** : NASA-Grade L4 / DO-178C  
**Autorité** : Francky (Architecte Suprême)  
**Auditeurs** : Claude (principal) + ChatGPT + Gemini (convergence 3 IAs)

---

## 1. RÉSUMÉ EXÉCUTIF

### État du système à l'entrée de cet audit

Le système avait atteint une stabilité fonctionnelle sur U-ROSETTE-12/13 :
- Polish Engine opérationnel (ACCEPTED[GAIN] sur 2/3 TK runs)
- Génération one-shot montant à composite=92.0
- Logique Two-Stage Funnel confirmée

### Diagnostic principal

> **Le générateur produit des candidats proches du SEAL, mais deux blocages structurels empêchent la convergence finale.**

1. **RCI bloquant** : `rhythm` (63–80) et `voice_conformity` (72–76) restent sous les floors, non pas à cause de SII, mais à cause d'une absence de hiérarchisation des contraintes rythmiques dans le prompt.
2. **Top-K sélectionne des champions avec SII dégradée** : metaphor_novelty=69–70 en champion TK vs 76–83 en one-shot. Le GreatnessJudge favorise ECC/composite au détriment de SII.

### Ce qui est infirmé

- **H1 partiellement infirmée** : SII n'est plus le problème principal en génération brute. Les one-shot affichent SII=88.2–88.3. Le frein one-shot est RCI (rhythm + voice_conformity), pas SII.

### Ce qui est confirmé

- **H3 confirmée** : bimodalité metaphor_novelty — champion TK à 69–70 vs one-shot 76–83
- **H4 confirmée** : `participial=0` sur 6 runs — moule structurel rigide (catégorie "other" = 40–68%)
- **H5 confirmée** : OS1 est le seul run à avoir ECC≥92 ET SII≥88 simultanément (composite=92.0)

---

## 2. HYPOTHÈSES TESTÉES

| Hypothèse | Description | Verdict |
|-----------|-------------|---------|
| H1 | Surcharge cognitive SII concurrente avec ECC/RCI | ❌ Partiellement infirmée — SII tenu en one-shot |
| H2 | Absence hiérarchie contraintes | ✅ Confirmée — rhythm/voice_conformity non prioritaires |
| H3 | Bimodalité metaphor_novelty (top-K dégrade SII) | ✅ Confirmée — 69–70 TK vs 76–83 OS |
| H4 | Répétition de moules structurels | ✅ Confirmée — participial=0 sur 6 runs |
| H5 | Frontière Pareto ECC vs SII | ✅ Confirmée — OS1 seul run à franchir les deux |

---

## 3. TABLES DE RÉSULTATS

### One-shot

| Run | composite | ECC | RCI | SII | Bloquant |
|-----|-----------|-----|-----|-----|---------|
| OS0 | 91.2 | 91.8 | 84.2 ❌ | 88.2 ✅ | RCI<85 (rhythm=80.2, voice_conformity=76.3) |
| OS1 | **92.0** | **94.0** | **85.3** ✅ | **88.3** ✅ | composite=92.0<93 — 1.0 pt manquant |
| OS2 | 89.2 | 86.9 ❌ | 80.6 ❌ | 88.3 ✅ | ECC<88 + RCI<85 (rhythm=63.5) |

### Top-K + Polish

| Run | composite (avant polish) | SII avant | composite (après) | SII après | Polish | Bloquant |
|-----|--------------------------|-----------|-------------------|-----------|--------|---------|
| TK0 | 92.3 | 83.0 | **92.5** | 84.3 | ACCEPTED[GAIN] ✅ | composite<93 |
| TK1 | 91.2 | 81.7 | **91.6** | 84.1 | ACCEPTED[GAIN] ✅ | composite<93 |
| TK2 | 88.6 | — | 88.6 | — | NO_OP (trop dégradé) | composite<89 |

### Fingerprints structurels (synthèse)

| Run | sentence_count | avg_len | other% | participial | image_density | repetition |
|-----|---------------|---------|--------|-------------|---------------|------------|
| OS0 | 44 | 13.4 | 47% | **0** | 0.068 | 0.006 |
| OS1 | 24 | 16.5 | 62% | **0** | 0.083 | 0.035 |
| OS2 | 37 | 16.6 | 40% | **0** | 0.162 | 0.014 |
| TK0 | 44 | 13.8 | **68%** | **0** | 0.136 | 0 |
| TK1 | 41 | 22.3 | 58% | **0** | 0.146 | 0.019 |
| TK2 | 23 | 13.7 | 56% | **0** | 0.087 | 0 |

**Signal fort** : `participial=0` sur la totalité des 6 runs. Moule structurel unique.

---

## 4. CAUSES RACINES

### CR-1 : Absence de hiérarchie de contraintes rhythm/voice_conformity

Le prompt actuel traite `rhythm` et `voice_conformity` comme des contraintes parmi d'autres. Ces deux sous-axes RCI sont sensibles au niveau d'articulation syntaxique entre phrases — une zone non couverte par les règles actuelles.

**Mesure** : rhythm=63.5–80.2 | voice_conformity=72.5–76.3 — les floors (85) ne sont pas atteints.

### CR-2 : GreatnessJudge non sensible à SII — biais de sélection Top-K

Le GreatnessJudge évalue 4 axes (memorabilité, tension, voix, subjectivité) mais ne pénalise pas les variants avec SII dégradée. Résultat : le Top-K couronne systématiquement des variants avec metaphor_novelty=69–70, que le Polish Engine ne peut corriger que de +1.3 à +2.4 pts (insuffisant pour atteindre SII=85 depuis 69).

**Mesure** : metaphor_novelty TK champion = 69–70 | seuil sauvable par Polish = ≥80.

### CR-3 : Moule structurel rigide — zéro diversité d'attaque participiale

Le générateur ne produit jamais d'ouverture participiale ("Penché sur...", "Traversant...", etc.). La catégorie "other" représente 40–68% des attaques. Cette rigidité impacte `opening_variety` (sous-axe RCI) et contribue au plafonnement de voice_conformity.

---

## 5. DÉCISIONS U-ROSETTE-15

### D1 — Impératif Rythmique Absolu (NIVEAU 0)

**Objectif** : Élever rhythm ≥ 82 et voice_conformity ≥ 80 en one-shot.  
**Action** : Ajouter section `[IMPÉRATIF RYTHMIQUE ABSOLU]` dans `prompt-assembler-v2.ts` — rhythm + voice_conformity déclarés contraintes de NIVEAU 0 (inviolables), avant toutes autres règles RCI.  
**Justification** : H2 confirmée — les contraintes sans hiérarchie explicite sont de facto co-égales.  
**Risque** : Prompt plus contraignant → possible dégradation ECC sur certains variants (à surveiller).

### D2 — GreatnessJudge SII Floor Penalty

**Objectif** : Empêcher Top-K de couronner des variants avec SII<82 (in-sauvables par Polish).  
**Action** : Dans `top-k-selection.ts`, introduire `SII_FLOOR_PENALTY_THRESHOLD=82` et `SII_FLOOR_PENALTY_FACTOR=5.0`. Score effectif pour le tri = `greatness.composite - max(0, (82 - sii) × 5.0 / 10)`.  
**Justification** : H3 + H5 confirmées — le sélecteur choisit des variants "sages" sur ECC mais pauvres en SII. Un variant SII=70 ne peut pas atteindre SII=85 après Polish (+3 pts max).  
**Risque** : Si tous les variants ont SII<82, le top-1 reste le meilleur disponible (pénalité ne change pas le vainqueur relatif).

### D3 — Diversité Syntaxique Contrôlée

**Objectif** : Briser le moule structurel "other" dominant et introduire au moins 1–2 ouvertures participiales.  
**Action** : Ajouter contrainte souple dans FINAL_CHECKLIST : favoriser au moins 1–2 ouvertures participiales ou circonstancielles dans les 10 premières phrases. PAS de règle mécanique "1/5" — contrainte de diversité contrôlée.  
**Justification** : H4 confirmée — `participial=0` sur 6 runs sans exception.  
**Risque** : Contrainte trop rigide → prose obéissante. Formulation en "favoriser" pas "imposer".

### D4 (Gemini Double-Strike) — Polish 2 substitutions distinctes

**Objectif** : Amplifier le gain SII du Polish Engine de +1.5 à +3.0 pts.  
**Action** : Dans `buildPolishPromptSII` (`polish-engine.ts`) : remplacer "1 à 3 mots" par "2 remplacements distincts et indépendants dans deux phrases différentes".  
**Justification** : Les gains actuels (+1.3, +2.4) restent insuffisants pour amener SII=83→85 depuis un champion TK avec SII=70–83. 2 substitutions = gain statistiquement doublé.  
**Risque** : Si les 2 substitutions ciblent des mots proches structurellement, le drift peut augmenter. INV-PE-04 (drift check) reste actif comme filet de sécurité.

---

## 6. INTERDITS (U-ROSETTE-15)

- ❌ Full benchmark 30+30 avant validation D1/D2/D3/D4 sur micro-run
- ❌ Refonte du Polish Engine (architecture Two-Stage validée)
- ❌ Modification des seuils SEAL (93) ou CANDIDATE_FLOOR (85)
- ❌ Nouveaux axes GreatnessJudge (le biais est un biais de tri, pas d'évaluation)
- ❌ Patchs multi-axes non ciblés par les causes racines identifiées

---

## 7. PROCHAINE EXPÉRIMENTATION

**Critères de succès micro-run post-U-ROSETTE-15** :

| Indicateur | Cible | Signal |
|-----------|-------|--------|
| rhythm (one-shot) | ≥ 82 | D1 efficace |
| voice_conformity (one-shot) | ≥ 80 | D1 efficace |
| SII champion TK | ≥ 82 | D2 efficace |
| participial (fingerprint) | ≥ 1 | D3 efficace |
| Polish gain SII | ≥ 2.5 pts | D4 efficace |
| composite one-shot | ≥ 92.0 | maintien |

**Critère de victoire** : au moins 1 run SEAL ou composite≥92.8 avec tous floors verts.

---

## 8. VERDICT CONVERGENCE 3 IAs

| Décision | Claude | ChatGPT | Gemini | Verdict |
|----------|--------|---------|--------|---------|
| D1 (RCI impératif) | GO ✅ | GO ✅ | GO ✅ | **GO ABSOLU** |
| D2 (SII floor penalty) | GO ✅ | GO ✅ | GO ✅ | **GO ABSOLU** |
| D3 (diversité syntaxique) | GO souple ✅ | GO souple ✅ | GO souple ✅ | **GO souple** |
| D4 (Double-Strike polish) | GO ✅ | N/A | GO ✅ | **GO** |

---

*Rapport scellé le 2026-03-10 — commit 87294b2e*  
*Référence : ValidationPack_phase-u_real_2026-03-10_87294b2e*
