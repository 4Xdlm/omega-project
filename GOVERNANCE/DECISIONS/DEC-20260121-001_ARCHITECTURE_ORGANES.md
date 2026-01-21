# OMEGA — DÉCISION DE CONCEPTION

## DEC-20260121-001 — Architecture Organes Internes

**Date:** 21 janvier 2026
**Session:** Post-Phase 0, Pre-Phase 1
**Participants:** Francky (Architecte), Claude (IA Principal), ChatGPT (Validation)
**Statut:** 🔒 ACTÉ

---

## CONTEXTE

Avant de lancer Phase 1 (V4.4 Contract), discussion de conception pour:
- Vérifier qu'aucun organe vital ne manque
- Intégrer les modules oubliés ou sous-spécifiés
- Figer l'architecture complète MAINTENANT

---

## DÉCISIONS ACTÉES (10 MODULES/CONCEPTS)

### 1. SENTINEL — Gouvernance Machine-Level

**Rôle:**
- Valider toutes les décisions des autres modules
- Empêcher qu'un module parte en roue libre
- Disposer de sous-juges spécialisés (acceptation par critères)
- Formuler des requêtes vers: snapshots, bibliothèque, lois V4.4, moteur émotion, mémoire

**Règle:** Aucune action non validée par SENTINEL ne passe.

**Phase:** Après V4.4 Integration, avant Mycelium/GPS

---

### 2. QUANTUM_TRUTH_MANAGER — Multi-Vérités

**Rôle:**
- Gérer plusieurs hypothèses/vérités compatibles simultanément
- Permettre la coexistence de branches narratives incertaines
- Résoudre/fusionner quand nécessaire

**Phase:** Avec NARRATIVE_FLOW_CONTROLLER

---

### 3. NARRATIVE_FLOW_CONTROLLER — Flux Sanguin Narratif

**Rôle:**
- Contrôler le flux narratif comme un flux sanguin
- Détecter branches mourantes / vivantes
- Suggérer des scènes de relance (greffes émotionnelles)
- Symbolisé sur Mycelium par les "petits bourgeons champignon"

**Phase:** Entre GPS/Genesis et Mycelium

---

### 4. INTENT_LAYER — Intention de l'Auteur

**Rôle:**
- Capturer l'intention consciente de l'auteur (distincte de l'émotion)
- Définir: intention auteur + effet recherché sur lecteur + vérité de l'histoire
- Couche AU-DESSUS de l'émotion, influence sans remplacer

**Phase:** Avant GPS complet

---

### 5. READER_MODEL — Profil Lecteur

**Rôle:**
- Modéliser le type de lecteur cible (enfant, expert, académicien, étudiant)
- Projeter l'impact perçu selon le profil
- POIDS FAIBLE — influence, pas vérité

**Règle:** Non autoritaire. Avertit, ne décide pas.

**Phase:** Avec GPS/Writing Studio

---

### 6. STYLE_DEVIATION_MANAGER — Style Assumé

**Rôle:**
- Permettre le "mauvais style" volontaire (biographies, pattes d'auteur)
- OMEGA prévient, l'utilisateur choisit:
  - Exception pour cette scène
  - Patte volontaire pour tout le livre
- Mémoriser les choix de déviation

**Règle:** OMEGA ne juge pas, il informe.

**Phase:** Dans POLISH/WRITING STUDIO

---

### 7. EXECUTION_MODE — Niveaux d'Exécution

**Modes:**
| Mode | Description | Tokens |
|------|-------------|--------|
| **OFF** | Local/règles/heuristiques sans IA | ~0 |
| **SEMI_OFF** | IA sur étapes clés uniquement | Limités |
| **BOOST** | 100% IA, vitesse/qualité max | Ouverts mais budgétés |

**Règle:** Chaque module doit déclarer ce qu'il peut faire en OFF et ce qu'il nécessite en BOOST.

**Phase:** Transversal, déclaré dès Phase 1

---

### 8. TOKEN_METER — Compteur de Ressources

**Rôle:**
- Mesurer, tracer, plafonner la consommation tokens
- Par action, par module, par session, par mode

**Fournit:**
- Compteur réel (usage mesuré)
- Estimation (avant exécution)
- Budget (limites imposées)
- Audit (preuve, logs hashés)

**Connecté à:**
- EXECUTION_MODE
- SENTINEL (validation budget avant action)
- BOOT/CALL/SAVE (état tokens inclus)

**Politique dépassement:**
- DOWNGRADE (BOOST → SEMI_OFF)
- STOP (bloque)
- ASK (demande validation humaine)

**Phase:** Transversal, structure dès Phase 1, actif dès Phase 7+

---

### 9. PLUGIN_CONTRACT + NEXUS_DEP — Évolutivité

**Rôle:**
- NEXUS_DEP = Bus d'intégration + Normalisation IO + Adaptateurs (bridges)
- Plugin Contract = Contrat pour modules externes (scenario, manga, poésie...)
- Permettre l'évolution sans reconstruction

**Phase:** Formaliser le contrat avant UI final

---

### 10. SESSION_SAVE_RITUAL — Fin de Discussion

**Rôle:**
- À chaque fin de discussion conception, figer la vérité
- Écrire dans GOVERNANCE/DECISIONS/
- Ne plus jamais perdre de décisions

**Format:**
```
DEC-YYYYMMDD-NNN.md
- Décisions prises
- Options rejetées
- Impacts roadmap
- Hash/trace
```

---

## OPTIONS REJETÉES

| Option | Raison du rejet |
|--------|-----------------|
| Reader Model autoritaire | Influence seulement, pas vérité |
| OMEGA interdit le mauvais style | L'utilisateur est souverain |
| Modules non-plug-in | OMEGA doit être évolutif |

---

## IMPACTS ROADMAP

### Nouvelle séquence des phases:

```
PHASE 0  — BASELINE ✅ PASS
PHASE 1  — V4.4 CONTRACT
PHASE 2  — V4.4 CORE ENGINE
PHASE 3  — V4.4 INTEGRATION (60%)
PHASE 4  — CLI PROOFS
PHASE 5  — FREEZE V4.4
PHASE 6  — SENTINEL GOVERNANCE ← NOUVEAU
PHASE 7  — INTENT LAYER ← NOUVEAU
PHASE 8  — MYCELIUM + NARRATIVE_FLOW
PHASE 9  — GPS + QUANTUM_TRUTH
PHASE 10 — MEMORY & CANON
PHASE 11 — GENESIS
PHASE 12 — SCRIBE
PHASE 13 — POLISH + STYLE_DEVIATION
PHASE 14 — AUTONOMY MODES
PHASE 15 — LICENSED UNIVERSE
PHASE 16 — UI COCKPIT + READER_MODEL
PHASE 17 — UI MYCELIUM
PHASE 18 — UI WRITING STUDIO
PHASE 19 — BOOT/CALL/SAVE + TOKEN_METER
```

### Modules transversaux (déclarés dès Phase 1):
- EXECUTION_MODE
- TOKEN_METER (structure)
- PLUGIN_CONTRACT

---

## SIGNATURE

```
Architecte: Francky ✅
IA Principal: Claude ✅
Validation: ChatGPT ✅

Date: 21 janvier 2026
Hash: [calculé après création]
```

---

**FIN DE DÉCISION DEC-20260121-001**
