/**
 * OMEGA Book-Factory — book-planner  (P1.B — the macro planner)
 *
 * Deterministic: a BookIntent (≈60k words, ≈30 chapters) → a BookPlan (N ChapterSpec +
 * pacing curve + seed_schedule + act structure + plan_hash). No randomness, no LLM.
 * Each ChapterSpec is then translatable into a genesis-planner `Intent` (chapter by chapter).
 *
 * The differentiator = the seed_schedule (plant → reinforce → bloom across chapters): it is what
 * creates long-range plot coherence and resolves "a clue planted in ch.2 pays off in ch.25".
 *
 * Reuses canon-kernel canonicalize+sha256 for the deterministic plan_hash. Additive, zero mutation.
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';

export type Genre = 'polar' | 'thriller' | 'sf';
export type POV = 'first' | 'third_limited' | 'third_omniscient';
export type Tense = 'past' | 'present';

export interface CharacterBrief { readonly id: string; readonly name: string; readonly role: string; }
export interface SeedBrief { readonly seed_id: string; readonly desc: string; }

export interface BookIntent {
  readonly title: string;
  readonly premise: string;
  readonly genre: Genre;
  readonly core_question: string;
  readonly protagonist: CharacterBrief;
  readonly cast: readonly CharacterBrief[];
  readonly setting: string;
  readonly tone: string;
  readonly target_word_count: number;
  readonly target_chapters?: number;
  readonly pov: POV;
  readonly tense: Tense;
  readonly seeds?: readonly SeedBrief[];
}

export interface Act { readonly index: number; readonly name: string; readonly from_chapter: number; readonly to_chapter: number; }

export interface ChapterSpec {
  readonly index: number;
  readonly act: number;
  readonly objective: string;
  readonly tension_target: number;
  readonly target_word_count: number;
  readonly pov_character: string;
  readonly seeds_to_plant: readonly string[];
  readonly seeds_to_reinforce: readonly string[];
  readonly seeds_to_bloom: readonly string[];
  readonly threads_to_open: readonly string[];
  readonly threads_to_advance: readonly string[];
  readonly threads_to_close: readonly string[];
  readonly entering_state_requirements: readonly string[];
}

export interface SeedScheduleEdge {
  readonly seed_id: string;
  readonly desc: string;
  readonly planted_chapter: number;
  readonly reinforced_chapter: number;
  readonly bloom_target_chapter: number;
}

export interface BookPlan {
  readonly book_id: string;
  readonly title: string;
  readonly genre: Genre;
  readonly act_structure: readonly Act[];
  readonly pacing_curve: readonly number[];
  readonly seed_schedule: readonly SeedScheduleEdge[];
  readonly chapters: readonly ChapterSpec[];
  readonly total_target_words: number;
  readonly plan_hash: string;
}

const r2 = (x: number): number => Math.round(x * 100) / 100;
const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));

/** 3-act template (polar/thriller/sf share the same skeleton; densities differ via pacing). */
function actStructure(n: number): { acts: Act[]; actIEnd: number; actIIEnd: number; climax: number } {
  const actIEnd = Math.max(1, Math.round(0.20 * n)); // exposition + inciting incident
  const actIIEnd = Math.max(actIEnd + 1, Math.round(0.75 * n)); // investigation / false leads
  const climax = Math.max(actIIEnd + 1, Math.round(0.88 * n)); // the central revelation
  const acts: Act[] = [
    { index: 1, name: 'Acte I — Exposition & incident', from_chapter: 1, to_chapter: actIEnd },
    { index: 2, name: 'Acte II — Enquête & fausses pistes', from_chapter: actIEnd + 1, to_chapter: actIIEnd },
    { index: 3, name: 'Acte III — Révélation & résolution', from_chapter: actIIEnd + 1, to_chapter: n },
  ];
  return { acts, actIEnd, actIIEnd, climax };
}

