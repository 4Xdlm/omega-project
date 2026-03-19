#!/usr/bin/env python3
"""
OMEGA — Phase R3 : Coefficients Proportionnels
Cristallise les données R1+R2 en constantes exploitables par le scorer R4.

Usage : .venv311/Scripts/python.exe r3_coefficients.py

Produit :
  - OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json (sections 3.1-3.7)
  - OMEGA_BACKTEST_R3.json (section 3.8)
  - OMEGA_UNPROVEN_RESOLVED.json (section 4)
"""

import json, sys, math, time
from pathlib import Path
from datetime import datetime
from statistics import mean, stdev, median
from collections import defaultdict

sys.path.insert(0, str(Path(__file__).parent))
from v5_config import log

# ═══════════════════════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════════════════════

R1_DIR = Path("results_r1")
R2_DIR = Path("results_r2")
R3_DIR = Path("results_r3")
R3_DIR.mkdir(exist_ok=True)

STANDARD_WINDOWS = [30, 150, 300, 600, 1000, 1500, 2500, 5000, 10000, 20000]
STANDARD_WINDOWS_STR = [str(w) for w in STANDARD_WINDOWS]

CONFIDENCE_DISABLE_THRESHOLD = 0.20
LANGUAGE_DIFF_THRESHOLD = 0.20

PREL_ZONES = ["OPENING", "SETUP", "MIDDLE", "TENSION", "CLOSING"]
PASSAGE_TYPES = ["DESCRIPTION", "DIALOGUE", "ACTION", "INTROSPECTION", "TRANSITION"]

# Reference tailles for weight tables
TAILLE_LOCAL = 600    # typical scene size
TAILLE_ARC = 2500     # target chapter size


# ═══════════════════════════════════════════════════════════════════════
# DATA LOADING
# ═══════════════════════════════════════════════════════════════════════

def load_metrologie():
    path = R1_DIR / "OMEGA_METROLOGIE_EMPIRIQUE_v1.json"
    return json.loads(path.read_text(encoding="utf-8"))

def load_r2_json(name):
    path = R2_DIR / name
    return json.loads(path.read_text(encoding="utf-8"))

def load_all_r1_works():
    works = []
    for f in sorted(R1_DIR.glob("*.json")):
        if f.name.startswith("OMEGA_") or f.name.startswith("r1_"):
            continue
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            if "gate_fail" not in data.get("meta", {}):
                works.append(data)
        except Exception:
            pass
    return works

def safe_stdev(vals):
    return stdev(vals) if len(vals) >= 2 else 0.0


# ═══════════════════════════════════════════════════════════════════════
# 3.1 — CONFIDENCE TABLE
# ═══════════════════════════════════════════════════════════════════════

def compute_confidence_table(cv_matrix):
    log.info("\n" + "="*60)
    log.info("3.1 — CONFIDENCE TABLE")

    table = {}
    for feat in sorted(cv_matrix.keys()):
        feat_conf = {}
        for ws in STANDARD_WINDOWS_STR:
            entry = cv_matrix[feat].get(ws)
            if entry and entry.get("n_samples", 0) >= 10:
                cv = entry["cv"]
                conf = max(0.0, min(1.0, 1.0 - cv))
                feat_conf[ws] = round(conf, 4)
            else:
                feat_conf[ws] = None
        table[feat] = feat_conf

    # Stats
    n_features = len(table)
    active_at_300 = sum(1 for f in table.values() if f.get("300") is not None and f["300"] >= CONFIDENCE_DISABLE_THRESHOLD)
    active_at_600 = sum(1 for f in table.values() if f.get("600") is not None and f["600"] >= CONFIDENCE_DISABLE_THRESHOLD)
    active_at_2500 = sum(1 for f in table.values() if f.get("2500") is not None and f["2500"] >= CONFIDENCE_DISABLE_THRESHOLD)

    log.info(f"  {n_features} features in confidence table")
    log.info(f"  Active (conf >= {CONFIDENCE_DISABLE_THRESHOLD}) at 300w: {active_at_300}")
    log.info(f"  Active at 600w: {active_at_600}")
    log.info(f"  Active at 2500w: {active_at_2500}")

    return table


