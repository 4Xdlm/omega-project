# WS-D R4 — CHANTIER « LE SCORER DISCRIMINE-T-IL LA QUALITÉ ? » (plan, doc-only)

**Date** : 2026-06-02 · **Origine** : caveats C1/C2 de WS_D_R3_SHADOW_RESULTS.md · **Statut** : PLAN (aucun code)
**Doctrine** : EMP-16 (triple-preuve), EMP-12 METRIC_HONESTY, DEC-011 (contrat ≠ prose, anti-circularité)

---

## 1. Le vrai problème, formulé sans détour

Le bench R3 (18 passages 600 mots, packet gardien) montre que **AUCUN axe ne sépare les maîtres de la pulp** :

| axe | maîtres | badprose | sépare ? |
|---|---|---|---|
| ECC | 44-63 | 48-71 | non (chevauchement) |
| SII | 83-88 | 85-90 | non (badprose ≥) |
| AAI | 84-96 | 86-92 | non |
| necessity (shots) | 82-92 | 82-92 | non (identiques) |
| IFI densité | bas | **plus haut** | inversé (R2.3) |

→ Le « confound packet/ECC » n'est qu'une PARTIE. La question centrale est plus profonde :
**le scorer macro, sur des passages courts (600 mots) hors-contexte, distingue-t-il la qualité littéraire ?**
Le run R3 suggère que **non** — même sur les axes « intrinsèques » (SII/AAI/necessity), Flaubert ≈ E.L. James.

## 2. Deux causes candidates (à départager, ne pas trancher ici)

- **H1 — Granularité** : un paragraphe de 600 mots isolé perd ce qui distingue un maître (architecture, accumulation,
  profondeur thématique, écho long). À cette échelle, la prose commerciale compétente est techniquement propre. Le juge
  ne PEUT pas voir la qualité car elle n'est pas dans la fenêtre.
- **H2 — Calibration du juge** : les prompts LLM (necessity/SII/AAI…) ne sont pas calibrés pour discriminer à ce niveau,
  ou saturent (necessity 82-92 partout). Le juge mesure une compétence technique, pas une supériorité littéraire.

(H1 et H2 ne s'excluent pas. Probable mélange.)

## 3. Reclassement conceptuel induit (cohérent R3 / DEC-016 split)

- **ECC = ContractConformityScore**, PAS IntrinsicQuality. ECC mesure la conformité de la prose générée à son contrat
  émotionnel (target_14d). Une œuvre arbitraire (maître) n'a PAS de contrat OMEGA → scorer son ECC contre un contrat
  fixe (gardien) est **dénué de sens**. **Interdit (DEC-011)** : dériver le contrat depuis la prose (circularité).
  → ECC ne doit gater la qualité que lors de la GÉNÉRATION (où le contrat existe), jamais pour classer de la littérature.
- Donc la **porte de Qualité Intrinsèque** ne peut PAS reposer sur ECC pour un corpus sans contrat. Elle doit reposer sur
  des axes **contract-free** : SII (necessity/metaphor/anti_cliche), AAI (show/authenticity), RCI-structurel (rhythm/euphony).
  Or le run R3 montre que **ces axes ne séparent pas non plus** à 600 mots → le problème n'est pas que le choix d'axes.

## 4. Bench diagnostic proposé (WS-D R4 — à construire après GO)

Objectif : **est-ce qu'un signal QUELCONQUE sépare maîtres de pulp, et à quelle échelle ?**

1. **Axes intrinsèques uniquement** (exclure ECC/tension = contract-conformity) : necessity, metaphor_novelty, anti_cliche
   (SII) ; show_dont_tell, authenticity (AAI) ; rhythm, euphony (RCI structurel). + densité advisory (focalisation) pour mémoire.
2. **Balayage d'échelle** : 600 / 1500 / 3000 mots / **œuvre quasi-entière** (≤ contexte modèle). Teste H1 (la qualité
   apparaît-elle à plus grande échelle ?).
3. **Corpus** : maîtres vs best-sellers vs pulp (3 familles, FR+EN) — réutilise corpus_r.
4. **Métrique** : pouvoir discriminant = écart normalisé (maîtres − pulp) par axe et par échelle ; significativité (Mann-Whitney).
   Critère : un axe « discrimine » si maîtres > pulp de façon stable et significative à au moins une échelle.
5. **Si AUCUN axe ne discrimine à aucune échelle** → conclusion lourde : le juge LLM actuel ne mesure pas la supériorité
   littéraire, seulement une compétence technique de surface. Décision juge (re-prompt / nouveau capteur / acceptation que
   « qualité » = conformité contrat + propreté technique, pas « niveau Flaubert ») = Architecte/Tribunal.
6. **Si certains axes discriminent à grande échelle (H1)** → la granularité de scoring doit monter (scorer scène/chapitre,
   pas paragraphe) ; impact sur le pipeline (K2 chunking, packets).

Tooling : extension du bench R3 (mêmes imports, axes intrinsèques, balayage d'échelle, stats). Crash-safe, scores-only, Ollama → terminal.

## 5. Garde-fous

- **Anti-circularité (DEC-011)** : ne JAMAIS dériver un contrat depuis la prose pour « réparer » l'ECC des maîtres. ECC reste
  hors du classement qualité des corpus sans contrat.
- **EMP-16** : aucune modif moteur (au-delà de O2 déjà spécifié) tant que R4 n'a pas établi un signal discriminant 3/3 (corpus/échelles).
- **METRIC_HONESTY** : si R4 conclut « le juge ne discrimine pas la qualité au-delà de la propreté technique », on l'ACTE,
  on ne maquille pas. C'est cohérent avec WS-C (0/95 maîtres ≥ SEAL 93) : OMEGA n'a jamais prouvé qu'il sait reconnaître un chef-d'œuvre.

## 6. Question Architecte

R4 est un chantier de recherche (pas un patch). Veux-tu que je construise le bench diagnostic §4 (balayage d'échelle,
axes intrinsèques, stats discriminantes) — sachant qu'il tournera dans ton terminal (Ollama, potentiellement long sur
les grandes échelles) ? Ou d'abord sceller O2 (patch-spec) et garder R4 pour un sprint dédié ?
