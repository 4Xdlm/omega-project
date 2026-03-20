# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — PHASE R — PROMPT CLAUDE CODE POUR R-1 + R-2
# Extraction du corpus complet + Classification en tiers
# ═══════════════════════════════════════════════════════════════════════════════
#
# COPIER CE PROMPT DANS CLAUDE CODE (Riviera)
#
# ═══════════════════════════════════════════════════════════════════════════════

# CONTEXTE OMEGA

Tu travailles sur le projet OMEGA — un système de mesure de qualité littéraire
NASA-Grade. Le scorer actuel (R6 composite) a été invalidé : il met GPT au-dessus
de Flaubert. On entre en Phase R — Refondation Métrologique.

Repo : C:\Users\elric\omega-project (branche phase-r-metrology-rebuild)
Le plan complet est dans : docs/OMEGA_PHASE_R_PLAN.md

# MISSION R-1 : EXTRACTION DU CORPUS

## Étape 1 — Créer la structure

```
mkdir -p omega-autopsie/corpus_r/txt
mkdir -p omega-autopsie/corpus_r/features
mkdir -p omega-autopsie/results_phase_r
```

## Étape 2 — Convertir les 255 EPUB en TXT

Source : C:\Users\elric\Downloads\livre\*.epub
Destination : omega-autopsie/corpus_r/txt/

Pour chaque fichier .epub :
1. Extraire le texte avec Python (ebooklib + BeautifulSoup ou calibre CLI)
2. Nettoyer : retirer les balises HTML, headers, footers, tables des matières
3. Sauver en UTF-8 dans corpus_r/txt/ avec le nom nettoyé (underscores, minuscules)
4. Logger le résultat (succès/échec/taille)

Script Python recommandé :

```python
import os, sys, glob
from ebooklib import epub
from bs4 import BeautifulSoup

SRC = r"C:\Users\elric\Downloads\livre"
DST = r"C:\Users\elric\omega-project\omega-autopsie\corpus_r\txt"

os.makedirs(DST, exist_ok=True)

for path in glob.glob(os.path.join(SRC, "*.epub")):
    try:
        book = epub.read_epub(path, options={'ignore_ncx': True})
        texts = []
        for item in book.get_items_of_type(9):  # ITEM_DOCUMENT
            soup = BeautifulSoup(item.get_content(), 'html.parser')
            texts.append(soup.get_text(separator='\n', strip=True))
        
        full_text = '\n\n'.join(texts)
        if len(full_text) < 1000:
            print(f"[SKIP] {os.path.basename(path)} — trop court ({len(full_text)} chars)")
            continue
        
        name = os.path.basename(path).replace('.epub', '.txt')
        name = name.lower().replace(' ', '_').replace('-', '_')
        
        out_path = os.path.join(DST, name)
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(full_text)
        
        words = len(full_text.split())
        print(f"[OK] {name} — {words} mots")
    except Exception as e:
        print(f"[FAIL] {os.path.basename(path)} — {e}")
```

Installer les dépendances si nécessaire :
```
pip install ebooklib beautifulsoup4 --break-system-packages
```

## Étape 3 — Convertir les PDF en TXT (si possible)

Source : C:\Users\elric\Downloads\livre\*.pdf
Destination : omega-autopsie/corpus_r/txt/

Utiliser PyMuPDF (fitz) :
```python
import fitz  # PyMuPDF

for path in glob.glob(os.path.join(SRC, "*.pdf")):
    try:
        doc = fitz.open(path)
        texts = [page.get_text() for page in doc]
        full_text = '\n'.join(texts)
        # ... même logique que epub
    except:
        pass
```

Installer : `pip install PyMuPDF --break-system-packages`

NOTE : Les PDF sont souvent moins propres que les EPUB. 
Priorité aux EPUB. Les PDF sont un bonus.

## Étape 4 — Copier les 200 textes Gutenberg existants

```
cp omega-autopsie/gutenberg_cache/*.txt omega-autopsie/corpus_r/txt/
```

## Étape 5 — Inventaire final

Produire un fichier `omega-autopsie/corpus_r/CORPUS_INVENTORY.json` :

```json
[
  {
    "filename": "flaubert_bovary_14155.txt",
    "source": "gutenberg",
    "words": 120000,
    "language": "fr",
    "author": "Gustave Flaubert"
  },
  ...
]
```

## Livrable attendu

1. `omega-autopsie/corpus_r/txt/` — TOUS les textes en .txt UTF-8
2. `omega-autopsie/corpus_r/CORPUS_INVENTORY.json` — inventaire complet
3. Log de conversion avec succès/échecs

# MISSION R-2 : CLASSIFICATION EN TIERS (PRÉPARATION)

Après l'inventaire, préparer un fichier de classification VIDE à remplir :

`omega-autopsie/corpus_r/CORPUS_TIERS_DRAFT.json`

```json
[
  {
    "filename": "flaubert_bovary_14155.txt",
    "author": "Gustave Flaubert",
    "title_guess": "Madame Bovary",
    "language": "fr",
    "tier_suggestion": "S",
    "tier_reason": "Prix Nobel implied, canon mondial, unanimité critique",
    "tier_final": null
  },
  ...
]
```

Pour la suggestion de tier, utiliser ces RÈGLES :

| Auteur reconnu mondialement (Nobel, canon) | → Suggestion "S" |
| Classique reconnu (Goncourt, prix majeurs) | → Suggestion "A" |
| Littérature de qualité (éditeur sérieux) | → Suggestion "B" |
| Best-seller commercial | → Suggestion "C" |
| Self-published, romance formulaïque, titre explicite | → Suggestion "D" |
| Incertain | → Suggestion "?" |

`tier_final` reste null — c'est Francky qui valide.

## CONTRAINTES

- Ne pas modifier le code source de sovereign-engine
- Ne pas toucher au scorer actuel (gelé)
- Ne pas lancer de mesure (c'est R-3)
- Travailler UNIQUEMENT sur l'extraction et la classification
- Logger tout
- Si un epub/pdf échoue, le noter et continuer (pas de blocage)

## COMMANDES GIT EN FIN DE MISSION

```powershell
cd C:\Users\elric\omega-project
git add omega-autopsie/corpus_r/
git add docs/OMEGA_PHASE_R_PLAN.md
git commit -m "feat(phase-r): R-1 corpus extraction + R-2 tier draft [665+ oeuvres]"
```
