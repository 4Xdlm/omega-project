# OMEGA — Guide de Dépannage

**Version 1.7.0-INDUSTRIAL**

---

## Problèmes d'Installation

### L'installeur ne se lance pas

**Symptôme** : Double-clic sans effet ou erreur Windows

**Solutions** :
1. Clic droit → "Exécuter en tant qu'administrateur"
2. Vérifiez que Windows Defender n'a pas bloqué le fichier
3. Téléchargez à nouveau (fichier peut être corrompu)

**Vérification SHA256** :
```powershell
Get-FileHash "OMEGA_Setup_v1.7.0-INDUSTRIAL_x64.exe" -Algorithm SHA256
```

### Erreur "Application non reconnue"

**Cause** : Windows SmartScreen bloque les applications non signées

**Solution** :
1. Cliquez "Informations complémentaires"
2. Cliquez "Exécuter quand même"

---

## Problèmes de Lancement

### L'application ne démarre pas

**Solutions** :
1. Redémarrez votre ordinateur
2. Vérifiez l'espace disque disponible (min 50 MB)
3. Réinstallez l'application

### Écran blanc au démarrage

**Cause** : WebView2 non installé ou corrompu

**Solution** :
1. Téléchargez WebView2 : https://developer.microsoft.com/microsoft-edge/webview2/
2. Installez et redémarrez OMEGA

### Erreur "DLL manquante"

**Solution** :
1. Installez Visual C++ Redistributable 2019+
2. Redémarrez l'ordinateur

---

## Problèmes d'Analyse

### Le bouton "Analyser" ne répond pas

**Solutions** :
1. Vérifiez que le texte n'est pas vide
2. Attendez quelques secondes (textes volumineux)
3. Redémarrez l'application

### Résultats vides ou zéro émotions

**Causes possibles** :
- Texte trop court (< 10 mots)
- Texte non français
- Caractères spéciaux uniquement

**Solution** : Utilisez du texte français avec au moins une phrase complète.

### Résultats différents pour le même texte

**Cause** : Cela ne devrait JAMAIS arriver (invariant garanti)

**Action** : Signalez ce bug immédiatement avec :
- Le texte exact utilisé
- Les deux résultats différents
- Votre version OMEGA

---

## Problèmes d'Export

### Export échoue

**Solutions** :
1. Vérifiez les permissions du dossier cible
2. Fermez le fichier s'il est ouvert dans Word
3. Choisissez un autre emplacement

### Fichier DOCX corrompu

**Solution** :
1. Réexportez le fichier
2. Essayez le format Markdown (.md)

---

## Problèmes de Performance

### Application lente

**Texte volumineux (> 100 000 caractères)** :
- Temps d'analyse : jusqu'à 30 secondes
- C'est normal, patientez

**Solutions générales** :
1. Fermez les autres applications
2. Redémarrez OMEGA
3. Analysez par chapitres plutôt qu'un roman entier

### Mémoire insuffisante

**Symptôme** : Crash sur gros fichiers

**Solution** : Divisez votre texte en parties plus petites

---

## Antivirus et Pare-feu

### Windows Defender bloque OMEGA

**Solution** :
1. Paramètres → Sécurité Windows
2. Protection contre les virus → Gérer les paramètres
3. Exclusions → Ajouter une exclusion
4. Sélectionnez le dossier OMEGA

### Autre antivirus (Norton, Avast, etc.)

Ajoutez une exception pour :
- `C:\Users\<votre_nom>\AppData\Local\com.omega.ui\`
- `OMEGA UI.exe`

---

## Récupération de Données

### Projet non sauvegardé perdu

**Emplacements de backup** :
```
%APPDATA%\com.omega.ui\backups\
```

### Fichiers temporaires
```
%TEMP%\omega-*
```

---

## Logs de Diagnostic

### Emplacement des logs
```
%APPDATA%\com.omega.ui\logs\
```

### Informations à fournir pour un rapport de bug

1. Version OMEGA : `1.7.0-INDUSTRIAL`
2. Version Windows : (Paramètres → Système → À propos)
3. Description du problème
4. Étapes pour reproduire
5. Fichier log (si disponible)

---

## Contact Support

**GitHub Issues** : github.com/4Xdlm/omega-project/issues

Avant de signaler un bug :
1. Vérifiez ce guide de dépannage
2. Recherchez si le problème existe déjà
3. Fournissez toutes les informations demandées

---

*OMEGA v1.7.0-INDUSTRIAL — Guide de Dépannage*
