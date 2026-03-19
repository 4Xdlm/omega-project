#!/usr/bin/env python3
"""
OMEGA — Phase R2 : Topologie Narrative
7 analyses sur les 169+ JSON de R1

Usage : .venv311/Scripts/python.exe r2_topology.py

Produit :
  - OMEGA_PREL_HEATMAP.json
  - OMEGA_POSITION_PROFILES.json
  - OMEGA_HOOKS_CLIFFHANGERS.json
  - OMEGA_CHAPTER_DISTRIBUTION.json
  - OMEGA_KEY_MOMENTS.json
  - OMEGA_PASSAGE_TYPES.json
  - OMEGA_CUT_NATURALNESS.json
"""

import json, sys, os, re, math, time, traceback
from pathlib import Path
from datetime import datetime
from statistics import mean, stdev, median
from collections import defaultdict

sys.path.insert(0, str(Path(__file__).parent))

from v5_config import (
    CATALOG_PUBLIC, CATALOG_PDF, PDF_DIR, TXT_DIR,
    make_work_id, log,
)
from v5_extraction import (
    find_and_extract, clean_text, split_chapters_v5,
    classify_passage, extract_hook, extract_cliffhanger,
    download_gutenberg,
)
from v5_features import (
    split_sentences, compute_all_features,
    compute_f33_punctuation_ratio, compute_f34_paragraph_density,
    compute_f35_hook, compute_f36_cliffhanger,
    compute_f38_typographic_speed, compute_f25, compute_f29,
)

# ═══════════════════════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════════════════════

R1_DIR = Path("results_r1")
R2_DIR = Path("results_r2")
R2_DIR.mkdir(exist_ok=True)

# 5 positions Francky-validated
PREL_CLUSTERS = {
    "OPENING":  (0.00, 0.10),
    "SETUP":    (0.10, 0.40),
    "MIDDLE":   (0.40, 0.60),
    "TENSION":  (0.60, 0.85),
    "CLOSING":  (0.85, 1.01),
}

# Features for moment detection
MOMENT_FEATURES = {
    "PIC_TENSION":      ["f23d_literary_causal_score", "f8a_emotional_density_ratio", "f9a_contradiction_rate"],
    "PIC_SENSORIEL":    ["f25g_description_score", "f24e_contrast_score"],
    "PIC_INTERIORITE":  ["f28d_sil_score", "f27d_modal_score"],
    "RUPTURE_RYTHME":   ["f1a_rhythm_variance", "f33c_dot_comma_ratio"],
    "ACCELERATION":     ["f38c_speed_score"],
}

# Features for passage classification (empirical thresholds — computed from data)
PASSAGE_TYPE_FEATURES = [
    "f33a_dots_count", "f34b_para_per_1000w", "f1_mean",
    "f5a_verb_density", "f38c_speed_score",
    "f25g_description_score", "f28d_sil_score", "f27d_modal_score",
    "f12b_tense_switch_rate",
]

# Features that don't need spaCy (F24-F38 subset computable on raw text)
TEXT_ONLY_FEATURES = [
    "f33a_dots_count", "f33b_commas_count", "f33c_dot_comma_ratio",
    "f34a_paragraph_count", "f34b_para_per_1000w",
    "f35a_hook_tension", "f35c_hook_score",
    "f36a_cliff_tension", "f36c_cliff_score",
    "f38a_short_para_rate", "f38b_punct_density", "f38c_speed_score",
]


# ═══════════════════════════════════════════════════════════════════════
# DATA LOADING
# ═══════════════════════════════════════════════════════════════════════

def load_all_r1() -> list:
    """Load all individual work JSONs from results_r1/."""
    works = []
    for f in sorted(R1_DIR.glob("*.json")):
        if f.name.startswith("OMEGA_") or f.name.startswith("r1_"):
            continue
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            meta = data.get("meta", {})
            if "gate_fail" in meta:
                continue
            works.append(data)
        except Exception as e:
            log.warning(f"Skip {f.name}: {e}")
    log.info(f"Loaded {len(works)} works from R1")
    return works


def get_numeric_features(features: dict) -> dict:
    """Extract only numeric features from a features dict."""
    return {k: v for k, v in features.items()
            if isinstance(v, (int, float)) and v is not None
            and not k.startswith("_") and not k.startswith("style_")}


def prel_zone(p_rel: float) -> str:
    """Map a P_rel value to its cluster name."""
    for name, (lo, hi) in PREL_CLUSTERS.items():
        if lo <= p_rel < hi:
            return name
    return "CLOSING"


def safe_stdev(vals: list) -> float:
    """Standard deviation, returning 0.0 for n<2."""
    if len(vals) < 2:
        return 0.0
    return stdev(vals)


