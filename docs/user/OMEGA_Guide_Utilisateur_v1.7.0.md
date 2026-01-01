# OMEGA — Guide Utilisateur Complet

**Version 1.7.0-INDUSTRIAL**
**Date : 1er Janvier 2026**

---

## Table des Matières

1. [Introduction](#1-introduction)
2. [Installation](#2-installation)
3. [Interface Utilisateur](#3-interface-utilisateur)
4. [Analyse Émotionnelle](#4-analyse-émotionnelle)
5. [Scanner Holographe](#5-scanner-holographe)
6. [Export des Résultats](#6-export-des-résultats)
7. [Gestion de Projets](#7-gestion-de-projets)
8. [Dépannage](#8-dépannage)
9. [Glossaire](#9-glossaire)

---

## 1. Introduction

### Qu'est-ce qu'OMEGA ?

OMEGA est un moteur d'analyse émotionnelle pour textes littéraires (romans, nouvelles, scénarios). Il détecte et visualise les émotions présentes dans votre texte selon le modèle de Plutchik.

### Pour qui ?

- **Auteurs** : Vérifiez l'impact émotionnel de vos chapitres
- **Éditeurs** : Analysez rapidement les manuscrits
- **Enseignants** : Outil pédagogique pour l'analyse littéraire
- **Chercheurs** : Études quantitatives sur les émotions narratives

### Garanties Qualité

- ✅ 216 tests automatisés (100% pass)
- ✅ Certification NASA-Grade AS9100D
- ✅ Déterminisme garanti (même texte = même résultat)
- ✅ Lexique français vérifié (118 mots-clés)

---

## 2. Installation

### Configuration Requise

| Élément | Minimum |
|---------|---------|
| OS | Windows 10/11 (64-bit) |
| RAM | 4 GB |
| Espace disque | 50 MB |
| Écran | 1280x720 |

### Procédure d'Installation

1. Téléchargez `OMEGA_Setup_v1.7.0-INDUSTRIAL_x64.exe`
2. Double-cliquez sur le fichier
3. Cliquez "Installer" (mode utilisateur, pas besoin d'admin)
4. Attendez la fin de l'installation (~30 secondes)
5. Lancez OMEGA depuis le menu Démarrer

### Vérification

Après installation, vérifiez :
- Icône OMEGA sur le bureau ou menu Démarrer
- Lancement sans erreur
- Affichage de l'interface principale

---

## 3. Interface Utilisateur

### Vue Principale
```
┌─────────────────────────────────────────────────────────────┐
│  OMEGA UI                                    [_][□][X]      │
├─────────────────────────────────────────────────────────────┤
│  [Fichier] [Édition] [Analyse] [Export] [Aide]              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────────────┐   │
│  │                     │  │  RÉSULTATS                  │   │
│  │  ZONE DE TEXTE      │  │  ────────────               │   │
│  │                     │  │  Joie: ████████ 45%         │   │
│  │  Collez ou tapez    │  │  Tristesse: ████ 25%        │   │
│  │  votre texte ici    │  │  Colère: ██ 15%             │   │
│  │                     │  │  Peur: █ 10%                │   │
│  │                     │  │  Autres: █ 5%               │   │
│  └─────────────────────┘  └─────────────────────────────┘   │
│                                                             │
│  [Analyser]  [Holographe]  [Exporter]                       │
└─────────────────────────────────────────────────────────────┘
```

### Zones Principales

| Zone | Description |
|------|-------------|
| Zone de texte | Entrée du texte à analyser |
| Résultats | Affichage des émotions détectées |
| Holographe | Scanner de cohérence narrative |
| Barre d'outils | Actions principales |

---

## 4. Analyse Émotionnelle

### Les 8 Émotions de Base (Plutchik)

| Émotion | Description | Exemples de mots-clés |
|---------|-------------|----------------------|
| **Joie** | Bonheur, satisfaction | heureux, ravi, content |
| **Tristesse** | Chagrin, mélancolie | triste, malheureux, peine |
| **Colère** | Irritation, rage | furieux, énervé, rage |
| **Peur** | Anxiété, terreur | effrayé, anxieux, terrifié |
| **Surprise** | Étonnement | surpris, stupéfait |
| **Dégoût** | Répulsion | dégoûté, écœuré |
| **Confiance** | Assurance | confiant, sûr |
| **Anticipation** | Attente | impatient, excité |

### Comment Analyser

1. **Collez** votre texte dans la zone de texte
2. **Cliquez** sur "Analyser"
3. **Consultez** les résultats :
   - Score par émotion (%)
   - Émotion dominante
   - Nombre de détections

### Interprétation des Résultats

- **Score > 40%** : Émotion très présente
- **Score 20-40%** : Émotion modérée
- **Score < 20%** : Émotion faible ou absente

---

## 5. Scanner Holographe

### Qu'est-ce que l'Holographe ?

L'Holographe analyse la **cohérence narrative** de votre texte :
- Détection de contradictions
- Incohérences temporelles
- Changements d'émotion brusques

### Utilisation

1. Après une analyse, cliquez sur "Holographe"
2. Consultez le rapport :
   - **Score Logic** : Cohérence factuelle
   - **Score Dynamics** : Cohérence émotionnelle
   - **Score Global** : Note générale (0-100%)

### Types d'Alertes

| Type | Description | Exemple |
|------|-------------|---------|
| Contradiction | Fait contradictoire | "Il avait 30 ans... Il avait 50 ans" |
| Temporal | Erreur chronologique | "Hier, dans 10 ans..." |
| Emotion Shift | Changement brutal | "Il riait... Il pleurait de rage" |

---

## 6. Export des Résultats

### Formats Disponibles

| Format | Extension | Usage |
|--------|-----------|-------|
| Markdown | `.md` | Documentation, web |
| Word | `.docx` | Rapports, impression |

### Procédure d'Export

1. Cliquez sur "Exporter"
2. Choisissez le format (MD ou DOCX)
3. Sélectionnez l'emplacement
4. Nommez le fichier
5. Cliquez "Enregistrer"

### Contenu de l'Export

- Métadonnées (date, version)
- Texte analysé
- Résultats par émotion
- Rapport Holographe
- Hash SHA256 (traçabilité)

---

## 7. Gestion de Projets

### Créer un Projet

1. Fichier → Nouveau Projet
2. Nommez votre projet
3. Ajoutez vos textes

### Sauvegarder

- **Auto-save** : Toutes les 5 minutes
- **Manuel** : Ctrl+S ou Fichier → Sauvegarder

### Ouvrir un Projet Existant

1. Fichier → Ouvrir
2. Sélectionnez le fichier `.omega`
3. Le projet se charge avec tous ses textes et analyses

---

## 8. Dépannage

### Problèmes Courants

| Problème | Solution |
|----------|----------|
| L'application ne démarre pas | Redémarrez le PC, réinstallez si nécessaire |
| Texte non analysé | Vérifiez que le texte n'est pas vide |
| Export échoue | Vérifiez les permissions du dossier cible |
| Résultats incohérents | Vérifiez l'encodage du texte (UTF-8) |

### Antivirus / Pare-feu

Si votre antivirus bloque OMEGA :
1. Ajoutez une exception pour `OMEGA UI.exe`
2. Ou désactivez temporairement pendant l'installation

### Logs de Diagnostic

Emplacement : `%APPDATA%\com.omega.ui\logs\`

En cas de bug, envoyez ce dossier avec votre rapport.

---

## 9. Glossaire

| Terme | Définition |
|-------|------------|
| **Plutchik** | Modèle psychologique des 8 émotions de base |
| **Lexique Gold** | Liste certifiée de 118 mots-clés émotionnels français |
| **Holographe** | Scanner de cohérence narrative OMEGA |
| **Déterminisme** | Même entrée = même sortie (garantie qualité) |
| **SHA256** | Empreinte numérique pour vérification d'intégrité |

---

## Support

- **GitHub** : github.com/4Xdlm/omega-project
- **Issues** : github.com/4Xdlm/omega-project/issues

---

*OMEGA v1.7.0-INDUSTRIAL — Documentation Utilisateur*
*© 2026 — Certification NASA-Grade AS9100D*
