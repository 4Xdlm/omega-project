#!/usr/bin/env python3
"""
OMEGA — Analyse des Baselines CC-STEP-1
Lit baselines_auteur.json et produit :
  1. Tableau comparatif: seuils génériques vs mesures réelles
  2. Recommandations de recalibration
  3. Détection des outliers (auteurs hors norme à exclure des baselines globales)
  4. Objectif SEAL 93→96 : analyse de faisabilité
"""

import json
import hashlib
from pathlib import Path
from datetime import datetime


SEUILS_GENERIQUES_ACTUELS = {
    "f1_mean": {
        "desc": "Longueur moyenne phrase (mots)",
        "generic_expected": 22.0,
        "omega_target": None,  # À mesurer
        "source": "Hirst 1996 / Brunet 1988 (moyenné)",
    },
    "f16b_hapax_rate": {
        "desc": "Taux de hapax legomena",
        "generic_expected": 0.42,
        "omega_target": None,
        "source": "Brunet 1988 + Schoch 2017",
    },
    "f5a_verb_density": {
        "desc": "Densité verbale",
        "generic_expected": 0.18,
        "omega_target": None,
        "source": "Biber 2011 + Meister 2003",
    },
    "f19a_approx_entropy": {
        "desc": "Entropie approx. (Jena 2023)",
        "generic_expected": None,  # Nouveau — pas de seuil générique
        "jena_canonical": 0.9,    # Valeur cible corpus canonique
        "jena_noncanonical": 0.4,
        "source": "Jena Corpus Study PMC 2023",
    },
    "f20d_composite_fg": {
        "desc": "Foregrounding composite (Miall & Kuiken 1994)",
        "generic_expected": None,
        "miall_canonical": 0.4,
        "source": "Miall & Kuiken 1994 / Van Peer 1986",
    },
}

# Auteurs avec problèmes de langue connus → baselines séparées
LANG_MISMATCH_WORKS = {
    "kafka_proces": "DE→FR_MODEL",
    "machado_bras_cubas": "PT→FR_MODEL",
    "joyce_ulysse": "EN→FR_TRANSLATION",
    "sterne_tristram": "EN→FR_TRANSLATION",
    "tolstoi_guerre": "RU→FR_TRANSLATION (via EN)",
    "melville_moby": "EN→FR_TRANSLATION",
    "austen_orgueil": "EN→FR_TRANSLATION (1822)",
    "dostoievski_crime": "RU→FR_TRANSLATION",
    "tchekhov_dame": "RU→FR_TRANSLATION",
}


def percentile(vals: list, p: float) -> float:
    if not vals:
        return 0.0
    sorted_v = sorted(vals)
    idx = int((p / 100) * len(sorted_v))
    return sorted_v[min(idx, len(sorted_v)-1)]