def compute_trend(zone_means: dict) -> tuple:
    """Determine trend from zone means. Returns (trend, peak_zone)."""
    zones_ordered = ["OPENING", "SETUP", "MIDDLE", "TENSION", "CLOSING"]
    values = []
    for z in zones_ordered:
        if z in zone_means and zone_means[z] is not None:
            values.append((z, zone_means[z]))

    if len(values) < 2:
        return "INSUFFICIENT_DATA", None

    # Find peak
    peak_zone = max(values, key=lambda x: x[1])[0]
    first_val = values[0][1]
    last_val = values[-1][1]

    if first_val == 0 and last_val == 0:
        return "FLAT", peak_zone

    # Trend detection
    range_val = max(v for _, v in values) - min(v for _, v in values)
    mean_val = mean(v for _, v in values)
    if mean_val == 0:
        return "FLAT", peak_zone

    relative_range = range_val / abs(mean_val) if mean_val != 0 else 0

    if relative_range < 0.10:
        return "STABLE", peak_zone

    # Monotonic check
    ascending = all(values[i][1] <= values[i+1][1] for i in range(len(values)-1))
    descending = all(values[i][1] >= values[i+1][1] for i in range(len(values)-1))

    if ascending:
        return "ASCENDING", peak_zone
    if descending:
        return "DESCENDING", peak_zone

    # Peak detection
    peak_idx = [i for i, (z, v) in enumerate(values) if z == peak_zone][0]
    if 0 < peak_idx < len(values) - 1:
        return "PEAK", peak_zone

    # Trough
    trough_zone = min(values, key=lambda x: x[1])[0]
    trough_idx = [i for i, (z, v) in enumerate(values) if z == trough_zone][0]
    if 0 < trough_idx < len(values) - 1:
        return "TROUGH", peak_zone

    return "IRREGULAR", peak_zone


# ═══════════════════════════════════════════════════════════════════════
# ANALYSE 1 — CARTE P_REL × FEATURE (Heatmap)
# ═══════════════════════════════════════════════════════════════════════

def analyse_1_prel_heatmap(works: list) -> dict:
    log.info("\n" + "="*60)
    log.info("ANALYSE 1 — CARTE P_REL x FEATURE")

    # Collect: feature -> zone -> [values]
    feature_zone_vals = defaultdict(lambda: defaultdict(list))

    for work in works:
        for win in work["windows"]:
            if win.get("is_real_chapter"):
                continue  # fixed windows only for heatmap
            p_rel = win.get("p_rel", 0)
            zone = prel_zone(p_rel)
            feats = get_numeric_features(win.get("features", {}))
            for fname, val in feats.items():
                feature_zone_vals[fname][zone].append(val)

    # Build heatmap
    heatmap = {}
    zones = list(PREL_CLUSTERS.keys())

    for fname in sorted(feature_zone_vals.keys()):
        entry = {}
        zone_means = {}
        for zone in zones:
            vals = feature_zone_vals[fname][zone]
            if vals:
                mu = round(mean(vals), 6)
                sigma = round(safe_stdev(vals), 6)
                entry[zone] = {"mu": mu, "sigma": sigma, "n": len(vals)}
                zone_means[zone] = mu
            else:
                entry[zone] = {"mu": None, "sigma": None, "n": 0}

        trend, peak_zone = compute_trend(zone_means)
        entry["trend"] = trend
        entry["peak_zone"] = peak_zone
        heatmap[fname] = entry

    log.info(f"  {len(heatmap)} features mapped across {len(zones)} zones")
    return heatmap


# ═══════════════════════════════════════════════════════════════════════
# ANALYSE 2 — PROFILS-TYPES PAR POSITION
# ═══════════════════════════════════════════════════════════════════════

