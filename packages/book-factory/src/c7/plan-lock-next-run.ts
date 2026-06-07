import { mkdirSync, writeFileSync } from "node:fs";
import { sha256 } from "@omega/canon-kernel";
import { EntityRegistry } from "../identity/entity-registry.js";
import { validateDramaticQuotas } from "../planner/dramatic-quotas.js";
import type { PlannedChapter, DramaticFunction } from "../planner/dramatic-quotas.js";

/* PLAN-LOCK du prochain run (essai clinique EMP-16) — la pièce exigée par
 * 09_GAP_AND_BUILD avant tout nouveau livre. */

// 1. CASTING TOTAL (loi Dubois) : héros + figurants + lieux + seeds, TOUS mintés.
const reg = new EntityRegistry("next_book_v1");
const mints = [
  { kind: "CHARACTER", canonical: "Léna", aliases: ["Marchetti"] },
  { kind: "CHARACTER", canonical: "Garcia" },
  { kind: "CHARACTER", canonical: "Gaspard" },
  { kind: "CHARACTER", canonical: "Yvon", aliases: ["Squarcioni"] },
  { kind: "CHARACTER", canonical: "Henri", aliases: ["Morel"], vital: "DEAD" },
  { kind: "CHARACTER", canonical: "Dubois" },          // le figurant qui a fait la loi
  { kind: "CHARACTER", canonical: "Jean" },
  { kind: "CHARACTER", canonical: "Maryvonne" },        // figurante village
  { kind: "PLACE", canonical: "Ker-Morvan" },
  { kind: "PLACE", canonical: "mairie" }, { kind: "PLACE", canonical: "port" },
  { kind: "PLACE", canonical: "église" }, { kind: "PLACE", canonical: "cale" },
  { kind: "PLACE", canonical: "phare" },
  { kind: "EVENT", canonical: "naufrage" }, { kind: "EVENT", canonical: "dette", aliases: ["dettes"] },
  { kind: "OBJECT", canonical: "lettre" }, { kind: "OBJECT", canonical: "carnet" },
  { kind: "OBJECT", canonical: "registre", aliases: ["registres"] },
] as const;
for (const m of mints) { const r = reg.mint(m); if (!r.ok) throw new Error(r.error.detail); }

// 2. PLAN 50 chapitres / 3 actes — fonctions dramatiques passant la GATE.
const pattern: DramaticFunction[] = ["SETUP","ACTION","CONFRONTATION","TRANSITION","REVELATION"];
const plan: PlannedChapter[] = Array.from({ length: 50 }, (_, i) => ({
  chapter: i + 1,
  act: i < 12 ? 1 : i < 38 ? 2 : 3,
  fn: (i === 49 ? "PAYOFF" : i === 9 ? "REVELATION" : pattern[i % pattern.length]) as DramaticFunction,
}));
const gate = validateDramaticQuotas(plan);
if (!gate.ok) throw new Error("QUOTA_FAIL: " + JSON.stringify(gate.error.violations));

// 3. COOLDOWN (tics mesurés du 88k) + INCIPITS variés (anti-30/50 pluie).
const lock = {
  planLock: "NEXT_BOOK_V1", date: "2026-06-07", emp16: "essai clinique — 3 preuves avant promotion",
  casting: reg.all(),
  plan,
  quotaGate: "PASS (validateDramaticQuotas)",
  cooldownLexical: { rule: "3 usages -> banni 5 chapitres (levier P3)", watch: ["le gardien","le silence","il y a","la pluie","le village","la peur","l odeur","la mer","le vent"] },
  incipitPolicy: { rule: "tete de 4 mots UNIQUE par chapitre ; meteo en ouverture <= 5/50", pool: ["geste d un personnage","dialogue in medias res","objet en gros plan","son precis","lieu nouveau","temps differe","question interieure","action en cours","arrivee/depart","detail du corps"] },
  pacingShadow: "temporal_pacing LEVEL_1 SHADOW logge par chapitre (zero poids prod)",
  authorSeal: "file AUTHOR_REVIEW active ; ESCALATE -> question, jamais auto-fix",
};
mkdirSync("runs/next_book", { recursive: true });
const json = JSON.stringify(lock, null, 2);
writeFileSync("runs/next_book/PLAN_LOCK.json", json, "utf8");
console.log(`PLAN-LOCK scelle: entites=${reg.all().length} chapitres=${plan.length} quotaGate=PASS hash=${String(sha256(json)).slice(0,12)}`);
