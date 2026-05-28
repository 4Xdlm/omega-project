# ADR-CODEX-LAW-ID-COLLISION-2026-05-28

**Date** : 2026-05-28
**Status** : `PROPOSED — PENDING ARCHITECT VALIDATION`
**Auteur** : Claude (Cowork) — audit exhaustif Codex v1.3
**Mandate** : ChatGPT correction #5 v1.3-RC1 ("Créer note explicite collision L31/L33")
**Localisation cible** : `omega-project/docs/governance/codex/ADR_CODEX_LAW_ID_COLLISION-2026-05-28.md`

---

## Contexte

L'audit exhaustif Codex v1.3 (Phase B+F lecture intégrale ~30 000 lignes) a identifié **3 collisions majeures d'IDs de lois** entre les sources documentaires OMEGA :

1. **L31** : OMEGA_PHYSIQUE_LITTERAIRE_MANUEL_v1.0.md vs OMEGA_MASTER_DOSSIER_PHYSIQUE_LITTERAIRE.md
2. **L33** : Idem
3. **L34** : Sens cohérent entre sources mais formulation différente (corrélation brute vs coefficient interaction)

Plus la collision **L35/L35b** déjà résolue par `ADR_L35B_COLLISION.md` (2026-04-02).

---

## Collisions identifiées

### Collision L31

**Source A (MANUEL_v1.0.md I.3 équation A1)** :
- Énoncé : "Le point-virgule est 7.15× plus discriminant en FR qu'en EN"
- Équation : `A_semi = Imp_FR(semicolon) / Imp_EN(semicolon) = 0.4157 / 0.0581 = 7.15`
- Type : CULTURELLE
- Statut historique : SEALED, cité par Codex v1.1 + v1.2 + IRM 09_LAW_REGISTRY_TOTAL.md law #1

**Source B (MASTER_DOSSIER §12 LOIS SCELLÉES)** :
- Énoncé : "r(f26b, f1a) = +0.840 chez les Maîtres vs -0.594 chez OMEGA"
- Type : INTERACTION (artefact LLM, pas loi naturelle)
- Statut historique : Apparu mars 2026 marathon 12h session
- Référencé : MASTER_DOSSIER uniquement (pas IRM, pas Codex)

### Collision L33

**Source A (MANUEL_v1.0.md I.9)** :
- Énoncé : "Interaction ponctuelle FR-only — ρ_FR(semi, dash) = 0.231 vs ρ_EN(semi, dash) = 0.056"
- Type : CULTURELLE/INTERACTION
- Statut historique : SEALED, cité Codex v1.1 + v1.2 + IRM law #2

**Source B (MASTER_DOSSIER §12 LOIS SCELLÉES)** :
- Énoncé : "Les features sont organisées en deux blocs antagonistes (AMPLE vs PERCUTANT). Quand un bloc monte, l'autre baisse. Les Maîtres alternent. Il existe un OPTIMUM, pas un maximum."
- Type : INTERACTION structurelle
- Statut historique : Apparu mars 2026 marathon

### Collision L34

**Source A (MANUEL_v1.0.md I.7 équation B2 + Gemini correction)** :
- Énoncé : "Antagonisme std × f1a sur la qualité — coefficient d'interaction négatif"
- Équation : `β_interaction(std × f1a → Tier) < 0` [BILINGUE]
- Note Gemini : distinguer corrélation brute (positive `r(std, f1a) = +1.000`) vs coefficient interaction sur qualité (négatif)
- Statut : CANDIDATE (coefficient exact non publié)

**Source B (MASTER_DOSSIER §12 LOIS SCELLÉES)** :
- Énoncé : "semicolon_count et dash_count sont les deux premiers prédicteurs du tier à ≤2000w. Ils sont UNIVERSELS (pas auteur-spécifiques)."
- Type : DESCRIPTIVE (universalité ponctuation FR)
- Statut historique : SEALED, mars 2026

---

## Décision proposée

### Résolution L31 (Acception MANUEL retenue)

**L31 canonique v1.3** = MANUEL_v1.0.md (monopole ponctuel FR, A_semi=7.15)

