import { readFileSync, writeFileSync } from "node:fs";
import { importManuscript } from "../doctor/manuscript-import.js";
const RUN = "runs/c8_book60k";
const text = readFileSync(`${RUN}/MANUSCRIT_V1_FINAL.md`, "utf8");
const imp = importManuscript(text); if (!imp.ok) throw 0;
// Proxy rythme (famille LEGION) : variance des longueurs de phrases par chapitre.
const rows = imp.value.chapters.map((c) => {
  const lens = c.prose.split(/(?<=[.!?…»])\s+(?!»)/u).map((s) => s.trim().split(/\s+/u).length).filter((n) => n > 1);
  const mean = lens.reduce((a, b) => a + b, 0) / Math.max(1, lens.length);
  const variance = lens.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, lens.length);
  const cv = Math.sqrt(variance) / Math.max(1, mean); // coefficient de variation = signal rythme
  return { chapter: c.chapter, sentences: lens.length, meanLen: Number(mean.toFixed(1)), cv: Number(cv.toFixed(3)) };
});
const cvs = rows.map((r) => r.cv);
const bookCv = cvs.reduce((a, b) => a + b, 0) / cvs.length;
const flat = rows.filter((r) => r.cv < 0.45).map((r) => r.chapter); // chapitres "plats"
const report = {
  mode: "SHADOW_LEVEL_1_MEASUREMENT_ONLY (poids production INCHANGÉ = 0 ; EMP-16)",
  proxy: "coefficient de variation des longueurs de phrases (famille rythme LEGION AUC .74-.82)",
  bookMeanCv: Number(bookCv.toFixed(3)),
  flattestChapters: flat,
  perChapter: rows,
  nextStep: "preuve 1/3 EMP-16 — comparer au prochain run avec pacing_mode planner",
};
writeFileSync(`${RUN}/TEMPORAL_PACING_SHADOW_REPORT.json`, JSON.stringify(report, null, 2), "utf8");
console.log(`bookMeanCv=${report.bookMeanCv} | chapitres plats (cv<0.45): ${flat.length}/50 → [${flat.slice(0,10).join(",")}…]`);
