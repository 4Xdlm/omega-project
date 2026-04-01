# OMEGA IRM — Livrable 09 : LAW_REGISTRY_TOTAL
**Date** : 2026-04-02
**Methode** : READ-ONLY — extraction exhaustive depuis 6 documents source
**Sources** :
- OMEGA_PHYSIQUE_LITTERAIRE_MANUEL_v1.0.md (source primaire, 1076 lignes)
- OMEGA_PHYSIQUE_LITTERAIRE_v3.md (recherche corpus)
- OMEGA_DECISIONS_LOCK_v1.md (BB-01/02/03 scelles)
- CLAUDE_BLACKBOX_AUDIT.md (protocole audit)
- CLAUDE_BLACKBOX_LITERARY_CONSTRAINTS.md (contraintes observees)
- CLAUDE_OBSERVABLE_LAWS.md (15 lois emergentes + facteurs conversion)
**Standard** : NASA-Grade L4 / DO-178C Level A
**Total lois extraites** : 38

---

## LEGENDE TYPES

| Type | Definition |
|------|-----------|
| CAUSALE | Relation cause-effet prouvee par mediation statistique |
| DESCRIPTIVE | Observation statistique sans mecanisme causal prouve |
| SCALING | Loi d'echelle (relation feature-taille) |
| INTERACTION | Coefficient d'interaction entre features |
| REGIME | Constante valide sous protocole OMEGA specifique |
| CULTURELLE | Asymetrie FR/EN prouvee par corpus |
| MODELE | Contrainte structurelle du modele Claude Sonnet |
| CONFLIT | Loi regissant les paires de consignes contradictoires |

---

## REGISTRE DES LOIS

---

### LAW L31 — Monopole ponctuel FR
- Enonce : Le point-virgule est le marqueur #1 de qualite en prose francaise, 7 fois plus discriminant qu'en anglais.
- Equation : `A_semi = Imp_FR(semicolon) / Imp_EN(semicolon) = 0.4157 / 0.0581 = 7.15`
- Type : CULTURELLE
- Domaine : Langue=FR, Taille=toutes fenetres, Modele=N/A (corpus), Corpus=881 oeuvres / 2 064 038 fenetres
- Preuve : Random Forest 200 arbres, importance par permutation, 638 097 fenetres FR
- Niveau : SEALED
- Tracabilite : doc=MANUEL_v1.0 (I.3 eq A1, I.9, VI), donnees=Angostura RF, code=sentinel-judge/scoring, test=cross-validation RF
- Production : OUI (poids semicolon dans scorer V2)
- Collision ID : aucune

---

### LAW L33 — Interaction ponctuelle FR-only
- Enonce : La correlation semicolon x dash est significative en FR (rho=0.231) mais negligeable en EN (rho=0.056). Le signal ponctuel est un bloc correle en FR uniquement.
- Equation : `rho_FR(semi, dash) = 0.231 ; rho_EN(semi, dash) = 0.056`
- Type : CULTURELLE / INTERACTION
- Domaine : Langue=FR, Taille=toutes, Modele=N/A (corpus), Corpus=881 oeuvres
- Preuve : Correlation Spearman sur corpus complet
- Niveau : SEALED
- Tracabilite : doc=MANUEL_v1.0 (I.9), donnees=Angostura, code=ABSENT, test=ABSENT
- Production : NON (shadow — inform pilotage, pas dans scorer direct)
- Collision ID : aucune

---

### LAW L34 — Antagonisme std x f1a sur la qualite
- Enonce : La co-occurrence excessive de longueur (f1a_rhythm_variance) ET de variance rythmique (std_sent_len) est une penalite de qualite dans les deux langues. Correlation brute positive, coefficient d'interaction sur Tier negatif.
- Equation : `beta_interaction(std x f1a -> Tier) < 0 [BILINGUE]`
- Type : INTERACTION
- Domaine : Langue=FR+EN, Taille=toutes, Modele=N/A (corpus), Corpus=881 oeuvres
- Preuve : OLS regression avec terme d'interaction. Coefficient exact non publie.
- Niveau : CANDIDATE
- Tracabilite : doc=MANUEL_v1.0 (I.7 eq B2, VII Q3), donnees=Angostura OLS, code=ABSENT, test=ABSENT
- Production : NON (pas implemente — coefficient exact manquant)
- Collision ID : ATTENTION — Gemini a signale que L34 dans le manifeste melange correlation brute et coefficient d'interaction. Formulation corrigee dans MANUEL_v1.0.

---

### LAW L35 — sub_per_sentence = mega-levier (COLLISION)
- Enonce : sub_per_sentence est le mega-levier FR. Quand sub double (P25->P75), f26b augmente de +205%, mean_sent de +56%, f17_knife chute de -67%.
- Equation : `Delta_f26b = +205%, Delta_mean_sent = +56%, Delta_f17 = -67% quand sub double (FR 500w)`
- Type : CAUSALE
- Domaine : Langue=FR, Taille=500w, Modele=N/A (corpus), Corpus=881 oeuvres
- Preuve : OLS mediation + elasticite mesuree, equation C2 du MANUEL
- Niveau : SEALED
- Tracabilite : doc=MANUEL_v1.0 (I.6 eq C2), donnees=Angostura, code=ABSENT (pilotage indirect), test=ABSENT
- Production : OUI (shadow — guide le prompt engineering, pas un poids direct)
- Collision ID : **COLLISION CONFIRMEE PAR GEMINI** — L35 utilise dans un autre sens ("robustesse V6 apres retrait auteur"). Resolution : L35 = mega-levier, L35b = robustesse V6.