# ═══════════════════════════════════════════════════════════════════════
# 3.2 — DISABLED TABLE
# ═══════════════════════════════════════════════════════════════════════

def compute_disabled_table(confidence_table):
    log.info("\n" + "="*60)
    log.info("3.2 — DISABLED TABLE")

    disabled = {}
    never_active = []

    for feat, confs in confidence_table.items():
        # Find smallest window where confidence >= threshold
        min_active = None
        for ws in STANDARD_WINDOWS_STR:
            c = confs.get(ws)
            if c is not None and c >= CONFIDENCE_DISABLE_THRESHOLD:
                min_active = int(ws)
                break

        if min_active is None:
            disabled[feat] = 99999  # never active
            never_active.append(feat)
        elif min_active == 30:
            disabled[feat] = 0  # active from smallest window
        else:
            disabled[feat] = min_active

    log.info(f"  Features active from 30w: {sum(1 for v in disabled.values() if v == 0)}")
    log.info(f"  Features NEVER active: {len(never_active)}")
    if never_active:
        for f in never_active[:10]:
            log.info(f"    OFF: {f}")

    return disabled, never_active


# ═══════════════════════════════════════════════════════════════════════
# 3.3 — WEIGHT TABLE PAR ÉTAGE
# ═══════════════════════════════════════════════════════════════════════

def compute_weight_table(confidence_table, derived_constants):
    log.info("\n" + "="*60)
    log.info("3.3 — WEIGHT TABLE PAR ETAGE")

    local_key = str(TAILLE_LOCAL)
    arc_key = str(TAILLE_ARC)

    weight_local = {}
    weight_arc = {}

    for feat, confs in confidence_table.items():
        classification = derived_constants.get(feat, {}).get("classification", "UNKNOWN")

        # LOCAL stage: only LOCAL features
        conf_local = confs.get(local_key)
        if classification == "LOCAL" and conf_local is not None:
            weight_local[feat] = {
                "classification": classification,
                "confidence": conf_local,
                "weight_effective": round(conf_local, 4),
            }

        # ARC stage: LOCAL + ARC features
        conf_arc = confs.get(arc_key)
        if conf_arc is not None and classification in ("LOCAL", "ARC"):
            weight_arc[feat] = {
                "classification": classification,
                "confidence": conf_arc,
                "weight_effective": round(conf_arc, 4),
            }

    # Filter out disabled features
    weight_local = {f: w for f, w in weight_local.items() if w["weight_effective"] >= CONFIDENCE_DISABLE_THRESHOLD}
    weight_arc = {f: w for f, w in weight_arc.items() if w["weight_effective"] >= CONFIDENCE_DISABLE_THRESHOLD}

    log.info(f"  LOCAL_{TAILLE_LOCAL}: {len(weight_local)} active features")
    log.info(f"  ARC_{TAILLE_ARC}: {len(weight_arc)} active features")

    return {
        f"LOCAL_{TAILLE_LOCAL}": weight_local,
        f"ARC_{TAILLE_ARC}": weight_arc,
    }


# ═══════════════════════════════════════════════════════════════════════
# 3.4 — POSITION MODIFIERS
# ═══════════════════════════════════════════════════════════════════════

def compute_position_modifiers(heatmap):
    log.info("\n" + "="*60)
    log.info("3.4 — POSITION MODIFIERS")

    modifiers = {}
    for feat, data in heatmap.items():
        if not isinstance(data, dict) or "trend" not in data:
            continue
        trend = data.get("trend")
        if trend == "STABLE":
            continue

        # Compute global mean (weighted by n)
        total_sum = 0
        total_n = 0
        zone_vals = {}
        for zone in PREL_ZONES:
            entry = data.get(zone, {})
            mu = entry.get("mu")
            n = entry.get("n", 0)
            if mu is not None and n > 0:
                total_sum += mu * n
                total_n += n
                zone_vals[zone] = mu

        if total_n == 0:
            continue
        global_mean = total_sum / total_n

        if abs(global_mean) < 1e-10:
            continue

        # Compute modifiers
        feat_mods = {"trend": trend}
        for zone in PREL_ZONES:
            if zone in zone_vals:
                feat_mods[zone] = round(zone_vals[zone] / global_mean, 4)
            else:
                feat_mods[zone] = 1.0

        modifiers[feat] = feat_mods

    log.info(f"  {len(modifiers)} features with position modifiers (non-STABLE)")
    return modifiers