def analyse_2_position_profiles(works: list) -> dict:
    log.info("\n" + "="*60)
    log.info("ANALYSE 2 — PROFILS-TYPES PAR POSITION")

    # Collect global mean per feature (all positions)
    global_vals = defaultdict(list)
    zone_vals = defaultdict(lambda: defaultdict(list))

    for work in works:
        for win in work["windows"]:
            if win.get("is_real_chapter"):
                continue
            p_rel = win.get("p_rel", 0)
            zone = prel_zone(p_rel)
            feats = get_numeric_features(win.get("features", {}))
            for fname, val in feats.items():
                global_vals[fname].append(val)
                zone_vals[zone][fname].append(val)

    # Global means
    global_means = {f: mean(v) for f, v in global_vals.items() if v}
    global_stdevs = {f: safe_stdev(v) for f, v in global_vals.items() if len(v) >= 2}

    profiles = {}
    zones = list(PREL_CLUSTERS.keys())

    for zone in zones:
        profile = {"mean_profile": {}, "signature_features": [], "n_samples": 0}
        n_samples = 0

        for fname in sorted(global_means.keys()):
            vals = zone_vals[zone].get(fname, [])
            if not vals:
                continue
            n_samples = max(n_samples, len(vals))
            mu_zone = mean(vals)
            mu_global = global_means.get(fname, 0)
            sigma_global = global_stdevs.get(fname, 1)

            profile["mean_profile"][fname] = round(mu_zone, 6)

            # Signature = diverges > 0.5 sigma from global mean
            if sigma_global > 0:
                z_score = (mu_zone - mu_global) / sigma_global
                if abs(z_score) > 0.5:
                    profile["signature_features"].append({
                        "feature": fname,
                        "zone_mean": round(mu_zone, 6),
                        "global_mean": round(mu_global, 6),
                        "z_score": round(z_score, 4),
                        "direction": "HIGH" if z_score > 0 else "LOW",
                    })

        profile["n_samples"] = n_samples
        # Sort signatures by absolute z-score
        profile["signature_features"].sort(key=lambda x: abs(x["z_score"]), reverse=True)
        profiles[zone] = profile

    log.info(f"  Profiles generated for {len(profiles)} zones")
    return profiles


# ═══════════════════════════════════════════════════════════════════════
# ANALYSE 3 — HOOKS ET CLIFFHANGERS
# ═══════════════════════════════════════════════════════════════════════

def compute_text_features(text: str) -> dict:
    """Compute F24-F38 features on raw text (no spaCy needed)."""
    sents = split_sentences(text)
    # We pass empty features dict for f24 (it needs prior features for banal/apex)
    # So we only compute features that don't depend on spaCy output
    out = {}
    out.update(compute_f25(text, sents))
    out.update(compute_f29(text))
    out.update(compute_f33_punctuation_ratio(text))
    out.update(compute_f34_paragraph_density(text))
    out.update(compute_f35_hook(text))
    out.update(compute_f36_cliffhanger(text))
    out.update(compute_f38_typographic_speed(text))

    # Also add basic rhythm features
    if sents:
        lens = [len(s.split()) for s in sents]
        out["f1_mean"] = round(mean(lens), 4) if lens else 0
        out["f1a_rhythm_variance"] = round(safe_stdev(lens), 4) if len(lens) >= 2 else 0
        out["f1_sentence_count"] = len(sents)

    return out


def build_catalog_lookup() -> dict:
    """Build a lookup: work_id -> catalog entry."""
    lookup = {}
    for w in CATALOG_PDF + CATALOG_PUBLIC:
        wid = make_work_id(w["author"], w["title"])
        lookup[wid] = w
    return lookup


def extract_full_text(cat_entry: dict) -> str:
    """Extract full text from a catalog entry (PDF or Gutenberg)."""
    # Try PDF/EPUB first
    raw = find_and_extract(cat_entry)
    if raw:
        return clean_text(raw)

    # Try Gutenberg
    gids = cat_entry.get("gutenberg_ids", [])
    if gids:
        raw = download_gutenberg(gids, TXT_DIR, cat_entry.get("title", "?"))
        if raw:
            return raw  # already cleaned by clean_gutenberg

    return ""


