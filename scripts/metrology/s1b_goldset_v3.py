#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
S1B v3 — Gold-Set familles, defauts cellules basses corriges :
 - author key fiable PARTOUT (parse 'Titre_-_Auteur' + fallback canon/Gutenberg).
 - exclusion croisee : un auteur present en MASTER ne peut etre en C/D.
 - filtre word_count single-work [WC_MIN, WC_MAX] (exclut omnibus/fragments).
 - purge traductions (native allowlist), exclusion non-fiction, n=30, cap 2/auteur.
Aucune prose reproduite. ZERO embedding/LLM.
"""
import csv, json, re, os, collections, argparse

WC_MIN, WC_MAX = 12000, 400000

NATIVE_FR = {"flaubert","zola","hugo","maupassant","balzac","stendhal","proust","camus","gide","mauriac",
 "diderot","voltaire","rousseau","merimee","nerval","chateaubriand","laclos","sand","daudet","dumas",
 "duras","yourcenar","celine","gracq","giono","bernanos","sartre","ernaux","clezio","modiano","butor",
 "grillet","colette","beauvoir","malraux","cocteau","aragon","tournier","perec","sarraute","quignard",
 "echenoz","nothomb","houellebecq","gary","vian","queneau","marivaux","lafayette","rabelais","constant",
 "prevost","barbey","huysmans","loti","gautier","sue"}
NATIVE_EN = {"austen","dickens","woolf","melville","fitzgerald","hardy","bronte","james","joyce","conrad",
 "hawthorne","forster","lawrence","wilde","defoe","sterne","fielding","eliot","faulkner","hemingway",
 "steinbeck","twain","poe","orwell","huxley","golding","greene","mccarthy","morrison","updike","roth",
 "delillo","franzen","richardson","swift","scott","thackeray","gaskell","trollope","stevenson","kipling",
 "wells","chesterton","waugh","nabokov","bellow","cheever","carver","oates","dreiser"}
NONFICTION = {"correspondance","essais","essai","lettres","pensees","maximes","discours","traite",
 "memoires","journal","fables","poesie","poesies","spleen","illuminations","carnets","notes",
 "aphorismes","pamphlet","chroniques","articles","oeuvres","completes"}
STOP_AUTH = {"edition","french","spanish","english","tome","volume","oeuvres","completes","the","les","des"}

def toks(s): return [t for t in re.split(r"[^a-zà-ÿ]+", s.lower()) if len(t) > 1]

def author_key(source_path, fallback_key, allow):
    # 1) canon allowlist gagne (clé propre)
    na = set(toks(fallback_key)) & allow
    if na: return sorted(na)[0]
    # 2) parse 'Titre_-_Auteur'
    base = os.path.basename(source_path)
    base = re.sub(r"\.(epub|pdf|txt)$","",base,flags=re.I)
    base = re.sub(r"(_french_edition|_spanish_edition|_english_edition|_oceanofpdf\.com)","",base,flags=re.I)
    auth = None
    if "_-_" in base: auth = base.split("_-_")[-1]
    elif " - " in base: auth = base.split(" - ")[-1]
    if auth:
        at = [t for t in toks(auth) if t not in STOP_AUTH]
        if at: return "_".join(sorted(at)[:2])
    # 3) fallback Gutenberg 'auteur_titre' : 2 premiers tokens utiles
    ft = [t for t in toks(fallback_key) if t not in STOP_AUTH]
    return "_".join(ft[:2]) if ft else "unknown"

def is_nonfiction(key): return bool(set(toks(key)) & NONFICTION)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--out-jsonl", required=True); ap.add_argument("--report", required=True)
    ap.add_argument("--per-cell", type=int, default=30); ap.add_argument("--max-per-author", type=int, default=2)
    a = ap.parse_args()
    rows = list(csv.DictReader(open(a.manifest, encoding="utf-8")))
    def lang_of(r): return r["lang_folder"] or (r["lang_detected"][:2] if r["lang_detected"] else "")
    def wc_ok(r):
        try: w=int(r["total_words"])
        except: return False
        return WC_MIN <= w <= WC_MAX

    pools = collections.defaultdict(list); audit = collections.Counter()
    for r in rows:
        sp=r["source_path"].lower(); key=r["author_title_key"]; lang=lang_of(r); tier=r["tier_folder"]
        if not wc_ok(r): audit["excluded_wordcount_range"]+=1; continue
        if is_nonfiction(key): audit["excluded_nonfiction"]+=1; continue
        if "corpus d a trier" in sp:
            pools["D_SOURCE_REAL_FR"].append((r, author_key(r["source_path"],key,NATIVE_FR))); continue
        if tier=="S" and lang=="fr":
            na=set(toks(key))&NATIVE_FR
            if na: pools["MASTER_NATIVE_FR"].append((r, sorted(na)[0]))
            else: audit["FR_S_nonnative_excluded"]+=1
        elif tier=="S" and lang=="en":
            na=set(toks(key))&NATIVE_EN
            if na: pools["MASTER_NATIVE_EN"].append((r, sorted(na)[0]))
            else: audit["EN_S_nonnative_excluded"]+=1
        elif tier=="C" and lang=="fr":
            if set(toks(key))&NATIVE_FR: audit["C_FR_dropped_master_misshelved"]+=1; continue
            pools["C_FORMULAIC_FR"].append((r, author_key(r["source_path"],key,set())))
        elif tier=="C" and lang=="en":
            if set(toks(key))&NATIVE_EN: audit["C_EN_dropped_master_misshelved"]+=1; continue
            pools["C_FORMULAIC_EN"].append((r, author_key(r["source_path"],key,set())))

    # auteurs maitres -> interdits dans C/D (anti-fuite + anti-contamination)
    master_auth = set(ak for c in ("MASTER_NATIVE_FR","MASTER_NATIVE_EN") for _,ak in pools[c])

    sel=[]; report=collections.OrderedDict()
    for cell, pool in pools.items():
        seen_sha=set(); seen_auth=collections.Counter(); picked=[]
        for r, ak in sorted(pool, key=lambda x:(x[1], int(x[0]["idx"]))):
            if cell.startswith(("C_","D_")) and ak in master_auth:
                audit[f"{cell}_dropped_master_author"]+=1; continue
            if r["sha_text"] in seen_sha: continue
            if seen_auth[ak]>=a.max_per_author: continue
            seen_sha.add(r["sha_text"]); seen_auth[ak]+=1; picked.append((r,ak))
        picked=picked[:a.per_cell]
        for r,ak in picked:
            sel.append(dict(cell=cell,lang=("fr" if "FR" in cell else "en"),family=cell,
                canonical_author=ak,author_title_key=r["author_title_key"],tier_folder=r["tier_folder"],
                source_format=r["source_format"],total_words=r["total_words"],sha_text=r["sha_text"],
                source_path=r["source_path"],confidence="CANDIDATE_FOLDER"))
        report[cell]=dict(pool=len(pool),picked=len(picked),distinct_authors=len(set(x for _,x in picked)))

    open(a.out_jsonl,"w",encoding="utf-8").write("\n".join(json.dumps(s,ensure_ascii=False) for s in sel))
    L=["# S1B v3 — GOLD-SET FAMILLES (corrige)","",f"Total: {len(sel)} | n/cellule={a.per_cell} | wc=[{WC_MIN},{WC_MAX}] | max/auteur={a.max_per_author}","",
       "| Famille | Pool | Retenu | Auteurs distincts |","|---|---|---|---|"]
    for c,d in report.items(): L.append(f"| {c} | {d['pool']} | {d['picked']} | {d['distinct_authors']} |")
    L+=["","## Audit exclusions",""]
    for k,v in audit.most_common(): L.append(f"- {k}: {v}")
    L+=["","## Garde-fous v3","- author key fiable partout (canon>parse _-_>fallback).",
        "- exclusion croisee: auteur maitre interdit en C/D.","- filtre word_count single-work (exclut omnibus/fragments).",
        "- traductions purgees, non-fiction exclue, split-auteur valide, n=30 cap 2.",
        "- confidence=CANDIDATE_FOLDER -> S1C humain avant scellement. Aucune prose reproduite."]
    open(a.report,"w",encoding="utf-8").write("\n".join(L))
    print(json.dumps({"selected":len(sel),"cells":report,"audit":dict(audit)},ensure_ascii=False))

if __name__=="__main__": main()