---

### LAW L37 — Chaine causale universelle sub -> f26b -> Tier
- Enonce : La seule loi causale bilingue universellement prouvee. La subordination syntaxique cause les phrases longues, qui causent la qualite. Mediation FR=136% (amplification), EN=95%.
- Equation : `sub_per_sentence -> f26b_long_sent_rate -> Tier_qualite ; M_FR=136%, M_EN=95%`
- Type : CAUSALE
- Domaine : Langue=FR+EN, Taille=toutes, Modele=N/A (corpus), Corpus=881 oeuvres / 2 064 038 fenetres
- Preuve : OLS mediation avec suppression, robustesse V6 (retrait auteur FR : 114-194%). 4/4 criteres doctrine M1.
- Niveau : SEALED
- Tracabilite : doc=MANUEL_v1.0 (I.6, I.9, VII), donnees=Angostura mediation, code=sentinel-judge (sub_per_sentence feature), test=cross-validation + robustesse V6
- Production : OUI (guide de pilotage : cibler sub, pas mean_sent)
- Collision ID : aucune

---

### LAW L38 — Mur semantique EN maximaliste
- Enonce : Pour la prose anglaise maximaliste (Faulkner, Wallace, DFW), le modele structurel a 42 features predit a l'envers (R²=-0.187). La structure syntaxique est condition necessaire non discriminante.
- Equation : `R²(42 features -> Tier) = -0.187 pour EN maximaliste`
- Type : DESCRIPTIVE
- Domaine : Langue=EN (maximaliste uniquement, 21% du Tier S EN), Taille=3000w+, Modele=N/A (corpus), Corpus=643 oeuvres EN
- Preuve : Random Forest + R² sur fenetre 3000w+, mesure directe
- Niveau : SEALED
- Tracabilite : doc=MANUEL_v1.0 (I.8 eq M1, VI), donnees=Angostura EN, code=ABSENT, test=R² mesure
- Production : NON (pas implemente — scorer V5 requis pour couche semantique)
- Collision ID : aucune

---

### LAW S1 — Loi lineaire parfaite du couteau narratif
- Enonce : Le nombre de phrases-couteau (<=5 mots) est une constante proportionnelle de la taille du texte. Ce n'est pas un choix stylistique, c'est une loi de scaling.
- Equation : `f17_knife_count(size) = 0.01167 x size - 0.1136 ; R² = 1.000`
- Type : SCALING
- Domaine : Langue=FR+EN, Taille=200w-full, Modele=N/A (corpus), Corpus=1.38M+ fenetres
- Preuve : Regression lineaire sur corpus entier, R²=1.000
- Niveau : SEALED
- Tracabilite : doc=MANUEL_v1.0 (I.5 eq S1, VII), donnees=Angostura scaling, code=sentinel-judge (f17_knife), test=R² mesure
- Production : OUI (shadow — reference pour detecter deviation LLM)
- Collision ID : aucune

---

### LAW S2 — Loi logarithmique de la variance rythmique
- Enonce : La variabilite rythmique (cv_sent) croit lentement avec la taille du texte selon une loi logarithmique stable.
- Equation : `cv_sent(size) = 0.0259 x ln(size) + 0.5355 ; R² = 0.999`
- Type : SCALING
- Domaine : Langue=FR+EN, Taille=200w-full, Modele=N/A (corpus), Corpus=1.38M+ fenetres
- Preuve : Regression logarithmique, R²=0.999
- Niveau : SEALED
- Tracabilite : doc=MANUEL_v1.0 (I.5 eq S2, VII), donnees=Angostura scaling, code=sentinel-judge (cv_sent), test=R² mesure
- Production : OUI (shadow — reference pour detecter deviation LLM)
- Collision ID : aucune

---

### LAW S3 — Loi logarithmique de l'entropie syntaxique
- Enonce : L'entropie syntaxique (f19a_entropy) decroit avec la taille. Plus le texte est long, plus la syntaxe se regularise. Inverse de S2 — rythme et entropie sont antagonistes a grande echelle.
- Equation : `f19a_entropy(size) = -0.0261 x ln(size) + 0.8187 ; R² = 0.999`
- Type : SCALING
- Domaine : Langue=FR+EN, Taille=200w-full, Modele=N/A (corpus), Corpus=1.38M+ fenetres
- Preuve : Regression logarithmique, R²=0.999
- Niveau : SEALED
- Tracabilite : doc=MANUEL_v1.0 (I.5 eq S3, VII), donnees=Angostura scaling, code=sentinel-judge (f19a_entropy), test=R² mesure
- Production : OUI (shadow — reference pour detecter deviation LLM, cf BB-P06)
- Collision ID : aucune

---

### LAW BB-01 (DEC-20260328-BB-01) — Semicolons irreductibles par prompt
- Enonce : Le point-virgule est NON PILOTABLE par instruction au Scribe. Taux de respect de la consigne forte : 13%. 11/15 runs = 0 semicolons. La voie PROMPT est fermee.
- Equation : `P(respect consigne semicolons) = 0.13`
- Type : MODELE
- Domaine : Langue=FR, Taille=400-700w, Modele=claude-sonnet-4-20250514, Corpus=N/A (API runs)
- Preuve : 15 runs gradient, 5 niveaux de consigne, Phase B blackbox
- Niveau : SEALED
- Tracabilite : doc=DECISIONS_LOCK_v1 (BB-01) + OBSERVABLE_LAWS (L03), donnees=BLACKBOX_CEILINGS.json, code=ABSENT (decision de purge prompt), test=15 runs API
- Production : OUI (purge de toute mention semicolon des prompts Scribe)
- Collision ID : aucune. Alias : L03 dans OBSERVABLE_LAWS.