def analyse_3_hooks_cliffhangers(works: list) -> dict:
    log.info("\n" + "="*60)
    log.info("ANALYSE 3 — HOOKS ET CLIFFHANGERS")

    catalog = build_catalog_lookup()

    # Aggregate: feature -> {"hook": [vals], "cliff": [vals]}
    agg_hook = defaultdict(list)
    agg_cliff = defaultdict(list)
    agg_delta = defaultdict(list)
    per_work = []

    n_extracted = 0
    n_failed = 0

    for work in works:
        work_id = work["meta"]["work_id"]
        cat_entry = catalog.get(work_id)
        if not cat_entry:
            continue

        # Re-extract text from source
        try:
            text = extract_full_text(cat_entry)
            if not text:
                n_failed += 1
                continue
            chapters = split_chapters_v5(text)
            if len(chapters) < 2:
                n_failed += 1
                continue
        except Exception as e:
            log.warning(f"  Extract fail {work_id}: {e}")
            n_failed += 1
            continue

        n_extracted += 1
        work_hooks = []

        for i, chap in enumerate(chapters):
            words = chap.split()
            if len(words) < 200:
                continue

            hook_text = " ".join(words[:100])
            cliff_text = " ".join(words[-100:])

            hook_feats = compute_text_features(hook_text)
            cliff_feats = compute_text_features(cliff_text)

            # Aggregate
            for fname, val in hook_feats.items():
                if isinstance(val, (int, float)):
                    agg_hook[fname].append(val)
            for fname, val in cliff_feats.items():
                if isinstance(val, (int, float)):
                    agg_cliff[fname].append(val)

            # Delta
            for fname in hook_feats:
                hv = hook_feats.get(fname)
                cv = cliff_feats.get(fname)
                if isinstance(hv, (int, float)) and isinstance(cv, (int, float)):
                    agg_delta[fname].append(cv - hv)

            work_hooks.append({
                "chapter_idx": i,
                "hook_features": {k: v for k, v in hook_feats.items() if isinstance(v, (int, float))},
                "cliff_features": {k: v for k, v in cliff_feats.items() if isinstance(v, (int, float))},
            })

        if work_hooks:
            per_work.append({
                "work_id": work_id,
                "n_chapters": len(work_hooks),
                "chapters": work_hooks,
            })

    # Build summary
    summary = {"hook_profile": {}, "cliff_profile": {}, "delta_profile": {},
               "features_increasing_at_end": [], "features_decreasing_at_end": []}

    all_features = sorted(set(list(agg_hook.keys()) + list(agg_cliff.keys())))

    for fname in all_features:
        h_vals = agg_hook.get(fname, [])
        c_vals = agg_cliff.get(fname, [])
        d_vals = agg_delta.get(fname, [])

        if h_vals:
            summary["hook_profile"][fname] = {
                "mu": round(mean(h_vals), 6),
                "sigma": round(safe_stdev(h_vals), 6),
                "n": len(h_vals),
            }
        if c_vals:
            summary["cliff_profile"][fname] = {
                "mu": round(mean(c_vals), 6),
                "sigma": round(safe_stdev(c_vals), 6),
                "n": len(c_vals),
            }
        if d_vals and len(d_vals) >= 10:
            mu_delta = mean(d_vals)
            sigma_delta = safe_stdev(d_vals)
            # Significant if |mu_delta| > 0.3 * sigma_delta
            if sigma_delta > 0 and abs(mu_delta) > 0.3 * sigma_delta:
                entry = {"feature": fname, "mean_delta": round(mu_delta, 6),
                         "sigma_delta": round(sigma_delta, 6), "n": len(d_vals)}
                if mu_delta > 0:
                    summary["features_increasing_at_end"].append(entry)
                else:
                    summary["features_decreasing_at_end"].append(entry)

    summary["features_increasing_at_end"].sort(key=lambda x: abs(x["mean_delta"]), reverse=True)
    summary["features_decreasing_at_end"].sort(key=lambda x: abs(x["mean_delta"]), reverse=True)

    result = {
        "summary": summary,
        "n_works_extracted": n_extracted,
        "n_works_failed": n_failed,
        "per_work": per_work,
    }

    log.info(f"  Extracted hooks/cliffs from {n_extracted} works ({n_failed} failed)")
    log.info(f"  Features increasing at chapter end: {len(summary['features_increasing_at_end'])}")
    log.info(f"  Features decreasing at chapter end: {len(summary['features_decreasing_at_end'])}")
    return result


# ═══════════════════════════════════════════════════════════════════════
# ANALYSE 4 — DISTRIBUTION DES CHAPITRES
# ═══════════════════════════════════════════════════════════════════════

