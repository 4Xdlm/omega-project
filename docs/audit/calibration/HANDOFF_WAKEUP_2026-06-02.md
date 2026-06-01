# OMEGA — HANDOFF RÉVEIL 2026-06-02 (auto-porteur)

**Pour Francky au réveil.** Tout est prêt, gaté, prouvé. Tu lis ce fichier, tu lances `WAKEUP_COMMANDS.md`, tu me colles les résultats. Branche `phase-r-dispatcher-v33`, HEAD au coucher `f8619c0c`, sync 0/0, **zéro code moteur modifié** de toute la session.

## 1. OÙ ON EN EST (la grande histoire)
On a passé la session à **chercher la vérité des mesures du juge OMEGA**. Conclusion centrale, prouvée :
> **Le juge n'est pas cassé. 5 sous-capteurs CALC fondés sur des mots-clés le sont** (sensory_richness FR-only, corporeal_anchoring, signature/hook packet-dépendants, anti_cliche inerte, tension_14d fallback). Les juges LLM et les capteurs structurels (rhythm/euphony) sont sains. Ces capteurs keyword sont **K2-circulaires** (la sortie OMEGA les sature, les chefs-d'œuvre les ratent) et **gameable** (1 phrase de mots-clés → sensory 0→100).

Et : **l'ancien SEAL composite≥93 était une illusion** — 0/95 chefs-d'œuvre mondiaux ne l'atteignent (max Proust 90.5). Les paliers avaient été ancrés sur 3 maîtres @500w en mars (aspirationnel, jamais mesuré).

## 2. CE QUI EST FAIT (scellé, doc-only, commits)
- **Lois gravées** (CLAUDE.md §H) : **EMP-16** (triple-preuve obligatoire avant code moteur) + **EMP-17** (respect des mesures historiques). Commit `7e02edb3`.
- **Vérité calibrage** : DEC-015 (SEAL 93 invalidé comme dogme ; paliers candidats S=84.7/A=79.7/B=76.5 SHADOW). WS-C : 95 mesures maîtres, composite complet (`WS_C_VERDICT_TRUTH.md`, `WS_C_MEASURES.jsonl`).
- **Protocole total** : WS-D OMEGA METROLOGY PRIME (7 phases, corpus stratifié + best-sellers, percentiles, shadow).
- **Démontage capteurs** : `SENSOR_CABLE_MAP.md` (cartographie totale) + `KEYWORD_SENSOR_SYSTEMIC_AUDIT.md` + `KEYWORD_SENSOR_REGISTRY.csv` + NCR `NCR_KEYWORD_SENSOR_SYSTEMIC_BIAS.md` + interconnexions (`AXIS_INTERCONNECTION_REPORT.md` : composite≈ECC r0.96, min_axis≈IFI r0.92, axes orthogonaux).
- **IFI autopsie** : `IFI_AUTOPSY_REPORT.md` (coulé par sensory/corporeal keyword FR-only).
- **R1 (reclasser≠supprimer)** : `WS_D_R1_SHADOW_BENCH_DESIGN.md` + role-map + double-verdict. **Triple-preuve R1 → DIVERGENCE → STOP** (`WS_D_R1_TRIPLE_PROOF_VERDICT.md`, `9db8307a`) : R1 vrai sur maîtres (IFI=min 87%) mais faux sur OMEGA output (17%) → R1 abandonné comme fix universel. **La discipline a empêché une modif erronée.**
- **R2 conçu** : `WS_D_R2_SEMANTIC_AND_ROLES_DESIGN.md` — remplacer keyword par sémantique DÉJÀ présent (sensory-density LLM, analyzeEmotionSemantic, embeddings), rôles par contexte. Preuve adversariale (keyword gameable) faite.
- **Provenance** : DEC-014 ACCEPTED (persister contrat+packet+sha+version par score).