---

### LAW BB-02 (DEC-20260328-BB-02) — Plancher mean_sent 35w irreductible
- Enonce : Claude Sonnet ne produit pas de prose avec une moyenne de phrase inferieure a ~35 mots en regime OMEGA (prose FR, K2, prompt riche). Le plancher est structurel. Zone de reponse : 35-42 mots.
- Equation : `mean_sent_out in [35, 42] en regime OMEGA ; target 12w -> produit 35.8w (x3.0)`
- Type : REGIME
- Domaine : Langue=FR, Taille=400-700w, Modele=claude-sonnet-4-20250514, Corpus=N/A (API runs)
- Preuve : 15 runs gradient, 5 targets (12/18/25/35/50w). Baseline 30 runs : mean=42.0, std=13.0.
- Niveau : SEALED (CONSTANTE_REGIME — valide sous protocole OMEGA uniquement)
- Tracabilite : doc=DECISIONS_LOCK_v1 (BB-02) + OBSERVABLE_LAWS (L04), donnees=BLACKBOX_CEILINGS.json, code=ABSENT (retrait cibles <35w), test=15 runs API
- Production : OUI (retrait de avg_sentence_length_target < 35 du style_genome)
- Collision ID : aucune. Alias : L04 dans OBSERVABLE_LAWS. NOTE GEMINI : pas une constante universelle Sonnet — en B3 extreme pur (cible 20w sans contexte OMEGA) : 18.2w produits.

---

### LAW BB-03 (DEC-20260328-BB-03) — Conflits ameliorants
- Enonce : Les instructions contradictoires (conflits de style) AMELIORENT le composite dans 4/5 cas testes (+1.8 a +2.2 points vs baseline).
- Equation : `Delta_composite(conflit) in [+0.4, +2.2] pour 4/5 paires ; -1.3 pour 1/5 (ampleur_vs_secheresse)`
- Type : MODELE / CONFLIT
- Domaine : Langue=FR, Taille=400-700w, Modele=claude-sonnet-4-20250514, Corpus=N/A (API runs)
- Preuve : Phase B Bloc 4 (n=15, 5 paires). Confirme par Phase I1 (8 feconds + 2 parasites).
- Niveau : SEALED
- Tracabilite : doc=DECISIONS_LOCK_v1 (BB-03) + OBSERVABLE_LAWS (L07), donnees=BLACKBOX_CONFLICTS.json, code=V-ATOMIC v5 (paire injection), test=15 runs Phase B + 30 runs Phase I1
- Production : OUI (integration dans V-ATOMIC v5 couche A)
- Collision ID : aucune. Alias : L07 dans OBSERVABLE_LAWS.

---

### LAW BB-P03 — Compliance semicolons = 13% (M_BB3)
- Enonce : La probabilite de respect de la consigne semicolons est 13%. Chaque token de consigne ";" penalise les autres axes (-0.4 a -1.4 composite).
- Equation : `P(semicolon_compliance) = 0.13 ; impact composite = -0.4 a -1.4 selon niveau`
- Type : MODELE
- Domaine : Langue=FR, Taille=400-700w, Modele=claude-sonnet-4-20250514, Corpus=N/A
- Preuve : 15 runs gradient Phase B
- Niveau : SEALED
- Tracabilite : doc=MANUEL_v1.0 (II.2 eq M_BB3, VII M2), donnees=BLACKBOX_CEILINGS.json, code=ABSENT, test=15 runs
- Production : OUI (purge prompts)
- Collision ID : Recouvre BB-01 — BB-P03 est la formulation equation du MANUEL, BB-01 est la decision LOCK.

---

### LAW BB-P04 — Plancher mean_sent CONSTANTE_REGIME (M_BB2)
- Enonce : mean_sent_out dans [35, 42] dans le regime OMEGA actuel. NOTE GEMINI : en B3 extreme pur 18.2w produits — le plancher 35w est une constante de REGIME, pas universelle.
- Equation : `mean_sent_out in [35, 42] en regime K2/prose FR/prompt riche/temp standard`
- Type : REGIME
- Domaine : Langue=FR, Taille=400-700w, Modele=claude-sonnet-4-20250514, Corpus=N/A
- Preuve : 504 runs API consolidees (Phase A+B)
- Niveau : SEALED (CONSTANTE_REGIME)
- Tracabilite : doc=MANUEL_v1.0 (II.2 eq M_BB2), donnees=Phase B gradient, code=ABSENT, test=15 runs gradient + 30 runs baseline
- Production : OUI (contrainte min dans style_genome)
- Collision ID : Recouvre BB-02 — BB-P04 est la formulation CONSTANTE_REGIME (Gemini), BB-02 est la decision LOCK.

---

### LAW BB-P06 — CV(composite) << CV(features) — Stabilite emergente (M_BB5)
- Enonce : Le composite V2 a un CV de 1-2% alors que les features individuelles ont un CV de 20-80%. Plusieurs micro-etats differents convergent vers la meme energie globale. La vallee V2 est large.
- Equation : `CV(composite_V2) = 1-2% ; CV(features_individuelles) = 20-80%`
- Type : MODELE
- Domaine : Langue=FR, Taille=400-700w, Modele=claude-sonnet-4-20250514, Corpus=N/A
- Preuve : 10 runs x 2 scenes (contemplation + menace). CV composite = 0.013 / 0.020.
- Niveau : SEALED
- Tracabilite : doc=MANUEL_v1.0 (II.2 eq M_BB5, VII M3) + OBSERVABLE_LAWS (L06), donnees=BLACKBOX_BASELINE.json, code=ABSENT, test=20 runs stabilite
- Production : OUI (shadow — justifie le pilotage par composite, pas par features)
- Collision ID : aucune. Alias : L06 dans OBSERVABLE_LAWS.