# ═══════════════════════════════════════════════════════════════════════
# 3.5 — TYPE MODIFIERS
# ═══════════════════════════════════════════════════════════════════════

def compute_type_modifiers(passage_types):
    log.info("\n" + "="*60)
    log.info("3.5 — TYPE MODIFIERS")

    profiles = passage_types.get("type_profiles", {})

    # Compute global mean across all types (weighted by count)
    global_sum = defaultdict(float)
    global_n = defaultdict(int)
    for ptype, profile in profiles.items():
        count = profile.get("count", 0)
        for feat, val in profile.get("mean_features", {}).items():
            global_sum[feat] += val * count
            global_n[feat] += count

    global_means = {}
    for feat in global_sum:
        if global_n[feat] > 0:
            global_means[feat] = global_sum[feat] / global_n[feat]

    # Compute modifiers per type
    modifiers = {}
    for ptype in PASSAGE_TYPES:
        profile = profiles.get(ptype, {})
        mf = profile.get("mean_features", {})
        type_mods = {}
        for feat, val in mf.items():
            gm = global_means.get(feat, 0)
            if abs(gm) > 1e-10:
                mod = val / gm
                # Only include if modifier is significant (>10% deviation)
                if abs(mod - 1.0) > 0.10:
                    type_mods[feat] = round(mod, 4)
        modifiers[ptype] = type_mods

    for ptype, mods in modifiers.items():
        log.info(f"  {ptype}: {len(mods)} significant modifiers")

    return modifiers


# ═══════════════════════════════════════════════════════════════════════
# 3.6 — LANGUAGE MODIFIERS
# ═══════════════════════════════════════════════════════════════════════

def compute_language_dependency(cv_by_language):
    log.info("\n" + "="*60)
    log.info("3.6 — LANGUAGE DEPENDENCY")

    ref_window = "600"  # reference window for comparison
    langs = ["fr", "en", "es"]

    dependency = {}
    n_dependent = 0
    n_universal = 0
    n_insufficient = 0

    for feat in sorted(cv_by_language.keys()):
        ws_data = cv_by_language[feat].get(ref_window, {})

        cvs = {}
        for lang in langs:
            if lang in ws_data and ws_data[lang].get("n", 0) >= 30:
                cvs[lang] = ws_data[lang]["cv"]

        if len(cvs) < 2:
            n_insufficient += 1
            continue

        cv_vals = list(cvs.values())
        max_diff = max(cv_vals) - min(cv_vals)

        entry = {
            f"cv_{ref_window}": cvs,
        }

        if max_diff > LANGUAGE_DIFF_THRESHOLD:
            entry["status"] = "LANGUAGE_DEPENDENT"
            # Find which language diverges
            mean_cv = mean(cv_vals)
            divergent = {l: round(c - mean_cv, 4) for l, c in cvs.items() if abs(c - mean_cv) > 0.10}
            if divergent:
                entry["divergent_langs"] = divergent
            n_dependent += 1
        else:
            entry["status"] = "UNIVERSAL"
            n_universal += 1

        dependency[feat] = entry

    log.info(f"  UNIVERSAL: {n_universal}")
    log.info(f"  LANGUAGE_DEPENDENT: {n_dependent}")
    log.info(f"  INSUFFICIENT_SAMPLE: {n_insufficient}")

    return dependency


# ═══════════════════════════════════════════════════════════════════════
# 3.7 — SCORING FORMULA (α/β derivés)
# ═══════════════════════════════════════════════════════════════════════