def analyse_4_chapter_distribution(works: list) -> dict:
    log.info("\n" + "="*60)
    log.info("ANALYSE 4 — DISTRIBUTION DES CHAPITRES")

    by_lang = defaultdict(list)
    by_author = defaultdict(list)
    by_century = defaultdict(list)
    per_work = []

    for work in works:
        meta = work["meta"]
        lang = meta.get("lang_original", "?")
        author = meta.get("author", "?")
        year = meta.get("year", 0)
        work_id = meta.get("work_id", "?")
        total_words = meta.get("word_count", 0)

        # Get real chapter windows
        real_chapters = [w for w in work["windows"] if w.get("is_real_chapter")]
        if not real_chapters:
            continue

        chap_lengths = [w["word_count"] for w in real_chapters]
        n_chapters = len(chap_lengths)
        mu = mean(chap_lengths)
        sigma = safe_stdev(chap_lengths)
        cv = sigma / mu if mu > 0 else 0

        work_entry = {
            "work_id": work_id,
            "author": author,
            "lang": lang,
            "year": year,
            "total_words": total_words,
            "n_chapters": n_chapters,
            "mean_chapter_words": round(mu, 1),
            "stdev_chapter_words": round(sigma, 1),
            "cv_chapter_length": round(cv, 4),
            "min_chapter_words": min(chap_lengths),
            "max_chapter_words": max(chap_lengths),
        }
        per_work.append(work_entry)

        # Aggregate
        by_lang[lang].extend(chap_lengths)
        by_author[author].extend(chap_lengths)

        # Century
        if year > 0:
            if year < 1900:
                century = "<1900"
            elif year < 1950:
                century = "1900-1950"
            elif year < 2000:
                century = "1950-2000"
            else:
                century = ">2000"
            by_century[century].extend(chap_lengths)

    # Aggregate stats
    def agg_stats(vals):
        if not vals:
            return {}
        return {
            "mu": round(mean(vals), 1),
            "sigma": round(safe_stdev(vals), 1),
            "median": round(median(vals), 1),
            "min": min(vals),
            "max": max(vals),
            "n_chapters": len(vals),
            "cv": round(safe_stdev(vals) / mean(vals), 4) if mean(vals) > 0 else 0,
        }

    lang_stats = {k: agg_stats(v) for k, v in sorted(by_lang.items())}

    # Authors with 3+ works
    author_work_count = defaultdict(int)
    for w in per_work:
        author_work_count[w["author"]] += 1
    author_stats = {}
    for a, vals in sorted(by_author.items()):
        if author_work_count[a] >= 3:
            author_stats[a] = agg_stats(vals)

    century_stats = {k: agg_stats(v) for k, v in sorted(by_century.items())}

    # Regularity ranking
    per_work_sorted_regular = sorted(
        [w for w in per_work if w["n_chapters"] >= 3],
        key=lambda x: x["cv_chapter_length"]
    )
    most_regular = per_work_sorted_regular[:10] if per_work_sorted_regular else []
    most_irregular = per_work_sorted_regular[-10:][::-1] if per_work_sorted_regular else []

    # Correlation: total_words vs n_chapters
    valid = [(w["total_words"], w["n_chapters"]) for w in per_work
             if w["total_words"] > 0 and w["n_chapters"] >= 2]
    if len(valid) >= 5:
        x = [v[0] for v in valid]
        y = [v[1] for v in valid]
        mx, my = mean(x), mean(y)
        sx, sy = safe_stdev(x), safe_stdev(y)
        if sx > 0 and sy > 0:
            cov = mean((xi - mx) * (yi - my) for xi, yi in zip(x, y))
            correlation = round(cov / (sx * sy), 4)
        else:
            correlation = 0
    else:
        correlation = None

    result = {
        "by_language": lang_stats,
        "by_author_3plus": author_stats,
        "by_century": century_stats,
        "most_regular_10": most_regular,
        "most_irregular_10": most_irregular,
        "correlation_words_vs_chapters": correlation,
        "per_work": per_work,
        "n_works": len(per_work),
    }

    log.info(f"  {len(per_work)} works with chapters")
    log.info(f"  Languages: {list(lang_stats.keys())}")
    log.info(f"  Authors (3+ works): {len(author_stats)}")
    log.info(f"  Correlation total_words/n_chapters: {correlation}")
    return result


# ═══════════════════════════════════════════════════════════════════════
# ANALYSE 5 — DÉTECTION DES MOMENTS CLÉS
# ═══════════════════════════════════════════════════════════════════════

def analyse_5_key_moments(works: list) -> dict:
    log.info("\n" + "="*60)
    log.info("ANALYSE 5 — DETECTION DES MOMENTS CLES")

    all_moments = []
    moment_prel = defaultdict(list)  # moment_type -> [p_rel values]

    for work in works:
        work_id = work["meta"]["work_id"]
        real_chapters = [w for w in work["windows"] if w.get("is_real_chapter")]
        if len(real_chapters) < 3:
            continue

        # Compute per-feature mean and stdev for this work
        work_feat_vals = defaultdict(list)
        for chap in real_chapters:
            feats = get_numeric_features(chap.get("features", {}))
            for fname, val in feats.items():
                work_feat_vals[fname].append(val)

        work_means = {f: mean(v) for f, v in work_feat_vals.items() if v}
        work_stdevs = {f: safe_stdev(v) for f, v in work_feat_vals.items() if len(v) >= 2}

        moments = []
        for chap in real_chapters:
            feats = get_numeric_features(chap.get("features", {}))
            chap_idx = chap.get("chapter_idx", -1)
            p_rel = chap.get("p_rel", 0)

            for moment_type, feature_list in MOMENT_FEATURES.items():
                for fname in feature_list:
                    val = feats.get(fname)
                    mu = work_means.get(fname)
                    sigma = work_stdevs.get(fname)
                    if val is None or mu is None or sigma is None or sigma == 0:
                        continue

                    z = (val - mu) / sigma
                    if abs(z) > 2.0:
                        moment = {
                            "chapter_idx": chap_idx,
                            "p_rel": p_rel,
                            "type": moment_type,
                            "feature": fname,
                            "value": round(val, 6),
                            "z_score": round(z, 4),
                        }
                        moments.append(moment)
                        moment_prel[moment_type].append(p_rel)

        if moments:
            all_moments.append({
                "work_id": work_id,
                "n_chapters": len(real_chapters),
                "moments": moments,
            })

    # Aggregate: where do moments cluster by P_rel?
    moment_concentration = {}
    for mtype, prels in moment_prel.items():
        if not prels:
            continue
        # Distribution across zones
        zone_counts = defaultdict(int)
        for p in prels:
            zone_counts[prel_zone(p)] += 1
        total = len(prels)
        moment_concentration[mtype] = {
            "total_occurrences": total,
            "mean_prel": round(mean(prels), 4),
            "median_prel": round(median(prels), 4),
            "by_zone": {z: {"count": zone_counts.get(z, 0),
                            "pct": round(100 * zone_counts.get(z, 0) / total, 1)}
                        for z in PREL_CLUSTERS.keys()},
        }

    result = {
        "moment_concentration": moment_concentration,
        "n_works_with_moments": len(all_moments),
        "per_work": all_moments,
    }

    log.info(f"  {len(all_moments)} works with key moments detected")
    for mt, mc in moment_concentration.items():
        log.info(f"  {mt}: {mc['total_occurrences']} occurrences, median P_rel={mc['median_prel']}")
    return result


