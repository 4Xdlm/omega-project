#!/usr/bin/env python3
"""
OMEGA PVI — Phase P2: Calibration des coefficients
Split stratifié 80/20, 3 modèles, hypothèses H1-H3, seuils FR/EN.
"""

import csv
import json
import math
import os
import sys
import warnings
import numpy as np
from collections import Counter

warnings.filterwarnings('ignore')

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
CORPUS_DIR = os.path.join(os.path.dirname(__file__), "..", "..",
                          "docs", "physique-litteraire", "corpus-analyse")
CORPUS_DIR = os.path.normpath(CORPUS_DIR)


def load_corpus():
    """Load FR + EN corpus CSVs into unified dataset."""
    rows = []
    for fname in ["pvi_corpus_FR.csv", "pvi_corpus_EN.csv"]:
        fpath = os.path.join(CORPUS_DIR, fname)
        if not os.path.exists(fpath):
            print(f"WARNING: {fpath} not found")
            continue
        with open(fpath, encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for r in reader:
                # Label: 1 = bestseller (A group), 0 = literary (B group)
                grp = r.get('groupe', '')
                if '-A' in grp:
                    label = 1
                elif '-B' in grp:
                    label = 0
                else:
                    label = -1  # C group — exclude from main training

                lang = r.get('langue', 'fr')
                if lang not in ('fr', 'en'):
                    lang = 'FR' if 'FR' in grp else 'EN'
                    lang = lang.lower()

                try:
                    row = {
                        'titre': r['titre'],
                        'auteur': r['auteur'],
                        'groupe': grp,
                        'langue': lang,
                        'label': label,
                        'FL': float(r.get('FL', 0) or 0),
                        'I': float(r.get('I', 0) or 0),
                        'T': float(r.get('T', 0) or 0),
                        'S': float(r.get('S', 0) or 0),
                        'Omega': float(r.get('Omega', 0) or 0),
                        'MS': float(r.get('MS', 0) or 0),
                        'U': float(r.get('U', 0) or 0),
                        'N_rev': int(r.get('N_rev', 0) or 0),
                        'DR': float(r.get('DR', 0) or 0),
                        'LP': float(r.get('LP', 0) or 0),
                        'PVI': float(r.get('PVI', 0) or 0),
                        'Q_prose': float(r.get('Q_prose', 0) or 0),
                        'FL_source': r.get('FL_source', 'PROXY'),
                    }
                    rows.append(row)
                except (ValueError, KeyError) as e:
                    continue

    return rows


def stratified_split(rows, test_frac=0.20, seed=42):
    """Stratified split by langue + label."""
    rng = np.random.RandomState(seed)
    strata = {}
    for r in rows:
        key = (r['langue'], r['label'])
        strata.setdefault(key, []).append(r)

    train, test = [], []
    for key, items in strata.items():
        idx = rng.permutation(len(items))
        n_test = max(1, int(len(items) * test_frac))
        for i, ix in enumerate(idx):
            if i < n_test:
                test.append(items[ix])
            else:
                train.append(items[ix])
    return train, test


def extract_features(rows, feature_names):
    """Extract feature matrix and labels."""
    X = []
    y = []
    for r in rows:
        feats = []
        for fn in feature_names:
            if fn == 'FL_1_Omega':
                feats.append(r['FL'] * (1 - r['Omega']))
            elif fn == 'I_T':
                feats.append(r['I'] * r['T'])
            elif fn == 'Arc_rev':
                n = r['N_rev']
                feats.append(0.50 if n < 2 else (1.00 if n == 2 else 1.20))
            else:
                feats.append(r.get(fn, 0))
        X.append(feats)
        y.append(r['label'])
    return np.array(X), np.array(y)


def cross_val_auc(X, y, model_class, model_params, n_folds=5, seed=42):
    """Manual stratified k-fold cross-validation AUC."""
    from sklearn.metrics import roc_auc_score
    rng = np.random.RandomState(seed)

    # Stratified split
    pos_idx = np.where(y == 1)[0]
    neg_idx = np.where(y == 0)[0]
    rng.shuffle(pos_idx)
    rng.shuffle(neg_idx)

    pos_folds = np.array_split(pos_idx, n_folds)
    neg_folds = np.array_split(neg_idx, n_folds)

    aucs = []
    for i in range(n_folds):
        test_idx = np.concatenate([pos_folds[i], neg_folds[i]])
        train_idx = np.concatenate([
            np.concatenate([pos_folds[j] for j in range(n_folds) if j != i]),
            np.concatenate([neg_folds[j] for j in range(n_folds) if j != i]),
        ])

        X_tr, y_tr = X[train_idx], y[train_idx]
        X_te, y_te = X[test_idx], y[test_idx]

        model = model_class(**model_params)
        model.fit(X_tr, y_tr)

        if hasattr(model, 'predict_proba'):
            proba = model.predict_proba(X_te)[:, 1]
        else:
            proba = model.decision_function(X_te)

        if len(np.unique(y_te)) > 1:
            aucs.append(roc_auc_score(y_te, proba))

    return np.mean(aucs) if aucs else 0.0, np.std(aucs) if aucs else 0.0


def train_and_evaluate(X_train, y_train, feature_names, model_name, report):
    """Train model, evaluate with CV, return results."""
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import accuracy_score, f1_score, confusion_matrix

    results = {}

    # LogisticRegression
    lr_params = {'class_weight': 'balanced', 'max_iter': 1000, 'C': 1.0}
    auc_mean, auc_std = cross_val_auc(X_train, y_train, LogisticRegression, lr_params)

    # Train on full train set for coefficients
    lr = LogisticRegression(**lr_params)
    lr.fit(X_train, y_train)
    y_pred = lr.predict(X_train)
    acc = accuracy_score(y_train, y_pred)
    f1 = f1_score(y_train, y_pred)
    cm = confusion_matrix(y_train, y_pred)

    coefs = {fn: round(float(c), 4) for fn, c in zip(feature_names, lr.coef_[0])}
    intercept = round(float(lr.intercept_[0]), 4)

    report.append(f"\n### {model_name} — LogisticRegression\n")
    report.append(f"- AUC-ROC (5-fold CV): **{auc_mean:.4f}** (std={auc_std:.4f})\n")
    report.append(f"- Accuracy (train): {acc:.4f}\n")
    report.append(f"- F1 (train): {f1:.4f}\n")
    report.append(f"- Confusion matrix: TN={cm[0][0]} FP={cm[0][1]} FN={cm[1][0]} TP={cm[1][1]}\n")
    report.append(f"- Intercept: {intercept}\n")
    report.append(f"- Coefficients:\n")
    for fn, c in sorted(coefs.items(), key=lambda x: -abs(x[1])):
        report.append(f"  - {fn}: {c:+.4f}\n")

    results['logreg'] = {
        'auc_cv': round(auc_mean, 4),
        'auc_std': round(auc_std, 4),
        'accuracy': round(acc, 4),
        'f1': round(f1, 4),
        'coefficients': coefs,
        'intercept': intercept,
    }

    # XGBoost if available and model is not minimal
    if model_name != "MINIMAL":
        try:
            from sklearn.ensemble import GradientBoostingClassifier
            gb_params = {'n_estimators': 100, 'max_depth': 3, 'random_state': 42}
            auc_gb, auc_gb_std = cross_val_auc(
                X_train, y_train, GradientBoostingClassifier, gb_params)

            gb = GradientBoostingClassifier(**gb_params)
            gb.fit(X_train, y_train)
            y_pred_gb = gb.predict(X_train)

            importances = {fn: round(float(imp), 4)
                           for fn, imp in zip(feature_names, gb.feature_importances_)}

            report.append(f"\n### {model_name} — GradientBoosting\n")
            report.append(f"- AUC-ROC (5-fold CV): **{auc_gb:.4f}** (std={auc_gb_std:.4f})\n")
            report.append(f"- Accuracy (train): {accuracy_score(y_train, y_pred_gb):.4f}\n")
            report.append(f"- Feature importances:\n")
            for fn, imp in sorted(importances.items(), key=lambda x: -x[1]):
                report.append(f"  - {fn}: {imp:.4f}\n")

            results['gradient_boosting'] = {
                'auc_cv': round(auc_gb, 4),
                'importances': importances,
            }
        except ImportError:
            report.append(f"\n### {model_name} — GradientBoosting: sklearn fallback used\n")

    return results


def test_hypotheses(train_data, report):
    """Test H1, H2, H3."""
    report.append("\n## Hypotheses H1-H3\n")

    # Prepare base PVI values
    from sklearn.metrics import roc_auc_score

    y = np.array([r['label'] for r in train_data])

    # H1: U weight doubled (1.6 instead of 0.8)
    pvi_base = []
    pvi_h1 = []
    for r in train_data:
        I, T, S, FL, MS, Omega, U, N_rev, DR, LP = (
            r['I'], r['T'], r['S'], r['FL'], r['MS'],
            r['Omega'], r['U'], r['N_rev'], r['DR'], r['LP'])

        E_emo = 0.40*I + 0.28*T + 0.17*S + 0.15*I*T
        E_cog = 0.40*FL + 0.25*FL*(1-MS) + 0.20*DR + 0.15*LP
        CE = E_emo / E_cog if E_cog > 0.001 else 999.0

        Arc = 0.50 if N_rev < 2 else (1.00 if N_rev == 2 else 1.20)
        R = 1 / (1 + math.exp(-(1.2*T + 1.5*I + 1.0*Arc - 2.5)))
        W = 1 / (1 + math.exp(-(1.8*I + 2.0*Omega + 0.8*U - 2.8)))
        W_h1 = 1 / (1 + math.exp(-(1.8*I + 2.0*Omega + 1.6*U - 2.8)))

        pvi_base.append(CE * Arc * R * W)
        pvi_h1.append(CE * Arc * R * W_h1)

    auc_base = roc_auc_score(y, pvi_base) if len(np.unique(y)) > 1 else 0
    auc_h1 = roc_auc_score(y, pvi_h1) if len(np.unique(y)) > 1 else 0

    report.append(f"\n### H1 — U poids double (0.8 -> 1.6)\n")
    report.append(f"- AUC PVI_base: {auc_base:.4f}\n")
    report.append(f"- AUC PVI_H1 (U=1.6): {auc_h1:.4f}\n")
    report.append(f"- Delta: {auc_h1 - auc_base:+.4f}\n")
    report.append(f"- Verdict: {'ADOPTER' if auc_h1 > auc_base + 0.02 else 'REJETER'}\n")

    # H2: Arc_rev(N>=4) = 1.35
    pvi_h2 = []
    for r in train_data:
        I, T, S, FL, MS, Omega, U, N_rev, DR, LP = (
            r['I'], r['T'], r['S'], r['FL'], r['MS'],
            r['Omega'], r['U'], r['N_rev'], r['DR'], r['LP'])
        E_emo = 0.40*I + 0.28*T + 0.17*S + 0.15*I*T
        E_cog = 0.40*FL + 0.25*FL*(1-MS) + 0.20*DR + 0.15*LP
        CE = E_emo / E_cog if E_cog > 0.001 else 999.0
        Arc = 0.50 if N_rev < 2 else (1.00 if N_rev == 2 else (1.35 if N_rev >= 4 else 1.20))
        R = 1 / (1 + math.exp(-(1.2*T + 1.5*I + 1.0*Arc - 2.5)))
        W = 1 / (1 + math.exp(-(1.8*I + 2.0*Omega + 0.8*U - 2.8)))
        pvi_h2.append(CE * Arc * R * W)

    auc_h2 = roc_auc_score(y, pvi_h2) if len(np.unique(y)) > 1 else 0
    report.append(f"\n### H2 — Arc_rev(N>=4) = 1.35\n")
    report.append(f"- AUC PVI_base: {auc_base:.4f}\n")
    report.append(f"- AUC PVI_H2: {auc_h2:.4f}\n")
    report.append(f"- Delta: {auc_h2 - auc_base:+.4f}\n")
    report.append(f"- Verdict: {'ADOPTER' if auc_h2 > auc_base + 0.02 else 'REJETER'}\n")

    # H3: PVI_v2 with FL*(1-Omega) penalty
    pvi_h3 = []
    for r in train_data:
        I, T, S, FL, MS, Omega, U, N_rev, DR, LP = (
            r['I'], r['T'], r['S'], r['FL'], r['MS'],
            r['Omega'], r['U'], r['N_rev'], r['DR'], r['LP'])
        E_emo = 0.40*I + 0.28*T + 0.17*S + 0.15*I*T
        E_cog = 0.40*FL + 0.25*FL*(1-MS) + 0.20*DR + 0.15*LP
        CE = E_emo / E_cog if E_cog > 0.001 else 999.0
        Arc = 0.50 if N_rev < 2 else (1.00 if N_rev == 2 else 1.20)
        R = 1 / (1 + math.exp(-(1.2*T + 1.5*I + 1.0*Arc - 2.5)))
        W = 1 / (1 + math.exp(-(1.8*I + 2.0*Omega + 0.8*U - 2.8)))
        penalty = max(0, 1 - 2.0 * FL * (1 - Omega))
        pvi_h3.append(CE * Arc * R * W * penalty)

    auc_h3 = roc_auc_score(y, pvi_h3) if len(np.unique(y)) > 1 else 0
    report.append(f"\n### H3 — PVI_v2 avec penalite FL*(1-Omega)\n")
    report.append(f"- AUC PVI_base: {auc_base:.4f}\n")
    report.append(f"- AUC PVI_H3: {auc_h3:.4f}\n")
    report.append(f"- Delta: {auc_h3 - auc_base:+.4f}\n")
    report.append(f"- Verdict: {'ADOPTER' if auc_h3 > auc_base + 0.02 else 'REJETER'}\n")

    return {'base': auc_base, 'H1': auc_h1, 'H2': auc_h2, 'H3': auc_h3}


def test_cultural_split(train_data, feature_names, report):
    """Train separately on FR and EN, compare coefficients."""
    from sklearn.linear_model import LogisticRegression

    report.append("\n## Seuils culturels FR vs EN\n")

    for lang_label in ['fr', 'en']:
        subset = [r for r in train_data if r['langue'] == lang_label]
        if len(subset) < 20:
            report.append(f"\n### {lang_label.upper()}: N={len(subset)} — insuffisant\n")
            continue

        X, y = extract_features(subset, feature_names)
        if len(np.unique(y)) < 2:
            report.append(f"\n### {lang_label.upper()}: une seule classe — skip\n")
            continue

        lr = LogisticRegression(class_weight='balanced', max_iter=1000)
        lr.fit(X, y)

        coefs = {fn: round(float(c), 4) for fn, c in zip(feature_names, lr.coef_[0])}
        report.append(f"\n### {lang_label.upper()} (N={len(subset)})\n")
        report.append(f"- Coefficients:\n")
        for fn, c in sorted(coefs.items(), key=lambda x: -abs(x[1])):
            report.append(f"  - {fn}: {c:+.4f}\n")

    return


def main():
    print("=" * 80)
    print("OMEGA PVI — Phase P2: Calibration")
    print("=" * 80)

    # Load data
    all_data = load_corpus()
    print(f"Total loaded: {len(all_data)}")

    # Filter A and B only for training
    ab_data = [r for r in all_data if r['label'] in (0, 1)]
    c_data = [r for r in all_data if r['label'] == -1]
    print(f"A+B for training: {len(ab_data)} (A={sum(1 for r in ab_data if r['label']==1)}, "
          f"B={sum(1 for r in ab_data if r['label']==0)})")
    print(f"C (excluded from train): {len(c_data)}")

    # Stratified split
    train_data, test_data = stratified_split(ab_data, test_frac=0.20, seed=42)
    print(f"Train: {len(train_data)} (A={sum(1 for r in train_data if r['label']==1)}, "
          f"B={sum(1 for r in train_data if r['label']==0)})")
    print(f"Test (GELE): {len(test_data)}")

    # Save frozen test set
    test_path = os.path.join(OUTPUT_DIR, "test_set_gele.csv")
    with open(test_path, 'w', newline='', encoding='utf-8') as f:
        if test_data:
            writer = csv.DictWriter(f, fieldnames=test_data[0].keys())
            writer.writeheader()
            writer.writerows(test_data)
    print(f"Test set frozen: {test_path}")

    # Report
    report = []
    report.append("# Rapport Calibration Phase P2\n\n")
    report.append(f"**Date**: 2026-03-29\n")
    report.append(f"**Corpus**: {len(ab_data)} titres (A+B), split 80/20\n")
    report.append(f"**Train**: {len(train_data)} | **Test (gele)**: {len(test_data)}\n\n")

    # =====================================================================
    # MODEL 1: MINIMAL (4 variables)
    # =====================================================================
    report.append("## Modele 1: MINIMAL (4 variables)\n")
    feat_minimal = ['FL', 'I', 'Omega', 'T']
    X_train_min, y_train = extract_features(train_data, feat_minimal)
    res_minimal = train_and_evaluate(X_train_min, y_train, feat_minimal, "MINIMAL", report)

    # =====================================================================
    # MODEL 2: INTERMEDIAIRE (6 variables)
    # =====================================================================
    report.append("\n## Modele 2: INTERMEDIAIRE (6 variables)\n")
    feat_inter = ['FL', 'I', 'Omega', 'T', 'S', 'N_rev']
    X_train_int, _ = extract_features(train_data, feat_inter)
    res_inter = train_and_evaluate(X_train_int, y_train, feat_inter, "INTERMEDIAIRE", report)

    # =====================================================================
    # MODEL 3: COMPLET (8 + interactions)
    # =====================================================================
    report.append("\n## Modele 3: COMPLET (8 + interactions)\n")
    feat_complet = ['FL', 'I', 'Omega', 'T', 'S', 'MS', 'U', 'N_rev', 'FL_1_Omega', 'I_T']
    X_train_comp, _ = extract_features(train_data, feat_complet)
    res_complet = train_and_evaluate(X_train_comp, y_train, feat_complet, "COMPLET", report)

    # =====================================================================
    # DECISION
    # =====================================================================
    auc_min = res_minimal['logreg']['auc_cv']
    auc_int = res_inter['logreg']['auc_cv']
    auc_comp = res_complet['logreg']['auc_cv']

    report.append("\n## Decision adoption modele\n\n")
    report.append(f"| Modele | AUC-ROC CV |\n")
    report.append(f"|--------|----------|\n")
    report.append(f"| MINIMAL (4v) | **{auc_min:.4f}** |\n")
    report.append(f"| INTERMEDIAIRE (6v) | **{auc_int:.4f}** |\n")
    report.append(f"| COMPLET (8v+2int) | **{auc_comp:.4f}** |\n\n")

    # Apply adoption rule
    if auc_min >= 0.78:
        if auc_int > auc_min + 0.05:
            if auc_comp > auc_int + 0.05:
                adopted = "COMPLET"
                adopted_result = res_complet
                adopted_features = feat_complet
            else:
                adopted = "INTERMEDIAIRE"
                adopted_result = res_inter
                adopted_features = feat_inter
        else:
            adopted = "MINIMAL"
            adopted_result = res_minimal
            adopted_features = feat_minimal
    elif auc_int >= 0.78:
        if auc_comp > auc_int + 0.05:
            adopted = "COMPLET"
            adopted_result = res_complet
            adopted_features = feat_complet
        else:
            adopted = "INTERMEDIAIRE"
            adopted_result = res_inter
            adopted_features = feat_inter
    else:
        # Pick best regardless
        best_auc = max(auc_min, auc_int, auc_comp)
        if best_auc == auc_comp:
            adopted = "COMPLET"
            adopted_result = res_complet
            adopted_features = feat_complet
        elif best_auc == auc_int:
            adopted = "INTERMEDIAIRE"
            adopted_result = res_inter
            adopted_features = feat_inter
        else:
            adopted = "MINIMAL"
            adopted_result = res_minimal
            adopted_features = feat_minimal

    report.append(f"**Modele adopte: {adopted}**\n")
    report.append(f"Raison: AUC={adopted_result['logreg']['auc_cv']:.4f}, "
                  f"regle de parcimonie appliquee.\n")

    # =====================================================================
    # HYPOTHESES H1-H3
    # =====================================================================
    hyp_results = test_hypotheses(train_data, report)

    # =====================================================================
    # CULTURAL SPLIT FR vs EN
    # =====================================================================
    test_cultural_split(train_data, adopted_features, report)

    # =====================================================================
    # SAVE COEFFICIENTS
    # =====================================================================
    coefficients = {
        "modele": adopted,
        "features": adopted_features,
        "auc_train_cv": adopted_result['logreg']['auc_cv'],
        "auc_std": adopted_result['logreg']['auc_std'],
        "accuracy_train": adopted_result['logreg']['accuracy'],
        "f1_train": adopted_result['logreg']['f1'],
        "coefficients": adopted_result['logreg']['coefficients'],
        "intercept": adopted_result['logreg']['intercept'],
        "seuils": {
            "bestseller_proba": 0.50,
            "zone_omega_pvi": 1.59,
            "zone_omega_qprose": 87
        },
        "hypotheses": {
            "H1_U_double": {"auc": hyp_results['H1'],
                            "adopted": hyp_results['H1'] > hyp_results['base'] + 0.02},
            "H2_arc_135": {"auc": hyp_results['H2'],
                           "adopted": hyp_results['H2'] > hyp_results['base'] + 0.02},
            "H3_penalty": {"auc": hyp_results['H3'],
                           "adopted": hyp_results['H3'] > hyp_results['base'] + 0.02},
        },
        "date_calibration": "2026-03-29",
        "n_train": len(train_data),
        "n_test_gele": len(test_data),
        "statut": "CALIBRE_SUR_TRAIN_UNIQUEMENT",
    }

    coef_path = os.path.join(OUTPUT_DIR, "coefficients_v2.json")
    with open(coef_path, 'w', encoding='utf-8') as f:
        json.dump(coefficients, f, indent=2, ensure_ascii=False)
    print(f"Coefficients saved: {coef_path}")

    # Verdict
    pass_p2 = adopted_result['logreg']['auc_cv'] >= 0.78
    verdict = "P2 PASS" if pass_p2 else "P2 FAIL"

    report.append(f"\n## Verdict\n\n")
    report.append(f"**{verdict}** (AUC={adopted_result['logreg']['auc_cv']:.4f}, seuil=0.78)\n")
    report.append(f"\nModele {adopted} gele dans coefficients_v2.json.\n")
    report.append(f"Test set gele dans test_set_gele.csv ({len(test_data)} titres).\n")
    report.append(f"NE PLUS MODIFIER jusqu'a Phase P3.\n")

    # Write report
    report_path = os.path.join(OUTPUT_DIR, "rapport_calibration.md")
    with open(report_path, 'w', encoding='utf-8') as f:
        f.writelines(report)
    print(f"\nReport: {report_path}")
    print(f"Verdict: {verdict}")


if __name__ == "__main__":
    main()
