#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ÉTALONNEUR — Power-On Self-Test calibration par-LLM (EMP-19). À EXÉCUTER AU DÉBUT de toute tâche
métrologie/génération. Compare les modèles Ollama installés (digests réels) au registre v2 +
vérifie SHA artefacts + signale le gap de calibration génération (Rosetta).
Statut par rôle ; exit 1 + GATE=RECALIBRATION_REQUIRED si un rôle de mesure requis n'est pas approuvé.
Lecture seule. ZERO modif moteur. Usage: python calibration_check.py [REGISTRY] [REPO_ROOT]
"""
import json, os, sys, subprocess, hashlib
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass

REPO = sys.argv[2] if len(sys.argv) > 2 else r"C:\Users\elric\omega-project"
REG = sys.argv[1] if len(sys.argv) > 1 else os.path.join(REPO, "docs", "metrology", "CALIBRATION_REGISTRY.json")
REQUIRED = ["judge_pairwise", "embedding_radar"]
OK_STATUS = {"CALIBRATED", "ADVISORY_APPROVED", "PAIRWISE_APPROVED"}

def ollama_ids():
    out = {}
    try:
        r = subprocess.run(["ollama", "list"], capture_output=True, text=True, timeout=30)
        for ln in r.stdout.splitlines()[1:]:
            p = ln.split()
            if len(p) >= 2: out[p[0]] = p[1]
    except Exception as e:
        print(f"[CALIB] WARN ollama list KO: {e}")
    return out

def sha256(path):
    if not os.path.exists(path): return None
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for c in iter(lambda: f.read(65536), b""): h.update(c)
    return h.hexdigest()

def main():
    reg = json.load(open(REG, encoding="utf-8"))
    inst = ollama_ids()
    results = {}; gate_ok = True

    for role, spec in reg.get("measurement_roles", {}).items():
        model = spec["model"]; want = spec.get("ollama_id"); cur = inst.get(model)
        reasons = []; status = spec.get("status", "CALIBRATION_REQUIRED")
        if cur is None: status = "EXPIRED_PROFILE"; reasons.append(f"{model} non installé")
        elif cur != want: status = "EXPIRED_PROFILE"; reasons.append(f"digest {cur} != {want}")
        art = spec.get("artifacts", {})
        if "centroids_file" in art:
            cur_sha = sha256(os.path.join(REPO, art["centroids_file"]))
            if cur_sha != art.get("centroids_sha256"):
                status = "EXPIRED_PROFILE"; reasons.append("centroids sha drift")
        results[role] = {"model": model, "status": status, "reasons": reasons,
                         "validity_scope": spec.get("validity_scope"), "forbidden_uses": spec.get("forbidden_uses")}
        if role in REQUIRED and status not in OK_STATUS: gate_ok = False

    gen = reg.get("generation_roles", {}).get("prose_generator", {})
    if gen:
        results["generation:prose"] = {"status": gen.get("status"), "reasons": [gen.get("gap", "")[:120]]}

    for name, spec in reg.get("scorer_models", {}).items():
        results[f"scorer:{name}"] = {"status": spec.get("status")}

    verdict = "GO_MEASURE" if gate_ok else "RECALIBRATION_REQUIRED"
    print(json.dumps({"verdict": verdict, "required_measurement_roles": REQUIRED,
                      "roles": results}, ensure_ascii=False, indent=2))
    if not gate_ok:
        print("\n[CALIB] GATE = RECALIBRATION_REQUIRED — rôle de mesure requis non approuvé. STOP (EMP-19).")
        sys.exit(1)
    print("\n[CALIB] GATE = GO_MEASURE — rôles de mesure requis approuvés. "
          "(NB: generation:prose peut être en GAP Rosetta — non bloquant pour la MESURE.)")
    sys.exit(0)

if __name__ == "__main__":
    main()