def compute_scoring_formula(confidence_table, derived_constants):
    log.info("\n" + "="*60)
    log.info("3.7 — SCORING FORMULA (alpha/beta)")

    formula = {}

    for taille in STANDARD_WINDOWS:
        ws_key = str(taille)

        # Count features with conf > 0.80 at this window size
        local_active = 0
        arc_active = 0
        total_active = 0

        for feat, confs in confidence_table.items():
            c = confs.get(ws_key)
            if c is None or c < 0.80:
                continue
            total_active += 1
            classification = derived_constants.get(feat, {}).get("classification", "UNKNOWN")
            if classification == "LOCAL":
                local_active += 1
            elif classification == "ARC":
                arc_active += 1

        if total_active > 0:
            alpha = round(local_active / total_active, 4)
            beta = round(1.0 - alpha, 4)
        else:
            alpha = 1.0
            beta = 0.0

        formula[ws_key] = {
            "alpha_LOCAL": alpha,
            "beta_ARC": beta,
            "n_local_active": local_active,
            "n_arc_active": arc_active,
            "n_total_active": total_active,
        }
        log.info(f"  {taille:>6d}w: alpha={alpha:.3f} beta={beta:.3f} (LOCAL={local_active}, ARC={arc_active})")

    return formula


# ═══════════════════════════════════════════════════════════════════════
# 3.8 — BACKTEST
# ═══════════════════════════════════════════════════════════════════════

def compute_backtest(works, confidence_table, derived_constants, weight_table):
    log.info("\n" + "="*60)
    log.info("3.8 — BACKTEST SUR CORPUS")

    weights_local = weight_table.get(f"LOCAL_{TAILLE_LOCAL}", {})
    weights_arc = weight_table.get(f"ARC_{TAILLE_ARC}", {})

    work_scores = []

    for work in works:
        meta = work["meta"]
        work_id = meta.get("work_id", "?")
        author = meta.get("author", "?")
        title = meta.get("title", "?")
        lang = meta.get("lang_original", "?")

        # Get real chapter windows for ARC scoring
        real_chapters = [w for w in work["windows"] if w.get("is_real_chapter")]
        # Get fixed windows near 600 for LOCAL scoring
        local_windows = [w for w in work["windows"]
                         if not w.get("is_real_chapter") and w.get("window_size") == 600]

        # LOCAL score: average features from 600-word windows
        local_score = compute_stage_score(local_windows, weights_local)

        # ARC score: average features from real chapters
        arc_score = compute_stage_score(real_chapters, weights_arc)

        # Composite: use alpha/beta for 600 words (current bench size)
        alpha = 0.85  # will be overridden by formula
        beta = 0.15
        composite = alpha * local_score + beta * arc_score if local_score is not None else None

        work_scores.append({
            "work_id": work_id,
            "author": author,
            "title": title,
            "lang": lang,
            "score_local": round(local_score, 6) if local_score is not None else None,
            "score_arc": round(arc_score, 6) if arc_score is not None else None,
            "score_composite": round(composite, 6) if composite is not None else None,
        })

    # Sort by composite score
    scored = [w for w in work_scores if w["score_composite"] is not None]
    scored.sort(key=lambda x: x["score_composite"], reverse=True)

    # Check literary coherence
    median_score = median([w["score_composite"] for w in scored]) if scored else 0
    reference_authors = ["flaubert", "proust", "camus", "hugo", "balzac", "zola",
                         "dickens", "austen", "woolf", "faulkner", "cervantes", "marquez"]
    coherence_check = []
    for author in reference_authors:
        author_works = [w for w in scored if w["author"] == author]
        if author_works:
            best = max(author_works, key=lambda x: x["score_composite"])
            rank = scored.index(best) + 1
            status = "ABOVE_MEDIAN" if best["score_composite"] >= median_score else "BELOW_MEDIAN"
            coherence_check.append({
                "author": author,
                "best_work": best["title"],
                "score": best["score_composite"],
                "rank": rank,
                "total": len(scored),
                "status": status,
            })

    n_above = sum(1 for c in coherence_check if c["status"] == "ABOVE_MEDIAN")
    log.info(f"  Scored {len(scored)} works")
    log.info(f"  Median composite: {median_score:.6f}")
    log.info(f"  Reference authors above median: {n_above}/{len(coherence_check)}")
    for c in coherence_check:
        log.info(f"    {c['author']}: rank {c['rank']}/{c['total']} ({c['status']})")

    return {
        "n_works_scored": len(scored),
        "median_score": round(median_score, 6),
        "coherence_check": coherence_check,
        "top_20": scored[:20],
        "bottom_20": scored[-20:],
        "all_scores": scored,
    }


