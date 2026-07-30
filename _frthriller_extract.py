#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OMEGA — Extraction du corpus FR-thriller de référence (20 romans).
Reconstruit `packages/book-factory/runs/atlas/_frthriller_prose.txt`.

Historique : le script d'origine (session 2026-07-21) n'avait jamais été sauvegardé
(audit 2026-07-30 : « script constructeur introuvable »). Celui-ci le remplace,
avec en plus le FILTRE FRONT-MATTER (v2, 2026-07-30) : les sommaires/paginations
d'epub (« OceanofPDF.com Signets Sommaire Chapitre 1 Chapitre 2… ») produisaient
des pseudo-phrases de 400-746 mots dans la baseline.

Méthode identique à `_polar_extract.ps1` : ZipFile → HTML/XHTML → strip
script/style → strip tags → HTML-decode → normalisation espaces → `===BOOK===`.

Usage (Windows) : python _frthriller_extract.py
"""
import zipfile, re, html, sys, os

BOOKS = [
    "corpus D a trier/1991_Les_Enquetes_de_Sharko_Tome_1_-_Franck_Thilliez.epub",
    "corpus D a trier/A_retardement_French_Edition_-_Franck_Thilliez.epub",
    "corpus D a trier/La_Foret_Des_Ombres_French_Edition_-_Thilliez_Franck.epub",
    "corpus D a trier/La_Memoire_Fantome_French_Edition_-_Thilliez_Franck.epub",
    "corpus D a trier/Leonard_French_Edition_-_Franck_Thilliez.epub",           # extraction degradee connue (n=2)
    "corpus D a trier/Le_Manuscrit_inacheve_French_Edition_-_Franck_Thilliez.epub",
    "corpus D a trier/Luna_Park_-_Franck_Thilliez.epub",                        # extraction degradee connue (n~300)
    "corpus D a trier/82_Secondes_French_Edition_-_MAXIME_CHATTAM.epub",
    "corpus D a trier/LAme_du_mal_French_Edition_-_Chattam_Maxime.epub",
    "corpus D a trier/La_Promesse_des_tenebres_French_Edition_-_Maxime_Chattam.epub",
    "corpus D a trier/Les_Arcanes_du_chaos_-_Maxime_Chattam.epub",
    "corpus D a trier/Le_coeur_de_la_terre_French_Edition_-_Chattam_Maxime.epub",
    "corpus D a trier/Le_Requiem_des_abysses_French_Edition_-_Maxime_Chattam.epub",
    "corpus D a trier/Prime_Time_French_Edition_-_Maxime_Chattam.epub",
    "corpus D a trier/Que_ta_volonte_soit_faite_French_Edition_-_Maxime_Chattam.epub",
    "corpus D a trier/Code_612_Qui_a_tue_le_Petit_Prince_French_Edition_-_Michel_Bussi.epub",
    "corpus D a trier/Maman_a_tort_-_Michel_Bussi.epub",
    "corpus D a trier/Ten_souviens-tu_mon_Anais__French_Edition_-_Bussi_Michel.epub",
    "corpus D a trier/Trois_vies_par_semaine_-_Michel_Bussi.epub",
    "FR/Les_refuges_French_Edition_-_Jerome_Loubry.epub",
]

BASE = os.environ.get("OMEGA_EPUB_DIR", r"C:\Users\elric\Downloads\livre")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                   "packages", "book-factory", "runs", "atlas", "_frthriller_prose.txt")

TAG_RE = re.compile(r"<[^>]+>")
SCRIPT_STYLE_RE = re.compile(r"(?is)<(script|style)[^>]*>.*?</\1>")
WS_RE = re.compile(r"\s+")


def is_front_matter(chunk: str) -> bool:
    """Vrai si un fichier interne d'epub est un sommaire/pagination, pas de la prose.
    Heuristiques (v2) : densité de 'Chapitre N', marqueur OceanofPDF/Signets/Sommaire
    en tête, ou majorité de tokens numériques (tables de pagination)."""
    head = chunk[:400]
    if re.search(r"(OceanofPDF|Signets\s+Sommaire|Pagination de l'édition)", head):
        return True
    tokens = chunk.split()
    if not tokens:
        return True
    num_ratio = sum(1 for t in tokens if t.isdigit()) / len(tokens)
    if num_ratio > 0.5 and len(tokens) > 50:
        return True
    chapter_hits = len(re.findall(r"\bChapitre\s+\d+\b", chunk))
    if chapter_hits >= 10 and len(tokens) < chapter_hits * 12:
        return True
    return False


def extract(path: str) -> str:
    parts: list[str] = []
    with zipfile.ZipFile(path, "r") as z:
        for name in z.namelist():
            if not re.search(r"\.(x?html?|xml)$", name, re.IGNORECASE):
                continue
            raw = z.read(name).decode("utf-8", errors="ignore")
            txt = SCRIPT_STYLE_RE.sub(" ", raw)
            txt = TAG_RE.sub(" ", txt)
            txt = html.unescape(txt)
            txt = WS_RE.sub(" ", txt).strip()
            if txt and not is_front_matter(txt):
                parts.append(txt)
    return " ".join(parts)


def main() -> int:
    done, err = 0, 0
    with open(OUT, "w", encoding="utf-8") as out:
        for rel in BOOKS:
            path = os.path.join(BASE, rel)
            try:
                full = extract(path)
                out.write(full)
                out.write("\n===BOOK===\n")
                done += 1
                print(f"OK  {rel}  chars={len(full)}")
            except Exception as e:  # noqa: BLE001 — on veut le rapport, pas un crash
                err += 1
                print(f"ERR {rel}: {e}", file=sys.stderr)
    print(f"DONE books={done} err={err} -> {OUT}")
    return 0 if err == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