/** Rising tension to the climax (global max = 1.0), then falling action to the resolution. */
function pacingCurve(n: number, climax: number): number[] {
  const curve: number[] = [];
  for (let i = 1; i <= n; i++) {
    const t = i <= climax
      ? 0.15 + 0.85 * (i / climax)
      : Math.max(0.20, 1 - 0.75 * ((i - climax) / Math.max(1, n - climax)));
    curve.push(r2(clamp(t, 0, 1)));
  }
  return curve;
}

function actOf(i: number, acts: readonly Act[]): number {
  for (const a of acts) if (i >= a.from_chapter && i <= a.to_chapter) return a.index;
  return acts.length;
}

function scheduleSeeds(seeds: readonly SeedBrief[], actIIEnd: number, climax: number): SeedScheduleEdge[] {
  const k = seeds.length;
  const out: SeedScheduleEdge[] = [];
  for (let idx = 0; idx < k; idx++) {
    const seed = seeds[idx];
    if (seed === undefined) continue;
    const planted = clamp(2 + Math.round((idx * (actIIEnd - 2)) / Math.max(1, k)), 1, Math.max(1, actIIEnd - 1));
    // The LAST seed is the central mystery → it pays off AT the climax.
    const bloom = idx === k - 1
      ? climax
      : clamp(actIIEnd + 1 + Math.round((idx * (climax - actIIEnd - 1)) / Math.max(1, k)), planted + 2, climax);
    const safeBloom = Math.max(bloom, planted + 2);
    const reinforced = clamp(Math.round((planted + safeBloom) / 2), planted + 1, safeBloom - 1);
    out.push({ seed_id: seed.seed_id, desc: seed.desc, planted_chapter: planted, reinforced_chapter: reinforced, bloom_target_chapter: safeBloom });
  }
  return out;
}

function objectiveFor(i: number, act: number, n: number, climax: number, actIEnd: number, intent: BookIntent, plants: string[], blooms: string[]): string {
  if (i === 1) return `Présenter ${intent.protagonist.name} et le monde ordinaire ; amorcer le ton (${intent.tone}).`;
  if (i === actIEnd) return `Incident déclencheur : poser la question centrale — « ${intent.core_question} ».`;
  if (i === climax) return `Climax : révélation centrale qui répond à « ${intent.core_question} ».`;
  if (i === n) return `Dénouement : refermer les fils, retombée émotionnelle.`;
  if (blooms.length > 0) return `Acte ${act} : faire éclater l'indice (${blooms.join(', ')}) ; converger.`;
  if (plants.length > 0) return `Acte ${act} : planter l'indice (${plants.join(', ')}) ; complication / fausse piste.`;
  if (act === 2) return `Acte ${act} : avancer l'enquête ; approfondir un personnage ; relancer la tension.`;
  return `Acte ${act} : progression vers la résolution.`;
}

