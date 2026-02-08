/**
 * OMEGA Style Emergence Engine -- Genre Detector
 * Phase C.3 -- Detect genre-specific patterns
 */

import type { ProseParagraph } from '@omega/scribe-engine';
import type { EConfig, GenreDetectionResult, EVerdict } from '../types.js';

export function detectGenre(paragraphs: readonly ProseParagraph[], config: EConfig): GenreDetectionResult {
  const genreMarkers = config.GENRE_MARKERS.value as Readonly<Record<string, readonly string[]>>;
  const maxSpecificity = config.GENRE_MAX_SPECIFICITY.value as number;

  const fullText = paragraphs.map((p) => p.text).join(' ').toLowerCase();
  const genreScores: Record<string, number> = {};
  const markersFound: string[] = [];

  for (const [genre, markers] of Object.entries(genreMarkers)) {
    let found = 0;
    for (const marker of markers) {
      if (fullText.includes(marker.toLowerCase())) {
        found++;
        markersFound.push(`${genre}:${marker}`);
      }
    }
    genreScores[genre] = markers.length > 0 ? found / markers.length : 0;
  }

  const sortedGenres = Object.entries(genreScores).sort(([, a], [, b]) => b - a);
  const topGenre = sortedGenres.length > 0 ? sortedGenres[0][0] : 'none';
  const topScore = sortedGenres.length > 0 ? sortedGenres[0][1] : 0;
  const secondScore = sortedGenres.length > 1 ? sortedGenres[1][1] : 0;
  const specificity = topScore - secondScore;

  const verdict: EVerdict = specificity <= maxSpecificity ? 'PASS' : 'FAIL';

  return {
    genre_scores: { ...genreScores },
    top_genre: topGenre,
    top_score: topScore,
    specificity,
    verdict,
    genre_markers_found: markersFound,
  };
}
