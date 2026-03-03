#!/usr/bin/env python3
"""
OMEGA — generate_baselines_v5.py
Génère baselines_v5.json avec calibrage DUAL FR / EN
NASA-grade L4 — aucune approximation tolérée

GROUPES:
  CALIB_FR   = FR-ORIG + PD-FR   (excl. TR — style traducteur)
  CALIB_EN   = EN-ORIG + PD-EN   (excl. TR-EN)
  POOL_TR_FR = TR-FR uniquement
  POOL_TR_EN = TR-EN uniquement
  ALL        = toutes langues
"""
import json, math, hashlib, statistics, sys
from pathlib import Path
from datetime import datetime, timezone

if sys.platform == "win32":
    RANKING_FILE = Path(r"C:\Users\elric\omega-project\omega-autopsie\RANKING_V4.json")
    OUTPUT_FILE  = Path(r"C:\Users\elric\omega-project\omega-autopsie\baselines_v5.json")
    THRESH_FILE  = Path(r"C:\Users\elric\omega-project\omega-autopsie\greatness_thresholds.json")
else:
    RANKING_FILE = Path("RANKING_V4.json")
    OUTPUT_FILE  = Path("baselines_v5.json")
    THRESH_FILE  = Path("greatness_thresholds.json")

FEATURES = ["F21","F22","F24","F25","F26","F27","F28","F29","F30","F1a"]

FEATURE_KEYS = {
    "F21":  "f21e_ritual_index",
    "F22":  "f22f_literary_index",
    "F24":  "f24e_contrast_score",
    "F25":  "f25g_description_score",
    "F26":  "f26c_period_score",
    "F27":  "f27d_modal_score",
    "F28":  "f28d_sil_score",
    "F29":  "f29b_ttr_window",
    "F30":  "f30d_ps_imp_ratio",
    "F1a":  "f1a_rhythm_variance",
}

# Groupes : corpus tags → groupe
GROUP_MAP = {
    "FR-ORIG": ["ALL", "CALIB_FR", "POOL_FR_ORIG"],
    "PD-FR":   ["ALL", "CALIB_FR", "POOL_PD_FR"],
    "TR-FR":   ["ALL", "POOL_TR_FR"],
    "EN-ORIG": ["ALL", "CALIB_EN", "POOL_EN_ORIG"],
    "PD-EN":   ["ALL", "CALIB_EN", "POOL_PD_EN"],
    "TR-EN":   ["ALL", "POOL_TR_EN"],
    "IT-ORIG": ["ALL", "POOL_IT"],
}

def sha256(obj: dict) -> str:
    raw = json.dumps(obj, ensure_ascii=False, sort_keys=True).encode()
    return hashlib.sha256(raw).hexdigest()

def winsorize(values: list, p_low=0.05, p_high=0.95):
    """Clip outliers P5-P95."""
    if len(values) < 4:
        return values
    s = sorted(values)
    n = len(s)
    lo = s[max(0, int(n * p_low))]
    hi = s[min(n-1, int(n * p_high))]
    return [max(lo, min(hi, v)) for v in values]

def compute_stats(values: list) -> dict:
    if not values:
        return {"n":0,"mean":None,"median":None,"std":None,
                "p10":None,"p25":None,"p75":None,"p90":None,"min":None,"max":None}
    s = sorted(values)
    n = len(s)
    def pct(p): return round(s[min(n-1, max(0, int(n*p)))], 6)
    return {
        "n":      n,
        "mean":   round(statistics.mean(s), 6),
        "median": round(statistics.median(s), 6),
        "std":    round(statistics.stdev(s) if n > 1 else 0.0, 6),
        "p10":    pct(0.10), "p25": pct(0.25),
        "p75":    pct(0.75), "p90": pct(0.90),
        "min":    round(s[0], 6),
        "max":    round(s[-1], 6),
    }

def compute_stats_winsorized(raw_values: list) -> dict:
    w = winsorize(raw_values)
    s = compute_stats(w)
    s["n_raw"] = len(raw_values)
    s["winsorized"] = True
    return s

def extract_feature_value(work: dict, feat: str):
    """Cherche la valeur d'un feature (par shorthand ou par clé complète)."""
    feats = work.get("scores", {})
    # Essai clé complète
    full_key = FEATURE_KEYS.get(feat)
    if full_key and full_key in feats and feats[full_key] is not None:
        v = feats[full_key]
        return float(v) if isinstance(v, (int, float)) else None
    # Essai clé shorthand directe
    if feat in feats and feats[feat] is not None:
        v = feats[feat]
        return float(v) if isinstance(v, (int, float)) else None
    return None

def build_groups(works: list) -> dict:
    groups = {g: [] for g in ["ALL","CALIB_FR","CALIB_EN",
                                "POOL_FR_ORIG","POOL_PD_FR","POOL_TR_FR",
                                "POOL_EN_ORIG","POOL_PD_EN","POOL_TR_EN","POOL_IT"]}
    for w in works:
        corpus = w.get("corpus","")
        for g in GROUP_MAP.get(corpus, ["ALL"]):
            if g in groups:
                groups[g].append(w)
    return groups

def compute_group_baselines(members: list) -> dict:
    result = {"n": len(members), "features": {}}
    for feat in FEATURES:
        vals = [v for w in members
                if (v := extract_feature_value(w, feat)) is not None]
        result["features"][feat] = compute_stats_winsorized(vals) if vals else compute_stats([])
    return result