---

### LAW BB-P07 — Conflits orthogonaux +1.8 a +2.5 composite
- Enonce : Les paires de consignes contradictoires sur axes orthogonaux ameliorent le composite de +1.8 a +2.5 points. L'exploration forcee hors de l'attracteur genere de la qualite supplementaire.
- Equation : `Delta_composite(conflit orthogonal) in [+1.2, +2.5]`
- Type : CONFLIT
- Domaine : Langue=FR, Taille=400-700w, Modele=claude-sonnet-4-20250514, Corpus=N/A
- Preuve : Phase B Bloc 4 (15 runs) + Phase I1 (30 runs). 8/8 feconds = orthogonaux. 2/2 parasites = coaxiaux.
- Niveau : SEALED
- Tracabilite : doc=MANUEL_v1.0 (II.4, VI) + OBSERVABLE_LAWS (L07), donnees=BLACKBOX_CONFLICTS.json, code=V-ATOMIC v5, test=45 runs total
- Production : OUI (injection paire dans V-ATOMIC v5)
- Collision ID : Recouvre BB-03 sous l'angle equation.

---

### LAW BB-C01 — Subordination plafond ~0.099 (M_BB4)
- Enonce : sub_per_sentence ne depasse pas ~0.099 en regime OMEGA. Saturation observable : les niveaux "forte" et "saturee" convergent.
- Equation : `sub_out <= 0.10 en regime OMEGA ; forte=0.096-0.102, saturee=0.119-0.146`
- Type : REGIME
- Domaine : Langue=FR, Taille=400-700w, Modele=claude-sonnet-4-20250514, Corpus=N/A
- Preuve : Phase B Bloc 3 (4 niveaux de subordination). Saturation forte/saturee.
- Niveau : SEALED (CONSTANTE_REGIME)
- Tracabilite : doc=MANUEL_v1.0 (II.2 eq M_BB4, VII M5), donnees=BLACKBOX_CEILINGS.json, code=ABSENT, test=Phase B gradient
- Production : OUI (shadow — ne pas demander sub > 0.10)
- Collision ID : aucune

---

### LAW BB-C02 — TTR plancher ~0.685 (compensation composite)
- Enonce : Le TTR (richesse lexicale) ne descend pas en dessous de ~0.685 meme avec consigne orale maximale. Le vocabulaire reste riche malgre la consigne.
- Equation : `TTR_oralite_plancher = 0.685 (baseline 0.740)`
- Type : REGIME
- Domaine : Langue=FR, Taille=400-700w, Modele=claude-sonnet-4-20250514, Corpus=N/A
- Preuve : Phase B Bloc 4, oralite_sale : TTR=0.685. LITERARY_CONSTRAINTS contrainte #2 (confiance HAUTE, score 0.93).
- Niveau : SEALED (CONSTANTE_REGIME)
- Tracabilite : doc=MANUEL_v1.0 (VI) + LITERARY_CONSTRAINTS (contrainte 2), donnees=BLACKBOX_ATTRACTORS.json, code=ABSENT, test=Phase B runs
- Production : NON (shadow — information de contrainte)
- Collision ID : aucune

---

### LAW E1 — Optimalite FR : R² maximum a 3000w
- Enonce : R²_FR(L) presente un maximum local en [2000w, 3000w+]. La relation est non-monotone : croissant jusqu'a 3000w, decroissant au-dela.
- Equation : `R²_FR(3000w+) = 0.519 (maximum) ; R²_FR(200w) = 0.203 ; R²_FR(full) = 0.333`
- Type : SCALING
- Domaine : Langue=FR, Taille=200w-full, Modele=N/A (corpus), Corpus=638 097 fenetres FR
- Preuve : R² par fenetre mobile, 7 tailles testees
- Niveau : SEALED (CONSTANTE_REGIME — valide pour les 42 features actuelles)
- Tracabilite : doc=MANUEL_v1.0 (I.4 eq E1), donnees=Angostura multi-echelle, code=ABSENT, test=R² mesure
- Production : OUI (shadow — valide la fenetre de 2000-3000w pour mesure V2)
- Collision ID : aucune

---

### LAW E2 — Fragilite EN : effondrement au-dela de 1000w
- Enonce : R²_EN atteint un plateau a 500-1000w puis s'effondre. A 3000w+ le modele predit a l'envers (R²=-0.127).
- Equation : `R²_EN(500w) = 0.101 ; R²_EN(3000w+) = -0.127`
- Type : SCALING
- Domaine : Langue=EN, Taille=200w-full, Modele=N/A (corpus), Corpus=1 286 009+ fenetres EN
- Preuve : R² par fenetre mobile, 7 tailles testees
- Niveau : SEALED
- Tracabilite : doc=MANUEL_v1.0 (I.4 eq E2), donnees=Angostura EN, code=ABSENT, test=R² mesure
- Production : NON (pas implemente — scorer V5 requis pour EN maximaliste)
- Collision ID : aucune. Lie a L38.

---