def compute_stage_score(windows, weights):
    """Compute weighted average score from windows using weight table."""
    if not windows or not weights:
        return None

    feat_sums = defaultdict(list)
    for win in windows:
        feats = win.get("features", {})
        for fname in weights:
            val = feats.get(fname)
            if isinstance(val, (int, float)) and val is not None:
                feat_sums[fname].append(float(val))

    if not feat_sums:
        return None

    weighted_sum = 0.0
    weight_sum = 0.0
    for fname, vals in feat_sums.items():
        w = weights[fname]["weight_effective"]
        if w > 0 and vals:
            weighted_sum += mean(vals) * w
            weight_sum += w

    if weight_sum == 0:
        return None
    return weighted_sum / weight_sum


# ═══════════════════════════════════════════════════════════════════════
# 4. RESOLVE UNPROVEN
# ═══════════════════════════════════════════════════════════════════════

def resolve_unproven(works, heatmap, passage_types):
    log.info("\n" + "="*60)
    log.info("4 — RESOLVING UNPROVEN FROM R2")

    results = {}

    # ─── U-01: SETUP dominance = artefact du binning? ──────────────
    log.info("\n  U-01: Moments clés SETUP = artefact du binning?")

    key_moments = load_r2_json("OMEGA_KEY_MOMENTS.json")
    zone_chapter_counts = defaultdict(int)
    zone_moment_counts = defaultdict(int)

    # Count chapters per zone
    for work in works:
        for win in work["windows"]:
            if win.get("is_real_chapter"):
                p_rel = win.get("p_rel", 0)
                zone = prel_zone(p_rel)
                zone_chapter_counts[zone] += 1

    # Count moments per zone
    for work_moments in key_moments.get("per_work", []):
        for moment in work_moments.get("moments", []):
            zone = prel_zone(moment.get("p_rel", 0))
            zone_moment_counts[zone] += 1

    u01_result = {}
    zones_ordered = ["OPENING", "SETUP", "MIDDLE", "TENSION", "CLOSING"]
    for zone in zones_ordered:
        n_chap = zone_chapter_counts.get(zone, 0)
        n_mom = zone_moment_counts.get(zone, 0)
        ratio = n_mom / n_chap if n_chap > 0 else 0
        u01_result[zone] = {
            "n_chapters": n_chap,
            "n_moments": n_mom,
            "moments_per_chapter": round(ratio, 4),
        }
        log.info(f"    {zone}: {n_mom} moments / {n_chap} chapters = {ratio:.4f} per chapter")

    # Verdict
    ratios = [u01_result[z]["moments_per_chapter"] for z in zones_ordered if u01_result[z]["n_chapters"] > 0]
    max_ratio = max(ratios) if ratios else 0
    min_ratio = min(ratios) if ratios else 0
    spread = max_ratio - min_ratio
    mean_ratio = mean(ratios) if ratios else 0
    cv_ratio = (max_ratio - min_ratio) / mean_ratio if mean_ratio > 0 else 0

    if cv_ratio < 0.30:
        verdict_u01 = "ARTEFACT_CONFIRMED — moments/chapter ratio is homogeneous across zones"
    else:
        dominant = max(zones_ordered, key=lambda z: u01_result[z].get("moments_per_chapter", 0))
        verdict_u01 = f"REAL_EFFECT — {dominant} has highest moments/chapter ratio"

    log.info(f"    Verdict: {verdict_u01}")

    results["U-01"] = {
        "question": "Moments cles SETUP = artefact du binning?",
        "data": u01_result,
        "cv_ratio": round(cv_ratio, 4),
        "verdict": verdict_u01,
    }

    # ─── U-02: DIALOGUE 1% = fenêtres trop larges? ────────────────
    log.info("\n  U-02: DIALOGUE 1% = fenetres trop larges?")

    type_counts_300 = defaultdict(int)
    type_counts_all = defaultdict(int)
    n_300 = 0
    n_all = 0

    for work in works:
        for win in work["windows"]:
            if win.get("is_real_chapter"):
                continue
            ptype = win.get("passage_type", "UNKNOWN")
            ws = win.get("window_size", 0)
            type_counts_all[ptype] += 1
            n_all += 1
            if ws == 300:
                type_counts_300[ptype] += 1
                n_300 += 1

    u02_300 = {t: {"count": type_counts_300.get(t, 0),
                    "pct": round(100 * type_counts_300.get(t, 0) / max(n_300, 1), 2)}
                for t in PASSAGE_TYPES + ["UNKNOWN", "FULL_WORK"]}
    u02_all = {t: {"count": type_counts_all.get(t, 0),
                    "pct": round(100 * type_counts_all.get(t, 0) / max(n_all, 1), 2)}
                for t in PASSAGE_TYPES + ["UNKNOWN", "FULL_WORK"]}

    dial_300 = type_counts_300.get("DIALOGUE", 0)
    dial_pct_300 = 100 * dial_300 / max(n_300, 1)
    dial_all_pct = 100 * type_counts_all.get("DIALOGUE", 0) / max(n_all, 1)

    if dial_pct_300 > dial_all_pct * 1.5:
        verdict_u02 = f"CONFIRMED — DIALOGUE at 300w = {dial_pct_300:.1f}% vs all = {dial_all_pct:.1f}%"
    else:
        verdict_u02 = f"REJECTED — DIALOGUE at 300w = {dial_pct_300:.1f}% vs all = {dial_all_pct:.1f}% (no significant increase)"

    log.info(f"    300w windows: {n_300}, DIALOGUE = {dial_300} ({dial_pct_300:.1f}%)")
    log.info(f"    All windows: {n_all}, DIALOGUE = {type_counts_all.get('DIALOGUE', 0)} ({dial_all_pct:.1f}%)")
    log.info(f"    Verdict: {verdict_u02}")

    results["U-02"] = {
        "question": "DIALOGUE 1% = fenetres trop larges?",
        "distribution_300w": u02_300,
        "distribution_all": u02_all,
        "verdict": verdict_u02,
    }

    # ─── U-03: Naturalité non normalisée ───────────────────────────
    log.info("\n  U-03: Naturalite non normalisee")

    # Re-read naturalness data and normalize
    cut_data = load_r2_json("OMEGA_CUT_NATURALNESS.json")

    # Compute global σ per feature from all works' windows
    global_feat_stdevs = defaultdict(list)
    for work in works:
        for win in work["windows"]:
            if win.get("is_real_chapter"):
                continue
            feats = win.get("features", {})
            for fname, val in feats.items():
                if isinstance(val, (int, float)) and val is not None:
                    global_feat_stdevs[fname].append(val)

    feat_sigmas = {}
    for fname, vals in global_feat_stdevs.items():
        if len(vals) >= 10:
            s = safe_stdev(vals)
            if s > 0:
                feat_sigmas[fname] = s

    # Recompute naturalness with normalized deltas
    author_norm_nat = defaultdict(list)
    per_work_normalized = []

    for work_entry in cut_data.get("per_work", []):
        work_id = work_entry.get("work_id", "?")
        author = work_entry.get("author", "?")
        boundaries = work_entry.get("boundaries", [])

        norm_deltas = []
        for b in boundaries:
            # We don't have per-feature deltas in the stored data,
            # only mean_delta. Use mean_delta / median feature sigma as proxy.
            raw_delta = b.get("mean_delta", 0)
            # Normalize: divide by median sigma of all features
            median_sigma = median(list(feat_sigmas.values())) if feat_sigmas else 1.0
            norm_delta = raw_delta / median_sigma
            norm_deltas.append(norm_delta)

        if norm_deltas:
            nat = mean(norm_deltas)
            per_work_normalized.append({
                "work_id": work_id,
                "author": author,
                "naturalness_raw": work_entry.get("naturalness_index", 0),
                "naturalness_normalized": round(nat, 6),
            })
            author_norm_nat[author].append(nat)

    # Ranking
    author_ranking_norm = []
    for author, vals in sorted(author_norm_nat.items()):
        if vals:
            author_ranking_norm.append({
                "author": author,
                "mean_naturalness_normalized": round(mean(vals), 6),
                "n_works": len(vals),
            })
    author_ranking_norm.sort(key=lambda x: x["mean_naturalness_normalized"])

    # Compare raw vs normalized top/bottom
    raw_ranking = cut_data.get("author_ranking", [])
    raw_top5 = [a["author"] for a in (cut_data.get("smooth_cuts_top10", []) or raw_ranking[:5])[:5]]
    norm_top5 = [a["author"] for a in author_ranking_norm[:5]]
    overlap = len(set(raw_top5) & set(norm_top5))

    verdict_u03 = f"NORMALIZED — top 5 overlap = {overlap}/5. {'Ranking stable' if overlap >= 3 else 'Ranking changed significantly'}"
    log.info(f"    Raw top 5: {raw_top5}")
    log.info(f"    Normalized top 5: {norm_top5}")
    log.info(f"    Verdict: {verdict_u03}")

    results["U-03"] = {
        "question": "Naturalite non normalisee",
        "raw_top5": raw_top5,
        "normalized_top5": norm_top5,
        "overlap": overlap,
        "normalized_ranking": author_ranking_norm[:10],
        "verdict": verdict_u03,
    }

    return results