def analyze_baselines(baselines_path: Path) -> dict:
    with open(baselines_path, encoding="utf-8") as f:
        data = json.load(f)

    authors = data.get("authors", {})
    global_b = data.get("global_corpus_baseline", {})

    report = {
        "generated": datetime.now().isoformat(),
        "n_works": data.get("n_works", 0),
        "comparisons": {},
        "recalibration_recommendations": [],
        "lang_mismatch_analysis": {},
        "calibration_targets": {},
        "feasibility_seal_96": {},
    }

    # ── 1. Comparaison seuils génériques vs mesures réelles ──────────────
    for feat, info in SEUILS_GENERIQUES_ACTUELS.items():
        gb = global_b.get(feat, {})
        if not gb:
            continue

        measured_median = gb.get("median")
        measured_p75 = gb.get("p75")
        measured_p25 = gb.get("p25")
        generic = info.get("generic_expected")

        comparison = {
            "feature": feat,
            "description": info["desc"],
            "source": info["source"],
            "generic_expected": generic,
            "corpus_measured_p25": measured_p25,
            "corpus_measured_median": measured_median,
            "corpus_measured_p75": measured_p75,
            "n_measurements": gb.get("n"),
        }

        if generic and measured_median:
            delta = abs(measured_median - generic) / max(abs(generic), 0.001)
            comparison["generic_vs_measured_delta_pct"] = round(delta * 100, 1)
            if delta > 0.25:
                comparison["verdict"] = "RECALIBRATION_REQUIRED"
                report["recalibration_recommendations"].append({
                    "feature": feat,
                    "old_expected": generic,
                    "new_recommended": measured_median,
                    "reason": f"Écart {delta*100:.0f}% — valeur générique inadaptée au corpus",
                })
            elif delta > 0.10:
                comparison["verdict"] = "RECALIBRATION_ADVISED"
            else:
                comparison["verdict"] = "ACCEPTABLE"
        elif not generic:
            comparison["verdict"] = "NEW_FEATURE_NO_GENERIC"

        report["comparisons"][feat] = comparison

    # ── 2. Analyse auteurs langue-mismatch ──────────────────────────────
    for wid, lang_issue in LANG_MISMATCH_WORKS.items():
        if wid not in authors:
            continue
        author_b = authors[wid].get("baseline", {})
        mismatch_features = []
        for feat in ["f1_mean", "f16b_hapax_rate", "f16c_lexical_surprise"]:
            b = author_b.get(feat, {})
            gb = global_b.get(feat, {})
            if "median" in b and "median" in gb:
                delta = abs(b["median"] - gb["median"]) / max(abs(gb["median"]), 0.001)
                if delta > 0.30:
                    mismatch_features.append({
                        "feature": feat,
                        "author_median": b["median"],
                        "global_median": gb["median"],
                        "delta_pct": round(delta * 100, 1),
                    })
        report["lang_mismatch_analysis"][wid] = {
            "lang_issue": lang_issue,
            "features_affected": mismatch_features,
            "recommendation": "EXCLUDE_FROM_FR_BASELINE" if len(mismatch_features) >= 2
                              else "USE_WITH_CAUTION",
        }

    # ── 3. Cibles de calibration objectives ─────────────────────────────
    # FR natif uniquement (exclusion lang_mismatch)
    fr_works = [wid for wid, info in authors.items()
                if info.get("lang_original", "fr") == "fr"
                and wid not in LANG_MISMATCH_WORKS]

    fr_f1_medians = []
    fr_hapax_medians = []
    fr_verb_medians = []
    fr_entropy_medians = []
    fr_fg_medians = []

    for wid in fr_works:
        b = authors[wid].get("baseline", {})
        for feat, lst in [
            ("f1_mean", fr_f1_medians),
            ("f16b_hapax_rate", fr_hapax_medians),
            ("f5a_verb_density", fr_verb_medians),
            ("f19a_approx_entropy", fr_entropy_medians),
            ("f20d_composite_fg", fr_fg_medians),
        ]:
            v = b.get(feat, {}).get("median")
            if v is not None:
                lst.append(v)

    def stats(lst):
        if not lst:
            return None
        s = sorted(lst)
        return {
            "n": len(s),
            "min": round(s[0], 4),
            "p25": round(percentile(s, 25), 4),
            "median": round(percentile(s, 50), 4),
            "p75": round(percentile(s, 75), 4),
            "max": round(s[-1], 4),
        }

    report["calibration_targets"] = {
        "fr_native_only": {
            "n_works": len(fr_works),
            "works": fr_works,
            "f1_mean": stats(fr_f1_medians),
            "f16b_hapax_rate": stats(fr_hapax_medians),
            "f5a_verb_density": stats(fr_verb_medians),
            "f19a_approx_entropy": stats(fr_entropy_medians),
            "f20d_composite_fg": stats(fr_fg_medians),
        },
        "recommendation": {
            "f1_mean_target": f"P75 du corpus FR = supérieur au meilleur auteur médian",
            "f16b_hapax_target": "P75 corpus FR natif — richesse lexicale excellence",
            "f19_target": "ApEn ≥ P75 corpus — zone CANONICAL_PREFERRED garantie",
            "f20_target": "FG ≥ 0.4 (Miall & Kuiken: HIGH foregrounding)",
        },
    }

    # ── 4. Faisabilité SEAL 93→96 ────────────────────────────────────────
    # Le composite GENIUS = moyenne pondérée des features
    # Pour atteindre 96, il faut être au P90 du corpus canonique sur chaque axe
    feasibility = {
        "current_seal_target": 93,
        "new_seal_target": 96,
        "gap": 3,
        "analysis": [],
        "verdict": "PENDING_MEASUREMENT",
    }

    for feat, lst in [
        ("f16b_hapax_rate", fr_hapax_medians),
        ("f19a_approx_entropy", fr_entropy_medians),
        ("f20d_composite_fg", fr_fg_medians),
    ]:
        if len(lst) >= 3:
            p90 = percentile(lst, 90)
            feasibility["analysis"].append({
                "feature": feat,
                "corpus_p90": round(p90, 4),
                "seal_96_requirement": f"Générer au-dessus de {p90:.4f} sur chaque extrait",
            })

    report["feasibility_seal_96"] = feasibility

    return report


def main():
    baselines_path = Path("ssot/baselines_auteur.json")

    if not baselines_path.exists():
        print("ERREUR: baselines_auteur.json introuvable.")
        print("Lancer d'abord: python autopsie_v3.py")
        return

    print("OMEGA — Analyse des Baselines CC-STEP-1")
    print(f"Source: {baselines_path}")

    report = analyze_baselines(baselines_path)

    # Affichage console
    print(f"\n{'='*60}")
    print(f"COMPARAISON SEUILS GÉNÉRIQUES vs MESURES RÉELLES")
    print(f"{'='*60}")
    for feat, comp in report["comparisons"].items():
        generic = comp.get("generic_expected", "N/A")
        measured = comp.get("corpus_measured_median", "N/A")
        delta = comp.get("generic_vs_measured_delta_pct", "—")
        verdict = comp.get("verdict", "—")
        print(f"  {feat:30s} générique={generic:8} mesuré={measured:8} "
              f"Δ={delta}%  [{verdict}]")

    print(f"\n{'='*60}")
    print(f"RECALIBRAGES REQUIS: {len(report['recalibration_recommendations'])}")
    print(f"{'='*60}")
    for rec in report["recalibration_recommendations"]:
        print(f"  {rec['feature']:30s} {rec['old_expected']} → {rec['new_recommended']} "
              f"({rec['reason']})")

    print(f"\n{'='*60}")
    print(f"CIBLES FR NATIF (auteurs langue originale fr)")
    ct = report["calibration_targets"]["fr_native_only"]
    print(f"  Works FR: {ct['n_works']} : {ct['works']}")
    for feat in ["f1_mean", "f16b_hapax_rate", "f5a_verb_density",
                 "f19a_approx_entropy", "f20d_composite_fg"]:
        s = ct.get(feat)
        if s:
            print(f"  {feat:30s} P25={s['p25']:7.4f} median={s['median']:7.4f} "
                  f"P75={s['p75']:7.4f}")

    # Sauvegarder
    out_path = Path("results_v3/BASELINE_ANALYSIS_CC1.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)

    sha = hashlib.sha256(
        json.dumps(report, ensure_ascii=False, sort_keys=True).encode()
    ).hexdigest()
    report["sha256"] = sha

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*60}")
    print(f"Rapport exporté: {out_path}")
    print(f"SHA256: {sha[:24]}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
