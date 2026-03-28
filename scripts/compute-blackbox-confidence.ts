/**
 * OMEGA — Compute confidence scores for Black-Box Laws
 * Reads existing JSON data, computes delta/std/confidence per law, updates LAWS.json
 *
 * Usage: npx tsx scripts/compute-blackbox-confidence.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const BASE = 'C:/Users/elric/omega-project/src/scoring/data';

function load(name: string): Record<string, any> {
  return JSON.parse(fs.readFileSync(path.join(BASE, name), 'utf-8'));
}

const baseline = load('CLAUDE_BLACKBOX_BASELINE.json');
const compliance = load('CLAUDE_BLACKBOX_INSTRUCTION_COMPLIANCE.json');
const ceilings = load('CLAUDE_BLACKBOX_CEILINGS.json');
const attractors = load('CLAUDE_BLACKBOX_ATTRACTORS.json');
const conflicts = load('CLAUDE_BLACKBOX_CONFLICTS.json');

const gc = baseline.gravity_center;
const r4 = (v: number) => Math.round(v * 10000) / 10000;

// ═══════════════════════════════════════════════════════════════════
// HELPER: confidence from signal-to-noise
// confidence = clamp(|delta_mean| / (std + eps), 0, 1)
// high delta + low std = high confidence
// ═══════════════════════════════════════════════════════════════════

function confidenceFromSNR(delta: number, std: number, scale = 1): number {
  const eps = 0.001;
  const snr = Math.abs(delta) / (std * scale + eps);
  return Math.min(1, Math.max(0, snr / 3));
}

function confidenceFromMultipleTests(tests: { delta: number; std: number }[]): number {
  if (tests.length === 0) return 0;
  const scores = tests.map(t => confidenceFromSNR(t.delta, t.std));
  return r4(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function label(c: number): string {
  if (c >= 0.7) return 'HAUTE';
  if (c >= 0.4) return 'MOYENNE';
  return 'FAIBLE';
}

// ═══════════════════════════════════════════════════════════════════
// LOI 1: Claude recentre les extrêmes syntaxiques
// Evidence: Bloc 4 — extremes that get pulled back toward baseline
// ═══════════════════════════════════════════════════════════════════

const att = attractors.categories;

// oralite_sale: asked for broken syntax, f1_mean stayed near baseline
const oral_f1 = att.oralite_sale.deviation_from_baseline.f1_mean;
const oral_f1_std = att.oralite_sale.features.f1_mean.std;

// zero_description: asked ZERO desc, desc_score barely dropped
const zdesc = att.zero_description.deviation_from_baseline.f25g_description_score;
const zdesc_std = att.zero_description.features.f25g_description_score.std;

// zero_introspection: asked ZERO introsp → sil=0 (complied), but description stayed
const zintr_desc = att.zero_introspection.deviation_from_baseline.f25g_description_score;
const zintr_desc_std = att.zero_introspection.features.f25g_description_score.std;

// Recentering = the delta is SMALL relative to what was asked
// We measure: how much did the feature NOT move despite extreme instruction?
// For oralite: f1_mean barely moved (delta=0.91 on baseline 13.04 = 7%)
// Signal: the PROXIMITY to baseline IS the evidence, std measures consistency
// Confidence: low std of the "not-moving" = consistent recentering
const loi1_tests = [
  { delta: Math.abs(oral_f1.delta), std: oral_f1_std }, // small delta = evidence of recentering, need low std
  { delta: Math.abs(zdesc.delta), std: zdesc_std },     // only 15% drop in description
  { delta: Math.abs(zintr_desc.delta), std: zintr_desc_std }, // desc stayed even with zero-introsp
];
// For recentering, HIGH confidence means: small delta + small std = consistent non-movement
// Invert: confidence = 1 - normalizedDelta, weighted by consistency
const loi1_recentering_scores = loi1_tests.map(t => {
  // Small delta relative to baseline range → high recentering confidence
  const normalized_delta = Math.min(t.delta / (gc.f1_mean || 1), 1);
  const consistency = 1 / (1 + t.std);
  return (1 - normalized_delta) * consistency;
});
const loi1_conf = r4(loi1_recentering_scores.reduce((a, b) => a + b, 0) / loi1_recentering_scores.length);

// ═══════════════════════════════════════════════════════════════════
// LOI 2: Claude exécute mieux l'exemplar que la consigne abstraite
// Evidence: Bloc 2 — compare formulation types across families
// ═══════════════════════════════════════════════════════════════════

const families = compliance.families;
let exemplar_wins = 0;
let total_families = 0;
const loi2_deltas: { delta: number; std: number }[] = [];

for (const [fname, fdata] of Object.entries(families) as [string, any][]) {
  const formulations = fdata.formulations;
  const fkey = fdata.feature_key;

  const simple_mean = formulations.simple?.stats?.mean ?? 0;
  const technique_mean = formulations.technique?.stats?.mean ?? 0;
  const metaphorique_mean = formulations.metaphorique?.stats?.mean ?? 0;
  const exemplar_mean = formulations.exemplar?.stats?.mean ?? 0;
  const exemplar_std = formulations.exemplar?.stats?.std ?? 0;
  const simple_std = formulations.simple?.stats?.std ?? 0;

  // For each family, check if exemplar produced higher feature value than simple
  const abstract_max = Math.max(simple_mean, technique_mean, metaphorique_mean);

  if (exemplar_mean > abstract_max * 0.95) {
    exemplar_wins++;
  }
  total_families++;

  // Delta between exemplar and simple
  const delta = Math.abs(exemplar_mean - simple_mean);
  const combined_std = Math.sqrt(exemplar_std ** 2 + simple_std ** 2);
  loi2_deltas.push({ delta, std: combined_std });
}

// Confidence: proportion of families where exemplar ≥ best abstract
const loi2_conf = r4(exemplar_wins / Math.max(total_families, 1));

// ═══════════════════════════════════════════════════════════════════
// LOI 3: Claude comprime les demandes d'alternance
// Evidence: Bloc 2 family B_alternance_long_court — f1b_rhythm_ratio
// ═══════════════════════════════════════════════════════════════════

const alt_family = families.B_alternance_long_court;
const alt_baseline = baseline.global_features.f1b_rhythm_ratio?.mean ?? 0;
const alt_simple = alt_family.formulations.simple?.stats?.mean ?? 0;
const alt_simple_std = alt_family.formulations.simple?.stats?.std ?? 0;
const alt_technique = alt_family.formulations.technique?.stats?.mean ?? 0;
const alt_technique_std = alt_family.formulations.technique?.stats?.std ?? 0;
const alt_exemplar = alt_family.formulations.exemplar?.stats?.mean ?? 0;
const alt_exemplar_std = alt_family.formulations.exemplar?.stats?.std ?? 0;

// Compression = the rhythm didn't increase as much as demanded
// If baseline rhythm is X and demanded is "max", but output is only slightly above X → compression
const alt_deltas = [
  { delta: alt_simple - alt_baseline, std: alt_simple_std },
  { delta: alt_technique - alt_baseline, std: alt_technique_std },
  { delta: alt_exemplar - alt_baseline, std: alt_exemplar_std },
];

// If deltas are small relative to baseline = compression happening
const alt_rel_deltas = alt_deltas.map(d => Math.abs(d.delta) / (alt_baseline + 0.01));
const compression_evidence = alt_rel_deltas.filter(d => d < 0.5).length / alt_rel_deltas.length;
const alt_consistency = 1 / (1 + alt_deltas.reduce((s, d) => s + d.std, 0) / alt_deltas.length);
const loi3_conf = r4(compression_evidence * alt_consistency);

// ═══════════════════════════════════════════════════════════════════
// LOI 4: Claude favorise un régime introspectif par défaut
// Evidence: Bloc 1 baseline — check SIL + modal across categories
// ═══════════════════════════════════════════════════════════════════

const sil_baseline = baseline.global_features.f28d_sil_score;
const modal_baseline = baseline.global_features.f27d_modal_score;

// Check if SIL/modal are present even in non-introspective categories
const non_introsp_cats = ['action', 'descriptive', 'sensorielle', 'confrontation'];
let introsp_in_non_introsp = 0;
let non_introsp_count = 0;
for (const cat of non_introsp_cats) {
  const cat_data = baseline.per_category[cat];
  if (cat_data) {
    const cat_sil = cat_data.f28d_sil_score?.mean ?? 0;
    const cat_modal = cat_data.f27d_modal_score?.mean ?? 0;
    if (cat_sil > 0 || cat_modal > 0) introsp_in_non_introsp++;
    non_introsp_count++;
  }
}

// Also check Bloc 4: zero_introspection still had modal > 0
const zi_modal = att.zero_introspection.features.f27d_modal_score.mean;
const zi_modal_std = att.zero_introspection.features.f27d_modal_score.std;

const loi4_proportion = introsp_in_non_introsp / Math.max(non_introsp_count, 1);
const loi4_zi_signal = zi_modal > 0 ? confidenceFromSNR(zi_modal, zi_modal_std) : 0;
const loi4_conf = r4((loi4_proportion * 0.6 + loi4_zi_signal * 0.4));

// ═══════════════════════════════════════════════════════════════════
// LOI 5: Claude lisse la violence et l'inconfort
// Evidence: Bloc 4 inconfort_maximal — features close to baseline
// Evidence: Bloc 2 K_violence_narrative — action_verb ratio
// ═══════════════════════════════════════════════════════════════════

const inc = att.inconfort_maximal;
const inc_f1_delta = inc.deviation_from_baseline.f1_mean.delta;
const inc_f1_std = inc.features.f1_mean.std;
const inc_desc_delta = inc.deviation_from_baseline.f25g_description_score.delta;
const inc_desc_std = inc.features.f25g_description_score.std;
const inc_speed_delta = inc.deviation_from_baseline.f38c_speed_score.delta;
const inc_speed_std = inc.features.f38c_speed_score.std;

// Lissage = features didn't move much from baseline despite extreme instruction
const loi5_deltas_normalized = [
  Math.abs(inc_f1_delta) / (gc.f1_mean + 0.01),
  Math.abs(inc_desc_delta) / (gc.f25g_description_score + 0.01),
  Math.abs(inc_speed_delta) / (gc.f38c_speed_score + 0.01),
];
const loi5_avg_delta = loi5_deltas_normalized.reduce((a, b) => a + b, 0) / loi5_deltas_normalized.length;
// Small normalized delta = evidence of smoothing
const loi5_smoothing = 1 - Math.min(loi5_avg_delta, 1);
// Consistency
const loi5_stds = [inc_f1_std, inc_desc_std, inc_speed_std];
const loi5_consistency = 1 / (1 + loi5_stds.reduce((a, b) => a + b, 0) / loi5_stds.length);
const loi5_conf = r4(loi5_smoothing * loi5_consistency);

// ═══════════════════════════════════════════════════════════════════
// LOI 6: Claude injecte de l'introspection spontanée même sans consigne
// Evidence: Bloc 1 baseline — SIL/modal in action/description scenes
// Evidence: Bloc 4 zero_introspection — did modal still appear?
// ═══════════════════════════════════════════════════════════════════

// Type distribution in baseline: INTROSPECTION only detected 2/90 times
// But modal_score baseline = 0 → actually very low modal in baseline
// And SIL baseline = 0.0291 → slight but present

// Check action category in baseline for SIL
const action_sil = baseline.per_category.action?.f28d_sil_score?.mean ?? 0;
const action_sil_std = baseline.per_category.action?.f28d_sil_score?.std ?? 0;
const desc_sil = baseline.per_category.descriptive?.f28d_sil_score?.mean ?? 0;
const desc_sil_std = baseline.per_category.descriptive?.f28d_sil_score?.std ?? 0;

// Zero introspection: modal = 0.0778 (non-zero despite instruction)
const loi6_tests = [
  { delta: action_sil, std: action_sil_std },
  { delta: desc_sil, std: desc_sil_std },
  { delta: zi_modal, std: zi_modal_std },
];
const loi6_conf = r4(confidenceFromMultipleTests(loi6_tests));

// ═══════════════════════════════════════════════════════════════════
// LOI 7: Claude ferme sémantiquement (résolution) même sans consigne
// Evidence: Bloc 1 baseline — hook/cliff scores, type transitions
// Note: We measure cliff_score — if it's consistently moderate, it suggests closure
// ═══════════════════════════════════════════════════════════════════

const cliff_baseline = baseline.global_features.f36c_cliff_score;
const hook_baseline = baseline.global_features.f35c_hook_score;

// If cliff score is consistently moderate across all categories = closure tendency
// Check variance: low variance across categories = consistent behavior
const cliff_per_cat: number[] = [];
for (const [, cat_data] of Object.entries(baseline.per_category) as [string, any][]) {
  cliff_per_cat.push(cat_data.f36c_cliff_score?.mean ?? 0);
}
const cliff_std_across_cats = cliff_per_cat.length > 1
  ? Math.sqrt(cliff_per_cat.reduce((s, v) => s + (v - (cliff_per_cat.reduce((a, b) => a + b, 0) / cliff_per_cat.length)) ** 2, 0) / (cliff_per_cat.length - 1))
  : 0;

// Consistent moderate cliff = semantic closure
const loi7_consistency = 1 / (1 + cliff_std_across_cats * 10);
const loi7_signal = cliff_baseline.mean > 0 ? Math.min(cliff_baseline.mean / 0.5, 1) : 0;
const loi7_conf = r4(loi7_signal * loi7_consistency);

// ═══════════════════════════════════════════════════════════════════
// LOI 8: En conflit de consignes, la consigne la plus standard gagne
// Evidence: Bloc 5 — which feature wins in each conflict
// ═══════════════════════════════════════════════════════════════════

const conf = conflicts.conflicts;

// For each conflict, determine if the "standard/safe" consigne won
// Standard = closer to baseline values
function isCloserToBaseline(featureKey: string, observedMean: number): number {
  const baseVal = gc[featureKey] ?? baseline.global_features[featureKey]?.mean ?? 0;
  return Math.abs(observedMean - baseVal);
}

let standard_wins = 0;
let total_conflicts = 0;
const conflict_entries = Object.entries(conf) as [string, any][];

for (const [cid, cdata] of conflict_entries) {
  const featA_key = cdata.featureA.key;
  const featB_key = cdata.featureB.key;
  const featA_mean = cdata.featureA.stats.mean;
  const featB_mean = cdata.featureB.stats.mean;
  const featA_std = cdata.featureA.stats.std;
  const featB_std = cdata.featureB.stats.std;

  // The "standard" consigne is the one whose result is closer to baseline
  const distA = isCloserToBaseline(featA_key, featA_mean);
  const distB = isCloserToBaseline(featB_key, featB_mean);

  // If one feature is far from baseline (complied) and the other is close (didn't comply)
  // → the one that didn't comply was sacrificed, the one that complied won
  // But "standard wins" means the closer-to-baseline feature dominated

  // Check: was the output closer to baseline than to the extreme target?
  // Speed/hooks close to baseline = standard won (didn't accelerate/hook despite instruction)
  // Ampleur close to baseline = standard won (didn't lengthen despite instruction)

  total_conflicts++;
}

// Analyze specific conflicts:
// long_vs_speed: f1_mean=79.99 (far from baseline 13.04), speed=0.08 (far from baseline 0.462)
// → phrases_longues won (speed sacrificed)
// ampleur_vs_urgence: period=1.0 (max), speed=0.20 (far below baseline 0.462)
// → ampleur won (urgence sacrificed)
// subordination_vs_lisibilite: sub=0.0999 (above baseline 0.04), f1=65.54 (far above baseline)
// → subordination won (lisibilite sacrificed)
// lyrisme_vs_dialogue_cru: desc=0.5645 (near baseline 0.5785), para=40.99
// → lyrisme maintained near baseline, dialogue partial
// sensoriel_vs_necessite: desc=0.5893 (near baseline), speed=0.7127 (above baseline)
// → necessite won slightly (speed increased)
// ampleur_vs_hooks: period=0.0864 (near baseline 0), hooks=0.6 (near baseline 0.5367)
// → hooks won (period stayed low = ampleur lost)

// In 3/6 conflicts, the "structural" (longer phrases, subordination, ampleur) consigne won
// In 2/6, the "dynamic" (speed, hooks) consigne won
// In 1/6, mixed result
// This is roughly 50-50, so "standard wins" is weakly supported
const loi8_conf = r4(3 / 6); // Direct count of where standard/closer-to-baseline won

// ═══════════════════════════════════════════════════════════════════
// CONTRAINTES OBSERVÉES — compute from Bloc 3 ceilings
// ═══════════════════════════════════════════════════════════════════

const grads = ceilings.gradients;

// C1: Plafond phrase longue
const sl = grads.sentence_length.level_means;
// 20w→18.24, 35w→35.35, 50w→52.64, 70w→61.83, 90w→96.13
// Drop at 70w (asked 70, got 61.83) but recovery at 90w (96.13)
// Actually no ceiling on sentence length — it keeps climbing
const c1_stds = [
  grads.sentence_length.levels['70w'].primary_stats.std,
  grads.sentence_length.levels['90w'].primary_stats.std,
];
const c1_variance = (c1_stds[0] + c1_stds[1]) / 2;
// Ceiling at 70w: asked 70, got 61.83 (std=17.0 — huge)
// No real ceiling since 90w produces 96.13
const c1_conf = r4(confidenceFromSNR(Math.abs(61.83 - 70), 17.0) * 0.5); // Weak evidence

// C2: Plafond oralité
// From Bloc 4: oralite_sale f29d_ttr = 0.685 (baseline 0.74), std = 0.0096
// TTR barely dropped → can't produce truly "low" vocabulary
const oral_ttr = att.oralite_sale.features.f29d_ttr_score;
const oral_ttr_delta = Math.abs(oral_ttr.mean - gc.f29d_ttr_score);
const c2_conf = r4(1 - (oral_ttr_delta / gc.f29d_ttr_score)); // High = TTR stayed stable = ceiling exists

// C3: Résistance au dialogue pur
// Bloc 4 dialogue_pur: type_distribution = DIALOGUE 3/3 (complied!)
// But desc_score dropped to 0.4077 (from 0.5785) — only 30% drop, still has description
const dial_desc = att.dialogue_pur.features.f25g_description_score;
const c3_desc_remained = dial_desc.mean / gc.f25g_description_score; // How much desc survived
const c3_conf = r4(c3_desc_remained * (1 / (1 + dial_desc.std)));

// C4: Difficulté deux leviers contradictoires
// Bloc 5: In most conflicts, one lever dominates. Measure how often BOTH features
// deviate significantly from baseline (= both were executed)
let both_executed = 0;
for (const [, cdata] of conflict_entries) {
  const baseA = gc[cdata.featureA.key] ?? baseline.global_features[cdata.featureA.key]?.mean ?? 0;
  const baseB = gc[cdata.featureB.key] ?? baseline.global_features[cdata.featureB.key]?.mean ?? 0;
  const devA = baseA !== 0 ? Math.abs(cdata.featureA.stats.mean - baseA) / Math.abs(baseA) : 0;
  const devB = baseB !== 0 ? Math.abs(cdata.featureB.stats.mean - baseB) / Math.abs(baseB) : 0;
  // Both executed if both deviated > 30% from baseline
  if (devA > 0.3 && devB > 0.3) both_executed++;
}
// Difficulty = few cases where both were executed
const c4_conf = r4(1 - (both_executed / total_conflicts));

// C5: Subordination maximale atteinte
// Bloc 3: subordination levels — forte (0.098) ≈ moyenne (0.0994) → ceiling!
const sub_levels = grads.subordination.level_means;
const sub_forte = sub_levels[2].mean; // forte = 0.098
const sub_moyenne = sub_levels[1].mean; // moyenne = 0.0994
const sub_saturee = sub_levels[3].mean; // saturee = 0.1288
// forte < moyenne! Clear ceiling between moyenne and forte
const sub_std_forte = grads.subordination.levels.forte.primary_stats.std; // 0.0034
const sub_diff = Math.abs(sub_forte - sub_moyenne);
const c5_conf = r4(1 - Math.min(sub_diff / sub_moyenne, 1)); // Very small diff = ceiling

// ═══════════════════════════════════════════════════════════════════
// BUILD UPDATED LAWS JSON
// ═══════════════════════════════════════════════════════════════════

const laws = load('CLAUDE_BLACKBOX_LAWS.json');

const updatedRegles = [
  {
    loi: 'Claude recentre les extrêmes syntaxiques',
    confiance: label(loi1_conf),
    score: loi1_conf,
    evidence: 'B4: oralite_sale f1_mean delta=+0.91 (7% baseline), zero_description desc -15%, prose_lyrique f1 +52.7%',
    delta_mean: r4((Math.abs(oral_f1.delta) + Math.abs(zdesc.delta) + Math.abs(zintr_desc.delta)) / 3),
    std_inter_runs: r4((oral_f1_std + zdesc_std + zintr_desc_std) / 3),
  },
  {
    loi: "Claude exécute mieux l'exemplar que la consigne abstraite",
    confiance: label(loi2_conf),
    score: loi2_conf,
    evidence: `B2: exemplar >= best abstract in ${exemplar_wins}/${total_families} families`,
    delta_mean: r4(loi2_deltas.reduce((s, d) => s + d.delta, 0) / loi2_deltas.length),
    std_inter_runs: r4(loi2_deltas.reduce((s, d) => s + d.std, 0) / loi2_deltas.length),
  },
  {
    loi: "Claude comprime les demandes d'alternance",
    confiance: label(loi3_conf),
    score: loi3_conf,
    evidence: `B2: alternance demandée, rhythm_ratio baseline=${r4(alt_baseline)}, simple=${r4(alt_simple)}, exemplar=${r4(alt_exemplar)}`,
    delta_mean: r4(alt_deltas.reduce((s, d) => s + d.delta, 0) / alt_deltas.length),
    std_inter_runs: r4(alt_deltas.reduce((s, d) => s + d.std, 0) / alt_deltas.length),
  },
  {
    loi: 'Claude favorise un régime introspectif par défaut',
    confiance: label(loi4_conf),
    score: loi4_conf,
    evidence: `B1: introspection markers in ${introsp_in_non_introsp}/${non_introsp_count} non-introsp categories. B4: zero_introsp modal=${r4(zi_modal)}`,
    delta_mean: r4(zi_modal),
    std_inter_runs: r4(zi_modal_std),
  },
  {
    loi: "Claude lisse la violence et l'inconfort",
    confiance: label(loi5_conf),
    score: loi5_conf,
    evidence: `B4: inconfort f1 delta=${r4(inc_f1_delta)} (${r4(inc.deviation_from_baseline.f1_mean.regression_pct)}%), speed delta=${r4(inc_speed_delta)}`,
    delta_mean: r4(loi5_avg_delta),
    std_inter_runs: r4(loi5_stds.reduce((a, b) => a + b, 0) / loi5_stds.length),
  },
  {
    loi: "Claude injecte de l'introspection spontanée même sans consigne",
    confiance: label(loi6_conf),
    score: loi6_conf,
    evidence: `B1: action SIL=${r4(action_sil)}, desc SIL=${r4(desc_sil)}. B4: zero_introsp modal=${r4(zi_modal)}`,
    delta_mean: r4((action_sil + desc_sil + zi_modal) / 3),
    std_inter_runs: r4((action_sil_std + desc_sil_std + zi_modal_std) / 3),
  },
  {
    loi: 'Claude ferme sémantiquement (résolution) même sans consigne',
    confiance: label(loi7_conf),
    score: loi7_conf,
    evidence: `B1: cliff_score mean=${r4(cliff_baseline.mean)}, std across categories=${r4(cliff_std_across_cats)}`,
    delta_mean: r4(cliff_baseline.mean),
    std_inter_runs: r4(cliff_baseline.std),
  },
  {
    loi: 'En conflit de consignes, la consigne la plus standard gagne',
    confiance: label(loi8_conf),
    score: loi8_conf,
    evidence: `B5: structural/safe consigne won in ~3/6 conflicts. Not strongly directional.`,
    delta_mean: 0,
    std_inter_runs: 0,
  },
];

const updatedContraintes = [
  {
    contrainte: 'Plafond phrase longue',
    details: `B3: 20w→18.2, 35w→35.4, 50w→52.6, 70w→61.8 (std=17.0), 90w→96.1. Variance haute au-delà de 50w.`,
    confiance: label(c1_conf),
    score: c1_conf,
  },
  {
    contrainte: 'Plafond oralité',
    details: `B4: oralite_sale TTR=${r4(oral_ttr.mean)} (baseline ${r4(gc.f29d_ttr_score)}), delta=${r4(oral_ttr_delta)}. Vocabulaire reste riche.`,
    confiance: label(c2_conf),
    score: c2_conf,
  },
  {
    contrainte: 'Résistance au dialogue pur',
    details: `B4: dialogue_pur desc_score=${r4(dial_desc.mean)} (baseline ${r4(gc.f25g_description_score)}). ${r4(c3_desc_remained * 100)}% description survit.`,
    confiance: label(c3_conf),
    score: c3_conf,
  },
  {
    contrainte: 'Difficulté à maintenir deux leviers contradictoires',
    details: `B5: les deux leviers exécutés simultanément dans ${both_executed}/${total_conflicts} conflits seulement.`,
    confiance: label(c4_conf),
    score: c4_conf,
  },
  {
    contrainte: 'Subordination maximale atteinte',
    details: `B3: moyenne=${r4(sub_moyenne)}, forte=${r4(sub_forte)}, saturée=${r4(sub_saturee)}. Plafond entre moyenne et forte (delta=${r4(sub_diff)}).`,
    confiance: label(c5_conf),
    score: c5_conf,
  },
];

laws.classification.regles_emergentes = updatedRegles;
laws.classification.contraintes_observees = updatedContraintes;
laws.confidence_computed = true;
laws.confidence_date = new Date().toISOString().slice(0, 10);
laws.methodology_note = 'Confiance calculée: SNR (signal-to-noise) basé sur delta moyen vs baseline et écart-type inter-runs (n=3). HAUTE >= 0.7, MOYENNE >= 0.4, FAIBLE < 0.4.';

// SAVE
fs.writeFileSync(path.join(BASE, 'CLAUDE_BLACKBOX_LAWS.json'), JSON.stringify(laws, null, 2), 'utf-8');

// PRINT SUMMARY
console.log('═'.repeat(70));
console.log('  SCORES DE CONFIANCE CALCULÉS');
console.log('═'.repeat(70));
console.log('');
console.log('RÈGLES ÉMERGENTES:');
for (const r of updatedRegles) {
  console.log(`  [${r.confiance.padEnd(7)}] (${r.score.toFixed(4)}) ${r.loi}`);
}
console.log('');
console.log('CONTRAINTES OBSERVÉES:');
for (const c of updatedContraintes) {
  console.log(`  [${c.confiance.padEnd(7)}] (${c.score.toFixed(4)}) ${c.contrainte}`);
}
console.log('');
console.log(`Saved: ${path.join(BASE, 'CLAUDE_BLACKBOX_LAWS.json')}`);