/** Build a deterministic BookPlan from a BookIntent. */
export function planBook(intent: BookIntent): BookPlan {
  const n = Math.max(3, intent.target_chapters ?? 30);
  const { acts, actIEnd, actIIEnd, climax } = actStructure(n);
  const curve = pacingCurve(n, climax);

  // Ensure at least one central seed (the core mystery) exists.
  const seeds: SeedBrief[] = (intent.seeds && intent.seeds.length > 0)
    ? [...intent.seeds]
    : [{ seed_id: 'central', desc: intent.core_question }];
  const schedule = scheduleSeeds(seeds, actIIEnd, climax);

  const plantByChap = new Map<number, string[]>();
  const reinforceByChap = new Map<number, string[]>();
  const bloomByChap = new Map<number, string[]>();
  for (const e of schedule) {
    (plantByChap.get(e.planted_chapter) ?? plantByChap.set(e.planted_chapter, []).get(e.planted_chapter)!).push(e.seed_id);
    (reinforceByChap.get(e.reinforced_chapter) ?? reinforceByChap.set(e.reinforced_chapter, []).get(e.reinforced_chapter)!).push(e.seed_id);
    (bloomByChap.get(e.bloom_target_chapter) ?? bloomByChap.set(e.bloom_target_chapter, []).get(e.bloom_target_chapter)!).push(e.seed_id);
  }

  // Word budget: denser at high tension, longer in breathers; normalized to hit the exact target.
  const base = intent.target_word_count / n;
  const rawWords: number[] = [];
  for (let i = 1; i <= n; i++) rawWords.push(Math.round(base * (1.1 - 0.2 * (curve[i - 1] ?? 0))));
  const rawSum = rawWords.reduce((a, b) => a + b, 0);
  const delta = intent.target_word_count - rawSum;
  rawWords[n - 1] = Math.max(1, (rawWords[n - 1] ?? 0) + delta); // absorb rounding on the last chapter

  const chapters: ChapterSpec[] = [];
  for (let i = 1; i <= n; i++) {
    const act = actOf(i, acts);
    const plants = plantByChap.get(i) ?? [];
    const reinforces = reinforceByChap.get(i) ?? [];
    const blooms = bloomByChap.get(i) ?? [];
    const enter: string[] = blooms.map((s) => `seed:${s} must be planted+reinforced`);
    chapters.push({
      index: i,
      act,
      objective: objectiveFor(i, act, n, climax, actIEnd, intent, plants, blooms),
      tension_target: curve[i - 1] ?? 0,
      target_word_count: rawWords[i - 1] ?? 0,
      pov_character: intent.protagonist.id,
      seeds_to_plant: plants,
      seeds_to_reinforce: reinforces,
      seeds_to_bloom: blooms,
      threads_to_open: i === 1 ? ['core'] : [],
      threads_to_advance: i > 1 && i < n ? ['core'] : [],
      threads_to_close: i === n ? ['core'] : [],
      entering_state_requirements: enter,
    });
  }

  const total = chapters.reduce((a, c) => a + c.target_word_count, 0);
  const book_id = `book_${sha256(canonicalize({ t: intent.title, p: intent.premise })).slice(0, 16)}`;
  const body = {
    book_id, title: intent.title, genre: intent.genre, act_structure: acts,
    pacing_curve: curve, seed_schedule: schedule, chapters, total_target_words: total,
  };
  const plan_hash = sha256(canonicalize(body));
  return { ...body, plan_hash };
}

/** Render the 30-chapter skeleton as a console-friendly table (the "ossature mathématique"). */
export function renderSkeleton(plan: BookPlan): string {
  const lines: string[] = [];
  lines.push(`╔══ OMEGA Book-Factory — SQUELETTE : ${plan.title} (${plan.genre}) ══`);
  lines.push(`║ chapitres=${plan.chapters.length}  mots cibles=${plan.total_target_words}  plan_hash=${plan.plan_hash.slice(0, 12)}…`);
  for (const a of plan.act_structure) lines.push(`║ ${a.name}  [ch ${a.from_chapter}–${a.to_chapter}]`);
  lines.push('║ seed_schedule:');
  for (const e of plan.seed_schedule) lines.push(`║   • ${e.seed_id} «${e.desc}» : planté ch${e.planted_chapter} → renforcé ch${e.reinforced_chapter} → ÉCLATE ch${e.bloom_target_chapter}`);
  lines.push('╟────┬─────┬──────┬───────┬──────────┬──────────────────────────────────────────────');
  lines.push('║ Ch │ Act │ Tens │ Mots  │ Pl/Re/Bl │ Objectif');
  lines.push('╟────┼─────┼──────┼───────┼──────────┼──────────────────────────────────────────────');
  for (const c of plan.chapters) {
    const sb = `${c.seeds_to_plant.length}/${c.seeds_to_reinforce.length}/${c.seeds_to_bloom.length}`;
    const obj = c.objective.length > 60 ? c.objective.slice(0, 57) + '…' : c.objective;
    lines.push(`║ ${String(c.index).padStart(2)} │  ${c.act}  │ ${c.tension_target.toFixed(2)} │ ${String(c.target_word_count).padStart(5)} │   ${sb.padEnd(6)} │ ${obj}`);
  }
  lines.push('╚════╧═════╧══════╧═══════╧══════════╧══════════════════════════════════════════════');
  return lines.join('\n');
}
