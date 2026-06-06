/**
 * OMEGA Book-Factory — C11.2 REPAIR PLANNER (BF-08) — findings C9 → plan typé.
 *
 * MÉCANISME : l'audit (4 instruments C9) produit des findings ; le planner les
 * classe par RISQUE (doctor-types) et choisit les paramètres d'exécution.
 *
 * LEÇON D'HONNÊTETÉ (88k, vérité terrain) : l'unification AUTO par dominance
 * numérique aurait choisi « Thomas » (×16) — or la décision éditoriale était
 * « Henri (Morel) » (nom complet donné en scène d'identification). La fréquence
 * n'est PAS l'autorité éditoriale ⇒ le keep auto = dominant, MAIS un override
 * human-in-the-loop (GO_B) peut l'inverser ; le rapport documente TOUJOURS
 * l'alternative. C'est la preuve mécanique que GO_B (semi-automatique) est la
 * bonne doctrine — pas une concession.
 *
 * DÉTECTION DE LIEU DOUBLE : réutilise l'IDENTITY_DRIFT d'arc-coherence avec
 * des RÔLES GÉOGRAPHIQUES (« village », « île », « port ») — « village de
 * Saint-Marc » vs « village de Ker-Morvan » = deux noms co-occurrents du même
 * rôle géo = dérive détectable par l'instrument EXISTANT (zéro module neuf).
 */

import type { DoctorAudit, RepairAction, RepairPlan } from './doctor-types.js';
import type { ChapterSlice } from './doctor-types.js';
import { compareStrings } from '../identity/identity-types.js';

/** Fragment pendu : mot-outil de 1-2 lettres (sans ponctuation finale) juste
 *  avant un saut de paragraphe puis une majuscule — signature des coutures
 *  cassées du 60k (« …luisant. Elle l ¶¶ Le métal… », « …pas à l ¶¶ Le silence… »).
 *  En français aucune phrase saine ne FINIT par l/d/qu/s/n/j/c nus : signature sûre. */
const DANGLING_RE = /(?<=\p{L})\s+(l|d|qu|s|n|j|c)[ \t]*\r?\n\s*\r?\n\s*(?=[A-ZÀÂÉÈÊËÎÏÔÛÙÜ«])/gu;

export interface StitchFinding {
  readonly chapter: number;
  readonly danglingFragment: string;
  readonly excerpt: string;
}

/** Détecte les coutures cassées dans les chapitres (détection PURE, pas de fix ici). */
export function detectBrokenStitches(chapters: readonly ChapterSlice[]): readonly StitchFinding[] {
  const out: StitchFinding[] = [];
  for (const c of chapters) {
    let m: RegExpExecArray | null;
    DANGLING_RE.lastIndex = 0;
    while ((m = DANGLING_RE.exec(c.prose)) !== null) {
      const start = Math.max(0, m.index - 60);
      out.push({
        chapter: c.chapter,
        danglingFragment: (m[1] ?? '').trim(),
        excerpt: `${c.prose.slice(start, m.index + (m[1] ?? '').length + 1).replace(/\s+/gu, ' ')} ¶`.trim(),
      });
    }
  }
  return out;
}

export interface PlannerOverrides {
  /** Choix éditorial humain : rôle → nom à GARDER (sinon dominant auto). */
  readonly identityKeep?: ReadonlyMap<string, string>;
  /** Unification COMPLÈTE imposée (GO_B) : rôle → {keep, replace} — bypasse le
   *  drift auto (seul chemin sûr quand la dérive est confuse). */
  readonly identityUnify?: ReadonlyMap<string, { readonly keep: string; readonly replace: readonly string[] }>;
  /** Unifications de lieu imposées : keep → liste à remplacer. */
  readonly locationUnify?: ReadonlyMap<string, readonly string[]>;
  /** Remplacements textuels exacts supplémentaires (ex. « la mer du Nord » → « l'Atlantique »). */
  readonly literalReplacements?: ReadonlyMap<string, string>;
}

const GEO_ROLES = new Set(['village', 'île', 'port', 'ville', 'presqu']);

/** GARDE-FOU (leçon E2E 88k) : au-delà de ce nombre de noms candidats, la
 *  dérive est CONFUSE (bruit de co-occurrence massif — Squarcioni/Marchetti
 *  capturés autour de « gardien ») ⇒ JAMAIS d'unification auto, SIGNAL_ONLY.
 *  L'humain tranche via identityUnify (GO_B). EXPERIMENTAL_DEFAULT. */