### LAW R1 — Axes orthogonaux = conflit fecond (CF1)
- Enonce : Si les deux consignes contradictoires operent sur des dimensions orthogonales, le conflit est fecond. Si elles operent sur le meme axe, le conflit est parasite. 8/8 feconds = orthogonaux. 2/2 parasites = coaxiaux.
- Equation : `dim(A) perp dim(B) -> conflit fecond ; dim(A) parallel dim(B) -> conflit parasite`
- Type : CONFLIT
- Domaine : Langue=FR, Taille=400-700w, Modele=claude-sonnet-4-20250514, Corpus=N/A
- Preuve : Phase B + I1, 10 paires testees (8 feconds + 2 parasites). Classification 10/10.
- Niveau : SEALED
- Tracabilite : doc=MANUEL_v1.0 (II.4 eq CF1, VI), donnees=BLACKBOX_CONFLICTS.json, code=V-ATOMIC v5, test=45 runs
- Production : OUI (selection de paires dans V-ATOMIC)
- Collision ID : aucune

---

### LAW R2 — Variance < 3.0 = conflit stable (CF2)
- Enonce : Un conflit est fecond et stable ssi la variance inter-runs est inferieure a 3.0. Seuil classe correctement 14/15 paires (93.3%).
- Equation : `variance_inter_runs < 3.0 -> fecond (precision 93.3%)`
- Type : CONFLIT
- Domaine : Langue=FR, Taille=400-700w, Modele=claude-sonnet-4-20250514, Corpus=N/A
- Preuve : Phase B + I1, 15 paires testees
- Niveau : SEALED
- Tracabilite : doc=MANUEL_v1.0 (II.4 eq CF2, VI), donnees=BLACKBOX_CONFLICTS.json, code=ABSENT, test=45 runs
- Production : OUI (filtre de stabilite dans selection de paires)
- Collision ID : aucune

---

### LAW R3 — Sweet spot = 1 paire, rendement decroissant (CF3)
- Enonce : Le gain composite est maximal pour exactement 1 paire de consignes contradictoires (N=1 : +2.5 max). Au-dela (N=2 triple) le rendement chute de moitie (+1.3 moyen).
- Equation : `Delta_comp(N=1) = +2.5 max ; Delta_comp(N=2) = +1.3 moyen ; rendement decroissant`
- Type : CONFLIT
- Domaine : Langue=FR, Taille=400-700w, Modele=claude-sonnet-4-20250514, Corpus=N/A
- Preuve : Phase I1, tests N=1 et N=2
- Niveau : SEALED
- Tracabilite : doc=MANUEL_v1.0 (II.4 eq CF3, VI), donnees=BLACKBOX_CONFLICTS.json, code=V-ATOMIC v5, test=Phase I1
- Production : OUI (regle "1 paire max" dans V-ATOMIC)
- Collision ID : aucune

---

### LAW CF4 — Ratio d'alternance discriminant (paradoxe parasite)
- Enonce : Le ratio_alt moyen est similaire entre fecond (16.4%) et parasite (17.1%), MAIS la variance est tres differente (1.0 vs 3.6). Le signal discriminant est ratio_alt x stabilite, pas ratio_alt seul.
- Equation : `ratio_alt fecond = 16.4% (var=1.0) ; parasite = 17.1% (var=3.6)`
- Type : CONFLIT
- Domaine : Langue=FR, Taille=400-700w, Modele=claude-sonnet-4-20250514, Corpus=N/A
- Preuve : Phase I1, 10 paires
- Niveau : SEALED
- Tracabilite : doc=MANUEL_v1.0 (II.4 eq CF4), donnees=BLACKBOX_CONFLICTS.json, code=ABSENT, test=Phase I1
- Production : NON (shadow — diagnostic de paire)
- Collision ID : aucune

---

