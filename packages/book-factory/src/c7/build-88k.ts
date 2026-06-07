import { readFileSync, writeFileSync } from "node:fs";
import { buildCanonical } from "./build-canonical.js";
import { AuthorDecisionLedger } from "../identity/author-seal.js";
const RUN = "runs/c8_book60k";
const v0 = readFileSync(`${RUN}/MANUSCRIT.md`, "utf8");
const locks = AuthorDecisionLedger.fromJson(readFileSync("../../nexus/proof/AUTHOR_DECISIONS.json", "utf8"));
const r = await buildCanonical(v0, {
  overrides: {
    identityUnify: new Map([["gardien", { keep: "Henri", replace: ["Thomas"] }]]),
    locationUnify: new Map([["Ker-Morvan", ["Saint-Marc"]]]),
    literalReplacements: new Map([
      ["la mer du Nord", "l'Atlantique"],
      ["comme un lourd", "comme un couvercle"], // DÉCISION AUTEUR n°2-9 (NCR-005, 2/2 transmis)
      ["Elle avance pieds nus, la semelle de ses bottes restée accrochée à la porte.",
        "Elle retire ses bottes sur le seuil, la semelle restée accrochée à la porte, et avance pieds nus."],
    ]),
  },
  seeds: ["naufrage", "dette", "lettre", "carnet", "registre"],
  authorLocks: locks,
});
if (!r.ok) { console.log("BUILD FAIL: " + JSON.stringify(r.error).slice(0, 200)); process.exit(1); }
writeFileSync(`${RUN}/BUILD_CANONICAL_88K_REPORT.json`, JSON.stringify({ finalHash: r.value.finalHash, words: r.value.words, cleanliness: r.value.cleanliness }, null, 2), "utf8");
console.log(`hash=${r.value.finalHash.slice(0,16)} (attendu c02d39f1...) words=${r.value.words}`);
const c = r.value.cleanliness;
console.log(`SYNTAX=${c.SYNTAX_CLEAN} SEAM=${c.SEAM_CLEAN} SEMANTIC=${c.SEMANTIC_CLEAN} NARRATIVE=${c.NARRATIVE_CLEAN} LOCKS=${c.AUTHOR_LOCKS_INTACT}`);
console.log(`detail: redites=${c.detail.functionalRedundancies} compCassées=${c.detail.brokenComparisons} incipitClones=${c.detail.incipitClones} maxTic/1000w=${c.detail.maxTicPer1000w} locksIntact=${c.detail.locksIntact}`);