## 3. CE QUI RESTE (au réveil, dans l'ordre)
1. **Lancer R2.1** (`wsd-r2-semantic-rescore.ts`, Ollama) → prouver que le sémantique est non-biaisé-langue + non-gameable sur 3 corpus. Cf `WAKEUP_COMMANDS.md` §1.
2. **Lancer ECC then/now** (`wsb0c-ecc-then-now.ts`) si pas déjà fait → §2.
3. **Me coller les SUMMARY** → j'évalue la convergence (EMP-16 `EMP16_TRIPLE_PROOF_PROTOCOL.md`).
4. **Si 3/3 convergent** → on code R2 selon `R2_ENGINE_CODE_PLAN.md` (couche de rôles, flag, shadow, EMP-10), dans ton terminal. **Si 1 diverge** → STOP, on réexamine (comme R1).
5. Plus tard : WS-D corpus élargi (best-sellers) + DEC-016 promotion paliers, seulement après capteurs assainis.

## 4. COMMANDES → `WAKEUP_COMMANDS.md` (copier-coller, runtimes, critères).

## 5. RISQUES / PIÈGES connus
- **Ne JAMAIS modifier le code moteur sans triple-preuve 3/3** (EMP-16). R1 a montré pourquoi.
- **Ne pas "réparer" un keyword en ajoutant des mots EN** → reste du keyword, même maladie. Sémantique only.
- **Ne rien supprimer** : reclasser le rôle (philosophie Architecte). Tout capteur reste calculé/loggé.
- **Ollama only dans TON terminal** : le shell de Claude ne résout pas le `node -e` imbriqué de l'ollama-provider → tout « sémantique » sorti de là est un faux (fallback keyword silencieux).
- **goldens e2e/h2 = prose placeholder** (inutilisables) ; le 3e corpus OMEGA-output réel = `sessions/PROD_REVELATION*`/`BOOK_FULL*`/`MINI_V5R6*` → pointer `R2_GOLDENS_DIR` vers un dossier de .txt prose.
- **parse-fails Ollama AAI** (vus en WS-C) : marginaux, à corriger avant le méga-bench.
- **composite≈ECC, min_axis≈IFI** : les 2 portes du SEAL sont mono-axe → fiabiliser ECC (contrat DEC-011) fiabilise le composite ; assainir IFI change le min_axis.

## 6. FICHIERS CLÉS (tout dans docs/audit/calibration/ sauf indication)
- Réveil : `WAKEUP_COMMANDS.md` · `EMP16_TRIPLE_PROOF_PROTOCOL.md` · `R2_ENGINE_CODE_PLAN.md` · ce handoff.
- Vérité : `WS_C_VERDICT_TRUTH.md` · `WS_D_R1_TRIPLE_PROOF_VERDICT.md` · `WS_D_R2_SEMANTIC_AND_ROLES_DESIGN.md`.
- Capteurs : `docs/audit/metrology/SENSOR_CABLE_MAP.md` · `KEYWORD_SENSOR_SYSTEMIC_AUDIT.md` · `IFI_AUTOPSY_REPORT.md`.
- Doctrine : `CLAUDE.md §H` (EMP-16/17) · `nexus/proof/NCR_KEYWORD_SENSOR_SYSTEMIC_BIAS.md`.
- Scripts (`scripts/metrology/`) : `wsd-r2-semantic-rescore.ts`, `wsb0c-ecc-then-now.ts`, `wsd-r1-triple-proof.ts`, `wsd-shadow-double-verdict.ts`, `wsd-axis-correlation.ts`, `wsd-ifi-autopsy.ts`, `wsc-master-composite-calibration.ts`.
- Log qualité : `C:\Users\elric\Claude-Workspace\OMEGA\outputs\log_quality.md`.

## 7. ÉTAT GIT
HEAD `f8619c0c`, branche `phase-r-dispatcher-v33`, sync 0/0, tree clean. ~31 commits doc/data/tooling cette session, **0 commit de code moteur**, genome SEALED intact, tous via `--no-verify` (autorisation Architecte, gate substance = doc-only).

**Bonne reprise. Tout est prouvé jusqu'à la frontière du code ; le code attend la triple-preuve.**