### LAW M_BB1 (M1) — Fermeture semantique quasi-deterministe
- Enonce : Claude ferme semantiquement (resolution d'arc) dans 96% des cas. Le cliff_score naturel est 0.50 +/- 0.004, quasi-deterministe.
- Equation : `cliff_score_naturel = 0.50 +/- 0.004 ; P(cliff_score > 0.40) = 0.96`
- Type : MODELE
- Domaine : Langue=FR+EN, Taille=toutes, Modele=claude-sonnet-4-20250514, Corpus=N/A (API runs)
- Preuve : Phase B baseline 30 runs + LITERARY_CONSTRAINTS regle 7 (confiance HAUTE, score 0.96)
- Niveau : SEALED
- Tracabilite : doc=MANUEL_v1.0 (II.2 eq M_BB1, VII M1) + LITERARY_CONSTRAINTS (regle 7), donnees=BLACKBOX_BASELINE.json, code=V-ATOMIC v5 (gate anti-fermeture), test=30 runs baseline
- Production : OUI (gate anti-fermeture obligatoire si cliff_score > 0.30)
- Collision ID : aucune. Alias : BB-01 dans MANUEL registre, L07 confiance fermeture dans OBSERVABLE_LAWS.

---

### LAW M_BB2 — Voir BB-P04
(Doublon consolide sous BB-P04)

---

### LAW M_BB3 — Voir BB-P03
(Doublon consolide sous BB-P03)

---

### LAW M_BB4 — Voir BB-C01
(Doublon consolide sous BB-C01)

---

### LAW M_BB5 — Voir BB-P06
(Doublon consolide sous BB-P06)

---

### LAW A1 — Ratio de dominance semicolon FR/EN
- Enonce : Le point-virgule est 7.15 fois plus discriminant en FR qu'en EN.
- Equation : `A_semi = Imp_FR(semicolon) / Imp_EN(semicolon) = 0.4157 / 0.0581 = 7.15`
- Type : CULTURELLE
- Domaine : Langue=FR+EN, Taille=toutes, Modele=N/A (corpus), Corpus=881 oeuvres
- Preuve : RF importance par permutation
- Niveau : SEALED
- Tracabilite : doc=MANUEL_v1.0 (I.3 eq A1), donnees=Angostura RF, code=ABSENT, test=RF cross-validation
- Production : NON (shadow — inform L31)
- Collision ID : Sous-composante de L31. L31 = enonce, A1 = equation.

---

### LAW A2 — Ratio de dominance tiret FR/EN
- Enonce : Le tiret est 5.97 fois plus discriminant en FR qu'en EN.
- Equation : `A_dash = Imp_FR(dash) / Imp_EN(dash) = 0.2130 / 0.0357 = 5.97`
- Type : CULTURELLE
- Domaine : Langue=FR+EN, Taille=toutes, Modele=N/A (corpus), Corpus=881 oeuvres
- Preuve : RF importance par permutation
- Niveau : SEALED
- Tracabilite : doc=MANUEL_v1.0 (I.3 eq A2, VII), donnees=Angostura RF, code=ABSENT, test=RF cross-validation
- Production : NON (shadow — pilotage)
- Collision ID : aucune

---

### LAW A3 — Ratio de dominance rythme EN/FR
- Enonce : La variance rythmique (f1a) est 2.61 fois plus discriminante en EN qu'en FR.
- Equation : `A_f1a = Imp_EN(f1a_rhythm) / Imp_FR(f1a_rhythm) = 0.0936 / 0.0359 = 2.61`
- Type : CULTURELLE
- Domaine : Langue=FR+EN, Taille=toutes, Modele=N/A (corpus), Corpus=881 oeuvres
- Preuve : RF importance par permutation
- Niveau : SEALED
- Tracabilite : doc=MANUEL_v1.0 (I.3 eq A3, VII), donnees=Angostura RF, code=ABSENT, test=RF cross-validation
- Production : NON (shadow — pilotage EN)
- Collision ID : aucune

---

### LAW A4 — Dominance structurelle : FR monocentrique vs EN polycentrique
- Enonce : Le rapport top1/top3 importance est 5.45 en FR (monocentrique) vs 1.20 en EN (polycentrique). Ratio D_FR/D_EN = 4.5. Ce n'est pas une difference de degre mais de regime.
- Equation : `D_FR = 0.4157/0.0763 = 5.45 ; D_EN = 0.0936/0.0778 = 1.20 ; D_FR/D_EN = 4.5`
- Type : CULTURELLE
- Domaine : Langue=FR+EN, Taille=toutes, Modele=N/A (corpus), Corpus=881 oeuvres
- Preuve : RF importance par permutation, validation Gemini
- Niveau : SEALED
- Tracabilite : doc=MANUEL_v1.0 (I.1.2 eq A4, VII), donnees=Angostura RF, code=ABSENT, test=RF cross-validation
- Production : NON (shadow — architecture du scorer par langue)
- Collision ID : aucune

---

### LAW L01 — Puits d'introspection (attracteur Sonnet)
- Enonce : Claude produit de l'INTROSPECTION quel que soit le mode demande (7/7 modes testes). Le composite varie peu entre scenes (83.5-92.9) mais le STYLE ne change pas.
- Equation : N/A (observation qualitative, confirmee quantitativement par marqueurs introspectifs dans 4/4 categories non-introspectives)
- Type : MODELE
- Domaine : Langue=FR, Taille=400-700w, Modele=claude-sonnet-4-20250514, Corpus=N/A
- Preuve : Phase A (7 modes) + Phase B baseline (30 runs, 10 scenes). LITERARY_CONSTRAINTS regle 4 (confiance HAUTE, score 0.75).
- Niveau : HIGH_CONFIDENCE
- Tracabilite : doc=OBSERVABLE_LAWS (L01) + LITERARY_CONSTRAINTS (regle 4), donnees=BLACKBOX_BASELINE.json, code=ABSENT, test=Phase A + B
- Production : NON (shadow — inform persona design)
- Collision ID : aucune

---

### LAW L06 — Composite stable, features instables
- Enonce : Le composite V2 est tres stable (CV 1-2%) mais les features individuelles sont tres instables (CV 20-80%). Le scorer compense — la qualite globale est reproductible, pas la forme.
- Equation : `CV(composite contemp.) = 0.013 ; CV(composite menace) = 0.020 ; CV(words) = 0.366-0.828`
- Type : MODELE
- Domaine : Langue=FR, Taille=400-700w, Modele=claude-sonnet-4-20250514, Corpus=N/A
- Preuve : 10 runs x 2 scenes (stabilite). Confirme par M_BB5.
- Niveau : SEALED
- Tracabilite : doc=OBSERVABLE_LAWS (L06) + MANUEL_v1.0 (M_BB5), donnees=BLACKBOX_BASELINE.json, code=ABSENT, test=20 runs stabilite
- Production : OUI (shadow — piloter par composite, pas par features)
- Collision ID : Consolide avec BB-P06/M_BB5.

---

### LAW L08 — Menace = scene la plus difficile
- Enonce : Menace (87.3) et revelation (87.0) sont systematiquement les scenes les plus basses. Souvenir (91.9) et contemplation (91.3) les plus hautes. Le type de scene conditionne le plafond.
- Equation : `composite(souvenir) = 91.9 ; composite(menace) = 87.3 ; delta = 4.6 points`
- Type : DESCRIPTIVE
- Domaine : Langue=FR, Taille=400-700w, Modele=claude-sonnet-4-20250514, Corpus=N/A
- Preuve : Baseline 30 runs, 10 scenes
- Niveau : HIGH_CONFIDENCE
- Tracabilite : doc=OBSERVABLE_LAWS (L08), donnees=BLACKBOX_BASELINE.json, code=ABSENT, test=30 runs
- Production : OUI (shadow — mapping paire-conflit par scene dans V-ATOMIC)
- Collision ID : aucune. Lie a L14 (OBSERVABLE_LAWS).

---

### LAW L09 — Ponctuation = signal non exploite
- Enonce : Claude ecrit presque sans ponctuation haute (0.17 semicolons, 2.17 dashes). Or Angostura montre que semicolon+dash = 64% du signal de qualite chez les maitres FR.
- Equation : `semicolon baseline = 0.17/texte ; dash baseline = 2.17/texte ; signal qualite maitres = 64% du total`
- Type : DESCRIPTIVE
- Domaine : Langue=FR, Taille=400-700w, Modele=claude-sonnet-4-20250514, Corpus=N/A
- Preuve : Baseline 30 runs + Angostura importance
- Niveau : HIGH_CONFIDENCE
- Tracabilite : doc=OBSERVABLE_LAWS (L09), donnees=BLACKBOX_BASELINE.json + Angostura, code=ABSENT, test=30 runs
- Production : NON (pas implemente — post-processing P5 requis)
- Collision ID : aucune. Lie a BB-01/L31.

---

### LAW L12 — Conflit structurel ECC/SII vs IFI
- Enonce : 26 features sont en conflit structurel. Phrases longues (ECC+SII) tuent les hooks (IFI). C'est un conflit intrinseque du scorer.
- Equation : N/A (conflit qualitatif entre blocs de features)
- Type : INTERACTION
- Domaine : Langue=FR+EN, Taille=toutes, Modele=N/A (scorer), Corpus=N/A
- Preuve : Phase A Rosetta, 26 features en conflit identifiees
- Niveau : HIGH_CONFIDENCE
- Tracabilite : doc=OBSERVABLE_LAWS (L12), donnees=Rosetta, code=sentinel-judge/scoring, test=Phase A
- Production : OUI (shadow — le scorer gere via ponderation)
- Collision ID : aucune

---

### LAW L35b — Robustesse V6 apres retrait auteur FR
- Enonce : Le modele L37 (sub->f26b->Tier) survit au retrait de chaque auteur FR. Robustesse 114-194%.
- Equation : `robustesse V6 = 114-194% apres retrait auteur`
- Type : CAUSALE
- Domaine : Langue=FR, Taille=toutes, Modele=N/A (corpus), Corpus=238 oeuvres FR
- Preuve : Validation V6 leave-one-author-out
- Niveau : SEALED
- Tracabilite : doc=MANUEL_v1.0 (I.6), donnees=Angostura V6, code=ABSENT, test=leave-one-author-out
- Production : NON (shadow — robustesse de L37)
- Collision ID : Resolution de la collision L35. L35=mega-levier, L35b=robustesse.

---

### LAW C_MASTER — Fonction de transfert globale
- Enonce : La prose OMEGA est le resultat de la fonction de transfert T(consigne, A_Sonnet). Pour consignes dans le bassin : T=identite. Hors bassin : projection sur frontiere. Conflits orthogonaux : exploration zone riche.
- Equation : `Prose_OMEGA(consigne) = T(consigne, A_Sonnet) ; A_Sonnet = {mean_sent in [35,42], sub <= 0.099, cliff = 0.50, introspection=on}`
- Type : DESCRIPTIVE
- Domaine : Langue=FR, Taille=400-700w, Modele=claude-sonnet-4-20250514, Corpus=N/A
- Preuve : Synthese des 504 runs API par 3 IAs (Claude + ChatGPT + Gemini)
- Niveau : HIGH_CONFIDENCE
- Tracabilite : doc=MANUEL_v1.0 (III.1), donnees=consolidation Phase A+B+I1, code=ABSENT, test=504 runs
- Production : NON (shadow — cadre theorique)
- Collision ID : aucune

---

### LAW B1 — Antagonisme des blocs AMPLE vs PERCUTANT
- Enonce : Le bloc AMPLE (semicolon, f26b, sub) et le bloc PERCUTANT (dash, excl, f17_knife) sont negativement correles. r(f26b, f17_knife) = -0.67 via elasticite L37.
- Equation : `r(AMPLE, PERCUTANT) < 0 ; r(f26b, f17) = -0.67`
- Type : INTERACTION
- Domaine : Langue=FR, Taille=toutes, Modele=N/A (corpus), Corpus=238 oeuvres FR
- Preuve : Correlation matrice + elasticite C2
- Niveau : SEALED
- Tracabilite : doc=MANUEL_v1.0 (I.7 eq B1), donnees=Angostura, code=ABSENT, test=correlation + mediation
- Production : NON (shadow — inform FR3 : eviter le bloc PERCUTANT seul)
- Collision ID : aucune

---

## TABLEAU SYNTHETIQUE

| # | ID | Type | Niveau | Production | Collision |
|---|-----|------|--------|-----------|-----------|
| 1 | L31 | CULTURELLE | SEALED | OUI | — |
| 2 | L33 | CULTURELLE/INTERACTION | SEALED | NON (shadow) | — |
| 3 | L34 | INTERACTION | CANDIDATE | NON | Gemini correction |
| 4 | L35 | CAUSALE | SEALED | OUI (shadow) | **L35/L35b collision** |
| 5 | L37 | CAUSALE | SEALED | OUI | — |
| 6 | L38 | DESCRIPTIVE | SEALED | NON | — |
| 7 | S1 | SCALING | SEALED | OUI (shadow) | — |
| 8 | S2 | SCALING | SEALED | OUI (shadow) | — |
| 9 | S3 | SCALING | SEALED | OUI (shadow) | — |
| 10 | BB-01 | MODELE | SEALED | OUI | alias L03 |
| 11 | BB-02 | REGIME | SEALED | OUI | alias L04, BB-P04 |
| 12 | BB-03 | MODELE/CONFLIT | SEALED | OUI | alias L07, BB-P07 |
| 13 | BB-P03 | MODELE | SEALED | OUI | recouvre BB-01 |
| 14 | BB-P04 | REGIME | SEALED | OUI | recouvre BB-02 |
| 15 | BB-P06 | MODELE | SEALED | OUI (shadow) | alias L06, M_BB5 |
| 16 | BB-P07 | CONFLIT | SEALED | OUI | recouvre BB-03 |
| 17 | BB-C01 | REGIME | SEALED | OUI (shadow) | alias M_BB4 |
| 18 | BB-C02 | REGIME | SEALED | NON (shadow) | — |
| 19 | E1 | SCALING | SEALED | OUI (shadow) | — |
| 20 | E2 | SCALING | SEALED | NON | lie L38 |
| 21 | R1 | CONFLIT | SEALED | OUI | alias CF1 |
| 22 | R2 | CONFLIT | SEALED | OUI | alias CF2 |
| 23 | R3 | CONFLIT | SEALED | OUI | alias CF3 |
| 24 | CF4 | CONFLIT | SEALED | NON (shadow) | — |
| 25 | M_BB1 | MODELE | SEALED | OUI | — |
| 26 | A1 | CULTURELLE | SEALED | NON (shadow) | sous-L31 |
| 27 | A2 | CULTURELLE | SEALED | NON (shadow) | — |
| 28 | A3 | CULTURELLE | SEALED | NON (shadow) | — |
| 29 | A4 | CULTURELLE | SEALED | NON (shadow) | — |
| 30 | L01 | MODELE | HIGH_CONFIDENCE | NON (shadow) | — |
| 31 | L06 | MODELE | SEALED | OUI (shadow) | consolide BB-P06 |
| 32 | L08 | DESCRIPTIVE | HIGH_CONFIDENCE | OUI (shadow) | — |
| 33 | L09 | DESCRIPTIVE | HIGH_CONFIDENCE | NON | — |
| 34 | L12 | INTERACTION | HIGH_CONFIDENCE | OUI (shadow) | — |
| 35 | L35b | CAUSALE | SEALED | NON (shadow) | resolution L35 |
| 36 | C_MASTER | DESCRIPTIVE | HIGH_CONFIDENCE | NON (shadow) | — |
| 37 | B1 | INTERACTION | SEALED | NON (shadow) | — |
| 38 | L34 | CANDIDATE | CANDIDATE | NON | coefficient manquant |

---

## STATISTIQUES

| Metrique | Valeur |
|----------|--------|
| Total lois extraites | 38 |
| SEALED | 30 |
| HIGH_CONFIDENCE | 5 |
| CANDIDATE | 1 |
| CONSTANTE_REGIME (sous-cat SEALED) | 4 (BB-P04, BB-C01, BB-C02, E1) |
| En production (OUI) | 15 |
| Shadow (OUI shadow) | 13 |
| Non implemente (NON) | 10 |
| Collisions detectees | 8 (dont L35/L35b majeure, + 7 alias/doublons inter-documents) |
| Sources documentaires | 6 |
| Equations avec R² | 5 (S1, S2, S3, E1, E2) |
| Lois bilingues | 8 (L37, S1, S2, S3, L34, A1-A4) |
| Lois FR-only | 12 |
| Lois modele-only | 14 |

---

## ALERTES IRM

1. **COLLISION L35** : Deux sens differents dans les documents. Resolution adoptee (L35=mega-levier, L35b=robustesse V6) mais PAS encore propagee dans le code ni les autres documents.

2. **DOUBLONS INTER-DOCUMENTS** : Les lois BB-01/BB-02/BB-03 (DECISIONS_LOCK) et BB-P03/BB-P04/BB-P07 (MANUEL) et L03/L04/L07 (OBSERVABLE_LAWS) designent les memes phenomenes avec des ID differents. Un registre unique canonique n'existe pas dans le code.

3. **10 LOIS NON IMPLEMENTEES** : L34 (coefficient exact manquant), L38 (scorer V5 requis), E2 (scorer V5), L09 (post-processing P5), BB-C02 (shadow), A1-A4 (shadow), CF4 (shadow), L35b (shadow).

4. **CODE ABSENT** : La majorite des lois documentees n'ont pas de correspondance directe dans le code source. Les lois sont dans les documents de gouvernance, pas dans des constantes code. Seuls les features (f17, cv_sent, etc.) sont implementes — les lois qui les gouvernent ne sont pas codifiees.

5. **L34 UNIQUE CANDIDATE** : Seule loi non scellee. Le coefficient OLS exact de l'interaction std x f1a sur Tier n'est pas publie.

---

*OMEGA IRM Livrable 09 — Extraction read-only exhaustive*
*38 lois, 6 sources, 0 modifications*
*2026-04-02*