- Justifié par citations multiples (Codex v1.1 + v1.2 + IRM)
- Acception MASTER_DOSSIER reclassifiée comme **B1 — Antagonisme blocs AMPLE/PERCUTANT** (déjà documentée Codex v1.3 §1.10)
- Mécanisme MASTER_DOSSIER r(f26b, f1a) = artefact V1 OMEGA, pas loi naturelle (preuve : Maîtres r=+0.840)

### Résolution L33 (Acception MANUEL retenue)

**L33 canonique v1.3** = MANUEL_v1.0.md (interaction ponctuelle FR-only ρ=0.231 vs 0.056)

- Justifié par citations multiples (Codex v1.1 + v1.2 + IRM)
- Acception MASTER_DOSSIER (blocs antagonistes) absorbée dans **B1** (§1.10)
- B1 a sa propre équation : `r(AMPLE, PERCUTANT) < 0` ; `r(f26b, f17_knife) ≈ -0.67` via élasticité L37

### Résolution L34 (Acception MANUEL retenue, sens MASTER_DOSSIER absorbé en L31)

**L34 canonique v1.3** = MANUEL_v1.0.md (antagonisme std × f1a CANDIDATE)

- Justifié par sourcing MANUEL équation B2 + correction Gemini
- Acception MASTER_DOSSIER (universalité semicolon+dash) est **conséquence de L31 + L33** (pas une loi distincte)
- L34 reste CANDIDATE jusqu'à coefficient OLS exact publié (forensic Sprint V3.5+ requis)

---

## Conséquences

### Pour Codex v1.3 FINAL (post-scellement Architect)

1. Section §1.1 reformulée avec note **"Collision résolue ADR-CODEX-LAW-ID-COLLISION-2026-05-28"**
2. Section §1.10 (B1 antagonisme blocs) documente clairement l'absorption MASTER_DOSSIER
3. Partie VII registre 38 lois : ajouter ligne pour B1 avec référence ADR

### Pour MASTER_DOSSIER.md

- **NE PAS modifier** (préservation archive historique mars 2026)
- Ajout note en haut : "Ce document est référence historique. Pour Codex canonique v1.3+, voir CODEX_OMEGA_LOIS_CONTRAINTES_LLM_v1-3.md"

### Pour MANUEL_v1.0.md

- **NE PAS modifier** (SCELLÉ NASA-Grade L4)
- Reste source canonique pour L31/L33/L34/L35/L37/L38/S1-S3

### Pour IRM 09_LAW_REGISTRY_TOTAL.md

- **NE PAS modifier** (READ-ONLY extraction 2026-04-02)
- 38 lois indexées restent valides

### Pour code source (sentinel-judge, scoring, dispatcher)

- **AUCUN impact code** (les lois L31/L33/L34 sont métriques shadow, pas wirées dans scorer V3.4)
- V3.4 noyau structurel (`coefficients-v3-4.ts`) inchangé : 5 features f24c/f33b/f1a/f33c/f12

---

## Pourquoi pas l'autre option ?

**Option rejetée** : Garder les 2 acceptions et créer L31a/L31b/L33a/L33b
- **Refusée** : Multiplierait les IDs déjà nombreux (38 + 19 + alias) et complexifierait le Cimetière hallucinations
- **Refusée** : MASTER_DOSSIER acception = artefact ML V1 (mars 2026 avant R-PHYSICS), pas loi physique universelle
- **Refusée** : Le bloc AMPLE/PERCUTANT est UN concept structurel (B1 nominal correct) ≠ deux lois numérotées différentes

---

## Validation requise

- [ ] Architect validation explicite
- [ ] Tribunal 2-IA self-check (Gemini + ChatGPT) sur cohérence résolution
- [ ] Migration Windows-side `Claude-Workspace/OMEGA/outputs/` → `omega-project/docs/governance/codex/`
- [ ] Mention dans Codex v1.3 FINAL §1.1 et §1.10

---

## Précédent

`ADR_L35B_COLLISION.md` (2026-04-02) : résolution similaire pour L35 (méga-levier) / L35b (robustesse V6).

---

**Standard** : NASA-Grade L4 / DO-178C Level A
**Source** : Audit exhaustif Codex v1.3 — Phase B (CODEX v1.1 + MANUEL_v1.0 + MASTER_DOSSIER + IRM 09_LAW_REGISTRY_TOTAL.md) + Phase F (NCRs + ADRs + 25 mémoires)