# ═══════════════════════════════════════════════════════════════════════
# ANALYSE 6 — ENRICHIR LA CLASSIFICATION DES PASSAGES
# ═══════════════════════════════════════════════════════════════════════

def analyse_6_passage_types(works: list) -> dict:
    log.info("\n" + "="*60)
    log.info("ANALYSE 6 — CLASSIFICATION ENRICHIE DES PASSAGES")

    # Step 1: Collect all feature values from fixed windows to compute percentiles
    all_feat_vals = defaultdict(list)
    windows_data = []  # (work_id, p_rel, features, passage_type_r1)

    for work in works:
        work_id = work["meta"]["work_id"]
        lang = work["meta"].get("lang_original", "?")
        for win in work["windows"]:
            if win.get("is_real_chapter"):
                continue
            feats = get_numeric_features(win.get("features", {}))
            for fname, val in feats.items():
                all_feat_vals[fname].append(val)
            windows_data.append({
                "work_id": work_id,
                "lang": lang,
                "p_rel": win.get("p_rel", 0),
                "features": feats,
                "type_r1": win.get("passage_type", "UNKNOWN"),
            })

    # Step 2: Compute percentiles for classification features
    percentiles = {}
    for fname in PASSAGE_TYPE_FEATURES:
        vals = sorted(all_feat_vals.get(fname, []))
        if len(vals) < 10:
            continue
        n = len(vals)
        percentiles[fname] = {
            "p25": vals[n // 4],
            "p50": vals[n // 2],
            "p75": vals[3 * n // 4],
            "p90": vals[int(n * 0.9)],
            "mean": mean(vals),
        }

    log.info(f"  Computed percentiles for {len(percentiles)} classification features")

    # Step 3: Classify each window with empirical thresholds
    def classify_empirical(feats: dict) -> str:
        """Classify using empirical percentile thresholds."""
        dots = feats.get("f33a_dots_count", 0)
        para = feats.get("f34b_para_per_1000w", 0)
        f1 = feats.get("f1_mean", 0)
        verb = feats.get("f5a_verb_density", 0)
        speed = feats.get("f38c_speed_score", 0)
        desc = feats.get("f25g_description_score", 0)
        sil = feats.get("f28d_sil_score", 0)
        modal = feats.get("f27d_modal_score", 0)
        tense_sw = feats.get("f12b_tense_switch_rate", 0)

        p = percentiles

        # DIALOGUE: high dots + high para density + low sentence length
        if ("f33a_dots_count" in p and "f34b_para_per_1000w" in p and
            dots > p["f33a_dots_count"]["p75"] and
            para > p["f34b_para_per_1000w"]["p75"]):
            return "DIALOGUE"

        # INTROSPECTION: high SIL + high modal
        if ("f28d_sil_score" in p and "f27d_modal_score" in p and
            sil > p["f28d_sil_score"]["p75"] and
            modal > p["f27d_modal_score"]["p75"]):
            return "INTROSPECTION"

        # ACTION: high verb density + low sentence length + high speed
        if ("f5a_verb_density" in p and "f1_mean" in p and
            verb > p["f5a_verb_density"]["p75"] and
            f1 < p["f1_mean"]["p25"] and
            speed > p.get("f38c_speed_score", {}).get("p50", 0)):
            return "ACTION"

        # TRANSITION: high tense switches + moderate everything else
        if ("f12b_tense_switch_rate" in p and
            tense_sw > p["f12b_tense_switch_rate"]["p75"]):
            # Only if other features are moderate (not extreme)
            extreme_count = 0
            for fname in ["f25g_description_score", "f28d_sil_score", "f5a_verb_density"]:
                if fname in p and fname in feats:
                    if feats[fname] > p[fname]["p90"] or feats[fname] < p[fname].get("p25", 0) * 0.5:
                        extreme_count += 1
            if extreme_count == 0:
                return "TRANSITION"

        # DESCRIPTION: high description score + high sentence length + low verb density
        if ("f25g_description_score" in p and
            desc > p["f25g_description_score"]["p50"] and
            f1 > p.get("f1_mean", {}).get("p50", 0)):
            return "DESCRIPTION"

        # Default: DESCRIPTION (most common in narrative)
        return "DESCRIPTION"

    # Step 4: Reclassify all windows
    type_counts = defaultdict(int)
    type_by_lang = defaultdict(lambda: defaultdict(int))
    type_by_zone = defaultdict(lambda: defaultdict(int))
    type_feat_vals = defaultdict(lambda: defaultdict(list))

    for wdata in windows_data:
        new_type = classify_empirical(wdata["features"])
        type_counts[new_type] += 1
        type_by_lang[wdata["lang"]][new_type] += 1
        zone = prel_zone(wdata["p_rel"])
        type_by_zone[zone][new_type] += 1

        for fname, val in wdata["features"].items():
            type_feat_vals[new_type][fname].append(val)

    # Step 5: Build type profiles (mean features per type)
    type_profiles = {}
    for ptype in sorted(type_counts.keys()):
        feat_means = {}
        for fname, vals in type_feat_vals[ptype].items():
            if vals:
                feat_means[fname] = round(mean(vals), 6)
        type_profiles[ptype] = {
            "count": type_counts[ptype],
            "pct": round(100 * type_counts[ptype] / len(windows_data), 1),
            "mean_features": feat_means,
        }

    # Convert defaultdicts
    dist_by_lang = {lang: dict(counts) for lang, counts in type_by_lang.items()}
    dist_by_zone = {zone: dict(counts) for zone, counts in type_by_zone.items()}

    result = {
        "classification_thresholds": {fname: {k: round(v, 6) for k, v in pdata.items()}
                                      for fname, pdata in percentiles.items()},
        "distribution_total": dict(type_counts),
        "distribution_by_language": dist_by_lang,
        "distribution_by_prel_zone": dist_by_zone,
        "type_profiles": type_profiles,
        "n_windows_classified": len(windows_data),
    }

    log.info(f"  Classified {len(windows_data)} windows")
    for t, c in sorted(type_counts.items()):
        log.info(f"    {t}: {c} ({100*c/len(windows_data):.1f}%)")
    return result


# ═══════════════════════════════════════════════════════════════════════
# ANALYSE 7 — NATURALITÉ DE COUPURE
# ═══════════════════════════════════════════════════════════════════════

def analyse_7_cut_naturalness(works: list) -> dict:
    log.info("\n" + "="*60)
    log.info("ANALYSE 7 — NATURALITE DE COUPURE")

    catalog = build_catalog_lookup()
    per_work = []
    author_naturalness = defaultdict(list)

    n_extracted = 0
    n_failed = 0

    for work in works:
        work_id = work["meta"]["work_id"]
        author = work["meta"].get("author", "?")
        cat_entry = catalog.get(work_id)
        if not cat_entry:
            continue

        # Re-extract text from source
        try:
            text = extract_full_text(cat_entry)
            if not text:
                n_failed += 1
                continue
            chapters = split_chapters_v5(text)
            if len(chapters) < 3:
                n_failed += 1
                continue
        except Exception as e:
            log.warning(f"  Extract fail {work_id}: {e}")
            n_failed += 1
            continue

        n_extracted += 1

        # Compute features for last 300 words of each chapter and first 300 of next
        boundaries = []
        for i in range(len(chapters) - 1):
            words_end = chapters[i].split()
            words_start = chapters[i + 1].split()

            if len(words_end) < 300 or len(words_start) < 300:
                # Use what we have
                end_text = " ".join(words_end[-min(300, len(words_end)):])
                start_text = " ".join(words_start[:min(300, len(words_start))])
            else:
                end_text = " ".join(words_end[-300:])
                start_text = " ".join(words_start[:300])

            end_feats = compute_text_features(end_text)
            start_feats = compute_text_features(start_text)

            # Compute delta across all common features
            deltas = {}
            common = set(end_feats.keys()) & set(start_feats.keys())
            for fname in common:
                ev = end_feats[fname]
                sv = start_feats[fname]
                if isinstance(ev, (int, float)) and isinstance(sv, (int, float)):
                    deltas[fname] = abs(sv - ev)

            if deltas:
                mean_delta = mean(deltas.values())
                boundaries.append({
                    "boundary_idx": i,
                    "mean_delta": round(mean_delta, 6),
                    "max_delta_feature": max(deltas, key=deltas.get),
                    "max_delta_value": round(max(deltas.values()), 6),
                })

        if boundaries:
            naturalness = mean(b["mean_delta"] for b in boundaries)
            work_entry = {
                "work_id": work_id,
                "author": author,
                "n_boundaries": len(boundaries),
                "naturalness_index": round(naturalness, 6),
                "boundaries": boundaries,
            }
            per_work.append(work_entry)
            author_naturalness[author].append(naturalness)

    # Author ranking
    author_ranking = []
    for author, values in sorted(author_naturalness.items()):
        if values:
            author_ranking.append({
                "author": author,
                "mean_naturalness": round(mean(values), 6),
                "n_works": len(values),
            })

    author_ranking.sort(key=lambda x: x["mean_naturalness"])
    smooth_cuts = author_ranking[:10] if author_ranking else []
    sharp_cuts = author_ranking[-10:][::-1] if author_ranking else []

    result = {
        "n_works_analyzed": n_extracted,
        "n_works_failed": n_failed,
        "smooth_cuts_top10": smooth_cuts,
        "sharp_cuts_top10": sharp_cuts,
        "author_ranking": author_ranking,
        "per_work": per_work,
    }

    log.info(f"  Analyzed {n_extracted} works ({n_failed} failed)")
    if smooth_cuts:
        log.info(f"  Smoothest cuts: {smooth_cuts[0]['author']} ({smooth_cuts[0]['mean_naturalness']:.4f})")
    if sharp_cuts:
        log.info(f"  Sharpest cuts: {sharp_cuts[0]['author']} ({sharp_cuts[0]['mean_naturalness']:.4f})")
    return result


# ═══════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════

def save_json(data: dict, filename: str):
    """Save JSON with metadata."""
    out = {
        "generated_at": datetime.now().isoformat(),
        "generator": "r2_topology.py",
        "standard": "NASA-Grade L4 / DO-178C Level A",
        **data,
    }
    path = R2_DIR / filename
    path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    size_kb = path.stat().st_size / 1024
    log.info(f"  -> {filename} ({size_kb:.0f} KB)")
    return path


def main():
    t0 = time.time()
    log.info("="*70)
    log.info("OMEGA — Phase R2 : Topologie Narrative")
    log.info("="*70)

    # Load all R1 data
    works = load_all_r1()
    if not works:
        log.error("No R1 data found!")
        return

    log.info(f"Corpus: {len(works)} works loaded")

    # ─── ANALYSE 1 ──────────────────────────────────────────────────
    heatmap = analyse_1_prel_heatmap(works)
    save_json(heatmap, "OMEGA_PREL_HEATMAP.json")

    # ─── ANALYSE 2 ──────────────────────────────────────────────────
    profiles = analyse_2_position_profiles(works)
    save_json(profiles, "OMEGA_POSITION_PROFILES.json")

    # ─── ANALYSE 4 ──────────────────────────────────────────────────
    # (Before 3 because 3 and 7 need text re-extraction)
    chapters = analyse_4_chapter_distribution(works)
    save_json(chapters, "OMEGA_CHAPTER_DISTRIBUTION.json")

    # ─── ANALYSE 5 ──────────────────────────────────────────────────
    moments = analyse_5_key_moments(works)
    save_json(moments, "OMEGA_KEY_MOMENTS.json")

    # ─── ANALYSE 6 ──────────────────────────────────────────────────
    passages = analyse_6_passage_types(works)
    save_json(passages, "OMEGA_PASSAGE_TYPES.json")

    # ─── ANALYSE 3 (needs text re-extraction) ─────────────────────
    hooks = analyse_3_hooks_cliffhangers(works)
    save_json(hooks, "OMEGA_HOOKS_CLIFFHANGERS.json")

    # ─── ANALYSE 7 (needs text re-extraction) ─────────────────────
    naturalness = analyse_7_cut_naturalness(works)
    save_json(naturalness, "OMEGA_CUT_NATURALNESS.json")

    # ─── SUMMARY ────────────────────────────────────────────────────
    elapsed = time.time() - t0
    log.info("\n" + "="*70)
    log.info(f"R2 COMPLETE — {elapsed:.0f}s total")
    log.info(f"  7 JSON files in {R2_DIR}/")
    log.info("="*70)


if __name__ == "__main__":
    main()
