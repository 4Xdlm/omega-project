/**
 * DEC-019 — bge-m3 Radar géométrique (advisory, SHADOW / télémétrie uniquement).
 * ============================================================================
 * Module STANDALONE, NON câblé dans le verdict de production (zéro impact min_axis/composite/SEAL).
 * Mesure un signal géométrique advisory « proximité aux maîtres » via embeddings bge-m3.
 * Preuve : S1D-bge (MASTER_FR vs C_formulaic_FR AUC 0.943 [0.78–0.98], franchit S-1). Ratifié DEC-019 (Tribunal 2/2).
 *
 * Déterminisme : ce module n'entre JAMAIS dans le chemin déterministe hashé. Le flag est inactif par
 * défaut ('0' = no-op total, aucun appel embeddings). Les centroïdes sont INJECTÉS (pas en dur) ;
 * artefact de référence : `data/bgem3-radar-centroids.json` (Gold-Set scellé 4388b4b6).
 * EMP-18 : les centroïdes ont été calibrés hors-échantillon ; ce radar reste advisory (aucun gate).
 *
 * Flag : OMEGA_BGEM3_RADAR ∈ {'0' (défaut, inactif), 'shadow' (logue)}.
 * Logique PURE testable hors Ollama ; l'embedding est isolé derrière RadarProvider.
 */

/** Provider d'embedding (découplage : testable par mock, aucun import lourd). */
export interface RadarProvider {
  embed(text: string): Promise<number[]>;
}

/** Centroïdes de référence (injectés depuis l'artefact bge-m3). */
export interface RadarCentroids {
  readonly master_centroid: ReadonlyArray<number>;
  readonly low_centroid: ReadonlyArray<number>;
}

/** Cosinus PURE. Renvoie 0 si l'un des vecteurs est nul ou de dimension incompatible. */
export function cosineSim(a: ReadonlyArray<number>, b: ReadonlyArray<number>): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d === 0 ? 0 : dot / d;
}

/**
 * Score radar advisory PURE : cos(emb, master) − cos(emb, low).
 * > 0 = géométriquement plus proche des maîtres ; < 0 = plus proche du bas. NaN si dims incompatibles.
 */
export function radarAdvisoryScore(emb: ReadonlyArray<number>, c: RadarCentroids): number {
  if (emb.length === 0 || emb.length !== c.master_centroid.length || emb.length !== c.low_centroid.length) {
    return Number.NaN;
  }
  return +(cosineSim(emb, c.master_centroid) - cosineSim(emb, c.low_centroid)).toFixed(6);
}

export type RadarBand = 'master-like' | 'mixed' | 'low-like' | 'invalid';

/**
 * Seuils CALIBRÉS sur vérité-terrain (N5-REF, LOAO EMP-18, Gold-Set scellé) :
 *   - maîtres : p25 = +0.0044  (frontière basse du cluster maître)
 *   - pulp/formulaic : p75 = −0.0075 (frontière haute du cluster bas)
 * master-like = au-dessus du quartile bas des maîtres ; low-like = sous le quartile haut du pulp.
 * Source : docs/metrology/N5_SHADOW_TELEMETRY_REPORT.md.
 */
export const RADAR_MASTER_THRESHOLD = 0.0044;
export const RADAR_LOW_THRESHOLD = -0.0075;

/** Interprétation advisory (bandes calibrées vérité-terrain, NON un gate). */
export function interpretRadar(score: number): RadarBand {
  if (!Number.isFinite(score)) return 'invalid';
  if (score > RADAR_MASTER_THRESHOLD) return 'master-like';
  if (score < RADAR_LOW_THRESHOLD) return 'low-like';
  return 'mixed';
}

/** Flag d'activation (défaut inactif). */
export function bgem3RadarMode(): '0' | 'shadow' {
  return process.env.OMEGA_BGEM3_RADAR === 'shadow' ? 'shadow' : '0';
}

export interface RadarResult {
  readonly score: number;
  readonly band: RadarBand;
  readonly dim: number;
}

/** Calcul advisory complet (1 appel embedding). NE gate rien. */
export async function radarScore(
  prose: string,
  centroids: RadarCentroids,
  provider: RadarProvider,
): Promise<RadarResult> {
  const emb = await provider.embed(prose);
  const score = radarAdvisoryScore(emb, centroids);
  return { score, band: interpretRadar(score), dim: emb.length };
}

/**
 * Hook SHADOW (DEC-019) : télémétrie advisory, NE retourne rien, NE modifie aucun verdict.
 * - flag != 'shadow' (défaut '0') : no-op immédiat, AUCUN appel embedding, comportement identique.
 * - flag == 'shadow' : score radar (try/catch — ne lève JAMAIS) + log télémétrie.
 */
export async function shadowLogBgem3Radar(
  prose: string,
  centroids: RadarCentroids,
  sceneId: string,
  provider: RadarProvider,
): Promise<void> {
  if (bgem3RadarMode() !== 'shadow') return;
  try {
    const r = await radarScore(prose, centroids, provider);
    // eslint-disable-next-line no-console
    console.error(`[BGEM3_RADAR shadow] scene=${sceneId} dim=${r.dim} score=${r.score} band=${r.band}`);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`[BGEM3_RADAR shadow] error: ${String(e)}`);
  }
}