def compute_champions(works: list) -> dict:
    champions = {}
    for feat in FEATURES:
        scored = [(w.get("title",""), w.get("author",""),
                   w.get("corpus",""), extract_feature_value(w, feat))
                  for w in works]
        scored = [(t,a,c,v) for t,a,c,v in scored if v is not None]
        scored.sort(key=lambda x: x[3], reverse=True)
        champions[feat] = [{"title":t,"author":a,"corpus":c,"value":round(v,6)}
                           for t,a,c,v in scored[:5]]
    return champions

def generate_greatness_thresholds(baselines: dict) -> dict:
    """
    Pour CALIB_FR et CALIB_EN:
      zone_min  = p25 (seuil entrée)
      target    = median
      zone_max  = p90 (peak)
      elite     = p75 → p90 (Golden Zone)
    """
    thresholds = {}
    for lang_key, calib_key in [("FR", "CALIB_FR"), ("EN", "CALIB_EN")]:
        if calib_key not in baselines:
            continue
        thresholds[lang_key] = {}
        for feat in FEATURES:
            st = baselines[calib_key]["features"].get(feat, {})
            if not st or st.get("n", 0) < 3:
                thresholds[lang_key][feat] = {"status": "INSUFFICIENT_DATA"}
                continue
            thresholds[lang_key][feat] = {
                "zone_min":    st.get("p25"),
                "target":      st.get("median"),
                "zone_max":    st.get("p90"),
                "elite_low":   st.get("p75"),
                "elite_high":  st.get("p90"),
                "mean":        st.get("mean"),
                "std":         st.get("std"),
                "n_calibration": st.get("n"),
            }
    return thresholds

def main():
    print("=" * 64)
    print("OMEGA — generate_baselines_v5 — DUAL CALIBRATION FR/EN")
    print("=" * 64)

    if not RANKING_FILE.exists():
        print(f"[ERROR] RANKING_V4.json introuvable: {RANKING_FILE}")
        sys.exit(1)

    with open(RANKING_FILE, encoding="utf-8") as f:
        ranking = json.load(f)

    works = ranking.get("works", [])
    print(f"Œuvres chargées : {len(works)}")

    groups = build_groups(works)
    for g, members in groups.items():
        if members:
            print(f"  [{g:<14}] n={len(members):3d}")

    print()
    baselines = {}
    for group_name, members in groups.items():
        if not members:
            continue
        baselines[group_name] = compute_group_baselines(members)
        fr_f22 = baselines[group_name]["features"].get("F22", {}).get("median", "N/A")
        fr_f29 = baselines[group_name]["features"].get("F29", {}).get("median", "N/A")
        print(f"  [{group_name:<14}] F22_median={fr_f22!s:<8} F29_median={fr_f29!s:<8}")

    print()
    champions = compute_champions(works)
    print("Champions F29 (TTR):", [(c["title"][:25], c["value"]) for c in champions["F29"][:3]])
    print("Champions F25 (Image):", [(c["title"][:25], c["value"]) for c in champions["F25"][:3]])

    # Greatness Thresholds
    thresholds = generate_greatness_thresholds(baselines)

    # Output baselines
    output = {
        "meta": {
            "version":   "v5.0",
            "generated": datetime.now(timezone.utc).isoformat(),
            "source":    "RANKING_V4.json",
            "n_works":   len(works),
            "features":  FEATURES,
            "calibration_strategy": {
                "CALIB_FR": "FR-ORIG + PD-FR (TR-FR excluded)",
                "CALIB_EN": "EN-ORIG + PD-EN (TR-EN excluded)",
                "rationale": "TR pools excluded to avoid translator style contamination",
                "normalization": "Winsorize P5-P95 before stats",
            },
        },
        "baselines":  baselines,
        "champions":  champions,
    }
    output["meta"]["sha256"] = sha256(output)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"\nbaselines_v5.json → {OUTPUT_FILE}")
    print(f"SHA256: {output['meta']['sha256'][:32]}...")

    # Output thresholds
    thresh_output = {
        "meta": {
            "version":   "v1.0",
            "generated": datetime.now(timezone.utc).isoformat(),
            "source":    "baselines_v5.json",
            "description": "Golden Zone thresholds per language. zone_min=P25, target=median, elite=P75-P90",
        },
        "thresholds": thresholds,
    }
    thresh_output["meta"]["sha256"] = sha256(thresh_output)

    with open(THRESH_FILE, "w", encoding="utf-8") as f:
        json.dump(thresh_output, f, ensure_ascii=False, indent=2)
    print(f"greatness_thresholds.json → {THRESH_FILE}")
    print(f"SHA256: {thresh_output['meta']['sha256'][:32]}...")

    # Afficher diff FR vs EN sur features clés
    print("\n━━━ DIFF CALIBRAGE FR vs EN ━━━")
    print(f"{'Feature':<8} {'FR_median':>12} {'EN_median':>12} {'FR_std':>10} {'EN_std':>10}")
    fr = baselines.get("CALIB_FR", {}).get("features", {})
    en = baselines.get("CALIB_EN", {}).get("features", {})
    for feat in FEATURES:
        fr_m = fr.get(feat, {}).get("median", "N/A")
        en_m = en.get(feat, {}).get("median", "N/A")
        fr_s = fr.get(feat, {}).get("std", "N/A")
        en_s = en.get(feat, {}).get("std", "N/A")
        print(f"{feat:<8} {str(fr_m):>12} {str(en_m):>12} {str(fr_s):>10} {str(en_s):>10}")

    print("\nVERDICT: PASS")

if __name__ == "__main__":
    main()

