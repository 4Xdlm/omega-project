#!/usr/bin/env python3
"""
OMEGA PVI — Phase P3: Validation hors échantillon
Test 3A: 42 titres gelés
Test 3B: 20 titres post-2022 (proxy)
Test 3C: 4 cas adversariaux
"""

import csv
import json
import math
import os
import sys
import numpy as np

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))


# =============================================================================
# LOAD FROZEN MODEL
# =============================================================================
def load_model():
    coef_path = os.path.join(OUTPUT_DIR, "coefficients_v2.json")
    with open(coef_path, encoding="utf-8") as f:
        model = json.load(f)
    return model


def predict_proba(row, model):
    """Predict bestseller probability using frozen MINIMAL logistic model."""
    coefs = model["coefficients"]
    intercept = model["intercept"]
    features = model["features"]

    z = intercept
    for feat in features:
        val = float(row.get(feat, 0))
        z += coefs[feat] * val

    prob = 1 / (1 + math.exp(-z))
    return prob


def predict_label(row, model, threshold=0.50):
    prob = predict_proba(row, model)
    return 1 if prob >= threshold else 0, prob


# =============================================================================
# TEST 3A — 42 FROZEN TEST SET
# =============================================================================
def test_3a(model):
    print("\n" + "=" * 70)
    print("TEST 3A — 42 titres geles (test_set_gele.csv)")
    print("=" * 70)

    test_path = os.path.join(OUTPUT_DIR, "test_set_gele.csv")
    with open(test_path, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    y_true, y_pred, y_proba = [], [], []
    errors = []
    results_detail = []

    for r in rows:
        label = int(r["label"])
        pred, prob = predict_label(r, model)
        y_true.append(label)
        y_pred.append(pred)
        y_proba.append(prob)

        correct = pred == label
        results_detail.append({
            "titre": r["titre"],
            "groupe": r["groupe"],
            "langue": r["langue"],
            "label": label,
            "prediction": pred,
            "proba": round(prob, 4),
            "correct": correct,
            "FL": float(r.get("FL", 0)),
            "I": float(r.get("I", 0)),
            "Omega": float(r.get("Omega", 0)),
            "T": float(r.get("T", 0)),
        })

        status = "OK" if correct else "ERREUR"
        print(f"  {status:6s} p={prob:.3f} label={label} pred={pred} "
              f"{r['groupe']:6s} {r['titre'][:40]}")

        if not correct:
            errors.append(results_detail[-1])

    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    y_proba = np.array(y_proba)

    # Metrics
    accuracy = np.mean(y_true == y_pred)
    tp = np.sum((y_true == 1) & (y_pred == 1))
    tn = np.sum((y_true == 0) & (y_pred == 0))
    fp = np.sum((y_true == 0) & (y_pred == 1))
    fn = np.sum((y_true == 1) & (y_pred == 0))

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

    # AUC
    from sklearn.metrics import roc_auc_score
    auc = roc_auc_score(y_true, y_proba) if len(np.unique(y_true)) > 1 else 0

    # Per-language accuracy
    fr_mask = np.array([r["langue"] == "fr" for r in rows])
    en_mask = np.array([r["langue"] == "en" for r in rows])
    acc_fr = np.mean(y_true[fr_mask] == y_pred[fr_mask]) if fr_mask.sum() > 0 else 0
    acc_en = np.mean(y_true[en_mask] == y_pred[en_mask]) if en_mask.sum() > 0 else 0

    # Per-group accuracy
    a_mask = np.array([int(r["label"]) == 1 for r in rows])
    b_mask = np.array([int(r["label"]) == 0 for r in rows])
    acc_a = np.mean(y_true[a_mask] == y_pred[a_mask]) if a_mask.sum() > 0 else 0
    acc_b = np.mean(y_true[b_mask] == y_pred[b_mask]) if b_mask.sum() > 0 else 0

    print(f"\n--- RESULTATS 3A ---")
    print(f"  Accuracy:  {accuracy:.4f} ({int(accuracy*len(rows))}/{len(rows)})")
    print(f"  AUC-ROC:   {auc:.4f}")
    print(f"  F1:        {f1:.4f}")
    print(f"  Confusion: TP={tp} TN={tn} FP={fp} FN={fn}")
    print(f"  Acc FR:    {acc_fr:.4f}")
    print(f"  Acc EN:    {acc_en:.4f}")
    print(f"  Acc A:     {acc_a:.4f} (bestsellers)")
    print(f"  Acc B:     {acc_b:.4f} (chefs d'oeuvre)")
    print(f"  Erreurs:   {len(errors)}")

    pass_3a = accuracy >= 0.75 and auc >= 0.78

    return {
        "accuracy": round(accuracy, 4),
        "auc": round(auc, 4),
        "f1": round(f1, 4),
        "confusion": {"TP": int(tp), "TN": int(tn), "FP": int(fp), "FN": int(fn)},
        "acc_fr": round(acc_fr, 4),
        "acc_en": round(acc_en, 4),
        "acc_a": round(acc_a, 4),
        "acc_b": round(acc_b, 4),
        "errors": errors,
        "details": results_detail,
        "pass": pass_3a,
    }


# =============================================================================
# TEST 3B — 20 TITRES POST-2022
# =============================================================================
POST_2022 = [
    # BESTSELLERS CONFIRMÉS 2022-2025
    {"titre": "Onyx Storm", "auteur": "Rebecca Yarros", "expected": 1,
     "FL": 0.18, "I": 0.82, "Omega": 0.72, "T": 0.78, "S": 0.65, "MS": 0.52,
     "U": 0.68, "N_rev": 4, "DR": 0.18, "LP": 0.22,
     "note": "Romantasy record 1M+ semaine 1", "confiance": "PROXY"},
    {"titre": "Iron Flame", "auteur": "Rebecca Yarros", "expected": 1,
     "FL": 0.18, "I": 0.82, "Omega": 0.72, "T": 0.80, "S": 0.68, "MS": 0.55,
     "U": 0.70, "N_rev": 4, "DR": 0.20, "LP": 0.22,
     "note": "Romantasy bestseller", "confiance": "PROXY"},
    {"titre": "Happy Place", "auteur": "Emily Henry", "expected": 1,
     "FL": 0.12, "I": 0.85, "Omega": 0.78, "T": 0.72, "S": 0.48, "MS": 0.52,
     "U": 0.60, "N_rev": 2, "DR": 0.10, "LP": 0.18,
     "note": "Contemporary romance", "confiance": "PROXY"},
    {"titre": "Tomorrow and Tomorrow and Tomorrow", "auteur": "Gabrielle Zevin", "expected": 1,
     "FL": 0.25, "I": 0.78, "Omega": 0.72, "T": 0.78, "S": 0.58, "MS": 0.75,
     "U": 0.82, "N_rev": 3, "DR": 0.25, "LP": 0.28,
     "note": "Upmarket viral, 2M+ copies", "confiance": "PROXY"},
    {"titre": "Lessons in Chemistry", "auteur": "Bonnie Garmus", "expected": 1,
     "FL": 0.20, "I": 0.82, "Omega": 0.78, "T": 0.72, "S": 0.55, "MS": 0.68,
     "U": 0.85, "N_rev": 3, "DR": 0.15, "LP": 0.22,
     "note": "Upmarket bestseller 5M+", "confiance": "PROXY"},
    {"titre": "Demon Copperhead", "auteur": "Barbara Kingsolver", "expected": 1,
     "FL": 0.28, "I": 0.78, "Omega": 0.75, "T": 0.78, "S": 0.60, "MS": 0.78,
     "U": 0.85, "N_rev": 4, "DR": 0.22, "LP": 0.32,
     "note": "Pulitzer 2023 + bestseller", "confiance": "PROXY"},
    {"titre": "Intermezzo", "auteur": "Sally Rooney", "expected": 1,
     "FL": 0.22, "I": 0.72, "Omega": 0.62, "T": 0.68, "S": 0.48, "MS": 0.78,
     "U": 0.72, "N_rev": 2, "DR": 0.18, "LP": 0.25,
     "note": "Literary bestseller", "confiance": "PROXY"},
    {"titre": "The Women", "auteur": "Kristin Hannah", "expected": 1,
     "FL": 0.18, "I": 0.82, "Omega": 0.78, "T": 0.78, "S": 0.60, "MS": 0.60,
     "U": 0.78, "N_rev": 3, "DR": 0.18, "LP": 0.22,
     "note": "Historical fiction bestseller", "confiance": "PROXY"},
    {"titre": "All Fours", "auteur": "Miranda July", "expected": 1,
     "FL": 0.28, "I": 0.72, "Omega": 0.55, "T": 0.65, "S": 0.55, "MS": 0.75,
     "U": 0.78, "N_rev": 2, "DR": 0.20, "LP": 0.28,
     "note": "Upmarket bestseller", "confiance": "PROXY"},
    {"titre": "James", "auteur": "Percival Everett", "expected": 1,
     "FL": 0.25, "I": 0.75, "Omega": 0.72, "T": 0.75, "S": 0.58, "MS": 0.78,
     "U": 0.85, "N_rev": 3, "DR": 0.22, "LP": 0.28,
     "note": "NBA winner + bestseller", "confiance": "PROXY"},

    # PRIX LITTÉRAIRES — ventes restreintes
    {"titre": "The Passenger", "auteur": "Cormac McCarthy", "expected": 0,
     "FL": 0.45, "I": 0.48, "Omega": 0.38, "T": 0.72, "S": 0.50, "MS": 0.85,
     "U": 0.78, "N_rev": 2, "DR": 0.38, "LP": 0.45,
     "note": "Late McCarthy, prestige", "confiance": "PROXY"},
    {"titre": "Treacle Walker", "auteur": "Alan Garner", "expected": 0,
     "FL": 0.52, "I": 0.40, "Omega": 0.35, "T": 0.62, "S": 0.42, "MS": 0.80,
     "U": 0.65, "N_rev": 1, "DR": 0.35, "LP": 0.42,
     "note": "Booker longlist, hermétique", "confiance": "PROXY"},
    {"titre": "Glory", "auteur": "NoViolet Bulawayo", "expected": 0,
     "FL": 0.38, "I": 0.52, "Omega": 0.45, "T": 0.68, "S": 0.50, "MS": 0.72,
     "U": 0.70, "N_rev": 2, "DR": 0.30, "LP": 0.35,
     "note": "Booker shortlist, allégorie", "confiance": "PROXY"},
    {"titre": "Study for Obedience", "auteur": "Sarah Bernstein", "expected": 0,
     "FL": 0.48, "I": 0.42, "Omega": 0.32, "T": 0.60, "S": 0.38, "MS": 0.82,
     "U": 0.62, "N_rev": 1, "DR": 0.35, "LP": 0.48,
     "note": "Booker shortlist, expérimental", "confiance": "PROXY"},
    {"titre": "Prophet Song", "auteur": "Paul Lynch", "expected": 0,
     "FL": 0.38, "I": 0.62, "Omega": 0.42, "T": 0.72, "S": 0.55, "MS": 0.80,
     "U": 0.72, "N_rev": 2, "DR": 0.28, "LP": 0.42,
     "note": "Booker 2023 winner, stream of consciousness", "confiance": "PROXY"},
    {"titre": "Orbital", "auteur": "Samantha Harvey", "expected": 0,
     "FL": 0.40, "I": 0.38, "Omega": 0.35, "T": 0.75, "S": 0.35, "MS": 0.88,
     "U": 0.65, "N_rev": 1, "DR": 0.32, "LP": 0.45,
     "note": "Booker 2024 winner, contemplatif", "confiance": "PROXY"},
    {"titre": "Stone Yard Devotional", "auteur": "Charlotte Wood", "expected": 0,
     "FL": 0.35, "I": 0.52, "Omega": 0.42, "T": 0.65, "S": 0.38, "MS": 0.78,
     "U": 0.65, "N_rev": 1, "DR": 0.25, "LP": 0.35,
     "note": "Booker longlist", "confiance": "PROXY"},
    {"titre": "Dr No", "auteur": "Percival Everett", "expected": 0,
     "FL": 0.35, "I": 0.55, "Omega": 0.48, "T": 0.62, "S": 0.55, "MS": 0.72,
     "U": 0.72, "N_rev": 2, "DR": 0.28, "LP": 0.32,
     "note": "Literary satire", "confiance": "PROXY"},
    {"titre": "The Safekeep", "auteur": "Yael van der Wouden", "expected": 0,
     "FL": 0.35, "I": 0.58, "Omega": 0.48, "T": 0.68, "S": 0.48, "MS": 0.78,
     "U": 0.68, "N_rev": 2, "DR": 0.25, "LP": 0.35,
     "note": "Booker shortlist", "confiance": "PROXY"},
    {"titre": "Small Things Like These", "auteur": "Claire Keegan", "expected": 0,
     "FL": 0.28, "I": 0.65, "Omega": 0.58, "T": 0.70, "S": 0.48, "MS": 0.82,
     "U": 0.72, "N_rev": 2, "DR": 0.20, "LP": 0.25,
     "note": "Literary novella, film adaptation", "confiance": "PROXY"},
]


def test_3b(model):
    print("\n" + "=" * 70)
    print("TEST 3B — 20 titres post-2022 (inconnus du corpus)")
    print("=" * 70)

    correct = 0
    results = []

    for book in POST_2022:
        pred, prob = predict_label(book, model)
        expected = book["expected"]
        is_correct = pred == expected

        label_str = "BESTSELLER" if expected == 1 else "NICHE"
        pred_str = "BESTSELLER" if pred == 1 else "NICHE"
        status = "OK" if is_correct else "ERREUR"

        print(f"  {status:6s} p={prob:.3f} attendu={label_str:10s} pred={pred_str:10s} "
              f"{book['titre'][:35]}")

        if is_correct:
            correct += 1

        results.append({
            "titre": book["titre"],
            "auteur": book["auteur"],
            "expected": expected,
            "prediction": pred,
            "proba": round(prob, 4),
            "correct": is_correct,
            "note": book["note"],
            "confiance": book["confiance"],
            "FL": book["FL"],
            "I": book["I"],
            "Omega": book["Omega"],
            "T": book["T"],
        })

    rate = correct / len(POST_2022)
    print(f"\n--- RESULTATS 3B ---")
    print(f"  Correct: {correct}/{len(POST_2022)} ({rate:.0%})")

    pass_3b = correct >= 14

    return {
        "correct": correct,
        "total": len(POST_2022),
        "rate": round(rate, 4),
        "results": results,
        "pass": pass_3b,
    }


# =============================================================================
# TEST 3C — 4 CAS ADVERSARIAUX
# =============================================================================
def test_3c(model):
    print("\n" + "=" * 70)
    print("TEST 3C — 4 cas adversariaux")
    print("=" * 70)

    cases = [
        {
            "id": "CAS1",
            "titre": "L'Étranger (Camus)",
            "description": "Chef d'oeuvre accessible — doit scorer PASS",
            "FL": 0.22, "I": 0.55, "Omega": 0.62, "T": 0.68,
            "expected_pred": 1,
            "expected_reason": "FL bas + Omega moyen = CE bon",
        },
        {
            "id": "CAS2",
            "titre": "We Need to Talk About Kevin (Shriver)",
            "description": "Bestseller prose forte — doit scorer PASS",
            "FL": 0.35, "I": 0.72, "Omega": 0.85, "T": 0.75,
            "expected_pred": 1,
            "expected_reason": "I+Omega élevés compensent FL modéré",
        },
        {
            "id": "CAS3",
            "titre": "The Rings of Saturn (Sebald)",
            "description": "Prose exceptionnelle ventes <100K — doit scorer FAIL",
            "FL": 0.48, "I": 0.42, "Omega": 0.35, "T": 0.72,
            "expected_pred": 0,
            "expected_reason": "FL élevé + Omega bas + I bas",
        },
        {
            "id": "CAS4",
            "titre": "Bestseller fin faible (test étouffement)",
            "description": "Bestseller avec Omega < 0.50 — warning étouffement",
            "FL": 0.30, "I": 0.78, "Omega": 0.42, "T": 0.75,
            "expected_pred": 1,
            "expected_reason": "I élevé pousse vers PASS malgré Omega faible",
            "check_etouffement": True,
        },
    ]

    results = []
    all_pass = True

    for case in cases:
        pred, prob = predict_label(case, model)
        expected = case["expected_pred"]
        correct = pred == expected

        score_etouff = case["FL"] * (1 - case["Omega"])
        warning_etouff = score_etouff > 0.08

        status = "PASS" if correct else "FAIL"
        if not correct:
            all_pass = False

        print(f"\n  {case['id']}: {case['titre']}")
        print(f"    {case['description']}")
        print(f"    Proba: {prob:.4f} | Pred: {pred} | Attendu: {expected} | {status}")
        print(f"    FL={case['FL']} I={case['I']} Omega={case['Omega']} T={case['T']}")
        print(f"    Etouffement: {score_etouff:.4f} {'*** WARNING ***' if warning_etouff else 'OK'}")

        result = {
            "id": case["id"],
            "titre": case["titre"],
            "prediction": pred,
            "proba": round(prob, 4),
            "expected": expected,
            "correct": correct,
            "score_etouffement": round(score_etouff, 4),
            "warning_etouffement": warning_etouff,
        }

        if case.get("check_etouffement"):
            result["etouffement_triggered"] = warning_etouff
            if not warning_etouff:
                print(f"    *** ERREUR: étouffement non déclenché (FL×(1-Ω)={score_etouff:.3f} ≤ 0.08)")
                all_pass = False

        results.append(result)

    return {"cases": results, "all_pass": all_pass}


# =============================================================================
# REPORT GENERATION
# =============================================================================
def generate_report(model, res_3a, res_3b, res_3c):
    report = []
    report.append("# Rapport Validation Phase P3\n\n")
    report.append(f"**Date**: 2026-03-29\n")
    report.append(f"**Modele**: MINIMAL (FL, I, Omega, T) — coefficients geles\n")
    report.append(f"**AUC calibration (P2)**: {model['auc_train_cv']}\n\n")

    # --- 3A ---
    report.append("## Section 1: Test 3A — 42 titres geles\n\n")
    report.append(f"| Metrique | Valeur | Seuil | Pass |\n")
    report.append(f"|----------|--------|-------|------|\n")
    report.append(f"| Accuracy | **{res_3a['accuracy']:.4f}** | >=0.75 | "
                  f"{'PASS' if res_3a['accuracy'] >= 0.75 else 'FAIL'} |\n")
    report.append(f"| AUC-ROC | **{res_3a['auc']:.4f}** | >=0.78 | "
                  f"{'PASS' if res_3a['auc'] >= 0.78 else 'FAIL'} |\n")
    report.append(f"| F1 | {res_3a['f1']:.4f} | — | — |\n\n")

    cm = res_3a['confusion']
    report.append(f"Matrice de confusion:\n")
    report.append(f"```\n")
    report.append(f"              Pred=0  Pred=1\n")
    report.append(f"  Reel=0 (B)   {cm['TN']:3d}     {cm['FP']:3d}\n")
    report.append(f"  Reel=1 (A)   {cm['FN']:3d}     {cm['TP']:3d}\n")
    report.append(f"```\n\n")

    report.append(f"| Segment | Accuracy |\n")
    report.append(f"|---------|----------|\n")
    report.append(f"| FR | {res_3a['acc_fr']:.4f} |\n")
    report.append(f"| EN | {res_3a['acc_en']:.4f} |\n")
    report.append(f"| Groupe A (bestsellers) | {res_3a['acc_a']:.4f} |\n")
    report.append(f"| Groupe B (chefs d'oeuvre) | {res_3a['acc_b']:.4f} |\n\n")

    if res_3a["errors"]:
        report.append(f"### Erreurs ({len(res_3a['errors'])})\n\n")
        report.append(f"| Titre | Groupe | Pred | Proba | FL | I | Omega | T | Diagnostic |\n")
        report.append(f"|-------|--------|------|-------|-----|---|-------|---|------------|\n")
        for e in res_3a["errors"]:
            diag = ""
            if e["label"] == 1 and e["prediction"] == 0:
                diag = "FN: "
                if e["FL"] > 0.40:
                    diag += "FL élevé"
                elif e["Omega"] < 0.55:
                    diag += "Omega faible"
                elif e["I"] < 0.60:
                    diag += "I faible"
                else:
                    diag += "combinaison insuffisante"
            elif e["label"] == 0 and e["prediction"] == 1:
                diag = "FP: "
                if e["I"] > 0.65 and e["Omega"] > 0.60:
                    diag += "I+Omega élevés malgré FL"
                else:
                    diag += "variables front élevées"
            report.append(f"| {e['titre'][:30]} | {e['groupe']} | {e['prediction']} | "
                          f"{e['proba']:.3f} | {e['FL']:.2f} | {e['I']:.2f} | "
                          f"{e['Omega']:.2f} | {e['T']:.2f} | {diag} |\n")

    verdict_3a = "PASS" if res_3a["pass"] else "FAIL"
    report.append(f"\n**Verdict 3A: {verdict_3a}**\n")

    # --- 3B ---
    report.append(f"\n## Section 2: Test 3B — 20 titres post-2022\n\n")
    report.append(f"| Titre | Auteur | Attendu | Pred | Proba | Correct | Note |\n")
    report.append(f"|-------|--------|---------|------|-------|---------|------|\n")
    for r in res_3b["results"]:
        att = "BEST" if r["expected"] == 1 else "NICHE"
        prd = "BEST" if r["prediction"] == 1 else "NICHE"
        ok = "OK" if r["correct"] else "**ERREUR**"
        report.append(f"| {r['titre'][:28]} | {r['auteur'][:18]} | {att} | {prd} | "
                      f"{r['proba']:.3f} | {ok} | {r['note'][:30]} |\n")

    report.append(f"\nTaux: **{res_3b['correct']}/{res_3b['total']}** "
                  f"({res_3b['rate']:.0%})\n")
    verdict_3b = "PASS" if res_3b["pass"] else "FAIL"
    report.append(f"**Verdict 3B: {verdict_3b}** (seuil: >=14/20)\n")

    # Cas intéressants
    report.append(f"\n### Cas commentés\n")
    for r in res_3b["results"]:
        if r["titre"] in ("Tomorrow and Tomorrow and Tomorrow", "Demon Copperhead",
                           "Orbital", "Onyx Storm", "Intermezzo", "Small Things Like These"):
            report.append(f"\n**{r['titre']}** ({r['auteur']}): "
                          f"p={r['proba']:.3f} → {'BESTSELLER' if r['prediction'] == 1 else 'NICHE'}. "
                          f"{r['note']}\n")

    # --- 3C ---
    report.append(f"\n## Section 3: Stress test — 4 cas adversariaux\n\n")
    for c in res_3c["cases"]:
        ok = "PASS" if c["correct"] else "**FAIL**"
        report.append(f"### {c['id']}: {c['titre']}\n")
        report.append(f"- Proba: {c['proba']:.4f} | Prediction: {c['prediction']} | "
                      f"Attendu: {c['expected']} | {ok}\n")
        report.append(f"- Etouffement: {c['score_etouffement']:.4f} "
                      f"({'WARNING' if c['warning_etouffement'] else 'OK'})\n")

    verdict_3c = "PASS" if res_3c["all_pass"] else "FAIL"
    report.append(f"\n**Verdict 3C: {verdict_3c}**\n")

    # --- VERDICT GLOBAL ---
    all_pass = res_3a["pass"] and res_3b["pass"] and res_3c["all_pass"]
    verdict = "P3 PASS — GO P4" if all_pass else "P3 — VOIR DETAILS"

    report.append(f"\n## Section 4: Verdict P3\n\n")
    report.append(f"| Test | Resultat |\n")
    report.append(f"|------|----------|\n")
    report.append(f"| 3A (42 geles) | {verdict_3a} |\n")
    report.append(f"| 3B (20 post-2022) | {verdict_3b} |\n")
    report.append(f"| 3C (4 adversariaux) | {verdict_3c} |\n\n")
    report.append(f"**{verdict}**\n\n")

    if not all_pass:
        report.append("### Diagnostic echecs\n")
        if not res_3a["pass"]:
            report.append(f"- 3A: Accuracy={res_3a['accuracy']:.4f} AUC={res_3a['auc']:.4f}\n")
        if not res_3b["pass"]:
            report.append(f"- 3B: {res_3b['correct']}/{res_3b['total']} correct\n")
        if not res_3c["all_pass"]:
            for c in res_3c["cases"]:
                if not c["correct"]:
                    report.append(f"- 3C {c['id']}: prediction {c['prediction']} vs attendu {c['expected']}\n")

    report.append(f"\n---\n")
    report.append(f"**Reserve**: Test 3B utilise des estimations [PROXY] pour les 20 titres.\n")
    report.append(f"Les variables ne sont pas NLP-instrumentées.\n")
    report.append(f"Le modèle n'a JAMAIS vu ces titres pendant la calibration.\n")

    return "".join(report), verdict


# =============================================================================
# MAIN
# =============================================================================
def main():
    print("=" * 70)
    print("OMEGA PVI — Phase P3: Validation hors echantillon")
    print("=" * 70)

    model = load_model()
    print(f"Modele: {model['modele']} | AUC P2: {model['auc_train_cv']}")
    print(f"Features: {model['features']}")
    print(f"Coefficients: {model['coefficients']}")

    res_3a = test_3a(model)
    res_3b = test_3b(model)
    res_3c = test_3c(model)

    # Save predictions
    pred_path = os.path.join(OUTPUT_DIR, "prediction_post2022.json")
    with open(pred_path, "w", encoding="utf-8") as f:
        json.dump(res_3b["results"], f, indent=2, ensure_ascii=False)
    print(f"\nPredictions saved: {pred_path}")

    # Generate report
    report_text, verdict = generate_report(model, res_3a, res_3b, res_3c)
    report_path = os.path.join(OUTPUT_DIR, "rapport_validation_p3.md")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report_text)
    print(f"Report: {report_path}")

    print(f"\n{'='*70}")
    print(f"VERDICT GLOBAL: {verdict}")
    print(f"{'='*70}")


if __name__ == "__main__":
    main()
