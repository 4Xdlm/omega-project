import { readFileSync, writeFileSync } from "node:fs";
import { sha256 } from "@omega/canon-kernel";
/* CÂBLAGE PLAN_LOCK → DIRECTIVES RUNTIME (mandat tribunal : « pas juste présent
 * dans un fichier — injecté dans les directives »). Compile le pack par chapitre
 * que l orchestrateur lit au démarrage de CHAQUE génération. */
const lock = JSON.parse(readFileSync("runs/next_book/PLAN_LOCK.json", "utf8"));
const seals = JSON.parse(readFileSync("../../nexus/proof/AUTHOR_DECISIONS.json", "utf8"));
const cast = lock.casting.map((e: { kind: string; canonical: string; entityId: string }) => `${e.canonical} [${e.entityId}|${e.kind}]`).join(", ");
const packs = lock.plan.map((c: { chapter: number; act: number; fn: string }, i: number) => ({
  chapter: c.chapter, act: c.act,
  directive: [
    `[FONCTION DRAMATIQUE OBLIGATOIRE] ${c.fn} — le chapitre DOIT accomplir cette fonction (gate quotas, refus sinon).`,
    `[CASTING TOTAL — SEULES entités autorisées] ${cast}. Toute entité hors registre = IDENTITY_UNDEFINED.`,
    `[COOLDOWN LEXICAL] INTERDITS si utilisés 3× dans les 5 derniers chapitres : ${lock.cooldownLexical.watch.join(", ")}.`,
    `[INCIPIT] Tête de 4 mots UNIQUE dans le livre ; ouverture météo interdite (quota atteint au-delà de 5/50). Ouverture imposée ch.${c.chapter} : ${lock.incipitPolicy.pool[i % lock.incipitPolicy.pool.length]}.`,
    `[SCEAUX D AUTEUR] ${seals.decisions.filter((d: { supersededBy: string | null }) => d.supersededBy === null).length} décisions actives — zones AUTHOR_LOCKED intouchables, ESCALATE en cas de doute.`,
    `[PACING] temporal_pacing SHADOW loggé (aucun poids production).`,
  ].join("\n"),
}));
const out = { run: "NEXT_BOOK_V1_FULLSTACK_EMP16", planLockHash: "df8d650f", compiled: "2026-06-07", packs };
writeFileSync("runs/next_book/DIRECTIVE_PACKS.json", JSON.stringify(out, null, 2), "utf8");
console.log(`DIRECTIVE PACKS compilés: ${packs.length} chapitres, hash=${String(sha256(JSON.stringify(out))).slice(0, 12)}`);
console.log("=== DRY-RUN PREUVE D INJECTION — CHAPITRE 1 ===");
console.log(packs[0].directive);
