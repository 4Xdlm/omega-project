#!/usr/bin/env python3
"""
OMEGA — Calibration Report v2.3
Agrege tous les CALIBRATION_WARNING et produit un rapport de validation.
"""
import json
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("CALIB")


def run():
    results_dir = Path("results")
    warnings = []
    ok_count = 0
    total_files = 0

    for json_file in sorted(results_dir.rglob("*.json")):
        if any(skip in json_file.name for skip in ["SUMMARY", "CALIBRATION", "REPORT"]):
            continue

        total_files += 1
        try:
            with open(json_file, encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            log.warning(f"Skip {json_file.name}: {e}")
            continue

        gv = data.get("golden_validation", {})
        if gv.get("calibration_status") == "CALIBRATION_WARNING":
            for w in gv.get("golden_warnings", []):
                warnings.append({
                    "file": json_file.name,
                    "author": data.get("meta", {}).get("author", "?"),
                    "work_id": data.get("meta", {}).get("work_id", "?"),
                    "extract_type": data.get("meta", {}).get("extract_type", "?"),
                    **w,
                })
        elif gv.get("calibration_status") == "CALIBRATED_OK":
            ok_count += 1

    report = {
        "total_files_analyzed": total_files,
        "total_warnings": len(warnings),
        "total_calibrated_ok": ok_count,
        "total_no_golden_data": total_files - ok_count - len(set(w["file"] for w in warnings)),
        "status": "CALIBRATED" if len(warnings) == 0 else "NEEDS_INVESTIGATION",
        "warnings": sorted(warnings, key=lambda x: x.get("delta_pct", 0), reverse=True),
    }

    out = Path("results/golden_validation/CALIBRATION_REPORT.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    log.info(f"Fichiers analyses: {total_files}")
    log.info(f"Calibration OK: {ok_count}")
    log.info(f"Warnings: {len(warnings)}")
    log.info(f"Status: {report['status']}")
    log.info(f"Rapport: {out}")


if __name__ == "__main__":
    log.info("OMEGA Calibration Report v2.3")
    run()