export const MAX_AUTO_UNIFY_NAMES = 3;

/** Filtre GÉO : un nom n'est une désignation de lieu QUE s'il porte le marqueur
 *  direct (« village de X ») quelque part dans le corpus — la co-occurrence
 *  seule capture le maire discuté près du mot « village » (leçon E2E 88k). */
function geoDirectNames(role: string, names: readonly string[], chapters: readonly ChapterSlice[]): readonly string[] {
  const out: string[] = [];
  for (const name of names) {
    const re = new RegExp(`${role}\\s+(?:d[eu]|de\\s+la|d['’])\\s*${name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}`, 'iu');
    if (chapters.some((c) => re.test(c.prose.normalize('NFC')))) out.push(name);
  }
  return out;
}

export function buildRepairPlan(
  audit: DoctorAudit,
  chapters: readonly ChapterSlice[],
  overrides: PlannerOverrides = {},
): RepairPlan {
  const actions: RepairAction[] = [];

  /* ── 1. Dérives d'identité (personnages ET lieux via rôles géo) ───────── */
  for (const drift of audit.arc.identityDrifts) {
    const isGeo = GEO_ROLES.has(drift.role);

    // Override COMPLET (GO_B) : l'humain a tranché — exécution telle quelle.
    const full = overrides.identityUnify?.get(drift.role);
    if (full !== undefined) {
      actions.push({
        kind: isGeo ? 'UNIFY_LOCATION' : 'UNIFY_IDENTITY', cls: 'MECHANICAL_SAFE',
        ...(isGeo ? {} : { role: drift.role }),
        keep: full.keep, replace: full.replace,
        evidence: `rôle « ${drift.role} » — unification IMPOSÉE par l'éditeur (GO_B) : ${full.replace.join(', ')} → ${full.keep}`,
      } as RepairAction);
      continue;
    }

    // Rôles GÉO : ne garder que les noms portant le marqueur direct dans le corpus.
    const candidateNames = isGeo
      ? drift.names.filter((n) => geoDirectNames(drift.role, [n.name], chapters).length > 0)
      : [...drift.names];
    const sorted = [...candidateNames].sort((a, b) => b.occurrences - a.occurrences || compareStrings(a.name, b.name));
    const dominant = sorted[0];
    if (dominant === undefined || sorted.length < 2) {
      if (drift.names.length >= 2) {
        actions.push({ kind: 'SIGNAL', cls: 'SIGNAL_ONLY', topic: 'LOCATION_JUMP', detail: `dérive « ${drift.role} » sans marqueur direct exploitable (${drift.names.map((n) => n.name).join('/')}) — revue humaine`, count: drift.names.length });
      }
      continue;
    }

    // GARDE-FOU anti-massacre : dérive confuse ⇒ SIGNAL, jamais d'auto.
    if (sorted.length > MAX_AUTO_UNIFY_NAMES) {
      actions.push({
        kind: 'SIGNAL', cls: 'SIGNAL_ONLY', topic: 'LOCATION_JUMP',
        detail: `dérive CONFUSE rôle « ${drift.role} » (${sorted.length} noms : ${sorted.slice(0, 6).map((n) => `${n.name}×${n.occurrences}`).join(' / ')}…) — unification auto INTERDITE, trancher via identityUnify`,
        count: sorted.length,
      });
      continue;
    }

    const keep = overrides.identityKeep?.get(drift.role) ?? dominant.name;
    const replace = sorted.filter((n) => n.name !== keep).map((n) => n.name);
    if (replace.length === 0) continue;
    actions.push({
      kind: isGeo ? 'UNIFY_LOCATION' : 'UNIFY_IDENTITY',
      cls: 'MECHANICAL_SAFE',
      ...(isGeo ? {} : { role: drift.role }),
      keep,
      replace,
      evidence: `rôle « ${drift.role} » : ${sorted.map((n) => `${n.name}×${n.occurrences}`).join(' / ')}${
        overrides.identityKeep?.has(drift.role) === true
          ? ` — keep=« ${keep} » par OVERRIDE éditorial (l'auto aurait gardé « ${dominant.name} »)`
          : ` — keep auto=dominant « ${keep} »`
      }`,
    } as RepairAction);
  }

  /* ── 2. Unifications de lieu imposées (override humain pur) ───────────── */
  for (const [keep, replace] of overrides.locationUnify ?? new Map<string, readonly string[]>()) {
    actions.push({ kind: 'UNIFY_LOCATION', cls: 'MECHANICAL_SAFE', keep, replace, evidence: 'override éditorial' });
  }

  /* ── 3. Coutures cassées ──────────────────────────────────────────────── */
  for (const s of detectBrokenStitches(chapters)) {
    actions.push({ kind: 'FIX_BROKEN_STITCH', cls: 'MECHANICAL_SAFE', chapter: s.chapter, danglingFragment: s.danglingFragment, excerpt: s.excerpt });
  }

  /* ── 4. Micro-physique → packets chirurgicaux (préparés, gated LLM) ───── */
  for (const p of audit.physics) {
    if (p.kind === 'FOOTWEAR_CONTRADICTION') {
      actions.push({
        kind: 'SURGICAL_REWRITE', cls: 'SURGICAL_LLM',
        chapter: p.locus.chapter, sentenceIndex: p.locus.sentenceIndex,
        reason: p.kind, segmentExcerpt: p.locus.excerpt,
        directive: `[FAIT] Le personnage était chaussé (« ${p.established.slice(0, 60)} »). [OBSERVÉ] « ${p.contradiction.slice(0, 60)} ». [ORDRE] Rends la transition physiquement possible (retrait explicite ou cohérence). N'altère rien d'autre.`,
      });
    } else {
      actions.push({ kind: 'SIGNAL', cls: 'SIGNAL_ONLY', topic: p.kind === 'DOOR_REOPENED' ? 'DOOR' : 'OBJECT', detail: `${p.kind} ch.${p.locus.chapter} : ${p.locus.excerpt.slice(0, 70)}`, count: 1 });
    }
  }

  /* ── 5. Signaux chapitre + arc + tics (JAMAIS auto — leçon faux-UNPAID) ── */
  const byKind = new Map<string, number>();
  for (const s of audit.chapterSignals) byKind.set(s.kind, (byKind.get(s.kind) ?? 0) + 1);
  for (const [k, n] of [...byKind.entries()].sort((a, b) => compareStrings(a[0], b[0]))) {
    actions.push({ kind: 'SIGNAL', cls: 'SIGNAL_ONLY', topic: k as 'TIME_REGRESSION' | 'GHOST_SPEAKER' | 'LOCATION_JUMP', detail: `${n} signaux (part de flashbacks/légitimes possible — revue humaine)`, count: n });
  }
  const redites = audit.arc.chapterFunctions.filter((f) => f.fn === 'REDITE');
  if (redites.length > 0) {
    actions.push({ kind: 'SIGNAL', cls: 'SIGNAL_ONLY', topic: 'REDITE', detail: `chapitres ${redites.map((r) => r.chapter).join(', ')} — fusion/coupe = décision humaine`, count: redites.length });
  }
  for (const seed of audit.arc.seedLedger.filter((s) => s.payoffChapter === 'UNPAID' && s.plantedChapter !== 'ABSENT')) {
    actions.push({ kind: 'SIGNAL', cls: 'SIGNAL_ONLY', topic: 'SEED_UNPAID', detail: `« ${seed.seed} » planté ch.${String(seed.plantedChapter)} — VÉRIFIER SUR PIÈCE avant d'éditer (précédent : faux-UNPAID lettre/registre)`, count: 1 });
  }
  const failTics = audit.tics.rows.filter((r) => r.level === 'FAIL_SHADOW');
  if (failTics.length > 0) {
    actions.push({ kind: 'SIGNAL', cls: 'SIGNAL_ONLY', topic: 'TICS', detail: `${failTics.length} tics FAIL_SHADOW (top : ${failTics.slice(0, 3).map((t) => `« ${t.gram} »×${t.occurrences}`).join(' · ')}) — traitement = cooldown au prochain run, PAS d'édition de masse`, count: failTics.length });
  }

  return {
    actions,
    mechanicalCount: actions.filter((a) => a.cls === 'MECHANICAL_SAFE').length,
    surgicalCount: actions.filter((a) => a.cls === 'SURGICAL_LLM').length,
    signalCount: actions.filter((a) => a.cls === 'SIGNAL_ONLY').length,
  };
}