def prel_zone(p_rel):
    zones = {
        "OPENING":  (0.00, 0.10),
        "SETUP":    (0.10, 0.40),
        "MIDDLE":   (0.40, 0.60),
        "TENSION":  (0.60, 0.85),
        "CLOSING":  (0.85, 1.01),
    }
    for name, (lo, hi) in zones.items():
        if lo <= p_rel < hi:
            return name
    return "CLOSING"


# ═══════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════

def save_json(data, filename):
    out = {
        "generated_at": datetime.now().isoformat(),
        "generator": "r3_coefficients.py",
        "standard": "NASA-Grade L4 / DO-178C Level A",
        **data,
    }
    path = R3_DIR / filename
    path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    size_kb = path.stat().st_size / 1024
    log.info(f"  -> {filename} ({size_kb:.0f} KB)")
    return path


def main():
    t0 = time.time()
    log.info("="*70)
    log.info("OMEGA — Phase R3 : Coefficients Proportionnels")
    log.info("="*70)

    # Load data
    metro = load_metrologie()
    cv_matrix = metro["cv_matrix"]
    derived_constants = metro["derived_constants"]
    cv_by_language = metro["cv_by_language"]

    heatmap = load_r2_json("OMEGA_PREL_HEATMAP.json")
    passage_types = load_r2_json("OMEGA_PASSAGE_TYPES.json")

    works = load_all_r1_works()
    log.info(f"Loaded {len(works)} works")

    # ─── 3.1 Confidence Table ────────────────────────────────────
    confidence_table = compute_confidence_table(cv_matrix)

    # ─── 3.2 Disabled Table ──────────────────────────────────────
    disabled_table, never_active = compute_disabled_table(confidence_table)

    # ─── 3.3 Weight Table ────────────────────────────────────────
    weight_table = compute_weight_table(confidence_table, derived_constants)

    # ─── 3.4 Position Modifiers ──────────────────────────────────
    position_modifiers = compute_position_modifiers(heatmap)

    # ─── 3.5 Type Modifiers ──────────────────────────────────────
    type_modifiers = compute_type_modifiers(passage_types)

    # ─── 3.6 Language Dependency ─────────────────────────────────
    language_dependency = compute_language_dependency(cv_by_language)

    # ─── 3.7 Scoring Formula ────────────────────────────────────
    scoring_formula = compute_scoring_formula(confidence_table, derived_constants)

    # ─── Save Coefficients ───────────────────────────────────────
    coefficients = {
        "confidence_table": confidence_table,
        "disabled_below": disabled_table,
        "never_active_features": never_active,
        "weight_table": weight_table,
        "position_modifiers": position_modifiers,
        "type_modifiers": type_modifiers,
        "language_dependency": language_dependency,
        "scoring_formula": scoring_formula,
    }
    save_json(coefficients, "OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json")

    # ─── 3.8 Backtest ────────────────────────────────────────────
    backtest = compute_backtest(works, confidence_table, derived_constants, weight_table)
    save_json(backtest, "OMEGA_BACKTEST_R3.json")

    # ─── 4. Resolve UNPROVEN ─────────────────────────────────────
    unproven = resolve_unproven(works, heatmap, passage_types)
    save_json(unproven, "OMEGA_UNPROVEN_RESOLVED.json")

    elapsed = time.time() - t0
    log.info("\n" + "="*70)
    log.info(f"R3 COMPLETE — {elapsed:.0f}s total")
    log.info(f"  3 JSON files in {R3_DIR}/")
    log.info("="*70)


if __name__ == "__main__":
    main()
