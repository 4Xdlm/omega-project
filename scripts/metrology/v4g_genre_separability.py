#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
V4-G1 — Genre separability PILOT (confound-free) on cached nomic embeddings.

Truth-control context (V4-G0):
  - No genre ground-truth label exists in the corpus (folders = tier x lang only;
    R2 matrix has no genre/type column). Genre labels here are a CURATED author->genre
    KB over FAMOUS PUBLISHED authors (genre = their defining, verifiable category).
  - Test is restricted to cell D_SOURCE_REAL_FR => tier=pulp and lang=fr are BOTH FIXED.
    Therefore any separability measured here is genre signal isolated from quality-tier
    and from language. Author-idiosyncrasy is controlled by leave-ONE-AUTHOR-out.

Norm caveat (S-1): n is small (pilot). n>=100/cell NOT met. This is a feasibility
signal, explicitly sub-threshold vs OMEGA_ABSOLUTE_PROOF_STANDARD. No adoption.

Inputs (workspace, non-repo):
  - S1D_embeddings_nomic.json : { sha_text: [float,...] }
  - S1C_GOLDSET_FINAL_MANIFEST.jsonl : sha_text, canonical_author, cell, lang
Output:
  - V4G1_RESULTS.json
"""
import json, math, random, os, sys

WS = r"C:\Users\elric\Claude-Workspace\OMEGA\outputs\metrology"
EMB = os.path.join(WS, "S1D_embeddings_nomic.json")
MAN = os.path.join(WS, "S1C_GOLDSET_FINAL_MANIFEST.jsonl")
OUT = os.path.join(WS, "V4G1_RESULTS.json")

# Curated author->genre KB (D_SOURCE_REAL_FR authors). Genre = defining category.
GENRE = {
    "franck_thilliez":   "THRILLER",
    "bussi_michel":      "THRILLER",
    "chattam_maxime":    "THRILLER",
    "eric_giacometti":   "THRILLER",
    "clark_higgins_mary":"THRILLER",
    "agnes_lugand_martin":"FEELGOOD",
    "aurelie_valognes":  "FEELGOOD",
    "gilles_legardinier":"FEELGOOD",
    # single-author genres (excluded from binary test; descriptive only)
    "bernard_werber":    "SF",
    "christian_jacq":    "HISTORICAL",
    "anna_triss":        "FANTASY",
    "byrd_charlotte":    "ROMANCE",
    "feval_paul_pere":   "ADVENTURE",
    "bruce_jean":        "SPY",
    "gerard_villiers":   "SPY",
}

def cos(a, b):
    s = sum(x*y for x, y in zip(a, b))
    na = math.sqrt(sum(x*x for x in a)); nb = math.sqrt(sum(y*y for y in b))
    if na == 0 or nb == 0: return 0.0
    return s/(na*nb)

def centroid(vecs):
    n = len(vecs); d = len(vecs[0])
    return [sum(v[i] for v in vecs)/n for i in range(d)]

def main():
    emb = json.load(open(EMB, encoding="utf-8"))
    recs = [json.loads(l) for l in open(MAN, encoding="utf-8") if l.strip()]
    # build D_SOURCE_REAL_FR items: (author, genre, vector)
    items = []
    for r in recs:
        if r["cell"] != "D_SOURCE_REAL_FR":
            continue
        au = r["canonical_author"]; sha = r["sha_text"]
        if au not in GENRE:
            continue
        v = emb.get(sha)
        if v is None:
            continue
        items.append({"author": au, "genre": GENRE[au], "vec": v})

    dims = len(items[0]["vec"]) if items else 0
    # genre -> authors / books tally
    tally = {}
    for it in items:
        g = it["genre"]; tally.setdefault(g, {"authors": set(), "books": 0})
        tally[g]["authors"].add(it["author"]); tally[g]["books"] += 1
    tally_out = {g: {"n_authors": len(v["authors"]), "n_books": v["books"]} for g, v in tally.items()}

    # ---------- PRIMARY: binary THRILLER vs FEELGOOD, leave-one-AUTHOR-out ----------
    bin_items = [it for it in items if it["genre"] in ("THRILLER", "FEELGOOD")]
    authors = sorted(set(it["author"] for it in bin_items))
    correct = 0; total = 0; per = []
    for held in authors:
        train = [it for it in bin_items if it["author"] != held]
        test  = [it for it in bin_items if it["author"] == held]
        cTH = centroid([it["vec"] for it in train if it["genre"] == "THRILLER"])
        cFG = centroid([it["vec"] for it in train if it["genre"] == "FEELGOOD"])
        for t in test:
            pred = "THRILLER" if cos(t["vec"], cTH) >= cos(t["vec"], cFG) else "FEELGOOD"
            ok = (pred == t["genre"]); correct += ok; total += 1
            per.append({"author": held, "true": t["genre"], "pred": pred, "ok": bool(ok)})
    acc = correct/total if total else 0.0

    # permutation test: shuffle genre labels at AUTHOR level, recompute LOAO accuracy
    au_genre = {}
    for it in bin_items: au_genre[it["author"]] = it["genre"]
    au_list = list(au_genre.keys())
    base_labels = [au_genre[a] for a in au_list]
    def loao_acc(label_map):
        c = 0; t = 0
        for held in au_list:
            train = [it for it in bin_items if it["author"] != held]
            test  = [it for it in bin_items if it["author"] == held]
            tr_th = [it["vec"] for it in train if label_map[it["author"]] == "THRILLER"]
            tr_fg = [it["vec"] for it in train if label_map[it["author"]] == "FEELGOOD"]
            if not tr_th or not tr_fg:  # degenerate split under this permutation
                return None
            cTH = centroid(tr_th); cFG = centroid(tr_fg)
            for x in test:
                pred = "THRILLER" if cos(x["vec"], cTH) >= cos(x["vec"], cFG) else "FEELGOOD"
                c += (pred == label_map[held]); t += 1
        return c/t if t else 0.0
    random.seed(42)
    N = 5000; ge = 0; valid = 0
    for _ in range(N):
        perm = base_labels[:]; random.shuffle(perm)
        lm = {a: perm[i] for i, a in enumerate(au_list)}
        a2 = loao_acc(lm)
        if a2 is None: continue
        valid += 1
        if a2 >= acc: ge += 1
    pval = (ge+1)/(valid+1) if valid else None

    # ---------- intra vs inter cosine (author-blocked), all genres descriptive ----------
    intra = []; inter = []
    for i in range(len(items)):
        for j in range(i+1, len(items)):
            if items[i]["author"] == items[j]["author"]:
                continue  # block same-author pairs
            c = cos(items[i]["vec"], items[j]["vec"])
            if items[i]["genre"] == items[j]["genre"]: intra.append(c)
            else: inter.append(c)
    def mean(x): return sum(x)/len(x) if x else None
    intra_m = mean(intra); inter_m = mean(inter)

    res = {
        "design": "V4-G1 pilot, cell=D_SOURCE_REAL_FR (tier=pulp+lang=fr FIXED), leave-one-author-out",
        "norm_caveat": "PILOT sub-S-1 (n<<100/cell). Feasibility signal only. No adoption.",
        "embed_dims": dims,
        "n_items_labeled": len(items),
        "genre_tally": tally_out,
        "binary_thriller_vs_feelgood": {
            "n_authors": len(authors), "n_books": total,
            "loao_accuracy": round(acc, 4),
            "chance": 0.5,
            "permutation_p_value": round(pval, 5) if pval is not None else None,
            "permutations_valid": valid,
            "per_prediction": per,
        },
        "intra_vs_inter_cosine_author_blocked": {
            "intra_genre_mean": round(intra_m, 4) if intra_m is not None else None,
            "inter_genre_mean": round(inter_m, 4) if inter_m is not None else None,
            "delta": round(intra_m-inter_m, 4) if (intra_m is not None and inter_m is not None) else None,
            "n_intra_pairs": len(intra), "n_inter_pairs": len(inter),
        },
    }
    json.dump(res, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(json.dumps(res, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
